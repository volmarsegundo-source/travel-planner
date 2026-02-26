import "server-only";
import { db } from "@/server/db";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { MAX_TRIPS_PER_USER, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { TripCreateInput, TripUpdateInput } from "@/lib/validations/trip.schema";
import type { PaginatedResult, Trip } from "@/types/trip.types";

// ─── Explicit select — never expose full row ──────────────────────────────────

const TRIP_SELECT = {
  id: true,
  userId: true,
  title: true,
  destination: true,
  description: true,
  startDate: true,
  endDate: true,
  coverGradient: true,
  coverEmoji: true,
  status: true,
  visibility: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

// ─── TripService ──────────────────────────────────────────────────────────────

export class TripService {
  /**
   * Returns a paginated list of trips belonging to userId.
   * Always filters deletedAt: null — soft-deleted trips are invisible.
   */
  static async getUserTrips(
    userId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResult<Trip>> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const skip = (safePage - 1) * safePageSize;

    const [items, total] = await Promise.all([
      db.trip.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        skip,
        take: safePageSize,
        select: TRIP_SELECT,
      }),
      db.trip.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      items: items as Trip[],
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
    };
  }

  /**
   * Fetches a single trip by ID.
   * BOLA guard: throws ForbiddenError if the trip belongs to a different user.
   */
  static async getTripById(tripId: string, userId: string): Promise<Trip> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      select: TRIP_SELECT,
    });

    if (!trip) {
      throw new NotFoundError("Trip", tripId);
    }

    if (trip.userId !== userId) {
      throw new ForbiddenError();
    }

    return trip as Trip;
  }

  /**
   * Creates a new trip for userId.
   * Enforces MAX_TRIPS_PER_USER limit before inserting.
   */
  static async createTrip(
    userId: string,
    data: TripCreateInput
  ): Promise<Trip> {
    const count = await db.trip.count({
      where: { userId, deletedAt: null },
    });

    if (count >= MAX_TRIPS_PER_USER) {
      throw new AppError(
        "MAX_TRIPS_REACHED",
        "trips.errors.maxTripsReached",
        422
      );
    }

    const trip = await db.trip.create({
      data: { ...data, userId },
      select: TRIP_SELECT,
    });

    return trip as Trip;
  }

  /**
   * Updates an existing trip.
   * BOLA guard: verifies ownership before applying changes.
   */
  static async updateTrip(
    tripId: string,
    userId: string,
    data: TripUpdateInput
  ): Promise<Trip> {
    const existing = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      select: { id: true, userId: true },
    });

    if (!existing) {
      throw new NotFoundError("Trip", tripId);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenError();
    }

    const updated = await db.trip.update({
      where: { id: tripId },
      data,
      select: TRIP_SELECT,
    });

    return updated as Trip;
  }

  /**
   * Soft-deletes a trip by setting deletedAt.
   * BOLA guard: verifies ownership before deleting.
   */
  static async deleteTrip(tripId: string, userId: string): Promise<Trip> {
    const existing = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      select: { id: true, userId: true, title: true },
    });

    if (!existing) {
      throw new NotFoundError("Trip", tripId);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenError();
    }

    const deleted = await db.trip.update({
      where: { id: tripId },
      data: { deletedAt: new Date() },
      select: TRIP_SELECT,
    });

    return deleted as Trip;
  }

  /**
   * Reorders activities within a trip atomically.
   * BOLA guard: verifies trip ownership before touching any activity rows.
   */
  static async reorderActivities(
    tripId: string,
    userId: string,
    activities: { id: string; orderIndex: number }[]
  ): Promise<void> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      select: { id: true, userId: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip", tripId);
    }

    if (trip.userId !== userId) {
      throw new ForbiddenError();
    }

    await db.$transaction(
      activities.map(({ id, orderIndex }) =>
        db.activity.update({
          where: { id },
          data: { orderIndex },
        })
      )
    );
  }
}
