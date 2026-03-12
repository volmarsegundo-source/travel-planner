import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PhaseEngine } from "@/lib/engines/phase-engine";
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

  let phaseNumber = 1;
  try {
    const currentPhase = await PhaseEngine.getCurrentPhase(tripId, session.user.id);
    if (currentPhase) {
      phaseNumber = currentPhase.phaseNumber;
    } else {
      // No active phase — find the highest completed phase
      const highest = await PhaseEngine.getHighestCompletedPhase(tripId, session.user.id);
      if (highest) {
        phaseNumber = highest.phaseNumber;
      } else {
        // Fallback: read currentPhase directly from trip record
        const { db } = await import("@/server/db");
        const trip = await db.trip.findFirst({
          where: { id: tripId, userId: session.user.id, deletedAt: null },
          select: { currentPhase: true },
        });
        if (trip) {
          phaseNumber = trip.currentPhase;
        }
      }
    }
  } catch {
    // Gracefully degrade — default to phase 1 redirect
  }

  // Route to the correct phase wizard
  if (phaseNumber >= 1 && phaseNumber <= 6) {
    // Phase 1 is completed during creation, redirect to phase-2 as fallback
    const targetPhase = phaseNumber === 1 ? 2 : phaseNumber;
    redirect({ href: `/expedition/${tripId}/phase-${targetPhase}`, locale });
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
        <span className="text-5xl" aria-hidden="true">🚀</span>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          {t("comingSoon", { number: phaseNumber })}
        </h1>
        <p className="mt-2 max-w-sm text-gray-500">
          {t("comingSoonSubtitle")}
        </p>
      </div>
    </>
  );
}
