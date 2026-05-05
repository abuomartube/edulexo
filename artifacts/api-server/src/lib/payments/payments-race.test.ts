// ---------------------------------------------------------------------------
// Phase-7 race-safety pinning tests.
//
// These tests guard the three correctness properties that closed the
// architect v3 HIGH findings:
//
//   1. The DB-level partial unique index
//      `payments_unique_pending_bank_transfer` rejects a second pending
//      bank-transfer row for the same (user_id, course, tier) — the
//      app-level pre-flight SELECT alone could race past two parallel
//      requests.
//
//   2. `activateEnrollmentForPayment` refuses to resurrect a payment that
//      is already in a terminal failure state (`failed`/`cancelled`/
//      `expired`). A concurrent admin reject would otherwise be silently
//      undone by a verify call that started a millisecond earlier — and
//      the student would already have received the rejection email.
//
//   3. `markPaymentTerminal` returns `false` when the row is already
//      captured. The admin reject route gates the snapshot/audit/email
//      writes on this return value so it cannot email "rejected" to a
//      student whose payment was just captured.
//
// The tests exercise the *real* database — they create their own user +
// payment rows under throwaway tier names so they don't trip seeded data
// or interfere with the running app. Each test cleans up after itself.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  paymentsTable,
  usersTable,
  enrollmentsTable,
  type Payment,
} from "@workspace/db";
import {
  activateEnrollmentForPayment,
  markPaymentTerminal,
  pgErrorInfo,
} from "./activation";

// All test rows share this suffix so cleanup is trivial and we never
// accidentally touch real user data.
const TEST_TAG = `race-test-${Date.now()}-${randomUUID().slice(0, 8)}`;

// `enrollments.tier` is `varchar(16)` so test tier names must stay short.
// `payments.tier` is `varchar(32)`, so this is the binding constraint.
function shortTier(label: string): string {
  // 4-char label + 8-hex chars + 1 hyphen = 13 chars. Safe under 16.
  const hex = randomUUID().replace(/-/g, "").slice(0, 8);
  return `${label.slice(0, 4)}-${hex}`;
}

// We use the shared `pgErrorInfo` helper exported from activation.ts so
// the tests fail loudly if the helper ever stops unwrapping
// `DrizzleQueryError.cause` correctly — that would silently break the
// route-level 409 contract too.

let testUserId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(usersTable)
    .values({
      name: TEST_TAG,
      email: `${TEST_TAG}@test.local`,
      passwordHash: "x",
      role: "student",
      preferredLanguage: "en",
    })
    .returning({ id: usersTable.id });
  testUserId = user.id;
});

afterAll(async () => {
  // FK cascade from users → payments → enrollments handles the cleanup.
  await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  await pool.end();
});

async function insertPendingBankTransfer(tier: string): Promise<Payment> {
  const [row] = await db
    .insert(paymentsTable)
    .values({
      userId: testUserId,
      course: "intro",
      tier,
      amountMinor: 15000,
      currency: "SAR",
      provider: "bank_transfer",
      mode: "live",
      status: "pending",
    })
    .returning();
  return row;
}

