import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import {
  db,
  usersTable,
  englishEnrollmentsTable,
  englishAccessCodesTable,
  englishLessonProgressTable,
  englishLessonCompletionsTable,
  ENGLISH_TIER_VALUES,
  type EnglishTier,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";
import { subscriptionExpiryFromNow } from "../lib/subscription-policy";
import {
  notifyStudentSelfEnrolled,
  notifyEnrollmentApproved,
} from "../lib/email-triggers";

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

const StudyTimeQuery = z.object({
  range: z.enum(["week", "month"]).optional().default("week"),
});

// GET /english/me/study-time?range=week|month
//
// Aggregates `english_lesson_progress.watchedSeconds` for the current
// student into a single total + a per-day breakdown across the requested
// window (default: last 7 days, inclusive of today).
//
// IMPORTANT — daily breakdown is an approximation. The progress table
// stores a single cumulative `watchedSeconds` per (user, lesson) plus a
// single `updatedAt` (last write). We have no per-watch-event log, so a
// lesson's full cumulative time is attributed to the date of its most
// recent update. This is the best signal available without a new table.
router.get("/english/me/study-time", requireAuth, async (req, res, next) => {
  try {
    const parsed = StudyTimeQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid range" });
      return;
    }
    const userId = req.session.userId!;
    const days = parsed.data.range === "month" ? 30 : 7;

    // Build the inclusive [startOfDay(today - days+1), now] window in UTC.
    // Days in the response are UTC calendar dates (YYYY-MM-DD).
    const now = new Date();
    const startUtc = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (days - 1),
      ),
    );

    // Sum cumulative watchedSeconds per UTC day of last update,
    // restricted to rows updated within the window.
    const rows = await db
      .select({
        day: sql<string>`to_char(${englishLessonProgressTable.updatedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        seconds: sql<number>`COALESCE(SUM(${englishLessonProgressTable.watchedSeconds}), 0)::int`,
      })
      .from(englishLessonProgressTable)
      .where(
        and(
          eq(englishLessonProgressTable.userId, userId),
          sql`${englishLessonProgressTable.updatedAt} >= ${startUtc}`,
        ),
      )
      .groupBy(
        sql`to_char(${englishLessonProgressTable.updatedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      );

    const byDay = new Map<string, number>();
    let totalSeconds = 0;
    for (const r of rows) {
      const s = Number(r.seconds) || 0;
      byDay.set(r.day, s);
      totalSeconds += s;
    }

    const dailyBreakdown: { date: string; minutes: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(
        Date.UTC(
          startUtc.getUTCFullYear(),
          startUtc.getUTCMonth(),
          startUtc.getUTCDate() + i,
        ),
      );
      const key = d.toISOString().slice(0, 10);
      const seconds = byDay.get(key) ?? 0;
      dailyBreakdown.push({ date: key, minutes: Math.round(seconds / 60) });
    }

    // Total minutes is computed from raw total seconds (one rounding step),
    // NOT from the sum of already-rounded per-day buckets — the latter can
    // drift significantly when many days have small (sub-minute) values.
    const totalMinutes = Math.round(totalSeconds / 60);

    res.set("Cache-Control", "no-store");
    res.json({ totalMinutes, dailyBreakdown });
  } catch (err) {
    next(err);
  }
});

// GET /english/me/streak
//
// Daily-activity streak for the current student, derived from the only
// per-day signals we have today: english_lesson_progress.updatedAt and
// english_lesson_completions.completedAt. No new table, no migrations.
//
// Day boundary is UTC. Lookback is 400 days (covers the longest plausible
// streak; anything older is trimmed). Returns:
//   - currentStreak:  consecutive UTC days ending today (or yesterday if
//                     the student hasn't done anything yet today). 0 when
//                     the most recent activity is older than yesterday.
//   - longestStreak:  longest run of consecutive active days seen in the
//                     400-day window.
//   - todayActive:    true iff there's activity on today's UTC date.
//   - lastActiveDate: most recent active UTC date as YYYY-MM-DD, or null.
router.get("/english/me/streak", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;

    // Distinct UTC days the user had any English lesson activity in the
    // last ~400 days, ordered newest first. Single round-trip via UNION.
    const rows = await db.execute<{ day: string }>(sql`
      SELECT DISTINCT day FROM (
        SELECT (${englishLessonProgressTable.updatedAt} AT TIME ZONE 'UTC')::date AS day
        FROM ${englishLessonProgressTable}
        WHERE ${englishLessonProgressTable.userId} = ${userId}
          AND ${englishLessonProgressTable.updatedAt} >= now() - interval '400 days'
        UNION
        SELECT (${englishLessonCompletionsTable.completedAt} AT TIME ZONE 'UTC')::date AS day
        FROM ${englishLessonCompletionsTable}
        WHERE ${englishLessonCompletionsTable.userId} = ${userId}
          AND ${englishLessonCompletionsTable.completedAt} >= now() - interval '400 days'
      ) d
      ORDER BY day DESC
    `);

    // pg returns DATE as a "YYYY-MM-DD" string under node-postgres' default
    // type parser config in this project. Normalize defensively.
    const days: string[] = [];
    for (const r of rows.rows ?? []) {
      const v = (r as { day: unknown }).day;
      const s =
        v instanceof Date
          ? v.toISOString().slice(0, 10)
          : typeof v === "string"
            ? v.slice(0, 10)
            : null;
      if (s) days.push(s);
    }

    const todayUtc = new Date().toISOString().slice(0, 10);
    const yesterdayUtc = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);

    const lastActiveDate = days[0] ?? null;
    const todayActive = lastActiveDate === todayUtc;

    // Current streak: walk consecutive days backward from today (or
    // yesterday — grace so the streak doesn't appear "broken" until a
    // full day is missed). Stop at the first gap.
    let currentStreak = 0;
    if (lastActiveDate === todayUtc || lastActiveDate === yesterdayUtc) {
      const set = new Set(days);
      let cursor = new Date(`${lastActiveDate}T00:00:00Z`);
      while (set.has(cursor.toISOString().slice(0, 10))) {
        currentStreak += 1;
        cursor = new Date(cursor.getTime() - 86_400_000);
      }
    }

    // Longest streak across the window: scan ascending and track the
    // longest run of consecutive dates.
    let longestStreak = 0;
    if (days.length > 0) {
      const asc = [...days].reverse();
      let run = 1;
      longestStreak = 1;
      for (let i = 1; i < asc.length; i++) {
        const prev = new Date(`${asc[i - 1]}T00:00:00Z`).getTime();
        const cur = new Date(`${asc[i]}T00:00:00Z`).getTime();
        if (cur - prev === 86_400_000) {
          run += 1;
          if (run > longestStreak) longestStreak = run;
        } else {
          run = 1;
        }
      }
    }

    res.set("Cache-Control", "no-store");
    res.json({ currentStreak, longestStreak, todayActive, lastActiveDate });
  } catch (err) {
    next(err);
  }
});

