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
import { travelPlanPrompt, PLAN_SYSTEM_PROMPT } from "@/lib/prompts";
import { getProvider, getModelIdForType } from "@/server/services/ai.service";
import { PolicyEngine } from "@/server/services/ai-governance/policy-engine";
import "@/server/services/ai-governance/policies";
import { AppError } from "@/lib/errors";
import { GeneratePlanParamsSchema, TripIdSchema } from "@/lib/validations/ai.schema";
import { calculateEstimatedCost } from "@/lib/cost-calculator";
import {
  persistItinerary,
  parseItineraryJson,
  acquireGenerationLock,
  releaseGenerationLock,
} from "@/server/services/itinerary-persistence.service";
import { ItineraryPlanService } from "@/server/services/itinerary-plan.service";
import { PointsEngine } from "@/lib/engines/points-engine";

// Allow up to 120s for streaming responses (Vercel Pro)
export const maxDuration = 120;

// ─── Constants ──────────────────────────────────────────────────────────────

const TOKENS_PER_DAY = 600;
// Overhead increased from 500 to 1100 to account for ~600 tokens of
// enriched traveler context added by SPEC-AI-004 (TASK-S33-012).
const TOKENS_OVERHEAD = 1100;
const MIN_PLAN_TOKENS = 2048;
const MAX_PLAN_TOKENS = 16000;

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

function calculatePlanTokenBudget(days: number): number {
  const estimated = days * TOKENS_PER_DAY + TOKENS_OVERHEAD;
  return Math.min(MAX_PLAN_TOKENS, Math.max(MIN_PLAN_TOKENS, estimated));
}

function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

// ─── Request body schema ────────────────────────────────────────────────────

const StreamRequestSchema = z.object({
  tripId: z.string().min(1).max(50),
}).merge(GeneratePlanParamsSchema);

