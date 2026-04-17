"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LOCAL_MOBILITY_OPTIONS } from "@/lib/validations/transport.schema";

// ─── Icon mapping for mobility options ──────────────────────────────────────

const MOBILITY_ICONS: Record<string, string> = {
  public_transit: "\uD83D\uDE87",
  taxi_rideshare: "\uD83D\uDE95",
  walking: "\uD83D\uDEB6",
  bicycle: "\uD83D\uDEB2",
  private_transfer: "\uD83D\uDE90",
  car_rental: "\uD83D\uDE97",
  other: "\uD83D\uDCE6",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface MobilityStepProps {
  tripId: string;
  initialMobility?: string[];
  onSave: (mobility: string[]) => Promise<void>;
  saving?: boolean;
  /** Callback when selection changes (for parent state sync) */
  onChange?: (mobility: string[]) => void;
}

// ─── Required field asterisk ────────────────────────────────────────────────

function RequiredAsterisk() {
  return <span className="text-destructive" aria-hidden="true">*</span>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MobilityStep({
  tripId,
  initialMobility = [],
  onSave: _onSave,
  saving: _saving = false,
  onChange,
}: MobilityStepProps) {
  const t = useTranslations("expedition.phase4.mobility");
  const [selected, setSelected] = useState<string[]>(initialMobility);

  function handleToggle(option: string) {
    setSelected((prev) => {
      const next = prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option];
      onChange?.(next);
      return next;
    });
  }

  return (
    <section aria-labelledby={`mobility-title-${tripId}`}>
      <h3
        id={`mobility-title-${tripId}`}
        className="text-lg font-semibold text-foreground"
      >
        {t("title")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <p className="mt-2 text-xs text-muted-foreground">
        {t("hint")} <RequiredAsterisk />
      </p>

      <div
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        role="group"
        aria-label={t("title")}
      >
        {LOCAL_MOBILITY_OPTIONS.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleToggle(option)}
              className={[
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors",
                "min-h-[80px]",
                isSelected
                  ? "border-atlas-gold bg-atlas-gold/10"
                  : "border-border hover:border-atlas-gold/40",
              ].join(" ")}
            >
              <span className="text-2xl" aria-hidden="true">
                {MOBILITY_ICONS[option] ?? "\uD83D\uDCE6"}
              </span>
              <span className="text-sm font-medium">
                {t(`options.${option}`)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
