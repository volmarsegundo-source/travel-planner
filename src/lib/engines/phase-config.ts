// ─── Atlas Phase Configuration (pure data — no server-only) ─────────────────
//
// Sprint 44: this module now exposes two sets of definitions:
//   - PHASE_DEFINITIONS: original order (flag OFF) — never mutated, backward-compat
//   - PHASE_DEFINITIONS_REORDERED: new order (flag ON)
//   - getPhaseDefinitions(): returns the active set based on PHASE_REORDER flag
//
// Spec ref: SPEC-ARCH-REORDER-PHASES §3.1, §3.3

import type { PhaseDefinition, PhaseNumber } from "@/types/gamification.types";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

export const PHASE_DEFINITIONS: readonly PhaseDefinition[] = [
  {
    phaseNumber: 1,
    name: "A Inspiração",
    nameKey: "phases.theCalling",
    isFree: true,
    pointsReward: 100,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: false,
  },
  {
    phaseNumber: 2,
    name: "O Perfil",
    nameKey: "phases.theExplorer",
    isFree: true,
    pointsReward: 150,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: "desbravador",
    nonBlocking: false,
  },
  {
    phaseNumber: 3,
    name: "O Preparo",
    nameKey: "phases.thePreparation",
    isFree: true,
    pointsReward: 75,
    aiCost: 30,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: true,
  },
  {
    phaseNumber: 4,
    name: "A Logística",
    nameKey: "phases.theLogistics",
    isFree: true,
    pointsReward: 50,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: true,
  },
  {
    phaseNumber: 5,
    name: "Guia do Destino",
    nameKey: "phases.theDestinationGuide",
    isFree: true,
    pointsReward: 40,
    aiCost: 50,
    badgeKey: null,
    rankPromotion: "capitao",
    nonBlocking: false,
  },
  {
    phaseNumber: 6,
    name: "O Roteiro",
    nameKey: "phases.theItinerary",
    isFree: false,
    pointsReward: 250,
    aiCost: 80,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: false,
  },
  {
    phaseNumber: 7,
    name: "A Expedição",
    nameKey: "phases.theExpedition",
    isFree: false,
    pointsReward: 400,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: "aventureiro",
    nonBlocking: false,
  },
  {
    phaseNumber: 8,
    name: "O Legado",
    nameKey: "phases.theLegacy",
    isFree: false,
    pointsReward: 500,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: false,
  },
] as const;

export const TOTAL_PHASES = PHASE_DEFINITIONS.length;

// ─── Sprint 44: Reordered Phase Definitions ─────────────────────────────────
//
// New order: Inspiration(1) → Profile(2) → Guide(3) → Itinerary(4) → Logistics(5) → Checklist(6)
//
// PA values are by semantic CONTENT, not position:
//   Guide      → aiCost=50,  pointsReward=40,  nonBlocking=false
//   Itinerary  → aiCost=80,  pointsReward=250, nonBlocking=false (premium hub)
//   Logistics  → aiCost=0,   pointsReward=50,  nonBlocking=true  (anytime)
//   Checklist  → aiCost=30,  pointsReward=75,  nonBlocking=true  (iterative)
//
// Phases 1 and 2 are semantically identical in both orderings.
// Phases 7 and 8 are coming-soon and unaffected.
//
// NON_BLOCKING_PHASES (new) = { 5, 6 } — see SPEC-ARCH §3.3
//
// Spec ref: SPEC-ARCH-REORDER-PHASES §3.1, §3.3, §3.4
// Spec ref: SPEC-PROD-REORDER-PHASES (PA values)

export const PHASE_DEFINITIONS_REORDERED: readonly PhaseDefinition[] = [
  {
    phaseNumber: 1,
    name: "A Inspiração",
    nameKey: "phases.theCalling",
    isFree: true,
    pointsReward: 100,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: false,
  },
  {
    phaseNumber: 2,
    name: "O Perfil",
    nameKey: "phases.theExplorer",
    isFree: true,
    pointsReward: 150,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: "desbravador",
    nonBlocking: false,
  },
  {
    // OLD phase 5 — Guia do Destino — now position 3
    phaseNumber: 3,
    name: "Guia do Destino",
    nameKey: "phases.theDestinationGuide",
    isFree: true,
    pointsReward: 40,
    aiCost: 50,
    badgeKey: null,
    rankPromotion: "capitao",
    nonBlocking: false,
  },
  {
    // OLD phase 6 — O Roteiro — now position 4
    phaseNumber: 4,
    name: "O Roteiro",
    nameKey: "phases.theItinerary",
    isFree: false,
    pointsReward: 250,
    aiCost: 80,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: false,
  },
  {
    // OLD phase 4 — A Logística — now position 5
    phaseNumber: 5,
    name: "A Logística",
    nameKey: "phases.theLogistics",
    isFree: true,
    pointsReward: 50,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: true,
  },
  {
    // OLD phase 3 — O Preparo — now position 6
    phaseNumber: 6,
    name: "O Preparo",
    nameKey: "phases.thePreparation",
    isFree: true,
    pointsReward: 75,
    aiCost: 30,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: true,
  },
  {
    phaseNumber: 7,
    name: "A Expedição",
    nameKey: "phases.theExpedition",
    isFree: false,
    pointsReward: 400,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: "aventureiro",
    nonBlocking: false,
  },
  {
    phaseNumber: 8,
    name: "O Legado",
    nameKey: "phases.theLegacy",
    isFree: false,
    pointsReward: 500,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: null,
    nonBlocking: false,
  },
] as const;

