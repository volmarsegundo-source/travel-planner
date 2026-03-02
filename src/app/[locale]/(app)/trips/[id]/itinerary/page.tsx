import { redirect, Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { ItineraryEditor } from "@/components/features/itinerary/ItineraryEditor";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface ItineraryPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ItineraryPage({ params }: ItineraryPageProps) {
  const { locale, id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
  }

  const tCommon = await getTranslations("common");
  const tItinerary = await getTranslations("itinerary");
  const tTrips = await getTranslations("trips");
  const tNav = await getTranslations("navigation");

  // Fetch trip with ownership check
  const trip = await db.trip.findFirst({
    where: { id, userId: session?.user?.id ?? "", deletedAt: null },
    select: {
      id: true,
      title: true,
      destination: true,
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

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{tTrips("errors.notFound")}</p>
        <Link
          href="/trips"
          className="text-sm text-primary underline underline-offset-4"
        >
          {tCommon("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.myTrips"), href: "/trips" },
            { label: trip.title, href: `/trips/${id}` },
            { label: tNav("breadcrumb.itinerary") },
          ]}
          backLabel={tNav("breadcrumb.backTo", { name: trip.title })}
        />

        {/* Header */}
        <header className="mb-8 space-y-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <p className="text-muted-foreground text-sm">{trip.destination}</p>
          </div>
          {trip.itineraryDays.length === 0 && (
            <Link
              href={`/trips/${id}/generate`}
              className="inline-flex items-center justify-center min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {tItinerary("generate")}
            </Link>
          )}
        </header>

        {/* Itinerary editor */}
        <ItineraryEditor
          initialDays={trip.itineraryDays}
          tripId={trip.id}
          locale={locale}
        />
      </div>
    </div>
  );
}
