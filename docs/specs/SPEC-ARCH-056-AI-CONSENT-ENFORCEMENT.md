# Technical Specification: AI Consent Enforcement

**Spec ID**: SPEC-ARCH-056
**Related Story**: SPEC-PROD-056 (AI Consent Modal)
**Author**: architect
**Status**: Approved
**Version**: 1.0.0
**Last Updated**: 2026-04-18

---

## 1. Overview

This spec defines the server-side data model, action contracts, and enforcement strategy for LGPD-compliant AI consent gating. Three nullable fields are added to `UserProfile`; a reusable guard function blocks all AI generation actions for unconsented users; and a dedicated server action records the consent decision with an auditable log entry.

## 2. Architecture Diagram

```
 Client (Phase 5/6 page.tsx)          Server Actions                     Database
 ┌────────────────────────┐
 │ page.tsx loads          │
 │ UserProfile.aiConsent*  │──(server component read)──┐
 │                         │                            │
 │ if null/false:          │                            │
 │   render AiConsentModal │                            │
 │   ┌──────────────────┐  │                            │
 │   │ "Aceitar"        │──┼──► recordAiConsentAction ──┼──► UPDATE user_profiles
 │   │ "Nao, obrigado"  │──┼──► recordAiConsentAction ──┼──► UPDATE user_profiles
 │   └──────────────────┘  │       │                    │
 │                         │       ▼                    │
 │ if true:                │   logger.info(consent.*)   │
 │   render Generate btn   │                            │
 │   onClick ──────────────┼──► generateDestGuideAction ┤
 │                         │       │                    │
 │                         │   assertAiConsent(userId) ─┼──► SELECT aiConsentGiven
 │                         │       │ throws if ≠ true   │
 │                         │       ▼                    │
 │                         │   (proceed with AI call)   │
 └────────────────────────┘
```

## 3. Data Model Changes

### 3.1 Schema Diff

File: `prisma/schema.prisma` (UserProfile model, line ~363)

```diff
 model UserProfile {
   userId              String    @id
   user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
   birthDate           DateTime?
   phone               String?   @db.VarChar(20)
   country             String?   @db.VarChar(100)
   city                String?   @db.VarChar(100)
   address             String?   @db.VarChar(300)
   passportNumberEnc   String?   @db.Text
   passportExpiry      DateTime?
   nationalIdEnc       String?   @db.Text
   bio                 String?   @db.VarChar(500)
   dietaryRestrictions String?   @db.VarChar(300)
   accessibility       String?   @db.VarChar(300)
   preferences         Json?     @default("{}")
   completionScore     Int       @default(0)
+  aiConsentGiven      Boolean?
+  aiConsentAt         DateTime?
+  aiConsentVersion    String?   @db.VarChar(10)
   createdAt           DateTime  @default(now())
   updatedAt           DateTime  @updatedAt

   @@map("user_profiles")
 }
```

### 3.2 Migration

- **Name**: `ai_consent_fields`
- **Command**: `npx prisma migrate dev --name ai_consent_fields`
- **SQL produced** (expected):
  ```sql
  ALTER TABLE "user_profiles" ADD COLUMN "aiConsentGiven" BOOLEAN;
  ALTER TABLE "user_profiles" ADD COLUMN "aiConsentAt" TIMESTAMP(3);
  ALTER TABLE "user_profiles" ADD COLUMN "aiConsentVersion" VARCHAR(10);
  ```

### 3.3 Indexing Decision

No index needed. Justification:
- `aiConsentGiven` is only queried scoped to a single `userId` (PK lookup) -- never in a WHERE across the table.
- Cardinality is extremely low (3 states: null, true, false).
- An index would waste storage for zero query benefit.

## 4. Server Action Contracts

### 4.1 `recordAiConsentAction`

**File**: `src/server/actions/consent.actions.ts`

```typescript
// Contract — do not implement yet
"use server";
import "server-only";

// Schema
const ConsentDecisionSchema = z.enum(["accepted", "refused"]);

export async function recordAiConsentAction(
  decision: "accepted" | "refused"
): Promise<ActionResult<{ ok: true }>>
```

