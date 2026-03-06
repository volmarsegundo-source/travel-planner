"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteUserAccountAction } from "@/server/actions/account.actions";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DeleteAccountModalProps {
  userEmail: string;
  onClose: () => void;
}

type ModalStep = "warning" | "confirmation";

// ─── Component ──────────────────────────────────────────────────────────────

export function DeleteAccountModal({
  userEmail,
  onClose,
}: DeleteAccountModalProps) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState<ModalStep>("warning");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Store the element that opened the modal to restore focus on close
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
  }, []);

  // Focus the first interactive element when step changes
  useEffect(() => {
    if (step === "warning") {
      firstFocusableRef.current?.focus();
    } else {
      emailInputRef.current?.focus();
    }
  }, [step]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, []);

  // Focus trap: cycle focus within the modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    []
  );

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }

  function handleProceedToConfirmation() {
    setStep("confirmation");
  }

  async function handleDeleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()) {
      setError(t("errors.emailMismatch"));
      emailInputRef.current?.focus();
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteUserAccountAction({
        confirmEmail: confirmEmail.trim(),
      });

      if (result.success) {
        // Sign out and redirect to landing page
        signOut({ callbackUrl: "/" });
      } else {
        const errorKey = result.error;
        const errorMessage =
          errorKey.startsWith("account.errors.")
            ? t(`errors.${errorKey.replace("account.errors.", "")}`)
            : tCommon("error");
        setError(errorMessage);
        setIsDeleting(false);
      }
    } catch {
      setError(tCommon("error"));
      setIsDeleting(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
        {step === "warning" && (
          <>
            <h2
              id="delete-modal-title"
              className="text-lg font-semibold text-foreground"
            >
              {t("deleteConfirmTitle")}
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              {t("deleteWarning")}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                ref={firstFocusableRef}
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                ref={lastFocusableRef}
                type="button"
                variant="destructive"
                onClick={handleProceedToConfirmation}
              >
                {tCommon("confirm")}
              </Button>
            </div>
          </>
        )}

        {step === "confirmation" && (
          <form onSubmit={handleDeleteAccount} noValidate>
            <h2
              id="delete-modal-title"
              className="text-lg font-semibold text-foreground"
            >
              {t("deleteConfirmTitle")}
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              {t("deleteConfirmMessage")}
            </p>

            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="confirm-email-input">{t("email")}</Label>
              <Input
                ref={emailInputRef}
                id="confirm-email-input"
                type="email"
                value={confirmEmail}
                onChange={(e) => {
                  setConfirmEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t("deleteConfirmPlaceholder")}
                aria-describedby={error ? "delete-error" : undefined}
                aria-invalid={!!error}
                autoComplete="off"
              />
              {error && (
                <p
                  id="delete-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {error}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isDeleting}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                ref={lastFocusableRef}
                type="submit"
                variant="destructive"
                disabled={isDeleting}
              >
                {isDeleting ? tCommon("loading") : t("deleteAccount")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
