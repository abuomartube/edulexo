import {
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Students / Auth ────────────────────────────────────────────────────────

export const introStudents = pgTable("intro_students", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  password: varchar("password", { length: 255 }),
  accessCode: varchar("access_code", { length: 64 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const introSettings = pgTable("intro_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: varchar("value").notNull(),
});

export const introAccessCodes = pgTable("intro_access_codes", {
  code: varchar("code", { length: 64 }).primaryKey(),
  usedBy: varchar("used_by", { length: 255 }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type IntroStudent = typeof introStudents.$inferSelect;
export type IntroSetting = typeof introSettings.$inferSelect;
export type IntroAccessCode = typeof introAccessCodes.$inferSelect;

// ─── Conversations ───────────────────────────────────────────────────────────

export const introConversations = pgTable("intro_conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertIntroConversationSchema = createInsertSchema(introConversations).omit({
  id: true,
  createdAt: true,
});

export type IntroConversation = typeof introConversations.$inferSelect;
export type InsertIntroConversation = z.infer<typeof insertIntroConversationSchema>;

// ─── Messages ────────────────────────────────────────────────────────────────

export const introMessages = pgTable("intro_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => introConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertIntroMessageSchema = createInsertSchema(introMessages).omit({
  id: true,
  createdAt: true,
});

export type IntroMessage = typeof introMessages.$inferSelect;
export type InsertIntroMessage = z.infer<typeof insertIntroMessageSchema>;

// ─── Listening Tests ─────────────────────────────────────────────────────────

export const introListeningTests = pgTable(
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

export type IntroListeningTest = typeof introListeningTests.$inferSelect;

// ─── Listening Attempts ───────────────────────────────────────────────────────

export const introListeningAttempts = pgTable(
  "intro_listening_attempts",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => introStudents.id, { onDelete: "cascade" }),
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

export type IntroListeningAttempt = typeof introListeningAttempts.$inferSelect;

// ─── Reading Items ────────────────────────────────────────────────────────────

export const introReadingItems = pgTable(
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

export type IntroReadingItem = typeof introReadingItems.$inferSelect;

// ─── Reading Attempts ─────────────────────────────────────────────────────────

export const introReadingAttempts = pgTable(
  "intro_reading_attempts",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => introStudents.id, { onDelete: "cascade" }),
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

export type IntroReadingAttempt = typeof introReadingAttempts.$inferSelect;

// ─── Essay Logs ───────────────────────────────────────────────────────────────

export const introEssayLogs = pgTable("intro_essay_logs", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => introStudents.id, { onDelete: "cascade" }),
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

export type IntroEssayLog = typeof introEssayLogs.$inferSelect;
