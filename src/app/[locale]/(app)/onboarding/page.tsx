import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { OnboardingWizard } from "@/components/features/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/auth/login", locale });
  }

  // Derive a display name: use the user's name if available, or the email
  // local part. Never expose full email in UI — only the local part.
  const userName =
    session?.user?.name ??
    session?.user?.email?.split("@")[0] ??
    "Traveler";

  return <OnboardingWizard userName={userName} locale={locale} />;
}
