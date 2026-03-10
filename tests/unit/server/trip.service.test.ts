/**
 * Unit tests for TripService.
 *
 * All external dependencies (Prisma) are mocked so these tests run in
 * isolation with no infrastructure required.
 *
 * Mocking pattern: vi.mock() factories are hoisted above all const
 * declarations by the vitest transformer. mockDeep<PrismaClient>() inside
 * the factory is safe — it constructs the deep proxy synchronously.
 * See: tests/unit/server/auth.service.test.ts for the canonical pattern.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

// ─── Import SUT after mocks are registered ────────────────────────────────────

import { TripService } from "@/server/services/trip.service";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { db } from "@/server/db";
import { MAX_TRIPS_PER_USER } from "@/lib/constants";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTrip(
  overrides: Partial<{
    id: string;
    userId: string;
    title: string;
    destination: string;
    status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
    visibility: "PRIVATE" | "PUBLIC" | "SHARED";
    deletedAt: Date | null;
  }> = {}
) {
  return {
    id: "trip-1",
    userId: "user-1",
    title: "Paris Trip",
    destination: "Paris, France",
    description: null,
    startDate: null,
    endDate: null,
    coverGradient: "sunset",
    coverEmoji: "✈️",
    status: "PLANNING" as const,
    visibility: "PRIVATE" as const,
    expeditionMode: false,
    currentPhase: 0,
    tripType: "domestic",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TripService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createTrip ─────────────────────────────────────────────────────────────

  describe("createTrip", () => {
    it("creates and returns trip on happy path", async () => {
      prismaMock.trip.count.mockResolvedValue(0);
      const created = makeTrip({ id: "new-trip-1", userId: "user-1" });
      prismaMock.trip.create.mockResolvedValue(created);

      const result = await TripService.createTrip("user-1", {
        title: "Paris Trip",
        destination: "Paris, France",
        coverGradient: "sunset",
        coverEmoji: "✈️",
      });

      expect(result.id).toBe("new-trip-1");
      expect(result.userId).toBe("user-1");
      expect(prismaMock.trip.create).toHaveBeenCalledOnce();
      expect(prismaMock.trip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "user-1", title: "Paris Trip" }),
        })
      );
    });

    it("throws AppError MAX_TRIPS_REACHED when user is at the limit", async () => {
      prismaMock.trip.count.mockResolvedValue(MAX_TRIPS_PER_USER);

      await expect(
        TripService.createTrip("user-1", {
          title: "One Too Many",
          destination: "Anywhere",
          coverGradient: "ocean",
          coverEmoji: "🌊",
        })
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof AppError && err.code === "MAX_TRIPS_REACHED"
      );

      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it("does not create trip when count equals MAX_TRIPS_PER_USER", async () => {
      // Boundary check: count === MAX means at limit, should still throw
      prismaMock.trip.count.mockResolvedValue(MAX_TRIPS_PER_USER);

      await expect(
        TripService.createTrip("user-1", {
          title: "Boundary",
          destination: "Test",
          coverGradient: "forest",
          coverEmoji: "🌲",
        })
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  // ─── getTripById ─────────────────────────────────────────────────────────────

  describe("getTripById", () => {
    it("returns trip when it exists and belongs to the requesting user", async () => {
      const trip = makeTrip({ id: "trip-1", userId: "user-1" });
      prismaMock.trip.findFirst.mockResolvedValue(trip);

      const result = await TripService.getTripById("trip-1", "user-1");

      expect(result.id).toBe("trip-1");
      expect(prismaMock.trip.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "trip-1", deletedAt: null }),
        })
      );
    });

    it("throws ForbiddenError when trip belongs to a different user", async () => {
      const trip = makeTrip({ id: "trip-1", userId: "user-99" });
      prismaMock.trip.findFirst.mockResolvedValue(trip);

      await expect(
        TripService.getTripById("trip-1", "user-1")
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("throws NotFoundError when trip does not exist", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TripService.getTripById("missing-trip", "user-1")
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("throws NotFoundError when trip is soft-deleted (findFirst returns null with deletedAt filter)", async () => {
      // Soft-deleted trip: Prisma returns null because of deletedAt: null filter
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TripService.getTripById("deleted-trip", "user-1")
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ─── updateTrip ─────────────────────────────────────────────────────────────

  describe("updateTrip", () => {
    it("updates and returns trip on happy path", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        makeTrip({ id: "trip-1", userId: "user-1" })
      );
      const updated = makeTrip({ title: "Updated Title" });
      prismaMock.trip.update.mockResolvedValue(updated);

      const result = await TripService.updateTrip("trip-1", "user-1", {
        title: "Updated Title",
      });

      expect(result.title).toBe("Updated Title");
      expect(prismaMock.trip.update).toHaveBeenCalledOnce();
    });

    it("throws ForbiddenError when trip belongs to a different user (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        makeTrip({ id: "trip-1", userId: "other-user" })
      );

      await expect(
        TripService.updateTrip("trip-1", "user-1", { title: "Hacked" })
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when trip does not exist", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TripService.updateTrip("no-trip", "user-1", { title: "Whatever" })
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ─── deleteTrip ─────────────────────────────────────────────────────────────

  describe("deleteTrip", () => {
    it("soft-deletes trip by setting deletedAt on happy path", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        makeTrip({ id: "trip-1", userId: "user-1" })
      );
      const softDeleted = makeTrip({ deletedAt: new Date("2024-06-01") });
      prismaMock.trip.update.mockResolvedValue(softDeleted);

      const result = await TripService.deleteTrip("trip-1", "user-1");

      expect(result.deletedAt).not.toBeNull();
      expect(prismaMock.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "trip-1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it("throws ForbiddenError when trip belongs to a different user (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        makeTrip({ id: "trip-1", userId: "attacker" })
      );

      await expect(
        TripService.deleteTrip("trip-1", "user-1")
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when trip does not exist", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TripService.deleteTrip("ghost-trip", "user-1")
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ─── getUserTrips ────────────────────────────────────────────────────────────

  describe("getUserTrips", () => {
    it("returns paginated result with correct metadata", async () => {
      const trips = [makeTrip({ id: "t-1" }), makeTrip({ id: "t-2" })];
      prismaMock.trip.findMany.mockResolvedValue(trips);
      prismaMock.trip.count.mockResolvedValue(2);

      const result = await TripService.getUserTrips("user-1", 1, 10);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("applies userId filter to prevent cross-user data access", async () => {
      prismaMock.trip.findMany.mockResolvedValue([]);
      prismaMock.trip.count.mockResolvedValue(0);

      await TripService.getUserTrips("user-42", 1, 10);

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-42", deletedAt: null }),
        })
      );
    });
  });

  // ─── getUserTripsWithExpeditionData ─────────────────────────────────────────

  describe("getUserTripsWithExpeditionData", () => {
    function makeExpeditionTrip(currentPhase: number, phases: { phaseNumber: number; status: string }[]) {
      return {
        ...makeTrip({ expeditionMode: true, currentPhase }),
        phases: phases.map((p) => ({
          phaseNumber: p.phaseNumber,
          status: p.status,
          completedAt: p.status === "completed" ? new Date() : null,
        })),
        phaseChecklist: [],
        itineraryPlan: null,
      };
    }

    it("counts completedPhases as max of explicit completions and currentPhase-1", async () => {
      // Trip in phase 6 but only 3 phases have explicit "completed" status
      const trip = makeExpeditionTrip(6, [
        { phaseNumber: 1, status: "completed" },
        { phaseNumber: 2, status: "completed" },
        { phaseNumber: 3, status: "completed" },
        { phaseNumber: 4, status: "active" },
        { phaseNumber: 5, status: "active" },
        { phaseNumber: 6, status: "active" },
        { phaseNumber: 7, status: "locked" },
        { phaseNumber: 8, status: "locked" },
      ]);

      prismaMock.trip.findMany.mockResolvedValue([trip] as never);

      const result = await TripService.getUserTripsWithExpeditionData("user-1");

      // currentPhase - 1 = 5, explicit completions = 3, so max = 5
      expect(result[0].completedPhases).toBe(5);
    });

    it("uses explicit count when it exceeds currentPhase-1", async () => {
      // All 6 phases explicitly completed, currentPhase = 6
      const trip = makeExpeditionTrip(6, [
        { phaseNumber: 1, status: "completed" },
        { phaseNumber: 2, status: "completed" },
        { phaseNumber: 3, status: "completed" },
        { phaseNumber: 4, status: "completed" },
        { phaseNumber: 5, status: "completed" },
        { phaseNumber: 6, status: "completed" },
        { phaseNumber: 7, status: "locked" },
        { phaseNumber: 8, status: "locked" },
      ]);

      prismaMock.trip.findMany.mockResolvedValue([trip] as never);

      const result = await TripService.getUserTripsWithExpeditionData("user-1");

      // explicit = 6, currentPhase - 1 = 5, max = 6
      expect(result[0].completedPhases).toBe(6);
    });

    it("returns 1 completed phase for trip in phase 2 (no regression)", async () => {
      const trip = makeExpeditionTrip(2, [
        { phaseNumber: 1, status: "completed" },
        { phaseNumber: 2, status: "active" },
        { phaseNumber: 3, status: "locked" },
        { phaseNumber: 4, status: "locked" },
        { phaseNumber: 5, status: "locked" },
        { phaseNumber: 6, status: "locked" },
        { phaseNumber: 7, status: "locked" },
        { phaseNumber: 8, status: "locked" },
      ]);

      prismaMock.trip.findMany.mockResolvedValue([trip] as never);

      const result = await TripService.getUserTripsWithExpeditionData("user-1");

      // explicit = 1, currentPhase - 1 = 1, max = 1
      expect(result[0].completedPhases).toBe(1);
    });
  });

  // ─── reorderActivities ───────────────────────────────────────────────────────

  describe("reorderActivities", () => {
    it("verifies ownership then calls db.$transaction with activity updates on happy path", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        makeTrip({ id: "trip-1", userId: "user-1" })
      );
      // $transaction receives an array of promises; mock it to resolve void
      prismaMock.$transaction.mockResolvedValue([]);

      const activities = [
        { id: "act-1", orderIndex: 0 },
        { id: "act-2", orderIndex: 1 },
        { id: "act-3", orderIndex: 2 },
      ];
      // Mock activity.count BOLA guard: all activities belong to the trip
      prismaMock.activity.count.mockResolvedValue(activities.length);

      await expect(
        TripService.reorderActivities("trip-1", "user-1", activities)
      ).resolves.toBeUndefined();

      expect(prismaMock.trip.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "trip-1", deletedAt: null }),
          select: expect.objectContaining({ id: true, userId: true }),
        })
      );
      expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    });

    it("throws NotFoundError when trip does not exist", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TripService.reorderActivities("missing-trip", "user-1", [
          { id: "act-1", orderIndex: 0 },
        ])
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when trip is soft-deleted (findFirst returns null with deletedAt filter)", async () => {
      // Soft-deleted trip: Prisma returns null because of the deletedAt: null filter
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TripService.reorderActivities("deleted-trip", "user-1", [
          { id: "act-1", orderIndex: 0 },
        ])
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("throws ForbiddenError when trip belongs to a different user (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        makeTrip({ id: "trip-1", userId: "other-user" })
      );

      await expect(
        TripService.reorderActivities("trip-1", "user-1", [
          { id: "act-1", orderIndex: 0 },
        ])
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("calls db.$transaction with an empty array when activities list is empty", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        makeTrip({ id: "trip-1", userId: "user-1" })
      );
      prismaMock.$transaction.mockResolvedValue([]);
      // Empty activities list: count returns 0 === activityIds.length (0)
      prismaMock.activity.count.mockResolvedValue(0);

      await expect(
        TripService.reorderActivities("trip-1", "user-1", [])
      ).resolves.toBeUndefined();

      expect(prismaMock.$transaction).toHaveBeenCalledOnce();
      // The array passed to $transaction must be empty
      const transactionArg = prismaMock.$transaction.mock.calls[0][0] as unknown as unknown[];
      expect(transactionArg).toHaveLength(0);
    });
  });
});
