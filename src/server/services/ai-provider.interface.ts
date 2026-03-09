/**
 * AI Provider abstraction layer.
 *
 * Defines a provider-agnostic contract for AI text generation.
 * Implementations (Claude, Gemini, etc.) handle SDK-specific details
 * while AiService orchestrates prompts, caching, and validation.
 */

/**
 * Model selection hint passed to the provider.
 * - "plan": full itinerary generation (heavier model, e.g. Sonnet)
 * - "checklist": pre-trip checklist (lighter model, e.g. Haiku)
 * - "guide": destination pocket guide (lighter model, e.g. Haiku)
 */
export type ModelType = "plan" | "checklist" | "guide";

export interface AiProviderResponse {
  text: string;
  wasTruncated: boolean;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export interface AiProvider {
  /** Provider identifier, e.g. "claude" or "gemini". */
  readonly name: string;

  /**
   * Sends a prompt and returns the raw text response.
   * The provider handles model selection, timeouts, and SDK-specific errors,
   * mapping them to AppError before re-throwing.
   */
  generateResponse(
    prompt: string,
    maxTokens: number,
    model: ModelType,
  ): Promise<AiProviderResponse>;
}
