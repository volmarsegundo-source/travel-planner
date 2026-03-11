# End-to-End QA Review: Atlas Travel Planner v0.15.1 (Staging)

**Document ID**: QA-E2E-001
**QA Engineer**: qa-engineer
**Date**: 2026-03-10
**Version under test**: v0.15.1 (staging)
**Scope**: Full user journey (Registration through Phase 6), known bug verification, i18n audit, accessibility, gamification, data persistence

---

## Section 1: User Journey Test Cases

### 1.1 Registration and Authentication

#### TC-001: Email Registration (Happy Path)
**Priority**: P0
**Preconditions**: No existing account with the test email

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/register` | RegisterForm renders with email, password, confirm password fields |
| 2 | Enter valid email (`testqauser@playwright.invalid`) | Field accepts input |
| 3 | Enter valid password (`Test@1234QA!`) | Field accepts input |
| 4 | Enter matching confirm password | Field accepts input |
| 5 | Click "Criar conta" / "Create account" | Spinner shows, form disabled |
| 6 | Wait for response | Auto-login triggers, redirect to `/dashboard` |

**Edge Cases**:
- Duplicate email: shows `emailAlreadyExists` error
- Password mismatch: shows `passwordsDoNotMatch` error
- Password too short (< 8 chars): shows `passwordTooShort` error
- Empty email: shows `emailInvalid` error
- Optional name field collapsed by default: expand via chevron, name saved if provided

#### TC-002: Email Login (Happy Path)
**Priority**: P0
**Preconditions**: Account exists for `testuser@travel.dev` / `Test@1234`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/login` | LoginForm renders with email, password |
| 2 | Enter credentials | Fields accept input |
| 3 | Click "Entrar" / "Sign in" | Spinner shows, redirect to `/dashboard` |

**Edge Cases**:
- Invalid credentials: shows `invalidCredentials` error
- Login after registration (`?registered=true`): green success banner visible
- Google OAuth: "Continuar com Google" button triggers OAuth flow

#### TC-003: Google OAuth Sign-In
**Priority**: P1
**Preconditions**: Valid Google test account configured

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/login` | Page loads |
| 2 | Click "Continuar com Google" | Redirect to Google OAuth consent |
| 3 | Complete Google sign-in | Redirect to `/dashboard` |

---

### 1.2 Dashboard

#### TC-004: First-Time Dashboard (Empty State)
**Priority**: P0
**Preconditions**: New user with 0 trips

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login | Redirect to `/dashboard` |
| 2 | Observe dashboard | Greeting: "Bem-vindo ao Atlas, {name}!" or fallback |
| 3 | Verify empty state | Compass emoji, "Comece sua primeira expedição" message |
| 4 | Click "Iniciar Expedição" | Navigate to `/expedition/new` |

**Note on BUG**: `dashboard/page.tsx` line 33 uses `"Traveler"` as hardcoded English fallback when user has no name and no email. This is a known i18n issue (BUG-S7-005).

#### TC-005: Dashboard with Existing Expeditions
**Priority**: P0
**Preconditions**: User has at least 1 expedition

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login | Redirect to `/dashboard` |
| 2 | Observe dashboard | DashboardHeader shows rank, points, greeting |
| 3 | Observe expedition cards | Each card: destination, phase progress bar, checklist status |
| 4 | Click "Continuar" on a card | Navigate to correct phase |
| 5 | Verify progress bar | Clickable completed segments, hover shows phase name |

---

### 1.3 Phase 1: O Chamado (Trip Creation)

#### TC-006: Phase 1 - Domestic Trip (Sao Paulo to Salvador)
**Priority**: P0
**Persona**: @leisure-solo (Brazilian user, profile country = "Brazil")

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/expedition/new` | Phase1Wizard renders, Step 1 "Sobre voce" |
| 2 | Fill profile fields (name, birth date, country=Brazil, city=Sao Paulo) | Fields accept input |
| 3 | Click "Proximo" | Advance to Step 2 "Escolha seu destino" |
| 4 | Type "Salvador" in destination autocomplete | Nominatim results appear |
| 5 | Select "Salvador, Brazil" | `destinationCountry` set to "Brazil" |
| 6 | Verify trip type badge | Should show "Viagem nacional" with house emoji |
| 7 | Fill origin: "Sao Paulo, Brazil" | Origin set |
| 8 | Click "Proximo" | Advance to Step 3 "Quando voce vai viajar?" |
| 9 | Set start/end dates | Dates accepted |
| 10 | Click "Proximo" | Advance to Step 4 "Pronto para comecar?" |
| 11 | Verify confirmation summary | Destination, origin, dates, profile info shown |
| 12 | Click "Iniciar Expedicao" | Trip created, 100 points + "first_step" badge animation |
| 13 | Click through animation | PhaseTransition overlay, then redirect to Phase 2 |
| 14 | **VERIFY BUG-A**: Check trip.tripType in DB | **EXPECTED: "domestic" | ACTUAL: "international" (DEFAULT)** |

#### TC-007: Phase 1 - International Trip (Brazil to France)
**Priority**: P0

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1-5 | Same as TC-006 but destination = "Paris, France" | `destinationCountry = "France"` |
| 6 | Verify trip type badge | Should show "Viagem Schengen" (France is Schengen) |
| 7-13 | Same flow | Trip created successfully |
| 14 | **VERIFY**: Check trip.tripType in DB | Should be "schengen" |

#### TC-008: Phase 1 - Mercosul Trip (Brazil to Argentina)
**Priority**: P1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1-5 | Same as TC-006 but destination = "Buenos Aires, Argentina" | `destinationCountry = "Argentina"` |
| 6 | Verify trip type badge | Should show "Viagem Mercosul" |

---

### 1.4 Phase 2: O Explorador

