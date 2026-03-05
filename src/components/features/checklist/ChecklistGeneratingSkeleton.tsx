"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

const MESSAGE_KEYS = ["analyzing", "building", "finalizing"] as const;
const ROTATE_INTERVAL_MS = 3000;

export function ChecklistGeneratingSkeleton() {
  const t = useTranslations("checklist.generatingMessages");
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGE_KEYS.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" aria-label={t(MESSAGE_KEYS[messageIndex]!)} className="space-y-6">
      {/* Spinner + message */}
      <div className="flex flex-col items-center gap-3 py-8">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {t(MESSAGE_KEYS[messageIndex]!)}
        </p>
      </div>
      {/* Skeleton categories */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
