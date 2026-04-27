/**
 * /api/admin/ai/prompts/:id — single-template endpoints.
 *
 *   PATCH → create new version (NEVER edits existing version)
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1.
 *
 * Auth: wrapped via `withAiGovernanceAccess` per B47-API-RBAC-CONVENTION.
 *
 * Rate limit: 10/hr/admin (per SPEC §5.1).
 *
 * B-W2-001 — Sprint 46 Wave 2 task 1/9.
 */
import { NextResponse } from "next/server";

import { withAiGovernanceAccess, type AdminApiHandler } from "@/lib/auth/with-rbac";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { UpdatePromptSchema } from "@/lib/validations/prompt-admin.schema";
import {
  PromptAdminError,
  PromptAdminService,
} from "@/server/services/ai-governance/prompt-admin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientHints(request: Request): { ip: string | null; userAgent: string | null } {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

const patchHandler: AdminApiHandler<{ id: string }> = async (
  request,
  context,
  auth
) => {
    const rl = await checkRateLimit(
      `admin-ai-prompts-update:${auth.userId}`,
      10,
      3600,
      { failClosed: true }
    );
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing template id" }, { status: 400 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = UpdatePromptSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const hints = clientHints(request);

    try {
      const out = await PromptAdminService.update(id, parsed.data, {
        actorUserId: auth.userId,
        ip: hints.ip,
        userAgent: hints.userAgent,
      });
      return NextResponse.json(out, { status: 200 });
    } catch (error) {
      if (error instanceof PromptAdminError) {
        if (error.code === "NOT_FOUND") {
          return NextResponse.json(
            { error: "Template not found", code: error.code },
            { status: 404 }
          );
        }
        if (error.code === "CHANGE_NOTE_REQUIRED") {
          return NextResponse.json(
            { error: error.message, code: error.code },
            { status: 400 }
          );
        }
        if (error.code === "VALIDATION_FAILED") {
          return NextResponse.json(
            {
              error: error.message,
              code: error.code,
              validationErrors: error.validationErrors ?? [],
            },
            { status: 400 }
          );
        }
      }
      logger.error("api.admin.ai.prompts.update.error", error, {
        actorUserId: auth.userId,
        templateId: id,
      });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
};

export const PATCH = withAiGovernanceAccess(patchHandler);
