"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface WizardFooterProps {
  onBack?: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  secondaryActions?: Array<{ label: string; onClick: () => void }>;
  /** Optional save handler — when provided, renders a 3-button layout (Back / Save / Advance). */
  onSave?: () => void;
  /** Whether the form has unsaved changes. When true and back is clicked, shows confirmation dialog. */
  isDirty?: boolean;
}

export function WizardFooter({
  onBack,
  onPrimary,
  primaryLabel,
  isLoading = false,
  isDisabled = false,
  secondaryActions,
  onSave,
  isDirty = false,
}: WizardFooterProps) {
  const t = useTranslations("common");
  const tFooter = useTranslations("itinerary.wizard.footer");

  const [showDialog, setShowDialog] = useState(false);

  function handleBackClick() {
    if (isDirty && onBack) {
      setShowDialog(true);
    } else if (onBack) {
      onBack();
    }
  }

  function handleDiscard() {
    setShowDialog(false);
    onBack?.();
  }

  function handleSaveAndExit() {
    setShowDialog(false);
    onSave?.();
    onBack?.();
  }

  return (
    <>
      <div
        className="sticky bottom-0 flex items-center justify-between border-t border-border bg-background py-4"
        data-testid="wizard-footer"
      >
        <div>
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBackClick}
              disabled={isLoading}
              data-testid="wizard-back"
            >
              {t("back")}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {secondaryActions?.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="ghost"
              onClick={action.onClick}
              disabled={isLoading}
            >
              {action.label}
            </Button>
          ))}

          {onSave && (
            <Button
              type="button"
              variant="outline"
              onClick={onSave}
              disabled={isLoading}
              data-testid="wizard-save"
            >
              {tFooter("save")}
            </Button>
          )}

          <Button
            type="button"
            onClick={onPrimary}
            disabled={isDisabled || isLoading}
            className="bg-atlas-teal text-white hover:bg-atlas-teal/90"
            data-testid="wizard-primary"
          >
            {isLoading ? (
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

      {/* Unsaved changes confirmation dialog */}
      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="unsaved-dialog-overlay"
          onClick={() => setShowDialog(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowDialog(false);
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-dialog-title"
            className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h3
              id="unsaved-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              {tFooter("unsavedChangesTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {tFooter("unsavedChangesMessage")}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscard}
                data-testid="dialog-discard"
              >
                {tFooter("discard")}
              </Button>
              <Button
                type="button"
                onClick={handleSaveAndExit}
                className="bg-atlas-teal text-white hover:bg-atlas-teal/90"
                data-testid="dialog-save-exit"
              >
                {tFooter("saveAndExit")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
