"use client";

import { ErrorBoundaryCard } from "@/components/features/error/ErrorBoundaryCard";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ExpeditionError({ error: _error, reset }: ErrorProps) {
  return <ErrorBoundaryCard reset={reset} />;
}
