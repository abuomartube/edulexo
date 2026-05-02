import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LogOut, ArrowLeft, Loader2, BookOpen,
  CheckCircle2, XCircle, Trophy, RotateCcw, Lock,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { canAccess } from "@/lib/tier";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#1E2155";
const VIOLET = "#A78BFA";
const SOFT_GREEN = "#6EE7B7";
const RED = "#F87171";
const YELLOW = "#F5C518";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReadingType =
  | "skimming" | "scanning" | "mcq" | "tfng" | "ynng"
  | "matching_headings" | "matching_features"
  | "sentence_completion" | "note_completion" | "table_completion"
  | "flow_chart_completion" | "short_answer";

interface TypeInfo { id: ReadingType; label: string; tagline: string }
interface LevelInfo { id: "a2" | "b1"; label: string; description: string }
interface Paragraph { label: string; text: string }
interface SubQuestion { id: string; prompt: string; mcqOptions?: string[] }
interface ReadingItemPublic {
  slug: string; level: "a2" | "b1"; type: ReadingType; title: string;
  instructions: string; passage: string; paragraphs: Paragraph[];
  options: string[]; questions: SubQuestion[];
}
interface PerSubResult {
  id: string; prompt: string; studentAnswer: unknown; correctAnswer: unknown;
  isCorrect: boolean; explanation: string;
}
interface Attempt {
  id: number; answers: Record<string, unknown>; score: number; total: number;
  percent: number; results: PerSubResult[]; createdAt: string;
}
interface ItemSummary {
  slug: string; title: string; questionCount: number;
  completed: boolean; result: { score: number; total: number; percent: number } | null;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem("4ielts_email");
    if (raw) {
      const { email, token } = JSON.parse(raw) as { email?: string; token?: string };
      if (email && token) return { "x-student-email": email, "x-student-token": token };
    }
    const introEmail = localStorage.getItem("lexo-ielts:intro_email");
    const introToken = localStorage.getItem("lexo-ielts:intro_token");
    if (introEmail && introToken) return { "x-student-email": introEmail, "x-student-token": introToken };
  } catch { /* ignore */ }
  return {};
}

// ── Stage types ───────────────────────────────────────────────────────────────

type Stage =
  | { kind: "level" }
  | { kind: "type"; level: "a2" | "b1" }
  | { kind: "player"; level: "a2" | "b1"; type: ReadingType }
  | { kind: "summary"; level: "a2" | "b1"; type: ReadingType };

// ── Helpers ───────────────────────────────────────────────────────────────────

const TFNG_OPTIONS = [
  { value: "true", label: "TRUE" },
  { value: "false", label: "FALSE" },
  { value: "ng", label: "NOT GIVEN" },
];
const YNNG_OPTIONS = [
  { value: "yes", label: "YES" },
  { value: "no", label: "NO" },
  { value: "ng", label: "NOT GIVEN" },
];

function prettyType(t: ReadingType): string {
  switch (t) {
    case "skimming": return "Skimming";
    case "scanning": return "Scanning";
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
  }
}

