import { pgTable, serial, integer, varchar, text, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { students } from "./students";

export const essayLogs = pgTable("essay_logs", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  taskType: varchar("task_type", { length: 20 }).notNull(),
  essay: text("essay").notNull(),
  overallBand: real("overall_band"),
  taskResponseBand: real("task_response_band"),
  coherenceBand: real("coherence_band"),
  lexicalBand: real("lexical_band"),
  grammarBand: real("grammar_band"),
  analysis: jsonb("analysis").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
