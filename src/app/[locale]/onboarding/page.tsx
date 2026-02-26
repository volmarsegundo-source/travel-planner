import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OnboardingWizard } from "@/components/features/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Derive a display name: use the user's name if available, or the email
  // local part. Never expose full email in UI — only the local part.
  const userName =
    session.user.name ??
    session.user.email?.split("@")[0] ??
    "Traveler";

  return <OnboardingWizard userName={userName} />;
}
