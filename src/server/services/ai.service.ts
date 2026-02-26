import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { z } from "zod";
import { redis } from "@/server/cache/redis";
import { CACHE_TTL } from "@/lib/constants";
import { env } from "@/lib/env";
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
const CLAUDE_TIMEOUT_MS = 55_000;
const MAX_TOKENS_PLAN = 4096;
const MAX_TOKENS_CHECKLIST = 2048;

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

function extractJsonFromResponse(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON block from markdown-fenced output
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      return JSON.parse(match[1].trim());
    }
    // Try to find raw JSON object
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("No valid JSON found in response");
  }
}

// ─── AiService ────────────────────────────────────────────────────────────────

export class AiService {
  private static getClient(): Anthropic {
    return new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

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
    const cacheKey = `cache:ai-plan:${cacheHash}`;

    // Cache hit
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info("ai.plan.cache.hit", { userId });
      return JSON.parse(cached) as ItineraryPlan;
    }

    // Build prompt
    const prompt = `You are a professional travel planner. Create a detailed day-by-day itinerary.

Trip details:
- Destination: ${destination}
- Dates: ${startDate} to ${endDate} (${days} days)
- Travel style: ${travelStyle}
- Budget: ${budgetTotal} ${budgetCurrency}
- Travelers: ${travelers} person(s)
- Language: ${language}

Respond ONLY with valid JSON in this exact format:
{
  "destination": "string",
  "totalDays": number,
  "estimatedBudgetUsed": number,
  "currency": "string",
  "days": [
    {
      "dayNumber": number,
      "date": "YYYY-MM-DD",
      "theme": "string",
      "activities": [
        {
          "title": "string",
          "description": "string",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "estimatedCost": number,
          "activityType": "SIGHTSEEING|FOOD|TRANSPORT|ACCOMMODATION|LEISURE|SHOPPING"
        }
      ]
    }
  ],
  "tips": ["string"]
}`;

    const client = AiService.getClient();

    let responseText: string;
    try {
      const message = await client.messages.create(
        {
          model: PLAN_MODEL,
          max_tokens: MAX_TOKENS_PLAN,
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
      logger.error("ai.plan.api.error", error, { userId });
      throw new AppError("AI_TIMEOUT", "errors.timeout", 504);
    }

    // Parse and validate
    let rawJson: unknown;
    try {
      rawJson = extractJsonFromResponse(responseText);
    } catch (error) {
      logger.error("ai.plan.parse.error", error, { userId });
      throw new AppError("AI_PARSE_ERROR", "errors.aiParseError", 502);
    }

    const parsed = ItineraryPlanSchema.safeParse(rawJson);
    if (!parsed.success) {
      logger.error("ai.plan.schema.error", parsed.error, { userId });
      throw new AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502);
    }

    const plan = parsed.data as ItineraryPlan;

    // Cache result
    await redis.set(cacheKey, JSON.stringify(plan), "EX", CACHE_TTL.AI_PLAN);

    logger.info("ai.plan.generated", { userId, destination });
    return plan;
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
    const cacheKey = `cache:ai-checklist:${cacheHash}`;

    // Cache hit
    const cached = await redis.get(cacheKey);
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

    const client = AiService.getClient();

    let responseText: string;
    try {
      const message = await client.messages.create(
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

    // Cache result
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL.AI_PLAN);

    logger.info("ai.checklist.generated", { userId });
    return result;
  }
}
