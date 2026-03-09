import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { ItineraryPlanService } from "@/server/services/itinerary-plan.service";
import { Phase6Wizard } from "@/components/features/expedition/Phase6Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import type { TravelStyle } from "@/types/ai.types";

interface Phase6PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase6Page({ params }: Phase6PageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: {
      id: true,
      destination: true,
      startDate: true,
      endDate: true,
      currentPhase: true,
      itineraryDays: {
        orderBy: { dayNumber: "asc" },
        include: {
          activities: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  if (!trip || trip.currentPhase < 6) {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  // Ensure ItineraryPlan exists
  await ItineraryPlanService.getOrCreateItineraryPlan(
    tripId,
    session.user.id,
    locale
  );

  // Fetch Phase 2 metadata for default budget/style
  const phase2 = await db.expeditionPhase.findUnique({
    where: { tripId_phaseNumber: { tripId, phaseNumber: 2 } },
    select: { metadata: true, status: true },
  });

  const phase2Meta =
    phase2?.status === "completed"
      ? (phase2.metadata as Record<string, unknown> | null)
      : null;

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
      <Phase6Wizard
        tripId={tripId}
        destination={trip.destination}
        locale={locale}
        startDate={
          trip.startDate ? trip.startDate.toISOString().split("T")[0]! : null
        }
        endDate={
          trip.endDate ? trip.endDate.toISOString().split("T")[0]! : null
        }
        initialDays={trip.itineraryDays}
        travelStyle={
          (phase2Meta?.travelStyle as TravelStyle | undefined) ?? undefined
        }
        budgetTotal={
          (phase2Meta?.budget as number | undefined) ?? undefined
        }
        budgetCurrency={
          (phase2Meta?.currency as string | undefined) ?? undefined
        }
      />
    </>
  );
}
