/**
 * Unit tests for RateLimitPolicy.
 *
 * Tests cover:
 * - Under limit -> allowed
 * - Over limit -> blocked
 * - Correct key format passed to checkRateLimit
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.unmock("@/server/services/ai-governance/policy-engine");
vi.unmock("@/server/services/ai-governance/policies");

const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

import { rateLimitPolicy } from "@/server/services/ai-governance/policies/rate-limit.policy";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RateLimitPolicy", () => {
  it("allows when under the rate limit", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 3600000,
    });

    const result = await rateLimitPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(true);
    expect(mockCheckRateLimit).toHaveBeenCalledWith("ai:plan:u1", 10, 3600, {
      failClosed: true,
    });
  });

  it("blocks when over the rate limit", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 3600000,
    });

    const result = await rateLimitPolicy.evaluate({
      phase: "checklist",
      userId: "u2",
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("rate_limit");
    expect(result.reason).toBe("Rate limit exceeded");
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "ai:checklist:u2",
      5,
      3600,
      { failClosed: true },
    );
  });

  it("uses correct limits per phase", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 1,
      resetAt: Date.now() + 3600000,
    });

    await rateLimitPolicy.evaluate({ phase: "plan", userId: "u1" });
    expect(mockCheckRateLimit).toHaveBeenLastCalledWith(
      "ai:plan:u1",
      10,
      3600,
      { failClosed: true },
    );

    await rateLimitPolicy.evaluate({ phase: "guide", userId: "u1" });
    expect(mockCheckRateLimit).toHaveBeenLastCalledWith(
      "ai:guide:u1",
      5,
      3600,
      { failClosed: true },
    );
  });

  it("uses default limit for unknown phases", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: true,
      remaining: 1,
      resetAt: Date.now() + 3600000,
    });

    await rateLimitPolicy.evaluate({ phase: "unknown", userId: "u1" });
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "ai:unknown:u1",
      5,
      3600,
      { failClosed: true },
    );
  });
});
