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
} from "lucide-react";
import Header from "@/components/Header";
import { useT, useLanguage } from "@/lib/i18n";
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
  fetchAdminFaqs,
  createFaq,
  patchFaq,
  deleteFaq,
  reorderFaqs,
  fetchAdminCourses,
  patchCourse,
  TIER_LABELS,
  type Tier,
  type Student,
  type AccessCodeRow,
  type AdminEnrollmentRow,
  type FaqRow,
  type CourseRow,
} from "@/lib/platform-api";

type Tab = "students" | "enrollments" | "faqs" | "courses" | "codes";

export default function AdminDashboard() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("students");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-gray-950 dark:via-indigo-950/40 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
            {t("admin.title")}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
            {t("admin.subtitle")}
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-gray-800 mb-6">
          <TabButton active={tab === "students"} onClick={() => setTab("students")} icon={<Users size={15} />}>
            {t("admin.tab.students")}
          </TabButton>
          <TabButton active={tab === "enrollments"} onClick={() => setTab("enrollments")} icon={<GraduationCap size={15} />}>
            {t("admin.tab.enrollments")}
          </TabButton>
          <TabButton active={tab === "faqs"} onClick={() => setTab("faqs")} icon={<HelpCircle size={15} />}>
            {t("admin.tab.faqs")}
          </TabButton>
          <TabButton active={tab === "courses"} onClick={() => setTab("courses")} icon={<BookOpen size={15} />}>
            {t("admin.tab.courses")}
          </TabButton>
          <TabButton active={tab === "codes"} onClick={() => setTab("codes")} icon={<KeyRound size={15} />}>
            {t("admin.tab.codes")}
          </TabButton>
        </nav>

        {tab === "students" && <StudentsTab />}
        {tab === "enrollments" && <EnrollmentsTab />}
        {tab === "faqs" && <FaqsTab />}
        {tab === "courses" && <CoursesTab />}
        {tab === "codes" && <CodesTab />}
      </main>
    </div>
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
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
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
  const [tierFilter, setTierFilter] = useState<"" | Tier>("");
  const [editing, setEditing] = useState<AdminEnrollmentRow | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ["admin-enrollments", statusFilter, tierFilter],
    queryFn: () =>
      fetchAllEnrollments({
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
      }),
  });

  if (enrollmentsQuery.isError) return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  const rows = enrollmentsQuery.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
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
          onChange={(ev) => setTierFilter(ev.target.value as typeof tierFilter)}
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.enrollments.filter.allTiers")}</option>
          {(Object.keys(TIER_LABELS) as Tier[]).map((tk) => (
            <option key={tk} value={tk}>{TIER_LABELS[tk].en}</option>
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
                  <Th>{t("admin.enrollments.col.tier")}</Th>
                  <Th>{t("admin.enrollments.col.status")}</Th>
                  <Th>{t("admin.enrollments.col.source")}</Th>
                  <Th>{t("admin.enrollments.col.granted")}</Th>
                  <Th>{t("admin.enrollments.col.expires")}</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40">
                    <Td>
                      <div className="font-medium">{e.studentName ?? "—"}</div>
                      <div className="text-xs text-slate-500" dir="ltr">{e.studentEmail ?? ""}</div>
                    </Td>
                    <Td>
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                        {e.tier}
                      </span>
                    </Td>
                    <Td>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_LABELS[e.status].color}`}>
                        {STATUS_LABELS[e.status][lang === "ar" ? "ar" : "en"]}
                      </span>
                    </Td>
                    <Td className="text-xs text-slate-600 dark:text-slate-300">{e.source}</Td>
                    <Td className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(e.grantedAt).toLocaleDateString(
                        lang === "ar" ? "ar-EG" : "en-US",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </Td>
                    <Td className="text-xs text-slate-500 dark:text-slate-400">
                      {e.expiresAt
                        ? new Date(e.expiresAt).toLocaleDateString(
                            lang === "ar" ? "ar-EG" : "en-US",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                    </Td>
                    <Td align="right">
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="text-slate-400 hover:text-indigo-600 transition"
                        title={t("admin.enrollments.edit")}
                      >
                        <Pencil size={14} />
                      </button>
                    </Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-sm">—</td>
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
      patchEnrollment(enrollment.id, {
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
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
              <span>{t("admin.courses.order")}: {c.displayOrder}</span>
            </div>
            <button
              type="button"
              onClick={() => setEditing(c)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
            >
              <Pencil size={13} /> {t("admin.courses.edit")}
            </button>
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
