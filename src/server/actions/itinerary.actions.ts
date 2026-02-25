"use server";

import { auth } from "@/lib/auth";
import {
  saveItineraryPlan as serviceSaveItineraryPlan,
  getItineraryPlan as serviceGetItineraryPlan,
  addActivity as serviceAddActivity,
  deleteActivity as serviceDeleteActivity,
  reorderActivities as serviceReorderActivities,
} from "@/server/services/itinerary.service";
import type { ItineraryPlan } from "@/types/ai.types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

function handleError(error: unknown): ActionResult {
  const err = error as NodeJS.ErrnoException;
  if (err.code === "FORBIDDEN")
    return { success: false, error: "Acesso negado.", code: "FORBIDDEN" };
  if (err.code === "NOT_FOUND")
    return { success: false, error: "Itinerário não encontrado.", code: "NOT_FOUND" };
  console.error("[itinerary.actions] Unexpected error:", err.message);
  return { success: false, error: "Erro interno. Tente novamente." };
}

// ── Save full AI-generated plan ────────────────────────────────────────────

export async function saveItineraryPlan(
  tripId: string,
  plan: ItineraryPlan,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await serviceSaveItineraryPlan(tripId, session.user.id, plan);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}

// ── Get saved itinerary plan ───────────────────────────────────────────────

export async function getItineraryPlan(
  tripId: string,
): Promise<ActionResult<ItineraryPlan | null>> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    const plan = await serviceGetItineraryPlan(tripId, session.user.id);
    return { success: true, data: plan };
  } catch (error) {
    return handleError(error) as ActionResult<ItineraryPlan | null>;
  }
}

// ── Add a single activity ──────────────────────────────────────────────────

export async function addActivity(
  dayId: string,
  tripId: string,
  data: {
    title: string;
    description?: string;
    startTime?: string;
    category?: string;
  },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await serviceAddActivity(dayId, tripId, session.user.id, data);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}

// ── Delete an activity ─────────────────────────────────────────────────────

export async function deleteActivity(
  activityId: string,
  tripId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await serviceDeleteActivity(activityId, tripId, session.user.id);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}

// ── Reorder activities ─────────────────────────────────────────────────────

export async function reorderActivities(
  tripId: string,
  updates: Array<{ id: string; orderIndex: number; dayNumber?: number }>,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await serviceReorderActivities(tripId, session.user.id, updates);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}
