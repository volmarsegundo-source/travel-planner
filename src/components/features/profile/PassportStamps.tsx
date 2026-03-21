"use client";

import { useTranslations } from "next-intl";
import type { BadgeKey } from "@/types/gamification.types";

const ALL_BADGES: { key: BadgeKey; emoji: string; nameKey: string }[] = [
  // Explorador
  { key: "primeira_viagem", emoji: "👣", nameKey: "primeiraViagem" },
  { key: "viajante_frequente", emoji: "🧳", nameKey: "viajanteFrequente" },
  { key: "globetrotter", emoji: "🌍", nameKey: "globetrotter" },
  { key: "marco_polo", emoji: "🏆", nameKey: "marcoPolo" },
  // Perfeccionista
  { key: "detalhista", emoji: "🔍", nameKey: "detalhista" },
  { key: "planejador_nato", emoji: "📋", nameKey: "planejadorNato" },
  { key: "zero_pendencias", emoji: "✅", nameKey: "zeroPendencias" },
  { key: "revisor", emoji: "🔄", nameKey: "revisor" },
  // Aventureiro
  { key: "sem_fronteiras", emoji: "✈️", nameKey: "semFronteiras" },
  { key: "em_familia", emoji: "👨‍👩‍👧‍👦", nameKey: "emFamilia" },
  { key: "solo_explorer", emoji: "🧭", nameKey: "soloExplorer" },
  { key: "poliglota", emoji: "🗣️", nameKey: "poliglota" },
  { key: "multicontinental", emoji: "🗺️", nameKey: "multicontinental" },
  // Veterano
  { key: "fiel", emoji: "💎", nameKey: "fiel" },
  { key: "maratonista", emoji: "⚡", nameKey: "maratonista" },
  { key: "fundador", emoji: "🌟", nameKey: "fundador" },
  { key: "aniversario", emoji: "🎂", nameKey: "aniversario" },
];

interface PassportStampsProps {
  earnedBadges: BadgeKey[];
}

export function PassportStamps({ earnedBadges }: PassportStampsProps) {
  const t = useTranslations("profile.badges");
  const earnedSet = new Set(earnedBadges);

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {ALL_BADGES.map((badge) => {
        const earned = earnedSet.has(badge.key);
        return (
          <div
            key={badge.key}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
              earned
                ? "border-atlas-gold/40 bg-atlas-gold/10"
                : "border-border/50 bg-muted/50 opacity-40"
            }`}
          >
            <span className="text-2xl" aria-hidden="true">
              {badge.emoji}
            </span>
            <span className="text-xs font-medium">
              {earned ? t(badge.nameKey) : t("locked")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
