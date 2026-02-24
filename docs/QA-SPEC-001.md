# QA-SPEC-001: Test Strategy — Trip Creation & Management

**Strategy ID**: QA-SPEC-001
**Status**: Approved
**Date**: 2026-02-23
**Author**: qa-engineer
**Related**: SPEC-001, UX-001, SEC-SPEC-001, US-001
**Security refs**: SR-001 through SR-008, CR-001 through CR-004

---

## Coverage Summary

| AC ID | Acceptance Criterion | Test Type(s) | Priority |
|-------|---------------------|--------------|---------|
| AC-001 | Unauthenticated user at `/trips` redirected to `/login?callbackUrl=/trips` | E2E, Integration | P0 |
| AC-002 | Authenticated user sees only their own trips (userId isolation) | Unit, Integration, E2E | P0 |
| AC-003 | Form with required fields creates trip and redirects to `/trips/[id]` | Unit, Integration, E2E | P0 |
| AC-004 | End date before start date shows error on return date field | Unit, E2E | P0 |
| AC-005 | Required fields blank show specific error messages without page reload | Unit, E2E | P0 |
| AC-006 | Created trip shows title, destination, period, and status "Planejando" on detail page | Integration, E2E | P0 |
| AC-007 | Attempt to create more than 20 active trips shows limit message | Unit, Integration, E2E | P0 |
| AC-008 | Trip list ordered by start date (soonest first) with title, destination, period, status | Integration, E2E | P1 |
| AC-009 | Empty state with CTA "Criar minha primeira viagem" when user has no trips | E2E | P1 |
| AC-010 | Paginated list with 20 items per page when user has more than 20 trips | Integration, E2E | P1 |
| AC-011 | Edit persists changes and redirects to `/trips/[id]` | Unit, Integration, E2E | P0 |
| AC-012 | Access to `/trips/[id]/edit` of another user's trip returns 403 | Integration, E2E | P0 |
| AC-013 | Archive trip sets `status` to `ARCHIVED` (no soft delete — accessible via filter) | Unit, Integration, E2E | P1 |
| AC-014 | Delete trip sets `deletedAt` (soft delete) and removes from all listings | Unit, Integration, E2E | P0 |
| AC-015 | FCP under 1.5s on average 4G connection (Lighthouse, production) | Performance | P1 |
| AC-016 | Form fully operable by keyboard and compatible with screen readers (WCAG 2.1 AA) | Accessibility, E2E | P1 |
| AC-017 | All elements visible and interactive at 375px viewport without horizontal scroll | E2E | P1 |

---

## 1. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|-----------|------------|--------|---------------|
| BOLA/IDOR: user accesses another user's trip | Low | Critical | P0 |
| Soft delete bypass: deleted trip appears in query results | Low | Critical | P0 |
| Mass assignment: userId or status accepted from user input | Low | Critical | P0 |
| Trip limit not enforced server-side (only client-side) | Low | High | P0 |
| `redirect()` called inside `try/catch` — success path returns error | Medium | High | P0 |
| Date validation: end date before start date accepted | Low | High | P0 |
| Session not verified first in Server Actions | Low | High | P0 |
| Soft-delete middleware using deprecated `db.$use` (Prisma 7) | High | High | P0 |
| Race condition: two concurrent createTrip calls bypass 20-trip limit | Medium | Medium | P1 |
| N+1 query in `listTrips` causing performance degradation | Low | Medium | P1 |
| Cache key collision: `trips:detail:{tripId}` not scoped by userId | Low | Medium | P1 |
| `coverEmoji` accepting control characters or bidirectional overrides | Low | Medium | P1 |
| `confirmationTitle` in deleteTrip without max length constraint | Low | Low | P2 |
| Flaky E2E on native date pickers across browsers | High | Medium | P1 |
| Empty state not shown when all trips are soft-deleted | Medium | Medium | P1 |
| Analytics events dispatched without consent gate | Medium | High | P0 |
| CoverPicker not keyboard-navigable (arrow keys) | Low | Medium | P1 |
| 375px viewport: form fields causing horizontal scroll | Medium | Medium | P1 |
| Focus not moved to first error field after failed submit | Medium | Medium | P1 |

---

## 2. Test Pyramid

```
            [E2E]             <- 10 critical journeys (Playwright)
        [Integration]         <- 8 scenarios (real PostgreSQL, Prisma)
       [Unit Tests]           <- 35+ cases (Vitest + vitest-mock-extended)
```

**Unit**: Business logic in `TripService`, all Zod schemas (`TripCreateSchema`, `TripUpdateSchema`, `TripArchiveSchema`, `TripDeleteSchema`), status machine (`isValidStatusTransition`), trip limit enforcement (`assertTripLimitNotReached`), cache key generation.

**Integration**: `TripService` methods against a real PostgreSQL test database (Docker, isolated), Prisma soft-delete middleware behavior, ownership enforcement at the query layer, cascade delete.

**E2E**: 10 critical user journeys via Playwright covering create, edit, archive, delete, limit enforcement, authentication enforcement, ownership isolation, keyboard accessibility, and mobile viewport.

---

## 3. Unit Tests

### File: `tests/unit/server/services/trip.service.test.ts`

**Framework**: Vitest + `vitest-mock-extended` (mock Prisma client)

**Setup**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/server/db/client", () => ({ db: mockDeep<PrismaClient>() }));

import { db } from "@/server/db/client";
import { TripService } from "@/server/services/trip.service";

