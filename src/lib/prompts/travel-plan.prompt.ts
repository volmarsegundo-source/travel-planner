/**
 * Versioned prompt template for travel plan (itinerary) generation.
 *
 * Converts dynamic trip parameters into XML-tagged user prompts
 * for optimal Claude instruction adherence. System prompt is sourced
 * from system-prompts.ts to maintain a single source of truth.
 *
 * @version 1.0.0
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-006, OPT-007)
 */

import { PLAN_SYSTEM_PROMPT } from "./system-prompts";
import type { PromptTemplate, TravelPlanParams } from "./types";

/**
 * Builds the expedition context XML section from prior expedition phases.
 * Returns an empty string if no context is provided or all fields are empty.
 */
function buildExpeditionSection(params: TravelPlanParams): string {
  const ctx = params.expeditionContext;
  if (!ctx) return "";

  const parts: string[] = [];

  if (ctx.tripType) {
    parts.push(`  <trip-type>Trip type: ${ctx.tripType}</trip-type>`);
  }
  if (ctx.travelerType) {
    parts.push(`  <traveler-type>Traveler type: ${ctx.travelerType}</traveler-type>`);
  }
  if (ctx.accommodationStyle) {
    parts.push(`  <accommodation>Accommodation preference: ${ctx.accommodationStyle}</accommodation>`);
  }
  if (ctx.travelPace) {
    parts.push(`  <pace>Travel pace: ${ctx.travelPace}/10</pace>`);
  }
  if (ctx.budget) {
    const currency = ctx.currency ?? params.budgetCurrency;
    parts.push(`  <budget-preference>Traveler budget preference: ${ctx.budget} ${currency}</budget-preference>`);
  }
  if (ctx.destinationGuideContext) {
    parts.push(`  <destination-insights>Destination insights: ${ctx.destinationGuideContext}</destination-insights>`);
  }

  if (parts.length === 0) return "";

  return `\nExpedition context (use to personalize the itinerary):\n<expedition-context>\n${parts.join("\n")}\n</expedition-context>\n`;
}

/** Travel plan prompt template v1.0.0 */
export const travelPlanPrompt: PromptTemplate<TravelPlanParams> = {
  version: "1.0.0",
  model: "plan",
  maxTokens: 2048, // Dynamic — overridden by calculatePlanTokenBudget in ai.service.ts
  cacheControl: true,
  system: PLAN_SYSTEM_PROMPT,

  buildUserPrompt(params: TravelPlanParams): string {
    const notesSection = params.travelNotes
      ? `\nAdditional traveler notes: ${params.travelNotes}\n`
      : "";

    const expeditionSection = buildExpeditionSection(params);

    return `Trip details:
- Destination: ${params.destination}
- Dates: ${params.startDate} to ${params.endDate} (${params.days} days)
- Travel style: ${params.travelStyle}
- Budget: ${params.budgetTotal} ${params.budgetCurrency}
- Travelers: ${params.travelers} person(s)
- Language: ${params.language}
- Token budget: ${params.tokenBudget} (fit entire JSON within this limit)
${notesSection}${expeditionSection}`;
  },
};
