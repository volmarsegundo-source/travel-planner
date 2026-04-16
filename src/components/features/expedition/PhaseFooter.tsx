"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UnsavedChangesModal } from "./UnsavedChangesModal";

// ─── Props ──────────────────────────────────────────────────────────────────

interface PhaseFooterProps {
  onNext: () => void | Promise<void>;
  onBack?: () => void;
  isSubmitting?: boolean;
  canAdvance?: boolean;
  isLastPhase?: boolean;
  showBackButton?: boolean;
  isDirty?: boolean;
  onSave?: () => void | Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PhaseFooter({
  onNext,
  onBack,
  isSubmitting = false,
  canAdvance = true,
  isLastPhase = false,
  showBackButton = true,
  isDirty = false,
  onSave,
}: PhaseFooterProps) {
  const t = useTranslations("phaseFooter");
  const [showModal, setShowModal] = useState(false);

  function handleBackClick() {
    if (isDirty && onSave && onBack) {
      setShowModal(true);
    } else if (onBack) {
      onBack();
    }
  }

  async function handleSaveAndExit() {
    if (onSave) {
      await onSave();
    }
    setShowModal(false);
    onBack?.();
  }

  function handleDiscardAndExit() {
    setShowModal(false);
    onBack?.();
  }

  const primaryLabel = isLastPhase ? t("finish") : t("next");

  return (
    <>
      <div
        className="sticky bottom-0 flex items-center justify-between border-t border-border bg-background py-4"
        data-testid="phase-footer"
      >
        <div>
          {showBackButton && onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBackClick}
              disabled={isSubmitting}
              className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
              data-testid="phase-footer-back"
            >
              {t("back")}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => onNext()}
            disabled={!canAdvance || isSubmitting}
            className="min-h-[44px] bg-atlas-teal text-white hover:bg-atlas-teal/90 focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
            data-testid="phase-footer-next"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t("saving")}
              </span>
            ) : (
              primaryLabel
            )}
          </Button>
        </div>
      </div>

      <UnsavedChangesModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveAndExit}
        onDiscard={handleDiscardAndExit}
      />
    </>
  );
}
