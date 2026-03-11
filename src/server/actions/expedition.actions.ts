"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { AppError, UnauthorizedError } from "@/lib/errors";
import { ExpeditionService } from "@/server/services/expedition.service";
import { ProfileService } from "@/server/services/profile.service";
import { PhaseEngine } from "@/lib/engines/phase-engine";
import { ChecklistEngine } from "@/lib/engines/checklist-engine";
import { db } from "@/server/db";
import { Phase1Schema, Phase2Schema } from "@/lib/validations/expedition.schema";
import type { Phase1Input, Phase2Input } from "@/lib/validations/expedition.schema";
import type { ActionResult } from "@/types/trip.types";
import type { PhaseCompletionResult } from "@/types/gamification.types";
import type { DestinationGuideContent, GuideSectionKey } from "@/types/ai.types";
import { PointsEngine } from "@/lib/engines/points-engine";
import { AiService } from "@/server/services/ai.service";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import { hashUserId } from "@/lib/hash";
import { sanitizeForPrompt } from "@/lib/prompts/injection-guard";
import { maskPII } from "@/lib/prompts/pii-masker";

// ─── Ownership helper ────────────────────────────────────────────────────────

/** Verify that the trip belongs to the user. Returns null if not found or not owned. */
async function assertTripOwnership(tripId: string, userId: string) {
  return db.trip.findFirst({
    where: { id: tripId, userId, deletedAt: null },
    select: { id: true },
  });
}

// ─── createExpeditionAction ──────────────────────────────────────────────────

