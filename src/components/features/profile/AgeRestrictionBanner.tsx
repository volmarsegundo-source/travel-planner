"use client";

import { useTranslations } from "next-intl";

interface AgeRestrictionBannerProps {
  isMinor: boolean;
  variant: "profile" | "registration";
}

function InfoIcon() {
  return (
    <svg
      data-testid="age-restriction-icon"
      aria-hidden="true"
      className="size-5 shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function AgeRestrictionBanner({ isMinor: isUserMinor, variant }: AgeRestrictionBannerProps) {
  const t = useTranslations("ageRestriction");

  if (!isUserMinor) return null;

  const isRegistration = variant === "registration";

  return (
    <div
      role={isRegistration ? "alert" : "status"}
      aria-live={isRegistration ? "assertive" : "polite"}
      className="flex items-start gap-3 rounded-lg border border-atlas-gold/30 bg-atlas-gold/10 px-4 py-3 text-sm text-foreground"
      data-testid="age-restriction-banner"
    >
      <InfoIcon />
      <p>
        {isRegistration ? t("registrationBanner") : t("profileBanner")}
      </p>
    </div>
  );
}
