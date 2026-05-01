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

// Soft-revokes an INTRO enrollment (sets status to 'revoked'). Used from the
// inline X chip in the StudentsTab, which only lists intro enrollments.
// English enrollments are revoked from EnrollmentsTab via patchEnrollment.
export async function revokeEnrollment(enrollmentId: string): Promise<void> {
  const res = await fetch(
    `/api/admin/enrollments/${enrollmentId}?course=intro`,
    {
      ...init,
      method: "PATCH",
      body: JSON.stringify({ status: "revoked" }),
    },
  );
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
  /** Tier name; values depend on `course` (intro: intro/advance/complete; english: beginner/intermediate/advanced). */
  tier: string;
  status: "active" | "expired" | "revoked";
  source: "admin" | "code" | "stripe";
  grantedAt: string;
  expiresAt: string | null;
  note: string | null;
  course: "intro" | "english";
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
  /** Present on /admin/courses; absent on the public /courses endpoint. */
  totalActiveEnrollments?: number;
  tiers?: { tier: string; count: number }[];
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
  tier?: string;
  course?: "intro" | "english";
}): Promise<AdminEnrollmentRow[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.tier) params.set("tier", filters.tier);
  if (filters?.course) params.set("course", filters.course);
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
  course: "intro" | "english",
  body: {
    status?: "active" | "expired" | "revoked";
    expiresAt?: string | null;
    note?: string | null;
  },
): Promise<AdminEnrollmentRow> {
  const res = await fetch(`/api/admin/enrollments/${id}?course=${course}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ enrollment: AdminEnrollmentRow }>(res);
  return data.enrollment;
}

export async function deleteEnrollment(
  id: string,
  course: "intro" | "english",
): Promise<void> {
  const res = await fetch(`/api/admin/enrollments/${id}?course=${course}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ message: string }>(res);
}

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  activeToday: number;
  activeThisWeek: number;
  totalActiveEnrollments: number;
  enrollmentsByTier: { course: "intro" | "english"; tier: string; count: number }[];
  conversionRate: number;
  revenueAllTime: number;
  revenueDaily30: { date: string; amount: number }[];
  signupsDaily30: { date: string; count: number }[];
  enrollmentsDaily30: { date: string; count: number }[];
  recentSignups: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats", { ...init, method: "GET" });
  return jsonOrThrow<AdminStats>(res);
}

export async function fetchEmailRecipientsCount(
  audience: "all" | "course",
  courseSlug?: "intro" | "english" | "ielts",
): Promise<number> {
  const params = new URLSearchParams({ audience });
  if (courseSlug) params.set("courseSlug", courseSlug);
  const res = await fetch(`/api/admin/email/recipients?${params.toString()}`, {
    ...init,
    method: "GET",
  });
  const data = await jsonOrThrow<{ count: number }>(res);
  return data.count;
}

export async function broadcastEmail(body: {
  audience: "all" | "course";
  courseSlug?: "intro" | "english" | "ielts";
  subject: string;
  body: string;
}): Promise<{ recipientCount: number; sentCount: number; failedCount: number; stubMode: boolean }> {
  const res = await fetch("/api/admin/email/broadcast", {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

export type EmailLogType =
  | "email_verification"
  | "password_reset"
  | "welcome"
  | "enrollment_confirmation"
  | "course_access"
  | "expiry_reminder"
  | "admin_new_signup"
  | "admin_new_enrollment"
  | "broadcast";

export interface EmailLogRow {
  id: string;
  userId: string | null;
  toEmail: string;
  subject: string;
  emailType: EmailLogType;
  status: "sent" | "failed";
  error: string | null;
  sentAt: string;
}

export async function fetchEmailLog(params?: {
  type?: EmailLogType;
  status?: "sent" | "failed";
  limit?: number;
}): Promise<EmailLogRow[]> {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.status) q.set("status", params.status);
  if (params?.limit) q.set("limit", String(params.limit));
  const url = q.toString() ? `/api/admin/emails?${q}` : "/api/admin/emails";
  const res = await fetch(url, { ...init, method: "GET" });
  const data = await jsonOrThrow<{ emails: EmailLogRow[] }>(res);
  return data.emails;
}

export interface ExpiringEnrollmentRow {
  enrollmentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  course: "intro" | "english";
  tier: string;
  expiresAt: string;
  alreadyReminded: boolean;
}

export async function fetchExpiringEnrollments(
  days = 7,
): Promise<{ days: number; enrollments: ExpiringEnrollmentRow[] }> {
  const res = await fetch(`/api/admin/email/expiring?days=${days}`, {
    ...init,
    method: "GET",
  });
  return jsonOrThrow(res);
}

export async function sendExpiryReminders(
  days = 7,
): Promise<{
  considered: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  stubMode: boolean;
}> {
  const res = await fetch(
    `/api/admin/email/send-expiry-reminders?days=${days}`,
    { ...init, method: "POST" },
  );
  return jsonOrThrow(res);
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

// ─────────────────────────── Certificates ───────────────────────────

export type CertificateCourse = "intro" | "english";

export interface MyCertificate {
  id: string;
  course: CertificateCourse;
  tier: string;
  certificateId: string;
  completionDate: string;
  issuedAt: string;
}

export interface AdminCertificate extends MyCertificate {
  userId: string;
  userName: string;
  userEmail: string;
  revokedAt: string | null;
  revokeReason: string | null;
}

export async function fetchMyCertificates(): Promise<MyCertificate[]> {
  const res = await fetch("/api/certificates/mine", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ certificates: MyCertificate[] }>(res);
  return data.certificates;
}

export async function fetchAllCertificates(params?: {
  search?: string;
  course?: CertificateCourse;
  status?: "active" | "revoked";
}): Promise<AdminCertificate[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.course) qs.set("course", params.course);
  if (params?.status) qs.set("status", params.status);
  const url = `/api/admin/certificates${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { ...init, method: "GET" });
  const data = await jsonOrThrow<{ certificates: AdminCertificate[] }>(res);
  return data.certificates;
}

export async function issueCertificate(input: {
  userId: string;
  course: CertificateCourse;
  tier: string;
  enrollmentId?: string;
  completionDate?: string;
}): Promise<AdminCertificate> {
  const res = await fetch("/api/admin/certificates/issue", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ certificate: AdminCertificate }>(res);
  return data.certificate;
}

export async function revokeCertificate(
  id: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(`/api/admin/certificates/${id}/revoke`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ reason: reason ?? undefined }),
  });
  await jsonOrThrow<{ certificate: AdminCertificate }>(res);
}

export function getCertificatePdfUrl(id: string): string {
  return `/api/certificates/${id}/pdf`;
}
