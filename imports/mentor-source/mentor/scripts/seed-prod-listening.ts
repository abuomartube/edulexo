import { Client } from "pg";
import { TESTS } from "../artifacts/api-server/src/listening/testBank.ts";

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) {
  console.error("PROD_DATABASE_URL is not set");
  process.exit(1);
}
console.log(`Loaded ${TESTS.length} tests from testBank.ts`);

const client = new Client({ connectionString: PROD_URL });
await client.connect();
console.log("Connected to production DB");

await client.query(`
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
await client.query(
  `CREATE UNIQUE INDEX IF NOT EXISTS listening_tests_slug_uniq ON listening_tests (slug)`,
);
console.log("Ensured listening_tests table + unique index");

const { rows: existingRows } = await client.query<{ n: number }>(
  `SELECT COUNT(*)::int AS n FROM listening_tests`,
);
const existing = existingRows[0].n;
console.log(`Existing rows in production listening_tests: ${existing}`);

if (existing > 0) {
  console.log(
    "Table is NOT empty — skipping seed (matches seedListeningTestsIfEmpty behaviour).",
  );
  const { rows: br } = await client.query(
    `SELECT section_id, COUNT(*)::int AS n FROM listening_tests GROUP BY section_id ORDER BY section_id`,
  );
  console.log("Per-section row counts in production:");
  for (const r of br) console.log(`  Section ${r.section_id}: ${r.n} tests`);
  await client.end();
  process.exit(0);
}

console.log("Table is empty — seeding 20 tests...");
let order = 0;
for (const t of TESTS) {
  const publicQuestions = t.questions.map((q: any) => {
    const base: any = { id: q.id, type: q.type, prompt: q.prompt };
    if (q.type === "mcq") return { ...base, options: q.options };
    if (q.type === "matching") return { ...base, items: q.items, options: q.options };
    if (q.wordLimit !== undefined) return { ...base, wordLimit: q.wordLimit };
    return base;
  });
  const answerKey: Record<string, any> = {};
  for (const q of t.questions as any[]) {
    if (q.type === "mcq") answerKey[q.id] = { type: "mcq", answer: q.answer };
    else if (q.type === "matching")
      answerKey[q.id] = { type: "matching", answer: q.answer };
    else
      answerKey[q.id] = {
        type: q.type,
        answer: q.answer,
        acceptable: q.acceptable ?? [q.answer],
      };
  }
  await client.query(
    `INSERT INTO listening_tests
       (slug, section_id, title, description, transcript, questions, answer_key, sort_order)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8)`,
    [
      t.id,
      t.sectionId,
      t.title,
      t.description,
      JSON.stringify(t.segments),
      JSON.stringify(publicQuestions),
      JSON.stringify(answerKey),
      order++,
    ],
  );
  console.log(`  inserted ${t.id}  ${t.title}`);
}

const { rows: finalRows } = await client.query(
  `SELECT section_id, COUNT(*)::int AS n FROM listening_tests GROUP BY section_id ORDER BY section_id`,
);
console.log("\nFinal counts per section:");
for (const r of finalRows) console.log(`  Section ${r.section_id}: ${r.n} tests`);

await client.end();
console.log("\nDone.");
