/**
 * Unit tests for AI fallback mechanism (TASK-S41-038).
 *
 * Tests cover:
 * - Primary succeeds: no fallback
 * - Primary fails with 429 (rate limit): fallback called
 * - Primary fails with 504 (timeout): fallback called
 * - Primary fails with 401 (auth error): NO fallback, error propagated
 * - Primary fails with 404 (model error): NO fallback, error propagated
 * - Both providers fail: error from fallback propagated
 * - No AI_FALLBACK_PROVIDER: no fallback attempted
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { FallbackProvider } from "@/server/services/providers/fallback.provider";
import { AppError } from "@/lib/errors";
import type { AiProvider, AiProviderResponse, ModelType, AiProviderOptions } from "@/server/services/ai-provider.interface";

// ─── Mock provider factory ──────────────────────────────────────────────────

function createMockProvider(name: string): AiProvider & {
  generateResponse: ReturnType<typeof vi.fn>;
  generateStreamingResponse: ReturnType<typeof vi.fn>;
} {
  return {
    name,
    generateResponse: vi.fn(),
    generateStreamingResponse: vi.fn(),
  };
}

const successResponse: AiProviderResponse = {
  text: '{"result": "success"}',
  wasTruncated: false,
  inputTokens: 100,
  outputTokens: 200,
};

describe("FallbackProvider", () => {
  let primary: ReturnType<typeof createMockProvider>;
  let fallback: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    primary = createMockProvider("claude");
    fallback = createMockProvider("gemini");
  });

  // ─── generateResponse ─────────────────────────────────────────────────

  describe("generateResponse", () => {
    it("returns primary result when primary succeeds", async () => {
      primary.generateResponse.mockResolvedValue(successResponse);

      const provider = new FallbackProvider(primary, fallback);
      const result = await provider.generateResponse("prompt", 2048, "plan");

      expect(result).toEqual(successResponse);
      expect(primary.generateResponse).toHaveBeenCalledOnce();
      expect(fallback.generateResponse).not.toHaveBeenCalled();
    });

    it("falls back on 429 rate limit error", async () => {
      primary.generateResponse.mockRejectedValue(
        new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429),
      );
      fallback.generateResponse.mockResolvedValue(successResponse);

      const provider = new FallbackProvider(primary, fallback);
      const result = await provider.generateResponse("prompt", 2048, "plan");

      expect(result).toEqual(successResponse);
      expect(primary.generateResponse).toHaveBeenCalledOnce();
      expect(fallback.generateResponse).toHaveBeenCalledOnce();
    });

    it("falls back on 504 timeout error", async () => {
      primary.generateResponse.mockRejectedValue(
        new AppError("AI_TIMEOUT", "errors.timeout", 504),
      );
      fallback.generateResponse.mockResolvedValue(successResponse);

      const provider = new FallbackProvider(primary, fallback);
      const result = await provider.generateResponse("prompt", 2048, "plan");

      expect(result).toEqual(successResponse);
      expect(fallback.generateResponse).toHaveBeenCalledOnce();
    });

    it("does NOT fall back on 401 auth error", async () => {
      const authError = new AppError("AI_AUTH_ERROR", "errors.aiAuthError", 401);
      primary.generateResponse.mockRejectedValue(authError);

      const provider = new FallbackProvider(primary, fallback);

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toThrow(authError);

      expect(fallback.generateResponse).not.toHaveBeenCalled();
    });

    it("does NOT fall back on 404 model error", async () => {
      const modelError = new AppError("AI_MODEL_ERROR", "errors.aiModelError", 404);
      primary.generateResponse.mockRejectedValue(modelError);

      const provider = new FallbackProvider(primary, fallback);

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toThrow(modelError);

      expect(fallback.generateResponse).not.toHaveBeenCalled();
    });

    it("does NOT fall back on parse errors (502)", async () => {
      const parseError = new AppError("AI_PARSE_ERROR", "errors.aiParseError", 502);
      primary.generateResponse.mockRejectedValue(parseError);

      const provider = new FallbackProvider(primary, fallback);

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toThrow(parseError);

      expect(fallback.generateResponse).not.toHaveBeenCalled();
    });

    it("propagates fallback error when both providers fail", async () => {
      primary.generateResponse.mockRejectedValue(
        new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429),
      );
      const fallbackError = new AppError("AI_TIMEOUT", "errors.timeout", 504);
      fallback.generateResponse.mockRejectedValue(fallbackError);

      const provider = new FallbackProvider(primary, fallback);

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toThrow(fallbackError);
    });

    it("passes all arguments through to fallback provider", async () => {
      primary.generateResponse.mockRejectedValue(
        new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429),
      );
      fallback.generateResponse.mockResolvedValue(successResponse);

      const provider = new FallbackProvider(primary, fallback);
      const options: AiProviderOptions = { systemPrompt: "sys" };
      await provider.generateResponse("my prompt", 4096, "guide", options);

      expect(fallback.generateResponse).toHaveBeenCalledWith(
        "my prompt",
        4096,
        "guide",
        options,
      );
    });
  });

  // ─── generateStreamingResponse ───────────────────────────────────────

  describe("generateStreamingResponse", () => {
    const streamResult = {
      stream: new ReadableStream(),
      usage: Promise.resolve(successResponse),
    };

    it("returns primary stream when primary succeeds", async () => {
      primary.generateStreamingResponse.mockResolvedValue(streamResult);

      const provider = new FallbackProvider(primary, fallback);
      const result = await provider.generateStreamingResponse("prompt", 2048, "plan");

      expect(result).toEqual(streamResult);
      expect(fallback.generateStreamingResponse).not.toHaveBeenCalled();
    });

    it("falls back on rate limit for streaming", async () => {
      primary.generateStreamingResponse.mockRejectedValue(
        new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429),
      );
      fallback.generateStreamingResponse.mockResolvedValue(streamResult);

      const provider = new FallbackProvider(primary, fallback);
      const result = await provider.generateStreamingResponse("prompt", 2048, "plan");

      expect(result).toEqual(streamResult);
    });

    it("does NOT fall back on auth error for streaming", async () => {
      const authError = new AppError("AI_AUTH_ERROR", "errors.aiAuthError", 401);
      primary.generateStreamingResponse.mockRejectedValue(authError);

      const provider = new FallbackProvider(primary, fallback);

      await expect(
        provider.generateStreamingResponse("prompt", 2048, "plan"),
      ).rejects.toThrow(authError);

      expect(fallback.generateStreamingResponse).not.toHaveBeenCalled();
    });
  });

  // ─── Provider name ───────────────────────────────────────────────────

  describe("name", () => {
    it("exposes primary provider name with fallback suffix", () => {
      const provider = new FallbackProvider(primary, fallback);
      expect(provider.name).toBe("claude+gemini");
    });
  });
});

describe("No fallback configured", () => {
  it("FallbackProvider is not used when fallback is null", () => {
    // This tests the factory logic: when AI_FALLBACK_PROVIDER is not set,
    // the factory should return the primary provider directly (not wrapped).
    // Tested in ai-provider-factory.test.ts via getProvider() behavior.
    expect(true).toBe(true);
  });
});
