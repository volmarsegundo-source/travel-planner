import "server-only";
import { createHash } from "crypto";
import { z } from "zod";
import { redis } from "@/server/cache/redis";
import { CacheKeys } from "@/server/cache/keys";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { ClaudeProvider } from "./providers/claude.provider";
import type { AiProvider } from "./ai-provider.interface";
import type {
  GeneratePlanParams,
  ItineraryPlan,
  GenerateChecklistParams,
  ChecklistResult,
} from "@/types/ai.types";

// ─── Constants ────────────────────────────────────────────────────────────────

// ~600 tokens per day (activities + descriptions) + 500 for structure/tips.
// Clamped between 4096 (short trips) and 16000 (max safe output for Sonnet).
const TOKENS_PER_DAY = 600;
const TOKENS_OVERHEAD = 500;
const MIN_PLAN_TOKENS = 4096;
const MAX_PLAN_TOKENS = 16000;
const MAX_TOKENS_CHECKLIST = 2048;

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

function extractJsonFromResponse(text: string): unknown {
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

// ─── Provider factory ─────────────────────────────────────────────────────────

function getProvider(): AiProvider {
  // For now, always returns Claude. In Sprint 9, this factory will accept
  // a user tier parameter and return GeminiProvider for free-tier users.
  return new ClaudeProvider();
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
    const { userId, destination, startDate, endDate, travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes } = params;

    // Bucket budget to nearest 500 for better cache reuse
    const budgetRange = Math.floor(budgetTotal / 500) * 500;
    const days = getDaysBetween(startDate, endDate);
    const notesHash = travelNotes ? `:${md5(travelNotes)}` : "";
    const cacheInput = `${destination}:${travelStyle}:${budgetRange}:${days}:${language}${notesHash}`;
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

    // Build prompt
    const notesSection = travelNotes
      ? `\nAdditional traveler notes: ${travelNotes}\n`
      : "";

    const prompt = `You are a professional travel planner. Create a day-by-day itinerary as a single valid JSON object.

Trip details:
- Destination: ${destination}
- Dates: ${startDate} to ${endDate} (${days} days)
- Travel style: ${travelStyle}
- Budget: ${budgetTotal} ${budgetCurrency}
- Travelers: ${travelers} person(s)
- Language: ${language}
${notesSection}
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

    const plan = await this.callProviderForPlan(prompt, tokenBudget, userId);

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
   * Calls the AI provider and parses/validates the plan response.
   * Retries once with doubled token budget if the response is truncated.
   */
  private static async callProviderForPlan(
    prompt: string,
    tokenBudget: number,
    userId: string,
  ): Promise<ItineraryPlan> {
    const provider = getProvider();
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const currentBudget = attempt === 1
        ? tokenBudget
        : Math.min(tokenBudget * 2, MAX_PLAN_TOKENS);

      const response = await provider.generateResponse(prompt, currentBudget, "plan");

      if (response.wasTruncated) {
        logger.warn("ai.plan.truncated", {
          userId,
          attempt,
          responseLength: response.text.length,
          maxTokens: currentBudget,
        });
      }

      // If truncated on first attempt and we can retry with more tokens, do so
      if (response.wasTruncated && attempt < maxAttempts && currentBudget < MAX_PLAN_TOKENS) {
        logger.info("ai.plan.retry", { userId, nextBudget: Math.min(tokenBudget * 2, MAX_PLAN_TOKENS) });
        continue;
      }

      // Parse and validate
      let rawJson: unknown;
      try {
        rawJson = extractJsonFromResponse(response.text);
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
   * Generates a pre-trip checklist using AI (cheaper/faster model).
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

    const provider = getProvider();
    const response = await provider.generateResponse(prompt, MAX_TOKENS_CHECKLIST, "checklist");

    // Parse and validate
    let rawJson: unknown;
    try {
      rawJson = extractJsonFromResponse(response.text);
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
