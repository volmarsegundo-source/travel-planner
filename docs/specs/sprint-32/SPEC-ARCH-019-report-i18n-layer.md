# SPEC-ARCH-019: Report Data Aggregation i18n Layer — Architecture Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, security-specialist, qa-engineer]
**Product Spec**: SPEC-PROD-027 (P1-004, P1-005)
**UX Spec**: N/A (data/label fixes, no layout changes)
**Created**: 2026-03-19
**Last Updated**: 2026-03-19

---

## 1. Overview

The expedition report (`TripReport.tsx`) currently renders raw database values (e.g., `"international"`, `"student"`, `"copies_documents"`) without passing them through the i18n layer, and is missing several data fields that the user has filled in (passenger counts, travel pace, preferences, age range, pending checklist items highlight). This spec defines the translation mapping approach and data enrichment needed to produce a fully localized and complete report.

The fix is purely additive: no database schema changes, no new APIs, no new services. The existing `ReportGenerationService` needs enriched DTO fields, and `TripReport.tsx` needs to translate enum values via `next-intl` before rendering.

---

## 2. Architecture Decision Records

No new ADR is needed. This spec follows the existing conventions:
- i18n keys live in `messages/pt-BR.json` and `messages/en.json`
- Translation in client components uses `useTranslations()` from `next-intl`
- The report DTO carries raw values; the component is responsible for translating them for display
- This is consistent with how Phase2Wizard already translates `travelerType` values (e.g., `t("step1.solo")`)

**Design Decision**: Translate in the component, not the service. The `ReportGenerationService` returns raw DB values. The `TripReport.tsx` component (a `"use client"` component with access to `useTranslations`) maps each enum value to its i18n key before rendering. This avoids passing locale context into server services, which would violate our separation of concerns (services are locale-agnostic).

---

## 3. System Design

### Current State Analysis

#### P1-004: Raw enum values rendered

| Field | DB Value (example) | Current Display | Expected Display (PT-BR) |
|-------|-------------------|-----------------|--------------------------|
| `phase1.tripType` | `"international"` | `"international"` | `"Internacional"` |
| `phase2.travelerType` | `"student"` | `"student"` | `"Estudante"` |
| `phase2.accommodationStyle` | `"luxury"` | `"luxury"` | `"Luxo"` |
| `phase3.items[].itemKey` | `"copies_documents"` | `"copies_documents"` | `"Copias de documentos"` |
| `phase4.transportSegments[].type` | `"flight"` | `"flight"` | `"Voo"` |
| `phase4.accommodations[].type` | `"hotel"` | `"hotel"` | `"Hotel"` |
| `phase4.mobility[]` | `"metro"` | `"metro"` | `"Metro"` |

#### P1-005: Missing data fields

| Phase | Missing Field | Source in DB | Present in DTO? |
|-------|-------------|-------------|-----------------|
| Phase 1 | Passenger counts (adults, children, infants, seniors) | `Trip.adultsCount`, `Trip.childrenCount`, `Trip.infantsCount` + `ExpeditionPhase(2).metadata.passengers` | Via `ExpeditionSummaryPhase2.passengers` (Phase 2 section) |
| Phase 1 | Duration (calculated days/nights) | Derived from `startDate` and `endDate` | No |
| Phase 1 | Age range of primary traveler | `UserProfile.birthDate` | No |
| Phase 2 | Travel pace | `ExpeditionPhase(2).metadata.travelPace` | Yes in `ExpeditionSummaryPhase2.travelPace` but not rendered |
| Phase 2 | Budget | `ExpeditionPhase(2).metadata.budget` + `currency` | Yes in `ExpeditionSummaryPhase2.budget`/`.currency` but not rendered |
| Phase 2 | Detailed preferences | `UserProfile.preferences` (JSON) | No |
| Phase 3 | Required item pending highlight | `PhaseChecklistItem.required` + `.completed` | In DTO but no visual distinction for pending REQUIRED |