#### TC-009: Phase 2 - Solo Traveler (Happy Path)
**Priority**: P0
**Preconditions**: Trip created, currently on Phase 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Phase 2 | Phase2Wizard renders, step "Que tipo de viajante voce e?" |
| 2 | Select "Solo" | Card highlighted with gold border |
| 3 | Click "Proximo" | Advance to "Estilo de hospedagem" (skips passengers) |
| 4 | Select "Conforto" | Card highlighted |
| 5 | Click "Proximo" | Advance to "Ritmo de viagem" |
| 6 | Adjust pace slider to 7 | Value shows 7/10 |
| 7 | Click "Proximo" | Advance to "Orcamento" |
| 8 | Set budget to 5000 BRL | Budget input + currency selector work |
| 9 | Click "Proximo" | Advance to "Preferencias" |
| 10 | Select some preference chips | Chips toggle on/off |
| 11 | Click "Proximo" | Advance to "Pronto para explorar?" confirmation |
| 12 | **VERIFY BUG-F**: Verify confirmation screen data | See Section 2.6 for details |
| 13 | Click "Concluir e Ganhar Pontos" | 150 pts + explorer rank animation |
| 14 | Continue | Redirect to Phase 3 |

#### TC-010: Phase 2 - Family Traveler (Passengers Step)
**Priority**: P1
**Preconditions**: Trip on Phase 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select "Familia" | Passengers step added to wizard flow |
| 2 | Click "Proximo" | PassengersStep renders |
| 3 | Set 2 adults, 2 children (ages 5 and 10), 1 infant | Counters work, child age inputs appear |
| 4 | Total shows 5 passengers | Correct calculation |
| 5 | Click "Proximo" | Advance to accommodation step |
| 6 | Complete remaining steps | Standard flow |
| 7 | **VERIFY BUG-F**: Confirmation shows passenger breakdown | "{adults} adultos, {children} criancas, {seniors} idosos, {infants} bebes" |

**Edge Cases**:
- Maximum 20 passengers: "Aproximando-se do maximo de 20 passageiros" warning
- Minimum 2 for family/group: error "Minimo de 2 viajantes" if total < 2
- Budget < 100: validation error
- Budget > 100,000: validation error

---

### 1.5 Phase 3: A Rota (Checklist)

#### TC-011: Phase 3 - Checklist Completion
**Priority**: P0
**Preconditions**: Trip on Phase 3, checklist initialized

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Phase 3 | Phase3Wizard renders, checklist items visible |
| 2 | Verify trip type badge | Shows "Nacional" / "Internacional" / etc. based on tripType |
| 3 | Toggle a required item | Checkbox animates, points popup (+N) |
| 4 | Progress bar updates | Shows "{completed}/{total} itens obrigatorios" |
| 5 | Complete all required items | Progress shows 100%, advance button turns normal color |
| 6 | Click "Fase Completa -- Avancar" | 75 pts + "navigator" badge animation |
| 7 | Continue | Redirect to Phase 4 |

**Edge Cases**:
- Advancing with incomplete checklist: amber button, allowed but no phase completion points
- **BUG-E VERIFICATION**: If advancing triggers `phaseAlreadyCompleted` error, check that translation exists (see Section 2.5)
- Re-visiting completed Phase 3: "Ir para a Fase {phase}" button appears

---

### 1.6 Phase 4: A Logistica (Transport, Accommodation, Mobility)

#### TC-012: Phase 4 - Full Tab Flow
**Priority**: P0
**Preconditions**: Trip on Phase 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Phase 4 | Phase4Wizard renders |
| 2 | **VERIFY BUG-B**: Check page title | **EXPECTED: "A Logistica" | ACTUAL: "O Abrigo"** |
| 3 | **VERIFY BUG-C**: Check architecture | **CURRENT: 3 tabs (Transport, Accommodation, Mobility) | EXPECTED: 3 separate wizard steps** |
| 4 | Answer car rental question: "Nao" | "Sem aluguel de carro" message appears |
| 5 | Click "Transporte" tab | TransportStep renders |
| 6 | Add a transport segment (flight) | Form fields: type, from, to, dates, provider, booking code |
| 7 | Save transport | Success message |
| 8 | Click "Hospedagem" tab | AccommodationStep renders |
| 9 | Add an accommodation | Form fields: type, name, address, check-in/out, cost |
| 10 | Save accommodation | Success message |
| 11 | Click "Mobilidade" tab | MobilityStep renders with icon grid |
| 12 | Select mobility options | Chips toggle |
| 13 | Save mobility | Success message |
| 14 | Click "Fase Completa -- Avancar" | 50 pts + "host" badge animation |
| 15 | Continue | Redirect to Phase 5 |

#### TC-013: Phase 4 - Car Rental with CINH (International Trip)
**Priority**: P1
**Preconditions**: Trip on Phase 4, tripType = "international" or "schengen"

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Answer car rental: "Sim, vou" | CINH warning section appears |
| 2 | Verify warning text | "CNH Internacional (CINH) Necessaria" with deadline |
| 3 | Advance button disabled until checkbox confirmed | Amber "Avancar" button |
| 4 | Check CINH confirmation | Advance button becomes active |

#### TC-014: Phase 4 - Car Rental with Brazilian CNH (Mercosul Trip)
**Priority**: P1
**Preconditions**: Trip on Phase 4, tripType = "mercosul"

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Answer car rental: "Sim, vou" | Green info: "Sua CNH brasileira e valida" |
| 2 | No CINH checkbox needed | Advance button immediately active |

---

### 1.7 Phase 5: O Mapa dos Dias (Destination Guide)

#### TC-015: Phase 5 - Guide Generation
**Priority**: P0
**Preconditions**: Trip on Phase 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Phase 5 | DestinationGuideWizard renders |
| 2 | **VERIFY BUG-D**: Check if guide auto-generates | **CURRENT: Shows "Gerar Guia do Destino" button, requires manual click | EXPECTED (stakeholder): Auto-generate on first visit** |
| 3 | Click "Gerar Guia do Destino" | Loading state, AI call |
| 4 | Wait for generation | 4 stat cards (timezone, currency, language, electricity) + 6 content sections |
| 5 | Click a stat card | Expanded detail with tips |
| 6 | Click a content section | Expanded with summary, details, tips |
| 7 | Points popup on first view of each section | "+5" animation |
| 8 | AI disclaimer visible | "Este guia foi gerado por Inteligencia Artificial..." |
| 9 | Click "Completar Fase e Ganhar Pontos" | 40 pts + cartographer rank animation |
| 10 | Continue | Redirect to Phase 6 |

