// ─── Badge Registry ─────────────────────────────────────────────────────────
//
// Single source of truth for all 16 Atlas badges.
// Pure data — no server-only dependency, safe for client import.

import type { BadgeKey } from "@/types/gamification.types";

export type BadgeCategory =
  | "explorador"
  | "perfeccionista"
  | "aventureiro"
  | "veterano";

export type BadgeCriteriaType =
  | "trip_count"
  | "phase_complete_all_fields"
  | "phase_complete_all_phases"
  | "zero_pending"
  | "phase_revisit"
  | "trip_type_international"
  | "trip_type_family"
  | "trip_type_solo"
  | "language_count"
  | "continent_count"
  | "login_count"
  | "trips_in_period"
  | "beta_user"
  | "account_age_days";

export interface BadgeDefinition {
  key: BadgeKey;
  nameKey: string;
  descriptionKey: string;
  category: BadgeCategory;
  icon: string;
  criteriaType: BadgeCriteriaType;
  threshold: number;
}

export const BADGE_REGISTRY: readonly BadgeDefinition[] = [
  // ─── Explorador ──────────────────────────────────────────────────────────
  {
    key: "primeira_viagem",
    nameKey: "gamification.badges.primeira_viagem.name",
    descriptionKey: "gamification.badges.primeira_viagem.description",
    category: "explorador",
    icon: "\u{1F30D}",
    criteriaType: "trip_count",
    threshold: 1,
  },
  {
    key: "viajante_frequente",
    nameKey: "gamification.badges.viajante_frequente.name",
    descriptionKey: "gamification.badges.viajante_frequente.description",
    category: "explorador",
    icon: "\u{2708}\uFE0F",
    criteriaType: "trip_count",
    threshold: 3,
  },
  {
    key: "globetrotter",
    nameKey: "gamification.badges.globetrotter.name",
    descriptionKey: "gamification.badges.globetrotter.description",
    category: "explorador",
    icon: "\u{1F5FA}\uFE0F",
    criteriaType: "trip_count",
    threshold: 5,
  },
  {
    key: "marco_polo",
    nameKey: "gamification.badges.marco_polo.name",
    descriptionKey: "gamification.badges.marco_polo.description",
    category: "explorador",
    icon: "\u{1F9ED}",
    criteriaType: "trip_count",
    threshold: 10,
  },

  // ─── Perfeccionista ──────────────────────────────────────────────────────
  {
    key: "detalhista",
    nameKey: "gamification.badges.detalhista.name",
    descriptionKey: "gamification.badges.detalhista.description",
    category: "perfeccionista",
    icon: "\u{1F50D}",
    criteriaType: "phase_complete_all_fields",
    threshold: 1,
  },
  {
    key: "planejador_nato",
    nameKey: "gamification.badges.planejador_nato.name",
    descriptionKey: "gamification.badges.planejador_nato.description",
    category: "perfeccionista",
    icon: "\u{1F4CB}",
    criteriaType: "phase_complete_all_phases",
    threshold: 6,
  },
  {
    key: "zero_pendencias",
    nameKey: "gamification.badges.zero_pendencias.name",
    descriptionKey: "gamification.badges.zero_pendencias.description",
    category: "perfeccionista",
    icon: "\u{2705}",
    criteriaType: "zero_pending",
    threshold: 0,
  },
  {
    key: "revisor",
    nameKey: "gamification.badges.revisor.name",
    descriptionKey: "gamification.badges.revisor.description",
    category: "perfeccionista",
    icon: "\u{1F504}",
    criteriaType: "phase_revisit",
    threshold: 1,
  },

  // ─── Aventureiro ─────────────────────────────────────────────────────────
  {
    key: "sem_fronteiras",
    nameKey: "gamification.badges.sem_fronteiras.name",
    descriptionKey: "gamification.badges.sem_fronteiras.description",
    category: "aventureiro",
    icon: "\u{1F6C2}",
    criteriaType: "trip_type_international",
    threshold: 1,
  },
  {
    key: "em_familia",
    nameKey: "gamification.badges.em_familia.name",
    descriptionKey: "gamification.badges.em_familia.description",
    category: "aventureiro",
    icon: "\u{1F46A}",
    criteriaType: "trip_type_family",
    threshold: 1,
  },
  {
    key: "solo_explorer",
    nameKey: "gamification.badges.solo_explorer.name",
    descriptionKey: "gamification.badges.solo_explorer.description",
    category: "aventureiro",
    icon: "\u{1F9D1}\u200D\u{1F4BB}",
    criteriaType: "trip_type_solo",
    threshold: 1,
  },
  {
    key: "poliglota",
    nameKey: "gamification.badges.poliglota.name",
    descriptionKey: "gamification.badges.poliglota.description",
    category: "aventureiro",
    icon: "\u{1F4AC}",
    criteriaType: "language_count",
    threshold: 2,
  },
  {
    key: "multicontinental",
    nameKey: "gamification.badges.multicontinental.name",
    descriptionKey: "gamification.badges.multicontinental.description",
    category: "aventureiro",
    icon: "\u{1F30E}",
    criteriaType: "continent_count",
    threshold: 3,
  },

  // ─── Veterano ────────────────────────────────────────────────────────────
  {
    key: "fiel",
    nameKey: "gamification.badges.fiel.name",
    descriptionKey: "gamification.badges.fiel.description",
    category: "veterano",
    icon: "\u{2B50}",
    criteriaType: "login_count",
    threshold: 10,
  },
  {
    key: "maratonista",
    nameKey: "gamification.badges.maratonista.name",
    descriptionKey: "gamification.badges.maratonista.description",
    category: "veterano",
    icon: "\u{1F3C3}",
    criteriaType: "trips_in_period",
    threshold: 3,
  },
  {
    key: "fundador",
    nameKey: "gamification.badges.fundador.name",
    descriptionKey: "gamification.badges.fundador.description",
    category: "veterano",
    icon: "\u{1F3C6}",
    criteriaType: "beta_user",
    threshold: 1,
  },
  {
    key: "aniversario",
    nameKey: "gamification.badges.aniversario.name",
    descriptionKey: "gamification.badges.aniversario.description",
    category: "veterano",
    icon: "\u{1F382}",
    criteriaType: "account_age_days",
    threshold: 365,
  },
] as const;

/**
 * Lookup a badge definition by key.
 */
export function getBadgeDefinition(
  key: BadgeKey
): BadgeDefinition | undefined {
  return BADGE_REGISTRY.find((b) => b.key === key);
}

/**
 * Get all badges for a given category.
 */
export function getBadgesByCategory(
  category: BadgeCategory
): readonly BadgeDefinition[] {
  return BADGE_REGISTRY.filter((b) => b.category === category);
}
