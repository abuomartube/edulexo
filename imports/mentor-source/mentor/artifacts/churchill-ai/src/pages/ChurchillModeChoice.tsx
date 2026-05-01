import { GraduationCap, MessageCircle, ChevronRight, ArrowLeft, LogOut, Sparkles } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#00B4C8";
const GREEN = "#1DB954";
const YELLOW = "#F5C518";
const NAVY = "#0A1A30";

interface Props {
  onIelts: () => void;
  onFree: () => void;
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
}

export default function ChurchillModeChoice({ onIelts, onFree, onBack, onLogout, expiresAt }: Props) {
  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api/churchill/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid rgba(0,180,200,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-white/40 hover:text-white/70 transition-colors p-1 -ml-1"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src="/logo.png" alt="4 IELTS" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-black text-white text-base tracking-tight leading-none">Churchill AI</div>
            <div className="text-xs font-semibold" style={{ color: TEAL }}>by 4 IELTS</div>
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

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8">
        <div className="text-center max-w-md">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            Choose how you want to <span style={{ color: TEAL }}>practice</span>
          </h1>
          <p className="text-white/60 text-sm">Two modes, one goal — fluent, confident speaking.</p>
        </div>

        <div className="w-full max-w-2xl grid sm:grid-cols-2 gap-4">
          <button
            onClick={onIelts}
            className="group flex flex-col gap-4 p-6 rounded-3xl text-left transition-all hover:scale-[1.015] active:scale-[0.99]"
            style={{
              background: `linear-gradient(160deg, rgba(0,180,200,0.18), rgba(0,180,200,0.05))`,
              border: `1px solid rgba(0,180,200,0.35)`,
              boxShadow: `0 8px 30px rgba(0,180,200,0.15)`,
            }}
          >
            <div className="flex items-start justify-between">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `${TEAL}25`, border: `1px solid ${TEAL}55` }}
              >
                <GraduationCap className="w-7 h-7" style={{ color: TEAL }} />
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{ background: `${YELLOW}20`, color: YELLOW, border: `1px solid ${YELLOW}40` }}
              >
                Exam prep
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-1">For IELTS</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Full IELTS Speaking simulation — Parts 1, 2 and 3 with 120 official-style topics, cue cards, and a band-score report.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-sm font-bold pt-2" style={{ color: TEAL }}>
              Start IELTS practice
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          <button
            onClick={onFree}
            className="group flex flex-col gap-4 p-6 rounded-3xl text-left transition-all hover:scale-[1.015] active:scale-[0.99]"
            style={{
              background: `linear-gradient(160deg, rgba(29,185,84,0.18), rgba(29,185,84,0.05))`,
              border: `1px solid rgba(29,185,84,0.35)`,
              boxShadow: `0 8px 30px rgba(29,185,84,0.15)`,
            }}
          >
            <div className="flex items-start justify-between">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `${GREEN}25`, border: `1px solid ${GREEN}55` }}
              >
                <MessageCircle className="w-7 h-7" style={{ color: GREEN }} />
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                style={{ background: `${GREEN}20`, color: GREEN, border: `1px solid ${GREEN}40` }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                New
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-1">Free Conversation</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Natural conversation about anything — Churchill talks like a real person and never interrupts. Get a full feedback report after you stop.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-sm font-bold pt-2" style={{ color: GREEN }}>
              Start free conversation
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-white/35 max-w-md">
          You can switch modes any time. Both save your progress and feedback to your account.
        </p>
      </main>
    </div>
  );
}
