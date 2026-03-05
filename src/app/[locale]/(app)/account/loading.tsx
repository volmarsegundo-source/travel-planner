import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <Skeleton className="h-4 w-48 mb-6" />
      {/* Title skeleton */}
      <Skeleton className="h-8 w-40 mb-8" />
      <div className="space-y-8">
        {/* Personal info section */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-6">
          <Skeleton className="h-5 w-48" />
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          {/* Name field */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          {/* Email field */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
        {/* Preferences section */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-6">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
        {/* Submit button */}
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
