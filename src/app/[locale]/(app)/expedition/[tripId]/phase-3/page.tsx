import { ChecklistEngine } from "@/lib/engines/checklist-engine";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { Phase3Wizard } from "@/components/features/expedition/Phase3Wizard";
import { DestinationGuideV2 } from "@/components/features/expedition/DestinationGuideV2";
import { PointsEngine } from "@/lib/engines/points-engine";
import { db } from "@/server/db";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";
import { canUseAI } from "@/lib/guards/age-guard";
import type { TripType } from "@/lib/travel/trip-classifier";
import type { DestinationGuideContent } from "@/types/ai.types";

// Vercel Hobby hard limit: serverless functions cap at 60s (needed for guide generation).
export const maxDuration = 60;

interface Phase3PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase3Page({ params }: Phase3PageProps) {
  const { locale, tripId } = await params;
  const reordered = isPhaseReorderEnabled();

  if (reordered) {
    // ── Flag ON: phase-3 = Guia do Destino (DestinationGuideV2) ──────────
    const { trip, userId, accessMode, completedPhases } = await guardPhaseAccess(
      tripId, 3, locale,
      { destination: true }
    );

    // Fetch existing guide if any
    const guide = await db.destinationGuide.findUnique({
      where: { tripId },
    });

    const initialGuide = guide
      ? {
          content: guide.content as unknown as DestinationGuideContent,
          generationCount: guide.generationCount,
          viewedSections: (guide.viewedSections as string[]) ?? [],
          regenCount: guide.regenCount,
          extraCategories: guide.extraCategories,
          personalNotes: guide.personalNotes,
        }
      : null;

    // Fetch PA balance for cost gate
    let availablePoints = 0;
    try {
      const balance = await PointsEngine.getBalance(userId);
      availablePoints = balance.availablePoints;
    } catch {
      // Non-critical — defaults to 0
    }

    const JUST_GENERATED_WINDOW_MS = 90_000;
    const isJustGenerated =
      !!guide?.generatedAt &&
      Date.now() - guide.generatedAt.getTime() < JUST_GENERATED_WINDOW_MS;

    // Age restriction check
    let ageRestricted = false;
    try {
      const profile = await db.userProfile.findUnique({ where: { userId }, select: { birthDate: true } });
      ageRestricted = !canUseAI(profile?.birthDate);
    } catch { /* non-critical */ }

    return (
      <DestinationGuideV2
        tripId={tripId}
        destination={trip.destination as string}
        locale={locale}
        initialGuide={initialGuide}
        accessMode={accessMode}
        tripCurrentPhase={trip.currentPhase}
        completedPhases={completedPhases}
        availablePoints={availablePoints}
        isJustGenerated={isJustGenerated}
        isAgeRestricted={ageRestricted}
      />
    );
  }

  // ── Flag OFF (original): phase-3 = O Preparo (Checklist) ────────────────
  const { trip, userId, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 3, locale,
    { tripType: true, startDate: true, destination: true }
  );

  // Initialize phase 3 checklist (idempotent) — wrapped in try-catch
  // because initializePhase3Checklist can fail on first visit if trip
  // metadata is incomplete (race condition with Phase 2 completion).
  try {
    await ChecklistEngine.initializePhase3Checklist(
      tripId,
      userId,
      trip.tripType as TripType,
      trip.startDate as Date | null
    );
  } catch (error) {
    console.error("[Phase3Page] initializePhase3Checklist failed:", error);
    // Continue — checklist may already exist from a previous visit
  }

  // Fetch checklist items
  const items = await ChecklistEngine.getPhaseChecklist(tripId, 3);

  const serializedItems = items.map((item: (typeof items)[number]) => ({
    id: item.id,
    itemKey: item.itemKey,
    required: item.required,
    completed: item.completed,
    deadline: item.deadline?.toISOString() ?? null,
    pointsValue: item.pointsValue,
  }));

  return (
    <Phase3Wizard
      tripId={tripId}
      items={serializedItems}
      tripType={trip.tripType as string}
      destination={trip.destination as string}
      currentPhase={trip.currentPhase}
      accessMode={accessMode}
      tripCurrentPhase={trip.currentPhase}
      completedPhases={completedPhases}
    />
  );
}
