import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AiProvider, AiProviderOptions, AiProviderResponse, ModelType } from "../ai-provider.interface";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_MODEL = "claude-sonnet-4-6";
const CHECKLIST_MODEL = "claude-haiku-4-5-20251001";
/** Guide uses Haiku — intentional cost optimization. Factual structured output does not require Sonnet. */
const GUIDE_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_TIMEOUT_MS = 90_000;

// ─── Anthropic singleton (lazy) ───────────────────────────────────────────────

function getAnthropic(): Anthropic {
  const g = globalThis as unknown as { _anthropic?: Anthropic };
  if (!g._anthropic) {
    g._anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    });
  }
  return g._anthropic;
}

// ─── ClaudeProvider ───────────────────────────────────────────────────────────

export class ClaudeProvider implements AiProvider {
  readonly name = "claude";

  async generateResponse(
    prompt: string,
    maxTokens: number,
    model: ModelType,
    options?: AiProviderOptions,
  ): Promise<AiProviderResponse> {
    const modelId = this.resolveModel(model);

    try {
      // Build system parameter with cache_control for Anthropic prompt caching
      const system = options?.systemPrompt
        ? [
            {
              type: "text" as const,
              text: options.systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : undefined;

      const createParams: Record<string, unknown> = {
        model: modelId,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      };

      if (system) {
        createParams.system = system;
      }

      const message = await getAnthropic().messages.create(
        createParams as unknown as Anthropic.MessageCreateParamsNonStreaming,
        { signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS) },
      );

      const content = message.content[0];
      if (!content || content.type !== "text") {
        throw new Error("Unexpected Claude response structure");
      }

      const usage = message.usage as unknown as Record<string, number | undefined>;
      return {
        text: content.text,
        wasTruncated: message.stop_reason === "max_tokens",
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadInputTokens: usage.cache_read_input_tokens,
        cacheCreationInputTokens: usage.cache_creation_input_tokens,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error("ai.provider.claude.error", error);

      if (error instanceof Anthropic.AuthenticationError) {
        throw new AppError("AI_AUTH_ERROR", "errors.aiAuthError", 401);
      }
      if (error instanceof Anthropic.NotFoundError) {
        throw new AppError("AI_MODEL_ERROR", "errors.aiModelError", 404);
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429);
      }
      throw new AppError("AI_TIMEOUT", "errors.timeout", 504);
    }
  }

  /**
   * Maps a ModelType hint to the concrete Anthropic model ID.
   * - "plan" -> Sonnet (complex reasoning for itineraries)
   * - "checklist" -> Haiku (simple structured extraction)
   * - "guide" -> Haiku (factual structured output, cost-optimized)
   */
  private resolveModel(model: ModelType): string {
    switch (model) {
      case "plan":
        return PLAN_MODEL;
      case "checklist":
        return CHECKLIST_MODEL;
      case "guide":
        return GUIDE_MODEL;
    }
  }
}
