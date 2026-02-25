"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DestinationSearch } from "./DestinationSearch";
import { createUserTrip } from "@/server/actions/trip.actions";
import {
  TripCreateSchema,
  COVER_GRADIENTS,
} from "@/lib/validations/trip.schema";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errMsg(err: any): string | undefined {
  if (!err) return undefined;
  if (typeof err.message === "string") return err.message;
  return undefined;
}

interface CreateTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_OPTIONS = ["✈️", "🏖️", "🏔️", "🌍", "🗺️", "🏕️", "🛳️", "🎒"];

export function CreateTripModal({ open, onOpenChange }: CreateTripModalProps) {
  const t = useTranslations("trips");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    // zodResolver input/output types diverge for coerce fields — cast via any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(TripCreateSchema) as any,
    defaultValues: {
      travelers: 1,
      budgetCurrency: "BRL",
      coverGradient: "sunset",
    },
  });

  const selectedGradient = watch("coverGradient");
  const selectedEmoji = watch("coverEmoji");

  function handleClose() {
    reset();
    setServerError(null);
    onOpenChange(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    setServerError(null);
    const result = await createUserTrip(data);
    // createUserTrip redirects on success; only reaches here on error
    if (result && !result.success) {
      if (result.code === "TRIP_LIMIT_REACHED") {
        setServerError(t("errors.limitReached"));
      } else {
        setServerError(result.error ?? "Erro ao criar viagem.");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {t("create.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Trip name */}
          <div>
            <label
              htmlFor="trip-title"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Nome da viagem <span aria-hidden="true">*</span>
            </label>
            <input
              id="trip-title"
              type="text"
              placeholder="Ex.: Férias em Portugal"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "trip-title-error" : undefined}
              {...register("title")}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors",
                "placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100",
                errors.title ? "border-red-400" : "border-gray-300",
              )}
            />
            {errMsg(errors.title) && (
              <p id="trip-title-error" className="mt-1 text-xs text-red-600" role="alert">
                {errMsg(errors.title)}
              </p>
            )}
          </div>

          {/* Destination (T-007) */}
          <Controller
            name="destinationName"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <DestinationSearch
                value={field.value ?? ""}
                onChange={(name, placeId) => {
                  field.onChange(name);
                  setValue("destinationPlaceId", placeId);
                }}
                error={errMsg(errors.destinationName)}
              />
            )}
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="trip-start"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {t("create.startDate")}
              </label>
              <input
                id="trip-start"
                type="date"
                {...register("startDate")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label
                htmlFor="trip-end"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {t("create.endDate")}
              </label>
              <input
                id="trip-end"
                type="date"
                {...register("endDate")}
                aria-invalid={!!errors.endDate}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100",
                  errors.endDate ? "border-red-400" : "border-gray-300",
                )}
              />
              {errMsg(errors.endDate) && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errMsg(errors.endDate)}
                </p>
              )}
            </div>
          </div>

          {/* Travelers */}
          <div>
            <label
              htmlFor="trip-travelers"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              {t("create.travelers")}
            </label>
            <input
              id="trip-travelers"
              type="number"
              min={1}
              max={50}
              {...register("travelers", { valueAsNumber: true })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {/* Cover gradient */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Cor do card
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do card">
              {COVER_GRADIENTS.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={selectedGradient === g}
                  onClick={() => setValue("coverGradient", g)}
                  className={cn(
                    "h-8 w-8 rounded-full bg-gradient-to-br transition-all",
                    g === "sunset" && "from-orange-400 to-rose-500",
                    g === "ocean" && "from-cyan-400 to-blue-600",
                    g === "forest" && "from-emerald-400 to-green-700",
                    g === "desert" && "from-amber-400 to-orange-600",
                    g === "aurora" && "from-violet-400 to-indigo-600",
                    g === "city" && "from-slate-500 to-zinc-800",
                    g === "sakura" && "from-pink-300 to-rose-400",
                    g === "alpine" && "from-sky-300 to-blue-500",
                    selectedGradient === g
                      ? "ring-2 ring-gray-900 ring-offset-2"
                      : "opacity-70 hover:opacity-100",
                  )}
                  aria-label={g}
                />
              ))}
            </div>
          </div>

          {/* Cover emoji */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Emoji (opcional)
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Emoji do card">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  role="radio"
                  aria-checked={selectedEmoji === emoji}
                  onClick={() =>
                    setValue(
                      "coverEmoji",
                      selectedEmoji === emoji ? undefined : emoji,
                    )
                  }
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-xl transition-all",
                    selectedEmoji === emoji
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Server error */}
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {t("create.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
