"use client";

/**
 * Skeleton placeholder for ExpeditionCardRedesigned during loading.
 * Respects prefers-reduced-motion — pulse animation is disabled when active.
 */
export function ExpeditionCardSkeleton() {
  return (
    <div
      className="flex min-h-[180px] flex-col rounded-xl border border-border border-l-4 border-l-gray-200 bg-card p-4 shadow-sm"
      data-testid="expedition-card-skeleton"
      role="listitem"
      aria-hidden="true"
    >
      {/* Header skeleton */}
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted motion-safe:animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted motion-safe:animate-pulse" />
        </div>
        <div className="h-5 w-16 rounded-full bg-muted motion-safe:animate-pulse" />
      </div>

      {/* Dates skeleton */}
      <div className="mt-3">
        <div className="h-3 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
      </div>

      {/* Progress bar skeleton */}
      <div className="mt-auto pt-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-2 flex-1 rounded-sm bg-muted motion-safe:animate-pulse"
            />
          ))}
        </div>
        <div className="mt-1 h-3 w-24 rounded bg-muted motion-safe:animate-pulse" />
      </div>

      {/* CTA skeleton */}
      <div className="mt-3 flex justify-end">
        <div className="h-4 w-20 rounded bg-muted motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
