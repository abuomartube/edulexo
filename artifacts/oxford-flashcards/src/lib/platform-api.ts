// Typed fetch helpers for platform endpoints (enrollments, admin, sso).
// These hit /api which is the api-server artifact via the workspace proxy.

export type Tier = "intro" | "advance" | "complete";

export interface Enrollment {
  id: string;
  userId: string;
  tier: Tier;
  status: "active" | "expired" | "revoked";
  source: "admin" | "code" | "stripe";
  grantedBy: string | null;
  grantedAt: string;
  expiresAt: string | null;
  note: string | null;
  isActive: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  enrollments: Omit<Enrollment, "isActive">[];
}

export interface AccessCodeRow {
  id: string;
  code: string;
  tier: Tier;
  status: "active" | "used" | "revoked";
  maxUses: number;
  usedCount: number;
  createdBy: string | null;
  createdAt: string;
  redeemedByUserId: string | null;
  redeemedAt: string | null;
  expiresAt: string | null;
  note: string | null;
  redeemerName: string | null;
  redeemerEmail: string | null;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

const init: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

export async function fetchMyEnrollments(): Promise<Enrollment[]> {
  const res = await fetch("/api/enrollments/me", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ enrollments: Enrollment[] }>(res);
  return data.enrollments;
}

export async function redeemAccessCode(code: string): Promise<Enrollment> {
  const res = await fetch("/api/enrollments/redeem", {
    ...init,
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const data = await jsonOrThrow<{ enrollment: Enrollment }>(res);
  return data.enrollment;
}

export async function launchTier(tier: Tier): Promise<{ url: string }> {
  const res = await fetch(`/api/sso/${tier}/launch`, {
    ...init,
    method: "POST",
  });
  return jsonOrThrow<{ url: string }>(res);
}

// ───── Admin ─────

export async function fetchStudents(): Promise<Student[]> {
  const res = await fetch("/api/admin/students", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ students: Student[] }>(res);
  return data.students;
}

export async function grantTier(
  studentId: string,
  tier: Tier,
  expiresAt?: string | null,
  note?: string,
): Promise<Enrollment> {
  const res = await fetch(`/api/admin/students/${studentId}/grant`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ tier, expiresAt: expiresAt ?? null, note }),
  });
  const data = await jsonOrThrow<{ enrollment: Enrollment }>(res);
  return data.enrollment;
}

export async function revokeEnrollment(enrollmentId: string): Promise<void> {
  const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ enrollment: Enrollment }>(res);
}

export async function fetchAccessCodes(): Promise<AccessCodeRow[]> {
  const res = await fetch("/api/admin/codes", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ codes: AccessCodeRow[] }>(res);
  return data.codes;
}

export async function createAccessCodes(payload: {
  tier: Tier;
  count: number;
  maxUses?: number;
  expiresAt?: string | null;
  note?: string;
}): Promise<AccessCodeRow[]> {
  const res = await fetch("/api/admin/codes", {
    ...init,
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await jsonOrThrow<{ codes: AccessCodeRow[] }>(res);
  return data.codes;
}

export async function revokeAccessCode(codeId: string): Promise<void> {
  const res = await fetch(`/api/admin/codes/${codeId}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ code: AccessCodeRow }>(res);
}

export const TIER_LABELS: Record<Tier, { en: string; ar: string }> = {
  intro: { en: "Intro (A2 → B1)", ar: "تمهيدي (A2 → B1)" },
  advance: { en: "Advance (B1 → C1)", ar: "متقدم (B1 → C1)" },
  complete: { en: "Complete (A2 → C1)", ar: "شامل (A2 → C1)" },
};

// ───── LEXO for English (separate course, separate tier enum) ─────

export type EnglishTier = "beginner" | "intermediate" | "advanced";

export interface EnglishEnrollment {
  id: string;
  userId: string;
  tier: EnglishTier;
  status: "active" | "expired" | "revoked";
  source: "admin" | "code" | "stripe";
  grantedBy: string | null;
  grantedAt: string;
  expiresAt: string | null;
  note: string | null;
  isActive: boolean;
}

export async function fetchMyEnglishEnrollments(): Promise<EnglishEnrollment[]> {
  const res = await fetch("/api/english/me", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ enrollments: EnglishEnrollment[] }>(res);
  return data.enrollments;
}

export async function redeemEnglishCode(code: string): Promise<EnglishEnrollment> {
  const res = await fetch("/api/english/redeem", {
    ...init,
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const data = await jsonOrThrow<{ enrollment: EnglishEnrollment }>(res);
  return data.enrollment;
}

// English uses the shared session cookie — no SSO needed; just navigate.
export const ENGLISH_APP_URL = "/app-english/";

export const ENGLISH_TIER_LABELS: Record<EnglishTier, { en: string; ar: string }> = {
  beginner: { en: "Beginner", ar: "مبتدئ" },
  intermediate: { en: "Intermediate", ar: "متوسط" },
  advanced: { en: "Advanced", ar: "متقدّم" },
};
