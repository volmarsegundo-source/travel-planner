import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { AppError } from "@/lib/errors";
import { ExpeditionSummaryService } from "./expedition-summary.service";
import type {
  ExpeditionSummaryPhase1,
  ExpeditionSummaryPhase2,
  ExpeditionSummaryPhase4,
} from "./expedition-summary.service";
import type { DestinationGuideContent, GuideSectionKey } from "@/types/ai.types";

// ─── Report-Specific Types ───────────────────────────────────────────────────

export interface ChecklistItemDetail {
  itemKey: string;
  required: boolean;
  completed: boolean;
  pointsValue: number;
}

export interface GuideSection {
  key: string;
  title: string;
  icon: string;
  content: string;
}

export interface ItineraryDayDetail {
  dayNumber: number;
  date: string | null;
  notes: string | null;
  activities: Array<{
    title: string;
    startTime: string | null;
    endTime: string | null;
    notes: string | null;
    orderIndex: number;
  }>;
}

export interface ReportPhase3 {
  items: ChecklistItemDetail[];
  completedCount: number;
  totalCount: number;
}

export interface ReportPhase5 {
  generatedAt: string;
  destination: string;
  locale: string;
  sections: GuideSection[];
}

export interface ReportPhase6 {
  days: ItineraryDayDetail[];
  totalActivities: number;
}

// ─── Full Report DTO ─────────────────────────────────────────────────────────

export interface TripReportDTO {
  tripId: string;
  tripTitle: string;
  generatedAt: string;

  phase1: ExpeditionSummaryPhase1 | null;
  phase2: ExpeditionSummaryPhase2 | null;
  phase3: ReportPhase3 | null;
  phase4: ExpeditionSummaryPhase4 | null;
  phase5: ReportPhase5 | null;
  phase6: ReportPhase6 | null;
}

export interface ReportAvailability {
  available: boolean;
  missingPhases: number[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ReportGenerationService {
  /**
   * Check whether a report can be generated for this trip.
   * Requires phases 3 (checklist generated), 5 (guide generated),
   * and 6 (itinerary created) to have content.
   *
   * BOLA: verifies trip belongs to user.
   */
  static async isReportAvailable(
    tripId: string,
    userId: string
  ): Promise<ReportAvailability> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!trip) {
      throw new AppError("FORBIDDEN", "errors.tripNotFound", 403);
    }

    const [checklistCount, guide, itineraryCount] = await Promise.all([
      db.phaseChecklistItem.count({ where: { tripId, phaseNumber: 3 } }),
      db.destinationGuide.findUnique({
        where: { tripId },
        select: { id: true },
      }),
      db.itineraryDay.count({ where: { tripId } }),
    ]);

    const missingPhases: number[] = [];
    if (checklistCount === 0) missingPhases.push(3);
    if (!guide) missingPhases.push(5);
    if (itineraryCount === 0) missingPhases.push(6);

    return {
      available: missingPhases.length === 0,
      missingPhases,
    };
  }

  /**
   * Generate a full trip report.
   * Composes ExpeditionSummaryService base data with enrichment queries.
   *
   * BOLA: inherited from ExpeditionSummaryService + own queries.
   *
   * @throws AppError if trip not found (BOLA) or report not available.
   */
  static async generateTripReport(
    tripId: string,
    userId: string
  ): Promise<TripReportDTO> {
    // Check availability first
    const availability = await this.isReportAvailable(tripId, userId);
    if (!availability.available) {
      throw new AppError(
        "VALIDATION",
        "errors.reportNotAvailable",
        422
      );
    }

    // Get base summary (BOLA checked inside)
    const summary = await ExpeditionSummaryService.getExpeditionSummary(
      tripId,
      userId
    );

    // Get trip title
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { title: true },
    });

    // Enrichment queries (parallel)
    const [checklistItems, guide, itineraryDays] = await Promise.all([
      db.phaseChecklistItem.findMany({
        where: { tripId, phaseNumber: 3 },
        orderBy: { itemKey: "asc" },
        select: {
          itemKey: true,
          required: true,
          completed: true,
          pointsValue: true,
        },
      }),
      db.destinationGuide.findUnique({
        where: { tripId },
        select: {
          content: true,
          generatedAt: true,
          destination: true,
          locale: true,
        },
      }),
      db.itineraryDay.findMany({
        where: { tripId },
        orderBy: { dayNumber: "asc" },
        select: {
          dayNumber: true,
          date: true,
          notes: true,
          activities: {
            orderBy: { orderIndex: "asc" },
            select: {
              title: true,
              startTime: true,
              endTime: true,
              notes: true,
              orderIndex: true,
            },
          },
        },
      }),
    ]);

    // Build enriched phase 3
    const phase3: ReportPhase3 | null =
      checklistItems.length > 0
        ? {
            items: checklistItems.map((item) => ({
              itemKey: item.itemKey,
              required: item.required,
              completed: item.completed,
              pointsValue: item.pointsValue,
            })),
            completedCount: checklistItems.filter((i) => i.completed).length,
            totalCount: checklistItems.length,
          }
        : null;

    // Build enriched phase 5
    let phase5: ReportPhase5 | null = null;
    if (guide) {
      const content = guide.content as unknown as DestinationGuideContent;
      const sections: GuideSection[] = [];

      const sectionKeys: GuideSectionKey[] = [
        "timezone",
        "currency",
        "language",
        "safety",
        "transport_overview",
        "cultural_tips",
        "health",
        "electricity",
        "connectivity",
        "local_customs",
      ];

      for (const key of sectionKeys) {
        const section = content[key];
        if (section) {
          sections.push({
            key,
            title: section.title,
            icon: section.icon,
            content: section.summary ?? "",
          });
        }
      }

      phase5 = {
        generatedAt: guide.generatedAt.toISOString().split("T")[0]!,
        destination: guide.destination,
        locale: guide.locale,
        sections,
      };
    }

    // Build enriched phase 6
    const phase6: ReportPhase6 | null =
      itineraryDays.length > 0
        ? {
            days: itineraryDays.map((day) => ({
              dayNumber: day.dayNumber,
              date: day.date ? day.date.toISOString().split("T")[0]! : null,
              notes: day.notes,
              activities: day.activities.map((a) => ({
                title: a.title,
                startTime: a.startTime,
                endTime: a.endTime,
                notes: a.notes,
                orderIndex: a.orderIndex,
              })),
            })),
            totalActivities: itineraryDays.reduce(
              (sum, day) => sum + day.activities.length,
              0
            ),
          }
        : null;

    logger.info("trip.report.generated", {
      userId: hashUserId(userId),
      tripId,
    });

    return {
      tripId,
      tripTitle: trip?.title ?? "",
      generatedAt: new Date().toISOString(),
      phase1: summary.phase1,
      phase2: summary.phase2,
      phase3,
      phase4: summary.phase4,
      phase5,
      phase6,
    };
  }
}
