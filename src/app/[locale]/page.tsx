import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { DesignBranch } from "@/components/ui";
import { LandingPageV1 } from "@/components/features/landing/LandingPageV1";
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

  return (
    <DesignBranch
      v1={<LandingPageV1 />}
      v2={<LandingPageV2 isAuthenticated={isAuthenticated} />}
    />
  );
}