beforeEach(() => { mockReset(db); });
```

---

#### TripService.createTrip

| Test ID | Description | Expected |
|---------|-------------|----------|
| UT-001 | Happy path: valid input creates trip and returns object with CUID2 id | Returns `{ id, title, destination, status: "PLANNING" }` |
| UT-002 | Auth enforcement: userId comes from function parameter, never from input data | `db.trip.create` called with `userId` from argument, not from data object |
| UT-003 | Limit enforcement: 20 active trips → throws `AppError` with code `TRIP_LIMIT_REACHED` | Error thrown before any `db.trip.create` call |
| UT-004 | Limit enforcement: exactly 19 active trips → trip created successfully | `db.trip.create` is called once |
| UT-005 | Mass assignment guard: `status` field in input data is ignored | Created trip has `status: "PLANNING"` regardless of any status field passed |
| UT-006 | Mass assignment guard: `deletedAt` in input is ignored | Created trip does not have a non-null `deletedAt` |
| UT-007 | Mass assignment guard: `visibility` from input is ignored | Created trip uses default `PRIVATE` visibility |
| UT-008 | Explicit field mapping: Prisma `create` data does not use spread of user input | Assertion on `db.trip.create` call args shows explicit field-by-field mapping |

---

#### TripService.getTripById

| Test ID | Description | Expected |
|---------|-------------|----------|
| UT-009 | Happy path: returns trip when userId and tripId match | Returns trip object |
| UT-010 | Ownership enforcement: trip exists but belongs to a different user → throws `NotFoundError` | `NotFoundError` thrown (not `ForbiddenError` — no information leakage) |
| UT-011 | Trip not found: tripId does not exist → throws `NotFoundError` | `NotFoundError` thrown |
| UT-012 | Soft-delete enforcement: trip has `deletedAt` set → not returned | `findFirst` called with `deletedAt: null` in the where clause |
| UT-013 | Query includes userId in where clause | `db.trip.findFirst` called with `where: { id: tripId, userId, deletedAt: null }` |

---

#### TripService.updateTrip

| Test ID | Description | Expected |
|---------|-------------|----------|
| UT-014 | Happy path: partial update persists only supplied fields | `db.trip.update` called with only the supplied fields |
| UT-015 | Ownership enforcement: tripId belongs to different user → throws `NotFoundError` | Error thrown; `db.trip.update` not called |
| UT-016 | Status field rejected in update input | `db.trip.update` data does not include status field from user input |
| UT-017 | End date before start date → validation error | Service throws validation error before DB call |
| UT-018 | Past start date allowed in edit mode (unlike create) | No error thrown for past start date |

---

#### TripService.archiveTrip

| Test ID | Description | Expected |
|---------|-------------|----------|
| UT-019 | Happy path: sets `status` to `ARCHIVED` | `db.trip.update` called with `{ status: "ARCHIVED" }` |
| UT-020 | Does not set `deletedAt` | `db.trip.update` data does not contain `deletedAt` |
| UT-021 | Ownership enforcement: different userId → throws `NotFoundError` | Error before any DB write |
| UT-022 | Invalid status transition: ARCHIVED → ARCHIVED → throws `AppError` with code `INVALID_STATUS_TRANSITION` | Error thrown; `db.trip.update` not called |

---

#### TripService.deleteTrip

| Test ID | Description | Expected |
|---------|-------------|----------|
| UT-023 | Happy path: sets `deletedAt` to current timestamp | `db.trip.update` called with `{ deletedAt: expect.any(Date) }` |
| UT-024 | Hard delete never executed | `db.trip.delete` is never called in any code path |
| UT-025 | Ownership enforcement: different userId → throws `NotFoundError` | Error before any DB write |
| UT-026 | Confirmation title matches trip title → deletion proceeds | `db.trip.update` called |
| UT-027 | Confirmation title does not match trip title → throws `AppError` with code `INVALID_CONFIRMATION_TITLE` | Error thrown; `db.trip.update` not called |
| UT-028 | Confirmation title is case-sensitive match | "Ferias em Lisboa" does not match "ferias em lisboa" → error |

---

#### TripService.listTrips

| Test ID | Description | Expected |
|---------|-------------|----------|
| UT-029 | Returns only trips belonging to the given userId | `db.trip.findMany` called with `where: { userId, deletedAt: null }` |
| UT-030 | Ordered by startDate ascending (soonest first) | `orderBy: { startDate: "asc" }` in query |
| UT-031 | Excludes soft-deleted trips | `where.deletedAt: null` present in query |
| UT-032 | No N+1: single `findMany` call, no loop with individual queries | `db.trip.findMany` called exactly once |
| UT-033 | Status filter applied when `status` parameter supplied | `where.status` present in query |

---

#### isValidStatusTransition

| Test ID | Description | Expected |
|---------|-------------|----------|
| UT-034 | `PLANNING` → `ACTIVE`: valid | `true` |
| UT-035 | `PLANNING` → `ARCHIVED`: valid | `true` |
| UT-036 | `ACTIVE` → `COMPLETED`: valid | `true` |
| UT-037 | `ACTIVE` → `ARCHIVED`: valid | `true` |
| UT-038 | `COMPLETED` → `ARCHIVED`: valid | `true` |
| UT-039 | `ARCHIVED` → `PLANNING`: valid (future desarquivar) | `true` |
| UT-040 | `PLANNING` → `COMPLETED`: invalid | `false` |
| UT-041 | `COMPLETED` → `PLANNING`: invalid | `false` |
| UT-042 | `ARCHIVED` → `ACTIVE`: invalid | `false` |
| UT-043 | `ARCHIVED` → `COMPLETED`: invalid | `false` |

---

### File: `tests/unit/lib/validations/trip.schema.test.ts`

#### TripCreateSchema

| Test ID | Description | Expected |
|---------|-------------|----------|
| UV-001 | Valid input with all fields → passes validation | `parsed.success === true` |
| UV-002 | Valid input with only required fields (no description, default gradient/emoji) → passes | `parsed.success === true` |
| UV-003 | `title` missing → fails with "Por favor, de um nome para sua viagem" | Field error on `title` |
| UV-004 | `title` = "" (empty string) → fails | Field error on `title` |
| UV-005 | `title` = "AB" (2 chars, below min 3) → fails with "O nome precisa ter pelo menos 3 caracteres" | Field error on `title` |
| UV-006 | `title` = "ABC" (3 chars, exact min) → passes | `parsed.success === true` |
| UV-007 | `title` = 100-char string (exact max) → passes | `parsed.success === true` |
| UV-008 | `title` = 101-char string (exceeds max) → fails with "O nome pode ter no maximo 100 caracteres" | Field error on `title` |
| UV-009 | `destination` missing → fails with "Por favor, informe o destino da viagem" | Field error on `destination` |
| UV-010 | `destination` = "A" (1 char, below min 2) → fails with "Digite pelo menos 2 caracteres para o destino" | Field error on `destination` |
| UV-011 | `destination` = "AB" (2 chars, exact min) → passes | `parsed.success === true` |
| UV-012 | `destination` = 150-char string (exact max) → passes | `parsed.success === true` |
| UV-013 | `destination` = 151-char string (exceeds max) → fails | Field error on `destination` |
| UV-014 | `startDate` missing → fails with "Informe a data de partida" | Field error on `startDate` |
| UV-015 | `startDate` = today (midnight) → passes (not in the past) | `parsed.success === true` |
| UV-016 | `startDate` = yesterday → fails with "A data de partida nao pode ser no passado" | Field error on `startDate` |
| UV-017 | `endDate` missing → fails with "Informe a data de retorno" | Field error on `endDate` |
| UV-018 | `endDate` = `startDate` (same day, one-day trip) → passes | `parsed.success === true` |
| UV-019 | `endDate` < `startDate` → fails with "A data de retorno deve ser posterior a data de partida" on `endDate` | Field error on `endDate` |
| UV-020 | `description` = null → passes | `parsed.success === true` |
| UV-021 | `description` = 500-char string (exact max) → passes | `parsed.success === true` |
| UV-022 | `description` = 501-char string (exceeds max) → fails | Field error on `description` |
| UV-023 | `coverGradient` = "sunset" → passes | `parsed.success === true` |
| UV-024 | `coverGradient` = "invalid_gradient" → fails | Field error on `coverGradient` |
| UV-025 | All 8 valid gradient values accepted: sunset, ocean, forest, desert, aurora, city, sakura, alpine | 8x `parsed.success === true` |
| UV-026 | Unknown field `userId` in input → stripped (not present in output) | `parsed.data` has no `userId` key |
| UV-027 | Unknown field `id` in input → stripped | `parsed.data` has no `id` key |
| UV-028 | Unknown field `status` in input → stripped | `parsed.data` has no `status` key |
| UV-029 | Unknown field `deletedAt` in input → stripped | `parsed.data` has no `deletedAt` key |
| UV-030 | `title` with leading/trailing whitespace → trimmed before validation | `parsed.data.title` has no surrounding whitespace |

#### TripUpdateSchema

| Test ID | Description | Expected |
|---------|-------------|----------|
| UV-031 | All fields optional → empty object passes | `parsed.success === true` |
| UV-032 | `startDate` in the past → passes (edit mode allows past dates) | `parsed.success === true` |
| UV-033 | `endDate` before `startDate` when both supplied → fails on `endDate` | Field error on `endDate` |
| UV-034 | Only `endDate` supplied (no `startDate`) → passes (cross-field check skipped) | `parsed.success === true` |

#### TripDeleteSchema

| Test ID | Description | Expected |
|---------|-------------|----------|
| UV-035 | `confirmationTitle` with 101+ chars → fails (max 100 via SR-007) | Field error on `confirmationTitle` |
| UV-036 | `tripId` below min length (< 20 chars) → fails | Field error on `tripId` |
| UV-037 | `tripId` above max length (> 30 chars) → fails | Field error on `tripId` |

---

## 4. Integration Tests

### File: `tests/integration/trip.service.integration.test.ts`

**Framework**: Vitest + real PostgreSQL (Docker container, test-isolated database)
**Strategy**: Each test wraps execution in a database transaction that is rolled back after the test. No test pollution between cases.

**Setup requirements**:
- PostgreSQL test database accessible via `DATABASE_URL_TEST` environment variable
- Prisma migrations applied to test database before suite runs
- Test user seed: two synthetic users (`user-a-test@example.com`, `user-b-test@example.com`) created in `beforeAll`

| IT ID | Scenario | Assertions |
|-------|----------|------------|
| IT-001 | `createTrip` persists to database and returns object with valid CUID2 `id` | Trip row exists in DB; `id` matches CUID2 format (20-30 chars, alphanumeric) |
| IT-002 | `getTripById` does not return trips belonging to a different user | User B's `getTripById` with User A's tripId returns null / throws `NotFoundError` |
| IT-003 | `deleteTrip` sets `deletedAt` timestamp; trip excluded from subsequent `findMany` queries | `deletedAt` is non-null in DB; `listTrips(userId)` returns 0 results for that trip |
| IT-004 | `archiveTrip` sets `status = "ARCHIVED"` but does NOT set `deletedAt` | `status === "ARCHIVED"` in DB; `deletedAt` remains null |
| IT-005 | Trip limit: create 20 trips → 21st `createTrip` call throws `AppError` with code `TRIP_LIMIT_REACHED` | 20 rows in DB; error thrown on 21st; no 21st row created |
| IT-006 | Archived trips do not count toward the 20-trip active limit | Create 20 trips, archive 1, create another → succeeds (20 active + 1 archived) |
| IT-007 | Soft-delete middleware: trip with `deletedAt != null` never appears in `findMany` results | Direct DB update sets `deletedAt`; `listTrips` returns 0 results |
| IT-008 | Cascade delete: deleting `User` hard-deletes all associated `Trip` rows (GDPR erasure pipeline) | After `db.user.delete()`, no trips exist in DB for that userId |

**CR-003 Required Test (from SEC-SPEC-001)**:

```typescript
it("should not return soft-deleted trips in findMany (CR-003)", async () => {
  // Arrange: create a trip, then soft-delete it via direct DB update
  const trip = await TripService.createTrip(testUserId, validTripData);
  await db.trip.update({
    where: { id: trip.id },
    data: { deletedAt: new Date() },
  });

  // Act: list trips for the same user
  const trips = await TripService.listTrips(testUserId);

  // Assert: soft-deleted trip does not appear
  expect(trips.find((t) => t.id === trip.id)).toBeUndefined();
});
```

---

## 5. E2E Tests (Playwright)

### File: `tests/e2e/trips/trip-creation.spec.ts`
### File: `tests/e2e/trips/trip-management.spec.ts`
### File: `tests/e2e/trips/trip-security.spec.ts`

**Framework**: Playwright
**Browser targets**: Chromium (P0), Firefox (P1), WebKit/Safari (P1)
**Auth fixture**: `tests/e2e/fixtures/auth.ts` — injects authenticated session cookie; never reuses real user credentials

---

### Critical Flow 1: Create First Trip (Happy Path)

**E2E ID**: E2E-001
**Priority**: P0
**AC Coverage**: AC-003, AC-006, AC-009
**Persona**: Synthetic user with zero existing trips

```
Precondition: Authenticated user with 0 trips

