"use client";

import { useTranslations } from "next-intl";
import { AtlasCard } from "@/components/ui";
import { Award, Medal, ShieldCheck, Globe, Compass, Star, Users, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface GamificationSectionV2Props {
  isAuthenticated?: boolean;
}

interface BadgeShowcase {
  i18nKey: string;
  Icon: React.ComponentType<{ className?: string }>;
  glowColor: string;
  borderColor: string;
  iconColor: string;
}

const BADGE_SHOWCASES: BadgeShowcase[] = [
  {
    i18nKey: "badge1",
    Icon: Compass,
    glowColor: "bg-atlas-secondary-container/20 group-hover:bg-atlas-secondary-container/40",
    borderColor: "border-atlas-secondary",
    iconColor: "text-atlas-secondary",
  },
  {
    i18nKey: "badge2",
    Icon: Globe,
    glowColor: "bg-atlas-info/20 group-hover:bg-atlas-info/40",
    borderColor: "border-atlas-info",
    iconColor: "text-atlas-info",
  },
  {
    i18nKey: "badge3",
    Icon: Star,
    glowColor: "bg-atlas-success/20 group-hover:bg-atlas-success/40",
    borderColor: "border-atlas-success",
    iconColor: "text-atlas-success",
  },
  {
    i18nKey: "badge4",
    Icon: Award,
    glowColor: "bg-atlas-warning/20 group-hover:bg-atlas-warning/40",
    borderColor: "border-atlas-warning",
    iconColor: "text-atlas-warning",
  },
  {
    i18nKey: "badge5",
    Icon: Users,
    glowColor: "bg-atlas-info/20 group-hover:bg-atlas-info/40",
    borderColor: "border-atlas-info",
    iconColor: "text-atlas-info",
  },
  {
    i18nKey: "badge6",
    Icon: MapPin,
    glowColor: "bg-atlas-secondary-container/20 group-hover:bg-atlas-secondary-container/40",
    borderColor: "border-atlas-secondary",
    iconColor: "text-atlas-secondary",
  },
  {
    i18nKey: "badge7",
    Icon: Medal,
    glowColor: "bg-atlas-success/20 group-hover:bg-atlas-success/40",
    borderColor: "border-atlas-success",
    iconColor: "text-atlas-success",
  },
  {
    i18nKey: "badge8",
    Icon: ShieldCheck,
    glowColor: "bg-atlas-warning/20 group-hover:bg-atlas-warning/40",
    borderColor: "border-atlas-warning",
    iconColor: "text-atlas-warning",
  },
];

export function GamificationSectionV2({
  isAuthenticated = false,
}: GamificationSectionV2Props) {
  const t = useTranslations("landingV2.gamification");

  return (
    <section className="py-24 bg-atlas-surface">
      <div className="max-w-screen-2xl mx-auto px-6">
        {/* Header row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold text-atlas-primary font-atlas-headline mb-4">
              {t("title")}
            </h2>
            <p className="text-atlas-on-surface-variant font-atlas-body">
              {t("subtitle")}
            </p>
          </div>

          {/* Level pill — hidden for non-authenticated visitors */}
          {isAuthenticated && (
            <div className="bg-atlas-surface-container-high px-6 py-3 rounded-full flex items-center gap-4 shrink-0">
              <span className="text-atlas-primary font-bold font-atlas-body">
                {t("currentLevel")}:
              </span>
              <span className="bg-atlas-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                Explorador
              </span>
            </div>
          )}
        </div>

        {/* Explanation text */}
        <div className="bg-atlas-primary-container/5 border border-atlas-outline-variant/30 rounded-2xl p-8 mb-12 text-center">
          <p className="text-atlas-on-surface font-atlas-body text-lg">
            {t("explanation")}
          </p>
        </div>

        {/* Badge showcase cards — centered */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          {BADGE_SHOWCASES.map(({ i18nKey, Icon, glowColor, borderColor, iconColor }) => (
            <AtlasCard
              key={i18nKey}
              variant="interactive"
              className="group p-8 flex flex-col items-center text-center"
            >
              {/* Icon with glow */}
              <div className="w-24 h-24 mb-6 relative">
                <div
                  className={cn(
                    "absolute inset-0 rounded-full blur-xl transition-colors",
                    glowColor,
                  )}
                  aria-hidden="true"
                />
                <div
                  className={cn(
                    "relative w-full h-full bg-atlas-primary-container rounded-full flex items-center justify-center border-2",
                    borderColor,
                  )}
                >
                  <Icon className={cn("size-12", iconColor)} aria-hidden="true" />
                </div>
              </div>

              {/* Badge name */}
              <h3 className="text-xl font-bold text-atlas-primary font-atlas-headline mb-2">
                {t(`${i18nKey}.name`)}
              </h3>

              {/* Badge description */}
              <p className="text-sm text-atlas-on-surface-variant font-atlas-body">
                {t(`${i18nKey}.description`)}
              </p>
            </AtlasCard>
          ))}
        </div>
      </div>
    </section>
  );
}
