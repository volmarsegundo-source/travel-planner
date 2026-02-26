"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteTripAction } from "@/server/actions/trip.actions";
import type { Trip } from "@/types/trip.types";

interface DeleteTripDialogProps {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTripDialog({
  trip,
  open,
  onOpenChange,
}: DeleteTripDialogProps) {
  const t = useTranslations("trips");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [confirmValue, setConfirmValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isConfirmed = confirmValue === trip?.title;

  async function handleDelete() {
    if (!trip || !isConfirmed) return;
    setIsDeleting(true);
    setServerError(null);

    const result = await deleteTripAction(trip.id, confirmValue);
    setIsDeleting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["trips"] });
    handleOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setConfirmValue("");
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-label={tCommon("delete")}
        className="w-full max-w-full sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{tCommon("delete")}</DialogTitle>
          {trip && (
            <DialogDescription>
              {t("deleteConfirm")}
            </DialogDescription>
          )}
        </DialogHeader>

        {trip && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{trip.title}</p>

            <div className="space-y-1">
              <Label htmlFor="delete-confirm-input">{t("deleteConfirm")}</Label>
              <Input
                id="delete-confirm-input"
                type="text"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                autoComplete="off"
                aria-describedby={
                  serverError ? "delete-server-error" : undefined
                }
              />
            </div>

            {serverError && (
              <p
                id="delete-server-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {serverError}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? tCommon("loading") : tCommon("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
