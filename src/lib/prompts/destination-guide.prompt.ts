/**
 * Versioned prompt template for destination guide generation (v2).
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
 * @version 2.0.0
 * @see docs/specs/sprint-40/PROMPT-GUIA-DESTINO-PERSONALIZADO.md (SPEC-AI-005)
 */

import { GUIDE_SYSTEM_PROMPT } from "./system-prompts";
import type { PromptTemplate, GuideParams } from "./types";

/** Destination guide prompt template v2.0.0 */
export const destinationGuidePrompt: PromptTemplate<GuideParams> = {
  version: "2.0.0",
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

    return lines.join("\n");
  },
};
