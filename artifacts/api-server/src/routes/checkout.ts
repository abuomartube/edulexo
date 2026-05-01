import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, isNull, or, gt } from "drizzle-orm";
import {
  db,
  usersTable,
  enrollmentsTable,
  englishEnrollmentsTable,
  paymentsTable,
  tierPricesTable,
  uploadGrantsTable,
  PAYMENT_COURSE_VALUES,
  PAYMENT_PROVIDER_VALUES,
  PAYMENT_STATUS_VALUES,
} from "@workspace/db";
import { requireAuth, requireAdmin, getUserById } from "../lib/auth";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  buildReturnUrl,
  buildWebhookUrl,
  getBankTransferConfig,
  getCheckoutBaseUrl,
  getTabbyConfig,
  getTamaraConfig,
  ProviderConfigError,
} from "../lib/payments/config";
import {
  createTabbyCheckoutSession,
  retrieveTabbyPayment,
} from "../lib/payments/tabby";
import {
  createTamaraCheckoutOrder,
  retrieveTamaraOrder,
  verifyTamaraNotification,
} from "../lib/payments/tamara";
import {
  activateEnrollmentForPayment,
  fireActivationEmail,
  markPaymentTerminal,
} from "../lib/payments/activation";

const router: IRouter = Router();

const COURSE_LABELS_EN: Record<string, string> = {
  intro: "LEXO Intro",
  english: "LEXO for English",
};
const COURSE_LABELS_AR: Record<string, string> = {
  intro: "ليكسو للتأسيس",
  english: "ليكسو للغة الإنجليزية",
};
const TIER_LABELS_AR: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  advance: "متقدم",
  complete: "شامل",
  intro: "تأسيس",
};

function titleCase(s: string): string {
  return s
    .split(/[\s_-]+/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(" ");
}

function tierLabelEn(tier: string): string {
  return titleCase(tier);
}
function tierLabelAr(tier: string): string {
  return TIER_LABELS_AR[tier.toLowerCase()] ?? titleCase(tier);
}

const VALID_TIERS_BY_COURSE: Record<string, readonly string[]> = {
  intro: ["intro", "advance", "complete"],
  english: ["beginner", "intermediate", "advanced"],
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string | undefined | null): value is string {
  return !!value && UUID_RE.test(value);
}

function isValidTierForCourse(course: string, tier: string): boolean {
  return (VALID_TIERS_BY_COURSE[course] ?? []).includes(tier);
}

async function getActiveEnrollment(
  course: "intro" | "english",
  userId: string,
  tier: string,
): Promise<{ id: string } | null> {
  if (course === "english") {
    const [r] = await db
      .select({ id: englishEnrollmentsTable.id })
      .from(englishEnrollmentsTable)
      .where(
        and(
          eq(englishEnrollmentsTable.userId, userId),
          eq(englishEnrollmentsTable.tier, tier),
          eq(englishEnrollmentsTable.status, "active"),
        ),
      )
      .limit(1);
    return r ?? null;
  }
  const [r] = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.userId, userId),
        eq(enrollmentsTable.tier, tier),
        eq(enrollmentsTable.status, "active"),
      ),
    )
    .limit(1);
  return r ?? null;
}

async function getTierPrice(
  course: string,
  tier: string,
): Promise<{ amountMinor: number; currency: string } | null> {
  const [row] = await db
    .select({
      amountMinor: tierPricesTable.amountMinor,
      currency: tierPricesTable.currency,
    })
    .from(tierPricesTable)
    .where(
      and(eq(tierPricesTable.course, course), eq(tierPricesTable.tier, tier)),
    )
    .limit(1);
  return row ?? null;
}

const PreviewQuery = z.object({
  course: z.enum(PAYMENT_COURSE_VALUES),
  tier: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((s) => s.toLowerCase()),
});

