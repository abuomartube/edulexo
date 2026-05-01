import { db } from "@workspace/db";
import { listeningTests } from "@workspace/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  TESTS as SEED_TESTS,
  type ListeningTest,
  type Question,
  type Segment,
} from "./testBank";

// ---------------------------------------------------------------------------
// Storage shape: a row stores `questions` (public-facing, no answers) and an
// `answerKey` JSON object keyed by question id holding the canonical answer
// data (answer/answers/acceptable). At runtime we hydrate back into the rich
// `ListeningTest` shape that grader.ts and the public route handlers expect.
// ---------------------------------------------------------------------------

export interface PublicMcqQuestion {
  id: string;
  type: "mcq";
  prompt: string;
  options: string[];
}
export interface PublicMatchingQuestion {
  id: string;
  type: "matching";
  prompt: string;
  items: string[];
  options: string[];
}
export interface PublicCompletionQuestion {
  id: string;
  type: "note_completion" | "sentence_completion" | "short_answer";
  prompt: string;
  wordLimit: number;
  context?: string;
}
export type PublicQuestion =
  | PublicMcqQuestion
  | PublicMatchingQuestion
  | PublicCompletionQuestion;

export interface AnswerKeyEntryMcq { type: "mcq"; answer: number }
export interface AnswerKeyEntryMatching { type: "matching"; answers: number[] }
export interface AnswerKeyEntryCompletion {
  type: "note_completion" | "sentence_completion" | "short_answer";
  answer: string;
  acceptable: string[];
}
export type AnswerKeyEntry =
  | AnswerKeyEntryMcq
  | AnswerKeyEntryMatching
  | AnswerKeyEntryCompletion;

export type AnswerKey = Record<string, AnswerKeyEntry>;

