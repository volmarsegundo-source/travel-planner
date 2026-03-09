import { redirect } from "@/i18n/navigation";

interface TripsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * /trips now redirects to /dashboard.
 * Trip management lives inside the expedition flow (Atlas gamification).
 */
export default async function TripsPage({ params }: TripsPageProps) {
  const { locale } = await params;
  redirect({ href: "/dashboard", locale });
}