| Aspect | Detail |
|--------|--------|
| Auth | `auth()` session required; throws `UnauthorizedError` if missing |
| Validation | `ConsentDecisionSchema.parse(decision)` |
| DB write | `db.userProfile.upsert({ where: { userId }, create: { userId, aiConsentGiven: decision === "accepted", aiConsentAt: new Date(), aiConsentVersion: "v1" }, update: { aiConsentGiven: decision === "accepted", aiConsentAt: new Date(), aiConsentVersion: "v1" } })` |
| Logging | `logger.info("consent.recorded", { userId: hashUserId(userId), decision, version: "v1", timestamp: new Date().toISOString() })` |
| Return | `{ ok: true, data: { ok: true } }` on success |
| Errors | `UnauthorizedError` (401), `ValidationError` (422), `AppError` (500) |
| Rate limit | Not needed (one-time action, idempotent) |

**Note**: Use `upsert` because some users may not have a `UserProfile` row yet (e.g., users who registered but skipped onboarding). The `create` branch must include `userId` and the consent fields; all other `UserProfile` fields default to null/0.

### 4.2 `assertAiConsent` Guard

**File**: `src/lib/guards/ai-consent-guard.ts`

```typescript
// Contract
export async function assertAiConsent(userId: string): Promise<void>
// Throws ForbiddenError("AI_CONSENT_REQUIRED") if aiConsentGiven !== true
```

| Aspect | Detail |
|--------|--------|
| Query | `db.userProfile.findUnique({ where: { userId }, select: { aiConsentGiven: true } })` |
| Behavior | If `profile === null` or `profile.aiConsentGiven !== true` -> throw `ForbiddenError("AI_CONSENT_REQUIRED")` |
| Error key | `"AI_CONSENT_REQUIRED"` — client maps this to show the consent modal or redirect |
| Import | `"server-only"` — this guard must never run on the client |

### 4.3 Actions That Must Call `assertAiConsent`

Every server action that triggers an AI model call. Based on grep of `src/server/actions/`:

| # | Action | File | Line |
|---|--------|------|------|
| 1 | `generateTravelPlanAction` | `src/server/actions/ai.actions.ts` | 65 |
| 2 | `generateChecklistAction` | `src/server/actions/ai.actions.ts` | 196 |
| 3 | `generateDestinationGuideAction` | `src/server/actions/expedition.actions.ts` | 877 |
| 4 | `regenerateGuideAction` | `src/server/actions/expedition.actions.ts` | 1068 |
| 5 | `regenerateItineraryAction` | `src/server/actions/itinerary.actions.ts` | 337 |

**Integration point**: Insert `await assertAiConsent(session.user.id)` immediately after the auth check and before any rate limit or AI call. Example insertion site for `generateTravelPlanAction`:

```
Line 69: const session = await auth();
Line 70: if (!session?.user?.id) throw new UnauthorizedError();
+        await assertAiConsent(session.user.id);
Line 84: const rl = await checkRateLimit(...)
```

