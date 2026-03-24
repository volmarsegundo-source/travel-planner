"use client";

import { useTranslations } from "next-intl";
import { AtlasCard, AtlasBadge } from "@/components/ui";
import {
  Sparkles,
  UserRound,
  ClipboardCheck,
  Map,
  Compass,
  CalendarDays,
  Headset,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Total number of expedition phases displayed */
const TOTAL_PHASES = 8;

/** Phases that are not yet available */
const COMING_SOON_PHASES = new Set([7, 8]);

/** Lucide icon components mapped to each phase number */
const PHASE_ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Sparkles,
  2: UserRound,
  3: ClipboardCheck,
  4: Map,
  5: Compass,
  6: CalendarDays,
  7: Headset,
  8: Images,
};

export function PhasesSectionV2() {
  const t = useTranslations("landingV2.phases");

  return (
    <section id="fases" className="py-24 bg-atlas-surface">
      <div className="max-w-screen-2xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-atlas-primary font-atlas-headline mb-6">
            {t("title")}
          </h2>
          <p className="text-atlas-on-surface-variant font-atlas-body leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Phase cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: TOTAL_PHASES }, (_, i) => i + 1).map(
            (phaseNumber) => {
              const isComingSoon = COMING_SOON_PHASES.has(phaseNumber);
              const Icon = PHASE_ICONS[phaseNumber];
              const phaseKey = `phase${phaseNumber}` as const;

              return (
                <div
                  key={phaseNumber}
                  className={cn(
                    "relative",
                    isComingSoon && "opacity-60",
                  )}
                  aria-disabled={isComingSoon || undefined}
                >
                  <AtlasCard
                    variant="elevated"
                    className={cn(
                      "p-8",
                      !isComingSoon &&
                        "hover:translate-y-[-4px] transition-transform duration-200 motion-reduce:hover:translate-y-0",
                    )}
                  >
                    {/* Coming soon badge */}
                    {isComingSoon && (
                      <div className="absolute top-4 right-4">
                        <AtlasBadge variant="status" color="info" size="sm">
                          {t("comingSoon")}
                        </AtlasBadge>
                      </div>
                    )}

                    {/* Icon */}
                    {Icon && (
                      <Icon
                        className="size-10 text-atlas-secondary mb-4"
                        aria-hidden="true"
                      />
                    )}

                    {/* Title */}
                    <h3 className="text-lg font-bold text-atlas-primary font-atlas-headline mb-3">
                      {t(`${phaseKey}.name`)}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-atlas-on-surface-variant font-atlas-body leading-relaxed">
                      {t(`${phaseKey}.description`)}
                    </p>
                  </AtlasCard>
                </div>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
}
