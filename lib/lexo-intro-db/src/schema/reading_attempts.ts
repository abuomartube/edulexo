import { pgTable, serial, integer, varchar, text, timestamp, jsonb, real, uniqueIndex } from "drizzle-orm/pg-core";
import { students } from "./students";

export const readingAttempts = pgTable(
  "intro_reading_attempts",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    itemSlug: varchar("item_slug", { length: 64 }).notNull(),
    level: varchar("level", { length: 8 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    answers: jsonb("answers").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    percent: real("percent").notNull(),
    results: jsonb("results").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqStudentItem: uniqueIndex("reading_attempts_student_item_uniq").on(
      table.studentId,
      table.itemSlug,
    ),
  }),
);