router.get("/english/me", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(englishEnrollmentsTable)
      .where(eq(englishEnrollmentsTable.userId, req.session.userId!));

    const now = new Date();
    const enriched = rows.map((r) => ({
      ...r,
      isActive: r.status === "active" && (!r.expiresAt || r.expiresAt > now),
    }));
    res.set("Cache-Control", "no-store");
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

    const result = await db
      .transaction(async (tx) => {
        const [code] = await tx
          .select()
          .from(englishAccessCodesTable)
          .where(eq(englishAccessCodesTable.code, codeValue))
          .limit(1);

        if (!code) return { error: "code_not_found" as const };
        if (code.status !== "active")
          return { error: "code_not_active" as const };
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
              expiresAt: subscriptionExpiryFromNow(),
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
      })
      .catch((err) => {
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
      const e = map[result.error] ?? {
        status: 400,
        message: "Code redemption failed",
      };
      res.status(e.status).json({ error: e.message });
      return;
    }

    const enrollment = result.enrollment!;
    notifyStudentSelfEnrolled({
      log: req.log,
      userId: enrollment.userId,
      course: "english",
      tier: enrollment.tier,
      enrollmentId: enrollment.id,
    }).catch(() => undefined);

    res.status(201).json({ enrollment });
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
      const wasAlreadyActive = existing?.status === "active";
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

      // Send confirmation only when the enrollment newly became active
      // (skip if it was already active and the admin just refreshed it).
      if (enrollment && !wasAlreadyActive) {
        notifyEnrollmentApproved({
          log: req.log,
          userId: enrollment.userId,
          course: "english",
          tier: enrollment.tier,
          enrollmentId: enrollment.id,
        }).catch(() => undefined);
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