---

### 1.8 Phase 6: O Roteiro (AI Itinerary)

#### TC-016: Phase 6 - Itinerary Generation
**Priority**: P0
**Preconditions**: Trip on Phase 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Phase 6 | Itinerary wizard renders |
| 2 | Click "Gerar Roteiro com IA" | Streaming progress messages |
| 3 | Wait for generation | Day-by-day itinerary rendered |
| 4 | Edit an activity | Activity form appears |
| 5 | AI disclaimer visible | Warning about verifying info |
| 6 | Regenerate option | Confirmation modal with warning |

---

## Section 2: Known Bug Verification

### 2.1 BUG-A [P0]: Domestic Trips Classified as "Internacional"

**Severity**: S1-Critical
**Priority**: P0-Blocker
**Status**: Open

#### Root Cause Analysis

The root cause is in the **server-side trip creation flow**. The classification happens correctly on the client but is **never persisted to the database**.

**Evidence chain**:

1. `Phase1Wizard.tsx` (line 112-117): `classifyTrip(userCountry, destinationCountry)` runs on the client using the `userCountry` prop and `destinationCountry` from autocomplete selection.

2. `classifyTrip()` in `src/lib/travel/trip-classifier.ts` (line 52): `if (origin === destination) return "domestic"` -- this logic is **correct**. For "Brazil" to "Brazil", it returns "domestic".

3. **THE BUG**: `createExpeditionAction` (expedition.actions.ts) calls `ExpeditionService.createExpedition()` which creates the trip at line 44-55 of `expedition.service.ts`. The `tripType` field is **never set in the create data**:
   ```typescript
   const trip = await tx.trip.create({
     data: {
       title: data.destination,
       destination: data.destination,
       origin: data.origin ?? null,
       // ... NO tripType field here
     },
   });
   ```

4. `Phase1Schema` in `expedition.schema.ts` does **not include a `tripType` field** at all. The client never sends it to the server.

5. The Prisma schema (line 128): `tripType String @default("international")` -- so every trip gets `"international"` by default.

**Impact**: This means ALL trips (domestic, mercosul, schengen) are stored as "international" in the database. This cascading failure affects:
- Phase 3 checklist: wrong checklist items generated (international items for domestic trips, e.g., passport validity, visa requirements, ETIAS -- irrelevant for SP to Salvador)
- Phase 4 CINH logic: `validatePhasePrerequisites()` at `phase-engine.ts` line 497 checks `tripType === "international" || tripType === "schengen"`. Since ALL trips are "international", domestic travelers who select car rental are INCORRECTLY required to confirm CINH (International Driving Permit) for a domestic trip
- Phase 4 client-side: `Phase4Wizard.tsx` line 83 checks `needsCinh = tripType === "international" || tripType === "schengen"` -- this reads the tripType passed from the server, which is always "international"
- Trip type badge on Phase 3/4: always shows "Internacional" / "International"
- Phase 4 CNH info panel: domestic trips should show "Sua CNH regular e suficiente" but instead show "CNH Internacional (CINH) Necessaria"

**Fix Required**:
1. Add `tripType` to `Phase1Schema`
2. Compute `classifyTrip()` on the server (not just client) using origin country and destination country
3. Store the result in `ExpeditionService.createExpedition()`

**Ship/Hold Recommendation**: HOLD RELEASE -- this is a data integrity bug that corrupts downstream logic.

---

### 2.2 BUG-B [P0]: Phase 4 Title Shows "O Abrigo" Instead of "A Logistica"

**Severity**: S2-High
**Priority**: P0-Blocker
**Status**: Open

#### Root Cause Analysis

**Two separate issues discovered**:

1. **`phase-config.ts` (line 42)**: The hardcoded `name` property is `"A Logistica"` (correct after ADR-012 rename). The `nameKey` is `"phases.theLogistics"` (correct).

2. **i18n files -- CONFLICTING DATA**:
   - `messages/pt-BR.json` line 583: `"expedition.phase4.title": "O Abrigo"` -- **WRONG, still old name**
   - `messages/en.json` line 583: `"expedition.phase4.title": "The Shelter"` -- **WRONG, still old name**
   - `messages/pt-BR.json` line 780-781: `gamification.phases.theShelter: "O Abrigo"` AND `gamification.phases.theLogistics: "A Logistica"` -- **BOTH exist**
   - `messages/en.json` line 780-781: same pattern, both `theShelter` and `theLogistics` exist

3. **Phase4Wizard.tsx** line 258 uses `t("title")` which resolves to `expedition.phase4.title` = "O Abrigo" / "The Shelter".

4. **ExpeditionProgressBar.tsx** line 41 uses `tPhases(definition.nameKey)` which resolves to `gamification.phases.theLogistics` = "A Logistica" / "The Logistics" -- this is correct.

**Result**: The progress bar shows the correct "A Logistica", but the Phase 4 wizard page itself shows the old "O Abrigo" / "The Shelter".

**Fix Required**:
- Update `messages/pt-BR.json`: `expedition.phase4.title` from "O Abrigo" to "A Logistica"
- Update `messages/en.json`: `expedition.phase4.title` from "The Shelter" to "The Logistics"
- Update `expedition.phase4.subtitle` accordingly
- Consider removing the `gamification.phases.theShelter` entries (dead keys after rename)

**Ship/Hold Recommendation**: HOLD -- naming inconsistency confuses the gamification narrative.

---

### 2.3 BUG-C [P1]: Phase 4 Uses Tabs Instead of Separate Wizard Steps

**Severity**: S3-Medium
**Priority**: P1-Must Fix
**Status**: Open

#### Architecture Analysis

