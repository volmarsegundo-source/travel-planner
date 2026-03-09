/**
 * Barrel export for versioned prompt templates.
 *
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-006, OPT-007)
 */

// Types
export type {
  PromptTemplate,
  TravelPlanParams,
  ChecklistParams,
  GuideParams,
} from "./types";

// System prompts (re-exported for backward compatibility)
export {
  PLAN_SYSTEM_PROMPT,
  CHECKLIST_SYSTEM_PROMPT,
  GUIDE_SYSTEM_PROMPT,
} from "./system-prompts";

// Versioned templates
export { travelPlanPrompt } from "./travel-plan.prompt";
export { checklistPrompt } from "./checklist.prompt";
export { destinationGuidePrompt } from "./destination-guide.prompt";
