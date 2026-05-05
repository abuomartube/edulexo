import { useState, useEffect, useCallback, useRef } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Lock,
  KeyRound,
  Users,
  AlertCircle,
  Calendar,
  CalendarX,
  Search,
  Download,
  Star,
  MessageSquare,
  ShieldCheck,
  KeySquare,
  Reply,
  Send,
  Pencil,
  Image as ImageIcon,
  Upload,
  BadgeCheck,
  Volume2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  BookOpen,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface AccessRequest {
  id: number;
  email: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedAt: string | null;
  expiresAt: string | null;
}

interface Review {
  id: number;
  email: string;
  name: string | null;
  comment: string;
  rating: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  adminReply: string | null;
  adminReplyAt: string | null;
}

type Tab =
  | "requests"
  | "reviews"
  | "settings"
  | "intro"
  | "listening"
  | "reading";
type Filter = "all" | "pending" | "approved" | "rejected";

interface IntroStudent {
  id: number;
  email: string;
  accessCode: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  expiresAt: string | null;
}

interface IntroAccessCode {
  id: number;
  code: string;
  createdAt: string;
  usedBy: string | null;
  usedAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function oneYearFromNow(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

function expiryStatus(
  expiresAt: string | null,
): { label: string; color: string } | null {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt);
  const now = new Date();
  const diffDays = Math.ceil(
    (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0)
    return {
      label: "Expired",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
  if (diffDays <= 7)
    return {
      label: `Expires in ${diffDays}d`,
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
  return {
    label: `Expires ${formatDate(expiresAt)}`,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"}`}
        />
      ))}
    </span>
  );
}

function downloadCSV(requests: AccessRequest[], filter: Filter) {
  const rows = requests.filter((r) => filter === "all" || r.status === filter);
  const header = "Email,Status,Requested At,Expires At";
  const lines = rows.map(
    (r) =>
      `"${r.email}","${r.status}","${formatDate(r.requestedAt)}","${r.expiresAt ? formatDate(r.expiresAt) : ""}"`,
  );
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `4ielts-students-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function printEmails(requests: AccessRequest[], filter: Filter) {
  const rows = requests.filter((r) => filter === "all" || r.status === filter);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>4IELTS Students</title>
  <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
  h2{margin-bottom:4px}p{color:#666;font-size:13px}</style></head><body>
  <h2>4IELTS Student List — ${filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}</h2>
  <p>Exported ${new Date().toLocaleString("en-GB")}</p>
  <table><thead><tr><th>#</th><th>Email</th><th>Status</th><th>Requested</th><th>Expires</th></tr></thead><tbody>
  ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.email}</td><td>${r.status}</td><td>${formatDate(r.requestedAt)}</td><td>${r.expiresAt ? formatDate(r.expiresAt) : "—"}</td></tr>`).join("")}
  </tbody></table></body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [reviewFilter, setReviewFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<Tab>("requests");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [reviewActionLoading, setReviewActionLoading] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [pendingExpiry, setPendingExpiry] = useState<Record<number, string>>(
    {},
  );
  const [editExpiry, setEditExpiry] = useState<Record<number, string>>({});
  const [expiryLoading, setExpiryLoading] = useState<number | null>(null);

  const [accessCode, setAccessCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [showNewCode, setShowNewCode] = useState(false);
  const [codeMsg, setCodeMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [replyEditingId, setReplyEditingId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyLoading, setReplyLoading] = useState<number | null>(null);
  const [replyError, setReplyError] = useState<{
    id: number;
    text: string;
  } | null>(null);

  const [introStudents, setIntroStudents] = useState<IntroStudent[]>([]);
  const [introCodes, setIntroCodes] = useState<IntroAccessCode[]>([]);
  const [introActionLoading, setIntroActionLoading] = useState<number | null>(
    null,
  );
  const [introCodesLoading, setIntroCodesLoading] = useState(false);
  const [introGenerateCount, setIntroGenerateCount] = useState(1);
  const [introFilter, setIntroFilter] = useState<
    "all" | "pending" | "approved" | "denied"
  >("all");
  const [introExpiryEditing, setIntroExpiryEditing] = useState<
    Record<number, string>
  >({});
  const [introExpiryLoading, setIntroExpiryLoading] = useState<number | null>(
    null,
  );

  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchRequests = useCallback(async (ap: string) => {
    setRefreshing(true);
    try {
      const res = await fetch("/api-ielts/admin/requests", {
        headers: { "x-admin-password": ap },
      });
      if (res.ok) setRequests(await res.json());
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchReviews = useCallback(async (ap: string) => {
    const res = await fetch("/api-ielts/admin/reviews", {
      headers: { "x-admin-password": ap },
    });
    if (res.ok) setReviews(await res.json());
  }, []);

  const fetchAccessCode = useCallback(async (ap: string) => {
    const res = await fetch("/api-ielts/admin/access-code", {
      headers: { "x-admin-password": ap },
    });
    if (res.ok) {
      const d = await res.json();
      setAccessCode(d.code);
    }
  }, []);

  const fetchIntroStudents = useCallback(async (ap: string) => {
    const res = await fetch("/api-ielts/admin/intro/students", {
      headers: { "x-admin-password": ap },
    });
    if (res.ok) setIntroStudents(await res.json());
  }, []);

  const fetchIntroCodes = useCallback(async (ap: string) => {
    const res = await fetch("/api-ielts/admin/intro/access-codes", {
      headers: { "x-admin-password": ap },
    });
    if (res.ok) {
      const d = await res.json();
      setIntroCodes(d.codes ?? []);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api-ielts/admin/requests", {
        headers: { "x-admin-password": adminPassword },
      });
      if (res.ok) {
        setLoggedIn(true);
        setRequests(await res.json());
        fetchAccessCode(adminPassword);
        fetchReviews(adminPassword);
        fetchIntroStudents(adminPassword);
        fetchIntroCodes(adminPassword);
      } else {
        setLoginError("Wrong admin password. Try again.");
      }
    } catch {
      setLoginError("Connection error.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const expiresAt = pendingExpiry[id] ?? oneYearFromNow();
      const expiryIso = new Date(expiresAt + "T23:59:59").toISOString();
      await fetch(`/api-ielts/admin/requests/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ adminPassword, expiresAt: expiryIso }),
      });
      await fetchRequests(adminPassword);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (id: number, action: "reject" | "delete") => {
    setActionLoading(id);
    try {
      const url =
        action === "delete"
          ? `/api-ielts/admin/requests/${id}`
          : `/api-ielts/admin/requests/${id}/${action}`;
      await fetch(url, {
        method: action === "delete" ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ adminPassword }),
      });
      await fetchRequests(adminPassword);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetExpiry = async (id: number) => {
    setExpiryLoading(id);
    try {
      const dateStr = editExpiry[id];
      const expiresAt = dateStr
        ? new Date(dateStr + "T23:59:59").toISOString()
        : null;
      await fetch(`/api-ielts/admin/requests/${id}/set-expiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ adminPassword, expiresAt }),
      });
      setEditExpiry((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      await fetchRequests(adminPassword);
    } finally {
      setExpiryLoading(null);
    }
  };

  const handleIntroAction = async (
    id: number,
    action: "approve" | "reject" | "delete",
    expiresAt?: string,
  ) => {
    setIntroActionLoading(id);
    try {
      const url =
        action === "delete"
          ? `/api-ielts/admin/intro/students/${id}`
          : `/api-ielts/admin/intro/students/${id}/${action}`;
      await fetch(url, {
        method: action === "delete" ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: action !== "delete" ? JSON.stringify({ expiresAt }) : undefined,
      });
      await fetchIntroStudents(adminPassword);
    } finally {
      setIntroActionLoading(null);
    }
  };

  const handleIntroSetExpiry = async (id: number) => {
    setIntroExpiryLoading(id);
    try {
      const dateStr = introExpiryEditing[id];
      const expiresAt = dateStr
        ? new Date(dateStr + "T23:59:59").toISOString()
        : null;
      await fetch(`/api-ielts/admin/intro/students/${id}/set-expiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ expiresAt }),
      });
      setIntroExpiryEditing((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      await fetchIntroStudents(adminPassword);
    } finally {
      setIntroExpiryLoading(null);
    }
  };

  const handleGenerateIntroCodes = async () => {
    setIntroCodesLoading(true);
    try {
      await fetch("/api-ielts/admin/intro/access-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ count: introGenerateCount }),
      });
      await fetchIntroCodes(adminPassword);
    } finally {
      setIntroCodesLoading(false);
    }
  };

  const handleDeleteIntroCode = async (code: string) => {
    await fetch(`/api-ielts/admin/intro/access-codes/${code}`, {
      method: "DELETE",
      headers: { "x-admin-password": adminPassword },
    });
    await fetchIntroCodes(adminPassword);
  };

  const handleChangeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setCodeLoading(true);
    setCodeMsg(null);
    try {
      const res = await fetch("/api-ielts/admin/change-access-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ adminPassword, newCode: newCode.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setCodeMsg({
          type: "success",
          text: `Access code changed to: "${newCode.trim()}"`,
        });
        setAccessCode(newCode.trim());
        setNewCode("");
      } else {
        setCodeMsg({ type: "error", text: d.error ?? "Failed" });
      }
    } catch {
      setCodeMsg({ type: "error", text: "Connection error." });
    } finally {
      setCodeLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      const res = await fetch("/api-ielts/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          adminPassword,
          newPassword: newPassword.trim(),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwdMsg({
          type: "success",
          text: "Admin password updated successfully. Use it on your next login.",
        });
        setAdminPassword(newPassword.trim());
        setNewPassword("");
      } else {
        setPwdMsg({ type: "error", text: d.error ?? "Failed" });
      }
    } catch {
      setPwdMsg({ type: "error", text: "Connection error." });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleReviewAction = async (
    id: number,
    action: "approve" | "reject" | "delete",
  ) => {
    setReviewActionLoading(id);
    try {
      const url =
        action === "delete"
          ? `/api-ielts/admin/reviews/${id}`
          : `/api-ielts/admin/reviews/${id}/${action}`;
      await fetch(url, {
        method: action === "delete" ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ adminPassword }),
      });
      await fetchReviews(adminPassword);
    } finally {
      setReviewActionLoading(null);
    }
  };

  const startReply = (r: Review) => {
    setReplyEditingId(r.id);
    setReplyDraft(r.adminReply ?? "");
    setReplyError(null);
  };

  const cancelReply = () => {
    setReplyEditingId(null);
    setReplyDraft("");
    setReplyError(null);
  };

  const publishReply = async (id: number) => {
    if (!replyDraft.trim()) return;
    setReplyLoading(id);
    setReplyError(null);
    try {
      const res = await fetch(`/api-ielts/admin/reviews/${id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ reply: replyDraft.trim() }),
      });
      if (res.ok) {
        await fetchReviews(adminPassword);
        cancelReply();
      } else {
        const d = await res.json().catch(() => ({}));
        setReplyError({ id, text: d.error ?? "Failed to publish reply." });
      }
    } catch {
      setReplyError({ id, text: "Connection error. Please try again." });
    } finally {
      setReplyLoading(null);
    }
  };

  const deleteReply = async (id: number) => {
    setReplyLoading(id);
    setReplyError(null);
    try {
      const res = await fetch(`/api-ielts/admin/reviews/${id}/reply`, {
        method: "DELETE",
        headers: { "x-admin-password": adminPassword },
      });
      if (res.ok) {
        await fetchReviews(adminPassword);
      } else {
        const d = await res.json().catch(() => ({}));
        setReplyError({ id, text: d.error ?? "Failed to delete reply." });
      }
    } catch {
      setReplyError({ id, text: "Connection error. Please try again." });
    } finally {
      setReplyLoading(null);
    }
  };

  const fetchAvatar = useCallback(async () => {
    try {
      const res = await fetch("/api-ielts/admin/avatar");
      if (res.ok) {
        const d = await res.json();
        setAdminAvatar(d.dataUrl ?? null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  const handleAvatarFile = async (file: File) => {
    setAvatarMsg(null);
    if (!file.type.startsWith("image/")) {
      setAvatarMsg({ type: "error", text: "Please choose an image file." });
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setAvatarMsg({
        type: "error",
        text: "Image too large — pick one under 1.5 MB.",
      });
      return;
    }
    // Downscale to a 256x256 square so we stay well under the API's 300 KB limit.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const size = 256;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas unsupported"));
            return;
          }
          // Cover-fit: crop to square, scale to 256.
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => reject(new Error("Bad image"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Read error"));
      reader.readAsDataURL(file);
    });

    setAvatarUploading(true);
    try {
      const res = await fetch("/api-ielts/admin/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ dataUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdminAvatar(d.dataUrl);
        setAvatarMsg({ type: "success", text: "Profile photo updated." });
      } else {
        setAvatarMsg({ type: "error", text: d.error ?? "Upload failed." });
      }
    } catch {
      setAvatarMsg({ type: "error", text: "Connection error." });
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarUploading(true);
    setAvatarMsg(null);
    try {
      const res = await fetch("/api-ielts/admin/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ dataUrl: null }),
      });
      if (res.ok) {
        setAdminAvatar(null);
        setAvatarMsg({ type: "success", text: "Profile photo removed." });
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const filteredRequests = requests
    .filter((r) => filter === "all" || r.status === filter)
    .filter(
      (r) =>
        !searchQuery.trim() ||
        r.email.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    );

  const filteredReviews = reviews.filter(
    (r) => reviewFilter === "all" || r.status === reviewFilter,
  );

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const reviewCounts = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
  };

  const statusBadge = (r: AccessRequest) => {
    if (r.status === "approved") {
      const exp = r.expiresAt ? expiryStatus(r.expiresAt) : null;
      if (exp && exp.label === "Expired") {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <CalendarX className="w-3 h-3" />
            Expired
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    }
    if (r.status === "rejected")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  const reviewStatusBadge = (status: string) => {
    if (status === "approved")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    if (status === "rejected")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // ── Login screen ─────────────────────────────────────────────────────────────

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-900 via-teal-800 to-sky-900 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <img
              src="/4ielts-logo.png"
              alt="4IELTS"
              className="h-16 w-auto object-contain mb-3"
            />
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              Admin Panel
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage student access requests
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showAdmin ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password…"
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowAdmin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showAdmin ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {loginError && (
                <p className="text-xs text-red-500 mt-1">{loginError}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loginLoading || !adminPassword}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {loginLoading ? "Checking…" : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main panel ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/4ielts-logo.png"
            alt="4IELTS"
            className="h-10 w-auto object-contain"
          />
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">
              Admin Panel
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              4IELTS Vocabulary App
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchRequests(adminPassword);
            fetchReviews(adminPassword);
          }}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTab("requests")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "requests" ? "bg-teal-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}
          >
            <Users className="w-4 h-4" />
            Requests
            {counts.pending > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {counts.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("reviews")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "reviews" ? "bg-teal-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}
          >
            <MessageSquare className="w-4 h-4" />
            Reviews
            {reviewCounts.pending > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {reviewCounts.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "settings" ? "bg-teal-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}
          >
            <KeyRound className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => {
              setTab("intro");
              fetchIntroStudents(adminPassword);
              fetchIntroCodes(adminPassword);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "intro" ? "bg-violet-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}
          >
            <Users className="w-4 h-4" />
            Intro Students
            {introStudents.filter((s) => s.status === "pending").length > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {introStudents.filter((s) => s.status === "pending").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("listening")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "listening" ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}
          >
            <BadgeCheck className="w-4 h-4" />
            Listening
          </button>
          <button
            onClick={() => setTab("reading")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "reading" ? "bg-violet-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}
          >
            <BookOpen className="w-4 h-4" />
            Reading
          </button>
        </div>

        {/* ── REQUESTS TAB ─────────────────────────────────────────────────────── */}
        {tab === "requests" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {(["all", "pending", "approved", "rejected"] as Filter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`bg-white dark:bg-gray-900 rounded-2xl p-4 border text-left transition-all ${filter === f ? "border-teal-500 ring-2 ring-teal-200 dark:ring-teal-900" : "border-gray-200 dark:border-gray-800 hover:border-teal-300"}`}
                  >
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      {counts[f]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                      {f}
                    </p>
                  </button>
                ),
              )}
            </div>

            {/* Search + Export bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => downloadCSV(requests, filter)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Export as Excel/CSV"
                >
                  <Download className="w-4 h-4" />
                  Excel / CSV
                </button>
                <button
                  onClick={() => printEmails(requests, filter)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Print / Save as PDF"
                >
                  <Download className="w-4 h-4" />
                  PDF / Print
                </button>
              </div>
            </div>

            {/* List */}
            {filteredRequests.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <Users className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : `No ${filter !== "all" ? filter : ""} requests yet.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((r) => {
                  const exp = r.expiresAt ? expiryStatus(r.expiresAt) : null;
                  const isEditingExpiry = editExpiry[r.id] !== undefined;
                  return (
                    <div
                      key={r.id}
                      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {r.email}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Requested{" "}
                            {new Date(r.requestedAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {statusBadge(r)}
                            {exp && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${exp.color}`}
                              >
                                <Calendar className="w-3 h-3" />
                                {exp.label}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 items-end shrink-0">
                          {r.status === "pending" && (
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <input
                                  type="date"
                                  min={todayStr}
                                  value={
                                    pendingExpiry[r.id] ?? oneYearFromNow()
                                  }
                                  onChange={(e) =>
                                    setPendingExpiry((prev) => ({
                                      ...prev,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  title="Expiration date (defaults to 1 year from now)"
                                />
                              </div>
                              <button
                                onClick={() => handleApprove(r.id)}
                                disabled={actionLoading === r.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {actionLoading === r.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(r.id, "reject")}
                                disabled={actionLoading === r.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </div>
                          )}

                          {r.status === "approved" && (
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {isEditingExpiry ? (
                                <>
                                  <input
                                    type="date"
                                    min={todayStr}
                                    value={editExpiry[r.id]}
                                    onChange={(e) =>
                                      setEditExpiry((prev) => ({
                                        ...prev,
                                        [r.id]: e.target.value,
                                      }))
                                    }
                                    className="text-xs px-2 py-1.5 rounded-lg border border-teal-400 dark:border-teal-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                  <button
                                    onClick={() => handleSetExpiry(r.id)}
                                    disabled={expiryLoading === r.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                                  >
                                    {expiryLoading === r.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    Save
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditExpiry((prev) => {
                                        const n = { ...prev };
                                        delete n[r.id];
                                        return n;
                                      })
                                    }
                                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() =>
                                    setEditExpiry((prev) => ({
                                      ...prev,
                                      [r.id]: r.expiresAt
                                        ? r.expiresAt.split("T")[0]
                                        : oneYearFromNow(),
                                    }))
                                  }
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <Calendar className="w-3 h-3" />
                                  {r.expiresAt ? "Change Expiry" : "Set Expiry"}
                                </button>
                              )}
                              <button
                                onClick={() => handleAction(r.id, "reject")}
                                disabled={actionLoading === r.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" />
                                Revoke
                              </button>
                            </div>
                          )}

                          {r.status === "rejected" && (
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={actionLoading === r.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Re-approve
                            </button>
                          )}

                          <button
                            onClick={() => handleAction(r.id, "delete")}
                            disabled={actionLoading === r.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── REVIEWS TAB ──────────────────────────────────────────────────────── */}
        {tab === "reviews" && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {(["all", "pending", "approved", "rejected"] as Filter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setReviewFilter(f)}
                    className={`bg-white dark:bg-gray-900 rounded-2xl p-4 border text-left transition-all ${reviewFilter === f ? "border-teal-500 ring-2 ring-teal-200 dark:ring-teal-900" : "border-gray-200 dark:border-gray-800 hover:border-teal-300"}`}
                  >
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      {reviewCounts[f]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                      {f}
                    </p>
                  </button>
                ),
              )}
            </div>

            {filteredReviews.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No {reviewFilter !== "all" ? reviewFilter : ""} reviews yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {r.name || (
                              <span className="text-gray-400 font-normal italic">
                                Anonymous
                              </span>
                            )}
                          </p>
                          {reviewStatusBadge(r.status)}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {r.email} · {formatDate(r.createdAt)}
                        </p>
                        <StarRow rating={r.rating} />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {r.status !== "approved" && (
                          <button
                            onClick={() => handleReviewAction(r.id, "approve")}
                            disabled={reviewActionLoading === r.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {reviewActionLoading === r.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            Approve
                          </button>
                        )}
                        {r.status !== "rejected" && (
                          <button
                            onClick={() => handleReviewAction(r.id, "reject")}
                            disabled={reviewActionLoading === r.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => handleReviewAction(r.id, "delete")}
                          disabled={reviewActionLoading === r.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                      {r.comment}
                    </p>

                    {/* Existing admin reply (if any) */}
                    {r.adminReply && replyEditingId !== r.id && (
                      <div className="ml-6 border-l-4 border-teal-400 dark:border-teal-600 bg-teal-50/60 dark:bg-teal-900/20 rounded-r-xl px-4 py-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {adminAvatar ? (
                              <img
                                src={adminAvatar}
                                alt="Abu Omar"
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-teal-300 dark:ring-teal-700"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
                                AO
                              </div>
                            )}
                            <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                              Abu Omar
                            </span>
                            <BadgeCheck
                              className="w-3.5 h-3.5 text-sky-500 fill-sky-500/15"
                              aria-label="Verified"
                            />
                            <span className="text-xs text-gray-400">
                              replied
                            </span>
                            {r.adminReplyAt && (
                              <span className="text-xs text-gray-400">
                                · {formatDate(r.adminReplyAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startReply(r)}
                              disabled={replyLoading === r.id}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 text-xs hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors disabled:opacity-50"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => deleteReply(r.id)}
                              disabled={replyLoading === r.id}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                              {replyLoading === r.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {r.adminReply}
                        </p>
                      </div>
                    )}

                    {/* Reply editor (publish or edit) */}
                    {replyEditingId === r.id && (
                      <div className="ml-6 border-l-4 border-teal-400 dark:border-teal-600 bg-teal-50/60 dark:bg-teal-900/20 rounded-r-xl px-4 py-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          {adminAvatar ? (
                            <img
                              src={adminAvatar}
                              alt="Abu Omar"
                              className="w-6 h-6 rounded-full object-cover ring-1 ring-teal-300 dark:ring-teal-700"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
                              AO
                            </div>
                          )}
                          <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                            Abu Omar
                          </span>
                          <BadgeCheck className="w-3.5 h-3.5 text-sky-500 fill-sky-500/15" />
                          <span className="text-xs text-gray-400">
                            {r.adminReply ? "editing reply" : "writing a reply"}
                          </span>
                        </div>
                        <textarea
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          placeholder="Write a public reply that students will see…"
                          className="w-full px-3 py-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {replyDraft.length}/2000
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelReply}
                              disabled={replyLoading === r.id}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => publishReply(r.id)}
                              disabled={
                                replyLoading === r.id || !replyDraft.trim()
                              }
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {replyLoading === r.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              {r.adminReply ? "Save" : "Publish"}
                            </button>
                          </div>
                        </div>
                        {replyError && replyError.id === r.id && (
                          <div className="flex items-center gap-2 text-xs rounded-lg p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {replyError.text}
                          </div>
                        )}
                      </div>
                    )}
                    {replyError &&
                      replyError.id === r.id &&
                      replyEditingId !== r.id && (
                        <div className="flex items-center gap-2 text-xs rounded-lg p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {replyError.text}
                        </div>
                      )}

                    {/* Reply CTA: only for approved reviews without an existing reply / not currently editing */}
                    {r.status === "approved" &&
                      !r.adminReply &&
                      replyEditingId !== r.id && (
                        <button
                          onClick={() => startReply(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-medium hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors w-fit"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          Reply as Abu Omar
                        </button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SETTINGS TAB ─────────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="max-w-md space-y-6">
            {/* Access Code */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-teal-600" />
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Student Access Code
                </h2>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Current Access Code
                </p>
                <p className="text-2xl font-mono font-bold text-teal-700 dark:text-teal-300 tracking-widest bg-teal-50 dark:bg-teal-900/20 rounded-xl px-4 py-3">
                  {accessCode || "—"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Share this with students who have paid.
                </p>
              </div>
              <form onSubmit={handleChangeCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    New Access Code
                  </label>
                  <div className="relative">
                    <input
                      type={showNewCode ? "text" : "password"}
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="Enter new access code…"
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewCode((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      tabIndex={-1}
                    >
                      {showNewCode ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {codeMsg && (
                  <div
                    className={`flex items-center gap-2 text-sm rounded-xl p-3 ${codeMsg.type === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}
                  >
                    {codeMsg.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    {codeMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={codeLoading || !newCode.trim()}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {codeLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  {codeLoading ? "Saving…" : "Change Access Code"}
                </button>
              </form>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Changing the code does not affect already-approved students.
              </p>
            </div>

            {/* Admin Password */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <KeySquare className="w-5 h-5 text-rose-600" />
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Admin Password
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Change the password you use to log into this admin panel. Must
                be at least 6 characters.
              </p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    New Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password…"
                      minLength={6}
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      tabIndex={-1}
                    >
                      {showNewPwd ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {pwdMsg && (
                  <div
                    className={`flex items-center gap-2 text-sm rounded-xl p-3 ${pwdMsg.type === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}
                  >
                    {pwdMsg.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    {pwdMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={
                    pwdLoading ||
                    !newPassword.trim() ||
                    newPassword.trim().length < 6
                  }
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {pwdLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {pwdLoading ? "Saving…" : "Change Admin Password"}
                </button>
              </form>
            </div>

            {/* Reply Profile Photo */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-5 h-5 text-teal-600" />
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Reply Profile Photo
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Shown next to "Abu Omar" on every public reply. Square photo
                recommended; it will be cropped to a circle and resized to
                256×256.
              </p>

              <div className="flex items-center gap-4">
                {adminAvatar ? (
                  <img
                    src={adminAvatar}
                    alt="Abu Omar"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-teal-300 dark:ring-teal-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-teal-600 text-white font-bold text-xl flex items-center justify-center ring-2 ring-teal-300 dark:ring-teal-700">
                    AO
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium cursor-pointer transition-colors ${avatarUploading ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {avatarUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {adminAvatar ? "Change Photo" : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={avatarUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAvatarFile(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {adminAvatar && (
                    <button
                      onClick={removeAvatar}
                      disabled={avatarUploading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  )}
                </div>
              </div>

              {avatarMsg && (
                <div
                  className={`flex items-center gap-2 text-sm rounded-xl p-3 ${avatarMsg.type === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}
                >
                  {avatarMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  {avatarMsg.text}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── INTRO STUDENTS TAB ───────────────────────────────────────────────── */}
        {/* ── LISTENING TAB ─────────────────────────────────────────────────── */}
        {tab === "listening" && (
          <ListeningAdminPanel adminPassword={adminPassword} />
        )}
        {tab === "reading" && (
          <ReadingAdminPanel adminPassword={adminPassword} />
        )}

        {tab === "intro" &&
          (() => {
            const filteredIntro = introStudents.filter(
              (s) => introFilter === "all" || s.status === introFilter,
            );
            const introCounts = {
              all: introStudents.length,
              pending: introStudents.filter((s) => s.status === "pending")
                .length,
              approved: introStudents.filter((s) => s.status === "approved")
                .length,
              denied: introStudents.filter((s) => s.status === "denied").length,
            };
            const unusedCodes = introCodes.filter((c) => !c.usedAt);
            return (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {(["all", "pending", "approved", "denied"] as const).map(
                    (f) => (
                      <button
                        key={f}
                        onClick={() => setIntroFilter(f)}
                        className={`bg-white dark:bg-gray-900 rounded-2xl p-4 border text-left transition-all ${introFilter === f ? "border-violet-500 ring-2 ring-violet-200 dark:ring-violet-900" : "border-gray-200 dark:border-gray-800 hover:border-violet-300"}`}
                      >
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                          {introCounts[f]}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                          {f}
                        </p>
                      </button>
                    ),
                  )}
                </div>

                {/* Student list */}
                {filteredIntro.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center mb-6">
                    <Users className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No {introFilter !== "all" ? introFilter : ""} intro
                      students yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {filteredIntro.map((s) => {
                      const exp = s.expiresAt
                        ? expiryStatus(s.expiresAt)
                        : null;
                      const isEditingExpiry =
                        introExpiryEditing[s.id] !== undefined;
                      const pendingExpiryVal =
                        (pendingExpiry as Record<number, string>)[s.id] ??
                        oneYearFromNow();
                      return (
                        <div
                          key={s.id}
                          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
                        >
                          <div className="flex flex-wrap items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {s.email}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                Registered {formatDate(s.createdAt)} · Code:{" "}
                                <span className="font-mono">
                                  {s.accessCode}
                                </span>
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {s.status === "approved" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Approved
                                  </span>
                                )}
                                {s.status === "pending" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    <Clock className="w-3 h-3" />
                                    Pending
                                  </span>
                                )}
                                {s.status === "denied" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    <XCircle className="w-3 h-3" />
                                    Denied
                                  </span>
                                )}
                                {exp && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${exp.color}`}
                                  >
                                    <Calendar className="w-3 h-3" />
                                    {exp.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 items-end shrink-0">
                              {s.status === "pending" && (
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <input
                                      type="date"
                                      min={
                                        new Date().toISOString().split("T")[0]
                                      }
                                      value={pendingExpiryVal}
                                      onChange={(e) =>
                                        setPendingExpiry((prev) => ({
                                          ...prev,
                                          [s.id]: e.target.value,
                                        }))
                                      }
                                      className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleIntroAction(
                                        s.id,
                                        "approve",
                                        new Date(
                                          pendingExpiryVal + "T23:59:59",
                                        ).toISOString(),
                                      )
                                    }
                                    disabled={introActionLoading === s.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                                  >
                                    {introActionLoading === s.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleIntroAction(s.id, "reject")
                                    }
                                    disabled={introActionLoading === s.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Reject
                                  </button>
                                </div>
                              )}

                              {s.status === "approved" && (
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  {isEditingExpiry ? (
                                    <>
                                      <input
                                        type="date"
                                        min={
                                          new Date().toISOString().split("T")[0]
                                        }
                                        value={introExpiryEditing[s.id]}
                                        onChange={(e) =>
                                          setIntroExpiryEditing((prev) => ({
                                            ...prev,
                                            [s.id]: e.target.value,
                                          }))
                                        }
                                        className="text-xs px-2 py-1.5 rounded-lg border border-violet-400 dark:border-violet-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                      />
                                      <button
                                        onClick={() =>
                                          handleIntroSetExpiry(s.id)
                                        }
                                        disabled={introExpiryLoading === s.id}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                                      >
                                        {introExpiryLoading === s.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-3 h-3" />
                                        )}
                                        Save
                                      </button>
                                      <button
                                        onClick={() =>
                                          setIntroExpiryEditing((prev) => {
                                            const n = { ...prev };
                                            delete n[s.id];
                                            return n;
                                          })
                                        }
                                        className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        setIntroExpiryEditing((prev) => ({
                                          ...prev,
                                          [s.id]: s.expiresAt
                                            ? s.expiresAt.split("T")[0]
                                            : oneYearFromNow(),
                                        }))
                                      }
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                      <Calendar className="w-3 h-3" />
                                      {s.expiresAt
                                        ? "Change Expiry"
                                        : "Set Expiry"}
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleIntroAction(s.id, "reject")
                                    }
                                    disabled={introActionLoading === s.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Revoke
                                  </button>
                                </div>
                              )}

                              {s.status === "denied" && (
                                <button
                                  onClick={() =>
                                    handleIntroAction(
                                      s.id,
                                      "approve",
                                      new Date(
                                        oneYearFromNow() + "T23:59:59",
                                      ).toISOString(),
                                    )
                                  }
                                  disabled={introActionLoading === s.id}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Re-approve
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  handleIntroAction(s.id, "delete")
                                }
                                disabled={introActionLoading === s.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Access code generator */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="w-5 h-5 text-violet-600" />
                    <h2 className="font-bold text-gray-900 dark:text-white">
                      Intro Access Codes
                    </h2>
                    <span className="ml-auto text-xs text-gray-400">
                      {unusedCodes.length} unused
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Generate <span className="font-mono">XXXX-XXXX-XXXX</span>{" "}
                    codes for intro students. Each code is single-use.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={introGenerateCount}
                      onChange={(e) =>
                        setIntroGenerateCount(
                          Math.max(1, Math.min(50, Number(e.target.value))),
                        )
                      }
                      className="w-20 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      onClick={handleGenerateIntroCodes}
                      disabled={introCodesLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                      {introCodesLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      Generate {introGenerateCount} Code
                      {introGenerateCount > 1 ? "s" : ""}
                    </button>
                    <button
                      onClick={() => fetchIntroCodes(adminPassword)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {unusedCodes.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {unusedCodes.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5"
                        >
                          <span className="font-mono text-sm font-semibold text-violet-700 dark:text-violet-300 tracking-widest">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleDeleteIntroCode(c.code)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete code"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {introCodes.filter((c) => c.usedAt).length > 0 && (
                    <details className="text-xs">
                      <summary className="text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                        Show used codes (
                        {introCodes.filter((c) => c.usedAt).length})
                      </summary>
                      <div className="mt-2 space-y-1">
                        {introCodes
                          .filter((c) => c.usedAt)
                          .map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 opacity-60"
                            >
                              <span className="font-mono font-semibold text-gray-500 dark:text-gray-400 tracking-widest line-through">
                                {c.code}
                              </span>
                              <span className="text-gray-400">
                                → {c.usedBy}
                              </span>
                            </div>
                          ))}
                      </div>
                    </details>
                  )}
                </div>
              </>
            );
          })()}
      </div>
    </div>
  );
}

// ── Listening Admin Panel ─────────────────────────────────────────────────────

const BASE_URL_ADMIN = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface ListeningTestMeta {
  id: number;
  slug: string;
  sectionId: number;
  title: string;
  description: string;
  questionCount: number;
  segmentCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsByTest {
  testId: string;
  sectionId: number;
  title: string;
  attempts: number;
  avgPercent: number;
}

function ListeningAdminPanel({ adminPassword }: { adminPassword: string }) {
  const [tests, setTests] = useState<ListeningTestMeta[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [audioStats, setAudioStats] = useState<{
    scanned: number;
    referenced: number;
    orphaned: number;
    bytes: number;
  } | null>(null);
  const [primeLog, setPrimeLog] = useState<string[]>([]);
  const [priming, setPriming] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addJson, setAddJson] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [analytics, setAnalytics] = useState<{
    totalAttempts: number;
    byTest: AnalyticsByTest[];
  } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const primeAbortRef = useRef<AbortController | null>(null);

  const authHeaders = { "x-admin-password": adminPassword };

  const loadTests = useCallback(async () => {
    setLoadingTests(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/tests`,
        { headers: authHeaders },
      );
      const data = (await res.json()) as {
        tests: ListeningTestMeta[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setTests(data.tests);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoadingTests(false);
    }
  }, [adminPassword]);

  const loadAudioStats = useCallback(async () => {
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/audio-stats`,
        { headers: authHeaders },
      );
      const data = (await res.json()) as {
        scanned: number;
        referenced: number;
        orphaned: number;
        bytes: number;
      };
      if (res.ok) setAudioStats(data);
    } catch {
      /* ignore */
    }
  }, [adminPassword]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/analytics`,
        { headers: authHeaders },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          totalAttempts: number;
          byTest: AnalyticsByTest[];
        };
        setAnalytics(data);
      }
    } catch {
      /* ignore */
    }
  }, [adminPassword]);

  useEffect(() => {
    void loadTests();
    void loadAudioStats();
    void loadAnalytics();
  }, [loadTests, loadAudioStats, loadAnalytics]);

  const handleEditLoad = async (slug: string) => {
    setEditingSlug(slug);
    setEditJson("");
    setEditError(null);
    setEditLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/tests/${slug}`,
        { headers: authHeaders },
      );
      const data = (await res.json()) as { test?: unknown; error?: string };
      if (!res.ok) {
        setEditError(data.error ?? "Failed to load");
        return;
      }
      setEditJson(JSON.stringify(data.test, null, 2));
    } catch {
      setEditError("Load failed");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingSlug) return;
    setEditError(null);
    let payload: unknown;
    try {
      payload = JSON.parse(editJson);
    } catch {
      setEditError("Invalid JSON");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/tests/${editingSlug}`,
        {
          method: "PUT",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as {
        test?: ListeningTestMeta;
        error?: string;
      };
      if (!res.ok) {
        setEditError(data.error ?? "Save failed");
        return;
      }
      setEditingSlug(null);
      setEditJson("");
      void loadTests();
    } catch {
      setEditError("Save failed");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`Delete test "${title}"?`)) return;
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/tests/${slug}`,
        {
          method: "DELETE",
          headers: authHeaders,
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        alert(data.error ?? "Delete failed");
        return;
      }
      void loadTests();
      void loadAudioStats();
    } catch {
      alert("Delete failed");
    }
  };

  const handlePrime = async () => {
    if (priming) {
      primeAbortRef.current?.abort();
      return;
    }
    setPriming(true);
    setPrimeLog([]);
    const controller = new AbortController();
    primeAbortRef.current = controller;
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/prime-audio`,
        {
          method: "POST",
          headers: authHeaders,
          signal: controller.signal,
        },
      );
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as Record<string, unknown>;
            if (ev.kind === "summary") {
              setPrimeLog((p) => [...p, String(ev.message ?? "Done.")]);
            } else if (ev.kind === "test_start") {
              setPrimeLog((p) => [
                ...p,
                `→ ${String(ev.title)} (${String(ev.segmentCount)} segs)`,
              ]);
            } else if (ev.kind === "test_done") {
              const r = ev.result as {
                uploaded: number;
                skipped: number;
                failed: number;
              };
              setPrimeLog((p) => [
                ...p,
                `  ✓ ${r.uploaded} uploaded, ${r.skipped} skipped${r.failed ? `, ${r.failed} FAILED` : ""}`,
              ]);
            } else if (ev.kind === "error") {
              setPrimeLog((p) => [...p, `Error: ${String(ev.error)}`]);
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        setPrimeLog((p) => [
          ...p,
          `Error: ${err instanceof Error ? err.message : "Unknown"}`,
        ]);
      }
    } finally {
      setPriming(false);
      primeAbortRef.current = null;
      void loadAudioStats();
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    setCleanMsg(null);
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/cleanup-audio`,
        {
          method: "POST",
          headers: authHeaders,
        },
      );
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        setCleanMsg(data.message ?? "Done.");
        void loadAudioStats();
      } else setCleanMsg(data.error ?? "Failed");
    } catch {
      setCleanMsg("Cleanup failed");
    } finally {
      setCleaning(false);
    }
  };

  const handleAdd = async () => {
    setAddError(null);
    let payload: unknown;
    try {
      payload = JSON.parse(addJson);
    } catch {
      setAddError("Invalid JSON");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(
        `${BASE_URL_ADMIN}/api-ielts/listening/admin/tests`,
        {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as {
        test?: ListeningTestMeta;
        error?: string;
      };
      if (!res.ok) {
        setAddError(data.error ?? "Create failed");
        return;
      }
      setAddJson("");
      setShowAdd(false);
      void loadTests();
    } catch {
      setAddError("Create failed");
    } finally {
      setAdding(false);
    }
  };

  const SECTION_IDS = [1, 2, 3, 4];
  const bySection = (id: number) => tests.filter((t) => t.sectionId === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-indigo-500" /> Attenborough
            Listening Tests
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage A2 listening tests for intro-tier students
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              void loadTests();
              void loadAudioStats();
              void loadAnalytics();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => setShowAnalytics((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showAnalytics ? "bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
          >
            Analytics {analytics ? `(${analytics.totalAttempts})` : ""}
          </button>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> {showAdd ? "Cancel" : "Add Test"}
          </button>
        </div>
      </div>

      {showAnalytics && analytics && (
        <div className="bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              Student Attempt Analytics
            </h3>
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full font-medium">
              {analytics.totalAttempts} total
            </span>
          </div>
          {analytics.byTest.length === 0 ? (
            <p className="text-sm text-gray-400">No attempts recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((sid) => {
                const sTests = analytics.byTest.filter(
                  (t) => t.sectionId === sid,
                );
                if (sTests.length === 0) return null;
                return (
                  <div key={sid}>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Section {sid}
                    </p>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                      {sTests.map((t) => (
                        <div
                          key={t.testId}
                          className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800"
                        >
                          <p className="text-sm text-gray-900 dark:text-white truncate flex-1">
                            {t.title}
                          </p>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span className="text-xs text-gray-500">
                              {t.attempts} attempt{t.attempts !== 1 ? "s" : ""}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.avgPercent >= 75 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : t.avgPercent >= 50 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}
                            >
                              {t.avgPercent}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {editingSlug && (
        <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              Edit Test:{" "}
              <span className="font-mono text-amber-600 dark:text-amber-400">
                {editingSlug}
              </span>
            </h3>
            <button
              onClick={() => {
                setEditingSlug(null);
                setEditJson("");
                setEditError(null);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
            >
              ✕ Cancel
            </button>
          </div>
          {editLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading test data…
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Edit the JSON and save. The slug field is ignored on update
                (slug is fixed by URL).
              </p>
              <textarea
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
                rows={14}
                className="w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-3 outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              />
              {editError && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {editError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleEditSave()}
                  disabled={editSaving || !editJson.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {editSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setEditingSlug(null);
                    setEditJson("");
                    setEditError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showAdd && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            Add New Test (JSON)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste a JSON object with: slug, sectionId (1–4), title, description,
            transcript [{"{"}voice,text{"}"}], questions, answerKey.
          </p>
          <textarea
            value={addJson}
            onChange={(e) => setAddJson(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            placeholder='{"slug":"s1-test-1","sectionId":1,"title":"...","description":"...","transcript":[...],"questions":[...],"answerKey":{...}}'
          />
          {addError && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {addError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void handleAdd()}
              disabled={adding || !addJson.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {adding ? "Creating…" : "Create Test"}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setAddJson("");
                setAddError(null);
              }}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
          Audio Cache
        </h3>
        {audioStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Cached", value: String(audioStats.scanned) },
              { label: "Referenced", value: String(audioStats.referenced) },
              { label: "Orphaned", value: String(audioStats.orphaned) },
              {
                label: "Size",
                value: `${(audioStats.bytes / 1024 / 1024).toFixed(1)} MB`,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {s.label}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => void handlePrime()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${priming ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
          >
            {priming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Stop Priming
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" /> Prime Audio
              </>
            )}
          </button>
          <button
            onClick={() => void handleCleanup()}
            disabled={cleaning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {cleaning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {cleaning ? "Cleaning…" : "Cleanup Orphans"}
          </button>
        </div>
        {cleanMsg && (
          <p className="text-sm text-gray-700 dark:text-gray-300">{cleanMsg}</p>
        )}
        {primeLog.length > 0 && (
          <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs font-mono text-gray-700 dark:text-gray-300 space-y-0.5">
            {primeLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>

      {loadingTests ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : loadError ? (
        <div className="text-sm text-red-600 flex items-center gap-2 py-4">
          <AlertCircle className="w-4 h-4" />
          {loadError}
        </div>
      ) : (
        <div className="space-y-4">
          {SECTION_IDS.map((sectionId) => {
            const sectionTests = bySection(sectionId);
            const isOpen = expanded[sectionId] !== false;
            return (
              <div
                key={sectionId}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() =>
                    setExpanded((p) => ({ ...p, [sectionId]: !isOpen }))
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                      {sectionId}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        Section {sectionId}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {sectionTests.length} test
                        {sectionTests.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {sectionTests.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">
                        No tests yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {sectionTests.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-3 px-5 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {t.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t.questionCount}q · {t.segmentCount} seg ·{" "}
                                <span className="font-mono">{t.slug}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => void handleEditLoad(t.slug)}
                                className="text-gray-400 hover:text-amber-500 transition-colors p-1"
                                title="Edit test"
                              >
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  void handleDelete(t.slug, t.title)
                                }
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                title="Delete test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Reading Admin Panel ───────────────────────────────────────────────────────

interface ReadingItemMeta {
  id: number;
  slug: string;
  level: string;
  type: string;
  title: string;
  sortOrder: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ReadingAnalyticsRow {
  slug: string;
  level: string;
  type: string;
  attempts: number;
  avgPercent: number;
}

function ReadingAdminPanel({ adminPassword }: { adminPassword: string }) {
  const API = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const headers = {
    "Content-Type": "application/json",
    "x-admin-password": adminPassword,
  };
  const headersGet = { "x-admin-password": adminPassword };

  const [items, setItems] = useState<ReadingItemMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addJson, setAddJson] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState<ReadingAnalyticsRow[] | null>(
    null,
  );
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API}/api-ielts/reading/admin/items`, {
        headers: headersGet,
      });
      if (!res.ok) {
        setLoadError("Failed to load items");
        return;
      }
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setLoadError("Network error");
    } finally {
      setLoading(false);
    }
  }, [adminPassword]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async () => {
    setAddError(null);
    setAdding(true);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(addJson);
      } catch {
        setAddError("Invalid JSON");
        setAdding(false);
        return;
      }
      const res = await fetch(`${API}/api-ielts/reading/admin/items`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Create failed");
        return;
      }
      setAddJson("");
      setShowAdd(false);
      await fetchItems();
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete reading item "${slug}"?`)) return;
    try {
      const res = await fetch(`${API}/api-ielts/reading/admin/items/${slug}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Delete failed");
        return;
      }
      await fetchItems();
    } catch {
      alert("Network error");
    }
  };

  const handleEdit = async (slug: string) => {
    try {
      const res = await fetch(`${API}/api-ielts/reading/admin/items/${slug}`, {
        headers: headersGet,
      });
      if (!res.ok) {
        alert("Failed to load item");
        return;
      }
      const data = await res.json();
      setEditJson(JSON.stringify(data.item, null, 2));
      setEditingSlug(slug);
      setEditError(null);
    } catch {
      alert("Network error");
    }
  };

  const handleSave = async () => {
    if (!editingSlug) return;
    setEditError(null);
    setSaving(true);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(editJson);
      } catch {
        setEditError("Invalid JSON");
        setSaving(false);
        return;
      }
      const res = await fetch(
        `${API}/api-ielts/reading/admin/items/${editingSlug}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Save failed");
        return;
      }
      setEditingSlug(null);
      setEditJson("");
      await fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API}/api-ielts/reading/admin/analytics`, {
        headers: headersGet,
      });
      if (!res.ok) {
        alert("Failed to load analytics");
        return;
      }
      const data = await res.json();
      setAnalytics(data.byItem ?? []);
      setShowAnalytics(true);
    } catch {
      alert("Network error");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const byLevel: Record<string, ReadingItemMeta[]> = {};
  for (const it of items) {
    const key = it.level.toUpperCase();
    (byLevel[key] ??= []).push(it);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-600" /> Reading Items
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchAnalytics}
            disabled={analyticsLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {analyticsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Analytics
          </button>
          <button
            onClick={() => {
              setShowAdd((v) => !v);
              setAddError(null);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            + Add Item
          </button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {loadError}
        </div>
      )}

      {showAnalytics && analytics && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              Attempt Analytics
            </h3>
            <button
              onClick={() => setShowAnalytics(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          {analytics.length === 0 ? (
            <p className="text-sm text-gray-500">No attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-3">Slug</th>
                    <th className="py-2 pr-3">Level</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Attempts</th>
                    <th className="py-2">Avg %</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics
                    .sort((a, b) => b.attempts - a.attempts)
                    .map((row) => (
                      <tr
                        key={row.slug}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-1.5 pr-3 font-mono text-gray-700 dark:text-gray-300">
                          {row.slug}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">
                          {row.level.toUpperCase()}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">
                          {row.type}
                        </td>
                        <td className="py-1.5 pr-3 font-bold text-gray-900 dark:text-white">
                          {row.attempts}
                        </td>
                        <td
                          className="py-1.5 font-bold"
                          style={{
                            color:
                              row.avgPercent >= 70
                                ? "#22c55e"
                                : row.avgPercent >= 50
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        >
                          {row.avgPercent}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            Add Reading Item (JSON)
          </h3>
          <textarea
            value={addJson}
            onChange={(e) => setAddJson(e.target.value)}
            rows={12}
            placeholder='{"slug":"a2-mcq-6","level":"a2","type":"mcq","title":"...","instructions":"...","passage":"...","questions":[...],"answerKey":{...}}'
            className="w-full rounded-xl px-3 py-2.5 text-xs font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 outline-none resize-y"
          />
          {addError && <p className="text-red-600 text-xs">{addError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !addJson.trim()}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />} Save Item
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setAddJson("");
                setAddError(null);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingSlug && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/10 p-4 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            Edit: <span className="font-mono">{editingSlug}</span>
          </h3>
          <textarea
            value={editJson}
            onChange={(e) => setEditJson(e.target.value)}
            rows={16}
            className="w-full rounded-xl px-3 py-2.5 text-xs font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-indigo-300 dark:border-indigo-700 outline-none resize-y"
          />
          {editError && <p className="text-red-600 text-xs">{editError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
              Changes
            </button>
            <button
              onClick={() => {
                setEditingSlug(null);
                setEditJson("");
                setEditError(null);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading items...
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byLevel)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([level, levelItems]) => (
              <div key={level}>
                <h3 className="text-sm font-black tracking-widest text-violet-600 dark:text-violet-400 uppercase mb-3">
                  {level}
                </h3>
                <div className="space-y-2">
                  {levelItems.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-500">
                            {it.slug}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-medium">
                            {it.type}
                          </span>
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm truncate mt-0.5">
                          {it.title}
                        </div>
                        <div className="text-xs text-gray-400">
                          {it.questionCount} questions
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEdit(it.slug)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(it.slug)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No reading items yet. Add one above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
