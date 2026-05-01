import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Users,
  KeyRound,
  Plus,
  X,
  Trash2,
  Copy,
  Check,
  Search,
  Pencil,
  GraduationCap,
  HelpCircle,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  LayoutDashboard,
  Mail,
  ChevronRight,
  Send,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Header from "@/components/Header";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import {
  fetchStudents,
  grantTier,
  revokeEnrollment,
  fetchAccessCodes,
  createAccessCodes,
  revokeAccessCode,
  patchStudent,
  deleteStudent,
  fetchAllEnrollments,
  patchEnrollment,
  deleteEnrollment,
  fetchAdminFaqs,
  createFaq,
  patchFaq,
  deleteFaq,
  reorderFaqs,
  fetchAdminCourses,
  patchCourse,
  fetchAdminStats,
  fetchEmailRecipientsCount,
  broadcastEmail,
  fetchEmailLog,
  fetchExpiringEnrollments,
  sendExpiryReminders,
  type EmailLogRow,
  type EmailLogType,
  type ExpiringEnrollmentRow,
  TIER_LABELS,
  ENGLISH_TIER_LABELS,
  type Tier,
  type EnglishTier,
  type Student,
  type AccessCodeRow,
  type AdminEnrollmentRow,
  type FaqRow,
  type CourseRow,
} from "@/lib/platform-api";

type Tab =
  | "overview"
  | "students"
  | "enrollments"
  | "faqs"
  | "courses"
  | "communication"
  | "codes";

const TAB_DEFS: {
  key: Tab;
  icon: React.ReactNode;
  labelKey: TranslationKey;
}[] = [
  { key: "overview", icon: <LayoutDashboard size={16} />, labelKey: "admin.tab.overview" },
  { key: "students", icon: <Users size={16} />, labelKey: "admin.tab.students" },
  { key: "enrollments", icon: <GraduationCap size={16} />, labelKey: "admin.tab.enrollments" },
  { key: "faqs", icon: <HelpCircle size={16} />, labelKey: "admin.tab.faqs" },
  { key: "courses", icon: <BookOpen size={16} />, labelKey: "admin.tab.courses" },
  { key: "communication", icon: <Mail size={16} />, labelKey: "admin.tab.communication" },
  { key: "codes", icon: <KeyRound size={16} />, labelKey: "admin.tab.codes" },
];

