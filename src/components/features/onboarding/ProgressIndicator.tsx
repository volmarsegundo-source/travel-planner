"use client";

import { useTranslations } from "next-intl";

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const t = useTranslations("onboarding");

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dots */}
      <div className="flex gap-2" role="tablist" aria-label="Progresso do onboarding">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            role="tab"
            aria-selected={i + 1 === current}
            aria-label={`Passo ${i + 1} de ${total}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i + 1 === current
                ? "w-6 bg-orange-500"
                : i + 1 < current
                  ? "w-2 bg-orange-300"
                  : "w-2 bg-gray-200"
            }`}
          />
        ))}
      </div>
      {/* Label */}
      <p className="text-xs text-gray-400">
        {t("progress", { current, total })}
      </p>
    </div>
  );
}
