/**
 * Sprint 44 Wave 2 — ItineraryPlanService.getExpeditionContextForItinerary tests.
 *
 * Tests cover:
 * - Flag OFF: delegates to legacy getExpeditionContext
 * - Flag ON: uses ExpeditionAiContextService.assembleFor
 * - Flag ON + assembler success: formats guide digest and populates destinationGuideContext
 * - Flag ON + assembler throws: falls back to legacy getExpeditionContext
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §1.4
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoist flag mock ──────────────────────────────────────────────────────────

const mockFlagModule = vi.hoisted(() => ({
  isPhaseReorderEnabled: vi.fn(() => false),
}));

// ─── Hoist assembler and digest mocks ────────────────────────────────────────

const {
  mockAssembleFor,
  mockFormatGuideDigest,
} = vi.hoisted(() => ({
  mockAssembleFor: vi.fn(),
  mockFormatGuideDigest: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags/phase-reorder", () => mockFlagModule);

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/server/services/expedition-ai-context.service", () => ({
  ExpeditionAiContextService: {
    assembleFor: mockAssembleFor,
  },
}));

vi.mock("@/lib/prompts/digest", () => ({
  formatGuideDigest: mockFormatGuideDigest,
  buildGuideDigest: vi.fn(),
  buildItineraryDigest: vi.fn(),
  buildLogisticsDigest: vi.fn(),
}));

// ─── Import SUT after mocks ────────────────────────────────────────────────────

import { ItineraryPlanService } from "@/server/services/itinerary-plan.service";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-itin-wave2";
const USER_ID = "user-itin-wave2";

function setFlag(enabled: boolean) {
  mockFlagModule.isPhaseReorderEnabled.mockReturnValue(enabled);
}

// A minimal assembled context that the assembler returns when flag is ON
function buildAssemblerCtx(overrides: Record<string, unknown> = {}) {
  return {
    trip: {
      id: TRIP_ID,
      destination: "Tokyo",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      tripType: "international",
    },
    profile: { userId: USER_ID },
    preferences: {
      raw: {
        travelerType: "couple",
        accommodationStyle: "comfort",
        travelPace: 5,
        budget: 3000,
        currency: "USD",
      },
    },
    guideDigest: null,
    itineraryDigest: null,
    logisticsDigest: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setFlag(false);
});

// ─── Flag OFF — delegates to legacy ──────────────────────────────────────────

describe("getExpeditionContextForItinerary — flag OFF", () => {
  it("calls the legacy getExpeditionContext path when flag is OFF", async () => {
    setFlag(false);

    // For the legacy path, db is called directly — mock the relevant queries
    prismaMock.trip.findFirst.mockResolvedValue({
      id: TRIP_ID,
      tripType: "international",
      destination: "Tokyo",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
    } as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      status: "completed",
      metadata: {
        travelerType: "couple",
        accommodationStyle: "comfort",
        travelPace: 5,
        budget: 3000,
        currency: "USD",
      },
    } as never);
    prismaMock.destinationGuide.findUnique.mockResolvedValue(null as never);

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(TRIP_ID, USER_ID);

    // Legacy path should NOT call the assembler
    expect(mockAssembleFor).not.toHaveBeenCalled();
    // Should return trip type from legacy
    expect(result).toMatchObject({ tripType: "international" });
  });

  it("returns null when trip not found in legacy path", async () => {
    setFlag(false);
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(TRIP_ID, USER_ID);

    expect(result).toBeNull();
    expect(mockAssembleFor).not.toHaveBeenCalled();
  });
});

// ─── Flag ON — uses assembler ─────────────────────────────────────────────────

describe("getExpeditionContextForItinerary — flag ON", () => {
  it("calls ExpeditionAiContextService.assembleFor with correct args", async () => {
    setFlag(true);
    mockAssembleFor.mockResolvedValue(buildAssemblerCtx());

    await ItineraryPlanService.getExpeditionContextForItinerary(TRIP_ID, USER_ID);

    expect(mockAssembleFor).toHaveBeenCalledWith(TRIP_ID, "itinerary", USER_ID);
  });

  it("maps assembler result to ExpeditionContext shape", async () => {
    setFlag(true);
    mockAssembleFor.mockResolvedValue(buildAssemblerCtx());
    mockFormatGuideDigest.mockReturnValue(undefined);

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(TRIP_ID, USER_ID);

    expect(result).toMatchObject({
      tripType: "international",
      travelerType: "couple",
      accommodationStyle: "comfort",
      travelPace: 5,
      budget: 3000,
      currency: "USD",
    });
  });

  it("populates destinationGuideContext when assembler returns guide digest", async () => {
    setFlag(true);
    const guideDigest = { timezone: "JST", currency: "JPY" };
    mockAssembleFor.mockResolvedValue(buildAssemblerCtx({ guideDigest }));
    mockFormatGuideDigest.mockReturnValue("Timezone: JST. Currency: JPY");

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(TRIP_ID, USER_ID);

    expect(mockFormatGuideDigest).toHaveBeenCalledWith(guideDigest);
    expect(result).toMatchObject({ destinationGuideContext: "Timezone: JST. Currency: JPY" });
  });

  it("omits destinationGuideContext when assembler returns no guide digest", async () => {
    setFlag(true);
    mockAssembleFor.mockResolvedValue(buildAssemblerCtx({ guideDigest: null }));

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(TRIP_ID, USER_ID);

    expect(result?.destinationGuideContext).toBeUndefined();
  });
});

// ─── Flag ON — assembler failure fallback ────────────────────────────────────

describe("getExpeditionContextForItinerary — assembler failure fallback", () => {
  it("falls back to legacy getExpeditionContext when assembler throws", async () => {
    setFlag(true);
    mockAssembleFor.mockRejectedValue(new Error("assembler failure"));

    // Mock legacy db calls for the fallback path
    prismaMock.trip.findFirst.mockResolvedValue({
      id: TRIP_ID,
      tripType: "domestic",
      destination: "São Paulo",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
    } as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      status: "active",
      metadata: null,
    } as never);
    prismaMock.destinationGuide.findUnique.mockResolvedValue(null as never);

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(TRIP_ID, USER_ID);

    // Should not propagate the error — graceful degradation
    expect(result).toMatchObject({ tripType: "domestic" });
  });

  it("logs a warn when assembler fails", async () => {
    const { logger } = await import("@/lib/logger");
    setFlag(true);
    mockAssembleFor.mockRejectedValue(new Error("network timeout"));

    prismaMock.trip.findFirst.mockResolvedValue({
      id: TRIP_ID,
      tripType: "international",
      destination: "Paris",
      startDate: "2026-11-01",
      endDate: "2026-11-05",
    } as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(null as never);
    prismaMock.destinationGuide.findUnique.mockResolvedValue(null as never);

    await ItineraryPlanService.getExpeditionContextForItinerary(TRIP_ID, USER_ID);

    expect(logger.warn).toHaveBeenCalledWith(
      "itineraryPlan.getContextForItinerary.assemblerFallback",
      expect.objectContaining({ tripId: TRIP_ID, error: "network timeout" })
    );
  });
});
