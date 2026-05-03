import {
  Mic,
  MessageSquare,
  Headphones,
  Sparkles,
  Trophy,
  User,
  Settings as SettingsIcon,
  GraduationCap,
  Lightbulb,
  Globe,
  ShieldCheck,
  Layers,
} from "lucide-react";
import type { ReactNode } from "react";
import { MiniPhone, MINI_W } from "@/components/chat-ui";
import {
  CourseSelectionTile,
  RoomSelectionTile,
  RoomDetailsTile,
  ChatScreenTile,
  VoiceOnlyTile,
  TopicGeneratorTile,
  ProfileTile,
  LeaderboardTile,
  SettingsTile,
} from "@/screens/chat/showcase";

const FEATURES = [
  { icon: <MessageSquare size={14} />, label: "Themed text rooms" },
  { icon: <Mic size={14} />, label: "Voice notes & recording" },
  { icon: <Headphones size={14} />, label: "Voice-only live audio" },
  { icon: <Sparkles size={14} />, label: "AI topic generator" },
  { icon: <Lightbulb size={14} />, label: "Ice breakers" },
  { icon: <Globe size={14} />, label: "English-only nudge" },
  { icon: <ShieldCheck size={14} />, label: "Admin moderation" },
  { icon: <Trophy size={14} />, label: "XP leaderboard" },
  { icon: <User size={14} />, label: "User profiles & DMs" },
];

type Tile = {
  label: string;
  badge?: string;
  icon: ReactNode;
  body: ReactNode;
  dir?: "ltr" | "rtl";
  glow: string;
};

const TOP_ROW: Tile[] = [
  {
    label: "Course Selection",
    badge: "Entry",
    icon: <GraduationCap size={12} />,
    body: <CourseSelectionTile />,
    glow: "rgba(96,165,250,0.55)",
  },
  {
    label: "Room Selection",
    badge: "Browse",
    icon: <MessageSquare size={12} />,
    body: <RoomSelectionTile />,
    glow: "rgba(168,85,247,0.55)",
  },
  {
    label: "Room Details",
    badge: "Preview",
    icon: <Layers size={12} />,
    body: <RoomDetailsTile />,
    glow: "rgba(236,72,153,0.55)",
  },
  {
    label: "Chat Screen",
    badge: "Live",
    icon: <Mic size={12} />,
    body: <ChatScreenTile />,
    dir: "ltr",
    glow: "rgba(34,211,238,0.55)",
  },
];

const BOTTOM_ROW: Tile[] = [
  {
    label: "Voice Room",
    badge: "Audio",
    icon: <Headphones size={12} />,
    body: <VoiceOnlyTile />,
    glow: "rgba(124,58,237,0.6)",
  },
  {
    label: "Topic Generator",
    badge: "Feature",
    icon: <Sparkles size={12} />,
    body: <TopicGeneratorTile />,
    glow: "rgba(244,114,182,0.55)",
  },
  {
    label: "Profile",
    badge: "Account",
    icon: <User size={12} />,
    body: <ProfileTile />,
    glow: "rgba(99,102,241,0.55)",
  },
  {
    label: "Leaderboard",
    badge: "XP",
    icon: <Trophy size={12} />,
    body: <LeaderboardTile />,
    glow: "rgba(251,191,36,0.55)",
  },
  {
    label: "Settings",
    badge: "Account",
    icon: <SettingsIcon size={12} />,
    body: <SettingsTile />,
    glow: "rgba(148,163,184,0.45)",
  },
];

function FlowArrow() {
  return (
    <div className="flex flex-col items-center justify-center self-center px-1 select-none">
      <svg
        width="42"
        height="14"
        viewBox="0 0 42 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-purple-300"
      >
        <path
          d="M1 7 L34 7"
          stroke="url(#arrowGrad)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <path
          d="M30 2 L40 7 L30 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <defs>
          <linearGradient id="arrowGrad" x1="0" y1="0" x2="42" y2="0">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function TileCard({ tile }: { tile: Tile }) {
  return (
    <div className="flex flex-col items-center" style={{ width: MINI_W }}>
      <div className="flex items-center justify-center gap-1.5 mb-3 h-5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 ring-1 ring-white/10 backdrop-blur text-[10px] font-bold text-slate-300 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.6)] leading-none">
          {tile.icon}
          {tile.badge}
        </span>
      </div>

      {/* phone with halo + drop shadow + floor reflection */}
      <div className="relative" style={{ width: MINI_W }}>
        {/* colored halo behind the phone */}
        <div
          aria-hidden
          className="absolute -inset-10 rounded-[60px] blur-[60px] opacity-90 pointer-events-none"
          style={{ background: tile.glow }}
        />
        {/* secondary tighter halo */}
        <div
          aria-hidden
          className="absolute -inset-4 rounded-[44px] blur-2xl opacity-70 pointer-events-none"
          style={{ background: tile.glow }}
        />
        {/* top rim light */}
        <div
          aria-hidden
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-[80%] h-3 rounded-full blur-md opacity-80 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
          }}
        />
        {/* the phone itself, with a heavy drop shadow */}
        <div
          className="relative"
          style={{
            filter:
              "drop-shadow(0 30px 40px rgba(0,0,0,0.7)) drop-shadow(0 60px 80px rgba(0,0,0,0.55))",
          }}
        >
          <MiniPhone dir={tile.dir ?? "rtl"}>{tile.body}</MiniPhone>
        </div>
        {/* floor reflection ellipse beneath the phone */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-[80%] h-6 rounded-[50%] blur-xl opacity-80 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 70%)",
          }}
        />
      </div>

      <div className="mt-8 text-center h-5 flex items-center justify-center">
        <div className="text-[12.5px] font-bold text-white tracking-tight leading-none">
          {tile.label}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3.5 mb-8">
      <div
        className="text-[40px] leading-none font-black tracking-tighter bg-clip-text text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #a855f7 0%, #ec4899 60%, #f97316 100%)",
        }}
      >
        {number}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[18px] font-extrabold text-white tracking-tight leading-none">
          {title}
        </div>
        <div className="text-[12.5px] text-slate-400 leading-none">{desc}</div>
      </div>
    </div>
  );
}

