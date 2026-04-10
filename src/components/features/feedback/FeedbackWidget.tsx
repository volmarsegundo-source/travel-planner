"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { submitFeedbackAction } from "@/server/actions/feedback.actions";
import type { FeedbackInput } from "@/lib/validations/feedback.schema";

// ─── Constants ──────────────────────────────────────────────────────────────

const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 1000;
const SUCCESS_TOAST_DURATION_MS = 3000;

type FeedbackType = "bug" | "suggestion" | "praise";

// ─── Chat Bubble Icon ───────────────────────────────────────────────────────

function ChatBubbleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ─── Type Icons ─────────────────────────────────────────────────────────────

function BugIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 116 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17l-4 1M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h4M18 17l4 1" />
    </svg>
  );
}

function SuggestionIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
    </svg>
  );
}

function PraiseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ─── Close Icon ─────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FeedbackWidget() {
  const t = useTranslations("feedback");
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerButtonRef.current?.focus();
      }

      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-hide success toast
  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), SUCCESS_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  const resetForm = useCallback(() => {
    setFeedbackType("suggestion");
    setMessage("");
    setScreenshotData(null);
    setErrorMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerButtonRef.current?.focus();
  }, []);

  const handleCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      // Capture the viewport, ignoring the modal itself so the screenshot
      // reflects the page the user was on — not the feedback UI.
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el.getAttribute("role") === "dialog" || el.getAttribute("role") === "presentation",
      });
      const dataUrl = canvas.toDataURL("image/png");
      setScreenshotData(dataUrl);
    } catch (err) {
      // Screenshot capture is non-critical — log to console in dev
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[FeedbackWidget] screenshot capture failed:", err);
      }
      setScreenshotData(null);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Auto-capture screenshot when the modal opens.
  // We capture BEFORE the dialog is painted by delaying via a microtask,
  // and ignoreElements above filters out the modal anyway.
  const hasAutoCapturedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !hasAutoCapturedRef.current && !screenshotData) {
      hasAutoCapturedRef.current = true;
      // Small delay so any opening animation/overlay is present but the
      // ignoreElements filter will exclude the modal and backdrop.
      const timer = setTimeout(() => { void handleCapture(); }, 50);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      hasAutoCapturedRef.current = false;
    }
  }, [isOpen, screenshotData, handleCapture]);

  const handleSubmit = useCallback(async () => {
    if (message.length < MESSAGE_MIN_LENGTH) {
      setErrorMessage(t("errorTooShort"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const data: FeedbackInput = {
      type: feedbackType,
      message,
      page: pathname,
      ...(screenshotData ? { screenshotData } : {}),
    };

    try {
      const result = await submitFeedbackAction(data);

      if (result.success) {
        resetForm();
        setIsOpen(false);
        setShowSuccess(true);
        triggerButtonRef.current?.focus();
      } else {
        setErrorMessage(
          result.error === "feedback.errorRateLimit"
            ? t("errorRateLimit")
            : t("errorGeneric"),
        );
      }
    } catch {
      setErrorMessage(t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }, [feedbackType, message, pathname, screenshotData, resetForm, t]);

  const typeButtons: Array<{
    value: FeedbackType;
    label: string;
    icon: React.ReactNode;
  }> = [
    { value: "bug", label: t("typeBug"), icon: <BugIcon /> },
    { value: "suggestion", label: t("typeSuggestion"), icon: <SuggestionIcon /> },
    { value: "praise", label: t("typePraise"), icon: <PraiseIcon /> },
  ];

  return (
    <>
      {/* Success toast */}
      {showSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-6 z-50 rounded-atlas-md bg-atlas-tertiary-container px-4 py-3 text-sm font-atlas-body text-atlas-on-tertiary-container shadow-atlas-md motion-reduce:transition-none"
        >
          {t("success")}
        </div>
      )}

      {/* Floating trigger button */}
      <AtlasButton
        ref={triggerButtonRef}
        variant="primary"
        size="sm"
        onClick={() => {
          setIsOpen(true);
          setErrorMessage(null);
        }}
        className="fixed bottom-6 right-6 z-50 rounded-atlas-full shadow-atlas-lg"
        aria-label={t("buttonLabel")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <ChatBubbleIcon />
        {t("buttonLabel")}
      </AtlasButton>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-6 sm:items-center sm:justify-center"
          role="presentation"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-atlas-scrim/50 motion-reduce:transition-none"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("modalTitle")}
            className="relative z-10 w-full max-w-md rounded-atlas-lg bg-atlas-surface-container-lowest p-6 shadow-atlas-lg motion-reduce:transition-none"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-atlas-headline text-lg text-atlas-on-surface">
                {t("modalTitle")}
              </h2>
              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-atlas-full text-atlas-on-surface-variant hover:bg-atlas-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                aria-label={t("close")}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Type selector */}
            <div className="mb-4 flex gap-2">
              {typeButtons.map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => setFeedbackType(btn.value)}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-atlas-md px-3 py-2 text-sm font-atlas-body transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring ${
                    feedbackType === btn.value
                      ? "bg-atlas-primary-container text-atlas-on-primary-container"
                      : "bg-atlas-surface-container text-atlas-on-surface-variant hover:bg-atlas-surface-container-high"
                  }`}
                  aria-pressed={feedbackType === btn.value}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Message textarea */}
            <div className="mb-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
                placeholder={t("messagePlaceholder")}
                rows={4}
                className="w-full resize-none rounded-atlas-md border border-atlas-outline-variant/30 bg-atlas-surface-container-lowest px-3 py-2 font-atlas-body text-sm text-atlas-on-surface placeholder:text-atlas-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                maxLength={MESSAGE_MAX_LENGTH}
                aria-label={t("messagePlaceholder")}
              />
              <div className="mt-1 text-right text-xs text-atlas-on-surface-variant">
                {message.length}/{MESSAGE_MAX_LENGTH}
              </div>
            </div>

            {/* Screenshot toggle */}
            <div className="mb-4">
              {screenshotData ? (
                <div className="flex items-center gap-2">
                  <img
                    src={screenshotData}
                    alt=""
                    className="h-16 w-24 rounded-atlas-sm border border-atlas-outline-variant/20 object-cover"
                  />
                  <span className="text-sm font-atlas-body text-atlas-tertiary">
                    {t("screenshotCaptured")}
                  </span>
                  <button
                    onClick={() => setScreenshotData(null)}
                    className="ml-auto min-h-[44px] min-w-[44px] text-sm text-atlas-on-surface-variant hover:text-atlas-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                    aria-label={t("close")}
                  >
                    <CloseIcon />
                  </button>
                </div>
              ) : (
                <AtlasButton
                  variant="ghost"
                  size="sm"
                  onClick={handleCapture}
                  disabled={isCapturing}
                  loading={isCapturing}
                >
                  {isCapturing ? t("screenshotCapturing") : t("screenshotLabel")}
                </AtlasButton>
              )}
            </div>

            {/* Error message */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 rounded-atlas-sm bg-atlas-error-container px-3 py-2 text-sm font-atlas-body text-atlas-on-error-container"
              >
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <AtlasButton
              variant="primary"
              size="md"
              fullWidth
              onClick={handleSubmit}
              disabled={isSubmitting || message.length < MESSAGE_MIN_LENGTH}
              loading={isSubmitting}
            >
              {isSubmitting ? t("sending") : t("submit")}
            </AtlasButton>
          </div>
        </div>
      )}
    </>
  );
}
