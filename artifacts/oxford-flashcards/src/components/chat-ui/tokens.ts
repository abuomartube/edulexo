export const chatUI = {
  radius: {
    bubble: "rounded-2xl",
    pill: "rounded-full",
    icon: "rounded-2xl",
    card: "rounded-2xl",
    input: "rounded-full",
  },
  spacing: {
    bubblePadX: "px-3.5",
    bubblePadY: "py-2",
    cardPad: "p-2.5",
    sectionGap: "space-y-2.5",
    rowGap: "gap-2",
  },
  text: {
    body: "text-[13px] leading-snug",
    name: "text-[11px] font-bold",
    time: "text-[9px] text-slate-500",
    label: "text-[10px] font-semibold",
  },
  surface: {
    bubbleIncoming:
      "bg-slate-800/80 backdrop-blur border border-white/5 shadow-lg",
    card:
      "bg-slate-800/70 backdrop-blur border border-white/5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]",
    glass:
      "bg-slate-900/80 ring-1 ring-white/10 backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  },
  gradient: {
    purple: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #4f46e5 100%)",
    purpleSimple: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
    blueMic: "linear-gradient(135deg, #60a5fa 0%, #818cf8 35%, #a855f7 100%)",
  },
  shadow: {
    purpleGlow:
      "0 10px 30px -8px rgba(124,58,237,0.7), inset 0 1px 0 rgba(255,255,255,0.2)",
    purpleBtn:
      "0 6px 16px -3px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
    blueMic:
      "0 8px 24px -4px rgba(99,102,241,0.7), 0 0 36px -6px rgba(168,85,247,0.65), inset 0 2px 0 rgba(255,255,255,0.4)",
  },
  nameColor: {
    blue: "text-blue-300",
    pink: "text-pink-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    purple: "text-purple-300",
    rose: "text-rose-300",
  },
} as const;

export type AvatarTone =
  | "blue"
  | "pink"
  | "emerald"
  | "amber"
  | "purple"
  | "rose"
  | "indigo";

export const AVATAR_GRAD: Record<AvatarTone, string> = {
  blue: "from-blue-500 to-indigo-600",
  pink: "from-pink-500 to-rose-600",
  emerald: "from-emerald-500 to-teal-600",
  amber: "from-amber-500 to-orange-600",
  purple: "from-fuchsia-500 to-purple-600",
  rose: "from-rose-500 to-red-600",
  indigo: "from-sky-400 to-indigo-600",
};

export const NAME_COLOR: Record<AvatarTone, string> = {
  blue: "text-blue-300",
  pink: "text-pink-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  purple: "text-purple-300",
  rose: "text-rose-300",
  indigo: "text-indigo-300",
};
