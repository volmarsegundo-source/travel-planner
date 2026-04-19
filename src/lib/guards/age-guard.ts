const MINIMUM_AI_AGE = 18;

function toDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeAgeYears(birth: Date, reference: Date): number {
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && reference.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

// Leap-year aware: someone born 2008-02-29 is still 17 on 2026-02-28 and
// turns 18 on 2026-03-01 — because `getDate()` for Feb 29 on a non-leap
// reference month of February will already have rolled to March in the
// Date object. To be safe, we normalize both sides via getFullYear/
// getMonth/getDate (which reflect local calendar values without rollover).
export function isAdult(
  dateOfBirth: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  const birth = toDate(dateOfBirth);
  if (!birth) return false;
  if (birth.getTime() > referenceDate.getTime()) return false;
  return computeAgeYears(birth, referenceDate) >= MINIMUM_AI_AGE;
}

// Legacy guard used at AI call sites. Kept permissive (returns true when
// birthDate is absent) because existing users predate the signup-time
// requirement. Signup now enforces via isAdult directly.
export function canUseAI(birthDate: Date | null | undefined): boolean {
  if (!birthDate) return true;
  return isAdult(birthDate);
}

export function getAgeRestrictionMessage(): string {
  return "errors.aiAgeRestricted";
}
