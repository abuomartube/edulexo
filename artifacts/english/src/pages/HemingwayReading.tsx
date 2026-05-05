import { useState, useEffect, useCallback } from "react";
import { useT, useLanguage } from "@/lib/i18n";
import type { EnglishEnrollment } from "@/lib/api";
import {
  ArrowLeft,
  Lock,
  Loader2,
  AlertCircle,
  RotateCcw,
  BookOpenCheck,
  CheckCircle2,
  XCircle,
  BookOpen,
  Lightbulb,
  FileText,
  Sparkles,
  Link2,
} from "lucide-react";

type CefrLevel = "A1" | "A2" | "B1" | "B1+" | "B2" | "C1";
type Stage = "level" | "topic" | "exercise" | "results";

const ALL_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B1+", "B2", "C1"];
const BEGINNER_LEVELS: CefrLevel[] = ["A1", "A2", "B1"];
const INTERMEDIATE_LEVELS: CefrLevel[] = ["B1+", "B2", "C1"];

function getActiveTiers(enrollments: EnglishEnrollment[]): string[] {
  const active = enrollments.filter((e) => e.isActive);
  return [...new Set(active.map((e) => e.tier))];
}

function canAccessLevel(activeTiers: string[], level: CefrLevel): boolean {
  if (activeTiers.includes("advanced")) return true;
  if (activeTiers.includes("beginner") && BEGINNER_LEVELS.includes(level)) return true;
  if (activeTiers.includes("intermediate") && INTERMEDIATE_LEVELS.includes(level)) return true;
  return false;
}

const LEVEL_COLORS: Record<CefrLevel, { gradient: string; glow: string }> = {
  A1: { gradient: "from-emerald-500 to-green-600", glow: "rgba(16,185,129,0.3)" },
  A2: { gradient: "from-teal-500 to-cyan-600", glow: "rgba(20,184,166,0.3)" },
  B1: { gradient: "from-sky-500 to-blue-600", glow: "rgba(14,165,233,0.3)" },
  "B1+": { gradient: "from-violet-500 to-purple-600", glow: "rgba(139,92,246,0.3)" },
  B2: { gradient: "from-fuchsia-500 to-pink-600", glow: "rgba(217,70,239,0.3)" },
  C1: { gradient: "from-amber-500 to-orange-600", glow: "rgba(245,158,11,0.3)" },
};

const LEVEL_DESCRIPTIONS: Record<CefrLevel, { en: string; ar: string }> = {
  A1: { en: "Absolute beginner", ar: "مبتدئ تمامًا" },
  A2: { en: "Elementary", ar: "أساسي" },
  B1: { en: "Pre-intermediate", ar: "ما قبل المتوسط" },
  "B1+": { en: "Intermediate", ar: "متوسط" },
  B2: { en: "Upper-intermediate", ar: "فوق المتوسط" },
  C1: { en: "Proficient", ar: "متقدم" },
};

interface MatchPair {
  left: string;
  right: string;
}

interface Question {
  type: "mcq" | "true_false" | "short_answer" | "matching";
  question: string;
  options?: string[];
  correctAnswer?: string;
  pairs?: MatchPair[];
  explanation: string;
}

interface VocabItem {
  word: string;
  meaning: string;
  example: string;
}

interface Exercise {
  title: string;
  passage: string;
  questions: Question[];
  vocabulary: VocabItem[];
}

interface Props {
  enrollments: EnglishEnrollment[];
  onBack: () => void;
}

