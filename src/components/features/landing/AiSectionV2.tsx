"use client";

import { useTranslations } from "next-intl";
import { CheckCircle, MoveRight } from "lucide-react";

const AI_FEATURE_KEYS = ["feature1", "feature2", "feature3"] as const;

export function AiSectionV2() {
  const t = useTranslations("landingV2.ai");

  return (
    <section className="py-24 bg-atlas-primary-container relative overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
        {/* Left column — text content */}
        <div className="flex-1 space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight font-atlas-headline">
            {t("title")}
          </h2>
          <p className="text-atlas-primary-fixed-dim text-lg leading-relaxed max-w-xl font-atlas-body">
            {t("description")}
          </p>

          {/* Feature checklist */}
          <ul className="space-y-4 text-white/90">
            {AI_FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-3">
                <CheckCircle
                  className="size-5 text-atlas-secondary shrink-0"
                  aria-hidden="true"
                />
                <span className="font-atlas-body">{t(key)}</span>
              </li>
            ))}
          </ul>

          {/* CTA link */}
          <button
            type="button"
            className="text-atlas-secondary-fixed-dim font-bold flex items-center gap-2 hover:gap-4 transition-all motion-reduce:hover:gap-2 font-atlas-body"
          >
            {t("cta")}
            <MoveRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Right column — mockup frame */}
        <div className="flex-1 relative">
          <div className="bg-white/5 backdrop-blur-2xl p-4 rounded-3xl border border-white/10 shadow-2xl">
            {/* Placeholder for AI mockup image */}
            <div
              className="rounded-2xl bg-gradient-to-br from-atlas-primary/60 via-atlas-primary-container to-atlas-primary/40 aspect-[3/4] max-h-[400px] flex items-center justify-center"
              role="img"
              aria-label={t("mockupAlt")}
            >
              <span className="text-white/30 font-atlas-headline text-2xl font-bold">
                AI Preview
              </span>
            </div>

            {/* Floating prompt card */}
            <div className="lg:absolute lg:-bottom-6 lg:-left-6 mt-4 lg:mt-0 bg-atlas-secondary-container p-6 rounded-2xl shadow-xl max-w-[220px]">
              <p className="text-atlas-primary font-bold text-sm font-atlas-body">
                &ldquo;{t("promptExample")}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
