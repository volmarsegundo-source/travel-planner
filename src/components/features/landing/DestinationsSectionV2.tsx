"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

interface DestinationData {
  i18nKey: string;
  size: "large" | "medium" | "panoramic";
  gradientFrom: string;
  gradientTo: string;
  /** Unsplash image URL (static, no API key needed) */
  imageUrl?: string;
}

// Unsplash photo URLs — verified via CDN redirect from photo page:
// Rio: GTLJklnjn-E → photo-1516834611397 — Christ the Redeemer at sunset
// Bonito: y9K5K1B-guw → photo-1469797384183 — Gruta do Lago Azul cave interior
// Pantanal: v4ynva2rNVc → photo-1604970747673 — Wetlands sunset, trees and water
const DESTINATIONS: DestinationData[] = [
  {
    i18nKey: "rio",
    size: "large",
    gradientFrom: "from-atlas-secondary-container/80",
    gradientTo: "to-atlas-primary/60",
    // Christ the Redeemer at sunset — by Agustin Diaz Gargiulo (GTLJklnjn-E)
    imageUrl: "https://images.unsplash.com/photo-1516834611397-8d633eaec5d0?w=800&q=80&fit=crop&auto=format",
  },
  {
    i18nKey: "bonito",
    size: "medium",
    gradientFrom: "from-atlas-tertiary-container/80",
    gradientTo: "to-atlas-primary/60",
    // Gruta do Lago Azul, Bonito MS (y9K5K1B-guw)
    imageUrl: "https://images.unsplash.com/photo-1469797384183-f961931553e9?w=800&q=80&fit=crop&auto=format",
  },
  {
    i18nKey: "pantanal",
    size: "panoramic",
    gradientFrom: "from-atlas-secondary/60",
    gradientTo: "to-atlas-primary/60",
    // Pantanal wetlands — body of water near trees at sunset (v4ynva2rNVc)
    imageUrl: "https://images.unsplash.com/photo-1604970747673-3b173ce8e2c7?w=1200&q=80&fit=crop&auto=format",
  },
];

const SIZE_CONFIG = {
  large: {
    colSpan: "col-span-12 lg:col-span-7",
    height: "h-[350px] md:h-[500px]",
    titleSize: "text-3xl md:text-4xl",
  },
  medium: {
    colSpan: "col-span-12 md:col-span-6 lg:col-span-5",
    height: "h-[300px] md:h-[500px]",
    titleSize: "text-2xl md:text-3xl",
  },
  panoramic: {
    colSpan: "col-span-12",
    height: "h-[250px] md:h-[400px]",
    titleSize: "text-3xl md:text-4xl",
  },
} as const;

export function DestinationsSectionV2() {
  const t = useTranslations("landingV2.destinations");

  return (
    <section className="py-24 bg-atlas-surface-container-lowest">
      <div className="max-w-screen-2xl mx-auto px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <h2 className="text-4xl font-bold text-atlas-primary font-atlas-headline">
            {t("title")}
          </h2>
          <a
            href="#"
            className="text-atlas-secondary font-bold hover:underline underline-offset-4 font-atlas-body hidden sm:block"
          >
            {t("viewAll")}
          </a>
        </div>

        {/* Asymmetric grid */}
        <div className="grid grid-cols-12 gap-6">
          {DESTINATIONS.map(({ i18nKey, size, gradientFrom, gradientTo, imageUrl }) => {
            const config = SIZE_CONFIG[size];

            return (
              <div
                key={i18nKey}
                className={`${config.colSpan} relative ${config.height} rounded-3xl overflow-hidden group cursor-pointer`}
              >
                {/* Destination image with gradient fallback */}
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={t(`${i18nKey}.imageAlt`)}
                    fill
                    sizes={
                      size === "panoramic"
                        ? "100vw"
                        : size === "large"
                          ? "(max-width: 1024px) 100vw, 58vw"
                          : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 42vw"
                    }
                    className="object-cover transition-transform duration-700 group-hover:scale-110 motion-reduce:group-hover:scale-100"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${gradientFrom} ${gradientTo} transition-transform duration-700 group-hover:scale-110 motion-reduce:group-hover:scale-100`}
                    role="img"
                    aria-label={t(`${i18nKey}.imageAlt`)}
                  />
                )}

                {/* Overlay — stronger gradient so text is readable on gradient placeholders */}
                <div className="absolute inset-0 bg-gradient-to-t from-atlas-primary via-atlas-primary/40 to-transparent opacity-90" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                  <div className="flex justify-between items-end w-full">
                    <div>
                      {/* Category badge */}
                      <span className="bg-atlas-secondary-container text-atlas-on-secondary-container text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block uppercase">
                        {t(`${i18nKey}.category`)}
                      </span>
                      <h3 className={`${config.titleSize} font-bold text-white font-atlas-headline mb-2`}>
                        {t(`${i18nKey}.name`)}
                      </h3>
                      <p className="text-white/70 font-atlas-body max-w-md">
                        {t(`${i18nKey}.description`)}
                      </p>
                    </div>

                    {/* Navigation button on panoramic card */}
                    {size === "panoramic" && (
                      <button
                        type="button"
                        className="bg-white text-atlas-primary p-4 rounded-full shadow-xl hover:bg-atlas-secondary-container hover:text-atlas-on-secondary-container transition-colors shrink-0 ml-4"
                        aria-label={`${t(`${i18nKey}.name`)} - ${t("viewAll")}`}
                      >
                        <ArrowUpRight className="size-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
