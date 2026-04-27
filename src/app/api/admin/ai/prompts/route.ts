/**
 * /api/admin/ai/prompts — collection endpoints.
 *
 *   GET  → list prompt templates (paginated; status filter)
 *   POST → create new template + initial version 1.0.0
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1.
 *
 * Auth: every export wraps via `withAiGovernanceAccess` per
 * B47-API-RBAC-CONVENTION (the Edge middleware skips /api/* paths, so the
 * handler self-gates). Compliance is enforced by
 * `__tests__/handler-rbac-compliance.test.ts` at CI time.
 *
 * Rate limits per SPEC §5.1:
 *   GET   60/min/admin
 *   POST  10/hr/admin
 *
 * B-W2-001 — Sprint 46 Wave 2 task 1/9.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { withAiGovernanceAccess } from "@/lib/auth/with-rbac";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  CreatePromptSchema,
  ListPromptsQuerySchema,
} from "@/lib/validations/prompt-admin.schema";
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

export const GET = withAiGovernanceAccess(async (request, _ctx, auth) => {
  const rl = await checkRateLimit(
    `admin-ai-prompts-list:${auth.userId}`,
    60,
    60,
    { failClosed: true }
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = ListPromptsQuerySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const out = await PromptAdminService.list(parsed.data);
  return NextResponse.json(out, { status: 200 });
});

export const POST = withAiGovernanceAccess(async (request, _ctx, auth) => {
  const rl = await checkRateLimit(
    `admin-ai-prompts-create:${auth.userId}`,
    10,
    3600,
    { failClosed: true }
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreatePromptSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const hints = clientHints(request);

  try {
    const out = await PromptAdminService.create(parsed.data, {
      actorUserId: auth.userId,
      ip: hints.ip,
      userAgent: hints.userAgent,
    });
    return NextResponse.json(out, { status: 201 });
  } catch (error) {
    if (error instanceof PromptAdminError && error.code === "SLUG_TAKEN") {
      return NextResponse.json(
        { error: "Slug already exists", code: error.code },
        { status: 409 }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    logger.error("api.admin.ai.prompts.create.error", error, {
      actorUserId: auth.userId,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
