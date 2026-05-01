export type Tier = "advance" | "complete";

export type CefrLevel = "A2" | "B1" | "B2" | "C1";

const STORAGE_KEY = "lexo-ielts:tier";
const DEFAULT_TIER: Tier = "complete";

function isValidTier(value: unknown): value is Tier {
  return value === "advance" || value === "complete";
}

export function getTier(): Tier {
  if (typeof window === "undefined") return DEFAULT_TIER;

  try {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("tier");
    if (isValidTier(fromQuery)) {
      window.localStorage.setItem(STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidTier(stored)) return stored;
  } catch {
    // localStorage may throw in some contexts; fall through to default.
  }

  return DEFAULT_TIER;
}

export function setTier(tier: Tier): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, tier);
  } catch {
    // ignore
  }
}

const ADVANCE_LEVELS: readonly CefrLevel[] = ["B1", "B2", "C1"] as const;
const COMPLETE_LEVELS: readonly CefrLevel[] = ["A2", "B1", "B2", "C1"] as const;

export function getAllowedLevels(tier: Tier = getTier()): readonly CefrLevel[] {
  return tier === "advance" ? ADVANCE_LEVELS : COMPLETE_LEVELS;
}

export function isLevelAllowed(level: string | undefined | null, tier: Tier = getTier()): boolean {
  if (!level) return true;
  const allowed = getAllowedLevels(tier);
  return (allowed as readonly string[]).includes(level);
}

export function tierLabel(tier: Tier): string {
  return tier === "advance" ? "B1 → C1" : "A2 → C1";
}
