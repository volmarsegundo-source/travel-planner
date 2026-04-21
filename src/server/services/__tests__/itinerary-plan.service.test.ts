import { describe, it, expect, vi, beforeEach } from "vitest";

// Wave 2.8b — ItineraryPlanService branch coverage tests
// Target: itinerary-plan.service.ts 59% branches → ~90% branches

const {
  mockTripFindFirst,
  mockItineraryPlanFindUnique,
  mockItineraryPlanCreate,
  mockItineraryPlanUpdate,
  mockExpeditionPhaseFindUnique,
  mockDestinationGuideFindUnique,
  mockAssembleFor,
  mockIsPhaseReorderEnabled,
  mockFormatGuideDigest,
  mockLoggerInfo,
  mockLoggerWarn,
} = vi.hoisted(() => ({
  mockTripFindFirst: vi.fn(),
  mockItineraryPlanFindUnique: vi.fn(),
  mockItineraryPlanCreate: vi.fn(),
  mockItineraryPlanUpdate: vi.fn(),
  mockExpeditionPhaseFindUnique: vi.fn(),
  mockDestinationGuideFindUnique: vi.fn(),
  mockAssembleFor: vi.fn(),
  mockIsPhaseReorderEnabled: vi.fn(),
  mockFormatGuideDigest: vi.fn((_d: unknown) => "DIGEST_TEXT"),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    trip: { findFirst: mockTripFindFirst },
    itineraryPlan: {
      findUnique: mockItineraryPlanFindUnique,
      create: mockItineraryPlanCreate,
      update: mockItineraryPlanUpdate,
    },
    expeditionPhase: { findUnique: mockExpeditionPhaseFindUnique },
    destinationGuide: { findUnique: mockDestinationGuideFindUnique },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo, warn: mockLoggerWarn, error: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({ hashUserId: (id: string) => `hash_${id}` }));

vi.mock("@/lib/flags/phase-reorder", () => ({
  isPhaseReorderEnabled: mockIsPhaseReorderEnabled,
}));

vi.mock("@/server/services/expedition-ai-context.service", () => ({
  ExpeditionAiContextService: { assembleFor: mockAssembleFor },
}));

vi.mock("@/lib/prompts/digest", () => ({
  formatGuideDigest: mockFormatGuideDigest,
}));

import { ItineraryPlanService } from "../itinerary-plan.service";
import { ForbiddenError } from "@/lib/errors";

describe("ItineraryPlanService.getOrCreateItineraryPlan — branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ForbiddenError when trip is not owned by user (BOLA guard)", async () => {
    mockTripFindFirst.mockResolvedValue(null);

    await expect(
      ItineraryPlanService.getOrCreateItineraryPlan("trip_1", "user_1", "pt-BR")
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mockItineraryPlanFindUnique).not.toHaveBeenCalled();
    expect(mockItineraryPlanCreate).not.toHaveBeenCalled();
  });

  it("returns existing plan without creating a new one (existing branch)", async () => {
    mockTripFindFirst.mockResolvedValue({ id: "trip_1" });
    const existing = { id: "plan_1", tripId: "trip_1", generationCount: 2 };
    mockItineraryPlanFindUnique.mockResolvedValue(existing);

    const result = await ItineraryPlanService.getOrCreateItineraryPlan(
      "trip_1",
      "user_1",
      "pt-BR"
    );

    expect(result).toBe(existing);
    expect(mockItineraryPlanCreate).not.toHaveBeenCalled();
  });

  it("creates a new plan when none exists", async () => {
    mockTripFindFirst.mockResolvedValue({ id: "trip_1" });
    mockItineraryPlanFindUnique.mockResolvedValue(null);
    const created = { id: "plan_new", tripId: "trip_1", generationCount: 0 };
    mockItineraryPlanCreate.mockResolvedValue(created);

    const result = await ItineraryPlanService.getOrCreateItineraryPlan(
      "trip_1",
      "user_1",
      "pt-BR"
    );

    expect(result).toBe(created);
    expect(mockItineraryPlanCreate).toHaveBeenCalledWith({
      data: { tripId: "trip_1", locale: "pt-BR", generationCount: 0 },
    });
  });
});

