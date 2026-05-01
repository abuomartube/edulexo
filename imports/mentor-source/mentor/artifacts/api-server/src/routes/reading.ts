import { Router, type Request } from "express";
import { db } from "@workspace/db";
import { readingAttempts } from "@workspace/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  READING_TYPES,
  type AnswerEntry,
  type ReadingItem,
  type ReadingLevel,
  type ReadingType,
  type SubQuestion,
} from "../reading/itemBank";
import { gradeItem } from "../reading/grader";
import {
  createItem,
  deleteItem,
  initReadingItems,
  loadAllItemRows,
  loadAllItems,
  loadItemRowBySlug,
  loadItemsByLevelAndType,
  loadItemBySlug,
  updateItem,
  type ReadingItemUpsertInput,
} from "../reading/store";
import { getAdminToken, getStudentToken } from "./auth";

function studentIdFrom(req: Request): number | null {
  const tok = getStudentToken(req as { cookies?: Record<string, string> });
  return tok?.id ?? null;
}

function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "23505";
}

const router = Router();

async function ensureAttemptsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reading_attempts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        item_slug VARCHAR(64) NOT NULL,
        level VARCHAR(8) NOT NULL,
        type VARCHAR(32) NOT NULL,
        answers JSONB NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percent REAL NOT NULL,
        results JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS reading_attempts_student_item_uniq
      ON reading_attempts (student_id, item_slug)
    `);
  } catch (err) {
    console.error("[reading] failed to ensure reading_attempts table:", err);
  }
}
ensureAttemptsTable();
initReadingItems().catch((err) => {
  console.error("[reading] init failed:", err);
});

const VALID_LEVELS = new Set(["a2", "b1"]);
const VALID_TYPES = new Set(READING_TYPES.map((t) => t.id));

function publicItem(item: ReadingItem) {
  return {
    slug: item.slug,
    level: item.level,
    type: item.type,
    title: item.title,
    instructions: item.instructions,
    passage: item.passage,
    paragraphs: item.paragraphs ?? [],
    options: item.options ?? [],
    questions: item.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      ...(q.mcqOptions ? { mcqOptions: q.mcqOptions } : {}),
    })),
  };
}

// GET /levels-types — metadata: levels + question types + per-bucket counts
// Used to render the level + type pickers without one query per bucket.
router.get("/levels-types", async (req, res) => {
  try {
    const items = await loadAllItems();
    const counts: Record<string, number> = {};
    for (const it of items) counts[`${it.level}:${it.type}`] = (counts[`${it.level}:${it.type}`] ?? 0) + 1;
    res.json({
      levels: [
        { id: "a2", label: "A2 — Elementary", description: "Short, simple texts with literal answers." },
        { id: "b1", label: "B1 — Intermediate", description: "Longer texts with paraphrasing and synonyms." },
      ],
      types: READING_TYPES,
      counts,
    });
  } catch (err) {
    req.log?.error?.({ err }, "List levels-types error");
    console.error("[reading] /levels-types error", err);
    res.status(500).json({ error: "list_failed" });
  }
});

// GET /items?level=a2&type=mcq — list of public items in the bucket, with
// per-item completion flags so the type page can show progress out of 5.
router.get("/items", async (req, res) => {
  const studentId = studentIdFrom(req);
  const level = String(req.query.level ?? "").toLowerCase() as ReadingLevel;
  const type = String(req.query.type ?? "").toLowerCase() as ReadingType;
  if (!VALID_LEVELS.has(level) || !VALID_TYPES.has(type)) {
    res.status(400).json({ error: "invalid_level_or_type" });
    return;
  }
  try {
    const items = await loadItemsByLevelAndType(level, type);
    const completed = studentId
      ? await db
          .select({
            slug: readingAttempts.itemSlug,
            score: readingAttempts.score,
            total: readingAttempts.total,
            percent: readingAttempts.percent,
            createdAt: readingAttempts.createdAt,
          })
          .from(readingAttempts)
          .where(
            and(
              eq(readingAttempts.studentId, studentId),
              eq(readingAttempts.level, level),
              eq(readingAttempts.type, type),
            ),
          )
      : [];
    const completedMap = new Map(completed.map((c) => [c.slug, c]));
    res.json({
      items: items.map((it) => ({
        slug: it.slug,
        title: it.title,
        questionCount: it.questions.length,
        completed: completedMap.has(it.slug),
        result: completedMap.get(it.slug) ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List reading items error");
    res.status(500).json({ error: "list_failed" });
  }
});

// GET /items/:slug — public item shape (no answers), plus existing attempt
// if the student has already submitted this item before.
router.get("/items/:slug", async (req, res) => {
  const studentId = studentIdFrom(req);
  const item = await loadItemBySlug(req.params.slug);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  try {
    if (studentId) {
      const [existing] = await db
        .select()
        .from(readingAttempts)
        .where(
          and(eq(readingAttempts.studentId, studentId), eq(readingAttempts.itemSlug, item.slug)),
        );
      if (existing) {
        res.json({
          item: publicItem(item),
          alreadyCompleted: true,
          attempt: {
            id: existing.id,
            answers: existing.answers,
            score: existing.score,
            total: existing.total,
            percent: existing.percent,
            results: existing.results,
            createdAt: existing.createdAt,
          },
        });
        return;
      }
    }
    res.json({ item: publicItem(item), alreadyCompleted: false });
  } catch (err) {
    req.log.error({ err }, "Get reading item error");
    res.status(500).json({ error: "fetch_failed" });
  }
});

// POST /items/:slug/submit — grade and persist the student's attempt.
// Returns the existing attempt (409) if the student has already submitted.
router.post("/items/:slug/submit", async (req, res) => {
  const studentId = studentIdFrom(req);
  if (!studentId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const item = await loadItemBySlug(req.params.slug);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(readingAttempts)
      .where(
        and(eq(readingAttempts.studentId, studentId), eq(readingAttempts.itemSlug, item.slug)),
      );
    if (existing) {
      res.status(409).json({ error: "Item already completed", attempt: existing });
      return;
    }

    const body = req.body as { answers?: unknown };
    const answers = body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      res.status(400).json({ error: "Missing answers" });
      return;
    }
    const answersRecord = answers as Record<string, unknown>;
    const grade = gradeItem(item, answersRecord);

    try {
      const [inserted] = await db
        .insert(readingAttempts)
        .values({
          studentId,
          itemSlug: item.slug,
          level: item.level,
          type: item.type,
          answers: answersRecord,
          score: grade.score,
          total: grade.total,
          percent: grade.percent,
          results: grade.results,
        })
        .returning();
      res.json({
        attempt: {
          id: inserted.id,
          answers: answersRecord,
          score: inserted.score,
          total: inserted.total,
          percent: inserted.percent,
          results: inserted.results,
          createdAt: inserted.createdAt,
        },
      });
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        const [again] = await db
          .select()
          .from(readingAttempts)
          .where(
            and(eq(readingAttempts.studentId, studentId), eq(readingAttempts.itemSlug, item.slug)),
          );
        if (again) {
          res.status(409).json({ error: "Item already completed", attempt: again });
          return;
        }
      }
      throw err;
    }
  } catch (err) {
    req.log.error({ err }, "Submit reading item error");
    res.status(500).json({ error: "submit_failed" });
  }
});

// GET /attempts — full history for the current student, grouped by bucket.
router.get("/attempts", async (req, res) => {
  const studentId = studentIdFrom(req);
  if (!studentId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const rows = await db
      .select({
        id: readingAttempts.id,
        itemSlug: readingAttempts.itemSlug,
        level: readingAttempts.level,
        type: readingAttempts.type,
        score: readingAttempts.score,
        total: readingAttempts.total,
        percent: readingAttempts.percent,
        createdAt: readingAttempts.createdAt,
      })
      .from(readingAttempts)
      .where(eq(readingAttempts.studentId, studentId))
      .orderBy(desc(readingAttempts.createdAt));
    res.json({ attempts: rows });
  } catch (err) {
    req.log.error({ err }, "List reading attempts error");
    res.status(500).json({ error: "list_failed" });
  }
});

// ===========================================================================
// Admin CRUD — exposed on a separate router so it can be mounted before the
// student-only `requireActiveStudent` middleware (admins are not students).
// ===========================================================================
export const readingAdminRouter = Router();

function requireAdmin(req: Request): boolean {
  return getAdminToken(req as { cookies?: Record<string, string> });
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const TFNG_VALUES = new Set(["true", "false", "ng"]);
const YNNG_VALUES = new Set(["yes", "no", "ng"]);

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asTrimmedString(v: unknown): string {
  return asString(v).trim();
}

function parseStringArray(v: unknown, label: string): string[] {
  if (!Array.isArray(v)) throw new Error(`${label} must be an array`);
  return v.map((x, i) => {
    if (typeof x !== "string") throw new Error(`${label}[${i}] must be a string`);
    return x.trim();
  });
}

function parseParagraphs(v: unknown): { label: string; text: string }[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Error("paragraphs must be an array");
  return v.map((p, i) => {
    if (!p || typeof p !== "object") throw new Error(`Paragraph ${i + 1}: invalid`);
    const obj = p as Record<string, unknown>;
    const label = asTrimmedString(obj.label);
    const text = asString(obj.text).trim();
    if (!label) throw new Error(`Paragraph ${i + 1}: label is required`);
    if (!text) throw new Error(`Paragraph ${i + 1}: text is required`);
    return { label, text };
  });
}

function parseAnswerEntry(
  qid: string,
  type: ReadingType,
  optionsLen: number,
  mcqOptionsLen: number,
  raw: unknown,
): AnswerEntry {
  if (!raw || typeof raw !== "object") throw new Error(`Question ${qid}: missing answer key entry`);
  const ak = raw as Record<string, unknown>;
  const explanation = asString(ak.explanation).trim();
  if (!explanation) throw new Error(`Question ${qid}: answer explanation is required`);

  let value: string | number;
  let acceptable: string[] | undefined;

  if (type === "mcq" || type === "skimming") {
    const idx = Number(ak.value);
    if (!Number.isInteger(idx) || idx < 0 || idx >= mcqOptionsLen) {
      throw new Error(`Question ${qid}: answer index out of range (0..${mcqOptionsLen - 1})`);
    }
    value = idx;
  } else if (type === "scanning") {
    // Scanning is polymorphic: per-question shape decided by mcqOptionsLen.
    // mcqOptionsLen > 0 => MCQ-shape (numeric index, e.g. A2 scanning items).
    // mcqOptionsLen === 0 => fill-in-the-blank (string + optional acceptable[]).
    if (mcqOptionsLen > 0) {
      const idx = Number(ak.value);
      if (!Number.isInteger(idx) || idx < 0 || idx >= mcqOptionsLen) {
        throw new Error(`Question ${qid}: answer index out of range (0..${mcqOptionsLen - 1})`);
      }
      value = idx;
    } else {
      const v = asString(ak.value).trim();
      if (!v) throw new Error(`Question ${qid}: answer is required`);
      value = v;
      if (ak.acceptable !== undefined) {
        acceptable = parseStringArray(ak.acceptable, `Question ${qid}: acceptable`).filter(Boolean);
      }
    }
  } else if (type === "matching_headings" || type === "matching_features") {
    const idx = Number(ak.value);
    if (!Number.isInteger(idx) || idx < 0 || idx >= optionsLen) {
      throw new Error(`Question ${qid}: answer index out of range (0..${optionsLen - 1})`);
    }
    value = idx;
  } else if (type === "tfng") {
    const v = asString(ak.value).toLowerCase().trim();
    if (!TFNG_VALUES.has(v)) {
      throw new Error(`Question ${qid}: answer must be one of true / false / ng`);
    }
    value = v;
  } else if (type === "ynng") {
    const v = asString(ak.value).toLowerCase().trim();
    if (!YNNG_VALUES.has(v)) {
      throw new Error(`Question ${qid}: answer must be one of yes / no / ng`);
    }
    value = v;
  } else {
    // completion / short_answer — value is the canonical string; acceptable
    // is the optional list of alternative correct spellings.
    const v = asString(ak.value).trim();
    if (!v) throw new Error(`Question ${qid}: answer is required`);
    value = v;
    if (ak.acceptable !== undefined) {
      acceptable = parseStringArray(ak.acceptable, `Question ${qid}: acceptable`).filter(Boolean);
    }
  }

  return acceptable && acceptable.length > 0
    ? { value, acceptable, explanation }
    : { value, explanation };
}

interface ParsedItemPayload extends Omit<ReadingItemUpsertInput, "sortOrder"> {}

function parseItemPayload(body: unknown, opts: { requireSlug: boolean }): ParsedItemPayload {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid payload");
  const b = body as Record<string, unknown>;

  const slug = asTrimmedString(b.slug).toLowerCase();
  if (opts.requireSlug) {
    if (!slug || !SLUG_RE.test(slug)) {
      throw new Error("Slug is required (lowercase letters, numbers and hyphens only)");
    }
  }

  const level = asTrimmedString(b.level).toLowerCase() as ReadingLevel;
  if (!VALID_LEVELS.has(level)) throw new Error("level must be 'a2' or 'b1'");

  const type = asTrimmedString(b.type).toLowerCase() as ReadingType;
  if (!VALID_TYPES.has(type)) throw new Error(`type must be one of: ${[...VALID_TYPES].join(", ")}`);

  const title = asTrimmedString(b.title);
  if (!title) throw new Error("Title is required");

  const instructions = asString(b.instructions).trim();
  if (!instructions) throw new Error("Instructions are required");

  const passage = asString(b.passage).trim();
  if (!passage) throw new Error("Passage is required");

  const paragraphs = parseParagraphs(b.paragraphs);
  // Matching-headings questions need a paragraph list so students know which
  // labelled paragraph each heading belongs to.
  if (type === "matching_headings" && paragraphs.length === 0) {
    throw new Error("Matching headings questions require at least one paragraph");
  }

  const optionsRaw = b.options === undefined || b.options === null ? [] : b.options;
  const options = parseStringArray(optionsRaw, "options").filter(Boolean);
  if ((type === "matching_headings" || type === "matching_features") && options.length < 1) {
    throw new Error("Matching questions require an options list");
  }

  if (!Array.isArray(b.questions) || b.questions.length === 0) {
    throw new Error("At least one question is required");
  }
  const answerKeyInput = (b.answerKey ?? {}) as Record<string, unknown>;
  if (typeof answerKeyInput !== "object" || answerKeyInput === null || Array.isArray(answerKeyInput)) {
    throw new Error("answerKey must be an object");
  }

  const seenIds = new Set<string>();
  const questions: SubQuestion[] = [];
  const answerKey: Record<string, AnswerEntry> = {};

  for (let i = 0; i < b.questions.length; i++) {
    const raw = b.questions[i] as Record<string, unknown>;
    if (!raw || typeof raw !== "object") throw new Error(`Question ${i + 1}: invalid`);
    const id = asTrimmedString(raw.id);
    if (!id) throw new Error(`Question ${i + 1}: id is required`);
    if (seenIds.has(id)) throw new Error(`Question ${i + 1}: duplicate id "${id}"`);
    seenIds.add(id);
    const prompt = asString(raw.prompt).trim();
    if (!prompt) throw new Error(`Question ${id}: prompt is required`);

    let mcqOptions: string[] | undefined;
    if (type === "mcq" || type === "skimming") {
      const opts = parseStringArray(raw.mcqOptions, `Question ${id}: mcqOptions`).filter(Boolean);
      if (opts.length < 2) throw new Error(`Question ${id}: needs at least 2 options`);
      if (type === "skimming" && opts.length !== 4) {
        throw new Error(`Question ${id}: skimming requires exactly 4 options`);
      }
      mcqOptions = opts;
    } else if (type === "scanning") {
      // Scanning is polymorphic per-question. Treat presence of a non-empty
      // mcqOptions array as "MCQ-shape" (A2 style); absence means
      // "fill-in-the-blank" (B1 style). Both shapes can co-exist within the
      // same item if a teacher mixes them.
      const hasOptionsField = raw.mcqOptions !== undefined && raw.mcqOptions !== null;
      if (hasOptionsField) {
        const opts = parseStringArray(raw.mcqOptions, `Question ${id}: mcqOptions`).filter(Boolean);
        if (opts.length > 0) {
          if (opts.length !== 4) {
            throw new Error(`Question ${id}: scanning MCQ questions require exactly 4 options`);
          }
          mcqOptions = opts;
        }
      }
    }

    const sub: SubQuestion = mcqOptions ? { id, prompt, mcqOptions } : { id, prompt };
    questions.push(sub);
    answerKey[id] = parseAnswerEntry(id, type, options.length, mcqOptions?.length ?? 0, answerKeyInput[id]);
  }

  // Completion / short answer types do not use the item-level options list.
  // Strip it so the persisted row stays clean.
  const persistedOptions = type === "matching_headings" || type === "matching_features" ? options : [];
  const persistedParagraphs = paragraphs;

  return {
    slug,
    level,
    type,
    title,
    instructions,
    passage,
    paragraphs: persistedParagraphs,
    options: persistedOptions,
    questions,
    answerKey,
  };
}

readingAdminRouter.get("/admin/items", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await loadAllItemRows();
    res.json({
      types: READING_TYPES,
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        level: r.level,
        type: r.type,
        title: r.title,
        sortOrder: r.sortOrder,
        questionCount: r.questions.length,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (err) {
    req.log?.error?.({ err }, "Admin list reading items error");
    console.error("[reading] admin list error", err);
    res.status(500).json({ error: "list_failed" });
  }
});

readingAdminRouter.get("/admin/items/:slug", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const row = await loadItemRowBySlug(req.params.slug);
    if (!row) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json({ item: row });
  } catch (err) {
    req.log?.error?.({ err }, "Admin get reading item error");
    res.status(500).json({ error: "fetch_failed" });
  }
});

readingAdminRouter.post("/admin/items", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  let parsed: ParsedItemPayload;
  try {
    parsed = parseItemPayload(req.body, { requireSlug: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid payload" });
    return;
  }
  try {
    const created = await createItem(parsed);
    res.json({ item: created });
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      res.status(409).json({ error: "An item with this slug already exists" });
      return;
    }
    req.log?.error?.({ err }, "Admin create reading item error");
    res.status(500).json({ error: "create_failed" });
  }
});

readingAdminRouter.put("/admin/items/:slug", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  let parsed: ParsedItemPayload;
  try {
    // The slug in the URL is authoritative; the body's slug is ignored to
    // prevent accidental rename collisions.
    parsed = parseItemPayload({ ...(req.body as object), slug: req.params.slug }, { requireSlug: false });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid payload" });
    return;
  }
  try {
    const updated = await updateItem(req.params.slug, {
      level: parsed.level,
      type: parsed.type,
      title: parsed.title,
      instructions: parsed.instructions,
      passage: parsed.passage,
      paragraphs: parsed.paragraphs,
      options: parsed.options,
      questions: parsed.questions,
      answerKey: parsed.answerKey,
    });
    if (!updated) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json({ item: updated });
  } catch (err) {
    req.log?.error?.({ err }, "Admin update reading item error");
    res.status(500).json({ error: "update_failed" });
  }
});

readingAdminRouter.delete("/admin/items/:slug", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const ok = await deleteItem(req.params.slug);
    if (!ok) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log?.error?.({ err }, "Admin delete reading item error");
    res.status(500).json({ error: "delete_failed" });
  }
});

export default router;
