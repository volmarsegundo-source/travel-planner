/**
 * Unit tests for ItineraryPlanService.
 *
 * Tests cover:
 * - getOrCreateItineraryPlan: BOLA guard, create-if-missing, return-existing
 * - recordGeneration: increment count + set generatedAt
 * - getExpeditionContext: fetches Phase 2 metadata + Phase 5 guide, builds context
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// ─── Import SUT after mocks ────────────────────────────────────────────────────

import { ItineraryPlanService } from "@/server/services/itinerary-plan.service";
import { db } from "@/server/db";
import { ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ItineraryPlanService.getOrCreateItineraryPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ForbiddenError if trip does not belong to user", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null);

    await expect(
      ItineraryPlanService.getOrCreateItineraryPlan("trip-1", "user-1", "en")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns existing ItineraryPlan if one exists", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
    const existing = {
      id: "ip-1",
      tripId: "trip-1",
      locale: "en",
      generationCount: 2,
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.itineraryPlan.findUnique.mockResolvedValue(existing as never);

    const result = await ItineraryPlanService.getOrCreateItineraryPlan(
      "trip-1",
      "user-1",
      "en"
    );

    expect(result).toEqual(existing);
    expect(prismaMock.itineraryPlan.create).not.toHaveBeenCalled();
  });

  it("creates ItineraryPlan if none exists", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
    prismaMock.itineraryPlan.findUnique.mockResolvedValue(null);
    const created = {
      id: "ip-new",
      tripId: "trip-1",
      locale: "pt-BR",
      generationCount: 0,
      generatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.itineraryPlan.create.mockResolvedValue(created as never);

    const result = await ItineraryPlanService.getOrCreateItineraryPlan(
      "trip-1",
      "user-1",
      "pt-BR"
    );

    expect(result).toEqual(created);
    expect(prismaMock.itineraryPlan.create).toHaveBeenCalledWith({
      data: { tripId: "trip-1", locale: "pt-BR", generationCount: 0 },
    });
    expect(logger.info).toHaveBeenCalledWith("itineraryPlan.created", {
      tripId: "trip-1",
      userIdHash: hashUserId("user-1"),
    });
  });
});

describe("ItineraryPlanService.recordGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments generationCount and sets generatedAt", async () => {
    const updated = {
      id: "ip-1",
      tripId: "trip-1",
      generationCount: 3,
      generatedAt: new Date(),
    };
    prismaMock.itineraryPlan.update.mockResolvedValue(updated as never);

    await ItineraryPlanService.recordGeneration("trip-1");

    expect(prismaMock.itineraryPlan.update).toHaveBeenCalledWith({
      where: { tripId: "trip-1" },
      data: {
        generationCount: { increment: 1 },
        generatedAt: expect.any(Date),
      },
    });
  });
});

describe("ItineraryPlanService.getExpeditionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if trip does not exist", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip-1",
      "user-1"
    );

    expect(result).toBeNull();
  });

  it("returns basic context without Phase 2 or Phase 5 data", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({
      tripType: "international",
      destination: "Paris",
      startDate: new Date(),
      endDate: new Date(),
    } as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(null);
    prismaMock.destinationGuide.findUnique.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip-1",
      "user-1"
    );

    expect(result).toEqual({
      tripType: "international",
      travelerType: undefined,
      accommodationStyle: undefined,
      travelPace: undefined,
      budget: undefined,
      currency: undefined,
      destinationGuideContext: undefined,
    });
  });

  it("includes Phase 2 metadata when phase is completed", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({
      tripType: "international",
      destination: "Tokyo",
      startDate: new Date(),
      endDate: new Date(),
    } as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      status: "completed",
      metadata: {
        travelerType: "solo",
        accommodationStyle: "comfort",
        travelPace: 7,
        budget: 3000,
        currency: "USD",
      },
    } as never);
    prismaMock.destinationGuide.findUnique.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip-1",
      "user-1"
    );

    expect(result?.travelerType).toBe("solo");
    expect(result?.accommodationStyle).toBe("comfort");
    expect(result?.travelPace).toBe(7);
    expect(result?.budget).toBe(3000);
    expect(result?.currency).toBe("USD");
  });

  it("excludes Phase 2 metadata when phase is not completed", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({
      tripType: "domestic",
      destination: "Rio",
      startDate: new Date(),
      endDate: new Date(),
    } as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      status: "active",
      metadata: { travelerType: "solo" },
    } as never);
    prismaMock.destinationGuide.findUnique.mockResolvedValue(null);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip-1",
      "user-1"
    );

    expect(result?.travelerType).toBeUndefined();
  });

  it("includes destination guide context when guide exists", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({
      tripType: "international",
      destination: "Tokyo",
      startDate: new Date(),
      endDate: new Date(),
    } as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(null);
    prismaMock.destinationGuide.findUnique.mockResolvedValue({
      content: {
        timezone: { title: "Timezone", icon: "🕐", summary: "JST (UTC+9)", tips: [] },
        currency: { title: "Currency", icon: "💴", summary: "Japanese Yen (JPY)", tips: [] },
        language: { title: "Language", icon: "🗣️", summary: "Japanese", tips: [] },
        cultural_tips: { title: "Culture", icon: "🏯", summary: "Bow when greeting", tips: [] },
        electricity: { title: "Electricity", icon: "🔌", summary: "100V Type A/B", tips: [] },
        connectivity: { title: "Connectivity", icon: "📶", summary: "Pocket WiFi recommended", tips: [] },
      },
    } as never);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip-1",
      "user-1"
    );

    expect(result?.destinationGuideContext).toContain("Timezone: JST (UTC+9)");
    expect(result?.destinationGuideContext).toContain("Currency: Japanese Yen (JPY)");
    expect(result?.destinationGuideContext).toContain("Culture: Bow when greeting");
    expect(result?.destinationGuideContext).toContain("Language: Japanese");
  });

  it("omits guide sections without summaries", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({
      tripType: "international",
      destination: "Berlin",
      startDate: new Date(),
      endDate: new Date(),
    } as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(null);
    prismaMock.destinationGuide.findUnique.mockResolvedValue({
      content: {
        timezone: { title: "Timezone", icon: "🕐", summary: "CET (UTC+1)", tips: [] },
        currency: { title: "Currency", icon: "💶", summary: "", tips: [] },
        language: null,
        cultural_tips: null,
        electricity: null,
        connectivity: null,
      },
    } as never);

    const result = await ItineraryPlanService.getExpeditionContext(
      "trip-1",
      "user-1"
    );

    expect(result?.destinationGuideContext).toBe("Timezone: CET (UTC+1)");
  });
});
