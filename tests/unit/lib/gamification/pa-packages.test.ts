/**
 * Unit tests for PA packages.
 *
 * Tests cover:
 * - All 4 packages are defined
 * - Price validation (positive cents, correct PA values)
 * - Currency is BRL for all packages
 * - getPackage lookup (valid + invalid)
 * - PA/price ratio increases for higher-tier packages (better value)
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PA_PACKAGES, getPackage } from "@/lib/gamification/pa-packages";
import type { PackageId } from "@/lib/gamification/pa-packages";

describe("PA_PACKAGES", () => {
  it("contains exactly 4 packages", () => {
    const keys = Object.keys(PA_PACKAGES);
    expect(keys).toHaveLength(4);
  });

  it("has correct package IDs", () => {
    expect(Object.keys(PA_PACKAGES)).toEqual([
      "explorador",
      "navegador",
      "cartografo",
      "embaixador",
    ]);
  });

  it("all packages have positive PA amounts", () => {
    for (const pkg of Object.values(PA_PACKAGES)) {
      expect(pkg.pa).toBeGreaterThan(0);
    }
  });

  it("all packages have positive price in cents", () => {
    for (const pkg of Object.values(PA_PACKAGES)) {
      expect(pkg.amountCents).toBeGreaterThan(0);
    }
  });

  it("all packages use BRL currency", () => {
    for (const pkg of Object.values(PA_PACKAGES)) {
      expect(pkg.currency).toBe("BRL");
    }
  });

  it("explorador has 500 PA for R$14.90", () => {
    expect(PA_PACKAGES.explorador.pa).toBe(500);
    expect(PA_PACKAGES.explorador.amountCents).toBe(1490);
  });

  it("navegador has 1200 PA for R$29.90", () => {
    expect(PA_PACKAGES.navegador.pa).toBe(1200);
    expect(PA_PACKAGES.navegador.amountCents).toBe(2990);
  });

  it("cartografo has 2800 PA for R$59.90", () => {
    expect(PA_PACKAGES.cartografo.pa).toBe(2800);
    expect(PA_PACKAGES.cartografo.amountCents).toBe(5990);
  });

  it("embaixador has 6000 PA for R$119.90", () => {
    expect(PA_PACKAGES.embaixador.pa).toBe(6000);
    expect(PA_PACKAGES.embaixador.amountCents).toBe(11990);
  });

  it("higher-tier packages offer better PA/R$ ratio", () => {
    const ratios = Object.values(PA_PACKAGES).map(
      (pkg) => pkg.pa / (pkg.amountCents / 100)
    );
    // Each subsequent package should have equal or better ratio
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeGreaterThanOrEqual(ratios[i - 1]);
    }
  });

  it("all packages have i18n nameKey", () => {
    for (const pkg of Object.values(PA_PACKAGES)) {
      expect(pkg.nameKey).toMatch(/^gamification\.packages\.\w+$/);
    }
  });
});

describe("getPackage", () => {
  it("returns package for valid ID", () => {
    const pkg = getPackage("navegador");
    expect(pkg).toBeDefined();
    expect(pkg?.id).toBe("navegador");
    expect(pkg?.pa).toBe(1200);
  });

  it("returns undefined for invalid ID", () => {
    const pkg = getPackage("invalid_package");
    expect(pkg).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    const pkg = getPackage("");
    expect(pkg).toBeUndefined();
  });
});
