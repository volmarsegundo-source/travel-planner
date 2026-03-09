/**
 * Prompt template types for versioned AI prompt management.
 *
 * Each template encapsulates a system prompt, user prompt builder,
 * model selection, and token budget — enabling version tracking,
 * A/B testing, and structured prompt engineering.
 *
 * @version 1.0.0
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-006, OPT-007)
 */

import type { ModelType } from "@/server/services/ai-provider.interface";
import type { ExpeditionContext, TravelStyle } from "@/types/ai.types";

// ─── Template Interface ────────────────────────────────────────────────────

/**
 * A versioned prompt template that pairs stable system instructions
 * with a dynamic user prompt builder. Templates are the single source
 * of truth for all AI prompt construction.
 *
 * @typeParam TParams - Shape of the dynamic parameters for the user prompt
 */
export interface PromptTemplate<TParams = Record<string, unknown>> {
  /** Semantic version of this template */
  version: string;
  /** Which model type to use */
  model: ModelType;
  /** Max tokens for the response (may be overridden for dynamic budgets) */
  maxTokens: number;
  /** Whether to use cache_control on system message */
  cacheControl: boolean;
  /** System prompt (stable instructions, cacheable) */
  system: string;
  /** User prompt builder (dynamic, per-request) */
  buildUserPrompt: (params: TParams) => string;
}

// ─── Parameter Types ───────────────────────────────────────────────────────

/** Parameters for the travel plan (itinerary) prompt */
export interface TravelPlanParams {
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  travelStyle: TravelStyle;
  budgetTotal: number;
  budgetCurrency: string;
  travelers: number;
  language: "pt-BR" | "en";
  tokenBudget: number;
  travelNotes?: string;
  expeditionContext?: ExpeditionContext;
}

/** Parameters for the pre-trip checklist prompt */
export interface ChecklistParams {
  destination: string;
  month: string;
  travelers: number;
  language: "pt-BR" | "en";
}

/** Parameters for the destination pocket guide prompt */
export interface GuideParams {
  destination: string;
  language: "pt-BR" | "en";
}
