import { Heart, Check } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { NAME_COLOR, chatUI, type AvatarTone } from "./tokens";

type CommonProps = {
  children: ReactNode;
  reactions?: number;
};

export function IncomingBubble({
  name,
  tone,
  letter,
  time,
  children,
  reactions,
}: CommonProps & {
  name: string;
  tone: AvatarTone;
  letter: string;
  time: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <Avatar letter={letter} tone={tone} size={26} />
      <div className="max-w-[78%] relative">
        <div className="flex items-baseline gap-2 mb-0.5 ml-1">
          <span className={`${chatUI.text.name} ${NAME_COLOR[tone]}`}>{name}</span>
          <span className={chatUI.text.time}>{time}</span>
        </div>
        <div
          className={`${chatUI.radius.bubble} rounded-bl-md ${chatUI.surface.bubbleIncoming} ${chatUI.spacing.bubblePadX} ${chatUI.spacing.bubblePadY} ${chatUI.text.body}`}
        >
          {children}
        </div>
        {reactions !== undefined && (
          <span className="absolute -bottom-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-900 ring-1 ring-rose-500/40 text-rose-400 text-[9px] font-bold shadow">
            <Heart size={9} fill="currentColor" /> {reactions}
          </span>
        )}
      </div>
    </div>
  );
}

export function OutgoingBubble({
  time,
  delivered = true,
  className = "",
  children,
}: CommonProps & {
  time: string;
  delivered?: boolean;
  className?: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%]">
        <div className="flex items-center gap-1.5 mb-0.5 mr-1 justify-end">
          <span className={chatUI.text.time}>{time}</span>
          {delivered && (
            <span className="text-blue-400 inline-flex">
              <Check size={10} strokeWidth={3} />
              <Check size={10} strokeWidth={3} className="-ml-1.5" />
            </span>
          )}
          <span className={`${chatUI.text.name} text-purple-300`}>You</span>
        </div>
        <div
          className={`${chatUI.radius.bubble} rounded-br-md px-3 py-2 ring-1 ring-white/10 ${className}`}
          style={{
            background: chatUI.gradient.purple,
            boxShadow: chatUI.shadow.purpleGlow,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function SystemBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center">
      <div
        className="rounded-full px-3.5 py-1.5 ring-1 ring-amber-400/30 shadow-md inline-flex items-center gap-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.10))",
        }}
      >
        <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wide">
          System
        </span>
        <span className="text-[11px] text-amber-100">{children}</span>
      </div>
    </div>
  );
}
