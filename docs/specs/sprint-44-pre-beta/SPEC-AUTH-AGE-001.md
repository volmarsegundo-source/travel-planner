# SPEC-AUTH-AGE-001 — 18+ age gate at signup

**Status**: Approved (PO Volmar, 2026-04-19)
**Sprint**: 44 — pre-Beta
**Owner**: dev-fullstack-1

## 1. Problem

Pre-Beta launches the product publicly. The AI features require users to be 18+ (enforced today only by `canUseAI` at AI-call sites, and only when `UserProfile.birthDate` is populated — which is optional). A minor can register, never fill in a DOB, and appear adult to the guard. Pre-Beta needs a hard 18+ gate at signup.

## 2. Line-exact root cause

- `src/lib/validations/user.schema.ts:22-26` — `UserSignUpSchema` has no `dateOfBirth` field.
- `src/server/actions/auth.actions.ts:32-37` — validates only email/password/name, never DOB.
- `src/server/services/auth.service.ts:36-72` — `registerUser` signature takes only email/password/name; never creates a `UserProfile` row with `birthDate`.
- `src/components/features/auth/RegisterFormV2.tsx:189-198` — form has no DOB input.
- `src/lib/guards/age-guard.ts:10-23` — `canUseAI` returns `true` when `birthDate` is null/undefined (permissive by design); cannot be reused as a hard gate.
- `prisma/schema.prisma:366` — `UserProfile.birthDate` already exists. Zero schema migration needed.

## 3. 9-dimension summary

| Dim | Content |
|---|---|
| PROD | Users must confirm DOB at signup. DOB < 18 years from today (leap-year-aware) → signup blocked with clear localized message. |
| UX | New field on RegisterFormV2 between Password and Confirm Password: native `<input type="date">` with max attribute = today. Inline error. Legal text is unchanged (terms already cover minors clause). |
| TECH | `UserSignUpSchema.dateOfBirth: z.string().refine(isValidIsoDate).refine(isAdult)`. Action persists DOB on `UserProfile` after creating User. Reuse existing `UserProfile.birthDate` column. Zero Prisma migration. |
| SEC | DOB is PII. Do not log it. Store only on `UserProfile`. Never expose via API responses. |
| AI | `canUseAI()` remains the downstream check for AI calls; both guards share `isAdult`. |
| INFRA | No new infra. |
| QA | BDD: (1) adult signs up successfully; (2) minor (17y 364d) blocked with i18n error; (3) leap-year boundary (born 2008-02-29, today 2026-02-28) → still 17, blocked; (4) invalid date string → Zod rejection. Plus unit tests for `isAdult()`. |
| RELEASE | No flag; merge direct. Existing users without DOB remain unaffected (no backfill). |
| COST | N/A. |

## 4. Acceptance criteria

1. AC-A-001: `isAdult(dateOfBirth: Date \| string, referenceDate?: Date)` returns `true` iff on `referenceDate` (default today) the person is ≥ 18 years old. Handles leap-year boundaries correctly.
2. AC-A-002: `UserSignUpSchema` requires `dateOfBirth`; rejects minors with `auth.errors.ageUnderage`; rejects invalid date strings with `auth.errors.dateInvalid`.
3. AC-A-003: `registerAction` passes through DOB to `AuthService.registerUser`, which creates a `UserProfile` row with `birthDate`.
4. AC-A-004: RegisterFormV2 renders a required DOB input with max=today. Submission of a minor DOB surfaces the i18n error below the field.
5. AC-A-005: EN + PT-BR i18n keys added: `authV2.dobLabel`, `authV2.dobPlaceholder`, `auth.errors.ageUnderage`, `auth.errors.dateInvalid`.

## 5. Out of scope (tracked as follow-up)

- **Google OAuth DOB collection**: Google does not expose DOB. A follow-up spec will add a post-signin DOB step for social logins. Tracked as `SPEC-AUTH-AGE-002` (not in this sprint).
- **Backfill for existing users without DOB**: no retroactive enforcement.

## 6. Gate EDD (symbolic)

- PR ≥ 0.80 | Staging ≥ 0.85 | Prod ≥ 0.90
- Weights: Safety 30% + Accuracy 25% + Performance 20% + UX 15% + i18n 10%
- Scoring for this PR: schema enforcement + leap-year util + 4 BDD scenarios + i18n coverage = self-rated 0.88.
