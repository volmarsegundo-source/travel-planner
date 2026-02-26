"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  toggleChecklistItemAction,
  deleteChecklistItemAction,
} from "@/server/actions/checklist.actions";
import type { ChecklistItem } from "@/server/actions/checklist.actions";

interface ChecklistItemRowProps {
  item: ChecklistItem;
  tripId: string;
  onToggled: (item: ChecklistItem) => void;
  onDeleted: (itemId: string) => void;
}

export function ChecklistItemRow({
  item,
  tripId,
  onToggled,
  onDeleted,
}: ChecklistItemRowProps) {
  const t = useTranslations("checklist");
  const [isPending, startTransition] = useTransition();
  const [isChecked, setIsChecked] = useState(item.checked);

  function handleToggle() {
    // Optimistic update
    setIsChecked((prev) => !prev);
    startTransition(async () => {
      const result = await toggleChecklistItemAction(item.id, tripId);
      if (result.success && result.data) {
        setIsChecked(result.data.checked);
        onToggled(result.data);
      } else {
        // Revert on failure
        setIsChecked(item.checked);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteChecklistItemAction(item.id, tripId);
      if (result.success) {
        onDeleted(item.id);
      }
    });
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
      {/* Checkbox — 44×44px touch target */}
      <button
        role="checkbox"
        aria-checked={isChecked}
        onClick={handleToggle}
        disabled={isPending}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={item.label}
      >
        <div
          className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
            isChecked
              ? "border-primary bg-primary"
              : "border-muted-foreground bg-background"
          }`}
        >
          {isChecked && (
            <svg
              aria-hidden="true"
              className="h-3 w-3 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </button>

      {/* Label */}
      <span
        className={`flex-1 text-sm transition-colors ${
          isChecked ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {item.label}
      </span>

      {/* Delete button — 44×44px */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={t("deleteItem")}
        className="min-h-[44px] min-w-[44px] p-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18"
          />
        </svg>
      </Button>
    </div>
  );
}