/**
 * Returns the active phase definitions based on the PHASE_REORDER feature flag.
 *
 * - flag OFF: returns PHASE_DEFINITIONS (original order — backward compatible)
 * - flag ON:  returns PHASE_DEFINITIONS_REORDERED (new order per Sprint 44)
 *
 * Prefer this function over PHASE_DEFINITIONS in any code that must be
 * flag-aware. Use PHASE_DEFINITIONS directly only in legacy code that
 * intentionally runs only when the flag is OFF.
 */
export function getPhaseDefinitions(): readonly PhaseDefinition[] {
  return isPhaseReorderEnabled() ? PHASE_DEFINITIONS_REORDERED : PHASE_DEFINITIONS;
}

/**
 * Returns the definition for a given phase number.
 * Uses the active set (flag-aware) — returns the definition whose position
 * in the current ordering corresponds to the given phaseNumber.
 */
export function getPhaseDefinition(
  phaseNumber: PhaseNumber
): PhaseDefinition | undefined {
  return getPhaseDefinitions().find((p) => p.phaseNumber === phaseNumber);
}

// ─── Phase Tools Configuration ──────────────────────────────────────────────

export interface PhaseTool {
  key: string;
  iconName: string;
  href: (tripId: string) => string;
  status: "available" | "coming_soon";
  labelKey: string;
}

export const PHASE_TOOLS: Record<number, PhaseTool[]> = {
  1: [],
  2: [],
  3: [
    {
      key: "destination_guide",
      iconName: "BookOpen",
      href: (tripId) => `/expedition/${tripId}/phase-5`,
      status: "available",
      labelKey: "dashboard.tools.destinationGuide",
    },
  ],
  4: [
    {
      key: "transport",
      iconName: "Plane",
      href: (tripId) => `/expedition/${tripId}/phase-4`,
      status: "available",
      labelKey: "dashboard.tools.transport",
    },
  ],
  5: [
    {
      key: "checklist",
      iconName: "CheckSquare",
      href: (tripId) => `/expedition/${tripId}/phase-3`,
      status: "available",
      labelKey: "dashboard.tools.checklist",
    },
  ],
  6: [
    {
      key: "itinerary",
      iconName: "Map",
      href: (tripId) => `/expedition/${tripId}/phase-6`,
      status: "available",
      labelKey: "dashboard.tools.itinerary",
    },
  ],
  7: [
    {
      key: "live_tracker",
      iconName: "Navigation",
      href: () => "#",
      status: "coming_soon",
      labelKey: "dashboard.tools.liveTracker",
    },
    {
      key: "cost_manager",
      iconName: "Wallet",
      href: () => "#",
      status: "coming_soon",
      labelKey: "dashboard.tools.costManager",
    },
  ],
  8: [
    {
      key: "retrospective",
      iconName: "History",
      href: () => "#",
      status: "coming_soon",
      labelKey: "dashboard.tools.retrospective",
    },
    {
      key: "community",
      iconName: "Users",
      href: () => "#",
      status: "coming_soon",
      labelKey: "dashboard.tools.community",
    },
  ],
};

// ─── Sprint 44: Reordered Phase Tools ───────────────────────────────────────
//
// PHASE_TOOLS_REORDERED maps each phase (in the new ordering) to its tools.
// - Phase 3 (Guide)      → guide tool → /phase-3
// - Phase 4 (Itinerary)  → itinerary tool → /phase-4
// - Phase 5 (Logistics)  → transport tool → /phase-5
// - Phase 6 (Checklist)  → checklist tool → /phase-6

export const PHASE_TOOLS_REORDERED: Record<number, PhaseTool[]> = {
  1: [],
  2: [],
  3: [
    {
      key: "destination_guide",
      iconName: "BookOpen",
      href: (tripId) => `/expedition/${tripId}/phase-3`,
      status: "available",
      labelKey: "dashboard.tools.destinationGuide",
    },
  ],
  4: [
    {
      key: "itinerary",
      iconName: "Map",
      href: (tripId) => `/expedition/${tripId}/phase-4`,
      status: "available",
      labelKey: "dashboard.tools.itinerary",
    },
  ],
  5: [
    {
      key: "transport",
      iconName: "Plane",
      href: (tripId) => `/expedition/${tripId}/phase-5`,
      status: "available",
      labelKey: "dashboard.tools.transport",
    },
  ],
  6: [
    {
      key: "checklist",
      iconName: "CheckSquare",
      href: (tripId) => `/expedition/${tripId}/phase-6`,
      status: "available",
      labelKey: "dashboard.tools.checklist",
    },
  ],
  7: [
    {
      key: "live_tracker",
      iconName: "Navigation",
      href: () => "#",
      status: "coming_soon",
      labelKey: "dashboard.tools.liveTracker",
    },
    {
      key: "cost_manager",
      iconName: "Wallet",
      href: () => "#",
      status: "coming_soon",
      labelKey: "dashboard.tools.costManager",
    },
  ],
  8: [
    {
      key: "retrospective",
      iconName: "History",
      href: () => "#",
      status: "coming_soon",
      labelKey: "dashboard.tools.retrospective",
    },
    {
      key: "community",
      iconName: "Users",
      href: () => "#",
      status: "coming_soon",
      labelKey: "dashboard.tools.community",
    },
  ],
};

export function getPhaseTools(phaseNumber: number): PhaseTool[] {
  const tools = isPhaseReorderEnabled() ? PHASE_TOOLS_REORDERED : PHASE_TOOLS;
  return tools[phaseNumber] ?? [];
}
