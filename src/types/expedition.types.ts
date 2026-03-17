// ─── Expedition DTO for Dashboard ─────────────────────────────────────────────
//
// Plain serializable object for client components. No Date objects or Prisma types.
// Used by both the server component (page.tsx) and client dashboard component.

export interface ExpeditionDTO {
  id: string;
  destination: string;
  currentPhase: number;
  completedPhases: number;
  totalPhases: number;
  coverEmoji: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  tripType: string;
  destinationLat: number | null;
  destinationLon: number | null;
  checklistRequired: number;
  checklistRequiredDone: number;
  checklistRecommendedPending: number;
  hasItineraryPlan: boolean;
  createdAt: string;
}

// ─── Filter/Sort types ───────────────────────────────────────────────────────

export type ExpeditionStatusFilter = "all" | "active" | "completed";

export type ExpeditionSortField = "newest" | "departure" | "destination";

export type ExpeditionStatus = "active" | "completed" | "overdue" | "planned";

/**
 * Derives visual status from expedition data.
 * - "completed": completedPhases >= totalPhases
 * - "overdue": startDate < today AND not completed
 * - "active": currentPhase > 1 AND not completed
 * - "planned": currentPhase <= 1 AND not completed
 */
export function deriveExpeditionStatus(exp: ExpeditionDTO): ExpeditionStatus {
  const isCompleted = exp.completedPhases >= exp.totalPhases;
  if (isCompleted) return "completed";

  if (exp.startDate) {
    const start = new Date(exp.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) return "overdue";
  }

  if (exp.currentPhase > 1) return "active";
  return "planned";
}
