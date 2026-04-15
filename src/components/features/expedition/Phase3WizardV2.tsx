"use client";

import { useState, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useFormDirty } from "@/hooks/useFormDirty";
import { AtlasCard, AtlasBadge } from "@/components/ui";
import { PhaseShell } from "./PhaseShell";
import {
  togglePhase3ItemAction,
  addCustomChecklistItemAction,
  removeCustomChecklistItemAction,
  advanceFromPhaseAction,
} from "@/server/actions/expedition.actions";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

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

  // Custom item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemRequired, setNewItemRequired] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

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

  async function handleAddCustomItem() {
    if (!newItemName.trim() || newItemName.trim().length < 2) return;
    setIsAddingItem(true);
    setErrorMessage(null);

    try {
      const result = await addCustomChecklistItemAction(tripId, newItemName.trim(), newItemRequired);
      if (!result.success) {
        setErrorMessage(result.error);
        setIsAddingItem(false);
        return;
      }

      setItems((prev) => [
        ...prev,
        {
          id: result.data!.id,
          itemKey: result.data!.itemKey,
          required: result.data!.required,
          completed: false,
          deadline: null,
          pointsValue: 0,
        },
      ]);
      setNewItemName("");
      setNewItemRequired(false);
      setShowAddForm(false);
      router.refresh();
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setIsAddingItem(false);
    }
  }

  async function handleRemoveItem(itemKey: string) {
    if (!itemKey.startsWith("custom_")) return;
    setRemovingKey(itemKey);
    setErrorMessage(null);

    try {
      const result = await removeCustomChecklistItemAction(tripId, itemKey);
      if (!result.success) {
        setErrorMessage(result.error);
        setRemovingKey(null);
        return;
      }
      setItems((prev) => prev.filter((i) => i.itemKey !== itemKey));
      router.refresh();
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setRemovingKey(null);
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

      // Flag ON: checklist is last planning phase → go to summary
      // Flag OFF: checklist is phase-3 → advance to logistics (phase-4)
      router.push(
        checklistNextIsReordered
          ? `/expedition/${tripId}/summary`
          : `/expedition/${tripId}/phase-4`
      );
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

  // Flag-aware navigation paths (SPEC-UX-REORDER-PHASES §5.2)
  // Flag OFF: Checklist is phase-3. Back = Profile (phase-2), Next = Logistics (phase-4)
  // Flag ON:  Checklist is phase-6. Back = Logistics (phase-5), Next = summary (final phase)
  const checklistBackPath = isPhaseReorderEnabled() ? "phase-5" : "phase-2";
  const checklistNextIsReordered = isPhaseReorderEnabled();
  const checklistAdvanceLabel = isPhaseReorderEnabled()
    ? t("ctaNextReordered")
    : tExpedition("cta.advance");

  return (
    <PhaseShell
      tripId={tripId}
      viewingPhase={3}
      tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases}
      phaseTitle={t("title")}
      phaseSubtitle={checklistNextIsReordered ? t("subtitleReordered") : t("subtitle")}
      isEditMode={isEditMode}
      showFooter={true}
      footerProps={{
        onBack: () => router.push(`/expedition/${tripId}/${checklistBackPath}`),
        onPrimary: isRevisiting
          ? () =>
              router.push(
                checklistNextIsReordered
                  ? `/expedition/${tripId}/summary`
                  : `/expedition/${tripId}/phase-4`
              )
          : handleAdvance,
        primaryLabel: checklistAdvanceLabel,
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
                onRemove={item.itemKey.startsWith("custom_") ? handleRemoveItem : undefined}
                removing={removingKey === item.itemKey}
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
                  onRemove={item.itemKey.startsWith("custom_") ? handleRemoveItem : undefined}
                  removing={removingKey === item.itemKey}
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

        {/* Add custom item */}
        <div className="pt-2">
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 border-dashed border-atlas-outline-variant/30 p-3 text-sm font-medium font-atlas-body text-atlas-on-surface-variant hover:border-atlas-secondary-container/50 hover:text-atlas-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
              data-testid="add-custom-item-btn"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t("addCustomItem")}
            </button>
          ) : (
            <AtlasCard variant="base" className="p-4">
              <div className="space-y-3">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={t("customItemPlaceholder")}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-atlas-body bg-atlas-surface-container-low text-atlas-on-surface placeholder:text-atlas-outline-variant rounded-lg border border-atlas-outline-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                  maxLength={100}
                  autoFocus
                  data-testid="custom-item-input"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-atlas-body text-atlas-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newItemRequired}
                      onChange={(e) => setNewItemRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-atlas-outline-variant text-atlas-secondary-container focus-visible:ring-atlas-focus-ring"
                    />
                    {t("markAsRequired")}
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setNewItemName(""); setNewItemRequired(false); }}
                    className="px-3 py-1.5 text-sm font-medium font-atlas-body text-atlas-on-surface-variant hover:text-atlas-on-surface rounded-lg transition-colors"
                    disabled={isAddingItem}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    disabled={isAddingItem || newItemName.trim().length < 2}
                    className="px-4 py-1.5 text-sm font-bold font-atlas-body bg-atlas-secondary-container text-atlas-primary rounded-lg hover:bg-atlas-secondary-container/80 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                    data-testid="confirm-add-item-btn"
                  >
                    {isAddingItem ? t("adding") : t("addItem")}
                  </button>
                </div>
              </div>
            </AtlasCard>
          )}
        </div>
      </div>
    </PhaseShell>
  );
}

// --- Checklist Row V2 -------------------------------------------------------

interface ChecklistRowV2Props {
  item: ChecklistItemData;
  toggling: boolean;
  onToggle: (key: string) => void;
  onRemove?: (key: string) => void;
  removing?: boolean;
  formatDeadline: (iso: string | null) => string | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  pointsPopup: number | null;
}

function ChecklistRowV2({
  item,
  toggling,
  onToggle,
  onRemove,
  removing = false,
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
          {item.itemKey.startsWith("custom_")
            ? item.itemKey.slice(7).replace(/_/g, " ")
            : t(`items.${item.itemKey}`)}
        </span>
        {deadline && (
          <p className="mt-0.5 text-xs font-atlas-body text-atlas-on-surface-variant">
            {t("deadline", { date: deadline })}
          </p>
        )}
      </div>

      {/* Remove button (custom items only) */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(item.itemKey); }}
          disabled={removing}
          className="shrink-0 p-1 text-atlas-on-surface-variant/50 hover:text-atlas-error transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring rounded"
          aria-label={t("removeItem")}
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Points badge (system items only) */}
      {item.pointsValue > 0 && <AtlasBadge variant="pa" points={item.pointsValue} size="sm" />}

      {/* Points popup animation */}
      {pointsPopup && (
        <span className="absolute -top-2 right-2 animate-bounce motion-reduce:animate-none rounded-full bg-atlas-secondary-container px-2 py-0.5 text-xs font-bold font-atlas-body text-atlas-primary">
          +{pointsPopup}
        </span>
      )}
    </button>
  );
}
