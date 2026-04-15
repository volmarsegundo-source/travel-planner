/**
 * Versioned prompt templates for pre-trip checklist generation.
 *
 * Phase 6 of 6 — final AI phase of the expedition chain (Sprint 44 reorder).
 *
 * This module exports TWO templates:
 *
 * `checklistPromptV1` (v1.0.0) — legacy template. Minimal input (destination +
 *   month + travelers). Kept for backward compatibility with existing trips that
 *   have not migrated to the new prompt chain. Used when PHASE_REORDER_ENABLED
 *   is OFF or when upstream phase data is absent.
 *
 * `checklistPrompt` (v2.0.0) — redesigned template. Accepts enriched context
 *   from Guide, Itinerary, and Logistics digests. Produces HIGHLY SPECIFIC items
 *   with `reason` and `sourcePhase` fields per item, up to 8 categories, max 25
 *   items total. Used when PHASE_REORDER_ENABLED is ON.
 *
 * @version 2.0.0
 * @see SPEC-AI-REORDER-PHASES §5 (full redesign spec)
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-006, OPT-007)
 *
 * v2.0.0 — Sprint 44 Wave 2: full redesign for enriched context chain.
 *   Breaking change: new params shape (ChecklistV2Params), new output schema
 *   (reason + sourcePhase per item, summary block, 8 categories).
 *   Old `checklistPrompt` export renamed to `checklistPromptV1`; new default
 *   export is v2.0.0.
 * v1.0.0 — initial implementation.
 */

import { CHECKLIST_SYSTEM_PROMPT_V1, CHECKLIST_SYSTEM_PROMPT } from "./system-prompts";
import type { PromptTemplate, ChecklistParams, ChecklistV2Params } from "./types";

// ─── v1 (legacy) ─────────────────────────────────────────────────────────────

/** Checklist prompt template v1.0.0 (legacy — kept for backward compat) */
export const checklistPromptV1: PromptTemplate<ChecklistParams> = {
  version: "1.0.0",
  model: "checklist",
  maxTokens: 2048,
  cacheControl: true,
  system: CHECKLIST_SYSTEM_PROMPT_V1,

  buildUserPrompt(params: ChecklistParams): string {
    return `Trip: ${params.destination}, ${params.month}, ${params.travelers} traveler(s)
Language: ${params.language}`;
  },
};

// ─── v2.0.0 ──────────────────────────────────────────────────────────────────

/**
 * Builds the enriched XML user prompt for the v2.0.0 checklist template.
 *
 * Emits blocks only for data that is present — all sections are optional.
 * This allows graceful degradation when upstream phases have not been completed.
 */
function buildChecklistV2UserPrompt(params: ChecklistV2Params): string {
  const lang = params.language === "pt-BR" ? "pt-BR" : "en";
  const lines: string[] = [];

  // ── Trip basics ──────────────────────────────────────────────────────────
  lines.push("<trip_basics>");
  lines.push(`  <destination>${params.destination}</destination>`);
  lines.push(`  <trip_type>${params.tripType}</trip_type>`);
  lines.push(`  <dates>${params.dates}</dates>`);
  lines.push(`  <travelers>${params.travelers}</travelers>`);
  lines.push(`  <language>${lang}</language>`);
  lines.push("</trip_basics>");

  // ── Destination facts from Guide (Phase 3) ───────────────────────────────
  const guide = params.destinationFactsFromGuide;
  if (guide && Object.values(guide).some(Boolean)) {
    lines.push("");
    lines.push("<destination_facts_from_guide>");
    if (guide.climate) lines.push(`  <climate>${guide.climate}</climate>`);
    if (guide.plugType) lines.push(`  <plug_type>${guide.plugType}</plug_type>`);
    if (guide.currencyLocal) lines.push(`  <currency_local>${guide.currencyLocal}</currency_local>`);
    if (guide.safetyLevel) lines.push(`  <safety_level>${guide.safetyLevel}</safety_level>`);
    if (guide.vaccines) lines.push(`  <vaccines>${guide.vaccines}</vaccines>`);
    lines.push("</destination_facts_from_guide>");
  }

  // ── Itinerary highlights from Roteiro (Phase 4) ───────────────────────────
  const itin = params.itineraryHighlightsFromRoteiro;
  if (itin && Object.values(itin).some((v) => v !== undefined && v !== null)) {
    lines.push("");
    lines.push("<itinerary_highlights_from_roteiro>");
    if (itin.totalDays !== undefined) lines.push(`  <total_days>${itin.totalDays}</total_days>`);
    if (itin.activityTypes && itin.activityTypes.length > 0) {
      lines.push(`  <activity_types>${itin.activityTypes.join(", ")}</activity_types>`);
    }
    if (itin.hasBeachDay !== undefined) lines.push(`  <has_beach_day>${itin.hasBeachDay}</has_beach_day>`);
    if (itin.hasHikeDay !== undefined) lines.push(`  <has_hike_day>${itin.hasHikeDay}</has_hike_day>`);
    if (itin.hasNightlifeEvening !== undefined) lines.push(`  <has_nightlife_evening>${itin.hasNightlifeEvening}</has_nightlife_evening>`);
    if (itin.hasReligiousSite !== undefined) lines.push(`  <has_religious_site>${itin.hasReligiousSite}</has_religious_site>`);
    if (itin.hasMuseumDay !== undefined) lines.push(`  <has_museum_day>${itin.hasMuseumDay}</has_museum_day>`);
    if (itin.intensity) lines.push(`  <intensity>${itin.intensity}</intensity>`);
    lines.push("</itinerary_highlights_from_roteiro>");
  }

  // ── Logistics from Phase 5 ────────────────────────────────────────────────
  const log = params.logisticsFromPhase5;
  if (log && Object.values(log).some((v) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true))) {
    lines.push("");
    lines.push("<logistics_from_phase5>");
    if (log.transportModes && log.transportModes.length > 0) {
      lines.push(`  <transport_modes>${log.transportModes.join(", ")}</transport_modes>`);
    }
    if (log.accommodationTypes && log.accommodationTypes.length > 0) {
      lines.push(`  <accommodation_types>${log.accommodationTypes.join(", ")}</accommodation_types>`);
    }
    if (log.mobility && log.mobility.length > 0) {
      lines.push(`  <mobility>${log.mobility.join(", ")}</mobility>`);
    }
    if (log.hasRentalCar !== undefined) lines.push(`  <has_rental_car>${log.hasRentalCar}</has_rental_car>`);
    if (log.hasInternationalFlight !== undefined) lines.push(`  <has_international_flight>${log.hasInternationalFlight}</has_international_flight>`);
    lines.push("</logistics_from_phase5>");
  }

  // ── User preferences ──────────────────────────────────────────────────────
  const prefs = params.userPrefs;
  if (prefs) {
    lines.push("");
    lines.push("<user_prefs>");
    lines.push(`  <dietary>${prefs.dietary ?? "none"}</dietary>`);
    lines.push(`  <allergies>${prefs.allergies ?? "none"}</allergies>`);
    lines.push(`  <regular_medication>${prefs.regularMedication ?? false}</regular_medication>`);
    lines.push("</user_prefs>");
  }

  return lines.join("\n");
}

/** Checklist prompt template v2.0.0 (Sprint 44 — enriched context chain) */
export const checklistPrompt: PromptTemplate<ChecklistV2Params> = {
  version: "2.0.0",
  model: "checklist",
  maxTokens: 2048,
  cacheControl: true,
  system: CHECKLIST_SYSTEM_PROMPT,

  buildUserPrompt: buildChecklistV2UserPrompt,
};
