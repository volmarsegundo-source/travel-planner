import { redirect, Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTripByIdAction } from "@/server/actions/trip.actions";
import { PlanGeneratorWizard } from "@/components/features/itinerary/PlanGeneratorWizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/button";

interface GeneratePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function GeneratePage({ params }: GeneratePageProps) {
  const { locale, id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
  }

  const tCommon = await getTranslations("common");
  const tErrors = await getTranslations("errors");
  const tTrips = await getTranslations("trips");
  const tNav = await getTranslations("navigation");

  const result = await getTripByIdAction(id);

  if (!result.success || !result.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-lg border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h2 role="alert" className="text-lg font-semibold text-foreground">
            {tTrips("errors.notFound")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tErrors("tripNotFound.description")}
          </p>
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/trips">{tCommon("goBackToTrips")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const trip = result.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.myTrips"), href: "/trips" },
            { label: trip.title, href: `/trips/${id}` },
            { label: tNav("breadcrumb.generatePlan") },
          ]}
          backLabel={tNav("breadcrumb.backTo", { name: trip.title })}
        />

        <PlanGeneratorWizard trip={trip} locale={locale} />
      </div>
    </div>
  );
}