1. Navigate to /trips
   Assert: empty state is visible
   Assert: element with text "Sua proxima aventura comeca aqui" is visible
   Assert: "Criar minha primeira viagem" CTA button is visible

2. Click "Criar minha primeira viagem" button
   Assert: URL is /trips/new
   Assert: form is visible with fields: title, destination, startDate, endDate

3. Fill title field with "Ferias na Tailandia"
   Assert: character counter shows "18/100"

4. Fill destination field with "Bangkok, Tailandia"

5. Fill startDate field with "2026-08-01"
   Assert: endDate field becomes enabled

6. Fill endDate field with "2026-08-15"

7. Click "Criar viagem" button
   Assert: button shows "Criando..." with spinner (loading state)

8. Wait for redirect to /trips/[id]
   Assert: URL matches /trips/[a-z0-9]+
   Assert: heading contains "Ferias na Tailandia"
   Assert: destination "Bangkok, Tailandia" is visible
   Assert: date range "01 ago — 15 ago 2026" is visible
   Assert: status badge "Planejando" is visible
   Assert: toast "Sua viagem foi criada com sucesso!" appears

9. Navigate to /trips
   Assert: trip card "Ferias na Tailandia" is visible in the grid
   Assert: TripCounter shows "1 de 20 viagens ativas"
