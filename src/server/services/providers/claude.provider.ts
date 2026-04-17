import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AiProvider, AiProviderOptions, AiProviderResponse, ModelType } from "../ai-provider.interface";

// ─── Constants ────────────────────────────────────────────────────────────────

/** All task types use Haiku — 4-5x faster output than Sonnet. Plan was on
 *  Sonnet until sprint-44; mid-flight recovery couldn't finish 4500 tokens
 *  in the 20s timeout because Sonnet outputs at ~75 tok/s. Haiku hits ~350
 *  tok/s so the same budget fits comfortably. */
const PLAN_MODEL = "claude-haiku-4-5-20251001";
const CHECKLIST_MODEL = "claude-haiku-4-5-20251001";
const GUIDE_MODEL = "claude-haiku-4-5-20251001";
// Vercel Hobby serverless routes have a hard 60s limit; keep provider timeout
// comfortably below that to leave headroom for mid-stream recovery + persistence.
// Plan gets 25s (longer output budget after a failed Gemini stream); guide
// and checklist stay at 20s. See: docs/architecture.md ADR-028.
function getClaudeTimeoutMs(model: ModelType): number {
  return model === "plan" ? 25_000 : 20_000;
}

// ─── Anthropic singleton (lazy) ───────────────────────────────────────────────

function getAnthropic(): Anthropic {
  const g = globalThis as unknown as { _anthropic?: Anthropic };
  if (!g._anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Guard against missing or empty API key (T-S17-009)
    if (!apiKey || apiKey.trim() === "") {
      throw new AppError(
        "AI_CONFIG_ERROR",
        "errors.aiConfigError",
        500
      );
    }

    g._anthropic = new Anthropic({ apiKey });
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
        { signal: AbortSignal.timeout(getClaudeTimeoutMs(model)) },
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

  async generateStreamingResponse(
    prompt: string,
    maxTokens: number,
    model: ModelType,
    options?: AiProviderOptions,
  ): Promise<{
    stream: ReadableStream<string>;
    usage: Promise<AiProviderResponse>;
  }> {
    const modelId = this.resolveModel(model);

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

    try {
      const sdkStream = getAnthropic().messages.stream(
        createParams as unknown as Anthropic.MessageCreateParamsStreaming,
        { signal: AbortSignal.timeout(getClaudeTimeoutMs(model)) },
      );

      // Accumulate chunks as they arrive; resolved when stream ends.
      const chunks: string[] = [];
      let streamDone: () => void;
      const streamComplete = new Promise<void>((resolve) => {
        streamDone = resolve;
      });

      const readableStream = new ReadableStream<string>({
        async start(controller) {
          try {
            for await (const event of sdkStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                chunks.push(event.delta.text);
                controller.enqueue(event.delta.text);
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            streamDone!();
          }
        },
      });

      const usagePromise = (async (): Promise<AiProviderResponse> => {
        try {
          // Wait for the stream iteration to finish before reading finalMessage
          await streamComplete;
          const finalMessage = await sdkStream.finalMessage();
          const usage = finalMessage.usage as unknown as Record<string, number | undefined>;
          return {
            text: chunks.join(""),
            wasTruncated: finalMessage.stop_reason === "max_tokens",
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cacheReadInputTokens: usage.cache_read_input_tokens,
            cacheCreationInputTokens: usage.cache_creation_input_tokens,
          };
        } catch (error) {
          return this.mapStreamError(error);
        }
      })();

      return { stream: readableStream, usage: usagePromise };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw this.mapStreamErrorSync(error);
    }
  }

  /** Maps SDK errors to AppError (sync version for initial stream creation). */
  private mapStreamErrorSync(error: unknown): AppError {
    logger.error("ai.provider.claude.stream.error", error);

    if (error instanceof Anthropic.AuthenticationError) {
      return new AppError("AI_AUTH_ERROR", "errors.aiAuthError", 401);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429);
    }
    return new AppError("AI_TIMEOUT", "errors.timeout", 504);
  }

  /** Maps SDK errors to a rejected AiProviderResponse (for usage promise). */
  private mapStreamError(error: unknown): never {
    throw this.mapStreamErrorSync(error);
  }

  /**
   * Maps a ModelType hint to the concrete Anthropic model ID.
   * - "plan" -> Haiku 4.5 (cost-optimized; latency-sensitive path)
   * - "checklist" -> Haiku 4.5 (simple structured extraction)
   * - "guide" -> Haiku 4.5 (factual structured output, cost-optimized)
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