### Translation Mapping Strategy

All translations will be placed under a `report.enums` namespace in the i18n files. The component will use a helper function to resolve enum values to translated strings.

#### i18n Key Structure

```json
{
  "report": {
    "enums": {
      "tripType": {
        "domestic": "Nacional",
        "international": "Internacional",
        "schengen": "Schengen"
      },
      "travelerType": {
        "solo": "Solo",
        "couple": "Casal",
        "family": "Familia",
        "group": "Grupo",
        "business": "Executivo",
        "student": "Estudante"
      },
      "accommodationStyle": {
        "budget": "Economico",
        "comfort": "Confortavel",
        "luxury": "Luxo",
        "adventure": "Aventura"
      },
      "transportType": {
        "flight": "Voo",
        "bus": "Onibus",
        "train": "Trem",
        "car": "Carro",
        "ship": "Navio",
        "other": "Outro"
      },
      "accommodationType": {
        "hotel": "Hotel",
        "hostel": "Hostel",
        "airbnb": "Airbnb",
        "resort": "Resort",
        "camping": "Camping",
        "other": "Outro"
      },
      "mobility": {
        "metro": "Metro",
        "bus": "Onibus",
        "taxi": "Taxi",
        "rideshare": "Aplicativo de transporte",
        "bicycle": "Bicicleta",
        "walking": "A pe",
        "car_rental": "Aluguel de carro",
        "scooter": "Patinete",
        "other": "Outro"
      }
    },
    "duration": "{days} dias / {nights} noites",
    "ageRange": "{min}-{max} anos",
    "travelPace": "Ritmo de viagem",
    "travelPaceValue": "{value}/10",
    "budgetLabel": "Orcamento estimado",
    "preferencesLabel": "Preferencias",
    "pendingRequired": "Pendente",
    "checklistComplete": "Checklist completo",
    "phaseNotCompleted": "Fase nao preenchida",
    "passengersBreakdown": "{adults} adultos, {children} criancas, {infants} bebes, {seniors} idosos"
  }
}
```

#### Checklist Item Keys

Checklist items use dynamic keys generated by `checklist-rules.ts`. These keys already have corresponding translations in the `expedition.phase3.checklist` namespace. The report component should use that existing namespace:

```typescript
// In TripReport.tsx, for checklist items:
const tChecklist = useTranslations("expedition.phase3.checklist");
// Render: tChecklist(item.itemKey) instead of raw item.itemKey
// Fallback: if key not found, render item.itemKey (graceful degradation)
```

#### Translation Helper

```typescript
// In TripReport.tsx:
function translateEnum(
  t: (key: string) => string,
  namespace: string,
  value: string
): string {
  try {
    const translated = t(`enums.${namespace}.${value}`);
    // next-intl returns the key path if translation is missing
    if (translated.startsWith("enums.")) {
      return value; // Graceful fallback to raw value
    }
    return translated;
  } catch {
    return value; // Graceful fallback
  }
}
```

### Data Enrichment

#### ReportGenerationService Changes

The `TripReportDTO` needs additional fields. Modify the interfaces:

```typescript
export interface TripReportDTO {
  tripId: string;
  tripTitle: string;
  generatedAt: string;

  phase1: ReportPhase1 | null;       // Enriched from ExpeditionSummaryPhase1
  phase2: ReportPhase2 | null;       // Enriched from ExpeditionSummaryPhase2
  phase3: ReportPhase3 | null;       // Existing (already enriched)
  phase4: ExpeditionSummaryPhase4 | null;  // Unchanged
  phase5: ReportPhase5 | null;       // Existing (already enriched)
  phase6: ReportPhase6 | null;       // Existing (already enriched)

  /** Which phases have been completed vs not started */
  phaseStatuses: Record<number, string>;  // NEW: { 1: "completed", 2: "completed", ... }
}
```

#### New/Modified DTO interfaces

