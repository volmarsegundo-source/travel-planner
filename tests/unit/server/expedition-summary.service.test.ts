/**
 * Unit tests for ExpeditionSummaryService.
 *
 * Tests cover: aggregation from all 6 phases, BOLA check,
 * booking code masking, missing phase data returns null.
 *
 * [SPEC-PROD-005]
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
} from "@/server/services/expedition-summary.service";

const mockedDecrypt = vi.mocked(decrypt);

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
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

describe("ExpeditionSummaryService", () => {
  describe("getExpeditionSummary", () => {
    it("throws error when trip not found (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        ExpeditionSummaryService.getExpeditionSummary("trip-1", "wrong-user")
      ).rejects.toThrow("errors.tripNotFound");
    });

    it("aggregates data from all 6 phases", async () => {
      // Setup trip
      prismaMock.trip.findFirst.mockResolvedValue({
        id: "trip-1",
        destination: "Paris, France",
        origin: "Sao Paulo, Brazil",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-10"),
        tripType: "international",
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
        { phaseNumber: 1, status: "completed", metadata: {} },
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
        { completed: true },
        { completed: true },
        { completed: false },
      ] as never);

      // Transport
      prismaMock.transportSegment.findMany.mockResolvedValue([
        {
          transportType: "flight",
          departurePlace: "GRU",
          arrivalPlace: "CDG",
          bookingCodeEnc: "enc-ABC123",
        },
      ] as never);

      // Accommodations
      prismaMock.accommodation.findMany.mockResolvedValue([
        {
          accommodationType: "hotel",
          name: "Hotel Paris",
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

      // Phase 1
      expect(result.phase1).toEqual({
        destination: "Paris, France",
        origin: "Sao Paulo, Brazil",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
        tripType: "international",
      });

      // Phase 2
      expect(result.phase2).toEqual({
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

      // Phase 3
      expect(result.phase3).toEqual({
        done: 2,
        total: 3,
      });

      // Phase 4
      expect(result.phase4).not.toBeNull();
      expect(result.phase4!.transportSegments).toHaveLength(1);
      expect(result.phase4!.transportSegments[0]!.type).toBe("flight");
      expect(result.phase4!.transportSegments[0]!.maskedBookingCode).toBe(
        "BOOK-****-123"
      );
      expect(result.phase4!.accommodations).toHaveLength(1);
      expect(result.phase4!.accommodations[0]!.maskedBookingCode).toBeNull();
      expect(result.phase4!.mobility).toEqual(["public_transit", "walking"]);

      // Phase 5
      expect(result.phase5).not.toBeNull();
      expect(result.phase5!.generatedAt).toBe("2026-05-15");
      expect(result.phase5!.highlights).toHaveLength(3);

      // Phase 6
      expect(result.phase6).toEqual({
        dayCount: 3,
        totalActivities: 12,
      });
    });

    it("returns null for missing phase data", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({
        id: "trip-1",
        destination: "Berlin",
        origin: null,
        startDate: null,
        endDate: null,
        tripType: "international",
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
    });

    it("masks booking codes in transport segments", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({
        id: "trip-1",
        destination: "Tokyo",
        origin: null,
        startDate: null,
        endDate: null,
        tripType: "international",
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
