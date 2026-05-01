import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  enrollmentsTable,
  englishEnrollmentsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { sendEmail } from "../lib/email";
import { broadcastEmailLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

const BroadcastBody = z.object({
  audience: z.enum(["all", "course"]),
  courseSlug: z.enum(["intro", "english", "ielts"]).optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000),
});

// GET /admin/email/recipients?audience=all|course&courseSlug=...
// Returns the count of distinct recipients that would receive the broadcast,
// so the UI can show a confirmation dialog with the real number before send.
router.get("/admin/email/recipients", requireAdmin, async (req, res, next) => {
  try {
    const audience = req.query.audience;
    const courseSlug = req.query.courseSlug;
    if (audience === "all") {
      const [{ c }] = (await db.execute(
        sql`SELECT COUNT(*)::text AS c FROM users WHERE email_verified = TRUE`,
      )).rows as { c: string }[];
      res.json({ count: Number(c ?? 0) });
      return;
    }
    if (audience === "course") {
      if (courseSlug === "intro") {
        const [{ c }] = (await db.execute(sql`
          SELECT COUNT(DISTINCT u.id)::text AS c
          FROM users u
          JOIN enrollments e ON e.user_id = u.id
          WHERE u.email_verified = TRUE AND e.status = 'active'
        `)).rows as { c: string }[];
        res.json({ count: Number(c ?? 0) });
        return;
      }
      if (courseSlug === "english") {
        const [{ c }] = (await db.execute(sql`
          SELECT COUNT(DISTINCT u.id)::text AS c
          FROM users u
          JOIN english_enrollments e ON e.user_id = u.id
          WHERE u.email_verified = TRUE AND e.status = 'active'
        `)).rows as { c: string }[];
        res.json({ count: Number(c ?? 0) });
        return;
      }
      if (courseSlug === "ielts") {
        // No ielts_enrollments table yet. Always 0.
        res.json({ count: 0 });
        return;
      }
    }
    res.status(400).json({ error: "Invalid audience or courseSlug" });
  } catch (err) {
    next(err);
  }
});

// POST /admin/email/broadcast
router.post(
  "/admin/email/broadcast",
  broadcastEmailLimiter,
  requireAdmin,
  async (req, res, next) => {
  try {
    const parsed = BroadcastBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
      return;
    }
    const { audience, courseSlug, subject, body } = parsed.data;

    let recipients: { id: string; name: string; email: string }[] = [];
    if (audience === "all") {
      recipients = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
        })
        .from(usersTable)
        .where(eq(usersTable.emailVerified, true));
    } else {
      if (!courseSlug) {
        res
          .status(400)
          .json({ error: "courseSlug is required when audience=course" });
        return;
      }
      if (courseSlug === "intro") {
        const rows = (await db.execute(sql`
          SELECT DISTINCT u.id, u.name, u.email
          FROM users u
          JOIN enrollments e ON e.user_id = u.id
          WHERE u.email_verified = TRUE AND e.status = 'active'
        `)).rows as { id: string; name: string; email: string }[];
        recipients = rows;
      } else if (courseSlug === "english") {
        const rows = (await db.execute(sql`
          SELECT DISTINCT u.id, u.name, u.email
          FROM users u
          JOIN english_enrollments e ON e.user_id = u.id
          WHERE u.email_verified = TRUE AND e.status = 'active'
        `)).rows as { id: string; name: string; email: string }[];
        recipients = rows;
      } else {
        // ielts has no enrollments table yet
        recipients = [];
      }
    }

    let sentCount = 0;
    let failedCount = 0;
    for (const r of recipients) {
      try {
        await sendEmail({
          to: r.email,
          subject,
          text: `Hi ${r.name},\n\n${body}\n\n— Abu Omar EduLexo`,
        });
        sentCount += 1;
      } catch (err) {
        failedCount += 1;
        req.log.error(
          { err, recipient: r.email },
          "Failed to send broadcast email",
        );
      }
    }

    req.log.info(
      {
        audience,
        courseSlug: courseSlug ?? null,
        recipientCount: recipients.length,
        sentCount,
        failedCount,
      },
      "Broadcast email completed",
    );

    res.json({
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      stubMode: true,
    });
  } catch (err) {
    next(err);
  }
  },
);

export default router;
