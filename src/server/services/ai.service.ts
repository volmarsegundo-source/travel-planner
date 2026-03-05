import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { z } from "zod";
import { redis } from "@/server/cache/redis";
import { CacheKeys } from "@/server/cache/keys";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import type {
  GeneratePlanParams,
  ItineraryPlan,
  GenerateChecklistParams,
  ChecklistResult,
} from "@/types/ai.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_MODEL = "claude-sonnet-4-6";
const CHECKLIST_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_TIMEOUT_MS = 90_000;
const MAX_TOKENS_CHECKLIST = 2048;

// ─── Dynamic token budget for travel plans ───────────────────────────────────
// ~600 tokens per day (activities + descriptions) + 500 for structure/tips.
// Clamped between 4096 (short trips) and 16000 (max safe output for Sonnet).
const TOKENS_PER_DAY = 600;
const TOKENS_OVERHEAD = 500;
const MIN_PLAN_TOKENS = 4096;
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
  // Use string slicing to avoid timezone-related date shifts.
  // Input is expected as "YYYY-MM-DD" — extract "YYYY-MM" directly.
  return dateStr.slice(0, 7);
}

function repairTruncatedJson(text: string): string {
  // Attempt to close unclosed brackets/braces in truncated JSON.
  // Walk the string tracking open delimiters outside of strings.
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

  // If we're inside a string, close it first
  let repaired = text;
  if (inString) repaired += '"';

  // Remove any trailing comma before closing
  repaired = repaired.replace(/,\s*$/, "");

  // Close all open delimiters in reverse order
  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

function extractJsonFromResponse(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON block from markdown-fenced output
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // Fenced block may also be truncated — fall through to repair
      }
    }
    // Try to find raw JSON object
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Fall through to repair
      }
    }
    // Last resort: try to repair truncated JSON
    const jsonStart = text.indexOf("{");
    if (jsonStart !== -1) {
      const repaired = repairTruncatedJson(text.slice(jsonStart));
      return JSON.parse(repaired);
    }
    throw new Error("No valid JSON found in response");
  }
}

// ─── Anthropic singleton (lazy) ───────────────────────────────────────────────
// Lazy initialization prevents env access at module-load time, which would
// break unit tests that mock the Anthropic SDK before any env vars are set.

function getAnthropic(): Anthropic {
  const g = globalThis as unknown as { _anthropic?: Anthropic };
  if (!g._anthropic) {
    // Access via process.env to avoid t3-env client/server guard in test environments.
    // env.ts validates the key at startup in production; here we read it directly.
    g._anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    });
  }
  return g._anthropic;
}

// ─── AiService ────────────────────────────────────────────────────────────────

