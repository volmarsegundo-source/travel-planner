import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AiProvider, AiProviderResponse } from "../ai-provider.interface";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_MODEL = "claude-sonnet-4-6";
const CHECKLIST_MODEL = "claude-haiku-4-5-20251001";
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
    model: "plan" | "checklist",
  ): Promise<AiProviderResponse> {
    const modelId = model === "plan" ? PLAN_MODEL : CHECKLIST_MODEL;

    try {
      const message = await getAnthropic().messages.create(
        {
          model: modelId,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        },
        { signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS) },
      );

      const content = message.content[0];
      if (!content || content.type !== "text") {
        throw new Error("Unexpected Claude response structure");
      }

      return {
        text: content.text,
        wasTruncated: message.stop_reason === "max_tokens",
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
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
}
