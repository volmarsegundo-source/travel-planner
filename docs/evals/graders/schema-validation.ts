/**
 * Schema Validation Grader
 *
 * Validates AI outputs against Zod schemas that mirror the production
 * schemas used in ai.service.ts. This grader catches structural drift
 * between what the prompt asks for and what the model actually returns.
 *
 * Used for: itinerary structure, guide sections, checklist items.
 *
 * @eval-type code
 * @metrics accuracy, structure
 */

import { z } from "zod";

// ─── Shared Types ───────────────────────────────────────────────────────────────

interface GraderResult {
  /** Whether the output passes the grading threshold */
  pass: boolean;
  /** Normalized score from 0.0 (complete failure) to 1.0 (perfect) */
  score: number;
  /** Human-readable error descriptions */
  errors: string[];
  /** Structured metadata for logging and dashboards */
  details: Record<string, unknown>;
}

// ─── Itinerary Schemas ──────────────────────────────────────────────────────────
// Mirrors: src/server/services/ai.service.ts DayActivitySchema / DayPlanSchema / ItineraryPlanSchema

const DayActivitySchema = z.object({
  title: z.string().min(1, "Activity title must not be empty"),
  description: z.string().min(1, "Activity description must not be empty"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM format"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "endTime must be HH:MM format"),
  estimatedCost: z
    .number()
    .min(0, "estimatedCost must be non-negative"),
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
  dayNumber: z.number().int().min(1),
  date: z.string().min(1, "date must not be empty"),
  theme: z.string().min(1, "theme must not be empty"),
  activities: z.array(DayActivitySchema).min(1, "Each day needs at least one activity"),
});

const ItineraryPlanSchema = z.object({
  destination: z.string().min(1),
  totalDays: z.number().int().min(1).max(30),
  estimatedBudgetUsed: z.number().min(0),
  currency: z.string().min(1),
  days: z.array(DayPlanSchema).min(1).max(30),
  tips: z.array(z.string()).min(1),
});

// ─── Guide Schemas ──────────────────────────────────────────────────────────────
// Mirrors: src/types/ai.types.ts GuideSectionKey / GuideSectionData / DestinationGuideContent

const GUIDE_SECTION_KEYS = [
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
] as const;

const GuideSectionType = z.enum(["stat", "content"]);

const GuideSectionDataSchema = z.object({
  title: z.string().min(1),
  value: z.string().min(1),
  tips: z.array(z.string()),
  type: GuideSectionType,
  details: z.string().optional(),
});

/**
 * The guide is a Record<GuideSectionKey, GuideSectionData>.
 * All 10 keys must be present.
 */
const DestinationGuideContentSchema = z.object(
  Object.fromEntries(
    GUIDE_SECTION_KEYS.map((key) => [key, GuideSectionDataSchema])
  ) as Record<(typeof GUIDE_SECTION_KEYS)[number], typeof GuideSectionDataSchema>
);

// ─── Checklist Schemas ──────────────────────────────────────────────────────────

const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  category: z.string().min(1),
  priority: z.enum(["essential", "recommended", "optional"]),
  checked: z.boolean().default(false),
});

const ChecklistResultSchema = z.object({
  items: z.array(ChecklistItemSchema).min(1).max(50),
  summary: z.string().optional(),
});

// ─── Schema Registry ────────────────────────────────────────────────────────────

type SchemaType = "itinerary" | "guide" | "checklist";

const SCHEMAS: Record<SchemaType, z.ZodType> = {
  itinerary: ItineraryPlanSchema,
  guide: DestinationGuideContentSchema,
  checklist: ChecklistResultSchema,
};

/** Approximate number of top-level + nested fields per schema (for scoring) */
const APPROXIMATE_FIELD_COUNT: Record<SchemaType, number> = {
  itinerary: 25,
  guide: 50, // 10 sections x 5 fields
  checklist: 15,
};

// ─── Grader ─────────────────────────────────────────────────────────────────────

/**
 * Validates an AI output against the specified schema type.
 *
 * Scoring logic:
 * - Perfect parse = 1.0
 * - Partial failures = 1 - (issueCount / approximateFieldCount), floored at 0
 * - Pass/fail determined by comparing score against passThreshold
 *
 * @param output - Raw parsed JSON from the AI response
 * @param schemaType - Which schema to validate against
 * @param passThreshold - Minimum score to pass (default 0.8)
 */
export function gradeSchemaValidation(
  output: unknown,
  schemaType: SchemaType,
  passThreshold = 0.8
): GraderResult {
  const schema = SCHEMAS[schemaType];
  if (!schema) {
    return {
      pass: false,
      score: 0,
      errors: [`Unknown schema type: ${schemaType}`],
      details: { schemaType },
    };
  }

  const result = schema.safeParse(output);

  if (result.success) {
    const data = result.data as Record<string, unknown>;
    return {
      pass: true,
      score: 1.0,
      errors: [],
      details: {
        schemaType,
        fieldsValidated: countFields(data),
      },
    };
  }

  const errors = result.error.issues.map(
    (issue) => `[${issue.code}] ${issue.path.join(".")}: ${issue.message}`
  );

  const fieldEstimate = APPROXIMATE_FIELD_COUNT[schemaType];
  const score = Math.max(0, 1 - errors.length / fieldEstimate);

  return {
    pass: score >= passThreshold,
    score: parseFloat(score.toFixed(3)),
    errors,
    details: {
      schemaType,
      issueCount: errors.length,
      approximateFieldCount: fieldEstimate,
    },
  };
}

