/**
 * Centralized phase status visual mapping.
 *
 * Single source of truth for how phase status is displayed across the app.
 * See: docs/specs/UX-STATUS-FASES-PADRAO.md
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PhaseStatus = "completed" | "in_progress" | "pending" | "not_started" | "locked";

export interface PhaseStatusVisual {
  /** Tailwind bg class for circle */
  circleBg: string;
  /** Tailwind text class for circle */
  circleText: string;
  /** Tailwind border class for circle (outline state) */
  circleBorder: string;

  /** AtlasBadge color prop */
  badgeColor: "success" | "warning" | "info";
  /** i18n key for badge text */
  badgeTextKey: string;

  /** Tailwind classes for card left border */
  borderClass: string;
  /** Tailwind opacity class for card */
  cardOpacity: string;

  /** Hex color for map pin */
  pinColor: string;
  /** Whether to show pin on map */
  showPin: boolean;

  /** Circle icon type */
  icon: "check" | "number" | "lock" | "outline";

  /** i18n key for CTA button */
  ctaTextKey: string;

  /** Alert styling (only for pending) */
  alertBg: string;
  alertBorder: string;
  alertText: string;
  showAlert: boolean;
}

// ─── Visual Mapping ──────────────────────────────────────────────────────────

const STATUS_VISUALS: Record<PhaseStatus, PhaseStatusVisual> = {
  completed: {
    circleBg: "bg-atlas-success",
    circleText: "text-white",
    circleBorder: "",
    badgeColor: "success",
    badgeTextKey: "phaseCompleted",
    borderClass: "border-l-4 border-l-atlas-success",
    cardOpacity: "",
    pinColor: "#10b981",
    showPin: true,
    icon: "check",
    ctaTextKey: "phaseEdit",
    alertBg: "",
    alertBorder: "",
    alertText: "",
    showAlert: false,
  },
  in_progress: {
    circleBg: "bg-atlas-primary",
    circleText: "text-white",
    circleBorder: "",
    badgeColor: "warning",
    badgeTextKey: "phaseInProgress",
    borderClass: "border-l-4 border-l-atlas-secondary-container",
    cardOpacity: "",
    pinColor: "#f59e0b",
    showPin: true,
    icon: "number",
    ctaTextKey: "phaseContinue",
    alertBg: "",
    alertBorder: "",
    alertText: "",
    showAlert: false,
  },
  pending: {
    circleBg: "bg-amber-500",
    circleText: "text-white",
    circleBorder: "",
    badgeColor: "warning",
    badgeTextKey: "phasePending",
    borderClass: "border-l-4 border-l-amber-500",
    cardOpacity: "",
    pinColor: "#f59e0b",
    showPin: true,
    icon: "number",
    ctaTextKey: "phaseComplete",
    alertBg: "bg-amber-50",
    alertBorder: "border-amber-200",
    alertText: "text-amber-800",
    showAlert: true,
  },
  not_started: {
    circleBg: "",
    circleText: "text-gray-400",
    circleBorder: "border-2 border-gray-300",
    badgeColor: "info",
    badgeTextKey: "phaseNotStarted",
    borderClass: "",
    cardOpacity: "opacity-60",
    pinColor: "",
    showPin: false,
    icon: "outline",
    ctaTextKey: "phaseStart",
    alertBg: "",
    alertBorder: "",
    alertText: "",
    showAlert: false,
  },
  locked: {
    circleBg: "bg-gray-200",
    circleText: "text-gray-400",
    circleBorder: "",
    badgeColor: "info",
    badgeTextKey: "phaseLocked",
    borderClass: "",
    cardOpacity: "opacity-50",
    pinColor: "",
    showPin: false,
    icon: "lock",
    ctaTextKey: "phaseLocked",
    alertBg: "",
    alertBorder: "",
    alertText: "",
    showAlert: false,
  },
};

/**
 * Returns the complete visual configuration for a phase status.
 * Single source of truth — no component should have inline status→visual mapping.
 */
export function getPhaseStatusVisual(status: PhaseStatus): PhaseStatusVisual {
  return STATUS_VISUALS[status];
}

/**
 * Resolves a canonical PhaseStatus from the trip-readiness service vocabulary.
 *
 * The trip-readiness service uses "complete" | "partial" | "not_started".
 * This function maps those to the canonical 5-state system, considering
 * whether the phase has pending items (undecided checkboxes, incomplete checklist).
 */
export function deriveCanonicalStatus(params: {
  readinessStatus: "complete" | "partial" | "not_started";
  phaseNumber: number;
  isCurrentPhase: boolean;
  hasPendingItems?: boolean;
}): PhaseStatus {
  const { readinessStatus, phaseNumber, isCurrentPhase, hasPendingItems } = params;

  // Phases 7-8 are always locked
  if (phaseNumber >= 7) return "locked";

  if (readinessStatus === "complete") {
    // Even if marked complete by readiness, check for pending items
    // (Phase 3 checklist incomplete, Phase 4 undecided)
    return hasPendingItems ? "pending" : "completed";
  }

  if (readinessStatus === "partial") {
    if (isCurrentPhase) return "in_progress";
    // Phase was visited but user moved on — check for pending items
    return hasPendingItems ? "pending" : "in_progress";
  }

  return "not_started";
}
