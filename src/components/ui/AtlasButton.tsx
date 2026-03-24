"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const atlasButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-atlas-body",
    "rounded-atlas-md transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    "shrink-0 select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-atlas-secondary-container text-atlas-primary font-bold",
          "shadow-atlas-md shadow-atlas-glow-amber",
          "hover:opacity-90",
        ].join(" "),
        "primary-dark": [
          "bg-atlas-primary text-atlas-on-primary font-bold",
          "shadow-atlas-lg",
          "hover:bg-atlas-primary-container",
        ].join(" "),
        secondary: [
          "bg-atlas-surface-container-lowest text-atlas-primary font-bold",
          "border border-atlas-outline-variant/20",
          "shadow-atlas-sm",
          "hover:shadow-atlas-md",
        ].join(" "),
        ghost: [
          "bg-transparent text-atlas-on-surface-variant font-medium",
          "hover:text-atlas-on-surface hover:bg-atlas-surface-container-low",
        ].join(" "),
        glass: [
          "bg-white/10 backdrop-blur text-white font-bold",
          "border border-white/30",
          "hover:bg-white/20",
        ].join(" "),
        "icon-only": [
          "bg-transparent text-atlas-on-surface-variant",
          "hover:bg-atlas-surface-container-low hover:text-atlas-on-surface",
          "rounded-atlas-full",
        ].join(" "),
        danger: [
          "bg-atlas-error text-atlas-on-error font-bold",
          "shadow-atlas-sm",
          "hover:bg-atlas-error/90",
        ].join(" "),
      },
      size: {
        sm: "h-9 min-h-[36px] px-4 py-2 text-sm font-semibold min-w-[44px]",
        md: "h-11 min-h-[44px] px-6 py-3 text-sm font-bold",
        lg: "h-12 min-h-[48px] px-8 py-4 text-base font-bold",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type AtlasButtonVariantProps = VariantProps<typeof atlasButtonVariants>;

interface AtlasButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    AtlasButtonVariantProps {
  /** Show loading spinner and disable interactions */
  loading?: boolean;
  /** Icon rendered before children */
  leftIcon?: React.ReactNode;
  /** Icon rendered after children */
  rightIcon?: React.ReactNode;
  /** Stretch to full width of parent */
  fullWidth?: boolean;
  /** Render as child element (e.g. for link buttons via Radix Slot) */
  asChild?: boolean;
}

const Spinner = React.memo(function Spinner() {
  return (
    <svg
      className="size-4 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
});

const AtlasButton = React.forwardRef<HTMLButtonElement, AtlasButtonProps>(
  function AtlasButton(
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const Comp = asChild ? Slot.Root : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        ref={ref}
        data-slot="atlas-button"
        data-variant={variant}
        data-size={size}
        data-loading={loading || undefined}
        className={cn(
          atlasButtonVariants({ variant, size }),
          fullWidth && "w-full",
          className,
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  },
);

export { AtlasButton, atlasButtonVariants };
export type { AtlasButtonProps };
