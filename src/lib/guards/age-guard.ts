import { logger } from "@/lib/logger";

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

/**
 * Guard used at AI call sites.
 *
 * D-02 (Sprint 46) — F-02 MEDIUM closure: previously returned `true`
 * when `birthDate` was null/undefined for legacy-user permissiveness.
 * That permissive default was unreachable for users coming through
 * `(app)/layout.tsx` (which redirects null-birthDate users to
 * `/auth/complete-profile`), but the `/api/ai/(guide|plan)/stream`
 * routes skip the layout and relied on this guard alone. The hole is
 * now closed:
 * fail-closed for null/undefined, plus a warn log for visibility into
 * any future caller that ships without proper null handling upstream.
 */
export function canUseAI(birthDate: Date | string | null | undefined): boolean {
  if (birthDate === null || birthDate === undefined) {
    // Visibility for callers that should have funneled the user through
    // the layout's birthDate gate before reaching this point. The event
    // name is enumerated; payload carries no caller-supplied data.
    logger.warn("auth.age_guard.null_birthdate");
    return false;
  }
  return isAdult(birthDate);
}

export function getAgeRestrictionMessage(): string {
  return "errors.aiAgeRestricted";
}
