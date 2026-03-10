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

    return `Destination: ${params.destination}
Respond in: ${lang}`;
  },
};
