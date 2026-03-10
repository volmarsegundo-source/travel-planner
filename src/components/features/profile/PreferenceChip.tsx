"use client";

interface PreferenceChipProps {
  label: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
  role: "radio" | "checkbox";
  disabled?: boolean;
}

export function PreferenceChip({
  label,
  description,
  selected,
  onToggle,
  role,
  disabled = false,
}: PreferenceChipProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={`
        relative flex min-h-[44px] min-w-[100px] flex-col items-center justify-center
        rounded-xl px-3 py-2 text-center transition-all
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:border-primary hover:bg-primary/5 hover:shadow-sm"
        }
        ${
          selected
            ? "border-2 border-primary bg-primary/10"
            : "border border-border bg-card"
        }
      `}
    >
      {selected && (
        <span
          className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {description && (
        <span className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {description}
        </span>
      )}
    </button>
  );
}