describe("ItineraryPlanService.getExpeditionContext — branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when trip is not found or not owned", async () => {
    mockTripFindFirst.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip_1",
      "user_1"
    );

    expect(result).toBeNull();
    expect(mockExpeditionPhaseFindUnique).not.toHaveBeenCalled();
  });

  it("ignores phase2 metadata when status is not completed (ternary false)", async () => {
    mockTripFindFirst.mockResolvedValue({
      tripType: "international",
      destination: "Paris",
      startDate: new Date(),
      endDate: new Date(),
    });
    mockExpeditionPhaseFindUnique.mockResolvedValue({
      status: "active",
      metadata: { travelerType: "solo", budget: 5000 },
    });
    mockDestinationGuideFindUnique.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip_1",
      "user_1"
    );

    expect(result?.travelerType).toBeUndefined();
    expect(result?.budget).toBeUndefined();
    expect(result?.destinationGuideContext).toBeUndefined();
  });

  it("uses phase2 metadata when status is completed (ternary true)", async () => {
    mockTripFindFirst.mockResolvedValue({
      tripType: "international", destination: "Paris",
      startDate: new Date(), endDate: new Date(),
    });
    mockExpeditionPhaseFindUnique.mockResolvedValue({
      status: "completed",
      metadata: {
        travelerType: "solo",
        accommodationStyle: "hotel",
        travelPace: 3,
        budget: 5000,
        currency: "EUR",
      },
    });
    mockDestinationGuideFindUnique.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip_1",
      "user_1"
    );

    expect(result?.travelerType).toBe("solo");
    expect(result?.accommodationStyle).toBe("hotel");
    expect(result?.travelPace).toBe(3);
    expect(result?.budget).toBe(5000);
    expect(result?.currency).toBe("EUR");
  });

  it("builds guideContext from v2 guide (all optional fields present)", async () => {
    mockTripFindFirst.mockResolvedValue({
      tripType: "international", destination: "Paris",
      startDate: new Date(), endDate: new Date(),
    });
    mockExpeditionPhaseFindUnique.mockResolvedValue(null);
    mockDestinationGuideFindUnique.mockResolvedValue({
      content: {
        destination: { name: "Paris" },
        quickFacts: {
          timezone: { value: "CET" },
          currency: { value: "EUR" },
          language: { value: "French" },
          climate: { value: "temperate" },
          plugType: { value: "C/E" },
          dialCode: { value: "+33" },
        },
        culturalTips: ["Greet with kisses"],
        safety: { level: "high" },
        localTransport: { options: ["metro", "bus"] },
        mustSee: [],
        documentation: {},
        dailyCosts: {},
      },
    });

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip_1",
      "user_1"
    );

    expect(result?.destinationGuideContext).toContain("Timezone: CET");
    expect(result?.destinationGuideContext).toContain("Currency: EUR");
    expect(result?.destinationGuideContext).toContain("Language: French");
    expect(result?.destinationGuideContext).toContain("Culture: Greet with kisses");
    expect(result?.destinationGuideContext).toContain("Safety: high");
    expect(result?.destinationGuideContext).toContain("Transport: metro, bus");
  });

  it("builds guideContext from v1 guide (flat format)", async () => {
    mockTripFindFirst.mockResolvedValue({
      tripType: "international", destination: "Paris",
      startDate: new Date(), endDate: new Date(),
    });
    mockExpeditionPhaseFindUnique.mockResolvedValue(null);
    // v1 lacks the v2 discriminators (destination/quickFacts/mustSee)
    mockDestinationGuideFindUnique.mockResolvedValue({
      content: {
        timezone: { summary: "GMT-3" },
        currency: { summary: "BRL" },
        cultural_tips: { summary: "Be relaxed" },
        language: { summary: "Portuguese" },
        safety: { summary: "Moderate" },
        transport_overview: { summary: "Taxis common" },
      },
    });

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip_1",
      "user_1"
    );

    expect(result?.destinationGuideContext).toContain("Timezone: GMT-3");
    expect(result?.destinationGuideContext).toContain("Currency: BRL");
    expect(result?.destinationGuideContext).toContain("Culture: Be relaxed");
    expect(result?.destinationGuideContext).toContain("Language: Portuguese");
    expect(result?.destinationGuideContext).toContain("Safety: Moderate");
    expect(result?.destinationGuideContext).toContain("Transport: Taxis common");
  });

  it("returns undefined guideContext when v1 guide has no usable parts (parts.length === 0)", async () => {
    mockTripFindFirst.mockResolvedValue({
      tripType: "international", destination: "Paris",
      startDate: new Date(), endDate: new Date(),
    });
    mockExpeditionPhaseFindUnique.mockResolvedValue(null);
    // v1 guide with every section empty — parts stays empty
    mockDestinationGuideFindUnique.mockResolvedValue({
      content: {
        timezone: { summary: "" },
        currency: {},
      },
    });

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip_1",
      "user_1"
    );

    expect(result?.destinationGuideContext).toBeUndefined();
  });
});

