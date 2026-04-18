import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { OnboardingWizard } from "@/components/features/onboarding/OnboardingWizard";
import { OnboardingService } from "@/server/services/onboarding.service";

export default async function OnboardingPage() {
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/auth/login", locale });
  }

  const t = await getTranslations("common");

  // Load onboarding progress from DB
  const progress = await OnboardingService.getProgress(session.user.id!);

  // If onboarding is already completed, redirect to expeditions
  if (progress.onboardingCompletedAt) {
    redirect({ href: "/expeditions", locale });
  }

  // Derive a display name: use the user's name if available, or the email
  // local part. Never expose full email in UI — only the local part.
  const userName =
    session?.user?.name ??
    session?.user?.email?.split("@")[0] ??
    t("traveler");

  // Determine the initial step: saved step + 1 (next step to work on),
  // clamped to valid range. If step 0 (never started), start at 1.
  const savedStep = progress.onboardingStep;
  const initialStep = savedStep === 0 ? 1 : Math.min(savedStep + 1, 3);

  // Parse saved data for pre-filling the wizard
  const savedData = progress.onboardingData as Record<string, unknown> | null;
  const initialData = savedData
    ? {
        step1: savedData.step1 as Record<string, unknown> | undefined,
        step2: savedData.step2 as
          | { destination: string; startDate: string; endDate: string; travelers: number }
          | undefined,
        step3: savedData.step3 as
          | { travelStyle: "ADVENTURE" | "CULTURE" | "RELAXATION" | "GASTRONOMY"; budget: number; currency: string }
          | undefined,
      }
    : undefined;

  return (
    <OnboardingWizard
      userName={userName}
      locale={locale}
      initialStep={initialStep}
      initialData={initialData}
    />
  );
}
