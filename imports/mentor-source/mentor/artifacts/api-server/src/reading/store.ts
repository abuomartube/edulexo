import { db } from "@workspace/db";
import { readingItems } from "@workspace/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { READING_ITEMS as SEED_ITEMS, type ReadingItem, type ReadingLevel, type ReadingType } from "./itemBank";

// Row-shape including DB-only metadata (id, createdAt, updatedAt). Admin
// list/edit views rely on these to render "last updated" hints and to key
// React lists when slug edits are not desired (slug is the public key, so
// we keep it stable).
export interface ReadingItemRow extends ReadingItem {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Idempotent table creation. We mirror the pattern used by the listening
// store so a fresh DB (local or production) self-heals on first boot,
// without having to run drizzle-kit migrations.
// ---------------------------------------------------------------------------
export async function ensureReadingItemsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reading_items (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(64) NOT NULL,
        level VARCHAR(8) NOT NULL,
        type VARCHAR(32) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        title VARCHAR(255) NOT NULL,
        instructions TEXT NOT NULL DEFAULT '',
        passage TEXT NOT NULL DEFAULT '',
        paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
        options JSONB NOT NULL DEFAULT '[]'::jsonb,
        questions JSONB NOT NULL,
        answer_key JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS reading_items_slug_uniq ON reading_items (slug)
    `);
  } catch (err) {
    console.error("[reading] failed to ensure reading_items table:", err);
  }
}

export async function seedReadingItemsIfEmpty(): Promise<void> {
  try {
    const existing = await db
      .select({ id: readingItems.id })
      .from(readingItems)
      .limit(1);
    if (existing.length > 0) return;
    for (const it of SEED_ITEMS) {
      await db.insert(readingItems).values({
        slug: it.slug,
        level: it.level,
        type: it.type,
        sortOrder: it.sortOrder,
        title: it.title,
        instructions: it.instructions,
        passage: it.passage,
        paragraphs: it.paragraphs ?? [],
        options: it.options ?? [],
        questions: it.questions,
        answerKey: it.answerKey,
      });
    }
    console.log(`[reading] seeded ${SEED_ITEMS.length} reading items`);
  } catch (err) {
    console.error("[reading] failed to seed reading_items:", err);
  }
}

// On boot we also insert any seed items whose slug is not yet in the DB.
// This lets us add new (level, type) buckets — like the new skimming and
// scanning items — to a database that has already been seeded, without
// touching or re-ordering any rows the teacher may have hand-edited.
export async function upsertMissingSeedItems(): Promise<void> {
  try {
    const slugs = SEED_ITEMS.map((it) => it.slug);
    if (slugs.length === 0) return;
    const existing = await db
      .select({ slug: readingItems.slug })
      .from(readingItems);
    const have = new Set(existing.map((r) => r.slug));
    const missing = SEED_ITEMS.filter((it) => !have.has(it.slug));
    if (missing.length === 0) return;
    for (const it of missing) {
      await db.insert(readingItems).values({
        slug: it.slug,
        level: it.level,
        type: it.type,
        sortOrder: it.sortOrder,
        title: it.title,
        instructions: it.instructions,
        passage: it.passage,
        paragraphs: it.paragraphs ?? [],
        options: it.options ?? [],
        questions: it.questions,
        answerKey: it.answerKey,
      });
    }
    console.log(`[reading] inserted ${missing.length} new seed item(s) into existing reading_items`);
  } catch (err) {
    console.error("[reading] failed to upsert missing reading_items:", err);
  }
}

// Idempotent shape-sync for scanning items.
//
// Scanning is polymorphic across levels: A2 scanning items are MCQ-shape
// (per-question mcqOptions present, numeric `value`), B1 scanning items
// are fill-in-the-blank shape (no mcqOptions, string `value`).
//
// Whenever the bank's shape for a given seed slug differs from the row in
// the database (e.g. after a release that flips B1 from MCQ-back-to-blank
// or vice versa), replace that row's questions / answer_key / instructions
// with the current seed. Rows whose first answer_key value type already
// matches the seed are left untouched, so admin edits within the same
// shape are preserved across reboots. Non-seed rows are also left alone.
export async function migrateLegacyScanningItems(): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(readingItems)
      .where(eq(readingItems.type, "scanning"));
    if (rows.length === 0) return;
    let migrated = 0;
    for (const row of rows) {
      const seed = SEED_ITEMS.find((it) => it.slug === row.slug);
      if (!seed) continue;

      const rowAk = (row.answerKey ?? {}) as Record<string, { value?: unknown }>;
      const seedAk = seed.answerKey as Record<string, { value?: unknown }>;
      const rowFirstKey = Object.keys(rowAk)[0];
      const seedFirstKey = Object.keys(seedAk)[0];
      const rowFirstVal = rowFirstKey ? rowAk[rowFirstKey]?.value : undefined;
      const seedFirstVal = seedFirstKey ? seedAk[seedFirstKey]?.value : undefined;

      // If the seed itself has no usable answer key, we have nothing to
      // copy over — bail out rather than clobbering a (possibly valid) row
      // with an empty seed.
      if (seedFirstVal === undefined) continue;

      // Compare the JS typeof of the first answer's `value`. "number" means
      // MCQ-shape, "string" means fill-in-the-blank shape. We re-sync when
      // the row is missing an answer (rowFirstVal undefined) OR when the
      // shape diverges. Rows whose shape already matches the seed are
      // left untouched so admin edits within that shape are preserved.
      if (rowFirstVal !== undefined && typeof rowFirstVal === typeof seedFirstVal) {
        continue;
      }

      await db
        .update(readingItems)
        .set({
          instructions: seed.instructions,
          questions: seed.questions,
          answerKey: seed.answerKey,
          updatedAt: new Date(),
        })
        .where(eq(readingItems.slug, row.slug));
      migrated += 1;
    }
    if (migrated > 0) {
      console.log(`[reading] re-synced ${migrated} scanning item(s) to current bank shape`);
    }
  } catch (err) {
    console.error("[reading] failed to re-sync scanning items:", err);
  }
}

let initPromise: Promise<void> | null = null;
export function initReadingItems(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureReadingItemsTable();
      await seedReadingItemsIfEmpty();
      await upsertMissingSeedItems();
      await migrateLegacyScanningItems();
    })();
  }
  return initPromise;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------
function rowToItem(r: typeof readingItems.$inferSelect): ReadingItem {
  return {
    slug: r.slug,
    level: r.level as ReadingLevel,
    type: r.type as ReadingType,
    sortOrder: r.sortOrder,
    title: r.title,
    instructions: r.instructions,
    passage: r.passage,
    paragraphs: (r.paragraphs as ReadingItem["paragraphs"]) ?? [],
    options: (r.options as string[]) ?? [],
    questions: r.questions as ReadingItem["questions"],
    answerKey: r.answerKey as ReadingItem["answerKey"],
  };
}

export async function loadAllItems(): Promise<ReadingItem[]> {
  await initReadingItems();
  const rows = await db
    .select()
    .from(readingItems)
    .orderBy(asc(readingItems.level), asc(readingItems.type), asc(readingItems.sortOrder), asc(readingItems.id));
  return rows.map(rowToItem);
}

export async function loadItemsByLevelAndType(
  level: ReadingLevel,
  type: ReadingType,
): Promise<ReadingItem[]> {
  await initReadingItems();
  const rows = await db
    .select()
    .from(readingItems)
    .where(and(eq(readingItems.level, level), eq(readingItems.type, type)))
    .orderBy(asc(readingItems.sortOrder), asc(readingItems.id));
  return rows.map(rowToItem);
}

export async function loadItemBySlug(slug: string): Promise<ReadingItem | null> {
  await initReadingItems();
  const [r] = await db.select().from(readingItems).where(eq(readingItems.slug, slug));
  return r ? rowToItem(r) : null;
}

// ---------------------------------------------------------------------------
// Admin CRUD helpers — used by the admin reading editor. These return the
// full row shape including id/createdAt/updatedAt so the UI can show "last
// updated" timestamps without an extra query.
// ---------------------------------------------------------------------------
function rowToRow(r: typeof readingItems.$inferSelect): ReadingItemRow {
  return {
    ...rowToItem(r),
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function loadAllItemRows(): Promise<ReadingItemRow[]> {
  await initReadingItems();
  const rows = await db
    .select()
    .from(readingItems)
    .orderBy(asc(readingItems.level), asc(readingItems.type), asc(readingItems.sortOrder), asc(readingItems.id));
  return rows.map(rowToRow);
}

export async function loadItemRowBySlug(slug: string): Promise<ReadingItemRow | null> {
  await initReadingItems();
  const [r] = await db.select().from(readingItems).where(eq(readingItems.slug, slug));
  return r ? rowToRow(r) : null;
}

export interface ReadingItemUpsertInput {
  slug: string;
  level: ReadingLevel;
  type: ReadingType;
  title: string;
  instructions: string;
  passage: string;
  paragraphs: { label: string; text: string }[];
  options: string[];
  questions: ReadingItem["questions"];
  answerKey: ReadingItem["answerKey"];
  sortOrder?: number;
}

export async function createItem(input: ReadingItemUpsertInput): Promise<ReadingItemRow> {
  await initReadingItems();
  // Append to the end of its (level, type) bucket when no sortOrder given,
  // so admin "create" stays predictable and never collides with existing rows.
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number | null>`COALESCE(MAX(${readingItems.sortOrder}), -1)` })
      .from(readingItems)
      .where(and(eq(readingItems.level, input.level), eq(readingItems.type, input.type)));
    sortOrder = (maxOrder ?? -1) + 1;
  }
  const [created] = await db
    .insert(readingItems)
    .values({
      slug: input.slug,
      level: input.level,
      type: input.type,
      title: input.title,
      instructions: input.instructions,
      passage: input.passage,
      paragraphs: input.paragraphs,
      options: input.options,
      questions: input.questions,
      answerKey: input.answerKey,
      sortOrder,
    })
    .returning();
  return rowToRow(created);
}

export async function updateItem(
  slug: string,
  patch: Partial<Omit<ReadingItemUpsertInput, "slug">>,
): Promise<ReadingItemRow | null> {
  await initReadingItems();
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.level !== undefined) update.level = patch.level;
  if (patch.type !== undefined) update.type = patch.type;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.instructions !== undefined) update.instructions = patch.instructions;
  if (patch.passage !== undefined) update.passage = patch.passage;
  if (patch.paragraphs !== undefined) update.paragraphs = patch.paragraphs;
  if (patch.options !== undefined) update.options = patch.options;
  if (patch.questions !== undefined) update.questions = patch.questions;
  if (patch.answerKey !== undefined) update.answerKey = patch.answerKey;
  if (patch.sortOrder !== undefined) update.sortOrder = patch.sortOrder;
  const [updated] = await db
    .update(readingItems)
    .set(update)
    .where(eq(readingItems.slug, slug))
    .returning();
  return updated ? rowToRow(updated) : null;
}

export async function deleteItem(slug: string): Promise<boolean> {
  await initReadingItems();
  const result = await db.delete(readingItems).where(eq(readingItems.slug, slug)).returning();
  return result.length > 0;
}
