import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUserTripsAction } from "@/server/actions/trip.actions";
import { TripDashboard } from "@/components/features/trips/TripDashboard";

interface TripsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TripsPage({ params }: TripsPageProps) {
  const { locale } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch initial data server-side so the page is not blank on first render.
  const initialResult = await listUserTripsAction();
  const initialData = initialResult.success ? initialResult.data : undefined;

  return <TripDashboard locale={locale} initialData={initialData} />;
}
