import {
  Mic,
  Hand,
  FileText,
  Download,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import {
  Avatar,
  Header,
  IncomingBubble,
  OutgoingBubble,
  SystemBubble,
  VoiceMessage,
  ActionButton,
  InputBar,
  PhoneFrame,
  PageBackdrop,
} from "@/components/chat-ui";

export default function ChatScreenMockup() {
  return (
    <PageBackdrop>
      <PhoneFrame dir="ltr">
        <Header
          title="Speaking Room - Intermediate"
          subtitle={
            <>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                18 online
              </span>
              <div className="flex -space-x-1.5">
                <Avatar letter="O" tone="blue" size={18} ring />
                <Avatar letter="S" tone="pink" size={18} ring />
                <Avatar letter="J" tone="emerald" size={18} ring />
              </div>
            </>
          }
          controls={
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                EN English Only
              </span>
              <div className="relative">
                <div className="absolute inset-0 -m-1 rounded-full bg-blue-500/40 blur-md" />
                <button className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_6px_20px_-2px_rgba(59,130,246,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] ring-2 ring-white/15">
                  <Mic size={16} className="text-white" />
                </button>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-300 text-[11px] font-bold">
                <Hand size={12} />
                رفع اليد
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[9px] font-extrabold flex items-center justify-center">
                  3
                </span>
              </button>
            </>
          }
        />

        {/* MESSAGES */}
        <div
          className="relative z-10 flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-2.5"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(124,58,237,0.06), transparent 60%)",
          }}
        >
          <IncomingBubble
            name="Omar"
            tone="blue"
            letter="O"
            time="10:20 AM"
            reactions={2}
          >
            Hi everyone! 👋 How was your weekend?
          </IncomingBubble>

          <IncomingBubble
            name="Sara"
            tone="pink"
            letter="S"
            time="10:21 AM"
            reactions={1}
          >
            It was great! I went hiking with my friends 😊
          </IncomingBubble>

          <OutgoingBubble time="10:22 AM">
            <VoiceMessage duration="0:18" played={0.5} bars={22} />
          </OutgoingBubble>

          <IncomingBubble name="James" tone="emerald" letter="J" time="10:23 AM">
            <div className="flex items-center gap-2.5 -my-0.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/30 to-rose-600/20 ring-1 ring-red-500/30 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-white truncate">
                  Useful Phrases.pdf
                </div>
                <div className="text-[10px] text-slate-400">1.2 MB</div>
              </div>
              <button className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0">
                <Download size={12} className="text-slate-300" />
              </button>
            </div>
          </IncomingBubble>

          <IncomingBubble
            name="Lina"
            tone="amber"
            letter="L"
            time="10:28 AM"
            reactions={3}
          >
            <div className="-mx-3.5 -my-2 overflow-hidden rounded-bl-md rounded-2xl">
              <div className="relative h-16 bg-gradient-to-br from-amber-700 via-orange-700 to-rose-800 overflow-hidden">
                <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[radial-gradient(circle_at_30%_60%,#fff_1.5px,transparent_1.5px),radial-gradient(circle_at_70%_30%,#fff_1.5px,transparent_1.5px),radial-gradient(circle_at_50%_80%,#fff_1px,transparent_1px)] bg-[length:18px_18px,22px_22px,12px_12px]" />
                <div className="absolute bottom-1 left-2 text-[9px] text-white/80 font-semibold drop-shadow">
                  café · library
                </div>
              </div>
              <div className="px-3 py-1.5 text-[12px] text-white">
                Let's talk about this picture! ☕
              </div>
            </div>
          </IncomingBubble>

          <SystemBubble>Please try to use English only 😊</SystemBubble>
        </div>

        {/* ACTION BAR */}
        <div className="relative z-10 px-4 pt-2 pb-1 border-t border-white/5 bg-slate-950/40 backdrop-blur">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ActionButton icon={<Sparkles size={14} />} label="Topic" tone="purple" />
            <ActionButton icon={<Lightbulb size={14} />} label="Ice Breaker" tone="blue" />
            <ActionButton icon={<RefreshCw size={14} />} label="Rotate" tone="green" />
            <ActionButton icon={<ImageIcon size={14} />} label="Image Talk" tone="orange" />
          </div>

          <InputBar />

          {/* Floating mic row */}
          <div className="flex items-center justify-center gap-2 mt-1.5 mb-0.5">
            <Waves />
            <div className="relative">
              <div className="absolute inset-0 -m-1.5 rounded-full bg-purple-500/40 blur-lg animate-pulse" />
              <button
                className="relative w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white/20"
                style={{
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #818cf8 35%, #a855f7 100%)",
                  boxShadow:
                    "0 6px 18px -3px rgba(99,102,241,0.7), 0 0 28px -6px rgba(168,85,247,0.65), inset 0 1px 0 rgba(255,255,255,0.4)",
                }}
              >
                <Mic size={15} className="text-white drop-shadow" />
              </button>
            </div>
            <Waves />
          </div>

          <div className="flex justify-center pt-0.5 pb-1">
            <div className="w-28 h-1 rounded-full bg-white/40" />
          </div>
        </div>
      </PhoneFrame>
    </PageBackdrop>
  );
}

function Waves() {
  const heights = Array.from({ length: 10 }).map((_, i) => {
    const v = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 1.9) * 0.3 + 0.6;
    return Math.max(0.2, Math.min(1, v));
  });
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 10 }}>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-purple-400/40"
          style={{ height: `${Math.round(h * 100)}%` }}
        />
      ))}
    </div>
  );
}