function toRoman(n: number): string {
  return ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][n - 1] ?? String(n);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntroReading() {
  const [stage, setStage] = useState<Stage>({ kind: "level" });

  // canAccess uses getTier() which reads lexo-ielts:tier and falls back to
  // detecting intro via lexo-ielts:intro_email, so no manual localStorage reads needed.
  const isEntitled = canAccess("reading");

  if (!isEntitled) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4 px-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Lock className="w-8 h-8 text-violet-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Not Included in Your Plan</h2>
          <p className="text-muted-foreground max-w-sm">
            Hemingway AI Reading is available in the Intro and Comprehensive plans.
          </p>
          <p className="text-muted-foreground/60 text-sm max-w-sm" dir="rtl" lang="ar">
            هذه الميزة متاحة في باقة المقدّمة أو الشاملة
          </p>
          <a
            href="https://wa.me/4ielts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
          >
            Upgrade Your Plan
          </a>
          <a
            href={BASE_URL + "/"}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-muted-foreground text-sm hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </a>
        </div>
      </Layout>
    );
  }

  const handleLogout = async () => {
    localStorage.removeItem("lexo-ielts:intro_email");
    localStorage.removeItem("lexo-ielts:intro_token");
    window.location.href = BASE_URL + "/";
  };

  if (stage.kind === "level") {
    return (
      <LevelPicker
        onChooseLevel={(level) => setStage({ kind: "type", level })}
        onLogout={handleLogout}
      />
    );
  }
  if (stage.kind === "type") {
    const { level } = stage;
    return (
      <TypePicker
        level={level}
        onBack={() => setStage({ kind: "level" })}
        onChooseType={(type) => setStage({ kind: "player", level, type })}
        onSeeSummary={(type) => setStage({ kind: "summary", level, type })}
        onLogout={handleLogout}
      />
    );
  }
  if (stage.kind === "player") {
    const { level, type } = stage;
    return (
      <ReadingPlayer
        level={level}
        type={type}
        onBack={() => setStage({ kind: "type", level })}
        onAllDone={() => setStage({ kind: "summary", level, type })}
        onLogout={handleLogout}
      />
    );
  }
  if (stage.kind === "summary") {
    const { level, type } = stage;
    return (
      <ReadingSummary
        level={level}
        type={type}
        onBack={() => setStage({ kind: "type", level })}
        onChooseAnotherType={() => setStage({ kind: "type", level })}
        onLogout={handleLogout}
      />
    );
  }
  return null;
}

// ── Level Picker ──────────────────────────────────────────────────────────────

function LevelPicker({
  onChooseLevel,
  onLogout,
}: {
  onChooseLevel: (level: "a2" | "b1") => void;
  onLogout: () => void;
}) {
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api-ielts/reading/levels-types`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!cancelled && data.levels) setLevels(data.levels);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #0d0a22 0%, ${NAVY} 50%, #1a1238 100%)` }}>
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid rgba(167,139,250,0.18)` }}>
        <a href={`${BASE_URL}/`} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-2 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </a>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-3 py-2 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-8">
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase" style={{ background: `rgba(167,139,250,0.14)`, border: `1px solid rgba(167,139,250,0.4)`, color: VIOLET }}>
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
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(167,139,250,0.25)` }}
              >
                <div className="inline-block self-start px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase mb-3" style={{ background: "rgba(167,139,250,0.18)", color: VIOLET }}>
                  {lv.id === "a2" ? "Elementary" : "Intermediate"}
                </div>
                <h2 className="text-2xl font-black text-white leading-tight mb-2">{lv.label}</h2>
                <p className="text-sm text-white/65 leading-relaxed mb-4">{lv.description}</p>
                <div className="mt-auto inline-flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: VIOLET }}>
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

// ── Type Picker ───────────────────────────────────────────────────────────────

