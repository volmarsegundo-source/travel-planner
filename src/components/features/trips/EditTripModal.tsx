"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TripUpdateSchema } from "@/lib/validations/trip.schema";
import { updateTripAction } from "@/server/actions/trip.actions";
import type { TripUpdateInput } from "@/lib/validations/trip.schema";
import type { Trip } from "@/types/trip.types";

interface EditTripModalProps {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTripModal({ trip, open, onOpenChange }: EditTripModalProps) {
  const t = useTranslations("trips");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripUpdateInput>({
    resolver: zodResolver(TripUpdateSchema),
  });

  // Pre-fill form when the selected trip changes.
  useEffect(() => {
    if (trip) {
      reset({
        title: trip.title,
        destination: trip.destination,
        description: trip.description ?? undefined,
        startDate: trip.startDate ? new Date(trip.startDate) : undefined,
        endDate: trip.endDate ? new Date(trip.endDate) : undefined,
        coverGradient: trip.coverGradient,
        coverEmoji: trip.coverEmoji,
        status: trip.status,
        visibility: trip.visibility,
      });
    }
  }, [trip, reset]);

  const startDateValue = watch("startDate");

  async function onSubmit(data: TripUpdateInput) {
    if (!trip) return;
    setServerError(null);
    const result = await updateTripAction(trip.id, data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["trips"] });
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-label={tCommon("edit")}
        className="w-full max-w-full sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{tCommon("edit")}</DialogTitle>
        </DialogHeader>

        <form
          id="edit-trip-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="edit-title">{t("title")}</Label>
            <Input
              id="edit-title"
              type="text"
              autoComplete="off"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "edit-title-error" : undefined}
              {...register("title")}
            />
            {errors.title && (
              <p id="edit-title-error" role="alert" className="text-destructive text-xs">
                {t("errors.titleRequired")}
              </p>
            )}
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <Label htmlFor="edit-destination">{t("destination")}</Label>
            <Input
              id="edit-destination"
              type="text"
              autoComplete="off"
              aria-invalid={!!errors.destination}
              aria-describedby={
                errors.destination ? "edit-destination-error" : undefined
              }
              {...register("destination")}
            />
            {errors.destination && (
              <p id="edit-destination-error" role="alert" className="text-destructive text-xs">
                {t("errors.destinationRequired")}
              </p>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-1">
            <Label htmlFor="edit-start-date">{t("startDate")}</Label>
            <Input
              id="edit-start-date"
              type="date"
              aria-invalid={!!errors.startDate}
              {...register("startDate")}
            />
          </div>

          {/* End date */}
          {startDateValue && (
            <div className="space-y-1">
              <Label htmlFor="edit-end-date">{t("endDate")}</Label>
              <Input
                id="edit-end-date"
                type="date"
                aria-invalid={!!errors.endDate}
                aria-describedby={
                  errors.endDate ? "edit-end-date-error" : undefined
                }
                {...register("endDate")}
              />
              {errors.endDate && (
                <p id="edit-end-date-error" role="alert" className="text-destructive text-xs">
                  {t("errors.endDateBeforeStart")}
                </p>
              )}
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <p role="alert" className="text-destructive text-sm">
              {serverError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="submit"
            form="edit-trip-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? tCommon("loading") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
