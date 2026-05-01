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

// ───── Phase 4 P2 — admin content management ─────

export interface AdminEnrollmentRow {
  id: string;
  userId: string;
  studentName: string | null;
  studentEmail: string | null;
  tier: Tier;
  status: "active" | "expired" | "revoked";
  source: "admin" | "code" | "stripe";
  grantedAt: string;
  expiresAt: string | null;
  note: string | null;
}

export interface FaqRow {
  id: string;
  courseSlug: string | null;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRow {
  slug: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string | null;
  subtitleAr: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function patchStudent(
  id: string,
  body: { name?: string; role?: "student" | "admin" },
): Promise<Student> {
  const res = await fetch(`/api/admin/students/${id}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ student: Student }>(res);
  return data.student;
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await fetch(`/api/admin/students/${id}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ message: string }>(res);
}

export async function fetchAllEnrollments(filters?: {
  status?: "active" | "expired" | "revoked";
  tier?: Tier;
}): Promise<AdminEnrollmentRow[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.tier) params.set("tier", filters.tier);
  const qs = params.toString();
  const res = await fetch(
    `/api/admin/enrollments${qs ? `?${qs}` : ""}`,
    { ...init, method: "GET" },
  );
  const data = await jsonOrThrow<{ enrollments: AdminEnrollmentRow[] }>(res);
  return data.enrollments;
}

export async function patchEnrollment(
  id: string,
  body: {
    status?: "active" | "expired" | "revoked";
    expiresAt?: string | null;
    note?: string | null;
  },
): Promise<AdminEnrollmentRow> {
  const res = await fetch(`/api/admin/enrollments/${id}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ enrollment: AdminEnrollmentRow }>(res);
  return data.enrollment;
}

export async function fetchAdminFaqs(): Promise<FaqRow[]> {
  const res = await fetch("/api/admin/faqs", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ faqs: FaqRow[] }>(res);
  return data.faqs;
}

export async function createFaq(body: {
  courseSlug: string | null;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  isPublished?: boolean;
}): Promise<FaqRow> {
  const res = await fetch("/api/admin/faqs", {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ faq: FaqRow }>(res);
  return data.faq;
}

export async function patchFaq(
  id: string,
  body: Partial<{
    courseSlug: string | null;
    questionEn: string;
    questionAr: string;
    answerEn: string;
    answerAr: string;
    isPublished: boolean;
  }>,
): Promise<FaqRow> {
  const res = await fetch(`/api/admin/faqs/${id}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ faq: FaqRow }>(res);
  return data.faq;
}

export async function deleteFaq(id: string): Promise<void> {
  const res = await fetch(`/api/admin/faqs/${id}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ message: string }>(res);
}

export async function reorderFaqs(ids: string[]): Promise<void> {
  const res = await fetch("/api/admin/faqs/reorder", {
    ...init,
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  await jsonOrThrow<{ message: string }>(res);
}

export async function fetchAdminCourses(): Promise<CourseRow[]> {
  const res = await fetch("/api/admin/courses", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ courses: CourseRow[] }>(res);
  return data.courses;
}

export async function patchCourse(
  slug: string,
  body: Partial<{
    titleEn: string;
    titleAr: string;
    subtitleEn: string | null;
    subtitleAr: string | null;
    isPublished: boolean;
    displayOrder: number;
  }>,
): Promise<CourseRow> {
  const res = await fetch(`/api/admin/courses/${slug}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ course: CourseRow }>(res);
  return data.course;
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
