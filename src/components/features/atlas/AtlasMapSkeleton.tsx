"use client";

import { useTranslations } from "next-intl";

export function AtlasMapSkeleton() {
  const t = useTranslations("atlas");

  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-xl"
      style={{ backgroundColor: "#0D1B2A", minHeight: "400px" }}
      role="status"
      aria-label={t("loading")}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-pulse rounded-full bg-atlas-outline"
          aria-hidden="true"
        />
        <p className="text-sm text-atlas-on-surface-variant">{t("loading")}</p>
      </div>
    </div>
  );
}
