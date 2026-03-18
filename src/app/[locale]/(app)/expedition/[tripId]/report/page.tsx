import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ReportGenerationService } from "@/server/services/report-generation.service";
import { TripReport } from "@/components/features/expedition/TripReport";

interface ReportPageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");
  const tReport = await getTranslations("report");

  // Check availability before generating
  const availability = await ReportGenerationService.isReportAvailable(
    tripId,
    session.user.id
  );

  if (!availability.available) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/expeditions" },
            { label: tNav("breadcrumb.expedition"), href: `/expedition/${tripId}/summary` },
            { label: tReport("title") },
          ]}
        />
        <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground" data-testid="report-not-available">
            {tReport("reportNotAvailable")}
          </p>
        </div>
      </div>
    );
  }

  const report = await ReportGenerationService.generateTripReport(
    tripId,
    session.user.id
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: tNav("breadcrumb.home"), href: "/expeditions" },
          { label: tNav("breadcrumb.expedition"), href: `/expedition/${tripId}/summary` },
          { label: tReport("title") },
        ]}
      />
      <div className="mt-6">
        <TripReport data={report} />
      </div>
    </div>
  );
}
