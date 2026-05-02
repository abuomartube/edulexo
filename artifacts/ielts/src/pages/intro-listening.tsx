import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Play, Pause, Loader2, AlertCircle, Send, Volume2,
  CheckCircle, Lock, ChevronRight, Eye, CheckCircle2, XCircle, Sparkles, RotateCw,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { canAccess } from "@/lib/tier";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const GREEN = "#6EE7B7";
const NAVY = "#1E2155";

function getAuthHeaders(): Record<string, string> {
  try {
    const email = localStorage.getItem("lexo-ielts:intro_email");
    const token = localStorage.getItem("lexo-ielts:intro_token");
    if (email && token) return { "x-student-email": email, "x-student-token": token };
    const raw = localStorage.getItem("4ielts_email");
    if (raw) {
      const { email: e, token: t } = JSON.parse(raw) as { email?: string; token?: string };
      if (e && t) return { "x-student-email": e, "x-student-token": t };
    }
  } catch { /* */ }
  return {};
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Section { id: number; title: string; description: string }
interface TestSummary {
  id: string; sectionId: number; title: string; description: string;
  questionCount: number; completed: boolean;
  result: { score: number; total: number; percent: number } | null;
}
interface MCQQuestion { id: string; type: "mcq"; prompt: string; options: string[] }
interface MatchingQuestion { id: string; type: "matching"; prompt: string; items: string[]; options: string[] }
interface CompletionQuestion { id: string; type: "note_completion" | "sentence_completion" | "short_answer"; prompt: string; wordLimit: number; context?: string }
type Question = MCQQuestion | MatchingQuestion | CompletionQuestion;
interface TestPayload { id: string; sectionId: number; title: string; description: string; questions: Question[] }
interface AudioSegment { voice: "alloy" | "nova"; text: string; url: string }
interface AttemptResult {
  id?: string; type: string; prompt: string; studentAnswer: unknown; correctAnswer: unknown;
  isCorrect: boolean; points: number; maxPoints: number;
}
interface Attempt {
  id: number; answers: Record<string, unknown>; score: number; total: number;
  percent: number; results: AttemptResult[]; analysis: string;
}

const TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple choice", matching: "Matching",
  note_completion: "Note completion", sentence_completion: "Sentence completion", short_answer: "Short answer",
};
const WORD_NAMES = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE"];

// ── Stage machine ──────────────────────────────────────────────────────────────
type Stage =
  | { kind: "section-list"; sections: Section[]; tests: TestSummary[] }
  | { kind: "test-list"; sectionId: number; sections: Section[]; tests: TestSummary[] }
  | { kind: "player"; test: TestPayload; prefetchedAttempt?: Attempt }
  | { kind: "result"; attempt: Attempt; test: TestPayload };

