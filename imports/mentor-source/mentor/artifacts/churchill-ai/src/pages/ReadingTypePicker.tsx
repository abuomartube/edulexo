import { useState, useEffect, useCallback } from "react";
import { LogOut, ArrowLeft, Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#0A1A30";
const VIOLET = "#A78BFA";
const SOFT_GREEN = "#6EE7B7";

export type ReadingType =
  | "skimming"
  | "scanning"
  | "mcq"
  | "tfng"
  | "ynng"
  | "matching_headings"
  | "matching_features"
  | "sentence_completion"
  | "note_completion"
  | "table_completion"
  | "flow_chart_completion"
  | "short_answer";

interface TypeInfo {
  id: ReadingType;
  label: string;
  tagline: string;
}

interface ItemSummary {
  slug: string;
  title: string;
  questionCount: number;
  completed: boolean;
  result: { score: number; total: number; percent: number } | null;
}

interface Props {
  level: "a2" | "b1";
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
  onChooseType: (type: ReadingType) => void;
  onSeeSummary: (type: ReadingType) => void;
}

export default function ReadingTypePicker({ level, onBack, onLogout, expiresAt, onChooseType, onSeeSummary }: Props) {
  const [types, setTypes] = useState<TypeInfo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const metaRes = await fetch(`${BASE_URL}/api/churchill/reading/levels-types`, { credentials: "include" });
      const meta = await metaRes.json();
      if (meta.types) setTypes(meta.types);
      if (meta.counts) setCounts(meta.counts);

      const attemptsRes = await fetch(`${BASE_URL}/api/churchill/reading/attempts`, { credentials: "include" });
      const attemptsData = await attemptsRes.json();
      if (attemptsData.attempts) {
        const map: Record<string, number> = {};
        for (const a of attemptsData.attempts as { level: string; type: string }[]) {
          if (a.level === level) {
            const key = `${level}:${a.type}`;
            map[key] = (map[key] ?? 0) + 1;
          }
        }
        setCompleted(map);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api/churchill/auth/logout`, { method: "POST", credentials: "include" });
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
          <span>Levels</span>
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

      <main className="flex-1 px-4 pt-6 pb-10 flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase"
            style={{ background: `rgba(167,139,250,0.14)`, border: `1px solid rgba(167,139,250,0.4)`, color: VIOLET }}
          >
            <BookOpen className="w-3 h-3" />
            <span>Hemingway · {level.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Choose a question type</h1>
          <p className="text-white/55 text-sm">5 passages each. Complete all 5 to see your bucket score.</p>
        </div>

        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: VIOLET }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
            {types.map((t) => {
              const total = counts[`${level}:${t.id}`] ?? 0;
              const done = completed[`${level}:${t.id}`] ?? 0;
              const allDone = total > 0 && done >= total;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${allDone ? "rgba(110,231,183,0.4)" : "rgba(167,139,250,0.22)"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-black text-white leading-tight">{t.label}</h3>
                    {allDone && (
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: SOFT_GREEN }} />
                    )}
                  </div>
                  <p className="text-xs text-white/55 leading-relaxed min-h-[32px]">{t.tagline}</p>

                  <div className="mt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-white/40 uppercase tracking-wider">Progress</span>
                      <span style={{ color: allDone ? SOFT_GREEN : VIOLET }}>
                        {done}/{total || 5}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: total > 0 ? `${Math.min(100, (done / total) * 100)}%` : "0%",
                          background: allDone ? SOFT_GREEN : VIOLET,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onChooseType(t.id)}
                      className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90"
                      style={{ background: VIOLET, color: NAVY }}
                    >
                      {done > 0 && !allDone ? "Continue" : allDone ? "Review" : "Start"}
                    </button>
                    {allDone && (
                      <button
                        onClick={() => onSeeSummary(t.id)}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-white/70 hover:text-white"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        Total
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
