import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { Phase2Wizard } from "@/components/features/expedition/Phase2Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface Phase2PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase2Page({ params }: Phase2PageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  // Fetch Phase 1 metadata to get traveler count
  const phase1 = await db.expeditionPhase.findUnique({
    where: { tripId_phaseNumber: { tripId, phaseNumber: 1 } },
    select: { metadata: true },
  });
  const travelers = (phase1?.metadata as Record<string, unknown>)?.travelers as number ?? 1;

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
      <Phase2Wizard tripId={tripId} travelers={travelers} />
    </>
  );
}
