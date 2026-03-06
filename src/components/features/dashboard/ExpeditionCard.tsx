"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface ExpeditionCardProps {
  tripId: string;
  destination: string;
  currentPhase: number;
  completedPhases: number;
  totalPhases: number;
  coverEmoji: string;
}

export function ExpeditionCard({
  tripId,
  destination,
  currentPhase,
  completedPhases,
  totalPhases,
  coverEmoji,
}: ExpeditionCardProps) {
  const t = useTranslations("dashboard");

  const progressPercent = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

  return (
    <Link
      href={`/expedition/${tripId}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl" aria-hidden="true">
          {coverEmoji}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary">
            {destination}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("currentPhase", { number: currentPhase })} &middot;{" "}
            {t("phaseProgress", { completed: completedPhases, total: totalPhases })}
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={completedPhases}
              aria-valuemin={0}
              aria-valuemax={totalPhases}
            />
          </div>
        </div>
        <span className="text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {t("viewExpedition")}
        </span>
      </div>
    </Link>
  );
}
