import {
  ChevronLeft,
  MoreVertical,
  Mic,
  Hand,
  Heart,
  Play,
  FileText,
  Download,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Image as ImageIcon,
  Smile,
  Paperclip,
  Send,
  Check,
} from "lucide-react";

function Avatar({
  letter,
  from,
  to,
  size = 36,
  ring = false,
}: {
  letter: string;
  from: string;
  to: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${from} ${to} text-white font-bold flex items-center justify-center shadow-lg ${
        ring ? "ring-2 ring-slate-950" : ""
      }`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {letter}
    </div>
  );
}

function Waveform({
  count = 32,
  played = 0.55,
  baseColor = "bg-white/35",
  playedColor = "bg-white",
  height = 28,
}: {
  count?: number;
  played?: number;
  baseColor?: string;
  playedColor?: string;
  height?: number;
}) {
  const heights = Array.from({ length: count }).map((_, i) => {
    const v = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 1.9) * 0.3 + 0.6;
    return Math.max(0.2, Math.min(1, v));
  });
  const playedCount = Math.floor(count * played);
  return (
    <div className="flex items-center gap-[3px]" style={{ height }}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[2.5px] rounded-full ${
            i < playedCount ? playedColor : baseColor
          }`}
          style={{ height: `${Math.round(h * 100)}%` }}
        />
      ))}
    </div>
  );
}

