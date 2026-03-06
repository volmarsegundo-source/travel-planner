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

  const currentPhase = await PhaseEngine.getCurrentPhase(tripId, session.user.id);
  const phaseNumber = currentPhase?.phaseNumber ?? 1;

  // Route to the correct phase wizard
  if (phaseNumber === 1) {
    // Phase 1 was completed during creation, but just in case
    redirect({ href: `/expedition/${tripId}/phase-2`, locale });
    return null;
  }

  if (phaseNumber === 2) {
    redirect({ href: `/expedition/${tripId}/phase-2`, locale });
    return null;
  }

  // Phase 3+ — coming soon
  return (
    <>
      <div className="mx-auto max-w-md px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/dashboard" },
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
