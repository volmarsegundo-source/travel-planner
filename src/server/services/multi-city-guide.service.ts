import "server-only";
import { AiService } from "./ai.service";
import { logger } from "@/lib/logger";
import type { GuideParams, GuideTravelerContext } from "@/lib/prompts/types";
import type { DestinationGuideContentV2 } from "@/types/ai.types";

// Gemini free tier allows 15 req/min; 4 parallel is well within budget and
// matches the Sprint 43 locked-in max destinations per expedition.
const MAX_PARALLEL_GUIDES = 4;

export interface MultiCityGuideInput {
  userId: string;
  language: "pt-BR" | "en";
  /** Ordered list of destinations. Each entry produces one guide call. */
  destinations: Array<{ city: string; country?: string; order: number }>;
  /** Shared traveler context applied to every guide call */
  travelerContext?: GuideTravelerContext;
  /** Extra categories + notes passed through unchanged */
  extraCategories?: string[];
  personalNotes?: string;
}

export interface MultiCityGuideResult {
  order: number;
  city: string;
  status: "success" | "error";
  content?: DestinationGuideContentV2;
  error?: string;
}

/**
 * Generates one destination guide per city in a multi-city trip.
 *
 * Rationale for the shape:
 *   - Each call runs in parallel (Promise.allSettled) so one failing city
 *     does not fail the whole expedition. The caller decides whether to
 *     surface the failure to the user or retry just the failed cities.
 *   - Concurrency is bounded to MAX_PARALLEL_GUIDES to stay under the Gemini
 *     free-tier rate limit and to give each call its own 50s timeout budget
 *     without queuing.
 *   - Shared `travelerContext`, `extraCategories`, `personalNotes` are copied
 *     into every call so the resulting guides stay coherent (see
 *     SPEC-AI-MULTIDESTINOS coherence rules).
 *   - `tripContext` is injected automatically per call with the correct
 *     order/siblings so the guide prompt can de-duplicate attractions.
 */
export async function generateMultiCityGuides(
  input: MultiCityGuideInput,
): Promise<MultiCityGuideResult[]> {
  if (input.destinations.length === 0) {
    return [];
  }
  if (input.destinations.length > MAX_PARALLEL_GUIDES) {
    throw new Error(
      `Too many destinations for multi-city guide generation: got ${input.destinations.length}, max ${MAX_PARALLEL_GUIDES}`,
    );
  }

  const siblingCities = [...input.destinations]
    .sort((a, b) => a.order - b.order)
    .map((d) => d.city);
  const totalCities = siblingCities.length;

  logger.info("multi-city-guide.batch.start", {
    cityCount: totalCities,
    cities: siblingCities,
  });

  const startedAt = Date.now();

  const calls = input.destinations.map(async (dest): Promise<MultiCityGuideResult> => {
    const params: GuideParams = {
      destination: dest.city,
      language: input.language,
      travelerContext: input.travelerContext,
      extraCategories: input.extraCategories,
      personalNotes: input.personalNotes,
      tripContext: {
        siblingCities,
        order: dest.order,
        totalCities,
      },
    };

    try {
      const content = await AiService.generateDestinationGuide({
        userId: input.userId,
        ...params,
      });
      return { order: dest.order, city: dest.city, status: "success", content };
    } catch (err) {
      logger.warn("multi-city-guide.call.error", {
        order: dest.order,
        city: dest.city,
        error: String(err),
      });
      return {
        order: dest.order,
        city: dest.city,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  const results = await Promise.all(calls);

  logger.info("multi-city-guide.batch.complete", {
    cityCount: totalCities,
    totalMs: Date.now() - startedAt,
    successes: results.filter((r) => r.status === "success").length,
    failures: results.filter((r) => r.status === "error").length,
  });

  // Always return in declared order so the caller can render a deterministic
  // list even if some cities failed.
  return results.sort((a, b) => a.order - b.order);
}