**Current implementation** (`Phase4Wizard.tsx`):
- Lines 26-27: `type Phase4Tab = "transport" | "accommodation" | "mobility"`
- Line 58: `const [activeTab, setActiveTab] = useState<Phase4Tab>("transport")`
- Lines 422-441: Tab navigation with `role="tablist"`, 3 tab buttons
- Lines 444-497: Tab panels rendered conditionally based on `activeTab`

**Stakeholder expectation**: 3 separate wizard steps (like Phase 2 which has step-by-step navigation with back/next buttons and `PhaseProgressBar`).

**UX Inconsistency**: Phases 1 and 2 use a multi-step wizard pattern with progress bar and back/next navigation. Phase 4 breaks this pattern with a tabbed layout, which:
- Does not enforce a linear completion flow
- Has no step indicator showing progress
- Allows skipping sections without validation

**Fix Required**: Refactor `Phase4Wizard` from tabbed layout to step-based wizard matching the Phase 1/2 pattern.

**Ship/Hold Recommendation**: Fix in next sprint -- the tabs are functional but inconsistent with the UX pattern.

---

### 2.4 BUG-D [P1]: Phase 5 Guide Does Not Auto-Generate on First Visit

**Severity**: S3-Medium
**Priority**: P1-Must Fix
**Status**: Open

#### Architecture Analysis

**Current implementation** (`DestinationGuideWizard.tsx`):
- Line 57: `const [guide, setGuide] = useState(initialGuide?.content ?? null)`
- Lines 202-217: When `!guide`, shows a hint text + "Gerar Guia do Destino" button. User must manually click.
- The `handleGenerate()` function (line 77) is never called automatically.

**Phase 5 page** (`phase-5/page.tsx`):
- Lines 42-51: Fetches existing guide from DB. If `guide` is null, `initialGuide` is null.
- The page does not trigger generation server-side.

**Stakeholder expectation**: On first visit to Phase 5, the guide should auto-generate without requiring user interaction.

**Fix Required**: Either:
1. Trigger generation server-side in `phase-5/page.tsx` before rendering (preferred -- avoids client loading state)
2. Add a `useEffect` in `DestinationGuideWizard` to call `handleGenerate()` when `guide` is null

**Ship/Hold Recommendation**: Fix in next sprint -- current behavior works but adds friction.

---

### 2.5 BUG-E [P1]: "errors.phaseAlreadyCompleted" Shows as Raw i18n Key

**Severity**: S2-High
**Priority**: P1-Must Fix
**Status**: Open

#### Root Cause Analysis

**Translation EXISTS in both locales**:
- `messages/pt-BR.json` line 813: `"errors.phaseAlreadyCompleted": "Esta fase ja foi concluida. Voce pode revisitar os dados."`
- `messages/en.json` line 824: `"errors.phaseAlreadyCompleted": "This phase is already completed. You can review your data."`

**Error display mechanism in Phase3Wizard** (line 220-225):
```tsx
{errorMessage.startsWith("errors.")
  ? tErrors(errorMessage.replace("errors.", ""))
  : errorMessage}
```
This uses `tErrors` which is `useTranslations("errors")`. For `errorMessage = "errors.phaseAlreadyCompleted"`, it calls `tErrors("phaseAlreadyCompleted")` which should resolve correctly.

**Phase4Wizard** (line 270-273): Same pattern, should also work.

**Root cause confirmed** -- there are TWO different error paths in `phase-engine.ts`:

1. **`PHASE_ORDER_VIOLATION`** (lines 166-183): Thrown when a user tries to complete a phase out of order. The error message is `"errors.phaseAlreadyCompleted"` -- this IS a valid i18n key. The client `startsWith("errors.")` guard strips the prefix and calls `tErrors("phaseAlreadyCompleted")`, which resolves correctly. **This path works.**

2. **`PHASE_ALREADY_COMPLETED`** (lines 199-205): Thrown when trying to complete a phase whose status is already `"completed"` (e.g., double-click, revisiting). The error message is `"Phase ${phaseNumber} is already completed"` -- this is a **raw English string, NOT an i18n key**. The client's `startsWith("errors.")` check fails, so the raw English string `"Phase 3 is already completed"` is displayed directly to the user.

The `mapErrorToKey()` function (`action-utils.ts`) returns `error.message` for all `AppError` instances without validating that it's an i18n key.

**Triggering scenario**: User completes Phase 3, then navigates back and clicks the advance button again. The phase status is already "completed", triggering `PHASE_ALREADY_COMPLETED` instead of `PHASE_ORDER_VIOLATION`.

**Additional raw English strings found in `phase-engine.ts`**:
- Line 155: `"Trip is not in expedition mode"` (PHASE_ORDER_VIOLATION path)
- Line 163: `"Phase ${phaseNumber} not found"` (INVALID_PHASE)
- Line 195: `"Phase ${phaseNumber} is not active"` (PHASE_NOT_ACTIVE)
- Line 202: `"Phase ${phaseNumber} is already completed"` (PHASE_ALREADY_COMPLETED)
- Line 343: `"Phase ${phaseNumber} is not active"` (in advanceFromPhase)
- Line 352: `"Phase ${phaseNumber} cannot be skipped -- it must be completed"` (PHASE_NOT_NON_BLOCKING)

All of these are `AppError` messages that `mapErrorToKey()` returns directly to the client. Any of them could surface as raw English text to PT-BR users.

**Fix Required**:
- Change all raw English `AppError` messages in `phase-engine.ts` to i18n keys (e.g., `"errors.phaseAlreadyCompleted"`, `"errors.phaseNotActive"`, `"errors.generic"`)
- OR: change `mapErrorToKey()` to return `"errors.generic"` for any `AppError` whose message is not a valid i18n key
- OR: add a client-side fallback in all wizards to show `tErrors("generic")` when the error message does not match a known pattern

**Ship/Hold Recommendation**: Fix in hotfix -- raw English strings displayed to PT-BR users is a broken experience.

---

### 2.6 BUG-F [P1]: Phase 2 Confirmation Screen Missing Data Fields

**Severity**: S3-Medium
**Priority**: P1-Must Fix
**Status**: Open

