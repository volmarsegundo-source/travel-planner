/**
 * Versioned prompt template for destination guide generation (v2).
 *
 * Phase 3 of 6 — first AI phase of the expedition chain (Sprint 44 reorder).
 *
 * IMPORTANT (Sprint 44): the output of this prompt feeds the Itinerary (Phase 4)
 * and Checklist (Phase 6) prompts via `buildGuideDigest` in
 * `src/lib/prompts/digest.ts`. Any breaking change to the JSON schema of the
 * guide output (quickFacts, safety, mustSee fields) MUST be accompanied by a
 * synchronized update to `buildGuideDigest`.
 *
 * Converts dynamic trip parameters into XML-tagged user prompts
 * for optimal Claude instruction adherence. System prompt is sourced
 * from system-prompts.ts to maintain a single source of truth.
 *
 * v2 changes:
 * - Structured JSON output (destination, quickFacts, safety, dailyCosts, mustSee,
 *   documentation, localTransport, culturalTips)
 * - XML-tagged user prompt for better context parsing
 * - maxTokens set to 4096 for reliable schema completion
 *
 * @version 2.1.1
 * @see docs/specs/sprint-40/PROMPT-GUIA-DESTINO-PERSONALIZADO.md (SPEC-AI-005)
 * @see SPEC-AI-REORDER-PHASES §3.2 (patch bump notes)
 *
 * v2.1.1 — Sprint 44 Wave 2: docblock updated to reflect new position (Phase 3 of 6).
 *   Added note that guide output feeds downstream prompts via buildGuideDigest.
 *   No functional change to buildUserPrompt or GUIDE_SYSTEM_PROMPT.
 * v2.1.0 — Sprint 43 QA critical fix: emergency-number rule now enforces
 *   correct country codes (Brazil 190/192/193, US/CA 911, EU 112) instead
 *   of the buggy "911 for Americas" fallback that emitted wrong numbers
 *   for Brazilian destinations.
 */

import { GUIDE_SYSTEM_PROMPT } from "./system-prompts";
import type { PromptTemplate, GuideParams } from "./types";

/** Destination guide prompt template v2.1.1 */
export const destinationGuidePrompt: PromptTemplate<GuideParams> = {
  version: "2.1.1",
  model: "guide",
  maxTokens: 4096,
  cacheControl: true,
  system: GUIDE_SYSTEM_PROMPT,

  buildUserPrompt(params: GuideParams): string {
    const lang = params.language === "pt-BR" ? "Brazilian Portuguese" : "English";
    const lines: string[] = [];

    lines.push(`<destination>${params.destination}</destination>`);
    lines.push(`<language>${lang}</language>`);

    const ctx = params.travelerContext;
    if (ctx) {
      lines.push("");
      lines.push("<traveler_context>");

      if (ctx.startDate && ctx.endDate) {
        lines.push(`  <dates>${ctx.startDate} to ${ctx.endDate}</dates>`);
      }
      if (ctx.travelers) {
        lines.push(`  <group_size>${ctx.travelers}</group_size>`);
      }
      if (ctx.travelerType) {
        lines.push(`  <traveler_type>${ctx.travelerType}</traveler_type>`);
      }
      if (ctx.travelPace) {
        lines.push(`  <pace>${ctx.travelPace}</pace>`);
      }
      if (ctx.budget && ctx.budgetCurrency) {
        lines.push(`  <budget amount="${ctx.budget}" currency="${ctx.budgetCurrency}" />`);
      }
      if (ctx.accommodationStyle) {
        lines.push(`  <accommodation_style>${ctx.accommodationStyle}</accommodation_style>`);
      }
      if (ctx.dietaryRestrictions) {
        lines.push(`  <dietary>${ctx.dietaryRestrictions}</dietary>`);
      }
      if (ctx.interests && ctx.interests.length > 0) {
        lines.push(`  <interests>${ctx.interests.join(", ")}</interests>`);
      }
      if (ctx.fitnessLevel) {
        lines.push(`  <fitness>${ctx.fitnessLevel}</fitness>`);
      }
      if (ctx.transportTypes && ctx.transportTypes.length > 0) {
        lines.push(`  <booked_transport>${ctx.transportTypes.join(", ")}</booked_transport>`);
      }
      if (ctx.tripType) {
        lines.push(`  <trip_type>${ctx.tripType}</trip_type>`);
      }

      lines.push("</traveler_context>");
    }

    if (params.extraCategories && params.extraCategories.length > 0) {
      lines.push("");
      lines.push("<extra_categories>");
      lines.push(`  The traveler has special interest in: ${params.extraCategories.join(", ")}`);
      lines.push("  Prioritize detailed information about these categories in the guide.");
      lines.push("</extra_categories>");
    }

    if (params.personalNotes) {
      lines.push("");
      lines.push("<personal_notes>");
      lines.push(`  ${params.personalNotes}`);
      lines.push("</personal_notes>");
    }

    // Sprint 43 Wave 4: sibling-city awareness for multi-city trips.
    // Emitted only when tripContext has more than one city — single-city
    // trips see no change in prompt shape.
    if (
      params.tripContext &&
      params.tripContext.totalCities > 1 &&
      params.tripContext.siblingCities.length > 0
    ) {
      const others = params.tripContext.siblingCities.filter(
        (c, i) => i !== params.tripContext!.order,
      );
      lines.push("");
      lines.push("<trip_context>");
      lines.push(
        `  This guide covers ${params.destination} — city ${params.tripContext.order + 1} of ${params.tripContext.totalCities} in a multi-city trip.`,
      );
      if (others.length > 0) {
        lines.push(`  Other cities in the same trip: ${others.join(", ")}.`);
      }
      lines.push(
        "  Do NOT duplicate attractions that clearly belong to other cities on the list.",
      );
      lines.push(
        "  Keep budget estimates consistent with sibling guides (same currency, similar magnitude).",
      );
      lines.push("</trip_context>");
    }

    return lines.join("\n");
  },
};