export interface ListeningTestRow {
  id: number;
  slug: string;
  sectionId: number;
  title: string;
  description: string;
  transcript: Segment[];
  questions: PublicQuestion[];
  answerKey: AnswerKey;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Split / merge helpers
// ---------------------------------------------------------------------------
export function splitQuestion(q: Question): {
  publicQuestion: PublicQuestion;
  answer: AnswerKeyEntry;
} {
  if (q.type === "mcq") {
    return {
      publicQuestion: { id: q.id, type: "mcq", prompt: q.prompt, options: q.options },
      answer: { type: "mcq", answer: q.answer },
    };
  }
  if (q.type === "matching") {
    return {
      publicQuestion: { id: q.id, type: "matching", prompt: q.prompt, items: q.items, options: q.options },
      answer: { type: "matching", answers: q.answers },
    };
  }
  return {
    publicQuestion: {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      wordLimit: q.wordLimit,
      ...(q.context ? { context: q.context } : {}),
    },
    answer: { type: q.type, answer: q.answer, acceptable: q.acceptable },
  };
}

export function mergeQuestion(p: PublicQuestion, key: AnswerKeyEntry | undefined): Question {
  if (p.type === "mcq") {
    const k = key && key.type === "mcq" ? key : { type: "mcq", answer: 0 };
    return { id: p.id, type: "mcq", prompt: p.prompt, options: p.options, answer: k.answer };
  }
  if (p.type === "matching") {
    const k = key && key.type === "matching" ? key : { type: "matching", answers: [] };
    return {
      id: p.id,
      type: "matching",
      prompt: p.prompt,
      items: p.items,
      options: p.options,
      answers: k.answers,
    };
  }
  const k =
    key && (key.type === "note_completion" || key.type === "sentence_completion" || key.type === "short_answer")
      ? key
      : { type: p.type, answer: "", acceptable: [] };
  return {
    id: p.id,
    type: p.type,
    prompt: p.prompt,
    wordLimit: p.wordLimit,
    answer: k.answer,
    acceptable: k.acceptable,
    ...(p.context ? { context: p.context } : {}),
  };
}

export function rowToListeningTest(row: ListeningTestRow): ListeningTest {
  return {
    id: row.slug,
    sectionId: row.sectionId as 1 | 2 | 3 | 4,
    title: row.title,
    description: row.description,
    segments: row.transcript,
    questions: row.questions.map((q) => mergeQuestion(q, row.answerKey[q.id])),
  };
}

export function listeningTestToRowParts(t: ListeningTest) {
  const publicQuestions: PublicQuestion[] = [];
  const answerKey: AnswerKey = {};
  for (const q of t.questions) {
    const { publicQuestion, answer } = splitQuestion(q);
    publicQuestions.push(publicQuestion);
    answerKey[q.id] = answer;
  }
  return {
    slug: t.id,
    sectionId: t.sectionId,
    title: t.title,
    description: t.description,
    transcript: t.segments,
    questions: publicQuestions,
    answerKey,
  };
}

// ---------------------------------------------------------------------------
// Table init + seed
// ---------------------------------------------------------------------------
export async function ensureListeningTestsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listening_tests (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(64) NOT NULL,
        section_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        transcript JSONB NOT NULL,
        questions JSONB NOT NULL,
        answer_key JSONB NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS listening_tests_slug_uniq ON listening_tests (slug)
    `);
  } catch (err) {
    console.error("[listening] failed to ensure listening_tests table:", err);
  }
}

export async function seedListeningTestsIfEmpty(): Promise<void> {
  try {
    const existing = await db
      .select({ id: listeningTests.id })
      .from(listeningTests)
      .limit(1);
    if (existing.length > 0) return;
    let order = 0;
    for (const t of SEED_TESTS) {
      const parts = listeningTestToRowParts(t);
      await db.insert(listeningTests).values({
        slug: parts.slug,
        sectionId: parts.sectionId,
        title: parts.title,
        description: parts.description,
        transcript: parts.transcript,
        questions: parts.questions,
        answerKey: parts.answerKey,
        sortOrder: order++,
      });
    }
    console.log(`[listening] seeded ${SEED_TESTS.length} listening tests`);
  } catch (err) {
    console.error("[listening] failed to seed listening_tests:", err);
  }
}

// One-shot init promise so concurrent boot-time callers all wait on the same work.
let initPromise: Promise<void> | null = null;
export function initListeningTests(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureListeningTestsTable();
      await seedListeningTestsIfEmpty();
    })();
  }
  return initPromise;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------
function rowFromDb(r: typeof listeningTests.$inferSelect): ListeningTestRow {
  return {
    id: r.id,
    slug: r.slug,
    sectionId: r.sectionId,
    title: r.title,
    description: r.description,
    transcript: r.transcript as Segment[],
    questions: r.questions as PublicQuestion[],
    answerKey: r.answerKey as AnswerKey,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function loadAllTests(): Promise<ListeningTest[]> {
  await initListeningTests();
  const rows = await db
    .select()
    .from(listeningTests)
    .orderBy(asc(listeningTests.sectionId), asc(listeningTests.sortOrder), asc(listeningTests.id));
  return rows.map(rowFromDb).map(rowToListeningTest);
}

export async function loadAllTestRows(): Promise<ListeningTestRow[]> {
  await initListeningTests();
  const rows = await db
    .select()
    .from(listeningTests)
    .orderBy(asc(listeningTests.sectionId), asc(listeningTests.sortOrder), asc(listeningTests.id));
  return rows.map(rowFromDb);
}

export async function loadTestBySlug(slug: string): Promise<ListeningTest | null> {
  await initListeningTests();
  const [r] = await db.select().from(listeningTests).where(eq(listeningTests.slug, slug));
  if (!r) return null;
  return rowToListeningTest(rowFromDb(r));
}

export async function loadTestRowBySlug(slug: string): Promise<ListeningTestRow | null> {
  await initListeningTests();
  const [r] = await db.select().from(listeningTests).where(eq(listeningTests.slug, slug));
  return r ? rowFromDb(r) : null;
}

export interface TestUpsertInput {
  slug: string;
  sectionId: number;
  title: string;
  description?: string;
  transcript: Segment[];
  questions: PublicQuestion[];
  answerKey: AnswerKey;
  sortOrder?: number;
}

export async function createTest(input: TestUpsertInput): Promise<ListeningTestRow> {
  await initListeningTests();
  // When the caller does not specify a sortOrder, append the new test to the
  // end of its section by computing max(sort_order) + 1 for that section.
  // This keeps drag-and-drop the only source of truth for ordering.
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const [{ maxOrder }] = await db
      .select({
        maxOrder: sql<number | null>`COALESCE(MAX(${listeningTests.sortOrder}), -1)`,
      })
      .from(listeningTests)
      .where(eq(listeningTests.sectionId, input.sectionId));
    sortOrder = (maxOrder ?? -1) + 1;
  }
  const [created] = await db
    .insert(listeningTests)
    .values({
      slug: input.slug,
      sectionId: input.sectionId,
      title: input.title,
      description: input.description ?? "",
      transcript: input.transcript,
      questions: input.questions,
      answerKey: input.answerKey,
      sortOrder,
    })
    .returning();
  return rowFromDb(created);
}

export async function updateTest(
  slug: string,
  patch: Partial<TestUpsertInput>,
): Promise<ListeningTestRow | null> {
  await initListeningTests();
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.sectionId !== undefined) update.sectionId = patch.sectionId;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.transcript !== undefined) update.transcript = patch.transcript;
  if (patch.questions !== undefined) update.questions = patch.questions;
  if (patch.answerKey !== undefined) update.answerKey = patch.answerKey;
  if (patch.sortOrder !== undefined) update.sortOrder = patch.sortOrder;
  const [updated] = await db
    .update(listeningTests)
    .set(update)
    .where(eq(listeningTests.slug, slug))
    .returning();
  return updated ? rowFromDb(updated) : null;
}

export async function deleteTest(slug: string): Promise<boolean> {
  await initListeningTests();
  const result = await db.delete(listeningTests).where(eq(listeningTests.slug, slug)).returning();
  return result.length > 0;
}

// Thrown when a reorder request references a slug that does not belong to the
// target section (or does not exist). Surfaces as a 4xx response in the route.
export class ReorderSlugMismatchError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Some slugs do not belong to this section: ${missing.join(", ")}`);
    this.name = "ReorderSlugMismatchError";
  }
}

