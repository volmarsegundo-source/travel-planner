// Allow AI generation requests up to 120s (Anthropic SDK timeout is 90s)
export const maxDuration = 120;

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { PointsEngine } from "@/lib/engines/points-engine";
import { DestinationGuideWizard } from "@/components/features/expedition/DestinationGuideWizard";
import { DestinationGuideV2 } from "@/components/features/expedition/DestinationGuideV2";
import { DesignBranch } from "@/components/ui/DesignBranch";
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

  // Fetch PA balance for cost gate
  const session = await auth();
  let availablePoints = 0;
  try {
    if (session?.user?.id) {
      const balance = await PointsEngine.getBalance(session.user.id);
      availablePoints = balance.availablePoints;
    }
  } catch {
    // Non-critical — defaults to 0
  }

  const sharedProps = {
    tripId,
    destination: trip.destination as string,
    locale,
    initialGuide,
    accessMode,
    tripCurrentPhase: trip.currentPhase,
    completedPhases,
    availablePoints,
  };

  return (
    <DesignBranch
      v1={<DestinationGuideWizard {...sharedProps} />}
      v2={<DestinationGuideV2 {...sharedProps} />}
    />
  );
}
