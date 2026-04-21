"use client";

import { useTranslations } from "next-intl";
import { useAiServiceStatus } from "@/hooks/useAiServiceStatus";

/**
 * Renders a friendly "AI service paused" banner when the cost-budget kill
 * switch has fired. Deliberately opaque — never reveals spend numbers.
 *
 * Admins additionally see an amber warning when spend is in the 80-95% band.
 */
export function AiServicePausedBanner() {
  const t = useTranslations("ai.service");
  const status = useAiServiceStatus();

  if (status.paused) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-atlas-error-container bg-atlas-error-container p-4 text-sm text-atlas-on-error-container dark:border-atlas-error/40 dark:bg-atlas-error-container/20 dark:text-atlas-error-container"
      >
        <p className="font-medium">{t("paused.title")}</p>
        <p className="mt-1 text-atlas-on-error-container/90 dark:text-atlas-error-container/80">{t("paused.body")}</p>
      </div>
    );
  }

  if (status.warning) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-atlas-warning bg-atlas-warning-container p-4 text-sm text-atlas-warning dark:border-atlas-warning/40 dark:bg-atlas-warning-container/10 dark:text-atlas-warning"
      >
        <p className="font-medium">{t("warning.title")}</p>
        <p className="mt-1 text-atlas-warning/90 dark:text-atlas-warning/80">{t("warning.body")}</p>
      </div>
    );
  }

  return null;
}
