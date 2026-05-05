import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  uniqueIndex,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ENGLISH_CEFR_LEVELS = ["A1", "A2", "B1", "B1+", "B2", "C1"] as const;
export type EnglishCefrLevel = (typeof ENGLISH_CEFR_LEVELS)[number];

export const englishLessonsTable = pgTable("english_lessons", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  titleAr: varchar("title_ar", { length: 255 }),
  vimeoUrl: varchar("vimeo_url", { length: 512 }).notNull().default(""),
  tier: varchar("tier", { length: 16 }).notNull().default("beginner"),
  level: varchar("level", { length: 4 }).notNull().default("A1"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEnglishLessonSchema = createInsertSchema(englishLessonsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEnglishLesson = z.infer<typeof insertEnglishLessonSchema>;
export type EnglishLesson = typeof englishLessonsTable.$inferSelect;

export const englishLessonCompletionsTable = pgTable(
  "english_lesson_completions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => englishLessonsTable.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("english_lesson_completions_user_lesson_uniq").on(t.userId, t.lessonId),
  ],
);

export type EnglishLessonCompletion = typeof englishLessonCompletionsTable.$inferSelect;

export const englishLessonProgressTable = pgTable(
  "english_lesson_progress",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => englishLessonsTable.id, { onDelete: "cascade" }),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    lastPositionSeconds: integer("last_position_seconds").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("english_lesson_progress_user_lesson_uniq").on(t.userId, t.lessonId),
  ],
);

export type EnglishLessonProgress = typeof englishLessonProgressTable.$inferSelect;
