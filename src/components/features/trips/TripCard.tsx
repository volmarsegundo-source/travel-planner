"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Trip, TripStatus } from "@/types/trip.types";

// ─── Gradient presets ─────────────────────────────────────────────────────────

const GRADIENT_PRESETS: Record<string, string> = {
  sunset: "from-orange-400 to-pink-500",
  ocean: "from-blue-400 to-teal-500",
  forest: "from-green-400 to-emerald-600",
  city: "from-purple-400 to-gray-500",
  desert: "from-amber-400 to-orange-500",
};

const DEFAULT_GRADIENT = GRADIENT_PRESETS.sunset;

function resolveGradient(name: string): string {
  return GRADIENT_PRESETS[name] ?? DEFAULT_GRADIENT;
}

// ─── Status variant mapping ───────────────────────────────────────────────────

function statusVariant(
  status: TripStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "ARCHIVED":
      return "outline";
    case "PLANNING":
    default:
      return "secondary";
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TripCardProps {
  trip: Trip;
  locale: string;
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TripCard({ trip, locale, onEdit, onDelete }: TripCardProps) {
  const tCommon = useTranslations("common");

  const gradientClasses = resolveGradient(trip.coverGradient);

  const formattedDates =
    trip.startDate
      ? trip.endDate
        ? `${format(new Date(trip.startDate), "dd/MM/yyyy")} – ${format(new Date(trip.endDate), "dd/MM/yyyy")}`
        : format(new Date(trip.startDate), "dd/MM/yyyy")
      : null;

  return (
    <article className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Cover gradient */}
      <Link
        href={`/${locale}/trips/${trip.id}`}
        aria-label={trip.title}
        className="block"
      >
        <div
          className={`h-32 bg-gradient-to-br ${gradientClasses} flex items-center justify-center`}
          aria-hidden="true"
        >
          <span className="text-4xl select-none">{trip.coverEmoji}</span>
        </div>
      </Link>

      <div className="p-4 space-y-2">
        {/* Title */}
        <Link href={`/${locale}/trips/${trip.id}`}>
          <h2 className="font-semibold text-base leading-tight line-clamp-1 hover:underline">
            {trip.title}
          </h2>
        </Link>

        {/* Destination */}
        <p className="text-sm text-muted-foreground line-clamp-1">
          {trip.destination}
        </p>

        {/* Dates */}
        {formattedDates && (
          <p className="text-xs text-muted-foreground">{formattedDates}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <Badge variant={statusVariant(trip.status)}>{trip.status}</Badge>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(trip)}
              aria-label={tCommon("edit")}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(trip)}
              aria-label={tCommon("delete")}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
