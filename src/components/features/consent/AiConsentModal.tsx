"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { recordAiConsentAction } from "@/server/actions/consent.actions";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AiConsentModalProps {
  open: boolean;
  onAccepted: () => void;
  onDeclined: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Non-dismissible consent modal shown before the first AI generation.
 * Uses role="alertdialog" per SPEC-UX-056 Section 4.
 * No X button, no ESC handler, no click-outside-to-close.
 *
 * @see SPEC-PROD-056 AC-CONSENT-001 through AC-CONSENT-005
 * @see SPEC-UX-056 Section 4 (Accessibility Notes)
 */
export function AiConsentModal({
  open,
  onAccepted,
  onDeclined,
}: AiConsentModalProps) {
  const t = useTranslations("consent.modal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus accept button on mount per SPEC-UX-056
  useEffect(() => {
    if (open) {
      // Small delay to ensure the DOM is ready
      const timer = setTimeout(() => {
        acceptButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Block ESC key per AC-CONSENT-004
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

  // Focus trap: cycle through accept, decline, privacy link
  const handleKeyDownInModal = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]'
      );
      const focusable = Array.from(focusableElements);
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [],
  );

  const handleAccept = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await recordAiConsentAction("accepted");
      onAccepted();
    } finally {
      setIsSubmitting(false);
    }
  }, [onAccepted]);

  const handleDecline = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await recordAiConsentAction("refused");
      onDeclined();
    } finally {
      setIsSubmitting(false);
    }
  }, [onDeclined]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop overlay — no click-to-close per AC-CONSENT-004 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 motion-reduce:transition-none"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-body"
        className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg sm:max-w-lg motion-reduce:transition-none"
        onKeyDown={handleKeyDownInModal}
      >
        <h2
          id="consent-title"
          className="text-lg font-atlas-headline font-semibold leading-none text-atlas-on-surface"
        >
          {t("title")}
        </h2>

        <p
          id="consent-body"
          className="mt-4 text-sm font-atlas-body leading-relaxed text-atlas-on-surface-variant"
        >
          {t("body")}
        </p>

        <Link
          href="/privacy"
          className="mt-3 inline-block text-sm font-atlas-body font-medium text-atlas-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 min-h-[44px] flex items-center"
        >
          {t("privacyLink")}
        </Link>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AtlasButton
            variant="secondary"
            onClick={handleDecline}
            disabled={isSubmitting}
            aria-disabled={isSubmitting || undefined}
          >
            {t("declineButton")}
          </AtlasButton>

          <AtlasButton
            ref={acceptButtonRef}
            variant="primary"
            onClick={handleAccept}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {t("acceptButton")}
          </AtlasButton>
        </div>
      </div>
    </>
  );
}
