import type { Logger } from "pino";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  paymentsTable,
  enrollmentsTable,
  englishEnrollmentsTable,
  type Payment,
} from "@workspace/db";
import { notifyStudentSelfEnrolled } from "../email-triggers";

type ActivationResult =
  | { status: "already_captured"; enrollmentId: string | null }
  | { status: "activated"; enrollmentId: string }
  | { status: "not_activatable"; currentStatus: string };

/**
 * Mark a payment as captured and ensure the matching enrollment is active.
 * Idempotent: if the payment is already captured + linked, this is a no-op.
 *
 * Returns a discriminated union so the caller can decide whether to fire the
 * confirmation email (only on first activation). Returns `not_activatable`
 * when the row is in a terminal failure state (`failed/cancelled/expired`)
 * — in that case the activation is REFUSED so a verify+reject race cannot
 * resurrect a rejected payment into a captured one (which would orphan the
 * already-sent rejection email and create contradictory state).
 */
export async function activateEnrollmentForPayment(
  payment: Payment,
  opts: { providerPaymentId?: string | null; rawPayload?: unknown },
): Promise<ActivationResult> {
  // Re-fetch the payment under transaction so we never race a concurrent
  // webhook with stale data.
  return db.transaction(async (tx) => {
    const [fresh] = await tx
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, payment.id))
      .for("update")
      .limit(1);
    if (!fresh) {
      throw new Error(`Payment ${payment.id} disappeared mid-transaction`);
    }

    // Idempotency: already captured + linked → bail.
    if (fresh.status === "captured" && fresh.enrollmentId) {
      return { status: "already_captured", enrollmentId: fresh.enrollmentId };
    }

    // Terminal failure states — refuse to activate. This is the
    // correctness guard for verify-after-reject: a concurrent reject may
    // have flipped the row to `failed` between the route's pre-read and
    // this transaction acquiring its row lock. Activating now would
    // resurrect a rejected payment and contradict the rejection email
    // that was already sent.
    if (
      fresh.status === "failed" ||
      fresh.status === "cancelled" ||
      fresh.status === "expired"
    ) {
      return { status: "not_activatable", currentStatus: fresh.status };
    }

    const sourceLabel = fresh.provider as "tabby" | "tamara" | "bank_transfer";
    const note = `Paid via ${sourceLabel} (${fresh.mode}) — payment ${fresh.id}`;

    let enrollmentId: string;
    if (fresh.course === "english") {
      enrollmentId = await upsertEnrollmentEnglish(tx, {
        userId: fresh.userId,
        tier: fresh.tier,
        source: sourceLabel,
        note,
        paymentId: fresh.id,
      });
    } else {
      enrollmentId = await upsertEnrollmentIntro(tx, {
        userId: fresh.userId,
        tier: fresh.tier,
        source: sourceLabel,
        note,
        paymentId: fresh.id,
      });
    }

    await tx
      .update(paymentsTable)
      .set({
        status: "captured",
        providerPaymentId:
          opts.providerPaymentId ?? fresh.providerPaymentId ?? null,
        enrollmentId,
        capturedAt: new Date(),
        updatedAt: new Date(),
        rawPayload: (opts.rawPayload as object | null | undefined) ?? fresh.rawPayload,
      })
      .where(eq(paymentsTable.id, fresh.id));

    return { status: "activated", enrollmentId };
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function upsertEnrollmentIntro(
  tx: Tx,
  params: {
    userId: string;
    tier: string;
    source: "tabby" | "tamara" | "bank_transfer";
    note: string;
    paymentId: string;
  },
): Promise<string> {
  const [existing] = await tx
    .select({ id: enrollmentsTable.id, status: enrollmentsTable.status })
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.userId, params.userId),
        eq(enrollmentsTable.tier, params.tier),
      ),
    )
    .limit(1);

  if (existing && existing.status === "active") {
    await tx
      .update(enrollmentsTable)
      .set({
        paymentId: params.paymentId,
        paymentStatus: "paid",
        source: params.source,
        note: params.note,
      })
      .where(eq(enrollmentsTable.id, existing.id));
    return existing.id;
  }

  if (existing) {
    await tx
      .update(enrollmentsTable)
      .set({
        status: "active",
        source: params.source,
        grantedAt: new Date(),
        paymentId: params.paymentId,
        paymentStatus: "paid",
        note: params.note,
      })
      .where(eq(enrollmentsTable.id, existing.id));
    return existing.id;
  }

  try {
    const [inserted] = await tx
      .insert(enrollmentsTable)
      .values({
        userId: params.userId,
        tier: params.tier,
        status: "active",
        source: params.source,
        note: params.note,
        paymentId: params.paymentId,
        paymentStatus: "paid",
      })
      .returning({ id: enrollmentsTable.id });
    return inserted.id;
  } catch (err) {
    // Race: a concurrent transaction inserted/activated the same
    // (user_id, tier) WHERE status='active' row between our SELECT and our
    // INSERT. The partial unique index `enrollments_active_user_tier_uniq`
    // raises Postgres 23505. Re-fetch the active row and merge.
    if (isUniqueViolation(err)) {
      const [conflict] = await tx
        .select({ id: enrollmentsTable.id })
        .from(enrollmentsTable)
        .where(
          and(
            eq(enrollmentsTable.userId, params.userId),
            eq(enrollmentsTable.tier, params.tier),
            eq(enrollmentsTable.status, "active"),
          ),
        )
        .limit(1);
      if (conflict) {
        await tx
          .update(enrollmentsTable)
          .set({
            paymentId: params.paymentId,
            paymentStatus: "paid",
            source: params.source,
            note: params.note,
          })
          .where(eq(enrollmentsTable.id, conflict.id));
        return conflict.id;
      }
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (code === "23505") return true;
  const cause = (err as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const ccode = (cause as { code?: string }).code;
    if (ccode === "23505") return true;
  }
  return false;
}

async function upsertEnrollmentEnglish(
  tx: Tx,
  params: {
    userId: string;
    tier: string;
    source: "tabby" | "tamara" | "bank_transfer";
    note: string;
    paymentId: string;
  },
): Promise<string> {
  const [existing] = await tx
    .select({
      id: englishEnrollmentsTable.id,
      status: englishEnrollmentsTable.status,
    })
    .from(englishEnrollmentsTable)
    .where(
      and(
        eq(englishEnrollmentsTable.userId, params.userId),
        eq(englishEnrollmentsTable.tier, params.tier),
      ),
    )
    .limit(1);

  if (existing && existing.status === "active") {
    await tx
      .update(englishEnrollmentsTable)
      .set({
        paymentId: params.paymentId,
        paymentStatus: "paid",
        source: params.source,
        note: params.note,
      })
      .where(eq(englishEnrollmentsTable.id, existing.id));
    return existing.id;
  }

  if (existing) {
    await tx
      .update(englishEnrollmentsTable)
      .set({
        status: "active",
        source: params.source,
        grantedAt: new Date(),
        paymentId: params.paymentId,
        paymentStatus: "paid",
        note: params.note,
      })
      .where(eq(englishEnrollmentsTable.id, existing.id));
    return existing.id;
  }

  try {
    const [inserted] = await tx
      .insert(englishEnrollmentsTable)
      .values({
        userId: params.userId,
        tier: params.tier,
        status: "active",
        source: params.source,
        note: params.note,
        paymentId: params.paymentId,
        paymentStatus: "paid",
      })
      .returning({ id: englishEnrollmentsTable.id });
    return inserted.id;
  } catch (err) {
    if (isUniqueViolation(err)) {
      const [conflict] = await tx
        .select({ id: englishEnrollmentsTable.id })
        .from(englishEnrollmentsTable)
        .where(
          and(
            eq(englishEnrollmentsTable.userId, params.userId),
            eq(englishEnrollmentsTable.tier, params.tier),
            eq(englishEnrollmentsTable.status, "active"),
          ),
        )
        .limit(1);
      if (conflict) {
        await tx
          .update(englishEnrollmentsTable)
          .set({
            paymentId: params.paymentId,
            paymentStatus: "paid",
            source: params.source,
            note: params.note,
          })
          .where(eq(englishEnrollmentsTable.id, conflict.id));
        return conflict.id;
      }
    }
    throw err;
  }
}

/**
 * Mark the payment as failed/cancelled/expired without touching enrollments.
 * Idempotent (safe to re-call).
 *
 * Returns `true` only when this call actually transitioned the row out of a
 * non-terminal state. Callers that need to perform downstream side-effects
 * (rejection email, audit row, snapshot columns) MUST gate them on this
 * return value — otherwise a concurrent verify+reject race can email the
 * student "rejected" while their payment is already `captured`.
 */
export async function markPaymentTerminal(
  paymentId: string,
  status: "failed" | "cancelled" | "expired",
  reason: string | null,
  rawPayload: unknown,
): Promise<boolean> {
  const updated = await db
    .update(paymentsTable)
    .set({
      status,
      failureReason: reason,
      updatedAt: new Date(),
      rawPayload: (rawPayload as object | null) ?? undefined,
    })
    .where(
      and(
        eq(paymentsTable.id, paymentId),
        // Only transition out of non-terminal states.
        sql`status IN ('created','pending','authorized')`,
      ),
    )
    .returning({ id: paymentsTable.id });
  return updated.length > 0;
}

export function fireActivationEmail(params: {
  log: Logger;
  payment: Payment;
  enrollmentId: string;
}): void {
  const { log, payment, enrollmentId } = params;
  void notifyStudentSelfEnrolled({
    log,
    userId: payment.userId,
    course: payment.course as "intro" | "english",
    tier: payment.tier,
    enrollmentId,
    source: payment.provider as "tabby" | "tamara" | "bank_transfer",
  }).catch(() => {
    // notifyStudentSelfEnrolled never throws, but belt-and-suspenders.
  });
}
