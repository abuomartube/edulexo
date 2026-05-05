import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, PlayCircle, X, BookOpen, Check, RotateCcw, Lock } from "lucide-react";
import Player from "@vimeo/player";
import { useT, useLanguage } from "@/lib/i18n";

const COMPLETION_PERCENT = 0.6;
const COMPLETION_SECONDS = 60;
const RESUME_MIN_SECONDS = 5;
const RESUME_END_BUFFER_SECONDS = 10;

const PURPLE = "#7c3aed";
const GREEN = "#22c55e";

const CEFR_LEVELS = ["A1", "A2", "B1", "B1+", "B2", "C1"] as const;

interface LessonData {
  id: number;
  title: string;
  titleAr: string | null;
  vimeoUrl: string;
  tier: string;
  level: string;
  sortOrder: number;
  locked: boolean;
  completed: boolean;
  progress: { watchedSeconds: number; durationSeconds: number; lastPositionSeconds: number } | null;
}

function formatMinutes(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(safe / 60);
  return `${m} min`;
}

function extractVimeoEmbed(url: string): { id: string; hash: string | null } | null {
  if (!url) return null;
  const trimmed = url.trim();
  const bareId = trimmed.match(/^(\d+)(?:\/([A-Za-z0-9]+))?$/);
  if (bareId) return { id: bareId[1], hash: bareId[2] ?? null };
  const player = trimmed.match(/player\.vimeo\.com\/video\/(\d+)(?:\/([A-Za-z0-9]+))?/);
  if (player) return { id: player[1], hash: player[2] ?? null };
  const std = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/);
  if (std) return { id: std[1], hash: std[2] ?? null };
  const idOnly = trimmed.match(/(\d{6,})/);
  const hashParam = trimmed.match(/[?&]h=([A-Za-z0-9]+)/);
  if (idOnly) return { id: idOnly[1], hash: hashParam ? hashParam[1] : null };
  return null;
}

interface Props {
  onBack: () => void;
}