router.get("/checkout/preview", requireAuth, async (req, res, next) => {
  try {
    const parsed = PreviewQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }
    const { course, tier } = parsed.data;
    if (!isValidTierForCourse(course, tier)) {
      res.status(400).json({ error: "Invalid tier for course" });
      return;
    }
    const price = await getTierPrice(course, tier);
    if (!price) {
      res.status(404).json({ error: "Price not configured" });
      return;
    }
    const enrollment = await getActiveEnrollment(
      course,
      req.session.userId!,
      tier,
    );
    res.json({
      course,
      tier,
      courseLabelEn: COURSE_LABELS_EN[course] ?? course,
      courseLabelAr: COURSE_LABELS_AR[course] ?? course,
      tierLabelEn: tierLabelEn(tier),
      tierLabelAr: tierLabelAr(tier),
      amountMinor: price.amountMinor,
      currency: price.currency,
      alreadyEnrolled: !!enrollment,
    });
  } catch (err) {
    next(err);
  }
});

const StartBody = z.object({
  course: z.enum(PAYMENT_COURSE_VALUES),
  tier: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((s) => s.toLowerCase()),
  language: z.enum(["en", "ar"]).optional(),
});

interface StartContext {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
  };
  course: "intro" | "english";
  tier: string;
  amountMinor: number;
  currency: string;
  language: "en" | "ar";
  description: string;
}

async function loadStartContext(
  body: unknown,
  userId: string,
): Promise<
  | { kind: "ok"; ctx: StartContext }
  | { kind: "error"; status: number; body: Record<string, unknown> }
> {
  const parsed = StartBody.safeParse(body);
  if (!parsed.success) {
    return {
      kind: "error",
      status: 400,
      body: { error: "Invalid body", details: parsed.error.flatten() },
    };
  }
  const { course, tier, language } = parsed.data;
  if (!isValidTierForCourse(course, tier)) {
    return {
      kind: "error",
      status: 400,
      body: { error: "Invalid tier for course" },
    };
  }
  const price = await getTierPrice(course, tier);
  if (!price) {
    return {
      kind: "error",
      status: 404,
      body: { error: "Price not configured" },
    };
  }
  const enrollment = await getActiveEnrollment(course, userId, tier);
  if (enrollment) {
    return {
      kind: "error",
      status: 409,
      body: { error: "already_enrolled", enrollmentId: enrollment.id },
    };
  }
  const user = await getUserById(userId);
  if (!user) {
    return {
      kind: "error",
      status: 401,
      body: { error: "User not found" },
    };
  }
  const description = `${COURSE_LABELS_EN[course]} — ${tierLabelEn(tier)}`;
  return {
    kind: "ok",
    ctx: {
      userId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
      course,
      tier,
      amountMinor: price.amountMinor,
      currency: price.currency,
      language: language ?? "en",
      description,
    },
  };
}

function configErrorResponse(err: unknown): Record<string, unknown> | null {
  if (err instanceof ProviderConfigError) {
    return {
      error: "provider_not_configured",
      missing: err.missing,
      message:
        "Payment provider is not configured for the current mode. " +
        "Ask the site administrator to add the missing secret.",
    };
  }
  return null;
}

