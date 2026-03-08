"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

interface ChecklistProgressMiniProps {
  tripId: string;
  requiredTotal: number;
  requiredDone: number;
  recommendedPending: number;
}

export function ChecklistProgressMini({
  tripId,
  requiredTotal,
  requiredDone,
  recommendedPending,
}: ChecklistProgressMiniProps) {
  const t = useTranslations("dashboard.checklist");
  const router = useRouter();

  const percent =
    requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0;
  const allRequiredDone = requiredDone === requiredTotal;

  // Color scheme: 0% dimmed | 1-99% amber | 100% teal/gold
  let barColor: string;
  let textColor: string;
  if (percent === 0) {
    barColor = "bg-muted-foreground/30";
    textColor = "text-muted-foreground";
  } else if (allRequiredDone) {
    barColor = "bg-atlas-teal";
    textColor = "text-atlas-teal dark:text-atlas-teal-light";
  } else {
    barColor = "bg-amber-500";
    textColor = "text-amber-600 dark:text-amber-400";
  }

  const tooltipText = t("tooltip", {
    required: requiredTotal - requiredDone,
    recommended: recommendedPending,
  });

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/expedition/${tripId}/phase-3`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mt-3 flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-atlas-gold/40 hover:bg-atlas-gold/5"
      title={tooltipText}
      aria-label={t("ariaLabel", { done: requiredDone, total: requiredTotal })}
      data-href={`/expedition/${tripId}/phase-3`}
    >
      {/* Icon */}
      <span className={textColor} aria-hidden="true">
        {allRequiredDone ? "\u2705" : "\u2611\uFE0F"}
      </span>

      {/* Text */}
      <span className={`font-medium ${textColor}`}>
        {t("items", { done: requiredDone, total: requiredTotal })}
      </span>

      {/* Mini progress bar */}
      <div className="h-1.5 w-12 rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </button>
  );
}
