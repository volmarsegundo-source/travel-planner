// ─── Atlas Phase Configuration (pure data — no server-only) ─────────────────

import type { PhaseDefinition, PhaseNumber } from "@/types/gamification.types";

export const PHASE_DEFINITIONS: readonly PhaseDefinition[] = [
  {
    phaseNumber: 1,
    name: "O Chamado",
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
    name: "O Explorador",
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

export function getPhaseDefinition(
  phaseNumber: PhaseNumber
): PhaseDefinition | undefined {
  return PHASE_DEFINITIONS.find((p) => p.phaseNumber === phaseNumber);
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

export function getPhaseTools(phaseNumber: number): PhaseTool[] {
  return PHASE_TOOLS[phaseNumber] ?? [];
}
