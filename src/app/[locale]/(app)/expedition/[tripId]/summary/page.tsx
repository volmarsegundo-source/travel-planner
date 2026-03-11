import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ExpeditionSummaryService } from "@/server/services/expedition-summary.service";
import { ExpeditionSummary } from "@/components/features/expedition/ExpeditionSummary";

interface SummaryPageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function SummaryPage({ params }: SummaryPageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  let summary;
  try {
    summary = await ExpeditionSummaryService.getExpeditionSummary(
      tripId,
      session.user.id
    );
  } catch {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/dashboard" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <ExpeditionSummary tripId={tripId} summary={summary} />
    </>
  );
}
