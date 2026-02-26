import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { ItineraryEditor } from "@/components/features/itinerary/ItineraryEditor";

interface ItineraryPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ItineraryPage({ params }: ItineraryPageProps) {
  const { locale, id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations("common");
  const tItinerary = await getTranslations("itinerary");
  const tTrips = await getTranslations("trips");

  // Fetch trip with ownership check
  const trip = await db.trip.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
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
          href={`/${locale}/trips`}
          className="text-sm text-primary underline underline-offset-4"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href={`/${locale}/trips/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          {t("back")}
        </Link>

        {/* Header */}
        <header className="mb-8 space-y-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <p className="text-muted-foreground text-sm">{trip.destination}</p>
          </div>
          {trip.itineraryDays.length === 0 && (
            <Link
              href={`/${locale}/trips/${id}/generate`}
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
    </main>
  );
}
