import { redirect } from "@/i18n/navigation";

interface TripsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TripsPage({ params }: TripsPageProps) {
  const { locale } = await params;
  redirect({ href: "/dashboard", locale });
}
