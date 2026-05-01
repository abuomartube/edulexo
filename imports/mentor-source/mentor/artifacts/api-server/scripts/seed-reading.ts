/**
 * Seeds the production `reading_items` table with the 100 reading passages
 * from `itemBank.ts`.
 *
 * Why this exists: `seedReadingItemsIfEmpty` runs automatically on the
 * server's first boot, which works in dev but is a fragile contract on
 * Railway (cold-start ordering, accidental empty deploys, etc). This
 * script is the deliberate, operator-run equivalent — point it at
 * `PROD_DATABASE_URL` and it will create the table if missing and seed
 * the 100 items if the table is empty.
 *
 * Idempotent: safe to re-run. Reuses `seedReadingItemsIfEmpty`, which
 * skips when the table already has rows. As an extra safety net (e.g.
 * a partial seed from an interrupted previous run) the script then
 * upserts every item from the bank with `INSERT ... ON CONFLICT (slug)
 * DO NOTHING`, so any missing slugs are filled in without touching
 * existing rows. Existing rows are NEVER overwritten — admin edits
 * made through the UI are preserved.
 *
 * Loud-failure contract: the boot-time helpers swallow errors on
 * purpose (so a transient blip doesn't crash the API server). That's
 * the wrong behaviour for an operator-run script, so this wrapper
 * verifies the final row count and exits non-zero if seeding didn't
 * actually take effect.
 *
 * Run:
 *   PROD_DATABASE_URL=postgres://... \
 *     pnpm --filter @workspace/api-server exec tsx scripts/seed-reading.ts
 */

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) {
  console.error("PROD_DATABASE_URL is not set");
  process.exit(1);
}

// `@workspace/db` reads `DATABASE_URL` at module-import time, so we must
// rewrite it BEFORE any dynamic import that reaches the db module. This
// is the standard trick used by the listening seeder too.
process.env.DATABASE_URL = PROD_URL;

const { db, pool, readingItems } = await import("@workspace/db");
const { ensureReadingItemsTable, seedReadingItemsIfEmpty } = await import(
  "../src/reading/store"
);
const { READING_ITEMS } = await import("../src/reading/itemBank");
const { sql } = await import("drizzle-orm");

async function shutdown(code: number): Promise<never> {
  try {
    await pool.end();
  } catch {
    // best-effort cleanup
  }
  process.exit(code);
}

async function main(): Promise<void> {
  console.log(`Loaded ${READING_ITEMS.length} reading items from itemBank.ts`);

  // Up-front connectivity probe. The boot-time helpers swallow connection
  // errors (so the API server doesn't crash on a transient blip), so without
  // this probe an unreachable PROD_DATABASE_URL would silently print "Done."
  try {
    await pool.query("SELECT 1");
    console.log("Connected to production DB.");
  } catch (err) {
    console.error(
      "Failed to connect to PROD_DATABASE_URL:",
      err instanceof Error ? err.message : err,
    );
    await shutdown(1);
  }

  await ensureReadingItemsTable();
  // Primary path: matches dev/Replit boot exactly.
  await seedReadingItemsIfEmpty();

  // Safety net: fill in any individual slugs that may be missing (e.g.
  // partial seed from a previously aborted run). Existing rows are left
  // alone so admin edits through the UI are preserved.
  let filledIn = 0;
  for (const it of READING_ITEMS) {
    const result = await db
      .insert(readingItems)
      .values({
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
      })
      .onConflictDoNothing({ target: readingItems.slug })
      .returning({ slug: readingItems.slug });
    if (result.length > 0) filledIn++;
  }
  if (filledIn > 0) {
    console.log(`Filled in ${filledIn} missing item(s) via upsert safety net.`);
  } else {
    console.log("No missing items — every slug already present.");
  }

  // Final verification + report. Hard-fail if the count is short, so an
  // operator can never see "Done." next to a half-empty table.
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(readingItems);
  console.log(`\nTotal reading_items in production: ${total}`);

  const breakdown = await db
    .select({
      level: readingItems.level,
      type: readingItems.type,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(readingItems)
    .groupBy(readingItems.level, readingItems.type)
    .orderBy(readingItems.level, readingItems.type);
  console.log("Per (level, type) bucket counts:");
  for (const r of breakdown) {
    console.log(`  ${r.level} / ${r.type}: ${r.n}`);
  }

  if (total < READING_ITEMS.length) {
    console.error(
      `\nERROR: expected at least ${READING_ITEMS.length} rows but found ${total}. ` +
        `Seed did not complete — check earlier logs for "[reading] failed to ..." messages.`,
    );
    await shutdown(1);
  }

  console.log("\nDone.");
  await shutdown(0);
}

main().catch(async (err) => {
  console.error("Fatal:", err instanceof Error ? err.stack ?? err.message : err);
  await shutdown(1);
});
