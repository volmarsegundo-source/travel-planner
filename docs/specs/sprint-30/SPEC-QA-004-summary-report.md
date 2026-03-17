# Test Strategy: Summary Report

**Strategy ID**: SPEC-QA-004
**Related Spec**: (SPEC-PROD for Summary Report; current implementation in `expedition-summary.service.ts`)
**Author**: qa-engineer
**Date**: 2026-03-17
**Sprint**: 30
**Version**: 1.0.0

---

## 1. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| BOLA: access other user's summary via direct URL | Low | Critical | P0 |
| BOLA: access other user's summary via share link | Low | Critical | P0 |
| Stale data shown (cached summary does not reflect latest edits) | Medium | High | P0 |
| Missing phase data crashes render instead of graceful indicator | Medium | High | P0 |
| Print layout cuts content mid-section | Medium | Medium | P1 |
| PDF export fails silently | Medium | Medium | P1 |
| Share link exposes booking codes or PII | Low | Critical | P0 |
| Phase data order incorrect (phases shown out of sequence) | Low | Medium | P1 |
| i18n: summary mixes languages | Medium | Medium | P1 |
| Booking code decryption fails -> raw encrypted blob shown | Low | High | P1 |

---

## 2. Test Pyramid

```
        [E2E]          -- 4 critical journeys (full view, missing phase, print, BOLA)
       [Integration]   -- Summary service data aggregation, BOLA, booking code masking
      [Unit Tests]     -- Phase section renderer, data mapping, print styles, date formatting
```

**Unit tests** (devs must cover):
- `aggregatePhaseData(trip)` — collects data from all 6 phases
- `formatPhaseSection(phase, data, locale)` — correct heading, fields, formatting
- `maskBookingCode(encryptedCode)` — shows "****XXXX" pattern, never raw encrypted blob
- `isPhaseComplete(phaseData)` — true/false for each phase
- `generateShareToken(tripId, userId)` — creates time-limited, user-bound token
- `validateShareToken(token)` — rejects expired, rejects wrong user if private

**Integration tests**:
- Summary service returns all 6 phases with correct data from DB
- BOLA: User B's request for User A's summary returns 404
- Share link with valid token returns summary; expired token returns 403
- Soft-deleted trip summary returns 404
- Booking codes are masked in API response (never plaintext)

**E2E** (automate):
- E2E-SUM-001: Full summary view with all 6 phases populated
- E2E-SUM-002: Summary with missing phases shows "Not completed" indicator
- E2E-SUM-003: Print preview renders all sections
- E2E-SUM-004: BOLA — direct URL to other user's summary blocked

---

## 3. Critical E2E Scenarios

### Scenario E2E-SUM-001: Full Summary View
**ID**: E2E-SUM-001
**Priority**: P0
**Persona**: @leisure-solo (trip with all 6 phases completed)
**Preconditions**: Authenticated user with fully completed expedition

#### Steps
1. Navigate to `/expedition/[tripId]/summary` -> page loads
2. Summary header shows trip destination and dates
3. Phase 1 section: personal info, origin, destination, dates
4. Phase 2 section: passengers data
5. Phase 3 section: checklist/preparation data
6. Phase 4 section: transport, accommodation, mobility
7. Phase 5 section: itinerary (day-by-day if generated)
8. Phase 6 section: destination guide highlights
9. All phase headings are in correct locale

#### Edge Cases
- Phase 4 has multiple transport segments -> all shown
- Phase 5 itinerary has 10+ days -> all days rendered (no pagination cutoff)
- Booking codes show masked format ("****AB12"), not encrypted blob

#### Test Data
- User: `summary-test@playwright.invalid`
- Trip: fully completed expedition to Paris with all phases filled
- Transport booking code: synthetic "TESTCODE123" -> encrypted in DB -> shown as "****E123"

#### Pass Criteria
- [ ] All 6 phase sections visible
- [ ] Data in each section matches DB records
- [ ] Booking codes are masked
- [ ] Correct locale throughout (no mixed languages)
- [ ] Zero console errors

---

### Scenario E2E-SUM-002: Partial Summary (Missing Phases)
**ID**: E2E-SUM-002
**Priority**: P0
**Persona**: @leisure-solo (trip with only phases 1-3 completed)
**Preconditions**: Trip exists but phases 4-6 not started

#### Steps
1. Navigate to summary page -> page loads without error
2. Phases 1-3 show data correctly
3. Phases 4-6 show "Not completed" or "Phase not started" indicator
4. No crash, no blank section, no spinner stuck loading

#### Edge Cases
- Only Phase 1 completed -> 5 phases show "Not completed"
- Zero phases completed (trip just created) -> all 6 show "Not completed"
- Phase partially completed (e.g., Phase 4 has transport but no accommodation) -> show what is available