```typescript
// Enriched Phase 1 (extends existing ExpeditionSummaryPhase1)
export interface ReportPhase1 extends ExpeditionSummaryPhase1 {
  durationDays: number | null;       // NEW: calculated from dates
  durationNights: number | null;     // NEW: days - 1
  ageRange: string | null;           // NEW: "18-25", "26-35", etc. (from birthDate)
  passengers: {                      // NEW: from Phase 2 metadata
    adults: number;
    children: number;
    infants: number;
    seniors: number;
  } | null;
}

// Enriched Phase 2 (extends existing ExpeditionSummaryPhase2)
export interface ReportPhase2 extends ExpeditionSummaryPhase2 {
  preferences: Record<string, string[]> | null;  // NEW: from UserProfile.preferences
}
```

#### Data Sources for Missing Fields

| Missing Field | DB Source | Query Strategy |
|---------------|----------|----------------|
| `durationDays` | `trip.startDate`, `trip.endDate` | Calculated in service: `differenceInDays(endDate, startDate)` |
| `ageRange` | `UserProfile.birthDate` | Already queried in `buildSnapshot`; calculate age range bucket |
| `passengers` | `ExpeditionSummaryPhase2.passengers` | Already available via `ExpeditionSummaryService` |
| `preferences` | `UserProfile.preferences` (JSON) | New query: `db.userProfile.findUnique({ where: { userId }, select: { preferences: true } })` |
| `phaseStatuses` | `ExpeditionPhase.status` for all phases | New query: `db.expeditionPhase.findMany({ where: { tripId } })` |

All new queries can be added to the existing parallel `Promise.all` in `generateTripReport`, adding at most 2 new queries (UserProfile.preferences, ExpeditionPhase statuses) alongside the existing 3.

#### Age Range Calculation

```typescript
function calculateAgeRange(birthDate: Date | null): string | null {
  if (!birthDate) return null;
  const age = differenceInYears(new Date(), birthDate);
  if (age < 18) return "0-17";
  if (age < 26) return "18-25";
  if (age < 36) return "26-35";
  if (age < 46) return "36-45";
  if (age < 56) return "46-55";
  if (age < 66) return "56-65";
  return "65+";
}
```

Note: This returns a range string, NOT the exact birth date. This satisfies the SPEC-PROD-027 privacy constraint (AC-013).

### Component Changes: TripReport.tsx

The component needs these changes:

1. **Phase 1 section**: Add duration, age range, passengers (only non-zero categories)
2. **Phase 2 section**: Add travel pace, budget, preferences (translated labels and values)
3. **Phase 3 section**: Translate `item.itemKey` via `tChecklist(item.itemKey)`. Highlight required pending items with distinct visual indicator (not just color — text + icon per WCAG).
4. **All enum values**: Use `translateEnum()` helper for tripType, travelerType, accommodationStyle, transport type, accommodation type, mobility items.
5. **Phase status indicators**: For phases without data, show "Fase nao preenchida" instead of omitting the section.
6. **Null handling**: Omit fields silently when null (AC-014, AC-017). Never render "null", "undefined", or empty strings.

### Data Flow

```
ReportGenerationService.generateTripReport(tripId, userId)
    |
    v
ExpeditionSummaryService.getExpeditionSummary(tripId, userId)  -- base data
    |
    v
Promise.all([
  checklistItems,         // existing
  guide,                  // existing
  itineraryDays,          // existing
  userProfile,            // NEW: for preferences + birthDate
  expeditionPhases,       // NEW: for phase statuses
])
    |
    v
Enrich Phase1: add durationDays, ageRange, passengers (from phase2 data)
Enrich Phase2: add preferences (from userProfile.preferences, parsed via Zod)
Add phaseStatuses map
    |
    v
Return TripReportDTO (raw values — no locale-specific translations)
    |
    v
TripReport.tsx (client component)
    |
    v
useTranslations("report") + useTranslations("expedition.phase3.checklist")
    |
    v
translateEnum() for all enum values
Render duration, age range, passengers, preferences with translated labels
Highlight required pending items
Show "Fase nao preenchida" for incomplete phases
```

