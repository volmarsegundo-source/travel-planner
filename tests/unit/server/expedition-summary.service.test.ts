/**
 * Unit tests for ExpeditionSummaryService.
 *
 * Tests cover: aggregation from all 6 phases, BOLA check,
 * booking code masking, missing phase data returns null,
 * pendingItems, completionPercentage, expanded field data.
 *
 * [SPEC-PROD-005, TASK-S33-009, TASK-S33-010]
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

vi.mock("@/lib/hash", () => ({
  hashUserId: vi.fn().mockReturnValue("hashed123"),
}));

// Mock crypto decrypt for booking code masking
vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn().mockImplementation((enc: string) => {
    // Simple mock: return predictable plaintext
    if (enc === "enc-ABC123") return "ABC123";
    if (enc === "enc-XY") return "XY";
    return "UNKNOWN";
  }),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { db } from "@/server/db";
import { decrypt } from "@/lib/crypto";
import {
  ExpeditionSummaryService,
  maskBookingCode,
  deriveAgeRange,
  calculateCompletionPercentage,
  collectPendingItems,
} from "@/server/services/expedition-summary.service";

const mockedDecrypt = vi.mocked(decrypt);

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helper: setup default profile/user mocks ────────────────────────────────

function setupDefaultProfileMocks() {
  prismaMock.userProfile.findUnique.mockResolvedValue({
    birthDate: new Date("1990-05-15"),
    preferences: { travelPace: "moderate", interests: ["history_museums"] },
  } as never);
  prismaMock.user.findUnique.mockResolvedValue({
    name: "Test User",
  } as never);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultProfileMocks();
});

describe("maskBookingCode", () => {
  it("masks booking code showing last 3 characters", () => {
    const result = maskBookingCode("enc-ABC123");
    expect(result).toBe("BOOK-****-123");
  });

  it("handles short booking codes gracefully", () => {
    const result = maskBookingCode("enc-XY");
    expect(result).toBe("BOOK-****-XY");
  });

  it("returns fallback on decryption error", () => {
    mockedDecrypt.mockImplementationOnce(() => {
      throw new Error("Decryption failed");
    });
    const result = maskBookingCode("bad-data");
    expect(result).toBe("BOOK-****-???");
  });
});

describe("deriveAgeRange", () => {
  it("returns null for null birthDate", () => {
    expect(deriveAgeRange(null)).toBeNull();
  });

  it("returns correct age range for 30-year-old", () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 30);
    expect(deriveAgeRange(birthDate)).toBe("25-34");
  });

  it("returns 65+ for elderly", () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 70);
    expect(deriveAgeRange(birthDate)).toBe("65+");
  });

  it("returns 18-24 for young adult", () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 20);
    expect(deriveAgeRange(birthDate)).toBe("18-24");
  });
});

describe("calculateCompletionPercentage", () => {
  it("returns 0 when no phase data exists", () => {
    const result = calculateCompletionPercentage(null, null, null, null, null, null);
    expect(result).toBe(0);
  });

  it("returns 100 when all phases are fully completed", () => {
    const result = calculateCompletionPercentage(
      { destination: "Paris", origin: "SP", startDate: "2026-06-01", endDate: "2026-06-10", tripType: "int", destinationLat: null, destinationLon: null, flexibleDates: false, name: null, ageRange: null },
      { travelerType: "solo", accommodationStyle: "hotel", travelPace: 5, budget: 3000, currency: "USD", passengers: null, budgetRange: null, preferences: null },
      { done: 5, total: 5, items: [] },
      { transportSegments: [{ type: "flight", departurePlace: "GRU", arrivalPlace: "CDG", departureAt: null, arrivalAt: null, provider: null, maskedBookingCode: null }], accommodations: [{ type: "hotel", name: "H", checkIn: null, checkOut: null, maskedBookingCode: null }], mobility: ["metro"] },
      { generatedAt: "2026-05-01", highlights: [], safetyLevel: null, keyFacts: [], topAttractions: [] },
      { dayCount: 3, totalActivities: 10 },
    );
    expect(result).toBe(100);
  });

  it("returns partial when phase 3 checklist is incomplete", () => {
    const result = calculateCompletionPercentage(
      { destination: "Paris", origin: "SP", startDate: "2026-06-01", endDate: "2026-06-10", tripType: "int", destinationLat: null, destinationLon: null, flexibleDates: false, name: null, ageRange: null },
      { travelerType: "solo", accommodationStyle: "hotel", travelPace: 5, budget: 3000, currency: "USD", passengers: null, budgetRange: null, preferences: null },
      { done: 2, total: 4, items: [] },
      null,
      null,
      null,
    );
    // Phase 1: ~16.67 (all 4 fields filled), Phase 2: ~16.67, Phase 3: 50% of ~16.67 = ~8.33
    expect(result).toBeGreaterThan(30);
    expect(result).toBeLessThan(50);
  });
});

describe("collectPendingItems", () => {
  it("returns empty array when all phases are complete", () => {
    const result = collectPendingItems(
      { destination: "Paris", origin: "SP", startDate: "2026-06-01", endDate: "2026-06-10", tripType: "int", destinationLat: null, destinationLon: null, flexibleDates: false, name: null, ageRange: null },
      { travelerType: "solo", accommodationStyle: "hotel", travelPace: 5, budget: 3000, currency: "USD", passengers: null, budgetRange: null, preferences: null },
      { done: 3, total: 3, items: [{ itemKey: "passport", completed: true, required: true }, { itemKey: "visa", completed: true, required: true }, { itemKey: "insurance", completed: true, required: false }] },
      { transportSegments: [{ type: "flight", departurePlace: "GRU", arrivalPlace: "CDG", departureAt: null, arrivalAt: null, provider: null, maskedBookingCode: null }], accommodations: [{ type: "hotel", name: "H", checkIn: null, checkOut: null, maskedBookingCode: null }], mobility: ["metro"] },
      { generatedAt: "2026-05-01", highlights: [], safetyLevel: null, keyFacts: [], topAttractions: [] },
      { dayCount: 3, totalActivities: 10 },
    );
    expect(result).toEqual([]);
  });

  it("flags missing dates in phase 1 as required", () => {
    const result = collectPendingItems(
      { destination: "Paris", origin: null, startDate: null, endDate: null, tripType: "int", destinationLat: null, destinationLon: null, flexibleDates: false, name: null, ageRange: null },
      null,
      null,
      null,
      null,
      null,
    );
    const dateItems = result.filter((p) => p.phase === 1 && p.severity === "required");
    expect(dateItems.length).toBe(2); // startDate, endDate
    const originItem = result.find((p) => p.phase === 1 && p.key === "origin");
    expect(originItem?.severity).toBe("recommended");
  });

  it("flags incomplete required checklist items", () => {
    const result = collectPendingItems(
      { destination: "Paris", origin: "SP", startDate: "2026-06-01", endDate: "2026-06-10", tripType: "int", destinationLat: null, destinationLon: null, flexibleDates: false, name: null, ageRange: null },
      { travelerType: "solo", accommodationStyle: "hotel", travelPace: 5, budget: 3000, currency: "USD", passengers: null, budgetRange: null, preferences: null },
      { done: 1, total: 3, items: [
        { itemKey: "passport", completed: true, required: true },
        { itemKey: "visa", completed: false, required: true },
        { itemKey: "sunscreen", completed: false, required: false },
      ] },
      null,
      null,
      null,
    );
    const checklistRequired = result.filter((p) => p.phase === 3 && p.severity === "required");
    expect(checklistRequired).toHaveLength(1);
    expect(checklistRequired[0]!.key).toBe("visa");
  });

  it("flags missing transport and accommodation as recommended", () => {
    const result = collectPendingItems(
      { destination: "Paris", origin: "SP", startDate: "2026-06-01", endDate: "2026-06-10", tripType: "int", destinationLat: null, destinationLon: null, flexibleDates: false, name: null, ageRange: null },
      { travelerType: "solo", accommodationStyle: "hotel", travelPace: 5, budget: 3000, currency: "USD", passengers: null, budgetRange: null, preferences: null },
      { done: 3, total: 3, items: [] },
      null,
      null,
      null,
    );
    const transportItem = result.find((p) => p.phase === 4 && p.key === "transport");
    expect(transportItem?.severity).toBe("recommended");
    const accommodationItem = result.find((p) => p.phase === 4 && p.key === "accommodation");
    expect(accommodationItem?.severity).toBe("recommended");
  });
});

describe("ExpeditionSummaryService", () => {
  describe("getExpeditionSummary", () => {
    it("throws error when trip not found (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        ExpeditionSummaryService.getExpeditionSummary("trip-1", "wrong-user")
      ).rejects.toThrow("errors.tripNotFound");
    });

    it("aggregates data from all 6 phases with expanded fields", async () => {
      // Setup trip
      prismaMock.trip.findFirst.mockResolvedValue({
        id: "trip-1",
        title: "Trip to Paris",
        destination: "Paris, France",
        origin: "Sao Paulo, Brazil",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-10"),
        tripType: "international",
        currentPhase: 6,
        passengers: {
          adults: 2,
          children: { count: 1, ages: [5] },
          infants: 0,
          seniors: 0,
        },
        localMobility: ["public_transit", "walking"],
      } as never);

      // Phases
      prismaMock.expeditionPhase.findMany.mockResolvedValue([
        { phaseNumber: 1, status: "completed", metadata: { flexibleDates: false } },
        {
          phaseNumber: 2,
          status: "completed",
          metadata: {
            travelerType: "family",
            accommodationStyle: "comfort",
            travelPace: 50,
            budget: 5000,
            currency: "USD",
          },
        },
        { phaseNumber: 3, status: "completed", metadata: {} },
      ] as never);

      // Checklist
      prismaMock.phaseChecklistItem.findMany.mockResolvedValue([
        { itemKey: "passport", completed: true, required: true },
        { itemKey: "visa", completed: true, required: true },
        { itemKey: "insurance", completed: false, required: false },
      ] as never);

      // Transport
      prismaMock.transportSegment.findMany.mockResolvedValue([
        {
          transportType: "flight",
          departurePlace: "GRU",
          arrivalPlace: "CDG",
          departureAt: new Date("2026-06-01T10:00:00Z"),
          arrivalAt: new Date("2026-06-01T22:00:00Z"),
          provider: "LATAM",
          bookingCodeEnc: "enc-ABC123",
        },
      ] as never);

      // Accommodations
      prismaMock.accommodation.findMany.mockResolvedValue([
        {
          accommodationType: "hotel",
          name: "Hotel Paris",
          checkIn: new Date("2026-06-01"),
          checkOut: new Date("2026-06-10"),
          bookingCodeEnc: null,
        },
      ] as never);

      // Guide
      prismaMock.destinationGuide.findUnique.mockResolvedValue({
        content: {
          timezone: { icon: "\u{1F550}", title: "UTC+1", summary: "CET", tips: [] },
          currency: { icon: "\u{1F4B6}", title: "EUR", summary: "Euro", tips: [] },
          language: { icon: "\u{1F5E3}", title: "French", summary: "French", tips: [] },
        },
        generatedAt: new Date("2026-05-15"),
      } as never);

      // Itinerary days
      prismaMock.itineraryDay.findMany.mockResolvedValue([
        { id: "day-1", _count: { activities: 4 } },
        { id: "day-2", _count: { activities: 3 } },
        { id: "day-3", _count: { activities: 5 } },
      ] as never);

      const result = await ExpeditionSummaryService.getExpeditionSummary(
        "trip-1",
        "user-1"
      );

      // Phase 1 — expanded fields
      expect(result.phase1).toMatchObject({
        destination: "Paris, France",
        origin: "Sao Paulo, Brazil",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
        tripType: "international",
        flexibleDates: false,
        name: "Test User",
      });
      expect(result.phase1!.ageRange).toBeTruthy();

      // Phase 2 — expanded fields
      expect(result.phase2).toMatchObject({
        travelerType: "family",
        accommodationStyle: "comfort",
        travelPace: 50,
        budget: 5000,
        currency: "USD",
        passengers: {
          adults: 2,
          children: 1,
          infants: 0,
          seniors: 0,
        },
      });
      expect(result.phase2!.preferences).not.toBeNull();

      // Phase 3 — expanded with items
      expect(result.phase3).toMatchObject({
        done: 2,
        total: 3,
      });
      expect(result.phase3!.items).toHaveLength(3);
      expect(result.phase3!.items[0]).toMatchObject({
        itemKey: "passport",
        completed: true,
        required: true,
      });

      // Phase 4 — expanded with dates and provider
      expect(result.phase4).not.toBeNull();
      expect(result.phase4!.transportSegments[0]!.departureAt).toContain("2026-06-01");
      expect(result.phase4!.transportSegments[0]!.provider).toBe("LATAM");
      expect(result.phase4!.accommodations[0]!.checkIn).toBe("2026-06-01");
      expect(result.phase4!.accommodations[0]!.checkOut).toBe("2026-06-10");

      // Phase 5
      expect(result.phase5).not.toBeNull();
      expect(result.phase5!.generatedAt).toBe("2026-05-15");
      expect(result.phase5!.highlights).toHaveLength(3);

      // Phase 6
      expect(result.phase6).toEqual({
        dayCount: 3,
        totalActivities: 12,
      });

      // New fields
      expect(result.currentPhase).toBe(6);
      expect(typeof result.completionPercentage).toBe("number");
      expect(result.completionPercentage).toBeGreaterThan(0);
      expect(Array.isArray(result.pendingItems)).toBe(true);
    });

    it("returns null for missing phase data with pendingItems", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({
        id: "trip-1",
        title: "Berlin Trip",
        destination: "Berlin",
        origin: null,
        startDate: null,
        endDate: null,
        tripType: "international",
        currentPhase: 1,
        passengers: null,
        localMobility: [],
      } as never);

      // No phases completed beyond phase 1
      prismaMock.expeditionPhase.findMany.mockResolvedValue([
        { phaseNumber: 1, status: "completed", metadata: {} },
        { phaseNumber: 2, status: "active", metadata: null },
      ] as never);

      prismaMock.phaseChecklistItem.findMany.mockResolvedValue([]);
      prismaMock.transportSegment.findMany.mockResolvedValue([]);
      prismaMock.accommodation.findMany.mockResolvedValue([]);
      prismaMock.destinationGuide.findUnique.mockResolvedValue(null);
      prismaMock.itineraryDay.findMany.mockResolvedValue([]);

      const result = await ExpeditionSummaryService.getExpeditionSummary(
        "trip-1",
        "user-1"
      );

      // Phase 1 always present
      expect(result.phase1).not.toBeNull();
      expect(result.phase1!.destination).toBe("Berlin");

      // All other phases null
      expect(result.phase2).toBeNull();
      expect(result.phase3).toBeNull();
      expect(result.phase4).toBeNull();
      expect(result.phase5).toBeNull();
      expect(result.phase6).toBeNull();

      // Pending items should be populated
      expect(result.pendingItems.length).toBeGreaterThan(0);
      // Missing dates should be flagged
      const dateItems = result.pendingItems.filter((p) => p.phase === 1 && p.key === "startDate");
      expect(dateItems).toHaveLength(1);
      // Completion should be low
      expect(result.completionPercentage).toBeLessThan(20);
    });

    it("masks booking codes in transport segments", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({
        id: "trip-1",
        title: "Tokyo Trip",
        destination: "Tokyo",
        origin: null,
        startDate: null,
        endDate: null,
        tripType: "international",
        currentPhase: 4,
        passengers: null,
        localMobility: [],
      } as never);

      prismaMock.expeditionPhase.findMany.mockResolvedValue([]);
      prismaMock.phaseChecklistItem.findMany.mockResolvedValue([]);
      prismaMock.transportSegment.findMany.mockResolvedValue([
        {
          transportType: "flight",
          departurePlace: "GRU",
          arrivalPlace: "NRT",
          departureAt: null,
          arrivalAt: null,
          provider: null,
          bookingCodeEnc: "enc-ABC123",
        },
      ] as never);
      prismaMock.accommodation.findMany.mockResolvedValue([]);
      prismaMock.destinationGuide.findUnique.mockResolvedValue(null);
      prismaMock.itineraryDay.findMany.mockResolvedValue([]);

      const result = await ExpeditionSummaryService.getExpeditionSummary(
        "trip-1",
        "user-1"
      );

      expect(result.phase4!.transportSegments[0]!.maskedBookingCode).toBe(
        "BOOK-****-123"
      );
    });
  });
});