router.post("/checkout/tabby", requireAuth, async (req, res, next) => {
  try {
    const loaded = await loadStartContext(req.body, req.session.userId!);
    if (loaded.kind === "error") {
      res.status(loaded.status).json(loaded.body);
      return;
    }
    const ctx = loaded.ctx;
    let cfgMode: "sandbox" | "live";
    try {
      cfgMode = getTabbyConfig().mode;
    } catch (err) {
      const c = configErrorResponse(err);
      if (c) {
        res.status(503).json(c);
        return;
      }
      throw err;
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        userId: ctx.userId,
        course: ctx.course,
        tier: ctx.tier,
        amountMinor: ctx.amountMinor,
        currency: ctx.currency,
        provider: "tabby",
        mode: cfgMode,
        status: "created",
      })
      .returning();

    try {
      const session = await createTabbyCheckoutSession({
        amountMinor: ctx.amountMinor,
        currency: ctx.currency,
        course: ctx.course,
        tier: ctx.tier,
        buyer: {
          email: ctx.user.email,
          name: ctx.user.name,
          phone: (ctx.user.phone || "").trim() || "+966500000000",
        },
        orderReferenceId: payment.id,
        description: ctx.description,
        successUrl: buildReturnUrl("tabby", payment.id, "success"),
        cancelUrl: buildReturnUrl("tabby", payment.id, "cancel"),
        failureUrl: buildReturnUrl("tabby", payment.id, "failure"),
        webhookUrl: buildWebhookUrl("tabby"),
        language: ctx.language,
      });

      await db
        .update(paymentsTable)
        .set({
          providerSessionId: session.id || payment.id,
          providerPaymentId: session.paymentId,
          status: session.redirectUrl ? "pending" : "failed",
          failureReason: session.redirectUrl
            ? null
            : session.rejectionReason ?? "no_installment_plan",
          rawPayload: session.raw as object,
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, payment.id));

      if (!session.redirectUrl) {
        res.status(422).json({
          error: "tabby_rejected",
          reason: session.rejectionReason,
          paymentId: payment.id,
        });
        return;
      }

      res.json({
        paymentId: payment.id,
        provider: "tabby",
        mode: cfgMode,
        redirectUrl: session.redirectUrl,
      });
    } catch (err) {
      await markPaymentTerminal(
        payment.id,
        "failed",
        (err as Error).message ?? "tabby_error",
        { error: String(err) },
      );
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

router.post("/checkout/tamara", requireAuth, async (req, res, next) => {
  try {
    const loaded = await loadStartContext(req.body, req.session.userId!);
    if (loaded.kind === "error") {
      res.status(loaded.status).json(loaded.body);
      return;
    }
    const ctx = loaded.ctx;
    let cfgMode: "sandbox" | "live";
    try {
      cfgMode = getTamaraConfig().mode;
    } catch (err) {
      const c = configErrorResponse(err);
      if (c) {
        res.status(503).json(c);
        return;
      }
      throw err;
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        userId: ctx.userId,
        course: ctx.course,
        tier: ctx.tier,
        amountMinor: ctx.amountMinor,
        currency: ctx.currency,
        provider: "tamara",
        mode: cfgMode,
        status: "created",
      })
      .returning();

    try {
      const nameParts = ctx.user.name.split(/\s+/);
      const order = await createTamaraCheckoutOrder({
        amountMinor: ctx.amountMinor,
        currency: ctx.currency,
        course: ctx.course,
        tier: ctx.tier,
        description: ctx.description,
        buyer: {
          email: ctx.user.email,
          firstName: nameParts[0] || ctx.user.name || "Student",
          lastName: nameParts.slice(1).join(" ") || nameParts[0] || "Student",
          phone: (ctx.user.phone || "").trim() || "+966500000000",
        },
        orderReferenceId: payment.id,
        successUrl: buildReturnUrl("tamara", payment.id, "success"),
        failureUrl: buildReturnUrl("tamara", payment.id, "failure"),
        cancelUrl: buildReturnUrl("tamara", payment.id, "cancel"),
        notificationUrl: buildWebhookUrl("tamara"),
        language: ctx.language,
      });

      await db
        .update(paymentsTable)
        .set({
          providerSessionId: order.orderId || payment.id,
          providerPaymentId: order.checkoutId,
          status: order.checkoutUrl ? "pending" : "failed",
          rawPayload: order.raw as object,
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, payment.id));

      if (!order.checkoutUrl) {
        res.status(422).json({
          error: "tamara_rejected",
          paymentId: payment.id,
        });
        return;
      }

      res.json({
        paymentId: payment.id,
        provider: "tamara",
        mode: cfgMode,
        redirectUrl: order.checkoutUrl,
      });
    } catch (err) {
      await markPaymentTerminal(
        payment.id,
        "failed",
        (err as Error).message ?? "tamara_error",
        { error: String(err) },
      );
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// User-facing return endpoint. Re-checks status with the provider before
// redirecting back to the dashboard with ?payment=success|failure|cancel.
//
// IMPORTANT: state-changing branches (cancel/failure marking, activation)
// must only run when the caller is the owner of the payment. Otherwise an
// attacker who guesses a payment UUID could mark any pending payment as
// cancelled/failed. We require the session user to match `pay.userId`.
router.get("/checkout/return", async (req, res, next) => {
  try {
    const provider = String(req.query.provider ?? "").toLowerCase();
    const paymentId = String(req.query.payment ?? "");
    const outcome = String(req.query.outcome ?? "success").toLowerCase();
    const dashboard = `${getCheckoutBaseUrl()}/dashboard`;

    if (
      !PAYMENT_PROVIDER_VALUES.includes(provider as never) ||
      !isUuid(paymentId)
    ) {
      res.redirect(`${dashboard}?payment=invalid`);
      return;
    }

    const sessionUserId = req.session.userId;
    if (!sessionUserId) {
      // The provider's hosted checkout opened on our domain so the cookie
      // should be sent. If we don't have a session, send the buyer to log in
      // and then bounce them straight back to this return URL so we can
      // re-verify under their identity.
      const ret = encodeURIComponent(req.originalUrl);
      res.redirect(`${getCheckoutBaseUrl()}/login?next=${ret}`);
      return;
    }

    const [pay] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .limit(1);
    if (!pay) {
      res.redirect(`${dashboard}?payment=not_found`);
      return;
    }
    if (pay.userId !== sessionUserId || pay.provider !== provider) {
      // Don't leak whether the payment exists — same response as not_found.
      req.log.warn(
        { paymentId: pay.id, requestedBy: sessionUserId, owner: pay.userId, provider },
        "checkout return: ownership/provider mismatch",
      );
      res.redirect(`${dashboard}?payment=not_found`);
      return;
    }
    const payMode = pay.mode === "live" ? "live" : "sandbox";

    if (outcome === "cancel") {
      await markPaymentTerminal(pay.id, "cancelled", "user_cancelled", {
        outcome,
      });
      res.redirect(`${dashboard}?payment=cancelled`);
      return;
    }
    if (outcome === "failure") {
      await markPaymentTerminal(pay.id, "failed", "provider_failure", {
        outcome,
      });
      res.redirect(`${dashboard}?payment=failed`);
      return;
    }

    // outcome === "success" — verify with provider then activate.
    try {
      if (provider === "tabby" && pay.providerPaymentId) {
        const remote = await retrieveTabbyPayment(pay.providerPaymentId, payMode);
        if (
          remote.status === "AUTHORIZED" ||
          remote.status === "CLOSED"
        ) {
          const result = await activateEnrollmentForPayment(pay, {
            providerPaymentId: remote.id,
            rawPayload: remote.raw,
          });
          if (result.status === "activated") {
            fireActivationEmail({
              log: req.log,
              payment: { ...pay, enrollmentId: result.enrollmentId },
              enrollmentId: result.enrollmentId,
            });
          }
          res.redirect(`${dashboard}?payment=success`);
          return;
        }
        if (remote.status === "REJECTED") {
          await markPaymentTerminal(pay.id, "failed", remote.status, remote.raw);
        }
        res.redirect(`${dashboard}?payment=pending`);
        return;
      }
      if (provider === "tamara" && pay.providerSessionId) {
        const remote = await retrieveTamaraOrder(pay.providerSessionId, payMode);
        const status = remote.status.toUpperCase();
        if (status === "APPROVED" || status === "AUTHORISED" || status === "FULLY_CAPTURED") {
          const result = await activateEnrollmentForPayment(pay, {
            providerPaymentId: remote.orderId,
            rawPayload: remote.raw,
          });
          if (result.status === "activated") {
            fireActivationEmail({
              log: req.log,
              payment: { ...pay, enrollmentId: result.enrollmentId },
              enrollmentId: result.enrollmentId,
            });
          }
          res.redirect(`${dashboard}?payment=success`);
          return;
        }
        if (status === "DECLINED") {
          await markPaymentTerminal(pay.id, "failed", status, remote.raw);
        }
        res.redirect(`${dashboard}?payment=pending`);
        return;
      }
    } catch (err) {
      req.log.warn(
        { err, paymentId: pay.id, provider },
        "checkout return verification failed",
      );
    }
    res.redirect(`${dashboard}?payment=pending`);
  } catch (err) {
    next(err);
  }
});

// Webhooks. We ALWAYS re-fetch payment state from the provider before
// trusting any state transition. We look up the local payment row first so
// that we can re-fetch using the original payment's stored mode, which keeps
// historical (e.g. live) payments verifiable even if TABBY_MODE/TAMARA_MODE
// is later flipped back to sandbox.
router.post("/checkout/tabby/webhook", async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const innerPayment =
      (body["payment"] as Record<string, unknown> | undefined) ?? undefined;
    const paymentRef =
      (body["id"] as string | undefined) ??
      (innerPayment?.["id"] as string | undefined);
    const orderObj =
      (innerPayment?.["order"] as Record<string, unknown> | undefined) ??
      (body["order"] as Record<string, unknown> | undefined);
    const orderRef =
      (orderObj?.["reference_id"] as string | undefined) ??
      (body["order_reference_id"] as string | undefined);
    if (!paymentRef && !orderRef) {
      res.status(400).json({ error: "missing_payment_id" });
      return;
    }
    // `orderRef` is our internal payment id and must be a UUID; if it isn't,
    // fall back to looking up by provider's payment id so a malformed payload
    // can never crash the parameterized query.
    const orderRefValid = isUuid(orderRef);

    // Find our local row first so we know which mode/keys to use.
    const [pay] = await db
      .select()
      .from(paymentsTable)
      .where(
        orderRefValid
          ? eq(paymentsTable.id, orderRef!)
          : eq(paymentsTable.providerPaymentId, paymentRef ?? ""),
      )
      .limit(1);
    if (!pay) {
      res.status(202).json({ ok: true });
      return;
    }
    const payMode = pay.mode === "live" ? "live" : "sandbox";

    let remote;
    try {
      remote = await retrieveTabbyPayment(
        pay.providerPaymentId ?? paymentRef!,
        payMode,
      );
    } catch (err) {
      req.log.warn(
        { err, paymentId: pay.id, mode: payMode },
        "tabby webhook fetch failed",
      );
      res.status(202).json({ ok: true });
      return;
    }

    if (
      remote.status === "AUTHORIZED" ||
      remote.status === "CLOSED"
    ) {
      const result = await activateEnrollmentForPayment(pay, {
        providerPaymentId: remote.id,
        rawPayload: remote.raw,
      });
      if (result.status === "activated") {
        fireActivationEmail({
          log: req.log,
          payment: pay,
          enrollmentId: result.enrollmentId,
        });
      }
    } else if (remote.status === "REJECTED" || remote.status === "EXPIRED") {
      await markPaymentTerminal(
        pay.id,
        remote.status === "EXPIRED" ? "expired" : "failed",
        remote.status,
        remote.raw,
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/checkout/tamara/webhook", async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const orderId =
      (body["order_id"] as string | undefined) ??
      (body["orderId"] as string | undefined);
    const orderReferenceId =
      (body["order_reference_id"] as string | undefined) ??
      (body["orderReferenceId"] as string | undefined);

    const orderRefValid = isUuid(orderReferenceId);
    const [pay] = await db
      .select()
      .from(paymentsTable)
      .where(
        orderRefValid
          ? eq(paymentsTable.id, orderReferenceId!)
          : orderId
            ? eq(paymentsTable.providerSessionId, orderId)
            : eq(paymentsTable.providerSessionId, ""),
      )
      .limit(1);

    if (!pay || !pay.providerSessionId) {
      // Verify against the currently-configured mode so we still reject
      // forged unidentifiable payloads.
      if (!verifyTamaraNotification(req.headers, req.body)) {
        res.status(401).json({ error: "invalid_signature" });
        return;
      }
      res.status(202).json({ ok: true });
      return;
    }
    const payMode = pay.mode === "live" ? "live" : "sandbox";

    if (!verifyTamaraNotification(req.headers, req.body, payMode)) {
      res.status(401).json({ error: "invalid_signature" });
      return;
    }

    let remote;
    try {
      remote = await retrieveTamaraOrder(pay.providerSessionId, payMode);
    } catch (err) {
      req.log.warn(
        { err, paymentId: pay.id, mode: payMode },
        "tamara webhook fetch failed",
      );
      res.status(202).json({ ok: true });
      return;
    }
    const status = remote.status.toUpperCase();
    if (status === "APPROVED" || status === "AUTHORISED" || status === "FULLY_CAPTURED") {
      const result = await activateEnrollmentForPayment(pay, {
        providerPaymentId: remote.orderId,
        rawPayload: remote.raw,
      });
      if (result.status === "activated") {
        fireActivationEmail({
          log: req.log,
          payment: pay,
          enrollmentId: result.enrollmentId,
        });
      }
    } else if (status === "DECLINED" || status === "EXPIRED" || status === "CANCELED") {
      await markPaymentTerminal(
        pay.id,
        status === "EXPIRED"
          ? "expired"
          : status === "CANCELED"
            ? "cancelled"
            : "failed",
        status,
        remote.raw,
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Listing endpoints
router.get("/payments/mine", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: paymentsTable.id,
        course: paymentsTable.course,
        tier: paymentsTable.tier,
        amountMinor: paymentsTable.amountMinor,
        currency: paymentsTable.currency,
        provider: paymentsTable.provider,
        status: paymentsTable.status,
        createdAt: paymentsTable.createdAt,
        capturedAt: paymentsTable.capturedAt,
      })
      .from(paymentsTable)
      .where(eq(paymentsTable.userId, req.session.userId!))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(100);
    res.json({ payments: rows });
  } catch (err) {
    next(err);
  }
});

const AdminListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  course: z.enum(PAYMENT_COURSE_VALUES).optional(),
  provider: z.enum(PAYMENT_PROVIDER_VALUES).optional(),
  status: z.enum(PAYMENT_STATUS_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// ----------------------------------------------------------------------------
// Bank Transfer (manual / IBAN) — third payment method.
//
// Flow:
//   1. Buyer fetches /api/checkout/bank-transfer/details to render the IBAN
//      panel. If env vars not set, returns { configured: false } so the UI
//      hides the bank-transfer tile.
//   2. Buyer clicks "I have transferred" — POST /api/checkout/bank-transfer
//      creates a payments row (status='pending', provider='bank_transfer').
//   3. Admin opens Admin → Payments → Pending bank transfers, clicks Verify
//      (POST /api/admin/payments/:id/verify) which calls the shared
//      activateEnrollmentForPayment() → enrollment becomes active and the
//      confirmation email fires (same path as a Tabby/Tamara capture).
//   4. Admin can also Reject (POST /api/admin/payments/:id/reject) which
//      marks the payment as failed without touching enrollments.
// ----------------------------------------------------------------------------

router.get("/checkout/bank-transfer/details", requireAuth, (_req, res, next) => {
  try {
    const cfg = getBankTransferConfig();
    res.json({
      configured: true,
      bank: {
        bankNameEn: cfg.bankNameEn,
        bankNameAr: cfg.bankNameAr,
        accountNameEn: cfg.accountNameEn,
        accountNameAr: cfg.accountNameAr,
        iban: cfg.iban,
        swift: cfg.swift,
      },
    });
  } catch (err) {
    if (err instanceof ProviderConfigError) {
      res.json({ configured: false, missing: err.missing });
      return;
    }
    next(err);
  }
});

/**
 * Body for POST /checkout/bank-transfer.
 *
 * `senderName` and `proofObjectPath` are now required — Phase-6 v2 demands
 * the student attach a name + payment proof at submission time so an admin
 * can reconcile against the bank statement before activating the
 * enrollment. The proof was already uploaded directly to GCS via a
 * presigned URL (see POST /storage/uploads/request-url) so all we need
 * here is the object path that came back from the upload endpoint.
 */
const BankTransferStartBody = z.object({
  course: z.string(),
  tier: z.string(),
  language: z.enum(["en", "ar"]).optional(),
  senderName: z.string().trim().min(2).max(200),
  proofObjectPath: z.string().regex(/^\/objects\/.+/, "invalid_object_path"),
  proofContentType: z.string().min(1).max(128),
  proofFilename: z.string().min(1).max(256),
});

const bankTransferObjectStorage = new ObjectStorageService();

router.post("/checkout/bank-transfer", requireAuth, async (req, res, next) => {
  try {
    // Verify the bank-transfer config is set before creating the payment row,
    // otherwise we'd accept "I sent it" with nowhere for the buyer to send to.
    try {
      getBankTransferConfig();
    } catch (err) {
      if (err instanceof ProviderConfigError) {
        res.status(503).json({
          error: "bank_transfer_not_configured",
          missing: err.missing,
        });
        return;
      }
      throw err;
    }

    const parsed = BankTransferStartBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "invalid_body",
        issues: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const body = parsed.data;

    const loaded = await loadStartContext(
      { course: body.course, tier: body.tier, language: body.language },
      req.session.userId!,
    );
    if (loaded.kind === "error") {
      res.status(loaded.status).json(loaded.body);
      return;
    }
    const ctx = loaded.ctx;

    // Verify the proof object belongs to *this* user. Without this check
    // any logged-in attacker who learned another buyer's `/objects/<uuid>`
    // path could attach it to their own payment and (worse) reassign its
    // ACL owner via trySetObjectEntityAclPolicy below — a textbook IDOR.
    //
    // We mark the grant `used_at` atomically inside the same UPDATE so a
    // double-submit race can't reuse the same upload twice.
    const claimedGrants = await db
      .update(uploadGrantsTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(uploadGrantsTable.objectPath, body.proofObjectPath),
          eq(uploadGrantsTable.userId, ctx.userId),
          isNull(uploadGrantsTable.usedAt),
          gt(uploadGrantsTable.expiresAt, new Date()),
        ),
      )
      .returning({ id: uploadGrantsTable.id });
    if (claimedGrants.length === 0) {
      req.log.warn(
        { objectPath: body.proofObjectPath, userId: ctx.userId },
        "bank-transfer proof grant invalid (missing/expired/used/wrong-owner)",
      );
      res.status(403).json({ error: "proof_object_invalid" });
      return;
    }

    // Now that ownership is proven, lock the uploaded proof down so only
    // the buyer (and admins, who bypass the ACL check in the storage route)
    // can read it.
    let normalizedProofPath: string;
    try {
      normalizedProofPath = await bankTransferObjectStorage
        .trySetObjectEntityAclPolicy(body.proofObjectPath, {
          owner: ctx.userId,
          visibility: "private",
        });
    } catch (err) {
      req.log.warn(
        { err, objectPath: body.proofObjectPath, userId: ctx.userId },
        "bank-transfer proof ACL set failed",
      );
      res.status(400).json({ error: "proof_object_invalid" });
      return;
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        userId: ctx.userId,
        course: ctx.course,
        tier: ctx.tier,
        amountMinor: ctx.amountMinor,
        currency: ctx.currency,
        provider: "bank_transfer",
        // Bank transfer has no sandbox/live distinction — it's always real
        // money to a real IBAN. We store "live" so admin filtering works.
        mode: "live",
        status: "pending",
        bankSenderName: body.senderName,
        bankProofObjectPath: normalizedProofPath,
        bankProofContentType: body.proofContentType,
        bankProofFilename: body.proofFilename,
      })
      .returning();

    // Stamp a deterministic provider_session_id so admins have a stable
    // reference handle and the unique index is exercised.
    await db
      .update(paymentsTable)
      .set({
        providerSessionId: `bt-${payment.id}`,
        updatedAt: new Date(),
      })
      .where(eq(paymentsTable.id, payment.id));

    req.log.info(
      {
        paymentId: payment.id,
        userId: ctx.userId,
        course: ctx.course,
        tier: ctx.tier,
        amountMinor: ctx.amountMinor,
      },
      "bank-transfer payment registered (awaiting admin verification)",
    );

    res.json({
      paymentId: payment.id,
      provider: "bank_transfer",
      status: "pending",
      reference: `bt-${payment.id}`,
    });
  } catch (err) {
    next(err);
  }
});

const AdminVerifyBody = z.object({
  note: z.string().trim().max(500).optional(),
});
const AdminRejectBody = z.object({
  reason: z.string().trim().max(500).optional(),
});

router.post(
  "/admin/payments/:id/verify",
  requireAdmin,
  async (req, res, next) => {
    try {
      const paymentId = String(req.params.id ?? "");
      if (!isUuid(paymentId)) {
        res.status(400).json({ error: "Invalid payment id" });
        return;
      }
      const parsed = AdminVerifyBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }
      const adminId = req.session.userId!;
      const [pay] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, paymentId))
        .limit(1);
      if (!pay) {
        res.status(404).json({ error: "payment_not_found" });
        return;
      }
      // Only manual bank transfers are admin-verifiable. Tabby/Tamara
      // captures must come from the provider — never let an admin
      // hand-flip those, that would skip the provider verification.
      if (pay.provider !== "bank_transfer") {
        res.status(400).json({ error: "not_a_bank_transfer" });
        return;
      }
      if (pay.status === "captured") {
        // Idempotent: re-verifying a captured row is a no-op success.
        res.json({
          ok: true,
          status: "already_captured",
          enrollmentId: pay.enrollmentId,
        });
        return;
      }
      if (pay.status !== "pending" && pay.status !== "created") {
        res.status(409).json({
          error: "not_verifiable_in_current_status",
          status: pay.status,
        });
        return;
      }

      const result = await activateEnrollmentForPayment(pay, {
        providerPaymentId: null,
        rawPayload: {
          verifiedBy: adminId,
          verifiedAt: new Date().toISOString(),
          note: parsed.data.note ?? null,
        },
      });
      if (result.status === "activated") {
        fireActivationEmail({
          log: req.log,
          payment: { ...pay, enrollmentId: result.enrollmentId },
          enrollmentId: result.enrollmentId,
        });
      }
      req.log.info(
        {
          paymentId: pay.id,
          adminId,
          activationStatus: result.status,
          enrollmentId: result.enrollmentId,
        },
        "bank-transfer payment verified by admin",
      );
      res.json({
        ok: true,
        status: result.status,
        enrollmentId: result.enrollmentId,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/payments/:id/reject",
  requireAdmin,
  async (req, res, next) => {
    try {
      const paymentId = String(req.params.id ?? "");
      if (!isUuid(paymentId)) {
        res.status(400).json({ error: "Invalid payment id" });
        return;
      }
      const parsed = AdminRejectBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }
      const adminId = req.session.userId!;
      const [pay] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, paymentId))
        .limit(1);
      if (!pay) {
        res.status(404).json({ error: "payment_not_found" });
        return;
      }
      if (pay.provider !== "bank_transfer") {
        res.status(400).json({ error: "not_a_bank_transfer" });
        return;
      }
      if (pay.status === "captured") {
        res.status(409).json({ error: "already_captured" });
        return;
      }
      await markPaymentTerminal(
        pay.id,
        "failed",
        "admin_rejected",
        {
          rejectedBy: adminId,
          rejectedAt: new Date().toISOString(),
          reason: parsed.data.reason ?? null,
        },
      );
      req.log.info(
        { paymentId: pay.id, adminId, reason: parsed.data.reason ?? null },
        "bank-transfer payment rejected by admin",
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/admin/payments", requireAdmin, async (req, res, next) => {
  try {
    const parsed = AdminListQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }
    const { search, course, provider, status, limit } = parsed.data;
    const conds = [] as ReturnType<typeof eq>[];
    if (course) conds.push(eq(paymentsTable.course, course));
    if (provider) conds.push(eq(paymentsTable.provider, provider));
    if (status) conds.push(eq(paymentsTable.status, status));
    if (search) {
      const like = `%${search}%`;
      conds.push(
        or(
          ilike(usersTable.name, like),
          ilike(usersTable.email, like),
          ilike(paymentsTable.id, like),
        ) as ReturnType<typeof eq>,
      );
    }
    const rows = await db
      .select({
        id: paymentsTable.id,
        userId: paymentsTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
        course: paymentsTable.course,
        tier: paymentsTable.tier,
        amountMinor: paymentsTable.amountMinor,
        currency: paymentsTable.currency,
        provider: paymentsTable.provider,
        mode: paymentsTable.mode,
        status: paymentsTable.status,
        providerSessionId: paymentsTable.providerSessionId,
        providerPaymentId: paymentsTable.providerPaymentId,
        failureReason: paymentsTable.failureReason,
        createdAt: paymentsTable.createdAt,
        updatedAt: paymentsTable.updatedAt,
        capturedAt: paymentsTable.capturedAt,
        bankSenderName: paymentsTable.bankSenderName,
        bankProofObjectPath: paymentsTable.bankProofObjectPath,
        bankProofContentType: paymentsTable.bankProofContentType,
        bankProofFilename: paymentsTable.bankProofFilename,
      })
      .from(paymentsTable)
      .innerJoin(usersTable, eq(usersTable.id, paymentsTable.userId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(paymentsTable.createdAt))
      .limit(limit ?? 200);
    res.json({ payments: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
