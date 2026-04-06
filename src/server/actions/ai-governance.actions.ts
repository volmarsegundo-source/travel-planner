"use server";

import "server-only";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { AiGovernanceDashboardService } from "@/server/services/ai-governance-dashboard.service";
import type { ActionResult } from "@/types/trip.types";

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_PHASES = ["global", "plan", "checklist", "guide"] as const;

// ─── Actions ────────────────────────────────────────────────────────────────

export async function toggleKillSwitchAction(
  phase: string,
  enabled: boolean,
  reason: string,
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Admin role check
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    return { success: false, error: "errors.unauthorized" };
  }

  if (!VALID_PHASES.includes(phase as (typeof VALID_PHASES)[number])) {
    return { success: false, error: "errors.generic" };
  }

  await AiGovernanceDashboardService.toggleKillSwitch(
    phase,
    enabled,
    reason,
    session.user.id,
  );

  return { success: true, data: undefined };
}
