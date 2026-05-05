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
    // Tier is server-sourced (bootstrapped from /api-ielts/me/tier on every
    // gate unlock). We intentionally do NOT honor a `?tier=` query parameter
    // here, because that would let any logged-in user self-escalate the
    // client-side gating UI by simply navigating to `?tier=complete`.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidTier(stored)) return stored;

    // Intro students may not have the tier key written yet — detect them by
    // the presence of the intro_email auth key set during intro login.
    const introEmail = window.localStorage.getItem("lexo-ielts:intro_email");
    if (introEmail) return "intro";
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

export const ALL_LEVELS: readonly CefrLevel[] = [
  "A2",
  "B1",
  "B2",
  "C1",
] as const;

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

export function isLevelAllowed(
  level: string | undefined | null,
  tier: Tier = getTier(),
): boolean {
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
export function getRestrictedMessage(tier: Tier = getTier()): {
  en: string;
  ar: string;
} {
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

// ── Feature-access map ────────────────────────────────────────────────────────

/**
 * Platform features that have per-tier access rules.
 *
 * - "churchill"  Churchill free conversation + Whisper VAD (intro + complete)
 * - "listening"  Attenborough AI listening tests               (intro + complete)
 * - "reading"    Hemingway AI reading passages                 (intro + complete)
 * - "flashcards" Vocabulary flashcards / study / quiz          (advance + complete)
 * - "speaking"   Churchill structured speaking topics          (advance + complete)
 * - "writing"    Orwell AI essay checker                       (advance + complete)
 */
export type Feature =
  | "churchill"
  | "listening"
  | "reading"
  | "flashcards"
  | "speaking"
  | "writing";

const FEATURE_ACCESS: Record<Feature, readonly Tier[]> = {
  churchill: ["intro", "complete"],
  listening: ["intro", "complete"],
  reading: ["intro", "complete"],
  flashcards: ["advance", "complete"],
  speaking: ["advance", "complete"],
  writing: ["advance", "complete"],
};

/**
 * Returns true if `tier` is entitled to `feature`.
 * Falls back to `getTier()` when `tier` is omitted, so most callsites can
 * simply write `canAccess("listening")` without threading the tier prop.
 */
export function canAccess(feature: Feature, tier: Tier = getTier()): boolean {
  return (FEATURE_ACCESS[feature] as readonly string[]).includes(tier);
}

/**
 * Upgrade CTA copy shown to advance students who try to open an intro-only
 * feature (or intro students who try to open an advance-only feature).
 */
export function getUpgradeMessage(
  feature: Feature,
  tier: Tier = getTier(),
): { en: string; ar: string } {
  if (tier === "advance") {
    return {
      en: "This feature is available in the Intro and Comprehensive plans.",
      ar: "هذه الميزة متاحة في باقة المقدّمة أو الشاملة",
    };
  }
  if (tier === "intro") {
    return {
      en: "This feature is available in the Advance and Comprehensive plans.",
      ar: "هذه الميزة متاحة في باقة المتقدّم أو الشاملة",
    };
  }
  // feature reserved for future copy variants
  void feature;
  return {
    en: "All features are available on your plan.",
    ar: "جميع الميزات متاحة لباقتك",
  };
}
