"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChecklistCategorySection } from "./ChecklistCategorySection";
import { AiGenerationProgress } from "@/components/features/expedition/AiGenerationProgress";
import { generateChecklistAction } from "@/server/actions/ai.actions";
import { useAiServiceStatus } from "@/hooks/useAiServiceStatus";
import { AiServicePausedBanner } from "@/components/features/ai/AiServicePausedBanner";
import type { ChecklistItem } from "@/server/actions/checklist.actions";
import type { ChecklistCategory } from "@/types/ai.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: ChecklistCategory[] = [
  "DOCUMENTS",
  "HEALTH",
  "CURRENCY",
  "WEATHER",
  "TECHNOLOGY",
];

interface ChecklistViewProps {
  tripId: string;
  destination: string;
  startDate: Date | null;
  travelers: number;
  locale: string;
  initialItems: ChecklistItem[];
  /** When true, AI generation CTAs are disabled with an age restriction tooltip. */
  isAgeRestricted?: boolean;
}

export function ChecklistView({
  tripId,
  destination,
  startDate,
  travelers,
  locale,
  initialItems,
  isAgeRestricted = false,
}: ChecklistViewProps) {
  const t = useTranslations("checklist");
  const tAi = useTranslations("ai.service");
  const tAge = useTranslations("ageRestriction");
  const aiStatus = useAiServiceStatus();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [error, setError] = useState<string | null>(null);

  const language = locale === "pt-BR" ? "pt-BR" : ("en" as const);

  // Group items by category
  const grouped = CATEGORY_ORDER.reduce<
    Partial<Record<ChecklistCategory, ChecklistItem[]>>
  >((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  function handleCategoryItemsChanged(
    category: ChecklistCategory,
    updatedItems: ChecklistItem[]
  ) {
    setItems((prev) => [
      ...prev.filter((i) => i.category !== category),
      ...updatedItems,
    ]);
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateChecklistAction(tripId, {
        destination,
        startDate: startDate
          ? startDate.toISOString().split("T")[0]!
          : new Date().toISOString().split("T")[0]!,
        travelers,
        language,
      });

      if (result.success && result.data) {
        // Flatten the generated categories into ChecklistItem-like objects
        // The server has persisted them; we refresh by reloading (revalidatePath fires)
        // For optimistic UI we construct items from the result
        const generated: ChecklistItem[] = result.data.categories.flatMap(
          (cat, catIndex) =>
            cat.items.map((item, itemIndex) => ({
              id: `gen-${catIndex}-${itemIndex}`,
              tripId,
              category: cat.category,
              label: item.label,
              checked: false,
              orderIndex: itemIndex,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
        );
        setItems(generated);
      } else {
        setError(t("errorGenerate"));
      }
    });
  }

  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      <AiServicePausedBanner />

      {/* Generate button or generating skeleton */}
      {!hasItems && !isPending && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-4">
          <p className="text-muted-foreground">{t("noItems")}</p>
          <p className="text-sm text-muted-foreground">{t("noItemsSubtitle")}</p>
          <Button
            onClick={handleGenerate}
            disabled={isPending || aiStatus.paused || isAgeRestricted}
            className="min-h-[44px]"
            aria-label={isAgeRestricted ? tAge("tooltip") : aiStatus.paused ? tAi("paused.buttonDisabled") : undefined}
            title={isAgeRestricted ? tAge("tooltip") : undefined}
            aria-disabled={isAgeRestricted || undefined}
          >
            {isAgeRestricted ? tAge("tooltip") : aiStatus.paused ? tAi("paused.buttonDisabled") : t("generate")}
          </Button>
        </div>
      )}

      {!hasItems && isPending && <AiGenerationProgress type="checklist" />}

      {hasItems && (
        <>
          {/* Regenerate button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isPending || aiStatus.paused || isAgeRestricted}
              className="min-h-[44px]"
              aria-label={isAgeRestricted ? tAge("tooltip") : aiStatus.paused ? tAi("paused.buttonDisabled") : undefined}
              title={isAgeRestricted ? tAge("tooltip") : undefined}
              aria-disabled={isAgeRestricted || undefined}
            >
              {isAgeRestricted
                ? tAge("tooltip")
                : aiStatus.paused
                  ? tAi("paused.buttonDisabled")
                  : isPending
                    ? t("generating")
                    : t("generate")}
            </Button>
          </div>

          {/* Category sections */}
          {CATEGORY_ORDER.map((category) => {
            const categoryItems = grouped[category] ?? [];
            return (
              <ChecklistCategorySection
                key={category}
                category={category}
                items={categoryItems}
                tripId={tripId}
                onItemsChanged={handleCategoryItemsChanged}
              />
            );
          })}
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive text-center">
          {error}
        </p>
      )}
    </div>
  );
}
