"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const CheckIcon = () => (
  <svg
    className="size-3.5"
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

const CloseIcon = () => (
  <svg
    className="size-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const chipColorMap = {
  default: {
    base: "bg-atlas-surface-container-high text-atlas-on-surface",
    selected:
      "bg-atlas-primary text-atlas-on-primary shadow-atlas-sm",
  },
  primary: {
    base: "bg-atlas-primary-fixed text-atlas-on-primary-fixed",
    selected:
      "bg-atlas-secondary-container text-atlas-primary shadow-atlas-sm",
  },
  success: {
    base: "bg-atlas-success-container text-atlas-on-surface",
    selected: "bg-atlas-success text-white shadow-atlas-sm",
  },
  warning: {
    base: "bg-atlas-warning-container text-atlas-on-surface",
    selected: "bg-atlas-warning text-atlas-primary shadow-atlas-sm",
  },
  danger: {
    base: "bg-atlas-error-container text-atlas-on-error-container",
    selected: "bg-atlas-error text-atlas-on-error shadow-atlas-sm",
  },
} as const;

type ChipColor = keyof typeof chipColorMap;

const chipSizeVariants = cva("", {
  variants: {
    size: {
      sm: "text-xs px-3 min-h-[32px] md:min-h-[28px]",
      md: "text-sm px-4 min-h-[44px] md:min-h-[36px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface AtlasChipProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "color"> {
  /** Chip mode — selectable toggles on/off; removable shows X button */
  mode: "selectable" | "removable";
  /** Color scheme */
  color?: ChipColor;
  /** Size */
  size?: "sm" | "md";
  /** Whether the chip is selected (selectable mode) */
  selected?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selected: boolean) => void;
  /** Callback when the chip is removed */
  onRemove?: () => void;
  /** Disable the chip */
  disabled?: boolean;
  /** Content label */
  children: React.ReactNode;
}

const AtlasChip = React.forwardRef<HTMLButtonElement, AtlasChipProps>(
  function AtlasChip(
    {
      className,
      mode,
      color = "default",
      size = "md",
      selected = false,
      onSelectionChange,
      onRemove,
      disabled = false,
      children,
      ...props
    },
    ref,
  ) {
    const colorStyles = chipColorMap[color];
    const isSelected = mode === "selectable" && selected;

    const handleClick = () => {
      if (disabled) return;
      if (mode === "selectable" && onSelectionChange) {
        onSelectionChange(!selected);
      }
    };

    const handleRemove = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      if (disabled) return;
      onRemove?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (mode === "selectable" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onSelectionChange?.(!selected);
      }
      // Pass through for parent chip-group arrow key navigation
      props.onKeyDown?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        data-slot="atlas-chip"
        data-selected={isSelected || undefined}
        role={mode === "selectable" ? "checkbox" : undefined}
        aria-checked={mode === "selectable" ? selected : undefined}
        aria-pressed={mode === "selectable" ? selected : undefined}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full",
          "font-atlas-body font-medium",
          "transition-all duration-200 motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "select-none cursor-pointer",
          chipSizeVariants({ size }),
          isSelected ? colorStyles.selected : colorStyles.base,
          className,
        )}
        {...props}
      >
        {isSelected && <CheckIcon />}
        <span>{children}</span>
        {mode === "removable" && (
          <span
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={handleRemove}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleRemove(e);
              }
            }}
            aria-label="Remove"
            className={cn(
              "ml-0.5 inline-flex items-center justify-center",
              "min-w-[24px] min-h-[24px] rounded-full",
              "hover:bg-black/10 transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring",
            )}
          >
            <CloseIcon />
          </span>
        )}
      </button>
    );
  },
);

export { AtlasChip };
export type { AtlasChipProps, ChipColor };
