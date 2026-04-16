"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Icons
 * ──────────────────────────────────────────────────────────────────────────── */

const CheckIcon = () => (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LockIcon = () => (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

type SegmentState = "completed" | "active" | "pending" | "locked" | "coming_soon";

interface PhaseSegment {
  /** Phase number (1-based) */
  phase: number;
  /** Human-readable phase label */
  label: string;
  /** Current state of this phase */
  state: SegmentState;
  /** Navigation URL for completed segments */
  href?: string;
  /** Tooltip text (e.g. "Coming soon" for future phases) */
  tooltip?: string;
}

interface AtlasPhaseProgressProps {
  /** List of phase segments (should be 6 for expedition phases) */
  segments: PhaseSegment[];
  /** Layout mode */
  layout: "wizard" | "dashboard";
  /** Optional class name */
  className?: string;
  /** Callback when a completed segment is clicked */
  onSegmentClick?: (phase: number) => void;
}

/* ────────────────────────────────────────────────────────────────────────────
 * State label map for screen readers
 * ──────────────────────────────────────────────────────────────────────────── */

const stateAriaLabels: Record<SegmentState, string> = {
  completed: "completed",
  active: "current",
  pending: "pending",
  locked: "locked",
  coming_soon: "coming soon",
};

/* ────────────────────────────────────────────────────────────────────────────
 * Wizard Layout (horizontal circles with lines and labels)
 * ──────────────────────────────────────────────────────────────────────────── */

function WizardSegment({
  segment,
  isLast,
  onClick,
}: {
  segment: PhaseSegment;
  isLast: boolean;
  onClick?: (phase: number) => void;
}) {
  const { phase, label, state, href } = segment;
  const isComingSoon = state === "coming_soon";
  const isClickable = state !== "locked" && !isComingSoon && (href || onClick);
  const comingSoonTooltip = isComingSoon ? segment.tooltip : undefined;

  const circleClasses = cn(
    "relative flex items-center justify-center rounded-full shrink-0",
    "size-10 md:size-11 text-sm font-bold",
    "transition-all duration-200 motion-reduce:transition-none",
    state === "completed" && "bg-atlas-secondary-container text-atlas-primary",
    state === "active" && [
      "bg-atlas-secondary-container text-atlas-primary",
      "ring-4 ring-white shadow-atlas-glow-amber",
      "animate-pulse motion-reduce:animate-none",
    ],
    state === "pending" && "bg-white border-2 border-atlas-outline-variant text-atlas-outline-variant",
    state === "locked" && "bg-atlas-surface-container-low text-atlas-disabled",
    isComingSoon && "bg-atlas-surface-container-low text-atlas-disabled opacity-60 cursor-default",
  );

  const labelClasses = cn(
    "text-xs md:text-sm font-medium text-center mt-2 max-w-[80px] leading-tight",
    state === "completed" && "text-atlas-on-surface font-semibold",
    state === "active" && "text-atlas-on-surface font-bold",
    state === "pending" && "text-atlas-outline-variant",
    state === "locked" && "text-atlas-disabled",
    isComingSoon && "text-atlas-disabled opacity-60",
  );

  const lineClasses = cn(
    "flex-1 h-0.5 mx-1 md:mx-2",
    "transition-colors duration-200 motion-reduce:transition-none",
    state === "completed"
      ? "bg-atlas-secondary-container"
      : "bg-atlas-surface-container-highest",
  );

  const circleContent = (
    <div className={circleClasses}>
      {state === "completed" && <CheckIcon />}
      {state === "active" && <span>{phase}</span>}
      {state === "pending" && <span>{phase}</span>}
      {state === "locked" && <LockIcon />}
      {isComingSoon && <ClockIcon />}
    </div>
  );

  return (
    <>
      <div className="flex flex-col items-center min-w-0" role="listitem">
        <span className="sr-only">
          {`Phase ${phase}: ${label} - ${stateAriaLabels[state]}`}
        </span>
        {isClickable ? (
          <button
            type="button"
            onClick={() => onClick?.(phase)}
            className={cn(
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
              "rounded-full cursor-pointer",
              "min-w-[44px] min-h-[44px] flex items-center justify-center",
            )}
            aria-label={`Go to phase ${phase}: ${label}`}
          >
            {circleContent}
          </button>
        ) : (
          <div aria-hidden="true" title={comingSoonTooltip}>{circleContent}</div>
        )}
        <span className={labelClasses} aria-hidden="true" title={comingSoonTooltip}>
          {label}
        </span>
      </div>
      {!isLast && <div className={lineClasses} aria-hidden="true" />}
    </>
  );
}

function WizardLayout({
  segments,
  onSegmentClick,
  className,
}: {
  segments: PhaseSegment[];
  onSegmentClick?: (phase: number) => void;
  className?: string;
}) {
  const completedCount = segments.filter((s) => s.state === "completed").length;

  return (
    <div
      role="list"
      aria-label={`Phase progress: ${completedCount} of ${segments.length} completed`}
      className={cn(
        "flex items-center overflow-x-auto pb-2",
        "scrollbar-thin scrollbar-thumb-atlas-surface-container-high",
        className,
      )}
    >
      {segments.map((segment, i) => (
        <WizardSegment
          key={segment.phase}
          segment={segment}
          isLast={i === segments.length - 1}
          onClick={onSegmentClick}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Dashboard Layout (compact horizontal bar)
 * ──────────────────────────────────────────────────────────────────────────── */

function DashboardLayout({
  segments,
  onSegmentClick,
  className,
}: {
  segments: PhaseSegment[];
  onSegmentClick?: (phase: number) => void;
  className?: string;
}) {
  const completedCount = segments.filter((s) => s.state === "completed").length;

  return (
    <div
      role="progressbar"
      aria-valuenow={completedCount}
      aria-valuemin={0}
      aria-valuemax={segments.length}
      aria-label={`Phase progress: ${completedCount} of ${segments.length} completed`}
      className={cn("flex items-center", className)}
    >
      {segments.map((segment, i) => {
        const isClickable = segment.state !== "locked" && segment.state !== "coming_soon" && onSegmentClick;
        const isSegmentComingSoon = segment.state === "coming_soon";

        // Circle styles matching sidebar (wizard) layout
        const circleBase = "size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 motion-reduce:transition-none";
        const circleStyle = cn(
          circleBase,
          segment.state === "completed" && "bg-atlas-secondary-container text-atlas-on-secondary-container",
          segment.state === "active" && "bg-atlas-secondary-container text-atlas-on-secondary-container shadow-atlas-glow-amber animate-pulse motion-reduce:animate-none",
          segment.state === "pending" && "bg-atlas-surface-container-high text-atlas-on-surface-variant",
          segment.state === "locked" && "bg-atlas-surface-container-high/50 text-atlas-disabled",
          isSegmentComingSoon && "bg-atlas-surface-container-high/50 text-atlas-disabled opacity-60 cursor-default",
        );

        // Connector line between circles
        const connectorLine = i < segments.length - 1 && (
          <div
            key={`line-${segment.phase}`}
            className={cn(
              "flex-1 h-0.5 mx-0.5",
              segments[i + 1]?.state === "completed" || segment.state === "completed"
                ? "bg-atlas-secondary-container"
                : "bg-atlas-surface-container-high",
            )}
          />
        );

        // Circle content: check for completed, clock for coming_soon, lock for locked, number for others
        const circleContent = segment.state === "completed" ? (
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : isSegmentComingSoon ? (
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ) : segment.state === "locked" ? (
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        ) : (
          <span>{segment.phase}</span>
        );

        const circleElement = isClickable ? (
          <button
            key={segment.phase}
            type="button"
            onClick={() => onSegmentClick(segment.phase)}
            className={cn(circleStyle, "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2")}
            aria-label={`Phase ${segment.phase}: ${segment.label} - completed. Click to navigate.`}
          >
            {circleContent}
          </button>
        ) : (
          <div
            key={segment.phase}
            className={circleStyle}
            title={isSegmentComingSoon && segment.tooltip ? segment.tooltip : `Phase ${segment.phase}: ${segment.label} - ${stateAriaLabels[segment.state]}`}
          >
            {circleContent}
          </div>
        );

        return (
          <React.Fragment key={segment.phase}>
            {circleElement}
            {connectorLine}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Main Component
 * ──────────────────────────────────────────────────────────────────────────── */

function AtlasPhaseProgress({
  segments,
  layout,
  className,
  onSegmentClick,
}: AtlasPhaseProgressProps) {
  if (layout === "wizard") {
    return (
      <WizardLayout
        segments={segments}
        onSegmentClick={onSegmentClick}
        className={className}
      />
    );
  }

  return (
    <DashboardLayout
      segments={segments}
      onSegmentClick={onSegmentClick}
      className={className}
    />
  );
}

export { AtlasPhaseProgress };
export type { AtlasPhaseProgressProps, PhaseSegment, SegmentState };
