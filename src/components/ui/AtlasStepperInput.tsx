"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Icons
 * ──────────────────────────────────────────────────────────────────────────── */

const MinusIcon = () => (
  <svg
    className="size-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const PlusIcon = () => (
  <svg
    className="size-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

interface AtlasStepperInputProps {
  /** Current numeric value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Minimum value (inclusive) */
  min?: number;
  /** Maximum value (inclusive) */
  max?: number;
  /** Increment step size */
  step?: number;
  /** Visible label text */
  label: string;
  /** Localized text for screen readers (e.g., "2 adults") */
  ariaValueText?: string;
  /** Label for the decrease button */
  decreaseLabel?: string;
  /** Label for the increase button */
  increaseLabel?: string;
  /** Disable the stepper */
  disabled?: boolean;
  /** Optional class name */
  className?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Long-press hook
 * ──────────────────────────────────────────────────────────────────────────── */

function useLongPress(callback: () => void, enabled: boolean) {
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    if (!enabled) return;
    // First fire immediately
    callback();
    // Then start long-press: 200ms delay, then 100ms repeats
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(callback, 100);
    }, 200);
  }, [callback, enabled]);

  // Clean up on unmount
  React.useEffect(() => stop, [stop]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────────────── */

const AtlasStepperInput = React.forwardRef<HTMLDivElement, AtlasStepperInputProps>(
  function AtlasStepperInput(
    {
      value,
      onChange,
      min = 0,
      max = 99,
      step = 1,
      label,
      ariaValueText,
      decreaseLabel = "Decrease",
      increaseLabel = "Increase",
      disabled = false,
      className,
    },
    ref,
  ) {
    const clamp = React.useCallback(
      (v: number) => Math.min(max, Math.max(min, v)),
      [min, max],
    );

    const handleDecrement = React.useCallback(() => {
      onChange(clamp(value - step));
    }, [value, step, clamp, onChange]);

    const handleIncrement = React.useCallback(() => {
      onChange(clamp(value + step));
    }, [value, step, clamp, onChange]);

    const atMin = value <= min;
    const atMax = value >= max;

    const decreaseLongPress = useLongPress(handleDecrement, !disabled && !atMin);
    const increaseLongPress = useLongPress(handleIncrement, !disabled && !atMax);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handleIncrement();
          break;
        case "ArrowDown":
          e.preventDefault();
          handleDecrement();
          break;
        case "Home":
          e.preventDefault();
          onChange(min);
          break;
        case "End":
          e.preventDefault();
          onChange(max);
          break;
      }
    };

    const displayValue = String(value).padStart(2, "0");

    const buttonClasses = cn(
      "flex items-center justify-center",
      "size-11 rounded-full",
      "bg-white border border-atlas-outline-variant/30",
      "text-atlas-on-surface",
      "transition-all duration-200 motion-reduce:transition-none",
      "hover:shadow-atlas-sm hover:border-atlas-outline-variant",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "select-none",
    );

    return (
      <div
        ref={ref}
        data-slot="atlas-stepper-input"
        className={cn(
          "inline-flex items-center gap-3 rounded-lg",
          "bg-atlas-surface-container-low p-3",
          disabled && "opacity-50",
          className,
        )}
      >
        <span className="text-sm font-medium text-atlas-on-surface-variant mr-2">
          {label}
        </span>

        <div
          role="spinbutton"
          tabIndex={disabled ? -1 : 0}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={ariaValueText}
          aria-label={label}
          aria-disabled={disabled || undefined}
          onKeyDown={handleKeyDown}
          className="inline-flex items-center gap-3 focus-visible:outline-none"
        >
          <button
            type="button"
            disabled={disabled || atMin}
            aria-label={decreaseLabel}
            tabIndex={-1}
            className={buttonClasses}
            {...decreaseLongPress}
          >
            <MinusIcon />
          </button>

          <span
            className="min-w-[32px] text-center text-sm font-bold text-atlas-on-surface select-none"
            aria-hidden="true"
          >
            {displayValue}
          </span>

          <button
            type="button"
            disabled={disabled || atMax}
            aria-label={increaseLabel}
            tabIndex={-1}
            className={buttonClasses}
            {...increaseLongPress}
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    );
  },
);

export { AtlasStepperInput };
export type { AtlasStepperInputProps };
