"use server";

import "server-only";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { AiGovernanceDashboardService } from "@/server/services/ai-governance-dashboard.service";
import type { ActionResult } from "@/types/trip.types";

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
