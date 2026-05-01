import { Router } from "express";
import { db } from "@workspace/lexo-intro-db";
import { students, settings, accessCodes } from "@workspace/lexo-intro-db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET env var is required");
}
const SESSION_SECRET: string = process.env.SESSION_SECRET;

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
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function generateAccessCode(): string {
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${part()}-${part()}-${part()}`;
}

function notifyStudentApproved(email: string) {
  // Email notification stub. To enable real emails, wire up an SMTP/SendGrid
  // integration here using the `email` (recipient) and approval template.
  console.log(`[notify] Student approved: ${email} — confirmation email would be sent here.`);
}

async function ensureTablesAndSeed() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intro_students (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      ALTER TABLE intro_students ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    `);
    await db.execute(sql`
      ALTER TABLE intro_students ADD COLUMN IF NOT EXISTS password VARCHAR(255)
    `);
    await db.execute(sql`
      ALTER TABLE intro_students ADD COLUMN IF NOT EXISTS access_code VARCHAR(64)
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intro_access_codes (
        code VARCHAR(64) PRIMARY KEY,
        used_by VARCHAR(255),
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intro_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intro_feedback (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES intro_students(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        tool VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intro_comments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES intro_students(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL DEFAULT '',
        text TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      ALTER TABLE intro_comments ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT ''
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intro_conversation_sessions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES intro_students(id) ON DELETE CASCADE,
        topic VARCHAR(255) NOT NULL,
        topic_source VARCHAR(20) NOT NULL DEFAULT 'preset',
        mode VARCHAR(20) NOT NULL DEFAULT 'voice',
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        feedback JSONB,
        band_score NUMERIC(3,1),
        duration_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS intro_conversation_sessions_student_idx ON intro_conversation_sessions (student_id, created_at DESC)
    `);
    await db.execute(sql`
      INSERT INTO intro_settings (key, value) VALUES ('student_password', ${process.env.INTRO_STUDENT_PASSWORD || crypto.randomBytes(12).toString("base64url")}) ON CONFLICT (key) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO intro_settings (key, value) VALUES ('admin_password', ${process.env.INTRO_ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url")}) ON CONFLICT (key) DO NOTHING
    `);
    if (!process.env.INTRO_STUDENT_PASSWORD || !process.env.INTRO_ADMIN_PASSWORD) {
      const rows = await db.execute(sql`SELECT key, value FROM intro_settings WHERE key IN ('student_password','admin_password')`);
      console.warn("[lexo-intro auth] INTRO_STUDENT_PASSWORD/INTRO_ADMIN_PASSWORD env vars not set. Generated defaults:", rows.rows);
    }
  } catch (err) {
    console.error("Failed to seed auth tables:", err);
  }
}
ensureTablesAndSeed();

export function signToken(payload: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token: string): Record<string, unknown> | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

export function getStudentToken(req: { cookies?: Record<string, string> }): { id: number; email: string } | null {
  const token = req.cookies?.["intro_student"];
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.id || !payload.email) return null;
  return { id: payload.id as number, email: payload.email as string };
}

export async function requireActiveStudent(req: any, res: any, next: any) {
  const tokenData = getStudentToken(req);
  if (!tokenData) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const [student] = await db.select().from(students).where(eq(students.id, tokenData.id));
    if (!student || student.status !== "approved") {
      res.status(403).json({ error: "Account not approved" });
      return;
    }
    if (student.expiresAt && new Date(student.expiresAt) <= new Date()) {
      res.status(403).json({ error: "Account expired" });
      return;
    }
    (req as any).student = student;
    next();
  } catch {
    res.status(500).json({ error: "Auth check failed" });
  }
}

const IS_PROD = process.env.NODE_ENV === "production";
const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: IS_PROD, maxAge: 30 * 24 * 60 * 60 * 1000 };
const adminCookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: IS_PROD, maxAge: 7 * 24 * 60 * 60 * 1000 };

