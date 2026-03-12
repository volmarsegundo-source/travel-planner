/**
 * LLM-as-Judge Grader
 *
 * Uses an LLM as an evaluator to assess itinerary quality across six
 * dimensions. The judge function is injected, allowing testing without
 * real API calls.
 *
 * Cost estimate per eval run:
 *   - Input: ~1,800 tokens (system + rubric + itinerary)
 *   - Output: ~350 tokens (JSON scores + rationales)
 *   - Estimated cost: ~$0.008 per eval (Claude 3.5 Haiku pricing)
 *
 * @eval-type llm-judge
 * @metrics structure, relevance, coherence, cultural_sensitivity, budget_awareness, safety
 */

import type { GraderResult } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────────

/** The six quality dimensions assessed by the judge */
export type Dimension =
  | "structure"
  | "relevance"
  | "coherence"
  | "cultural_sensitivity"
  | "budget_awareness"
  | "safety";

export interface DimensionScore {
  dimension: Dimension;
  score: number; // 1-5
  rationale: string;
}

export interface JudgeOutput {
  dimensions: DimensionScore[];
  overall_impression: string;
}

/** Context passed to the judge alongside the itinerary */
export interface EvalContext {
  destination: string;
  tripDays: number;
  travelers: string; // e.g., "2 adults, 1 child (age 8)"
  budget: string; // e.g., "moderate"
  language: "en" | "pt-BR";
  tripType?: string; // e.g., "international", "domestic"
}

/** Injected function that calls the judge model */
export type CallJudgeFn = (
  systemPrompt: string,
  userPrompt: string
) => Promise<string>;

// ─── Constants ──────────────────────────────────────────────────────────────────

const ALL_DIMENSIONS: Dimension[] = [
  "structure",
  "relevance",
  "coherence",
  "cultural_sensitivity",
  "budget_awareness",
  "safety",
];

/** Dimension weights — relevance and safety weighted 1.5x */
const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  structure: 1.0,
  relevance: 1.5,
  coherence: 1.0,
  cultural_sensitivity: 1.0,
  budget_awareness: 1.0,
  safety: 1.5,
};

const MIN_SCORE = 1;
const MAX_SCORE = 5;
const SCORE_RANGE = MAX_SCORE - MIN_SCORE; // 4

/** Estimated tokens for cost calculation */
const ESTIMATED_INPUT_TOKENS = 1800;
const ESTIMATED_OUTPUT_TOKENS = 350;
const HAIKU_INPUT_PER_MILLION = 0.25;
const HAIKU_OUTPUT_PER_MILLION = 1.25;

// ─── Rubric ─────────────────────────────────────────────────────────────────────

const RUBRIC: Record<
  Dimension,
  { description: string; scale: Record<1 | 3 | 5, string> }
> = {
  structure: {
    description:
      "Does the itinerary follow the expected JSON structure? Are all required fields present, " +
      "day numbers sequential, time slots non-overlapping, and activity types valid?",
    scale: {
      1: "Missing required fields, broken structure, or unparseable sections.",
      3: "Structure is mostly correct but has minor issues (e.g., missing optional fields, one malformed time).",
      5: "Perfect structure: all fields present, sequential days, valid enums, no formatting issues.",
    },
  },
  relevance: {
    description:
      "Are the suggested activities, restaurants, and landmarks real and actually located in the " +
      "destination? Does the itinerary match the trip type (family vs. solo vs. adventure)?",
    scale: {
      1: "Activities are generic, fictional, or clearly wrong for the destination.",
      3: "Most activities are real and relevant, but some feel like generic filler.",
      5: "Every activity is a real, well-known or locally recommended option for the destination and trip type.",
    },
  },
  coherence: {
    description:
      "Is the daily schedule logically ordered? Do activities flow geographically (no unnecessary " +
      "back-and-forth)? Are time allocations realistic?",
    scale: {
      1: "Random ordering, impossible time windows, or activities on opposite sides of the city back-to-back.",
      3: "Mostly logical flow with a few awkward transitions or tight time windows.",
      5: "Excellent geographic clustering, realistic transit times, natural morning-to-evening flow.",
    },
  },
  cultural_sensitivity: {
    description:
      "Does the itinerary respect local customs, religious sites, dress codes, and cultural norms? " +
      "Does it avoid stereotypical or tokenizing suggestions?",
    scale: {
      1: "Contains culturally insensitive suggestions, ignores local norms, or relies on stereotypes.",
      3: "Generally respectful but misses some cultural nuances.",
      5: "Demonstrates awareness of local customs, includes appropriate tips, and respects cultural sensitivities.",
    },
  },
  budget_awareness: {
    description:
      "Are cost estimates realistic for the destination? Does the itinerary respect the stated " +
      "budget level? Are there a mix of paid and free activities?",
    scale: {
      1: "Cost estimates are wildly inaccurate or the plan ignores the budget constraint entirely.",
      3: "Costs are roughly in the right range but some estimates are off; budget is loosely respected.",
      5: "Accurate local pricing, clear budget tracking, mix of free/paid activities matching the budget level.",
    },
  },
  safety: {
    description:
      "Does the itinerary avoid known dangerous areas or times? Are there appropriate warnings " +
      "for nighttime activities? Does it consider traveler demographics (children, elderly)?",
    scale: {
      1: "Suggests activities in unsafe areas or times with no warnings; ignores traveler safety.",
      3: "Generally safe suggestions but lacks explicit safety notes where expected.",
      5: "Proactively notes safety considerations, avoids risky areas/times, adapts to traveler demographics.",
    },
  },
};

