/**
 * Unit tests for Anthropic API key validation guard (T-S17-009).
 *
 * Verifies that ClaudeProvider throws a clear error when
 * ANTHROPIC_API_KEY is missing, empty, or whitespace-only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// We do NOT mock the claude provider — we test it directly.
// But we DO mock the Anthropic SDK to avoid real API calls.
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: function MockAnthropic() {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "response" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 10, output_tokens: 5 },
          }),
        },
      };
    },
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import { ClaudeProvider } from "@/server/services/providers/claude.provider";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ClaudeProvider API key guard (T-S17-009)", () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    // Clear the Anthropic singleton between tests
    const g = globalThis as unknown as { _anthropic?: unknown };
    delete g._anthropic;
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    // Clear singleton
    const g = globalThis as unknown as { _anthropic?: unknown };
    delete g._anthropic;
  });

  it("throws AI_CONFIG_ERROR when ANTHROPIC_API_KEY is undefined", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const provider = new ClaudeProvider();

    await expect(
      provider.generateResponse("test", 100, "plan")
    ).rejects.toThrow("errors.aiConfigError");
  });

  it("throws AI_CONFIG_ERROR when ANTHROPIC_API_KEY is empty string", async () => {
    process.env.ANTHROPIC_API_KEY = "";

    const provider = new ClaudeProvider();

    await expect(
      provider.generateResponse("test", 100, "checklist")
    ).rejects.toThrow("errors.aiConfigError");
  });

  it("throws AI_CONFIG_ERROR when ANTHROPIC_API_KEY is whitespace only", async () => {
    process.env.ANTHROPIC_API_KEY = "   ";

    const provider = new ClaudeProvider();

    await expect(
      provider.generateResponse("test", 100, "guide")
    ).rejects.toThrow("errors.aiConfigError");
  });

  it("thrown error has code AI_CONFIG_ERROR", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const provider = new ClaudeProvider();

    try {
      await provider.generateResponse("test", 100, "plan");
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as { code: string }).code).toBe("AI_CONFIG_ERROR");
    }
  });

  it("succeeds when ANTHROPIC_API_KEY is valid", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-valid-key-123";

    const provider = new ClaudeProvider();
    const result = await provider.generateResponse("test", 100, "plan");

    expect(result.text).toBe("response");
  });
});
