import "server-only";
import { db } from "@/server/db/client";
import { redis } from "@/server/cache/client";
import { CacheKeys, CacheTTL } from "@/server/cache/keys";
import type { TripCreateInput, TripUpdateInput } from "@/lib/validations/trip.schema";
import { MAX_ACTIVE_TRIPS, isValidStatusTransition, type TripSummary } from "@/types/trip.types";
import type { TripStatus } from "@/generated/prisma/client";

const TRIP_SELECT = {
  id: true,
  title: true,
  destinationName: true,
  startDate: true,
  endDate: true,
  travelers: true,
  status: true,
  coverGradient: true,
  coverEmoji: true,
  travelStyle: true,
  budgetTotal: true,
  budgetCurrency: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ── Authorization ──────────────────────────────────────────────────────────

async function assertOwnership(tripId: string, userId: string): Promise<void> {
  const trip = await db.trip.findUnique({
    where: { id: tripId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!trip) {
    const error = new Error("Trip not found or not authorized");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }
}

async function assertTripLimitNotReached(userId: string): Promise<void> {
  const count = await db.trip.count({
    where: {
      userId,
      deletedAt: null,
      status: { not: "ARCHIVED" },
    },
  });
  if (count >= MAX_ACTIVE_TRIPS) {
    const error = new Error(
      `Active trip limit reached (max ${MAX_ACTIVE_TRIPS})`,
    );
    (error as NodeJS.ErrnoException).code = "TRIP_LIMIT_REACHED";
    throw error;
  }
}

// ── Cache helpers ──────────────────────────────────────────────────────────

async function invalidateUserTripsCache(userId: string): Promise<void> {
  await redis.del(CacheKeys.userTrips(userId));
}

// ── Read operations ────────────────────────────────────────────────────────

export async function listTrips(
  userId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<{ trips: TripSummary[]; total: number }> {
  const { page = 1, pageSize = 20 } = options;

  const cached = await redis.get(CacheKeys.userTrips(userId));
  if (cached && page === 1 && pageSize === 20) {
    return JSON.parse(cached) as { trips: TripSummary[]; total: number };
  }

  const [trips, total] = await Promise.all([
    db.trip.findMany({
      where: { userId, deletedAt: null },
      select: TRIP_SELECT,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.trip.count({ where: { userId, deletedAt: null } }),
  ]);

  const result = { trips: trips as TripSummary[], total };

  if (page === 1 && pageSize === 20) {
    await redis.setex(
      CacheKeys.userTrips(userId),
      CacheTTL.USER_TRIPS,
      JSON.stringify(result),
    );
  }

  return result;
}

export async function getTripById(
  tripId: string,
  userId: string,
): Promise<TripSummary> {
  const trip = await db.trip.findUnique({
    where: { id: tripId, userId, deletedAt: null },
    select: TRIP_SELECT,
  });
  if (!trip) {
    const error = new Error("Trip not found");
    (error as NodeJS.ErrnoException).code = "NOT_FOUND";
    throw error;
  }
  return trip as TripSummary;
}

// ── Write operations ───────────────────────────────────────────────────────

export async function createTrip(
  userId: string,
  data: TripCreateInput,
): Promise<TripSummary> {
  await assertTripLimitNotReached(userId);

  const trip = await db.trip.create({
    data: {
      userId,
      title: data.title,
      destinationName: data.destinationName,
      destinationPlaceId: data.destinationPlaceId ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      travelers: data.travelers ?? 1,
      travelStyle: data.travelStyle ?? null,
      budgetTotal: data.budgetTotal ?? null,
      budgetCurrency: data.budgetCurrency ?? "BRL",
      coverGradient: data.coverGradient ?? "sunset",
      coverEmoji: data.coverEmoji ?? null,
      status: "PLANNING",
      visibility: "PRIVATE",
    },
    select: TRIP_SELECT,
  });

  await invalidateUserTripsCache(userId);
  return trip as TripSummary;
}

export async function updateTrip(
  tripId: string,
  userId: string,
  data: TripUpdateInput,
): Promise<TripSummary> {
  await assertOwnership(tripId, userId);

  // Validate status transition if changing status
  if (data.status) {
    const current = await db.trip.findUnique({
      where: { id: tripId },
      select: { status: true },
    });
    if (
      current &&
      !isValidStatusTransition(current.status, data.status as TripStatus)
    ) {
      throw new Error(
        `Invalid status transition: ${current.status} → ${data.status}`,
      );
    }
  }

  const trip = await db.trip.update({
    where: { id: tripId, userId, deletedAt: null },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.destinationName !== undefined && {
        destinationName: data.destinationName,
      }),
      ...(data.destinationPlaceId !== undefined && {
        destinationPlaceId: data.destinationPlaceId,
      }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.endDate !== undefined && { endDate: data.endDate }),
      ...(data.travelers !== undefined && { travelers: data.travelers }),
      ...(data.travelStyle !== undefined && { travelStyle: data.travelStyle }),
      ...(data.budgetTotal !== undefined && { budgetTotal: data.budgetTotal }),
      ...(data.budgetCurrency !== undefined && {
        budgetCurrency: data.budgetCurrency,
      }),
      ...(data.coverGradient !== undefined && {
        coverGradient: data.coverGradient,
      }),
      ...(data.coverEmoji !== undefined && { coverEmoji: data.coverEmoji }),
      ...(data.status !== undefined && { status: data.status as TripStatus }),
    },
    select: TRIP_SELECT,
  });

  await invalidateUserTripsCache(userId);
  return trip as TripSummary;
}

export async function archiveTrip(
  tripId: string,
  userId: string,
): Promise<void> {
  await assertOwnership(tripId, userId);
  const current = await db.trip.findUnique({
    where: { id: tripId },
    select: { status: true },
  });
  if (!current || !isValidStatusTransition(current.status, "ARCHIVED")) {
    throw new Error("Cannot archive this trip in its current state");
  }
  await db.trip.update({
    where: { id: tripId, userId },
    data: { status: "ARCHIVED" },
  });
  await invalidateUserTripsCache(userId);
}

export async function deleteTrip(
  tripId: string,
  userId: string,
  confirmTitle: string,
): Promise<void> {
  const trip = await db.trip.findUnique({
    where: { id: tripId, userId, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!trip) {
    const error = new Error("Trip not found");
    (error as NodeJS.ErrnoException).code = "NOT_FOUND";
    throw error;
  }
  if (trip.title !== confirmTitle) {
    throw new Error("Confirmation title does not match");
  }
  await db.trip.update({
    where: { id: tripId, userId },
    data: { deletedAt: new Date() },
  });
  await invalidateUserTripsCache(userId);
}