describe("Phase 7 race-safety", () => {
  describe("partial unique index payments_unique_pending_bank_transfer", () => {
    it("rejects a second pending bank_transfer for the same (user, course, tier)", async () => {
      const tier = shortTier("dup");
      // First insert succeeds.
      const first = await insertPendingBankTransfer(tier);
      expect(first.status).toBe("pending");

      // Second insert MUST be rejected by the partial unique index.
      let caught: unknown = null;
      try {
        await insertPendingBankTransfer(tier);
      } catch (err) {
        caught = err;
      }
      expect(caught).not.toBeNull();
      const pg = pgErrorInfo(caught);
      // These two assertions pin the contract the route handler depends on
      // — if `code` or `constraint` were ever to disappear (e.g. drizzle
      // changes its error wrapping), the route would silently 500 instead
      // of returning 409.
      expect(pg.code).toBe("23505");
      expect(pg.constraint).toBe("payments_unique_pending_bank_transfer");
    });

    it("ALLOWS a new pending row after the previous one was rejected (terminal state is excluded from the partial index)", async () => {
      const tier = shortTier("aft");
      const first = await insertPendingBankTransfer(tier);

      // Flip first to failed → it's no longer covered by the WHERE clause.
      await db
        .update(paymentsTable)
        .set({ status: "failed" })
        .where(eq(paymentsTable.id, first.id));

      // A retry from the buyer must now be permitted.
      const second = await insertPendingBankTransfer(tier);
      expect(second.id).not.toBe(first.id);
      expect(second.status).toBe("pending");
    });
  });

  describe("activateEnrollmentForPayment refuses terminal rows", () => {
    it("returns not_activatable when the row is already failed (verify-after-reject race)", async () => {
      const tier = shortTier("var");
      const pending = await insertPendingBankTransfer(tier);

      // Simulate the concurrent reject that won the race.
      await db
        .update(paymentsTable)
        .set({ status: "failed", failureReason: "admin_rejected" })
        .where(eq(paymentsTable.id, pending.id));

      // Verify call now arrives — must be refused.
      const result = await activateEnrollmentForPayment(pending, {
        providerPaymentId: null,
        rawPayload: { test: true },
      });
      expect(result.status).toBe("not_activatable");
      if (result.status === "not_activatable") {
        expect(result.currentStatus).toBe("failed");
      }

      // The row must still be `failed` — no resurrection.
      const [after] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, pending.id))
        .limit(1);
      expect(after.status).toBe("failed");
      expect(after.enrollmentId).toBeNull();
      expect(after.capturedAt).toBeNull();

      // No enrollment row should exist for this user+tier.
      const enrolls = await db
        .select()
        .from(enrollmentsTable)
        .where(eq(enrollmentsTable.userId, testUserId));
      expect(enrolls.find((e) => e.tier === tier)).toBeUndefined();
    });

    it("also refuses cancelled and expired states", async () => {
      for (const terminal of ["cancelled", "expired"] as const) {
        const tier = shortTier(terminal);
        const pending = await insertPendingBankTransfer(tier);
        await db
          .update(paymentsTable)
          .set({ status: terminal })
          .where(eq(paymentsTable.id, pending.id));

        const result = await activateEnrollmentForPayment(pending, {
          providerPaymentId: null,
          rawPayload: null,
        });
        expect(result.status).toBe("not_activatable");
        if (result.status === "not_activatable") {
          expect(result.currentStatus).toBe(terminal);
        }
      }
    });

    it("still activates a normal pending row (regression guard)", async () => {
      const tier = shortTier("hap");
      const pending = await insertPendingBankTransfer(tier);

      const result = await activateEnrollmentForPayment(pending, {
        providerPaymentId: null,
        rawPayload: { test: true },
      });
      expect(result.status).toBe("activated");
      if (result.status === "activated") {
        expect(result.enrollmentId).toBeTruthy();
      }

      // Re-call must be idempotent.
      const second = await activateEnrollmentForPayment(pending, {
        providerPaymentId: null,
        rawPayload: { test: true },
      });
      expect(second.status).toBe("already_captured");
    });
  });

  describe("markPaymentTerminal returns false on captured rows", () => {
    it("returns false (no transition) when the payment is already captured", async () => {
      const tier = shortTier("rav");
      const pending = await insertPendingBankTransfer(tier);

      // Activate it first.
      const activated = await activateEnrollmentForPayment(pending, {
        providerPaymentId: null,
        rawPayload: null,
      });
      expect(activated.status).toBe("activated");

      // Now the racing reject arrives — must NOT transition the row,
      // must NOT return true, must NOT corrupt the captured state.
      const transitioned = await markPaymentTerminal(
        pending.id,
        "failed",
        "admin_rejected",
        { rejected: true },
      );
      expect(transitioned).toBe(false);

      const [after] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, pending.id))
        .limit(1);
      expect(after.status).toBe("captured");
      expect(after.failureReason).toBeNull();
    });

    it("returns true when transitioning a real pending row", async () => {
      const tier = shortTier("rrl");
      const pending = await insertPendingBankTransfer(tier);

      const transitioned = await markPaymentTerminal(
        pending.id,
        "failed",
        "smoke_test",
        null,
      );
      expect(transitioned).toBe(true);

      // Calling again must return false (already terminal).
      const second = await markPaymentTerminal(
        pending.id,
        "failed",
        "smoke_test",
        null,
      );
      expect(second).toBe(false);
    });
  });
});
