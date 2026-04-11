"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AtlasButton } from "@/components/ui";
import { DestinationAutocomplete } from "./DestinationAutocomplete";

const INPUT_CLASSES =
  "w-full min-h-[44px] px-3 py-2 text-sm font-atlas-body bg-atlas-surface-container-lowest text-atlas-on-surface rounded-md border border-atlas-outline-variant transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 disabled:opacity-50";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DestinationDraft {
  /** Defined for persisted rows, undefined for new rows. */
  id?: string;
  order: number;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  /** ISO date strings (YYYY-MM-DD). */
  startDate?: string;
  endDate?: string;
  /** Optional. If omitted and both dates are present, callers can derive it. */
  nights?: number;
}

export interface MultiCitySelectorProps {
  value: DestinationDraft[];
  onChange: (next: DestinationDraft[]) => void;
  maxCities: number;
  isPremium: boolean;
  onUpsellRequested: () => void;
  tripStartDate?: Date;
  tripEndDate?: Date;
  disabled?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ABSOLUTE_MAX_CITIES = 4;
const MAX_CITY_NAME_LENGTH = 150;

// ─── Helpers ────────────────────────────────────────────────────────────────

function nightsBetween(startIso?: string, endIso?: string): number | undefined {
  if (!startIso || !endIso) return undefined;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return undefined;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function emptyRow(order: number): DestinationDraft {
  return { order, city: "" };
}

function reindex(rows: DestinationDraft[]): DestinationDraft[] {
  return rows.map((row, idx) => ({ ...row, order: idx }));
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MultiCitySelector({
  value,
  onChange,
  maxCities,
  isPremium,
  onUpsellRequested,
  disabled = false,
}: MultiCitySelectorProps) {
  const t = useTranslations("expedition.phase1");

  // Defensive clamping. Consumers should guarantee 1..maxCities but we never
  // render more than the absolute ceiling regardless of bad inputs.
  const effectiveMax = Math.min(
    Math.max(1, maxCities),
    ABSOLUTE_MAX_CITIES
  );

  const rows = useMemo(() => {
    if (value.length === 0) {
      return [emptyRow(0)];
    }
    return value;
  }, [value]);

  const totals = useMemo(() => {
    const totalNights = rows.reduce((sum, row) => {
      const n = row.nights ?? nightsBetween(row.startDate, row.endDate);
      return sum + (n ?? 0);
    }, 0);
    return { count: rows.length, nights: totalNights };
  }, [rows]);

  const canAdd = rows.length < effectiveMax;

  const handleAddRow = useCallback(() => {
    // Free users who already have 1 city can't add more — trigger upsell.
    if (!isPremium && rows.length >= 1) {
      onUpsellRequested();
      return;
    }
    if (rows.length >= effectiveMax) return;
    const next = reindex([...rows, emptyRow(rows.length)]);
    onChange(next);
  }, [isPremium, rows, effectiveMax, onChange, onUpsellRequested]);

  const handleRemoveRow = useCallback(
    (index: number) => {
      if (rows.length <= 1) return;
      const next = reindex(rows.filter((_, idx) => idx !== index));
      onChange(next);
    },
    [rows, onChange]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...rows];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(reindex(next));
    },
    [rows, onChange]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= rows.length - 1) return;
      const next = [...rows];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      onChange(reindex(next));
    },
    [rows, onChange]
  );

  const updateRow = useCallback(
    (index: number, patch: Partial<DestinationDraft>) => {
      const next = rows.map((row, idx) =>
        idx === index ? { ...row, ...patch } : row
      );
      onChange(reindex(next));
    },
    [rows, onChange]
  );

  const addButtonLabel = !isPremium && rows.length >= 1
    ? t("unlockPremium")
    : t("addCity");

  return (
    <div className="flex flex-col gap-4" data-testid="multi-city-selector">
      <div
        role="status"
        aria-live="polite"
        className="font-atlas-body text-sm text-atlas-on-surface-variant"
        data-testid="multi-city-summary"
      >
        {t("citiesSummary", { count: totals.count, nights: totals.nights })}
      </div>

      <ol
        role="list"
        className="flex flex-col gap-4"
        aria-label={t("citiesListLabel")}
      >
        {rows.map((row, index) => {
          const computedNights =
            row.nights ?? nightsBetween(row.startDate, row.endDate);
          const rowLabel = t("cityOrdinal", { index: index + 1 });
          const isFirst = index === 0;
          const isLast = index === rows.length - 1;
          const canRemove = rows.length > 1;

          return (
            <li
              key={`${row.id ?? "new"}-${index}`}
              role="listitem"
              data-testid={`multi-city-row-${index}`}
              className="rounded-lg border border-atlas-outline-variant bg-atlas-surface-container-low p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-2">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={disabled || isFirst}
                    aria-label={t("moveUp", { index: index + 1 })}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-atlas-on-surface-variant transition-colors duration-150 motion-reduce:transition-none hover:bg-atlas-surface-container disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
                    data-testid={`move-up-${index}`}
                  >
                    <span aria-hidden="true">{"\u25B2"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={disabled || isLast}
                    aria-label={t("moveDown", { index: index + 1 })}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-atlas-on-surface-variant transition-colors duration-150 motion-reduce:transition-none hover:bg-atlas-surface-container disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
                    data-testid={`move-down-${index}`}
                  >
                    <span aria-hidden="true">{"\u25BC"}</span>
                  </button>
                </div>

                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-atlas-body text-sm font-medium text-atlas-on-surface">
                      {rowLabel}
                    </span>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        disabled={disabled}
                        aria-label={t("removeCity", { index: index + 1 })}
                        className="inline-flex h-11 min-w-11 items-center justify-center rounded-md px-2 font-atlas-body text-sm text-atlas-error transition-colors duration-150 motion-reduce:transition-none hover:bg-atlas-error-container disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
                        data-testid={`remove-city-${index}`}
                      >
                        {t("removeCityShort")}
                      </button>
                    )}
                  </div>

                  <label className="mb-1.5 block font-atlas-body text-xs font-medium text-atlas-on-surface-variant">
                    {t("cityFieldLabel")}
                  </label>
                  <DestinationAutocomplete
                    value={row.city}
                    onChange={(newValue) => {
                      if (newValue.length <= MAX_CITY_NAME_LENGTH) {
                        updateRow(index, {
                          city: newValue,
                          // Clear coordinates when user types manually; the
                          // onSelect handler will refill them on a pick.
                          latitude: undefined,
                          longitude: undefined,
                          country: undefined,
                        });
                      }
                    }}
                    onSelect={(result) => {
                      updateRow(index, {
                        city: result.displayName,
                        latitude: result.lat,
                        longitude: result.lon,
                        country: result.country ?? undefined,
                      });
                    }}
                    placeholder={t("destinationPlaceholder")}
                    disabled={disabled}
                  />

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`multi-city-start-${index}`}
                        className="font-atlas-body text-xs font-medium text-atlas-on-surface-variant"
                      >
                        {t("step3.startDate")}
                      </label>
                      <input
                        id={`multi-city-start-${index}`}
                        type="date"
                        value={row.startDate ?? ""}
                        onChange={(event) =>
                          updateRow(index, {
                            startDate: event.target.value || undefined,
                          })
                        }
                        disabled={disabled}
                        className={INPUT_CLASSES}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`multi-city-end-${index}`}
                        className="font-atlas-body text-xs font-medium text-atlas-on-surface-variant"
                      >
                        {t("step3.endDate")}
                      </label>
                      <input
                        id={`multi-city-end-${index}`}
                        type="date"
                        value={row.endDate ?? ""}
                        onChange={(event) =>
                          updateRow(index, {
                            endDate: event.target.value || undefined,
                          })
                        }
                        disabled={disabled}
                        className={INPUT_CLASSES}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`multi-city-nights-${index}`}
                        className="font-atlas-body text-xs font-medium text-atlas-on-surface-variant"
                      >
                        {t("nights")}
                      </label>
                      <input
                        id={`multi-city-nights-${index}`}
                        type="number"
                        min={0}
                        max={365}
                        value={
                          row.nights !== undefined
                            ? String(row.nights)
                            : computedNights !== undefined
                              ? String(computedNights)
                              : ""
                        }
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (raw === "") {
                            updateRow(index, { nights: undefined });
                            return;
                          }
                          const parsed = Number.parseInt(raw, 10);
                          if (
                            Number.isFinite(parsed) &&
                            parsed >= 0 &&
                            parsed <= 365
                          ) {
                            updateRow(index, { nights: parsed });
                          }
                        }}
                        disabled={disabled}
                        className={INPUT_CLASSES}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div>
        <AtlasButton
          type="button"
          variant={!isPremium && rows.length >= 1 ? "secondary" : "primary"}
          onClick={handleAddRow}
          disabled={disabled || (isPremium && !canAdd)}
          data-testid="add-city-button"
        >
          {addButtonLabel}
        </AtlasButton>
        {isPremium && !canAdd && (
          <p className="mt-2 font-atlas-body text-xs text-atlas-on-surface-variant">
            {t("maxCitiesReached", { max: effectiveMax })}
          </p>
        )}
      </div>
    </div>
  );
}
