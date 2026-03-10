/**
 * Unit tests for ClaudeProvider.generateStreamingResponse (T-S18-006).
 *
 * Mocks the Anthropic SDK stream to test streaming behavior,
 * error mapping, and token usage extraction.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mock handles ──────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  streamFn: vi.fn(),
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

vi.mock("@anthropic-ai/sdk", () => {
  // Create error classes that extend Error
  class AuthenticationError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "AuthenticationError";
    }
  }
  class RateLimitError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "RateLimitError";
    }
  }
  class NotFoundError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "NotFoundError";
    }
  }

  function MockAnthropic() {
    return {
      messages: {
        create: vi.fn(),
        stream: mocks.streamFn,
      },
    };
  }
  MockAnthropic.AuthenticationError = AuthenticationError;
  MockAnthropic.RateLimitError = RateLimitError;
  MockAnthropic.NotFoundError = NotFoundError;

  return { default: MockAnthropic };
});

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { ClaudeProvider } from "@/server/services/providers/claude.provider";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockStream(
  events: Array<{ type: string; delta?: { type: string; text: string } }>,
  finalMessage: Record<string, unknown>,
) {
  const asyncIterator = {
    [Symbol.asyncIterator]() {
      let index = 0;
      return {
        async next() {
          if (index < events.length) {
            return { value: events[index++], done: false };
          }
          return { value: undefined, done: true };
        },
      };
    },
    finalMessage: vi.fn().mockResolvedValue(finalMessage),
  };
  return asyncIterator;
}

function collectStream(stream: ReadableStream<string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = stream.getReader();
    let result = "";
    function read(): void {
      reader.read().then(({ done, value }) => {
        if (done) {
          resolve(result);
          return;
        }
        result += value;
        read();
      }).catch(reject);
    }
    read();
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ClaudeProvider.generateStreamingResponse", () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    // Clear singleton
    const g = globalThis as unknown as { _anthropic?: unknown };
    delete g._anthropic;
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    const g = globalThis as unknown as { _anthropic?: unknown };
    delete g._anthropic;
  });

  it("streams text chunks from content_block_delta events", async () => {
    const events = [
      { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } },
      { type: "content_block_delta", delta: { type: "text_delta", text: " world" } },
    ];
    const finalMsg = {
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 5 },
    };
    mocks.streamFn.mockReturnValue(createMockStream(events, finalMsg));

    const provider = new ClaudeProvider();
    const { stream, usage } = await provider.generateStreamingResponse(
      "test prompt", 1000, "plan",
    );

    const text = await collectStream(stream);
    expect(text).toBe("Hello world");

    const usageResult = await usage;
    expect(usageResult.text).toBe("Hello world");
    expect(usageResult.inputTokens).toBe(10);
    expect(usageResult.outputTokens).toBe(5);
    expect(usageResult.wasTruncated).toBe(false);
  });

  it("reports wasTruncated when stop_reason is max_tokens", async () => {
    const events = [
      { type: "content_block_delta", delta: { type: "text_delta", text: "partial" } },
    ];
    const finalMsg = {
      stop_reason: "max_tokens",
      usage: { input_tokens: 20, output_tokens: 100 },
    };
    mocks.streamFn.mockReturnValue(createMockStream(events, finalMsg));

    const provider = new ClaudeProvider();
    const { stream, usage } = await provider.generateStreamingResponse(
      "test", 100, "plan",
    );

    await collectStream(stream);
    const usageResult = await usage;
    expect(usageResult.wasTruncated).toBe(true);
  });

  it("ignores non-text_delta events", async () => {
    const events = [
      { type: "message_start" },
      { type: "content_block_start" },
      { type: "content_block_delta", delta: { type: "text_delta", text: "data" } },
      { type: "message_stop" },
    ];
    const finalMsg = {
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 2 },
    };
    mocks.streamFn.mockReturnValue(createMockStream(events, finalMsg));

    const provider = new ClaudeProvider();
    const { stream } = await provider.generateStreamingResponse(
      "test", 100, "checklist",
    );

    const text = await collectStream(stream);
    expect(text).toBe("data");
  });

  it("passes system prompt with cache_control when provided", async () => {
    const events = [
      { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
    ];
    const finalMsg = {
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 1 },
    };
    mocks.streamFn.mockReturnValue(createMockStream(events, finalMsg));

    const provider = new ClaudeProvider();
    await provider.generateStreamingResponse(
      "test", 100, "plan", { systemPrompt: "You are a planner" },
    );

    expect(mocks.streamFn).toHaveBeenCalledWith(
      expect.objectContaining({
        system: [
          expect.objectContaining({
            type: "text",
            text: "You are a planner",
            cache_control: { type: "ephemeral" },
          }),
        ],
      }),
    );
  });

  it("includes cache token usage when available", async () => {
    const events = [
      { type: "content_block_delta", delta: { type: "text_delta", text: "cached" } },
    ];
    const finalMsg = {
      stop_reason: "end_turn",
      usage: {
        input_tokens: 50,
        output_tokens: 10,
        cache_read_input_tokens: 40,
        cache_creation_input_tokens: 5,
      },
    };
    mocks.streamFn.mockReturnValue(createMockStream(events, finalMsg));

    const provider = new ClaudeProvider();
    const { stream, usage } = await provider.generateStreamingResponse(
      "test", 100, "plan",
    );

    await collectStream(stream);
    const usageResult = await usage;
    expect(usageResult.cacheReadInputTokens).toBe(40);
    expect(usageResult.cacheCreationInputTokens).toBe(5);
  });

  it("throws AI_CONFIG_ERROR when API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const g = globalThis as unknown as { _anthropic?: unknown };
    delete g._anthropic;

    const provider = new ClaudeProvider();
    await expect(
      provider.generateStreamingResponse("test", 100, "plan"),
    ).rejects.toThrow("errors.aiConfigError");
  });
});
