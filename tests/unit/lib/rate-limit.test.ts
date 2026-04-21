/**
 * Unit tests for the atomic rate limiter (Lua script).
 *
 * Verifies: allowed/blocked logic, remaining count, atomic eval call,
 * and graceful fallback when Redis is unavailable.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockEval, envStub } = vi.hoisted(() => ({
  mockEval: vi.fn(),
  envStub: { RATE_LIMIT_FAIL_CLOSED_ENABLED: false as boolean },
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/cache/redis", () => ({
  redis: {
    eval: mockEval,
  },
}));

vi.mock("@/lib/env", () => ({
  env: envStub,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { checkRateLimit } from "@/lib/rate-limit";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envStub.RATE_LIMIT_FAIL_CLOSED_ENABLED = false;
  });

  it("returns allowed=true when count is within limit", async () => {
    mockEval.mockResolvedValueOnce(1);

    const result = await checkRateLimit("test:key", 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("returns allowed=true when count equals limit", async () => {
    mockEval.mockResolvedValueOnce(5);

    const result = await checkRateLimit("test:key", 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("returns allowed=false when count exceeds limit", async () => {
    mockEval.mockResolvedValueOnce(6);

    const result = await checkRateLimit("test:key", 5, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("calls redis.eval with Lua script, 1 key, and windowSeconds", async () => {
    mockEval.mockResolvedValueOnce(1);

    await checkRateLimit("test:key", 5, 3600);

    expect(mockEval).toHaveBeenCalledTimes(1);
    const [script, keyCount, _windowKey, windowSeconds] = mockEval.mock.calls[0];
    expect(script).toContain("redis.call('INCR'");
    expect(script).toContain("redis.call('EXPIRE'");
    expect(keyCount).toBe(1);
    expect(windowSeconds).toBe(3600);
  });

  it("uses atomic Lua script (INCR + EXPIRE in single eval call)", async () => {
    mockEval.mockResolvedValueOnce(1);

    await checkRateLimit("test:key", 5, 60);

    // Only one redis call should be made (eval), not separate incr + expire
    expect(mockEval).toHaveBeenCalledTimes(1);
  });

  it("returns allowed=true as fallback when Redis throws", async () => {
    mockEval.mockRejectedValueOnce(new Error("Redis connection refused"));

    const result = await checkRateLimit("test:key", 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("includes correct resetAt timestamp", async () => {
    mockEval.mockResolvedValueOnce(1);

    const before = Date.now();
    const result = await checkRateLimit("test:key", 5, 60);

    // resetAt should be in the future
    expect(result.resetAt).toBeGreaterThanOrEqual(before);
  });

  it("generates window-based key for rate limit bucketing", async () => {
    mockEval.mockResolvedValueOnce(1);

    await checkRateLimit("user:123", 10, 3600);

    const windowKey = mockEval.mock.calls[0][2] as string;
    expect(windowKey).toMatch(/^ratelimit:user:123:\d+$/);
  });

  // ─── SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001 ──────────────────────────────────
  describe("failClosed option", () => {
    it("denies the request when Redis throws, failClosed=true, and env flag enabled", async () => {
      envStub.RATE_LIMIT_FAIL_CLOSED_ENABLED = true;
      mockEval.mockRejectedValueOnce(new Error("Redis connection refused"));

      const result = await checkRateLimit("login:ip", 5, 900, { failClosed: true });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("allows the request when Redis throws, failClosed=true, but env flag DISABLED (gradual rollout)", async () => {
      envStub.RATE_LIMIT_FAIL_CLOSED_ENABLED = false;
      mockEval.mockRejectedValueOnce(new Error("Redis connection refused"));

      const result = await checkRateLimit("login:ip", 5, 900, { failClosed: true });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it("allows the request when Redis throws and failClosed omitted, regardless of env flag", async () => {
      envStub.RATE_LIMIT_FAIL_CLOSED_ENABLED = true;
      mockEval.mockRejectedValueOnce(new Error("Redis connection refused"));

      const result = await checkRateLimit("health:ip", 60, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(60);
    });

    it("allows the request when Redis throws and failClosed=false", async () => {
      envStub.RATE_LIMIT_FAIL_CLOSED_ENABLED = true;
      mockEval.mockRejectedValueOnce(new Error("Redis connection refused"));

      const result = await checkRateLimit("feedback:ip", 10, 3600, { failClosed: false });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it("does NOT alter success path when Redis is healthy and failClosed=true", async () => {
      envStub.RATE_LIMIT_FAIL_CLOSED_ENABLED = true;
      mockEval.mockResolvedValueOnce(3);

      const result = await checkRateLimit("register:ip", 20, 3600, { failClosed: true });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(17);
    });
  });
});
