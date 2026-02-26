"use client";
import { useState } from "react";
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
import { TripCreateSchema } from "@/lib/validations/trip.schema";
import { createTripAction } from "@/server/actions/trip.actions";
import type { TripCreateInput } from "@/lib/validations/trip.schema";

interface CreateTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTripModal({ open, onOpenChange }: CreateTripModalProps) {
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
  } = useForm<TripCreateInput>({
    resolver: zodResolver(TripCreateSchema),
    defaultValues: {
      coverGradient: "sunset",
      coverEmoji: "✈️",
    },
  });

  const startDateValue = watch("startDate");

  async function onSubmit(data: TripCreateInput) {
    setServerError(null);
    const result = await createTripAction(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["trips"] });
    reset();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-label={t("newTrip")}
        className="w-full max-w-full sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{t("newTrip")}</DialogTitle>
        </DialogHeader>

        <form
          id="create-trip-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="create-title">{t("title")}</Label>
            <Input
              id="create-title"
              type="text"
              autoComplete="off"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "create-title-error" : undefined}
              {...register("title")}
            />
            {errors.title && (
              <p id="create-title-error" role="alert" className="text-destructive text-xs">
                {t("errors.titleRequired")}
              </p>
            )}
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <Label htmlFor="create-destination">{t("destination")}</Label>
            <Input
              id="create-destination"
              type="text"
              autoComplete="off"
              aria-invalid={!!errors.destination}
              aria-describedby={
                errors.destination ? "create-destination-error" : undefined
              }
              {...register("destination")}
            />
            {errors.destination && (
              <p id="create-destination-error" role="alert" className="text-destructive text-xs">
                {t("errors.destinationRequired")}
              </p>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-1">
            <Label htmlFor="create-start-date">{t("startDate")}</Label>
            <Input
              id="create-start-date"
              type="date"
              aria-invalid={!!errors.startDate}
              {...register("startDate")}
            />
          </div>

          {/* End date — shown only when start date is selected */}
          {startDateValue && (
            <div className="space-y-1">
              <Label htmlFor="create-end-date">{t("endDate")}</Label>
              <Input
                id="create-end-date"
                type="date"
                aria-invalid={!!errors.endDate}
                aria-describedby={
                  errors.endDate ? "create-end-date-error" : undefined
                }
                {...register("endDate")}
              />
              {errors.endDate && (
                <p id="create-end-date-error" role="alert" className="text-destructive text-xs">
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
            form="create-trip-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? tCommon("loading") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
