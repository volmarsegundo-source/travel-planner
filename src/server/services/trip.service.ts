import "server-only";
import { db } from "@/server/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { MAX_TRIPS_PER_USER } from "@/lib/constants";
import type { TripCreateInput, TripUpdateInput } from "@/lib/validations/trip.schema";

export class TripService {
  static async getUserTrips(userId: string) {
    return db.trip.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getTripById(tripId: string, userId: string) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
    });

    if (!trip) {
      throw new NotFoundError("Trip", tripId);
    }

    if (trip.userId !== userId && trip.visibility === "PRIVATE") {
      throw new ForbiddenError();
    }

    return trip;
  }

  static async createTrip(userId: string, data: TripCreateInput) {
    const count = await db.trip.count({
      where: { userId, deletedAt: null },
    });

    if (count >= MAX_TRIPS_PER_USER) {
      throw new Error(`Maximum of ${MAX_TRIPS_PER_USER} trips per user reached`);
    }

    return db.trip.create({
      data: { ...data, userId },
    });
  }

  static async updateTrip(
    tripId: string,
    userId: string,
    data: TripUpdateInput
  ) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
    });

    if (!trip) {
      throw new NotFoundError("Trip", tripId);
    }

    if (trip.userId !== userId) {
      throw new ForbiddenError();
    }

    return db.trip.update({
      where: { id: tripId },
      data,
    });
  }

  static async deleteTrip(tripId: string, userId: string) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
    });

    if (!trip) {
      throw new NotFoundError("Trip", tripId);
    }

    if (trip.userId !== userId) {
      throw new ForbiddenError();
    }

    return db.trip.update({
      where: { id: tripId },
      data: { deletedAt: new Date() },
    });
  }
}
