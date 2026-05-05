import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, accessRequestsTable, userDataTable } from "@workspace/ielts-db";

const router: IRouter = Router();

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "fallback-secret";

function getSsoSecret(): string | null {
  const s = process.env["SSO_SHARED_SECRET"];
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
// the token's natural expiry. Acceptable for single-instance deployment.
const consumedJtis = new Map<string, number>();

function gcConsumedJtis(now: number): void {
  for (const [jti, exp] of consumedJtis) {
    if (exp <= now) consumedJtis.delete(jti);
  }
}

function tryConsumeJti(jti: string, exp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (consumedJtis.size > 1024) gcConsumedJtis(now);
  if (consumedJtis.has(jti)) return false;
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

// Mirror of the IELTS app's session token format from routes/auth.ts.
function makeIeltsSessionToken(email: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(email + ":approved")
    .digest("hex");
}

// HTML-escape values that we interpolate into the bootstrap page.
function jsString(s: string): string {
  return JSON.stringify(s);
}

router.get("/sso/redeem", async (req, res) => {
  const secret = getSsoSecret();
  if (!secret) {
    res
      .status(503)
      .type("text/plain")
      .send("SSO is not configured on this server");
    return;
  }

  const token = String(req.query["token"] ?? "");
  if (!token) {
    res.status(400).type("text/plain").send("Missing SSO token");
    return;
  }

  const payload = verifySsoToken(token, secret);
  if (!payload) {
    res.status(401).type("text/plain").send("Invalid or expired SSO token");
    return;
  }

  // The IELTS app accepts 'intro', 'advance', and 'complete' tiers. Intro
  // students get a locked-down A2/B1-only experience inside the same app.
  if (
    payload.tier !== "intro" &&
    payload.tier !== "advance" &&
    payload.tier !== "complete"
  ) {
    res
      .status(403)
      .type("text/plain")
      .send("This SSO token is not for the IELTS tier");
    return;
  }

  if (!tryConsumeJti(payload.jti, payload.exp)) {
    req.log?.warn?.({ jti: payload.jti }, "IELTS SSO token replay rejected");
    res
      .status(401)
      .type("text/plain")
      .send("This SSO link has already been used");
    return;
  }

  try {
    const emailClean = payload.email.trim().toLowerCase();

    // Find or create the access_requests row, ensuring it is approved with a
    // year-long expiry. Platform-issued SSO accounts get an unguessable random
    // password — students never use it (login is always via SSO).
    const existing = await db
      .select()
      .from(accessRequestsTable)
      .where(eq(accessRequestsTable.email, emailClean));

    let row = existing[0];
    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);

    if (!row) {
      const randomPwHash = await bcrypt.hash(
        crypto.randomBytes(32).toString("hex"),
        10,
      );
      const [created] = await db
        .insert(accessRequestsTable)
        .values({
          email: emailClean,
          status: "approved",
          passwordHash: randomPwHash,
          reviewedAt: new Date(),
          expiresAt: oneYear,
        })
        .returning();
      row = created;
    } else if (row.status !== "approved") {
      const [updated] = await db
        .update(accessRequestsTable)
        .set({
          status: "approved",
          reviewedAt: new Date(),
          expiresAt: row.expiresAt ?? oneYear,
        })
        .where(eq(accessRequestsTable.id, row.id))
        .returning();
      if (updated) row = updated;
    }

    if (!row) {
      res
        .status(500)
        .type("text/plain")
        .send("Failed to provision IELTS account");
      return;
    }

    // Persist the platform-issued tier so server-side gating (e.g. flashcards
    // level filter) can read it later without re-validating the SSO token.
    await db
      .insert(userDataTable)
      .values({
        email: emailClean,
        key: "tier",
        value: payload.tier,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userDataTable.email, userDataTable.key],
        set: { value: payload.tier, updatedAt: new Date() },
      });

    const sessionToken = makeIeltsSessionToken(emailClean);

    // The IELTS app keeps its session in localStorage (key '4ielts_email'),
    // not in cookies. So we return a tiny bootstrap page that writes the
    // session and redirects to /lexo-ielts/. The redirect target is taken
    // from the `next` query param (validated to start with /lexo-ielts/) so
    // the tier query string set by the central api-server is preserved.
    const nextParam = String(req.query["next"] ?? "");
    const safeNext = nextParam.startsWith("/lexo-ielts/")
      ? nextParam
      : "/lexo-ielts/";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Signing you in…</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #1E2155; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .spinner { width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.2); border-top-color: #6B2FE6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  p { text-align: center; margin: 0; opacity: 0.85; font-size: 14px; }
</style>
</head>
<body>
<div>
  <div class="spinner" aria-hidden="true"></div>
  <p>Signing you in to LEXO for IELTS…</p>
</div>
<script>
(function () {
  try {
    var email = ${jsString(emailClean)};
    var token = ${jsString(sessionToken)};
    var tier = ${jsString(payload.tier)};
    localStorage.setItem("4ielts_email", JSON.stringify({ email: email, token: token }));
    localStorage.setItem("4ielts_last_email", email);
    localStorage.setItem("lexo-ielts:tier", tier);
  } catch (e) {
    // localStorage unavailable — fall through to redirect anyway.
  }
  window.location.replace(${jsString(safeNext)});
})();
</script>
<noscript>
  <p>JavaScript is required to complete sign-in. Please enable it and reload.</p>
</noscript>
</body>
</html>`;

    // Cache-bust this response so the bootstrap script always runs fresh.
    res.setHeader("Cache-Control", "no-store");
    res.status(200).type("text/html").send(html);
  } catch (err) {
    req.log?.error?.({ err }, "IELTS SSO redeem failed");
    res.status(500).type("text/plain").send("SSO sign-in failed");
  }
});

export default router;
