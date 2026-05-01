import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LogOut, Play, Pause, Loader2, AlertCircle, Send, Volume2 } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";
import type { Attempt } from "./ListeningResult";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#0A1A30";
const GREEN = "#6EE7B7";

interface MCQQuestion {
  id: string;
  type: "mcq";
  prompt: string;
  options: string[];
}
interface MatchingQuestion {
  id: string;
  type: "matching";
  prompt: string;
  items: string[];
  options: string[];
}
interface CompletionQuestion {
  id: string;
  type: "note_completion" | "sentence_completion" | "short_answer";
  prompt: string;
  wordLimit: number;
  context?: string;
}
type Question = MCQQuestion | MatchingQuestion | CompletionQuestion;

interface TestPayload {
  id: string;
  sectionId: number;
  title: string;
  description: string;
  questions: Question[];
}

interface AudioSegment {
  voice: "alloy" | "nova";
  text: string;
  url: string;
}

interface Props {
  testId: string;
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
  onSubmitted: (attempt: Attempt, test: TestPayload) => void;
}

const TYPE_LABELS: Record<Question["type"], string> = {
  mcq: "Multiple choice",
  matching: "Matching",
  note_completion: "Note completion",
  sentence_completion: "Sentence completion",
  short_answer: "Short answer",
};

