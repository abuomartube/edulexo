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
  PhoneFrame,
  PageBackdrop,
} from "@/components/chat-ui";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();
  return (
    <PageBackdrop>
      <PhoneFrame>
        <Header
          onBack={() => setLocation("/room-selection")}
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
              onClick={() => setLocation("/room-selection")}
            />
          </div>
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-28 h-1 rounded-full bg-white/40" />
          </div>
        </div>
      </PhoneFrame>
    </PageBackdrop>
  );
}
