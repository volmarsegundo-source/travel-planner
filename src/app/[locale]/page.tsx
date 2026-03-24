import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { LandingPageV2 } from "@/components/features/landing/LandingPageV2";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const session = await auth();
  const { locale } = await params;

  if (session) {
    redirect({ href: "/expeditions", locale });
  }

  const isAuthenticated = !!session;

  return <LandingPageV2 isAuthenticated={isAuthenticated} />;
}