function TypePicker({
  level, onBack, onChooseType, onSeeSummary, onLogout,
}: {
  level: "a2" | "b1";
  onBack: () => void;
  onChooseType: (type: ReadingType) => void;
  onSeeSummary: (type: ReadingType) => void;
  onLogout: () => void;
}) {
  const [types, setTypes] = useState<TypeInfo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [metaRes, attemptsRes] = await Promise.all([
        fetch(`${BASE_URL}/api-ielts/reading/levels-types`, { headers }),
        fetch(`${BASE_URL}/api-ielts/reading/attempts`, { headers }),
      ]);
      const meta = await metaRes.json();
      if (meta.types) setTypes(meta.types);
      if (meta.counts) setCounts(meta.counts);
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
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #0d0a22 0%, ${NAVY} 50%, #1a1238 100%)` }}>
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid rgba(167,139,250,0.18)` }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-2 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Levels</span>
        </button>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-3 py-2 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      <main className="flex-1 px-4 pt-6 pb-10 flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase" style={{ background: `rgba(167,139,250,0.14)`, border: `1px solid rgba(167,139,250,0.4)`, color: VIOLET }}>
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
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${allDone ? "rgba(110,231,183,0.4)" : "rgba(167,139,250,0.22)"}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-black text-white leading-tight">{t.label}</h3>
                    {allDone && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: SOFT_GREEN }} />}
                  </div>
                  <p className="text-xs text-white/55 leading-relaxed min-h-[32px]">{t.tagline}</p>
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-white/40 uppercase tracking-wider">Progress</span>
                      <span style={{ color: allDone ? SOFT_GREEN : VIOLET }}>{done}/{total || 5}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: total > 0 ? `${Math.min(100, (done / total) * 100)}%` : "0%", background: allDone ? SOFT_GREEN : VIOLET }} />
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

// ── Reading Player ────────────────────────────────────────────────────────────

function ReadingPlayer({
  level, type, onBack, onAllDone, onLogout,
}: {
  level: "a2" | "b1"; type: ReadingType;
  onBack: () => void; onAllDone: () => void; onLogout: () => void;
}) {
  const [item, setItem] = useState<ReadingItemPublic | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [bucketSlugs, setBucketSlugs] = useState<string[]>([]);
  const [bucketDoneSlugs, setBucketDoneSlugs] = useState<Set<string>>(new Set());
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api-ielts/reading/items?level=${level}&type=${type}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (cancelled) return;
        const list = (data.items ?? []) as ItemSummary[];
        setBucketSlugs(list.map((i) => i.slug));
        setBucketDoneSlugs(new Set(list.filter((i) => i.completed).map((i) => i.slug)));
        const next = list.find((i) => !i.completed)?.slug ?? list[0]?.slug ?? null;
        setActiveSlug(next);
      } catch {
        if (!cancelled) setError("Couldn't load the practice list.");
      }
    })();
    return () => { cancelled = true; };
  }, [level, type]);

  const loadItem = useCallback(async (s: string) => {
    setLoading(true);
    setError(null);
    setAttempt(null);
    setAnswers({});
    try {
      const res = await fetch(`${BASE_URL}/api-ielts/reading/items/${s}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't load this item.");
      } else {
        setItem(data.item);
        if (data.alreadyCompleted && data.attempt) {
          setAttempt(data.attempt);
          setAnswers(data.attempt.answers ?? {});
        }
      }
    } catch {
      setError("Couldn't load this item.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (activeSlug) loadItem(activeSlug); }, [activeSlug, loadItem]);

  const setAnswer = (qid: string, value: unknown) => setAnswers((prev) => ({ ...prev, [qid]: value }));

  const allFilled = useMemo(() => {
    if (!item) return false;
    return item.questions.every((q) => {
      const v = answers[q.id];
      return v !== undefined && v !== null && v !== "";
    });
  }, [item, answers]);

  const submit = async () => {
    if (!item || !activeSlug) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api-ielts/reading/items/${activeSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        setError(data.error ?? "Couldn't submit your answers.");
        setSubmitting(false);
        return;
      }
      const att = data.attempt as Attempt;
      setAttempt(att);
      setBucketDoneSlugs((prev) => { const next = new Set(prev); next.add(activeSlug); return next; });
    } catch {
      setError("Couldn't submit your answers.");
    } finally {
      setSubmitting(false);
    }
  };

  const goNextOrSummary = () => {
    if (!activeSlug || bucketSlugs.length === 0) return;
    const idx = bucketSlugs.indexOf(activeSlug);
    const nextSlug =
      bucketSlugs.slice(idx + 1).find((s) => !bucketDoneSlugs.has(s)) ??
      bucketSlugs.find((s) => !bucketDoneSlugs.has(s));
    if (!nextSlug) { onAllDone(); return; }
    setActiveSlug(nextSlug);
  };

  const positionLabel = activeSlug && bucketSlugs.length > 0
    ? `Item ${bucketSlugs.indexOf(activeSlug) + 1} of ${bucketSlugs.length}`
    : "";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #0d0a22 0%, ${NAVY} 50%, #1a1238 100%)` }}>
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ borderBottom: `1px solid rgba(167,139,250,0.18)`, background: "rgba(10,26,48,0.85)", backdropFilter: "blur(8px)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-2 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Types</span>
        </button>
        <div className="flex items-center gap-3">
          {positionLabel && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase" style={{ background: `rgba(167,139,250,0.14)`, border: `1px solid rgba(167,139,250,0.4)`, color: VIOLET }}>
              <BookOpen className="w-3 h-3" />
              <span>{positionLabel}</span>
            </div>
          )}
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-3 py-2 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col items-center">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: VIOLET }} />
          </div>
        ) : error ? (
          <div className="max-w-2xl w-full p-5 rounded-2xl text-sm text-red-300" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>{error}</div>
        ) : item ? (
          <ItemView
            item={item}
            answers={answers}
            setAnswer={setAnswer}
            attempt={attempt}
            allFilled={allFilled}
            submitting={submitting}
            onSubmit={submit}
            onNext={goNextOrSummary}
            isLastUnsolved={!!activeSlug && bucketSlugs.length > 0 && new Set([...bucketDoneSlugs, activeSlug]).size === bucketSlugs.length}
          />
        ) : null}
      </main>
    </div>
  );
}

