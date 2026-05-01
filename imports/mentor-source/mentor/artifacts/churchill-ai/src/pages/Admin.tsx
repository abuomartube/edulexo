import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, LogIn, Loader2, AlertCircle, CheckCircle, XCircle,
  Clock, ArrowLeft, Key, Trash2, RefreshCw, Users, CalendarClock,
  MessageSquareHeart, MessageSquare, Star, FileSpreadsheet, FileText, Download,
  KeyRound, Plus, Copy, Check, Headphones, BookOpen
} from "lucide-react";
import AdminListeningTests from "../components/AdminListeningTests";
import AdminReadingItems from "../components/AdminReadingItems";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#00B4C8";
const GREEN = "#1DB954";
const YELLOW = "#F5C518";
const NAVY = "#0A1A30";

interface Student {
  id: number;
  email: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid password");
        return;
      }
      onLogin();
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <ShieldCheck className="w-12 h-12 mx-auto mb-3" style={{ color: TEAL }} />
          <h2 className="text-2xl font-black text-white mb-1">Admin Panel</h2>
          <p className="text-white/50 text-sm">Enter admin password to continue</p>
        </div>
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-red-300">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            required
            autoFocus
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 transition-all"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          />
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base shadow-xl transition-all hover:scale-[1.01] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #00D4F0)`, color: NAVY }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5" />Enter Admin Panel</>}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordSection() {
  const [studentPw, setStudentPw] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changePassword = async (type: "student" | "admin", newPassword: string) => {
    if (!newPassword || newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    setLoading(type);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/auth/admin/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed");
        return;
      }
      setSuccess(`${type === "admin" ? "Admin" : "Student"} password changed successfully`);
      if (type === "student") setStudentPw("");
      else setAdminPw("");
    } catch {
      setError("Connection error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4" style={{ color: YELLOW }} />
        <h3 className="font-bold text-white text-sm">Password Management</h3>
      </div>

      {error && <div className="text-sm text-red-400 px-1">{error}</div>}
      {success && <div className="text-sm text-green-400 px-1">{success}</div>}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-white/40 mb-1 uppercase tracking-wider">Student Registration Password</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={studentPw}
              onChange={(e) => setStudentPw(e.target.value)}
              placeholder="Enter new student password"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
            <button
              onClick={() => changePassword("student", studentPw)}
              disabled={loading === "student" || !studentPw}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: TEAL, color: NAVY }}
            >
              {loading === "student" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/40 mb-1 uppercase tracking-wider">Admin Panel Password</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              placeholder="Enter new admin password"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
            <button
              onClick={() => changePassword("admin", adminPw)}
              disabled={loading === "admin" || !adminPw}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: YELLOW, color: NAVY }}
            >
              {loading === "admin" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  onBack: () => void;
}