// Thrown when the caller sent a partial slug list and would leave some rows
// in the section with stale (possibly conflicting) sortOrder values. The
// reorder must cover every test currently in the section.
export class ReorderIncompleteError extends Error {
  constructor(public readonly expected: number, public readonly received: number) {
    super(`Reorder must include all ${expected} tests in the section, got ${received}`);
    this.name = "ReorderIncompleteError";
  }
}

// Bulk-reorder tests within a single section by writing a fresh sortOrder
// (0..n-1) to each slug in the order provided. Runs inside a transaction so
// either all rows move or none do — if any slug is missing from the section
// (ReorderSlugMismatchError) or the slug list does not cover every test
// currently in the section (ReorderIncompleteError) the transaction is
// rolled back.
export async function reorderTestsInSection(
  sectionId: number,
  slugs: string[],
): Promise<number> {
  await initListeningTests();
  if (slugs.length === 0) return 0;
  return await db.transaction(async (tx) => {
    // Confirm the caller submitted a complete picture of the section before
    // touching any rows. This prevents partial reorders that would leave
    // unmentioned tests with stale (possibly duplicate) sortOrder values.
    const sectionRows = await tx
      .select({ slug: listeningTests.slug })
      .from(listeningTests)
      .where(eq(listeningTests.sectionId, sectionId));
    if (sectionRows.length !== slugs.length) {
      throw new ReorderIncompleteError(sectionRows.length, slugs.length);
    }

    const now = new Date();
    const missing: string[] = [];
    let updated = 0;
    for (let i = 0; i < slugs.length; i++) {
      const result = await tx
        .update(listeningTests)
        .set({ sortOrder: i, updatedAt: now })
        .where(
          and(
            eq(listeningTests.slug, slugs[i]),
            eq(listeningTests.sectionId, sectionId),
          ),
        )
        .returning({ id: listeningTests.id });
      if (result.length === 0) missing.push(slugs[i]);
      else updated += result.length;
    }
    if (missing.length > 0) {
      throw new ReorderSlugMismatchError(missing);
    }
    return updated;
  });
}

// Thrown when a move payload is internally inconsistent (e.g. moved slug
// missing from target list, or accidentally listed in source list).
export class MoveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoveValidationError";
  }
}

// Thrown when the test being moved cannot be found at all.
export class MoveTestNotFoundError extends Error {
  constructor(public readonly slug: string) {
    super(`Test "${slug}" not found`);
    this.name = "MoveTestNotFoundError";
  }
}

