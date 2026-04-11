"use server";

import "server-only";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { AiGovernanceDashboardService } from "@/server/services/ai-governance-dashboard.service";
import {
  getAiServiceStatus,
  type AiServiceStatus,
} from "@/server/services/ai-governance/policies/cost-budget.policy";
import type { ActionResult } from "@/types/trip.types";

/**
 * Public-facing view of AI service availability.
 * Intentionally omits cost/spend details — clients only learn whether
 * generation is paused or near-capacity.
 */
export interface AiServiceStatusView {
  available: boolean;
  paused: boolean;
  /** Admin-only flag — non-admin clients always receive `false`. */
  warning: boolean;
}

/**
 * Returns AI availability for the current user's UI.
 * Non-admin users get a scrubbed view with no spend numbers.
 */
export async function getAiServiceStatusAction(): Promise<ActionResult<AiServiceStatusView>> {
  const session = await auth();
  if (!session?.user?.id) {
    // Unauthenticated callers see a neutral "available" result so landing
    // surfaces don't leak policy state. Signed-in guards still apply server-side.
    return { success: true, data: { available: true, paused: false, warning: false } };
  }

  const status: AiServiceStatus = await getAiServiceStatus();
  const user = session.user as { id: string; role?: string };
  const isAdmin = user.role === "admin";

  return {
    success: true,
    data: {
      available: status.available,
      paused: status.paused,
      warning: isAdmin ? status.warning : false,
    },
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

const ToggleKillSwitchSchema = z.object({
  phase: z.enum(["global", "plan", "checklist", "guide"]),
  enabled: z.boolean(),
  reason: z.string().min(1).max(500),
});

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

  const parsed = ToggleKillSwitchSchema.safeParse({ phase, enabled, reason });
  if (!parsed.success) {
    return { success: false, error: "errors.validation" };
  }

  await AiGovernanceDashboardService.toggleKillSwitch(
    parsed.data.phase,
    parsed.data.enabled,
    parsed.data.reason,
    session.user.id,
  );

  return { success: true, data: undefined };
}