#### Pass Criteria
- [ ] Page renders without errors for any combination of completed/incomplete phases
- [ ] Incomplete phase indicator is clear and translated
- [ ] Available partial data still shown where applicable

---

### Scenario E2E-SUM-003: Print Layout
**ID**: E2E-SUM-003
**Priority**: P1
**Persona**: @leisure-solo
**Preconditions**: Summary page loaded with full data

#### Steps
1. Trigger print (Ctrl+P or Print button)
2. Print preview shows all 6 phases on consecutive pages
3. No phase section split mid-content between pages (or minimal splitting)
4. Header with trip name/destination on first page
5. No interactive elements (buttons, links) in print output
6. Map renders as static image in print (if map is part of summary)

#### Edge Cases
- Very long itinerary (15+ days) -> paginated cleanly
- Phase with no data -> "Not completed" label prints (not blank space)

#### Pass Criteria
- [ ] Print CSS hides nav, buttons, interactive elements
- [ ] All 6 sections present in print output
- [ ] Page breaks at section boundaries (CSS `break-inside: avoid`)
- [ ] Readable font size in print (>= 10pt)

---

### Scenario E2E-SUM-004: BOLA Test
**ID**: E2E-SUM-004
**Priority**: P0
**Persona**: @malicious-user
**Preconditions**: Two authenticated users, each with their own trip

#### Steps
1. Login as User A -> note User A's trip ID
2. Logout, login as User B
3. Navigate directly to `/expedition/[userA_tripId]/summary` -> expect 404 (not 403)
4. No data from User A's trip is leaked in the response

#### Edge Cases
- User B tries to access User A's share link (if sharing not enabled for that trip) -> blocked
- Brute-force trip IDs -> rate limited, all return 404

#### Pass Criteria
- [ ] HTTP 404 returned (not 403, to avoid existence leakage)
- [ ] No trip data in response body
- [ ] No trip data in HTML source

---

## 4. Manual Exploratory Testing Areas

- **PDF export**: Verify downloaded file opens in PDF viewers, contains all sections, fonts embedded. Cannot reliably automate PDF content verification.
- **Share link flow**: Generate share link, open in incognito, verify access control. Test expired links, revoked links.
- **Print on real printers**: Verify layout on actual paper (A4, Letter). Screen-only in Playwright.
- **Large data sets**: Trip with maximum passengers (20), multiple transport segments (10+), long AI-generated content. Verify no truncation or overflow.
- **Booking code security**: Verify encrypted blob is never exposed in network tab, DOM, or JS variables.

---

## 5. Performance Targets

| Metric | Target | Test Method |
|---|---|---|
| Summary page load (all 6 phases) | < 2s on 4G | Playwright with throttle |
| Summary data aggregation (server) | < 500ms P95 | Integration test timing |
| PDF generation | < 5s | E2E timing (if implemented) |
| Share link generation | < 200ms | Integration test timing |
| Print render time | < 1s after Ctrl+P | Manual observation |

---

## 6. Test Data Requirements

### Synthetic Trip Data
- Fully completed trip (all 6 phases) with realistic data
- Partially completed trip (phases 1-3 only)
- Trip with encrypted booking codes (transport + accommodation)
- Two separate users for BOLA testing

### Booking Code Test Data
- Synthetic codes: "TESTCODE123", "FAKEREF456" (never real booking references)
- Encrypted in DB via `src/lib/crypto.ts` AES-256-GCM
- Expected masked output: last 4 chars visible, rest asterisked

### Share Link Test Data
- Valid share token (expires in 24h)
- Expired share token (backdated)
- Token for wrong user

---

## 7. Out of Scope

| Item | Reason |
|---|---|
| Summary editing from summary page | Summary is read-only; editing via phase wizards |
| Email summary to self | Not in Sprint 30 scope |
| Summary comparison between trips | Future feature |
| Summary API for third-party integrations | Not planned |

---

## 8. AC-to-Test Traceability Matrix

| Expected AC | Test ID(s) | Test Type | Status |
|---|---|---|---|
| All 6 phase data present | E2E-SUM-001, SC-001..SC-006 | E2E + Eval | Planned |
| Missing phase shows indicator | E2E-SUM-002 | E2E | Planned |
| Print: phases on consecutive pages | E2E-SUM-003 | E2E | Planned |
| PDF export downloads file | Manual | Exploratory | Planned |
| Share link generates and works | INT-SUM-SHARE | Integration | Planned |
| BOLA: blocked via direct URL | E2E-SUM-004 | E2E + Integration | Planned |
| BOLA: blocked via share link | INT-SUM-SHARE-BOLA | Integration | Planned |
| Data matches DB (no stale cache) | E2E-SUM-001, SC-001..SC-006 | Eval | Planned |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | qa-engineer | Versao inicial — Sprint 30 planning |
