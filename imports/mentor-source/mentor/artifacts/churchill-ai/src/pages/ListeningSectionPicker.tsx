import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Headphones, ChevronRight, CheckCircle, Sparkles, History } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#0A1A30";
const GREEN = "#6EE7B7";

interface Section {
  id: number;
  title: string;
  description: string;
}

interface TestSummary {
  id: string;
  sectionId: number;
  title: string;
  description: string;
  questionCount: number;
  completed: boolean;
  result: { score: number; total: number; percent: number } | null;
}

interface Props {
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
  onChooseSection: (sectionId: number) => void;
  onOpenHistory: () => void;
}

export default function ListeningSectionPicker({ onBack, onLogout, expiresAt, onChooseSection, onOpenHistory }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api/churchill/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/churchill/listening/tests`, { credentials: "include" });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setSections(data.sections || []);
          setTests(data.tests || []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid rgba(110,231,183,0.18)` }}
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
            <div className="font-black text-white text-base tracking-tight leading-none">Attenborough AI</div>
            <div className="text-xs font-semibold" style={{ color: GREEN }}>Listening practice</div>
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

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10 gap-8 max-w-3xl mx-auto w-full">
        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase mb-4"
            style={{
              background: `rgba(110,231,183,0.12)`,
              border: `1px solid rgba(110,231,183,0.35)`,
              color: GREEN,
            }}
          >
            <Sparkles className="w-3 h-3" />
            <span>A2 Listening · 20 tests</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Pick a <span style={{ color: GREEN }}>listening section</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base mt-2 max-w-md mx-auto">
            Each section has 5 tests. You can take each test only once, so listen carefully.
          </p>
        </div>

        {!loading && (() => {
          const completedCount = tests.filter((t) => t.completed).length;
          return (
            <button
              onClick={onOpenHistory}
              className="group w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.005] active:scale-[0.995]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(110,231,183,0.25)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `rgba(110,231,183,0.15)`, border: `1px solid rgba(110,231,183,0.35)` }}
              >
                <History className="w-5 h-5" style={{ color: GREEN }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm">My Listening History</div>
                <div className="text-white/55 text-xs mt-0.5">
                  {completedCount === 0
                    ? "Your past results will appear here"
                    : `Review ${completedCount} completed test${completedCount === 1 ? "" : "s"}`}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40 transition-transform group-hover:translate-x-1" />
            </button>
          );
        })()}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {sections.map((s) => {
              const sectionTests = tests.filter((t) => t.sectionId === s.id);
              const done = sectionTests.filter((t) => t.completed).length;
              const totalTests = sectionTests.length;
              return (
                <button
                  key={s.id}
                  onClick={() => onChooseSection(s.id)}
                  className="group flex flex-col gap-3 p-5 rounded-3xl text-left transition-all hover:scale-[1.015] active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(160deg, rgba(110,231,183,0.13), rgba(110,231,183,0.04))`,
                    border: `1px solid rgba(110,231,183,0.3)`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: `rgba(110,231,183,0.18)`, border: `1px solid rgba(110,231,183,0.35)` }}
                    >
                      <Headphones className="w-6 h-6" style={{ color: GREEN }} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                        style={{ background: `rgba(110,231,183,0.15)`, color: GREEN, border: `1px solid rgba(110,231,183,0.35)` }}
                      >
                        {done}/{totalTests} done
                      </span>
                      {done === totalTests && totalTests > 0 && (
                        <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">{s.title}</h2>
                    <p className="text-white/60 text-sm leading-relaxed mt-1">{s.description}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-xs font-bold pt-2" style={{ color: GREEN }}>
                    See tests
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
