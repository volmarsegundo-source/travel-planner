"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Heart,
  DollarSign,
  CloudSun,
  Smartphone,
  MoreHorizontal,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistCategory, ChecklistCategoryId, ChecklistItemData } from "@/types/ai.types";

const CATEGORY_ICONS: Record<ChecklistCategoryId, React.ReactNode> = {
  DOCUMENTS: <FileText className="h-4 w-4" />,
  HEALTH: <Heart className="h-4 w-4" />,
  CURRENCY: <DollarSign className="h-4 w-4" />,
  WEATHER: <CloudSun className="h-4 w-4" />,
  TECHNOLOGY: <Smartphone className="h-4 w-4" />,
  OTHER: <MoreHorizontal className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<ChecklistCategoryId, string> = {
  DOCUMENTS: "bg-blue-100 text-blue-600",
  HEALTH: "bg-red-100 text-red-600",
  CURRENCY: "bg-green-100 text-green-600",
  WEATHER: "bg-sky-100 text-sky-600",
  TECHNOLOGY: "bg-violet-100 text-violet-600",
  OTHER: "bg-gray-100 text-gray-600",
};

interface EditableItem extends ChecklistItemData {
  id: string;
  checked: boolean;
}

interface EditableCategory {
  id: ChecklistCategoryId;
  items: EditableItem[];
}

let _idCounter = 0;
function nextId() {
  return `item-${++_idCounter}`;
}

function toEditable(categories: ChecklistCategory[]): EditableCategory[] {
  return categories.map((cat) => ({
    id: cat.id,
    items: cat.items.map((item) => ({
      ...item,
      id: nextId(),
      checked: false,
    })),
  }));
}

interface ChecklistViewProps {
  categories: ChecklistCategory[];
  tripDestination: string;
}

export function ChecklistView({ categories, tripDestination }: ChecklistViewProps) {
  const t = useTranslations("checklist");
  const [data, setData] = useState<EditableCategory[]>(() =>
    toEditable(categories),
  );

  const totalItems = data.reduce((acc, cat) => acc + cat.items.length, 0);
  const checkedItems = data.reduce(
    (acc, cat) => acc + cat.items.filter((i) => i.checked).length,
    0,
  );
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  function toggleItem(catId: ChecklistCategoryId, itemId: string) {
    setData((prev) =>
      prev.map((cat) =>
        cat.id !== catId
          ? cat
          : {
              ...cat,
              items: cat.items.map((item) =>
                item.id !== itemId
                  ? item
                  : { ...item, checked: !item.checked },
              ),
            },
      ),
    );
  }

  function deleteItem(catId: ChecklistCategoryId, itemId: string) {
    setData((prev) =>
      prev.map((cat) =>
        cat.id !== catId
          ? cat
          : { ...cat, items: cat.items.filter((i) => i.id !== itemId) },
      ),
    );
  }

  function addItem(catId: ChecklistCategoryId) {
    setData((prev) =>
      prev.map((cat) =>
        cat.id !== catId
          ? cat
          : {
              ...cat,
              items: [
                ...cat.items,
                { id: nextId(), text: "", required: false, checked: false },
              ],
            },
      ),
    );
  }

  function updateItemText(
    catId: ChecklistCategoryId,
    itemId: string,
    text: string,
  ) {
    setData((prev) =>
      prev.map((cat) =>
        cat.id !== catId
          ? cat
          : {
              ...cat,
              items: cat.items.map((item) =>
                item.id !== itemId ? item : { ...item, text },
              ),
            },
      ),
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          {t("title")}
        </h1>
        <p className="text-sm text-gray-500">{tripDestination}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {checkedItems} de {totalItems} itens
          </span>
          <span className="font-semibold text-orange-600">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% completo`}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {data.map((cat) => (
          <div
            key={cat.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            {/* Category header */}
            <div className="mb-3 flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  CATEGORY_COLORS[cat.id],
                )}
                aria-hidden="true"
              >
                {CATEGORY_ICONS[cat.id]}
              </div>
              <h2 className="text-sm font-semibold text-gray-800">
                {t(`categories.${cat.id}` as Parameters<typeof t>[0])}
              </h2>
            </div>

            {/* Items */}
            <ul className="space-y-2" role="list">
              {cat.items.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center gap-3"
                  role="listitem"
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleItem(cat.id, item.id)}
                    aria-pressed={item.checked}
                    aria-label={item.checked ? `Desmarcar: ${item.text}` : `Marcar: ${item.text}`}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                      item.checked
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-gray-300 hover:border-orange-400",
                    )}
                  >
                    {item.checked && (
                      <Check className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>

                  {/* Text (editable) */}
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      updateItemText(cat.id, item.id, e.target.value)
                    }
                    className={cn(
                      "flex-1 border-none bg-transparent text-sm outline-none",
                      item.checked
                        ? "text-gray-400 line-through"
                        : item.required
                          ? "font-medium text-gray-900"
                          : "text-gray-700",
                    )}
                    aria-label={`Item: ${item.text}`}
                    placeholder="Novo item..."
                  />

                  {/* Required badge */}
                  {item.required && !item.checked && (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                      obrigatório
                    </span>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteItem(cat.id, item.id)}
                    aria-label={`Excluir: ${item.text}`}
                    className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Add item */}
            <button
              type="button"
              onClick={() => addItem(cat.id)}
              className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("addItem")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
