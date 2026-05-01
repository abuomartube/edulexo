import { pgTable, serial, integer, varchar, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const listeningTests = pgTable(
  "intro_listening_tests",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    sectionId: integer("section_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    transcript: jsonb("transcript").notNull(),
    questions: jsonb("questions").notNull(),
    answerKey: jsonb("answer_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqSlug: uniqueIndex("listening_tests_slug_uniq").on(table.slug),
  }),
);
