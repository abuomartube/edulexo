import type { ReactNode } from "react";

export function HeroCard({
  icon,
  title,
  subtitle,
  badges,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 ring-1 ring-white/15"
      style={{
        background:
          "linear-gradient(135deg, #6366f1 0%, #7c3aed 45%, #a855f7 100%)",
        boxShadow:
          "0 18px 40px -12px rgba(124,58,237,0.7), 0 0 60px -10px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-blue-300/25 blur-2xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, #fff 1px, transparent 1.5px), radial-gradient(circle at 70% 30%, #fff 1px, transparent 1.5px)",
          backgroundSize: "30px 30px, 22px 22px",
        }}
      />

      <div className="relative flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-extrabold text-white truncate leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-white/80 mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {badges && (
        <div className="relative flex items-center gap-2 mt-3 flex-wrap">
          {badges}
        </div>
      )}
    </div>
  );
}
