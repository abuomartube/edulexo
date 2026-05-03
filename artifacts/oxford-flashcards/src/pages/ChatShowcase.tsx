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
};

const TOP_ROW: Tile[] = [
  {
    label: "Course Selection",
    badge: "Entry",
    icon: <GraduationCap size={12} />,
    body: <CourseSelectionTile />,
  },
  {
    label: "Room Selection",
    badge: "Browse",
    icon: <MessageSquare size={12} />,
    body: <RoomSelectionTile />,
  },
  {
    label: "Room Details",
    badge: "Preview",
    icon: <Layers size={12} />,
    body: <RoomDetailsTile />,
  },
  {
    label: "Chat Screen",
    badge: "Live",
    icon: <Mic size={12} />,
    body: <ChatScreenTile />,
    dir: "ltr",
  },
];

const BOTTOM_ROW: Tile[] = [
  {
    label: "Voice Room",
    badge: "Audio",
    icon: <Headphones size={12} />,
    body: <VoiceOnlyTile />,
  },
  {
    label: "Topic Generator",
    badge: "Feature",
    icon: <Sparkles size={12} />,
    body: <TopicGeneratorTile />,
  },
  {
    label: "Profile",
    badge: "Account",
    icon: <User size={12} />,
    body: <ProfileTile />,
  },
  {
    label: "Leaderboard",
    badge: "XP",
    icon: <Trophy size={12} />,
    body: <LeaderboardTile />,
  },
  {
    label: "Settings",
    badge: "Account",
    icon: <SettingsIcon size={12} />,
    body: <SettingsTile />,
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
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 ring-1 ring-white/10 text-[9.5px] font-bold text-slate-300">
          {tile.icon}
          {tile.badge}
        </span>
      </div>
      <MiniPhone dir={tile.dir ?? "rtl"}>{tile.body}</MiniPhone>
      <div className="mt-3 text-center">
        <div className="text-[12.5px] font-bold text-white tracking-tight">
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
    <div className="flex items-end gap-3 mb-6">
      <div
        className="text-[44px] leading-none font-black tracking-tighter bg-clip-text text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #a855f7 0%, #ec4899 60%, #f97316 100%)",
        }}
      >
        {number}
      </div>
      <div>
        <div className="text-[18px] font-extrabold text-white tracking-tight">
          {title}
        </div>
        <div className="text-[12px] text-slate-400">{desc}</div>
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
          "radial-gradient(ellipse at top left, rgba(124,58,237,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(37,99,235,0.18), transparent 55%), #050816",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* dotted canvas grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative flex min-w-[1480px]">
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
        <main className="flex-1 px-12 py-10 min-w-0">
          {/* Page heading */}
          <div className="mb-12">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 ring-1 ring-purple-500/30 text-purple-200 text-[10.5px] font-bold tracking-wide">
              <Sparkles size={11} /> PRODUCT PRESENTATION
            </span>
            <h1 className="mt-4 text-[40px] font-black text-white tracking-tighter leading-[1.05]">
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
            <p className="mt-2 text-[15px] text-slate-400 max-w-[680px]">
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
          <div className="flex items-start gap-2 mb-16">
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
          <div className="flex items-start gap-7 mb-12 flex-wrap">
            {BOTTOM_ROW.map((tile) => (
              <TileCard key={tile.label} tile={tile} />
            ))}
          </div>

          <div className="mt-16 text-[11px] text-slate-500 border-t border-white/5 pt-6">
            All screens are interactive previews built from the same components
            that ship in the live app — no static mockups.
          </div>
        </main>
      </div>
    </div>
  );
}
