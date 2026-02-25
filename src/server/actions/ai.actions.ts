"use server";

import { auth } from "@/lib/auth";
import { getUserTripById } from "@/server/actions/trip.actions";
import {
  generateTravelPlan,
  generateChecklist,
} from "@/server/services/ai.service";
import type { ItineraryPlan, ChecklistCategory } from "@/types/ai.types";

type AiActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// ── Generate travel plan ───────────────────────────────────────────────────

export async function generateTripPlan(
  tripId: string,
): Promise<AiActionResult<ItineraryPlan>> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  const tripResult = await getUserTripById(tripId);
  if (!tripResult.success)
    return { success: false, error: tripResult.error, code: "NOT_FOUND" };

  const trip = tripResult.data;

  try {
    const plan = await generateTravelPlan({
      destination: trip.destinationName,
      startDate: trip.startDate ? new Date(trip.startDate) : null,
      endDate: trip.endDate ? new Date(trip.endDate) : null,
      travelStyle: trip.travelStyle ?? null,
      budgetTotal: trip.budgetTotal ? Number(trip.budgetTotal) : null,
      budgetCurrency: trip.budgetCurrency ?? "BRL",
      travelers: trip.travelers,
      language: "pt-BR",
    });

    return { success: true, data: plan };
  } catch (error) {
    console.error("[ai.actions] generateTripPlan error:", error);
    return {
      success: false,
      error: "Erro ao gerar o plano. Tente novamente.",
      code: "AI_ERROR",
    };
  }
}

// ── Generate checklist ─────────────────────────────────────────────────────

export async function generateTripChecklist(
  tripId: string,
): Promise<AiActionResult<ChecklistCategory[]>> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  const tripResult = await getUserTripById(tripId);
  if (!tripResult.success)
    return { success: false, error: tripResult.error, code: "NOT_FOUND" };

  const trip = tripResult.data;

  try {
    const checklist = await generateChecklist({
      destination: trip.destinationName,
      startDate: trip.startDate ? new Date(trip.startDate) : null,
      endDate: trip.endDate ? new Date(trip.endDate) : null,
      travelers: trip.travelers,
      language: "pt-BR",
    });

    return { success: true, data: checklist };
  } catch (error) {
    console.error("[ai.actions] generateTripChecklist error:", error);
    return {
      success: false,
      error: "Erro ao gerar o checklist. Tente novamente.",
      code: "AI_ERROR",
    };
  }
}
