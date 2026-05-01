import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Sparkles,
  Crown,
  ExternalLink,
  KeyRound,
  Loader2,
  CheckCircle2,
  BookOpen,
  Compass,
  Rocket,
} from "lucide-react";
import {
  fetchMyEnrollments,
  fetchMyEnglishEnrollments,
  redeemAccessCode,
  redeemEnglishCode,
  launchTier,
  ENGLISH_APP_URL,
  type Enrollment,
  type EnglishEnrollment,
  type Tier,
  type EnglishTier,
} from "@/lib/platform-api";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import tierIntroLogo from "@assets/F404C41A-045C-42E8-B2EF-B75CBD59294E_1777643375926.PNG";
import tierAdvanceLogo from "@assets/29C649F8-7100-4DBE-95BE-491CAAA5B4E8_1777643368790.PNG";
import tierCompleteLogo from "@assets/890CB599-C509-44F9-A6D7-493614DAC2F9_1777643368791.PNG";

const IELTS_TIER_META: Record<
  Tier,
  { logo: string; gradient: string; range: string; nameKey: TranslationKey }
> = {
  intro: {
    logo: tierIntroLogo,
    gradient: "from-blue-600 to-indigo-700",
    range: "A2 → B1",
    nameKey: "courses.tier.intro",
  },
  advance: {
    logo: tierAdvanceLogo,
    gradient: "from-purple-600 to-fuchsia-700",
    range: "B1 → C1",
    nameKey: "courses.tier.advance",
  },
  complete: {
    logo: tierCompleteLogo,
    gradient: "from-amber-500 to-orange-600",
    range: "A2 → C1",
    nameKey: "courses.tier.complete",
  },
};

const ENGLISH_TIER_META: Record<
  EnglishTier,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    gradient: string;
    range: string;
    nameKey: TranslationKey;
  }
> = {
  beginner: {
    icon: Rocket,
    gradient: "from-emerald-500 to-teal-600",
    range: "A1 → A2",
    nameKey: "courses.english.tier.beginner",
  },
  intermediate: {
    icon: Compass,
    gradient: "from-sky-500 to-indigo-600",
    range: "A2 → B1",
    nameKey: "courses.english.tier.intermediate",
  },
  advanced: {
    icon: Crown,
    gradient: "from-violet-600 to-purple-700",
    range: "B1 → C1",
    nameKey: "courses.english.tier.advanced",
  },
};

export default function MyCourses() {
  const t = useT();
  const { lang } = useLanguage();

  return (
    <div className="space-y-6">
      <IeltsSection t={t} lang={lang} />
      <EnglishSection t={t} lang={lang} />
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
    </div>
  );
}

