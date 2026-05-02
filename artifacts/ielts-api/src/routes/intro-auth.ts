import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/ielts-db";
import { introStudents, introAccessCodes } from "@workspace/ielts-db";
import { eq, desc, and, isNull } from "drizzle-orm";

const router: IRouter = Router();

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "fallback-secret";

// ─── Password hashing (scrypt — compatible with existing intro_students rows) ─

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const test = crypto.scryptSync(password, salt, 64).toString("hex");
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(test, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

// ─── HMAC session token (same format as ielts-api makeToken in auth.ts) ───────
// SHA-256(email + ":approved") — identical to what verifyStudentEmail() in
// tier-auth.ts expects, so intro students work with all existing API middleware.

function makeToken(email: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(email + ":approved")
    .digest("hex");
}

function verifyToken(email: string, token: string): boolean {
  try {
    const expected = makeToken(email);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(token, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

// ─── Access code generator ────────────────────────────────────────────────────
// Produces XXXX-XXXX-XXXX (12 hex chars + dashes) — visually distinct from
// the 10-char alphanumeric codes used for advance/complete tier students.

function generateAccessCode(): string {
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${part()}-${part()}-${part()}`;
}

// ─── Admin auth helper ────────────────────────────────────────────────────────
// Reuses the same x-admin-password header pattern as the main admin routes.

async function requireAdmin(
  req: import("express").Request,
  res: import("express").Response,
): Promise<boolean> {
  const provided = String(
    (req.headers["x-admin-password"] as string) ?? (req.body?.adminPassword ?? ""),
  );
  const expected = process.env["ADMIN_PASSWORD"] ?? "";
  if (!provided || !expected) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// ─── Registration ─────────────────────────────────────────────────────────────

router.post("/auth/intro/register", async (req, res): Promise<void> => {
  const { email, password, accessCode } = req.body ?? {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  if (!accessCode || typeof accessCode !== "string") {
    res.status(400).json({ error: "Access code is required" });
    return;
  }

  const emailClean = email.trim().toLowerCase();
  const codeClean = accessCode.trim().toUpperCase();

  const existing = await db
    .select()
    .from(introStudents)
    .where(eq(introStudents.email, emailClean));
  if (existing.length > 0) {
    const s = existing[0];
    if (s.status === "denied") {
      res.status(403).json({
        error: "Your registration has been denied. Please contact the administrator.",
      });
    } else {
      res.status(409).json({
        error: "This email is already registered. Please use Sign In instead.",
      });
    }
    return;
  }

  const passwordHash = hashPassword(password);
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  try {
    await db.transaction(async (tx) => {
      const consumed = await tx
        .update(introAccessCodes)
        .set({ usedBy: emailClean, usedAt: new Date() })
        .where(and(eq(introAccessCodes.code, codeClean), isNull(introAccessCodes.usedAt)))
        .returning();

      if (consumed.length === 0) {
        const [exists] = await tx
          .select()
          .from(introAccessCodes)
          .where(eq(introAccessCodes.code, codeClean));
        const msg = exists
          ? "This access code has already been used."
          : "Invalid access code. Please check with your instructor.";
        throw Object.assign(new Error("ACCESS_CODE"), { status: 401, message: msg });
      }

      await tx.insert(introStudents).values({
        email: emailClean,
        password: passwordHash,
        accessCode: codeClean,
        status: "pending",
        expiresAt: oneYear,
      });
    });
  } catch (err: any) {
    if (err?.status === 401) {
      res.status(401).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "intro register error");
    res.status(500).json({ error: "Registration failed. Please try again." });
    return;
  }

  res.json({
    status: "pending",
    message: "Registration received. An administrator will review your account shortly.",
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

router.post("/auth/intro/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  const emailClean = email.trim().toLowerCase();
  const [student] = await db
    .select()
    .from(introStudents)
    .where(eq(introStudents.email, emailClean));

  if (!student) {
    res.status(404).json({ error: "No intro account found for this email." });
    return;
  }
  if (!student.password || !verifyPassword(password, student.password)) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }
  if (student.status === "denied") {
    res
      .status(403)
      .json({ status: "denied", error: "Your account has been denied. Please contact the administrator." });
    return;
  }
  if (student.status === "pending") {
    res.status(403).json({ status: "pending", error: "Your account is awaiting admin approval." });
    return;
  }
  if (student.expiresAt && new Date(student.expiresAt) <= new Date()) {
    res.status(403).json({ status: "expired", error: "Your subscription has expired." });
    return;
  }

  res.json({
    status: "approved",
    token: makeToken(emailClean),
    user: { id: student.id, email: student.email, status: student.status },
  });
});

// ─── Status polling (used by pending screen) ──────────────────────────────────

router.post("/auth/intro/check", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email) { res.status(400).json({ status: "invalid" }); return; }
  const emailClean = (email as string).trim().toLowerCase();
  const [student] = await db
    .select()
    .from(introStudents)
    .where(eq(introStudents.email, emailClean));
  if (!student) { res.json({ status: "not_found" }); return; }
  if (
    student.status === "approved" &&
    student.expiresAt &&
    new Date(student.expiresAt) <= new Date()
  ) {
    res.json({ status: "expired" });
    return;
  }
  res.json({ status: student.status });
});

// ─── Session validation ───────────────────────────────────────────────────────

router.get("/auth/intro/me", async (req, res): Promise<void> => {
  const email = ((req.headers["x-student-email"] as string) || "").trim().toLowerCase();
  const token = ((req.headers["x-student-token"] as string) || "").trim();
  if (!email || !token || !verifyToken(email, token)) {
    res.json({ user: null });
    return;
  }
  const [student] = await db
    .select()
    .from(introStudents)
    .where(eq(introStudents.email, email));
  if (!student) { res.json({ user: null }); return; }
  res.json({
    user: {
      id: student.id,
      email: student.email,
      status: student.status,
      expiresAt: student.expiresAt,
    },
  });
});

// ─── Admin: student management ────────────────────────────────────────────────

router.get("/admin/intro/students", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const rows = await db
    .select()
    .from(introStudents)
    .orderBy(desc(introStudents.createdAt));
  res.json(rows.map(({ password: _pw, ...s }) => s));
});

router.post("/admin/intro/students/:id/approve", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { expiresAt } = req.body ?? {};
  const expiryDate = expiresAt
    ? new Date(expiresAt as string)
    : (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; })();
  const [updated] = await db
    .update(introStudents)
    .set({ status: "approved", expiresAt: expiryDate })
    .where(eq(introStudents.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Student not found" }); return; }
  const { password: _pw, ...safe } = updated;
  res.json({ success: true, student: safe });
});

router.post("/admin/intro/students/:id/reject", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [updated] = await db
    .update(introStudents)
    .set({ status: "denied" })
    .where(eq(introStudents.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Student not found" }); return; }
  res.json({ success: true });
});

router.post("/admin/intro/students/:id/set-expiry", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { expiresAt } = req.body ?? {};
  const expiryDate = expiresAt ? new Date(expiresAt as string) : null;
  await db.update(introStudents).set({ expiresAt: expiryDate }).where(eq(introStudents.id, id));
  res.json({ success: true });
});

router.delete("/admin/intro/students/:id", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  await db.delete(introStudents).where(eq(introStudents.id, id));
  res.json({ success: true });
});

// ─── Admin: access codes ──────────────────────────────────────────────────────

router.get("/admin/intro/access-codes", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const codes = await db
    .select()
    .from(introAccessCodes)
    .orderBy(desc(introAccessCodes.createdAt));
  const unusedCount = codes.filter((c) => !c.usedAt).length;
  res.json({ codes, unusedCount });
});

router.post("/admin/intro/access-codes", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const { count } = req.body ?? {};
  const n = Math.max(1, Math.min(50, Number(count) || 1));
  const created: { code: string }[] = [];
  for (let i = 0; i < n; i++) {
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      try {
        const code = generateAccessCode();
        await db.insert(introAccessCodes).values({ code }).onConflictDoNothing();
        created.push({ code });
        inserted = true;
      } catch { /* retry */ }
    }
  }
  res.json({ codes: created });
});

router.delete("/admin/intro/access-codes/:code", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const code = req.params.code.toUpperCase();
  const [existing] = await db
    .select()
    .from(introAccessCodes)
    .where(eq(introAccessCodes.code, code));
  if (!existing) { res.status(404).json({ error: "Access code not found" }); return; }
  if (existing.usedAt) {
    res.status(400).json({ error: "Cannot delete a code that has already been used" });
    return;
  }
  await db.delete(introAccessCodes).where(eq(introAccessCodes.code, code));
  res.json({ success: true });
});

export default router;