**Scope note**: SPEC-PROD-056 states Phase 3 checklist is out of scope for v1 (line 127). However, `generateChecklistAction` (#2) also calls an AI model. The architect recommendation is to **include the guard on all 5 actions** for consistency -- blocking AI without consent regardless of phase. If PO disagrees, remove #2 from the list.

## 5. OQ-056-01 Resolution: Existing Users Migration

### Decision: Grandfather existing users

Users who have already triggered AI generation (have a `DestinationGuide` or `ItineraryPlan` record) are treated as implicitly consented under LGPD Art. 8, par. 1 ("continued use" with transparent privacy policy constitutes consent).

**Data migration script** (run after schema migration):

```sql
-- Grandfather: set consent for users who already have AI-generated content
UPDATE user_profiles
SET
  "aiConsentGiven" = true,
  "aiConsentVersion" = 'v0-legacy',
  "aiConsentAt" = NULL
WHERE "userId" IN (
  SELECT DISTINCT t."userId"
  FROM trips t
  WHERE t."userId" IS NOT NULL
    AND t."deletedAt" IS NULL
    AND (
      EXISTS (SELECT 1 FROM destination_guides dg WHERE dg."tripId" = t.id)
      OR EXISTS (SELECT 1 FROM itinerary_plans ip WHERE ip."tripId" = t.id)
    )
)
AND "aiConsentGiven" IS NULL;
```

**Why not force the modal on everyone**:
- Existing beta testers already used AI knowingly -- re-prompting adds friction with no LGPD benefit.
- `aiConsentAt = NULL` distinguishes legacy consent from explicit consent (auditable).
- `aiConsentVersion = "v0-legacy"` enables future re-consent if policy changes materially.
- If re-consent is ever required, a query `WHERE aiConsentVersion = 'v0-legacy'` identifies these users.

**Execution**: Run as a one-time data migration (separate from schema migration). Can be a Prisma `prisma db execute` or a manual SQL script. Do NOT embed in the Prisma migration file (data migrations should be separate from schema migrations per project convention).

## 6. Client Integration Contract

This section specifies behavior -- implementation is the developer's responsibility.

### 6.1 Phase 5/6 Server Component (page.tsx)

The `page.tsx` for Phase 5 and Phase 6 already loads user data server-side. Add a query for `aiConsentGiven`:

```typescript
// In page.tsx (server component)
const profile = await db.userProfile.findUnique({
  where: { userId: session.user.id },
  select: { aiConsentGiven: true },
});

// Pass to client
<Phase5Wizard aiConsentGiven={profile?.aiConsentGiven ?? null} />
```

### 6.2 Client Component Behavior

| `aiConsentGiven` | UI Behavior |
|-------------------|-------------|
| `true` | Render generate/regenerate button normally. No modal. |
| `null` | On generate button click, show `AiConsentModal` instead of calling action. |
| `false` | Show disabled state or info message. Optionally allow re-triggering the modal (v2). |

### 6.3 AiConsentModal Component

**File**: `src/components/features/consent/AiConsentModal.tsx`

- Uses Radix Dialog (via shadcn `Dialog`) with `onOpenChange` disabled (no dismiss).
- `onEscapeKeyDown: (e) => e.preventDefault()` and `onPointerDownOutside: (e) => e.preventDefault()`.
- Two buttons: primary ("Aceitar e continuar") calls `recordAiConsentAction("accepted")`, then triggers the generation. Secondary ("Nao, obrigado") calls `recordAiConsentAction("refused")`, then `router.push("/expeditions")` with toast.
- All text via i18n keys under `consent.modal.*` namespace.
- Link to `/privacy` rendered as `<Link>`.

### 6.4 On Refuse: Redirect with Toast

```
redirect to: /{locale}/expeditions
toast message: i18n key "consent.modal.refusedMessage"
  pt-BR: "Voce optou por nao usar IA. Voce pode alterar isso nas configuracoes."
  en:    "You chose not to use AI. You can change this in settings."
```

## 7. Security / LGPD Considerations

| Concern | Mitigation |
|---------|------------|
| Client bypass | `assertAiConsent` runs server-side in every AI action. Modal is advisory; guard is authoritative. (AC-CONSENT-007) |
| Audit trail | `logger.info("consent.recorded", ...)` with hashed userId, decision, version, ISO timestamp. No PII beyond hashed userId. Follows existing `hashUserId()` pattern from `ai.actions.ts:11`. |
| Data minimization | Only 3 fields stored. No IP address, user-agent, or fingerprint in DB (could be in access logs). |
| Revocation | Out of scope for v1. Schema supports it: set `aiConsentGiven = false`. Guard will block subsequent AI calls immediately. |
| Re-consent on version change | Out of scope for v1. Schema supports it: compare `aiConsentVersion` against `CURRENT_CONSENT_VERSION` constant. |
| BOLA | `assertAiConsent` uses `session.user.id` from auth -- no user-supplied userId. |

## 8. Performance Requirements

| Metric | Target |
|--------|--------|
| `assertAiConsent` latency | < 5ms (single PK lookup, no join) |
| `recordAiConsentAction` latency | < 20ms (single upsert) |
| Added overhead per AI call | ~1 extra DB query (PK lookup). Negligible vs. AI generation latency (2-10s). |
| Caching | Not needed. One extra PK read per AI call is trivial. If volume grows, add `select: { aiConsentGiven: true }` to the existing profile query already made in the action flow to avoid an extra round-trip. |

## 9. Testing Strategy

### 9.1 Unit Tests

**File**: `src/server/actions/__tests__/consent.actions.test.ts` (new)

| Test Case | Assertion |
|-----------|-----------|
| Unauthenticated call | Throws `UnauthorizedError` |
| Accept consent (new user, no profile) | Creates `UserProfile` with `aiConsentGiven=true`, `aiConsentVersion="v1"`, `aiConsentAt` set |
| Accept consent (existing profile) | Updates fields, leaves other profile fields untouched |
| Refuse consent | Sets `aiConsentGiven=false`, version and timestamp set |
| Idempotent accept | Calling accept twice does not error, updates timestamp |
| Invalid decision value | Throws `ValidationError` |
| Logger called | Verify `logger.info("consent.recorded", ...)` with correct shape |

**File**: `src/lib/guards/__tests__/ai-consent-guard.test.ts` (new)

| Test Case | Assertion |
|-----------|-----------|
| Profile with `aiConsentGiven=true` | Does not throw |
| Profile with `aiConsentGiven=false` | Throws `ForbiddenError("AI_CONSENT_REQUIRED")` |
| Profile with `aiConsentGiven=null` | Throws `ForbiddenError("AI_CONSENT_REQUIRED")` |
| No profile row exists | Throws `ForbiddenError("AI_CONSENT_REQUIRED")` |

### 9.2 Integration: Existing AI Action Tests

For each of the 5 actions listed in Section 4.3, add at minimum:

| Test Case | Assertion |
|-----------|-----------|
| Call without consent | Returns/throws `AI_CONSENT_REQUIRED` error |
| Call with consent | Proceeds normally (existing tests, add consent setup in `beforeEach`) |

### 9.3 Component Tests

**File**: `src/components/features/consent/__tests__/AiConsentModal.test.tsx` (new)

| Test Case | Assertion |
|-----------|-----------|
| Renders title and body text (pt-BR) | Text matches i18n keys |
| No X button / no dismiss on Escape | `onEscapeKeyDown` prevented, no close button rendered |
| Accept button calls action with "accepted" | `recordAiConsentAction` called |
| Refuse button calls action with "refused" | `recordAiConsentAction` called, router.push to /expeditions |
| Privacy link points to /privacy | `href="/privacy"` |

### 9.4 E2E Tests (Playwright)

| Scenario | Steps |
|----------|-------|
| Happy path | New user -> navigate to Phase 5 -> modal appears -> click "Aceitar" -> generation starts -> modal never shown again |
| Unhappy path | New user -> navigate to Phase 5 -> modal appears -> click "Nao, obrigado" -> redirected to /expeditions -> toast shown -> no AI call made |

## 10. Implementation Notes for Developers

1. **Guard placement**: `assertAiConsent` goes after `auth()` check and before `checkRateLimit()`. If the user has no consent, don't waste a rate-limit token.

2. **Upsert, not update**: Some users may reach Phase 5 without ever visiting their profile (no `UserProfile` row). Use `upsert` in `recordAiConsentAction`.

3. **Error key mapping**: Add `"AI_CONSENT_REQUIRED"` to `src/lib/action-utils.ts` `mapErrorToKey` (or equivalent) so the client can distinguish this error from other `ForbiddenError`s.

4. **i18n keys**: Create namespace `consent.modal` in both `src/messages/pt.json` and `src/messages/en.json`. Keys: `title`, `body`, `privacyLink`, `acceptButton`, `refuseButton`, `refusedMessage`.

5. **Do NOT cache consent in JWT/session**: Consent can be revoked (future scope). Always read from DB. The PK lookup is negligible cost.

6. **`generateChecklistAction` scope**: Included in the guard list despite SPEC-PROD-056 scoping Phase 3 out. The guard is a 1-line addition and provides defense-in-depth. If PO objects, remove it -- the guard function itself remains reusable.

7. **Data migration ordering**: (1) Run schema migration `ai_consent_fields`. (2) Deploy code. (3) Run data migration SQL to grandfather existing users. Steps 2 and 3 can be swapped safely because the guard treats `null` as "no consent" -- existing users would just see the modal until the data migration runs.

## 11. Open Questions

- [x] **OQ-056-01**: Resolved. Grandfather existing users with `v0-legacy`. See Section 5.
- [ ] **OQ-056-02**: Pending security-specialist review of modal text for LGPD compliance. Non-blocking for implementation -- text can be updated via i18n keys without code change.

## 12. Definition of Done

- [ ] Schema migration `ai_consent_fields` applied successfully
- [ ] Data migration for existing users executed
- [ ] `recordAiConsentAction` implemented and tested
- [ ] `assertAiConsent` guard implemented and tested
- [ ] All 5 AI generation actions call `assertAiConsent` after auth check
- [ ] `AiConsentModal` component renders per AC-CONSENT-004/005
- [ ] i18n keys for `consent.modal.*` in pt-BR and en
- [ ] Unit test coverage >= 80% for new files
- [ ] E2E tests for happy + unhappy paths pass
- [ ] Logger emits structured `consent.recorded` entries
- [ ] No AI call possible without `aiConsentGiven = true` (verified by QA)

---

> Approved -- Ready for Development

---

## Changelog

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-04-18 | architect | Initial spec. Schema + actions + guard + OQ-056-01 resolution + test plan. |
