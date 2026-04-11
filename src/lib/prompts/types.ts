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

/** Multi-city destination entry (Sprint 43 Wave 4) */
export interface TravelPlanDestination {
  /** City name as it should appear in day.city */
  city: string;
  /** Optional country label for disambiguation */
  country?: string;
  /** How many nights the traveler sleeps in this city */
  nights?: number;
  /** Ordered position in the trip (0-indexed) */
  order: number;
}

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
  /**
   * Sprint 43 Wave 4: when set with more than one entry, the prompt switches
   * to multi-city mode and instructs the AI to insert transit days and tag
   * every day with its city. For single-city trips this field may be omitted
   * (the prompt falls back to the legacy single-destination flow).
   */
  destinations?: TravelPlanDestination[];
}

/** Parameters for the pre-trip checklist prompt */
export interface ChecklistParams {
  destination: string;
  month: string;
  travelers: number;
  language: "pt-BR" | "en";
}

/** Sibling-city context for multi-city guides (Sprint 43 Wave 4). */
export interface GuideTripContext {
  /** Full ordered list of city names in the trip (including the target) */
  siblingCities: string[];
  /** Position of this guide's city in the sequence (0-indexed) */
  order: number;
  /** Total number of cities in the trip */
  totalCities: number;
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
  /**
   * Sprint 43 Wave 4: sibling-city awareness for multi-city trips. When the
   * trip has more than one destination, this tells the guide what other
   * cities the traveler is visiting so it can avoid duplicating attractions
   * and align budget/pace estimates across guides.
   */
  tripContext?: GuideTripContext;
}
