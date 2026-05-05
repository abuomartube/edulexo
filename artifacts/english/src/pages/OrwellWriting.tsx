import { useState, useRef, useEffect, useCallback } from "react";
import { useT, useLanguage } from "@/lib/i18n";
import type { EnglishEnrollment } from "@/lib/api";
import {
  ArrowLeft,
  Lock,
  Send,
  Loader2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  BookOpen,
  Sparkles,
  PenLine,
  FileText,
  Layers,
  ArrowRight,
  Trophy,
} from "lucide-react";

type CefrLevel = "A1" | "A2" | "B1" | "B1+" | "B2" | "C1";
type Stage = "level" | "task" | "write" | "feedback";

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

const WORD_LIMITS: Record<CefrLevel, { min: number; max: number }> = {
  A1: { min: 20, max: 60 },
  A2: { min: 30, max: 80 },
  B1: { min: 50, max: 120 },
  "B1+": { min: 60, max: 150 },
  B2: { min: 80, max: 200 },
  C1: { min: 100, max: 250 },
};

interface FeedbackData {
  correctedVersion?: string;
  improvedVersion?: string;
  grammarFeedback?: Array<{ error: string; correction: string; rule: string }>;
  vocabularySuggestions?: Array<{ original: string; better: string; reason: string }>;
  sentenceStructure?: string;
  paragraphOrganization?: string;
  overallSummary?: string;
  tips?: string[];
}

interface Props {
  enrollments: EnglishEnrollment[];
  onBack: () => void;
}

