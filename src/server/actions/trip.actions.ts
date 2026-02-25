"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  TripCreateSchema,
  TripUpdateSchema,
  TripDeleteSchema,
} from "@/lib/validations/trip.schema";
import {
  createTrip,
  updateTrip,
  archiveTrip,
  deleteTrip,
  listTrips,
  getTripById,
} from "@/server/services/trip.service";
import type { TripCreateInput, TripUpdateInput } from "@/lib/validations/trip.schema";
import type { TripSummary } from "@/types/trip.types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

function handleError(error: unknown): ActionResult {
  const err = error as NodeJS.ErrnoException;
  if (err.code === "FORBIDDEN")
    return { success: false, error: "Acesso negado.", code: "FORBIDDEN" };
  if (err.code === "NOT_FOUND")
    return { success: false, error: "Viagem não encontrada.", code: "NOT_FOUND" };
  if (err.code === "TRIP_LIMIT_REACHED")
    return {
      success: false,
      error: "Limite de 20 viagens ativas atingido. Archive ou exclua uma viagem.",
      code: "TRIP_LIMIT_REACHED",
    };
  console.error("[trip.actions] Unexpected error:", err.message);
  return { success: false, error: "Erro interno. Tente novamente." };
}

export async function listUserTrips(
  options: { page?: number; pageSize?: number } = {},
): Promise<ActionResult<{ trips: TripSummary[]; total: number }>> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    const data = await listTrips(session.user.id, options);
    return { success: true, data };
  } catch (error) {
    return handleError(error) as ActionResult<{ trips: TripSummary[]; total: number }>;
  }
}

export async function getUserTripById(
  tripId: string,
): Promise<ActionResult<TripSummary>> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    const trip = await getTripById(tripId, session.user.id);
    return { success: true, data: trip };
  } catch (error) {
    return handleError(error) as ActionResult<TripSummary>;
  }
}

export async function createUserTrip(
  data: TripCreateInput,
): Promise<ActionResult<TripSummary>> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  const parsed = TripCreateSchema.safeParse(data);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };

  let newTripId: string | undefined;
  try {
    const trip = await createTrip(session.user.id, parsed.data);
    newTripId = trip.id;
  } catch (error) {
    return handleError(error) as ActionResult<TripSummary>;
  }

  redirect(`/trips/${newTripId}`);
}

export async function updateUserTrip(
  tripId: string,
  data: TripUpdateInput,
): Promise<ActionResult<TripSummary>> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  const parsed = TripUpdateSchema.safeParse(data);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };

  try {
    const trip = await updateTrip(tripId, session.user.id, parsed.data);
    return { success: true, data: trip };
  } catch (error) {
    return handleError(error) as ActionResult<TripSummary>;
  }
}

export async function archiveUserTrip(
  tripId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await archiveTrip(tripId, session.user.id);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteUserTrip(
  tripId: string,
  confirmTitle: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  const parsed = TripDeleteSchema.safeParse({ confirmTitle });
  if (!parsed.success)
    return { success: false, error: "Confirmação inválida." };

  let redirectTo: string | undefined;
  try {
    await deleteTrip(tripId, session.user.id, confirmTitle);
    redirectTo = "/trips";
  } catch (error) {
    return handleError(error);
  }

  redirect(redirectTo);
}
