/**
 * AI Context Digest Functions — Sprint 44 Wave 1 Scaffold
 *
 * Pure functions that extract a compact, sanitized digest from raw phase data
 * (DestinationGuide, ItineraryDay[], transport/accommodation records).
 *
 * Design principles:
 * - ZERO I/O: no Prisma, no Redis, no HTTP. Inputs come pre-fetched.
 * - DETERMINISTIC: same input → same output (ideal for cache + unit testing).
 * - SAFE: every user-originated string field runs through `sanitizeForPrompt`
 *   to block prompt injection before entering any downstream AI prompt.
 * - BOUNDED: each digest has a hard token ceiling (see per-function docs).
 *   Digests are plain text, not JSON — maximises cache hit and avoids
 *   AI hallucination on JSON parsing.
 *
 * Context assembly (I/O + orchestration) is handled by ExpeditionAiContextService
 * at `src/server/services/expedition-ai-context.service.ts`. This module
 * is importable from edge runtime, unit tests, and Storybook.
 *
 * Token budgets (≤ 400 tokens per digest) are enforced by field selection and
 * string truncation. Do NOT add fields without reviewing the budget.
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §1.5
 * Spec ref: SPEC-ARCH-REORDER-PHASES §10.2
 * @version 1.0.0
 */

import { sanitizeForPrompt } from "@/lib/prompts/injection-guard";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Compact extract from a DestinationGuide used by Itinerary and Checklist prompts.
 * ~400 tokens. Spec ref: SPEC-AI-REORDER-PHASES §1.5
 */
export interface GuideDigest {
  /** e.g. "Tropical, 22-30°C in April" */
  climate: string;
  /** e.g. "Type G, 230V" */
  plugType: string;
  /** e.g. "BRL" */
  currencyLocal: string;
  /** e.g. "+55" */
  dialCode: string;
  safetyLevel: "safe" | "moderate" | "caution";
  /** e.g. "None required; yellow fever recommended" */
  vaccinesRequired: string;
  /** Top 3 must-see categories from the guide, sanitized */
  topCategories: string[];
}

/**
 * Compact extract from ItineraryDay[] used by Checklist prompt.
 * ~300 tokens. Spec ref: SPEC-AI-REORDER-PHASES §1.5
 */
export interface ItineraryDigest {
  totalDays: number;
  /** Distinct activity types used across all days, e.g. ["FOOD", "SIGHTSEEING"] */
  activityTypesUsed: string[];
  hasBeachDay: boolean;
  hasHikeDay: boolean;
  hasNightlifeEvening: boolean;
  hasReligiousSite: boolean;
  hasMuseumDay: boolean;
  highestIntensity: "low" | "moderate" | "high";
  /** Number of transit days (multi-city trips) */
  transitDaysCount: number;
}

/**
 * Compact extract from TransportSegment[] + Accommodation[] used by Checklist prompt.
 * ~200 tokens. Spec ref: SPEC-AI-REORDER-PHASES §1.5
 */
export interface LogisticsDigest {
  /** e.g. ["plane", "car_rental"] */
  transportModes: string[];
  /** e.g. ["hotel", "airbnb"] */
  accommodationTypes: string[];
  /** e.g. ["walking", "metro", "uber"] */
  mobility: string[];
  hasRentalCar: boolean;
  hasInternationalFlight: boolean;
}

// ─── Raw input types ─────────────────────────────────────────────────────────
//
// These match the Prisma JSON structure stored in DestinationGuide.content
// and the shape of Activity rows. Using explicit types avoids importing Prisma
// types into this module (which must stay I/O-free).

export interface RawGuideSection {
  key: string;
  type?: string;
  content?: string;
  details?: string;
}

export interface RawGuideContent {
  quickFacts?: {
    climate?: string;
    plugType?: string;
    currency?: string;
    dialCode?: string;
    emergency?: string;
  };
  safety?: {
    level?: "safe" | "moderate" | "caution";
    details?: string;
    vaccines?: string;
  };
  sections?: RawGuideSection[];
  mustSee?: Array<{ category?: string; name?: string }>;
}

export interface RawActivity {
  activityType?: string | null;
  title?: string | null;
  notes?: string | null;
}

export interface RawItineraryDay {
  isTransit?: boolean;
  activities?: RawActivity[];
}

export interface RawTransportSegment {
  transportType: string;
  isReturn?: boolean;
  departurePlace?: string | null;
  arrivalPlace?: string | null;
}

