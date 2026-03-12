import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ExpeditionSummaryService } from "@/server/services/expedition-summary.service";
import { TripReadinessService } from "@/server/services/trip-readiness.service";
import { getNextStepsSuggestions } from "@/lib/engines/next-steps-engine";
import { ExpeditionSummary } from "@/components/features/expedition/ExpeditionSummary";

interface SummaryPageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function SummaryPage({ params }: SummaryPageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  let summary;
  let readiness;
  try {
    [summary, readiness] = await Promise.all([
      ExpeditionSummaryService.getExpeditionSummary(tripId, session.user.id),
      TripReadinessService.calculateTripReadiness(tripId, session.user.id),
    ]);
  } catch {
    redirect({ href: "/expeditions", locale });
    return null;
  }

  const nextSteps = getNextStepsSuggestions(
    tripId,
    readiness.phases,
    readiness.readinessPercent
  );

  // Extract trip dates for countdown
  const startDate = summary.phase1?.startDate ?? null;
  const endDate = summary.phase1?.endDate ?? null;

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/expeditions" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <ExpeditionSummary
        tripId={tripId}
        summary={summary}
        readiness={readiness}
        nextSteps={nextSteps}
        startDate={startDate}
        endDate={endDate}
      />
    </>
  );
}