export default function Admin({ onBack }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all");
  const [emailSearch, setEmailSearch] = useState("");
  const [adminTab, setAdminTab] = useState<"students" | "codes" | "tests" | "reading" | "feedback" | "comments">("students");
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [accessCodes, setAccessCodes] = useState<Array<{ code: string; usedBy: number | null; usedAt: string | null; createdAt: string }>>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesGenCount, setCodesGenCount] = useState(5);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const checkAdmin = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/auth/admin/me`, { credentials: "include" });
      const data = await res.json();
      setIsAdmin(data.admin === true);
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/auth/admin/students`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setStudents(data.students);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/auth/admin/feedback`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setFeedbackList(data.feedback);
    } catch { /* ignore */ }
    finally { setFeedbackLoading(false); }
  }, []);

  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/auth/admin/comments`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setCommentsList(data.comments);
    } catch { /* ignore */ }
    finally { setCommentsLoading(false); }
  }, []);

  const updateCommentStatus = async (id: number, status: string) => {
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/admin/comments/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      fetchComments();
    } catch { /* ignore */ }
  };

  const deleteComment = async (id: number) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/admin/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchComments();
    } catch { /* ignore */ }
  };

  const fetchCodes = useCallback(async () => {
    setCodesLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/auth/admin/access-codes`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setAccessCodes(data.codes || []);
    } catch { /* ignore */ }
    finally { setCodesLoading(false); }
  }, []);

  const generateCodes = async () => {
    setGeneratingCodes(true);
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/admin/access-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ count: codesGenCount }),
      });
      fetchCodes();
    } catch { /* ignore */ }
    finally { setGeneratingCodes(false); }
  };

  const deleteCode = async (code: string) => {
    if (!confirm(`Delete access code ${code}?`)) return;
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/admin/access-codes/${code}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchCodes();
    } catch { /* ignore */ }
  };

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
  };

  useEffect(() => { checkAdmin(); }, [checkAdmin]);
  useEffect(() => {
    if (isAdmin) {
      fetchStudents();
      fetchFeedback();
      fetchComments();
      fetchCodes();
    }
  }, [isAdmin, fetchStudents, fetchFeedback, fetchComments, fetchCodes]);

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/admin/students/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      fetchStudents();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm("Remove this student?")) return;
    setActionLoading(id);
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/admin/students/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchStudents();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const setExpiration = async (id: number, expiresAt: string | null) => {
    setActionLoading(id);
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/admin/students/${id}/expiration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ expiresAt }),
      });
      fetchStudents();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const [bulkLoading, setBulkLoading] = useState(false);

  const bulkUpdateStatus = async (status: string) => {
    const target = filter === "all" ? "all students" : `all ${filter} students`;
    const action = status === "approved" ? "approve" : "reject";
    if (!confirm(`Are you sure you want to ${action} ${target}?`)) return;
    setBulkLoading(true);
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/admin/students/bulk-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, currentStatus: filter !== "all" ? filter : undefined }),
      });
      fetchStudents();
    } catch { /* ignore */ }
    finally { setBulkLoading(false); }
  };

  const logout = async () => {
    await fetch(`${BASE_URL}/api/churchill/auth/admin/logout`, { method: "POST", credentials: "include" });
    setIsAdmin(false);
    onBack();
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLogin onLogin={() => { setIsAdmin(true); setCheckingAuth(false); }} />;
  }

  const byStatus = filter === "all" ? students : students.filter((s) => s.status === filter);
  const filtered = emailSearch.trim() ? byStatus.filter((s) => s.email.toLowerCase().includes(emailSearch.trim().toLowerCase())) : byStatus;
  const counts = {
    all: students.length,
    pending: students.filter((s) => s.status === "pending").length,
    approved: students.filter((s) => s.status === "approved").length,
    denied: students.filter((s) => s.status === "denied").length,
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />;
    if (status === "denied") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4" style={{ color: YELLOW }} />;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, React.CSSProperties> = {
      approved: { background: `rgba(29,185,84,0.15)`, color: GREEN, border: `1px solid rgba(29,185,84,0.3)` },
      denied: { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },
      pending: { background: `rgba(245,197,24,0.15)`, color: YELLOW, border: `1px solid rgba(245,197,24,0.3)` },
    };
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase" style={styles[status] ?? styles.pending}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
      <header className="shrink-0 flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(0,180,200,0.15)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: TEAL }} />
            <span className="font-bold text-white text-sm">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="p-2 rounded-xl text-white/40 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white/50 hover:bg-white/10 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-3xl mx-auto w-full">

        <div className="grid grid-cols-6 gap-2 mb-2">
          {([
            { key: "students" as const, label: "Students", icon: <Users className="w-4 h-4" />, count: students.length, badge: students.filter((s) => s.status === "pending").length },
            { key: "codes" as const, label: "Codes", icon: <KeyRound className="w-4 h-4" />, count: accessCodes.filter((c) => !c.usedAt).length, badge: 0 },
            { key: "tests" as const, label: "Tests", icon: <Headphones className="w-4 h-4" />, count: 0, badge: 0 },
            { key: "reading" as const, label: "Reading", icon: <BookOpen className="w-4 h-4" />, count: 0, badge: 0 },
            { key: "feedback" as const, label: "Feedback", icon: <MessageSquareHeart className="w-4 h-4" />, count: feedbackList.length, badge: 0 },
            { key: "comments" as const, label: "Reviews", icon: <MessageSquare className="w-4 h-4" />, count: commentsList.length, badge: 0 },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setAdminTab(t.key)}
              className="relative flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-bold transition-all"
              style={
                adminTab === t.key
                  ? { background: `rgba(0,180,200,0.15)`, border: `1px solid rgba(0,180,200,0.35)`, color: TEAL }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
              }
            >
              {t.icon}
              <span>{t.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.1)" }}>{t.count}</span>
              {t.badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                  style={{ background: YELLOW, color: NAVY }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {adminTab === "students" && (<>
        <div className="grid grid-cols-4 gap-2">
          {(["all", "pending", "approved", "denied"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={
                filter === f
                  ? { background: `rgba(0,180,200,0.15)`, border: `1px solid rgba(0,180,200,0.35)`, color: TEAL }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
              }
            >
              <span className="text-lg font-black">{counts[f]}</span>
              <span className="capitalize">{f}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            placeholder="Search by email..."
            className="w-full rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-white/30 outline-none focus:ring-2 transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", "--tw-ring-color": TEAL } as React.CSSProperties}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          {emailSearch && (
            <button onClick={() => setEmailSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">✕</button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${BASE_URL}/api/churchill/auth/admin/students/export/excel`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "rgba(29,185,84,0.12)", color: GREEN, border: "1px solid rgba(29,185,84,0.25)" }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel
          </a>
          <a
            href={`${BASE_URL}/api/churchill/auth/admin/students/export/pdf`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </a>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: TEAL }} />
              <span className="text-sm font-bold text-white">Students ({filtered.length})</span>
            </div>
            {filtered.length > 0 && (
              <div className="flex items-center gap-2">
                {bulkLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                ) : (
                  <>
                    <button
                      onClick={() => bulkUpdateStatus("approved")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "rgba(29,185,84,0.15)", color: GREEN, border: "1px solid rgba(29,185,84,0.3)" }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Accept All
                    </button>
                    <button
                      onClick={() => bulkUpdateStatus("denied")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject All
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">No students found</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {filtered.map((s) => {
                const daysLeft = s.expiresAt ? Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const isExpired = daysLeft !== null && daysLeft <= 0;
                const expiryDateValue = s.expiresAt ? new Date(s.expiresAt).toISOString().split("T")[0] : "";

                return (
                  <div
                    key={s.id}
                    className="px-4 py-3 space-y-2"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center gap-3">
                      {statusIcon(s.status)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{s.email}</div>
                        <div className="text-xs text-white/30">
                          {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusBadge(s.status)}
                        {actionLoading === s.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                        ) : (
                          <div className="flex gap-1">
                            {s.status !== "approved" && (
                              <button
                                onClick={() => updateStatus(s.id, "approved")}
                                className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                              </button>
                            )}
                            {s.status !== "denied" && (
                              <button
                                onClick={() => updateStatus(s.id, "denied")}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                                title="Deny"
                              >
                                <XCircle className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteStudent(s.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-400/60" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                      <CalendarClock className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <input
                        type="date"
                        value={expiryDateValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExpiration(s.id, val ? new Date(val + "T23:59:59").toISOString() : null);
                        }}
                        className="text-xs rounded-lg px-2 py-1 outline-none"
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "white", colorScheme: "dark" }}
                      />
                      {s.expiresAt && (
                        <>
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: isExpired ? "rgba(239,68,68,0.15)" : daysLeft! <= 7 ? "rgba(245,197,24,0.15)" : "rgba(29,185,84,0.15)",
                              color: isExpired ? "#f87171" : daysLeft! <= 7 ? YELLOW : GREEN,
                              border: `1px solid ${isExpired ? "rgba(239,68,68,0.3)" : daysLeft! <= 7 ? "rgba(245,197,24,0.3)" : "rgba(29,185,84,0.3)"}`,
                            }}
                          >
                            {isExpired ? "Expired" : `${daysLeft} days left`}
                          </span>
                          <button
                            onClick={() => setExpiration(s.id, null)}
                            className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                            title="Remove expiration"
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {!s.expiresAt && (
                        <span className="text-[11px] text-white/20">No expiration set</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PasswordSection />
        </>)}

        {adminTab === "codes" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4" style={{ color: TEAL }} />
                <h3 className="font-bold text-white text-sm">Generate Access Codes</h3>
              </div>
              <p className="text-xs text-white/50 mb-3">
                Each code is single-use. Share with a student to let them register one account.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={codesGenCount}
                  onChange={(e) => setCodesGenCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-2 transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", "--tw-ring-color": TEAL } as React.CSSProperties}
                />
                <button
                  onClick={generateCodes}
                  disabled={generatingCodes}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${TEAL}, #00D4F0)`, color: NAVY }}
                >
                  {generatingCodes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Generate {codesGenCount} {codesGenCount === 1 ? "code" : "codes"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" style={{ color: TEAL }} />
                  <span className="font-bold text-white text-sm">All Access Codes</span>
                  <span className="text-xs text-white/40">({accessCodes.length})</span>
                </div>
                <button
                  onClick={fetchCodes}
                  disabled={codesLoading}
                  className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${codesLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              {accessCodes.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-white/40">
                  No access codes yet. Generate some above.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {accessCodes.map((c) => {
                    const used = !!c.usedAt;
                    return (
                      <div key={c.code} className="flex items-center justify-between gap-2 px-4 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm font-bold text-white tracking-wider">{c.code}</div>
                          <div className="text-[11px] text-white/40 mt-0.5">
                            {used
                              ? `Used ${new Date(c.usedAt!).toLocaleDateString()}`
                              : `Created ${new Date(c.createdAt).toLocaleDateString()}`}
                          </div>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          style={used
                            ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }
                            : { background: `rgba(29,185,84,0.15)`, color: GREEN, border: `1px solid rgba(29,185,84,0.3)` }}
                        >
                          {used ? "Used" : "Available"}
                        </span>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === c.code ? <Check className="w-4 h-4" style={{ color: GREEN }} /> : <Copy className="w-4 h-4" />}
                        </button>
                        {!used && (
                          <button
                            onClick={() => deleteCode(c.code)}
                            className="p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete code"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {adminTab === "tests" && (
          <AdminListeningTests onLogout={logout} />
        )}

        {adminTab === "reading" && (
          <AdminReadingItems onLogout={logout} />
        )}

        {adminTab === "feedback" && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="w-4 h-4" style={{ color: TEAL }} />
                <span className="text-sm font-bold text-white">Student Feedback ({feedbackList.length})</span>
              </div>
              <button onClick={fetchFeedback} disabled={feedbackLoading} className="p-2 rounded-xl text-white/40 hover:bg-white/10 transition-colors">
                <RefreshCw className={`w-4 h-4 ${feedbackLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {feedbackList.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">No feedback yet</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {feedbackList.map((f: any) => (
                  <div key={f.id} className="px-4 py-3 space-y-1" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/60">{f.email}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{
                            background: f.tool === "speaking" ? "rgba(0,180,200,0.15)" : "rgba(245,197,24,0.15)",
                            color: f.tool === "speaking" ? TEAL : YELLOW,
                            border: `1px solid ${f.tool === "speaking" ? "rgba(0,180,200,0.3)" : "rgba(245,197,24,0.3)"}`,
                          }}
                        >
                          {f.tool}
                        </span>
                        <span className="text-[10px] text-white/25">
                          {new Date(f.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{f.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {adminTab === "comments" && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: TEAL }} />
                <span className="text-sm font-bold text-white">Student Reviews ({commentsList.length})</span>
              </div>
              <button onClick={fetchComments} disabled={commentsLoading} className="p-2 rounded-xl text-white/40 hover:bg-white/10 transition-colors">
                <RefreshCw className={`w-4 h-4 ${commentsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {commentsList.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">No reviews yet</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {commentsList.map((c: any) => (
                  <div key={c.id} className="px-4 py-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white/60">{c.email}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3" fill={s <= c.rating ? "#F5C518" : "transparent"} stroke={s <= c.rating ? "#F5C518" : "rgba(255,255,255,0.2)"} />
                          ))}
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{
                          background: c.status === "approved" ? "rgba(29,185,84,0.15)" : c.status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(245,197,24,0.15)",
                          color: c.status === "approved" ? GREEN : c.status === "rejected" ? "#f87171" : YELLOW,
                          border: `1px solid ${c.status === "approved" ? "rgba(29,185,84,0.3)" : c.status === "rejected" ? "rgba(239,68,68,0.3)" : "rgba(245,197,24,0.3)"}`,
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{c.text}</p>
                    <div className="flex gap-2">
                      {c.status !== "approved" && (
                        <button
                          onClick={() => updateCommentStatus(c.id, "approved")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors hover:bg-green-500/20"
                          style={{ color: GREEN, border: "1px solid rgba(29,185,84,0.3)" }}
                        >
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {c.status !== "rejected" && (
                        <button
                          onClick={() => updateCommentStatus(c.id, "rejected")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors hover:bg-red-500/20"
                          style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      )}
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
