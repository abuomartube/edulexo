import { useState, useEffect } from "react";
import { LogOut, ArrowLeft, Loader2, BookOpen } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#1E2155";
const VIOLET = "#A78BFA";

interface LevelInfo {
  id: "a2" | "b1";
  label: string;
  description: string;
}

interface Props {
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
  onChooseLevel: (level: "a2" | "b1") => void;
}

export default function ReadingLevelPicker({ onBack, onLogout, expiresAt, onChooseLevel }: Props) {
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api-intro/reading/levels-types`, { credentials: "include" });
        const data = await res.json();
        if (!cancelled && data.levels) setLevels(data.levels);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api-intro/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #0d0a22 0%, ${NAVY} 50%, #1a1238 100%)` }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid rgba(167,139,250,0.18)` }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-2 rounded-full transition-colors"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

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

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-8">
        <div className="text-center space-y-3 pt-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase"
            style={{ background: `rgba(167,139,250,0.14)`, border: `1px solid rgba(167,139,250,0.4)`, color: VIOLET }}
          >
            <BookOpen className="w-3 h-3" />
            <span>Hemingway · Reading</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Choose your <span style={{ color: VIOLET }}>level</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto font-medium">
            Each level offers ten question types, with five passages per type.
          </p>
        </div>

        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: VIOLET }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
            {levels.map((lv) => (
              <button
                key={lv.id}
                onClick={() => onChooseLevel(lv.id)}
                className="group flex flex-col text-left p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(167,139,250,0.25)`,
                }}
              >
                <div
                  className="inline-block self-start px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase mb-3"
                  style={{ background: "rgba(167,139,250,0.18)", color: VIOLET }}
                >
                  {lv.id === "a2" ? "Elementary" : "Intermediate"}
                </div>
                <h2 className="text-2xl font-black text-white leading-tight mb-2">{lv.label}</h2>
                <p className="text-sm text-white/65 leading-relaxed mb-4">{lv.description}</p>
                <div
                  className="mt-auto inline-flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: VIOLET }}
                >
                  Choose <span>→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
