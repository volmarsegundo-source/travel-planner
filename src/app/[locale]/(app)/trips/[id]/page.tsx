import { redirect, Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getTripByIdAction } from "@/server/actions/trip.actions";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface TripDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { locale, id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
  }

  const t = await getTranslations("trips");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("navigation");
  const tItinerary = await getTranslations("itinerary");

  const result = await getTripByIdAction(id);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{t("errors.notFound")}</p>
        <Link
          href="/trips"
          className="text-sm text-primary underline underline-offset-4"
        >
          {tCommon("back")}
        </Link>
      </div>
    );
  }

  const trip = result.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.myTrips"), href: "/trips" },
            { label: trip.title },
          ]}
        />

        {/* Trip header */}
        <header className="mb-8 space-y-1">
          <h1 className="text-3xl font-bold">{trip.title}</h1>
          <p className="text-muted-foreground">{trip.destination}</p>
        </header>

        {/* Itinerary placeholder */}
        <section className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <p>{tItinerary("noActivities")}</p>
        </section>
      </div>
    </div>
  );
}