// ─── Semantic Validators ────────────────────────────────────────────────────────

/**
 * Checks itinerary-specific semantic rules beyond schema validation:
 * - Day numbers are sequential
 * - Activity time ranges don't overlap within a day
 * - Total days matches the days array length
 */
export function gradeItinerarySemantic(output: unknown): GraderResult {
  const schemaResult = gradeSchemaValidation(output, "itinerary");
  if (!schemaResult.pass) return schemaResult;

  const itinerary = output as z.infer<typeof ItineraryPlanSchema>;
  const errors: string[] = [];

  // Day numbers must be sequential starting from 1
  const dayNumbers = itinerary.days.map((d) => d.dayNumber);
  const expected = Array.from({ length: itinerary.days.length }, (_, i) => i + 1);
  if (JSON.stringify(dayNumbers) !== JSON.stringify(expected)) {
    errors.push(
      `Day numbers are not sequential: got [${dayNumbers.join(", ")}], expected [${expected.join(", ")}]`
    );
  }

  // totalDays must match days array length
  if (itinerary.totalDays !== itinerary.days.length) {
    errors.push(
      `totalDays (${itinerary.totalDays}) does not match days array length (${itinerary.days.length})`
    );
  }

  // Check for time ordering within each day
  for (const day of itinerary.days) {
    for (let i = 1; i < day.activities.length; i++) {
      const prev = day.activities[i - 1];
      const curr = day.activities[i];
      if (prev.endTime > curr.startTime) {
        errors.push(
          `Day ${day.dayNumber}: activity "${curr.title}" (${curr.startTime}) starts before previous ends (${prev.endTime})`
        );
      }
    }
  }

  const score = errors.length === 0 ? 1.0 : Math.max(0, 1 - errors.length * 0.2);

  return {
    pass: errors.length === 0,
    score: parseFloat(score.toFixed(3)),
    errors,
    details: {
      schemaType: "itinerary",
      semanticChecks: ["sequential_days", "totalDays_match", "time_ordering"],
      failedChecks: errors.length,
    },
  };
}

/**
 * Checks guide-specific semantic rules:
 * - All 10 section keys are present
 * - "stat" sections have short values (< 50 chars)
 * - "content" sections have longer values (> 50 chars)
 */
export function gradeGuideSemantic(output: unknown): GraderResult {
  const schemaResult = gradeSchemaValidation(output, "guide");
  if (!schemaResult.pass) return schemaResult;

  const guide = output as Record<string, z.infer<typeof GuideSectionDataSchema>>;
  const errors: string[] = [];

  const STAT_VALUE_MAX_LENGTH = 50;
  const CONTENT_VALUE_MIN_LENGTH = 50;

  for (const key of GUIDE_SECTION_KEYS) {
    const section = guide[key];
    if (!section) {
      errors.push(`Missing required section: ${key}`);
      continue;
    }

    if (section.type === "stat" && section.value.length > STAT_VALUE_MAX_LENGTH) {
      errors.push(
        `Section "${key}" is type "stat" but value is ${section.value.length} chars (expected <= ${STAT_VALUE_MAX_LENGTH})`
      );
    }

    if (section.type === "content" && section.value.length < CONTENT_VALUE_MIN_LENGTH) {
      errors.push(
        `Section "${key}" is type "content" but value is only ${section.value.length} chars (expected >= ${CONTENT_VALUE_MIN_LENGTH})`
      );
    }
  }

  const score = errors.length === 0 ? 1.0 : Math.max(0, 1 - errors.length * 0.1);

  return {
    pass: errors.length === 0,
    score: parseFloat(score.toFixed(3)),
    errors,
    details: {
      schemaType: "guide",
      semanticChecks: ["all_keys_present", "stat_value_length", "content_value_length"],
      failedChecks: errors.length,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Recursively count fields in an object for reporting */
function countFields(obj: unknown, depth = 0): number {
  const MAX_DEPTH = 5;
  if (depth > MAX_DEPTH || obj === null || typeof obj !== "object") return 0;

  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countFields(item, depth + 1), 0);
  }

  return Object.keys(obj).reduce(
    (sum, key) => sum + 1 + countFields((obj as Record<string, unknown>)[key], depth + 1),
    0
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────────

export {
  ItineraryPlanSchema,
  DayPlanSchema,
  DayActivitySchema,
  DestinationGuideContentSchema,
  GuideSectionDataSchema,
  ChecklistResultSchema,
  ChecklistItemSchema,
  GUIDE_SECTION_KEYS,
};

export type { GraderResult, SchemaType };
