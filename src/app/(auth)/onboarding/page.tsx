import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OnboardingWizard } from "@/components/features/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return <OnboardingWizard userName={session.user.name} />;
}
