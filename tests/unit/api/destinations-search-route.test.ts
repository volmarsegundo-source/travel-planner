import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  mockSearchWithFallback: vi.fn(),
}));

// ─── Module mocks ───────────────────────────────────────────────────────────
vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/server/cache/redis", () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/server/services/geocoding/geocoding.service", () => ({
  searchWithFallback: hoisted.mockSearchWithFallback,
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { GET } from "@/app/api/destinations/search/route";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockRateLimit = checkRateLimit as ReturnType<typeof vi.fn>;

function createRequest(query: string, locale?: string, limit?: number) {
  const url = new URL(
    `http://localhost:3000/api/destinations/search?q=${encodeURIComponent(query)}`
  );
  if (locale) url.searchParams.set("locale", locale);
  if (limit !== undefined) url.searchParams.set("limit", String(limit));
  return new NextRequest(url);
}

const parisResult = {
  displayName: "Paris, Ile-de-France, France",
  shortName: "Paris, France",
  formattedName: "Paris, Ile-de-France, France",
  lat: 48.8566,
  lon: 2.3522,
  country: "France",
  countryCode: "FR",
  state: "Ile-de-France",
  city: "Paris",
};

describe("GET /api/destinations/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: 0,
    });
    hoisted.mockSearchWithFallback.mockResolvedValue({
      results: [parisResult],
      provider: "nominatim",
      cached: false,
    });
  });

  // ─── Auth ───────────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(createRequest("Paris"));
    expect(res.status).toBe(401);
  });

  // ─── Input validation ──────────────────────────────────────────────────

  it("returns empty results for query shorter than 2 chars", async () => {
    const res = await GET(createRequest("P"));
    const data = await res.json();
    expect(data.results).toEqual([]);
  });

  it("returns empty results for empty query", async () => {
    const res = await GET(createRequest(""));
    const data = await res.json();
    expect(data.results).toEqual([]);
  });

  // ─── Rate limiting ─────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 0,
    });
    const res = await GET(createRequest("Paris"));
    expect(res.status).toBe(429);
  });

  it("uses rate limit key with geocoding prefix and user id", async () => {
    await GET(createRequest("Paris"));
    expect(mockRateLimit).toHaveBeenCalledWith(
      "geocoding:user-1",
      10,
      5
    );
  });

  // ─── Geocoding service delegation ──────────────────────────────────────

  it("delegates to searchWithFallback with query and locale", async () => {
    await GET(createRequest("Paris", "en"));
    expect(hoisted.mockSearchWithFallback).toHaveBeenCalledWith({
      query: "Paris",
      locale: "en",
      limit: 5,
    });
  });

  it("defaults locale to pt-BR when not specified", async () => {
    await GET(createRequest("Paris"));
    expect(hoisted.mockSearchWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "pt-BR" })
    );
  });

  it("passes limit parameter to geocoding service", async () => {
    await GET(createRequest("Paris", "en", 8));
    expect(hoisted.mockSearchWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 8 })
    );
  });

  it("clamps limit to max 10", async () => {
    await GET(createRequest("Paris", "en", 20));
    expect(hoisted.mockSearchWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  it("defaults limit to 5 when not specified", async () => {
    await GET(createRequest("Paris"));
    expect(hoisted.mockSearchWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 })
    );
  });

  // ─── Response format ───────────────────────────────────────────────────

  it("returns results with provider and cached fields", async () => {
    const res = await GET(createRequest("Paris"));
    const data = await res.json();
    expect(data.results).toEqual([parisResult]);
    expect(data.provider).toBe("nominatim");
    expect(data.cached).toBe(false);
  });

  it("returns cached flag when results come from cache", async () => {
    hoisted.mockSearchWithFallback.mockResolvedValue({
      results: [parisResult],
      provider: "mapbox",
      cached: true,
    });
    const res = await GET(createRequest("Paris"));
    const data = await res.json();
    expect(data.cached).toBe(true);
    expect(data.provider).toBe("mapbox");
  });

  // ─── Error handling ────────────────────────────────────────────────────

  it("returns empty results on geocoding service error", async () => {
    hoisted.mockSearchWithFallback.mockRejectedValue(
      new Error("Service unavailable")
    );
    const res = await GET(createRequest("Error City"));
    const data = await res.json();
    expect(data.results).toEqual([]);
    expect(data.provider).toBe("none");
    expect(res.status).toBe(200); // graceful degradation
  });
});
