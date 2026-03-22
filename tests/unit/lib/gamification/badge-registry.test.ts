/**
 * Unit tests for badge-registry.
 *
 * Tests cover:
 * - All 16 badges are defined
 * - Badge keys are unique
 * - All 4 categories are present
 * - getBadgeDefinition lookup
 * - getBadgesByCategory filtering
 * - Badge structure validation
 */
import { describe, it, expect } from "vitest";
import {
  BADGE_REGISTRY,
  getBadgeDefinition,
  getBadgesByCategory,
} from "@/lib/gamification/badge-registry";
import type { BadgeKey } from "@/types/gamification.types";

describe("BADGE_REGISTRY", () => {
  it("contains exactly 17 badges", () => {
    expect(BADGE_REGISTRY).toHaveLength(17);
  });

  it("all badge keys are unique", () => {
    const keys = BADGE_REGISTRY.map((b) => b.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(17);
  });

  it("all 4 categories are present", () => {
    const categories = new Set(BADGE_REGISTRY.map((b) => b.category));
    expect(categories).toEqual(
      new Set(["explorador", "perfeccionista", "aventureiro", "veterano"])
    );
  });

  it("has correct badge count per category", () => {
    const explorador = BADGE_REGISTRY.filter((b) => b.category === "explorador");
    const perfeccionista = BADGE_REGISTRY.filter((b) => b.category === "perfeccionista");
    const aventureiro = BADGE_REGISTRY.filter((b) => b.category === "aventureiro");
    const veterano = BADGE_REGISTRY.filter((b) => b.category === "veterano");

    expect(explorador).toHaveLength(4);
    expect(perfeccionista).toHaveLength(4);
    expect(aventureiro).toHaveLength(5);
    expect(veterano).toHaveLength(4);
  });

  it("every badge has required fields", () => {
    for (const badge of BADGE_REGISTRY) {
      expect(badge.key).toBeTruthy();
      expect(badge.nameKey).toBeTruthy();
      expect(badge.descriptionKey).toBeTruthy();
      expect(badge.category).toBeTruthy();
      expect(badge.icon).toBeTruthy();
      expect(badge.criteriaType).toBeTruthy();
      expect(typeof badge.threshold).toBe("number");
    }
  });

  it("all nameKeys follow i18n pattern", () => {
    for (const badge of BADGE_REGISTRY) {
      expect(badge.nameKey).toMatch(/^gamification\.badges\.\w+\.name$/);
      expect(badge.descriptionKey).toMatch(
        /^gamification\.badges\.\w+\.description$/
      );
    }
  });

  it("explorador badges have correct thresholds", () => {
    const thresholds = BADGE_REGISTRY.filter(
      (b) => b.category === "explorador"
    ).map((b) => b.threshold);
    expect(thresholds).toEqual([1, 3, 5, 10]);
  });

  it("contains specific known badge keys", () => {
    const keys = BADGE_REGISTRY.map((b) => b.key);
    const expectedKeys: BadgeKey[] = [
      "primeira_viagem",
      "viajante_frequente",
      "globetrotter",
      "marco_polo",
      "detalhista",
      "planejador_nato",
      "zero_pendencias",
      "revisor",
      "sem_fronteiras",
      "em_familia",
      "solo_explorer",
      "poliglota",
      "multicontinental",
      "fiel",
      "maratonista",
      "fundador",
      "aniversario",
    ];
    for (const key of expectedKeys) {
      expect(keys).toContain(key);
    }
  });
});

describe("getBadgeDefinition", () => {
  it("returns badge for known key", () => {
    const badge = getBadgeDefinition("primeira_viagem");
    expect(badge).toBeDefined();
    expect(badge?.key).toBe("primeira_viagem");
    expect(badge?.category).toBe("explorador");
  });

  it("returns undefined for unknown key", () => {
    const badge = getBadgeDefinition("not_a_badge" as BadgeKey);
    expect(badge).toBeUndefined();
  });
});

describe("getBadgesByCategory", () => {
  it("returns explorador badges", () => {
    const badges = getBadgesByCategory("explorador");
    expect(badges).toHaveLength(4);
    expect(badges.every((b) => b.category === "explorador")).toBe(true);
  });

  it("returns empty for unknown category", () => {
    const badges = getBadgesByCategory("unknown" as "explorador");
    expect(badges).toHaveLength(0);
  });
});
