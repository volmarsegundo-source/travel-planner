import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.ageRejected");
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function AgeRejectedPage() {
  const t = await getTranslations("auth.ageRejected");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-atlas-surface">
      <div className="w-full max-w-md rounded-lg border border-atlas-outline/30 bg-atlas-surface-variant p-6 text-center">
        <h1 className="font-atlas-headline text-2xl font-bold text-atlas-on-surface">
          {t("title")}
        </h1>
        <p className="mt-4 text-atlas-on-surface-variant">{t("body")}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-atlas-primary px-4 py-2 text-atlas-on-primary hover:opacity-90 min-h-[44px] leading-[28px]"
        >
          {t("backToLanding")}
        </Link>
      </div>
    </main>
  );
}
