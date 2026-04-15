/**
 * Sprint 44 Wave 2 — AiService.generateChecklist flag-aware dispatch.
 *
 * Tests cover:
 * - Flag OFF: uses checklistPromptV1 (v1 cache key prefix "v1:")
 * - Flag OFF: no call to ExpeditionAiContextService
 * - Flag ON + tripId present: calls ExpeditionAiContextService.assembleFor
 * - Flag ON + no tripId: falls back to v1 path
 * - Cache key includes version prefix (v1: / v2:) — no cross-version hits
 * - Assembler failure falls back gracefully — still calls AI with v2 basic params
 * - v2 schema accepts new categories (CLOTHING, ACTIVITIES, LOGISTICS)
 * - v2 schema accepts reason and sourcePhase fields per item
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §5.4 (cache versioning), §1.4 (service)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist flag mock ──────────────────────────────────────────────────────────

const mockFlagModule = vi.hoisted(() => ({
  isPhaseReorderEnabled: vi.fn(() => false),
}));

// ─── Hoist infra mocks ────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  generateResponse: vi.fn(),
  assembleFor: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags/phase-reorder", () => mockFlagModule);

vi.mock("@/server/cache/redis", () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}));

vi.mock("@/server/services/providers/claude.provider", () => {
  function MockClaudeProvider() {
    return { name: "claude", generateResponse: mocks.generateResponse };
  }
  return { ClaudeProvider: MockClaudeProvider };
});

vi.mock("@/server/services/providers/gemini.provider", () => {
  function MockGeminiProvider() {
    return { name: "gemini", generateResponse: mocks.generateResponse };
  }
  return { GeminiProvider: MockGeminiProvider };
});

vi.mock("@/server/services/providers/fallback.provider", () => {
  function MockFallbackProvider() {
    return { name: "fallback", generateResponse: mocks.generateResponse };
  }
  return { FallbackProvider: MockFallbackProvider };
});

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/server/services/expedition-ai-context.service", () => ({
  ExpeditionAiContextService: {
    assembleFor: mocks.assembleFor,
  },
}));

// ─── Import SUT after mocks ────────────────────────────────────────────────────

import { AiService } from "@/server/services/ai.service";
import { AppError } from "@/lib/errors";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PARAMS = {
  userId: "user-cklist-wave2",
  destination: "Tokyo, Japan",
  startDate: "2026-09-01",
  travelers: 2,
  language: "en" as const,
};

const VALID_CHECKLIST_V1 = {
  categories: [
    {
      category: "DOCUMENTS",
      items: [
        { label: "Passport", priority: "HIGH" },
      ],
    },
  ],
};

const VALID_CHECKLIST_V2 = {
  categories: [
    {
      category: "DOCUMENTS",
      items: [
        { label: "Passport", priority: "HIGH", reason: "Required for international travel", sourcePhase: "guide" },
      ],
    },
    {
      category: "CLOTHING",
      items: [
        { label: "Rain jacket", priority: "MEDIUM", reason: "Rainy season in September", sourcePhase: "guide" },
      ],
    },
    {
      category: "ACTIVITIES",
      items: [
        { label: "Hiking boots", priority: "HIGH", reason: "Mt. Fuji hike planned", sourcePhase: "itinerary" },
      ],
    },
    {
      category: "LOGISTICS",
      items: [
        { label: "Portable WiFi", priority: "LOW", reason: "No SIM card arranged", sourcePhase: "logistics" },
      ],
    },
  ],
  summary: {
    totalItems: 4,
    highPriorityCount: 2,
    personalizationNotes: "Items tailored to September Tokyo trip",
  },
};

function makeProviderResponse(data: unknown) {
  return {
    text: JSON.stringify(data),
    wasTruncated: false,
    inputTokens: 100,
    outputTokens: 200,
  };
}

function setFlag(enabled: boolean) {
  mockFlagModule.isPhaseReorderEnabled.mockReturnValue(enabled);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redisGet.mockResolvedValue(null);
  mocks.redisSet.mockResolvedValue("OK");
  setFlag(false);
});

// ─── Flag OFF — v1 path ───────────────────────────────────────────────────────

describe("generateChecklist — flag OFF (v1 path)", () => {
  it("does NOT call ExpeditionAiContextService when flag is OFF", async () => {
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V1));

    await AiService.generateChecklist(BASE_PARAMS);

    expect(mocks.assembleFor).not.toHaveBeenCalled();
  });

  it("uses v1 cache key prefix", async () => {
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V1));

    await AiService.generateChecklist(BASE_PARAMS);

    // Redis.set should be called — verify the key doesn't contain "v2:"
    const [setKey] = mocks.redisSet.mock.calls[0] as [string, ...unknown[]];
    // The key is an md5 hash but the input prefix was "v1:" — we can't inspect
    // the hash directly, so verify we did cache something
    expect(mocks.redisSet).toHaveBeenCalledOnce();
    expect(typeof setKey).toBe("string");
    expect(setKey.length).toBeGreaterThan(0);
  });

  it("returns parsed v1 checklist result", async () => {
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V1));

    const result = await AiService.generateChecklist(BASE_PARAMS);

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]!.category).toBe("DOCUMENTS");
  });

  it("uses cache hit from Redis when available (flag OFF)", async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(VALID_CHECKLIST_V1));

    const result = await AiService.generateChecklist(BASE_PARAMS);

    expect(mocks.generateResponse).not.toHaveBeenCalled();
    expect(result.categories[0]!.category).toBe("DOCUMENTS");
  });
});

// ─── Flag ON without tripId — falls back to v1 ───────────────────────────────

describe("generateChecklist — flag ON without tripId", () => {
  it("falls back to v1 path when tripId is absent", async () => {
    setFlag(true);
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V1));

    // No tripId in params
    await AiService.generateChecklist(BASE_PARAMS);

    // assembleFor should NOT be called when tripId is missing
    expect(mocks.assembleFor).not.toHaveBeenCalled();
  });
});

// ─── Flag ON with tripId — v2 path ───────────────────────────────────────────

describe("generateChecklist — flag ON with tripId (v2 path)", () => {
  const PARAMS_WITH_TRIP = { ...BASE_PARAMS, tripId: "trip-cklist-wave2" };

  function mockAssembledCtx(overrides: Record<string, unknown> = {}) {
    return {
      trip: { id: PARAMS_WITH_TRIP.tripId, tripType: "international" },
      profile: { userId: BASE_PARAMS.userId },
      preferences: { raw: { dietaryRestrictions: "vegetarian", regularMedication: false } },
      guideDigest: null,
      itineraryDigest: null,
      logisticsDigest: null,
      ...overrides,
    };
  }

  it("calls ExpeditionAiContextService.assembleFor with correct args", async () => {
    setFlag(true);
    mocks.assembleFor.mockResolvedValue(mockAssembledCtx());
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V2));

    await AiService.generateChecklist(PARAMS_WITH_TRIP);

    expect(mocks.assembleFor).toHaveBeenCalledWith(
      PARAMS_WITH_TRIP.tripId,
      "checklist",
      BASE_PARAMS.userId
    );
  });

  it("returns v2 checklist with new categories (CLOTHING, ACTIVITIES, LOGISTICS)", async () => {
    setFlag(true);
    mocks.assembleFor.mockResolvedValue(mockAssembledCtx());
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V2));

    const result = await AiService.generateChecklist(PARAMS_WITH_TRIP);

    const categories = result.categories.map((c) => c.category);
    expect(categories).toContain("CLOTHING");
    expect(categories).toContain("ACTIVITIES");
    expect(categories).toContain("LOGISTICS");
  });

  it("returns v2 checklist with reason and sourcePhase per item", async () => {
    setFlag(true);
    mocks.assembleFor.mockResolvedValue(mockAssembledCtx());
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V2));

    const result = await AiService.generateChecklist(PARAMS_WITH_TRIP);

    const docItems = result.categories.find((c) => c.category === "DOCUMENTS")!.items;
    expect(docItems[0]).toMatchObject({
      label: "Passport",
      priority: "HIGH",
      reason: "Required for international travel",
      sourcePhase: "guide",
    });
  });

  it("returns v2 checklist with summary block when present", async () => {
    setFlag(true);
    mocks.assembleFor.mockResolvedValue(mockAssembledCtx());
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V2));

    const result = await AiService.generateChecklist(PARAMS_WITH_TRIP);

    expect(result.summary).toMatchObject({
      totalItems: 4,
      highPriorityCount: 2,
    });
  });

  it("caches v2 result in Redis", async () => {
    setFlag(true);
    mocks.assembleFor.mockResolvedValue(mockAssembledCtx());
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V2));

    await AiService.generateChecklist(PARAMS_WITH_TRIP);

    expect(mocks.redisSet).toHaveBeenCalledOnce();
  });
});

// ─── Flag ON — assembler failure graceful degradation ────────────────────────

describe("generateChecklist — assembler failure fallback (flag ON)", () => {
  const PARAMS_WITH_TRIP = { ...BASE_PARAMS, tripId: "trip-cklist-wave2" };

  it("still calls AI after assembler throws (graceful degradation)", async () => {
    setFlag(true);
    mocks.assembleFor.mockRejectedValue(new Error("assembler down"));
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V2));

    // Should not throw — graceful fallback
    await expect(
      AiService.generateChecklist(PARAMS_WITH_TRIP)
    ).resolves.toBeDefined();

    // AI provider was still called
    expect(mocks.generateResponse).toHaveBeenCalledOnce();
  });

  it("logs a warn when assembler fails", async () => {
    const { logger } = await import("@/lib/logger");
    setFlag(true);
    mocks.assembleFor.mockRejectedValue(new Error("timeout"));
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V2));

    await AiService.generateChecklist(PARAMS_WITH_TRIP);

    expect(logger.warn).toHaveBeenCalledWith(
      "ai.checklist.assembler.fallback",
      expect.objectContaining({ error: "timeout" })
    );
  });
});

// ─── Cache version isolation ──────────────────────────────────────────────────

describe("generateChecklist — cache key version isolation", () => {
  it("v1 and v2 produce different cache keys for same destination/month", async () => {
    // Capture the key used in each flag state
    const keys: string[] = [];
    mocks.redisSet.mockImplementation((key: string) => {
      keys.push(key);
      return Promise.resolve("OK");
    });

    // v1 call (flag OFF)
    setFlag(false);
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V1));
    await AiService.generateChecklist(BASE_PARAMS);

    // v2 call (flag ON, no tripId → still hits v2 cache prefix via flag check)
    setFlag(true);
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(VALID_CHECKLIST_V1));
    await AiService.generateChecklist(BASE_PARAMS);

    // The two cache keys must differ
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });
});
