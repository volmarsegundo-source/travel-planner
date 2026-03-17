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

import { MapboxGeocodingProvider } from "@/server/services/geocoding/mapbox.provider";

// ─── Test data ───────────────────────────────────────────────────────────────

const MOCK_TOKEN = "pk.test-token-12345";

const mapboxFeature = {
  properties: {
    full_address: "Paris, Ile-de-France, France",
    name: "Paris",
    name_preferred: "Paris",
    place_formatted: "Ile-de-France, France",
    context: {
      country: { name: "France", country_code: "fr" },
      region: { name: "Ile-de-France" },
    },
    coordinates: {
      latitude: 48.8566,
      longitude: 2.3522,
    },
  },
};

const mapboxFeatureNoCoords = {
  properties: {
    name: "Tokyo",
    context: {
      country: { name: "Japan", country_code: "jp" },
      region: { name: "Kanto" },
    },
  },
  geometry: {
    coordinates: [139.6503, 35.6762], // [lon, lat]
  },
};

const mapboxResponse = {
  features: [mapboxFeature],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("MapboxGeocodingProvider", () => {
  let provider: MapboxGeocodingProvider;

  beforeEach(() => {
    provider = new MapboxGeocodingProvider(MOCK_TOKEN);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has name 'mapbox'", () => {
    expect(provider.name).toBe("mapbox");
  });

  it("builds correct request URL with params", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    });

    await provider.search({ query: "Paris", locale: "pt-BR", limit: 5 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.hostname).toBe("api.mapbox.com");
    expect(url.searchParams.get("q")).toBe("Paris");
    expect(url.searchParams.get("access_token")).toBe(MOCK_TOKEN);
    expect(url.searchParams.get("types")).toBe("place,locality");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("language")).toBe("pt");
  });

  it("maps pt-BR locale to 'pt' language param", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    });

    await provider.search({ query: "test", locale: "pt-BR", limit: 5 });

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("language")).toBe("pt");
  });

  it("maps en locale to 'en' language param", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    });

    await provider.search({ query: "test", locale: "en", limit: 5 });

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("language")).toBe("en");
  });

  it("maps Mapbox response to GeocodingResult format", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mapboxResponse),
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

  it("falls back to geometry coordinates when properties.coordinates absent", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [mapboxFeatureNoCoords] }),
    });

    const results = await provider.search({
      query: "Tokyo",
      locale: "en",
      limit: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0].lat).toBe(35.6762);
    expect(results[0].lon).toBe(139.6503);
    expect(results[0].countryCode).toBe("JP");
  });

  it("returns empty array when features array is empty", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    });

    const results = await provider.search({
      query: "xyzxyz",
      locale: "en",
      limit: 5,
    });

    expect(results).toEqual([]);
  });

  it("returns empty array when features is undefined", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
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
      status: 401,
    });

    await expect(
      provider.search({ query: "Paris", locale: "en", limit: 5 })
    ).rejects.toThrow("Mapbox geocoding failed with status 401");
  });

  it("throws on network error", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(
      provider.search({ query: "Paris", locale: "en", limit: 5 })
    ).rejects.toThrow("Network error");
  });

  it("clamps limit to max 10", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    });

    await provider.search({ query: "test", locale: "en", limit: 20 });

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("limit")).toBe("10");
  });

  describe("isAvailable", () => {
    it("returns true when API responds ok", async () => {
      const mockFetch = fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: true });

      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it("returns false on network error", async () => {
      const mockFetch = fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error("timeout"));

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });
});
