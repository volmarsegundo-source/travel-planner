import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Phase2Wizard } from "@/components/features/expedition/Phase2Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface Phase2PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase2Page({ params }: Phase2PageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  return (
    <>
      <div className="mx-auto max-w-md px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/dashboard" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <Phase2Wizard tripId={tripId} />
    </>
  );
}