export default function Lessons({ onBack }: Props) {
  const t = useT();
  const { lang } = useLanguage();
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [allowedLevels, setAllowedLevels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LessonData | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const completedTriggeredRef = useRef(false);
  const lastTimeRef = useRef(0);
  const playedSecondsRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedSecondsRef = useRef(0);
  const positionRef = useRef(0);

  const completedSetRef = useRef(new Set<number>());

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/english/mentor/lessons", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLessons(data.lessons ?? []);
      setAllowedLevels(data.allowedLevels ?? []);
      completedSetRef.current = new Set(
        (data.lessons ?? []).filter((l: LessonData) => l.completed).map((l: LessonData) => l.id),
      );
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const saveProgress = useCallback(
    async (lessonId: number, watched: number, duration: number, position: number) => {
      try {
        await fetch(`/api/english/mentor/lessons/${lessonId}/progress`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            watchedSeconds: Math.round(watched),
            durationSeconds: Math.round(duration),
            lastPositionSeconds: Math.round(position),
          }),
        });
        setLessons((prev) =>
          prev.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  progress: {
                    watchedSeconds: Math.max(l.progress?.watchedSeconds ?? 0, Math.round(watched)),
                    durationSeconds: Math.max(l.progress?.durationSeconds ?? 0, Math.round(duration)),
                    lastPositionSeconds: Math.round(position),
                  },
                }
              : l,
          ),
        );
      } catch {}
    },
    [],
  );
  const saveProgressRef = useRef(saveProgress);
  saveProgressRef.current = saveProgress;

  const markComplete = useCallback(async (lessonId: number) => {
    if (completedSetRef.current.has(lessonId)) return;
    completedSetRef.current.add(lessonId);
    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, completed: true } : l)));
    try {
      await fetch(`/api/english/mentor/lessons/${lessonId}/complete`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
  }, []);
  const markCompleteRef = useRef(markComplete);
  markCompleteRef.current = markComplete;

  const openLesson = (lesson: LessonData) => {
    if (lesson.locked) return;
    completedTriggeredRef.current = false;
    lastTimeRef.current = 0;
    const prior = lesson.progress;
    playedSecondsRef.current = prior?.watchedSeconds ?? 0;
    durationRef.current = prior?.durationSeconds ?? 0;
    lastSavedSecondsRef.current = playedSecondsRef.current;
    positionRef.current = prior?.lastPositionSeconds ?? 0;
    setActiveLesson(lesson);
  };

  const closeLesson = () => {
    const lesson = activeLesson;
    if (lesson) {
      const watched = playedSecondsRef.current;
      const duration = durationRef.current;
      const position = positionRef.current;
      if (watched > 0 || duration > 0 || position > 0) {
        saveProgressRef.current(lesson.id, watched, duration, position);
      }
    }
    setActiveLesson(null);
  };

  const startOver = async () => {
    const lesson = activeLesson;
    if (!lesson) return;
    const player = playerRef.current;
    positionRef.current = 0;
    lastTimeRef.current = 0;
    if (player) {
      try {
        await player.setCurrentTime(0);
        await player.play();
      } catch {}
    }
    saveProgressRef.current(lesson.id, playedSecondsRef.current, durationRef.current, 0);
  };

  useEffect(() => {
    if (!activeLesson) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const player = new Player(iframe);
    playerRef.current = player;
    let cancelled = false;

    player
      .getDuration()
      .then((d) => {
        if (cancelled) return;
        if (typeof d === "number" && d > 0) durationRef.current = d;
        const resumeAt = positionRef.current;
        const total = durationRef.current;
        const tooClose = total > 0 && resumeAt >= total - RESUME_END_BUFFER_SECONDS;
        if (resumeAt >= RESUME_MIN_SECONDS && !tooClose) {
          const target = total > 0 ? Math.min(resumeAt, Math.max(0, total - 1)) : resumeAt;
          lastTimeRef.current = target;
          player.setCurrentTime(target).catch(() => {});
        }
      })
      .catch(() => {});

    const maybeMark = () => {
      if (completedTriggeredRef.current) return;
      if (!activeLesson) return;
      if (completedSetRef.current.has(activeLesson.id)) {
        completedTriggeredRef.current = true;
        return;
      }
      const duration = durationRef.current;
      const played = playedSecondsRef.current;
      if (played >= COMPLETION_SECONDS || (duration > 0 && played >= duration * COMPLETION_PERCENT)) {
        completedTriggeredRef.current = true;
        markCompleteRef.current(activeLesson.id);
      }
    };

    const onTimeUpdate = (data: { seconds: number; duration?: number }) => {
      if (typeof data.duration === "number" && data.duration > 0) durationRef.current = data.duration;
      const current = data.seconds;
      const delta = current - lastTimeRef.current;
      if (delta > 0 && delta < 1.5) playedSecondsRef.current += delta;
      lastTimeRef.current = current;
      positionRef.current = current;
      maybeMark();
      if (playedSecondsRef.current - lastSavedSecondsRef.current >= 10) {
        lastSavedSecondsRef.current = playedSecondsRef.current;
        saveProgressRef.current(activeLesson.id, playedSecondsRef.current, durationRef.current, positionRef.current);
      }
    };

    const onSeeked = (data: { seconds: number }) => {
      lastTimeRef.current = data.seconds;
      positionRef.current = data.seconds;
    };
    const onPlay = (data: { seconds: number }) => {
      lastTimeRef.current = data.seconds;
      positionRef.current = data.seconds;
    };
    const onEnded = () => maybeMark();

    player.on("timeupdate", onTimeUpdate);
    player.on("seeked", onSeeked);
    player.on("play", onPlay);
    player.on("ended", onEnded);

    return () => {
      cancelled = true;
      player.off("timeupdate", onTimeUpdate);
      player.off("seeked", onSeeked);
      player.off("play", onPlay);
      player.off("ended", onEnded);
      player.destroy().catch(() => {});
      playerRef.current = null;
    };
  }, [activeLesson?.id]);

  const vimeoEmbed = activeLesson ? extractVimeoEmbed(activeLesson.vimeoUrl) : null;
  const vimeoSrc = vimeoEmbed
    ? `https://player.vimeo.com/video/${vimeoEmbed.id}${vimeoEmbed.hash ? `?h=${vimeoEmbed.hash}&` : "?"}autoplay=1&color=7c3aed&title=0&byline=0&portrait=0&dnt=1`
    : null;

  const unlockedLessons = lessons.filter((l) => !l.locked);
  const completedCount = unlockedLessons.filter((l) => l.completed).length;
  const totalCount = unlockedLessons.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const lessonTitle = (l: LessonData) => (lang === "ar" && l.titleAr ? l.titleAr : l.title);

  const lessonsByLevel = CEFR_LEVELS.map((lvl) => ({
    level: lvl,
    lessons: lessons.filter((l) => l.level === lvl),
    allowed: allowedLevels.includes(lvl),
  })).filter((g) => g.lessons.length > 0 || g.allowed);

  const hasAnyLessons = lessons.length > 0;

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(124,58,237,0.18), transparent 60%)" }} />

      <div className="relative mx-auto max-w-5xl px-4 py-8">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("hub_back")}
        </button>

        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <BookOpen className="w-8 h-8" style={{ color: PURPLE }} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            {t("hub_lessons")}
          </h1>
          <p className="text-white/50 text-sm">{t("hub_lessons_desc")}</p>

          {!loading && totalCount > 0 && (
            <div className="w-full max-w-sm pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white/60">
                  {lang === "ar" ? `${completedCount} من ${totalCount} مكتمل` : `${completedCount} of ${totalCount} complete`}
                </span>
                <span style={{ color: PURPLE }}>{progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${PURPLE}, #6366f1)` }} />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : !hasAnyLessons ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="text-white/40 text-sm">{t("dash_comingSoon")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {lessonsByLevel.map(({ level, lessons: levelLessons, allowed }) => {
              const levelLocked = !allowed;

              return (
                <div key={level}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="px-3 py-1.5 rounded-lg text-xs font-black tracking-wider"
                      style={{
                        background: levelLocked ? "rgba(255,255,255,0.04)" : "rgba(124,58,237,0.15)",
                        border: levelLocked ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(124,58,237,0.3)",
                        color: levelLocked ? "rgba(255,255,255,0.3)" : PURPLE,
                      }}
                    >
                      {level}
                    </div>
                    {levelLocked && (
                      <div className="flex items-center gap-1.5 text-white/30 text-xs">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{t("les_locked_msg")}</span>
                      </div>
                    )}
                  </div>

                  {levelLocked ? (
                    <div
                      className="rounded-2xl p-6 text-center"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <Lock className="w-8 h-8 mx-auto mb-2 text-white/15" />
                      <p className="text-white/25 text-xs">{t("les_locked_msg")}</p>
                    </div>
                  ) : levelLessons.length === 0 ? (
                    <div
                      className="rounded-2xl p-6 text-center"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-white/30 text-xs">{t("les_no_lessons")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {levelLessons.map((lesson, i) => {
                        const done = lesson.completed;
                        const locked = lesson.locked;
                        const prog = lesson.progress;
                        const watched = prog?.watchedSeconds ?? 0;
                        const duration = prog?.durationSeconds ?? 0;
                        const showPartial = !done && watched > 0;
                        const pct = showPartial && duration > 0 ? Math.min(100, Math.max(1, Math.round((watched / duration) * 100))) : 0;

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            disabled={locked}
                            onClick={() => openLesson(lesson)}
                            className={`group relative text-start rounded-2xl p-5 transition-all ${locked ? "cursor-not-allowed opacity-40" : "hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer"}`}
                            style={{
                              background: done ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.04)",
                              border: done ? "1px solid rgba(34,197,94,0.35)" : locked ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(124,58,237,0.25)",
                              backdropFilter: "blur(12px)",
                            }}
                          >
                            {done && (
                              <div className="absolute top-3 end-3 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: GREEN, color: "#fff" }}>
                                <Check className="w-4 h-4" strokeWidth={3} />
                              </div>
                            )}

                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-sm font-black" style={{ background: done ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.15)", color: done ? GREEN : PURPLE }}>
                              {i + 1}
                            </div>
                            <p className={`font-bold text-sm leading-snug mb-3 transition-colors ${done ? "text-white/80 group-hover:text-green-300" : "text-white group-hover:text-purple-300"}`}>
                              {lessonTitle(lesson)}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: done ? GREEN : PURPLE }}>
                              <PlayCircle className="w-4 h-4" />
                              {locked
                                ? lang === "ar" ? "مقفل" : "Locked"
                                : done
                                  ? lang === "ar" ? "شاهد مجدداً" : "Watch Again"
                                  : showPartial
                                    ? lang === "ar" ? "أكمل" : "Continue"
                                    : lang === "ar" ? "شاهد الدرس" : "Watch Lesson"}
                            </div>
                            {showPartial && (
                              <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-white/55">
                                  <span>{duration > 0 ? `${formatMinutes(watched)} / ${formatMinutes(duration)}` : `${formatMinutes(watched)}`}</span>
                                  {duration > 0 && <span style={{ color: PURPLE }}>{pct}%</span>}
                                </div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${duration > 0 ? pct : 8}%`, background: `linear-gradient(90deg, ${PURPLE}, #6366f1)` }} />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(6,11,31,0.95)" }} onClick={(e) => { if (e.target === e.currentTarget) closeLesson(); }}>
          <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden" style={{ background: "#0d1330", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: PURPLE }}>
                  {t("hub_lessons")} — {activeLesson.level}
                </p>
                <h3 className="text-white font-bold text-sm leading-tight">{lessonTitle(activeLesson)}</h3>
              </div>
              <div className="flex items-center gap-2">
                {(activeLesson.progress?.lastPositionSeconds ?? 0) >= RESUME_MIN_SECONDS && (
                  <button onClick={startOver} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white/80 hover:text-white transition" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <RotateCcw className="w-3 h-3" strokeWidth={3} />
                    {lang === "ar" ? "من البداية" : "Start over"}
                  </button>
                )}
                {!activeLesson.completed && (
                  <button onClick={() => markComplete(activeLesson.id)} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white transition hover:opacity-90" style={{ background: GREEN }}>
                    <Check className="w-3 h-3" strokeWidth={3} />
                    {lang === "ar" ? "اكتمل" : "Mark complete"}
                  </button>
                )}
                <button onClick={closeLesson} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {vimeoSrc ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe ref={iframeRef} src={vimeoSrc} className="absolute inset-0 w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={lessonTitle(activeLesson)} />
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <p className="text-white/40 text-sm">
                  {activeLesson.vimeoUrl
                    ? lang === "ar" ? "تعذر قراءة رابط الفيديو." : "Couldn't read this Vimeo link."
                    : lang === "ar" ? "لم يُضف رابط فيديو بعد." : "No video link added yet."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
