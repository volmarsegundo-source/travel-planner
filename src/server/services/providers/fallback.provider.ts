import "server-only";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AiProvider, AiProviderOptions, AiProviderResponse, ModelType } from "../ai-provider.interface";

// ─── Fallback-eligible error codes ──────────────────────────────────────────

/** Only infrastructure errors trigger fallback. Auth/model/parse errors do not. */
const FALLBACK_ELIGIBLE_CODES = new Set(["AI_RATE_LIMIT", "AI_TIMEOUT"]);

// ─── FallbackProvider ───────────────────────────────────────────────────────

/**
 * Wraps a primary AiProvider with a fallback provider.
 * On infrastructure errors (429 rate limit, 504 timeout) from the primary,
 * retries the same call against the fallback provider exactly once.
 *
 * Auth errors (401), model errors (404), and parse errors (502) are NOT
 * retried — they indicate configuration issues, not transient failures.
 */
export class FallbackProvider implements AiProvider {
  readonly name: string;

  constructor(
    private readonly primary: AiProvider,
    private readonly fallback: AiProvider,
  ) {
    this.name = `${primary.name}+${fallback.name}`;
  }

  async generateResponse(
    prompt: string,
    maxTokens: number,
    model: ModelType,
    options?: AiProviderOptions,
  ): Promise<AiProviderResponse> {
    try {
      return await this.primary.generateResponse(prompt, maxTokens, model, options);
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;

      logger.warn("ai.fallback.activated", {
        primary: this.primary.name,
        fallback: this.fallback.name,
        reason: error instanceof AppError ? error.code : "unknown",
        method: "generateResponse",
      });

      return this.fallback.generateResponse(prompt, maxTokens, model, options);
    }
  }

  async generateStreamingResponse(
    prompt: string,
    maxTokens: number,
    model: ModelType,
    options?: AiProviderOptions,
  ): Promise<{
    stream: ReadableStream<string>;
    usage: Promise<AiProviderResponse>;
  }> {
    try {
      return await this.primary.generateStreamingResponse(prompt, maxTokens, model, options);
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;

      logger.warn("ai.fallback.activated", {
        primary: this.primary.name,
        fallback: this.fallback.name,
        reason: error instanceof AppError ? error.code : "unknown",
        method: "generateStreamingResponse",
      });

      return this.fallback.generateStreamingResponse(prompt, maxTokens, model, options);
    }
  }

  /**
   * Determines if a fallback attempt should be made.
   * Only infrastructure errors (rate limit, timeout) are eligible.
   */
  private shouldFallback(error: unknown): boolean {
    if (error instanceof AppError) {
      return FALLBACK_ELIGIBLE_CODES.has(error.code);
    }
    // Non-AppError exceptions (network failures, etc.) are fallback-eligible
    return true;
  }
}
