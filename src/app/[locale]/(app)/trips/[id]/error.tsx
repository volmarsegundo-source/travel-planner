"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorBoundaryCard } from "@/components/features/error/ErrorBoundaryCard";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TripError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorBoundaryCard reset={reset} />;
}
