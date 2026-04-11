"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export type UpsellTrigger =
  | "multi-city"
  | "expeditions-limit"
  | "sonnet-toggle"
  | "pa-insufficient"
  | "generic";

export interface UpsellModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: UpsellTrigger;
}

/**
 * UpsellModal — contextual Premium upsell dialog.
 *
 * Contract (Wave 2/3 shared):
 *  - Parent controls visibility via `open` + `onClose`.
 *  - ESC, overlay click, and the secondary CTA all resolve to `onClose`.
 *  - Primary CTA navigates to /loja?tab=premium and closes the modal.
 *  - Focus trap while open; initial focus on the dialog heading.
 */
export function UpsellModal({ open, onClose, trigger = "generic" }: UpsellModalProps) {
  const t = useTranslations("premium.upsell");
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Store previously focused element + focus the heading on open.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    // Defer focus until after the element is painted.
    const id = window.requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(id);
      // Return focus to whatever was focused before the modal opened.
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  // ESC closes, Tab is trapped inside the dialog.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handlePrimary = useCallback(() => {
    onClose();
    router.push("/loja?tab=premium");
  }, [onClose, router]);

  if (!open) return null;

  const titleKey = `title.${trigger}`;
  const contextKey = `context.${trigger}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      data-testid="upsell-modal-overlay"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsell-modal-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2
            id="upsell-modal-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold text-[#1A3C5E] outline-none dark:text-white"
          >
            {t(titleKey)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring dark:hover:bg-zinc-800"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          {t(contextKey)}
        </p>

        <ul className="mt-4 space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
          <li className="flex items-start gap-2">
            <CheckIcon />
            {t("benefits.multiDest")}
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon />
            {t("benefits.unlimitedExpeditions")}
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon />
            {t("benefits.monthlyPA")}
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon />
            {t("benefits.sonnet")}
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handlePrimary}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#D4AF37] px-4 py-3 text-sm font-bold text-[#1A3C5E] transition-colors hover:bg-[#C29E2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring motion-reduce:transition-none"
          >
            {t("primaryCta")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring motion-reduce:transition-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t("secondaryCta")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2DB8A0]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