function ActionPill({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "purple" | "blue" | "green" | "orange";
}) {
  const tones: Record<typeof tone, string> = {
    purple:
      "bg-gradient-to-br from-purple-500/25 to-purple-600/15 text-purple-200 ring-purple-500/30",
    blue: "bg-gradient-to-br from-blue-500/25 to-blue-600/15 text-blue-200 ring-blue-500/30",
    green:
      "bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 text-emerald-200 ring-emerald-500/30",
    orange:
      "bg-gradient-to-br from-orange-500/25 to-rose-500/15 text-orange-200 ring-orange-500/30",
  };
  return (
    <div
      className={`flex-1 rounded-xl ${tones[tone]} ring-1 backdrop-blur flex flex-col items-center justify-center py-1.5 gap-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}
    >
      <div className="opacity-90">{icon}</div>
      <span className="text-[10px] font-semibold tracking-tight">{label}</span>
    </div>
  );
}

export default function ChatScreenMockup() {
  return (
    <div
      dir="ltr"
      className="min-h-screen w-full flex items-center justify-center p-8 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1a1444 0%, #0a1126 30%, #050816 60%, #02030a 100%)",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-700/25 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-blue-700/25 blur-[140px]" />
      </div>

      {/* ── PHONE FRAME ─────────────────────────── */}
      <div
        className="relative w-[390px] h-[844px] rounded-[44px] p-[6px]"
        style={{
          background:
            "linear-gradient(180deg, #1f2937 0%, #0f172a 50%, #020617 100%)",
          boxShadow:
            "0 60px 120px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px -20px rgba(124,58,237,0.45)",
        }}
      >
        <div
          className="relative w-full h-full rounded-[38px] overflow-hidden flex flex-col text-white"
          style={{
            background:
              "linear-gradient(180deg, #0b1224 0%, #060b1a 50%, #02050d 100%)",
          }}
        >
          {/* notch */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-7 rounded-full bg-black z-30" />
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 translate-x-8 w-2 h-2 rounded-full bg-slate-800 z-40" />

          {/* status bar */}
          <div className="relative z-10 flex items-center justify-between px-7 pt-3 pb-1 text-[12px] font-semibold text-white/90">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="flex items-end gap-[2px]">
                <span className="w-[3px] h-[5px] bg-white rounded-sm" />
                <span className="w-[3px] h-[7px] bg-white rounded-sm" />
                <span className="w-[3px] h-[9px] bg-white rounded-sm" />
                <span className="w-[3px] h-[11px] bg-white rounded-sm" />
              </span>
              <span className="ml-1 text-[10px]">5G</span>
              <span className="ml-1 inline-flex items-center">
                <span className="w-5 h-2.5 rounded-[3px] border border-white/80 relative">
                  <span className="absolute inset-0.5 rounded-sm bg-white" />
                </span>
                <span className="w-0.5 h-1 bg-white/80 rounded-r-sm" />
              </span>
            </span>
          </div>

          {/* ── HEADER ─────────────────────────── */}
          <header className="relative z-10 px-4 pt-2 pb-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
                <ChevronLeft size={18} className="text-slate-300" />
              </button>
              <div className="flex-1 min-w-0 text-center">
                <h1 className="text-[15px] font-bold text-white leading-tight">
                  Speaking Room - Intermediate
                </h1>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    18 online
                  </span>
                  <div className="flex -space-x-1.5">
                    <Avatar letter="O" from="from-blue-500" to="to-indigo-600" size={18} ring />
                    <Avatar letter="S" from="from-pink-500" to="to-rose-600" size={18} ring />
                    <Avatar letter="J" from="from-emerald-500" to="to-teal-600" size={18} ring />
                  </div>
                </div>
              </div>
              <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
                <MoreVertical size={16} className="text-slate-300" />
              </button>
            </div>

            {/* controls row */}
            <div className="flex items-center justify-between gap-2 mt-2">
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
            </div>
          </header>

          {/* ── MESSAGES ─────────────────────────── */}
          <div
            className="relative z-10 flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-2.5"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(124,58,237,0.06), transparent 60%)",
            }}
          >
            {/* Omar */}
            <div className="flex items-end gap-2">
              <Avatar letter="O" from="from-blue-500" to="to-indigo-600" size={26} />
              <div className="max-w-[78%] relative">
                <div className="flex items-baseline gap-2 mb-0.5 ml-1">
                  <span className="text-[11px] font-bold text-blue-300">Omar</span>
                  <span className="text-[9px] text-slate-500">10:20 AM</span>
                </div>
                <div className="rounded-2xl rounded-bl-md bg-slate-800/80 backdrop-blur border border-white/5 px-3.5 py-2 text-[13px] leading-snug shadow-lg">
                  Hi everyone! 👋 How was your weekend?
                </div>
                <span className="absolute -bottom-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-900 ring-1 ring-rose-500/40 text-rose-400 text-[9px] font-bold shadow">
                  <Heart size={9} fill="currentColor" /> 2
                </span>
              </div>
            </div>

            {/* Sara */}
            <div className="flex items-end gap-2">
              <Avatar letter="S" from="from-pink-500" to="to-rose-600" size={26} />
              <div className="max-w-[78%] relative">
                <div className="flex items-baseline gap-2 mb-0.5 ml-1">
                  <span className="text-[11px] font-bold text-pink-300">Sara</span>
                  <span className="text-[9px] text-slate-500">10:21 AM</span>
                </div>
                <div className="rounded-2xl rounded-bl-md bg-slate-800/80 backdrop-blur border border-white/5 px-3.5 py-2 text-[13px] leading-snug shadow-lg">
                  It was great! I went hiking with my friends 😊
                </div>
                <span className="absolute -bottom-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-900 ring-1 ring-rose-500/40 text-rose-400 text-[9px] font-bold shadow">
                  <Heart size={9} fill="currentColor" /> 1
                </span>
              </div>
            </div>

            {/* You — voice */}
            <div className="flex justify-end">
              <div className="max-w-[78%]">
                <div className="flex items-center gap-1.5 mb-0.5 mr-1 justify-end">
                  <span className="text-[9px] text-slate-500">10:22 AM</span>
                  <span className="text-blue-400 inline-flex">
                    <Check size={10} strokeWidth={3} />
                    <Check size={10} strokeWidth={3} className="-ml-1.5" />
                  </span>
                  <span className="text-[11px] font-bold text-purple-300">You</span>
                </div>
                <div
                  className="rounded-2xl rounded-br-md px-3 py-2 flex items-center gap-2.5 shadow-[0_10px_30px_-8px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-white/10"
                  style={{
                    background:
                      "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #4f46e5 100%)",
                  }}
                >
                  <button className="w-7 h-7 rounded-full bg-white/25 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/30">
                    <Play size={12} className="text-white ml-0.5" />
                  </button>
                  <Waveform count={22} played={0.5} height={20} />
                  <span className="text-[10px] font-mono text-white font-semibold">
                    0:18
                  </span>
                </div>
              </div>
            </div>

            {/* James — file */}
            <div className="flex items-end gap-2">
              <Avatar letter="J" from="from-emerald-500" to="to-teal-600" size={28} />
              <div className="max-w-[78%]">
                <div className="flex items-baseline gap-2 mb-0.5 ml-1">
                  <span className="text-[11px] font-bold text-emerald-300">James</span>
                  <span className="text-[9px] text-slate-500">10:23 AM</span>
                </div>
                <div className="rounded-2xl rounded-bl-md bg-slate-800/80 backdrop-blur border border-white/5 px-2.5 py-2 flex items-center gap-2.5 shadow-lg">
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
              </div>
            </div>

            {/* Lina — image */}
            <div className="flex items-end gap-2">
              <Avatar letter="L" from="from-amber-500" to="to-orange-600" size={26} />
              <div className="max-w-[78%] relative">
                <div className="flex items-baseline gap-2 mb-0.5 ml-1">
                  <span className="text-[11px] font-bold text-amber-300">Lina</span>
                  <span className="text-[9px] text-slate-500">10:28 AM</span>
                </div>
                <div className="rounded-2xl rounded-bl-md bg-slate-800/80 backdrop-blur border border-white/5 overflow-hidden shadow-lg">
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
                <span className="absolute -bottom-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-900 ring-1 ring-rose-500/40 text-rose-400 text-[9px] font-bold shadow">
                  <Heart size={9} fill="currentColor" /> 3
                </span>
              </div>
            </div>

            {/* System */}
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
                <span className="text-[11px] text-amber-100">
                  Please try to use English only 😊
                </span>
              </div>
            </div>
          </div>

          {/* ── ACTION BAR ─────────────────────────── */}
          <div className="relative z-10 px-4 pt-2 pb-1 border-t border-white/5 bg-slate-950/40 backdrop-blur">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ActionPill icon={<Sparkles size={14} />} label="Topic" tone="purple" />
              <ActionPill icon={<Lightbulb size={14} />} label="Ice Breaker" tone="blue" />
              <ActionPill icon={<RefreshCw size={14} />} label="Rotate" tone="green" />
              <ActionPill icon={<ImageIcon size={14} />} label="Image Talk" tone="orange" />
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 rounded-full bg-slate-900/80 ring-1 ring-white/10 backdrop-blur px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <button className="text-slate-400 hover:text-slate-200">
                <Smile size={18} />
              </button>
              <input
                readOnly
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-[13px] text-slate-200 placeholder:text-slate-500 outline-none"
              />
              <button className="text-slate-400 hover:text-slate-200">
                <Paperclip size={16} />
              </button>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-[0_6px_16px_-3px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/15"
                style={{
                  background:
                    "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                }}
              >
                <Send size={13} className="text-white -ml-0.5" />
              </button>
            </div>

            {/* Floating mic row */}
            <div className="flex items-center justify-center gap-2 mt-1.5 mb-0.5">
              <Waveform
                count={10}
                played={0}
                baseColor="bg-purple-400/40"
                playedColor="bg-purple-400/40"
                height={10}
              />
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
              <Waveform
                count={10}
                played={0}
                baseColor="bg-purple-400/40"
                playedColor="bg-purple-400/40"
                height={10}
              />
            </div>

            {/* home indicator */}
            <div className="flex justify-center pt-0.5 pb-1">
              <div className="w-28 h-1 rounded-full bg-white/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