---

## 4. Data Model

No schema changes required. All data is already present in the database:

- `Trip`: destination, origin, startDate, endDate, tripType
- `ExpeditionPhase`: metadata (JSON with travelerType, accommodationStyle, travelPace, budget, currency, passengers)
- `UserProfile`: birthDate, preferences (JSON)
- `PhaseChecklistItem`: itemKey, required, completed
- `TransportSegment`: type, departurePlace, arrivalPlace, bookingCodeEnc
- `Accommodation`: type, name, bookingCodeEnc

---

## 5. Vendor Dependencies

None.

---

## 6. Constraints (MANDATORY)

### Architectural Boundaries

- Translations happen in the client component (`TripReport.tsx`), NOT in server services. Services return raw DB values.
- The `report.enums` i18n namespace is the single source of truth for enum display names in the report context.
- Existing i18n keys in other namespaces (e.g., `expedition.phase2.step1.solo`) should NOT be reused in the report. The report needs its own namespace because display labels may differ (e.g., "Solo" in the wizard card vs "Viajante solo" in the report).
- Checklist item translations reuse the existing `expedition.phase3.checklist` namespace since those are authoritative label translations.
- Preferences are stored as JSON in UserProfile.preferences. They must be validated through `PreferencesSchema` (Zod) before rendering to prevent injected content.

### Performance Budgets

- Report generation latency increase: +2 queries (UserProfile.preferences, ExpeditionPhase statuses) added to existing `Promise.all`. Expected impact: < 20ms additional p95 latency.
- No bundle size impact from i18n keys (loaded on demand by next-intl).

### Security Requirements

- **PII**: Birth date MUST NOT appear in the report. Only the calculated age range string (e.g., "26-35") is included in the DTO.
- **Booking codes**: Already masked by `ExpeditionSummaryService`. Verify masking is maintained in enriched DTO.
- **BOLA**: Inherited from `ExpeditionSummaryService` (verifies trip.userId === session.userId).
- **Preferences validation**: Parse `UserProfile.preferences` through `PreferencesSchema` before including in DTO. If parsing fails, omit preferences (graceful degradation).
- **XSS**: All values rendered in TripReport.tsx go through React's JSX escaping. No `dangerouslySetInnerHTML`.

### Scalability

Not applicable — report generation is a low-frequency operation (once per expedition, user-initiated).

---

