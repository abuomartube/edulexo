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

export const PAYMENT_PROVIDER_VALUES = [
  "tabby",
  "tamara",
  "bank_transfer",
] as const;
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
    /**
     * Bank-transfer fields. Only populated when `provider = "bank_transfer"`.
     * The student types in the name on their sending account (Arabic or
     * English) so the admin can match against the bank statement.
     */
    bankSenderName: varchar("bank_sender_name", { length: 200 }),
    /**
     * Object-storage path of the uploaded payment proof, e.g.
     * `/objects/uploads/<uuid>`. Served via `/api/storage/objects/<uuid>`
     * with auth + ACL guards (only the owner or an admin may view).
     */
    bankProofObjectPath: text("bank_proof_object_path"),
    /** MIME type captured at upload-time (e.g. `image/jpeg`, `application/pdf`). */
    bankProofContentType: varchar("bank_proof_content_type", { length: 128 }),
    /** Original filename, kept for the admin UI download link. */
    bankProofFilename: varchar("bank_proof_filename", { length: 256 }),
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