export default function ListeningPlayer({ testId, onBack, onLogout, expiresAt, onSubmitted }: Props) {
  const [test, setTest] = useState<TestPayload | null>(null);
  const [segments, setSegments] = useState<AudioSegment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api/churchill/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  // Fetch test
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/churchill/listening/tests/${testId}`, { credentials: "include" });
        const data = await res.json();
        if (!cancelled && res.ok) {
          if (data.alreadyCompleted && data.attempt) {
            onSubmitted(data.attempt, data.test);
            return;
          }
          setTest(data.test);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [testId, onSubmitted]);

  // Pre-fetch the audio manifest after test loads
  useEffect(() => {
    if (!test) return;
    let cancelled = false;
    setAudioLoading(true);
    setAudioError(null);
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/churchill/listening/tests/${test.id}/audio`, { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setAudioError(data.error || "Failed to load audio");
          return;
        }
        setSegments(data.segments);
      } catch {
        if (!cancelled) setAudioError("Failed to load audio");
      } finally {
        if (!cancelled) setAudioLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [test]);

  // Audio segment chaining — single-pass: play every segment once, then lock playback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !segments) return;
    const onEnded = () => {
      if (segmentIndex + 1 < segments.length) {
        setSegmentIndex((i) => i + 1);
      } else {
        setPlaying(false);
        setAudioFinished(true);
      }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [segments, segmentIndex]);

  // Update audio src only when the segment changes (not when play/pause toggles),
  // so pausing and resuming preserves position within a segment.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !segments || audioFinished) return;
    const seg = segments[segmentIndex];
    if (!seg) return;
    const nextSrc = `${BASE_URL}/api/storage/public-objects/${seg.url}`;
    if (audio.src !== nextSrc) {
      audio.src = nextSrc;
      // Auto-continue chaining: if we were mid-playback, keep playing the next segment.
      if (audioStarted && playing) {
        audio.play().catch(() => setPlaying(false));
      }
    }
    // `playing` and `audioStarted` are intentionally excluded so pause/resume does not reset audio.src.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, segments, audioFinished]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !segments || audioFinished) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setPlaying(true);
          setAudioStarted(true);
        })
        .catch(() => setPlaying(false));
    }
  };

  const setAnswer = (qid: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const allAnswered = test ? test.questions.every((q) => {
    const v = answers[q.id];
    if (q.type === "mcq") return typeof v === "number";
    if (q.type === "matching") return Array.isArray(v) && v.length === q.items.length && v.every((x) => typeof x === "number" && x >= 0);
    return typeof v === "string" && v.trim().length > 0;
  }) : false;

  const submit = async () => {
    if (!test) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/listening/tests/${test.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.attempt) {
          onSubmitted(data.attempt, test);
          return;
        }
        setSubmitError(data.error || "Failed to submit");
        return;
      }
      onSubmitted(data.attempt, test);
    } catch {
      setSubmitError("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <div className="text-white/60 text-sm">Test not found.</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 backdrop-blur-md"
        style={{ background: "rgba(10,26,48,0.85)", borderBottom: `1px solid rgba(110,231,183,0.18)` }}
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
            <div className="font-black text-white text-sm sm:text-base tracking-tight leading-tight truncate">{test.title}</div>
            <div className="text-[11px] font-semibold" style={{ color: GREEN }}>Section {test.sectionId} · {test.questions.length} questions</div>
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

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full pb-32">
        <div
          className="rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: `rgba(110,231,183,0.08)`, border: `1px solid rgba(110,231,183,0.25)` }}
        >
          <button
            onClick={togglePlay}
            disabled={!segments || audioLoading || !!audioError || audioFinished}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:scale-[1.02] disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(135deg, ${GREEN}, #4ade80)`, color: NAVY }}
          >
            {audioLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing audio…</span>
              </>
            ) : audioFinished ? (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Audio finished</span>
              </>
            ) : playing ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{audioStarted ? "Resume" : "Play audio"}</span>
              </>
            )}
          </button>
          <div className="flex-1 text-xs text-white/60 leading-relaxed">
            {audioError ? (
              <span className="flex items-center gap-2 text-red-300">
                <AlertCircle className="w-4 h-4" /> {audioError}
              </span>
            ) : segments ? (
              <>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5" style={{ color: GREEN }} />
                  <span className="font-semibold text-white">
                    {audioFinished
                      ? "Audio has ended — answer the questions below."
                      : "Listen carefully — the audio plays only once."}
                  </span>
                </div>
                <div className="mt-1">Segment {Math.min(segmentIndex + 1, segments.length)} of {segments.length}</div>
              </>
            ) : (
              <span>Audio is loading…</span>
            )}
          </div>
        </div>
        <audio ref={audioRef} preload="auto" />

        <div className="space-y-5">
          {test.questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={idx + 1}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          ))}
        </div>

        {submitError && (
          <div className="mt-6 p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            <AlertCircle className="w-4 h-4" />
            {submitError}
          </div>
        )}
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 py-4 backdrop-blur-md"
        style={{ background: "rgba(10,26,48,0.92)", borderTop: `1px solid rgba(110,231,183,0.2)` }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-white/55">
            <span className="font-bold text-white">{Object.keys(answers).length}</span> / {test.questions.length} answered
            {!allAnswered && <span className="ml-2 text-white/35">— answer all to submit</span>}
          </div>
          <button
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${GREEN}, #4ade80)`, color: NAVY }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {submitting ? "Submitting…" : "Submit answers"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  index,
  value,
  onChange,
}: {
  q: Question;
  index: number;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
          style={{ background: `rgba(110,231,183,0.18)`, color: GREEN, border: `1px solid rgba(110,231,183,0.35)` }}
        >
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: GREEN }}>
            {TYPE_LABELS[q.type]}
          </div>
          <p className="text-white text-sm sm:text-base font-medium leading-relaxed">{q.prompt}</p>
        </div>
      </div>

      <div className="mt-4 ml-0 sm:ml-11">
        {q.type === "mcq" && (
          <MCQInput options={q.options} value={value as number | undefined} onChange={(n) => onChange(n)} />
        )}
        {q.type === "matching" && (
          <MatchingInput
            items={q.items}
            options={q.options}
            value={value as number[] | undefined}
            onChange={(arr) => onChange(arr)}
          />
        )}
        {(q.type === "note_completion" || q.type === "sentence_completion" || q.type === "short_answer") && (
          <CompletionInput
            wordLimit={q.wordLimit}
            value={value as string | undefined}
            onChange={(s) => onChange(s)}
          />
        )}
      </div>
    </div>
  );
}

