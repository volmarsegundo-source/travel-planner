import "server-only";

// ─── PA Packages ────────────────────────────────────────────────────────────
//
// Atlas Points purchase packages. Prices in BRL cents.

export const PA_PACKAGES = {
  explorador: {
    id: "explorador",
    nameKey: "gamification.packages.explorador",
    pa: 500,
    amountCents: 1490,
    currency: "BRL",
  },
  navegador: {
    id: "navegador",
    nameKey: "gamification.packages.navegador",
    pa: 1200,
    amountCents: 2990,
    currency: "BRL",
  },
  cartografo: {
    id: "cartografo",
    nameKey: "gamification.packages.cartografo",
    pa: 2800,
    amountCents: 5990,
    currency: "BRL",
  },
  embaixador: {
    id: "embaixador",
    nameKey: "gamification.packages.embaixador",
    pa: 6000,
    amountCents: 11990,
    currency: "BRL",
  },
} as const;

export type PackageId = keyof typeof PA_PACKAGES;

/**
 * Validate and retrieve a package by ID.
 * Returns undefined if the packageId is not valid.
 */
export function getPackage(packageId: string) {
  if (packageId in PA_PACKAGES) {
    return PA_PACKAGES[packageId as PackageId];
  }
  return undefined;
}
