/**
 * Versioned prompt template for travel plan (itinerary) generation.
 *
 * Converts dynamic trip parameters into XML-tagged user prompts
 * for optimal Claude instruction adherence. System prompt is sourced
 * from system-prompts.ts to maintain a single source of truth.
 *
 * @version 1.1.0
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-006, OPT-007)
 * @see SPEC-AI-004 (traveler context enrichment)
 */

import { PLAN_SYSTEM_PROMPT } from "./system-prompts";
import type { PromptTemplate, TravelPlanParams } from "./types";

/**
 * Builds the legacy expedition context section for backward compatibility.
 * Used when no enriched traveler_context is available.
 */
function buildLegacyExpeditionSection(params: TravelPlanParams): string {
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

/**
 * Builds the enriched traveler context XML section per SPEC-AI-004.
 * Structures all user data from phases 1-5 into XML tags for
 * optimal AI instruction adherence and personalization.
 *
 * Adds ~600 tokens to the prompt (within SPEC-AI-004 token budget).
 */
export function buildTravelerContext(params: TravelPlanParams): string {
  const ctx = params.expeditionContext;
  if (!ctx) return "";

  // Check if enriched context is available (has personal/trip/preferences/logistics)
  const hasEnriched = ctx.personal || ctx.trip || ctx.preferences || ctx.logistics;
  if (!hasEnriched) {
    return buildLegacyExpeditionSection(params);
  }

  const sections: string[] = [];

  // Personal section
  if (ctx.personal) {
    const personalParts: string[] = [];
    if (ctx.personal.name) personalParts.push(`    <name>${ctx.personal.name}</name>`);
    if (ctx.personal.ageRange) personalParts.push(`    <age_range>${ctx.personal.ageRange}</age_range>`);
    if (ctx.personal.origin) personalParts.push(`    <origin>${ctx.personal.origin}</origin>`);
    if (personalParts.length > 0) {
      sections.push(`  <personal>\n${personalParts.join("\n")}\n  </personal>`);
    }
  }

  // Trip section
  if (ctx.trip) {
    const tripParts: string[] = [];
    if (ctx.trip.destination) tripParts.push(`    <destination>${ctx.trip.destination}</destination>`);
    if (ctx.trip.dates) tripParts.push(`    <dates>${ctx.trip.dates}</dates>`);
    if (ctx.trip.type) tripParts.push(`    <type>${ctx.trip.type}</type>`);
    if (ctx.trip.travelers) tripParts.push(`    <travelers>${ctx.trip.travelers}</travelers>`);
    if (tripParts.length > 0) {
      sections.push(`  <trip>\n${tripParts.join("\n")}\n  </trip>`);
    }
  }

  // Preferences section
  if (ctx.preferences) {
    const prefParts: string[] = [];
    if (ctx.preferences.pace) prefParts.push(`    <pace>${ctx.preferences.pace}</pace>`);
    if (ctx.preferences.budget) prefParts.push(`    <budget>${ctx.preferences.budget}</budget>`);
    if (ctx.preferences.food) prefParts.push(`    <food>${ctx.preferences.food}</food>`);
    if (ctx.preferences.interests) prefParts.push(`    <interests>${ctx.preferences.interests}</interests>`);
    if (ctx.preferences.accommodation) prefParts.push(`    <accommodation>${ctx.preferences.accommodation}</accommodation>`);
    if (prefParts.length > 0) {
      sections.push(`  <preferences>\n${prefParts.join("\n")}\n  </preferences>`);
    }
  }

  // Logistics section
  if (ctx.logistics) {
    const logParts: string[] = [];
    if (ctx.logistics.transport && ctx.logistics.transport.length > 0) {
      for (const t of ctx.logistics.transport) {
        logParts.push(`    <transport>${t}</transport>`);
      }
    }
    if (ctx.logistics.accommodation && ctx.logistics.accommodation.length > 0) {
      for (const a of ctx.logistics.accommodation) {
        logParts.push(`    <accommodation>${a}</accommodation>`);
      }
    }
    if (ctx.logistics.mobility && ctx.logistics.mobility.length > 0) {
      logParts.push(`    <mobility>${ctx.logistics.mobility.join(", ")}</mobility>`);
    }
    if (logParts.length > 0) {
      sections.push(`  <logistics>\n${logParts.join("\n")}\n  </logistics>`);
    }
  }

  // Also include legacy fields that may not be in the enriched context
  if (ctx.destinationGuideContext) {
    sections.push(`  <destination_insights>${ctx.destinationGuideContext}</destination_insights>`);
  }

  if (sections.length === 0) return "";

  return `\nTraveler context (use to personalize the itinerary):\n<traveler_context>\n${sections.join("\n")}\n</traveler_context>\n`;
}

/** Travel plan prompt template v1.1.0 */
export const travelPlanPrompt: PromptTemplate<TravelPlanParams> = {
  version: "1.1.0",
  model: "plan",
  maxTokens: 2048, // Dynamic — overridden by calculatePlanTokenBudget in ai.service.ts
  cacheControl: true,
  system: PLAN_SYSTEM_PROMPT,

  buildUserPrompt(params: TravelPlanParams): string {
    const notesSection = params.travelNotes
      ? `\nAdditional traveler notes: ${params.travelNotes}\n`
      : "";

    const contextSection = buildTravelerContext(params);

    return `Trip details:
- Destination: ${params.destination}
- Dates: ${params.startDate} to ${params.endDate} (${params.days} days)
- Travel style: ${params.travelStyle}
- Budget: ${params.budgetTotal} ${params.budgetCurrency}
- Travelers: ${params.travelers} person(s)
- Language: ${params.language}
- Token budget: ${params.tokenBudget} (fit entire JSON within this limit)
${notesSection}${contextSection}`;
  },
};
