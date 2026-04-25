/**
 * RBAC HOF wrappers for `/api/admin/ai/*` route handlers.
 *
 * **Why this exists.** The Edge middleware skips `/api/*` paths
 * (`src/middleware.ts:45`), so admin API handlers cannot rely on
 * middleware-level RBAC and must self-gate. Without a shared helper, every
 * Wave 2+ handler would re-implement the auth + DB-role-lookup + RBAC
 * decision — a known foot-gun called out by the 4-agent batch-review
 * synthesis (commit `a8bef3a` §10.3, P1 follow-up `B47-API-RBAC-CONVENTION`).
 *
 * **The convention.** Every handler under `src/app/api/admin/ai/**` MUST
 * be exported wrapped in one of these HOFs:
 *
 *   - `withAiGovernanceAccess`         — read + edit (admin | admin-ai | admin-ai-approver)
 *   - `withAiGovernanceApproverAccess` — promote-only (admin | admin-ai-approver)
 *
 * Compliance is enforced by `src/app/api/admin/ai/__tests__/handler-rbac-compliance.test.ts`,
 * which globs the handler tree and fails CI when any route file omits both
 * wrappers. The test exists even though Wave 2 has not yet shipped any
 * admin/ai handlers — it activates automatically on the first Wave 2 commit.
 *
 * **Fail-closed semantics.** Unknown role, missing session, or DB lookup
 * failure all collapse to a deny response. The inner handler is invoked
 * only when both auth and RBAC succeed.
 *
 * B47-API-RBAC-CONVENTION — Sprint 46 (P1 from batch-review §10.3).
 */
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import {
  hasAiGovernanceAccess,
  hasAiGovernanceApproverAccess,
} from "@/lib/auth/rbac";

export type AdminAuthContext = {
  /** Authenticated `User.id` from the session. */
  userId: string;
  /** Role string read from the database (defensive, not from JWT). */
  role: string;
};

/**
 * Next.js 15 App Router route-handler context shape (params is a Promise
 * since v15). Generic over the dynamic-segment params object.
 */
type HandlerContext<P extends Record<string, string | string[]>> = {
  params: Promise<P>;
};

/**
 * Inner handler signature — receives the standard Next.js args plus an
 * `auth` context with the resolved userId + role. The wrapped handler
 * should never re-query auth or role (the wrapper already did).
 */
export type AdminApiHandler<
  P extends Record<string, string | string[]> = Record<string, never>
> = (
  request: Request,
  context: HandlerContext<P>,
  auth: AdminAuthContext
) => Response | Promise<Response>;

type RoleGuard = (role: string | null | undefined) => boolean;

/**
 * Internal: shared wrapper logic. The two exported HOFs differ only in
 * which role guard they use.
 */
function makeWrapper<P extends Record<string, string | string[]>>(
  guard: RoleGuard,
  guardName: "hasAiGovernanceAccess" | "hasAiGovernanceApproverAccess"
) {
  return (handler: AdminApiHandler<P>) =>
    async (
      request: Request,
      context: HandlerContext<P>
    ): Promise<Response> => {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      let role: string | null = null;
      try {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        });
        role = user?.role ?? null;
      } catch {
        // Fail-closed on DB error: cannot determine role, deny access.
        return NextResponse.json(
          { error: "Service Unavailable" },
          { status: 503 }
        );
      }

      if (!guard(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return handler(request, context, {
        userId: session.user.id,
        role: role as string,
      });
    };
}

/**
 * Wraps a handler with the AI Governance read+edit RBAC gate.
 *
 * Allows: `admin`, `admin-ai`, `admin-ai-approver`.
 *
 * Use for handlers that read or edit prompts/models/timeout/curation.
 * For handlers that PROMOTE prompts to production, use the stricter
 * `withAiGovernanceApproverAccess` instead.
 */
export function withAiGovernanceAccess<
  P extends Record<string, string | string[]> = Record<string, never>
>(handler: AdminApiHandler<P>) {
  return makeWrapper<P>(hasAiGovernanceAccess, "hasAiGovernanceAccess")(
    handler
  );
}

/**
 * Wraps a handler with the AI Governance promote-only RBAC gate.
 *
 * Allows: `admin`, `admin-ai-approver` only. `admin-ai` is excluded per
 * SPEC-ARCH-AI-GOVERNANCE-V2 §7.7 (read+edit only).
 *
 * Use for `POST /api/admin/ai/prompts/:id/promote` and similar actions
 * that change production state.
 */
export function withAiGovernanceApproverAccess<
  P extends Record<string, string | string[]> = Record<string, never>
>(handler: AdminApiHandler<P>) {
  return makeWrapper<P>(
    hasAiGovernanceApproverAccess,
    "hasAiGovernanceApproverAccess"
  )(handler);
}