function ItemView({
  item, answers, setAnswer, attempt, allFilled, submitting, onSubmit, onNext, isLastUnsolved,
}: {
  item: ReadingItemPublic; answers: Record<string, unknown>;
  setAnswer: (qid: string, v: unknown) => void; attempt: Attempt | null;
  allFilled: boolean; submitting: boolean;
  onSubmit: () => void; onNext: () => void; isLastUnsolved: boolean;
}) {
  const locked = !!attempt;
  const resultsById = useMemo(() => {
    const m = new Map<string, PerSubResult>();
    if (attempt?.results) for (const r of attempt.results) m.set(r.id, r);
    return m;
  }, [attempt]);

  return (
    <div className="w-full max-w-3xl flex flex-col gap-5">
      <div className="space-y-1.5">
        <div className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: VIOLET }}>
          {item.level.toUpperCase()} · {prettyType(item.type)}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{item.title}</h1>
        <p className="text-xs text-white/55 leading-relaxed">{item.instructions}</p>
      </div>

      <PassageBlock item={item} />

      {(item.type === "matching_headings" || item.type === "matching_features") && item.options.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(167,139,250,0.06)", border: `1px solid rgba(167,139,250,0.25)` }}>
          <div className="text-[10px] font-black tracking-[0.2em] uppercase mb-2" style={{ color: VIOLET }}>
            {item.type === "matching_headings" ? "Headings" : "Items"}
          </div>
          <ul className="space-y-1 text-sm text-white/85">
            {item.options.map((opt, i) => (
              <li key={i}><span className="font-bold" style={{ color: VIOLET }}>{toRoman(i + 1)}.</span> {opt}</li>
            ))}
          </ul>
        </div>
      )}

      {attempt && <ResultBanner attempt={attempt} />}

      <div className="flex flex-col gap-3">
        {item.questions.map((q, idx) => {
          const r = resultsById.get(q.id);
          return (
            <QuestionCard
              key={q.id} index={idx + 1} item={item} sub={q}
              value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)}
              locked={locked} result={r}
            />
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-4 px-4 py-4 flex items-center gap-3 justify-end" style={{ background: `linear-gradient(180deg, transparent, ${NAVY} 30%)` }}>
        {!attempt ? (
          <button
            onClick={onSubmit}
            disabled={!allFilled || submitting}
            className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
            style={{ background: VIOLET, color: NAVY }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? "Checking..." : "Check answers"}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-opacity hover:opacity-90 flex items-center gap-2"
            style={{ background: VIOLET, color: NAVY }}
          >
            {isLastUnsolved ? <Trophy className="w-4 h-4" /> : null}
            {isLastUnsolved ? "See bucket summary" : "Next item →"}
          </button>
        )}
      </div>
    </div>
  );
}

