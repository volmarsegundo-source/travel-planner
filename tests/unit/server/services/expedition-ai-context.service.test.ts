/**
 * Unit tests for ExpeditionAiContextService — Sprint 44 Wave 1.
 *
 * Tests cover:
 * - Trip not found → NotFoundError
 * - BOLA guard: wrong userId → ForbiddenError
 * - targetPhase="guide": returns trip + profile + preferences, no digests
 * - targetPhase="itinerary": returns + guideDigest (when guide exists)
 * - targetPhase="itinerary": graceful degradation when guide is absent
 * - targetPhase="checklist": returns all digests
 * - targetPhase="checklist": graceful degradation when all upstream phases absent
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §1.3
 * Spec ref: SPEC-ARCH-REORDER-PHASES §10.2
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock injection guard — pass through for tests
vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: (text: string) => text,
  checkPromptInjection: () => ({ safe: true, sanitized: "", warnings: [] }),
}));

// ─── Imports after mock ───────────────────────────────────────────────────────

import { db } from "@/server/db";
import { ExpeditionAiContextService } from "@/server/services/expedition-ai-context.service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc-123";
const USER_ID = "user-xyz-456";
const OTHER_USER_ID = "user-other-789";

function makeUserProfile() {
  return {
    userId: USER_ID,
    birthDate: new Date("1990-05-15"),
    country: "Brazil",
    city: "São Paulo",
    dietaryRestrictions: "vegetarian",
    accessibility: null,
    completionScore: 80,
    preferences: { travel_style: ["adventure"] },
    phone: null,
    address: null,
    passportNumberEnc: null,
    passportExpiry: null,
    nationalIdEnc: null,
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeTrip(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: TRIP_ID,
    userId: USER_ID,
    title: "Test Trip",
    destination: "Tokyo, Japan",
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-07-10"),
    tripType: "international",
    passengers: null,
    origin: "São Paulo, Brazil",
    localMobility: ["metro", "walking"],
    destinationLat: 35.6762,
    destinationLon: 139.6503,
    currentPhase: 3,
    expeditionMode: true,
    description: null,
    coverGradient: "sunset",
    coverEmoji: "✈️",
    status: "PLANNING",
    visibility: "PRIVATE",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    user: {
      id: USER_ID,
      email: "test@example.com",
      profile: makeUserProfile(),
    },
    destinationGuide: null,
    itineraryDays: [],
    transportSegments: [],
    accommodations: [],
    ...overrides,
  };
}

function makeGuideContent() {
  return {
    quickFacts: {
      climate: "Temperate, 25-32°C in July",
      plugType: "Type A/B, 100V",
      currency: "JPY",
      dialCode: "+81",
    },
    safety: {
      level: "safe",
      vaccines: "None required",
    },
    mustSee: [
      { category: "culture", name: "Senso-ji" },
      { category: "food", name: "Tsukiji" },
      { category: "technology", name: "Akihabara" },
    ],
  };
}

function makeItineraryDays() {
  return [
    {
      id: "day-1",
      tripId: TRIP_ID,
      dayNumber: 1,
      date: new Date("2026-07-01"),
      notes: null,
      isTransit: false,
      transitFrom: null,
      transitTo: null,
      destinationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      activities: [
        {
          id: "act-1",
          dayId: "day-1",
          activityType: "SIGHTSEEING",
          title: "Temple visit",
          notes: null,
          startTime: "09:00",
          endTime: "11:00",
          orderIndex: 0,
          isManual: false,
          latitude: null,
          longitude: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    {
      id: "day-2",
      tripId: TRIP_ID,
      dayNumber: 2,
      date: new Date("2026-07-02"),
      notes: null,
      isTransit: false,
      transitFrom: null,
      transitTo: null,
      destinationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      activities: [
        {
          id: "act-2",
          dayId: "day-2",
          activityType: "FOOD",
          title: "Ramen experience",
          notes: null,
          startTime: null,
          endTime: null,
          orderIndex: 0,
          isManual: false,
          latitude: null,
          longitude: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  ];
}

function makeTransportSegments() {
  return [
    {
      id: "seg-1",
      tripId: TRIP_ID,
      segmentOrder: 0,
      transportType: "flight",
      departurePlace: "São Paulo",
      arrivalPlace: "Tokyo",
      departureAt: new Date("2026-07-01"),
      arrivalAt: new Date("2026-07-01"),
      provider: "ANA",
      bookingCodeEnc: null,
      estimatedCost: null,
      currency: null,
      notes: null,
      isReturn: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

function makeAccommodations() {
  return [
    {
      id: "acc-1",
      tripId: TRIP_ID,
      accommodationType: "hotel",
      name: "Park Hyatt Tokyo",
      checkIn: new Date("2026-07-01"),
      checkOut: new Date("2026-07-10"),
      bookingCodeEnc: null,
      estimatedCostPerNight: null,
      currency: null,
      notes: null,
      undecided: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExpeditionAiContextService.assembleFor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Not found ───────────────────────────────────────────────────────────────

  it("throws NotFoundError when trip does not exist", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(null);

    await expect(
      ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID)
    ).rejects.toThrow(NotFoundError);
  });

  // ── BOLA guard ──────────────────────────────────────────────────────────────

  it("throws ForbiddenError when userId does not match trip owner", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(makeTrip() as never);

    await expect(
      ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", OTHER_USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it("does NOT throw ForbiddenError when userId matches trip owner", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(makeTrip() as never);

    await expect(
      ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID)
    ).resolves.not.toThrow();
  });

  it("skips BOLA check when userId is not provided", async () => {
    // A trip owned by a different user should still be accessible
    const tripOwnedByOther = makeTrip({ userId: OTHER_USER_ID });
    prismaMock.trip.findUnique.mockResolvedValue(tripOwnedByOther as never);

    await expect(
      ExpeditionAiContextService.assembleFor(TRIP_ID, "guide")
    ).resolves.not.toThrow();
  });

  // ── targetPhase="guide" ─────────────────────────────────────────────────────

  describe('targetPhase="guide"', () => {
    beforeEach(() => {
      prismaMock.trip.findUnique.mockResolvedValue(makeTrip() as never);
    });

    it("returns targetPhase='guide'", async () => {
      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID);
      expect(ctx.targetPhase).toBe("guide");
    });

    it("returns trip core data", async () => {
      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID);
      expect(ctx.trip.id).toBe(TRIP_ID);
      expect(ctx.trip.destination).toBe("Tokyo, Japan");
      expect(ctx.trip.tripType).toBe("international");
    });

    it("returns profile core data", async () => {
      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID);
      expect(ctx.profile.userId).toBe(USER_ID);
      expect(ctx.profile.country).toBe("Brazil");
      expect(ctx.profile.dietaryRestrictions).toBe("vegetarian");
    });

    it("returns preferences from profile.preferences JSON", async () => {
      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID);
      expect(ctx.preferences.raw).toHaveProperty("travel_style");
    });

    it("does NOT include guideDigest", async () => {
      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID);
      expect(ctx.guideDigest).toBeUndefined();
    });

    it("does NOT include itineraryDigest", async () => {
      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID);
      expect(ctx.itineraryDigest).toBeUndefined();
    });

    it("does NOT include logisticsDigest", async () => {
      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID);
      expect(ctx.logisticsDigest).toBeUndefined();
    });
  });

  // ── targetPhase="itinerary" ─────────────────────────────────────────────────

  describe('targetPhase="itinerary"', () => {
    it("includes guideDigest when guide exists", async () => {
      const trip = makeTrip({
        destinationGuide: {
          id: "guide-1",
          tripId: TRIP_ID,
          content: makeGuideContent(),
          destination: "Tokyo",
          locale: "pt-BR",
          generationCount: 1,
          viewedSections: [],
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          extraCategories: [],
          personalNotes: null,
          regenCount: 0,
          destinationId: null,
        },
      });
      prismaMock.trip.findUnique.mockResolvedValue(trip as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "itinerary", USER_ID);

      expect(ctx.guideDigest).toBeDefined();
      expect(ctx.guideDigest!.currencyLocal).toBe("JPY");
      expect(ctx.guideDigest!.safetyLevel).toBe("safe");
    });

    it("omits guideDigest (undefined) when no guide exists — graceful degradation", async () => {
      prismaMock.trip.findUnique.mockResolvedValue(makeTrip() as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "itinerary", USER_ID);

      expect(ctx.guideDigest).toBeUndefined();
    });

    it("does NOT include itineraryDigest", async () => {
      prismaMock.trip.findUnique.mockResolvedValue(makeTrip() as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "itinerary", USER_ID);
      expect(ctx.itineraryDigest).toBeUndefined();
    });

    it("does NOT include logisticsDigest", async () => {
      prismaMock.trip.findUnique.mockResolvedValue(makeTrip() as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "itinerary", USER_ID);
      expect(ctx.logisticsDigest).toBeUndefined();
    });
  });

  // ── targetPhase="checklist" ─────────────────────────────────────────────────

  describe('targetPhase="checklist"', () => {
    it("includes all three digests when all upstream phases have data", async () => {
      const trip = makeTrip({
        destinationGuide: {
          id: "guide-1",
          tripId: TRIP_ID,
          content: makeGuideContent(),
          destination: "Tokyo",
          locale: "pt-BR",
          generationCount: 1,
          viewedSections: [],
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          extraCategories: [],
          personalNotes: null,
          regenCount: 0,
          destinationId: null,
        },
        itineraryDays: makeItineraryDays(),
        transportSegments: makeTransportSegments(),
        accommodations: makeAccommodations(),
      });
      prismaMock.trip.findUnique.mockResolvedValue(trip as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "checklist", USER_ID);

      expect(ctx.guideDigest).toBeDefined();
      expect(ctx.itineraryDigest).toBeDefined();
      expect(ctx.logisticsDigest).toBeDefined();
    });

    it("guideDigest has correct currency when guide exists", async () => {
      const trip = makeTrip({
        destinationGuide: {
          id: "guide-1",
          tripId: TRIP_ID,
          content: makeGuideContent(),
          destination: "Tokyo",
          locale: "pt-BR",
          generationCount: 1,
          viewedSections: [],
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          extraCategories: [],
          personalNotes: null,
          regenCount: 0,
          destinationId: null,
        },
        itineraryDays: makeItineraryDays(),
        transportSegments: makeTransportSegments(),
        accommodations: makeAccommodations(),
      });
      prismaMock.trip.findUnique.mockResolvedValue(trip as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "checklist", USER_ID);

      expect(ctx.guideDigest!.currencyLocal).toBe("JPY");
    });

    it("itineraryDigest reflects itinerary days activity types", async () => {
      const trip = makeTrip({
        destinationGuide: {
          id: "guide-1",
          tripId: TRIP_ID,
          content: makeGuideContent(),
          destination: "Tokyo",
          locale: "pt-BR",
          generationCount: 1,
          viewedSections: [],
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          extraCategories: [],
          personalNotes: null,
          regenCount: 0,
          destinationId: null,
        },
        itineraryDays: makeItineraryDays(),
        transportSegments: makeTransportSegments(),
        accommodations: makeAccommodations(),
      });
      prismaMock.trip.findUnique.mockResolvedValue(trip as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "checklist", USER_ID);

      expect(ctx.itineraryDigest!.totalDays).toBe(2);
      expect(ctx.itineraryDigest!.activityTypesUsed).toContain("SIGHTSEEING");
    });

    it("logisticsDigest detects international flight", async () => {
      const trip = makeTrip({
        destinationGuide: {
          id: "guide-1",
          tripId: TRIP_ID,
          content: makeGuideContent(),
          destination: "Tokyo",
          locale: "pt-BR",
          generationCount: 1,
          viewedSections: [],
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          extraCategories: [],
          personalNotes: null,
          regenCount: 0,
          destinationId: null,
        },
        itineraryDays: makeItineraryDays(),
        transportSegments: makeTransportSegments(),
        accommodations: makeAccommodations(),
      });
      prismaMock.trip.findUnique.mockResolvedValue(trip as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "checklist", USER_ID);

      expect(ctx.logisticsDigest!.hasInternationalFlight).toBe(true);
    });

    it("omits all digests (graceful degradation) when all upstream data is absent", async () => {
      // Trip with no guide, no itinerary, no transport/accommodation, no localMobility
      const tripNoData = makeTrip({ localMobility: [] });
      prismaMock.trip.findUnique.mockResolvedValue(tripNoData as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "checklist", USER_ID);

      // Graceful degradation: missing digests are omitted (undefined), not errors
      expect(ctx.guideDigest).toBeUndefined();
      expect(ctx.itineraryDigest).toBeUndefined();
      expect(ctx.logisticsDigest).toBeUndefined();
    });

    it("includes logisticsDigest from localMobility even without transport/accommodation", async () => {
      // Use a trip that has localMobility but no transport segments or accommodations
      const trip = makeTrip({
        localMobility: ["metro", "walking", "uber"],
        transportSegments: [],
        accommodations: [],
      });
      prismaMock.trip.findUnique.mockResolvedValue(trip as never);

      const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "checklist", USER_ID);

      expect(ctx.logisticsDigest).toBeDefined();
      expect(ctx.logisticsDigest!.mobility).toContain("metro");
    });
  });

  // ── Profile fallbacks ────────────────────────────────────────────────────────

  it("handles missing user profile gracefully (null fields)", async () => {
    const tripNoProfile = makeTrip({
      user: {
        id: USER_ID,
        email: "test@example.com",
        profile: null,
      },
    });
    prismaMock.trip.findUnique.mockResolvedValue(tripNoProfile as never);

    const ctx = await ExpeditionAiContextService.assembleFor(TRIP_ID, "guide", USER_ID);

    expect(ctx.profile.country).toBeNull();
    expect(ctx.profile.completionScore).toBe(0);
    expect(ctx.preferences.raw).toEqual({});
  });
});