function MCQInput({ options, value, onChange }: { options: string[]; value?: number; onChange: (n: number) => void }) {
  return (
    <div className="grid gap-2">
      {options.map((opt, i) => {
        const selected = value === i;
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.005]"
            style={{
              background: selected ? `rgba(110,231,183,0.18)` : "rgba(255,255,255,0.04)",
              border: selected ? `1px solid ${GREEN}` : "1px solid rgba(255,255,255,0.10)",
              color: "white",
            }}
          >
            <span className="font-bold mr-2" style={{ color: selected ? GREEN : "rgba(255,255,255,0.5)" }}>
              {String.fromCharCode(65 + i)}.
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MatchingInput({
  items,
  options,
  value,
  onChange,
}: {
  items: string[];
  options: string[];
  value?: number[];
  onChange: (arr: number[]) => void;
}) {
  const cur: number[] = value && value.length === items.length ? [...value] : Array(items.length).fill(-1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="text-sm text-white sm:flex-1 min-w-0">
            <span className="text-white/40 font-bold mr-2">{i + 1}.</span>
            {item}
          </div>
          <select
            value={cur[i] === -1 ? "" : String(cur[i])}
            onChange={(e) => {
              const next = [...cur];
              next[i] = e.target.value === "" ? -1 : Number(e.target.value);
              onChange(next.map((n) => (Number.isFinite(n) ? n : -1)));
            }}
            className="text-sm rounded-lg px-3 py-2 outline-none w-full sm:w-auto"
            style={{ background: "rgba(0,0,0,0.4)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <option value="">Choose…</option>
            {options.map((opt, j) => (
              <option key={j} value={j}>
                {String.fromCharCode(65 + j)}. {opt}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

const WORD_NAMES = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE"];

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function clampToWordLimit(text: string, limit: number): string {
  // Allow trailing whitespace while typing the next word, but never accept more than `limit` whole words.
  const trailingSpace = /\s$/.test(text) ? " " : "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + trailingSpace;
}

function CompletionInput({ wordLimit, value, onChange }: { wordLimit: number; value?: string; onChange: (s: string) => void }) {
  const current = value ?? "";
  const wordsUsed = countWords(current);
  const limitName = WORD_NAMES[wordLimit] ?? String(wordLimit);
  const limitLabel = wordLimit === 1
    ? "ONE WORD ONLY"
    : `NO MORE THAN ${limitName} WORD${wordLimit > 1 ? "S" : ""}`;
  const atLimit = wordsUsed >= wordLimit;

  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: GREEN }}>
        {limitLabel}
      </div>
      <input
        type="text"
        value={current}
        onChange={(e) => onChange(clampToWordLimit(e.target.value, wordLimit))}
        onKeyDown={(e) => {
          // Block typing a new word once the limit is reached: prevent the space that would start word #(limit+1).
          if (e.key !== " " && e.key !== "Spacebar") return;
          const target = e.currentTarget;
          const before = target.value.slice(0, target.selectionStart ?? target.value.length);
          // If text before caret already ends in whitespace OR the trimmed prefix is empty, the space is non-productive — let the clamp handle it.
          if (/\s$/.test(before) || !before.trim()) return;
          if (countWords(target.value) >= wordLimit) {
            e.preventDefault();
          }
        }}
        placeholder={`Type your answer (max ${wordLimit} word${wordLimit > 1 ? "s" : ""})`}
        className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-1"
        style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${atLimit ? "rgba(110,231,183,0.5)" : "rgba(255,255,255,0.15)"}` }}
      />
      <div className="mt-1 text-[10px] text-white/40 font-semibold">
        {wordsUsed} / {wordLimit} word{wordLimit > 1 ? "s" : ""} used
      </div>
    </div>
  );
}
