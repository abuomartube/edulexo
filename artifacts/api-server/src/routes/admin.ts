import { Router, type IRouter } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import {
  db,
  usersTable,
  enrollmentsTable,
  accessCodesTable,
  TIER_VALUES,
  ENROLLMENT_STATUS_VALUES,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const TierSchema = z.enum(TIER_VALUES);
const EnrollmentStatusSchema = z.enum(ENROLLMENT_STATUS_VALUES);
const RoleSchema = z.enum(["student", "admin"]);

function generateCode(): string {
  // 12-char human-friendly code: ABCD-EFGH-JKLM (no I/O/0/1 confusion)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[buf[i]! % alphabet.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}

router.get("/admin/students", requireAdmin, async (_req, res, next) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    const enrollments = await db.select().from(enrollmentsTable);
    const byUser = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const arr = byUser.get(e.userId) ?? [];
      arr.push(e);
      byUser.set(e.userId, arr);
    }

    const students = users.map((u) => ({
      ...u,
      enrollments: byUser.get(u.id) ?? [],
    }));
    res.json({ students });
  } catch (err) {
    next(err);
  }
});

const GrantBody = z.object({
  tier: TierSchema,
  expiresAt: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
});

router.post(
  "/admin/students/:id/grant",
  requireAdmin,
  async (req, res, next) => {
    try {
      const userId = String(req.params.id);
      const parsed = GrantBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid grant payload" });
        return;
      }
      const { tier, expiresAt, note } = parsed.data;

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!user) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      // Reactivate existing enrollment if present, else create new
      const [existing] = await db
        .select()
        .from(enrollmentsTable)
        .where(
          and(
            eq(enrollmentsTable.userId, userId),
            eq(enrollmentsTable.tier, tier),
          ),
        )
        .limit(1);

      let enrollment;
      if (existing) {
        const [updated] = await db
          .update(enrollmentsTable)
          .set({
            status: "active",
            source: "admin",
            grantedBy: req.session.userId!,
            grantedAt: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            note: note ?? existing.note,
          })
          .where(eq(enrollmentsTable.id, existing.id))
          .returning();
        enrollment = updated;
      } else {
        const [created] = await db
          .insert(enrollmentsTable)
          .values({
            userId,
            tier,
            status: "active",
            source: "admin",
            grantedBy: req.session.userId!,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            note,
          })
          .returning();
        enrollment = created;
      }

      res.status(201).json({ enrollment });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/admin/enrollments/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const [updated] = await db
        .update(enrollmentsTable)
        .set({ status: "revoked" })
        .where(eq(enrollmentsTable.id, String(req.params.id)))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Enrollment not found" });
        return;
      }
      res.json({ enrollment: updated });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /admin/students/:id — edit name and/or role.
// Email is intentionally NOT editable (it's the auth identity).
// Password changes flow through the password-reset endpoint.
const PatchStudentBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: RoleSchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.role !== undefined, {
    message: "Provide at least one of: name, role",
  });

router.patch("/admin/students/:id", requireAdmin, async (req, res, next) => {
  try {
    const userId = String(req.params.id);
    const parsed = PatchStudentBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
      return;
    }
    // Self-demotion guard: an admin cannot demote themselves to student.
    // (Demotion-by-other-admins is allowed; this only prevents lockout.)
    if (
      parsed.data.role === "student" &&
      req.session.userId === userId
    ) {
      res
        .status(400)
        .json({ error: "You cannot demote yourself from admin to student." });
      return;
    }
    const [updated] = await db
      .update(usersTable)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        emailVerified: usersTable.emailVerified,
        createdAt: usersTable.createdAt,
      });
    if (!updated) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ student: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/students/:id — hard delete. FK cascade removes enrollments,
// password-reset tokens, and email-verification tokens. Self-delete is
// blocked to prevent admin lockout.
router.delete("/admin/students/:id", requireAdmin, async (req, res, next) => {
  try {
    const userId = String(req.params.id);
    if (req.session.userId === userId) {
      res.status(400).json({ error: "You cannot delete your own account." });
      return;
    }
    const [deleted] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ message: "Student deleted." });
  } catch (err) {
    next(err);
  }
});

