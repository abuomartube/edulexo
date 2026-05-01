import { useState, useEffect } from "react";
import { LogOut, ArrowLeft, Loader2, BookOpen, Trophy, RotateCcw } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";
import type { ReadingType } from "./ReadingTypePicker";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#1E2155";
const VIOLET = "#A78BFA";
const SOFT_GREEN = "#6EE7B7";
const YELLOW = "#F5C518";

interface AttemptRow {
  id: number;
  itemSlug: string;
  level: string;
  type: string;
  score: number;
  total: number;
  percent: number;
  createdAt: string;
}

interface ItemRow {
  slug: string;
  title: string;
  questionCount: number;
  completed: boolean;
  result: { score: number; total: number; percent: number } | null;
}

interface Props {
  level: "a2" | "b1";
  type: ReadingType;
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
  onChooseAnotherType: () => void;
}

export default function ReadingSummary({ level, type, onBack, onLogout, expiresAt, onChooseAnotherType }: Props) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api-intro/reading/items?level=${level}&type=${type}`, { credentials: "include" });
        const data = await res.json();
        if (!cancelled && data.items) setItems(data.items);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [level, type]);

  const completedItems = items.filter((i) => i.result);
  const totalScore = completedItems.reduce((acc, i) => acc + (i.result?.score ?? 0), 0);
  const totalQuestions = completedItems.reduce((acc, i) => acc + (i.result?.total ?? 0), 0);
  const avgPercent = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  const isPerfect = totalQuestions > 0 && totalScore === totalQuestions;
  const allDone = items.length > 0 && completedItems.length === items.length;

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
          <span>Types</span>
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

      <main className="flex-1 px-4 py-8 flex flex-col items-center gap-6">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: VIOLET }} />
        ) : (
          <div className="w-full max-w-2xl flex flex-col gap-6">
            <div className="text-center space-y-3">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase"
                style={{ background: `rgba(167,139,250,0.14)`, border: `1px solid rgba(167,139,250,0.4)`, color: VIOLET }}
              >
                <BookOpen className="w-3 h-3" />
                <span>Hemingway · {level.toUpperCase()}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {allDone ? "Bucket complete" : "Bucket so far"}
              </h1>
              <p className="text-white/60 text-sm">
                {prettyType(type)}
              </p>
            </div>

            <div
              className="rounded-3xl p-8 flex flex-col items-center gap-4"
              style={{
                background: isPerfect ? "rgba(110,231,183,0.1)" : "rgba(167,139,250,0.08)",
                border: `1px solid ${isPerfect ? "rgba(110,231,183,0.4)" : "rgba(167,139,250,0.32)"}`,
              }}
            >
              <Trophy className="w-12 h-12" style={{ color: isPerfect ? SOFT_GREEN : YELLOW }} />
              <div className="text-center">
                <div className="text-5xl font-black text-white">{totalScore}<span className="text-2xl text-white/50"> / {totalQuestions}</span></div>
                <div className="text-sm font-bold mt-1" style={{ color: isPerfect ? SOFT_GREEN : VIOLET }}>
                  {avgPercent}% across {completedItems.length} of {items.length} passages
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40 mb-1">Per passage</div>
              {items.map((it, idx) => (
                <div key={it.slug} className="flex items-center justify-between py-2 border-t border-white/5 first:border-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: it.result ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.05)", color: it.result ? VIOLET : "rgba(255,255,255,0.3)" }}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-sm text-white/80">{it.title}</span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: it.result ? VIOLET : "rgba(255,255,255,0.3)" }}>
                    {it.result ? `${it.result.score}/${it.result.total}` : "—"}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onChooseAnotherType}
                className="flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: VIOLET, color: NAVY }}
              >
                <RotateCcw className="w-4 h-4" />
                Choose another type
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function prettyType(t: ReadingType): string {
  switch (t) {
    case "mcq": return "Multiple Choice";
    case "tfng": return "True / False / Not Given";
    case "ynng": return "Yes / No / Not Given";
    case "matching_headings": return "Matching Headings";
    case "matching_features": return "Matching Information";
    case "sentence_completion": return "Sentence Completion";
    case "note_completion": return "Note Completion";
    case "table_completion": return "Table Completion";
    case "flow_chart_completion": return "Flow Chart Completion";
    case "short_answer": return "Short Answer";
    default: return String(t);
  }
}
