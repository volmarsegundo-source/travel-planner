import "server-only";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { db } from "@/server/db";
import {
  resolveAccess,
  getPhaseUrl,
  TOTAL_ACTIVE_PHASES,
  type PhaseAccessMode,
} from "@/lib/engines/phase-navigation.engine";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GuardResult {
  trip: {
    id: string;
    currentPhase: number;
    [key: string]: unknown;
  };
  userId: string;
  accessMode: PhaseAccessMode;
  completedPhases: number[];
}

// ─── Guard Function ──────────────────────────────────────────────────────────

/**
 * Shared phase access guard for all expedition phase page.tsx files.
 *
 * 1. Validates session (redirects to login if unauthenticated)
 * 2. Fetches trip with BOLA check (userId must match)
 * 3. Fetches ExpeditionPhase records for completedPhases
 * 4. Calls resolveAccess from PhaseNavigationEngine
 * 5. Redirects if blocked; returns trip + accessMode + completedPhases if allowed
 *
 * Usage in page.tsx:
 *   const { trip, accessMode, completedPhases } = await guardPhaseAccess(
 *     tripId, requestedPhase, locale, { destination: true }
 *   );
 *
 * Spec refs: SPEC-ARCH-010 §3.4, SPEC-PROD-016 §2 (AC-031, AC-032)
 */
export async function guardPhaseAccess(
  tripId: string,
  requestedPhase: number,
  locale: string,
  additionalSelect?: Record<string, unknown>
): Promise<GuardResult> {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    throw new Error("unreachable");
  }

  // Fetch trip with BOLA check (userId filter)
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: {
      id: true,
      currentPhase: true,
      ...additionalSelect,
    },
  });

  if (!trip) {
    redirect({ href: "/expeditions", locale });
    throw new Error("unreachable");
  }

  // Defensive: coerce currentPhase to a valid number (default 1) and
  // clamp to TOTAL_ACTIVE_PHASES. Before FIX-02 (Sprint 32), completing
  // Phase 6 could set currentPhase to 7. Legacy DB records may still
  // have values > 6. Clamping here ensures the guard and navigation
  // engine always operate within the valid range.
  const rawPhase =
    typeof trip.currentPhase === "number" && trip.currentPhase >= 1
      ? trip.currentPhase
      : 1;
  const safeCurrentPhase: number = Math.min(rawPhase, TOTAL_ACTIVE_PHASES);

  // Fetch completed phases from ExpeditionPhase table
  const phases = await db.expeditionPhase.findMany({
    where: { tripId, status: "completed" },
    select: { phaseNumber: true },
  });

  const completedPhases = phases.map((p) => p.phaseNumber);

  // Resolve access using the navigation engine
  const access = resolveAccess(requestedPhase, safeCurrentPhase, completedPhases);

  if (!access.allowed) {
    // Redirect to the correct phase
    const redirectUrl = getPhaseUrl(tripId, safeCurrentPhase);
    redirect({ href: redirectUrl, locale });
    throw new Error("unreachable");
  }

  return {
    trip: { ...trip, currentPhase: safeCurrentPhase } as GuardResult["trip"],
    userId: session.user.id,
    accessMode: access.mode,
    completedPhases,
  };
}
