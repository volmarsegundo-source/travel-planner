/**
 * AI Provider abstraction layer.
 *
 * Defines a provider-agnostic contract for AI text generation.
 * Implementations (Claude, Gemini, etc.) handle SDK-specific details
 * while AiService orchestrates prompts, caching, and validation.
 */

export interface AiProviderResponse {
  text: string;
  wasTruncated: boolean;
  inputTokens?: number;
  outputTokens?: number;
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
    model: "plan" | "checklist",
  ): Promise<AiProviderResponse>;
}
