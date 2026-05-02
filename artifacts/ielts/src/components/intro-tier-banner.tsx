import { Lock } from "lucide-react";
import {
  getRestrictedMessage,
  getTier,
  isRestricted,
  tierLabel,
  tierLabelAr,
} from "@/lib/tier";

/**
 * Small banner shown above any module that gates content by CEFR level.
 * Renders nothing for the unrestricted "complete" tier.
 *
 * The component name is historical — it now adapts to BOTH intro and advance
 * tiers and shows the correct bilingual restriction copy for each.
 *
 * Usage: drop <IntroTierBanner /> at the top of a page that has a level
 * picker — it tells the student why the locked levels are disabled.
 */
export function IntroTierBanner({ className = "" }: { className?: string }) {
  const tier = getTier();
  if (!isRestricted(tier)) return null;

  const msg = getRestrictedMessage(tier);
  const allowedSummary =
    tier === "intro"
      ? { ar: "مستويا A2 و B1 متاحان فقط لهذه الباقة.", en: "A2 and B1 levels are unlocked on Intro." }
      : { ar: "المستويات B1 و B2 و C1 متاحة لهذه الباقة.", en: "B1, B2 and C1 levels are unlocked on Advance." };
  const tierTitle = tier === "intro" ? "Intro tier" : "Advance tier";

  return (
    <div
      className={
        "flex items-start gap-3 rounded-2xl border border-sky-300/60 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-700/50 px-4 py-3 " +
        className
      }
    >
      <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
          {tierTitle} · {tierLabel(tier)} · {tierLabelAr(tier)}
        </p>
        <p className="text-xs text-sky-800/90 dark:text-sky-200/90" dir="rtl" lang="ar">
          {msg.ar} — {allowedSummary.ar}
        </p>
        <p className="text-xs text-sky-800/80 dark:text-sky-200/80">
          {msg.en} {allowedSummary.en}
        </p>
      </div>
    </div>
  );
}
