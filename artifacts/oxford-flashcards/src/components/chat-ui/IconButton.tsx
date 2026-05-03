import type { ReactNode } from "react";
import { chatUI } from "./tokens";

export type IconButtonTone = "neutral" | "accent" | "warning" | "danger";

const TONE: Record<
  IconButtonTone,
  { btn: string; label: string; style?: React.CSSProperties }
> = {
  neutral: {
    btn: "bg-white/8 ring-white/15 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
    label: "text-slate-300",
  },
  accent: {
    btn: "ring-white/20 text-white",
    label: "text-purple-200",
    style: {
      background: chatUI.gradient.purpleSimple,
      boxShadow: chatUI.shadow.purpleBtn,
    },
  },
  warning: {
    btn: "bg-amber-500/15 ring-amber-400/30 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
    label: "text-amber-200",
  },
  danger: {
    btn: "bg-rose-500/15 ring-rose-400/40 text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
    label: "text-rose-200",
  },
};

export function IconButton({
  icon,
  label,
  tone = "neutral",
  size = 52,
  badge,
  onClick,
}: {
  icon: ReactNode;
  label?: string;
  tone?: IconButtonTone;
  size?: number;
  badge?: ReactNode;
  onClick?: () => void;
}) {
  const t = TONE[tone];
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className="relative">
        {badge && (
          <span className="absolute -top-1 -right-1 z-10 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-900 text-[9px] font-extrabold flex items-center justify-center ring-2 ring-slate-950">
            {badge}
          </span>
        )}
        <div
          className={`rounded-full ring-1 backdrop-blur flex items-center justify-center group-hover:brightness-110 transition ${t.btn}`}
          style={{ width: size, height: size, ...t.style }}
        >
          {icon}
        </div>
      </div>
      {label && (
        <span className={`text-[10.5px] font-semibold ${t.label}`}>{label}</span>
      )}
    </button>
  );
}