```

**Pass Criteria**:
- [ ] Trip detail page loads with correct data
- [ ] Status defaults to "Planejando"
- [ ] TripCounter reflects new count
- [ ] Success toast is shown

---

### Critical Flow 2: Form Validation — Required Fields and Date Rules

**E2E ID**: E2E-002
**Priority**: P0
**AC Coverage**: AC-004, AC-005

```
Precondition: Authenticated user on /trips/new

1. Click "Criar viagem" without filling any fields
   Assert: page does NOT reload (no navigation)
   Assert: error message "Por favor, de um nome para sua viagem" visible near title field
   Assert: error message "Por favor, informe o destino da viagem" visible near destination field
   Assert: error message "Informe a data de partida" visible near startDate field
   Assert: focus moves to the first field with an error (title field)

2. Fill title with "AB" (below minimum length)
   Assert: inline error "O nome precisa ter pelo menos 3 caracteres" appears

3. Fill title with 101 characters (above max length)
   Assert: inline error "O nome pode ter no maximo 100 caracteres" appears

4. Fill title with "Viagem Valida", destination with "Roma, Italia"
   Fill startDate with "2026-09-10"
   Fill endDate with "2026-09-05" (before startDate)
   Click "Criar viagem"
   Assert: error message "A data de retorno deve ser posterior a data de partida" on endDate field
   Assert: no redirect occurred
   Assert: startDate field has NO error

5. Fix endDate to "2026-09-10" (same as startDate — one-day trip allowed)
   Assert: endDate error clears
   Click "Criar viagem"
   Assert: redirect to /trips/[id] succeeds
```

**Pass Criteria**:
- [ ] Each required field shows its specific error message
- [ ] Page does not reload on client-side validation failure
- [ ] Date cross-validation error appears on endDate, not startDate
- [ ] Same-day trip is accepted
- [ ] Focus moves to first error field

---

### Critical Flow 3: Edit Trip

**E2E ID**: E2E-003
**Priority**: P0
**AC Coverage**: AC-011

```
Precondition: Authenticated user with one existing trip "Viagem a Paris"

1. Navigate to /trips/[tripId]
2. Click "Editar viagem" button
   Assert: URL is /trips/[tripId]/edit
   Assert: title field is pre-filled with "Viagem a Paris"
   Assert: all other fields are pre-populated

3. Clear title field and type "Viagem a Paris 2026"
4. Change destination to "Paris, Ile-de-France"
5. Click "Salvar alteracoes"
   Assert: button shows "Salvando..." during submission

6. Wait for redirect to /trips/[tripId]
   Assert: heading shows "Viagem a Paris 2026"
   Assert: destination shows "Paris, Ile-de-France"
   Assert: toast "Alteracoes salvas com sucesso!" is visible

7. Navigate to /trips
   Assert: trip card shows updated title "Viagem a Paris 2026"
```

**Pass Criteria**:
- [ ] Edit form is pre-populated with existing values
- [ ] Changes are persisted after save
- [ ] Redirect returns to detail page, not list
- [ ] Updated data is immediately visible (cache invalidated)

---

### Critical Flow 4: Archive Trip

**E2E ID**: E2E-004
**Priority**: P1
**AC Coverage**: AC-013

```
Precondition: Authenticated user with one trip "Viagem ao Japao" in status PLANNING

1. Navigate to /trips
2. Hover over the "Viagem ao Japao" TripCard
   Assert: "..." context menu button becomes visible
3. Click "..." menu button
   Assert: dropdown opens with options: "Editar", "Arquivar viagem", "Excluir viagem"
4. Click "Arquivar viagem"
   Assert: confirmation dialog opens
   Assert: dialog title contains "Arquivar esta viagem?"
   Assert: dialog body contains "Viagem ao Japao"
5. Click "Arquivar" button in dialog
   Assert: dialog closes
   Assert: toast "Viagem arquivada" is visible
   Assert: "Viagem ao Japao" card disappears from the main list (fade-out animation)
   Assert: TripCounter decreases by 1

6. Click on "Arquivadas" tab filter
   Assert: "Viagem ao Japao" appears in the archived list
   Assert: status badge shows "Arquivada"

7. Navigate to /trips/[tripId] directly
   Assert: trip detail page loads (trip is still accessible when archived)
   Assert: status badge shows "Arquivada"
```

**Pass Criteria**:
- [ ] `status` changes to ARCHIVED in DB (not `deletedAt`)
- [ ] Trip removed from default listing
- [ ] Trip accessible via "Arquivadas" filter tab
- [ ] Trip detail page still loads directly
- [ ] TripCounter decrements

---

### Critical Flow 5: Delete Trip (with Name Confirmation)

**E2E ID**: E2E-005
**Priority**: P0
**AC Coverage**: AC-014

```
Precondition: Authenticated user with one trip titled "Ferias em Cancun"

1. Navigate to /trips/[tripId]
2. Click "..." menu button in trip detail page
3. Click "Excluir viagem"
   Assert: deletion confirmation dialog opens
   Assert: dialog title "Excluir permanentemente?"
   Assert: "Excluir permanentemente" button is DISABLED

4. Type "ferias em cancun" (wrong case) in confirmation field
   Assert: "Excluir permanentemente" button remains DISABLED

5. Clear confirmation field and type "Ferias em Cancun" (exact match)
   Assert: "Excluir permanentemente" button becomes ENABLED

6. Click "Excluir permanentemente"
   Assert: dialog closes
   Assert: redirect to /trips
   Assert: toast "Viagem excluida" is visible
   Assert: "Ferias em Cancun" does NOT appear in /trips list
   Assert: TripCounter decrements

7. Navigate directly to /trips/[tripId]
   Assert: 404 page shown (trip is soft-deleted and not found)
```

**Pass Criteria**:
- [ ] Delete button disabled until exact title match
- [ ] Confirmation is case-sensitive
- [ ] Soft delete: `deletedAt` set, not hard delete
- [ ] Trip disappears from all listings
- [ ] Direct URL access returns 404

---

### Critical Flow 6: Trip Limit Enforcement (20 Trips)

**E2E ID**: E2E-006
**Priority**: P0
**AC Coverage**: AC-007

```
Precondition: Authenticated user with exactly 20 active trips (seeded in test setup)

