import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, ChevronRight, CheckCircle, Lock, Eye, PlayCircle } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#0A1A30";
const GREEN = "#6EE7B7";

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
  sectionId: number;
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
  onChooseTest: (testId: string, mode: "take" | "review") => void;
}

export default function ListeningTestList({ sectionId, onBack, onLogout, expiresAt, onChooseTest }: Props) {
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
          setTests((data.tests as TestSummary[]).filter((t) => t.sectionId === sectionId));
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
  }, [sectionId]);

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
            <div className="text-xs font-semibold" style={{ color: GREEN }}>Section {sectionId}</div>
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

      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-6 tracking-tight">
          Section {sectionId} <span style={{ color: GREEN }}>tests</span>
        </h1>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((t, i) => (
              <button
                key={t.id}
                onClick={() => onChooseTest(t.id, t.completed ? "review" : "take")}
                className="group w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.005] active:scale-[0.995]"
                style={{
                  background: t.completed
                    ? `linear-gradient(160deg, rgba(110,231,183,0.10), rgba(110,231,183,0.03))`
                    : "rgba(255,255,255,0.04)",
                  border: t.completed ? `1px solid rgba(110,231,183,0.28)` : "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black shrink-0"
                  style={{
                    background: t.completed ? `rgba(110,231,183,0.2)` : "rgba(255,255,255,0.06)",
                    border: t.completed ? `1px solid rgba(110,231,183,0.4)` : "1px solid rgba(255,255,255,0.08)",
                    color: t.completed ? GREEN : "rgba(255,255,255,0.6)",
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-white truncate">{t.title}</h2>
                    {t.completed && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                        style={{ background: `rgba(110,231,183,0.18)`, color: GREEN, border: `1px solid rgba(110,231,183,0.45)` }}
                      >
                        Completed
                      </span>
                    )}
                    {t.completed && t.result && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-black"
                        style={{ background: `rgba(110,231,183,0.10)`, color: GREEN, border: `1px solid rgba(110,231,183,0.30)` }}
                      >
                        {t.result.score}/{t.result.total} · {t.result.percent}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{t.description}</p>
                  <p className="text-[11px] text-white/35 mt-1">{t.questionCount} questions</p>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-xs font-bold" style={{ color: t.completed ? GREEN : "rgba(255,255,255,0.7)" }}>
                  {t.completed ? (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Review</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Start</span>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        )}

        <div
          className="mt-8 p-4 rounded-2xl flex items-start gap-3 text-sm"
          style={{ background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.2)" }}
        >
          <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: GREEN }} />
          <div className="text-white/70 leading-relaxed">
            <span className="font-bold text-white">One try only.</span> You can listen to the audio while you answer, but each test can be submitted just once. After that, you can review your answers and the correct ones.
          </div>
        </div>
      </main>
    </div>
  );
}
