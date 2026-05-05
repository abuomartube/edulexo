import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, userDataTable } from "@workspace/ielts-db";
import type { Request } from "express";

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "fallback-secret";

export type Tier = "intro" | "advance" | "complete";

const INTRO_LEVELS = ["A2", "B1"] as const;
const ADVANCE_LEVELS = ["B1", "B2", "C1"] as const;

export function verifyStudentEmail(req: Request): string | null {
  const email = ((req.headers["x-student-email"] as string) || "")
    .trim()
    .toLowerCase();
  const token = ((req.headers["x-student-token"] as string) || "").trim();
  if (!email || !token) return null;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(email + ":approved")
    .digest("hex");
  if (token !== expected) return null;
  return email;
}

// Returns the set of CEFR levels the tier is allowed to see, or null for the
// unrestricted "complete" tier.
export function tierLevels(tier: Tier): readonly string[] | null {
  if (tier === "intro") return INTRO_LEVELS;
  if (tier === "advance") return ADVANCE_LEVELS;
  return null;
}

// Read the student's persisted tier from user_data.
// Deny-by-default: unauthenticated requests are treated as "intro" so that
// the paid B2/C1 content cannot be reached just by clearing the auth headers.
// Legacy authenticated users with no `tier` row are grandfathered to
// "complete" — new accounts are always provisioned via SSO which writes the
// tier row up front.
export async function getStudentTier(email: string | null): Promise<Tier> {
  if (!email) return "intro";
  const [row] = await db
    .select({ value: userDataTable.value })
    .from(userDataTable)
    .where(and(eq(userDataTable.email, email), eq(userDataTable.key, "tier")))
    .limit(1);
  const v = row?.value;
  if (v === "intro" || v === "advance" || v === "complete") return v;
  return "complete";
}

export function tierAllowsLevel(tier: Tier, level: string): boolean {
  const allowed = tierLevels(tier);
  if (!allowed) return true;
  return allowed.includes(level);
}
