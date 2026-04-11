"use client";

import { useEffect, useState } from "react";
import { getSubscriptionStatusAction } from "@/server/actions/subscription.actions";

const POLL_INTERVAL_MS = 60_000;

interface PremiumStatus {
  isPremium: boolean;
  isTrialing: boolean;
  loading: boolean;
}

/**
 * Thin client hook that returns the subscription status of the current user.
 * Polls the server every 60s so in-session upgrades/downgrades are reflected
 * without a full reload.
 *
 * Derives `isPremium`/`isTrialing` from the richer SubscriptionStatusView
 * returned by the Wave 2 server action. On initial render, both flags are
 * `false` (safe default). A short-lived `loading` flag lets callers defer
 * premium-gated UI until the first fetch resolves if they want to avoid a
 * flash of Free → Premium.
 */
export function useIsPremium(): PremiumStatus {
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    isTrialing: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const result = await getSubscriptionStatusAction();
        if (cancelled) return;
        if (result.success && result.data) {
          const isPremium =
            result.data.plan !== "FREE" &&
            (result.data.status === "ACTIVE" ||
              result.data.status === "TRIALING");
          const isTrialing = result.data.status === "TRIALING";
          setStatus({ isPremium, isTrialing, loading: false });
        } else {
          setStatus({ isPremium: false, isTrialing: false, loading: false });
        }
      } catch {
        // Degrade to Free on any error — never leak access.
        if (!cancelled) {
          setStatus({ isPremium: false, isTrialing: false, loading: false });
        }
      }
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
