import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface AuthLayoutProps {
  children: ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          {/* App logo / name */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {t("appName")} ✈️
            </h1>
          </div>

          {/* Card wrapping the page content */}
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
