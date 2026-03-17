import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSetex: vi.fn(),
  mockMapboxSearch: vi.fn(),
  mockNominatimSearch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@/server/cache/redis", () => ({
  redis: {
    get: hoisted.mockRedisGet,
    setex: hoisted.mockRedisSetex,
  },
}));
vi.mock("@/lib/env", () => ({
  env: {
    MAPBOX_SECRET_TOKEN: undefined, // default: no token
  },
}));
vi.mock("@/server/services/geocoding/mapbox.provider", () => ({
  MapboxGeocodingProvider: function MapboxGeocodingProvider() {
    return {
      name: "mapbox",
      search: hoisted.mockMapboxSearch,
      isAvailable: vi.fn().mockResolvedValue(true),
    };
  },
}));
vi.mock("@/server/services/geocoding/nominatim.provider", () => ({
  NominatimGeocodingProvider: function NominatimGeocodingProvider() {
    return {
      name: "nominatim",
      search: hoisted.mockNominatimSearch,
      isAvailable: vi.fn().mockResolvedValue(true),
    };
  },
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import {
  getGeocodingProvider,
  searchWithFallback,
  normalizeQuery,
  buildCacheKey,
} from "@/server/services/geocoding/geocoding.service";
import { env } from "@/lib/env";

// ─── Test data ───────────────────────────────────────────────────────────────

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

const searchOptions = { query: "Paris", locale: "pt-BR", limit: 5 };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("normalizeQuery", () => {
  it("lowercases the query", () => {
    expect(normalizeQuery("PARIS")).toBe("paris");
  });

  it("trims whitespace", () => {
    expect(normalizeQuery("  paris  ")).toBe("paris");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeQuery("rio  de   janeiro")).toBe("rio de janeiro");
  });

  it("handles accented characters", () => {
    expect(normalizeQuery("São Paulo")).toBe("são paulo");
  });
});

describe("buildCacheKey", () => {
  it("builds key with provider, locale, and normalized query", () => {
    expect(buildCacheKey("mapbox", "pt-BR", "  Rio de Janeiro  ")).toBe(
      "geo:search:mapbox:pt-BR:rio de janeiro"
    );
  });

  it("builds key for nominatim", () => {
    expect(buildCacheKey("nominatim", "en", "Tokyo")).toBe(
      "geo:search:nominatim:en:tokyo"
    );
  });
});

describe("getGeocodingProvider", () => {
  it("returns Nominatim when MAPBOX_SECRET_TOKEN is not set", () => {
    (env as Record<string, unknown>).MAPBOX_SECRET_TOKEN = undefined;
    const provider = getGeocodingProvider();
    expect(provider.name).toBe("nominatim");
  });

  it("returns Mapbox when MAPBOX_SECRET_TOKEN is set", () => {
    (env as Record<string, unknown>).MAPBOX_SECRET_TOKEN = "sk.test-token";
    const provider = getGeocodingProvider();
    expect(provider.name).toBe("mapbox");
  });

  afterEach(() => {
    (env as Record<string, unknown>).MAPBOX_SECRET_TOKEN = undefined;
  });
});

describe("searchWithFallback", () => {
  beforeEach(() => {
    hoisted.mockRedisGet.mockResolvedValue(null);
    hoisted.mockRedisSetex.mockResolvedValue("OK");
    hoisted.mockMapboxSearch.mockResolvedValue([parisResult]);
    hoisted.mockNominatimSearch.mockResolvedValue([parisResult]);
    (env as Record<string, unknown>).MAPBOX_SECRET_TOKEN = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
    (env as Record<string, unknown>).MAPBOX_SECRET_TOKEN = undefined;
  });

  it("returns cached results on cache hit", async () => {
    hoisted.mockRedisGet.mockResolvedValue(JSON.stringify([parisResult]));

    const result = await searchWithFallback(searchOptions);

    expect(result.results).toEqual([parisResult]);
    expect(result.cached).toBe(true);
    expect(hoisted.mockNominatimSearch).not.toHaveBeenCalled();
  });

  it("queries provider on cache miss", async () => {
    hoisted.mockRedisGet.mockResolvedValue(null);

    const result = await searchWithFallback(searchOptions);

    expect(result.results).toEqual([parisResult]);
    expect(result.cached).toBe(false);
    expect(result.provider).toBe("nominatim");
    expect(hoisted.mockNominatimSearch).toHaveBeenCalled();
  });

  it("caches results in Redis after provider call", async () => {
    hoisted.mockRedisGet.mockResolvedValue(null);

    await searchWithFallback(searchOptions);

    // Wait for async cache write
    await vi.waitFor(() => {
      expect(hoisted.mockRedisSetex).toHaveBeenCalled();
    });
    const [key, ttl, value] = hoisted.mockRedisSetex.mock.calls[0];
    expect(key).toContain("geo:search:");
    expect(ttl).toBe(604800); // 7 days
    expect(JSON.parse(value)).toEqual([parisResult]);
  });

  it("falls back to Nominatim when Mapbox fails", async () => {
    (env as Record<string, unknown>).MAPBOX_SECRET_TOKEN = "sk.test";
    hoisted.mockMapboxSearch.mockRejectedValue(new Error("Mapbox down"));
    hoisted.mockNominatimSearch.mockResolvedValue([parisResult]);

    const result = await searchWithFallback(searchOptions);

    expect(result.results).toEqual([parisResult]);
    expect(result.provider).toBe("nominatim");
    expect(result.cached).toBe(false);
  });

  it("returns empty results when both providers fail", async () => {
    (env as Record<string, unknown>).MAPBOX_SECRET_TOKEN = "sk.test";
    hoisted.mockMapboxSearch.mockRejectedValue(new Error("Mapbox down"));
    hoisted.mockNominatimSearch.mockRejectedValue(new Error("Nominatim down"));

    const result = await searchWithFallback(searchOptions);

    expect(result.results).toEqual([]);
    expect(result.provider).toBe("none");
  });

  it("returns empty results when Nominatim-only provider fails", async () => {
    hoisted.mockNominatimSearch.mockRejectedValue(new Error("Nominatim down"));

    const result = await searchWithFallback(searchOptions);

    expect(result.results).toEqual([]);
    expect(result.provider).toBe("none");
  });

  it("continues gracefully when Redis get fails", async () => {
    hoisted.mockRedisGet.mockRejectedValue(new Error("Redis unavailable"));

    const result = await searchWithFallback(searchOptions);

    expect(result.results).toEqual([parisResult]);
    expect(result.cached).toBe(false);
  });

  it("continues gracefully when Redis setex fails", async () => {
    hoisted.mockRedisSetex.mockRejectedValue(new Error("Redis write error"));

    const result = await searchWithFallback(searchOptions);

    expect(result.results).toEqual([parisResult]);
    // No throw — cache write failure is non-fatal
  });
});
