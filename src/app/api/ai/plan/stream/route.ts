import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { canUseAI } from "@/lib/guards/age-guard";
import { hashUserId } from "@/lib/hash";
import { logger } from "@/lib/logger";
import { sanitizeForPrompt } from "@/lib/prompts/injection-guard";
import { maskPII } from "@/lib/prompts/pii-masker";
import { travelPlanPrompt, PLAN_SYSTEM_PROMPT } from "@/lib/prompts";
import { ClaudeProvider } from "@/server/services/providers/claude.provider";
import { AppError } from "@/lib/errors";
import { GeneratePlanParamsSchema, TripIdSchema } from "@/lib/validations/ai.schema";
import { calculateEstimatedCost } from "@/lib/cost-calculator";

// Allow up to 120s for streaming responses (Vercel Pro)
export const maxDuration = 120;

// ─── Constants ──────────────────────────────────────────────────────────────

const TOKENS_PER_DAY = 600;
const TOKENS_OVERHEAD = 500;
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

  const { tripId, destination, startDate, endDate, travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes } = parsed.data;

  // Validate tripId format
  const tripIdResult = TripIdSchema.safeParse(tripId);
  if (!tripIdResult.success) {
    return NextResponse.json({ error: "Invalid tripId" }, { status: 400 });
  }

  // Rate limit
  const rl = await checkRateLimit(`ai:plan:${session.user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // BOLA check: trip belongs to user
  const trip = await db.trip.findFirst({
    where: { id: tripIdResult.data, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Age guard
  const userProfile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { birthDate: true },
  });
  if (!canUseAI(userProfile?.birthDate)) {
    return NextResponse.json({ error: "Age restriction" }, { status: 403 });
  }

  // Sanitize destination
  let sanitizedDestination: string;
  try {
    const sanitized = sanitizeForPrompt(destination, "destination", 200);
    const { masked } = maskPII(sanitized, "destination");
    sanitizedDestination = masked;
  } catch (error) {
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
  });

  // Start streaming
  try {
    const provider = new ClaudeProvider();
    const { stream: aiStream, usage: usagePromise } = await provider.generateStreamingResponse(
      userMessage,
      tokenBudget,
      "plan",
      { systemPrompt: PLAN_SYSTEM_PROMPT },
    );

    // Create SSE-formatted response stream
    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = aiStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(encoder.encode(`data: ${value}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          logger.error("ai.stream.sse.error", error instanceof Error ? error : new Error(String(error)), { userIdHash: hid });
          controller.error(error);
        }
      },
    });

    // Log token usage after stream completes (non-blocking)
    usagePromise.then((usageData) => {
      const cost = calculateEstimatedCost(
        "claude-sonnet-4-6",
        usageData.inputTokens ?? 0,
        usageData.outputTokens ?? 0,
        usageData.cacheReadInputTokens ?? 0,
        usageData.cacheCreationInputTokens ?? 0,
      );
      logger.info("ai.stream.tokens.usage", {
        userIdHash: hid,
        generationType: "plan",
        model: "claude",
        inputTokens: usageData.inputTokens ?? 0,
        outputTokens: usageData.outputTokens ?? 0,
        estimatedCostUSD: cost.totalCost,
      });
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
    logger.error("ai.stream.error", error instanceof Error ? error : new Error(String(error)), { userIdHash: hid });

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
