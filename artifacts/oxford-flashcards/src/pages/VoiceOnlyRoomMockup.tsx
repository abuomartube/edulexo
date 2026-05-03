import {
  Mic,
  Hand,
  MessageSquare,
  PhoneOff,
  Users,
  Headphones,
} from "lucide-react";
import {
  Header,
  Avatar,
  IconButton,
  chatUI,
  type AvatarTone,
} from "@/components/chat-ui";

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
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
        dir="rtl"
        className="relative w-full h-full rounded-[38px] overflow-hidden flex flex-col text-white"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 38%, #1e1a4d 0%, #0c0f2c 35%, #050816 65%, #02030a 100%)",
        }}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-7 rounded-full bg-black z-30" />
        <div
          dir="ltr"
          className="relative z-10 flex items-center justify-between px-7 pt-3 pb-1 text-[12px] font-semibold text-white/90"
        >
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
        {children}
      </div>
    </div>
  );
}

const SPEAKERS: { letter: string; tone: AvatarTone; name: string; speaking?: boolean }[] = [
  { letter: "O", tone: "blue", name: "Omar", speaking: true },
  { letter: "S", tone: "pink", name: "Sara" },
  { letter: "J", tone: "emerald", name: "James" },
];

const LISTENERS: { letter: string; tone: AvatarTone; name: string }[] = [
  { letter: "L", tone: "amber", name: "Lina" },
  { letter: "M", tone: "purple", name: "Maya" },
  { letter: "A", tone: "rose", name: "Ahmad" },
  { letter: "K", tone: "indigo", name: "Kenza" },
  { letter: "N", tone: "blue", name: "Nora" },
  { letter: "Y", tone: "emerald", name: "Yusuf" },
  { letter: "R", tone: "pink", name: "Rana" },
  { letter: "H", tone: "purple", name: "Hadi" },
];

function SpeakerTile({
  letter,
  tone,
  name,
  speaking,
}: {
  letter: string;
  tone: AvatarTone;
  name: string;
  speaking?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-[72px]">
      <div className="relative">
        {speaking && (
          <>
            <span className="absolute inset-0 -m-1.5 rounded-full bg-emerald-400/40 blur-md animate-pulse" />
            <span className="absolute inset-0 -m-0.5 rounded-full ring-2 ring-emerald-400 animate-pulse" />
          </>
        )}
        <Avatar letter={letter} tone={tone} size={48} />
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-900 ring-2 ring-slate-950 flex items-center justify-center">
          <Mic size={10} className="text-emerald-400" />
        </span>
      </div>
      <span className="text-[10.5px] font-semibold text-slate-200 truncate max-w-full">
        {name}
      </span>
    </div>
  );
}

function ListenerTile({
  letter,
  tone,
  name,
}: {
  letter: string;
  tone: AvatarTone;
  name: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 w-[64px]">
      <Avatar letter={letter} tone={tone} size={36} />
      <span className="text-[9.5px] text-slate-400 truncate max-w-full">
        {name}
      </span>
    </div>
  );
}

export default function VoiceOnlyRoomMockup() {
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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-700/25 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-blue-700/25 blur-[140px]" />
      </div>

      <PhoneFrame>
        <Header
          title="Voice Only Room"
          subtitle={
            <>
              <span className="flex items-center gap-1 text-[10.5px] text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                Live · 11 participants
              </span>
            </>
          }
        />

        {/* CENTER STAGE */}
        <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-4">
          {/* big glowing mic */}
          <div className="relative my-3">
            {/* outer pulse rings */}
            <span
              className="absolute inset-0 -m-12 rounded-full animate-ping"
              style={{ background: "rgba(168,85,247,0.10)" }}
            />
            <span
              className="absolute inset-0 -m-7 rounded-full animate-pulse"
              style={{ background: "rgba(124,58,237,0.18)" }}
            />
            {/* glow halo */}
            <span
              className="absolute inset-0 -m-4 rounded-full blur-2xl"
              style={{ background: "rgba(168,85,247,0.55)" }}
            />
            {/* mic button */}
            <div
              className="relative w-32 h-32 rounded-full flex items-center justify-center ring-2 ring-white/25"
              style={{
                background:
                  "linear-gradient(135deg, #60a5fa 0%, #818cf8 30%, #a855f7 65%, #7c3aed 100%)",
                boxShadow:
                  "0 24px 60px -10px rgba(124,58,237,0.85), 0 0 80px -10px rgba(99,102,241,0.7), inset 0 3px 0 rgba(255,255,255,0.4)",
              }}
            >
              <Mic size={52} className="text-white drop-shadow-lg" />
            </div>
          </div>

          {/* status under mic */}
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300 text-[10.5px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              You're connected
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 ring-1 ring-white/10 text-slate-300 text-[10.5px] font-bold">
              EN English Only
            </span>
          </div>

          {/* SPEAKERS */}
          <div className="w-full mt-5">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Mic size={11} className="text-emerald-400" />
                المتحدثون
              </h3>
              <span className="text-[10px] text-slate-400">{SPEAKERS.length}</span>
            </div>
            <div
              className={`${chatUI.radius.card} ${chatUI.surface.card} ${chatUI.spacing.cardPad}`}
            >
              <div dir="ltr" className="flex items-start justify-around">
                {SPEAKERS.map((s) => (
                  <SpeakerTile key={s.letter} {...s} />
                ))}
              </div>
            </div>
          </div>

          {/* LISTENERS */}
          <div className="w-full mt-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Headphones size={11} className="text-slate-300" />
                المستمعون
              </h3>
              <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                <Users size={10} /> 8
              </span>
            </div>
            <div
              className={`${chatUI.radius.card} ${chatUI.surface.card} ${chatUI.spacing.cardPad}`}
            >
              <div dir="ltr" className="grid grid-cols-5 gap-y-2 justify-items-center">
                {LISTENERS.slice(0, 5).map((l) => (
                  <ListenerTile key={l.letter} {...l} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="relative z-10 px-6 pt-3 pb-2 border-t border-white/5 bg-slate-950/60 backdrop-blur">
          <div dir="ltr" className="flex items-end justify-around">
            <IconButton
              icon={<Hand size={20} />}
              label="Raise Hand"
              tone="warning"
              badge="3"
            />
            <IconButton
              icon={<MessageSquare size={20} />}
              label="Message"
              tone="accent"
            />
            <IconButton
              icon={<PhoneOff size={20} />}
              label="Leave"
              tone="danger"
            />
          </div>
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-28 h-1 rounded-full bg-white/40" />
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}
