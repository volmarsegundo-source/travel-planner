import { redirect, Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getTripByIdAction } from "@/server/actions/trip.actions";
import { PlanGeneratorWizard } from "@/components/features/itinerary/PlanGeneratorWizard";

interface GeneratePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function GeneratePage({ params }: GeneratePageProps) {
  const { locale, id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
  }

  const t = await getTranslations("common");
  const tTrips = await getTranslations("trips");

  const result = await getTripByIdAction(id);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{tTrips("errors.notFound")}</p>
        <Link
          href="/trips"
          className="text-sm text-primary underline underline-offset-4"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  const trip = result.data;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/trips/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          {t("back")}
        </Link>

        <PlanGeneratorWizard trip={trip} locale={locale} />
      </div>
    </main>
  );
}
