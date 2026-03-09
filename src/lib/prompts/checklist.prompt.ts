/**
 * Versioned prompt template for pre-trip checklist generation.
 *
 * Converts dynamic trip parameters into XML-tagged user prompts
 * for optimal Claude instruction adherence. System prompt is sourced
 * from system-prompts.ts to maintain a single source of truth.
 *
 * @version 1.0.0
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-006, OPT-007)
 */

import { CHECKLIST_SYSTEM_PROMPT } from "./system-prompts";
import type { PromptTemplate, ChecklistParams } from "./types";

/** Checklist prompt template v1.0.0 */
export const checklistPrompt: PromptTemplate<ChecklistParams> = {
  version: "1.0.0",
  model: "checklist",
  maxTokens: 2048,
  cacheControl: true,
  system: CHECKLIST_SYSTEM_PROMPT,

  buildUserPrompt(params: ChecklistParams): string {
    return `Trip: ${params.destination}, ${params.month}, ${params.travelers} traveler(s)
Language: ${params.language}`;
  },
};