#### Analysis of Confirmation Screen (`Phase2Wizard.tsx` lines 407-514)

**Data currently shown on confirmation**:
- Destination (from `tripContext?.destination`)
- Origin (from `tripContext?.origin`)
- Dates (from `tripContext?.startDate / endDate`)
- Traveler type (raw value, e.g., "solo" -- NOT translated)
- Passengers (if family/group): total count + breakdown detail + children ages
- Accommodation style (raw value, e.g., "comfort" -- NOT translated)
- Pace (N/10)
- Budget (formatted with currency)
- Preferences (count of filled categories, e.g., "3 categories")

**Data MISSING from confirmation**:
1. **Nome (Name)**: User's name is not passed to Phase2Wizard at all. The component only receives `tripId` and `tripContext` (destination, origin, dates). The user's name entered in Phase 1 is not available.
2. **Bio**: Same as name -- not passed to Phase 2.
3. **Detailed passengers**: The breakdown IS shown (line 452-458: `passengersDetail`), but only for family/group types.
4. **Preferences detail**: Only shows count ("3 categories"), not the actual selected preferences.
5. **Traveler type and accommodation style displayed as raw English values** (line 439: `{travelerType}`, line 473: `{accommodationStyle}`). They are `capitalize`d but not translated. Should show "Solo" in PT-BR, not "solo".

**Additional i18n issue found**: Line 493 has hardcoded English: `{filledPrefs.length === 1 ? "category" : "categories"}` -- this should use i18n.

**Fix Required**:
1. Pass user name and bio to Phase 2 (or fetch from profile)
2. Translate traveler type and accommodation style labels (use the already-defined i18n keys like `step1.solo`, `step2.budget`)
3. Replace hardcoded "category"/"categories" with i18n
4. Optionally show preference details (not just count)

**Ship/Hold Recommendation**: Fix in next sprint -- data is correct, but display is incomplete and untranslated.

---

## Section 3: i18n Audit

### 3.1 Missing or Incorrect Translations

| ID | File | Key | Issue | Severity |
|----|------|-----|-------|----------|
| I18N-001 | `pt-BR.json` | `expedition.phase4.title` | Shows "O Abrigo" -- should be "A Logistica" (ADR-012) | High |
| I18N-002 | `en.json` | `expedition.phase4.title` | Shows "The Shelter" -- should be "The Logistics" | High |
| I18N-003 | `pt-BR.json` | `expedition.phase4.subtitle` | Still references old phase name semantics | Medium |
| I18N-004 | `en.json` | `expedition.phase4.subtitle` | Still references old phase name semantics | Medium |
| I18N-005 | `Phase2Wizard.tsx` | line 439 | Traveler type displayed as raw value (`{travelerType}`) not translated | Medium |
| I18N-006 | `Phase2Wizard.tsx` | line 473 | Accommodation style displayed as raw value not translated | Medium |
| I18N-007 | `Phase2Wizard.tsx` | line 493 | Hardcoded English "category"/"categories" | Medium |
| I18N-008 | `dashboard/page.tsx` | line 33 | Hardcoded `"Traveler"` fallback (English in PT-BR context) | Low |
| I18N-009 | `pt-BR.json` | `gamification.phases.theShelter` | Dead key: "O Abrigo" still exists alongside correct "A Logistica" | Low |
| I18N-010 | `en.json` | `gamification.phases.theShelter` | Dead key: "The Shelter" still exists alongside correct "The Logistics" | Low |
| I18N-011 | `en.json` | `gamification.phases` | **Duplicate JSON key**: `phases` object appears TWICE at lines 776-786 and 788-799 | High |
| I18N-012 | `pt-BR.json` | `expedition.phase2.passengers.children` | "Criancas" missing accent (should be "Criancas" / "Criancas") | Low |
| I18N-013 | `pt-BR.json` | `expedition.phase2.passengers.infants` | "Bebes" missing accent | Low |

### 3.2 Duplicate JSON Key Issue (I18N-011)

In `messages/en.json`, the `gamification` object has **two `phases` keys** (lines 776-786 and 788-799). In JSON, duplicate keys cause the second to silently overwrite the first. This means the first `phases` block (without `progressLabel` and `comingSoon`) is completely ignored. While the second block includes these extra keys, this is a maintenance hazard and may cause unexpected behavior if the blocks diverge.

The `pt-BR.json` file has a single `phases` block with all keys, so it does not have this issue.

### 3.3 Error Key Consistency

| Key | PT-BR | EN | Status |
|-----|-------|-----|--------|
| `errors.generic` | Present | Present | OK |
| `errors.phaseAlreadyCompleted` | Present | Present | OK (but display bug -- see BUG-E) |
| `errors.validation` | Present | Present | OK |
| `errors.aiAuthError` | Present | Present | OK |
| `errors.aiModelError` | Present | Present | OK |
| `errors.aiParseError` | Present | Present | OK |
| `errors.aiSchemaError` | Present | Present | OK |
| `errors.rateLimitExceeded` | Present | Present | OK |
| `errors.network` | Present | Present | OK |
| `errors.timeout` | Present | Present | OK |
| `errors.unauthorized` | Present | Present | OK |
| `errors.forbidden` | Present | Present | OK |
| `errors.notFound` | Present | Present | OK |

All error keys are present in both locales.

---

## Section 4: Responsive/Mobile Testing Scenarios

### 4.1 Critical Viewports

| Viewport | Width | Priority |
|----------|-------|----------|
| Mobile small | 320px | P1 |
| Mobile standard | 375px | P0 |
| Tablet portrait | 768px | P1 |
| Desktop | 1280px | P0 |

### 4.2 Mobile-Specific Scenarios

#### TC-017: Phase 4 Tabs on Mobile
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Phase 4 at 375px width | 3 tabs should not overflow |
| 2 | Tab labels "Transporte", "Hospedagem", "Mobilidade" | Text should not truncate |
| 3 | Tab panel content | Forms should stack vertically |
| 4 | Transport segment form | All fields usable without horizontal scroll |

