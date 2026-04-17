import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AiProvider, AiProviderOptions, AiProviderResponse, ModelType } from "../ai-provider.interface";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Gemini 2.0 Flash — fast, cost-effective model for all task types. */
const PLAN_MODEL = "gemini-2.0-flash";
const CHECKLIST_MODEL = "gemini-2.0-flash";
const GUIDE_MODEL = "gemini-2.0-flash";
// Vercel Hobby serverless routes have a hard 60s limit. With the previous
// 50s budget, Gemini mid-stream failures left only ~10s for the Anthropic
// Gemini 15s + Claude 20s + 25s buffer = 60s (Vercel hard limit).
const GEMINI_TIMEOUT_MS = 15_000;

// ─── Google AI singleton (lazy) ──────────────────────────────────────────────

function getGemini(): GoogleGenerativeAI {
  const g = globalThis as unknown as { _gemini?: GoogleGenerativeAI };
  if (!g._gemini) {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      throw new AppError(
        "AI_CONFIG_ERROR",
        "errors.aiConfigError",
        500,
      );
    }

    g._gemini = new GoogleGenerativeAI(apiKey);
  }
  return g._gemini;
}

// ─── GeminiProvider ──────────────────────────────────────────────────────────

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  async generateResponse(
    prompt: string,
    maxTokens: number,
    model: ModelType,
    options?: AiProviderOptions,
  ): Promise<AiProviderResponse> {
    const modelId = this.resolveModel(model);

    try {
      const genModel = getGemini().getGenerativeModel({
        model: modelId,
        generationConfig: { maxOutputTokens: maxTokens },
        ...(options?.systemPrompt
          ? { systemInstruction: options.systemPrompt }
          : {}),
      });

      const result = await genModel.generateContent(
        { contents: [{ role: "user", parts: [{ text: prompt }] }] },
        { signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS) } as RequestOptions,
      );

      const response = result.response;
      const text = response.text();
      const usage = response.usageMetadata;
      const finishReason = response.candidates?.[0]?.finishReason;

      return {
        text,
        wasTruncated: finishReason === "MAX_TOKENS",
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        // Gemini does not have cache token equivalents
        cacheReadInputTokens: undefined,
        cacheCreationInputTokens: undefined,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw this.mapError(error);
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

    try {
      const genModel = getGemini().getGenerativeModel({
        model: modelId,
        generationConfig: { maxOutputTokens: maxTokens },
        ...(options?.systemPrompt
          ? { systemInstruction: options.systemPrompt }
          : {}),
      });

      const streamResult = await genModel.generateContentStream(
        { contents: [{ role: "user", parts: [{ text: prompt }] }] },
        { signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS) } as RequestOptions,
      );

      const chunks: string[] = [];
      let streamDone: () => void;
      const streamComplete = new Promise<void>((resolve) => {
        streamDone = resolve;
      });

      const mapErr = this.mapError.bind(this);
      const readableStream = new ReadableStream<string>({
        async start(controller) {
          try {
            for await (const chunk of streamResult.stream) {
              const text = chunk.text();
              chunks.push(text);
              controller.enqueue(text);
            }
            controller.close();
          } catch (error) {
            controller.error(error instanceof AppError ? error : mapErr(error));
          } finally {
            streamDone!();
          }
        },
      });

      const usagePromise = (async (): Promise<AiProviderResponse> => {
        await streamComplete;
        const response = await streamResult.response;
        const usage = response.usageMetadata;
        const finishReason = response.candidates?.[0]?.finishReason;

        return {
          text: chunks.join(""),
          wasTruncated: finishReason === "MAX_TOKENS",
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
          cacheReadInputTokens: undefined,
          cacheCreationInputTokens: undefined,
        };
      })();

      return { stream: readableStream, usage: usagePromise };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw this.mapError(error);
    }
  }

  /**
   * Maps Google AI SDK errors to AppError.
   * Google AI errors carry a `status` property for HTTP status codes.
   */
  private mapError(error: unknown): AppError {
    logger.error("ai.provider.gemini.error", error);

    const status = (error as Record<string, unknown>)?.status;
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "";

    // Rate limit
    if (status === 429) {
      return new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429);
    }

    // Auth errors
    if (status === 401 || status === 403) {
      return new AppError("AI_AUTH_ERROR", "errors.aiAuthError", 401);
    }

    // Model not found
    if (status === 404) {
      return new AppError("AI_MODEL_ERROR", "errors.aiModelError", 404);
    }

    // AbortError (timeout)
    if (name === "AbortError" || message.includes("aborted")) {
      return new AppError("AI_TIMEOUT", "errors.timeout", 504);
    }

    // Default: treat as timeout/network error
    return new AppError("AI_TIMEOUT", "errors.timeout", 504);
  }

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

// Internal type for request options (Gemini SDK uses this pattern)
type RequestOptions = Record<string, unknown>;
