import { useEffect, useMemo, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useT, useLanguage } from "@/lib/i18n";
import {
  fetchCheckoutPreview,
  startCheckout,
  type CheckoutPreview,
  type CheckoutProvider,
  type CheckoutCourse,
} from "@/lib/platform-api";

const VALID_TIERS: Record<CheckoutCourse, readonly string[]> = {
  intro: ["intro", "advance", "complete"],
  english: ["beginner", "intermediate", "advanced"],
};

function formatAmount(minor: number, currency: string, lang: "en" | "ar"): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major.toFixed(0)} ${currency}`;
  }
}

export default function Checkout() {
  const [, params] = useRoute<{ course: string; tier: string }>(
    "/checkout/:course/:tier",
  );
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const t = useT();
  const { lang } = useLanguage();

  const course = (params?.course ?? "").toLowerCase();
  const tier = (params?.tier ?? "").toLowerCase();
  const isValid =
    (course === "intro" || course === "english") &&
    VALID_TIERS[course as CheckoutCourse].includes(tier);

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<CheckoutProvider>("tabby");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValid) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadError(null);
    fetchCheckoutPreview(course as CheckoutCourse, tier)
      .then((p) => {
        if (alive) setPreview(p);
      })
      .catch((err: unknown) => {
        if (alive) setLoadError((err as Error).message ?? "error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [course, tier, isValid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || !agree || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const start = await startCheckout(
        provider,
        preview.course,
        preview.tier,
        lang,
      );
      window.location.href = start.redirectUrl;
    } catch (err) {
      setSubmitting(false);
      const msg = (err as Error).message ?? "error";
      if (msg === "provider_not_configured") {
        setSubmitError(t("checkout.providerNotConfigured"));
      } else if (msg === "already_enrolled") {
        navigate("/dashboard?payment=success");
      } else {
        setSubmitError(t("checkout.error"));
      }
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t("checkout.title")}
        </h1>

        {!isValid && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-5 text-sm">
            {t("checkout.notFound")}
            <div className="mt-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-semibold"
              >
                {t("checkout.goToDashboard")} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {isValid && loading && (
          <div className="mt-8 rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-8 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow text-center text-sm text-slate-500">
            {t("checkout.loading")}
          </div>
        )}

        {isValid && !loading && loadError && (
          <div className="mt-8 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-700/50 p-5 text-sm">
            {t("checkout.error")}
          </div>
        )}

        {isValid && !loading && preview && preview.alreadyEnrolled && (
          <div className="mt-8 rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700/50 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                size={22}
              />
              <div className="flex-1">
                <p className="font-semibold">{t("checkout.alreadyEnrolled")}</p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-semibold"
                >
                  {t("checkout.goToDashboard")} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {isValid && !loading && preview && !preview.alreadyEnrolled && (
          <CheckoutForm
            preview={preview}
            lang={lang}
            provider={provider}
            setProvider={setProvider}
            agree={agree}
            setAgree={setAgree}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
            t={t}
          />
        )}
      </main>
    </div>
  );
}

function CheckoutForm({
  preview,
  lang,
  provider,
  setProvider,
  agree,
  setAgree,
  submitting,
  submitError,
  onSubmit,
  t,
}: {
  preview: CheckoutPreview;
  lang: "en" | "ar";
  provider: CheckoutProvider;
  setProvider: (p: CheckoutProvider) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  t: (k: Parameters<ReturnType<typeof useT>>[0]) => string;
}) {
  const courseLabel = useMemo(
    () => (lang === "ar" ? preview.courseLabelAr : preview.courseLabelEn),
    [preview, lang],
  );
  const tierLabel = useMemo(
    () => (lang === "ar" ? preview.tierLabelAr : preview.tierLabelEn),
    [preview, lang],
  );
  const total = formatAmount(preview.amountMinor, preview.currency, lang);

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <section className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
        <h2 className="text-base font-bold mb-4">{t("checkout.summary")}</h2>
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-slate-500">{t("checkout.course")}</dt>
          <dd className="col-span-2 font-medium">{courseLabel}</dd>
          <dt className="text-slate-500">{t("checkout.tier")}</dt>
          <dd className="col-span-2 font-medium">{tierLabel}</dd>
          <dt className="text-slate-500">{t("checkout.total")}</dt>
          <dd className="col-span-2 font-extrabold text-lg">{total}</dd>
        </dl>
      </section>

      <section className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
        <h2 className="text-base font-bold mb-4">{t("checkout.choosePayment")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProviderTile
            id="tabby"
            ariaLabel={t("checkout.payWithTabby")}
            description={t("checkout.tabbyDesc")}
            ringColor="ring-[#3BFFC1]"
            bgColor="bg-[#3BFFC1]/10"
            checked={provider === "tabby"}
            onSelect={() => setProvider("tabby")}
            logo={<TabbyLogo />}
          />
          <ProviderTile
            id="tamara"
            ariaLabel={t("checkout.payWithTamara")}
            description={t("checkout.tamaraDesc")}
            ringColor="ring-[#3D1560]"
            bgColor="bg-[#3D1560]/5"
            checked={provider === "tamara"}
            onSelect={() => setProvider("tamara")}
            logo={<TamaraLogo />}
          />
        </div>
      </section>

      <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span>{t("checkout.terms")}</span>
      </label>

      {submitError && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-700/50 p-4 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!agree || submitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition"
      >
        {submitting ? t("checkout.processing") : t("checkout.continue")}
        {!submitting && <ArrowRight size={16} />}
      </button>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 inline-flex items-center justify-center gap-1.5 w-full">
        <ShieldCheck size={12} /> {t("checkout.secure")}
      </p>
    </form>
  );
}

function ProviderTile({
  id,
  ariaLabel,
  description,
  ringColor,
  bgColor,
  checked,
  onSelect,
  logo,
}: {
  id: string;
  ariaLabel: string;
  description: string;
  ringColor: string;
  bgColor: string;
  checked: boolean;
  onSelect: () => void;
  logo: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      aria-label={ariaLabel}
      className={`group flex flex-col items-start gap-3 text-start rounded-xl p-5 min-h-[120px] ring-2 bg-white dark:bg-gray-900/60 transition ${
        checked
          ? `${ringColor} ${bgColor} shadow-md`
          : "ring-slate-200 dark:ring-gray-800 hover:ring-slate-300 dark:hover:ring-gray-700"
      }`}
      data-provider={id}
    >
      <div className="h-9 flex items-center">{logo}</div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {description}
      </p>
    </button>
  );
}

/**
 * Tabby brand chip — official primary colour `#3BFFC1` (mint) on a clean
 * rounded chip with the lowercase "tabby" wordmark in their charcoal
 * `#292929`. Matches Tabby's "Pay in 4" merchant button guidelines:
 * https://docs.tabby.ai/pay-in-4-custom-integration/promo-messaging
 */
