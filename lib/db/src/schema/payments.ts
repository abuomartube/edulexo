import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  index,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const PAYMENT_COURSE_VALUES = ["intro", "english"] as const;
export type PaymentCourse = (typeof PAYMENT_COURSE_VALUES)[number];

export const PAYMENT_PROVIDER_VALUES = ["tabby", "tamara"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDER_VALUES)[number];

export const PAYMENT_MODE_VALUES = ["sandbox", "live"] as const;
export type PaymentMode = (typeof PAYMENT_MODE_VALUES)[number];

export const PAYMENT_STATUS_VALUES = [
  "created",
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "expired",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export const tierPricesTable = pgTable(
  "tier_prices",
  {
    course: varchar("course", { length: 16 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SAR"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.course, t.tier] })],
);

export type TierPrice = typeof tierPricesTable.$inferSelect;

export const paymentsTable = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    course: varchar("course", { length: 16 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SAR"),
    provider: varchar("provider", { length: 16 }).notNull(),
    mode: varchar("mode", { length: 8 }).notNull(),
    providerSessionId: text("provider_session_id").unique(),
    providerPaymentId: text("provider_payment_id"),
    status: varchar("status", { length: 16 }).notNull().default("created"),
    failureReason: text("failure_reason"),
    rawPayload: jsonb("raw_payload"),
    enrollmentId: uuid("enrollment_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
  },
  (t) => [
    index("payments_user_id_idx").on(t.userId),
    index("payments_status_idx").on(t.status),
    index("payments_provider_status_idx").on(t.provider, t.status),
    index("payments_created_at_idx").on(t.createdAt.desc()),
  ],
);

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
