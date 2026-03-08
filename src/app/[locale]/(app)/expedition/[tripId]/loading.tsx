import { Skeleton } from "@/components/ui/skeleton";

export default function ExpeditionLoading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-md px-4 py-8 sm:px-6">
      {/* Breadcrumb skeleton */}
      <Skeleton className="h-4 w-40 mb-6" />

      {/* Progress bar skeleton */}
      <div className="flex justify-center gap-1.5 mb-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-2 w-6 rounded-full" />
        ))}
      </div>

      {/* Title skeleton */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-36" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* Button skeleton */}
      <Skeleton className="mt-8 h-11 w-full rounded-md" />
    </div>
  );
}
