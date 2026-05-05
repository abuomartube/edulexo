import { db } from "@workspace/ielts-db";
import { introReadingItems } from "@workspace/ielts-db";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  READING_ITEMS as SEED_ITEMS,
  type ReadingItem,
  type ReadingLevel,
  type ReadingType,
} from "./itemBank";
import { logger } from "../lib/logger";

export interface ReadingItemRow extends ReadingItem {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

async function ensureReadingItemsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intro_reading_items (
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
      CREATE UNIQUE INDEX IF NOT EXISTS reading_items_slug_uniq ON intro_reading_items (slug)
    `);
  } catch (err) {
    logger.error({ err }, "[reading] failed to ensure reading_items table");
  }
}

async function ensureReadingAttemptsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intro_reading_attempts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES intro_students(id) ON DELETE CASCADE,
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
      ON intro_reading_attempts (student_id, item_slug)
    `);
  } catch (err) {
    logger.error({ err }, "[reading] failed to ensure reading_attempts table");
  }
}

async function seedReadingItemsIfEmpty(): Promise<void> {
  try {
    const existing = await db
      .select({ id: introReadingItems.id })
      .from(introReadingItems)
      .limit(1);
    if (existing.length > 0) return;
    for (const it of SEED_ITEMS) {
      await db.insert(introReadingItems).values({
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
    logger.info({ count: SEED_ITEMS.length }, "[reading] seeded reading items");
  } catch (err) {
    logger.error({ err }, "[reading] failed to seed reading_items");
  }
}

async function upsertMissingSeedItems(): Promise<void> {
  try {
    const existing = await db
      .select({ slug: introReadingItems.slug })
      .from(introReadingItems);
    const have = new Set(existing.map((r) => r.slug));
    const missing = SEED_ITEMS.filter((it) => !have.has(it.slug));
    if (missing.length === 0) return;
    for (const it of missing) {
      await db.insert(introReadingItems).values({
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
    logger.info(
      { count: missing.length },
      "[reading] inserted missing seed items",
    );
  } catch (err) {
    logger.error({ err }, "[reading] failed to upsert missing reading_items");
  }
}

async function migrateLegacyScanningItems(): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(introReadingItems)
      .where(eq(introReadingItems.type, "scanning"));
    if (rows.length === 0) return;
    let migrated = 0;
    for (const row of rows) {
      const seed = SEED_ITEMS.find((it) => it.slug === row.slug);
      if (!seed) continue;
      const rowAk = (row.answerKey ?? {}) as Record<
        string,
        { value?: unknown }
      >;
      const seedAk = seed.answerKey as Record<string, { value?: unknown }>;
      const rowFirstKey = Object.keys(rowAk)[0];
      const seedFirstKey = Object.keys(seedAk)[0];
      const rowFirstVal = rowFirstKey ? rowAk[rowFirstKey]?.value : undefined;
      const seedFirstVal = seedFirstKey
        ? seedAk[seedFirstKey]?.value
        : undefined;
      if (seedFirstVal === undefined) continue;
      if (
        rowFirstVal !== undefined &&
        typeof rowFirstVal === typeof seedFirstVal
      )
        continue;
      await db
        .update(introReadingItems)
        .set({
          instructions: seed.instructions,
          questions: seed.questions,
          answerKey: seed.answerKey,
          updatedAt: new Date(),
        })
        .where(eq(introReadingItems.slug, row.slug));
      migrated += 1;
    }
    if (migrated > 0) {
      logger.info(
        { migrated },
        "[reading] re-synced scanning items to current bank shape",
      );
    }
  } catch (err) {
    logger.error({ err }, "[reading] failed to re-sync scanning items");
  }
}

let initPromise: Promise<void> | null = null;
export function initReadingItems(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureReadingItemsTable();
      await ensureReadingAttemptsTable();
      await seedReadingItemsIfEmpty();
      await upsertMissingSeedItems();
      await migrateLegacyScanningItems();
    })();
  }
  return initPromise;
}

function rowToItem(r: typeof introReadingItems.$inferSelect): ReadingItem {
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

function rowToRow(r: typeof introReadingItems.$inferSelect): ReadingItemRow {
  return {
    ...rowToItem(r),
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function loadAllItems(): Promise<ReadingItem[]> {
  await initReadingItems();
  const rows = await db
    .select()
    .from(introReadingItems)
    .orderBy(
      asc(introReadingItems.level),
      asc(introReadingItems.type),
      asc(introReadingItems.sortOrder),
      asc(introReadingItems.id),
    );
  return rows.map(rowToItem);
}

export async function loadItemsByLevelAndType(
  level: ReadingLevel,
  type: ReadingType,
): Promise<ReadingItem[]> {
  await initReadingItems();
  const rows = await db
    .select()
    .from(introReadingItems)
    .where(
      and(eq(introReadingItems.level, level), eq(introReadingItems.type, type)),
    )
    .orderBy(asc(introReadingItems.sortOrder), asc(introReadingItems.id));
  return rows.map(rowToItem);
}

export async function loadItemBySlug(
  slug: string,
): Promise<ReadingItem | null> {
  await initReadingItems();
  const [r] = await db
    .select()
    .from(introReadingItems)
    .where(eq(introReadingItems.slug, slug));
  return r ? rowToItem(r) : null;
}

export async function loadAllItemRows(): Promise<ReadingItemRow[]> {
  await initReadingItems();
  const rows = await db
    .select()
    .from(introReadingItems)
    .orderBy(
      asc(introReadingItems.level),
      asc(introReadingItems.type),
      asc(introReadingItems.sortOrder),
      asc(introReadingItems.id),
    );
  return rows.map(rowToRow);
}

export async function loadItemRowBySlug(
  slug: string,
): Promise<ReadingItemRow | null> {
  await initReadingItems();
  const [r] = await db
    .select()
    .from(introReadingItems)
    .where(eq(introReadingItems.slug, slug));
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

export async function createItem(
  input: ReadingItemUpsertInput,
): Promise<ReadingItemRow> {
  await initReadingItems();
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const [{ maxOrder }] = await db
      .select({
        maxOrder: sql<
          number | null
        >`COALESCE(MAX(${introReadingItems.sortOrder}), -1)`,
      })
      .from(introReadingItems)
      .where(
        and(
          eq(introReadingItems.level, input.level),
          eq(introReadingItems.type, input.type),
        ),
      );
    sortOrder = (maxOrder ?? -1) + 1;
  }
  const [created] = await db
    .insert(introReadingItems)
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
  if (patch.instructions !== undefined)
    update.instructions = patch.instructions;
  if (patch.passage !== undefined) update.passage = patch.passage;
  if (patch.paragraphs !== undefined) update.paragraphs = patch.paragraphs;
  if (patch.options !== undefined) update.options = patch.options;
  if (patch.questions !== undefined) update.questions = patch.questions;
  if (patch.answerKey !== undefined) update.answerKey = patch.answerKey;
  if (patch.sortOrder !== undefined) update.sortOrder = patch.sortOrder;
  const [updated] = await db
    .update(introReadingItems)
    .set(update)
    .where(eq(introReadingItems.slug, slug))
    .returning();
  return updated ? rowToRow(updated) : null;
}

export async function deleteItem(slug: string): Promise<boolean> {
  await initReadingItems();
  const result = await db
    .delete(introReadingItems)
    .where(eq(introReadingItems.slug, slug))
    .returning();
  return result.length > 0;
}
