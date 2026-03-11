import { Skeleton } from "@/components/ui/skeleton";

export default function TripDetailLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <Skeleton className="h-4 w-64 mb-6" />
      {/* Trip header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
