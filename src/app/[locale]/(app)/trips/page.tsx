import { redirect, Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { TripService } from "@/server/services/trip.service";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/components/features/trips/TripCard";

interface TripsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TripsPage({ params }: TripsPageProps) {
  const { locale } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const t = await getTranslations("trips");
  const tNav = await getTranslations("navigation");

  const result = await TripService.getUserTrips(session.user.id, 1, 50);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/dashboard" },
            { label: tNav("breadcrumb.myTrips") },
          ]}
        />

        <div className="mt-6 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {t("myTrips")}
          </h1>
          <Link href="/expedition/new">
            <Button size="sm">{t("newTrip")}</Button>
          </Link>
        </div>

        {result.data.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-16 text-center">
            <span className="text-5xl" aria-hidden="true">
              🗺️
            </span>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {t("noTrips")}
            </h2>
            <p className="max-w-sm text-muted-foreground">
              {t("noTripsSubtitle")}
            </p>
            <Link href="/expedition/new">
              <Button size="lg">{t("createFirst")}</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                locale={locale}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