function formatExpires(expiresAt: string | null, lang: "en" | "ar"): string | null {
  if (!expiresAt) return null;
  return new Date(expiresAt).toLocaleDateString(
    lang === "ar" ? "ar-EG" : "en-US",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

// ───────────────────────── IELTS section ─────────────────────────

function IeltsSection({ t, lang }: { t: (k: TranslationKey) => string; lang: "en" | "ar" }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: fetchMyEnrollments,
  });

  const redeemMutation = useMutation({
    mutationFn: redeemAccessCode,
    onSuccess: (e) => {
      setRedeemMsg({
        kind: "ok",
        text: t("courses.redeem.success").replace("{tier}", t(IELTS_TIER_META[e.tier].nameKey)),
      });
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (err: Error) => setRedeemMsg({ kind: "err", text: err.message }),
  });

  const launchMutation = useMutation({
    mutationFn: launchTier,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (err: Error) => alert(err.message),
  });

  const enrollments: Enrollment[] = enrollmentsQuery.data ?? [];
  const active = enrollments.filter((e) => e.isActive);

  return (
    <section
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
      data-testid="section-courses-ielts"
    >
      <SectionHeader
        icon={<GraduationCap size={18} className="text-indigo-600 dark:text-indigo-400" />}
        title={t("courses.section.ielts")}
        loading={enrollmentsQuery.isFetching}
      />

      {enrollmentsQuery.isLoading ? (
        <div className="py-10 text-center text-slate-500 text-sm">
          <Loader2 size={20} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : active.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-gray-800 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">{t("courses.empty")}</p>
          <Link
            href="/ielts"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <BookOpen size={14} />
            {t("ielts.tiers.cta.open")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((e) => {
            const meta = IELTS_TIER_META[e.tier];
            const expiresLabel = formatExpires(e.expiresAt, lang);
            return (
              <div
                key={e.id}
                data-testid={`card-ielts-enrollment-${e.tier}`}
                className="rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition"
              >
                <div className={`bg-gradient-to-br ${meta.gradient} p-4 text-white flex items-center gap-3`}>
                  <img
                    src={meta.logo}
                    alt=""
                    className="w-12 h-12 object-contain bg-white/15 rounded-lg p-1.5"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider opacity-80">{meta.range}</p>
                    <h3 className="text-base font-bold leading-tight">{t(meta.nameKey)}</h3>
                  </div>
                </div>
                <div className="p-4">
                  {expiresLabel && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      {t("courses.expiresOn")}:{" "}
                      <span className="font-medium">{expiresLabel}</span>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => launchMutation.mutate(e.tier)}
                    disabled={launchMutation.isPending}
                    data-testid={`button-launch-ielts-${e.tier}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
                  >
                    {launchMutation.isPending && launchMutation.variables === e.tier ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ExternalLink size={15} />
                    )}
                    {t("courses.launch")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RedeemForm
        title={t("courses.redeem.title")}
        button={t("courses.redeem.button")}
        code={code}
        setCode={setCode}
        msg={redeemMsg}
        pending={redeemMutation.isPending}
        onSubmit={(c) => {
          setRedeemMsg(null);
          redeemMutation.mutate(c);
        }}
        testIdPrefix="ielts"
      />
    </section>
  );
}

// ───────────────────────── English section ─────────────────────────

function EnglishSection({ t, lang }: { t: (k: TranslationKey) => string; lang: "en" | "ar" }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ["my-english-enrollments"],
    queryFn: fetchMyEnglishEnrollments,
  });

  const redeemMutation = useMutation({
    mutationFn: redeemEnglishCode,
    onSuccess: (e) => {
      setRedeemMsg({
        kind: "ok",
        text: t("courses.redeem.success").replace("{tier}", t(ENGLISH_TIER_META[e.tier].nameKey)),
      });
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-english-enrollments"] });
    },
    onError: (err: Error) => setRedeemMsg({ kind: "err", text: err.message }),
  });

  const enrollments: EnglishEnrollment[] = enrollmentsQuery.data ?? [];
  const active = enrollments.filter((e) => e.isActive);

  return (
    <section
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
      data-testid="section-courses-english"
    >
      <SectionHeader
        icon={<Sparkles size={18} className="text-violet-600 dark:text-violet-400" />}
        title={t("courses.section.english")}
        loading={enrollmentsQuery.isFetching}
      />

      {enrollmentsQuery.isLoading ? (
        <div className="py-10 text-center text-slate-500 text-sm">
          <Loader2 size={20} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : active.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-gray-800 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">{t("courses.english.empty")}</p>
          <Link
            href="/english"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline"
          >
            <BookOpen size={14} />
            {t("courses.english.browse")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((e) => {
            const meta = ENGLISH_TIER_META[e.tier];
            const Icon = meta.icon;
            const expiresLabel = formatExpires(e.expiresAt, lang);
            return (
              <div
                key={e.id}
                data-testid={`card-english-enrollment-${e.tier}`}
                className="rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition"
              >
                <div
                  className={`bg-gradient-to-br ${meta.gradient} p-4 text-white flex items-center gap-3`}
                >
                  <div className="w-12 h-12 rounded-lg bg-white/15 p-2 flex items-center justify-center">
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider opacity-80">{meta.range}</p>
                    <h3 className="text-base font-bold leading-tight">{t(meta.nameKey)}</h3>
                  </div>
                </div>
                <div className="p-4">
                  {expiresLabel && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      {t("courses.expiresOn")}:{" "}
                      <span className="font-medium">{expiresLabel}</span>
                    </p>
                  )}
                  <a
                    href={ENGLISH_APP_URL}
                    data-testid={`button-launch-english-${e.tier}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm hover:opacity-90 transition"
                  >
                    <ExternalLink size={15} />
                    {t("courses.launch")}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RedeemForm
        title={t("courses.english.redeem.title")}
        button={t("courses.redeem.button")}
        code={code}
        setCode={setCode}
        msg={redeemMsg}
        pending={redeemMutation.isPending}
        onSubmit={(c) => {
          setRedeemMsg(null);
          redeemMutation.mutate(c);
        }}
        testIdPrefix="english"
      />
    </section>
  );
}

// ───────────────────────── Shared redeem form ─────────────────────────

function RedeemForm({
  title,
  button,
  code,
  setCode,
  msg,
  pending,
  onSubmit,
  testIdPrefix,
}: {
  title: string;
  button: string;
  code: string;
  setCode: (s: string) => void;
  msg: { kind: "ok" | "err"; text: string } | null;
  pending: boolean;
  onSubmit: (code: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-800">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
        <KeyRound size={16} />
        {title}
      </h3>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (code.trim()) onSubmit(code.trim());
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={code}
          onChange={(ev) => setCode(ev.target.value.toUpperCase())}
          placeholder="ABCD-EFGH-JKLM"
          data-testid={`input-redeem-${testIdPrefix}`}
          className="flex-1 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          data-testid={`button-redeem-${testIdPrefix}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {button}
        </button>
      </form>
      {msg && (
        <p
          className={`mt-2 text-sm ${
            msg.kind === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
          data-testid={`text-redeem-${testIdPrefix}-msg`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
