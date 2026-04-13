// Vercel Hobby hard limit: serverless functions cap at 60s.
// See: docs/architecture.md ADR-028.
export const maxDuration = 60;

import { db } from "@/server/db";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { PointsEngine } from "@/lib/engines/points-engine";
import { DestinationGuideV2 } from "@/components/features/expedition/DestinationGuideV2";
import type { DestinationGuideContent } from "@/types/ai.types";

interface Phase5PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase5Page({ params }: Phase5PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard (replaces inline currentPhase < 5 check)
  const { trip, userId, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 5, locale,
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

  // Sprint 43 QA UX — same as Phase 6: suppress the revisit banner on the
  // post-generation remount. completePhase5 flips phase 5 to "completed",
  // making accessMode "revisit" seconds after the user's first successful
  // generation. If the guide was generated within the last 90s we treat it
  // as "just generated" and keep the banner hidden.
  const JUST_GENERATED_WINDOW_MS = 90_000;
  const isJustGenerated =
    !!guide?.generatedAt &&
    Date.now() - guide.generatedAt.getTime() < JUST_GENERATED_WINDOW_MS;

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
    />
  );
}