export async function createExpeditionAction(
  data: Phase1Input
): Promise<ActionResult<{ tripId: string; phaseResult: PhaseCompletionResult }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = Phase1Schema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  try {
    const result = await ExpeditionService.createExpedition(
      session.user.id,
      parsed.data
    );

    // Save profile fields if provided
    if (parsed.data.profileFields) {
      try {
        await ProfileService.saveAndAwardProfileFields(
          session.user.id,
          parsed.data.profileFields as Record<string, string | undefined>
        );
        await ProfileService.recalculateCompletionScore(session.user.id);
      } catch (profileError) {
        // Profile save failure should not block expedition creation
        logger.error("expedition.profileFields.error", profileError, {
          userId: hashUserId(session.user.id),
        });
      }
    }

    // Save name to User model if provided in profile fields
    if (parsed.data.profileFields?.name) {
      try {
        await db.user.update({
          where: { id: session.user.id },
          data: { name: parsed.data.profileFields.name },
        });
      } catch (nameError) {
        logger.error("expedition.name.error", nameError, {
          userId: hashUserId(session.user.id),
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/trips");
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.createExpedition.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase2Action ────────────────────────────────────────────────────

export async function completePhase2Action(
  tripId: string,
  data: Phase2Input
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = Phase2Schema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  try {
    const result = await ExpeditionService.completePhase2(
      tripId,
      session.user.id,
      parsed.data
    );

    // Persist preference fields to UserProfile (like Phase 1 does for profile fields)
    const profileFields: Record<string, string | undefined> = {};
    if (parsed.data.dietaryRestrictions) {
      profileFields.dietaryRestrictions = parsed.data.dietaryRestrictions;
    }
    if (parsed.data.accessibility) {
      profileFields.accessibility = parsed.data.accessibility;
    }
    if (Object.keys(profileFields).length > 0) {
      try {
        await ProfileService.saveAndAwardProfileFields(
          session.user.id,
          profileFields
        );
        await ProfileService.recalculateCompletionScore(session.user.id);
      } catch (profileError) {
        logger.error("expedition.phase2.profileFields.error", profileError, {
          userId: hashUserId(session.user.id),
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase2.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── togglePhase3ItemAction ──────────────────────────────────────────────────

export async function togglePhase3ItemAction(
  tripId: string,
  itemKey: string
): Promise<ActionResult<{ completed: boolean; pointsAwarded: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const result = await ChecklistEngine.toggleItem(
      tripId,
      session.user.id,
      3,
      itemKey
    );
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.togglePhase3Item.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
      itemKey,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase3Action ───────────────────────────────────────────────────

export async function completePhase3Action(
  tripId: string
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const result = await PhaseEngine.completePhase(tripId, session.user.id, 3);
    revalidatePath("/dashboard");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase3.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase4Action ───────────────────────────────────────────────────

export async function completePhase4Action(
  tripId: string,
  data: { needsCarRental: boolean; cnhResolved: boolean }
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // BOLA: verify trip belongs to user
    const ownedTrip = await assertTripOwnership(tripId, session.user.id);
    if (!ownedTrip) {
      return { success: false, error: "errors.tripNotFound" };
    }

    // Mass assignment safe: explicit fields only
    const needsCarRental = Boolean(data.needsCarRental);
    const cnhResolved = Boolean(data.cnhResolved);

    // Save metadata on the phase BEFORE completing (prerequisite validation reads it)
    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
    });
    if (phase) {
      await db.expeditionPhase.update({
        where: { id: phase.id },
        data: {
          metadata: {
            needsCarRental,
            cnhResolved,
          },
        },
      });
    }

    const result = await PhaseEngine.completePhase(tripId, session.user.id, 4);
    revalidatePath("/dashboard");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase4.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase5Action ───────────────────────────────────────────────────

export async function completePhase5Action(
  tripId: string
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const result = await PhaseEngine.completePhase(tripId, session.user.id, 5);
    revalidatePath("/dashboard");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase5.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── generateDestinationGuideAction ─────────────────────────────────────────

const MAX_GUIDE_GENERATIONS = 3;

export async function generateDestinationGuideAction(
  tripId: string,
  locale: string
): Promise<ActionResult<{ content: DestinationGuideContent; generationCount: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
      select: { id: true, destination: true },
    });

    if (!trip) {
      return { success: false, error: "errors.notFound" };
    }

    // Sanitize destination: injection guard + PII masking
    let sanitizedDestination: string;
    try {
      const sanitized = sanitizeForPrompt(trip.destination, "destination", 200);
      const { masked } = maskPII(sanitized, "destination");
      sanitizedDestination = masked;
    } catch (error) {
      if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
        return { success: false, error: "errors.invalidInput" };
      }
      throw error;
    }

    // Check generation count
    const existing = await db.destinationGuide.findUnique({
      where: { tripId },
    });

    if (existing && existing.generationCount >= MAX_GUIDE_GENERATIONS) {
      return { success: false, error: "errors.guideGenerationLimit" };
    }

    // Generate guide via AI
    const content = await AiService.generateDestinationGuide({
      userId: session.user.id,
      destination: sanitizedDestination,
      language: locale.startsWith("pt") ? "pt-BR" : "en",
    });

    // All sections are auto-viewed on generation
    const allSections: GuideSectionKey[] = [
      "timezone", "currency", "language", "electricity", "connectivity", "cultural_tips",
      "safety", "health", "transport_overview", "local_customs",
    ];

    // Upsert guide with all sections marked as viewed
    const guide = await db.destinationGuide.upsert({
      where: { tripId },
      create: {
        tripId,
        content: JSON.parse(JSON.stringify(content)),
        destination: trip.destination,
        locale,
        generationCount: 1,
        viewedSections: allSections,
      },
      update: {
        content: JSON.parse(JSON.stringify(content)),
        locale,
        generationCount: (existing?.generationCount ?? 0) + 1,
        viewedSections: allSections,
        generatedAt: new Date(),
      },
    });

    // Award points on first generation: 30 (guide) + 30 (6 sections × 5)
    if (!existing) {
      await PointsEngine.earnPoints(
        session.user.id,
        30,
        "phase_connectivity",
        "Generated destination guide for phase 5",
        tripId
      );
      // Auto-award section viewing points (5 per section × 6 sections = 30)
      for (const section of allSections) {
        await PointsEngine.earnPoints(
          session.user.id,
          5,
          "phase_connectivity",
          `Auto-viewed guide section: ${section}`,
          tripId
        );
      }
    }

    revalidatePath(`/expedition/${tripId}`);
    return {
      success: true,
      data: {
        content,
        generationCount: guide.generationCount,
      },
    };
  } catch (error) {
    logger.error("expedition.generateGuide.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getDestinationGuideAction ──────────────────────────────────────────────

export async function getDestinationGuideAction(
  tripId: string
): Promise<ActionResult<{
  content: DestinationGuideContent;
  generationCount: number;
  viewedSections: string[];
} | null>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!trip) {
      return { success: false, error: "errors.notFound" };
    }

    const guide = await db.destinationGuide.findUnique({
      where: { tripId },
    });

    if (!guide) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        content: guide.content as unknown as DestinationGuideContent,
        generationCount: guide.generationCount,
        viewedSections: (guide.viewedSections as string[]) ?? [],
      },
    };
  } catch (error) {
    logger.error("expedition.getGuide.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── viewGuideSectionAction ─────────────────────────────────────────────────

const GUIDE_SECTION_KEYS: GuideSectionKey[] = [
  "timezone", "currency", "language", "electricity", "connectivity", "cultural_tips",
  "safety", "health", "transport_overview", "local_customs",
];

export async function viewGuideSectionAction(
  tripId: string,
  sectionKey: string
): Promise<ActionResult<{ pointsAwarded: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  if (!GUIDE_SECTION_KEYS.includes(sectionKey as GuideSectionKey)) {
    return { success: false, error: "errors.invalidSection" };
  }

  // BOLA: verify trip belongs to user
  const ownedTrip = await assertTripOwnership(tripId, session.user.id);
  if (!ownedTrip) {
    return { success: false, error: "errors.tripNotFound" };
  }

  try {
    const guide = await db.destinationGuide.findUnique({
      where: { tripId },
    });

    if (!guide) {
      return { success: false, error: "errors.notFound" };
    }

    const viewed = (guide.viewedSections as string[]) ?? [];
    if (viewed.includes(sectionKey)) {
      return { success: true, data: { pointsAwarded: 0 } };
    }

    // Mark section as viewed and award 5 points
    await db.destinationGuide.update({
      where: { tripId },
      data: { viewedSections: [...viewed, sectionKey] },
    });

    await PointsEngine.earnPoints(
      session.user.id,
      5,
      "phase_connectivity",
      `Viewed guide section: ${sectionKey}`,
      tripId
    );

    return { success: true, data: { pointsAwarded: 5 } };
  } catch (error) {
    logger.error("expedition.viewGuideSection.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── advanceFromPhaseAction ─────────────────────────────────────────────────

export async function advanceFromPhaseAction(
  tripId: string,
  phaseNumber: number,
  metadata?: { needsCarRental?: boolean; cnhResolved?: boolean }
): Promise<
  ActionResult<{
    nextPhase: number;
    completed: boolean;
    phaseResult?: PhaseCompletionResult;
  }>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // BOLA: verify trip belongs to user
    const ownedTrip = await assertTripOwnership(tripId, session.user.id);
    if (!ownedTrip) {
      return { success: false, error: "errors.tripNotFound" };
    }

    // Mass assignment safe: explicit fields only for phase 4 metadata
    if (phaseNumber === 4 && metadata) {
      const phase = await db.expeditionPhase.findUnique({
        where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
      });
      if (phase) {
        await db.expeditionPhase.update({
          where: { id: phase.id },
          data: {
            metadata: {
              needsCarRental: Boolean(metadata.needsCarRental ?? false),
              cnhResolved: Boolean(metadata.cnhResolved ?? false),
            },
          },
        });
      }
    }

    // Check if prerequisites are met
    let prerequisitesMet = false;

    if (phaseNumber === 3) {
      const requiredIncomplete = await db.phaseChecklistItem.count({
        where: { tripId, phaseNumber: 3, required: true, completed: false },
      });
      prerequisitesMet = requiredIncomplete === 0;
    } else if (phaseNumber === 4) {
      const phase = await db.expeditionPhase.findUnique({
        where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
      });
      const phaseMeta = phase?.metadata as Record<string, unknown> | null;
      if (phaseMeta?.needsCarRental === true) {
        // CNH is required for any trip with car rental
        prerequisitesMet = phaseMeta?.cnhResolved === true;
      } else {
        // No car rental needed
        prerequisitesMet = phaseMeta?.needsCarRental === false;
      }
    }

    if (prerequisitesMet) {
      // Full completion: awards points, badge, rank
      const phaseResult = await PhaseEngine.completePhase(
        tripId,
        session.user.id,
        phaseNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
      );
      revalidatePath("/dashboard");
      revalidatePath(`/expedition/${tripId}`);
      return {
        success: true,
        data: {
          nextPhase: phaseResult.nextPhaseUnlocked ?? phaseNumber,
          completed: true,
          phaseResult,
        },
      };
    } else {
      // Non-blocking advance: skip without points
      const result = await PhaseEngine.advanceFromPhase(
        tripId,
        session.user.id,
        phaseNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
      );
      revalidatePath("/dashboard");
      revalidatePath(`/expedition/${tripId}`);
      return {
        success: true,
        data: {
          nextPhase: result.nextPhase,
          completed: false,
        },
      };
    }
  } catch (error) {
    logger.error("expedition.advanceFromPhase.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
      phaseNumber,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getExpeditionPhasesAction ───────────────────────────────────────────────

export async function getExpeditionPhasesAction(
  tripId: string
): Promise<ActionResult<Awaited<ReturnType<typeof PhaseEngine.getPhases>>>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const phases = await PhaseEngine.getPhases(tripId, session.user.id);
    return { success: true, data: phases };
  } catch (error) {
    logger.error("expedition.getPhases.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