#### TC-018: Dashboard Expedition Cards on Mobile
**Priority**: P0
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open dashboard at 375px | Cards stack vertically |
| 2 | Phase progress bar | 8 segments visible, clickable |
| 3 | Checklist mini-progress | Readable text |

#### TC-019: Phase 2 Visual Card Selector on Mobile
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Phase 2, traveler type selection at 375px | 6 cards arranged in responsive grid |
| 2 | Tap a card | Selection visual feedback visible |

#### TC-020: Phase 1 Destination Autocomplete on Mobile
**Priority**: P0
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Phase 1 Step 2 at 375px | Autocomplete dropdown does not overflow viewport |
| 2 | Type and scroll results | Results list scrollable within viewport |
| 3 | Keyboard on iOS/Android | Input field not obscured by keyboard |

---

## Section 5: Error Handling Scenarios

### 5.1 Network Errors

#### TC-021: Phase 5 Guide Generation Network Failure
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Phase 5, click generate | Generation starts |
| 2 | Simulate network disconnect | Error message shown in alert div |
| 3 | Reconnect and retry | "Gerar Guia do Destino" button available again |

#### TC-022: Phase 6 AI Timeout
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger itinerary generation | Progress messages shown |
| 2 | Wait > 120s (maxDuration) | Timeout error shown: "A requisicao expirou. Tente novamente." |
| 3 | Cancel button visible during generation | User can abort |

### 5.2 Validation Edge Cases

#### TC-023: Phase 2 Budget Edge Cases
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set budget to 0 | Error: "O orcamento deve ser pelo menos 100" |
| 2 | Set budget to 99 | Error: "O orcamento deve ser pelo menos 100" |
| 3 | Set budget to 100 | Accepted |
| 4 | Set budget to 100,001 | Error: "O orcamento deve ser no maximo 100.000" |
| 5 | Set budget to NaN (empty field) | Falls back to 100 (parseInt default) |

#### TC-024: Phase 1 Date Validation
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set end date before start date | Error: "A data de retorno deve ser posterior a data de partida" |
| 2 | Set only start date (no end date) | Accepted (dates are optional) |
| 3 | Set no dates at all | Accepted (flexible dates) |

#### TC-025: Phase 4 Transport Segment Limits
**Priority**: P2
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add transport segments up to maximum | "Maximo de {max} segmentos de transporte atingido" message |
| 2 | Try to add one more | Button disabled or hidden |

### 5.3 Session and Auth Edge Cases

#### TC-026: Session Expiry Mid-Wizard
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Phase 2, fill data partially | Data in memory |
| 2 | Session expires (simulate by clearing cookie) | Next action (e.g., click "Proximo") may fail silently or redirect |
| 3 | Expected: Redirect to `/auth/login` | Auth guard in Server Action should throw UnauthorizedError |

#### TC-027: Direct URL Access Without Auth
**Priority**: P0
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Access `/expedition/abc123/phase-3` without login | Redirect to `/auth/login` |
| 2 | Access `/dashboard` without login | Redirect to `/auth/login` |

#### TC-028: BOLA -- Accessing Another User's Trip
**Priority**: P0
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User A | User A session |
| 2 | Navigate to `/expedition/{userB-tripId}/phase-3` | Redirect to `/dashboard` (trip not found for User A) |
| 3 | Verify response | **404 behavior, NOT 403** (no existence leakage) |

---

## Section 6: Accessibility Audit Scenarios

### 6.1 Keyboard Navigation

#### TC-029: Phase 2 Wizard Keyboard Navigation
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab through traveler type cards | Each card focusable |
| 2 | Enter/Space on a card | Selection toggles |
| 3 | Tab to "Proximo" button | Button focusable |
| 4 | Enter on "Proximo" | Advances to next step |
| 5 | `aria-live="polite"` on step container | Screen reader announces step changes |

#### TC-030: Phase 3 Checklist Item Keyboard
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab to checklist item | Item focusable (button with role="checkbox") |
| 2 | Space/Enter toggles item | `aria-checked` updates |
| 3 | `aria-label` on each item | Reads translated item name |

#### TC-031: Phase 4 Tab Navigation
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab to tab list | `role="tablist"` announced |
| 2 | Arrow keys between tabs | `aria-selected` updates |
| 3 | Tab panel has `role="tabpanel"` | Correctly associated with tab |
| 4 | `aria-controls` and `aria-labelledby` set | **CHECK**: tab buttons have `aria-controls` but no `id` matching `aria-labelledby` pattern |

### 6.2 Screen Reader

#### TC-032: Points Animation Accessibility
**Priority**: P2
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete a phase | PointsAnimation renders |
| 2 | Screen reader | Announces points earned, badge if any |
| 3 | Dismiss mechanism | Keyboard accessible |

### 6.3 ARIA and Semantic Issues Found

| ID | Component | Issue | Severity |
|----|-----------|-------|----------|
| A11Y-001 | `Phase4Wizard.tsx` | Tab buttons use `aria-controls="panel-{key}"` but `id` on panels is `panel-{key}` -- this is correct. However, tab buttons lack `id` attributes for `aria-labelledby` on panels. | Medium |
| A11Y-002 | `Phase4Wizard.tsx` | Car rental buttons use `aria-pressed` correctly | OK |
| A11Y-003 | `Phase3Wizard.tsx` | Checklist items use `role="checkbox"` + `aria-checked` correctly | OK |
| A11Y-004 | `DestinationGuideWizard.tsx` | Stat card buttons use `aria-expanded` correctly | OK |
| A11Y-005 | `Phase2Wizard.tsx` | Step container has `aria-live="polite"` + `aria-atomic="true"` | OK |
| A11Y-006 | `RegisterForm.tsx` | Error messages have `role="alert"` + `aria-live="assertive"` | OK |

---

## Section 7: Gamification Flow

### 7.1 Points and Badges Verification

