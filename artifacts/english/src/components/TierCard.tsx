import { Link } from "wouter";
import { useT } from "@/lib/i18n";
import { Lock, Sparkles, ArrowRight, Info } from "lucide-react";
import type { EnglishTier } from "@/lib/api";

const TIER_META = {
  beginner: {
    title: "tier_beginner",
    desc: "tier_beginner_desc",
    letter: "A1",
    iconGradient: "from-emerald-400 to-teal-500",
    glow: "rgba(16,185,129,0.45)",
    detailsPath: "/package/a1-b1",
  },
  intermediate: {
    title: "tier_intermediate",
    desc: "tier_intermediate_desc",
    letter: "B1+",
    iconGradient: "from-cyan-400 to-blue-500",
    glow: "rgba(56,189,248,0.45)",
    detailsPath: "/package/b1-c1",
  },
  advanced: {
    title: "tier_advanced",
    desc: "tier_advanced_desc",
    letter: "★",
    iconGradient: "from-fuchsia-500 to-purple-600",
    glow: "rgba(168,85,247,0.5)",
    detailsPath: "/package/full",
  },
} as const satisfies Record<EnglishTier, Record<string, string>>;

export function TierCard({
  tier,
  unlocked,
  current,
  onOpen,
}: {
  tier: EnglishTier;
  unlocked: boolean;
  current: boolean;
  onOpen?: () => void;
}) {
  const t = useT();
  const meta = TIER_META[tier];

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl bg-white/[0.05] backdrop-blur-2xl ring-1 transition-all ${
        current
          ? "ring-purple-400/60 shadow-[0_30px_70px_-25px_rgba(168,85,247,0.6)]"
          : "ring-white/10 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.7)]"
      } hover:ring-white/20 hover:-translate-y-0.5`}
      data-testid={`card-tier-${tier}`}
    >
      <div
        className="pointer-events-none absolute -top-12 -end-12 w-44 h-44 rounded-full opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${meta.glow}, transparent 70%)`,
        }}
      />

      <div className="relative p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.iconGradient} text-white font-extrabold text-sm shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/20`}
            aria-hidden
          >
            {meta.letter}
          </div>
          {unlocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-400/15 ring-1 ring-emerald-400/30 text-emerald-200">
              <Sparkles className="h-3 w-3" />
              {t("dash_unlocked")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/[0.06] ring-1 ring-white/15 text-slate-300">
              <Lock className="h-3 w-3" />
              {t("dash_locked")}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h3
            className="text-xl font-bold text-white tracking-tight"
            data-testid={`text-tier-title-${tier}`}
          >
            {t(meta.title)}
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t(meta.desc)}
          </p>
        </div>

        {unlocked ? (
          <button
            type="button"
            onClick={onOpen}
            data-testid={`button-open-${tier}`}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white font-semibold shadow-[0_10px_28px_-10px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.18)] active:scale-95 transition"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)",
            }}
          >
            {t("dash_explore")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            data-testid={`button-open-${tier}`}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-slate-400 font-semibold cursor-not-allowed"
          >
            <Lock className="h-3.5 w-3.5" />
            {t("dash_locked")}
          </button>
        )}

        <Link
          href={meta.detailsPath}
          className="w-full inline-flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-purple-300 transition pt-1"
          data-testid={`link-details-${tier}`}
        >
          <Info className="h-3.5 w-3.5" />
          {t("pkg_view_details")}
        </Link>
      </div>
    </div>
  );
}
