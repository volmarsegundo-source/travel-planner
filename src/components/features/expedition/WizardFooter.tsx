"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// ─── Dialog intent state machine ────────────────────────────────────────────

type DialogIntent = null | "back" | "advance";

// ─── Props ──────────────────────────────────────────────────────────────────

interface WizardFooterProps {
  onBack?: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  secondaryActions?: Array<{ label: string; onClick: () => void }>;
  /** Optional save handler — when provided, renders a 3-button layout (Back / Save / Advance). */
  onSave?: () => void | Promise<void>;
  /** Whether the form has unsaved changes. When true and back/advance is clicked, shows confirmation dialog. */
  isDirty?: boolean;
  /** Whether the save just succeeded — shows success indication */
  saveSuccess?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WizardFooter({
  onBack,
  onPrimary,
  primaryLabel,
  isLoading = false,
  isDisabled = false,
  secondaryActions,
  onSave,
  isDirty = false,
  saveSuccess = false,
}: WizardFooterProps) {
  const t = useTranslations("common");
  const tFooter = useTranslations("itinerary.wizard.footer");

  const [dialogIntent, setDialogIntent] = useState<DialogIntent>(null);

  function handleBackClick() {
    if (isDirty && onSave && onBack) {
      setDialogIntent("back");
    } else if (onBack) {
      onBack();
    }
  }

  function handlePrimaryClick() {
    if (isDirty && onSave) {
      setDialogIntent("advance");
    } else {
      onPrimary();
    }
  }

  function handleCancel() {
    setDialogIntent(null);
  }

  // ─── Back dialog actions ────────────────────────────────────────────────

  async function handleSaveAndBack() {
    setDialogIntent(null);
    await onSave?.();
    onBack?.();
  }

  function handleDiscardAndBack() {
    setDialogIntent(null);
    onBack?.();
  }

  // ─── Advance dialog actions ─────────────────────────────────────────────

  async function handleSaveAndAdvance() {
    setDialogIntent(null);
    await onSave?.();
    onPrimary();
  }

  function handleAdvanceWithoutSaving() {
    setDialogIntent(null);
    onPrimary();
  }

  // ─── Save button handler ────────────────────────────────────────────────

  async function handleSaveClick() {
    await onSave?.();
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveClick}
                disabled={isLoading}
                data-testid="wizard-save"
              >
                {tFooter("save")}
              </Button>
              {saveSuccess && (
                <span
                  className="text-sm text-atlas-teal"
                  data-testid="save-success-indicator"
                >
                  {tFooter("dataSaved")}
                </span>
              )}
            </div>
          )}

          <Button
            type="button"
            onClick={onSave ? handlePrimaryClick : onPrimary}
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
      {dialogIntent !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="unsaved-dialog-overlay"
          onClick={handleCancel}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
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
              {dialogIntent === "back"
                ? tFooter("saveBeforeBack")
                : tFooter("unsavedChangesTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {tFooter("unsavedChangesMessage")}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                data-testid="dialog-cancel"
              >
                {tFooter("cancel")}
              </Button>

              {dialogIntent === "back" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDiscardAndBack}
                    data-testid="dialog-discard"
                  >
                    {tFooter("discard")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveAndBack}
                    className="bg-atlas-teal text-white hover:bg-atlas-teal/90"
                    data-testid="dialog-save-back"
                  >
                    {tFooter("saveAndBack")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAdvanceWithoutSaving}
                    data-testid="dialog-advance-without-saving"
                  >
                    {tFooter("advanceWithoutSaving")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveAndAdvance}
                    className="bg-atlas-teal text-white hover:bg-atlas-teal/90"
                    data-testid="dialog-save-advance"
                  >
                    {tFooter("saveAndAdvance")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