## 7. Implementation Guide

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/server/services/report-generation.service.ts` | Modify | Enrich DTOs: add ReportPhase1, ReportPhase2 interfaces; add durationDays, ageRange, passengers, preferences, phaseStatuses queries |
| `src/components/features/expedition/TripReport.tsx` | Modify | Translate all enum values via `translateEnum()`; render missing fields; highlight pending REQUIRED items; show phase-not-completed indicator |
| `messages/pt-BR.json` | Modify | Add `report.enums.*` namespace with all enum translations; add `report.duration`, `report.ageRange`, `report.travelPace`, `report.budgetLabel`, `report.preferencesLabel`, `report.pendingRequired`, `report.checklistComplete`, `report.phaseNotCompleted`, `report.passengersBreakdown` |
| `messages/en.json` | Modify | Add corresponding English translations |

### i18n Keys Checklist

The following enum value sets must have complete translations in both locales:

| Enum Set | Values | i18n Namespace |
|----------|--------|----------------|
| tripType | domestic, international, schengen | `report.enums.tripType` |
| travelerType | solo, couple, family, group, business, student | `report.enums.travelerType` |
| accommodationStyle | budget, comfort, luxury, adventure | `report.enums.accommodationStyle` |
| transportType | flight, bus, train, car, ship, other | `report.enums.transportType` |
| accommodationType | hotel, hostel, airbnb, resort, camping, other | `report.enums.accommodationType` |
| mobility | metro, bus, taxi, rideshare, bicycle, walking, car_rental, scooter, other | `report.enums.mobility` |
| preferenceCategory | cuisine, activities, accommodation, accessibility, specialInterests, climate, nightlife, shopping | `report.enums.preferenceCategory` |

Each category's values (e.g., cuisine options: "local", "vegetariana", etc.) must also have translations. These already exist partially in `expedition.phase2.step5.prefValue.*`. If they do not exist in `report.enums`, create them or reference the existing namespace.

### Pending Required Item Visual Treatment

```tsx
// In TripReport.tsx, Phase 3 section:
{item.required && !item.completed && (
  <span className="ml-1 inline-flex items-center gap-1 rounded-sm bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
    <span aria-hidden="true">!</span>
    {t("pendingRequired")}
  </span>
)}
```

This uses text + icon (not just color) to satisfy WCAG 1.4.1.

---

## 8. Testing Strategy

### Unit Tests

| Test Suite | What to Test |
|-----------|-------------|
| `report-generation.service.test.ts` | Enriched Phase 1: durationDays calculated correctly, ageRange buckets correct, null birthDate -> null ageRange |
| `report-generation.service.test.ts` | Enriched Phase 2: preferences from UserProfile parsed correctly, invalid JSON -> null preferences |
| `report-generation.service.test.ts` | phaseStatuses: all 6 phases returned with correct statuses |
| `TripReport.test.tsx` | All enum values translated (tripType, travelerType, accommodationStyle, transport type, etc.) |
| `TripReport.test.tsx` | Missing fields gracefully omitted (no "null", "undefined" in rendered output) |
| `TripReport.test.tsx` | Required pending items have visual distinction (data-testid or role check) |
| `TripReport.test.tsx` | Phase not completed shows indicator |
| `TripReport.test.tsx` | Duration renders correctly for valid dates, omitted for null dates |
| `TripReport.test.tsx` | Age range renders bucket, not exact date |

### Integration Tests

| Scenario | Coverage |
|----------|----------|
| Full report generation with all phases completed | All fields present and correctly structured |
| Report with partial data (Phase 4 empty) | Phase 4 section present but shows "no logistics" or omitted gracefully |
| Report with null preferences | Phase 2 preferences section omitted |

### Eval Criteria (EDD)

| Eval Dimension | Criteria | Threshold |
|---------------|----------|-----------|
| i18n Completeness | Zero raw enum values (snake_case, camelCase) visible in rendered report | 100% pass |
| Data Completeness | All fields from AC-012 through AC-022 present when data exists | 100% pass |
| Privacy | Birth date never appears; only age range | 100% pass |
| Accessibility | Required pending items distinguishable by text, not just color | 100% pass |
| Graceful Degradation | Unknown enum values render as-is (no crash) | 100% pass |
| Locale | PT-BR and EN both render correctly | 100% pass |

---

## 9. Open Questions

- [ ] **OQ-1**: Some preference values may not have translations yet (the preference system is relatively new from Sprint 20). Should missing preference value translations fall back to the raw value, or show "Outro"? **Recommendation**: Fall back to raw value with `titleCase()` formatting. Better than showing "Outro" which is inaccurate.
- [ ] **OQ-2**: SPEC-PROD-027 explicitly puts Phase 4 detail and Phase 5/6 content in "Out of Scope" for the report section data. The current report already renders Phase 4/5/6 data. This spec preserves that behavior and only adds i18n translation. No new data aggregation for those phases. **Confirmed**: consistent with product spec scope.
- [ ] **OQ-3**: The existing `report.enums` keys may partially overlap with `expedition.phase2.step1.*` and `expedition.tripTypes.*` keys. Should we deduplicate? **Recommendation**: Keep separate namespaces. Report labels may diverge from wizard card labels in the future (e.g., "Solo" -> "Viajante solo" in a formal report). Minimal overhead to maintain.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-19 | architect | Initial draft — i18n translation layer and data enrichment for expedition report (P1-004, P1-005) |
