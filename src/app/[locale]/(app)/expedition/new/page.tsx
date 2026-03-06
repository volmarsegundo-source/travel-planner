import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Phase1Wizard } from "@/components/features/expedition/Phase1Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface ExpeditionNewPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ExpeditionNewPage({ params }: ExpeditionNewPageProps) {
  const { locale } = await params;
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
      <Phase1Wizard />
    </>
  );
}
