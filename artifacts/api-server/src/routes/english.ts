import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import {
  db,
  usersTable,
  englishEnrollmentsTable,
  englishAccessCodesTable,
  ENGLISH_TIER_VALUES,
  type EnglishTier,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const TierSchema = z.enum(ENGLISH_TIER_VALUES);

// PG SQLSTATE 23505 = unique_violation. drizzle-orm wraps query failures in
// DrizzleQueryError where the original pg error sits on `.cause`.
// Sentinel error: throw inside the redeem transaction so the surrounding
// `tx.update(...)` that consumed a code-use is rolled back. Caught outside.
class AlreadyEnrolledError extends Error {
  constructor(public tier: EnglishTier) {
    super("already_enrolled");
    this.name = "AlreadyEnrolledError";
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const direct = (err as { code?: unknown }).code;
  if (direct === "23505") return true;
  const cause = (err as { cause?: unknown }).cause;
  if (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: unknown }).code === "23505"
  ) {
    return true;
  }
  return false;
}

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[buf[i]! % alphabet.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}

// ----- Student endpoints -----

router.get("/english/me", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(englishEnrollmentsTable)
      .where(eq(englishEnrollmentsTable.userId, req.session.userId!));

    const now = new Date();
    const enriched = rows.map((r) => ({
      ...r,
      isActive:
        r.status === "active" && (!r.expiresAt || r.expiresAt > now),
    }));
    res.json({ enrollments: enriched });
  } catch (err) {
    next(err);
  }
});

const RedeemBody = z.object({
  code: z.string().trim().min(3).max(64),
});

router.post("/english/redeem", requireAuth, async (req, res, next) => {
  try {
    const parsed = RedeemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid code" });
      return;
    }
    const codeValue = parsed.data.code.toUpperCase();
    const userId = req.session.userId!;

    const result = await db.transaction(async (tx) => {
      const [code] = await tx
        .select()
        .from(englishAccessCodesTable)
        .where(eq(englishAccessCodesTable.code, codeValue))
        .limit(1);

      if (!code) return { error: "code_not_found" as const };
      if (code.status !== "active") return { error: "code_not_active" as const };
      if (code.expiresAt && code.expiresAt < new Date())
        return { error: "code_expired" as const };
      if (code.usedCount >= code.maxUses)
        return { error: "code_exhausted" as const };

      const tier = code.tier as EnglishTier;
      if (!ENGLISH_TIER_VALUES.includes(tier))
        return { error: "code_invalid_tier" as const };

      // Atomically claim a use.
      const claimed = await tx
        .update(englishAccessCodesTable)
        .set({
          usedCount: sql`${englishAccessCodesTable.usedCount} + 1`,
          status: sql`CASE WHEN ${englishAccessCodesTable.usedCount} + 1 >= ${englishAccessCodesTable.maxUses} THEN 'used' ELSE 'active' END`,
          redeemedByUserId: userId,
          redeemedAt: new Date(),
        })
        .where(
          and(
            eq(englishAccessCodesTable.id, code.id),
            eq(englishAccessCodesTable.status, "active"),
            sql`${englishAccessCodesTable.usedCount} < ${englishAccessCodesTable.maxUses}`,
          ),
        )
        .returning({ id: englishAccessCodesTable.id });

      if (claimed.length === 0) {
        return { error: "code_exhausted" as const };
      }

      try {
        const [enrollment] = await tx
          .insert(englishEnrollmentsTable)
          .values({
            userId,
            tier,
            status: "active",
            source: "code",
            note: `Redeemed code ${code.code}`,
          })
          .returning();
        return { enrollment };
      } catch (err) {
        // Roll back the code-use claim above by throwing — caught outside the
        // transaction so the unique-violation does not burn the access code.
        if (isUniqueViolation(err)) {
          throw new AlreadyEnrolledError(tier);
        }
        throw err;
      }
    }).catch((err) => {
      if (err instanceof AlreadyEnrolledError) {
        return { error: "already_enrolled" as const, tier: err.tier };
      }
      throw err;
    });

    if ("error" in result && result.error) {
      const map: Record<string, { status: number; message: string }> = {
        code_not_found: { status: 404, message: "Code not found" },
        code_not_active: { status: 400, message: "Code is not active" },
        code_expired: { status: 400, message: "Code has expired" },
        code_exhausted: { status: 400, message: "Code has been fully used" },
        code_invalid_tier: { status: 400, message: "Code has invalid tier" },
        already_enrolled: {
          status: 409,
          message: "You already have access to this tier",
        },
      };
      const e =
        map[result.error] ?? { status: 400, message: "Code redemption failed" };
      res.status(e.status).json({ error: e.message });
      return;
    }

    res.status(201).json({ enrollment: result.enrollment });
  } catch (err) {
    next(err);
  }
});

// ----- Admin endpoints -----

const GrantBody = z.object({
  tier: TierSchema,
  expiresAt: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
});

router.post(
  "/admin/english/students/:id/grant",
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

      const [existing] = await db
        .select()
        .from(englishEnrollmentsTable)
        .where(
          and(
            eq(englishEnrollmentsTable.userId, userId),
            eq(englishEnrollmentsTable.tier, tier),
          ),
        )
        .limit(1);

      let enrollment;
      if (existing) {
        const [updated] = await db
          .update(englishEnrollmentsTable)
          .set({
            status: "active",
            source: "admin",
            grantedBy: req.session.userId!,
            grantedAt: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            note: note ?? existing.note,
          })
          .where(eq(englishEnrollmentsTable.id, existing.id))
          .returning();
        enrollment = updated;
      } else {
        const [created] = await db
          .insert(englishEnrollmentsTable)
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
  "/admin/english/enrollments/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const [updated] = await db
        .update(englishEnrollmentsTable)
        .set({ status: "revoked" })
        .where(eq(englishEnrollmentsTable.id, String(req.params.id)))
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

router.get("/admin/english/codes", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        code: englishAccessCodesTable,
        redeemerName: usersTable.name,
        redeemerEmail: usersTable.email,
      })
      .from(englishAccessCodesTable)
      .leftJoin(
        usersTable,
        eq(englishAccessCodesTable.redeemedByUserId, usersTable.id),
      )
      .orderBy(desc(englishAccessCodesTable.createdAt));

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

router.post("/admin/english/codes", requireAdmin, async (req, res, next) => {
  try {
    const parsed = CreateCodesBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid payload", details: parsed.error.issues });
      return;
    }
    const { tier, count, maxUses, expiresAt, note } = parsed.data;
    const created = [];
    for (let i = 0; i < count; i++) {
      let inserted;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const [row] = await db
            .insert(englishAccessCodesTable)
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

router.delete(
  "/admin/english/codes/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const [updated] = await db
        .update(englishAccessCodesTable)
        .set({ status: "revoked" })
        .where(eq(englishAccessCodesTable.id, String(req.params.id)))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Code not found" });
        return;
      }
      res.json({ code: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