1. Navigate to /trips
   Assert: TripCounter shows "20 de 20 viagens ativas" in error color
   Assert: "Nova viagem" button has aria-disabled="true"
   Assert: "Nova viagem" button is visually disabled

2. Navigate to /trips/new directly (bypassing disabled button)
   Assert: page loads
   Assert: alert error banner visible: "Limite de viagens atingido..."
   Assert: alert contains link "Ver minhas viagens" pointing to /trips
   Assert: "Criar viagem" submit button is disabled

3. Submit the form by programmatic means (bypassing client-side disabled state)
   Assert: Server Action returns error with message containing "Limite de 20 viagens ativas"
   Assert: no new trip is created in the database
```

**Pass Criteria**:
- [ ] Client-side UI signals limit (disabled button, alert)
- [ ] Server-side enforcement independently blocks creation even if client is bypassed
- [ ] 21st trip is never persisted to DB

---

### Critical Flow 7: Paginated Trip List

**E2E ID**: E2E-007
**Priority**: P1
**AC Coverage**: AC-008, AC-010

```
Precondition: Authenticated user with 25 active trips seeded (all with distinct startDates)

1. Navigate to /trips
   Assert: exactly 20 trip cards visible
   Assert: pagination controls are visible
   Assert: trips are ordered by startDate ascending (soonest start date first)
   Assert: first card's startDate is earlier than last card's startDate

2. Click "Proxima pagina" in pagination
   Assert: URL updates to /trips?page=2
   Assert: 5 trip cards visible (remaining 5 trips)

3. Click "Pagina anterior" in pagination
   Assert: returns to page 1 with 20 cards
```

**Pass Criteria**:
- [ ] Pagination appears at 21+ trips
- [ ] Page size is exactly 20
- [ ] Sort order is startDate ascending (soonest first)

---

### Critical Flow 8: Authentication Enforcement

**E2E ID**: E2E-008
**Priority**: P0
**AC Coverage**: AC-001

```
Test with unauthenticated browser context (no session cookie)

1. Navigate to /trips
   Assert: redirect to /login?callbackUrl=%2Ftrips (or /login?callbackUrl=/trips)

2. Navigate to /trips/new
   Assert: redirect to /login?callbackUrl=%2Ftrips%2Fnew

3. Navigate to /trips/cj3k4m2p0000008le5gkh7jqq (any valid-format trip ID)
   Assert: redirect to /login?callbackUrl=...

4. Attempt POST to /_next/action (createTrip Server Action) without session
   Assert: response is 401 or redirect to login
   Assert: no trip created in database
