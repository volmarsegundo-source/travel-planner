"use server";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";

export interface AiInteractionDTO {
  id: string;
  userId: string;
  phase: string;
  provider: string;
  model: string;
  promptSlug: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  status: string;
  errorCode: string | null;
  cacheHit: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  templateSystemPrompt: string | null;
  templateUserPrompt: string | null;
  templateVersion: string | null;
}

export interface GetAiInteractionsParams {
  phase?: string;
  model?: string;
  status?: string;
  limit?: number;
}

/**
 * Fetches AI interaction logs for the admin prompt viewer.
 * Admin-only: verifies role before querying.
 */
export async function getAiInteractionsAction(
  params: GetAiInteractionsParams = {},
): Promise<{ interactions: AiInteractionDTO[]; error?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { interactions: [], error: "unauthorized" };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { interactions: [], error: "forbidden" };
  }

  const { phase, model, status, limit = 50 } = params;

  const where: Record<string, unknown> = {};
  if (phase) where.phase = phase;
  if (model) where.model = model;
  if (status) where.status = status;

  const logs = await db.aiInteractionLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  // Collect unique prompt slugs to batch-fetch templates
  const slugs = [...new Set(logs.map((l) => l.promptSlug).filter(Boolean))] as string[];

  const templates = slugs.length > 0
    ? await db.promptTemplate.findMany({
        where: { slug: { in: slugs } },
        select: {
          slug: true,
          systemPrompt: true,
          userTemplate: true,
          version: true,
        },
      })
    : [];

  const templateMap = new Map(templates.map((t) => [t.slug, t]));

  const interactions: AiInteractionDTO[] = logs.map((log) => {
    const tpl = log.promptSlug ? templateMap.get(log.promptSlug) : null;
    return {
      id: log.id,
      userId: log.userId,
      phase: log.phase,
      provider: log.provider,
      model: log.model,
      promptSlug: log.promptSlug,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      cacheReadTokens: log.cacheReadTokens,
      cacheWriteTokens: log.cacheWriteTokens,
      estimatedCostUsd: log.estimatedCostUsd,
      latencyMs: log.latencyMs,
      status: log.status,
      errorCode: log.errorCode,
      cacheHit: log.cacheHit,
      metadata: log.metadata as Record<string, unknown> | null,
      createdAt: log.createdAt.toISOString(),
      templateSystemPrompt: tpl?.systemPrompt ?? null,
      templateUserPrompt: tpl?.userTemplate ?? null,
      templateVersion: tpl?.version ?? null,
    };
  });

  return { interactions };
}
