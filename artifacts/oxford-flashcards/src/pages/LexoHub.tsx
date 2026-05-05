import { Link } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Lock,
  PlayCircle,
  Sparkles,
  Target,
} from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import {
  ENGLISH_TIER_LABELS,
  fetchEnglishLastLesson,
  fetchEnglishLessons,
  fetchEnglishStreak,
  fetchEnglishStudyTime,
  fetchMyEnglishEnrollments,
  hasActiveEnglishAccess,
  type EnglishLessonSummary,
  type EnglishTier,
} from "@/lib/platform-api";

// Format a resume position for the Continue Learning subtitle.
// "1:23" or "1:02:34" (drops leading zero on hours; pads m/s).
function formatResumeAt(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Format aggregate study minutes for the Study Time stat card.
// <60  → "27 min"  / "27 دقيقة"
// ≥60  → "4h 30m" / "4س 30د"  (omit "0m" → "4h" / "4س")
function formatStudyMinutes(totalMinutes: number, isAr: boolean): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return isAr ? `${m} دقيقة` : `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (isAr) return rem === 0 ? `${h}س` : `${h}س ${rem}د`;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

// Phase-2 L6 / Task #26 — real Lexo English Dashboard. Replaces the bilingual
// "being prepared" placeholder with progress, today's tasks, and upcoming
// lessons sourced from the existing English API. Intentionally does NOT
// re-introduce the old Mentor 6-tool grid (Speaking / Writing / Listening /
// Reading / Lessons / Flashcards). Only the explicit lessons + flashcards
// surfaces called for in the task are linked here. Per-tool iframe pages at
// /dashboard/english/:tool are still reachable, but no UI surface routes to
// the hidden tools. To restore the old grid: see commit 9c25ef45.

function daysUntil(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

function lessonTitle(l: EnglishLessonSummary, isAr: boolean): string {
  if (isAr && l.titleAr && l.titleAr.trim()) return l.titleAr;
  return l.title;
}

export default function LexoHub() {
  const { user, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const enrollmentsQuery = useQuery({
    queryKey: ["my-english-enrollments"],
    queryFn: fetchMyEnglishEnrollments,
  });

  const lessonsQuery = useQuery({
    queryKey: ["english-mentor-lessons"],
    queryFn: fetchEnglishLessons,
  });

  // Study Time (last 7 days). On error we fall back to 0 so the card
  // still renders with a sane value instead of disappearing.
  const studyTimeQuery = useQuery({
    queryKey: ["english-study-time", "week"],
    queryFn: () => fetchEnglishStudyTime("week"),
    retry: 1,
  });
  const studyMinutes = studyTimeQuery.data?.totalMinutes ?? 0;

  // Daily Streak. On error/missing data we fall back to zeros so the card
  // always renders (matches the Study Time fallback contract).
  const streakQuery = useQuery({
    queryKey: ["english-streak"],
    queryFn: fetchEnglishStreak,
    retry: 1,
  });
  const currentStreak = streakQuery.data?.currentStreak ?? 0;
  const longestStreak = streakQuery.data?.longestStreak ?? 0;
  const todayActive = streakQuery.data?.todayActive ?? false;

  // Last watched lesson — server-side picks the single most-recent
  // resumable lesson the student can still access. On error we fall
  // back to null and the existing "next lesson" branch is used.
  const lastLessonQuery = useQuery({
    queryKey: ["english-last-lesson"],
    queryFn: fetchEnglishLastLesson,
    retry: 1,
  });
  const lastLesson = lastLessonQuery.data?.lesson ?? null;

  const enrollments = enrollmentsQuery.data ?? [];
  const hasAccess = isAdmin || hasActiveEnglishAccess(enrollments);

  // Earliest non-null expiry among active English enrollments. Lifetime
  // grants (expiresAt === null) intentionally never produce a renewal banner.
  const minDays = useMemo(() => {
    return enrollments
      .filter((e) => e.isActive && e.status !== "revoked")
      .map((e) => daysUntil(e.expiresAt))
      .filter((d): d is number => d !== null && d >= 0)
      .reduce<number | null>(
        (acc, n) => (acc === null || n < acc ? n : acc),
        null,
      );
  }, [enrollments]);

  const lessonsData = lessonsQuery.data;
  const allLessons = lessonsData?.lessons ?? [];
  const accessibleLessons = allLessons.filter((l) => !l.locked);
  const completedCount = accessibleLessons.filter((l) => l.completed).length;
  const totalAccessible = accessibleLessons.length;
  const progressPct =
    totalAccessible === 0
      ? 0
      : Math.round((completedCount / totalAccessible) * 100);

  // Next lesson to study: first unlocked + uncompleted lesson in sort order.
  const nextLesson = accessibleLessons.find((l) => !l.completed) ?? null;
  // Lesson currently in progress (has watch progress but not yet completed).
  const inProgressLesson =
    accessibleLessons.find(
      (l) =>
        !l.completed &&
        l.progress &&
        l.progress.watchedSeconds > 0 &&
        l.progress.durationSeconds > 0,
    ) ?? null;
  const upcomingLessons = accessibleLessons
    .filter((l) => !l.completed)
    .slice(0, 5);

  const bestTier = lessonsData?.bestTier ?? null;
  const allowedLevels = lessonsData?.allowedLevels ?? [];

  const lessonsLoading = lessonsQuery.isLoading;
  const lessonsError = lessonsQuery.isError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 mb-6"
          data-testid="link-back-dashboard"
        >
          <ArrowLeft size={16} className={isAr ? "rotate-180" : ""} />
          {isAr ? "العودة إلى لوحة التحكم" : "Back to dashboard"}
        </Link>

        {/* ── Welcome banner ─────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-600 text-white rounded-3xl p-7 sm:p-10 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100/90">
                EduLexo · Lexo for English
              </p>
              <h1
                className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight"
                data-testid="text-english-dashboard-title"
              >
                {isAr ? "أهلاً" : "Welcome"}
                {user ? `, ${user.name.split(" ")[0]}` : ""} 👋
              </h1>
              <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-xl">
                {isAr
                  ? "تابع تقدّمك ومهامك اليومية في كورس الإنجليزي."
                  : "Track your progress and pick up where you left off in your English course."}
              </p>
            </div>

            {bestTier && (
              <div
                className="rounded-2xl bg-white/15 ring-1 ring-white/25 px-4 py-3 backdrop-blur"
                data-testid="badge-english-tier"
              >
                <p className="text-[10px] uppercase tracking-wider text-indigo-100/80">
                  {isAr ? "مستواك الحالي" : "Your level"}
                </p>
                <p className="mt-0.5 text-base font-extrabold leading-tight">
                  {ENGLISH_TIER_LABELS[bestTier as EnglishTier]?.[lang] ??
                    bestTier}
                </p>
                {allowedLevels.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-indigo-100/85">
                    {isAr ? "الوحدات المتاحة: " : "Unlocked: "}
                    {allowedLevels.join(" · ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Access guard fallback (defensive — EnglishOnlyRoute already gates) */}
        {!hasAccess && !enrollmentsQuery.isLoading && (
          <section
            className="mt-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-6 text-amber-900 dark:text-amber-100"
            data-testid="section-no-english-access"
          >
            <p className="text-sm">
              {isAr
                ? "لا يبدو أن لديك اشتراك نشط في كورس الإنجليزي."
                : "It looks like you don't have an active English subscription."}
            </p>
            <Link
              href="/english"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline"
            >
              {isAr ? "تصفّح الباقات" : "Browse plans"}
              <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
            </Link>
          </section>
        )}

        {/* ── Stats row ──────────────────────────────────────────── */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={<CheckCircle2 size={20} />}
            tone="from-emerald-500 to-teal-600"
            label={isAr ? "الدروس المكتملة" : "Lessons completed"}
            value={
              lessonsLoading
                ? "…"
                : `${completedCount} / ${totalAccessible}`
            }
            note={
              lessonsLoading
                ? ""
                : totalAccessible === 0
                  ? isAr
                    ? "لا توجد دروس متاحة بعد"
                    : "No lessons available yet"
                  : isAr
                    ? `${progressPct}٪ من المنهج`
                    : `${progressPct}% of your course`
            }
            testId="stat-lessons-completed"
          />
          <StatCard
            icon={<Layers size={20} />}
            tone="from-indigo-600 to-blue-600"
            label={isAr ? "الوحدات المفتوحة" : "Unlocked levels"}
            value={
              lessonsLoading ? "…" : String(allowedLevels.length || 0)
            }
            note={
              lessonsLoading
                ? ""
                : allowedLevels.length > 0
                  ? allowedLevels.join(" · ")
                  : isAr
                    ? "لا يوجد"
                    : "None"
            }
            testId="stat-unlocked-levels"
          />
          <StatCard
            icon={<CalendarDays size={20} />}
            tone={
              minDays !== null && minDays <= 7
                ? "from-rose-500 to-red-600"
                : "from-amber-500 to-orange-600"
            }
            label={isAr ? "أقرب انتهاء اشتراك" : "Next renewal"}
            value={
              enrollmentsQuery.isLoading
                ? "…"
                : minDays === null
                  ? hasAccess
                    ? "∞"
                    : "—"
                  : isAr
                    ? `${minDays} ${minDays === 1 ? "يوم" : "يوماً"}`
                    : `${minDays} ${minDays === 1 ? "day" : "days"}`
            }
            note={
              minDays !== null && minDays <= 7
                ? isAr
                  ? "ينتهي قريباً"
                  : "Expiring soon"
                : ""
            }
            testId="stat-next-renewal"
          />
          <StatCard
            icon={<Clock size={20} />}
            tone="from-fuchsia-500 to-purple-600"
            label={isAr ? "وقت الدراسة" : "Study time"}
            value={
              studyTimeQuery.isLoading
                ? "…"
                : formatStudyMinutes(studyMinutes, isAr)
            }
            note={
              studyTimeQuery.isLoading
                ? ""
                : isAr
                  ? "آخر 7 أيام"
                  : "Last 7 days"
            }
            testId="stat-study-time"
          />
          <StatCard
            icon={<Flame size={20} />}
            tone="from-orange-500 to-red-600"
            label={isAr ? "السلسلة اليومية" : "Daily streak"}
            value={
              streakQuery.isLoading
                ? "…"
                : isAr
                  ? `${currentStreak} يوم`
                  : `${currentStreak} ${currentStreak === 1 ? "day" : "days"}`
            }
            note={
              streakQuery.isLoading
                ? ""
                : isAr
                  ? `الأطول: ${longestStreak} · ${todayActive ? "نشِط اليوم" : "تابع اليوم"}`
                  : `Best: ${longestStreak} · ${todayActive ? "Active today" : "Resume today"}`
            }
            testId="stat-streak"
          />
        </section>

        {/* ── Course progress card ──────────────────────────────── */}
        <section
          className="mt-6 bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
          data-testid="card-course-progress"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow">
                <Target size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight">
                  {isAr ? "تقدّمك في الكورس" : "Course progress"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? "نسبة الدروس التي أنهيتها من الوحدات المتاحة لك."
                    : "Lessons you've completed across the levels in your plan."}
                </p>
              </div>
            </div>
            <span
              className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums"
              data-testid="text-progress-percent"
            >
              {lessonsLoading ? "…" : `${progressPct}%`}
            </span>
          </div>

          <div
            className="mt-4 h-3 w-full rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 transition-all"
              style={{ width: `${progressPct}%` }}
              data-testid="bar-progress"
            />
          </div>

          {!lessonsLoading && totalAccessible > 0 && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? `أنهيت ${completedCount} من ${totalAccessible} درساً.`
                : `You've finished ${completedCount} of ${totalAccessible} lessons.`}
            </p>
          )}
        </section>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Today's tasks ──────────────────────────────────── */}
          <section
            className="lg:col-span-2 bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
            data-testid="card-today-tasks"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  {isAr ? "مهام اليوم" : "Today's tasks"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? "خطوتان موصى بهما لإبقاء تقدّمك مستمراً."
                    : "Two suggested actions to keep your streak going."}
                </p>
              </div>
            </div>

            {lessonsError ? (
              <p className="mt-5 text-sm text-rose-600 dark:text-rose-400">
                {isAr
                  ? "تعذّر تحميل الدروس. حاول لاحقاً."
                  : "Couldn't load your lessons. Please try again later."}
              </p>
            ) : lessonsLoading ? (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                {isAr ? "جاري التحميل…" : "Loading…"}
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {(() => {
                  // Prefer the server-picked last-watched lesson (most
                  // recently touched, still resumable, still unlocked).
                  // Fall back to the locally derived inProgressLesson, then
                  // to the next unstarted lesson, matching prior behavior.
                  const resumeId = lastLesson?.id ?? inProgressLesson?.id ?? null;
                  const resumeTitle = lastLesson
                    ? lang === "ar"
                      ? (lastLesson.titleAr ?? lastLesson.title)
                      : lastLesson.title
                    : inProgressLesson
                      ? lessonTitle(inProgressLesson, isAr)
                      : null;
                  const dur = lastLesson?.durationSeconds ?? 0;
                  const watched = lastLesson?.watchedSeconds ?? 0;
                  const pct =
                    dur > 0
                      ? Math.min(100, Math.max(0, Math.round((watched / dur) * 100)))
                      : 0;
                  const pos = lastLesson?.lastPositionSeconds ?? 0;
                  const meta =
                    lastLesson && dur > 0
                      ? isAr
                        ? ` · ${pct}٪ · المتابعة من ${formatResumeAt(pos)}`
                        : ` · ${pct}% · Resume at ${formatResumeAt(pos)}`
                      : "";
                  const href =
                    resumeId !== null
                      ? `/dashboard/english/lessons?lesson=${resumeId}`
                      : "/dashboard/english/lessons";
                  return (
                    <TaskRow
                      testId="task-continue-lesson"
                      icon={<PlayCircle size={18} />}
                      iconTone="from-indigo-600 to-purple-600"
                      title={
                        resumeTitle
                          ? isAr
                            ? "تابع الدرس الذي بدأته"
                            : "Continue your lesson"
                          : nextLesson
                            ? isAr
                              ? "ابدأ الدرس التالي"
                              : "Start your next lesson"
                            : isAr
                              ? "أنهيت كل الدروس المتاحة"
                              : "All available lessons completed"
                      }
                      subtitle={
                        resumeTitle
                          ? `${resumeTitle}${meta}`
                          : nextLesson
                            ? lessonTitle(nextLesson, isAr)
                            : isAr
                              ? "ترقّب المزيد من المحتوى قريباً"
                              : "More lessons are on the way"
                      }
                      href={href}
                      ctaLabel={
                        resumeTitle
                          ? isAr
                            ? "تابع"
                            : "Resume"
                          : nextLesson
                            ? isAr
                              ? "ابدأ"
                              : "Start"
                            : isAr
                              ? "تصفّح الدروس"
                              : "Browse lessons"
                      }
                      isAr={isAr}
                      disabled={!resumeTitle && !nextLesson}
                    />
                  );
                })()}
                <TaskRow
                  testId="task-review-flashcards"
                  icon={<BookOpen size={18} />}
                  iconTone="from-fuchsia-600 to-pink-600"
                  title={isAr ? "راجع البطاقات اليوم" : "Review flashcards"}
                  subtitle={
                    isAr
                      ? "ثبّت المفردات الجديدة بمراجعة سريعة."
                      : "Lock in new vocabulary with a quick review session."
                  }
                  href="/dashboard/english/flashcards"
                  ctaLabel={isAr ? "ابدأ المراجعة" : "Start review"}
                  isAr={isAr}
                />
              </ul>
            )}
          </section>

          {/* ── Upcoming lessons ───────────────────────────────── */}
          <section
            className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
            data-testid="card-upcoming-lessons"
          >
            <h2 className="text-lg font-bold tracking-tight">
              {isAr ? "الدروس القادمة" : "Upcoming lessons"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAr
                ? "أقرب الدروس التي لم تنهها بعد."
                : "The next lessons you haven't finished yet."}
            </p>

            {lessonsLoading ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {isAr ? "جاري التحميل…" : "Loading…"}
              </p>
            ) : upcomingLessons.length === 0 ? (
              <p
                className="mt-4 text-sm text-slate-500 dark:text-slate-400"
                data-testid="text-no-upcoming-lessons"
              >
                {accessibleLessons.length === 0
                  ? isAr
                    ? "لم تُضف دروس لمستواك بعد."
                    : "No lessons available for your level yet."
                  : isAr
                    ? "أنهيت كل الدروس المتاحة 🎉"
                    : "You've completed every available lesson 🎉"}
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {upcomingLessons.map((l, idx) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-800/60 ring-1 ring-slate-200/70 dark:ring-gray-700/70"
                    data-testid={`upcoming-lesson-${l.id}`}
                  >
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {lessonTitle(l, isAr)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {l.level}
                        {l.progress && l.progress.durationSeconds > 0
                          ? ` · ${Math.min(
                              100,
                              Math.round(
                                (l.progress.watchedSeconds /
                                  l.progress.durationSeconds) *
                                  100,
                              ),
                            )}%`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/dashboard/english/lessons"
              data-testid="link-all-lessons"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
            >
              {isAr ? "كل الدروس" : "All lessons"}
              <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
            </Link>
          </section>
        </div>

        {/* ── Locked levels hint ────────────────────────────────── */}
        {!lessonsLoading && allLessons.some((l) => l.locked) && (
          <section
            className="mt-6 bg-slate-50 dark:bg-gray-900/60 rounded-2xl p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 flex items-start gap-3"
            data-testid="section-locked-hint"
          >
            <Lock
              size={16}
              className="mt-0.5 text-slate-400 dark:text-slate-500 shrink-0"
            />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? "بعض الدروس مقفلة لأنها خارج باقتك الحالية. رقّ خطّتك للوصول إلى كل المستويات."
                : "Some lessons are locked because they're outside your current plan. Upgrade to unlock all levels."}{" "}
              <Link
                href="/english"
                className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
              >
                {isAr ? "عرض الباقات" : "See plans"}
              </Link>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

// ─────────────────── Sub-components ───────────────────

function StatCard({
  icon,
  tone,
  label,
  value,
  note,
  testId,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  note?: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow flex items-start gap-4"
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-md shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 break-words">
          {value}
        </p>
        {note && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  testId,
  icon,
  iconTone,
  title,
  subtitle,
  href,
  ctaLabel,
  isAr,
  disabled,
}: {
  testId: string;
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  isAr: boolean;
  disabled?: boolean;
}) {
  const Inner = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconTone} text-white flex items-center justify-center shadow shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight truncate">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtitle}
        </p>
      </div>
    </div>
  );

  return (
    <li data-testid={testId}>
      {disabled ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 ring-1 ring-slate-200/70 dark:ring-gray-700/70 opacity-70">
          {Inner}
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            {isAr ? "—" : "—"}
          </span>
        </div>
      ) : (
        <Link
          href={href}
          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 ring-1 ring-slate-200/70 dark:ring-gray-700/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:ring-indigo-200 dark:hover:ring-indigo-800 transition"
        >
          {Inner}
          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
            {ctaLabel}
            <ArrowRight size={13} className={isAr ? "rotate-180" : ""} />
          </span>
        </Link>
      )}
    </li>
  );
}