// ─── Prompt Builders ────────────────────────────────────────────────────────────

function buildJudgeSystemPrompt(): string {
  const rubricText = Object.entries(RUBRIC)
    .map(([dim, r]) => {
      const scaleLines = Object.entries(r.scale)
        .map(([s, desc]) => `    ${s}: ${desc}`)
        .join("\n");
      return `  ${dim}:\n    ${r.description}\n${scaleLines}`;
    })
    .join("\n\n");

  return `You are an expert travel itinerary evaluator. Your job is to assess the quality of
AI-generated travel itineraries using the rubric below.

IMPORTANT RULES:
- Score each dimension independently on a 1-5 scale (integers only).
- Provide a brief rationale (1-2 sentences) for each score.
- Be strict but fair: a score of 3 is acceptable quality, 5 is exceptional.
- Consider the trip context (destination, budget, travelers) when scoring.
- Do NOT let one dimension influence another — evaluate each independently.
- Respond ONLY with the JSON structure specified below. No markdown, no extra text.

SCORING RUBRIC:
${rubricText}

RESPONSE FORMAT (strict JSON):
{
  "dimensions": [
    { "dimension": "<name>", "score": <1-5>, "rationale": "<brief explanation>" }
  ],
  "overall_impression": "<1-2 sentence summary>"
}

You MUST include all six dimensions in your response: structure, relevance, coherence, cultural_sensitivity, budget_awareness, safety.`;
}

function buildJudgeUserPrompt(
  itineraryJson: string,
  context: EvalContext
): string {
  return `Evaluate the following travel itinerary.

TRIP CONTEXT:
- Destination: ${context.destination}
- Duration: ${context.tripDays} days
- Travelers: ${context.travelers}
- Budget level: ${context.budget}
- Language: ${context.language}
${context.tripType ? `- Trip type: ${context.tripType}` : ""}

ITINERARY TO EVALUATE:
${itineraryJson}

Provide your evaluation as JSON following the rubric in your instructions.`;
}

// ─── Judge Output Parser ────────────────────────────────────────────────────────

/**
 * Parses the raw judge response text into structured scores.
 * Handles common edge cases: markdown code fences, extra whitespace.
 */
