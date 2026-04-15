// ─── Phase Completion Engine (pure data + logic — isomorphic) ────────────────
//
// Single source of truth for ALL phase completion evaluation rules.
// Evaluates phase completion by inspecting actual data presence,
// NOT the ExpeditionPhase.status field.
//
// Works in both server (service) and client (optimistic UI) contexts.
// NO server-only imports — pure TypeScript.
//
// Sprint 44: flag-aware dispatch added.
// - Flag OFF (default): original mapping (phase3=Checklist, phase4=Logistics,
//   phase5=Guide, phase6=Itinerary)
// - Flag ON: new mapping (phase3=Guide, phase4=Itinerary, phase5=Logistics,
//   phase6=Checklist)
//
// `PhaseDataSnapshot` keys (`phase3..phase6`) are position-based, NOT
// semantic — the CALLER is responsible for placing the correct data under
// the correct key according to the active flag.
//
// Spec refs: SPEC-ARCH-016 §5, SPEC-PROD-023
// Spec refs: SPEC-ARCH-REORDER-PHASES §3.1

// ─── Types ───────────────────────────────────────────────────────────────────

export type PhaseCompletionStatus =
  | "completed"    // All required data present
  | "in_progress"  // Some data present but not all requirements met
  | "pending";     // No meaningful data present

export interface PhaseDataSnapshot {
  phase1: {
    hasDestination: boolean;
    hasStartDate: boolean;
    hasEndDate: boolean;
    hasUserName: boolean;
    hasUserBirthDate: boolean;
  };
  phase2: {
    hasTravelerType: boolean;
  };
  phase3: {
    totalRequired: number;
    completedRequired: number;
    hasAnyItems: boolean;
  };
  phase4: {
    transportSegmentCount: number;
    accommodationCount: number;
    transportUndecided?: boolean;
    accommodationUndecided?: boolean;
    mobilityUndecided?: boolean;
  };
  phase5: {
    hasGuide: boolean;
  };
  phase6: {
    itineraryDayCount: number;
  };
}

export interface PhaseCompletionRequirement {
  key: string;
  met: boolean;
  label: string;
}

export interface PhaseCompletionResult {
  phase: number;
  status: PhaseCompletionStatus;
  /** Which specific requirements are met/unmet (for UI display) */
  requirements: PhaseCompletionRequirement[];
}

export interface ExpeditionCompletionSummary {
  phases: PhaseCompletionResult[];
  completedCount: number;
  totalPhases: number;
  isComplete: boolean;
}

import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_COMPLETION_PHASES = 6;

// ─── Per-Phase Evaluation Rules ─────────────────────────────────────────────

function evaluatePhase1(
  data: PhaseDataSnapshot["phase1"]
): PhaseCompletionResult {
  const requirements: PhaseCompletionRequirement[] = [
    { key: "destination", met: data.hasDestination, label: "phase1.destination" },
    { key: "startDate", met: data.hasStartDate, label: "phase1.startDate" },
    { key: "endDate", met: data.hasEndDate, label: "phase1.endDate" },
    { key: "userName", met: data.hasUserName, label: "phase1.userName" },
    { key: "userBirthDate", met: data.hasUserBirthDate, label: "phase1.userBirthDate" },
  ];

  const allMet = requirements.every((r) => r.met);
  const anyMet = requirements.some((r) => r.met);

  return {
    phase: 1,
    status: allMet ? "completed" : anyMet ? "in_progress" : "pending",
    requirements,
  };
}

function evaluatePhase2(
  data: PhaseDataSnapshot["phase2"]
): PhaseCompletionResult {
  const requirements: PhaseCompletionRequirement[] = [
    { key: "travelerType", met: data.hasTravelerType, label: "phase2.travelerType" },
  ];

  return {
    phase: 2,
    status: data.hasTravelerType ? "completed" : "pending",
    requirements,
  };
}

