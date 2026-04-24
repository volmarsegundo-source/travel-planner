/**
 * ADR-0036 RED tests — Gemini provider timeout configurability bridge.
 *
 * These tests are intentionally RED at the time of this commit.
 *
 * They verify the implementation contract specified in
 * `docs/adrs/ADR-0036-gemini-timeout-configurability.md` §5.1:
 *
 *   - `resolveGeminiTimeoutMs()` is exported from `gemini.provider.ts`.
 *   - Default value is 30_000 when `process.env.GEMINI_TIMEOUT_MS` is unset.
 *   - Valid env values within `[5000, 55000]` are honored.
 *   - Invalid / out-of-bounds values fall back to 30_000 AND emit a structured
 *     `ai.provider.gemini.timeout.envInvalid` warn log.
 *
 * These tests turn GREEN in the follow-up implementation commit that will
 * land after ADR-0036 is moved to Accepted status by the PO.
 *
 * STATUS AT COMMIT: RED (function does not exist yet).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

const mockLoggerWarn = vi.hoisted(() => vi.fn());

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: mockLoggerWarn,
    error: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

// ADR-0036 §5.1 — the function under test. It is NOT yet exported from
// gemini.provider.ts (that is the implementation commit's job). Tests
// import the symbol so they FAIL at import time until implementation lands.

describe("ADR-0036 — resolveGeminiTimeoutMs (RED until implementation)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLoggerWarn.mockClear();
    // Reset env isolation
    process.env = { ...originalEnv };
    delete process.env.GEMINI_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults to 30_000 when GEMINI_TIMEOUT_MS env var is not set", async () => {
    // Expected to fail with "resolveGeminiTimeoutMs is not a function" or
    // similar until the implementation commit lands.
    const mod = await import(
      "@/server/services/providers/gemini.provider"
    );
    const resolveFn = (
      mod as unknown as { resolveGeminiTimeoutMs?: () => number }
    ).resolveGeminiTimeoutMs;

    expect(resolveFn, "resolveGeminiTimeoutMs must be exported").toBeTypeOf(
      "function"
    );
    expect(resolveFn!()).toBe(30_000);
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it("honors a valid env value within bounds [5000, 55000]", async () => {
    process.env.GEMINI_TIMEOUT_MS = "25000";

    const mod = await import(
      "@/server/services/providers/gemini.provider"
    );
    const resolveFn = (
      mod as unknown as { resolveGeminiTimeoutMs?: () => number }
    ).resolveGeminiTimeoutMs;

    expect(resolveFn!()).toBe(25_000);
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it("falls back to 30_000 and warn-logs for a non-numeric env value", async () => {
    process.env.GEMINI_TIMEOUT_MS = "not-a-number";

    const mod = await import(
      "@/server/services/providers/gemini.provider"
    );
    const resolveFn = (
      mod as unknown as { resolveGeminiTimeoutMs?: () => number }
    ).resolveGeminiTimeoutMs;

    expect(resolveFn!()).toBe(30_000);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.provider.gemini.timeout.envInvalid",
      expect.objectContaining({ raw: "not-a-number", fallback: 30_000 })
    );
  });

  it("falls back to 30_000 and warn-logs for a value ABOVE the 55_000 max", async () => {
    process.env.GEMINI_TIMEOUT_MS = "100000";

    const mod = await import(
      "@/server/services/providers/gemini.provider"
    );
    const resolveFn = (
      mod as unknown as { resolveGeminiTimeoutMs?: () => number }
    ).resolveGeminiTimeoutMs;

    expect(resolveFn!()).toBe(30_000);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.provider.gemini.timeout.envInvalid",
      expect.objectContaining({ raw: "100000", fallback: 30_000 })
    );
  });

  it("falls back to 30_000 and warn-logs for a value BELOW the 5_000 min", async () => {
    process.env.GEMINI_TIMEOUT_MS = "1000";

    const mod = await import(
      "@/server/services/providers/gemini.provider"
    );
    const resolveFn = (
      mod as unknown as { resolveGeminiTimeoutMs?: () => number }
    ).resolveGeminiTimeoutMs;

    expect(resolveFn!()).toBe(30_000);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.provider.gemini.timeout.envInvalid",
      expect.objectContaining({ raw: "1000", fallback: 30_000 })
    );
  });
});