function parseJudgeOutput(rawText: string): JudgeOutput {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse judge output as JSON: ${cleaned.slice(0, 200)}...`
    );
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.dimensions)) {
    throw new Error("Judge output missing 'dimensions' array");
  }

  const dimensions: DimensionScore[] = [];

  for (const dim of obj.dimensions as Record<string, unknown>[]) {
    const dimension = dim.dimension as Dimension;
    const score = Number(dim.score);
    const rationale = String(dim.rationale ?? "");

    if (!ALL_DIMENSIONS.includes(dimension)) {
      throw new Error(
        `Unknown dimension in judge output: ${String(dimension)}`
      );
    }
    if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
      throw new Error(
        `Invalid score for ${dimension}: ${score} (must be integer ${MIN_SCORE}-${MAX_SCORE})`
      );
    }

    dimensions.push({ dimension, score, rationale });
  }

  // Verify all dimensions are present
  const returnedDims = new Set(dimensions.map((d) => d.dimension));
  const missing = ALL_DIMENSIONS.filter((d) => !returnedDims.has(d));
  if (missing.length > 0) {
    throw new Error(
      `Judge output missing dimensions: ${missing.join(", ")}`
    );
  }

  return {
    dimensions,
    overall_impression: String(obj.overall_impression ?? ""),
  };
}

// ─── Composite Score ────────────────────────────────────────────────────────────

/**
 * Computes a weighted composite score normalized to 0.0 - 1.0.
 * Relevance and safety are weighted 1.5x by default because they
 * have the highest user impact.
 */
function computeCompositeScore(
  dimensions: DimensionScore[],
  weights: Record<Dimension, number> = DEFAULT_WEIGHTS
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const dim of dimensions) {
    const weight = weights[dim.dimension] ?? 1.0;
    // Normalize 1-5 scale to 0-1
    weightedSum += ((dim.score - MIN_SCORE) / SCORE_RANGE) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0
    ? parseFloat((weightedSum / totalWeight).toFixed(3))
    : 0;
}

// ─── Main Grader ────────────────────────────────────────────────────────────────

/** Minimum dimension score before flagging as an error */
const LOW_SCORE_THRESHOLD = 2;

/** Default composite pass threshold (0.6 = average ~4/5 on all dims) */
const DEFAULT_PASS_THRESHOLD = 0.6;

/**
 * Evaluates an itinerary using an LLM judge.
 *
 * Builds the judge prompt, calls the AI provider via the injected
 * callJudge function, parses the structured response, and computes
 * a composite score.
 *
 * @param itineraryJson - The raw JSON string of the generated itinerary
 * @param evalContext - Trip context for the judge to consider
 * @param callJudge - Injected async function that sends prompts to the judge model
 * @param passThreshold - Minimum composite score to pass (default 0.6)
 */
export async function gradeWithLlmJudge(
  itineraryJson: string,
  evalContext: EvalContext,
  callJudge: CallJudgeFn,
  passThreshold = DEFAULT_PASS_THRESHOLD
): Promise<GraderResult> {
  const systemPrompt = buildJudgeSystemPrompt();
  const userPrompt = buildJudgeUserPrompt(itineraryJson, evalContext);

  let rawOutput: string;
  try {
    rawOutput = await callJudge(systemPrompt, userPrompt);
  } catch (err) {
    return {
      pass: false,
      score: 0,
      errors: [
        `Judge call failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
      details: { judgeError: true },
    };
  }

  let judgeOutput: JudgeOutput;
  try {
    judgeOutput = parseJudgeOutput(rawOutput);
  } catch (err) {
    return {
      pass: false,
      score: 0,
      errors: [
        `Judge output parse failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
      details: { parseError: true, rawOutput: rawOutput.slice(0, 500) },
    };
  }

  const compositeScore = computeCompositeScore(judgeOutput.dimensions);

  const dimensionDetails = Object.fromEntries(
    judgeOutput.dimensions.map((d) => [
      d.dimension,
      { score: d.score, rationale: d.rationale },
    ])
  );

  // Flag any dimension scoring below threshold as an explicit error
  const lowScoreErrors = judgeOutput.dimensions
    .filter((d) => d.score < LOW_SCORE_THRESHOLD)
    .map((d) => `${d.dimension} scored ${d.score}/5: ${d.rationale}`);

  return {
    pass: compositeScore >= passThreshold && lowScoreErrors.length === 0,
    score: compositeScore,
    errors: lowScoreErrors,
    details: {
      dimensions: dimensionDetails,
      compositeScore,
      overallImpression: judgeOutput.overall_impression,
      weights: DEFAULT_WEIGHTS,
      passThreshold,
    },
  };
}

// ─── Cost Estimation ────────────────────────────────────────────────────────────

/**
 * Returns the estimated cost of a single judge eval call.
 * Based on Claude 3.5 Haiku pricing.
 */
export function estimateJudgeCost(): {
  inputTokens: number;
  outputTokens: number;
  estimatedUSD: number;
} {
  const inputCost =
    (ESTIMATED_INPUT_TOKENS / 1_000_000) * HAIKU_INPUT_PER_MILLION;
  const outputCost =
    (ESTIMATED_OUTPUT_TOKENS / 1_000_000) * HAIKU_OUTPUT_PER_MILLION;

  return {
    inputTokens: ESTIMATED_INPUT_TOKENS,
    outputTokens: ESTIMATED_OUTPUT_TOKENS,
    estimatedUSD: parseFloat((inputCost + outputCost).toFixed(6)),
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────────

export {
  buildJudgeSystemPrompt,
  buildJudgeUserPrompt,
  parseJudgeOutput,
  computeCompositeScore,
  ALL_DIMENSIONS,
  DEFAULT_WEIGHTS,
  RUBRIC,
};
