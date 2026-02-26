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
});
