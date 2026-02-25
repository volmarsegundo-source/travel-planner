import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserTripById } from "@/server/actions/trip.actions";
import { PlanGeneratorWizard } from "@/components/features/trips/PlanGeneratorWizard";

interface GeneratePageProps {
  params: Promise<{ id: string }>;
}

export default async function GeneratePage({ params }: GeneratePageProps) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;
  const result = await getUserTripById(id);
  if (!result.success) redirect("/trips");

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 px-4 py-10">
      <PlanGeneratorWizard trip={result.data} />
    </main>
  );
}
