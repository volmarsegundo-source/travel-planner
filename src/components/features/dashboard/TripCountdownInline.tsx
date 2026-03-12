"use client";

import { useTranslations } from "next-intl";

interface TripCountdownInlineProps {
  startDate: string;
  endDate?: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function TripCountdownInline({ startDate, endDate }: TripCountdownInlineProps) {
  const t = useTranslations("expedition.countdown");

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : null;
  if (end) end.setHours(0, 0, 0, 0);

  let message: string;
  let colorClass: string;

  if (end && now > end) {
    message = t("completed");
    colorClass = "text-muted-foreground";
  } else if (now >= start) {
    message = t("inProgress");
    colorClass = "text-atlas-gold";
  } else {
    const diffMs = start.getTime() - now.getTime();
    const days = Math.ceil(diffMs / MS_PER_DAY);
    message = t("daysUntil", { days });
    colorClass = days <= 7 ? "text-atlas-rust" : "text-atlas-teal";
  }

  return (
    <p
      className={`mt-0.5 text-xs font-medium ${colorClass}`}
      data-testid="trip-countdown-inline"
    >
      {message}
    </p>
  );
}
