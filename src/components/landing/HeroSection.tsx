"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function HeroSection() {
  const t = useTranslations("landing");
  const tAuth = useTranslations("auth");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-4 py-24 text-white sm:px-6 sm:py-32 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute -left-10 -top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          {t("hero.title")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
          {t("hero.subtitle")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center rounded-lg bg-white px-8 py-3 text-base font-semibold text-indigo-600 shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl"
          >
            {t("hero.cta")}
          </Link>
        </div>

        <p className="mt-6 text-sm text-white/70">
          {t("hero.loginPrompt")}{" "}
          <Link
            href="/auth/login"
            className="font-medium text-white underline underline-offset-4 transition-colors hover:text-white/90"
          >
            {tAuth("signIn")}
          </Link>
        </p>
      </div>
    </section>
  );
}
