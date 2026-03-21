"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";

interface PAConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  featureName: string;
  paCost: number;
  currentBalance: number;
  isLoading?: boolean;
}

export function PAConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  featureName,
  paCost,
  currentBalance,
  isLoading = false,
}: PAConfirmationModalProps) {
  const t = useTranslations("gamification.confirmModal");

  const hasSufficientBalance = currentBalance >= paCost;
  const balanceAfter = currentBalance - paCost;
  const missingAmount = paCost - currentBalance;

  if (!hasSufficientBalance) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          data-testid="pa-confirmation-modal"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-amber-600 dark:text-amber-400">
              {t("insufficientTitle")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {t("insufficientMessage", {
                    cost: paCost,
                    balance: currentBalance,
                  })}
                </p>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  {t("missing", { amount: missingAmount })}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t("close")}
            </Button>
            <Button asChild>
              <Link href="/como-funciona">
                {t("earnMore")}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="pa-confirmation-modal"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>{t("costMessage", { feature: featureName, cost: paCost })}</p>
              <p>{t("currentBalance", { balance: currentBalance })}</p>
              <p className="font-medium text-foreground">
                {t("balanceAfter", { balance: balanceAfter })}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                {t("generate")}
              </span>
            ) : (
              t("generate")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
