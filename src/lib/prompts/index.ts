/**
 * Barrel export for versioned prompt templates.
 *
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-006, OPT-007)
 *
 * Sprint 44 Wave 2 notes:
 * - `checklistPrompt` is now v2.0.0 (ChecklistV2Params — enriched context)
 * - `checklistPromptV1` is the legacy v1.0.0 template (ChecklistParams — simple)
 * - Use `checklistPromptV1` when PHASE_REORDER_ENABLED is OFF or upstream data
 *   is absent; use `checklistPrompt` (v2) when flag is ON.
 * - `CHECKLIST_SYSTEM_PROMPT_V1` is the archived v1 system prompt.
 */

// Types
export type {
  PromptTemplate,
  TravelPlanParams,
  ChecklistParams,
  ChecklistV2Params,
  GuideParams,
} from "./types";

// System prompts (re-exported for backward compatibility)
export {
  PLAN_SYSTEM_PROMPT,
  CHECKLIST_SYSTEM_PROMPT,
  CHECKLIST_SYSTEM_PROMPT_V1,
  GUIDE_SYSTEM_PROMPT,
  GUIDE_SYSTEM_PROMPT_V1,
} from "./system-prompts";

// Versioned templates
export { travelPlanPrompt } from "./travel-plan.prompt";
export { checklistPrompt, checklistPromptV1 } from "./checklist.prompt";
export { destinationGuidePrompt } from "./destination-guide.prompt";
