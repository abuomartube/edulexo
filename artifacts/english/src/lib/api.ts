// All endpoints live on the shared platform API at /api (same origin, session
// cookie shared with the rest of LEXO).

export const ENGLISH_TIERS = ["beginner", "intermediate", "advanced"] as const;
export type EnglishTier = (typeof ENGLISH_TIERS)[number];

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "student" | "admin";
  emailVerified: boolean;
  createdAt: string;
};

export type EnglishEnrollment = {
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
};

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (res.status === 204) {
    return { ok: true, data: undefined as T };
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const error =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error ?? "")
        : "") || res.statusText;
    return { ok: false, status: res.status, error };
  }
  return { ok: true, data: body as T };
}

export async function getMe() {
  return request<{ user: PublicUser | null }>("/api/auth/me");
}

export async function getEnglishEnrollments() {
  return request<{ enrollments: EnglishEnrollment[] }>("/api/english/me");
}

export async function redeemEnglishCode(code: string) {
  return request<{ enrollment: EnglishEnrollment }>("/api/english/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function logout() {
  return request<undefined>("/api/auth/logout", { method: "POST" });
}

export function tierRank(tier: EnglishTier): number {
  return ENGLISH_TIERS.indexOf(tier);
}

export function bestTier(
  enrollments: EnglishEnrollment[],
): EnglishTier | null {
  const active = enrollments.filter((e) => e.isActive);
  if (active.length === 0) return null;
  active.sort((a, b) => tierRank(b.tier) - tierRank(a.tier));
  return active[0]!.tier;
}

export function isTierUnlocked(
  enrollments: EnglishEnrollment[],
  tier: EnglishTier,
): boolean {
  const best = bestTier(enrollments);
  if (!best) return false;
  return tierRank(best) >= tierRank(tier);
}
