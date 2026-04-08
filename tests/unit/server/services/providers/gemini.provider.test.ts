/**
 * Unit tests for GeminiProvider (TASK-S41-036).
 *
 * Tests cover:
 * - generateResponse: success, rate limit, auth error, timeout
 * - generateStreamingResponse: success with ReadableStream
 * - Error mapping to AppError codes
 * - Singleton pattern guard for missing API key
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mock handles ──────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
  getGenerativeModel: vi.fn(),
}));

// ─── Module mocks ──────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@google/generative-ai", () => {
  class GoogleGenerativeAI {
    constructor(_apiKey: string) {
      // store for testing
    }
    getGenerativeModel(config: Record<string, unknown>) {
      return mocks.getGenerativeModel(config);
    }
  }

  return {
    GoogleGenerativeAI,
  };
});

// ─── SUT ──────────────────────────────────────────────────────────────────

import { GeminiProvider } from "@/server/services/providers/gemini.provider";
import { AppError } from "@/lib/errors";

describe("GeminiProvider", () => {
  let provider: GeminiProvider;
  const originalEnv = process.env.GOOGLE_AI_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = "test-gemini-api-key";
    // Clear singleton
    const g = globalThis as unknown as { _gemini?: unknown };
    delete g._gemini;

    provider = new GeminiProvider();

    // Default mock: getGenerativeModel returns an object with generateContent
    mocks.getGenerativeModel.mockReturnValue({
      generateContent: mocks.generateContent,
      generateContentStream: mocks.generateContentStream,
    });
  });

  afterEach(() => {
    process.env.GOOGLE_AI_API_KEY = originalEnv;
    const g = globalThis as unknown as { _gemini?: unknown };
    delete g._gemini;
    vi.restoreAllMocks();
  });

  it("has name 'gemini'", () => {
    expect(provider.name).toBe("gemini");
  });

  // ─── generateResponse ─────────────────────────────────────────────────

  describe("generateResponse", () => {
    it("returns text and token counts on success", async () => {
      mocks.generateContent.mockResolvedValue({
        response: {
          text: () => '{"destination": "Paris"}',
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 200,
            totalTokenCount: 300,
          },
          candidates: [{ finishReason: "STOP" }],
        },
      });

      const result = await provider.generateResponse(
        "Plan a trip to Paris",
        2048,
        "plan",
        { systemPrompt: "You are a travel planner" },
      );

      expect(result.text).toBe('{"destination": "Paris"}');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(200);
      expect(result.wasTruncated).toBe(false);
      // Gemini has no cache tokens
      expect(result.cacheReadInputTokens).toBeUndefined();
      expect(result.cacheCreationInputTokens).toBeUndefined();
    });

    it("detects truncated response via MAX_TOKENS finish reason", async () => {
      mocks.generateContent.mockResolvedValue({
        response: {
          text: () => '{"partial":',
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 2048,
            totalTokenCount: 2148,
          },
          candidates: [{ finishReason: "MAX_TOKENS" }],
        },
      });

      const result = await provider.generateResponse("prompt", 2048, "plan");

      expect(result.wasTruncated).toBe(true);
    });

    it("throws AI_RATE_LIMIT on 429 error", async () => {
      const error = new Error("Resource has been exhausted");
      (error as Record<string, unknown>).status = 429;
      mocks.generateContent.mockRejectedValue(error);

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toMatchObject({
        code: "AI_RATE_LIMIT",
        statusCode: 429,
      });
    });

    it("throws AI_AUTH_ERROR on 401/403 error", async () => {
      const error = new Error("API key not valid");
      (error as Record<string, unknown>).status = 403;
      mocks.generateContent.mockRejectedValue(error);

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toMatchObject({
        code: "AI_AUTH_ERROR",
        statusCode: 401,
      });
    });

    it("throws AI_MODEL_ERROR on 404 error", async () => {
      const error = new Error("Model not found");
      (error as Record<string, unknown>).status = 404;
      mocks.generateContent.mockRejectedValue(error);

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toMatchObject({
        code: "AI_MODEL_ERROR",
        statusCode: 404,
      });
    });

    it("throws AI_TIMEOUT on timeout/abort error", async () => {
      const error = new DOMException("The operation was aborted", "AbortError");
      mocks.generateContent.mockRejectedValue(error);

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toMatchObject({
        code: "AI_TIMEOUT",
        statusCode: 504,
      });
    });

    it("throws AI_TIMEOUT on generic network error", async () => {
      mocks.generateContent.mockRejectedValue(new Error("fetch failed"));

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toMatchObject({
        code: "AI_TIMEOUT",
        statusCode: 504,
      });
    });

    it("passes system prompt as part of content", async () => {
      mocks.generateContent.mockResolvedValue({
        response: {
          text: () => "ok",
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
          candidates: [{ finishReason: "STOP" }],
        },
      });

      await provider.generateResponse("user prompt", 1024, "guide", {
        systemPrompt: "System instruction",
      });

      // Verify getGenerativeModel was called with systemInstruction
      expect(mocks.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-2.0-flash",
          systemInstruction: "System instruction",
        }),
      );
    });
  });

  // ─── generateStreamingResponse ───────────────────────────────────────

  describe("generateStreamingResponse", () => {
    it("returns a ReadableStream of text chunks", async () => {
      // Simulate async iterable stream
      const chunks = [
        { text: () => "Hello " },
        { text: () => "world" },
      ];

      const asyncIterable = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      };

      mocks.generateContentStream.mockResolvedValue({
        stream: asyncIterable,
        response: Promise.resolve({
          text: () => "Hello world",
          usageMetadata: {
            promptTokenCount: 50,
            candidatesTokenCount: 100,
            totalTokenCount: 150,
          },
          candidates: [{ finishReason: "STOP" }],
        }),
      });

      const { stream, usage } = await provider.generateStreamingResponse(
        "prompt",
        2048,
        "plan",
      );

      expect(stream).toBeInstanceOf(ReadableStream);

      // Read all chunks
      const reader = stream.getReader();
      const received: string[] = [];
      let done = false;
      while (!done) {
        const result = await reader.read();
        if (result.done) {
          done = true;
        } else {
          received.push(result.value);
        }
      }

      expect(received).toEqual(["Hello ", "world"]);

      // Check usage
      const usageResult = await usage;
      expect(usageResult.text).toBe("Hello world");
      expect(usageResult.inputTokens).toBe(50);
      expect(usageResult.outputTokens).toBe(100);
      expect(usageResult.wasTruncated).toBe(false);
    });

    it("maps stream error to AppError", async () => {
      const error = new Error("Resource has been exhausted");
      (error as Record<string, unknown>).status = 429;
      mocks.generateContentStream.mockRejectedValue(error);

      await expect(
        provider.generateStreamingResponse("prompt", 2048, "plan"),
      ).rejects.toMatchObject({
        code: "AI_RATE_LIMIT",
        statusCode: 429,
      });
    });
  });

  // ─── Singleton guard ─────────────────────────────────────────────────

  describe("singleton guard", () => {
    it("throws AI_CONFIG_ERROR when GOOGLE_AI_API_KEY is missing", async () => {
      delete process.env.GOOGLE_AI_API_KEY;
      const g = globalThis as unknown as { _gemini?: unknown };
      delete g._gemini;

      await expect(
        provider.generateResponse("prompt", 2048, "plan"),
      ).rejects.toMatchObject({
        code: "AI_CONFIG_ERROR",
        statusCode: 500,
      });
    });
  });
});