// GET /admin/enrollments — list all enrollments with student info.
// Optional ?status= and ?tier= filters.
router.get("/admin/enrollments", requireAdmin, async (req, res, next) => {
  try {
    const statusFilter = EnrollmentStatusSchema.safeParse(req.query.status);
    const tierFilter = TierSchema.safeParse(req.query.tier);

    const conditions = [];
    if (statusFilter.success) conditions.push(eq(enrollmentsTable.status, statusFilter.data));
    if (tierFilter.success) conditions.push(eq(enrollmentsTable.tier, tierFilter.data));

    const baseQuery = db
      .select({
        id: enrollmentsTable.id,
        userId: enrollmentsTable.userId,
        studentName: usersTable.name,
        studentEmail: usersTable.email,
        tier: enrollmentsTable.tier,
        status: enrollmentsTable.status,
        source: enrollmentsTable.source,
        grantedAt: enrollmentsTable.grantedAt,
        expiresAt: enrollmentsTable.expiresAt,
        note: enrollmentsTable.note,
      })
      .from(enrollmentsTable)
      .leftJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id));

    const rows = conditions.length
      ? await baseQuery.where(and(...conditions)).orderBy(desc(enrollmentsTable.grantedAt))
      : await baseQuery.orderBy(desc(enrollmentsTable.grantedAt));

    res.json({ enrollments: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/enrollments/:id — change status, expiry, note.
// When promoting an enrollment back to 'active', verify no other active
// enrollment exists for the same (userId, tier) — otherwise the partial
// unique index would reject the update with 23505.
const PatchEnrollmentBody = z
  .object({
    status: EnrollmentStatusSchema.optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.expiresAt !== undefined ||
      d.note !== undefined,
    { message: "Provide at least one of: status, expiresAt, note" },
  );

router.patch(
  "/admin/enrollments/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const enrollmentId = String(req.params.id);
      const parsed = PatchEnrollmentBody.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: parsed.error.issues[0]?.message ?? "Invalid payload",
          });
        return;
      }

      const [existing] = await db
        .select()
        .from(enrollmentsTable)
        .where(eq(enrollmentsTable.id, enrollmentId))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: "Enrollment not found" });
        return;
      }

      // Pre-flight uniqueness check when activating.
      if (
        parsed.data.status === "active" &&
        existing.status !== "active"
      ) {
        const [conflict] = await db
          .select({ id: enrollmentsTable.id })
          .from(enrollmentsTable)
          .where(
            and(
              eq(enrollmentsTable.userId, existing.userId),
              eq(enrollmentsTable.tier, existing.tier),
              eq(enrollmentsTable.status, "active"),
              ne(enrollmentsTable.id, enrollmentId),
            ),
          )
          .limit(1);
        if (conflict) {
          res.status(409).json({
            error:
              "Another active enrollment already exists for this user and tier. Revoke or expire it first.",
          });
          return;
        }
      }

      const updates: Partial<typeof enrollmentsTable.$inferInsert> = {};
      if (parsed.data.status !== undefined) updates.status = parsed.data.status;
      if (parsed.data.expiresAt !== undefined)
        updates.expiresAt = parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null;
      if (parsed.data.note !== undefined) updates.note = parsed.data.note;

      const [updated] = await db
        .update(enrollmentsTable)
        .set(updates)
        .where(eq(enrollmentsTable.id, enrollmentId))
        .returning();

      res.json({ enrollment: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/admin/codes", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        code: accessCodesTable,
        redeemerName: usersTable.name,
        redeemerEmail: usersTable.email,
      })
      .from(accessCodesTable)
      .leftJoin(usersTable, eq(accessCodesTable.redeemedByUserId, usersTable.id))
      .orderBy(desc(accessCodesTable.createdAt));

    const codes = rows.map((r) => ({
      ...r.code,
      redeemerName: r.redeemerName,
      redeemerEmail: r.redeemerEmail,
    }));
    res.json({ codes });
  } catch (err) {
    next(err);
  }
});

const CreateCodesBody = z.object({
  tier: TierSchema,
  count: z.number().int().min(1).max(100).default(1),
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
});

router.post("/admin/codes", requireAdmin, async (req, res, next) => {
  try {
    const parsed = CreateCodesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
      return;
    }
    const { tier, count, maxUses, expiresAt, note } = parsed.data;
    const created = [];
    for (let i = 0; i < count; i++) {
      // Retry up to 3 times on collision
      let inserted;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const [row] = await db
            .insert(accessCodesTable)
            .values({
              code: generateCode(),
              tier,
              maxUses,
              createdBy: req.session.userId!,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              note,
            })
            .returning();
          inserted = row;
          break;
        } catch (err: unknown) {
          if (attempt === 2) throw err;
        }
      }
      if (inserted) created.push(inserted);
    }
    res.status(201).json({ codes: created });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/codes/:id", requireAdmin, async (req, res, next) => {
  try {
    const [updated] = await db
      .update(accessCodesTable)
      .set({ status: "revoked" })
      .where(eq(accessCodesTable.id, String(req.params.id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Code not found" });
      return;
    }
    res.json({ code: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