#### TC-033: Phase Completion Points Accumulation
**Priority**: P0
| Phase | Expected Points | Badge | Rank Promotion |
|-------|----------------|-------|----------------|
| Phase 1 (O Chamado) | 100 | `first_step` | -- |
| Phase 2 (O Explorador) | 150 | -- | `explorer` |
| Phase 3 (A Rota) | 75 | `navigator` | -- |
| Phase 4 (A Logistica) | 50 | `host` | -- |
| Phase 5 (O Mapa dos Dias) | 40 | -- | `cartographer` |
| Phase 6 (O Tesouro) | 250 | `treasurer` | -- |
| **Total (Phases 1-6)** | **665** | | |

**Verification steps**:
1. After each phase completion, verify PointsAnimation shows correct points
2. Check dashboard total points matches sum
3. Check profile badges section shows unlocked badges
4. Check rank progression: traveler -> explorer -> navigator -> cartographer

#### TC-034: Checklist Item Points (Phase 3)
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle a checklist item on | Points popup with item's `pointsValue` |
| 2 | Toggle same item off then on again | Points only awarded once (first completion) |

#### TC-035: Guide Section Points (Phase 5)
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Expand a guide section for first time | "+5" points popup |
| 2 | Expand same section again | No additional points |

### 7.2 Rank Progression

#### TC-036: Rank Display Accuracy
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | After Phase 1 | Rank: "Viajante" / "Traveler" |
| 2 | After Phase 2 | Rank: "Explorador" / "Explorer" |
| 3 | After Phase 5 | Rank: "Cartografo" / "Cartographer" |
| 4 | Dashboard header shows current rank | Correct rank displayed |
| 5 | Profile page shows rank | Consistent with dashboard |

---

## Section 8: Phase Navigation

### 8.1 Forward Navigation

#### TC-037: Linear Phase Progression
**Priority**: P0
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete Phase 1 | Redirect to Phase 2 |
| 2 | Complete Phase 2 | Redirect to Phase 3 |
| 3 | Complete Phase 3 | Redirect to Phase 4 |
| 4 | Complete Phase 4 | Redirect to Phase 5 |
| 5 | Complete Phase 5 | Redirect to Phase 6 |

### 8.2 Backward Navigation (Revisiting)

#### TC-038: Revisit Completed Phase 3
**Priority**: P1
**Preconditions**: User is on Phase 5 (current)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/expedition/{tripId}/phase-3` | Phase3Wizard renders in "revisiting" mode |
| 2 | `isRevisiting` is true | "Ir para a Fase 5" button shown instead of advance |
| 3 | Toggle checklist items | Items toggle correctly |
| 4 | Click "Ir para a Fase 5" | Navigates to current phase |

#### TC-039: Revisit Completed Phase 4
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/expedition/{tripId}/phase-4` | Phase4Wizard with revisiting controls |
| 2 | Edit transport/accommodation data | Data saves correctly |
| 3 | "Ir para a Fase {currentPhase}" button | Navigates to current phase |

### 8.3 Skip Prevention

#### TC-040: Direct URL to Future Phase
**Priority**: P0
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trip is on Phase 2 | `trip.currentPhase = 2` |
| 2 | Navigate to `/expedition/{tripId}/phase-5` | Redirect to `/dashboard` (page guard: `trip.currentPhase < 5`) |
| 3 | Navigate to `/expedition/{tripId}/phase-3` | Redirect to `/dashboard` |

