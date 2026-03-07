"use client";

import { useTranslations } from "next-intl";

interface PointsDisplayProps {
  points: number;
  size?: "sm" | "md" | "lg";
}

export function PointsDisplay({ points, size = "md" }: PointsDisplayProps) {
  const t = useTranslations("gamification");

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${sizeClasses[size]}`}>
      <span className="text-atlas-gold">{points.toLocaleString()}</span>
      <span aria-hidden="true">🧭</span>
      <span className="sr-only">{t("points")}</span>
    </span>
  );
}
