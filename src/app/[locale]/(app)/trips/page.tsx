import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { listUserTripsAction } from "@/server/actions/trip.actions";
import { TripDashboard } from "@/components/features/trips/TripDashboard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface TripsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TripsPage({ params }: TripsPageProps) {
  const { locale } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
  }

  const tNav = await getTranslations("navigation");

  // Fetch initial data server-side so the page is not blank on first render.
  const initialResult = await listUserTripsAction();
  const initialData = initialResult.success ? initialResult.data : undefined;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/trips" },
            { label: tNav("breadcrumb.myTrips") },
          ]}
        />
      </div>
      <TripDashboard locale={locale} initialData={initialData} />
    </>
  );
}
