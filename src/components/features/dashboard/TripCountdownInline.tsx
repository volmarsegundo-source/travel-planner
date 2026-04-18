"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

interface TripCountdownInlineProps {
  startDate: string;
  endDate?: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const RECALC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function computeCountdown(
  startDate: string,
  endDate: string | undefined,
): { messageKey: string; messageParams?: Record<string, number>; colorClass: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : null;
  if (end) end.setHours(0, 0, 0, 0);

  if (end && now > end) {
    return { messageKey: "completed", colorClass: "text-muted-foreground" };
  }

  if (now >= start) {
    return { messageKey: "inProgress", colorClass: "text-atlas-gold" };
  }

  const diffMs = start.getTime() - now.getTime();
  const days = Math.ceil(diffMs / MS_PER_DAY);
  return {
    messageKey: "daysUntil",
    messageParams: { days },
    colorClass: days <= 7 ? "text-atlas-rust" : "text-atlas-teal",
  };
}

export function TripCountdownInline({ startDate, endDate }: TripCountdownInlineProps) {
  const t = useTranslations("expedition.countdown");

  const compute = useCallback(
    () => computeCountdown(startDate, endDate),
    [startDate, endDate],
  );

  const [state, setState] = useState(compute);

  useEffect(() => {
    setState(compute());

    const intervalId = setInterval(() => {
      setState(compute());
    }, RECALC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [compute]);

  const message = state.messageParams
    ? t(state.messageKey as Parameters<typeof t>[0], state.messageParams)
    : t(state.messageKey as Parameters<typeof t>[0]);

  return (
    <p
      className={`mt-0.5 text-xs font-medium ${state.colorClass}`}
      data-testid="trip-countdown-inline"
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
