import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, CheckCircle2, XCircle, Sparkles, Loader2, RotateCw } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#0A1A30";
const GREEN = "#6EE7B7";

export interface AttemptResult {
  id?: string;
  type: string;
  prompt: string;
  studentAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean;
  points: number;
  maxPoints: number;
}

export interface Attempt {
  id: number;
  answers: Record<string, unknown>;
  score: number;
  total: number;
  percent: number;
  results: AttemptResult[];
  analysis: string;
}

export interface TestPayload {
  id: string;
  title: string;
  sectionId: number;
}

interface Props {
  testId: string;
  prefetched?: { attempt: Attempt; test: TestPayload } | null;
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
  onChooseAnotherTest: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple choice",
  matching: "Matching",
  note_completion: "Note completion",
  sentence_completion: "Sentence completion",
  short_answer: "Short answer",
};

function formatAnswer(a: unknown): string {
  if (a === null || a === undefined) return "—";
  if (Array.isArray(a)) return a.map((x) => (typeof x === "string" ? x : String(x))).join(" · ");
  if (typeof a === "number") return String(a);
  return String(a);
}

export default function ListeningResult({ testId, prefetched, onBack, onLogout, expiresAt, onChooseAnotherTest }: Props) {
  const [attempt, setAttempt] = useState<Attempt | null>(prefetched?.attempt ?? null);
  const [test, setTest] = useState<TestPayload | null>(prefetched?.test ?? null);
  const [loading, setLoading] = useState(!prefetched);

  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api/churchill/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  useEffect(() => {
    if (prefetched) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [aRes, tRes] = await Promise.all([
          fetch(`${BASE_URL}/api/churchill/listening/attempts/${testId}`, { credentials: "include" }),
          fetch(`${BASE_URL}/api/churchill/listening/tests/${testId}`, { credentials: "include" }),
        ]);
        const aData = await aRes.json();
        const tData = await tRes.json();
        if (!cancelled && aRes.ok && tRes.ok) {
          const a = aData.attempt;
          setAttempt({
            id: a.id,
            answers: a.answers,
            score: a.score,
            total: a.total,
            percent: a.percent,
            results: a.results,
            analysis: a.analysis,
          });
          setTest(tData.test);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [testId, prefetched]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: GREEN }} />
      </div>
    );
  }

  if (!attempt || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <div className="text-white/60 text-sm">No attempt found.</div>
      </div>
    );
  }

  const band = attempt.percent >= 80 ? "Great" : attempt.percent >= 60 ? "Good" : attempt.percent >= 40 ? "Okay" : "Keep practising";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid rgba(110,231,183,0.18)` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="text-white/40 hover:text-white/70 transition-colors p-1 -ml-1 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="font-black text-white text-sm sm:text-base tracking-tight leading-tight truncate">{test.title} · Result</div>
            <div className="text-[11px] font-semibold" style={{ color: GREEN }}>Section {test.sectionId}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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
        <div
          className="rounded-3xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-5"
          style={{ background: `linear-gradient(160deg, rgba(110,231,183,0.16), rgba(110,231,183,0.04))`, border: `1px solid rgba(110,231,183,0.35)` }}
        >
          <div
            className="flex flex-col items-center justify-center w-28 h-28 rounded-3xl shrink-0"
            style={{ background: `radial-gradient(circle, rgba(110,231,183,0.25), rgba(110,231,183,0.05))`, border: `2px solid ${GREEN}` }}
          >
            <div className="text-3xl font-black" style={{ color: GREEN }}>{attempt.percent}%</div>
            <div className="text-xs text-white/60">{attempt.score}/{attempt.total}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: GREEN }}>Result</div>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{band}!</h1>
            <p className="text-white/65 text-sm mt-2 leading-relaxed">{attempt.analysis}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" style={{ color: GREEN }} />
          <h2 className="text-sm font-bold text-white">Question by question</h2>
        </div>

        <div className="space-y-3">
          {attempt.results.map((r, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{
                background: r.isCorrect ? `rgba(110,231,183,0.06)` : "rgba(239,68,68,0.05)",
                border: r.isCorrect ? `1px solid rgba(110,231,183,0.3)` : "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                  style={{
                    background: r.isCorrect ? `rgba(110,231,183,0.18)` : "rgba(239,68,68,0.12)",
                    color: r.isCorrect ? GREEN : "#fca5a5",
                    border: r.isCorrect ? `1px solid rgba(110,231,183,0.35)` : "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: r.isCorrect ? GREEN : "#fca5a5" }}>
                      {TYPE_LABELS[r.type] || r.type}
                    </span>
                    {r.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: GREEN }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300">
                        <XCircle className="w-3.5 h-3.5" /> Wrong
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm font-medium leading-relaxed mt-1">{r.prompt}</p>
                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    <div
                      className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Your answer</div>
                      <div className="text-sm text-white/85 mt-1">{formatAnswer(r.studentAnswer)}</div>
                    </div>
                    <div
                      className="rounded-xl p-3"
                      style={{ background: `rgba(110,231,183,0.06)`, border: `1px solid rgba(110,231,183,0.25)` }}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GREEN }}>Correct answer</div>
                      <div className="text-sm text-white/85 mt-1">{formatAnswer(r.correctAnswer)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onChooseAnotherTest}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${GREEN}, #4ade80)`, color: NAVY }}
          >
            <RotateCw className="w-4 h-4" />
            Try another test
          </button>
        </div>
      </main>
    </div>
  );
}