export default function IntroListening() {
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<Stage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cachedDataRef = useRef<{ sections: Section[]; tests: TestSummary[] } | null>(null);

  // canAccess uses getTier() which reads lexo-ielts:tier and falls back to
  // detecting intro via lexo-ielts:intro_email, so no manual localStorage reads needed.
  const isEntitled = canAccess("listening");

  useEffect(() => {
    if (!isEntitled) return;
    void loadSections();
  }, [isEntitled]);

  async function loadSections() {
    setLoadError(null);
    try {
      const res = await fetch(`${BASE_URL}/api-ielts/listening/tests`, { headers: getAuthHeaders() });
      const data = await res.json() as { sections: Section[]; tests: TestSummary[] };
      if (!res.ok) throw new Error("Failed to load");
      cachedDataRef.current = { sections: data.sections, tests: data.tests };
      setStage({ kind: "section-list", sections: data.sections, tests: data.tests });
    } catch {
      setLoadError("Could not load listening tests. Please try again.");
    }
  }

  if (!isEntitled) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4 px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Not Included in Your Plan</h2>
          <p className="text-muted-foreground max-w-sm">
            Attenborough AI Listening is available in the Intro and Comprehensive plans.
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
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-muted-foreground text-sm hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>
        </div>
      </Layout>
    );
  }

  if (!stage) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <button onClick={() => void loadSections()} className="text-primary text-sm hover:underline">Retry</button>
            </div>
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          )}
        </div>
      </Layout>
    );
  }

  if (stage.kind === "result") {
    return (
      <Layout>
        <ResultView
          attempt={stage.attempt}
          test={stage.test}
          onBack={() => {
            const cached = cachedDataRef.current;
            if (cached) {
              setStage({ kind: "test-list", sectionId: stage.test.sectionId, sections: cached.sections, tests: cached.tests });
            } else {
              void loadSections();
            }
          }}
          onReload={loadSections}
        />
      </Layout>
    );
  }

  if (stage.kind === "player") {
    return (
      <Layout>
        <PlayerView
          test={stage.test}
          prefetchedAttempt={stage.prefetchedAttempt}
          onBack={() => void loadSections()}
          onSubmitted={(attempt) => setStage({ kind: "result", attempt, test: stage.test })}
        />
      </Layout>
    );
  }

  if (stage.kind === "test-list") {
    const section = [...(stage.sections)].find((s) => s.id === stage.sectionId) ??
      { id: stage.sectionId, title: `Section ${stage.sectionId}`, description: "" };
    const tests = stage.tests.filter((t) => t.sectionId === stage.sectionId);
    return (
      <Layout>
        <TestListView
          section={section}
          tests={tests}
          onBack={() => void loadSections()}
          onChooseTest={(testId, mode) => void loadTest(testId, mode)}
        />
      </Layout>
    );
  }

  // Section list
  const sections = stage.sections;
  const tests = stage.tests;
  return (
    <Layout>
      <SectionListView
        sections={sections}
        tests={tests}
        onBack={() => navigate("/")}
        onChooseSection={(id) => setStage({ kind: "test-list", sectionId: id, sections, tests })}
      />
    </Layout>
  );

  async function loadTest(testId: string, mode: "take" | "review") {
    try {
      const res = await fetch(`${BASE_URL}/api-ielts/listening/tests/${testId}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        setLoadError("Could not load test. Please try again.");
        return;
      }
      const data = await res.json() as {
        test: TestPayload; alreadyCompleted?: boolean;
        attempt?: Attempt;
      };
      if (mode === "review" || data.alreadyCompleted) {
        if (data.attempt && data.test) {
          setStage({ kind: "result", attempt: data.attempt, test: data.test });
        }
      } else {
        if (data.test) {
          setStage({ kind: "player", test: data.test, prefetchedAttempt: data.attempt });
        }
      }
    } catch {
      setLoadError("Could not load test. Please try again.");
    }
  }
}

// ── Section List ──────────────────────────────────────────────────────────────

function SectionListView({
  sections, tests, onBack, onChooseSection,
}: { sections: Section[]; tests: TestSummary[]; onBack: () => void; onChooseSection: (id: number) => void }) {
  const sectionStats = (id: number) => {
    const ts = tests.filter((t) => t.sectionId === id);
    return { total: ts.length, done: ts.filter((t) => t.completed).length };
  };
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Attenborough AI</h1>
          <p className="text-sm text-muted-foreground">A2 Listening Tests · 4 sections</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((sec) => {
          const { total, done } = sectionStats(sec.id);
          return (
            <button
              key={sec.id}
              onClick={() => onChooseSection(sec.id)}
              className="group bg-card border border-border hover:border-primary/30 rounded-2xl p-5 text-left transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-extrabold text-primary">{sec.id}</span>
                </div>
                <div className="text-xs font-semibold text-muted-foreground mt-1">
                  {done}/{total} done
                </div>
              </div>
              <h3 className="font-bold text-foreground mb-1">{sec.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{sec.description}</p>
              <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Test List ─────────────────────────────────────────────────────────────────

function TestListView({
  section, tests, onBack, onChooseTest,
}: { section: Section; tests: TestSummary[]; onBack: () => void; onChooseTest: (id: string, mode: "take" | "review") => void }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{section.title}</h1>
          <p className="text-sm text-muted-foreground">{section.description}</p>
        </div>
      </div>
      {tests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <Volume2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No tests available yet for this section.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <div
              key={t.id}
              className="group bg-card border border-border hover:border-primary/30 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {t.completed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="font-bold text-foreground">{t.title}</span>
                    {t.result && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        {t.result.percent}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.questionCount} questions</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {t.completed ? (
                    <button
                      onClick={() => onChooseTest(t.id, "review")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                  ) : (
                    <button
                      onClick={() => onChooseTest(t.id, "take")}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> Start
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Player View ───────────────────────────────────────────────────────────────

function PlayerView({
  test, prefetchedAttempt, onBack, onSubmitted,
}: { test: TestPayload; prefetchedAttempt?: Attempt; onBack: () => void; onSubmitted: (a: Attempt) => void }) {
  const [segments, setSegments] = useState<AudioSegment[] | null>(null);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (prefetchedAttempt) { onSubmitted(prefetchedAttempt); return; }
    let cancelled = false;
    setAudioLoading(true);
    setAudioError(null);
    void (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api-ielts/listening/tests/${test.id}/audio`, { headers: getAuthHeaders() });
        const data = await res.json() as { segments: AudioSegment[]; error?: string };
        if (!cancelled && res.ok) setSegments(data.segments);
        else if (!cancelled) setAudioError(data.error ?? "Failed to load audio");
      } catch {
        if (!cancelled) setAudioError("Failed to load audio");
      } finally {
        if (!cancelled) setAudioLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [test.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !segments) return;
    const onEnded = () => {
      if (segmentIndex + 1 < segments.length) setSegmentIndex((i) => i + 1);
      else { setPlaying(false); setAudioFinished(true); }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [segments, segmentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !segments || audioFinished) return;
    const seg = segments[segmentIndex];
    if (!seg) return;
    const nextSrc = `${BASE_URL}/api-ielts/listening/storage/public-objects/${seg.url}`;
    if (audio.src !== nextSrc) {
      audio.src = nextSrc;
      if (audioStarted && playing) audio.play().catch(() => setPlaying(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, segments, audioFinished]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !segments || audioFinished) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else {
      audio.play().then(() => { setPlaying(true); setAudioStarted(true); }).catch(() => setPlaying(false));
    }
  };

  const setAnswer = (qid: string, value: unknown) => setAnswers((prev) => ({ ...prev, [qid]: value }));

  const allAnswered = test.questions.every((q) => {
    const v = answers[q.id];
    if (q.type === "mcq") return typeof v === "number";
    if (q.type === "matching") return Array.isArray(v) && (v as unknown[]).length === q.items.length && (v as unknown[]).every((x) => typeof x === "number" && (x as number) >= 0);
    return typeof v === "string" && (v as string).trim().length > 0;
  });

  const submit = async () => {
    setSubmitting(true); setSubmitError(null);
    try {
      const res = await fetch(`${BASE_URL}/api-ielts/listening/tests/${test.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json() as { attempt?: Attempt; error?: string };
      if (!res.ok) {
        if (res.status === 409 && data.attempt) { onSubmitted(data.attempt); return; }
        setSubmitError(data.error ?? "Failed to submit");
        return;
      }
      if (data.attempt) onSubmitted(data.attempt);
    } catch { setSubmitError("Failed to submit"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border py-3 -mx-4 px-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground text-sm truncate">{test.title}</p>
          <p className="text-xs text-muted-foreground">Section {test.sectionId} · {test.questions.length} questions</p>
        </div>
      </div>

      {/* Audio player card */}
      <div className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-border">
        <button
          onClick={togglePlay}
          disabled={!segments || audioLoading || !!audioError || audioFinished}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:scale-[1.02] disabled:cursor-not-allowed bg-primary text-primary-foreground shrink-0"
        >
          {audioLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Preparing audio…</span></>
            : audioFinished ? <><Volume2 className="w-4 h-4" /><span>Audio finished</span></>
            : playing ? <><Pause className="w-4 h-4 fill-current" /><span>Pause</span></>
            : <><Play className="w-4 h-4 fill-current" /><span>{audioStarted ? "Resume" : "Play audio"}</span></>}
        </button>
        <div className="flex-1 text-xs text-muted-foreground leading-relaxed">
          {audioError ? (
            <span className="flex items-center gap-2 text-red-500"><AlertCircle className="w-4 h-4" /> {audioError}</span>
          ) : segments ? (
            <>
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-foreground">
                  {audioFinished ? "Audio has ended — answer the questions below." : "Listen carefully — the audio plays only once."}
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

      {/* Questions */}
      <div className="space-y-4">
        {test.questions.map((q, idx) => (
          <QuestionCard key={q.id} q={q} index={idx + 1} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
        ))}
      </div>

      {submitError && (
        <div className="p-3 rounded-xl text-sm flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" /> {submitError}
        </div>
      )}

      {/* Submit footer */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-border -mx-4 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{Object.keys(answers).length}</span> / {test.questions.length} answered
          {!allAnswered && <span className="ml-2">— answer all to submit</span>}
        </div>
        <button
          onClick={() => void submit()}
          disabled={!allAnswered || submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:scale-[1.02] bg-primary text-primary-foreground"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {submitting ? "Submitting…" : "Submit answers"}
        </button>
      </div>
    </div>
  );
}

// ── Question cards ─────────────────────────────────────────────────────────────

function QuestionCard({ q, index, value, onChange }: { q: Question; index: number; value: unknown; onChange: (v: unknown) => void }) {
  return (
    <div className="rounded-2xl p-4 sm:p-5 bg-card border border-border">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 bg-primary/10 text-primary">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-primary mb-1">{TYPE_LABELS[q.type]}</div>
          <p className="text-foreground text-sm sm:text-base font-medium leading-relaxed">{q.prompt}</p>
        </div>
      </div>
      <div className="mt-4 ml-0 sm:ml-11">
        {q.type === "mcq" && <MCQInput options={q.options} value={value as number | undefined} onChange={(n) => onChange(n)} />}
        {q.type === "matching" && <MatchingInput items={q.items} options={q.options} value={value as number[] | undefined} onChange={(arr) => onChange(arr)} />}
        {(q.type === "note_completion" || q.type === "sentence_completion" || q.type === "short_answer") && (
          <CompletionInput wordLimit={q.wordLimit} value={value as string | undefined} onChange={(s) => onChange(s)} />
        )}
      </div>
    </div>
  );
}

function MCQInput({ options, value, onChange }: { options: string[]; value?: number; onChange: (n: number) => void }) {
  return (
    <div className="grid gap-2">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.005] border"
          style={{
            background: value === i ? "rgba(var(--primary-rgb, 99 102 241) / 0.08)" : undefined,
            borderColor: value === i ? "rgb(var(--primary-rgb, 99 102 241) / 1)" : undefined,
          }}
        >
          <span className={`font-bold mr-2 ${value === i ? "text-primary" : "text-muted-foreground"}`}>{String.fromCharCode(65 + i)}.</span>
          {opt}
        </button>
      ))}
    </div>
  );
}

function MatchingInput({ items, options, value, onChange }: { items: string[]; options: string[]; value?: number[]; onChange: (arr: number[]) => void }) {
  const cur: number[] = value && value.length === items.length ? [...value] : Array(items.length).fill(-1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border">
          <div className="text-sm text-foreground sm:flex-1 min-w-0">
            <span className="text-muted-foreground font-bold mr-2">{i + 1}.</span>{item}
          </div>
          <select
            value={cur[i] === -1 ? "" : String(cur[i])}
            onChange={(e) => {
              const next = [...cur];
              next[i] = e.target.value === "" ? -1 : Number(e.target.value);
              onChange(next);
            }}
            className="text-sm rounded-lg px-3 py-2 border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
          >
            <option value="">Choose…</option>
            {options.map((opt, j) => <option key={j} value={j}>{String.fromCharCode(65 + j)}. {opt}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function countWords(text: string): number {
  const t = text.trim(); return t ? t.split(/\s+/).length : 0;
}
function clampToWordLimit(text: string, limit: number): string {
  const trailing = /\s$/.test(text) ? " " : "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length <= limit ? text : words.slice(0, limit).join(" ") + trailing;
}

function CompletionInput({ wordLimit, value, onChange }: { wordLimit: number; value?: string; onChange: (s: string) => void }) {
  const current = value ?? "";
  const wordsUsed = countWords(current);
  const limitName = WORD_NAMES[wordLimit] ?? String(wordLimit);
  const limitLabel = wordLimit === 1 ? "ONE WORD ONLY" : `NO MORE THAN ${limitName} WORD${wordLimit > 1 ? "S" : ""}`;
  const atLimit = wordsUsed >= wordLimit;
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-primary">{limitLabel}</div>
      <input
        type="text"
        value={current}
        onChange={(e) => onChange(clampToWordLimit(e.target.value, wordLimit))}
        onKeyDown={(e) => {
          if (e.key !== " " && e.key !== "Spacebar") return;
          const target = e.currentTarget;
          const before = target.value.slice(0, target.selectionStart ?? target.value.length);
          if (/\s$/.test(before) || !before.trim()) return;
          if (countWords(target.value) >= wordLimit) e.preventDefault();
        }}
        placeholder={`Max ${wordLimit} word${wordLimit > 1 ? "s" : ""}`}
        className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
        style={{ borderColor: atLimit ? "rgb(var(--primary-rgb, 99 102 241) / 0.7)" : undefined }}
      />
      <div className="mt-1 text-[10px] text-muted-foreground font-semibold">
        {wordsUsed} / {wordLimit} word{wordLimit > 1 ? "s" : ""} used
      </div>
    </div>
  );
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({ attempt, test, onBack, onReload }: { attempt: Attempt; test: TestPayload; onBack: () => void; onReload: () => void }) {
  const band = attempt.percent >= 80 ? "Great" : attempt.percent >= 60 ? "Good" : attempt.percent >= 40 ? "Okay" : "Keep practising";
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="font-bold text-foreground">{test.title} · Result</p>
          <p className="text-xs text-muted-foreground">Section {test.sectionId}</p>
        </div>
      </div>

      {/* Score card */}
      <div className="rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5 bg-card border border-border">
        <div className="flex flex-col items-center justify-center w-28 h-28 rounded-3xl shrink-0 bg-primary/10 border-2 border-primary">
          <div className="text-3xl font-black text-primary">{attempt.percent}%</div>
          <div className="text-xs text-muted-foreground">{attempt.score}/{attempt.total}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-primary">Result</div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">{band}!</h1>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{attempt.analysis}</p>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Question by question</h2>
      </div>
      <div className="space-y-3">
        {attempt.results.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 border"
            style={{
              background: r.isCorrect ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.04)",
              borderColor: r.isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                style={{
                  background: r.isCorrect ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)",
                  color: r.isCorrect ? "rgb(16,185,129)" : "#fca5a5",
                }}
              >{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: r.isCorrect ? "rgb(16,185,129)" : "#fca5a5" }}>
                    {TYPE_LABELS[r.type] ?? r.type}
                  </span>
                  {r.isCorrect
                    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Correct</span>
                    : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400"><XCircle className="w-3.5 h-3.5" /> Wrong</span>}
                </div>
                <p className="text-foreground text-sm font-medium leading-relaxed mt-1">{r.prompt}</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-2">
                  <div className="rounded-xl p-3 bg-muted/40 border border-border">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your answer</div>
                    <div className="text-sm text-foreground mt-1">{formatAnswer(r.studentAnswer)}</div>
                  </div>
                  <div className="rounded-xl p-3 border" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.25)" }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Correct answer</div>
                    <div className="text-sm text-foreground mt-1">{formatAnswer(r.correctAnswer)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onReload}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] bg-primary text-primary-foreground"
        >
          <RotateCw className="w-4 h-4" /> Try another test
        </button>
      </div>
    </div>
  );
}

function formatAnswer(a: unknown): string {
  if (a === null || a === undefined) return "—";
  if (Array.isArray(a)) return (a as unknown[]).map((x) => (typeof x === "string" ? x : String(x))).join(" · ");
  return String(a);
}
