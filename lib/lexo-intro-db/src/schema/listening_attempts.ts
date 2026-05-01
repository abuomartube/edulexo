import { pgTable, serial, integer, varchar, text, timestamp, jsonb, real, uniqueIndex } from "drizzle-orm/pg-core";
import { students } from "./students";

export const listeningAttempts = pgTable(
  "intro_listening_attempts",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    testId: varchar("test_id", { length: 64 }).notNull(),
    sectionId: integer("section_id").notNull(),
    answers: jsonb("answers").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    percent: real("percent").notNull(),
    results: jsonb("results").notNull(),
    analysis: text("analysis").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqStudentTest: uniqueIndex("listening_attempts_student_test_uniq").on(
      table.studentId,
      table.testId,
    ),
  }),
);
