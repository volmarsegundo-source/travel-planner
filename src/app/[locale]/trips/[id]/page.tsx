import { redirect, Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getTripByIdAction } from "@/server/actions/trip.actions";

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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/trips"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          {tCommon("back")}
        </Link>

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
    </main>
  );
}
