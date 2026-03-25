"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LandingNav } from "@/components/features/landing/LandingNav";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  const t = useTranslations("notFoundPage");

  return (
    <div className="flex min-h-screen flex-col bg-atlas-surface">
      <LandingNav />
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <h1 className="text-6xl font-bold text-atlas-on-surface-variant/50 font-atlas-headline">
            404
          </h1>
          <h2 className="mt-4 text-2xl font-semibold text-atlas-on-surface font-atlas-headline">
            {t("title")}
          </h2>
          <p className="mt-2 text-atlas-on-surface-variant font-atlas-body">
            {t("description")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-atlas-primary px-6 py-3 text-sm font-medium text-white hover:bg-atlas-primary/90 transition-colors"
          >
            {t("backHome")}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
