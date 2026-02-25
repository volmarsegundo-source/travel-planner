import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { redis } from "@/server/cache/client";
import { CacheKeys, CacheTTL } from "@/server/cache/keys";
import type {
  GeneratePlanParams,
  GenerateChecklistParams,
  ItineraryPlan,
  ChecklistCategory,
} from "@/types/ai.types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Helpers ────────────────────────────────────────────────────────────────

function budgetRange(amount?: number | null, step = 500): string {
  if (!amount) return "unspecified";
  return String(Math.floor(amount / step) * step);
}

function daysBetween(start?: Date | null, end?: Date | null): number {
  if (!start || !end) return 5; // default
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

function hashParams(params: Record<string, string>): string {
  const str = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return createHash("md5").update(str).digest("hex");
}

// ── Trip plan generation ───────────────────────────────────────────────────

export async function generateTravelPlan(
  params: GeneratePlanParams,
): Promise<ItineraryPlan> {
  const days = daysBetween(params.startDate, params.endDate);
  const language = params.language ?? "pt-BR";

  const cacheKey = CacheKeys.aiPlan(
    hashParams({
      destination: params.destination,
      travelStyle: params.travelStyle ?? "general",
      budgetRange: budgetRange(params.budgetTotal),
      days: String(days),
      language,
    }),
  );

  // Cache hit
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as ItineraryPlan;
  }

  const isPortuguese = language === "pt-BR";
  const prompt = buildTripPlanPrompt(params, days, isPortuguese);

  const message = await client.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    },
    { timeout: 55_000 },
  );

  const text =
    message.content[0]?.type === "text" ? message.content[0].text : "";

  const plan = parseItineraryPlan(text, params, days);

  await redis.setex(cacheKey, CacheTTL.AI_PLAN, JSON.stringify(plan));

  return plan;
}

function buildTripPlanPrompt(
  params: GeneratePlanParams,
  days: number,
  isPortuguese: boolean,
): string {
  const lang = isPortuguese ? "Portuguese (pt-BR)" : "English";
  const styleLabel = params.travelStyle
    ? `travel style: ${params.travelStyle}`
    : "general travel style";
  const budgetLabel = params.budgetTotal
    ? `budget of ${params.budgetTotal} ${params.budgetCurrency ?? "BRL"}`
    : "unspecified budget";
  const travelersLabel = `${params.travelers} traveler${params.travelers !== 1 ? "s" : ""}`;
  const datesLabel =
    params.startDate && params.endDate
      ? `from ${params.startDate.toISOString().slice(0, 10)} to ${params.endDate.toISOString().slice(0, 10)}`
      : `${days} days`;

  return `You are a professional travel planner. Create a detailed ${days}-day itinerary for ${params.destination} in ${lang}.

Trip details:
- Destination: ${params.destination}
- Duration: ${datesLabel}
- Travelers: ${travelersLabel}
- Travel style: ${styleLabel}
- Budget: ${budgetLabel}

Return ONLY a valid JSON object (no markdown, no explanation) matching this exact structure:
{
  "destination": "${params.destination}",
  "totalDays": ${days},
  "travelStyle": "${params.travelStyle ?? "general"}",
  "budgetSummary": "brief budget breakdown string",
  "highlights": ["top highlight 1", "top highlight 2", "top highlight 3"],
  "days": [
    {
      "dayNumber": 1,
      "date": "${params.startDate?.toISOString().slice(0, 10) ?? ""}",
      "theme": "Day theme in ${lang}",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity name",
          "description": "Brief description in ${lang}",
          "durationMinutes": 90,
          "category": "SIGHTSEEING",
          "estimatedCost": 0
        }
      ]
    }
  ],
  "tips": ["practical tip 1", "practical tip 2"]
}

Categories must be one of: SIGHTSEEING, FOOD, TRANSPORT, LEISURE, ACCOMMODATION, OTHER.
Include 3-5 activities per day. Keep descriptions concise and practical.`;
}

function parseItineraryPlan(
  text: string,
  params: GeneratePlanParams,
  days: number,
): ItineraryPlan {
  try {
    // Strip potential markdown fences
    const clean = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(clean) as ItineraryPlan;
  } catch {
    // Fallback plan if parsing fails
    return {
      destination: params.destination,
      totalDays: days,
      travelStyle: params.travelStyle ?? "general",
      highlights: [params.destination],
      days: Array.from({ length: days }, (_, i) => ({
        dayNumber: i + 1,
        theme: `Day ${i + 1}`,
        activities: [
          {
            title: "Explore the destination",
            description: "Discover local attractions and culture.",
            category: "SIGHTSEEING" as const,
          },
        ],
      })),
    };
  }
}

// ── Checklist generation (T-010) ───────────────────────────────────────────

export async function generateChecklist(
  params: GenerateChecklistParams,
): Promise<ChecklistCategory[]> {
  const language = params.language ?? "pt-BR";
  const month = params.startDate
    ? String(params.startDate.getMonth() + 1).padStart(2, "0")
    : "00";

  const cacheKey = CacheKeys.aiChecklist(
    hashParams({
      destination: params.destination,
      month,
      travelers: String(params.travelers),
      language,
    }),
  );

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as ChecklistCategory[];
  }

  const isPortuguese = language === "pt-BR";
  const prompt = buildChecklistPrompt(params, isPortuguese);

  const message = await client.messages.create(
    {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    },
    { timeout: 30_000 },
  );

  const text =
    message.content[0]?.type === "text" ? message.content[0].text : "";

  const checklist = parseChecklist(text);

  await redis.setex(cacheKey, CacheTTL.AI_CHECKLIST, JSON.stringify(checklist));

  return checklist;
}

function buildChecklistPrompt(
  params: GenerateChecklistParams,
  isPortuguese: boolean,
): string {
  const lang = isPortuguese ? "Portuguese (pt-BR)" : "English";
  const monthNames = isPortuguese
    ? ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
    : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthLabel = params.startDate
    ? monthNames[params.startDate.getMonth()]
    : "unknown season";

  return `You are a travel preparation expert. Create a travel checklist for ${params.destination} in ${lang}.

Trip info:
- Destination: ${params.destination}
- Travel month: ${monthLabel}
- Travelers: ${params.travelers}

Return ONLY a valid JSON array (no markdown) with this structure:
[
  {
    "id": "DOCUMENTS",
    "items": [
      { "text": "Item name in ${lang}", "required": true, "notes": "optional hint" }
    ]
  }
]

Categories to include: DOCUMENTS, HEALTH, CURRENCY, WEATHER, TECHNOLOGY, OTHER.
4-6 items per category. Mark visa, passport, vaccines as required=true. Keep it practical.`;
}

function parseChecklist(text: string): ChecklistCategory[] {
  try {
    const clean = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(clean) as ChecklistCategory[];
  } catch {
    return [
      {
        id: "DOCUMENTS",
        items: [
          { text: "Passaporte / RG", required: true },
          { text: "Vistos necessários", required: true },
        ],
      },
    ];
  }
}
