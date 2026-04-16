"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Props ──────────────────────────────────────────────────────────────────

interface UnsavedChangesModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function UnsavedChangesModal({
  open,
  onClose,
  onSave,
  onDiscard,
}: UnsavedChangesModalProps) {
  const t = useTranslations("phaseFooter.unsavedChanges");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveAndExit() {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        data-testid="unsaved-changes-modal"
      >
        <DialogHeader>
          <DialogTitle className="font-atlas-headline text-atlas-on-surface">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="font-atlas-body text-atlas-on-surface-variant">
            {t("message")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
            data-testid="unsaved-cancel-btn"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
            className="min-h-[44px] text-atlas-error hover:text-atlas-error focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
            data-testid="unsaved-discard-btn"
          >
            {t("exitWithoutSaving")}
          </Button>
          <Button
            type="button"
            onClick={handleSaveAndExit}
            disabled={isSaving}
            className="min-h-[44px] bg-atlas-teal text-white hover:bg-atlas-teal/90 focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
            data-testid="unsaved-save-btn"
          >
            {isSaving ? t("cancel") : t("saveAndExit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
