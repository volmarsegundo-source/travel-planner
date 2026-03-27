/**
 * Versioned prompt template for destination pocket guide generation.
 *
 * Converts dynamic trip parameters into XML-tagged user prompts
 * for optimal Claude instruction adherence. System prompt is sourced
 * from system-prompts.ts to maintain a single source of truth.
 *
 * @version 1.0.0
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-006, OPT-007)
 */

import { GUIDE_SYSTEM_PROMPT } from "./system-prompts";
import type { PromptTemplate, GuideParams } from "./types";

/** Destination guide prompt template v1.0.0 */
export const destinationGuidePrompt: PromptTemplate<GuideParams> = {
  version: "1.0.0",
  model: "guide",
  maxTokens: 4096,
  cacheControl: true,
  system: GUIDE_SYSTEM_PROMPT,

  buildUserPrompt(params: GuideParams): string {
    const lang = params.language === "pt-BR" ? "Brazilian Portuguese" : "English";

    const lines: string[] = [
      `Destination: ${params.destination}`,
      `Respond in: ${lang}`,
    ];

    // Append traveler context when available for personalized recommendations
    const ctx = params.travelerContext;
    if (ctx) {
      lines.push("", "Traveler context (use to personalize tips):");
      if (ctx.startDate && ctx.endDate) lines.push(`Travel dates: ${ctx.startDate} to ${ctx.endDate}`);
      if (ctx.travelers) lines.push(`Travelers: ${ctx.travelers}`);
      if (ctx.travelerType) lines.push(`Traveler type: ${ctx.travelerType}`);
      if (ctx.accommodationStyle) lines.push(`Accommodation style: ${ctx.accommodationStyle}`);
      if (ctx.travelPace) lines.push(`Travel pace: ${ctx.travelPace}/10`);
      if (ctx.budget && ctx.budgetCurrency) lines.push(`Budget: ${ctx.budget} ${ctx.budgetCurrency}`);
      if (ctx.dietaryRestrictions) lines.push(`Dietary restrictions: ${ctx.dietaryRestrictions}`);
      if (ctx.interests && ctx.interests.length > 0) lines.push(`Interests: ${ctx.interests.join(", ")}`);
      if (ctx.fitnessLevel) lines.push(`Fitness level: ${ctx.fitnessLevel}`);
      if (ctx.transportTypes && ctx.transportTypes.length > 0) lines.push(`Transport: ${ctx.transportTypes.join(", ")}`);
      if (ctx.tripType) lines.push(`Trip type: ${ctx.tripType}`);
    }

    return lines.join("\n");
  },
};
