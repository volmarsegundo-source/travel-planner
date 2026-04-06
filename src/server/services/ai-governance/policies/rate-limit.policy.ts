import "server-only";

import { checkRateLimit } from "@/lib/rate-limit";
import type { AiPolicy, PolicyContext, PolicyResult } from "../policy-engine";

// ─── Constants ──────────────────────────────────────────────────────────────

const WINDOW_SECONDS = 3600; // 1 hour

const PHASE_LIMITS: Record<string, number> = {
  plan: 10,
  checklist: 5,
  guide: 5,
};

const DEFAULT_LIMIT = 5;

// ─── Policy ─────────────────────────────────────────────────────────────────

export const rateLimitPolicy: AiPolicy = {
  name: "rate_limit",

  async evaluate(ctx: PolicyContext): Promise<PolicyResult> {
    const limit = PHASE_LIMITS[ctx.phase] ?? DEFAULT_LIMIT;
    const key = `ai:${ctx.phase}:${ctx.userId}`;

    const result = await checkRateLimit(key, limit, WINDOW_SECONDS);

    if (!result.allowed) {
      return {
        allowed: false,
        blockedBy: "rate_limit",
        reason: "Rate limit exceeded",
      };
    }

    return { allowed: true };
  },
};
