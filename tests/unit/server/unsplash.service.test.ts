/**
 * Unit tests for UnsplashService.
 *
 * All external dependencies (Redis, fetch) are mocked so these tests
 * run in isolation with no infrastructure required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mock handles ──────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/cache/redis", () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ─── Test data ────────────────────────────────────────────────────────────────

const MOCK_PHOTO = {
  urls: { regular: "https://images.unsplash.com/photo-1?w=1080", small: "https://images.unsplash.com/photo-1?w=400", raw: "https://images.unsplash.com/photo-1" },
  user: { name: "John Doe", links: { html: "https://unsplash.com/@johndoe" } },
  links: { html: "https://unsplash.com/photos/abc123" },
  width: 4000,
  height: 2667,
  likes: 150,
};

const MOCK_PORTRAIT_PHOTO = {
  ...MOCK_PHOTO,
  width: 800,
  height: 1200,
  likes: 50,
};

const MOCK_LOW_RES_PHOTO = {
  ...MOCK_PHOTO,
  width: 800,
  height: 600,
  likes: 200,
};

const MOCK_API_RESPONSE = {
  results: [MOCK_PHOTO],
  total: 1,
  total_pages: 1,
};

const CACHED_RESULT = {
  url: "https://images.unsplash.com/photo-cached&w=1200&q=80&fit=crop&auto=format",
  photographerName: "Cached User",
  photographerUrl: "https://unsplash.com/@cached?utm_source=atlas_travel_planner&utm_medium=referral",
  unsplashUrl: "https://unsplash.com/photos/cached?utm_source=atlas_travel_planner&utm_medium=referral",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchSuccess(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    })
  );
}

function mockFetchError(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({}),
    })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("UnsplashService", () => {
  const originalEnv = process.env.UNSPLASH_ACCESS_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.UNSPLASH_ACCESS_KEY = "test-unsplash-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnv !== undefined) {
      process.env.UNSPLASH_ACCESS_KEY = originalEnv;
    } else {
      delete process.env.UNSPLASH_ACCESS_KEY;
    }
  });

  // Re-import on each test to pick up env changes
  async function getService() {
    // Force re-evaluation of the module to pick up env var changes
    vi.resetModules();
    const mod = await import("@/server/services/unsplash.service");
    return mod.UnsplashService;
  }

  describe("getDestinationImage", () => {
    it("returns null when UNSPLASH_ACCESS_KEY is not set", async () => {
      delete process.env.UNSPLASH_ACCESS_KEY;
      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("Paris");
      expect(result).toBeNull();
    });

    it("returns cached result when Redis has a hit", async () => {
      mocks.redisGet.mockResolvedValue(JSON.stringify(CACHED_RESULT));
      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("Paris");

      expect(result).toEqual(CACHED_RESULT);
      expect(mocks.redisGet).toHaveBeenCalledWith("img:dest:paris");
    });

    it("normalizes destination for cache key (trim + lowercase + spaces to underscore)", async () => {
      mocks.redisGet.mockResolvedValue(JSON.stringify(CACHED_RESULT));
      const UnsplashService = await getService();
      await UnsplashService.getDestinationImage("  Rio de  Janeiro  ");

      expect(mocks.redisGet).toHaveBeenCalledWith("img:dest:rio_de_janeiro");
    });

    it("calls Unsplash API on cache miss and returns formatted result", async () => {
      mocks.redisGet.mockResolvedValue(null);
      mocks.redisSet.mockResolvedValue("OK");
      mockFetchSuccess(MOCK_API_RESPONSE);

      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("Paris");

      expect(result).not.toBeNull();
      expect(result!.url).toContain("photo-1");
      expect(result!.url).toContain("w=1200");
      expect(result!.url).toContain("q=80");
      expect(result!.photographerName).toBe("John Doe");
      expect(result!.photographerUrl).toContain("utm_source=atlas_travel_planner");
      expect(result!.unsplashUrl).toContain("utm_source=atlas_travel_planner");
    });

    it("caches result in Redis with 7-day TTL after API call", async () => {
      mocks.redisGet.mockResolvedValue(null);
      mocks.redisSet.mockResolvedValue("OK");
      mockFetchSuccess(MOCK_API_RESPONSE);

      const UnsplashService = await getService();
      await UnsplashService.getDestinationImage("Tokyo");

      expect(mocks.redisSet).toHaveBeenCalledWith(
        "img:dest:tokyo",
        expect.any(String),
        "EX",
        604800 // 7 * 24 * 60 * 60
      );
    });

    it("prefers landscape photos with sufficient resolution sorted by likes", async () => {
      const highLikesLandscape = { ...MOCK_PHOTO, likes: 500, urls: { ...MOCK_PHOTO.urls, raw: "https://images.unsplash.com/best" } };
      const lowLikesLandscape = { ...MOCK_PHOTO, likes: 10, urls: { ...MOCK_PHOTO.urls, raw: "https://images.unsplash.com/low" } };

      mocks.redisGet.mockResolvedValue(null);
      mocks.redisSet.mockResolvedValue("OK");
      mockFetchSuccess({
        results: [lowLikesLandscape, MOCK_PORTRAIT_PHOTO, highLikesLandscape],
        total: 3,
        total_pages: 1,
      });

      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("Barcelona");

      expect(result!.url).toContain("best");
    });

    it("falls back to first photo when no landscape photos meet criteria", async () => {
      mocks.redisGet.mockResolvedValue(null);
      mocks.redisSet.mockResolvedValue("OK");
      mockFetchSuccess({
        results: [MOCK_LOW_RES_PHOTO, MOCK_PORTRAIT_PHOTO],
        total: 2,
        total_pages: 1,
      });

      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("SmallTown");

      // Should fallback to first photo (MOCK_LOW_RES_PHOTO)
      expect(result).not.toBeNull();
    });

    it("returns null when API returns non-OK status", async () => {
      mocks.redisGet.mockResolvedValue(null);
      mockFetchError(429);

      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("Paris");

      expect(result).toBeNull();
    });

    it("returns null when API returns empty results", async () => {
      mocks.redisGet.mockResolvedValue(null);
      mockFetchSuccess({ results: [], total: 0, total_pages: 0 });

      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("Nonexistent Place");

      expect(result).toBeNull();
    });

    it("returns null when fetch throws (network error or timeout)", async () => {
      mocks.redisGet.mockResolvedValue(null);
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Timeout")));

      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("Paris");

      expect(result).toBeNull();
    });

    it("continues to API when Redis cache read fails", async () => {
      mocks.redisGet.mockRejectedValue(new Error("Redis down"));
      mocks.redisSet.mockResolvedValue("OK");
      mockFetchSuccess(MOCK_API_RESPONSE);

      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("London");

      expect(result).not.toBeNull();
      expect(result!.photographerName).toBe("John Doe");
    });

    it("returns API result even when Redis cache write fails", async () => {
      mocks.redisGet.mockResolvedValue(null);
      mocks.redisSet.mockRejectedValue(new Error("Redis write fail"));
      mockFetchSuccess(MOCK_API_RESPONSE);

      const UnsplashService = await getService();
      const result = await UnsplashService.getDestinationImage("Rome");

      expect(result).not.toBeNull();
      expect(result!.photographerName).toBe("John Doe");
    });

    it("includes correct Unsplash API headers", async () => {
      mocks.redisGet.mockResolvedValue(null);
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_API_RESPONSE),
      });
      vi.stubGlobal("fetch", fetchMock);
      mocks.redisSet.mockResolvedValue("OK");

      const UnsplashService = await getService();
      await UnsplashService.getDestinationImage("Paris");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("api.unsplash.com/search/photos"),
        expect.objectContaining({
          headers: { Authorization: "Client-ID test-unsplash-key" },
        })
      );
    });

    it("encodes destination in the search query", async () => {
      mocks.redisGet.mockResolvedValue(null);
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [], total: 0, total_pages: 0 }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const UnsplashService = await getService();
      await UnsplashService.getDestinationImage("São Paulo");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("S%C3%A3o%20Paulo");
      expect(calledUrl).toContain("landmark%20skyline");
    });
  });
});
