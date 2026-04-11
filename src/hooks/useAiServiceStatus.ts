"use client";

import { useEffect, useRef, useState } from "react";
import { getAiServiceStatusAction, type AiServiceStatusView } from "@/server/actions/ai-governance.actions";

const POLL_INTERVAL_MS = 60_000; // 1 minute
const NEUTRAL: AiServiceStatusView = { available: true, paused: false, warning: false };

/**
 * Client hook that keeps the UI in sync with AI service availability.
 * Polls once per minute; exposes `paused` and `available` for gating
 * generation buttons and rendering the pause banner.
 */
export function useAiServiceStatus(): AiServiceStatusView {
  const [status, setStatus] = useState<AiServiceStatusView>(NEUTRAL);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchStatus(): Promise<void> {
      try {
        const result = await getAiServiceStatusAction();
        if (mountedRef.current && result.success && result.data) {
          setStatus(result.data);
        }
      } catch {
        // Fail-open: on error, stay optimistic (server-side policy is the
        // source of truth; the UI gate is only to improve UX perception).
      }
    }

    void fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
