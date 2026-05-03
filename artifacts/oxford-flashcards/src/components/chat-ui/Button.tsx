import type { ReactNode } from "react";
import { chatUI } from "./tokens";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[11px]",
  md: "px-4 py-2 text-[12px]",
  lg: "px-4 py-3 text-[13px]",
};

export function PrimaryButton({
  children,
  icon,
  size = "md",
  className = "",
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  size?: Size;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold text-white ring-1 ring-white/15 hover:brightness-110 transition ${SIZE[size]} ${className}`}
      style={{
        background: chatUI.gradient.purpleSimple,
        boxShadow: chatUI.shadow.purpleBtn,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  icon,
  size = "md",
  className = "",
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  size?: Size;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold text-slate-100 bg-white/5 ring-1 ring-white/15 hover:bg-white/10 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${SIZE[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
