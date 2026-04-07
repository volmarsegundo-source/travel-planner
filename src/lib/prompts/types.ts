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
  /** Extra interest categories selected for itinerary personalization */
  extraCategories?: string[];
  /** Free-text personal notes for itinerary personalization */
  personalNotes?: string;
}

/** Parameters for the pre-trip checklist prompt */
export interface ChecklistParams {
  destination: string;
  month: string;
  travelers: number;
  language: "pt-BR" | "en";
}

/** Traveler context from Phases 1-4 for richer guide personalization */
export interface GuideTravelerContext {
  /** Trip dates (Phase 1) */
  startDate?: string;
  endDate?: string;
  /** Number of travelers (Phase 1/2) */
  travelers?: number;
  /** Traveler type: solo, couple, family, group (Phase 2) */
  travelerType?: string;
  /** Accommodation style preference (Phase 2) */
  accommodationStyle?: string;
  /** Travel pace 1-10 (Phase 2) */
  travelPace?: number;
  /** Budget amount (Phase 2) */
  budget?: number;
  /** Budget currency (Phase 2) */
  budgetCurrency?: string;
  /** Dietary restrictions (Phase 2 / profile) */
  dietaryRestrictions?: string;
  /** User interests from preferences (Phase 3) */
  interests?: string[];
  /** Fitness level from preferences */
  fitnessLevel?: string;
  /** Transport types booked (Phase 4) */
  transportTypes?: string[];
  /** Trip type: domestic, international, etc. */
  tripType?: string;
}

/** Parameters for the destination pocket guide prompt */
export interface GuideParams {
  destination: string;
  language: "pt-BR" | "en";
  /** Optional traveler context for personalized guide */
  travelerContext?: GuideTravelerContext;
  /** Extra interest categories selected for this trip (SPEC-GUIA-PERSONALIZACAO) */
  extraCategories?: string[];
  /** Free-text personal notes for guide personalization (SPEC-GUIA-PERSONALIZACAO) */
  personalNotes?: string;
}
