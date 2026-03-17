// ─── Expedition Filtering & Sorting (pure functions, isomorphic) ──────────────
//
// Client-side filtering and sorting for the expeditions dashboard.
// All functions are pure — no side effects, no state, no DOM.

import type {
  ExpeditionDTO,
  ExpeditionStatusFilter,
  ExpeditionSortField,
} from "@/types/expedition.types";
import { deriveExpeditionStatus } from "@/types/expedition.types";

/**
 * Filters expeditions by visual status.
 * "all" returns everything.
 * "active" returns planned + active + overdue (anything not completed).
 * "completed" returns only completed expeditions.
 */
export function filterExpeditions(
  expeditions: ExpeditionDTO[],
  status: ExpeditionStatusFilter
): ExpeditionDTO[] {
  if (status === "all") return expeditions;

  return expeditions.filter((exp) => {
    const derived = deriveExpeditionStatus(exp);
    if (status === "active") {
      return derived !== "completed";
    }
    return derived === "completed";
  });
}

/**
 * Sorts expeditions by the selected field.
 * Returns a new array (does not mutate input).
 *
 * - "newest": createdAt descending (most recent first)
 * - "departure": startDate ascending (soonest first, nulls last)
 * - "destination": alphabetical A-Z
 */
export function sortExpeditions(
  expeditions: ExpeditionDTO[],
  field: ExpeditionSortField
): ExpeditionDTO[] {
  const sorted = [...expeditions];

  sorted.sort((a, b) => {
    switch (field) {
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);

      case "departure": {
        // Nulls go to the end
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate.localeCompare(b.startDate);
      }

      case "destination":
        return a.destination.localeCompare(b.destination);

      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * Applies both filter and sort to the expeditions list.
 */
export function filterAndSortExpeditions(
  expeditions: ExpeditionDTO[],
  status: ExpeditionStatusFilter,
  sort: ExpeditionSortField
): ExpeditionDTO[] {
  const filtered = filterExpeditions(expeditions, status);
  return sortExpeditions(filtered, sort);
}