export interface RawAccommodation {
  accommodationType: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_BEACH = ["BEACH", "WATER_SPORTS", "SNORKELING"] as const;
const ACTIVITY_TYPE_HIKE = ["HIKING", "TREKKING", "NATURE", "MOUNTAIN"] as const;
const ACTIVITY_TYPE_NIGHTLIFE = ["NIGHTLIFE", "PARTY", "BAR", "CONCERT"] as const;
const ACTIVITY_TYPE_RELIGIOUS = ["RELIGIOUS", "TEMPLE", "CHURCH", "MOSQUE"] as const;
const ACTIVITY_TYPE_MUSEUM = ["MUSEUM", "GALLERY", "ART", "EXHIBITION"] as const;

const HIGH_INTENSITY_TYPES = ["HIKING", "TREKKING", "MOUNTAIN", "WATER_SPORTS", "SPORT"] as const;
const MEDIUM_INTENSITY_TYPES = ["SIGHTSEEING", "WALKING_TOUR", "CYCLING", "BEACH"] as const;

const MAX_TOP_CATEGORIES = 3;
const MAX_ACTIVITY_TYPES = 10;
const MAX_TRANSPORT_MODES = 6;
const MAX_ACCOMMODATION_TYPES = 5;
const MAX_MOBILITY_TYPES = 6;

// ─── Sanitize helpers ────────────────────────────────────────────────────────

/**
 * Safely sanitize a string field for inclusion in a prompt.
 * Returns an empty string if the input is null/undefined or if injection is detected.
 */
function safeField(value: string | null | undefined, context: string, maxLen = 150): string {
  if (!value || typeof value !== "string") return "";
  try {
    return sanitizeForPrompt(value.trim(), context, maxLen);
  } catch {
    // Injection detected — return empty rather than propagating the error
    // (the digest is a best-effort helper; callers handle missing fields)
    return "";
  }
}

// ─── buildGuideDigest ────────────────────────────────────────────────────────

/**
 * Extracts a compact, sanitized digest from a DestinationGuide content JSON.
 *
 * Token budget: ≤ 400 tokens.
 *
 * All user-originating fields (climate, plugType, etc.) are passed through
 * `sanitizeForPrompt` to prevent injection attacks. Any field that fails
 * sanitization is omitted (empty string) rather than causing an error.
 *
 * Returns a `GuideDigest` object; callers typically convert it to plain text
 * via `formatGuideDigest()` before injecting into a prompt.
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §1.5, §4.2
 */
export function buildGuideDigest(content: RawGuideContent): GuideDigest {
  const qf = content.quickFacts ?? {};
  const safety = content.safety ?? {};

  // Extract top must-see categories (up to MAX_TOP_CATEGORIES)
  const rawMustSee = content.mustSee ?? [];
  const topCategories: string[] = [];
  for (const item of rawMustSee) {
    if (topCategories.length >= MAX_TOP_CATEGORIES) break;
    const cat = safeField(item.category, "guideDigest.category", 60);
    if (cat && !topCategories.includes(cat)) {
      topCategories.push(cat);
    }
  }

  // Fall back to section keys if mustSee is empty
  if (topCategories.length === 0 && content.sections) {
    for (const section of content.sections) {
      if (topCategories.length >= MAX_TOP_CATEGORIES) break;
      const key = safeField(section.key, "guideDigest.sectionKey", 60);
      if (key) topCategories.push(key);
    }
  }

  const safetyLevel = (["safe", "moderate", "caution"] as const).includes(
    safety.level as "safe" | "moderate" | "caution"
  )
    ? (safety.level as "safe" | "moderate" | "caution")
    : "moderate";

  return {
    climate: safeField(qf.climate, "guideDigest.climate"),
    plugType: safeField(qf.plugType, "guideDigest.plugType", 60),
    currencyLocal: safeField(qf.currency, "guideDigest.currency", 10),
    dialCode: safeField(qf.dialCode, "guideDigest.dialCode", 10),
    safetyLevel,
    vaccinesRequired: safeField(safety.vaccines, "guideDigest.vaccines", 200),
    topCategories,
  };
}

/**
 * Formats a GuideDigest as a plain-text block suitable for prompt injection.
 * ≤ 400 tokens. Spec ref: SPEC-AI-REORDER-PHASES §4.2
 */
export function formatGuideDigest(digest: GuideDigest): string {
  const lines: string[] = ["Destination summary from Guide (Phase 3):"];

  if (digest.climate) {
    lines.push(`- Climate during travel period: ${digest.climate}`);
  }
  if (digest.currencyLocal) {
    lines.push(`- Local currency: ${digest.currencyLocal} (use for all estimatedCost values)`);
  }
  if (digest.plugType) {
    lines.push(`- Plug type: ${digest.plugType}`);
  }
  if (digest.dialCode) {
    lines.push(`- Country dial code: ${digest.dialCode}`);
  }
  lines.push(`- Safety level: ${digest.safetyLevel}`);
  if (digest.vaccinesRequired) {
    lines.push(`- Health/vaccines: ${digest.vaccinesRequired}`);
  }
  if (digest.topCategories.length > 0) {
    lines.push(`- Must-see highlights (priority categories): ${digest.topCategories.join(", ")}`);
  }

  return lines.join("\n");
}

// ─── buildItineraryDigest ────────────────────────────────────────────────────

/**
 * Extracts a compact, sanitized digest from ItineraryDay rows.
 *
 * Token budget: ≤ 300 tokens.
 *
 * Activity type strings come from AI-generated data and may contain injections
 * if tainted by user personalNotes that leaked into the AI output. All
 * activity type and title fields are sanitized.
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §1.5
 * Guardrail ref: SPEC-AI-REORDER-PHASES §0 (indirect injection via Itinerary data)
 */
export function buildItineraryDigest(days: RawItineraryDay[]): ItineraryDigest {
  const allTypes = new Set<string>();
  let hasBeachDay = false;
  let hasHikeDay = false;
  let hasNightlifeEvening = false;
  let hasReligiousSite = false;
  let hasMuseumDay = false;
  let transitDaysCount = 0;
  let maxIntensity: "low" | "moderate" | "high" = "low";

  for (const day of days) {
    if (day.isTransit) {
      transitDaysCount++;
      continue;
    }

    for (const activity of day.activities ?? []) {
      const rawType = activity.activityType;
      if (!rawType) continue;

      // Sanitize activity type before comparing (injection guard)
      const sanitizedType = safeField(rawType.toUpperCase(), "itineraryDigest.activityType", 50);
      if (!sanitizedType) continue;

      if (allTypes.size < MAX_ACTIVITY_TYPES) {
        allTypes.add(sanitizedType);
      }

      if (!hasBeachDay && ACTIVITY_TYPE_BEACH.some((t) => sanitizedType.includes(t))) {
        hasBeachDay = true;
      }
      if (!hasHikeDay && ACTIVITY_TYPE_HIKE.some((t) => sanitizedType.includes(t))) {
        hasHikeDay = true;
      }
      if (!hasNightlifeEvening && ACTIVITY_TYPE_NIGHTLIFE.some((t) => sanitizedType.includes(t))) {
        hasNightlifeEvening = true;
      }
      if (!hasReligiousSite && ACTIVITY_TYPE_RELIGIOUS.some((t) => sanitizedType.includes(t))) {
        hasReligiousSite = true;
      }
      if (!hasMuseumDay && ACTIVITY_TYPE_MUSEUM.some((t) => sanitizedType.includes(t))) {
        hasMuseumDay = true;
      }

      // Track highest intensity
      if (HIGH_INTENSITY_TYPES.some((t) => sanitizedType.includes(t))) {
        maxIntensity = "high";
      } else if (
        maxIntensity !== "high" &&
        MEDIUM_INTENSITY_TYPES.some((t) => sanitizedType.includes(t))
      ) {
        maxIntensity = "moderate";
      }
    }
  }

  return {
    totalDays: days.length,
    activityTypesUsed: Array.from(allTypes),
    hasBeachDay,
    hasHikeDay,
    hasNightlifeEvening,
    hasReligiousSite,
    hasMuseumDay,
    highestIntensity: maxIntensity,
    transitDaysCount,
  };
}

// ─── buildLogisticsDigest ────────────────────────────────────────────────────

/**
 * Extracts a compact, sanitized digest from TransportSegment[] + Accommodation[]
 * + local mobility string[].
 *
 * Token budget: ≤ 200 tokens.
 *
 * Transport/accommodation types are controlled-vocabulary values written by
 * the server (not free text), but are still sanitized as a defence-in-depth
 * measure.
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §1.5
 */
export function buildLogisticsDigest(
  transport: RawTransportSegment[],
  accommodations: RawAccommodation[],
  localMobility: string[]
): LogisticsDigest {
  const transportModes = new Set<string>();
  const accommodationTypes = new Set<string>();
  const mobilitySet = new Set<string>();
  let hasRentalCar = false;
  let hasInternationalFlight = false;

  for (const segment of transport) {
    if (transportModes.size >= MAX_TRANSPORT_MODES) break;
    const mode = safeField(segment.transportType, "logisticsDigest.transportType", 30);
    if (!mode) continue;
    transportModes.add(mode);

    if (mode.toLowerCase() === "car" || mode.toLowerCase() === "car_rental") {
      hasRentalCar = true;
    }
    if (mode.toLowerCase() === "flight" || mode.toLowerCase() === "plane") {
      // Heuristic: if departure/arrival differ significantly, assume international
      // (The caller can pass this info explicitly via personalNotes — this is a best-effort)
      hasInternationalFlight = true;
    }
  }

  for (const acc of accommodations) {
    if (accommodationTypes.size >= MAX_ACCOMMODATION_TYPES) break;
    const type = safeField(acc.accommodationType, "logisticsDigest.accommodationType", 30);
    if (type) accommodationTypes.add(type);
  }

  for (const mode of localMobility) {
    if (mobilitySet.size >= MAX_MOBILITY_TYPES) break;
    const m = safeField(mode, "logisticsDigest.mobility", 30);
    if (m) mobilitySet.add(m);
  }

  return {
    transportModes: Array.from(transportModes),
    accommodationTypes: Array.from(accommodationTypes),
    mobility: Array.from(mobilitySet),
    hasRentalCar,
    hasInternationalFlight,
  };
}
