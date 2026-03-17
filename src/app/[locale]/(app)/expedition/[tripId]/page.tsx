import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { getPhaseUrl, TOTAL_ACTIVE_PHASES } from "@/lib/engines/phase-navigation.engine";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface ExpeditionHubPageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function ExpeditionHubPage({ params }: ExpeditionHubPageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const t = await getTranslations("expedition.hub");
  const tNav = await getTranslations("navigation");

  // Fetch trip to determine current phase
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: { currentPhase: true },
  });

  if (!trip) {
    redirect({ href: "/expeditions", locale });
    return null;
  }

  // Route to the correct phase wizard using the navigation engine
  if (trip.currentPhase >= 1 && trip.currentPhase <= TOTAL_ACTIVE_PHASES) {
    // Use getPhaseUrl from the engine — single source of truth
    // Phase 1 now correctly routes to /phase-1 (not to phase-2)
    const targetUrl = getPhaseUrl(tripId, trip.currentPhase);
    redirect({ href: targetUrl, locale });
    return null;
  }

  // Phase 7+ — coming soon
  return (
    <>
      <div className="mx-auto max-w-md px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/expeditions" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <span className="text-5xl" aria-hidden="true">&#x1F680;</span>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          {t("comingSoon", { number: trip.currentPhase })}
        </h1>
        <p className="mt-2 max-w-sm text-gray-500">
          {t("comingSoonSubtitle")}
        </p>
      </div>
    </>
  );
}
