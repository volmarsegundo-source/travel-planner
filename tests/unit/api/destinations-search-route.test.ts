import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { GET } from "@/app/api/destinations/search/route";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { redis } from "@/server/cache/redis";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockRateLimit = checkRateLimit as ReturnType<typeof vi.fn>;
const mockRedisGet = redis.get as ReturnType<typeof vi.fn>;
const mockRedisSetex = redis.setex as ReturnType<typeof vi.fn>;

function createRequest(query: string, locale?: string) {
  const url = new URL(`http://localhost:3000/api/destinations/search?q=${encodeURIComponent(query)}`);
  if (locale) url.searchParams.set("locale", locale);
  return new NextRequest(url);
}

describe("GET /api/destinations/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 1, resetAt: 0 });
    mockRedisGet.mockResolvedValue(null);
    // Mock global fetch
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(createRequest("Paris"));
    expect(res.status).toBe(401);
  });

  it("returns empty results for query shorter than 2 chars", async () => {
    const res = await GET(createRequest("P"));
    const data = await res.json();
    expect(data.results).toEqual([]);
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0 });
    const res = await GET(createRequest("Paris"));
    expect(res.status).toBe(429);
  });

  it("uses relaxed rate limit of 3 per 2 seconds", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await GET(createRequest("Paris"));

    expect(mockRateLimit).toHaveBeenCalledWith("nominatim:user-1", 3, 2);
  });

  it("returns cached results from Redis (includes locale in key)", async () => {
    const cached = [{ displayName: "Paris, France", lat: 48.8, lon: 2.3, country: "France", state: null, city: "Paris" }];
    mockRedisGet.mockResolvedValue(JSON.stringify(cached));
    const res = await GET(createRequest("Paris", "en"));
    const data = await res.json();
    expect(data.results).toEqual(cached);
    expect(fetch).not.toHaveBeenCalled();
    // Verify locale is included in cache key
    expect(mockRedisGet).toHaveBeenCalledWith("dest:search:en:paris");
  });

  it("defaults locale to pt-BR when not specified", async () => {
    const cached = [{ displayName: "Paris, France", lat: 48.8, lon: 2.3, country: "France", state: null, city: "Paris" }];
    mockRedisGet.mockResolvedValue(JSON.stringify(cached));
    await GET(createRequest("Paris"));
    expect(mockRedisGet).toHaveBeenCalledWith("dest:search:pt-BR:paris");
  });

  it("fetches from Nominatim and caches results", async () => {
    const nominatimResponse = [
      {
        display_name: "Paris, Île-de-France, France",
        lat: "48.8566",
        lon: "2.3522",
        address: { country: "France", state: "Île-de-France", city: "Paris" },
      },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(nominatimResponse),
    });

    const res = await GET(createRequest("Paris"));
    const data = await res.json();

    expect(data.results).toHaveLength(1);
    expect(data.results[0].displayName).toBe("Paris, Île-de-France, France");
    expect(data.results[0].lat).toBe(48.8566);
    expect(data.results[0].country).toBe("France");
    expect(mockRedisSetex).toHaveBeenCalled();
  });

  it("includes User-Agent and Accept-Language headers in Nominatim request", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await GET(createRequest("Tokyo", "en"));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
          "Accept-Language": "en,en-US;q=0.9",
        }),
      })
    );
  });

  it("sends pt-BR Accept-Language when locale is pt-BR", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await GET(createRequest("Sao Paulo", "pt-BR"));

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5",
        }),
      })
    );
  });

  it("includes AbortSignal.timeout in fetch options", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await GET(createRequest("Berlin"));

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("returns empty results on Nominatim error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const res = await GET(createRequest("Error City"));
    const data = await res.json();
    expect(data.results).toEqual([]);
  });

  it("returns empty results on network error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    const res = await GET(createRequest("Offline"));
    const data = await res.json();
    expect(data.results).toEqual([]);
  });
});
