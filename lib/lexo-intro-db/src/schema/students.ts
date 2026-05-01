import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const students = pgTable("intro_students", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  password: varchar("password", { length: 255 }),
  accessCode: varchar("access_code", { length: 64 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const settings = pgTable("intro_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: varchar("value").notNull(),
});

export const accessCodes = pgTable("intro_access_codes", {
  code: varchar("code", { length: 64 }).primaryKey(),
  usedBy: varchar("used_by", { length: 255 }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
