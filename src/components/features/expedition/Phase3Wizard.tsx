"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PhaseShell } from "./PhaseShell";
import {
  togglePhase3ItemAction,
  advanceFromPhaseAction,
} from "@/server/actions/expedition.actions";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";

interface ChecklistItemData {
  id: string;
  itemKey: string;
  required: boolean;
  completed: boolean;
  deadline: string | null;
  pointsValue: number;
}

interface Phase3WizardProps {
  tripId: string;
  items: ChecklistItemData[];
  tripType: string;
  destination: string;
  currentPhase?: number;
  /** Access mode from navigation engine */
  accessMode?: PhaseAccessMode;
  /** Trip's current phase from DB */
  tripCurrentPhase?: number;
  /** Completed phase numbers from DB */
  completedPhases?: number[];
}

export function Phase3Wizard({
  tripId,
  items: initialItems,
  tripType,
  destination,
  currentPhase,
  accessMode = "first_visit",
  tripCurrentPhase = 3,
  completedPhases = [],
}: Phase3WizardProps) {
  const t = useTranslations("expedition.phase3");
  const tExpedition = useTranslations("expedition");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const isEditMode = accessMode === "revisit";
  const isRevisiting = currentPhase !== undefined && currentPhase > 3;

  const [items, setItems] = useState(initialItems);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itemPoints, setItemPoints] = useState<{
    key: string;
    points: number;
  } | null>(null);

  const requiredItems = items.filter((i) => i.required);
  const recommendedItems = items.filter((i) => !i.required);
  const requiredCompleted = requiredItems.filter((i) => i.completed).length;

  async function handleToggle(itemKey: string) {
    setTogglingKey(itemKey);
    setErrorMessage(null);

    try {
      const result = await togglePhase3ItemAction(tripId, itemKey);

      if (!result.success) {
        setErrorMessage(result.error);
        setTogglingKey(null);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.itemKey === itemKey
            ? { ...item, completed: result.data!.completed }
            : item
        )
      );

      if (result.data!.pointsAwarded > 0) {
        setItemPoints({ key: itemKey, points: result.data!.pointsAwarded });
        setTimeout(() => setItemPoints(null), 2000);
      }

      // Refresh server components so PhaseShell progress bar updates in real-time
      router.refresh();
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleAdvance() {
    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const result = await advanceFromPhaseAction(tripId, 3);

      if (!result.success) {
        setErrorMessage(result.error);
        setIsCompleting(false);
        return;
      }

      // Navigate directly to phase-4
      router.push(`/expedition/${tripId}/phase-4`);
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }

  function formatDeadline(iso: string | null): string | null {
    if (!iso) return null;
    try {
      const date = new Date(iso);
      return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return null;
    }
  }

  return (
    <PhaseShell
      tripId={tripId}
      viewingPhase={3}
      tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases}
      phaseTitle={t("title")}
      phaseSubtitle={t("subtitle")}
      isEditMode={isEditMode}
      showFooter={true}
      footerProps={{
        onBack: () => router.push(`/expedition/${tripId}/phase-2`),
        onPrimary: isRevisiting
          ? () => router.push(`/expedition/${tripId}/phase-4`)
          : handleAdvance,
        primaryLabel: tExpedition("cta.advance"),
        isLoading: isCompleting,
        isDisabled: isCompleting,
      }}
    >
      {/* Trip context */}
      <p className="text-center text-sm text-atlas-teal dark:text-atlas-teal-light">
        {destination} -- {t(`tripTypes.${tripType}`)}
      </p>

      {/* Progress */}
      <div className="mt-4 rounded-lg bg-muted p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("progress", {
              completed: requiredCompleted,
              total: requiredItems.length,
            })}
          </span>
          <span className="font-semibold text-foreground">
            {requiredItems.length > 0
              ? Math.round((requiredCompleted / requiredItems.length) * 100)
              : 100}
            %
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-atlas-gold transition-all duration-500"
            style={{
              width: `${requiredItems.length > 0 ? (requiredCompleted / requiredItems.length) * 100 : 100}%`,
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
        >
          {errorMessage.startsWith("errors.")
            ? tErrors(errorMessage.replace("errors.", ""))
            : errorMessage}
        </div>
      )}

      {/* Required items */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-atlas-rust" />
          {t("requiredSection")}
        </h2>
        <div className="flex flex-col gap-2">
          {requiredItems.map((item) => (
            <ChecklistRow
              key={item.itemKey}
              item={item}
              toggling={togglingKey === item.itemKey}
              onToggle={handleToggle}
              formatDeadline={formatDeadline}
              t={t}
              pointsPopup={
                itemPoints?.key === item.itemKey ? itemPoints.points : null
              }
            />
          ))}
        </div>
      </div>

      {/* Recommended items */}
      {recommendedItems.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-atlas-teal" />
            {t("recommendedSection")}
          </h2>
          <div className="flex flex-col gap-2">
            {recommendedItems.map((item) => (
              <ChecklistRow
                key={item.itemKey}
                item={item}
                toggling={togglingKey === item.itemKey}
                onToggle={handleToggle}
                formatDeadline={formatDeadline}
                t={t}
                pointsPopup={
                  itemPoints?.key === item.itemKey ? itemPoints.points : null
                }
              />
            ))}
          </div>
        </div>
      )}
    </PhaseShell>
  );
}

// --- Checklist Row -----------------------------------------------------------

interface ChecklistRowProps {
  item: ChecklistItemData;
  toggling: boolean;
  onToggle: (key: string) => void;
  formatDeadline: (iso: string | null) => string | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  pointsPopup: number | null;
}

function ChecklistRow({
  item,
  toggling,
  onToggle,
  formatDeadline,
  t,
  pointsPopup,
}: ChecklistRowProps) {
  const deadline = formatDeadline(item.deadline);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.completed}
      onClick={() => onToggle(item.itemKey)}
      disabled={toggling}
      className={`relative flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
        item.completed
          ? "border-atlas-teal/30 bg-atlas-teal/5"
          : "border-border bg-card hover:border-atlas-gold/30"
      } ${toggling ? "opacity-60" : ""}`}
      aria-label={t(`items.${item.itemKey}`)}
    >
      {/* Checkbox */}
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          item.completed
            ? "border-atlas-teal bg-atlas-teal text-white"
            : "border-border"
        }`}
      >
        {item.completed && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${
            item.completed
              ? "text-muted-foreground line-through"
              : "text-card-foreground"
          }`}
        >
          {t(`items.${item.itemKey}`)}
        </span>
        {deadline && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("deadline", { date: deadline })}
          </p>
        )}
      </div>

      {/* Points badge */}
      <span className="shrink-0 rounded-full bg-atlas-gold/10 px-2 py-0.5 text-xs font-medium text-atlas-gold">
        +{item.pointsValue}
      </span>

      {/* Points popup animation */}
      {pointsPopup && (
        <span className="absolute -top-2 right-2 animate-bounce rounded-full bg-atlas-gold px-2 py-0.5 text-xs font-bold text-atlas-ink">
          +{pointsPopup}
        </span>
      )}
    </button>
  );
}
