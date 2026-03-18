export default function AtlasLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 animate-pulse rounded bg-muted" />

      {/* Title skeleton */}
      <div className="mt-4 h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />

      {/* Map skeleton */}
      <div
        className="mt-4 h-[calc(100vh-200px)] min-h-[400px] w-full animate-pulse rounded-xl"
        style={{ backgroundColor: "#0D1B2A" }}
      />
    </div>
  );
}
