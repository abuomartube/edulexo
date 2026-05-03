import type { ReactNode } from "react";
import { chatUI, type AvatarTone } from "./tokens";

const TONE_GRAD: Record<AvatarTone, string> = {
  blue: "from-blue-400 via-blue-500 to-indigo-600",
  purple: "from-fuchsia-500 via-purple-500 to-indigo-600",
  emerald: "from-emerald-400 via-emerald-500 to-teal-600",
  pink: "from-pink-500 via-rose-500 to-rose-600",
  rose: "from-rose-500 via-red-500 to-orange-600",
  indigo: "from-sky-400 via-blue-500 to-indigo-600",
  amber: "from-amber-400 via-orange-500 to-rose-500",
};

const TONE_GLOW: Record<AvatarTone, string> = {
  blue: "rgba(59,130,246,0.55)",
  purple: "rgba(168,85,247,0.55)",
  emerald: "rgba(16,185,129,0.55)",
  pink: "rgba(244,63,94,0.55)",
  rose: "rgba(249,115,22,0.55)",
  indigo: "rgba(99,102,241,0.55)",
  amber: "rgba(251,146,60,0.55)",
};

export function RoomCard({
  icon,
  tone,
  title,
  desc,
  online,
  joinLabel = "Join",
  onJoin,
}: {
  icon: ReactNode;
  tone: AvatarTone;
  title: string;
  desc: string;
  online: number;
  joinLabel?: string;
  onJoin?: () => void;
}) {
  return (
    <div
      className={`${chatUI.radius.card} ${chatUI.surface.card} ${chatUI.spacing.cardPad} flex items-center gap-3`}
    >
      <div className="relative shrink-0">
        <div
          className="absolute inset-0 -m-1 rounded-2xl blur-md opacity-70"
          style={{ background: TONE_GLOW[tone] }}
        />
        <div
          className={`relative w-10 h-10 ${chatUI.radius.icon} bg-gradient-to-br ${TONE_GRAD[tone]} flex items-center justify-center ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]`}
        >
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-bold text-white truncate leading-tight">
          {title}
        </div>
        <div className="text-[10.5px] text-slate-400 truncate mt-0.5 leading-tight">
          {desc}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-400 font-semibold">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          {online} online
        </div>
      </div>
      <button
        onClick={onJoin}
        className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white ring-1 ring-white/15"
        style={{
          background: chatUI.gradient.purpleSimple,
          boxShadow: chatUI.shadow.purpleBtn,
        }}
      >
        {joinLabel}
      </button>
    </div>
  );
}
