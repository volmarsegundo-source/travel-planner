"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChecklistItemRow } from "./ChecklistItemRow";
import { addChecklistItemAction } from "@/server/actions/checklist.actions";
import type { ChecklistItem } from "@/server/actions/checklist.actions";
import type { ChecklistCategory } from "@/types/ai.types";

// ─── Category icons ────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<ChecklistCategory, string> = {
  DOCUMENTS: "📄",
  HEALTH: "💊",
  CURRENCY: "💰",
  WEATHER: "🌤️",
  TECHNOLOGY: "📱",
};

interface ChecklistCategorySectionProps {
  category: ChecklistCategory;
  items: ChecklistItem[];
  tripId: string;
  onItemsChanged: (category: ChecklistCategory, items: ChecklistItem[]) => void;
}

export function ChecklistCategorySection({
  category,
  items,
  tripId,
  onItemsChanged,
}: ChecklistCategorySectionProps) {
  const t = useTranslations("checklist");
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const icon = CATEGORY_ICONS[category];
  const categoryName = t(`categories.${category}` as Parameters<typeof t>[0]);

  function handleToggled(updated: ChecklistItem) {
    onItemsChanged(
      category,
      items.map((i) => (i.id === updated.id ? updated : i))
    );
  }

  function handleDeleted(itemId: string) {
    onItemsChanged(
      category,
      items.filter((i) => i.id !== itemId)
    );
  }

  function handleAddItem() {
    if (!newLabel.trim()) return;
    startTransition(async () => {
      const result = await addChecklistItemAction(tripId, category, newLabel);
      if (result.success && result.data) {
        onItemsChanged(category, [...items, result.data]);
        setNewLabel("");
        setShowAdd(false);
      }
    });
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <section aria-labelledby={`category-${category}`} className="rounded-xl border bg-card overflow-hidden">
      {/* Category header */}
      <header className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">
            {icon}
          </span>
          <h2 id={`category-${category}`} className="font-semibold text-sm">
            {categoryName}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {checkedCount}/{items.length}
        </span>
      </header>

      {/* Items */}
      <div className="p-2 space-y-0.5">
        {items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            tripId={tripId}
            onToggled={handleToggled}
            onDeleted={handleDeleted}
          />
        ))}

        {/* Add item form */}
        {showAdd && (
          <div className="flex gap-2 px-3 py-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t("newItemPlaceholder")}
              className="flex-1 rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddItem();
                if (e.key === "Escape") setShowAdd(false);
              }}
            />
            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={isPending || !newLabel.trim()}
              className="min-h-[44px] px-3"
            >
              {t("addItem")}
            </Button>
          </div>
        )}

        {/* Add item button */}
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-h-[44px]"
          >
            <span aria-hidden="true">+</span>
            {t("addItem")}
          </button>
        )}
      </div>
    </section>
  );
}