export default function ChatShowcase() {
  return (
    <div
      dir="ltr"
      className="min-h-screen w-full text-white relative overflow-x-auto"
      style={{
        background:
          "radial-gradient(ellipse 1200px 600px at 50% -10%, rgba(168,85,247,0.28), transparent 70%), radial-gradient(ellipse at top left, rgba(124,58,237,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(37,99,235,0.20), transparent 55%), linear-gradient(180deg, #0a0a1f 0%, #050816 50%, #02030a 100%)",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* overhead spotlight — bright from the top, fading down */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,255,255,0.10) 0%, rgba(168,85,247,0.08) 30%, transparent 70%)",
        }}
      />
      {/* secondary side rim lights */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[140px] opacity-60"
        style={{ background: "rgba(124,58,237,0.45)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[40%] right-[10%] w-[700px] h-[700px] rounded-full blur-[160px] opacity-50"
        style={{ background: "rgba(236,72,153,0.35)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[5%] left-[40%] w-[800px] h-[500px] rounded-full blur-[180px] opacity-50"
        style={{ background: "rgba(59,130,246,0.30)" }}
      />

      {/* SVG noise/texture overlay */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.07] mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="showcase-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#showcase-noise)" />
      </svg>

      {/* dotted canvas grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 100% 80% at 50% 30%, black 30%, transparent 90%)",
        }}
      />

      <div className="relative flex min-w-[1520px]">
        {/* SIDEBAR */}
        <aside className="w-[300px] shrink-0 border-r border-white/10 bg-slate-950/40 backdrop-blur-md p-7 flex flex-col gap-7 sticky top-0 self-start min-h-screen">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center ring-1 ring-white/20"
                style={{
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #818cf8 35%, #a855f7 100%)",
                  boxShadow:
                    "0 10px 30px -8px rgba(124,58,237,0.7), inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                <MessageSquare size={18} className="text-white" />
              </div>
              <div>
                <div
                  className="text-[24px] font-black tracking-tight bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #ffffff 0%, #c4b5fd 60%, #f9a8d4 100%)",
                  }}
                >
                  LEXO
                </div>
                <div className="text-[10px] font-semibold text-slate-400 -mt-0.5 tracking-wider">
                  CHAT · PHASE 1
                </div>
              </div>
            </div>

            <p className="mt-5 text-[13px] text-slate-300 leading-relaxed">
              Speak English with confidence. Practice in themed rooms with
              learners around the world — text, voice notes, and live audio.
            </p>
          </div>

          <div>
            <div className="text-[10.5px] font-bold tracking-wider text-slate-500 mb-3">
              FEATURES
            </div>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-2.5 text-[12.5px] text-slate-200"
                >
                  <span className="w-7 h-7 rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-purple-300">
                    {f.icon}
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v0.1.0 · interactive preview
            </div>
            <div className="mt-1 text-[10.5px] text-slate-500">
              9 screens · 5 rooms · 10 personas
            </div>
          </div>
        </aside>

        {/* MAIN CANVAS */}
        <main className="flex-1 px-14 py-12 min-w-0">
          {/* Page heading */}
          <div className="mb-14">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 ring-1 ring-purple-500/30 text-purple-200 text-[10.5px] font-bold tracking-wide leading-none">
              <Sparkles size={11} /> PRODUCT PRESENTATION
            </span>
            <h1 className="mt-5 text-[44px] font-black text-white tracking-tighter leading-[1.05]">
              Meet{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)",
                }}
              >
                LEXO Chat
              </span>
              .
            </h1>
            <p className="mt-3 text-[14.5px] text-slate-400 max-w-[680px] leading-relaxed">
              A live-conversation layer for English learners. The 9 screens
              below cover the full Phase 1 experience — from picking a course
              to climbing the XP leaderboard.
            </p>
          </div>

          {/* TOP ROW — User Journey */}
          <SectionHeading
            number="01"
            title="User Journey"
            desc="From course → room → live conversation."
          />
          <div className="flex items-start justify-center gap-1 mb-28">
            {TOP_ROW.map((tile, i) => (
              <div key={tile.label} className="flex items-stretch">
                <TileCard tile={tile} />
                {i < TOP_ROW.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>

          {/* BOTTOM ROW — Features */}
          <SectionHeading
            number="02"
            title="Features"
            desc="Everything that makes the room feel alive."
          />
          <div className="flex items-start justify-center gap-6 mb-20">
            {BOTTOM_ROW.map((tile) => (
              <TileCard key={tile.label} tile={tile} />
            ))}
          </div>

          <div className="mt-20 text-[11px] text-slate-500 border-t border-white/5 pt-6 text-center">
            All screens are interactive previews built from the same components
            that ship in the live app — no static mockups.
          </div>
        </main>
      </div>
    </div>
  );
}
