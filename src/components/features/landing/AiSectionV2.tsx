"use client";

import { useTranslations } from "next-intl";
import { CheckCircle } from "lucide-react";

const AI_FEATURE_KEYS = ["feature1", "feature2", "feature3"] as const;

// SPEC-LANDING-LAYOUT-001: AI section is text-only until a real animated
// demo is ready. Previously shipped a gradient "AI Preview" placeholder,
// a floating Lisbon prompt balloon, and a dead "Learn how it works" CTA
// — all removed here.
export function AiSectionV2() {
  const t = useTranslations("landingV2.ai");

  return (
    <section className="py-24 bg-atlas-primary-container relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight font-atlas-headline">
          {t("title")}
        </h2>
        <p className="text-atlas-primary-fixed-dim text-lg leading-relaxed font-atlas-body">
          {t("description")}
        </p>

        <ul className="space-y-4 text-white/90 text-left inline-block mx-auto">
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
      </div>
    </section>
  );
}
