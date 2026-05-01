import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import {
  db,
  usersTable,
  enrollmentsTable,
  accessCodesTable,
  TIER_VALUES,
  type Tier,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const TierSchema = z.enum(TIER_VALUES);

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
