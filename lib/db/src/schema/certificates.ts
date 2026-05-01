import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const CERTIFICATE_COURSE_VALUES = ["intro", "english"] as const;
export type CertificateCourse = (typeof CERTIFICATE_COURSE_VALUES)[number];

export const certificatesTable = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    course: varchar("course", { length: 16 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull(),
    enrollmentId: uuid("enrollment_id"),
    certificateId: text("certificate_id").notNull().unique(),
    completionDate: date("completion_date").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    issuedBy: uuid("issued_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: text("revoke_reason"),
  },
  (t) => [
    index("certificates_user_id_idx").on(t.userId),
    index("certificates_issued_at_idx").on(t.issuedAt.desc()),
    uniqueIndex("certificates_active_user_course_tier_uniq")
      .on(t.userId, t.course, t.tier)
      .where(sql`revoked_at IS NULL`),
  ],
);

export type CertificateRow = typeof certificatesTable.$inferSelect;