export default function OrwellWriting({ enrollments, onBack }: Props) {
  const t = useT();
  const { lang } = useLanguage();
  const activeTiers = getActiveTiers(enrollments);

  const [stage, setStage] = useState<Stage>("level");
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<Record<string, string[]>>({});
  const [text, setText] = useState("");

  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [tasksError, setTasksError] = useState(false);
  const [showImproved, setShowImproved] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadTasks = useCallback(() => {
    setTasksError(false);
    fetch("/api/english/mentor/orwell/tasks", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => {
        if (d.tasks) setTasks(d.tasks);
      })
      .catch(() => setTasksError(true));
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const selectLevel = (l: CefrLevel) => {
    if (!canAccessLevel(activeTiers, l)) return;
    setLevel(l);
    setStage("task");
  };

  const selectTask = (t: string) => {
    setTask(t);
    setStage("write");
    setTimeout(() => textareaRef.current?.focus(), 150);
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const submitWriting = useCallback(async () => {
    if (!text.trim() || !level || !task || loading) return;

    setStage("feedback");
    setLoading(true);
    setError(false);
    setFeedback(null);
    setShowImproved(false);

    try {
      const res = await fetch("/api/english/mentor/orwell/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, task, text: text.trim() }),
      });

      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      setFeedback(data.feedback);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [text, level, task, loading]);

  const resetAll = () => {
    setStage("level");
    setLevel(null);
    setTask("");
    setText("");
    setFeedback(null);
    setError(false);
    setShowImproved(false);
  };

  const goBackOneStep = () => {
    if (stage === "task") setStage("level");
    else if (stage === "write") setStage("task");
    else if (stage === "feedback") setStage("write");
  };

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1a1340 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(217,119,6,0.15), transparent 60%)" }} />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {stage !== "feedback" && (
          <button
            onClick={stage === "level" ? onBack : goBackOneStep}
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {stage === "level" ? t("hub_back") : t("orwell_back")}
          </button>
        )}

        {stage !== "feedback" && (
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
              {t("orwell_title")}
            </h1>
            <p className="mt-2 text-slate-400 text-sm">{t("orwell_subtitle")}</p>
          </div>
        )}

        {/* STEP 1: Level Selection */}
        {stage === "level" && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300/70 mb-4">{t("orwell_step_level")}</p>
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
                          <span>{t("orwell_level_locked")}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Task Selection */}
        {stage === "task" && level && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300/70 mb-4">{t("orwell_step_task")} — {level}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {(tasks[level] || []).map((tp) => (
                <button
                  key={tp}
                  onClick={() => selectTask(tp)}
                  className="group text-start rounded-xl px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <PenLine className="h-3.5 w-3.5 text-amber-400/50 flex-shrink-0" />
                  <span>{tp}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Writing Area */}
        {stage === "write" && level && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4 bg-white/[0.03] ring-1 ring-white/[0.06]">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300/70">{t("orwell_your_task")}</p>
              </div>
              <p className="text-sm text-white/80 font-medium">{task}</p>
              <p className="text-xs text-white/30 mt-1">
                {lang === "ar"
                  ? `${WORD_LIMITS[level].min}–${WORD_LIMITS[level].max} كلمة`
                  : `${WORD_LIMITS[level].min}–${WORD_LIMITS[level].max} words`}
              </p>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("orwell_placeholder")}
                dir="ltr"
                rows={8}
                className="w-full rounded-2xl bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/25 p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition resize-none"
              />
              <div className="flex items-center justify-between mt-2 px-1">
                <p className={`text-xs ${wordCount > 0 ? "text-white/40" : "text-white/20"}`}>
                  {wordCount} {lang === "ar" ? "كلمة" : wordCount === 1 ? "word" : "words"}
                </p>
                <p className="text-xs text-white/20">
                  {level} — {lang === "ar" ? LEVEL_DESCRIPTIONS[level].ar : LEVEL_DESCRIPTIONS[level].en}
                </p>
              </div>
            </div>

            <button
              onClick={submitWriting}
              disabled={wordCount < 5 || loading}
              className="w-full h-13 py-3.5 rounded-xl font-bold shadow-[0_10px_30px_-8px_rgba(217,119,6,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_14px_40px_-6px_rgba(217,119,6,0.6)] active:scale-[0.98] transition-all text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: wordCount >= 5 ? "linear-gradient(135deg, #d97706 0%, #ea580c 60%, #dc2626 100%)" : "rgba(255,255,255,0.06)" }}
            >
              <Send className="h-4 w-4" />
              {t("orwell_submit")}
            </button>
          </div>
        )}

        {/* STEP 4: Feedback */}
        {stage === "feedback" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStage("write")} className="text-white/50 hover:text-white/80 transition">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-extrabold bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
                {t("orwell_feedback_title")}
              </h2>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <PenLine className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" />
                </div>
                <p className="text-sm text-white/50">{t("orwell_feedback_loading")}</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <AlertCircle className="h-10 w-10 text-rose-400" />
                <p className="text-sm text-white/50">{t("orwell_feedback_error")}</p>
                <button
                  onClick={submitWriting}
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-500 transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("orwell_feedback_retry")}
                </button>
              </div>
            )}

            {feedback && !loading && (
              <div className="space-y-4">
                {/* Overall Summary */}
                {feedback.overallSummary && (
                  <FeedbackCard icon={Sparkles} title={t("orwell_fb_summary")} color="amber">
                    <p className="text-sm text-white/70 leading-relaxed">{feedback.overallSummary}</p>
                  </FeedbackCard>
                )}

                {/* Corrected vs Improved Version */}
                {(feedback.correctedVersion || feedback.improvedVersion) && (
                  <FeedbackCard icon={FileText} title={showImproved ? t("orwell_fb_improved") : t("orwell_fb_corrected")} color="emerald">
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                      {showImproved ? feedback.improvedVersion : feedback.correctedVersion}
                    </p>
                    {feedback.correctedVersion && feedback.improvedVersion && (
                      <button
                        onClick={() => setShowImproved(!showImproved)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {showImproved ? t("orwell_fb_show_corrected") : t("orwell_fb_show_improved")}
                      </button>
                    )}
                  </FeedbackCard>
                )}

                {/* Grammar Feedback */}
                {feedback.grammarFeedback && feedback.grammarFeedback.length > 0 && (
                  <FeedbackCard icon={CheckCircle2} title={t("orwell_fb_grammar")} color="rose">
                    <div className="space-y-3">
                      {feedback.grammarFeedback.map((gf, i) => (
                        <div key={i} className="rounded-xl bg-white/[0.03] p-3.5 space-y-2 ring-1 ring-white/[0.04]">
                          <div className="flex items-start gap-2">
                            <span className="text-rose-400 text-xs font-bold mt-0.5">&times;</span>
                            <p className="text-sm text-rose-300/80 line-through">{gf.error}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 text-xs font-bold mt-0.5">&check;</span>
                            <p className="text-sm text-emerald-300 font-medium">{gf.correction}</p>
                          </div>
                          <p className="text-xs text-white/40 ps-5">{gf.rule}</p>
                        </div>
                      ))}
                    </div>
                  </FeedbackCard>
                )}

                {/* Vocabulary Suggestions */}
                {feedback.vocabularySuggestions && feedback.vocabularySuggestions.length > 0 && (
                  <FeedbackCard icon={BookOpen} title={t("orwell_fb_vocab")} color="sky">
                    <div className="space-y-3">
                      {feedback.vocabularySuggestions.map((vs, i) => (
                        <div key={i} className="rounded-xl bg-white/[0.03] p-3.5 space-y-1.5 ring-1 ring-white/[0.04]">
                          <p className="text-sm">
                            <span className="text-white/50">{vs.original}</span>
                            <span className="text-white/20 mx-2">&rarr;</span>
                            <span className="text-sky-300 font-semibold">{vs.better}</span>
                          </p>
                          <p className="text-xs text-white/30">{vs.reason}</p>
                        </div>
                      ))}
                    </div>
                  </FeedbackCard>
                )}

                {/* Sentence Structure */}
                {feedback.sentenceStructure && (
                  <FeedbackCard icon={Layers} title={t("orwell_fb_sentences")} color="violet">
                    <p className="text-sm text-white/70 leading-relaxed">{feedback.sentenceStructure}</p>
                  </FeedbackCard>
                )}

                {/* Paragraph Organization */}
                {feedback.paragraphOrganization && (
                  <FeedbackCard icon={FileText} title={t("orwell_fb_organization")} color="purple">
                    <p className="text-sm text-white/70 leading-relaxed">{feedback.paragraphOrganization}</p>
                  </FeedbackCard>
                )}

                {/* Tips */}
                {feedback.tips && feedback.tips.length > 0 && (
                  <FeedbackCard icon={Lightbulb} title={t("orwell_fb_tips")} color="amber">
                    <ul className="space-y-2.5">
                      {feedback.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </FeedbackCard>
                )}

                <button
                  onClick={resetAll}
                  className="w-full mt-6 h-13 py-3.5 rounded-xl font-bold shadow-[0_10px_30px_-8px_rgba(217,119,6,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_14px_40px_-6px_rgba(217,119,6,0.6)] active:scale-[0.98] transition-all text-white"
                  style={{ background: "linear-gradient(135deg, #d97706 0%, #ea580c 60%, #dc2626 100%)" }}
                >
                  {t("orwell_new")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({ icon: Icon, title, color, children }: { icon: React.ComponentType<{ className?: string }>; title: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    amber: "from-amber-500/15 to-transparent border-amber-500/20",
    emerald: "from-emerald-500/15 to-transparent border-emerald-500/20",
    rose: "from-rose-500/15 to-transparent border-rose-500/20",
    sky: "from-sky-500/15 to-transparent border-sky-500/20",
    violet: "from-violet-500/15 to-transparent border-violet-500/20",
    purple: "from-purple-500/15 to-transparent border-purple-500/20",
  };
  const iconColorMap: Record<string, string> = {
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    sky: "text-sky-400",
    violet: "text-violet-400",
    purple: "text-purple-400",
  };
  const iconBgMap: Record<string, string> = {
    amber: "bg-amber-500/15",
    emerald: "bg-emerald-500/15",
    rose: "bg-rose-500/15",
    sky: "bg-sky-500/15",
    violet: "bg-violet-500/15",
    purple: "bg-purple-500/15",
  };

  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-b ${colorMap[color] || colorMap.amber} border backdrop-blur-xl`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-7 h-7 rounded-lg ${iconBgMap[color] || iconBgMap.amber} flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${iconColorMap[color] || iconColorMap.amber}`} />
        </div>
        <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}
