import "server-only";
import { db } from "@/server/db";
import { ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import type { DestinationGuideContent } from "@/types/ai.types";

// ─── ItineraryPlanService ────────────────────────────────────────────────────

export class ItineraryPlanService {
  /**
   * Returns the ItineraryPlan for a trip, creating one if it doesn't exist.
   * BOLA guard: verifies trip belongs to user.
   */
  static async getOrCreateItineraryPlan(
    tripId: string,
    userId: string,
    locale: string
  ) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!trip) {
      throw new ForbiddenError();
    }

    const existing = await db.itineraryPlan.findUnique({
      where: { tripId },
    });

    if (existing) return existing;

    const created = await db.itineraryPlan.create({
      data: {
        tripId,
        locale,
        generationCount: 0,
      },
    });

    logger.info("itineraryPlan.created", { tripId, userIdHash: hashUserId(userId) });
    return created;
  }

  /**
   * Increments the generation count and sets generatedAt timestamp.
   */
  static async recordGeneration(tripId: string) {
    return db.itineraryPlan.update({
      where: { tripId },
      data: {
        generationCount: { increment: 1 },
        generatedAt: new Date(),
      },
    });
  }

  /**
   * Fetches expedition context from Phase 2 metadata and Phase 5 guide.
   * Returns only available data — all fields are optional.
   */
  static async getExpeditionContext(tripId: string, userId: string) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: {
        tripType: true,
        destination: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!trip) return null;

    // Phase 2 metadata (travelerType, accommodationStyle, travelPace, budget)
    const phase2 = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 2 } },
      select: { metadata: true, status: true },
    });

    const phase2Meta =
      phase2?.status === "completed"
        ? (phase2.metadata as Record<string, unknown> | null)
        : null;

    // Phase 5 destination guide
    const guide = await db.destinationGuide.findUnique({
      where: { tripId },
      select: { content: true },
    });

    const guideContent = guide?.content as unknown as DestinationGuideContent | null;

    // Build context summary from guide sections (supports both 6-section and 10-section formats)
    let guideContext: string | undefined;
    if (guideContent) {
      const parts: string[] = [];
      if (guideContent.timezone?.summary) {
        parts.push(`Timezone: ${guideContent.timezone.summary}`);
      }
      if (guideContent.currency?.summary) {
        parts.push(`Currency: ${guideContent.currency.summary}`);
      }
      if (guideContent.cultural_tips?.summary) {
        parts.push(`Culture: ${guideContent.cultural_tips.summary}`);
      }
      if (guideContent.language?.summary) {
        parts.push(`Language: ${guideContent.language.summary}`);
      }
      // New sections from 10-section format (T-S19-008)
      if (guideContent.safety?.summary) {
        parts.push(`Safety: ${guideContent.safety.summary}`);
      }
      if (guideContent.transport_overview?.summary) {
        parts.push(`Transport: ${guideContent.transport_overview.summary}`);
      }
      if (parts.length > 0) {
        guideContext = parts.join(". ");
      }
    }

    return {
      tripType: trip.tripType,
      travelerType: phase2Meta?.travelerType as string | undefined,
      accommodationStyle: phase2Meta?.accommodationStyle as string | undefined,
      travelPace: phase2Meta?.travelPace as number | undefined,
      budget: phase2Meta?.budget as number | undefined,
      currency: phase2Meta?.currency as string | undefined,
      destinationGuideContext: guideContext,
    };
  }
}
