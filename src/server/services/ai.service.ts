import "server-only";
import { createHash } from "crypto";
import { z } from "zod";
import { redis } from "@/server/cache/redis";
import { CacheKeys } from "@/server/cache/keys";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { AppError } from "@/lib/errors";
import { calculateEstimatedCost } from "@/lib/cost-calculator";
import {
  travelPlanPrompt,
  checklistPrompt,
  destinationGuidePrompt,
} from "@/lib/prompts";
import { ClaudeProvider } from "./providers/claude.provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { FallbackProvider } from "./providers/fallback.provider";
import type { AiProvider, AiProviderResponse, ModelType } from "./ai-provider.interface";
import type {
  GeneratePlanParams,
  ItineraryPlan,
  GenerateChecklistParams,
  ChecklistResult,
  GenerateGuideParams,
  DestinationGuideContentV2,
} from "@/types/ai.types";

// ─── Constants ────────────────────────────────────────────────────────────────

// ~600 tokens per day (activities + descriptions) + 500 for structure/tips.
// Clamped between 2048 (short trips) and 16000 (max safe output for Sonnet).
// MIN_PLAN_TOKENS reduced from 4096 to 2048 per OPT-005 — short trips (1-3 days)
// don't need 4K tokens; the retry mechanism doubles budget if truncated.
const TOKENS_PER_DAY = 600;
// Overhead increased from 500 to 1100 to account for ~600 tokens of
// enriched traveler context added by SPEC-AI-004 (TASK-S33-012).
const TOKENS_OVERHEAD = 1100;
const MIN_PLAN_TOKENS = 2048;
const MAX_PLAN_TOKENS = 16000;

