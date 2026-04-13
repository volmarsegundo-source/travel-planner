/**
 * Diagnostic endpoint: verifies Anthropic connectivity end-to-end.
 *
 * Use during incident response to isolate whether ANTHROPIC_API_KEY works
 * independently of the streaming/fallback infrastructure. A 200 response
 * confirms the key is valid and Claude is reachable; any 5xx means the
 * fallback chain in the production routes cannot rely on Anthropic.
 *
 * Admin-gated (role === "admin"). Disabled in non-preview environments
 * to avoid burning tokens on healthchecks. Remove or gate behind a
 * feature flag after Sprint 43 QA closes.
 *
 *   curl -H "Cookie: <admin session>" https://<host>/api/ai/test-anthropic
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ClaudeProvider } from "@/server/services/providers/claude.provider";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  if (!hasKey) {
    return NextResponse.json(
      {
        ok: false,
        stage: "env",
        error: "ANTHROPIC_API_KEY missing in this environment",
      },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  try {
    const provider = new ClaudeProvider();
    const result = await provider.generateResponse(
      'Reply with the single word: OK',
      32,
      "checklist",
      { systemPrompt: "You are a diagnostic echo. Reply with exactly one word." },
    );
    const elapsedMs = Date.now() - startedAt;

    logger.info("ai.test-anthropic.success", {
      elapsedMs,
      tokensIn: result.inputTokens,
      tokensOut: result.outputTokens,
    });

    return NextResponse.json({
      ok: true,
      elapsedMs,
      provider: provider.name,
      response: result.text.slice(0, 128),
      tokens: {
        in: result.inputTokens ?? null,
        out: result.outputTokens ?? null,
      },
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const isAppError = error instanceof AppError;
    logger.error(
      "ai.test-anthropic.failure",
      error instanceof Error ? error : new Error(String(error)),
      { elapsedMs, code: isAppError ? error.code : "unknown" },
    );
    return NextResponse.json(
      {
        ok: false,
        elapsedMs,
        stage: "provider",
        code: isAppError ? error.code : "unknown",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
