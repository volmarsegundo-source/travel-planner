"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Info, X } from "lucide-react";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

// ─── Constants ───────────────────────────────────────────────────────────────

const DISMISS_KEY = "atlas_phase_reorder_banner_dismissed";

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * PhaseReorderBanner — one-time informational banner for the Sprint 44 phase reorder.
 *
 * Only renders when:
 *   1. The PHASE_REORDER_ENABLED feature flag is ON.
 *   2. The user has NOT previously dismissed the banner (localStorage key absent).
 *
 * Design: SPEC-UX-REORDER-PHASES §9.3
 * - Background: --color-secondary-light (#E8F0F7)
 * - Icon: Info (Lucide), color --color-secondary
 * - role="status" + aria-live="polite"
 * - Dismiss persisted in localStorage (not a blocking modal)
 * - prefers-reduced-motion: no animation on enter/exit
 */
export function PhaseReorderBanner() {
  const t = useTranslations("phaseReorderBanner");
  const [visible, setVisible] = useState(false);

  // Read localStorage after mount (client-only) to avoid hydration mismatch
  useEffect(() => {
    if (!isPhaseReorderEnabled()) return;
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="phase-reorder-banner"
      className="mb-6 flex items-start gap-3 rounded-lg border border-[#C8DFF0] bg-[#E8F0F7] p-4 motion-reduce:transition-none"
    >
      {/* Info icon */}
      <Info
        className="mt-0.5 h-5 w-5 shrink-0 text-[#1A3C5E]"
        aria-hidden="true"
      />

      {/* Message + actions */}
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm text-[#1A3C5E]" data-testid="phase-reorder-banner-message">
          {t("message")}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <a
            href={t("learnMoreHref")}
            className="text-sm font-medium text-[#1A3C5E] underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3C5E] focus-visible:ring-offset-2 rounded"
            data-testid="phase-reorder-banner-learn-more"
          >
            {t("learnMore")}
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t("dismissAriaLabel")}
            data-testid="phase-reorder-banner-dismiss"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-sm font-medium text-[#1A3C5E] hover:bg-[#C8DFF0]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3C5E] focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none"
          >
            <span className="hidden sm:inline mr-1">{t("dismiss")}</span>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
