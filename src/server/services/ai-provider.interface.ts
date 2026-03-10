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

export interface AiProviderOptions {
  /**
   * Optional system prompt with stable instructions (role, format, constraints).
   * Providers that support prompt caching should mark this with cache_control.
   */
  systemPrompt?: string;
}

export interface AiProvider {
  /** Provider identifier, e.g. "claude" or "gemini". */
  readonly name: string;

  /**
   * Sends a prompt and returns the raw text response.
   * The provider handles model selection, timeouts, and SDK-specific errors,
   * mapping them to AppError before re-throwing.
   *
   * @param prompt - User message with dynamic/variable content
   * @param maxTokens - Maximum tokens for the response
   * @param model - Model selection hint
   * @param options - Optional parameters including systemPrompt
   */
  generateResponse(
    prompt: string,
    maxTokens: number,
    model: ModelType,
    options?: AiProviderOptions,
  ): Promise<AiProviderResponse>;

  /**
   * Sends a prompt and returns a ReadableStream of text chunks.
   * Each chunk is a string fragment of the response.
   * Callers must consume the stream to completion.
   *
   * @param prompt - User message with dynamic/variable content
   * @param maxTokens - Maximum tokens for the response
   * @param model - Model selection hint
   * @param options - Optional parameters including systemPrompt
   * @returns A ReadableStream of string chunks and a promise resolving to token usage
   */
  generateStreamingResponse(
    prompt: string,
    maxTokens: number,
    model: ModelType,
    options?: AiProviderOptions,
  ): Promise<{
    stream: ReadableStream<string>;
    usage: Promise<AiProviderResponse>;
  }>;
}
