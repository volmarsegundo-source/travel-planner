"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Input type */
  type?: "text" | "email" | "password" | "search" | "tel";
  /** Visible label text above the input */
  label: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message — replaces helperText when present */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Optional left icon */
  leftIcon?: React.ReactNode;
  /** Unique id — auto-generated if not provided */
  id?: string;
}

const EyeIcon = () => (
  <svg
    className="size-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    className="size-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const AtlasInput = React.forwardRef<HTMLInputElement, AtlasInputProps>(
  function AtlasInput(
    {
      className,
      type = "text",
      label,
      helperText,
      error,
      required,
      leftIcon,
      id: idProp,
      disabled,
      ...props
    },
    ref,
  ) {
    const reactId = React.useId();
    const id = idProp || reactId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const [showPassword, setShowPassword] = React.useState(false);

    const inputType = type === "password" && showPassword ? "text" : type;
    const hasError = Boolean(error);
    const describedBy = hasError ? errorId : helperText ? helperId : undefined;

    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium text-atlas-on-surface-variant",
            disabled && "opacity-50",
          )}
        >
          {label}
          {required && (
            <span className="text-atlas-error ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>

        <div className="relative">
          {leftIcon && (
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-atlas-on-surface-variant"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            type={inputType}
            data-slot="atlas-input"
            disabled={disabled}
            required={required}
            aria-required={required || undefined}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className={cn(
              "w-full min-h-[48px] px-4 py-3 text-base font-atlas-body",
              "bg-atlas-surface-container-low dark:bg-atlas-primary-container/40 text-atlas-on-surface dark:text-atlas-on-primary",
              "placeholder:text-atlas-outline-variant",
              "rounded-lg border",
              "transition-all duration-200 motion-reduce:transition-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
              // Default border
              !hasError && "border-atlas-outline-variant focus:border-atlas-outline focus:bg-atlas-surface-container-lowest",
              // Error state
              hasError && "border-atlas-error focus:border-atlas-error focus-visible:ring-atlas-error",
              // Disabled state
              disabled && "opacity-50 bg-atlas-disabled-bg cursor-not-allowed",
              // Left icon padding
              leftIcon && "pl-12",
              // Password toggle padding
              type === "password" && "pr-12",
            )}
            {...props}
          />

          {type === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "min-w-[44px] min-h-[44px] flex items-center justify-center",
                "text-atlas-on-surface-variant hover:text-atlas-on-surface",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
                "rounded-atlas-md transition-colors duration-200 motion-reduce:transition-none",
              )}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
        </div>

        {hasError && (
          <p id={errorId} className="text-sm text-atlas-error" role="alert">
            {error}
          </p>
        )}

        {!hasError && helperText && (
          <p id={helperId} className="text-sm text-atlas-on-surface-variant">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

export { AtlasInput };
export type { AtlasInputProps };
