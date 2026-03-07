"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function HeroSection() {
  const t = useTranslations("landing");

  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-36">
      {/* Background decorations */}
      <div className="absolute inset-0 atlas-grid-lines" aria-hidden="true" />
      <div
        className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-atlas-gold/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-atlas-teal/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left column */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-atlas-teal-light">
              {t("hero.eyebrow")}
            </p>

            <h1 className="mt-4 font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
              {t("hero.title")}{" "}
              <span className="italic text-atlas-gold">
                {t("hero.titleHighlight")}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              {t("hero.description")}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-lg bg-atlas-gold px-8 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-atlas-ink shadow-lg transition-all hover:bg-atlas-gold-light hover:shadow-xl"
              >
                {t("hero.cta")}
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-lg border border-atlas-line px-8 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-foreground transition-all hover:bg-muted"
              >
                {t("hero.secondaryCta")}
              </Link>
            </div>
          </div>

          {/* Right column — stats panel (desktop only) */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-atlas-line bg-card/80 p-8 backdrop-blur">
              <div className="grid grid-cols-1 gap-8">
                <div className="text-center">
                  <p className="font-heading text-4xl font-bold text-atlas-gold">
                    {t("hero.stat1Value")}
                  </p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {t("hero.stat1Label")}
                  </p>
                </div>
                <div className="atlas-gold-divider" />
                <div className="text-center">
                  <p className="font-heading text-4xl font-bold text-atlas-gold">
                    {t("hero.stat2Value")}
                  </p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {t("hero.stat2Label")}
                  </p>
                </div>
                <div className="atlas-gold-divider" />
                <div className="text-center">
                  <p className="font-heading text-4xl font-bold text-atlas-gold">
                    {t("hero.stat3Value")}
                  </p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {t("hero.stat3Label")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex justify-center" aria-hidden="true">
          <svg
            className="h-6 w-6 animate-bounce text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
