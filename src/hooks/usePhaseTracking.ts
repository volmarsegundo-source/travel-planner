"use client";

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";

/**
 * Track phase entry and completion for expedition analytics.
 * Fires `phase_started` on mount and provides `markCompleted` callback.
 */
export function usePhaseTracking(phase: number, tripId: string) {
  const enteredRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enteredRef.current) {
      enteredRef.current = true;
      startTimeRef.current = Date.now();
      track("phase_started", { phase, tripId });
    }
  }, [phase, tripId]);

  const markCompleted = () => {
    const durationMs = Date.now() - startTimeRef.current;
    track("phase_completed", { phase, tripId, durationMs });
  };

  return { markCompleted };
}