function PassageBlock({ item }: { item: ReadingItemPublic }) {
  if (item.type === "matching_headings" && item.paragraphs.length > 0) {
    return (
      <div className="rounded-2xl p-5 space-y-4 text-[15px] leading-relaxed text-white/85" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(167,139,250,0.18)` }}>
        {item.paragraphs.map((p) => (
          <p key={p.label}><span className="font-black mr-2" style={{ color: VIOLET }}>{p.label}.</span>{p.text}</p>
        ))}
      </div>
    );
  }
  if (!item.passage) return null;
  return (
    <div className="rounded-2xl p-5 text-[15px] leading-relaxed text-white/85 whitespace-pre-line" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(167,139,250,0.18)` }}>
      {item.passage}
    </div>
  );
}

function ResultBanner({ attempt }: { attempt: Attempt }) {
  const isPerfect = attempt.score === attempt.total;
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: isPerfect ? "rgba(110,231,183,0.1)" : "rgba(167,139,250,0.1)", border: `1px solid ${isPerfect ? "rgba(110,231,183,0.4)" : "rgba(167,139,250,0.35)"}` }}>
      {isPerfect ? <Trophy className="w-5 h-5 shrink-0" style={{ color: SOFT_GREEN }} /> : <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: VIOLET }} />}
      <div className="flex-1">
        <div className="text-sm font-bold text-white">{attempt.score} / {attempt.total} correct ({attempt.percent}%)</div>
        <div className="text-xs text-white/55">Review your answers below, then continue to the next passage.</div>
      </div>
    </div>
  );
}

