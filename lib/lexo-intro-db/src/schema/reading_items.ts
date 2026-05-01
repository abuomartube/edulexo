import { pgTable, serial, integer, varchar, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const readingItems = pgTable(
  "intro_reading_items",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    level: varchar("level", { length: 8 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    title: varchar("title", { length: 255 }).notNull(),
    instructions: text("instructions").notNull().default(""),
    passage: text("passage").notNull().default(""),
    paragraphs: jsonb("paragraphs").notNull().default([]),
    options: jsonb("options").notNull().default([]),
    questions: jsonb("questions").notNull(),
    answerKey: jsonb("answer_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqSlug: uniqueIndex("reading_items_slug_uniq").on(table.slug),
  }),
);
