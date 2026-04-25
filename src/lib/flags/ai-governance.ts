// ─── AI Governance V2 Feature Flag (Sprint 46 Wave 1) ───────────────────────
//
// Single source of truth for the `AI_GOVERNANCE_V2` flag.
//
// - Flag OFF (default): Central de Governança de IA admin tab is hidden;
//   AI provider config remains hardcoded (current behavior preserved).
// - Flag ON: admin/ia tab visible; AiConfigResolver polls DB for live
//   model/timeout/prompt configuration.
//
// Controlled exclusively by the AI_GOVERNANCE_V2 env var (Vercel
// Environment-scoped — see SPEC-OPS-AI-GOVERNANCE-V2 §2.3 rollout strategy).
// No NEXT_PUBLIC_ prefix: server-only, admin-only feature; no client
// targeting needed.
//
// Spec ref: SPEC-OPS-AI-GOVERNANCE-V2 §2.1-2.2 + §2.3 (rollout)
// Pattern mirror: src/lib/flags/phase-reorder.ts

import { env } from "@/lib/env";

/**
 * Returns true when the AI Governance V2 Central is active.
 *
 * - false (default): admin/ia tab hidden; provider config hardcoded
 * - true: admin/ia tab visible; AiConfigResolver enabled (Wave 3+)
 *
 * All Wave 1+ surfaces that gate on V2 visibility delegate to this
 * helper so there is a single toggle point for rollback.
 */
export function isAiGovernanceV2Enabled(): boolean {
  return env.AI_GOVERNANCE_V2;
}
