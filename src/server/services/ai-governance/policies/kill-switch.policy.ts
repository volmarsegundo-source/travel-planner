import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import type { AiPolicy, PolicyContext, PolicyResult } from "../policy-engine";

// ─── Constants ──────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds

// ─── In-memory cache ────────────────────────────────────────────────────────

interface CacheEntry {
  isEnabled: boolean;
  reason: string | null;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

async function getSwitch(phase: string): Promise<CacheEntry> {
  const cached = cache.get(phase);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const row = await db.aiKillSwitch.findUnique({
      where: { phase },
    });

    const entry: CacheEntry = {
      isEnabled: row?.isEnabled ?? false,
      reason: row?.reason ?? null,
      fetchedAt: Date.now(),
    };

    cache.set(phase, entry);
    return entry;
  } catch (error) {
    logger.warn("kill-switch.db.error", { error: String(error) });
    // On DB failure, allow the request (fail-open for reads)
    return { isEnabled: false, reason: null, fetchedAt: Date.now() };
  }
}

// ─── Policy ─────────────────────────────────────────────────────────────────

export const killSwitchPolicy: AiPolicy = {
  name: "kill_switch",

  async evaluate(ctx: PolicyContext): Promise<PolicyResult> {
    // 1. Check environment variable first (global, no DB)
    if (process.env.AI_KILL_SWITCH === "true") {
      return {
        allowed: false,
        blockedBy: "kill_switch",
        reason: "AI globally disabled via environment variable",
      };
    }

    // 2. Check DB global switch
    const globalSwitch = await getSwitch("global");
    if (globalSwitch.isEnabled) {
      return {
        allowed: false,
        blockedBy: "kill_switch",
        reason: globalSwitch.reason ?? "AI globally disabled",
      };
    }

    // 3. Check DB phase-specific switch
    const phaseSwitch = await getSwitch(ctx.phase);
    if (phaseSwitch.isEnabled) {
      return {
        allowed: false,
        blockedBy: "kill_switch",
        reason:
          phaseSwitch.reason ?? `AI disabled for phase: ${ctx.phase}`,
      };
    }

    return { allowed: true };
  },
};

/** Clear in-memory cache — used only in tests. */
export function _clearKillSwitchCache(): void {
  cache.clear();
}