export default function HemingwayReading({ enrollments, onBack }: Props) {
  const t = useT();
  const { lang } = useLanguage();
  const activeTiers = getActiveTiers(enrollments);

  const [stage, setStage] = useState<Stage>("level");
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [topic, setTopic] = useState("");
  const [topics, setTopics] = useState<Record<string, string[]>>({});

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [topicsError, setTopicsError] = useState(false);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<Record<number, Record<number, number | null>>>({});
  const [submitted, setSubmitted] = useState(false);

  const loadTopics = useCallback(() => {
    setTopicsError(false);
    fetch("/api/english/mentor/hemingway/topics", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => {
        if (d.topics) setTopics(d.topics);
      })
      .catch(() => setTopicsError(true));
  }, []);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  const selectLevel = (l: CefrLevel) => {
    if (!canAccessLevel(activeTiers, l)) return;
    setLevel(l);
    setStage("topic");
  };

  const selectTopic = useCallback(async (t: string) => {
    if (!level || loading) return;
    setTopic(t);
    setStage("exercise");
    setLoading(true);
    setError(false);
    setExercise(null);
    setAnswers({});
    setMatchingAnswers({});
    setSubmitted(false);

    try {
      const res = await fetch("/api/english/mentor/hemingway/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, topic: t }),
      });
      if (!res.ok) throw new Error("Generate failed");
      const data = await res.json();
      const ex = data.exercise;
      if (
        !ex ||
        typeof ex.passage !== "string" ||
        typeof ex.title !== "string" ||
        !Array.isArray(ex.questions) ||
        ex.questions.length === 0
      ) {
        throw new Error("Invalid exercise data");
      }
      setExercise(ex as Exercise);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [level, loading]);

  const retryGenerate = () => {
    if (topic && level) selectTopic(topic);
  };

  const setAnswer = (idx: number, value: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [idx]: value }));
  };

  const setMatchAnswer = (qIdx: number, pairIdx: number, rightIdx: number | null) => {
    if (submitted) return;
    setMatchingAnswers((prev) => ({
      ...prev,
      [qIdx]: { ...(prev[qIdx] || {}), [pairIdx]: rightIdx },
    }));
  };

  const answeredCount = exercise?.questions
    ? exercise.questions.filter((q, i) => {
        if (q.type === "matching") {
          const ma = matchingAnswers[i];
          if (!ma || !q.pairs) return false;
          return q.pairs.every((_p, pi) => ma[pi] != null);
        }
        return (answers[i] || "").trim() !== "";
      }).length
    : 0;
  const totalQuestions = exercise?.questions?.length ?? 0;

  const handleSubmit = () => {
    setSubmitted(true);
    setStage("results");
  };

  const getQuestionCorrect = (q: Question, i: number): boolean => {
    if (q.type === "matching") {
      const ma = matchingAnswers[i];
      if (!ma || !q.pairs) return false;
      return q.pairs.every((_p, pi) => ma[pi] === pi);
    }
    const a = (answers[i] || "").trim().toLowerCase();
    const c = (q.correctAnswer || "").trim().toLowerCase();
    if (!a) return false;
    if (q.type === "short_answer") {
      return c.includes(a) || a.includes(c) || a === c;
    }
    return a === c;
  };

  const score = exercise?.questions
    ? exercise.questions.filter((q, i) => getQuestionCorrect(q, i)).length
    : 0;

  const resetAll = () => {
    setStage("level");
    setLevel(null);
    setTopic("");
    setExercise(null);
    setAnswers({});
    setMatchingAnswers({});
    setSubmitted(false);
    setError(false);
  };

  const goBackOneStep = () => {
    if (stage === "topic") setStage("level");
    else if (stage === "exercise" && !loading) {
      setStage("topic");
      setExercise(null);
      setAnswers({});
      setMatchingAnswers({});
      setSubmitted(false);
    }
    else if (stage === "results") {
      setStage("exercise");
      setSubmitted(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, #0c1a3a 0%, #091428 28%, #060d20 55%, #02050e 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(6,182,212,0.12), transparent 60%)" }} />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <button
          onClick={stage === "level" ? onBack : goBackOneStep}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {stage === "level" ? t("hub_back") : t("hem_back")}
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 bg-clip-text text-transparent">
            {t("hem_title")}
          </h1>
          <p className="mt-2 text-slate-400 text-sm">{t("hem_subtitle")}</p>
        </div>

        {stage === "level" && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300/70 mb-4">{t("hem_step_level")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_LEVELS.map((lvl) => {
                const accessible = canAccessLevel(activeTiers, lvl);
                const colors = LEVEL_COLORS[lvl];
                const desc = LEVEL_DESCRIPTIONS[lvl];
                return (
                  <button
                    key={lvl}
                    onClick={() => selectLevel(lvl)}
                    disabled={!accessible}
                    className={`group relative text-start rounded-2xl p-4 transition-all duration-200 ${accessible ? "hover:scale-[1.03] cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", boxShadow: accessible ? `0 6px 24px -6px ${colors.glow}` : "none" }}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} shadow-lg text-lg font-extrabold text-white`}>
                        {lvl}
                      </div>
                      <p className="text-xs text-white/50">{lang === "ar" ? desc.ar : desc.en}</p>
                      {!accessible && (
                        <div className="flex items-center gap-1 text-[10px] text-white/30">
                          <Lock className="h-3 w-3" />
                          <span>{t("hem_level_locked")}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {stage === "topic" && level && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300/70 mb-4">{t("hem_step_topic")} — {level}</p>
            {topicsError ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <AlertCircle className="h-8 w-8 text-rose-400" />
                <p className="text-sm text-white/50">{t("hem_topics_error")}</p>
                <button onClick={loadTopics} className="text-sm font-bold px-4 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 transition">
                  <RotateCcw className="h-4 w-4 inline mr-1" />{t("hem_retry")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {(topics[level] || []).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => selectTopic(tp)}
                    className="group text-start rounded-xl px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <BookOpenCheck className="h-3.5 w-3.5 text-cyan-400/50 flex-shrink-0" />
                    <span>{tp}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(stage === "exercise" || stage === "results") && (
          <div className="space-y-5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
                    <BookOpenCheck className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
                </div>
                <p className="text-sm text-white/50">{t("hem_loading")}</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <AlertCircle className="h-10 w-10 text-rose-400" />
                <p className="text-sm text-white/50">{t("hem_error")}</p>
                <button
                  onClick={retryGenerate}
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("hem_retry")}
                </button>
              </div>
            )}

            {exercise && !loading && (
              <>
                <div className="rounded-2xl p-5 bg-gradient-to-b from-cyan-500/10 to-transparent border border-cyan-500/15 backdrop-blur-xl">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{exercise.title}</h3>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap" dir="ltr">{exercise.passage}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-300/70">{t("hem_questions")} ({answeredCount}/{totalQuestions})</p>
                  {exercise.questions.map((q, i) => (
                    <QuestionCard
                      key={i}
                      index={i}
                      question={q}
                      answer={answers[i] || ""}
                      matchAnswer={matchingAnswers[i] || {}}
                      onAnswer={(v) => setAnswer(i, v)}
                      onMatchAnswer={(pi, ri) => setMatchAnswer(i, pi, ri)}
                      submitted={submitted}
                      isCorrect={getQuestionCorrect(q, i)}
                      lang={lang}
                      t={t}
                    />
                  ))}
                </div>

                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={answeredCount === 0}
                    className="w-full h-13 py-3.5 rounded-xl font-bold shadow-[0_10px_30px_-8px_rgba(6,182,212,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_14px_40px_-6px_rgba(6,182,212,0.6)] active:scale-[0.98] transition-all text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: answeredCount > 0 ? "linear-gradient(135deg, #0891b2 0%, #0284c7 60%, #0369a1 100%)" : "rgba(255,255,255,0.06)" }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("hem_check")}
                  </button>
                ) : (
                  <>
                    <div className="rounded-2xl p-5 bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/15 backdrop-blur-xl text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-extrabold text-white">{t("hem_score")}</h3>
                      </div>
                      <p className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                        {score} / {totalQuestions}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {score === totalQuestions
                          ? (lang === "ar" ? "ممتاز! إجابات كاملة" : "Perfect! All correct")
                          : score >= totalQuestions * 0.6
                            ? (lang === "ar" ? "عمل جيد! واصل التحسن" : "Good job! Keep improving")
                            : (lang === "ar" ? "لا بأس! راجع الإجابات أدناه" : "No worries! Review the answers below")}
                      </p>
                    </div>

                    {exercise.vocabulary && exercise.vocabulary.length > 0 && (
                      <div className="rounded-2xl p-5 bg-gradient-to-b from-sky-500/10 to-transparent border border-sky-500/15 backdrop-blur-xl">
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
                            <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                          </div>
                          <h3 className="text-sm font-bold text-white tracking-tight">{t("hem_vocab")}</h3>
                        </div>
                        <div className="space-y-3">
                          {exercise.vocabulary.map((v, i) => (
                            <div key={i} className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.04] space-y-1">
                              <p className="text-sm font-semibold text-sky-300">{v.word}</p>
                              <p className="text-xs text-white/50">{v.meaning}</p>
                              <p className="text-xs text-white/30 italic">"{v.example}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={resetAll}
                      className="w-full mt-2 h-13 py-3.5 rounded-xl font-bold shadow-[0_10px_30px_-8px_rgba(6,182,212,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_14px_40px_-6px_rgba(6,182,212,0.6)] active:scale-[0.98] transition-all text-white"
                      style={{ background: "linear-gradient(135deg, #0891b2 0%, #0284c7 60%, #0369a1 100%)" }}
                    >
                      {t("hem_new")}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  answer,
  matchAnswer,
  onAnswer,
  onMatchAnswer,
  submitted,
  isCorrect,
  lang,
  t,
}: {
  index: number;
  question: Question;
  answer: string;
  matchAnswer: Record<number, number | null>;
  onAnswer: (v: string) => void;
  onMatchAnswer: (pairIdx: number, rightIdx: number | null) => void;
  submitted: boolean;
  isCorrect: boolean;
  lang: string;
  t: (k: string) => string;
}) {
  const typeLabel = question.type === "mcq"
    ? (lang === "ar" ? "اختيار متعدد" : "Multiple Choice")
    : question.type === "true_false"
      ? (lang === "ar" ? "صح أو خطأ" : "True / False")
      : question.type === "matching"
        ? (lang === "ar" ? "مطابقة" : "Matching")
        : (lang === "ar" ? "إجابة قصيرة" : "Short Answer");

  const hasAnswer = question.type === "matching"
    ? question.pairs ? Object.keys(matchAnswer).length === question.pairs.length : false
    : answer.trim() !== "";

  const borderColor = submitted
    ? hasAnswer ? (isCorrect ? "border-emerald-500/30" : "border-rose-500/30") : "border-white/[0.06]"
    : "border-white/[0.06]";

  const shuffledRights = question.type === "matching" && question.pairs
    ? (() => {
        const rights = question.pairs.map((p, i) => ({ text: p.right, originalIdx: i }));
        const seed = question.question.length;
        return rights.sort((a, b) => {
          const ha = ((a.originalIdx + seed) * 2654435761) >>> 0;
          const hb = ((b.originalIdx + seed) * 2654435761) >>> 0;
          return ha - hb;
        });
      })()
    : [];

  return (
    <div className={`rounded-2xl p-4 bg-white/[0.03] border ${borderColor} backdrop-blur-xl transition-colors`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-bold flex-shrink-0 mt-0.5">
            {index + 1}
          </span>
          <p className="text-sm text-white/80 font-medium leading-relaxed">{question.question}</p>
        </div>
        <span className="text-[10px] text-white/25 font-medium flex-shrink-0 mt-1">{typeLabel}</span>
      </div>

      {(question.type === "mcq" || question.type === "true_false") && question.options && (
        <div className="space-y-1.5 ps-8">
          {question.options.map((opt) => {
            const selected = answer === opt;
            const isCorrectOption = submitted && opt.toLowerCase() === (question.correctAnswer || "").trim().toLowerCase();
            const isWrongSelection = submitted && selected && !isCorrect;

            let optStyle = "bg-white/[0.03] border-white/[0.06] text-white/60";
            if (!submitted && selected) {
              optStyle = "bg-cyan-500/15 border-cyan-500/30 text-white";
            } else if (submitted && isCorrectOption) {
              optStyle = "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
            } else if (isWrongSelection) {
              optStyle = "bg-rose-500/15 border-rose-500/30 text-rose-300";
            }

            return (
              <button
                key={opt}
                onClick={() => onAnswer(opt)}
                disabled={submitted}
                className={`w-full text-start rounded-xl px-3.5 py-2.5 text-sm border transition-all ${optStyle} ${submitted ? "cursor-default" : "hover:bg-white/[0.06] cursor-pointer"}`}
              >
                <div className="flex items-center gap-2">
                  {submitted && isCorrectOption && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />}
                  {isWrongSelection && <XCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />}
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {question.type === "short_answer" && (
        <div className="ps-8">
          <input
            type="text"
            value={answer}
            onChange={(e) => onAnswer(e.target.value)}
            disabled={submitted}
            placeholder={t("hem_short_placeholder")}
            dir="ltr"
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/25 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition disabled:opacity-60"
          />
          {submitted && (
            <p className="mt-1.5 text-xs">
              <span className="text-white/30">{lang === "ar" ? "الإجابة الصحيحة:" : "Correct answer:"} </span>
              <span className="text-emerald-300 font-medium">{question.correctAnswer}</span>
            </p>
          )}
        </div>
      )}

      {question.type === "matching" && question.pairs && (
        <div className="ps-8 space-y-2">
          {question.pairs.map((pair, pi) => {
            const selectedRightIdx = matchAnswer[pi];
            const isThisPairCorrect = selectedRightIdx === pi;
            const selectedText = selectedRightIdx != null ? question.pairs![selectedRightIdx]?.right : null;

            return (
              <div key={pi} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3 w-3 text-cyan-400/40 flex-shrink-0" />
                  <span className="text-xs font-semibold text-cyan-300/80">{pair.left}</span>
                </div>
                <select
                  value={selectedRightIdx != null ? String(selectedRightIdx) : ""}
                  onChange={(e) => onMatchAnswer(pi, e.target.value === "" ? null : Number(e.target.value))}
                  disabled={submitted}
                  className={`w-full rounded-xl px-3.5 py-2 text-sm border transition-all appearance-none ${
                    submitted
                      ? isThisPairCorrect
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                      : selectedRightIdx != null
                        ? "bg-cyan-500/10 border-cyan-500/20 text-white"
                        : "bg-white/[0.03] border-white/[0.06] text-white/50"
                  } disabled:opacity-70`}
                >
                  <option value="" className="bg-slate-900">{lang === "ar" ? "— اختر —" : "— Select —"}</option>
                  {shuffledRights.map((sr) => (
                    <option key={sr.originalIdx} value={String(sr.originalIdx)} className="bg-slate-900 text-white">
                      {sr.text}
                    </option>
                  ))}
                </select>
                {submitted && !isThisPairCorrect && (
                  <p className="text-[11px] text-emerald-300/70 ps-1">
                    {lang === "ar" ? "الإجابة:" : "Answer:"} {pair.right}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {submitted && hasAnswer && question.type !== "matching" && (
        <div className={`mt-3 ms-8 rounded-lg p-3 text-xs leading-relaxed ${isCorrect ? "bg-emerald-500/10 text-emerald-300/80" : "bg-rose-500/10 text-rose-300/80"}`}>
          <div className="flex items-start gap-1.5">
            <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{question.explanation}</span>
          </div>
        </div>
      )}

      {submitted && hasAnswer && question.type === "matching" && (
        <div className={`mt-3 ms-8 rounded-lg p-3 text-xs leading-relaxed ${isCorrect ? "bg-emerald-500/10 text-emerald-300/80" : "bg-rose-500/10 text-rose-300/80"}`}>
          <div className="flex items-start gap-1.5">
            <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{question.explanation}</span>
          </div>
        </div>
      )}
    </div>
  );
}
