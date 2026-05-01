import { Router } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@workspace/lexo-intro-db";
import { students } from "@workspace/lexo-intro-db/schema";
import { signToken } from "./auth";

const router = Router();

const IS_PROD = process.env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: IS_PROD,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function getSsoSecret(): string | null {
  const s = process.env.SSO_SHARED_SECRET;
  if (!s || s.length < 16) return null;
  return s;
}

interface SsoPayload {
  userId: string;
  email: string;
  name: string;
  tier: string;
  jti: string;
  exp: number;
}

// In-memory single-use jti store. Each consumed jti is held until just past
// the token's natural expiry, then evicted. This prevents replay of any token
// that has already been redeemed within its 60s validity window.
const consumedJtis = new Map<string, number>(); // jti -> expiry epoch (sec)

function gcConsumedJtis(now: number): void {
  for (const [jti, exp] of consumedJtis) {
    if (exp <= now) consumedJtis.delete(jti);
  }
}

function tryConsumeJti(jti: string, exp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  // Periodic cheap GC; bounded by token volume.
  if (consumedJtis.size > 1024) gcConsumedJtis(now);
  if (consumedJtis.has(jti)) return false;
  // Hold the jti for slightly longer than its expiry so a replay can't
  // race the eviction.
  consumedJtis.set(jti, exp + 5);
  return true;
}

function verifySsoToken(token: string, secret: string): SsoPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts as [string, string];
    const expected = crypto.createHmac("sha256", secret).update(body).digest();
    const provided = Buffer.from(sig, "base64url");
    if (
      expected.length !== provided.length ||
      !crypto.timingSafeEqual(expected, provided)
    ) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SsoPayload;
    if (
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    if (typeof payload.jti !== "string" || payload.jti.length < 8) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function safeNext(next: string | undefined): string {
  if (!next || typeof next !== "string") return "/app-ielts-intro/";
  // Only allow same-origin paths within the Intro app
  if (!next.startsWith("/app-ielts-intro/")) return "/app-ielts-intro/";
  // Strip protocol attempts
  if (next.includes("://") || next.startsWith("//")) return "/app-ielts-intro/";
  return next;
}

router.get("/sso/redeem", async (req, res) => {
  const secret = getSsoSecret();
  if (!secret) {
    res.status(503).send("SSO is not configured on this server");
    return;
  }

  const token = String(req.query.token ?? "");
  const next = safeNext(
    typeof req.query.next === "string" ? req.query.next : undefined,
  );

  if (!token) {
    res.status(400).send("Missing SSO token");
    return;
  }

  const payload = verifySsoToken(token, secret);
  if (!payload) {
    res.status(401).send("Invalid or expired SSO token");
    return;
  }

  if (payload.tier !== "intro") {
    res.status(403).send("This SSO token is not for the Intro tier");
    return;
  }

  // Single-use enforcement: a given SSO token can only be redeemed once.
  if (!tryConsumeJti(payload.jti, payload.exp)) {
    req.log.warn({ jti: payload.jti }, "SSO token replay attempt rejected");
    res.status(401).send("This SSO link has already been used");
    return;
  }

  try {
    const emailClean = payload.email.trim().toLowerCase();

    // Find or create the intro_students row
    const existing = await db
      .select()
      .from(students)
      .where(eq(students.email, emailClean));

    let student = existing[0];
    if (!student) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const [created] = await db
        .insert(students)
        .values({
          email: emailClean,
          // Random unguessable password — student won't use it (always SSO)
          password: crypto.randomBytes(48).toString("hex"),
          accessCode: "PLATFORM-SSO",
          status: "approved",
          expiresAt: oneYearFromNow,
        })
        .returning();
      student = created;
    } else if (student.status !== "approved") {
      // Auto-approve students arriving via platform SSO (platform already vetted them)
      const [updated] = await db
        .update(students)
        .set({ status: "approved" })
        .where(eq(students.id, student.id))
        .returning();
      if (updated) student = updated;
    }

    if (!student) {
      res.status(500).send("Failed to create student account");
      return;
    }

    const cookieToken = signToken({ id: student.id, email: student.email });
    res.cookie("intro_student", cookieToken, cookieOpts);
    res.redirect(302, next);
  } catch (err) {
    req.log.error({ err }, "SSO redeem failed");
    res.status(500).send("SSO sign-in failed");
  }
});

export default router;