// ─── POST handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hid = hashUserId(session.user.id);
  const userId = session.user.id;

  // Policy check (kill-switch, rate limit, cost budget)
  const policyResult = await PolicyEngine.evaluate({ phase: "plan", userId });
  if (!policyResult.allowed) {
    const status = policyResult.blockedBy === "rate_limit" ? 429 : 503;
    return NextResponse.json(
      { error: policyResult.blockedBy, reason: policyResult.reason },
      { status },
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = StreamRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { tripId, destination, startDate, endDate, travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes, expeditionContext, extraCategories, personalNotes } = parsed.data;

  // Validate tripId format
  const tripIdResult = TripIdSchema.safeParse(tripId);
  if (!tripIdResult.success) {
    return NextResponse.json({ error: "Invalid tripId" }, { status: 400 });
  }

  // Rate limit
  const rl = await checkRateLimit(`ai:plan:${userId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // BOLA check: trip belongs to user
  const trip = await db.trip.findFirst({
    where: { id: tripIdResult.data, userId, deletedAt: null },
    select: { id: true },
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

  // Per-trip generation lock to prevent simultaneous generations
  let lockAcquired = false;
  try {
    lockAcquired = await acquireGenerationLock(tripIdResult.data, redis);
  } catch {
    // Redis failure: proceed without lock (graceful degradation)
    lockAcquired = true;
  }
  if (!lockAcquired) {
    return NextResponse.json({ error: "Generation already in progress" }, { status: 409 });
  }

  // Sanitize destination
  let sanitizedDestination: string;
  try {
    const sanitized = sanitizeForPrompt(destination, "destination", 200);
    const { masked } = maskPII(sanitized, "destination");
    sanitizedDestination = masked;
  } catch (error) {
    await releaseGenerationLock(tripIdResult.data, redis).catch(() => {});
    if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    throw error;
  }

  // Sanitize travelNotes
  let sanitizedTravelNotes: string | undefined;
  if (travelNotes) {
    try {
      const sanitized = sanitizeForPrompt(travelNotes, "travelNotes", 500);
      const { masked } = maskPII(sanitized, "travelNotes");
      sanitizedTravelNotes = masked;
    } catch (error) {
      await releaseGenerationLock(tripIdResult.data, redis).catch(() => {});
      if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      throw error;
    }
  }

  // Sanitize personalNotes (itinerary personalization)
  let sanitizedPersonalNotes: string | undefined;
  if (personalNotes) {
    try {
      const sanitized = sanitizeForPrompt(personalNotes, "personalNotes", 500);
      const { masked } = maskPII(sanitized, "personalNotes");
      sanitizedPersonalNotes = masked;
    } catch (error) {
      await releaseGenerationLock(tripIdResult.data, redis).catch(() => {});
      if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      throw error;
    }
  }

  // Build prompt
  const days = getDaysBetween(startDate, endDate);
  const tokenBudget = calculatePlanTokenBudget(days);

  const userMessage = travelPlanPrompt.buildUserPrompt({
    destination: sanitizedDestination,
    startDate,
    endDate,
    days,
    travelStyle,
    budgetTotal,
    budgetCurrency,
    travelers,
    language,
    tokenBudget,
    travelNotes: sanitizedTravelNotes,
    expeditionContext: expeditionContext as import("@/types/ai.types").ExpeditionContext | undefined,
    extraCategories,
    personalNotes: sanitizedPersonalNotes,
  });

  // Start streaming
  const streamStartTime = Date.now();
  try {
    const provider = getProvider();
    const { stream: aiStream, usage: usagePromise } = await provider.generateStreamingResponse(
      userMessage,
      tokenBudget,
      "plan",
      { systemPrompt: PLAN_SYSTEM_PROMPT },
    );

    const validatedTripId = tripIdResult.data;

    // Create SSE-formatted response stream with accumulation + persistence
    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = aiStream.getReader();
        let accumulated = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += value;
            controller.enqueue(encoder.encode(`data: ${value}\n\n`));
          }

          // Parse accumulated JSON and persist to DB before sending [DONE]
          let plan = parseItineraryJson(accumulated);

          // Retry with non-streaming fallback if streaming response was incomplete
          if (!plan && accumulated.length > 100) {
            logger.warn("ai.stream.parse.retry", { userIdHash: hid, tripId: validatedTripId, accumulatedLength: accumulated.length });
            try {
              const retryProvider = getProvider();
              const retryResponse = await retryProvider.generateResponse(
                userMessage,
                tokenBudget,
                "plan",
                { systemPrompt: PLAN_SYSTEM_PROMPT },
              );
              plan = parseItineraryJson(retryResponse.text);
              if (plan) {
                // Send the complete plan as final chunk so client has full data
                controller.enqueue(encoder.encode(`data: ${retryResponse.text}\n\n`));
                logger.info("ai.stream.retry.success", { userIdHash: hid, tripId: validatedTripId });
              }
            } catch (retryError) {
              logger.warn("ai.stream.retry.failed", { userIdHash: hid, error: String(retryError) });
            }
          }

          if (plan) {
            try {
              await persistItinerary(validatedTripId, plan);

              // Record generation on ItineraryPlan if it exists
              try {
                await ItineraryPlanService.recordGeneration(validatedTripId);
              } catch {
                // ItineraryPlan may not exist — ignore
              }

              // Award points for generating itinerary (non-blocking)
              try {
                await PointsEngine.earnPoints(
                  userId,
                  50,
                  "ai_usage",
                  "Itinerary generation (streaming)",
                  validatedTripId
                );
              } catch {
                // Non-blocking
              }

              logger.info("ai.stream.persisted", { userIdHash: hid, tripId: validatedTripId });
            } catch (persistError) {
              logger.error("ai.stream.persist.error",
                persistError instanceof Error ? persistError : new Error(String(persistError)),
                { userIdHash: hid, tripId: validatedTripId }
              );
              controller.enqueue(encoder.encode(`data: {"error":"persist_failed"}\n\n`));
            }
          } else {
            logger.error("ai.stream.parse.error", new Error("Failed to parse itinerary JSON"), {
              userIdHash: hid,
              tripId: validatedTripId,
              accumulatedLength: accumulated.length,
            });
            controller.enqueue(encoder.encode(`data: {"error":"parse_failed"}\n\n`));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          logger.error("ai.stream.sse.error", error instanceof Error ? error : new Error(String(error)), {
            userIdHash: hid,
            tripId: validatedTripId,
            accumulatedLength: accumulated.length,
          });

          // Mid-flight failure: attempt non-streaming recovery via the
          // FallbackProvider chain. This handles cases where Gemini starts
          // streaming then fails (quota cut, mid-stream timeout, network drop)
          // — scenarios that the initial-call FallbackProvider can't catch
          // because the primary already returned a stream handle.
          try {
            const recoveryProvider = getProvider();
            const recoveryResponse = await recoveryProvider.generateResponse(
              userMessage,
              tokenBudget,
              "plan",
              { systemPrompt: PLAN_SYSTEM_PROMPT },
            );
            const recoveryPlan = parseItineraryJson(recoveryResponse.text);
            if (recoveryPlan) {
              controller.enqueue(encoder.encode(`data: ${recoveryResponse.text}\n\n`));
              try {
                await persistItinerary(validatedTripId, recoveryPlan);
                try { await ItineraryPlanService.recordGeneration(validatedTripId); } catch { /* non-blocking */ }
                try {
                  await PointsEngine.earnPoints(
                    userId,
                    50,
                    "ai_usage",
                    "Itinerary generation (stream recovery)",
                    validatedTripId,
                  );
                } catch { /* non-blocking */ }
                logger.info("ai.stream.recovery.success", { userIdHash: hid, tripId: validatedTripId });
              } catch (persistErr) {
                logger.error("ai.stream.recovery.persist.error",
                  persistErr instanceof Error ? persistErr : new Error(String(persistErr)),
                  { userIdHash: hid, tripId: validatedTripId },
                );
                controller.enqueue(encoder.encode(`data: {"error":"persist_failed"}\n\n`));
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            // Recovery produced no parseable plan — fall through to error response
            controller.enqueue(encoder.encode(`data: {"error":"stream_failed"}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (recoveryError) {
            logger.error("ai.stream.recovery.failed",
              recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
              { userIdHash: hid, tripId: validatedTripId },
            );
            // Emit a structured error the client can parse instead of
            // aborting with "failed to pipe response".
            try {
              controller.enqueue(encoder.encode(`data: {"error":"stream_failed"}\n\n`));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch {
              // If the controller is already closed/errored, nothing we can do
            }
          }
        } finally {
          // Release the generation lock
          await releaseGenerationLock(validatedTripId, redis).catch(() => {});
        }
      },
    });

    // Log token usage + create AiInteractionLog after stream completes (non-blocking)
    usagePromise.then(async (usageData) => {
      const inputTokens = usageData.inputTokens ?? 0;
      const outputTokens = usageData.outputTokens ?? 0;
      const cacheReadTokens = usageData.cacheReadInputTokens ?? 0;
      const cacheWriteTokens = usageData.cacheCreationInputTokens ?? 0;
      const streamModelId = getModelIdForType("plan");
      const streamProviderName = streamModelId.startsWith("gemini") ? "gemini" : "claude";
      const cost = calculateEstimatedCost(
        streamModelId,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
      );
      logger.info("ai.stream.tokens.usage", {
        userIdHash: hid,
        generationType: "plan",
        model: streamProviderName,
        inputTokens,
        outputTokens,
        estimatedCostUSD: cost.totalCost,
      });

      // Persist interaction log for governance dashboard
      try {
        await db.aiInteractionLog.create({
          data: {
            userId: hid,
            phase: "plan",
            provider: streamProviderName,
            model: streamModelId,
            promptSlug: "travel-plan",
            inputTokens,
            outputTokens,
            cacheReadTokens,
            cacheWriteTokens,
            estimatedCostUsd: cost.totalCost,
            status: "success",
            latencyMs: Date.now() - streamStartTime,
            metadata: { route: "stream" },
          },
        });
      } catch (logErr) {
        logger.warn("ai.stream.interaction-log.error", { error: String(logErr) });
      }
    }).catch((err) => {
      logger.error("ai.stream.usage.error", err instanceof Error ? err : new Error(String(err)), { userIdHash: hid });
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // Release lock on error
    await releaseGenerationLock(tripIdResult.data, redis).catch(() => {});

    logger.error("ai.stream.error", error instanceof Error ? error : new Error(String(error)), { userIdHash: hid });

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
