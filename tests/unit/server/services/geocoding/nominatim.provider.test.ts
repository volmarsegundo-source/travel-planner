import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { NominatimGeocodingProvider } from "@/server/services/geocoding/nominatim.provider";

// ─── Test data ───────────────────────────────────────────────────────────────

const nominatimItem = {
  display_name: "Paris, Ile-de-France, France",
  lat: "48.8566",
  lon: "2.3522",
  importance: 0.95,
  address: {
    city: "Paris",
    state: "Ile-de-France",
    country: "France",
    country_code: "fr",
  },
};

const nominatimItemNoCityField = {
  display_name: "Springfield, Illinois, United States",
  lat: "39.7817",
  lon: "-89.6501",
  importance: 0.5,
  address: {
    state: "Illinois",
    country: "United States",
    country_code: "us",
  },
};

const duplicateItems = [
  {
    display_name: "Paris, Ile-de-France, France (commune)",
    lat: "48.8566",
    lon: "2.3522",
    importance: 0.95,
    address: { city: "Paris", state: "Ile-de-France", country: "France", country_code: "fr" },
  },
  {
    display_name: "Paris, Ile-de-France, France (administrative)",
    lat: "48.8567",
    lon: "2.3523",
    importance: 0.80,
    address: { city: "Paris", state: "Ile-de-France", country: "France", country_code: "fr" },
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("NominatimGeocodingProvider", () => {
  let provider: NominatimGeocodingProvider;

  beforeEach(() => {
    provider = new NominatimGeocodingProvider();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has name 'nominatim'", () => {
    expect(provider.name).toBe("nominatim");
  });

  it("builds correct request URL", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await provider.search({ query: "Paris", locale: "pt-BR", limit: 5 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.hostname).toBe("nominatim.openstreetmap.org");
    expect(url.searchParams.get("q")).toBe("Paris");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("featuretype")).toBe("city");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("addressdetails")).toBe("1");
  });

  it("passes Accept-Language header for pt-BR", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await provider.search({ query: "test", locale: "pt-BR", limit: 5 });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Accept-Language"]).toContain("pt-BR");
  });

  it("passes Accept-Language header for en", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await provider.search({ query: "test", locale: "en", limit: 5 });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Accept-Language"]).toContain("en");
  });

  it("maps Nominatim response to GeocodingResult", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([nominatimItem]),
    });

    const results = await provider.search({
      query: "Paris",
      locale: "pt-BR",
      limit: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      displayName: "Paris, Ile-de-France, France",
      shortName: "Paris, France",
      formattedName: "Paris, Ile-de-France, France",
      lat: 48.8566,
      lon: 2.3522,
      country: "France",
      countryCode: "FR",
      state: "Ile-de-France",
      city: "Paris",
    });
  });

  it("extracts city from display_name when address.city is absent", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([nominatimItemNoCityField]),
    });

    const results = await provider.search({
      query: "Springfield",
      locale: "en",
      limit: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0].city).toBe("Springfield");
    expect(results[0].countryCode).toBe("US");
  });

  it("deduplicates results by city+state+country keeping highest importance", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(duplicateItems),
    });

    const results = await provider.search({
      query: "Paris",
      locale: "pt-BR",
      limit: 5,
    });

    expect(results).toHaveLength(1);
    // Should keep the one with higher importance (0.95)
    expect(results[0].lat).toBe(48.8566);
  });

  it("returns empty array for empty response", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const results = await provider.search({
      query: "xyzxyz",
      locale: "en",
      limit: 5,
    });

    expect(results).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(
      provider.search({ query: "Paris", locale: "en", limit: 5 })
    ).rejects.toThrow("Nominatim geocoding failed with status 503");
  });

  it("throws on network error", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new Error("fetch failed"));

    await expect(
      provider.search({ query: "Paris", locale: "en", limit: 5 })
    ).rejects.toThrow("fetch failed");
  });

  describe("isAvailable", () => {
    it("returns true when API responds ok", async () => {
      const mockFetch = fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: true });

      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it("returns false on error", async () => {
      const mockFetch = fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error("timeout"));

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });
});
