import { Lock } from "lucide-react";
import { isIntro, restrictedMessage, tierLabelAr } from "@/lib/tier";

/**
 * Small banner shown above any module that gates content by CEFR level.
 * Renders nothing for non-intro tiers.
 *
 * Usage: drop <IntroTierBanner /> at the top of a page that has a level
 * picker — it tells intro students why B2 / C1 options are locked.
 */
export function IntroTierBanner({ className = "" }: { className?: string }) {
  if (!isIntro()) return null;

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
          Intro tier · {tierLabelAr("intro")}
        </p>
        <p className="text-xs text-sky-800/90 dark:text-sky-200/90" dir="rtl" lang="ar">
          {restrictedMessage.ar} — مستويا A2 و B1 متاحان فقط لهذه الباقة.
        </p>
        <p className="text-xs text-sky-800/80 dark:text-sky-200/80">
          {restrictedMessage.en} A2 and B1 levels are unlocked on Intro.
        </p>
      </div>
    </div>
  );
}
