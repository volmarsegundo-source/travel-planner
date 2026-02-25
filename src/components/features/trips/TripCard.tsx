"use client";

import { useTranslations } from "next-intl";
import { MapPin, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TripSummary } from "@/types/trip.types";
import type { CoverGradient } from "@/lib/validations/trip.schema";

const GRADIENT_CLASSES: Record<CoverGradient, string> = {
  sunset: "from-orange-400 to-rose-500",
  ocean: "from-cyan-400 to-blue-600",
  forest: "from-emerald-400 to-green-700",
  desert: "from-amber-400 to-orange-600",
  aurora: "from-violet-400 to-indigo-600",
  city: "from-slate-500 to-zinc-800",
  sakura: "from-pink-300 to-rose-400",
  alpine: "from-sky-300 to-blue-500",
};

interface TripCardProps {
  trip: TripSummary;
  onClick?: () => void;
}

function formatDateRange(
  start?: Date | string | null,
  end?: Date | string | null,
): string | null {
  if (!start) return null;
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const startStr = s.toLocaleDateString("pt-BR", opts);
  if (!end) return startStr;
  const e = new Date(end);
  return `${startStr} – ${e.toLocaleDateString("pt-BR", opts)}`;
}

export function TripCard({ trip, onClick }: TripCardProps) {
  const t = useTranslations("trips");

  const gradient =
    GRADIENT_CLASSES[(trip.coverGradient as CoverGradient) ?? "sunset"] ??
    GRADIENT_CLASSES.sunset;

  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-within:ring-2 focus-within:ring-orange-400"
      onClick={onClick}
    >
      {/* Cover */}
      <div
        className={cn(
          "relative flex h-32 items-end bg-gradient-to-br p-4",
          gradient,
        )}
      >
        {trip.coverEmoji && (
          <span
            className="absolute right-4 top-4 text-3xl leading-none"
            aria-hidden="true"
          >
            {trip.coverEmoji}
          </span>
        )}
        {/* Status badge */}
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm",
            trip.status === "ACTIVE"
              ? "bg-green-500/80"
              : trip.status === "COMPLETED"
                ? "bg-gray-600/80"
                : trip.status === "ARCHIVED"
                  ? "bg-gray-500/60"
                  : "bg-white/30",
          )}
        >
          {t(`status.${trip.status}`)}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h2 className="mb-1 truncate text-base font-semibold text-gray-900">
          {trip.title}
        </h2>

        <div className="flex flex-col gap-1 text-xs text-gray-500">
          {trip.destinationName && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{trip.destinationName}</span>
            </span>
          )}
          {dateRange && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {dateRange}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {trip.travelers}{" "}
            {trip.travelers === 1 ? "viajante" : "viajantes"}
          </span>
        </div>
      </div>
    </article>
  );
}
