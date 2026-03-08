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
    badgeKey: "first_step",
    rankPromotion: null,
  },
  {
    phaseNumber: 2,
    name: "O Explorador",
    nameKey: "phases.theExplorer",
    isFree: true,
    pointsReward: 150,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: "explorer",
  },
  {
    phaseNumber: 3,
    name: "A Rota",
    nameKey: "phases.theRoute",
    isFree: true,
    pointsReward: 75,
    aiCost: 100,
    badgeKey: "navigator",
    rankPromotion: null,
  },
  {
    phaseNumber: 4,
    name: "O Abrigo",
    nameKey: "phases.theShelter",
    isFree: true,
    pointsReward: 50,
    aiCost: 100,
    badgeKey: "host",
    rankPromotion: null,
  },
  {
    phaseNumber: 5,
    name: "O Mapa dos Dias",
    nameKey: "phases.theDayMap",
    isFree: true,
    pointsReward: 40,
    aiCost: 150,
    badgeKey: null,
    rankPromotion: "cartographer",
  },
  {
    phaseNumber: 6,
    name: "O Tesouro",
    nameKey: "phases.theTreasure",
    isFree: false,
    pointsReward: 250,
    aiCost: 0,
    badgeKey: "treasurer",
    rankPromotion: null,
  },
  {
    phaseNumber: 7,
    name: "A Expedição",
    nameKey: "phases.theExpedition",
    isFree: false,
    pointsReward: 400,
    aiCost: 0,
    badgeKey: null,
    rankPromotion: "pathfinder",
  },
  {
    phaseNumber: 8,
    name: "O Legado",
    nameKey: "phases.theLegacy",
    isFree: false,
    pointsReward: 500,
    aiCost: 0,
    badgeKey: "ambassador",
    rankPromotion: null,
  },
] as const;

export const TOTAL_PHASES = PHASE_DEFINITIONS.length;

export function getPhaseDefinition(
  phaseNumber: PhaseNumber
): PhaseDefinition | undefined {
  return PHASE_DEFINITIONS.find((p) => p.phaseNumber === phaseNumber);
}
