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
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
      >
        <p className="font-medium">{t("paused.title")}</p>
        <p className="mt-1 text-red-800/90 dark:text-red-200/80">{t("paused.body")}</p>
      </div>
    );
  }

  if (status.warning) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
      >
        <p className="font-medium">{t("warning.title")}</p>
        <p className="mt-1 text-amber-800/90 dark:text-amber-200/80">{t("warning.body")}</p>
      </div>
    );
  }

  return null;
}
