import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { listUserTripsAction } from "@/server/actions/trip.actions";
import { TripDashboard } from "@/components/features/trips/TripDashboard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface TripsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TripsPage({ params, searchParams }: TripsPageProps) {
  const { locale } = await params;
  const query = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
  }

  const tNav = await getTranslations("navigation");

  // Fetch initial data server-side so the page is not blank on first render.
  const initialResult = await listUserTripsAction();
  const initialData = initialResult.success ? initialResult.data : undefined;

  // Redirect first-time users (0 trips) to onboarding, unless they already
  // came from onboarding (skip loop) via ?from=onboarding.
  const fromOnboarding = query.from === "onboarding";
  if (!fromOnboarding && initialData && initialData.data.length === 0) {
    redirect({ href: "/onboarding", locale });
  }

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
