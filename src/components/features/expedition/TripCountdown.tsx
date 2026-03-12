"use client";

import { useTranslations } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripCountdownProps {
  startDate: Date | null;
  endDate: Date | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─── Component ────────────────────────────────────────────────────────────────

export function TripCountdown({ startDate, endDate }: TripCountdownProps) {
  const t = useTranslations("expedition.countdown");

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let message: string;

  if (!startDate) {
    message = t("noDates");
  } else {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(0, 0, 0, 0);

    if (end && now > end) {
      message = t("completed");
    } else if (now >= start) {
      message = t("inProgress");
    } else {
      const diffMs = start.getTime() - now.getTime();
      const days = Math.ceil(diffMs / MS_PER_DAY);
      message = t("daysUntil", { days });
    }
  }

  return (
    <p
      className="text-2xl font-bold text-foreground"
      role="status"
      aria-live="polite"
      data-testid="trip-countdown"
    >
      {message}
    </p>
  );
}
