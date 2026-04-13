/**
 * SSE streaming endpoint for Phase 5 destination guide generation.
 *
 * Mirrors the structure of /api/ai/plan/stream but for guide generation.
 * Replaces the blocking server actions generateDestinationGuideAction and
 * regenerateGuideAction in the streaming flow — clients now get immediate
 * feedback instead of waiting 30-40s for a single blocking response.
 *
 * Design decision (PA debit handling):
 *   This route handles BOTH initial generation AND regeneration in a single
 *   flow. When regen=true, the route enforces the regen limit (5/expedition)
 *   and PA balance check (50 PA), and debits PA AFTER successful persistence.
 *   This avoids splitting the flow across server-action + fetch and keeps the
 *   critical "validate before AI call" + "debit after success" invariant in
 *   one place. The non-streaming generateDestinationGuideAction and
 *   regenerateGuideAction are preserved for backward compatibility (tests +
 *   non-JS clients) but the client now prefers this streaming route.
 *
 * @see SPEC-RISK-EDGE-RUNTIME item #1
 * @see docs/finops/SPRINT-42-FINOPS-REVIEW.md
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { redis } from "@/server/cache/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { canUseAI } from "@/lib/guards/age-guard";
import { hashUserId } from "@/lib/hash";
import { logger } from "@/lib/logger";
import { sanitizeForPrompt } from "@/lib/prompts/injection-guard";
import { maskPII } from "@/lib/prompts/pii-masker";
import { destinationGuidePrompt } from "@/lib/prompts";
import {
  getProviderWithForcedFallback,
  getSecondaryProvider,
  getModelIdForType,
  resolveProviderName,
  extractJsonFromResponse,
  DestinationGuideContentSchema,
} from "@/server/services/ai.service";
import { PolicyEngine } from "@/server/services/ai-governance/policy-engine";
import "@/server/services/ai-governance/policies";
import { AppError } from "@/lib/errors";
import { TripIdSchema } from "@/lib/validations/ai.schema";
import { calculateEstimatedCost } from "@/lib/cost-calculator";
import { PointsEngine } from "@/lib/engines/points-engine";
import type { GuideTravelerContext } from "@/lib/prompts/types";
import type { DestinationGuideContentV2 } from "@/types/ai.types";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Constants ──────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 3600;
const MAX_GUIDE_GENERATIONS = 3;
const MAX_GUIDE_REGENS = 5;
const REGEN_PA_COST = 50;

const DEFAULT_VIEWED_SECTIONS = [
  "timezone",
  "currency",
  "language",
  "electricity",
  "connectivity",
  "cultural_tips",
  "safety",
  "health",
  "transport_overview",
  "local_customs",
];

// ─── Request body schema ────────────────────────────────────────────────────

const TravelerContextSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    travelers: z.number().optional(),
    travelerType: z.string().optional(),
    accommodationStyle: z.string().optional(),
    travelPace: z.number().optional(),
    budget: z.number().optional(),
    budgetCurrency: z.string().optional(),
    dietaryRestrictions: z.string().optional(),
    interests: z.array(z.string()).optional(),
    fitnessLevel: z.string().optional(),
    transportTypes: z.array(z.string()).optional(),
    tripType: z.string().optional(),
  })
  .optional();

const StreamGuideRequestSchema = z.object({
  tripId: z.string().min(1).max(50),
  destination: z.string().min(1).max(200),
  language: z.enum(["pt-BR", "en"]),
  locale: z.string().optional(),
  extraCategories: z.array(z.string().max(64)).max(20).optional(),
  personalNotes: z.string().max(500).optional(),
  travelerContext: TravelerContextSchema,
  regen: z.boolean().optional().default(false),
});

// ─── POST handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const hid = hashUserId(userId);

  // Policy (kill-switch, rate limit, cost budget)
  const resolvedProvider = resolveProviderName("guide");
  const policyResult = await PolicyEngine.evaluate({
    phase: "guide",
    userId,
    provider: resolvedProvider,
  });
  if (!policyResult.allowed) {
    const status = policyResult.blockedBy === "rate_limit" ? 429 : 503;
    return NextResponse.json(
      { error: policyResult.blockedBy, reason: policyResult.reason },
      { status },
    );
  }

  // Parse + validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = StreamGuideRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const {
    tripId,
    destination,
    language,
    locale,
    extraCategories,
    personalNotes,
    travelerContext,
    regen,
  } = parsed.data;

  const tripIdResult = TripIdSchema.safeParse(tripId);
  if (!tripIdResult.success) {
    return NextResponse.json({ error: "Invalid tripId" }, { status: 400 });
  }
  const validatedTripId = tripIdResult.data;

  // Rate limit
  const rl = await checkRateLimit(
    `ai:guide:stream:${userId}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // BOLA: trip belongs to user
  const trip = await db.trip.findFirst({
    where: { id: validatedTripId, userId, deletedAt: null },
    select: { id: true, destination: true },
  });
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Age guard
  const userProfile = await db.userProfile.findUnique({
    where: { userId },
    select: { birthDate: true },
  });
  if (!canUseAI(userProfile?.birthDate)) {
    return NextResponse.json({ error: "Age restriction" }, { status: 403 });
  }

  // Existing guide lookup (for regen + generation cap)
  const existingGuide = await db.destinationGuide.findUnique({
    where: { tripId: validatedTripId },
  });

  if (regen) {
    if (!existingGuide) {
      return NextResponse.json({ error: "errors.notFound" }, { status: 404 });
    }
    if (existingGuide.regenCount >= MAX_GUIDE_REGENS) {
      return NextResponse.json(
        { error: "expedition.phase5.regenLimitReached" },
        { status: 409 },
      );
    }
    const progress = await db.userProgress.findUnique({
      where: { userId },
      select: { availablePoints: true },
    });
    if (!progress || progress.availablePoints < REGEN_PA_COST) {
      return NextResponse.json(
        { error: "expedition.phase5.insufficientPA" },
        { status: 402 },
      );
    }
  } else if (existingGuide && existingGuide.generationCount >= MAX_GUIDE_GENERATIONS) {
    return NextResponse.json(
      { error: "errors.guideGenerationLimit" },
      { status: 409 },
    );
  }

  // Sanitize destination
  let sanitizedDestination: string;
  try {
    const s = sanitizeForPrompt(destination, "destination", 200);
    const { masked } = maskPII(s, "destination");
    sanitizedDestination = masked;
  } catch (error) {
    if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    throw error;
  }

  // Sanitize personalNotes
  let sanitizedNotes: string | undefined;
  if (personalNotes && personalNotes.trim().length > 0) {
    try {
      const s = sanitizeForPrompt(personalNotes.slice(0, 500), "personalNotes", 500);
      sanitizedNotes = s;
    } catch (error) {
      if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      throw error;
    }
  }

  // Build prompt
  const userMessage = destinationGuidePrompt.buildUserPrompt({
    destination: sanitizedDestination,
    language,
    travelerContext: travelerContext as GuideTravelerContext | undefined,
    extraCategories,
    personalNotes: sanitizedNotes,
  });

  const streamStartTime = Date.now();
  const provider = getProviderWithForcedFallback("guide");
  logger.info("ai.guide.stream.provider.initial", {
    userId: hid,
    tripId: validatedTripId,
    provider: provider.name,
    primary: resolvedProvider,
  });

  try {
    const { stream: aiStream, usage: usagePromise } =
      await provider.generateStreamingResponse(
        userMessage,
        destinationGuidePrompt.maxTokens,
        "guide",
        { systemPrompt: destinationGuidePrompt.system },
      );

    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        // Initial event so client can render its progress UI immediately
        controller.enqueue(
          encoder.encode(
            `event: start\ndata: ${JSON.stringify({ destination: sanitizedDestination })}\n\n`,
          ),
        );

        const reader = aiStream.getReader();
        let accumulated = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += value;
            // Forward chunk for visual feedback (client may show "received X KB").
            // Encoded as JSON-string to keep line-safe inside SSE data: field.
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk: value })}\n\n`),
            );
          }

          // Parse + validate final JSON
          let rawJson: unknown;
          try {
            rawJson = extractJsonFromResponse(accumulated);
          } catch (err) {
            logger.warn("ai.guide.stream.parse.error", {
              userId: hid,
              tripId: validatedTripId,
              error: String(err),
              accumulatedLength: accumulated.length,
            });
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "AI_PARSE_ERROR" })}\n\n`),
            );
            controller.close();
            return;
          }

          const validated = DestinationGuideContentSchema.safeParse(rawJson);
          if (!validated.success) {
            logger.warn("ai.guide.stream.schema.error", {
              userId: hid,
              tripId: validatedTripId,
              issues: validated.error.errors.slice(0, 5).map((e) => `${e.path.join(".")}: ${e.message}`),
            });
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "AI_SCHEMA_ERROR" })}\n\n`),
            );
            controller.close();
            return;
          }

          const content = validated.data as DestinationGuideContentV2;

          // Persist to DB
          try {
            const updatedGuide = await db.destinationGuide.upsert({
              where: { tripId: validatedTripId },
              create: {
                tripId: validatedTripId,
                content: JSON.parse(JSON.stringify(content)),
                destination: trip.destination,
                locale: locale ?? (language === "pt-BR" ? "pt-BR" : "en"),
                generationCount: 1,
                viewedSections: DEFAULT_VIEWED_SECTIONS,
                extraCategories: extraCategories ?? [],
                personalNotes: sanitizedNotes ?? null,
              },
              update: regen
                ? {
                    content: JSON.parse(JSON.stringify(content)),
                    extraCategories: extraCategories ?? [],
                    personalNotes: sanitizedNotes ?? null,
                    regenCount: { increment: 1 },
                    generationCount: { increment: 1 },
                    generatedAt: new Date(),
                  }
                : {
                    content: JSON.parse(JSON.stringify(content)),
                    locale: locale ?? (language === "pt-BR" ? "pt-BR" : "en"),
                    generationCount: { increment: 1 },
                    viewedSections: DEFAULT_VIEWED_SECTIONS,
                    generatedAt: new Date(),
                  },
            });

            // Award / debit points
            if (regen) {
              try {
                await PointsEngine.earnPoints(
                  userId,
                  -REGEN_PA_COST,
                  "ai_usage",
                  "Guide re-generation (streaming)",
                  validatedTripId,
                );
              } catch (err) {
                logger.warn("ai.guide.stream.pa.debit.error", { error: String(err) });
              }
            } else if (!existingGuide) {
              // First-time generation: award the same points the legacy action did
              try {
                await PointsEngine.earnPoints(
                  userId,
                  30,
                  "phase_connectivity",
                  "Generated destination guide for phase 5 (streaming)",
                  validatedTripId,
                );
                for (const section of DEFAULT_VIEWED_SECTIONS.slice(0, 6)) {
                  await PointsEngine.earnPoints(
                    userId,
                    5,
                    "phase_connectivity",
                    `Auto-viewed guide section: ${section}`,
                    validatedTripId,
                  );
                }
              } catch (err) {
                logger.warn("ai.guide.stream.points.error", { error: String(err) });
              }
            }

            // Send final validated content event
            controller.enqueue(
              encoder.encode(
                `event: complete\ndata: ${JSON.stringify({
                  content,
                  generationCount: updatedGuide.generationCount,
                  regenCount: updatedGuide.regenCount,
                })}\n\n`,
              ),
            );

            logger.info("ai.guide.stream.persisted", {
              userId: hid,
              tripId: validatedTripId,
              regen,
            });
          } catch (persistErr) {
            logger.error(
              "ai.guide.stream.persist.error",
              persistErr instanceof Error ? persistErr : new Error(String(persistErr)),
              { userId: hid, tripId: validatedTripId },
            );
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "PERSIST_FAILED" })}\n\n`),
            );
          }

          controller.close();
        } catch (streamErr) {
          const isTimeout =
            streamErr instanceof AppError && streamErr.code === "AI_TIMEOUT";
          logger.error(
            "ai.guide.stream.sse.error",
            streamErr instanceof Error ? streamErr : new Error(String(streamErr)),
            {
              userId: hid,
              tripId: validatedTripId,
              accumulatedLength: accumulated.length,
              isTimeout,
            },
          );

          // Mid-flight recovery: if the primary (likely Gemini) died mid-stream,
          // the initial-call FallbackProvider can't help anymore. Explicitly
          // retry the request against the opposite provider (Anthropic) in
          // non-streaming mode so the user still gets a guide.
          logger.warn("ai.guide.stream.fallback.attempt", {
            userId: hid,
            tripId: validatedTripId,
            reason: streamErr instanceof AppError ? streamErr.code : "unknown",
          });

          try {
            const recoveryProvider = getSecondaryProvider("guide");
            const recoveryResponse = await recoveryProvider.generateResponse(
              userMessage,
              destinationGuidePrompt.maxTokens,
              "guide",
              { systemPrompt: destinationGuidePrompt.system },
            );

            let recoveryJson: unknown;
            try {
              recoveryJson = extractJsonFromResponse(recoveryResponse.text);
            } catch (parseErr) {
              logger.warn("ai.guide.stream.fallback.parse.error", {
                userId: hid,
                tripId: validatedTripId,
                error: String(parseErr),
              });
              controller.enqueue(
                encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "AI_PARSE_ERROR" })}\n\n`),
              );
              controller.close();
              return;
            }

            const recoveryValidated = DestinationGuideContentSchema.safeParse(recoveryJson);
            if (!recoveryValidated.success) {
              logger.warn("ai.guide.stream.fallback.schema.error", {
                userId: hid,
                tripId: validatedTripId,
              });
              controller.enqueue(
                encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "AI_SCHEMA_ERROR" })}\n\n`),
              );
              controller.close();
              return;
            }

            const content = recoveryValidated.data as DestinationGuideContentV2;

            const updatedGuide = await db.destinationGuide.upsert({
              where: { tripId: validatedTripId },
              create: {
                tripId: validatedTripId,
                content: JSON.parse(JSON.stringify(content)),
                destination: trip.destination,
                locale: locale ?? (language === "pt-BR" ? "pt-BR" : "en"),
                generationCount: 1,
                viewedSections: DEFAULT_VIEWED_SECTIONS,
                extraCategories: extraCategories ?? [],
                personalNotes: sanitizedNotes ?? null,
              },
              update: regen
                ? {
                    content: JSON.parse(JSON.stringify(content)),
                    extraCategories: extraCategories ?? [],
                    personalNotes: sanitizedNotes ?? null,
                    regenCount: { increment: 1 },
                    generationCount: { increment: 1 },
                    generatedAt: new Date(),
                  }
                : {
                    content: JSON.parse(JSON.stringify(content)),
                    locale: locale ?? (language === "pt-BR" ? "pt-BR" : "en"),
                    generationCount: { increment: 1 },
                    viewedSections: DEFAULT_VIEWED_SECTIONS,
                    generatedAt: new Date(),
                  },
            });

            if (regen) {
              try {
                await PointsEngine.earnPoints(
                  userId,
                  -REGEN_PA_COST,
                  "ai_usage",
                  "Guide re-generation (stream recovery)",
                  validatedTripId,
                );
              } catch { /* non-blocking */ }
            } else if (!existingGuide) {
              try {
                await PointsEngine.earnPoints(
                  userId,
                  30,
                  "phase_connectivity",
                  "Generated destination guide for phase 5 (stream recovery)",
                  validatedTripId,
                );
              } catch { /* non-blocking */ }
            }

            controller.enqueue(
              encoder.encode(
                `event: complete\ndata: ${JSON.stringify({
                  content,
                  generationCount: updatedGuide.generationCount,
                  regenCount: updatedGuide.regenCount,
                })}\n\n`,
              ),
            );

            logger.info("ai.guide.stream.fallback.success", {
              userId: hid,
              tripId: validatedTripId,
              recoveryProvider: recoveryProvider.name,
            });
            controller.close();
            return;
          } catch (recoveryErr) {
            logger.error(
              "ai.guide.stream.fallback.failed",
              recoveryErr instanceof Error ? recoveryErr : new Error(String(recoveryErr)),
              { userId: hid, tripId: validatedTripId },
            );
          }

          try {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "AI_TIMEOUT" })}\n\n`),
            );
            controller.close();
          } catch {
            // Already closed
          }
        }
      },
    });

    // Token usage logging + AiInteractionLog (non-blocking)
    usagePromise
      .then(async (usageData) => {
        const inputTokens = usageData.inputTokens ?? 0;
        const outputTokens = usageData.outputTokens ?? 0;
        const cacheReadTokens = usageData.cacheReadInputTokens ?? 0;
        const cacheWriteTokens = usageData.cacheCreationInputTokens ?? 0;
        const modelId = getModelIdForType("guide");
        const providerName = modelId.startsWith("gemini") ? "gemini" : "claude";
        const cost = calculateEstimatedCost(
          modelId,
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
        );

        logger.info("ai.guide.stream.tokens.usage", {
          userId: hid,
          generationType: "guide",
          model: providerName,
          inputTokens,
          outputTokens,
          estimatedCostUSD: cost.totalCost,
        });

        try {
          await db.aiInteractionLog.create({
            data: {
              userId: hid,
              phase: "guide",
              provider: providerName,
              model: modelId,
              promptSlug: "destination-guide",
              inputTokens,
              outputTokens,
              cacheReadTokens,
              cacheWriteTokens,
              estimatedCostUsd: cost.totalCost,
              status: "success",
              latencyMs: Date.now() - streamStartTime,
              metadata: { route: "stream", regen },
            },
          });
        } catch (logErr) {
          logger.warn("ai.guide.stream.interaction-log.error", {
            error: String(logErr),
          });
        }
      })
      .catch((err) => {
        logger.error(
          "ai.guide.stream.usage.error",
          err instanceof Error ? err : new Error(String(err)),
          { userId: hid },
        );
      });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error(
      "ai.guide.stream.error",
      error instanceof Error ? error : new Error(String(error)),
      { userId: hid },
    );
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Suppress unused-import warning when redis is not actively used here.
// The import is kept because future enhancements may attach lock helpers
// (parity with /api/ai/plan/stream/route.ts).
void redis;
