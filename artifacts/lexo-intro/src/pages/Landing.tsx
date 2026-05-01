import { Mic, BookOpen, Trophy, MessageSquare, ChevronRight, Star, LogOut } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const TEAL = "#6B2FE6";
const GREEN = "#1DB954";
const YELLOW = "#F5C518";
const NAVY = "#1E2155";

interface Props {
  onStart: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
}

export default function Landing({ onStart, onLogout, expiresAt }: Props) {
  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api-intro/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid rgba(107,47,230,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="LEXO Intro" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-black text-white text-base tracking-tight leading-none">Churchill</div>
            <div className="text-xs font-semibold" style={{ color: TEAL }}>by Abu Omar EduLexo</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DaysLeftBadge expiresAt={expiresAt} />
          {onLogout && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-3 py-2 rounded-full transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pt-10 pb-8 gap-8">

        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-30"
              style={{ background: `radial-gradient(circle, ${TEAL} 0%, ${GREEN} 100%)` }}
            />
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="LEXO Intro Logo"
              className="relative w-44 h-44 object-contain drop-shadow-2xl"
            />
          </div>

          <div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-1 tracking-tight">
              Churchill <span style={{ color: TEAL }}>AI</span>
            </h1>
            <p className="font-bold text-base mb-1" style={{ color: YELLOW }}>Your Path to Band 7+</p>
            <p className="text-white/60 text-sm">AI-Powered IELTS Speaking Examiner</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4" style={{ fill: YELLOW, color: YELLOW }} />
              ))}
              <span className="text-white/40 text-xs ml-1">GPT-4o · Free to try</span>
            </div>
          </div>
        </div>

        <div
          className="w-full max-w-lg rounded-2xl px-5 py-4 text-center text-sm text-white/85 leading-relaxed italic border"
          style={{ background: `rgba(107,47,230,0.07)`, borderColor: `rgba(107,47,230,0.25)` }}
        >
          "Hi, this is Churchill. I am here to enhance your speaking skills and help you achieve your target IELTS band score. Let's begin."
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
          {[
            { icon: <BookOpen className="w-4 h-4" />, label: "120 Topics", color: TEAL },
            { icon: <MessageSquare className="w-4 h-4" />, label: "3 IELTS Parts", color: TEAL },
            { icon: <Mic className="w-4 h-4" />, label: "Voice Mode", color: GREEN },
            { icon: <Trophy className="w-4 h-4" />, label: "Band Score Report", color: YELLOW },
          ].map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl text-center text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span style={{ color: f.color }}>{f.icon}</span>
              <span className="text-white/75">{f.label}</span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-lg space-y-2 text-sm">
          {[
            { n: "1", label: "Introduction", desc: "8 personal questions about the topic", color: TEAL },
            { n: "2", label: "Long Turn", desc: "1 minute to prepare + 1–2 minute talk", color: GREEN },
            { n: "3", label: "Discussion", desc: "4 abstract analytical questions", color: YELLOW },
          ].map((p) => (
            <div
              key={p.n}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: p.color, color: NAVY }}
              >
                {p.n}
              </span>
              <div>
                <span className="font-semibold text-white">Part {p.n} — {p.label}</span>
                <p className="text-white/45">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-lg flex flex-col gap-3">
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`,
              color: NAVY,
              boxShadow: `0 8px 30px rgba(107,47,230,0.4)`,
            }}
          >
            <Mic className="w-5 h-5" />
            ابدأ جلسة تحدث الآن
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="text-center text-xs text-white/35">
            Powered by GPT-4o · All 3 IELTS Speaking Parts · by Abu Omar EduLexo
          </p>
        </div>
      </main>

    </div>
  );
}
