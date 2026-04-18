/**
 * Client-safe age calculation utilities.
 *
 * Unlike `age-guard.ts` (server-only), this module can be imported
 * in both server and client components.
 */

const MINIMUM_AI_AGE = 18;

/**
 * Calculate age from a birth date. Returns null if birthDate is null/undefined.
 */
export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if a user is a minor (under 18).
 * Returns false if birthDate is null/undefined (no restriction without data).
 */
export function isMinor(birthDate: Date | string | null | undefined): boolean {
  const age = calculateAge(birthDate);
  if (age === null) return false;
  return age < MINIMUM_AI_AGE;
}
