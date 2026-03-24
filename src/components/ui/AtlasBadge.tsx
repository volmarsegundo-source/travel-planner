"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Icons
 * ──────────────────────────────────────────────────────────────────────────── */

const SparkleIcon = () => (
  <svg
    className="size-3.5"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
  </svg>
);

const AiIcon = () => (
  <svg
    className="size-3.5"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1.27c.34-.6.99-1 1.73-1a2 2 0 1 1 0 4c-.74 0-1.39-.4-1.73-1H21a7 7 0 0 1-7 7v1.27c.6.34 1 .99 1 1.73a2 2 0 1 1-4 0c0-.74.4-1.39 1-1.73V23a7 7 0 0 1-7-7H3.73c-.34.6-.99 1-1.73 1a2 2 0 1 1 0-4c.74 0 1.39.4 1.73 1H5a7 7 0 0 1 7-7V5.73C11.4 5.39 11 4.74 11 4a2 2 0 0 1 1-1.73V2z" />
  </svg>
);

/* ────────────────────────────────────────────────────────────────────────────
 * Rank styling map
 * ──────────────────────────────────────────────────────────────────────────── */

const rankStyleMap: Record<string, string> = {
  novato:
    "bg-atlas-surface-container-high text-atlas-on-surface",
  explorador:
    "bg-atlas-primary-fixed text-atlas-on-primary-fixed",
  desbravador:
    "bg-atlas-tertiary-fixed text-atlas-on-tertiary-fixed",
  navegador:
    "bg-atlas-secondary-fixed text-atlas-on-secondary-fixed",
  aventureiro:
    "bg-atlas-secondary-container text-atlas-primary",
  viajante_frequente:
    "bg-atlas-primary text-atlas-secondary-container",
  lendario:
    "bg-atlas-primary text-atlas-secondary-container font-extrabold",
};

/* ────────────────────────────────────────────────────────────────────────────
 * Status color map
 * ──────────────────────────────────────────────────────────────────────────── */

const statusColorMap = {
  success:
    "bg-atlas-success-container text-atlas-success",
  warning:
    "bg-atlas-warning-container text-atlas-warning",
  error:
    "bg-atlas-error-container text-atlas-error",
  info:
    "bg-atlas-info-container text-atlas-info",
} as const;

type StatusColor = keyof typeof statusColorMap;

/* ────────────────────────────────────────────────────────────────────────────
 * Size variants
 * ──────────────────────────────────────────────────────────────────────────── */

const badgeSizeVariants = cva("", {
  variants: {
    size: {
      sm: "text-[10px] px-2 py-0.5",
      md: "text-xs px-2.5 py-1",
    },
  },
  defaultVariants: { size: "md" },
});

/* ────────────────────────────────────────────────────────────────────────────
 * Props — discriminated union per variant
 * ──────────────────────────────────────────────────────────────────────────── */

interface BadgeBase {
  className?: string;
  size?: "sm" | "md";
}

interface StatusBadge extends BadgeBase {
  variant: "status";
  color: StatusColor;
  children: React.ReactNode;
}

interface RankBadge extends BadgeBase {
  variant: "rank";
  /** Rank key (novato, explorador, etc.) */
  rankKey: string;
  children: React.ReactNode;
}

interface PaBadge extends BadgeBase {
  variant: "pa";
  /** Current PA balance */
  points: number;
  children?: never;
}

interface CategoryOverlineBadge extends BadgeBase {
  variant: "category-overline";
  children: React.ReactNode;
}

interface CounterBadge extends BadgeBase {
  variant: "counter";
  /** Count value — displayed as 99+ when > 99 */
  count: number;
  children?: never;
}

interface AiTipBadge extends BadgeBase {
  variant: "ai-tip";
  children: React.ReactNode;
}

interface NotificationBadge extends BadgeBase {
  variant: "notification";
  /** Notification count — 0 renders as dot */
  count?: number;
  children?: never;
}

type AtlasBadgeProps =
  | StatusBadge
  | RankBadge
  | PaBadge
  | CategoryOverlineBadge
  | CounterBadge
  | AiTipBadge
  | NotificationBadge;

/* ────────────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────────────── */

function AtlasBadge(props: AtlasBadgeProps) {
  const { variant, className, size = "md" } = props;

  const baseClasses = cn(
    "inline-flex items-center gap-1 font-atlas-body font-bold rounded-full whitespace-nowrap",
    badgeSizeVariants({ size }),
  );

  switch (variant) {
    case "status": {
      const { color, children } = props;
      return (
        <span
          data-slot="atlas-badge"
          data-variant="status"
          role="status"
          className={cn(baseClasses, statusColorMap[color], className)}
        >
          {children}
        </span>
      );
    }

    case "rank": {
      const { rankKey, children } = props;
      const rankStyle = rankStyleMap[rankKey] || rankStyleMap.novato;
      return (
        <span
          data-slot="atlas-badge"
          data-variant="rank"
          className={cn(baseClasses, rankStyle, className)}
        >
          {children}
        </span>
      );
    }

    case "pa": {
      const { points } = props;
      return (
        <span
          data-slot="atlas-badge"
          data-variant="pa"
          role="status"
          aria-label={`${points} PA`}
          className={cn(
            baseClasses,
            "bg-atlas-surface-container-low border border-atlas-outline-variant/10 text-atlas-on-surface",
            className,
          )}
        >
          <SparkleIcon />
          <span>{points} PA</span>
        </span>
      );
    }

    case "category-overline": {
      const { children } = props;
      return (
        <span
          data-slot="atlas-badge"
          data-variant="category-overline"
          className={cn(
            "inline-flex items-center font-atlas-body",
            "text-[10px] font-bold uppercase tracking-widest",
            "text-atlas-secondary",
            className,
          )}
        >
          {children}
        </span>
      );
    }

    case "counter": {
      const { count } = props;
      const displayCount = count > 99 ? "99+" : String(count);
      return (
        <span
          data-slot="atlas-badge"
          data-variant="counter"
          className={cn(
            baseClasses,
            "bg-atlas-primary-container text-atlas-on-primary",
            "min-w-[20px] justify-center",
            className,
          )}
        >
          {displayCount}
        </span>
      );
    }

    case "ai-tip": {
      const { children } = props;
      return (
        <span
          data-slot="atlas-badge"
          data-variant="ai-tip"
          className={cn(
            "inline-flex items-center gap-1 font-atlas-body",
            "text-[10px] font-bold uppercase tracking-widest",
            "text-atlas-secondary-fixed-dim",
            className,
          )}
        >
          <AiIcon />
          {children}
        </span>
      );
    }

    case "notification": {
      const { count = 0 } = props;
      const isDot = count === 0;
      return (
        <span
          data-slot="atlas-badge"
          data-variant="notification"
          role="status"
          aria-label={isDot ? "New notification" : `${count} notifications`}
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            "bg-atlas-error text-atlas-on-error font-bold",
            isDot
              ? "size-2.5"
              : "min-w-[18px] h-[18px] px-1 text-[10px]",
            className,
          )}
        >
          {!isDot && (count > 99 ? "99+" : count)}
        </span>
      );
    }
  }
}

export { AtlasBadge };
export type { AtlasBadgeProps, StatusColor };