export default function AdminDashboard() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");
  const activeDef = TAB_DEFS.find((d) => d.key === tab) ?? TAB_DEFS[0]!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-gray-950 dark:via-indigo-950/40 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Breadcrumbs */}
        <nav
          aria-label="breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3"
        >
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {t("admin.title")}
          </span>
          <ChevronRight size={12} className="opacity-60 rtl:rotate-180" />
          <span>{t(activeDef.labelKey)}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
            {t(activeDef.labelKey)}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
            {t("admin.subtitle")}
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2">
              <nav className="flex flex-col gap-1">
                {TAB_DEFS.map((d) => (
                  <SidebarLink
                    key={d.key}
                    active={tab === d.key}
                    onClick={() => setTab(d.key)}
                    icon={d.icon}
                  >
                    {t(d.labelKey)}
                  </SidebarLink>
                ))}
              </nav>
            </div>
          </aside>

          {/* Mobile horizontal scroll tabs */}
          <nav
            className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto"
            data-testid="mobile-tabs"
          >
            <div className="flex gap-2 border-b border-slate-200 dark:border-gray-800 pb-px min-w-max">
              {TAB_DEFS.map((d) => (
                <TabButton
                  key={d.key}
                  active={tab === d.key}
                  onClick={() => setTab(d.key)}
                  icon={d.icon}
                >
                  {t(d.labelKey)}
                </TabButton>
              ))}
            </div>
          </nav>

          {/* Content */}
          <section className="flex-1 min-w-0">
            {tab === "overview" && <OverviewTab />}
            {tab === "students" && <StudentsTab />}
            {tab === "enrollments" && <EnrollmentsTab />}
            {tab === "faqs" && <FaqsTab />}
            {tab === "courses" && <CoursesTab />}
            {tab === "communication" && <CommunicationTab />}
            {tab === "codes" && <CodesTab />}
          </section>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full inline-flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition text-left rtl:text-right ${
        active
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800"
      }`}
    >
      <span className={active ? "text-white" : "text-indigo-600 dark:text-indigo-400"}>
        {icon}
      </span>
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition whitespace-nowrap ${
        active
          ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
          : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ───────────────────────── OVERVIEW TAB ─────────────────────────

function OverviewTab() {
  const t = useT();
  const { lang } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });

  if (isLoading) return <LoadingPanel />;
  if (error) return <ErrorPanel msg={(error as Error).message} />;
  if (!data) return null;

  const fmtNumber = (n: number) =>
    new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US").format(n);
  const fmtPct = (n: number) =>
    new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(n);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={t("admin.overview.totalUsers")}
          value={fmtNumber(data.totalUsers)}
          accent="indigo"
        />
        <StatCard
          label={t("admin.overview.activeToday")}
          value={fmtNumber(data.activeToday)}
          accent="violet"
        />
        <StatCard
          label={t("admin.overview.activeWeek")}
          value={fmtNumber(data.activeThisWeek)}
          accent="blue"
        />
        <StatCard
          label={t("admin.overview.totalEnrollments")}
          value={fmtNumber(data.totalActiveEnrollments)}
          accent="purple"
        />
        <StatCard
          label={t("admin.overview.conversion")}
          value={fmtPct(data.conversionRate)}
          accent="indigo"
        />
        <StatCard
          label={t("admin.overview.revenue")}
          value="$0"
          subValue={t("admin.overview.revenueNote")}
          accent="violet"
        />
        <StatCard
          label={t("admin.overview.totalStudents")}
          value={fmtNumber(data.totalStudents)}
          accent="blue"
        />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
        {t("admin.overview.activeProxyNote")}
      </p>

      {/* Tier breakdown */}
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
          {t("admin.overview.tierBreakdown")}
        </h2>
        {data.enrollmentsByTier.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("admin.overview.noEnrollmentsYet")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.enrollmentsByTier.map((row) => {
              const label =
                row.course === "intro"
                  ? TIER_LABELS[row.tier as Tier]?.[lang] ?? row.tier
                  : ENGLISH_TIER_LABELS[row.tier as EnglishTier]?.[lang] ??
                    row.tier;
              return (
                <div
                  key={`${row.course}-${row.tier}`}
                  className="rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 px-3 py-2"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {row.course === "intro"
                      ? t("admin.course.intro")
                      : t("admin.course.english")}
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {label}
                  </div>
                  <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {fmtNumber(row.count)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title={t("admin.overview.signupTrend")}
          data={data.signupsDaily30}
          stroke="#6B2FE6"
        />
        <ChartCard
          title={t("admin.overview.enrollmentTrend")}
          data={data.enrollmentsDaily30}
          stroke="#4F7FFF"
        />
      </div>

      {/* Recent signups */}
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-gray-800">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {t("admin.overview.recentSignups")}
          </h2>
        </div>
        {data.recentSignups.length === 0 ? (
          <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
            {t("admin.overview.noSignupsYet")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-950 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <Th>{t("admin.col.name")}</Th>
                <Th>{t("admin.col.email")}</Th>
                <Th>{t("admin.col.role")}</Th>
                <Th>{t("admin.col.signedUp")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {data.recentSignups.map((u) => (
                <tr key={u.id}>
                  <Td>{u.name}</Td>
                  <Td>{u.email}</Td>
                  <Td>{u.role}</Td>
                  <Td>{new Date(u.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  accent,
}: {
  label: string;
  value: string;
  subValue?: string;
  accent: "indigo" | "violet" | "blue" | "purple";
}) {
  const accents: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-violet-500 to-violet-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-fuchsia-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accents[accent]}`} />
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {subValue && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          {subValue}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  data,
  stroke,
}: {
  title: string;
  data: { date: string; count: number }[];
  stroke: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
        {title}
      </h2>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={(d: string) => d.slice(5)}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.92)",
                border: "none",
                borderRadius: 8,
                color: "#f1f5f9",
                fontSize: 12,
              }}
              labelStyle={{ color: "#cbd5e1" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={stroke}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ───────────────────────── COMMUNICATION TAB ─────────────────────────

function CommunicationTab() {
  const t = useT();
  const [audience, setAudience] = useState<"all" | "course">("all");
  const [courseSlug, setCourseSlug] = useState<"intro" | "english" | "ielts">("intro");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!subject.trim() || !body.trim()) {
      setFeedback({ type: "error", msg: t("admin.comm.errMissing") });
      return;
    }
    try {
      const count = await fetchEmailRecipientsCount(
        audience,
        audience === "course" ? courseSlug : undefined,
      );
      const ok = window.confirm(
        t("admin.comm.confirm").replace("{n}", String(count)),
      );
      if (!ok) return;
      setSending(true);
      const result = await broadcastEmail({
        audience,
        courseSlug: audience === "course" ? courseSlug : undefined,
        subject: subject.trim(),
        body: body.trim(),
      });
      setFeedback({
        type: "success",
        msg: t("admin.comm.sent")
          .replace("{sent}", String(result.sentCount))
          .replace("{total}", String(result.recipientCount))
          .replace("{failed}", String(result.failedCount)),
      });
      setSubject("");
      setBody("");
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to send",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          {t("admin.comm.stubBanner")}
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 space-y-4"
      >
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {t("admin.comm.title")}
        </h2>

        <Field label={t("admin.comm.audience")}>
          <div className="flex flex-wrap gap-2">
            <RadioPill
              checked={audience === "all"}
              onChange={() => setAudience("all")}
              label={t("admin.comm.audienceAll")}
            />
            <RadioPill
              checked={audience === "course"}
              onChange={() => setAudience("course")}
              label={t("admin.comm.audienceCourse")}
            />
          </div>
        </Field>

        {audience === "course" && (
          <Field label={t("admin.comm.course")}>
            <select
              value={courseSlug}
              onChange={(e) =>
                setCourseSlug(e.target.value as "intro" | "english" | "ielts")
              }
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm w-full sm:w-64"
            >
              <option value="intro">{t("admin.course.intro")}</option>
              <option value="english">{t("admin.course.english")}</option>
              <option value="ielts">{t("admin.course.ielts")}</option>
            </select>
          </Field>
        )}

        <Field label={t("admin.comm.subject")}>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
            placeholder={t("admin.comm.subjectPh")}
          />
        </Field>

        <Field label={t("admin.comm.body")}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm font-mono"
            placeholder={t("admin.comm.bodyPh")}
          />
        </Field>

        {feedback && (
          <div
            className={`text-sm rounded-lg px-3 py-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 disabled:opacity-60 shadow-sm"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {t("admin.comm.send")}
          </button>
        </div>
      </form>

      <ExpiryRemindersCard />
      <EmailLogCard />
    </div>
  );
}

function ExpiryRemindersCard() {
  const t = useT();
  const qc = useQueryClient();
  const [days, setDays] = useState(7);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "email", "expiring", days],
    queryFn: () => fetchExpiringEnrollments(days),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendExpiryReminders(days),
    onSuccess: (r) => {
      setFeedback({
        type: "success",
        msg: t("admin.expiry.sentMsg")
          .replace("{sent}", String(r.sentCount))
          .replace("{considered}", String(r.considered))
          .replace("{skipped}", String(r.skippedCount))
          .replace("{failed}", String(r.failedCount)),
      });
      qc.invalidateQueries({ queryKey: ["admin", "email", "expiring"] });
      qc.invalidateQueries({ queryKey: ["admin", "emails"] });
    },
    onError: (err) =>
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed",
      }),
  });

  const enrollments: ExpiringEnrollmentRow[] = data?.enrollments ?? [];
  const pending = enrollments.filter((e) => !e.alreadyReminded).length;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {t("admin.expiry.title")}
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>{t("admin.expiry.windowLabel")}</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950"
          >
            <option value={3}>3</option>
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
          </select>
          <span>{t("admin.expiry.days")}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <Loader2 size={14} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t("admin.expiry.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-gray-800">
                <th className="px-5 sm:px-6 py-2 font-medium">
                  {t("admin.expiry.col.student")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.expiry.col.course")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.expiry.col.tier")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.expiry.col.expiresAt")}
                </th>
                <th className="px-5 sm:px-6 py-2 font-medium">
                  {t("admin.expiry.col.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr
                  key={e.enrollmentId}
                  className="border-b border-slate-100 dark:border-gray-800/60"
                >
                  <td className="px-5 sm:px-6 py-2">
                    <div className="font-medium text-slate-700 dark:text-slate-200">
                      {e.userName}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {e.userEmail}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 capitalize">
                    {e.course}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 capitalize">
                    {e.tier}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {new Date(e.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 sm:px-6 py-2">
                    {e.alreadyReminded ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <Check size={12} />
                        {t("admin.expiry.statusReminded")}
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">
                        {t("admin.expiry.statusPending")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {feedback && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={sendMutation.isPending || pending === 0}
          onClick={() => {
            if (
              window.confirm(
                t("admin.expiry.confirm").replace("{n}", String(pending)),
              )
            ) {
              setFeedback(null);
              sendMutation.mutate();
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 disabled:opacity-50 shadow-sm"
        >
          {sendMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Send size={13} />
          )}
          {t("admin.expiry.sendBtn").replace("{n}", String(pending))}
        </button>
      </div>
    </div>
  );
}

const EMAIL_TYPE_OPTIONS: { value: "" | EmailLogType; labelKey: TranslationKey }[] = [
  { value: "", labelKey: "admin.emailLog.allTypes" },
  { value: "welcome", labelKey: "admin.emailLog.type.welcome" },
  {
    value: "enrollment_confirmation",
    labelKey: "admin.emailLog.type.enrollment_confirmation",
  },
  { value: "course_access", labelKey: "admin.emailLog.type.course_access" },
  { value: "expiry_reminder", labelKey: "admin.emailLog.type.expiry_reminder" },
  {
    value: "admin_new_signup",
    labelKey: "admin.emailLog.type.admin_new_signup",
  },
  {
    value: "admin_new_enrollment",
    labelKey: "admin.emailLog.type.admin_new_enrollment",
  },
  { value: "broadcast", labelKey: "admin.emailLog.type.broadcast" },
  {
    value: "email_verification",
    labelKey: "admin.emailLog.type.email_verification",
  },
  {
    value: "password_reset",
    labelKey: "admin.emailLog.type.password_reset",
  },
];

function EmailLogCard() {
  const t = useT();
  const [typeFilter, setTypeFilter] = useState<"" | EmailLogType>("");
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed">("");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "emails", typeFilter, statusFilter],
    queryFn: () =>
      fetchEmailLog({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      }),
  });
  const rows: EmailLogRow[] = data ?? [];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {t("admin.emailLog.title")}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "" | EmailLogType)
            }
            className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950"
          >
            {EMAIL_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "" | "sent" | "failed")
            }
            className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950"
          >
            <option value="">{t("admin.emailLog.allStatuses")}</option>
            <option value="sent">{t("admin.emailLog.statusSent")}</option>
            <option value="failed">{t("admin.emailLog.statusFailed")}</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {isFetching ? (
              <Loader2 size={11} className="inline animate-spin" />
            ) : (
              t("admin.emailLog.refresh")
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <Loader2 size={14} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t("admin.emailLog.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-gray-800">
                <th className="px-5 sm:px-6 py-2 font-medium">
                  {t("admin.emailLog.col.when")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.emailLog.col.type")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.emailLog.col.recipient")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.emailLog.col.subject")}
                </th>
                <th className="px-5 sm:px-6 py-2 font-medium">
                  {t("admin.emailLog.col.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 dark:border-gray-800/60 align-top"
                >
                  <td className="px-5 sm:px-6 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {new Date(r.sentAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium">
                      {r.emailType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                    {r.toEmail}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate max-w-[300px]">
                    {r.subject}
                  </td>
                  <td className="px-5 sm:px-6 py-2">
                    {r.status === "sent" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <Check size={11} />
                        {t("admin.emailLog.statusSent")}
                      </span>
                    ) : (
                      <span
                        className="text-rose-700 dark:text-rose-300"
                        title={r.error ?? undefined}
                      >
                        {t("admin.emailLog.statusFailed")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RadioPill({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
        checked
          ? "bg-indigo-600 border-indigo-600 text-white"
          : "bg-white dark:bg-gray-950 border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400"
      }`}
    >
      {label}
    </button>
  );
}

// ───────────────────────── STUDENTS TAB ─────────────────────────

function StudentsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [grantingFor, setGrantingFor] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["admin-students"],
    queryFn: fetchStudents,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeEnrollment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-students"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
    },
    onError: (err) => window.alert((err as Error).message),
  });

  const filtered = useMemo(() => {
    const list = studentsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [studentsQuery.data, search]);

  if (studentsQuery.isLoading) return <LoadingPanel />;
  if (studentsQuery.isError) return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder={t("admin.students.search")}
            className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <Th>{t("admin.students.col.name")}</Th>
                <Th>{t("admin.students.col.email")}</Th>
                <Th>{t("admin.students.col.role")}</Th>
                <Th>{t("admin.students.col.tiers")}</Th>
                <Th>{t("admin.students.col.joined")}</Th>
                <Th align="right">{t("admin.students.col.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40">
                  <Td className="font-medium">{s.name}</Td>
                  <Td className="text-slate-600 dark:text-slate-300" ltr>{s.email}</Td>
                  <Td>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${s.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200" : "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-200"}`}>
                      {s.role}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {s.enrollments.length === 0 ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        s.enrollments.map((e) => (
                          <span
                            key={e.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                              e.status === "active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                : "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-slate-400 line-through"
                            }`}
                          >
                            {e.tier}
                            {e.status === "active" && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(t("admin.students.confirmRevoke"))) {
                                    revokeMutation.mutate(e.id);
                                  }
                                }}
                                className="hover:text-rose-600"
                                title={t("admin.students.revoke")}
                              >
                                <X size={11} />
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </Td>
                  <Td className="text-slate-500 dark:text-slate-400 text-xs">
                    {new Date(s.createdAt).toLocaleDateString(
                      lang === "ar" ? "ar-EG" : "en-US",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </Td>
                  <Td align="right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setGrantingFor(s)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
                      >
                        <Plus size={13} /> {t("admin.students.grant")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStudent(s)}
                        className="text-slate-400 hover:text-indigo-600 transition"
                        title={t("admin.students.edit")}
                      >
                        <Pencil size={14} />
                      </button>
                      {currentUser?.id !== s.id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                t("admin.students.confirmDelete").replace(
                                  "{name}",
                                  s.name,
                                ),
                              )
                            ) {
                              deleteMutation.mutate(s.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title={t("admin.students.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                    —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {grantingFor && (
        <GrantTierModal
          student={grantingFor}
          onClose={() => setGrantingFor(null)}
          onGranted={() => {
            setGrantingFor(null);
            qc.invalidateQueries({ queryKey: ["admin-students"] });
          }}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          isSelf={currentUser?.id === editingStudent.id}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            qc.invalidateQueries({ queryKey: ["admin-students"] });
          }}
        />
      )}
    </div>
  );
}

function EditStudentModal({
  student,
  isSelf,
  onClose,
  onSaved,
}: {
  student: Student;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(student.name);
  const [role, setRole] = useState<"student" | "admin">(
    student.role === "admin" ? "admin" : "student",
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      patchStudent(student.id, {
        ...(name !== student.name ? { name } : {}),
        ...(role !== student.role ? { role } : {}),
      }),
    onSuccess: onSaved,
  });

  const noChanges =
    name === student.name && role === student.role;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">{t("admin.students.editTitle")}</h3>
            <p className="text-sm text-slate-500 mt-0.5" dir="ltr">
              {student.email}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!noChanges) saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Field label={t("admin.students.editName")}>
            <input
              type="text"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              maxLength={120}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
          <Field label={t("admin.students.editRole")}>
            <select
              value={role}
              onChange={(ev) =>
                setRole(ev.target.value === "admin" ? "admin" : "student")
              }
              disabled={isSelf}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="student">student</option>
              <option value="admin">admin</option>
            </select>
            {isSelf && (
              <p className="mt-1.5 text-xs text-slate-500">
                {t("admin.students.editSelfNote")}
              </p>
            )}
          </Field>
          {saveMutation.isError && (
            <p className="text-rose-600 text-sm">
              {(saveMutation.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || noChanges}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {saveMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("admin.students.editSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GrantTierModal({
  student,
  onClose,
  onGranted,
}: {
  student: Student;
  onClose: () => void;
  onGranted: () => void;
}) {
  const t = useT();
  const [tier, setTier] = useState<Tier>("intro");
  const [note, setNote] = useState("");

  const grantMutation = useMutation({
    mutationFn: () => grantTier(student.id, tier, null, note || undefined),
    onSuccess: onGranted,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">{t("admin.students.grantTitle")}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{student.name} <span dir="ltr" className="text-xs">({student.email})</span></p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            grantMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t("admin.students.grantTier")}
            </label>
            <select
              value={tier}
              onChange={(ev) => setTier(ev.target.value as Tier)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {(Object.keys(TIER_LABELS) as Tier[]).map((tk) => (
                <option key={tk} value={tk}>
                  {TIER_LABELS[tk].en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t("admin.students.grantNote")}
            </label>
            <input
              type="text"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {grantMutation.isError && (
            <p className="text-rose-600 text-sm">{(grantMutation.error as Error).message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={grantMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {grantMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("admin.students.grantSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────── CODES TAB ─────────────────────────

function CodesTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [tier, setTier] = useState<Tier>("intro");
  const [count, setCount] = useState(5);
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const codesQuery = useQuery({
    queryKey: ["admin-codes"],
    queryFn: fetchAccessCodes,
  });

  const createMutation = useMutation({
    mutationFn: createAccessCodes,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-codes"] });
      setNote("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeAccessCode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-codes"] }),
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
    });
  }

  if (codesQuery.isError) return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Generator panel */}
      <aside className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 p-5 self-start">
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <Plus size={16} /> {t("admin.codes.generate.title")}
        </h2>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            createMutation.mutate({
              tier,
              count,
              maxUses,
              note: note || undefined,
            });
          }}
          className="space-y-3"
        >
          <Field label={t("admin.codes.generate.tier")}>
            <select
              value={tier}
              onChange={(ev) => setTier(ev.target.value as Tier)}
              className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              {(Object.keys(TIER_LABELS) as Tier[]).map((tk) => (
                <option key={tk} value={tk}>
                  {TIER_LABELS[tk].en}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("admin.codes.generate.count")}>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(ev) => setCount(Math.max(1, Math.min(100, +ev.target.value || 1)))}
              className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </Field>
          <Field label={t("admin.codes.generate.maxUses")}>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxUses}
              onChange={(ev) => setMaxUses(Math.max(1, Math.min(1000, +ev.target.value || 1)))}
              className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </Field>
          <Field label={t("admin.codes.generate.note")}>
            <input
              type="text"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </Field>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {t("admin.codes.generate.submit")}
          </button>
          {createMutation.isError && (
            <p className="text-rose-600 text-xs">{(createMutation.error as Error).message}</p>
          )}
        </form>
      </aside>

      {/* Codes list */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
        {codesQuery.isLoading ? (
          <LoadingPanel inline />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <Th>{t("admin.codes.col.code")}</Th>
                  <Th>{t("admin.codes.col.tier")}</Th>
                  <Th>{t("admin.codes.col.status")}</Th>
                  <Th>{t("admin.codes.col.uses")}</Th>
                  <Th>{t("admin.codes.col.redeemer")}</Th>
                  <Th>{t("admin.codes.col.created")}</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody>
                {(codesQuery.data ?? []).map((c) => (
                  <CodeRow
                    key={c.id}
                    c={c}
                    lang={lang}
                    copied={copiedCode === c.code}
                    onCopy={() => copyCode(c.code)}
                    onRevoke={() => {
                      if (window.confirm(t("admin.codes.confirmRevoke"))) {
                        revokeMutation.mutate(c.id);
                      }
                    }}
                  />
                ))}
                {(codesQuery.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-sm">
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeRow({
  c,
  lang,
  copied,
  onCopy,
  onRevoke,
}: {
  c: AccessCodeRow;
  lang: string;
  copied: boolean;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  const t = useT();
  const statusColor =
    c.status === "active"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
      : c.status === "used"
        ? "bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300"
        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200";
  return (
    <tr className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40">
      <Td>
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded" dir="ltr">
            {c.code}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="text-slate-400 hover:text-indigo-600 transition"
            title={t("admin.codes.copy")}
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
        </div>
      </Td>
      <Td>
        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
          {c.tier}
        </span>
      </Td>
      <Td>
        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>
          {c.status}
        </span>
      </Td>
      <Td className="text-xs text-slate-600 dark:text-slate-300">
        {c.usedCount} / {c.maxUses}
      </Td>
      <Td className="text-xs">
        {c.redeemerEmail ? (
          <span dir="ltr" className="text-slate-600 dark:text-slate-300">
            {c.redeemerEmail}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </Td>
      <Td className="text-xs text-slate-500 dark:text-slate-400">
        {new Date(c.createdAt).toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US",
          { day: "numeric", month: "short", year: "numeric" },
        )}
      </Td>
      <Td align="right">
        {c.status === "active" && (
          <button
            type="button"
            onClick={onRevoke}
            className="text-rose-500 hover:text-rose-700"
            title={t("admin.students.revoke")}
          >
            <Trash2 size={14} />
          </button>
        )}
      </Td>
    </tr>
  );
}

// ───────────────────────── ENROLLMENTS TAB ─────────────────────────

const STATUS_LABELS = {
  active: { en: "Active", ar: "نشط", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" },
  expired: { en: "Expired", ar: "منتهي", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" },
  revoked: { en: "Revoked", ar: "ملغى", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" },
} as const;

function EnrollmentsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "expired" | "revoked">("");
  const [courseFilter, setCourseFilter] = useState<"" | "intro" | "english">("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [editing, setEditing] = useState<AdminEnrollmentRow | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ["admin-enrollments", statusFilter, tierFilter, courseFilter],
    queryFn: () =>
      fetchAllEnrollments({
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
        course: courseFilter || undefined,
      }),
  });

  const patchMutation = useMutation({
    mutationFn: (args: {
      row: AdminEnrollmentRow;
      status: "active" | "revoked";
    }) => patchEnrollment(args.row.id, args.row.course, { status: args.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (err: Error) => alert(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (row: AdminEnrollmentRow) =>
      deleteEnrollment(row.id, row.course),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (err: Error) => alert(err.message),
  });

  if (enrollmentsQuery.isError) return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  const rows = enrollmentsQuery.data ?? [];

  // Tier options depend on selected course (or union of both).
  const tierOptions: { value: string; label: string }[] =
    courseFilter === "english"
      ? Object.entries(ENGLISH_TIER_LABELS).map(([v, l]) => ({ value: v, label: l[lang] }))
      : courseFilter === "intro"
      ? Object.entries(TIER_LABELS).map(([v, l]) => ({ value: v, label: l[lang] }))
      : [
          ...Object.entries(TIER_LABELS).map(([v, l]) => ({ value: v, label: l[lang] })),
          ...Object.entries(ENGLISH_TIER_LABELS).map(([v, l]) => ({ value: v, label: l[lang] })),
        ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={courseFilter}
          onChange={(ev) => {
            setCourseFilter(ev.target.value as typeof courseFilter);
            setTierFilter("");
          }}
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.enrollments.filter.allCourses")}</option>
          <option value="intro">{t("admin.course.intro")}</option>
          <option value="english">{t("admin.course.english")}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(ev) => setStatusFilter(ev.target.value as typeof statusFilter)}
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.enrollments.filter.allStatus")}</option>
          <option value="active">{STATUS_LABELS.active[lang === "ar" ? "ar" : "en"]}</option>
          <option value="expired">{STATUS_LABELS.expired[lang === "ar" ? "ar" : "en"]}</option>
          <option value="revoked">{STATUS_LABELS.revoked[lang === "ar" ? "ar" : "en"]}</option>
        </select>
        <select
          value={tierFilter}
          onChange={(ev) => setTierFilter(ev.target.value)}
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.enrollments.filter.allTiers")}</option>
          {tierOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500 ms-auto">
          {rows.length} {t("admin.enrollments.count")}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
        {enrollmentsQuery.isLoading ? (
          <LoadingPanel inline />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <Th>{t("admin.enrollments.col.student")}</Th>
                  <Th>{t("admin.enrollments.col.course")}</Th>
                  <Th>{t("admin.enrollments.col.tier")}</Th>
                  <Th>{t("admin.enrollments.col.status")}</Th>
                  <Th>{t("admin.enrollments.col.granted")}</Th>
                  <Th align="right">{t("admin.enrollments.col.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const tierLabel =
                    e.course === "intro"
                      ? TIER_LABELS[e.tier as Tier]?.[lang] ?? e.tier
                      : ENGLISH_TIER_LABELS[e.tier as EnglishTier]?.[lang] ?? e.tier;
                  return (
                    <tr key={`${e.course}-${e.id}`} className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40">
                      <Td>
                        <div className="font-medium">{e.studentName ?? "—"}</div>
                        <div className="text-xs text-slate-500" dir="ltr">{e.studentEmail ?? ""}</div>
                      </Td>
                      <Td>
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          {e.course === "intro" ? t("admin.course.intro") : t("admin.course.english")}
                        </span>
                      </Td>
                      <Td>
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                          {tierLabel}
                        </span>
                      </Td>
                      <Td>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_LABELS[e.status].color}`}>
                          {STATUS_LABELS[e.status][lang === "ar" ? "ar" : "en"]}
                        </span>
                      </Td>
                      <Td className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(e.grantedAt).toLocaleDateString(
                          lang === "ar" ? "ar-EG" : "en-US",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </Td>
                      <Td align="right">
                        <div className="inline-flex gap-1">
                          {e.status !== "active" && (
                            <button
                              type="button"
                              onClick={() => patchMutation.mutate({ row: e, status: "active" })}
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
                              title={t("admin.enrollments.approve")}
                            >
                              {t("admin.enrollments.approve")}
                            </button>
                          )}
                          {e.status === "active" && (
                            <button
                              type="button"
                              onClick={() => patchMutation.mutate({ row: e, status: "revoked" })}
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-200"
                              title={t("admin.enrollments.reject")}
                            >
                              {t("admin.enrollments.reject")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditing(e)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                            title={t("admin.enrollments.edit")}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(t("admin.enrollments.confirmDelete"))) {
                                deleteMutation.mutate(e);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title={t("admin.enrollments.delete")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EnrollmentEditModal
          enrollment={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
            qc.invalidateQueries({ queryKey: ["admin-students"] });
            qc.invalidateQueries({ queryKey: ["admin", "stats"] });
          }}
        />
      )}
    </div>
  );
}

function EnrollmentEditModal({
  enrollment,
  onClose,
  onSaved,
}: {
  enrollment: AdminEnrollmentRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [status, setStatus] = useState<"active" | "expired" | "revoked">(enrollment.status);
  const [expiresAt, setExpiresAt] = useState(
    enrollment.expiresAt ? enrollment.expiresAt.slice(0, 10) : "",
  );
  const [note, setNote] = useState(enrollment.note ?? "");

  const saveMutation = useMutation({
    mutationFn: () =>
      patchEnrollment(enrollment.id, enrollment.course, {
        status,
        expiresAt: expiresAt ? new Date(expiresAt + "T23:59:59Z").toISOString() : null,
        note: note.trim() || null,
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">{t("admin.enrollments.editTitle")}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {enrollment.studentName} <span dir="ltr">· {enrollment.tier}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Field label={t("admin.enrollments.col.status")}>
            <select
              value={status}
              onChange={(ev) => setStatus(ev.target.value as typeof status)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="active">active</option>
              <option value="expired">expired</option>
              <option value="revoked">revoked</option>
            </select>
          </Field>
          <Field label={t("admin.enrollments.col.expires")}>
            <input
              type="date"
              value={expiresAt}
              onChange={(ev) => setExpiresAt(ev.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              dir="ltr"
            />
            <p className="mt-1 text-xs text-slate-500">{t("admin.enrollments.expiresHint")}</p>
          </Field>
          <Field label={t("admin.students.grantNote")}>
            <input
              type="text"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </Field>
          {saveMutation.isError && (
            <p className="text-rose-600 text-sm">{(saveMutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("admin.students.editSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────── FAQ TAB ─────────────────────────

const COURSE_SLUGS = ["intro", "english", "ielts"] as const;

function FaqsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<FaqRow | "new" | null>(null);

  const faqsQuery = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: fetchAdminFaqs,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faqs"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderFaqs,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faqs"] }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      patchFaq(id, { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faqs"] }),
  });

  if (faqsQuery.isError) return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  const all = faqsQuery.data ?? [];
  const visible = all.filter((f) => {
    if (filter === "all") return true;
    if (filter === "global") return f.courseSlug === null;
    return f.courseSlug === filter;
  });

  function moveUp(faq: FaqRow) {
    const sameBucket = all
      .filter((f) => f.courseSlug === faq.courseSlug)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sameBucket.findIndex((f) => f.id === faq.id);
    if (idx <= 0) return;
    const reordered = [...sameBucket];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    reorderMutation.mutate(reordered.map((f) => f.id));
  }

  function moveDown(faq: FaqRow) {
    const sameBucket = all
      .filter((f) => f.courseSlug === faq.courseSlug)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sameBucket.findIndex((f) => f.id === faq.id);
    if (idx === -1 || idx >= sameBucket.length - 1) return;
    const reordered = [...sameBucket];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    reorderMutation.mutate(reordered.map((f) => f.id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filter}
          onChange={(ev) => setFilter(ev.target.value)}
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="all">{t("admin.faqs.filter.all")}</option>
          <option value="global">{t("admin.faqs.filter.global")}</option>
          {COURSE_SLUGS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="ms-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow"
        >
          <Plus size={14} /> {t("admin.faqs.add")}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
        {faqsQuery.isLoading ? (
          <LoadingPanel inline />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <Th>{t("admin.faqs.col.scope")}</Th>
                  <Th>{t("admin.faqs.col.question")}</Th>
                  <Th>{t("admin.faqs.col.published")}</Th>
                  <Th align="right">{t("admin.faqs.col.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr key={f.id} className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40 align-top">
                    <Td>
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-200">
                        {f.courseSlug ?? t("admin.faqs.global")}
                      </span>
                    </Td>
                    <Td>
                      <div className="font-medium max-w-md">
                        {lang === "ar" ? f.questionAr : f.questionEn}
                      </div>
                      <div className="text-xs text-slate-500 max-w-md truncate" dir={lang === "ar" ? "rtl" : "ltr"}>
                        {lang === "ar" ? f.questionEn : f.questionAr}
                      </div>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => togglePublishMutation.mutate({ id: f.id, isPublished: !f.isPublished })}
                        className="inline-flex items-center gap-1 text-xs"
                        title={f.isPublished ? t("admin.faqs.unpublish") : t("admin.faqs.publish")}
                      >
                        {f.isPublished ? (
                          <Eye size={14} className="text-emerald-600" />
                        ) : (
                          <EyeOff size={14} className="text-slate-400" />
                        )}
                        <span className={f.isPublished ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500"}>
                          {f.isPublished ? t("admin.faqs.published") : t("admin.faqs.draft")}
                        </span>
                      </button>
                    </Td>
                    <Td align="right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveUp(f)}
                          className="text-slate-400 hover:text-indigo-600"
                          title={t("admin.faqs.moveUp")}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(f)}
                          className="text-slate-400 hover:text-indigo-600"
                          title={t("admin.faqs.moveDown")}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(f)}
                          className="text-slate-400 hover:text-indigo-600 ms-1"
                          title={t("admin.faqs.edit")}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(t("admin.faqs.confirmDelete"))) {
                              deleteMutation.mutate(f.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600"
                          title={t("admin.faqs.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-500 text-sm">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <FaqEditModal
          faq={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-faqs"] });
          }}
        />
      )}
    </div>
  );
}

function FaqEditModal({
  faq,
  onClose,
  onSaved,
}: {
  faq: FaqRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [courseSlug, setCourseSlug] = useState<string>(faq?.courseSlug ?? "");
  const [questionEn, setQuestionEn] = useState(faq?.questionEn ?? "");
  const [questionAr, setQuestionAr] = useState(faq?.questionAr ?? "");
  const [answerEn, setAnswerEn] = useState(faq?.answerEn ?? "");
  const [answerAr, setAnswerAr] = useState(faq?.answerAr ?? "");
  const [isPublished, setIsPublished] = useState(faq?.isPublished ?? true);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        courseSlug: courseSlug || null,
        questionEn,
        questionAr,
        answerEn,
        answerAr,
        isPublished,
      };
      return faq ? patchFaq(faq.id, payload) : createFaq(payload);
    },
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800 my-8">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold">
            {faq ? t("admin.faqs.editTitle") : t("admin.faqs.addTitle")}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("admin.faqs.col.scope")}>
              <select
                value={courseSlug}
                onChange={(ev) => setCourseSlug(ev.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="">{t("admin.faqs.global")}</option>
                {COURSE_SLUGS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.faqs.publishedLabel")}>
              <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(ev) => setIsPublished(ev.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">
                  {isPublished ? t("admin.faqs.published") : t("admin.faqs.draft")}
                </span>
              </label>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("admin.faqs.questionEn")}>
              <input
                type="text"
                value={questionEn}
                onChange={(ev) => setQuestionEn(ev.target.value)}
                required
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.faqs.questionAr")}>
              <input
                type="text"
                value={questionAr}
                onChange={(ev) => setQuestionAr(ev.target.value)}
                required
                dir="rtl"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("admin.faqs.answerEn")}>
              <textarea
                value={answerEn}
                onChange={(ev) => setAnswerEn(ev.target.value)}
                required
                dir="ltr"
                rows={5}
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.faqs.answerAr")}>
              <textarea
                value={answerAr}
                onChange={(ev) => setAnswerAr(ev.target.value)}
                required
                dir="rtl"
                rows={5}
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          {saveMutation.isError && (
            <p className="text-rose-600 text-sm">{(saveMutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("admin.students.editSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────── COURSES TAB ─────────────────────────

function CoursesTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CourseRow | null>(null);

  const coursesQuery = useQuery({
    queryKey: ["admin-courses"],
    queryFn: fetchAdminCourses,
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ slug, isPublished }: { slug: string; isPublished: boolean }) =>
      patchCourse(slug, { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
  });

  if (coursesQuery.isError) return <ErrorPanel msg={t("admin.error.loadFailed")} />;
  if (coursesQuery.isLoading) return <LoadingPanel />;

  const courses = coursesQuery.data ?? [];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <div
            key={c.slug}
            className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 p-5"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="inline-flex px-2 py-0.5 text-xs font-mono font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-200">
                {c.slug}
              </span>
              <button
                type="button"
                onClick={() => togglePublishMutation.mutate({ slug: c.slug, isPublished: !c.isPublished })}
                className="inline-flex items-center gap-1 text-xs"
                title={c.isPublished ? t("admin.faqs.unpublish") : t("admin.faqs.publish")}
              >
                {c.isPublished ? (
                  <Eye size={14} className="text-emerald-600" />
                ) : (
                  <EyeOff size={14} className="text-slate-400" />
                )}
                <span className={c.isPublished ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500"}>
                  {c.isPublished ? t("admin.faqs.published") : t("admin.faqs.draft")}
                </span>
              </button>
            </div>
            <h3 className="text-base font-bold mt-2" dir={lang === "ar" ? "rtl" : "ltr"}>
              {lang === "ar" ? c.titleAr : c.titleEn}
            </h3>
            {(lang === "ar" ? c.subtitleAr : c.subtitleEn) && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1" dir={lang === "ar" ? "rtl" : "ltr"}>
                {lang === "ar" ? c.subtitleAr : c.subtitleEn}
              </p>
            )}
            <div className="mt-4 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 px-3 py-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  {t("admin.courses.totalEnrollments")}
                </span>
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {c.totalActiveEnrollments ?? 0}
                </span>
              </div>
              {c.tiers && c.tiers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.tiers.map((tr) => {
                    const label =
                      c.slug === "intro"
                        ? TIER_LABELS[tr.tier as Tier]?.[lang] ?? tr.tier
                        : c.slug === "english"
                        ? ENGLISH_TIER_LABELS[tr.tier as EnglishTier]?.[lang] ?? tr.tier
                        : tr.tier;
                    return (
                      <span
                        key={tr.tier}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-200"
                      >
                        {label}
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {tr.count}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
              {(!c.tiers || c.tiers.length === 0) && (
                <div className="mt-1 text-[11px] text-slate-400">
                  {t("admin.courses.noEnrollments")}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-3 text-xs text-slate-500">
              <span>{t("admin.courses.order")}: {c.displayOrder}</span>
              <button
                type="button"
                onClick={() => setEditing(c)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
              >
                <Pencil size={13} /> {t("admin.courses.edit")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <CourseEditModal
          course={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-courses"] });
          }}
        />
      )}
    </div>
  );
}

function CourseEditModal({
  course,
  onClose,
  onSaved,
}: {
  course: CourseRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [titleEn, setTitleEn] = useState(course.titleEn);
  const [titleAr, setTitleAr] = useState(course.titleAr);
  const [subtitleEn, setSubtitleEn] = useState(course.subtitleEn ?? "");
  const [subtitleAr, setSubtitleAr] = useState(course.subtitleAr ?? "");
  const [isPublished, setIsPublished] = useState(course.isPublished);
  const [displayOrder, setDisplayOrder] = useState(course.displayOrder);

  const saveMutation = useMutation({
    mutationFn: () =>
      patchCourse(course.slug, {
        titleEn,
        titleAr,
        subtitleEn: subtitleEn.trim() || null,
        subtitleAr: subtitleAr.trim() || null,
        isPublished,
        displayOrder,
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800 my-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">{t("admin.courses.editTitle")}</h3>
            <p className="text-sm text-slate-500 mt-0.5 font-mono">{course.slug}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("admin.courses.titleEn")}>
              <input
                type="text"
                value={titleEn}
                onChange={(ev) => setTitleEn(ev.target.value)}
                required
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.courses.titleAr")}>
              <input
                type="text"
                value={titleAr}
                onChange={(ev) => setTitleAr(ev.target.value)}
                required
                dir="rtl"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.courses.subtitleEn")}>
              <input
                type="text"
                value={subtitleEn}
                onChange={(ev) => setSubtitleEn(ev.target.value)}
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.courses.subtitleAr")}>
              <input
                type="text"
                value={subtitleAr}
                onChange={(ev) => setSubtitleAr(ev.target.value)}
                dir="rtl"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.courses.order")}>
              <input
                type="number"
                value={displayOrder}
                onChange={(ev) => setDisplayOrder(parseInt(ev.target.value, 10) || 0)}
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.faqs.publishedLabel")}>
              <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(ev) => setIsPublished(ev.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">
                  {isPublished ? t("admin.faqs.published") : t("admin.faqs.draft")}
                </span>
              </label>
            </Field>
          </div>
          {saveMutation.isError && (
            <p className="text-rose-600 text-sm">{(saveMutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("admin.students.editSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────── helpers ─────────────────────────

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({
  children,
  className = "",
  align,
  ltr,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "right";
  ltr?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 ${align === "right" ? "text-right" : ""} ${className}`}
      {...(ltr ? { dir: "ltr" } : {})}
    >
      {children}
    </td>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
function LoadingPanel({ inline = false }: { inline?: boolean }) {
  return (
    <div className={`${inline ? "py-12" : "min-h-[40vh]"} flex items-center justify-center`}>
      <Loader2 size={20} className="animate-spin text-slate-400" />
    </div>
  );
}
function ErrorPanel({ msg }: { msg: string }) {
  return (
    <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-2xl p-5 text-sm">
      {msg}
    </div>
  );
}
