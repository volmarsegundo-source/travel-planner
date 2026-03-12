/**
 * Unit tests for TripReadinessService.
 *
 * Tests cover: weighted readiness calculation, BOLA check,
 * phase status detection, edge cases (new trip, no checklist, etc.)
 *
 * [SPEC-PROD-010]
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

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { db } from "@/server/db";
import { TripReadinessService } from "@/server/services/trip-readiness.service";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockTripFound(overrides: Record<string, unknown> = {}) {
  prismaMock.trip.findFirst.mockResolvedValue({
    id: "trip-1",
    destination: "Paris, France",
    origin: "Sao Paulo",
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-06-10"),
    tripType: "international",
    passengers: null,
    localMobility: [],
    currentPhase: 1,
    ...overrides,
  } as never);
}

function mockEmptyRelations() {
  prismaMock.expeditionPhase.findMany.mockResolvedValue([]);
  prismaMock.phaseChecklistItem.findMany.mockResolvedValue([]);
  prismaMock.transportSegment.findMany.mockResolvedValue([]);
  prismaMock.accommodation.findMany.mockResolvedValue([]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TripReadinessService", () => {
  describe("calculateTripReadiness", () => {
    it("throws FORBIDDEN when trip does not belong to user", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TripReadinessService.calculateTripReadiness("trip-1", "user-1")
      ).rejects.toThrow("errors.tripNotFound");
    });

    it("returns 0% readiness for a brand new trip with no data", async () => {
      mockTripFound();
      mockEmptyRelations();

      const result = await TripReadinessService.calculateTripReadiness(
        "trip-1",
        "user-1"
      );

      // Only phases weight applies (40%), phase 1 is partial but not complete
      expect(result.readinessPercent).toBe(0);
      expect(result.phases).toHaveLength(6);
      expect(result.phases[0]!.status).toBe("partial"); // phase 1 always at least partial
      expect(result.phases[1]!.status).toBe("not_started");
    });

    it("returns correct readiness when all 6 phases are completed", async () => {
      mockTripFound({ localMobility: ["walking"] });
      prismaMock.expeditionPhase.findMany.mockResolvedValue(
        [1, 2, 3, 4, 5, 6].map((n) => ({
          phaseNumber: n,
          status: "completed",
          metadata: n === 2 ? { travelerType: "solo", accommodationStyle: "budget" } : null,
          completedAt: new Date(),
          id: `ep-${n}`,
          tripId: "trip-1",
          pointsEarned: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
      prismaMock.phaseChecklistItem.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          completed: true,
          id: `ci-${i}`,
          tripId: "trip-1",
          phaseNumber: 3,
          itemKey: `item-${i}`,
          required: true,
          deadline: null,
          pointsValue: 10,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
      prismaMock.transportSegment.findMany.mockResolvedValue([
        { id: "ts-1" } as never,
      ]);
      prismaMock.accommodation.findMany.mockResolvedValue([
        { id: "acc-1" } as never,
      ]);

      const result = await TripReadinessService.calculateTripReadiness(
        "trip-1",
        "user-1"
      );

      // All weights active, all scores 1.0 => 100%
      expect(result.readinessPercent).toBe(100);
      result.phases.forEach((p) => {
        expect(p.status).toBe("complete");
      });
    });

    it("calculates partial readiness with some phases complete", async () => {
      mockTripFound();
      prismaMock.expeditionPhase.findMany.mockResolvedValue([
        {
          phaseNumber: 1,
          status: "completed",
          metadata: null,
          completedAt: new Date(),
          id: "ep-1",
          tripId: "trip-1",
          pointsEarned: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          phaseNumber: 2,
          status: "active",
          metadata: { travelerType: "solo" },
          completedAt: null,
          id: "ep-2",
          tripId: "trip-1",
          pointsEarned: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.phaseChecklistItem.findMany.mockResolvedValue([]);
      prismaMock.transportSegment.findMany.mockResolvedValue([]);
      prismaMock.accommodation.findMany.mockResolvedValue([]);

      const result = await TripReadinessService.calculateTripReadiness(
        "trip-1",
        "user-1"
      );

      // Only phases weight active: 1/6 completed = ~17%
      expect(result.readinessPercent).toBe(17);
      expect(result.phases[0]!.status).toBe("complete");
      expect(result.phases[1]!.status).toBe("partial");
      expect(result.phases[2]!.status).toBe("not_started");
    });

    it("redistributes weight when checklist is absent", async () => {
      mockTripFound();
      prismaMock.expeditionPhase.findMany.mockResolvedValue([
        {
          phaseNumber: 1,
          status: "completed",
          metadata: null,
          completedAt: new Date(),
          id: "ep-1",
          tripId: "trip-1",
          pointsEarned: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // No checklist items
      prismaMock.phaseChecklistItem.findMany.mockResolvedValue([]);
      // Has transport
      prismaMock.transportSegment.findMany.mockResolvedValue([
        { id: "ts-1" } as never,
      ]);
      // No accommodation
      prismaMock.accommodation.findMany.mockResolvedValue([]);

      const result = await TripReadinessService.calculateTripReadiness(
        "trip-1",
        "user-1"
      );

      // Active weights: phases (0.4) + transport (0.15) = 0.55
      // Phases: 1/6 * (0.4/0.55) = 0.121
      // Transport: 1 * (0.15/0.55) = 0.273
      // Total: ~39%
      expect(result.readinessPercent).toBeGreaterThan(30);
      expect(result.readinessPercent).toBeLessThan(45);
    });

    it("includes phase data snapshots", async () => {
      mockTripFound({ localMobility: ["walking", "taxi_rideshare"] });
      prismaMock.expeditionPhase.findMany.mockResolvedValue([
        {
          phaseNumber: 2,
          status: "completed",
          metadata: { travelerType: "family", accommodationStyle: "comfort" },
          completedAt: new Date(),
          id: "ep-2",
          tripId: "trip-1",
          pointsEarned: 150,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.phaseChecklistItem.findMany.mockResolvedValue([
        {
          completed: true,
          id: "ci-1",
          tripId: "trip-1",
          phaseNumber: 3,
          itemKey: "passport",
          required: true,
          deadline: null,
          pointsValue: 10,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          completed: false,
          id: "ci-2",
          tripId: "trip-1",
          phaseNumber: 3,
          itemKey: "visa",
          required: true,
          deadline: null,
          pointsValue: 10,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.transportSegment.findMany.mockResolvedValue([
        { id: "ts-1" } as never,
        { id: "ts-2" } as never,
      ]);
      prismaMock.accommodation.findMany.mockResolvedValue([]);

      const result = await TripReadinessService.calculateTripReadiness(
        "trip-1",
        "user-1"
      );

      // Phase 1 snapshot
      expect(result.phases[0]!.dataSnapshot.destination).toBe("Paris, France");
      expect(result.phases[0]!.dataSnapshot.origin).toBe("Sao Paulo");

      // Phase 2 snapshot
      expect(result.phases[1]!.dataSnapshot.travelerType).toBe("family");
      expect(result.phases[1]!.dataSnapshot.accommodationStyle).toBe("comfort");

      // Phase 3 snapshot
      expect(result.phases[2]!.dataSnapshot.done).toBe(1);
      expect(result.phases[2]!.dataSnapshot.total).toBe(2);

      // Phase 4 snapshot
      expect(result.phases[3]!.dataSnapshot.transportCount).toBe(2);
      expect(result.phases[3]!.dataSnapshot.mobilityCount).toBe(2);
    });

    it("returns phase names from phase config", async () => {
      mockTripFound();
      mockEmptyRelations();

      const result = await TripReadinessService.calculateTripReadiness(
        "trip-1",
        "user-1"
      );

      expect(result.phases[0]!.name).toBe("O Chamado");
      expect(result.phases[1]!.name).toBe("O Explorador");
      expect(result.phases[2]!.name).toBe("O Preparo");
      expect(result.phases[3]!.name).toBe("A Logística");
      expect(result.phases[4]!.name).toBe("O Mapa dos Dias");
      expect(result.phases[5]!.name).toBe("O Tesouro");
    });

    it("handles half-completed checklist with correct weight", async () => {
      mockTripFound();
      prismaMock.expeditionPhase.findMany.mockResolvedValue([]);
      prismaMock.phaseChecklistItem.findMany.mockResolvedValue(
        Array.from({ length: 4 }, (_, i) => ({
          completed: i < 2, // 2 of 4 done
          id: `ci-${i}`,
          tripId: "trip-1",
          phaseNumber: 3,
          itemKey: `item-${i}`,
          required: true,
          deadline: null,
          pointsValue: 10,
          completedAt: i < 2 ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
      prismaMock.transportSegment.findMany.mockResolvedValue([]);
      prismaMock.accommodation.findMany.mockResolvedValue([]);

      const result = await TripReadinessService.calculateTripReadiness(
        "trip-1",
        "user-1"
      );

      // Active weights: phases (0.4) + checklist (0.3) = 0.7
      // Phases: 0/6 * (0.4/0.7) = 0
      // Checklist: 0.5 * (0.3/0.7) = 0.214
      // Total: ~21%
      expect(result.readinessPercent).toBe(21);
    });

    it("correctly marks active phase as partial", async () => {
      mockTripFound();
      prismaMock.expeditionPhase.findMany.mockResolvedValue([
        {
          phaseNumber: 3,
          status: "active",
          metadata: null,
          completedAt: null,
          id: "ep-3",
          tripId: "trip-1",
          pointsEarned: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.phaseChecklistItem.findMany.mockResolvedValue([]);
      prismaMock.transportSegment.findMany.mockResolvedValue([]);
      prismaMock.accommodation.findMany.mockResolvedValue([]);

      const result = await TripReadinessService.calculateTripReadiness(
        "trip-1",
        "user-1"
      );

      expect(result.phases[2]!.status).toBe("partial");
    });

    it("verifies trip belongs to userId (BOLA)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TripReadinessService.calculateTripReadiness("trip-1", "wrong-user")
      ).rejects.toThrow("errors.tripNotFound");

      expect(prismaMock.trip.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "trip-1", userId: "wrong-user", deletedAt: null },
        })
      );
    });
  });
});