```

**Pass Criteria**:
- [ ] All `/trips/*` routes redirect unauthenticated users
- [ ] callbackUrl parameter is preserved for post-login redirect
- [ ] Server Actions reject unauthenticated requests

---

### Security E2E Tests

#### E2E-009: Ownership Isolation (BOLA Prevention)

**E2E ID**: E2E-009
**Priority**: P0
**AC Coverage**: AC-002, AC-012
**Security ref**: SEC-001, SR-003

```
Precondition:
  - User A (test-user-a@example.com) owns trip with tripId = "trip-owned-by-user-a"
  - User B (test-user-b@example.com) is authenticated in a separate browser context

Test with User B's authenticated session:

1. Navigate to /trips/trip-owned-by-user-a
   Assert: 404 page shown (not 403 — no information leakage about trip existence)
   Assert: "Esta viagem nao existe ou foi excluida" message visible
   Assert: "Voltar para Minhas Viagens" link visible

2. Navigate to /trips/trip-owned-by-user-a/edit
   Assert: 404 or redirect — User B cannot access edit form

3. Attempt POST to updateTrip Server Action with tripId="trip-owned-by-user-a"
   Assert: action returns error
   Assert: trip data in DB is unchanged

4. Navigate to /trips with User B's session
   Assert: User A's trips are NOT visible in User B's list
   Assert: only User B's own trips shown
```

**Pass Criteria**:
- [ ] User B cannot read User A's trip via direct URL
- [ ] User B cannot edit User A's trip via Server Action
- [ ] `/trips` list contains only the authenticated user's trips
- [ ] Error response is 404 (not 403) to prevent trip existence enumeration

---

#### E2E-010: Keyboard Accessibility

**E2E ID**: E2E-010
**Priority**: P1
**AC Coverage**: AC-016

```
Precondition: Authenticated user on /trips/new (no mouse interaction)

1. Tab to "Nome da viagem" field
   Assert: focus ring visible on field
2. Type "Viagem Acessivel"
3. Tab to "Destino principal" field
   Assert: focus moves correctly
4. Type "Lisboa, Portugal"
5. Tab to "Data de partida"
   Assert: date field receives focus
6. Enter a valid date using keyboard
7. Tab to "Data de retorno"
   Assert: field is now enabled and focused
8. Enter a valid end date
9. Tab through description, CoverPicker options
   Assert: CoverPicker receives focus; arrow keys cycle through gradient options
   Assert: Space/Enter selects a gradient option
10. Tab to "Criar viagem" button
    Assert: button is focused
11. Press Enter to submit
    Assert: trip is created; redirect to /trips/[id]

Additional checks:
- On /trips: Tab order goes: header actions → status filter tabs → trip cards → pagination
- Dialog (archive): Tab trapped inside dialog; Escape closes dialog
- Dialog (delete): Tab trapped; Escape closes without deleting
- DropdownMenu on TripCard: opened with Enter/Space; arrow keys navigate; Escape closes
```

**Pass Criteria**:
- [ ] All form fields reachable and operable by Tab alone
- [ ] CoverPicker navigable with arrow keys
- [ ] Dialogs implement focus trap
- [ ] Escape key closes dialogs and menus
- [ ] Focus visible at all times (no focus loss to `body`)

---

## 6. Acceptance Test Checklist

Maps every US-001 AC to specific test(s):

| AC ID | Acceptance Criterion | Tests | Status |
|-------|---------------------|-------|--------|
| AC-001 | Unauthenticated user redirected to `/login?callbackUrl=/trips` | E2E-008 steps 1-2 | [ ] |
| AC-002 | User sees only their own trips | UT-029, IT-002, E2E-009 steps 4 | [ ] |
| AC-003 | Valid form creates trip, redirects to `/trips/[id]` | UT-001, IT-001, E2E-001 steps 7-8 | [ ] |
| AC-004 | End date before start date: error on return date field | UV-019, E2E-002 step 4 | [ ] |
| AC-005 | Required fields blank: specific inline errors, no page reload | UV-003 to UV-014, E2E-002 step 1 | [ ] |
| AC-006 | Created trip shows title, destination, period, status "Planejando" | IT-001, E2E-001 step 8 | [ ] |
| AC-007 | Attempt > 20 active trips shows limit message | UT-003, IT-005, E2E-006 | [ ] |
| AC-008 | List ordered by start date, shows title/destination/period/status | UT-030, E2E-007 step 1 | [ ] |
| AC-009 | Empty state with "Criar minha primeira viagem" CTA | E2E-001 step 1 | [ ] |
| AC-010 | Paginated list, 20 items per page | IT-005 (data), E2E-007 | [ ] |
| AC-011 | Edit persists and redirects to `/trips/[id]` | UT-014, IT-001, E2E-003 | [ ] |
| AC-012 | `/trips/[id]/edit` of another user's trip returns 403/404 | UT-015, IT-002, E2E-009 step 2 | [ ] |
| AC-013 | Archive sets `status=ARCHIVED`, accessible via filter | UT-019, UT-020, IT-004, E2E-004 | [ ] |
| AC-014 | Delete sets `deletedAt`, removed from all listings | UT-023, UT-024, IT-003, E2E-005 | [ ] |
| AC-015 | FCP < 1.5s on 4G (Lighthouse) | Performance test (see Section 7) | [ ] |
| AC-016 | Keyboard operable, WCAG 2.1 AA, aria labels, aria-describedby | E2E-010, Accessibility scan | [ ] |
| AC-017 | All elements visible at 375px, no horizontal scroll | Playwright viewport test (see Section 8) | [ ] |

---

## 7. Performance Targets

| Metric | Target | Condition | Test Method |
|--------|--------|-----------|-------------|
| First Contentful Paint (FCP) `/trips` | < 1,500ms | Lighthouse, 4G throttled, production | Playwright Lighthouse plugin |
| Time to First Byte (TTFB) `/trips` | < 200ms | Vercel edge, nearest region | Playwright Performance API |
| `createTrip` Server Action response | < 500ms P95 | Including DB write + Redis invalidation | Vitest timer assertions |
| `listTrips` DB query (20 trips, with indexes) | < 50ms P95 | PostgreSQL `EXPLAIN ANALYZE` | DB query profiling in integration test |
| `getTripById` DB query | < 20ms P95 | PostgreSQL `EXPLAIN ANALYZE` | DB query profiling in integration test |
| Page load `/trips/new` | < 1,000ms | Server Component render time | Playwright Navigation Timing API |

**Lighthouse test configuration**:

```typescript
// tests/performance/trips.perf.spec.ts
import { playAudit } from "playwright-lighthouse";

test("AC-015: /trips FCP under 1500ms on 4G", async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("/trips");
  const result = await playAudit({
    page,
    thresholds: { "first-contentful-paint": 90 }, // Lighthouse score threshold
    config: lighthouseConfig, // 4G throttling profile
  });
  expect(result.lhr.audits["first-contentful-paint"].numericValue).toBeLessThan(1500);
});
```

---

## 8. Edge Cases & Negative Tests

### Date and Timezone Edge Cases

| Test ID | Scenario | Expected |
|---------|----------|----------|
| EC-001 | `startDate` = today at 23:59 in user's timezone, server is UTC (next day) | Validation uses local date at midnight, not UTC — passes for "today" |
| EC-002 | `startDate` and `endDate` spanning a DST change boundary | Trip dates stored as UTC; display formatted correctly with `Intl.DateTimeFormat` |
| EC-003 | `startDate` = "2026-12-31", `endDate` = "2027-01-01" (year boundary) | Trip created successfully; period displays across years |
| EC-004 | `startDate` = yesterday in user's timezone → fails validation | Error: "A data de partida nao pode ser no passado" |

### Boundary Values

| Test ID | Scenario | Expected |
|---------|----------|----------|
| EC-005 | `title` = exactly 3 characters ("ABC") | Passes — at minimum |
| EC-006 | `title` = exactly 100 characters | Passes — at maximum |
| EC-007 | `title` = 101 characters | Fails — exceeds maximum |
| EC-008 | `destination` = exactly 2 characters ("SP") | Passes |
| EC-009 | `description` = exactly 500 characters | Passes |
| EC-010 | `description` = 501 characters | Fails |
| EC-011 | Active trip count = exactly 20 → attempt to create 21st | Fails with `TRIP_LIMIT_REACHED` |
| EC-012 | Active trip count = exactly 19 → create one more | Succeeds; count becomes 20 |

### Status Transition Edge Cases

| Test ID | Scenario | Expected |
|---------|----------|----------|
| EC-013 | Archive already-ARCHIVED trip | Fails with `INVALID_STATUS_TRANSITION` error; toast shown |
| EC-014 | Attempt to set `status=COMPLETED` via Server Action (not a UI action) | Rejected — `status` is a mass-assignment-protected field |
| EC-015 | Delete a trip that is already soft-deleted | Service returns `NotFoundError` (middleware filters it out) |
| EC-016 | Archive a soft-deleted trip | Service returns `NotFoundError` |

### Concurrency Edge Cases

| Test ID | Scenario | Expected |
|---------|----------|----------|
| EC-017 | Two concurrent `createTrip` calls when user has 19 active trips | At most one succeeds; the other fails with `TRIP_LIMIT_REACHED`; never more than 20 trips created |
| EC-018 | Two concurrent `deleteTrip` calls for the same tripId | First succeeds; second returns `NotFoundError` (idempotent from user perspective) |
| EC-019 | `createTrip` called while Redis count cache is stale | Server-side count query uses DB as source of truth; stale cache does not bypass limit |

**EC-017 Concurrency test implementation**:

```typescript
it("should not allow more than 20 active trips under concurrent creation", async () => {
  // Seed 19 trips for testUser
  // Fire 5 concurrent createTrip calls
  const results = await Promise.allSettled([
    TripService.createTrip(testUserId, tripData1),
    TripService.createTrip(testUserId, tripData2),
    TripService.createTrip(testUserId, tripData3),
    TripService.createTrip(testUserId, tripData4),
    TripService.createTrip(testUserId, tripData5),
  ]);

  const successes = results.filter((r) => r.status === "fulfilled");
  const failures = results.filter((r) => r.status === "rejected");

  // Only 1 should succeed (bringing total to 20); rest must fail with TRIP_LIMIT_REACHED
  expect(successes.length).toBe(1);
  expect(failures.length).toBe(4);

  const count = await db.trip.count({ where: { userId: testUserId, deletedAt: null } });
  expect(count).toBe(20); // Never 21+
});
```

### Authentication and Session Edge Cases

| Test ID | Scenario | Expected |
|---------|----------|----------|
| EC-020 | Session expires mid-form (cookie expires between page load and submit) | Server Action returns `UnauthorizedError`; redirect to `/login?callbackUrl=/trips/new` |
| EC-021 | Forged session cookie with different userId | Auth.js rejects invalid session; `auth()` returns null; `UnauthorizedError` thrown |
| EC-022 | `userId` supplied in form data (mass assignment attempt) | Zod strips unknown field; service uses `session.user.id` from session |

---

## 9. Security Test Cases (from SEC-SPEC-001)

### SR-001: Redirect Pattern in Server Actions

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-001 | `createTrip` success path: user is redirected (not shown error message) | Integration, E2E | E2E-001 step 7: redirect to `/trips/[id]` occurs |
| SEC-T-002 | `updateTrip` success path: user is redirected to trip detail | E2E | E2E-003 step 5: redirect to `/trips/[id]` |
| SEC-T-003 | `redirect()` is NOT inside a `try/catch` block in any Server Action | Code review (manual) | PR reviewer confirms per SR-001 |

### SR-002: Prisma Soft-Delete Middleware (Prisma 7 API)

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-004 | Soft-deleted trip does not appear in `listTrips` results | IT-007 (integration, real DB) | Zero results returned |
| SEC-T-005 | Soft-deleted trip does not appear in `getTripById` | Integration | `NotFoundError` thrown |
| SEC-T-006 | Prisma middleware implementation uses `db.$extends`, not deprecated `db.$use` | Code review (manual) | PR reviewer confirms per SR-002 |

### SR-003 / SR-004: Full Server Action Auth Pattern

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-007 | `updateTrip` called without session → `UnauthorizedError` | Unit | Error thrown before any DB call |
| SEC-T-008 | `archiveTrip` called without session → `UnauthorizedError` | Unit | Error thrown before any DB call |
| SEC-T-009 | `deleteTrip` called without session → `UnauthorizedError` | Unit | Error thrown before any DB call |
| SEC-T-010 | `auth()` is the first statement in each Server Action | Code review (manual) | PR reviewer confirms |

### SR-004: Analytics Consent Gate (CR-002)

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-011 | `trip_created` event NOT dispatched when analytics consent cookie absent | Integration | `track()` called but event not sent; verify via mock analytics client |
| SEC-T-012 | `trip_created` event IS dispatched when analytics consent cookie present | Integration | Event dispatched; mock captures it |

### SR-005: Explicit Select on All Prisma Queries

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-013 | `TripService.listTrips` does not return full Prisma model — only safe subset | Unit (mock) | Response does not include `deletedAt`, `userId`, internal fields |
| SEC-T-014 | `TripService.getTripById` does not expose `userId` or `deletedAt` to caller | Unit (mock) | Response shape matches `TripDetailData` type |
| SEC-T-015 | No Prisma call in TripService omits `select` clause | Code review (manual) | PR reviewer confirms per SR-005 |

### SR-006: coverEmoji Input Restriction

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-016 | `coverEmoji` = Unicode bidirectional override character (U+202E) → rejected | Unit | Zod validation fails |
| SEC-T-017 | `coverEmoji` = null byte (\x00) → rejected | Unit | Zod validation fails |
| SEC-T-018 | `coverEmoji` = valid emoji "🌊" → accepted | Unit | `parsed.success === true` |
| SEC-T-019 | `coverEmoji` = "✈️" (default) → accepted | Unit | `parsed.success === true` |

### SR-007: confirmationTitle Length Constraint

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-020 | `confirmationTitle` with 101+ chars → fails schema validation | UV-035 | Field error |
| SEC-T-021 | `confirmationTitle` with exactly 100 chars → passes schema | Unit | `parsed.success === true` |

### BOLA/IDOR Prevention (SEC-001)

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-022 | User B attempts to read User A's trip via direct URL | E2E-009 step 1 | 404 page (no information leakage) |
| SEC-T-023 | User B attempts to update User A's trip via `updateTrip` Server Action | E2E-009 step 3 | Error returned; DB unchanged |
| SEC-T-024 | `getTripById` uses `{ id: tripId, userId, deletedAt: null }` in where clause | UT-013 | `findFirst` called with all three conditions |
| SEC-T-025 | BOLA via PATCH: trip `userId` not overwritable via update payload | UT-016 | `userId` not in update data |

### CR-001: Rate Limiting (documentation requirement)

| Test ID | Scenario | Test Type | Expected |
|---------|----------|-----------|----------|
| SEC-T-026 | Rate limiting strategy for Server Actions is documented in ADR or architecture.md | Document review | Document exists before first deployment |
| SEC-T-027 | Verified: rapid repeated `createTrip` calls are throttled | Load/manual test | After N calls within T seconds, 429 or equivalent is returned |

---

## 10. Accessibility Tests

### WCAG 2.1 AA Audit

**Tool**: axe-core via `@axe-core/playwright`
**Run in**: E2E test suite, every CI build

```typescript
// tests/e2e/accessibility/trips-a11y.spec.ts
import AxeBuilder from "@axe-core/playwright";

test("AC-016: /trips/new has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/trips/new");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

| A11Y ID | Page / Component | Check |
|---------|-----------------|-------|
| A11Y-001 | `/trips` | axe-core WCAG 2.1 AA full-page scan |
| A11Y-002 | `/trips/new` | axe-core WCAG 2.1 AA full-page scan |
| A11Y-003 | `/trips/[id]` | axe-core WCAG 2.1 AA full-page scan |
| A11Y-004 | `/trips/[id]/edit` | axe-core WCAG 2.1 AA full-page scan |
| A11Y-005 | Archive dialog | role="dialog", aria-modal, aria-labelledby, aria-describedby present |
| A11Y-006 | Delete dialog | role="dialog", focus trap active, Escape closes |
| A11Y-007 | TripCard | role="article" or role="listitem", aria-label with trip details |
| A11Y-008 | Status badges | Communicates status by text, not color alone |
| A11Y-009 | Error messages | role="alert" present; linked to field via aria-describedby |
| A11Y-010 | CharCounter | aria-live="polite" on counter element |
| A11Y-011 | CoverPicker | role="radiogroup", each option role="radio", arrow key navigation |
| A11Y-012 | "..." menu button | aria-label describes trip, aria-haspopup="menu" |
| A11Y-013 | Form fields | Every input has associated `<label>` via htmlFor/id |
| A11Y-014 | Required fields | aria-required="true" on all required inputs |
| A11Y-015 | Invalid fields | aria-invalid="true" set on fields with errors |

### Mobile Viewport Test (AC-017)

```typescript
// tests/e2e/responsive/mobile-viewport.spec.ts
test("AC-017: /trips no horizontal scroll at 375px", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto("/trips");
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("AC-017: /trips/new no horizontal scroll at 375px", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto("/trips/new");
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
```

---

## 11. Test Environment Requirements

### Infrastructure

| Component | Requirement | Notes |
|-----------|-------------|-------|
| PostgreSQL test DB | Isolated instance via Docker Compose | `DATABASE_URL_TEST` env var; separate from staging |
| Redis test instance | Isolated instance via Docker Compose | `REDIS_URL_TEST` env var |
| Auth.js session helpers | Mock session factory in `tests/helpers/auth.ts` | Injects valid session without OAuth flow |
| Prisma client | Pointed at test DB via env override | `DATABASE_URL` overridden in test setup |
| Next.js test server | `next build && next start` in CI, or `next dev` locally | Port 3001 for E2E to avoid conflict |

### Test Data Strategy

All test data is synthetic. Never use real names, emails, or passport numbers.

**Synthetic user profiles**:

```typescript
// tests/fixtures/users.ts
export const testUsers = {
  userA: {
    id: "test-user-a-cuid00000001",
    email: "test-user-a@playwright.invalid",
    name: "Ana Teste",
  },
  userB: {
    id: "test-user-b-cuid00000002",
    email: "test-user-b@playwright.invalid",
    name: "Bruno Teste",
  },
};
```

**Synthetic trip data**:

```typescript
// tests/fixtures/trips.ts
export const tripFixtures = {
  validCreate: {
    title: "Viagem de Teste para Lisboa",
    destination: "Lisboa, Portugal",
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-09-15"),
    description: null,
    coverGradient: "ocean" as const,
    coverEmoji: "✈️",
  },
  minimalCreate: {
    title: "Tes",  // exactly min length
    destination: "SP",  // exactly min length
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-10-01"),  // same-day trip
  },
};
```

**Seed helpers**:

```typescript
// tests/helpers/seed.ts
export async function seedTripsForUser(userId: string, count: number): Promise<Trip[]>
export async function seedArchivedTripsForUser(userId: string, count: number): Promise<Trip[]>
export async function cleanupUser(userId: string): Promise<void>
```

### Idempotency Requirements

- Every integration test runs inside a DB transaction that is rolled back via `afterEach`
- Every E2E test seeds its own data in `beforeEach` and cleans up in `afterEach`
- No test depends on state left by another test
- E2E tests use dedicated synthetic user accounts that are reset before each test run

---

## 12. Definition of Done

A feature is considered QA-approved for release when ALL of the following are satisfied:

- [ ] All unit tests pass — coverage >= 80% on `src/server/services/trip.service.ts` and `src/lib/validations/trip.schema.ts`
- [ ] All integration tests pass — including IT-007 (soft-delete middleware, CR-003 requirement)
- [ ] All 10 E2E critical flows pass on Chromium
- [ ] E2E-009 (ownership isolation) passes — P0 security test
- [ ] All security test cases SEC-T-001 through SEC-T-025 pass or are cleared by code review
- [ ] All 17 acceptance criteria (AC-001 through AC-017) verified by test or manual check
- [ ] axe-core WCAG 2.1 AA scans return zero violations on all 4 pages
- [ ] Performance: FCP < 1,500ms on `/trips` confirmed (AC-015)
- [ ] Performance: `listTrips` DB query < 50ms P95 confirmed
- [ ] 375px viewport: no horizontal scroll on `/trips` and `/trips/new` (AC-017)
- [ ] No open P0 or P1 bugs
- [ ] CR-001 (rate limiting strategy) documented before deployment
- [ ] CR-002 (consent gate) verified in `track()` before analytics events shipped
- [ ] CR-003 (soft-delete integration test) passes against real Prisma 7 extension
- [ ] CR-004 (full Server Action implementations) reviewed against SR-003 checklist
- [ ] SR-001 through SR-008 verified by code reviewer at PR

---

## 13. QA Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Flaky E2E on native date pickers across browsers | High | Medium | Use stable `data-testid` selectors on inputs; set date via `page.fill()` with ISO string rather than clicking calendar UI; test Chromium first |
| Soft-delete middleware broken on Prisma 7 (`db.$use` deprecated) | High | Critical | IT-007 is mandatory before any merge; blocked by CR-003 until confirmed |
| Concurrency race condition on 20-trip limit | Medium | Medium | EC-017 test with `Promise.allSettled`; if flaky, add DB-level constraint or advisory lock |
| `redirect()` inside `try/catch` copied from incorrect SPEC-001 sample | Medium | High | SEC-T-001/T-002 E2E tests will fail visibly if this bug is present; include in PR checklist (SR-001) |
| Auth fixture instability: session cookies expire or differ between test runs | Medium | Medium | Refresh session token in `beforeAll` of each E2E suite; confirm Auth.js test mode is deterministic |
| `coverEmoji` Unicode edge cases not covered by dev implementation | Low | Medium | SEC-T-016/T-017 unit tests will catch this; add to SR-006 PR checklist |
| Test pollution: integration tests share DB state | Low | High | Enforce transaction rollback in `afterEach`; use dedicated test-only DB separate from staging |
| Performance test results differ between CI and production | Medium | Low | Use Lighthouse in CI for regression detection; accept production measurement for AC-015 sign-off |
| axe-core misses screen reader issues (tool-level limitation) | Medium | Medium | Supplement with manual VoiceOver/NVDA check for E2E-010 keyboard flow during pre-release |

---

## 14. Out of Scope

The following are explicitly NOT tested in this cycle:

- REST API endpoints (`/api/v1/trips/*`) — not implemented in MVP (Server Actions only)
- Automatic status transitions (`PLANNING → ACTIVE`, `ACTIVE → COMPLETED` via cron) — deferred to Sprint 2
- Mapbox destination autocomplete — text-free field in v1; no geocoding tests needed
- Trip cover image upload — out of scope for v1 (gradient + emoji only)
- Collaborative trip sharing (`visibility: PUBLIC` or `SHARED`) — US-004, Sprint 2+
- Mobile native app — responsive web only in MVP
- Email notifications — not implemented in MVP
- GDPR erasure pipeline end-to-end — covered by `ErasureService` tests in a separate QA spec
- PostHog event delivery verification in production — analytics E2E limited to consent gate and dispatch call presence

---

> QA Hold — do not release until: all items in Section 12 Definition of Done are checked, CR-001 through CR-004 conditions are resolved, and no P0/P1 bugs are open.