#### TC-041: Expedition Hub Routing
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/expedition/{tripId}` | Hub page redirects to current phase |
| 2 | Phase 1 special case | Redirects to Phase 2 (Phase 1 auto-completes on creation) |

---

## Section 9: Data Persistence

### 9.1 Language Switch Preservation

#### TC-042: Phase 1 Step Preservation Across Language Switch
**Priority**: P1
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Phase 1, navigate to Step 3 | URL has `?step=3` |
| 2 | Switch language (PT-BR to EN) | Page reloads at `/en/...?step=3` |
| 3 | Verify step 3 is shown | Step param preserved |

**Note**: Form data (destination, dates) is NOT persisted across language switch since it's in React state. Only step number is preserved via URL params.

### 9.2 Page Refresh Persistence

#### TC-043: Phase 4 Data Persistence After Refresh
**Priority**: P0
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Phase 4, add transport segment, save | Data saved to DB |
| 2 | Refresh page (F5) | Transport data loaded via `getTransportSegmentsAction` |
| 3 | Previous entries visible | Data persisted correctly |

#### TC-044: Phase 3 Checklist State Persistence
**Priority**: P0
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle checklist items, refresh page | Checked state persisted (DB-backed) |

#### TC-045: Phase 2 Data NOT Persisted on Refresh
**Priority**: P2 (Known limitation)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Phase 2, select traveler type and accommodation | Data in React state |
| 2 | Refresh page | Data lost -- user starts over |

**This is a known limitation**: Phase 2 data is only saved on submit (completePhase2Action). Mid-wizard state is not persisted.

---

## Section 10: Issues Found -- Classification

### 10.1 Bugs (Functional Defects)

| ID | Severity | Priority | Description | Root Cause | Recommendation |
|----|----------|----------|-------------|------------|----------------|
| BUG-A | S1-Critical | P0-Blocker | All trips stored as "international" regardless of origin/destination | `tripType` not set in `ExpeditionService.createExpedition()`, defaults to "international" in Prisma schema | HOLD RELEASE |
| BUG-B | S2-High | P0-Blocker | Phase 4 title "O Abrigo" / "The Shelter" instead of "A Logistica" / "The Logistics" | i18n keys `expedition.phase4.title` not updated after ADR-012 rename | HOLD RELEASE |
| BUG-E | S2-High | P1-Must Fix | Raw English "Phase N is already completed" displayed to user (including PT-BR) | `PHASE_ALREADY_COMPLETED` error in `phase-engine.ts` line 202 uses raw English instead of i18n key | Fix in hotfix |

### 10.2 UX Issues

| ID | Severity | Priority | Description | Recommendation |
|----|----------|----------|-------------|----------------|
| BUG-C | S3-Medium | P1-Must Fix | Phase 4 uses tabs instead of wizard steps (inconsistent with Phases 1-2) | Refactor to step wizard in next sprint |
| BUG-D | S3-Medium | P1-Must Fix | Phase 5 guide requires manual generation button instead of auto-generating | Add auto-generation on first visit |
| UX-001 | S4-Low | P2-Should Fix | Phase 2 confirmation shows raw English values for traveler type and accommodation | Use translated labels |
| UX-002 | S4-Low | P2-Should Fix | Phase 2 mid-wizard data lost on page refresh | Consider server-side draft persistence |

### 10.3 Missing Features

| ID | Priority | Description |
|----|----------|-------------|
| BUG-F | P1-Must Fix | Phase 2 confirmation missing: user name, bio, detailed preferences |
| MF-001 | P2 | Phase 7 and Phase 8 not implemented (coming soon screens) |
| MF-002 | P3 | No "share trip" or "export PDF" functionality |

### 10.4 i18n Issues

| ID | Severity | Description |
|----|----------|-------------|
| I18N-001 | High | `expedition.phase4.title` = "O Abrigo" in PT-BR (should be "A Logistica") |
| I18N-002 | High | `expedition.phase4.title` = "The Shelter" in EN (should be "The Logistics") |
| I18N-005 | Medium | Phase 2 confirmation: traveler type displayed as raw English value |
| I18N-006 | Medium | Phase 2 confirmation: accommodation style displayed as raw English value |
| I18N-007 | Medium | Phase 2 confirmation: hardcoded "category"/"categories" in English |
| I18N-008 | Low | Dashboard: hardcoded "Traveler" fallback when no user name |
| I18N-009 | Low | Dead key `gamification.phases.theShelter` in PT-BR |
| I18N-010 | Low | Dead key `gamification.phases.theShelter` in EN |
| I18N-011 | High | Duplicate `phases` key in EN `gamification` JSON object |
| I18N-012 | Low | Portuguese accent missing: "Criancas" (should use proper accent) |
| I18N-013 | Low | Portuguese accent missing: "Bebes" (should use proper accent) |

---

## Test Suite Status

### Existing Test Coverage

Based on project memory: **1,575 tests passing** across 106 suites.

**Known test files relevant to this review**:
- `tests/unit/lib/travel/trip-classifier.test.ts` -- EXISTS: tests `classifyTrip()` for domestic, mercosul, schengen, international classifications. Tests the pure function logic which works correctly. **But no test exists verifying that the classification result is persisted to the database during trip creation** -- this gap is the root cause of BUG-A escaping to staging.
- `tests/unit/lib/engines/phase-engine.test.ts` -- EXISTS: tests `PhaseEngine.completePhase()`, phase order validation, BOLA guards. Uses `mockDeep<PrismaClient>()` pattern. Default mock trip has `tripType: "international"`, which means existing tests never exercise domestic/mercosul-specific code paths.
- `tests/unit/server/transport.service.test.ts` -- EXISTS: tests BOLA rejection, max segments, booking code encryption.
- Phase4Wizard: No dedicated component test file found.
- `tests/unit/server/expedition.actions.test.ts` -- DOES NOT EXIST: no unit tests for `advanceFromPhaseAction`, `completePhase4Action`, etc.
- E2E tests: Located in `tests/e2e/trips/` -- exist but coverage of Phase 4-6 wizard flows is unknown.
- Accessibility tests: Located in `tests/e2e/accessibility/` -- exist but Phase 4-6 coverage unknown.

### Test Gaps Identified

| Gap | Priority | Description |
|-----|----------|-------------|
| GAP-001 | P0 | No integration test verifying `tripType` is set correctly on trip creation (the `classifyTrip` function works, but it's never called server-side) |
| GAP-002 | P0 | No test for `ExpeditionService.createExpedition()` verifying `tripType` field is set in DB |
| GAP-003 | P1 | No test verifying i18n key `expedition.phase4.title` matches `phase-config.ts` phase name |
| GAP-004 | P1 | No E2E test for full Phase 1 through Phase 6 journey (critical user path) |
| GAP-005 | P1 | No test for Phase 5 auto-generation behavior on first visit |
| GAP-006 | P1 | No unit test for `advanceFromPhaseAction` error message format (verifying i18n keys vs raw English) |
| GAP-007 | P1 | Phase engine tests only use `tripType: "international"` mock data -- domestic/mercosul paths untested |
| GAP-008 | P2 | No test for `errors.phaseAlreadyCompleted` display rendering in all wizard components |
| GAP-009 | P2 | No test for Phase 2 confirmation screen data completeness (BUG-F) |
| GAP-010 | P2 | No i18n key consistency test (e.g., verifying all keys in EN exist in PT-BR and vice versa) |
| GAP-011 | P2 | No test detecting duplicate JSON keys in message files (I18N-011) |

---

## QA Sign-off

**Sign-off ID**: QA-REL-E2E-001
**QA Engineer**: qa-engineer
**Date**: 2026-03-10
**Verdict**: HOLD -- do not release

### Verdict Rationale

Two P0 blockers remain unresolved:

1. **BUG-A (S1-Critical)**: `tripType` is never persisted -- ALL trips default to "international". This corrupts Phase 3 checklist generation, Phase 4 CINH logic, and trip type badges throughout the app. This is a data integrity issue that affects every single user.

2. **BUG-B (S2-High)**: The Phase 4 page title still shows the pre-ADR-012 name "O Abrigo" / "The Shelter" instead of "A Logistica" / "The Logistics", breaking the gamification narrative consistency.

Additionally, 3 P1 issues (BUG-C, BUG-D, BUG-E, BUG-F) require fixes before stakeholder UX acceptance.

> HOLD -- do not release until:
> 1. BUG-A: `tripType` persisted correctly on trip creation (requires schema + service + action changes)
> 2. BUG-B: i18n keys `expedition.phase4.title` and `subtitle` updated in both locales
> 3. BUG-E: Raw i18n key display investigated and fixed
> 4. I18N-011: Duplicate `phases` key in EN JSON resolved
