"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  const t = useTranslations("notFoundPage");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <h1 className="text-6xl font-bold text-gray-300">404</h1>
          <h2 className="mt-4 text-2xl font-semibold text-gray-900">
            {t("title")}
          </h2>
          <p className="mt-2 text-gray-600">{t("description")}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("backHome")}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
