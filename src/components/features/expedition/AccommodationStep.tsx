"use client";

import { useState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCOMMODATION_TYPES,
  MAX_ACCOMMODATIONS,
  type AccommodationInput,
} from "@/lib/validations/transport.schema";

// ─── Accommodation type icons ───────────────────────────────────────────────

const ACCOMMODATION_ICONS: Record<string, string> = {
  hotel: "\uD83C\uDFE8",
  hostel: "\uD83C\uDFE0",
  airbnb: "\uD83C\uDFE1",
  friends_house: "\uD83C\uDFD8\uFE0F",
  camping: "\u26FA",
  other: "\uD83D\uDCE6",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface AccommodationStepProps {
  tripId: string;
  initialAccommodations?: AccommodationInput[];
  onSave: (accommodations: AccommodationInput[]) => Promise<void>;
  saving?: boolean;
  /** Callback when entries change (for parent state sync) */
  onChange?: (accommodations: AccommodationInput[]) => void;
  /** Trip start date (ISO string) for date validation and pre-fill */
  tripStartDate?: string | null;
  /** Trip end date (ISO string) for date validation and pre-fill */
  tripEndDate?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert an ISO datetime string to a YYYY-MM-DD string for date inputs */
function toDateString(iso: string): string | null {
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return null;
  }
}

// ─── Default entry factory ──────────────────────────────────────────────────

function createEmptyEntry(orderIndex: number, prefillCheckIn?: string | null, prefillCheckOut?: string | null): AccommodationInput {
  return {
    accommodationType: "hotel",
    name: null,
    address: null,
    bookingCode: null,
    checkIn: prefillCheckIn ? new Date(prefillCheckIn) : null,
    checkOut: prefillCheckOut ? new Date(prefillCheckOut) : null,
    estimatedCost: null,
    currency: null,
    notes: null,
    orderIndex,
  };
}

// ─── Required field asterisk ────────────────────────────────────────────────

function RequiredAsterisk() {
  return <span className="text-destructive" aria-hidden="true">*</span>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AccommodationStep({
  tripId,
  initialAccommodations = [],
  onSave: _onSave,
  saving: _saving = false,
  onChange,
  tripStartDate,
  tripEndDate,
}: AccommodationStepProps) {
  const t = useTranslations("expedition.phase4.accommodation");
  const tValidation = useTranslations("expedition.phase4.validation");
  const baseId = useId();

  // Compute date boundaries as YYYY-MM-DD strings for min/max attrs
  const tripStartDateStr = tripStartDate ? toDateString(tripStartDate) : null;
  const tripEndDateStr = tripEndDate ? toDateString(tripEndDate) : null;

  const [dateErrors, setDateErrors] = useState<Record<number, string>>({});
  const [entries, setEntries] = useState<AccommodationInput[]>(
    initialAccommodations.length > 0
      ? initialAccommodations
      : [createEmptyEntry(0, tripStartDate, tripEndDate)]
  );

  function handleAddEntry() {
    if (entries.length >= MAX_ACCOMMODATIONS) return;
    setEntries((prev) => {
      const next = [...prev, createEmptyEntry(prev.length, tripStartDate, tripEndDate)];
      onChange?.(next);
      return next;
    });
  }

  function handleRemoveEntry(index: number) {
    setEntries((prev) => {
      const next = prev
        .filter((_, i) => i !== index)
        .map((entry, i) => ({ ...entry, orderIndex: i }));
      onChange?.(next);
      return next;
    });
  }

  function validateDateForEntry(field: "checkIn" | "checkOut", value: Date | null, index: number, currentEntry: AccommodationInput) {
    if (!value) {
      setDateErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    const checkIn = field === "checkIn" ? value : (currentEntry.checkIn ? new Date(currentEntry.checkIn) : null);
    const checkOut = field === "checkOut" ? value : (currentEntry.checkOut ? new Date(currentEntry.checkOut) : null);
    const start = tripStartDate ? new Date(tripStartDate) : null;
    const end = tripEndDate ? new Date(tripEndDate) : null;

    let error = "";

    if (start && checkIn && checkIn < new Date(start.toISOString().split("T")[0])) {
      error = tValidation("checkInBeforeTripStart");
    } else if (end && checkOut && checkOut > new Date(end.toISOString().split("T")[0] + "T23:59:59")) {
      error = tValidation("checkOutAfterTripEnd");
    } else if (checkIn && checkOut && checkOut < checkIn) {
      error = tValidation("checkOutBeforeCheckIn");
    }

    setDateErrors((prev) => {
      if (!error) {
        const next = { ...prev };
        delete next[index];
        return next;
      }
      return { ...prev, [index]: error };
    });
  }

  function updateEntry(index: number, field: keyof AccommodationInput, value: unknown) {
    setEntries((prev) => {
      const next = prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      );

      // Validate dates when check-in or check-out changes
      if (field === "checkIn" || field === "checkOut") {
        validateDateForEntry(field, value as Date | null, index, next[index]);
      }

      onChange?.(next);
      return next;
    });
  }

  function handleTypeSelect(index: number, type: string) {
    updateEntry(index, "accommodationType", type as AccommodationInput["accommodationType"]);
  }

  const isMaxReached = entries.length >= MAX_ACCOMMODATIONS;

  return (
    <section aria-labelledby={`accommodation-title-${tripId}`}>
      <h3
        id={`accommodation-title-${tripId}`}
        className="text-lg font-semibold text-foreground"
      >
        {t("title")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-4 space-y-6">
        {entries.map((entry, index) => {
          const entryId = `${baseId}-entry-${index}`;
          return (
            <div
              key={entryId}
              className="rounded-xl border border-border bg-card p-4"
              role="group"
              aria-label={t("entry", { number: index + 1 })}
            >
              {/* Header with entry number and remove button */}
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  {t("entry", { number: index + 1 })}
                </h4>
                {entries.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    onClick={() => handleRemoveEntry(index)}
                    aria-label={`${t("removeEntry")} ${index + 1}`}
                  >
                    {t("removeEntry")}
                  </Button>
                )}
              </div>

              {/* Accommodation type selector */}
              <div className="mb-4">
                <Label className="mb-2 block text-sm font-medium">
                  {t("accommodationType")} <RequiredAsterisk />
                </Label>
                <div
                  className="grid grid-cols-3 gap-2 sm:grid-cols-6"
                  role="radiogroup"
                  aria-label={t("accommodationType")}
                >
                  {ACCOMMODATION_TYPES.map((type) => {
                    const isSelected = entry.accommodationType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleTypeSelect(index, type)}
                        className={[
                          "flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-colors text-xs",
                          isSelected
                            ? "border-atlas-gold bg-atlas-gold/10"
                            : "border-border hover:border-atlas-gold/40",
                        ].join(" ")}
                      >
                        <span className="text-lg" aria-hidden="true">
                          {ACCOMMODATION_ICONS[type] ?? "\uD83D\uDCE6"}
                        </span>
                        <span className="font-medium">{t(`types.${type}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <Label htmlFor={`${entryId}-name`}>{t("name")}</Label>
                  <Input
                    id={`${entryId}-name`}
                    placeholder={t("namePlaceholder")}
                    value={entry.name ?? ""}
                    onChange={(e) =>
                      updateEntry(index, "name", e.target.value || null)
                    }
                  />
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor={`${entryId}-address`}>{t("address")}</Label>
                  <Input
                    id={`${entryId}-address`}
                    placeholder={t("addressPlaceholder")}
                    value={entry.address ?? ""}
                    onChange={(e) =>
                      updateEntry(index, "address", e.target.value || null)
                    }
                  />
                </div>

                {/* Booking code */}
                <div>
                  <Label htmlFor={`${entryId}-bookingCode`}>
                    {t("bookingCode")}
                  </Label>
                  <Input
                    id={`${entryId}-bookingCode`}
                    value={entry.bookingCode ?? ""}
                    onChange={(e) =>
                      updateEntry(index, "bookingCode", e.target.value || null)
                    }
                  />
                </div>

                {/* Check-in */}
                <div>
                  <Label htmlFor={`${entryId}-checkIn`}>
                    {t("checkIn")} <RequiredAsterisk />
                  </Label>
                  <Input
                    id={`${entryId}-checkIn`}
                    type="date"
                    value={
                      entry.checkIn
                        ? new Date(entry.checkIn).toISOString().split("T")[0]
                        : ""
                    }
                    min={tripStartDateStr ?? undefined}
                    max={tripEndDateStr ?? undefined}
                    onChange={(e) =>
                      updateEntry(
                        index,
                        "checkIn",
                        e.target.value ? new Date(e.target.value) : null
                      )
                    }
                  />
                </div>

                {/* Check-out */}
                <div>
                  <Label htmlFor={`${entryId}-checkOut`}>
                    {t("checkOut")} <RequiredAsterisk />
                  </Label>
                  <Input
                    id={`${entryId}-checkOut`}
                    type="date"
                    value={
                      entry.checkOut
                        ? new Date(entry.checkOut).toISOString().split("T")[0]
                        : ""
                    }
                    min={tripStartDateStr ?? undefined}
                    max={tripEndDateStr ?? undefined}
                    onChange={(e) =>
                      updateEntry(
                        index,
                        "checkOut",
                        e.target.value ? new Date(e.target.value) : null
                      )
                    }
                  />
                </div>

                {/* Date validation error */}
                {dateErrors[index] && (
                  <div className="sm:col-span-2" data-testid={`date-error-${index}`}>
                    <p className="text-sm text-destructive" role="alert">
                      {dateErrors[index]}
                    </p>
                  </div>
                )}

                {/* Estimated cost */}
                <div>
                  <Label htmlFor={`${entryId}-cost`}>
                    {t("estimatedCost")}
                  </Label>
                  <Input
                    id={`${entryId}-cost`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={entry.estimatedCost ?? ""}
                    onChange={(e) =>
                      updateEntry(
                        index,
                        "estimatedCost",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </div>

                {/* Currency */}
                <div>
                  <Label htmlFor={`${entryId}-currency`}>
                    {t("currency")}
                  </Label>
                  <Input
                    id={`${entryId}-currency`}
                    maxLength={3}
                    placeholder="BRL"
                    value={entry.currency ?? ""}
                    onChange={(e) =>
                      updateEntry(
                        index,
                        "currency",
                        e.target.value.toUpperCase() || null
                      )
                    }
                  />
                </div>
              </div>

              {/* Notes — full width */}
              <div className="mt-4">
                <Label htmlFor={`${entryId}-notes`}>{t("notes")}</Label>
                <textarea
                  id={`${entryId}-notes`}
                  rows={2}
                  maxLength={500}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={entry.notes ?? ""}
                  onChange={(e) =>
                    updateEntry(index, "notes", e.target.value || null)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add entry button */}
      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddEntry}
          disabled={isMaxReached}
          aria-disabled={isMaxReached}
        >
          {isMaxReached
            ? t("maxReached", { max: MAX_ACCOMMODATIONS })
            : t("addEntry")}
        </Button>
      </div>
    </section>
  );
}
