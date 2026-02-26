"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { TripService } from "@/server/services/trip.service";
import {
  TripCreateSchema,
  TripUpdateSchema,
} from "@/lib/validations/trip.schema";
import type { TripCreateInput, TripUpdateInput } from "@/lib/validations/trip.schema";
import type { ActionResult, PaginatedResult, Trip } from "@/types/trip.types";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

// ─── createTripAction ─────────────────────────────────────────────────────────

export async function createTripAction(
  data: TripCreateInput
): Promise<ActionResult<Trip>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = TripCreateSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  try {
    const trip = await TripService.createTrip(session.user.id, parsed.data);
    revalidatePath("/trips");
    return { success: true, data: trip };
  } catch (error) {
    logger.error("trip.createTripAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── updateTripAction ─────────────────────────────────────────────────────────

export async function updateTripAction(
  tripId: string,
  data: TripUpdateInput
): Promise<ActionResult<Trip>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = TripUpdateSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  try {
    const trip = await TripService.updateTrip(
      tripId,
      session.user.id,
      parsed.data
    );
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}`);
    return { success: true, data: trip };
  } catch (error) {
    logger.error("trip.updateTripAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── deleteTripAction ─────────────────────────────────────────────────────────

export async function deleteTripAction(
  tripId: string,
  confirmTitle: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Fetch the trip first so we can validate the confirmation title.
  let existingTrip: Trip;
  try {
    existingTrip = await TripService.getTripById(tripId, session.user.id);
  } catch (error) {
    return { success: false, error: mapErrorToKey(error) };
  }

  if (existingTrip.title !== confirmTitle) {
    return { success: false, error: "trips.errors.titleRequired" };
  }

  try {
    await TripService.deleteTrip(tripId, session.user.id);
    revalidatePath("/trips");
    return { success: true };
  } catch (error) {
    logger.error("trip.deleteTripAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── listUserTripsAction ──────────────────────────────────────────────────────

export async function listUserTripsAction(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<ActionResult<PaginatedResult<Trip>>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const result = await TripService.getUserTrips(
      session.user.id,
      page,
      pageSize
    );
    return { success: true, data: result };
  } catch (error) {
    logger.error("trip.listUserTripsAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getTripByIdAction ────────────────────────────────────────────────────────

export async function getTripByIdAction(
  tripId: string
): Promise<ActionResult<Trip>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const trip = await TripService.getTripById(tripId, session.user.id);
    return { success: true, data: trip };
  } catch (error) {
    logger.error("trip.getTripByIdAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
