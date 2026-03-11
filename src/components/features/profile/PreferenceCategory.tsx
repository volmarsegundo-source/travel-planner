"use client";

import { useState, useId } from "react";
import { PreferenceChip } from "./PreferenceChip";

interface ChipOption {
  value: string;
  labelKey: string;
  descriptionKey?: string;
}

interface PreferenceCategoryProps {
  categoryKey: string;
  title: string;
  question: string;
  options: ChipOption[];
  selectionType: "single" | "multi";
  selectedValues: string | string[] | null;
  onSelectionChange: (values: string | string[] | null) => void;
  /** Translate function (key) => string */
  t: (key: string) => string;
  pointsLabel?: string;
}

export function PreferenceCategory({
  categoryKey,
  title,
  question,
  options,
  selectionType,
  selectedValues,
  onSelectionChange,
  t,
  pointsLabel,
}: PreferenceCategoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  const selectedArray = Array.isArray(selectedValues)
    ? selectedValues
    : selectedValues
      ? [selectedValues]
      : [];

  const filledCount = selectedArray.length;
  const summaryText = filledCount > 0
    ? selectedArray.slice(0, 3).map((v) => t(`options.${categoryKey}.${v}`)).join(", ") +
      (filledCount > 3 ? "..." : "")
    : t("notFilled");

  function handleToggle(optionValue: string) {
    if (selectionType === "single") {
      // Toggle: if already selected, deselect
      const newValue = selectedValues === optionValue ? null : optionValue;
      onSelectionChange(newValue);
    } else {
      // Multi-select toggle
      const currentArray = Array.isArray(selectedValues) ? [...selectedValues] : [];

      // "no_restrictions" mutual exclusivity
      if (optionValue === "no_restrictions") {
        onSelectionChange(currentArray.includes("no_restrictions") ? [] : ["no_restrictions"]);
        return;
      }
      // If selecting a non-"no_restrictions" option, remove "no_restrictions"
      const filtered = currentArray.filter((v) => v !== "no_restrictions");

      if (filtered.includes(optionValue)) {
        onSelectionChange(filtered.filter((v) => v !== optionValue));
      } else {
        onSelectionChange([...filtered, optionValue]);
      }
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted ${
          filledCount > 0 ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-transparent"
        }`}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <p className="text-xs text-muted-foreground truncate">{summaryText}</p>
        </div>
        <span className="text-muted-foreground/70 shrink-0 ml-2">
          {isOpen ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="border-t border-border/50 px-4 py-4"
        >
          <p className="mb-3 text-sm text-muted-foreground">{question}</p>
          <div
            role={selectionType === "single" ? "radiogroup" : "group"}
            aria-label={question}
            className="grid grid-cols-1 min-[375px]:grid-cols-2 md:grid-cols-3 gap-2"
          >
            {options.map((option) => (
              <PreferenceChip
                key={option.value}
                label={t(`options.${categoryKey}.${option.value}`)}
                description={option.descriptionKey ? t(option.descriptionKey) : undefined}
                selected={selectedArray.includes(option.value)}
                onToggle={() => handleToggle(option.value)}
                role={selectionType === "single" ? "radio" : "checkbox"}
                disabled={
                  selectionType === "multi" &&
                  selectedArray.includes("no_restrictions") &&
                  option.value !== "no_restrictions"
                }
              />
            ))}
          </div>
          {pointsLabel && (
            <p className="mt-2 text-xs text-atlas-gold text-right">{pointsLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