export class AiService {
  /**
   * Generates a day-by-day travel itinerary using Claude.
   * Uses MD5-keyed Redis cache (TTL: 24h) to avoid redundant API calls.
   * Never logs PII — only userId is logged.
   */
  static async generateTravelPlan(
    params: GeneratePlanParams
  ): Promise<ItineraryPlan> {
    const { userId, destination, startDate, endDate, travelStyle, budgetTotal, budgetCurrency, travelers, language } = params;

    // Bucket budget to nearest 500 for better cache reuse
    const budgetRange = Math.floor(budgetTotal / 500) * 500;
    const days = getDaysBetween(startDate, endDate);
    const cacheInput = `${destination}:${travelStyle}:${budgetRange}:${days}:${language}`;
    const cacheHash = md5(cacheInput);
    const cacheKey = CacheKeys.aiPlan(cacheHash);

    // Cache hit (graceful degradation if Redis is down)
    let cached: string | null = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (err) {
      logger.warn("ai.plan.cache.error", { userId, error: String(err) });
    }
    if (cached) {
      logger.info("ai.plan.cache.hit", { userId });
      return JSON.parse(cached) as ItineraryPlan;
    }

    // Dynamic token budget based on trip duration
    const tokenBudget = calculatePlanTokenBudget(days);

    // Build prompt — includes conciseness instructions and token-awareness
    const prompt = `You are a professional travel planner. Create a day-by-day itinerary as a single valid JSON object.

Trip details:
- Destination: ${destination}
- Dates: ${startDate} to ${endDate} (${days} days)
- Travel style: ${travelStyle}
- Budget: ${budgetTotal} ${budgetCurrency}
- Travelers: ${travelers} person(s)
- Language: ${language}

IMPORTANT CONSTRAINTS:
- Your max_tokens budget is ${tokenBudget}. You MUST fit the entire JSON within this limit.
- Keep each activity description to 1 short sentence (max 15 words).
- Plan 3-5 activities per day. For trips longer than 10 days, plan 3 activities per day.
- Keep tips to 3-5 items max, each under 15 words.
- Do NOT include markdown, code fences, or any text outside the JSON.

Respond ONLY with this JSON structure:
{
  "destination": "string",
  "totalDays": number,
  "estimatedBudgetUsed": number,
  "currency": "string",
  "days": [
    {
      "dayNumber": number,
      "date": "YYYY-MM-DD",
      "theme": "string (max 5 words)",
      "activities": [
        {
          "title": "string (max 8 words)",
          "description": "string (max 15 words)",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "estimatedCost": number,
          "activityType": "SIGHTSEEING|FOOD|TRANSPORT|ACCOMMODATION|LEISURE|SHOPPING"
        }
      ]
    }
  ],
  "tips": ["string (max 15 words each)"]
}`;

    const plan = await this.callClaudeForPlan(prompt, tokenBudget, userId);

    // Cache result (non-blocking if Redis is down)
    try {
      await redis.set(cacheKey, JSON.stringify(plan), "EX", CACHE_TTL.AI_PLAN);
    } catch {
      logger.warn("ai.plan.cache.set.error", { userId });
    }

    logger.info("ai.plan.generated", { userId, destination });
    return plan;
  }