describe("ItineraryPlanService.getExpeditionContextForItinerary — branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to legacy path when phase-reorder flag is OFF", async () => {
    mockIsPhaseReorderEnabled.mockReturnValue(false);
    mockTripFindFirst.mockResolvedValue({
      tripType: "domestic", destination: "Rio",
      startDate: new Date(), endDate: new Date(),
    });
    mockExpeditionPhaseFindUnique.mockResolvedValue(null);
    mockDestinationGuideFindUnique.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(
      "trip_1",
      "user_1"
    );

    expect(mockAssembleFor).not.toHaveBeenCalled();
    expect(result?.tripType).toBe("domestic");
  });

  it("uses assembler and formats guide digest when flag ON and ctx.guideDigest present", async () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    mockAssembleFor.mockResolvedValue({
      trip: { tripType: "international" },
      preferences: {
        raw: {
          travelerType: "couple",
          accommodationStyle: "boutique",
          travelPace: 4,
          budget: 8000,
          currency: "USD",
        },
      },
      guideDigest: { destination: "Paris", sections: [] },
    });

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(
      "trip_1",
      "user_1"
    );

    expect(mockFormatGuideDigest).toHaveBeenCalledOnce();
    expect(result?.destinationGuideContext).toBe("DIGEST_TEXT");
    expect(result?.tripType).toBe("international");
    expect(result?.travelerType).toBe("couple");
    expect(result?.accommodationStyle).toBe("boutique");
    expect(result?.travelPace).toBe(4);
    expect(result?.budget).toBe(8000);
    expect(result?.currency).toBe("USD");
  });

  it("leaves destinationGuideContext undefined when ctx.guideDigest is missing (flag ON)", async () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    mockAssembleFor.mockResolvedValue({
      trip: { tripType: "domestic" },
      preferences: { raw: {} },
      guideDigest: null,
    });

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(
      "trip_1",
      "user_1"
    );

    expect(mockFormatGuideDigest).not.toHaveBeenCalled();
    expect(result?.destinationGuideContext).toBeUndefined();
  });

  it("falls back to legacy path and logs warn when assembler throws (catch branch)", async () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    mockAssembleFor.mockRejectedValue(new Error("assembler boom"));
    mockTripFindFirst.mockResolvedValue({
      tripType: "domestic", destination: "Rio",
      startDate: new Date(), endDate: new Date(),
    });
    mockExpeditionPhaseFindUnique.mockResolvedValue(null);
    mockDestinationGuideFindUnique.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContextForItinerary(
      "trip_1",
      "user_1"
    );

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "itineraryPlan.getContextForItinerary.assemblerFallback",
      expect.objectContaining({ tripId: "trip_1", error: "assembler boom" })
    );
    expect(result?.tripType).toBe("domestic");
  });
});