function evaluatePhase3(
  data: PhaseDataSnapshot["phase3"]
): PhaseCompletionResult {
  const requirements: PhaseCompletionRequirement[] = [
    {
      key: "mandatoryChecklist",
      met: data.totalRequired > 0 && data.completedRequired === data.totalRequired,
      label: "phase3.mandatoryChecklist",
    },
  ];

  if (!data.hasAnyItems) {
    return { phase: 3, status: "pending", requirements };
  }

  const allRequiredDone =
    data.totalRequired > 0 && data.completedRequired === data.totalRequired;

  return {
    phase: 3,
    status: allRequiredDone ? "completed" : "in_progress",
    requirements,
  };
}

function evaluatePhase4(
  data: PhaseDataSnapshot["phase4"]
): PhaseCompletionResult {
  const hasTransport = data.transportSegmentCount > 0;
  const hasAccommodation = data.accommodationCount > 0;
  const hasEither = hasTransport || hasAccommodation;
  const anyUndecided = Boolean(
    data.transportUndecided || data.accommodationUndecided || data.mobilityUndecided
  );

  const requirements: PhaseCompletionRequirement[] = [
    {
      key: "logisticsEntry",
      met: hasEither,
      label: "phase4.logisticsEntry",
    },
  ];

  if (anyUndecided) {
    if (data.transportUndecided) {
      requirements.push({ key: "transportUndecided", met: false, label: "phase4.transportUndecided" });
    }
    if (data.accommodationUndecided) {
      requirements.push({ key: "accommodationUndecided", met: false, label: "phase4.accommodationUndecided" });
    }
    if (data.mobilityUndecided) {
      requirements.push({ key: "mobilityUndecided", met: false, label: "phase4.mobilityUndecided" });
    }
  }

  // All 3 undecided + no data → "pending" (completed with caveats, not actively in progress)
  // Partial undecided (some data, some undecided) → "in_progress"
  const allUndecided = data.transportUndecided && data.accommodationUndecided && data.mobilityUndecided;
  if (anyUndecided) {
    return { phase: 4, status: allUndecided && !hasEither ? "pending" : "in_progress", requirements };
  }

  return {
    phase: 4,
    status: hasEither ? "completed" : "pending",
    requirements,
  };
}

function evaluatePhase5(
  data: PhaseDataSnapshot["phase5"]
): PhaseCompletionResult {
  const requirements: PhaseCompletionRequirement[] = [
    { key: "guide", met: data.hasGuide, label: "phase5.guide" },
  ];

  return {
    phase: 5,
    status: data.hasGuide ? "completed" : "pending",
    requirements,
  };
}

function evaluatePhase6(
  data: PhaseDataSnapshot["phase6"]
): PhaseCompletionResult {
  const hasItinerary = data.itineraryDayCount > 0;

  const requirements: PhaseCompletionRequirement[] = [
    { key: "itinerary", met: hasItinerary, label: "phase6.itinerary" },
  ];

  return {
    phase: 6,
    status: hasItinerary ? "completed" : "pending",
    requirements,
  };
}

// ─── Core Engine Functions ──────────────────────────────────────────────────

/**
 * Dispatch table for the ORIGINAL phase ordering (flag OFF):
 *   phase 3 → Checklist evaluator (snapshot.phase3 has checklist data)
 *   phase 4 → Logistics evaluator (snapshot.phase4 has logistics data)
 *   phase 5 → Guide evaluator     (snapshot.phase5 has guide data)
 *   phase 6 → Itinerary evaluator (snapshot.phase6 has itinerary data)
 */
function evaluatePhaseOriginal(
  phaseNumber: number,
  snapshot: PhaseDataSnapshot
): PhaseCompletionResult {
  switch (phaseNumber) {
    case 1: return evaluatePhase1(snapshot.phase1);
    case 2: return evaluatePhase2(snapshot.phase2);
    case 3: return evaluatePhase3(snapshot.phase3);
    case 4: return evaluatePhase4(snapshot.phase4);
    case 5: return evaluatePhase5(snapshot.phase5);
    case 6: return evaluatePhase6(snapshot.phase6);
    default:
      return {
        phase: phaseNumber,
        status: "pending",
        requirements: [],
      };
  }
}

