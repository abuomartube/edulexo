import { useState } from "react";
import { useT, useLanguage } from "@/lib/i18n";
import { TierCard } from "@/components/TierCard";
import { Loader2, KeyRound, Sparkles, GraduationCap } from "lucide-react";
import {
  ENGLISH_TIERS,
  bestTier,
  isTierUnlocked,
  redeemEnglishCode,
  type EnglishEnrollment,
  type PublicUser,
} from "@/lib/api";

export default function Dashboard({
  user,
  enrollments,
  onChanged,
}: {
  user: PublicUser;
  enrollments: EnglishEnrollment[];
  onChanged: () => void;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const top = bestTier(enrollments);
  const tierLabel = top
    ? t(
        top === "beginner"
          ? "tier_beginner"
          : top === "intermediate"
            ? "tier_intermediate"
            : "tier_advanced",
      )
    : null;

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setMsg(null);
    const res = await redeemEnglishCode(code.trim());
    setSubmitting(false);
    if (res.ok) {
      setCode("");
      setMsg({ kind: "ok", text: t("redeemSuccess") });
      onChanged();
    } else {
      setMsg({ kind: "err", text: res.error || t("error") });
    }
  }

  return (
    <div
      className="dark min-h-screen text-slate-100 relative -mx-4 -my-10 px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(124,58,237,0.18), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl space-y-8">
        {/* Hero */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 text-[11px] font-bold uppercase tracking-wider text-purple-200">
            <GraduationCap className="h-3.5 w-3.5" />
            {t("brand")}
          </div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(168,85,247,0.45)]"
            data-testid="text-welcome"
          >
            {t("dash_welcome")}, {user.name || user.email}
          </h1>
          {tierLabel ? (
            <p className="text-slate-300">
              {t("dash_currentTier")}:{" "}
              <span className="font-semibold text-purple-200">{tierLabel}</span>
            </p>
          ) : (
            <p className="text-slate-400">{t("dash_noEnrollment")}</p>
          )}
        </div>

        {/* Redeem card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)_inset]">
          <div
            className="pointer-events-none absolute -top-16 -end-16 w-56 h-56 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(168,85,247,0.5), transparent 70%)",
            }}
          />
          <div className="relative p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(124,58,237,0.6)] ring-1 ring-white/20">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {t("nav_redeem")}
                </h2>
                <p className="text-xs text-slate-400">
                  {t("dash_redeemPrompt")}
                </p>
              </div>
            </div>
            <form
              onSubmit={onRedeem}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("dash_redeemPlaceholder")}
                dir="ltr"
                className={`flex-1 h-11 px-4 rounded-xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:bg-white/[0.07] transition tabular-nums ${
                  lang === "ar" ? "text-right" : "text-left"
                }`}
                data-testid="input-code"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !code.trim()}
                data-testid="button-redeem"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-white font-semibold shadow-[0_10px_28px_-10px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.18)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
                style={{
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)",
                }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Sparkles className="h-4 w-4" />
                {t("dash_redeemBtn")}
              </button>
            </form>
            {msg && (
              <div
                className={`mt-4 px-4 py-3 rounded-xl text-sm backdrop-blur-xl ring-1 ${
                  msg.kind === "ok"
                    ? "bg-emerald-400/10 ring-emerald-400/30 text-emerald-200"
                    : "bg-rose-500/10 ring-rose-500/30 text-rose-200"
                }`}
                data-testid={`alert-${msg.kind}`}
              >
                {msg.text}
              </div>
            )}
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {ENGLISH_TIERS.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              unlocked={isTierUnlocked(enrollments, tier)}
              current={top === tier}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
