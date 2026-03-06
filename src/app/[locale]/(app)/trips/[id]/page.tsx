import { redirect, Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTripByIdAction } from "@/server/actions/trip.actions";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/button";

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
  const tErrors = await getTranslations("errors");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("navigation");
  const tItinerary = await getTranslations("itinerary");

  const result = await getTripByIdAction(id);

  if (!result.success || !result.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-lg border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h2 role="alert" className="text-lg font-semibold text-foreground">
            {t("errors.notFound")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tErrors("tripNotFound.description")}
          </p>
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/trips">{tCommon("goBackToTrips")}</Link>
          </Button>
        </div>
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
