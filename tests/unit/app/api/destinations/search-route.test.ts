/**
 * Unit tests for GET /api/destinations/search
 * Coverage: auth guard, rate-limit enforcement, fail-closed behavior under
 * Redis outage (SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001 §Wave 2B).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockAuth, mockCheckRateLimit, mockSearchWithFallback, mockLoggerError } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockSearchWithFallback: vi.fn(),
    mockLoggerError: vi.fn(),
  }));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/server/services/geocoding/geocoding.service", () => ({
  searchWithFallback: mockSearchWithFallback,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mockLoggerError },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET } from "@/app/api/destinations/search/route";
import type { NextRequest } from "next/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createRequest(query: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/destinations/search?${query}`);
  return { nextUrl: url } as unknown as NextRequest;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/destinations/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockSearchWithFallback.mockResolvedValue({
      results: [{ id: "1", label: "Paris" }],
      provider: "nominatim",
      cached: false,
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(createRequest("q=Paris"));

    expect(res.status).toBe(401);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("passes { failClosed: true } to checkRateLimit", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 5000,
    });

    await GET(createRequest("q=Paris"));

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "geocoding:user-1",
      10,
      5,
      { failClosed: true }
    );
  });

  it("allows the request when within the rate limit", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 5000,
    });

    const res = await GET(createRequest("q=Paris"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(mockSearchWithFallback).toHaveBeenCalled();
  });

  it("returns 429 when the rate limit denies the request", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 5000,
    });

    const res = await GET(createRequest("q=Paris"));

    expect(res.status).toBe(429);
    expect(mockSearchWithFallback).not.toHaveBeenCalled();
  });

  it("returns 429 when Redis fails and fail-closed denies (flag ON scenario)", async () => {
    // The rate-limit module itself decides allowed:false when failClosed=true
    // and env flag is ON. This route test simulates that upstream decision.
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 5000,
    });

    const res = await GET(createRequest("q=Paris"));

    expect(res.status).toBe(429);
  });

  it("returns empty results for queries below the minimum length", async () => {
    const res = await GET(createRequest("q=a"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual([]);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});