  /**
   * Calls the Claude API and parses/validates the plan response.
   * Retries once with doubled token budget if the response is truncated.
   */
  private static async callClaudeForPlan(
    prompt: string,
    tokenBudget: number,
    userId: string,
  ): Promise<ItineraryPlan> {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const currentBudget = attempt === 1
        ? tokenBudget
        : Math.min(tokenBudget * 2, MAX_PLAN_TOKENS);

      let responseText: string;
      let wasTruncated = false;

      try {
        const message = await getAnthropic().messages.create(
          {
            model: PLAN_MODEL,
            max_tokens: currentBudget,
            messages: [{ role: "user", content: prompt }],
          },
          { signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS) }
        );

        const content = message.content[0];
        if (!content || content.type !== "text") {
          throw new Error("Unexpected Claude response structure");
        }
        responseText = content.text;
        wasTruncated = message.stop_reason === "max_tokens";

        if (wasTruncated) {
          logger.warn("ai.plan.truncated", {
            userId,
            attempt,
            responseLength: responseText.length,
            maxTokens: currentBudget,
          });
        }
      } catch (error) {
        logger.error("ai.plan.api.error", error, { userId });
        if (error instanceof Anthropic.AuthenticationError) {
          throw new AppError("AI_AUTH_ERROR", "errors.aiAuthError", 401);
        }
        if (error instanceof Anthropic.NotFoundError) {
          throw new AppError("AI_MODEL_ERROR", "errors.aiModelError", 404);
        }
        if (error instanceof Anthropic.RateLimitError) {
          throw new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429);
        }
        throw new AppError("AI_TIMEOUT", "errors.timeout", 504);
      }

      // If truncated on first attempt and we can retry with more tokens, do so
      if (wasTruncated && attempt < maxAttempts && currentBudget < MAX_PLAN_TOKENS) {
        logger.info("ai.plan.retry", { userId, nextBudget: Math.min(tokenBudget * 2, MAX_PLAN_TOKENS) });
        continue;
      }

      // Parse and validate
      let rawJson: unknown;
      try {
        rawJson = extractJsonFromResponse(responseText);
      } catch (error) {
        logger.error("ai.plan.parse.error", error, { userId, attempt });
        throw new AppError("AI_PARSE_ERROR", "errors.aiParseError", 502);
      }

      const parsed = ItineraryPlanSchema.safeParse(rawJson);
      if (!parsed.success) {
        logger.error("ai.plan.schema.error", parsed.error, { userId, attempt });
        throw new AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502);
      }

      return parsed.data as ItineraryPlan;
    }

    // Should not reach here, but TypeScript needs it
    throw new AppError("AI_PARSE_ERROR", "errors.aiParseError", 502);
  }

  /**
   * Generates a pre-trip checklist using Claude Haiku (cheaper/faster).
   * Cache key uses month instead of exact date for better reuse.
   * Never logs PII — only userId is logged.
   */
  static async generateChecklist(
    params: GenerateChecklistParams
  ): Promise<ChecklistResult> {
    const { userId, destination, startDate, travelers, language } = params;

    const month = getMonthFromDate(startDate);
    const cacheInput = `${destination}:${month}:${travelers}:${language}`;
    const cacheHash = md5(cacheInput);
    const cacheKey = CacheKeys.aiChecklist(cacheHash);

    // Cache hit (graceful degradation if Redis is down)
    let cached: string | null = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (err) {
      logger.warn("ai.checklist.cache.error", { userId, error: String(err) });
    }
    if (cached) {
      logger.info("ai.checklist.cache.hit", { userId });
      return JSON.parse(cached) as ChecklistResult;
    }

    const prompt = `You are a travel expert. Create a practical pre-trip checklist.

Trip: ${destination}, ${month}, ${travelers} traveler(s)
Language: ${language}

Respond ONLY with valid JSON:
{
  "categories": [
    {
      "category": "DOCUMENTS|HEALTH|CURRENCY|WEATHER|TECHNOLOGY",
      "items": [
        { "label": "string", "priority": "HIGH|MEDIUM|LOW" }
      ]
    }
  ]
}`;

    let responseText: string;
    try {
      const message = await getAnthropic().messages.create(
        {
          model: CHECKLIST_MODEL,
          max_tokens: MAX_TOKENS_CHECKLIST,
          messages: [{ role: "user", content: prompt }],
        },
        { signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS) }
      );

      const content = message.content[0];
      if (!content || content.type !== "text") {
        throw new Error("Unexpected Claude response structure");
      }
      responseText = content.text;
    } catch (error) {
      logger.error("ai.checklist.api.error", error, { userId });
      if (error instanceof Anthropic.AuthenticationError) {
        throw new AppError("AI_AUTH_ERROR", "errors.aiAuthError", 401);
      }
      if (error instanceof Anthropic.NotFoundError) {
        throw new AppError("AI_MODEL_ERROR", "errors.aiModelError", 404);
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new AppError("AI_RATE_LIMIT", "errors.rateLimitExceeded", 429);
      }
      throw new AppError("AI_TIMEOUT", "errors.timeout", 504);
    }

    // Parse and validate
    let rawJson: unknown;
    try {
      rawJson = extractJsonFromResponse(responseText);
    } catch (error) {
      logger.error("ai.checklist.parse.error", error, { userId });
      throw new AppError("AI_PARSE_ERROR", "errors.aiParseError", 502);
    }

    const parsed = ChecklistResultSchema.safeParse(rawJson);
    if (!parsed.success) {
      logger.error("ai.checklist.schema.error", parsed.error, { userId });
      throw new AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502);
    }

    const result = parsed.data as ChecklistResult;

    // Cache result (non-blocking if Redis is down)
    try {
      await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL.AI_PLAN);
    } catch {
      logger.warn("ai.checklist.cache.set.error", { userId });
    }

    logger.info("ai.checklist.generated", { userId });
    return result;
  }
}
