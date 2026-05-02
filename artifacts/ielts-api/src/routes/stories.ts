import { Router } from "express";
import { db, storiesTable } from "@workspace/ielts-db";
import { eq, asc, inArray } from "drizzle-orm";
import {
  verifyStudentEmail,
  getStudentTier,
  tierAllowsLevel,
  tierLevels,
} from "../lib/tier-auth.js";

const router = Router();

const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "";

function requireAdmin(req: import("express").Request, res: import("express").Response): boolean {
  const ap = (req.headers["x-admin-password"] as string) ?? (req.body?.adminPassword ?? "");
  if (!ADMIN_PASSWORD || ap !== ADMIN_PASSWORD) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/stories", async (req, res): Promise<void> => {
  const email = verifyStudentEmail(req);
  const tier = await getStudentTier(email);
  const { level } = req.query;

  // Explicit level filter must be tier-allowed.
  if (level && typeof level === "string" && !tierAllowsLevel(tier, level)) {
    res.status(403).json({ error: "Tier does not allow this level" });
    return;
  }

  let rows;
  if (level && typeof level === "string") {
    rows = await db.select().from(storiesTable)
      .where(eq(storiesTable.level, level))
      .orderBy(asc(storiesTable.orderIndex), asc(storiesTable.id));
  } else {
    // Unfiltered list: clamp to the tier's allowed levels.
    const allowed = tierLevels(tier);
    rows = allowed
      ? await db.select().from(storiesTable)
          .where(inArray(storiesTable.level, [...allowed]))
          .orderBy(asc(storiesTable.level), asc(storiesTable.orderIndex), asc(storiesTable.id))
      : await db.select().from(storiesTable)
          .orderBy(asc(storiesTable.level), asc(storiesTable.orderIndex), asc(storiesTable.id));
  }
  res.json(rows);
});

router.get("/stories/:id", async (req, res): Promise<void> => {
  const email = verifyStudentEmail(req);
  const tier = await getStudentTier(email);
  const id = Number(req.params.id);
  const rows = await db.select().from(storiesTable).where(eq(storiesTable.id, id));
  if (rows.length === 0) { res.status(404).json({ error: "Story not found" }); return; }
  const story = rows[0]!;
  if (!tierAllowsLevel(tier, story.level)) {
    res.status(403).json({ error: "Tier does not allow this story" });
    return;
  }
  res.json(story);
});

router.post("/admin/stories", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { title, titleArabic, content, contentArabic, level, orderIndex } = req.body ?? {};
  if (!title || !titleArabic || !content || !contentArabic || !level) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const [story] = await db.insert(storiesTable)
    .values({ title, titleArabic, content, contentArabic, level, orderIndex: orderIndex ?? 0 })
    .returning();
  res.json(story);
});

router.put("/admin/stories/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { title, titleArabic, content, contentArabic, level, orderIndex } = req.body ?? {};
  await db.update(storiesTable)
    .set({ title, titleArabic, content, contentArabic, level, orderIndex })
    .where(eq(storiesTable.id, id));
  res.json({ success: true });
});

router.delete("/admin/stories/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  await db.delete(storiesTable).where(eq(storiesTable.id, id));
  res.json({ success: true });
});

export default router;