function calculatePlanTokenBudget(days: number): number {
  const estimated = days * TOKENS_PER_DAY + TOKENS_OVERHEAD;
  return Math.min(MAX_PLAN_TOKENS, Math.max(MIN_PLAN_TOKENS, estimated));
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const DayActivitySchema = z.object({
  title: z.string(),
  description: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  estimatedCost: z.number(),
  activityType: z.enum([
    "SIGHTSEEING",
    "FOOD",
    "TRANSPORT",
    "ACCOMMODATION",
    "LEISURE",
    "SHOPPING",
  ]),
});

const DayPlanSchema = z.object({
  dayNumber: z.number(),
  date: z.string(),
  theme: z.string(),
  activities: z.array(DayActivitySchema),
  // Sprint 43 Wave 4: multi-city optional fields
  city: z.string().optional(),
  isTransit: z.boolean().optional(),
  transitFrom: z.string().optional(),
  transitTo: z.string().optional(),
});

const ItineraryPlanSchema = z.object({
  destination: z.string(),
  totalDays: z.number(),
  estimatedBudgetUsed: z.number(),
  currency: z.string(),
  days: z.array(DayPlanSchema),
  tips: z.array(z.string()),
});

const ChecklistItemSchema = z.object({
  label: z.string(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

const ChecklistCategorySchema = z.object({
  category: z.enum(["DOCUMENTS", "HEALTH", "CURRENCY", "WEATHER", "TECHNOLOGY"]),
  items: z.array(ChecklistItemSchema),
});

const ChecklistResultSchema = z.object({
  categories: z.array(ChecklistCategorySchema),
});

const QuickFactSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const SafetySchema = z.object({
  level: z.enum(["safe", "moderate", "caution"]),
  tips: z.array(z.string()).min(1).max(10),
  emergencyNumbers: z.object({
    police: z.string().optional().default("911"),
    ambulance: z.string().optional().default("911"),
    tourist: z.string().nullable().optional().default(null),
  }).optional(),
});

const CostItemSchema = z.object({
  category: z.string(),
  budget: z.string(),
  mid: z.string(),
  premium: z.string(),
});

const DailyCostsSchema = z.object({
  items: z.array(CostItemSchema).min(1).max(10),
  dailyTotal: z.object({
    budget: z.string(),
    mid: z.string(),
    premium: z.string(),
  }).optional(),
  tip: z.string().optional(),
});

const MustSeeItemSchema = z.object({
  name: z.string(),
  category: z.string(), // relaxed — AI may use unexpected categories
  estimatedTime: z.string().optional().default(""),
  costRange: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

const DocumentationSchema = z.object({
  passport: z.string(),
  visa: z.string(),
  vaccines: z.string().optional().default("Consult your doctor"),
  insurance: z.string().optional().default("Recommended"),
});

const LocalTransportSchema = z.object({
  options: z.array(z.string()).min(1).max(10),
  tips: z.array(z.string()).min(1).max(10),
});

export const DestinationGuideContentSchema = z.object({
  destination: z.object({
    name: z.string(),
    nickname: z.string().optional().default(""),
    subtitle: z.string().optional().default(""),
    overview: z.array(z.string()).min(1).max(4),
  }),
  quickFacts: z.object({
    climate: QuickFactSchema,
    currency: QuickFactSchema,
    language: QuickFactSchema,
    timezone: QuickFactSchema,
    plugType: QuickFactSchema.optional(),
    dialCode: QuickFactSchema.optional(),
  }),
  safety: SafetySchema,
  dailyCosts: DailyCostsSchema.optional(),
  mustSee: z.array(MustSeeItemSchema).min(1).max(10),
  documentation: DocumentationSchema.optional(),
  localTransport: LocalTransportSchema.optional(),
  culturalTips: z.array(z.string()).min(1).max(10),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function getMonthFromDate(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function repairTruncatedJson(text: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (const ch of text) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let repaired = text;
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, "");

  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

export function extractJsonFromResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // Fall through to repair
      }
    }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Fall through to repair
      }
    }
    const jsonStart = text.indexOf("{");
    if (jsonStart !== -1) {
      const repaired = repairTruncatedJson(text.slice(jsonStart));
      return JSON.parse(repaired);
    }
    throw new Error("No valid JSON found in response");
  }
}

/**
 * Builds a deterministic cache input string for guide generation.
 * Fields are serialized in a fixed order so that identical contexts
 * always produce the same hash regardless of JS object key order.
 */
export function buildGuideCacheInput(
  destination: string,
  language: string,
  ctx?: import("@/lib/prompts/types").GuideTravelerContext,
): string {
  const parts = [destination, language];
  if (ctx) {
    parts.push(
      ctx.startDate ?? "",
      ctx.endDate ?? "",
      String(ctx.travelers ?? ""),
      ctx.travelerType ?? "",
      String(ctx.travelPace ?? ""),
      String(ctx.budget ?? ""),
      ctx.budgetCurrency ?? "",
      ctx.accommodationStyle ?? "",
      ctx.dietaryRestrictions ?? "",
      (ctx.interests ?? []).sort().join(","),
      ctx.fitnessLevel ?? "",
      (ctx.transportTypes ?? []).sort().join(","),
      ctx.tripType ?? "",
    );
  }
  return parts.join(":");
}

// ─── Provider factory ─────────────────────────────────────────────────────────

const CLAUDE_MODEL_ID_MAP: Record<ModelType, string> = {
  plan: "claude-sonnet-4-6",
  checklist: "claude-haiku-4-5-20251001",
  guide: "claude-haiku-4-5-20251001",
};

const GEMINI_MODEL_ID_MAP: Record<ModelType, string> = {
  plan: "gemini-2.0-flash",
  checklist: "gemini-2.0-flash",
  guide: "gemini-2.0-flash",
};

/**
 * Resolves the current AI provider name from environment.
 * Defaults to "anthropic" for backward compatibility.
 *
 * Per-type overrides (SPEC-ARCH-AI-TIMEOUT #7-9):
 *   AI_PROVIDER_PLAN, AI_PROVIDER_GUIDE, AI_PROVIDER_CHECKLIST
 * take precedence over AI_PROVIDER when present.
 */
export function resolveProviderName(type?: ModelType): "anthropic" | "gemini" {
  if (type) {
    const typeEnvKey =
      type === "plan" ? "AI_PROVIDER_PLAN" :
      type === "guide" ? "AI_PROVIDER_GUIDE" :
      "AI_PROVIDER_CHECKLIST";
    const typeOverride = process.env[typeEnvKey];
    if (typeOverride === "gemini") return "gemini";
    if (typeOverride === "anthropic") return "anthropic";
  }
  const provider = process.env.AI_PROVIDER;
  if (provider === "gemini") return "gemini";
  return "anthropic";
}

/**
 * Creates the appropriate AiProvider based on environment configuration.
 * If AI_FALLBACK_PROVIDER is set, wraps the primary in a FallbackProvider.
 *
 * @param type Optional ModelType — when provided, a per-type override
 *   (AI_PROVIDER_<TYPE>) is consulted before the global AI_PROVIDER.
 */
export function getProvider(type?: ModelType): AiProvider {
  const providerName = resolveProviderName(type);
  const primary: AiProvider = providerName === "gemini"
    ? new GeminiProvider()
    : new ClaudeProvider();

  const fallbackName = process.env.AI_FALLBACK_PROVIDER as "anthropic" | "gemini" | undefined;
  if (fallbackName && fallbackName !== providerName) {
    const fallback: AiProvider = fallbackName === "gemini"
      ? new GeminiProvider()
      : new ClaudeProvider();
    return new FallbackProvider(primary, fallback);
  }

  return primary;
}

/**
 * Returns a provider that ALWAYS wraps the primary in a FallbackProvider with
 * the opposite provider, regardless of AI_FALLBACK_PROVIDER env var.
 *
 * Use this in streaming routes where a missing Vercel env var would otherwise
 * silently disable fallback and cause 504s. The route stays resilient even if
 * ops forgets to set AI_FALLBACK_PROVIDER.
 *
 * Requires BOTH ANTHROPIC_API_KEY and GOOGLE_AI_API_KEY to be set. If only
 * one key is available the opposite provider will throw AI_CONFIG_ERROR at
 * call time — caller should log and fall through to error response.
 */
export function getProviderWithForcedFallback(type?: ModelType): AiProvider {
  const primaryName = resolveProviderName(type);
  const primary: AiProvider = primaryName === "gemini"
    ? new GeminiProvider()
    : new ClaudeProvider();
  const fallback: AiProvider = primaryName === "gemini"
    ? new ClaudeProvider()
    : new GeminiProvider();
  return new FallbackProvider(primary, fallback);
}

/**
 * Returns a fresh instance of the *opposite* provider for mid-flight recovery.
 * Used when a stream started but failed partway — at that point the
 * FallbackProvider wrapper can't help (it only wraps the initial call), so
 * the route needs to retry the request against the other provider explicitly.
 */
export function getSecondaryProvider(type?: ModelType): AiProvider {
  const primaryName = resolveProviderName(type);
  return primaryName === "gemini" ? new ClaudeProvider() : new GeminiProvider();
}

// ─── Model ID resolution for cost tracking ───────────────────────────────────

/**
 * Returns the concrete model ID for a given ModelType, based on the active provider.
 * Used for cost tracking and logging.
 */
export function getModelIdForType(type: ModelType): string {
  const providerName = resolveProviderName(type);
  const map = providerName === "gemini" ? GEMINI_MODEL_ID_MAP : CLAUDE_MODEL_ID_MAP;
  return map[type];
}

// ─── Token usage sharing with gateway ─────────────────────────────────────────

/**
 * Module-level variable to share the last token usage data with AiGatewayService.
 * Set by logTokenUsage(), consumed once by getLastTokenUsage().
 */
let _lastUsage: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  model: string;
} | null = null;

/**
 * Returns the last recorded token usage and clears the stored value.
 * Called by AiGatewayService after fn() returns to populate AiInteractionLog.
 */
export function getLastTokenUsage() {
  const usage = _lastUsage;
  _lastUsage = null;
  return usage;
}

// ─── Token usage logging ──────────────────────────────────────────────────────

/**
 * Logs structured token usage data after each AI call.
 * Enables FinOps monitoring and cost tracking without PII exposure.
 * Includes estimated cost in USD for FinOps dashboards.
 */
export function logTokenUsage(
  response: AiProviderResponse,
  params: {
    userId: string;
    generationType: ModelType;
    provider: string;
  },
): void {
  const inputTokens = response.inputTokens ?? 0;
  const outputTokens = response.outputTokens ?? 0;
  const cacheReadTokens = response.cacheReadInputTokens ?? 0;
  const cacheWriteTokens = response.cacheCreationInputTokens ?? 0;

  const modelId = getModelIdForType(params.generationType);
  const cost = calculateEstimatedCost(
    modelId,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
  );

  logger.info("ai.tokens.usage", {
    userId: hashUserId(params.userId),
    generationType: params.generationType,
    model: params.provider,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    estimatedCostUSD: cost.totalCost,
    costBreakdown: cost,
  });

  // Store usage for gateway to read after fn() returns
  _lastUsage = {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costUsd: cost.totalCost,
    model: modelId,
  };
}

// ─── AiService ────────────────────────────────────────────────────────────────

export class AiService {
  /**
   * Generates a day-by-day travel itinerary using AI.
   * Uses MD5-keyed Redis cache (TTL: 24h) to avoid redundant API calls.
   * Never logs PII — only userId is logged.
   */
  static async generateTravelPlan(
    params: GeneratePlanParams
  ): Promise<ItineraryPlan> {
    const { userId, destination, startDate, endDate, travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes, expeditionContext } = params;
    const hid = hashUserId(userId);

    // Bucket budget to nearest 500 for better cache reuse
    const budgetRange = Math.floor(budgetTotal / 500) * 500;
    const days = getDaysBetween(startDate, endDate);
    const notesHash = travelNotes ? `:${md5(travelNotes)}` : "";
    const ctxHash = expeditionContext ? `:${md5(JSON.stringify(expeditionContext))}` : "";
    const cacheInput = `${destination}:${travelStyle}:${budgetRange}:${days}:${language}${notesHash}${ctxHash}`;
    const cacheHash = md5(cacheInput);
    const cacheKey = CacheKeys.aiPlan(cacheHash);

    // Cache hit (graceful degradation if Redis is down)
    let cached: string | null = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (err) {
      logger.warn("ai.plan.cache.error", { userId: hid, error: String(err) });
    }
    if (cached) {
      logger.info("ai.plan.cache.hit", { userId: hid });
      return JSON.parse(cached) as ItineraryPlan;
    }

    // Dynamic token budget based on trip duration
    const tokenBudget = calculatePlanTokenBudget(days);

    // Build user message using versioned prompt template
    const userMessage = travelPlanPrompt.buildUserPrompt({
      destination,
      startDate,
      endDate,
      days,
      travelStyle,
      budgetTotal,
      budgetCurrency,
      travelers,
      language,
      tokenBudget,
      travelNotes,
      expeditionContext,
    });

    const plan = await this.callProviderForPlan(userMessage, tokenBudget, userId);

    // Cache result (non-blocking if Redis is down)
    try {
      await redis.set(cacheKey, JSON.stringify(plan), "EX", CACHE_TTL.AI_PLAN);
    } catch {
      logger.warn("ai.plan.cache.set.error", { userId: hid });
    }

    logger.info("ai.plan.generated", { userId: hid, destination });
    return plan;
  }

  /**
   * Calls the AI provider and parses/validates the plan response.
   * Retries once with doubled token budget if the response is truncated.
   */
  private static async callProviderForPlan(
    userMessage: string,
    tokenBudget: number,
    userId: string,
  ): Promise<ItineraryPlan> {
    const provider = getProvider("plan");
    const hid = hashUserId(userId);
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const currentBudget = attempt === 1
        ? tokenBudget
        : Math.min(tokenBudget * 2, MAX_PLAN_TOKENS);

      const response = await provider.generateResponse(
        userMessage,
        currentBudget,
        travelPlanPrompt.model,
        { systemPrompt: travelPlanPrompt.system },
      );

      logTokenUsage(response, { userId, generationType: "plan", provider: provider.name });

      if (response.wasTruncated) {
        logger.warn("ai.plan.truncated", {
          userId: hid,
          attempt,
          responseLength: response.text.length,
          maxTokens: currentBudget,
        });
      }

      // If truncated on first attempt and we can retry with more tokens, do so
      if (response.wasTruncated && attempt < maxAttempts && currentBudget < MAX_PLAN_TOKENS) {
        logger.info("ai.plan.retry", { userId: hid, nextBudget: Math.min(tokenBudget * 2, MAX_PLAN_TOKENS) });
        continue;
      }

      // Parse and validate
      let rawJson: unknown;
      try {
        rawJson = extractJsonFromResponse(response.text);
      } catch (error) {
        logger.error("ai.plan.parse.error", error, { userId: hid, attempt });
        throw new AppError("AI_PARSE_ERROR", "errors.aiParseError", 502);
      }

      const parsed = ItineraryPlanSchema.safeParse(rawJson);
      if (!parsed.success) {
        logger.error("ai.plan.schema.error", parsed.error, { userId: hid, attempt });
        throw new AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502);
      }

      return parsed.data as ItineraryPlan;
    }

    // Should not reach here, but TypeScript needs it
    throw new AppError("AI_PARSE_ERROR", "errors.aiParseError", 502);
  }

  /**
   * Generates a pre-trip checklist using AI (cheaper/faster model).
   * Cache key uses month instead of exact date for better reuse.
   * Never logs PII — only userId is logged.
   */
  static async generateChecklist(
    params: GenerateChecklistParams
  ): Promise<ChecklistResult> {
    const { userId, destination, startDate, travelers, language } = params;
    const hid = hashUserId(userId);

    const month = getMonthFromDate(startDate);
    const cacheInput = `${destination}:${month}:${travelers}:${language}`;
    const cacheHash = md5(cacheInput);
    const cacheKey = CacheKeys.aiChecklist(cacheHash);

    // Cache hit (graceful degradation if Redis is down)
    let cached: string | null = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (err) {
      logger.warn("ai.checklist.cache.error", { userId: hid, error: String(err) });
    }
    if (cached) {
      logger.info("ai.checklist.cache.hit", { userId: hid });
      return JSON.parse(cached) as ChecklistResult;
    }

    const userMessage = checklistPrompt.buildUserPrompt({
      destination,
      month,
      travelers,
      language,
    });

    const provider = getProvider("checklist");
    const response = await provider.generateResponse(
      userMessage,
      checklistPrompt.maxTokens,
      checklistPrompt.model,
      { systemPrompt: checklistPrompt.system },
    );

    logTokenUsage(response, { userId, generationType: "checklist", provider: provider.name });

    // Parse and validate
    let rawJson: unknown;
    try {
      rawJson = extractJsonFromResponse(response.text);
    } catch (error) {
      logger.error("ai.checklist.parse.error", error, { userId: hid });
      throw new AppError("AI_PARSE_ERROR", "errors.aiParseError", 502);
    }

    const parsed = ChecklistResultSchema.safeParse(rawJson);
    if (!parsed.success) {
      logger.error("ai.checklist.schema.error", parsed.error, { userId: hid });
      throw new AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502);
    }

    const result = parsed.data as ChecklistResult;

    // Cache result (non-blocking if Redis is down)
    try {
      await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL.AI_PLAN);
    } catch {
      logger.warn("ai.checklist.cache.set.error", { userId: hid });
    }

    logger.info("ai.checklist.generated", { userId: hid });
    return result;
  }

  /**
   * Generates a destination guide using AI (v2 structured JSON).
   * Returns structured info: destination, quickFacts, safety, dailyCosts,
   * mustSee, documentation, localTransport, culturalTips.
   * Cache key is versioned (v2) so old v1 keys expire naturally via TTL.
   */
  static async generateDestinationGuide(
    params: GenerateGuideParams
  ): Promise<DestinationGuideContentV2> {
    const { userId, destination, language } = params;
    const hid = hashUserId(userId);

    // Deterministic cache input: fixed field order for consistent hashing
    const cacheInput = buildGuideCacheInput(destination, language, params.travelerContext);
    const cacheHash = md5(cacheInput);
    const cacheKey = CacheKeys.aiGuide(cacheHash);

    // Cache hit
    let cached: string | null = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (err) {
      logger.warn("ai.guide.cache.error", { userId: hid, error: String(err) });
    }
    if (cached) {
      logger.info("ai.guide.cache.hit", { userId: hid });
      return JSON.parse(cached) as DestinationGuideContentV2;
    }

    const userMessage = destinationGuidePrompt.buildUserPrompt({
      destination,
      language,
      travelerContext: params.travelerContext,
      extraCategories: params.extraCategories,
      personalNotes: params.personalNotes,
    });

    const provider = getProvider("guide");
    const MAX_ATTEMPTS = 2;
    // Skip retry if first attempt already consumed the Vercel 60s budget.
    // Provider timeout is 50s, so if elapsed > 25s we cannot safely retry.
    const RETRY_BUDGET_MS = 25_000;
    const startedAt = Date.now();
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const attemptStart = Date.now();
      logger.info("ai.guide.attempt", {
        userId: hid, attempt, maxTokens: destinationGuidePrompt.maxTokens,
        model: destinationGuidePrompt.model, destination,
        elapsedMs: attemptStart - startedAt,
      });

      const response = await provider.generateResponse(
        userMessage,
        destinationGuidePrompt.maxTokens,
        destinationGuidePrompt.model,
        { systemPrompt: destinationGuidePrompt.system },
      );
      const aiLatencyMs = Date.now() - attemptStart;

      logTokenUsage(response, { userId, generationType: "guide", provider: provider.name });

      logger.info("ai.guide.response", {
        userId: hid, attempt, aiLatencyMs,
        textLength: response.text.length,
        wasTruncated: response.wasTruncated,
        preview: response.text.substring(0, 200),
      });

      let rawJson: unknown;
      try {
        rawJson = extractJsonFromResponse(response.text);
      } catch (error) {
        logger.warn("ai.guide.parse.error", {
          userId: hid, attempt, error: String(error),
          responseLength: response.text.length,
          responseTail: response.text.substring(response.text.length - 200),
        });
        lastError = error;
        if (attempt < MAX_ATTEMPTS && Date.now() - startedAt < RETRY_BUDGET_MS) continue;
        throw new AppError("AI_PARSE_ERROR", "errors.aiSchemaError", 502);
      }

      const parseStart = Date.now();
      const parsed = DestinationGuideContentSchema.safeParse(rawJson);
      const parseMs = Date.now() - parseStart;

      if (!parsed.success) {
        const failedPaths = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        logger.warn("ai.guide.schema.error", {
          userId: hid, attempt, parseMs, errorCount: parsed.error.errors.length,
          failedPaths: failedPaths.slice(0, 10),
        });
        lastError = parsed.error;
        if (attempt < MAX_ATTEMPTS && Date.now() - startedAt < RETRY_BUDGET_MS) continue;
        throw new AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502);
      }

      // Success — cache and return
      const result = parsed.data as DestinationGuideContentV2;

      try {
        await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL.AI_PLAN);
      } catch {
        logger.warn("ai.guide.cache.set.error", { userId: hid });
      }

      logger.info("ai.guide.generated", {
        userId: hid, destination, attempt,
        aiLatencyMs, parseMs, totalMs: Date.now() - startedAt,
      });
      return result;
    }

    // Unreachable — loop always returns or throws, but TypeScript needs this
    throw new AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502);
  }
}
