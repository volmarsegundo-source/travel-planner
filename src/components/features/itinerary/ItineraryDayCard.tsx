"use client";

import {
  Eye,
  Utensils,
  Car,
  Smile,
  Bed,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import type { DayPlan, Activity } from "@/types/ai.types";

const CATEGORY_ICONS: Record<Activity["category"], React.ReactNode> = {
  SIGHTSEEING: <Eye className="h-4 w-4" />,
  FOOD: <Utensils className="h-4 w-4" />,
  TRANSPORT: <Car className="h-4 w-4" />,
  LEISURE: <Smile className="h-4 w-4" />,
  ACCOMMODATION: <Bed className="h-4 w-4" />,
  OTHER: <MoreHorizontal className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<Activity["category"], string> = {
  SIGHTSEEING: "bg-blue-100 text-blue-600",
  FOOD: "bg-orange-100 text-orange-600",
  TRANSPORT: "bg-gray-100 text-gray-600",
  LEISURE: "bg-green-100 text-green-600",
  ACCOMMODATION: "bg-purple-100 text-purple-600",
  OTHER: "bg-slate-100 text-slate-600",
};

interface ItineraryDayCardProps {
  day: DayPlan;
}

export function ItineraryDayCard({ day }: ItineraryDayCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Day header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
          {day.dayNumber}
        </div>
        <div>
          {day.theme && (
            <h3 className="text-base font-semibold text-gray-900">
              {day.theme}
            </h3>
          )}
          {day.date && (
            <p className="text-xs text-gray-400">
              {new Date(day.date).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Activities */}
      <ol className="space-y-3">
        {day.activities.map((activity, i) => (
          <li key={i} className="flex gap-3">
            {/* Category icon */}
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${CATEGORY_COLORS[activity.category]}`}
              aria-label={activity.category}
            >
              {CATEGORY_ICONS[activity.category]}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">
                  {activity.title}
                </p>
                {activity.time && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {activity.time}
                  </span>
                )}
              </div>
              {activity.description && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {activity.description}
                </p>
              )}
              {activity.durationMinutes && (
                <p className="mt-0.5 text-xs text-gray-400">
                  ~{activity.durationMinutes} min
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