function TabbyLogo() {
  return (
    <svg
      role="img"
      aria-label="Tabby"
      width="92"
      height="34"
      viewBox="0 0 92 34"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="92" height="34" rx="8" fill="#3BFFC1" />
      <text
        x="46"
        y="23"
        textAnchor="middle"
        fontFamily='Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
        fontWeight={800}
        fontSize="17"
        fill="#292929"
        letterSpacing="-0.4"
      >
        tabby
      </text>
    </svg>
  );
}

/**
 * Tamara brand chip — official primary colour `#3D1560` (deep purple) on a
 * white card, with the lowercase "tamara." wordmark in matching purple.
 * Matches Tamara's merchant brand guidelines for payment-method buttons.
 */
function TamaraLogo() {
  return (
    <svg
      role="img"
      aria-label="Tamara"
      width="100"
      height="34"
      viewBox="0 0 100 34"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.5"
        width="99"
        height="33"
        rx="8"
        fill="#FFFFFF"
        stroke="#3D1560"
      />
      <text
        x="50"
        y="23"
        textAnchor="middle"
        fontFamily='Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
        fontWeight={800}
        fontSize="17"
        fill="#3D1560"
        letterSpacing="-0.4"
      >
        tamara
        <tspan fontSize="22" dy="1">.</tspan>
      </text>
    </svg>
  );
}