export function getAdminToken(req: { cookies?: Record<string, string> }): boolean {
  const token = req.cookies?.["intro_admin"];
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.admin === true;
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, accessCode } = req.body as { email: string; password: string; accessCode: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (!accessCode?.trim()) {
      res.status(400).json({ error: "An access code is required to register" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const emailClean = email.trim().toLowerCase();
    const codeClean = accessCode.trim().toUpperCase();

    // Reject duplicates up front (before consuming the code) to avoid wasting a valid code on a duplicate signup.
    const existing = await db.select().from(students).where(eq(students.email, emailClean));
    if (existing.length > 0) {
      const student = existing[0];
      if (student.status === "denied") {
        res.status(403).json({ error: "Your registration has been denied. Contact the administrator." });
        return;
      }
      res.status(409).json({ error: "This email is already registered. Please use Sign In instead." });
      return;
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const passwordHash = hashPassword(password);

    let newStudent: typeof students.$inferSelect | undefined;
    try {
      newStudent = await db.transaction(async (tx) => {
        // Atomic single-use consumption: only succeeds if the row is currently unused.
        const consumed = await tx.update(accessCodes)
          .set({ usedBy: emailClean, usedAt: new Date() })
          .where(and(eq(accessCodes.code, codeClean), isNull(accessCodes.usedAt)))
          .returning();
        if (consumed.length === 0) {
          // Distinguish "doesn't exist" from "already used" for a clear error message
          const [exists] = await tx.select().from(accessCodes).where(eq(accessCodes.code, codeClean));
          throw Object.assign(new Error("ACCESS_CODE"), {
            status: 401,
            message: exists ? "This access code has already been used" : "Invalid access code",
          });
        }
        const [created] = await tx.insert(students).values({
          email: emailClean,
          password: passwordHash,
          accessCode: codeClean,
          status: "pending",
          expiresAt: oneYearFromNow,
        }).returning();
        return created;
      });
    } catch (txErr: any) {
      if (txErr?.status === 401) {
        res.status(401).json({ error: txErr.message });
        return;
      }
      throw txErr;
    }

    if (!newStudent) {
      res.status(500).json({ error: "Registration failed" });
      return;
    }

    // Don't auto-login — student must wait for admin approval
    res.json({
      user: { id: newStudent.id, email: newStudent.email, status: newStudent.status, expiresAt: newStudent.expiresAt },
      message: "Registration received. An administrator will review your account shortly.",
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const emailClean = email.trim().toLowerCase();
    const existing = await db.select().from(students).where(eq(students.email, emailClean));
    if (existing.length === 0) {
      res.status(404).json({ error: "Account not found. Please register first." });
      return;
    }
    const student = existing[0];

    // Verify password — per-student hash if set, else legacy global password fallback
    let passwordOk = false;
    if (student.password) {
      passwordOk = verifyPassword(password, student.password);
    } else {
      // Legacy student (registered before per-account passwords) — accept the global student password
      const [setting] = await db.select().from(settings).where(eq(settings.key, "student_password"));
      passwordOk = !!setting && setting.value === password;
    }
    if (!passwordOk) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (student.status === "denied") {
      res.status(403).json({ error: "Your account has been denied. Contact the administrator." });
      return;
    }
    const token = signToken({ id: student.id, email: student.email });
    res.cookie("intro_student", token, cookieOpts);
    res.json({ user: { id: student.id, email: student.email, status: student.status, expiresAt: student.expiresAt } });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", async (req, res) => {
  const tokenData = getStudentToken(req);
  if (!tokenData) {
    res.json({ user: null });
    return;
  }
  try {
    const [student] = await db.select().from(students).where(eq(students.id, tokenData.id));
    if (!student) {
      res.clearCookie("intro_student");
      res.json({ user: null });
      return;
    }
    res.json({ user: { id: student.id, email: student.email, status: student.status, expiresAt: student.expiresAt } });
  } catch {
    res.json({ user: null });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("intro_student");
  res.json({ ok: true });
});

router.post("/admin/login", async (req, res) => {
  try {
    const { password } = req.body as { password: string };
    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }
    const [setting] = await db.select().from(settings).where(eq(settings.key, "admin_password"));
    if (!setting || setting.value !== password) {
      res.status(401).json({ error: "Invalid admin password" });
      return;
    }
    const token = signToken({ admin: true });
    res.cookie("intro_admin", token, adminCookieOpts);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Admin login error");
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/admin/me", (req, res) => {
  res.json({ admin: getAdminToken(req) });
});

router.post("/admin/logout", (_req, res) => {
  res.clearCookie("intro_admin");
  res.json({ ok: true });
});

router.get("/admin/students", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const allStudents = await db.select().from(students).orderBy(desc(students.createdAt));
    res.json({ students: allStudents });
  } catch (err) {
    req.log.error({ err }, "List students error");
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

router.get("/admin/students/export/excel", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const ExcelJS = (await import("exceljs")).default;
    const allStudents = await db.select().from(students).orderBy(desc(students.createdAt));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Students");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Email", key: "email", width: 35 },
      { header: "Status", key: "status", width: 14 },
      { header: "Expires At", key: "expiresAt", width: 22 },
      { header: "Registered", key: "createdAt", width: 22 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A1A30" } };
    for (const s of allStudents) {
      sheet.addRow({
        id: s.id,
        email: s.email,
        status: s.status,
        expiresAt: s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "No expiry",
        createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
      });
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=students_${new Date().toISOString().slice(0, 10)}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Export Excel error");
    res.status(500).json({ error: "Failed to export Excel" });
  }
});

router.get("/admin/students/export/pdf", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const PDFDocument = (await import("pdfkit")).default;
    const allStudents = await db.select().from(students).orderBy(desc(students.createdAt));
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=students_${new Date().toISOString().slice(0, 10)}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).fillColor("#0A1A30").text("LEXO Intro — Student Report", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#00B4C8").lineWidth(2).stroke();
    doc.moveDown(0.8);

    doc.fontSize(11).fillColor("#333");
    const summary = `Total: ${allStudents.length}  |  Approved: ${allStudents.filter(s => s.status === "approved").length}  |  Pending: ${allStudents.filter(s => s.status === "pending").length}  |  Denied: ${allStudents.filter(s => s.status === "denied").length}`;
    doc.text(summary, { align: "center" });
    doc.moveDown(1);

    const colX = [40, 70, 260, 340, 440];
    const colW = [30, 190, 80, 100, 100];
    const headers = ["#", "Email", "Status", "Expires", "Registered"];

    doc.rect(40, doc.y, 515, 22).fill("#0A1A30");
    const headerY = doc.y + 6;
    doc.fontSize(9).fillColor("#FFFFFF");
    headers.forEach((h, i) => { doc.text(h, colX[i], headerY, { width: colW[i] }); });
    doc.y = headerY + 18;

    allStudents.forEach((s, idx) => {
      if (doc.y > 740) { doc.addPage(); }
      const rowY = doc.y;
      if (idx % 2 === 0) { doc.rect(40, rowY - 2, 515, 18).fill("#f7f9fb"); }
      doc.fontSize(8.5).fillColor("#333");
      doc.text(String(s.id), colX[0], rowY, { width: colW[0] });
      doc.text(s.email, colX[1], rowY, { width: colW[1] });
      const stColor = s.status === "approved" ? "#1DB954" : s.status === "denied" ? "#e74c3c" : "#e6a817";
      doc.fillColor(stColor).text(s.status.toUpperCase(), colX[2], rowY, { width: colW[2] });
      doc.fillColor("#333");
      doc.text(s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "—", colX[3], rowY, { width: colW[3] });
      doc.text(s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "", colX[4], rowY, { width: colW[4] });
      doc.y = rowY + 18;
    });

    doc.end();
  } catch (err) {
    req.log.error({ err }, "Export PDF error");
    res.status(500).json({ error: "Failed to export PDF" });
  }
});

router.post("/admin/students/:id/status", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body as { status: string };
    if (!["approved", "denied", "pending"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const [prev] = await db.select().from(students).where(eq(students.id, id));
    const [updated] = await db.update(students).set({ status }).where(eq(students.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    if (prev && prev.status !== "approved" && status === "approved") {
      notifyStudentApproved(updated.email);
    }
    res.json({ student: updated });
  } catch (err) {
    req.log.error({ err }, "Update student status error");
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.post("/admin/students/bulk-status", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { status, currentStatus } = req.body as { status: string; currentStatus?: string };
    if (!["approved", "denied", "pending"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const condition = currentStatus ? eq(students.status, currentStatus) : undefined;
    const updated = condition
      ? await db.update(students).set({ status }).where(condition).returning()
      : await db.update(students).set({ status }).returning();
    res.json({ count: updated.length });
  } catch (err) {
    req.log.error({ err }, "Bulk status update error");
    res.status(500).json({ error: "Failed to bulk update" });
  }
});

router.post("/admin/password", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { type, newPassword } = req.body as { type: string; newPassword: string };
    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters" });
      return;
    }
    const key = type === "admin" ? "admin_password" : "student_password";
    await db.update(settings).set({ value: newPassword }).where(eq(settings.key, key));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "Failed to change password" });
  }
});

router.post("/admin/students/:id/expiration", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const { expiresAt } = req.body as { expiresAt: string | null };
    const [updated] = await db
      .update(students)
      .set({ expiresAt: expiresAt ? new Date(expiresAt) : null })
      .where(eq(students.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ student: updated });
  } catch (err) {
    req.log.error({ err }, "Update expiration error");
    res.status(500).json({ error: "Failed to update expiration" });
  }
});

router.delete("/admin/students/:id", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(students).where(eq(students.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Delete student error");
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// ===== Access Codes (admin) =====
router.get("/admin/access-codes", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const codes = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt));
    res.json({ codes });
  } catch (err) {
    req.log.error({ err }, "List access codes error");
    res.status(500).json({ error: "Failed to fetch access codes" });
  }
});

router.post("/admin/access-codes", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { count } = req.body as { count?: number };
    const n = Math.max(1, Math.min(50, Number(count) || 1));
    const created: { code: string }[] = [];
    for (let i = 0; i < n; i++) {
      // Try a few times in the unlikely event of a collision
      let inserted = false;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        const code = generateAccessCode();
        try {
          await db.insert(accessCodes).values({ code }).onConflictDoNothing();
          created.push({ code });
          inserted = true;
        } catch {
          // retry
        }
      }
    }
    res.json({ codes: created });
  } catch (err) {
    req.log.error({ err }, "Generate access codes error");
    res.status(500).json({ error: "Failed to generate access codes" });
  }
});

