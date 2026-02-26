import { Skeleton } from "@/components/ui/skeleton";

export function TripCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border bg-card shadow-sm">
      {/* Cover */}
      <Skeleton className="h-32 w-full rounded-none" />

      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />

        {/* Destination */}
        <Skeleton className="h-4 w-1/2" />

        {/* Dates */}
        <Skeleton className="h-4 w-2/3" />

        {/* Footer row: status badge + actions */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