/**
 * Dispatch table for the NEW phase ordering (flag ON — Sprint 44):
 *   phase 3 → Guide evaluator     (snapshot.phase3 has guide data)
 *   phase 4 → Itinerary evaluator (snapshot.phase4 has itinerary data)
 *   phase 5 → Logistics evaluator (snapshot.phase5 has logistics data)
 *   phase 6 → Checklist evaluator (snapshot.phase6 has checklist data)
 *
 * The CALLER must place the correct data under each key per the new ordering.
 * Spec ref: SPEC-ARCH-REORDER-PHASES §3.1
 */
function evaluatePhaseReordered(
  phaseNumber: number,
  snapshot: PhaseDataSnapshot
): PhaseCompletionResult {
  switch (phaseNumber) {
    case 1: return evaluatePhase1(snapshot.phase1);
    case 2: return evaluatePhase2(snapshot.phase2);
    // New phase 3 = Guide (snapshot.phase3 must contain hasGuide)
    case 3: {
      const guideData = snapshot.phase3 as unknown as PhaseDataSnapshot["phase5"];
      return { ...evaluatePhase5(guideData), phase: 3 };
    }
    // New phase 4 = Itinerary (snapshot.phase4 must contain itineraryDayCount)
    case 4: {
      const itineraryData = snapshot.phase4 as unknown as PhaseDataSnapshot["phase6"];
      return { ...evaluatePhase6(itineraryData), phase: 4 };
    }
    // New phase 5 = Logistics (snapshot.phase5 must contain transportSegmentCount, etc.)
    case 5: {
      const logisticsData = snapshot.phase5 as unknown as PhaseDataSnapshot["phase4"];
      return { ...evaluatePhase4(logisticsData), phase: 5 };
    }
    // New phase 6 = Checklist (snapshot.phase6 must contain totalRequired, etc.)
    case 6: {
      const checklistData = snapshot.phase6 as unknown as PhaseDataSnapshot["phase3"];
      return { ...evaluatePhase3(checklistData), phase: 6 };
    }
    default:
      return {
        phase: phaseNumber,
        status: "pending",
        requirements: [],
      };
  }
}

/**
 * Evaluate completion status for a single phase.
 * Flag-aware — delegates to original or reordered dispatch table.
 *
 * - Flag OFF: original ordering (Checklist=3, Logistics=4, Guide=5, Itinerary=6)
 * - Flag ON:  new ordering (Guide=3, Itinerary=4, Logistics=5, Checklist=6)
 *
 * IMPORTANT: `snapshot` keys are position-based. The CALLER must ensure that
 * `snapshot.phase3` contains data appropriate for the active phase ordering:
 * - Flag OFF: phase3 key → checklist data
 * - Flag ON:  phase3 key → guide data
 *
 * Pure function — no DB access, no side effects.
 */
export function evaluatePhaseCompletion(
  phaseNumber: number,
  snapshot: PhaseDataSnapshot
): PhaseCompletionResult {
  return isPhaseReorderEnabled()
    ? evaluatePhaseReordered(phaseNumber, snapshot)
    : evaluatePhaseOriginal(phaseNumber, snapshot);
}

/**
 * Evaluate completion for all 6 phases.
 */
export function getExpeditionCompletionSummary(
  snapshot: PhaseDataSnapshot
): ExpeditionCompletionSummary {
  const phases = Array.from({ length: TOTAL_COMPLETION_PHASES }, (_, i) =>
    evaluatePhaseCompletion(i + 1, snapshot)
  );
  const completedCount = phases.filter((p) => p.status === "completed").length;

  return {
    phases,
    completedCount,
    totalPhases: TOTAL_COMPLETION_PHASES,
    isComplete: completedCount === TOTAL_COMPLETION_PHASES,
  };
}

/**
 * Quick check: are all 6 phases completed?
 */
export function isExpeditionComplete(
  snapshot: PhaseDataSnapshot
): boolean {
  return getExpeditionCompletionSummary(snapshot).isComplete;
}
