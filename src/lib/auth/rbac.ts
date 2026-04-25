/**
 * RBAC helpers for AI Governance V2.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §7.7 (RBAC matrix):
 *
 *   - `admin`             — full platform admin; superset of everything.
 *   - `admin-ai`          — read + edit prompts/models/timeout/curation/audit-log VIEW.
 *   - `admin-ai-approver` — above + promote prompts to production.
 *
 * Other roles (default `user`, future `moderator`, etc.) have no access.
 *
 * Edge-safe: pure functions, no DB / no Node deps. Importable from
 * middleware (Edge runtime) and from API handlers (Node runtime).
 *
 * B-W1-005 — Sprint 46 Day 3.
 */

const AI_GOVERNANCE_ROLES = new Set(["admin", "admin-ai", "admin-ai-approver"]);
const AI_GOVERNANCE_APPROVER_ROLES = new Set(["admin", "admin-ai-approver"]);

/**
 * True when the role can READ + EDIT the AI Governance Central
 * (admin/ia tab, /api/admin/ai/* routes for non-promote actions).
 */
export function hasAiGovernanceAccess(
  role: string | null | undefined
): boolean {
  if (typeof role !== "string") return false;
  return AI_GOVERNANCE_ROLES.has(role);
}

/**
 * True when the role can PROMOTE prompts to production
 * (POST /api/admin/ai/prompts/:id/promote and similar).
 *
 * Stricter subset of `hasAiGovernanceAccess`: `admin-ai` (read+edit only)
 * is excluded; only `admin` and `admin-ai-approver` qualify.
 */
export function hasAiGovernanceApproverAccess(
  role: string | null | undefined
): boolean {
  if (typeof role !== "string") return false;
  return AI_GOVERNANCE_APPROVER_ROLES.has(role);
}