function QuestionCard({
  index, item, sub, value, onChange, locked, result,
}: {
  index: number; item: ReadingItemPublic; sub: SubQuestion;
  value: unknown; onChange: (v: unknown) => void; locked: boolean; result?: PerSubResult;
}) {
  const borderColor = result ? (result.isCorrect ? "rgba(110,231,183,0.45)" : "rgba(248,113,113,0.45)") : "rgba(167,139,250,0.22)";
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${borderColor}` }}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: result ? (result.isCorrect ? "rgba(110,231,183,0.18)" : "rgba(248,113,113,0.18)") : "rgba(167,139,250,0.14)", color: result ? (result.isCorrect ? SOFT_GREEN : RED) : VIOLET }}>
          {index}
        </div>
        <div className="flex-1 text-sm text-white/85 leading-relaxed">{sub.prompt}</div>
        {result && (result.isCorrect ? <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: SOFT_GREEN }} /> : <XCircle className="w-5 h-5 shrink-0" style={{ color: RED }} />)}
      </div>
      <div className="pl-10">
        <QuestionInput item={item} sub={sub} value={value} onChange={onChange} locked={locked} />
      </div>
      {result && (
        <div className="ml-10 rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {!result.isCorrect && (
            <div className="text-white/85 mb-1">
              <span className="font-bold" style={{ color: SOFT_GREEN }}>Correct:</span>{" "}{String(result.correctAnswer)}
            </div>
          )}
          <div className="text-white/65"><span className="font-bold" style={{ color: YELLOW }}>Why:</span> {result.explanation}</div>
        </div>
      )}
    </div>
  );
}

function QuestionInput({
  item, sub, value, onChange, locked,
}: {
  item: ReadingItemPublic; sub: SubQuestion;
  value: unknown; onChange: (v: unknown) => void; locked: boolean;
}) {
  if ((item.type === "mcq" || item.type === "skimming" || item.type === "scanning") && sub.mcqOptions) {
    return (
      <RadioGroup
        options={sub.mcqOptions.map((opt, i) => ({ value: i, label: opt, prefix: String.fromCharCode(65 + i) }))}
        value={value} onChange={onChange} locked={locked}
      />
    );
  }
  if (item.type === "tfng") {
    return <RadioGroup options={TFNG_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={value} onChange={onChange} locked={locked} compact />;
  }
  if (item.type === "ynng") {
    return <RadioGroup options={YNNG_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={value} onChange={onChange} locked={locked} compact />;
  }
  if (item.type === "matching_headings" || item.type === "matching_features") {
    const stringValue = value === undefined || value === null || value === "" ? "" : String(value);
    return (
      <select
        value={stringValue}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        disabled={locked}
        className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none disabled:opacity-70"
        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid rgba(167,139,250,0.3)` }}
      >
        <option value="" style={{ background: NAVY }}>— select —</option>
        {item.options.map((opt, i) => (
          <option key={i} value={i} style={{ background: NAVY }}>{toRoman(i + 1)}. {opt}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={locked}
      placeholder="Your answer..."
      className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-white/25 disabled:opacity-70"
      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid rgba(167,139,250,0.3)` }}
    />
  );
}

function RadioGroup({
  options, value, onChange, locked, compact,
}: {
  options: { value: string | number; label: string; prefix?: string }[];
  value: unknown; onChange: (v: string | number) => void; locked: boolean; compact?: boolean;
}) {
  return (
    <div className={compact ? "flex gap-2 flex-wrap" : "space-y-2"}>
      {options.map((opt) => {
        const selected = value !== undefined && value !== null && String(value) === String(opt.value);
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={locked}
            onClick={() => onChange(opt.value)}
            className={`text-left rounded-xl transition-all disabled:cursor-not-allowed ${compact ? "px-3 py-2 text-xs font-bold" : "w-full px-3 py-2.5 text-sm flex items-start gap-2"}`}
            style={{ background: selected ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${selected ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.1)"}`, color: selected ? "#fff" : "rgba(255,255,255,0.75)" }}
          >
            {opt.prefix && <span className="font-black mr-1" style={{ color: VIOLET }}>{opt.prefix}.</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Reading Summary ───────────────────────────────────────────────────────────

function ReadingSummary({
  level, type, onBack, onChooseAnotherType, onLogout,
}: {
  level: "a2" | "b1"; type: ReadingType;
  onBack: () => void; onChooseAnotherType: () => void; onLogout: () => void;
}) {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api-ielts/reading/items?level=${level}&type=${type}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!cancelled && data.items) setItems(data.items);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [level, type]);

  const completedItems = items.filter((i) => i.result);
  const totalScore = completedItems.reduce((acc, i) => acc + (i.result?.score ?? 0), 0);
  const totalQuestions = completedItems.reduce((acc, i) => acc + (i.result?.total ?? 0), 0);
  const avgPercent = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  const isPerfect = totalQuestions > 0 && totalScore === totalQuestions;
  const allDone = items.length > 0 && completedItems.length === items.length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #0d0a22 0%, ${NAVY} 50%, #1a1238 100%)` }}>
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid rgba(167,139,250,0.18)` }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-2 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Types</span>
        </button>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-3 py-2 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      <main className="flex-1 px-4 py-8 flex flex-col items-center gap-6">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: VIOLET }} />
        ) : (
          <div className="w-full max-w-2xl flex flex-col gap-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase" style={{ background: `rgba(167,139,250,0.14)`, border: `1px solid rgba(167,139,250,0.4)`, color: VIOLET }}>
                <BookOpen className="w-3 h-3" />
                <span>Hemingway · {level.toUpperCase()}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {allDone ? "Bucket complete" : "Bucket so far"}
              </h1>
              <p className="text-white/60 text-sm">{prettyType(type)}</p>
            </div>

            <div className="rounded-3xl p-8 flex flex-col items-center gap-4" style={{ background: isPerfect ? "rgba(110,231,183,0.1)" : "rgba(167,139,250,0.08)", border: `1px solid ${isPerfect ? "rgba(110,231,183,0.4)" : "rgba(167,139,250,0.32)"}` }}>
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
                    <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: it.result ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.05)", color: it.result ? VIOLET : "rgba(255,255,255,0.3)" }}>
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