// Move a test from its current section into a different section, atomically
// rewriting sortOrder for both the source section (compacted, without the
// moved slug) and the target section (with the moved slug at its new index).
// `sourceSlugs` must list every remaining test in the source section in its
// new order (excluding the moved slug). `targetSlugs` must list every test
// in the target section in its new order, including the moved slug.
export async function moveTestToSection(
  slug: string,
  targetSectionId: number,
  targetSlugs: string[],
  sourceSlugs: string[],
): Promise<{ row: ListeningTestRow; sourceSectionId: number; targetUpdated: number; sourceUpdated: number }> {
  await initListeningTests();

  if (!targetSlugs.includes(slug)) {
    throw new MoveValidationError("targetSlugs must include the moved slug");
  }
  if (sourceSlugs.includes(slug)) {
    throw new MoveValidationError("sourceSlugs must not include the moved slug");
  }
  const dupTarget = new Set(targetSlugs);
  if (dupTarget.size !== targetSlugs.length) {
    throw new MoveValidationError("targetSlugs must be unique");
  }
  const dupSource = new Set(sourceSlugs);
  if (dupSource.size !== sourceSlugs.length) {
    throw new MoveValidationError("sourceSlugs must be unique");
  }

  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(listeningTests)
      .where(eq(listeningTests.slug, slug));
    if (!existing) {
      throw new MoveTestNotFoundError(slug);
    }
    const sourceSectionId = existing.sectionId;
    if (sourceSectionId === targetSectionId) {
      throw new MoveValidationError(
        "Cross-section move requires source and target sections to differ",
      );
    }

    // Verify the caller submitted a complete picture of both sections so
    // we never leave rows behind with stale (possibly duplicate) sortOrder.
    const sourceRows = await tx
      .select({ slug: listeningTests.slug })
      .from(listeningTests)
      .where(eq(listeningTests.sectionId, sourceSectionId));
    // After the move, the source section will have one fewer test.
    if (sourceRows.length - 1 !== sourceSlugs.length) {
      throw new ReorderIncompleteError(sourceRows.length - 1, sourceSlugs.length);
    }
    const targetRows = await tx
      .select({ slug: listeningTests.slug })
      .from(listeningTests)
      .where(eq(listeningTests.sectionId, targetSectionId));
    // After the move, the target section will have one more test.
    if (targetRows.length + 1 !== targetSlugs.length) {
      throw new ReorderIncompleteError(targetRows.length + 1, targetSlugs.length);
    }

    const now = new Date();

    // 1) Move the row to its new section first so subsequent reorder writes
    //    can match it inside the target section.
    const moveResult = await tx
      .update(listeningTests)
      .set({ sectionId: targetSectionId, updatedAt: now })
      .where(eq(listeningTests.slug, slug))
      .returning();
    if (moveResult.length === 0) {
      throw new MoveTestNotFoundError(slug);
    }

    // 2) Rewrite sortOrder for every slug in the target section.
    const missingTarget: string[] = [];
    let targetUpdated = 0;
    for (let i = 0; i < targetSlugs.length; i++) {
      const result = await tx
        .update(listeningTests)
        .set({ sortOrder: i, updatedAt: now })
        .where(
          and(
            eq(listeningTests.slug, targetSlugs[i]),
            eq(listeningTests.sectionId, targetSectionId),
          ),
        )
        .returning({ id: listeningTests.id });
      if (result.length === 0) missingTarget.push(targetSlugs[i]);
      else targetUpdated += result.length;
    }
    if (missingTarget.length > 0) {
      throw new ReorderSlugMismatchError(missingTarget);
    }

    // 3) Rewrite sortOrder for every remaining slug in the source section.
    const missingSource: string[] = [];
    let sourceUpdated = 0;
    for (let i = 0; i < sourceSlugs.length; i++) {
      const result = await tx
        .update(listeningTests)
        .set({ sortOrder: i, updatedAt: now })
        .where(
          and(
            eq(listeningTests.slug, sourceSlugs[i]),
            eq(listeningTests.sectionId, sourceSectionId),
          ),
        )
        .returning({ id: listeningTests.id });
      if (result.length === 0) missingSource.push(sourceSlugs[i]);
      else sourceUpdated += result.length;
    }
    if (missingSource.length > 0) {
      throw new ReorderSlugMismatchError(missingSource);
    }

    const [reloaded] = await tx
      .select()
      .from(listeningTests)
      .where(eq(listeningTests.slug, slug));
    return {
      row: rowFromDb(reloaded),
      sourceSectionId,
      targetUpdated,
      sourceUpdated,
    };
  });
}
