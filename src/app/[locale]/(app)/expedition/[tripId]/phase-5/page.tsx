// Allow AI generation requests up to 120s (Anthropic SDK timeout is 90s)
export const maxDuration = 120;

import { db } from "@/server/db";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { DestinationGuideWizard } from "@/components/features/expedition/DestinationGuideWizard";
import type { DestinationGuideContent } from "@/types/ai.types";

interface Phase5PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase5Page({ params }: Phase5PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard (replaces inline currentPhase < 5 check)
  const { trip, accessMode, completedPhases } = await guardPhaseAccess(
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
      }
    : null;

  return (
    <DestinationGuideWizard
      tripId={tripId}
      destination={trip.destination as string}
      locale={locale}
      initialGuide={initialGuide}
      accessMode={accessMode}
      tripCurrentPhase={trip.currentPhase}
      completedPhases={completedPhases}
    />
  );
}