router.delete("/admin/access-codes/:code", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const code = req.params.code.toUpperCase();
    const [existing] = await db.select().from(accessCodes).where(eq(accessCodes.code, code));
    if (!existing) {
      res.status(404).json({ error: "Access code not found" });
      return;
    }
    if (existing.usedAt) {
      res.status(400).json({ error: "Cannot delete a code that has already been used" });
      return;
    }
    await db.delete(accessCodes).where(eq(accessCodes.code, code));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Delete access code error");
    res.status(500).json({ error: "Failed to delete access code" });
  }
});

router.post("/feedback", async (req, res) => {
  const tokenData = getStudentToken(req);
  if (!tokenData) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const { tool, message } = req.body as { tool: string; message: string };
    if (!tool || !message?.trim()) {
      res.status(400).json({ error: "Tool and message are required" });
      return;
    }
    await db.execute(sql`
      INSERT INTO intro_feedback (student_id, email, tool, message) VALUES (${tokenData.id}, ${tokenData.email}, ${tool}, ${message.trim()})
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Submit feedback error");
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/admin/feedback", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db.execute(sql`SELECT * FROM intro_feedback ORDER BY created_at DESC`);
    res.json({ feedback: rows.rows });
  } catch (err) {
    req.log.error({ err }, "Fetch feedback error");
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.post("/comments", async (req, res) => {
  const tokenData = getStudentToken(req);
  if (!tokenData) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const { text, rating, name } = req.body as { text: string; rating: number; name?: string };
    if (!text?.trim() || !rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Text and rating (1-5) are required" });
      return;
    }
    const displayName = name?.trim() || tokenData.email.replace(/@.*/, "");
    const existing = await db.execute(sql`SELECT id FROM intro_comments WHERE student_id = ${tokenData.id}`);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "You have already submitted a review." });
      return;
    }
    await db.execute(sql`
      INSERT INTO intro_comments (student_id, email, name, text, rating) VALUES (${tokenData.id}, ${tokenData.email}, ${displayName}, ${text.trim()}, ${rating})
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Submit comment error");
    res.status(500).json({ error: "Failed to submit comment" });
  }
});

router.get("/comments/approved", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT id, name, text, rating, created_at FROM intro_comments WHERE status = 'approved' ORDER BY created_at DESC`);
    res.json({ comments: rows.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.get("/admin/comments", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db.execute(sql`SELECT * FROM intro_comments ORDER BY created_at DESC`);
    res.json({ comments: rows.rows });
  } catch (err) {
    req.log.error({ err }, "Fetch comments error");
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/admin/comments/:id/status", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body as { status: string };
    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    await db.execute(sql`UPDATE intro_comments SET status = ${status} WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Update comment status error");
    res.status(500).json({ error: "Failed to update comment" });
  }
});

router.delete("/admin/comments/:id", async (req, res) => {
  if (!getAdminToken(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    await db.execute(sql`DELETE FROM intro_comments WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Delete comment error");
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
