"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_PASSENGER_STEPPER = 0;
const MAX_PASSENGER_STEPPER = 9;
const MAX_CHILD_AGE = 17;

// ─── Types ──────────────────────────────────────────────────────────────────

interface PassengersStepProps {
  adults: number;
  setAdults: (n: number) => void;
  childrenCount: number;
  setChildrenCount: (n: number) => void;
  childrenAges: number[];
  setChildrenAges: (ages: number[]) => void;
  seniors: number;
  setSeniors: (n: number) => void;
  infants: number;
  setInfants: (n: number) => void;
  totalPassengers: number;
  onNext: () => void;
  onBack: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PassengersStep({
  adults,
  setAdults,
  childrenCount,
  setChildrenCount,
  childrenAges,
  setChildrenAges,
  seniors,
  setSeniors,
  infants,
  setInfants,
  totalPassengers,
  onNext,
  onBack,
}: PassengersStepProps) {
  const t = useTranslations("expedition.phase2");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t("passengers.title")}</h2>

      {/* Adults */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{t("passengers.adults")}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {t("passengers.adultsHint")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAdults(Math.max(1, adults - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
            aria-label={t("passengers.decrease", { type: t("passengers.adults") })}
          >
            -
          </button>
          <span className="min-w-[2rem] text-center text-xl font-bold">
            {adults}
          </span>
          <button
            type="button"
            onClick={() => setAdults(Math.min(MAX_PASSENGER_STEPPER, adults + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
            aria-label={t("passengers.increase", { type: t("passengers.adults") })}
          >
            +
          </button>
        </div>
      </div>

      {/* Children */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{t("passengers.children")}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {t("passengers.childrenHint")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const newCount = Math.max(MIN_PASSENGER_STEPPER, childrenCount - 1);
              setChildrenCount(newCount);
              setChildrenAges(childrenAges.slice(0, newCount));
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
            aria-label={t("passengers.decrease", { type: t("passengers.children") })}
          >
            -
          </button>
          <span className="min-w-[2rem] text-center text-xl font-bold">
            {childrenCount}
          </span>
          <button
            type="button"
            onClick={() => {
              const newCount = Math.min(MAX_PASSENGER_STEPPER, childrenCount + 1);
              setChildrenCount(newCount);
              setChildrenAges([...childrenAges, 5]); // default age 5
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
            aria-label={t("passengers.increase", { type: t("passengers.children") })}
          >
            +
          </button>
        </div>
      </div>

      {/* Children ages */}
      {childrenCount > 0 && (
        <div className="flex flex-wrap gap-2 pl-2">
          {childrenAges.map((age, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <Label htmlFor={`child-age-${idx}`} className="text-xs">
                {t("passengers.childAge", { number: idx + 1 })}
              </Label>
              <select
                id={`child-age-${idx}`}
                value={age}
                onChange={(e) => {
                  const newAges = [...childrenAges];
                  newAges[idx] = parseInt(e.target.value);
                  setChildrenAges(newAges);
                }}
                className="flex h-9 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                {Array.from({ length: MAX_CHILD_AGE + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Seniors */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{t("passengers.seniors")}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {t("passengers.seniorsHint")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSeniors(Math.max(MIN_PASSENGER_STEPPER, seniors - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
            aria-label={t("passengers.decrease", { type: t("passengers.seniors") })}
          >
            -
          </button>
          <span className="min-w-[2rem] text-center text-xl font-bold">
            {seniors}
          </span>
          <button
            type="button"
            onClick={() => setSeniors(Math.min(MAX_PASSENGER_STEPPER, seniors + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
            aria-label={t("passengers.increase", { type: t("passengers.seniors") })}
          >
            +
          </button>
        </div>
      </div>

      {/* Infants */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{t("passengers.infants")}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {t("passengers.infantsHint")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setInfants(Math.max(MIN_PASSENGER_STEPPER, infants - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
            aria-label={t("passengers.decrease", { type: t("passengers.infants") })}
          >
            -
          </button>
          <span className="min-w-[2rem] text-center text-xl font-bold">
            {infants}
          </span>
          <button
            type="button"
            onClick={() => setInfants(Math.min(MAX_PASSENGER_STEPPER, infants + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
            aria-label={t("passengers.increase", { type: t("passengers.infants") })}
          >
            +
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {t("passengers.total", { count: totalPassengers })}
        </p>
        {totalPassengers > 15 && (
          <p className="mt-1 text-xs text-atlas-gold">
            {t("passengers.nearLimit")}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          &larr;
        </Button>
        <Button onClick={onNext} className="flex-[3]">
          {tCommon("next")}
        </Button>
      </div>
    </div>
  );
}
