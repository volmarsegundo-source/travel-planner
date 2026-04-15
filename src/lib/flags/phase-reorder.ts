// ─── Phase Reorder Feature Flag (Sprint 44 Wave 1) ───────────────────────────
//
// Single source of truth for the PHASE_REORDER_ENABLED flag.
//
// - Flag OFF (default): engines use the original phase order
//   (1 Inspiration, 2 Profile, 3 Checklist, 4 Logistics, 5 Guide, 6 Itinerary).
// - Flag ON: engines use the new phase order
//   (1 Inspiration, 2 Profile, 3 Guide, 4 Itinerary, 5 Logistics, 6 Checklist).
//
// Controlled exclusively by the NEXT_PUBLIC_PHASE_REORDER_ENABLED env var.
// Safe to import in both server and client contexts (no server-only import).
//
// Spec ref: SPEC-ARCH-REORDER-PHASES §3, SPRINT-44-IMPACT-REPORT §Wave-1

import { env } from "@/lib/env";

/**
 * Returns true when the phase reorder (Sprint 44) is active.
 *
 * - false (default): original order — Checklist=3, Logistics=4, Guide=5, Itinerary=6
 * - true: new order — Guide=3, Itinerary=4, Logistics=5, Checklist=6
 *
 * All engine functions that change behaviour under this flag delegate to
 * this helper so there is a single toggle point for rollback.
 */
export function isPhaseReorderEnabled(): boolean {
  return env.NEXT_PUBLIC_PHASE_REORDER_ENABLED;
}
