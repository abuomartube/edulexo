import { Client } from "pg";

const c = new Client({ connectionString: process.env.PROD_DATABASE_URL });
await c.connect();

const r1 = await c.query(
  "SELECT status, COUNT(*)::int AS n FROM students GROUP BY status ORDER BY status",
);
console.log("STUDENTS by status:");
console.table(r1.rows);

const r2 = await c.query(
  "SELECT id, slug, section_id, title FROM listening_tests ORDER BY section_id, sort_order, id LIMIT 6",
);
console.log("\nFirst 6 listening_tests:");
console.table(r2.rows);

const r3 = await c
  .query("SELECT COUNT(*)::int AS n FROM listening_attempts")
  .catch(() => ({ rows: [{ n: "(table missing)" }] }));
console.log("\nlistening_attempts rows:", r3.rows[0].n);

const r4 = await c
  .query(
    "SELECT key, value FROM settings WHERE key IN ('student_password','admin_password')",
  )
  .catch(() => ({ rows: [] }));
console.log("\nsettings (auth):");
console.table(r4.rows);

const r5 = await c
  .query(
    "SELECT current_database() AS db, current_user AS usr, version()",
  );
console.log("\nDB info:");
console.table(r5.rows);

await c.end();
