import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Phase1Wizard } from "@/components/features/expedition/Phase1Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { db } from "@/server/db";

interface ExpeditionNewPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ExpeditionNewPage({ params }: ExpeditionNewPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  // Fetch user profile for passport expiry warning, trip classification, and profile persistence
  let userProfile: {
    passportExpiry: Date | null;
    country: string | null;
    birthDate: Date | null;
    phone: string | null;
    city: string | null;
    bio: string | null;
  } | null = null;
  try {
    userProfile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        passportExpiry: true,
        country: true,
        birthDate: true,
        phone: true,
        city: true,
        bio: true,
      },
    });
  } catch {
    // Gracefully degrade if user_profiles table is unavailable
  }

  return (
    <>
      <div className="mx-auto max-w-md px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/expeditions" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <Phase1Wizard
        passportExpiry={userProfile?.passportExpiry?.toISOString() ?? undefined}
        userCountry={userProfile?.country ?? undefined}
        userName={session.user.name ?? undefined}
        userProfile={
          userProfile
            ? {
                birthDate: userProfile.birthDate?.toISOString().split("T")[0] ?? undefined,
                phone: userProfile.phone ?? undefined,
                country: userProfile.country ?? undefined,
                city: userProfile.city ?? undefined,
                bio: userProfile.bio ?? undefined,
              }
            : undefined
        }
      />
    </>
  );
}
