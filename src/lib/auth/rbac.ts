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

/**
 * Detects the V2 AI Governance admin route (`/admin/ia` and any subpath).
 *
 * Bounded match: `/admin/ia` followed by `/`, `?`, `#`, or end-of-string.
 * Prevents the `/admin/iam` substring collision that a naive `includes()`
 * would mis-classify.
 */
function isAiGovernanceAdminPath(pathname: string): boolean {
  return /\/admin\/ia(\/|\?|#|$)/.test(pathname);
}

function isAdminPath(pathname: string): boolean {
  return /\/admin(\/|\?|#|$)/.test(pathname);
}

/**
 * Pure, Edge-safe RBAC decision for `/admin/*` paths.
 *
 * - `/admin/ia[/...]`  → allow when `hasAiGovernanceAccess(role)` is true.
 * - any other `/admin/*` → allow when `role === "admin"` (back-compat).
 * - any non-`/admin` path → returns `"allow"` (caller is opt-in).
 *
 * B47-MW-PURE-FN — Sprint 46 (P1 from 4-agent batch-review synthesis §10.3).
 *
 * Extracts the RBAC decision previously inlined in `src/middleware.ts` and
 * `src/app/[locale]/(app)/admin/layout.tsx` so it is unit-testable
 * independently of NextAuth's `auth()` HOF wrapper. Both call sites delegate
 * to this helper to guarantee a single source of truth.
 */
export function decideAdminAccess(
  pathname: string,
  role: string | null | undefined
): "allow" | "deny" {
  if (!isAdminPath(pathname)) return "allow";

  if (isAiGovernanceAdminPath(pathname)) {
    return hasAiGovernanceAccess(role) ? "allow" : "deny";
  }

  if (typeof role !== "string") return "deny";
  return role === "admin" ? "allow" : "deny";
}
