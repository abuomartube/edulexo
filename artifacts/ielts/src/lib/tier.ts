export type Tier = "intro" | "advance" | "complete";

export type CefrLevel = "A2" | "B1" | "B2" | "C1";

const STORAGE_KEY = "lexo-ielts:tier";
const DEFAULT_TIER: Tier = "complete";

function isValidTier(value: unknown): value is Tier {
  return value === "intro" || value === "advance" || value === "complete";
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

export const ALL_LEVELS: readonly CefrLevel[] = ["A2", "B1", "B2", "C1"] as const;

const INTRO_LEVELS: readonly CefrLevel[] = ["A2", "B1"] as const;
const ADVANCE_LEVELS: readonly CefrLevel[] = ["B1", "B2", "C1"] as const;
const COMPLETE_LEVELS: readonly CefrLevel[] = ["A2", "B1", "B2", "C1"] as const;

export function getAllowedLevels(tier: Tier = getTier()): readonly CefrLevel[] {
  if (tier === "intro") return INTRO_LEVELS;
  if (tier === "advance") return ADVANCE_LEVELS;
  return COMPLETE_LEVELS;
}

/**
 * All four CEFR levels — used by pickers that want to display every level
 * (with the restricted ones rendered in a disabled state) instead of hiding
 * the restricted ones.
 */
export function getDisplayLevels(): readonly CefrLevel[] {
  return ALL_LEVELS;
}

export function isLevelAllowed(level: string | undefined | null, tier: Tier = getTier()): boolean {
  if (!level) return true;
  const allowed = getAllowedLevels(tier);
  return (allowed as readonly string[]).includes(level);
}

export function isIntro(tier: Tier = getTier()): boolean {
  return tier === "intro";
}

export function isAdvance(tier: Tier = getTier()): boolean {
  return tier === "advance";
}

/** True for any tier that actively restricts at least one CEFR level. */
export function isRestricted(tier: Tier = getTier()): boolean {
  return tier === "intro" || tier === "advance";
}

export function tierLabel(tier: Tier): string {
  if (tier === "intro") return "A2 → B1";
  if (tier === "advance") return "B1 → C1";
  return "A2 → C1";
}

export function tierLabelAr(tier: Tier): string {
  if (tier === "intro") return "مقدّمة (A2 إلى B1)";
  if (tier === "advance") return "متقدّم (B1 إلى C1)";
  return "شاملة (A2 إلى C1)";
}

/**
 * Short, friendly restriction copy shown next to a locked level/feature.
 * Bilingual EN + AR — callers render whichever language matches their UI.
 *
 * The wording depends on which tier the *current user* is on, because the
 * helpful next step is different:
 *   - Intro user looking at a B2/C1 lock → upgrade to Advance or Comprehensive.
 *   - Advance user looking at an A2 lock → use Intro or Comprehensive.
 *   - Comprehensive user → no restrictions, returns a neutral message.
 */
export function getRestrictedMessage(tier: Tier = getTier()): { en: string; ar: string } {
  if (tier === "advance") {
    return {
      en: "Available in Intro and Comprehensive tiers.",
      ar: "هذا مخصص للمدخل والشاملة",
    };
  }
  if (tier === "complete") {
    // Defensive: complete tier never sees a lock so this is rarely called.
    // Return a neutral message so accidental calls don't show "upgrade" copy.
    return {
      en: "All levels are available on your tier.",
      ar: "جميع المستويات متاحة لباقتك",
    };
  }
  // Intro: the locked levels live above intro.
  return {
    en: "Available in Advance and Comprehensive tiers.",
    ar: "هذا مخصص للمتقدم والشاملة",
  };
}

/**
 * @deprecated kept temporarily for incremental migration — use
 * {@link getRestrictedMessage} which adapts to the user's tier.
 */
export const restrictedMessage = {
  en: "Available in Advance and Comprehensive tiers.",
  ar: "هذا مخصص للمتقدم والشاملة",
} as const;
