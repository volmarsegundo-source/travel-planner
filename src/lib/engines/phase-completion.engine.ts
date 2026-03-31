// ─── Phase Completion Engine (pure data + logic — isomorphic) ────────────────
//
// Single source of truth for ALL phase completion evaluation rules.
// Evaluates phase completion by inspecting actual data presence,
// NOT the ExpeditionPhase.status field.
//
// Works in both server (service) and client (optimistic UI) contexts.
// NO server-only imports — pure TypeScript.
//
// Spec refs: SPEC-ARCH-016 §5, SPEC-PROD-023

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

  // If any section is undecided, phase is in_progress (not completed)
  if (anyUndecided) {
    return { phase: 4, status: "in_progress", requirements };
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
 * Evaluate completion status for a single phase.
 * Pure function — no DB access, no side effects.
 */
export function evaluatePhaseCompletion(
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
