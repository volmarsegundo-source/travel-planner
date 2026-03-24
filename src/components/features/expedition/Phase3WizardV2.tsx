"use client";

import { useState, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useFormDirty } from "@/hooks/useFormDirty";
import { AtlasCard, AtlasBadge } from "@/components/ui";
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

interface Phase3WizardV2Props {
  tripId: string;
  items: ChecklistItemData[];
  tripType: string;
  destination: string;
  currentPhase?: number;
  accessMode?: PhaseAccessMode;
  tripCurrentPhase?: number;
  completedPhases?: number[];
}

export function Phase3WizardV2({
  tripId,
  items: initialItems,
  tripType,
  destination,
  currentPhase,
  accessMode = "first_visit",
  tripCurrentPhase = 3,
  completedPhases = [],
}: Phase3WizardV2Props) {
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

  // Dirty tracking
  const checklistValues = useMemo(() => {
    const completed: Record<string, unknown> = {};
    for (const item of items) {
      completed[item.itemKey] = item.completed;
    }
    return completed;
  }, [items]);

  const { isDirty: formDirty, markClean } = useFormDirty(checklistValues);

  const requiredItems = items.filter((i) => i.required);
  const recommendedItems = items.filter((i) => !i.required);
  const requiredCompleted = requiredItems.filter((i) => i.completed).length;

  function handleSaveChecklist() {
    markClean();
  }

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

  const progressPercent = requiredItems.length > 0
    ? Math.round((requiredCompleted / requiredItems.length) * 100)
    : 100;

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
        onSave: handleSaveChecklist,
        isDirty: formDirty,
      }}
    >
      <div className="flex flex-col gap-6" data-testid="phase3-v2">
        {/* Trip context */}
        <p className="text-center text-sm font-atlas-body text-atlas-on-surface-variant">
          {destination} -- {t(`tripTypes.${tripType}`)}
        </p>

        {/* Progress card */}
        <AtlasCard variant="base">
          <div className="flex items-center justify-between text-sm font-atlas-body">
            <span className="text-atlas-on-surface-variant">
              {t("progress", {
                completed: requiredCompleted,
                total: requiredItems.length,
              })}
            </span>
            <span className="font-bold text-atlas-on-surface">
              {progressPercent}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-atlas-surface-container-high">
            <div
              className="h-full rounded-full bg-atlas-secondary-container transition-all duration-500 motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </AtlasCard>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg bg-atlas-error-container px-4 py-3 text-sm font-atlas-body text-atlas-error border border-atlas-error/30"
          >
            {errorMessage.startsWith("errors.")
              ? tErrors(errorMessage.replace("errors.", ""))
              : errorMessage}
          </div>
        )}

        {/* Required items */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-atlas-headline font-bold uppercase tracking-wider text-atlas-on-surface">
            <span className="inline-block h-2 w-2 rounded-full bg-atlas-error" />
            {t("requiredSection")}
          </h2>
          <div className="flex flex-col gap-2">
            {requiredItems.map((item) => (
              <ChecklistRowV2
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
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-atlas-headline font-bold uppercase tracking-wider text-atlas-on-surface-variant">
              <span className="inline-block h-2 w-2 rounded-full bg-atlas-tertiary-fixed-dim" />
              {t("recommendedSection")}
            </h2>
            <div className="flex flex-col gap-2">
              {recommendedItems.map((item) => (
                <ChecklistRowV2
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
      </div>
    </PhaseShell>
  );
}

// --- Checklist Row V2 -------------------------------------------------------

interface ChecklistRowV2Props {
  item: ChecklistItemData;
  toggling: boolean;
  onToggle: (key: string) => void;
  formatDeadline: (iso: string | null) => string | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  pointsPopup: number | null;
}

function ChecklistRowV2({
  item,
  toggling,
  onToggle,
  formatDeadline,
  t,
  pointsPopup,
}: ChecklistRowV2Props) {
  const deadline = formatDeadline(item.deadline);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.completed}
      onClick={() => onToggle(item.itemKey)}
      disabled={toggling}
      className={`relative flex w-full min-h-[44px] items-start gap-3 rounded-lg border p-3 text-left transition-all duration-200 motion-reduce:transition-none ${
        item.completed
          ? "border-atlas-tertiary-fixed-dim/30 bg-atlas-tertiary-fixed/10"
          : "border-atlas-outline-variant/20 bg-atlas-surface-container-lowest hover:border-atlas-secondary-container/30"
      } ${toggling ? "opacity-60" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2`}
      aria-label={t(`items.${item.itemKey}`)}
    >
      {/* Checkbox */}
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors duration-200 motion-reduce:transition-none ${
          item.completed
            ? "border-atlas-tertiary-fixed-dim bg-atlas-tertiary-fixed-dim text-white"
            : "border-atlas-outline-variant"
        }`}
      >
        {item.completed && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium font-atlas-body ${
            item.completed
              ? "text-atlas-on-surface-variant line-through"
              : "text-atlas-on-surface"
          }`}
        >
          {t(`items.${item.itemKey}`)}
        </span>
        {deadline && (
          <p className="mt-0.5 text-xs font-atlas-body text-atlas-on-surface-variant">
            {t("deadline", { date: deadline })}
          </p>
        )}
      </div>

      {/* Points badge */}
      <AtlasBadge variant="pa" points={item.pointsValue} size="sm" />

      {/* Points popup animation */}
      {pointsPopup && (
        <span className="absolute -top-2 right-2 animate-bounce motion-reduce:animate-none rounded-full bg-atlas-secondary-container px-2 py-0.5 text-xs font-bold font-atlas-body text-atlas-primary">
          +{pointsPopup}
        </span>
      )}
    </button>
  );
}
