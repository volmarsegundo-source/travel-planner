"use client";

import { useState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TRANSPORT_TYPES,
  MAX_TRANSPORT_SEGMENTS,
  type TransportSegmentInput,
} from "@/lib/validations/transport.schema";

// ─── Transport type icons ───────────────────────────────────────────────────

const TRANSPORT_ICONS: Record<string, string> = {
  flight: "\u2708\uFE0F",
  bus: "\uD83D\uDE8C",
  train: "\uD83D\uDE82",
  car: "\uD83D\uDE97",
  ferry: "\u26F4\uFE0F",
  other: "\uD83D\uDCE6",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface TransportStepProps {
  tripId: string;
  initialSegments?: TransportSegmentInput[];
  onSave: (segments: TransportSegmentInput[]) => Promise<void>;
  saving?: boolean;
  /** Pre-fill the first segment's departure place when no data is loaded */
  prefillOrigin?: string | null;
  /** Pre-fill the first segment's arrival place when no data is loaded */
  prefillDestination?: string | null;
  /** Pre-fill the first segment's departure date when no data is loaded */
  prefillStartDate?: string | null;
  /** Callback when segments change (for parent state sync) */
  onChange?: (segments: TransportSegmentInput[]) => void;
}

// ─── Default segment factory ────────────────────────────────────────────────

function createEmptySegment(segmentOrder: number): TransportSegmentInput {
  return {
    transportType: "flight",
    departurePlace: null,
    arrivalPlace: null,
    departureAt: null,
    arrivalAt: null,
    provider: null,
    bookingCode: null,
    estimatedCost: null,
    currency: null,
    notes: null,
    isReturn: false,
    segmentOrder,
  };
}

// ─── Required field asterisk ────────────────────────────────────────────────

function RequiredAsterisk() {
  return <span className="text-destructive" aria-hidden="true">*</span>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TransportStep({
  tripId,
  initialSegments = [],
  onSave: _onSave,
  saving: _saving = false,
  prefillOrigin,
  prefillDestination,
  prefillStartDate,
  onChange,
}: TransportStepProps) {
  const t = useTranslations("expedition.phase4.transport");
  const baseId = useId();

  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [segments, setSegments] = useState<TransportSegmentInput[]>(() => {
    if (initialSegments.length > 0) return initialSegments;

    // Pre-fill the first segment with trip data when no saved segments exist
    const first = createEmptySegment(0);
    if (prefillOrigin) first.departurePlace = prefillOrigin;
    if (prefillDestination) first.arrivalPlace = prefillDestination;
    if (prefillStartDate) {
      try {
        first.departureAt = new Date(prefillStartDate);
      } catch {
        // Invalid date — leave as null
      }
    }
    return [first];
  });

  function handleRoundTripChange(roundTrip: boolean) {
    setIsRoundTrip(roundTrip);
    if (!roundTrip) {
      // Clear return dates and isReturn flag on all segments
      setSegments((prev) =>
        prev.map((seg) => ({ ...seg, isReturn: false, arrivalAt: null }))
      );
    }
  }

  function handleAddSegment() {
    if (segments.length >= MAX_TRANSPORT_SEGMENTS) return;
    setSegments((prev) => {
      const next = [...prev, createEmptySegment(prev.length)];
      onChange?.(next);
      return next;
    });
  }

  function handleRemoveSegment(index: number) {
    setSegments((prev) => {
      const next = prev
        .filter((_, i) => i !== index)
        .map((seg, i) => ({ ...seg, segmentOrder: i }));
      onChange?.(next);
      return next;
    });
  }

  function updateSegment(
    index: number,
    field: keyof TransportSegmentInput,
    value: unknown
  ) {
    setSegments((prev) => {
      const next = prev.map((seg, i) =>
        i === index ? { ...seg, [field]: value } : seg
      );
      onChange?.(next);
      return next;
    });
  }

  function handleTypeSelect(index: number, type: string) {
    updateSegment(index, "transportType", type as TransportSegmentInput["transportType"]);
  }

  const isMaxReached = segments.length >= MAX_TRANSPORT_SEGMENTS;

  return (
    <section aria-labelledby={`transport-title-${tripId}`}>
      <h3
        id={`transport-title-${tripId}`}
        className="text-lg font-semibold text-foreground"
      >
        {t("title")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      {/* Round trip toggle */}
      <div className="mt-4 flex gap-3" role="radiogroup" aria-label={t("roundTrip")} data-testid="round-trip-toggle">
        <button
          type="button"
          role="radio"
          aria-checked={!isRoundTrip}
          onClick={() => handleRoundTripChange(false)}
          className={[
            "rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors",
            !isRoundTrip
              ? "border-atlas-gold bg-atlas-gold/10"
              : "border-border hover:border-atlas-gold/40",
          ].join(" ")}
          data-testid="one-way-option"
        >
          {t("oneWay")}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isRoundTrip}
          onClick={() => handleRoundTripChange(true)}
          className={[
            "rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors",
            isRoundTrip
              ? "border-atlas-gold bg-atlas-gold/10"
              : "border-border hover:border-atlas-gold/40",
          ].join(" ")}
          data-testid="round-trip-option"
        >
          {t("roundTrip")}
        </button>
      </div>

      <div className="mt-4 space-y-6">
        {segments.map((segment, index) => {
          const segId = `${baseId}-seg-${index}`;
          return (
            <div
              key={segId}
              className="rounded-xl border border-border bg-card p-4"
              role="group"
              aria-label={t("segment", { number: index + 1 })}
            >
              {/* Header with segment number and remove button */}
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  {t("segment", { number: index + 1 })}
                </h4>
                {segments.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    onClick={() => handleRemoveSegment(index)}
                    aria-label={`${t("removeSegment")} ${index + 1}`}
                  >
                    {t("removeSegment")}
                  </Button>
                )}
              </div>

              {/* Transport type selector */}
              <div className="mb-4">
                <Label className="mb-2 block text-sm font-medium">
                  {t("transportType")} <RequiredAsterisk />
                </Label>
                <div
                  className="grid grid-cols-3 gap-2 sm:grid-cols-6"
                  role="radiogroup"
                  aria-label={t("transportType")}
                >
                  {TRANSPORT_TYPES.map((type) => {
                    const isSelected = segment.transportType === type;
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
                          {TRANSPORT_ICONS[type] ?? "\uD83D\uDCE6"}
                        </span>
                        <span className="font-medium">{t(`types.${type}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Departure place */}
                <div>
                  <Label htmlFor={`${segId}-departure`}>
                    {t("departurePlace")} <RequiredAsterisk />
                  </Label>
                  <Input
                    id={`${segId}-departure`}
                    placeholder={t("departurePlaceholder")}
                    value={segment.departurePlace ?? ""}
                    onChange={(e) =>
                      updateSegment(index, "departurePlace", e.target.value || null)
                    }
                  />
                </div>

                {/* Arrival place */}
                <div>
                  <Label htmlFor={`${segId}-arrival`}>
                    {t("arrivalPlace")} <RequiredAsterisk />
                  </Label>
                  <Input
                    id={`${segId}-arrival`}
                    placeholder={t("arrivalPlaceholder")}
                    value={segment.arrivalPlace ?? ""}
                    onChange={(e) =>
                      updateSegment(index, "arrivalPlace", e.target.value || null)
                    }
                  />
                </div>

                {/* Departure datetime */}
                <div>
                  <Label htmlFor={`${segId}-departureAt`}>
                    {t("departureAt")} <RequiredAsterisk />
                  </Label>
                  <Input
                    id={`${segId}-departureAt`}
                    type="datetime-local"
                    value={
                      segment.departureAt
                        ? new Date(segment.departureAt).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      updateSegment(
                        index,
                        "departureAt",
                        e.target.value ? new Date(e.target.value) : null
                      )
                    }
                  />
                </div>

                {/* Arrival datetime — only shown for round trip */}
                {isRoundTrip && (
                  <div>
                    <Label htmlFor={`${segId}-arrivalAt`}>
                      {t("arrivalAt")} <RequiredAsterisk />
                    </Label>
                    <Input
                      id={`${segId}-arrivalAt`}
                      type="datetime-local"
                      value={
                        segment.arrivalAt
                          ? new Date(segment.arrivalAt).toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        updateSegment(
                          index,
                          "arrivalAt",
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />
                  </div>
                )}

                {/* Provider */}
                <div>
                  <Label htmlFor={`${segId}-provider`}>
                    {t("provider")}
                  </Label>
                  <Input
                    id={`${segId}-provider`}
                    placeholder={t("providerPlaceholder")}
                    value={segment.provider ?? ""}
                    onChange={(e) =>
                      updateSegment(index, "provider", e.target.value || null)
                    }
                  />
                </div>

                {/* Booking code */}
                <div>
                  <Label htmlFor={`${segId}-bookingCode`}>
                    {t("bookingCode")}
                  </Label>
                  <Input
                    id={`${segId}-bookingCode`}
                    placeholder={t("bookingCodePlaceholder")}
                    value={segment.bookingCode ?? ""}
                    onChange={(e) =>
                      updateSegment(index, "bookingCode", e.target.value || null)
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("bookingCodeHint")}
                  </p>
                </div>

                {/* Estimated cost */}
                <div>
                  <Label htmlFor={`${segId}-cost`}>
                    {t("estimatedCost")}
                  </Label>
                  <Input
                    id={`${segId}-cost`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={segment.estimatedCost ?? ""}
                    onChange={(e) =>
                      updateSegment(
                        index,
                        "estimatedCost",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </div>

                {/* Currency */}
                <div>
                  <Label htmlFor={`${segId}-currency`}>
                    {t("currency")}
                  </Label>
                  <Input
                    id={`${segId}-currency`}
                    maxLength={3}
                    placeholder="BRL"
                    value={segment.currency ?? ""}
                    onChange={(e) =>
                      updateSegment(
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
                <Label htmlFor={`${segId}-notes`}>{t("notes")}</Label>
                <textarea
                  id={`${segId}-notes`}
                  rows={2}
                  maxLength={500}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={segment.notes ?? ""}
                  onChange={(e) =>
                    updateSegment(index, "notes", e.target.value || null)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add segment button */}
      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddSegment}
          disabled={isMaxReached}
          aria-disabled={isMaxReached}
        >
          {isMaxReached
            ? t("maxReached", { max: MAX_TRANSPORT_SEGMENTS })
            : t("addSegment")}
        </Button>
      </div>
    </section>
  );
}
