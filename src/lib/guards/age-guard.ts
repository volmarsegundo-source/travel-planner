import "server-only";

const MINIMUM_AI_AGE = 18;

/**
 * Check if a user is old enough to use AI features.
 * Returns true if birthDate indicates age >= 18.
 * Returns true if birthDate is null/undefined (no restriction without data).
 */
export function canUseAI(birthDate: Date | null | undefined): boolean {
  if (!birthDate) return true;

  const today = new Date();
  const birth = new Date(birthDate);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= MINIMUM_AI_AGE;
}

/**
 * Get the age restriction message key for i18n.
 */
export function getAgeRestrictionMessage(): string {
  return "errors.aiAgeRestricted";
}
