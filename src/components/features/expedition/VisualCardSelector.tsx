"use client";

interface CardOption {
  value: string;
  label: string;
  emoji: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface VisualCardSelectorProps {
  options: CardOption[];
  value: string | null;
  onChange: (value: string) => void;
  label: string;
  columns?: 2 | 4;
}

export function VisualCardSelector({
  options,
  value,
  onChange,
  label,
  columns = 2,
}: VisualCardSelectorProps) {
  const gridCols = columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-3 ${gridCols}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-disabled={option.disabled || undefined}
          disabled={option.disabled}
          onClick={() => !option.disabled && onChange(option.value)}
          title={option.disabled ? option.disabledReason : undefined}
          className={[
            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors",
            option.disabled
              ? "cursor-not-allowed border-border/50 bg-muted opacity-50"
              : value === option.value
                ? "border-atlas-gold bg-atlas-gold/10"
                : "border-border hover:border-atlas-gold/40",
          ].join(" ")}
        >
          <span className="text-2xl" aria-hidden="true">
            {option.emoji}
          </span>
          <span className="text-sm font-medium">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
