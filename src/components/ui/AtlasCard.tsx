"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const atlasCardVariants = cva(
  [
    "flex flex-col bg-atlas-surface-container-lowest text-atlas-on-surface",
    "transition-all duration-200 motion-reduce:transition-none",
  ].join(" "),
  {
    variants: {
      variant: {
        base: [
          "border border-atlas-outline-variant/20",
          "rounded-atlas-lg",
          "shadow-atlas-sm",
          "p-6",
        ].join(" "),
        elevated: [
          "rounded-atlas-xl",
          "shadow-atlas-md",
          "p-6",
        ].join(" "),
        dark: [
          "bg-atlas-primary-container text-atlas-on-primary",
          "rounded-atlas-xl",
          "p-6",
        ].join(" "),
        interactive: [
          "border border-atlas-outline-variant/10",
          "rounded-atlas-xl",
          "shadow-atlas-sm",
          "p-6",
          "cursor-pointer",
          "hover:shadow-atlas-md hover:scale-[1.02]",
          "motion-reduce:hover:scale-100",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "base",
    },
  },
);

type AtlasCardVariantProps = VariantProps<typeof atlasCardVariants>;

interface AtlasCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    AtlasCardVariantProps {
  /** Optional header slot */
  header?: React.ReactNode;
  /** Optional footer slot */
  footer?: React.ReactNode;
  /** Show loading skeleton placeholder */
  loading?: boolean;
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-atlas-lg border border-atlas-outline-variant/20 p-6",
        "shadow-atlas-sm",
        className,
      )}
      aria-hidden="true"
    >
      <div className="space-y-4 animate-pulse motion-reduce:animate-none">
        <div className="h-4 w-2/3 rounded bg-atlas-surface-container-high" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-atlas-surface-container-high" />
          <div className="h-3 w-5/6 rounded bg-atlas-surface-container-high" />
          <div className="h-3 w-4/6 rounded bg-atlas-surface-container-high" />
        </div>
        <div className="h-8 w-1/3 rounded bg-atlas-surface-container-high" />
      </div>
    </div>
  );
}

const AtlasCard = React.forwardRef<HTMLDivElement, AtlasCardProps>(
  function AtlasCard(
    { className, variant = "base", header, footer, loading, children, ...props },
    ref,
  ) {
    if (loading) {
      return <CardSkeleton className={className} />;
    }

    return (
      <div
        ref={ref}
        data-slot="atlas-card"
        data-variant={variant}
        className={cn(atlasCardVariants({ variant }), className)}
        {...props}
      >
        {header && (
          <div data-slot="atlas-card-header" className="mb-4">
            {header}
          </div>
        )}
        <div data-slot="atlas-card-body" className="flex-1">
          {children}
        </div>
        {footer && (
          <div data-slot="atlas-card-footer" className="mt-4 pt-4 border-t border-atlas-outline-variant/10">
            {footer}
          </div>
        )}
      </div>
    );
  },
);

export { AtlasCard, atlasCardVariants };
export type { AtlasCardProps };
