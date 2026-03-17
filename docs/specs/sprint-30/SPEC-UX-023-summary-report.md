# SPEC-UX-023: Summary/Report Rewrite -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (page rewrite)
**Created**: 2026-03-17
**Last Updated**: 2026-03-17

---

## 0. Audit Summary -- Current State

### 0.1 Existing Implementation (`ExpeditionSummary.tsx`)

| Aspect | Current Behavior | Problem |
|---|---|---|
| Layout | Single-column (`max-w-2xl`), hero + next steps + phase cards + "View Dashboard" button | Adequate for on-screen viewing but not printable. No print styles at all. |
| Phase cards | 2-column grid on sm+, each card shows icon + name + status badge + edit link + data summary | Good data but very compact. No collapsible sections. No detailed data display. |
| Phase data display | Minimal: Phase 1 shows destination + dates, Phase 2 shows traveler type, Phase 3 shows checklist count, Phase 4 shows transport/accommodation counts, Phase 5 shows guide date, Phase 6 shows day count | Counts only, no actual details (transport names, accommodation names, itinerary content). Not useful as a trip document. |
| Print support | None | `@media print` rules absent. Navigation, footer, and interactive elements would all print. |
| Export options | None | No PDF export, no share link, no offline document. |
| Action bar | Single "Ver dashboard" button | No print, export, or share actions. |
| Sections | All content visible, not collapsible | Screen gets long for trips with lots of data. |
| Celebration overlay | PointsAnimation on first load | Works but blocks the summary content. |

### 0.2 Key Issues to Resolve

1. **No print support** -- travelers need a printable trip document for offline use
2. **No detailed data** -- phase cards show counts, not actual transport names, accommodation addresses, or itinerary content
3. **No collapsible sections** -- screen becomes long with detailed data
4. **No export/share** -- travelers cannot save or share their trip plan
5. **No print-specific layout** -- needs `@media print` rules to hide UI chrome and format for A4
6. **Action bar is a single button** -- needs Print, Export PDF, and Share Link actions

---

## 1. Traveler Goal

Review a complete, detailed summary of their entire trip plan in one document -- on screen, in print, or as a shareable PDF -- with all logistics, itinerary, and preparation data organized by phase.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Print trip document for offline reference during travel. Share plan with family for safety. |
| `@leisure-family` | Print itinerary for all family members. Share with grandparents or babysitters staying behind. |
| `@business-traveler` | Export PDF for expense reports and travel policy compliance. Print for offline use during flights. |
| `@bleisure` | Share extended itinerary with colleagues to coordinate overlap days. |
| `@group-organizer` | Share trip link with all group members so everyone has the same plan. Print master itinerary. |
| `@travel-agent` | Generate client-facing trip document. Export as PDF for email delivery. |

## 3. User Flow

### 3.1 Happy Path -- View Summary

```
/expedition/{tripId}/summary
    |
    v
[Page loads: header (trip name, dates, readiness) + 6 phase sections]
    |
    v
[Sections collapsed by default on screen (except Phase 1 which is open)]
    |
    v
[User clicks section header to expand/collapse]
    |
    v
[Detailed phase data revealed inline]
```

### 3.2 Print Flow

```
[User clicks "Imprimir" in action bar]
    |
    v
[All sections auto-expand (no collapsed content in print)]
[Browser print dialog opens]
    |
    v
[@media print rules applied: no navbar, no footer, no action bar]
[Page breaks between phases]
[A4 layout with margins]
```

### 3.3 Export PDF Flow

```
[User clicks "Exportar PDF" in action bar]
    |
    v
[Loading state: "Gerando PDF..."]
    |
    v
[PDF generated server-side or client-side]
    |
    v
[Browser download triggered: "expedicao-{destination}-{date}.pdf"]
```

### 3.4 Share Link Flow

```
[User clicks "Compartilhar" in action bar]
    |
    v
[Modal/popover with share options:]
    |--- Copy link button (copies to clipboard)
    |--- Share via (native Web Share API if supported)
    |
    v
[Link copies to clipboard. Toast: "Link copiado!"]
```

### 3.5 Incomplete Trip Summary

```
[User navigates to summary but not all phases complete]
    |
    v
[Summary shows available data. Incomplete phases show "Fase nao concluida" message.]
[Next steps section at top shows remaining actions.]
[No print/export actions for incomplete trips (disabled with tooltip)]
```

---

## 4. Screen Descriptions

### 4.1 Page Header

**Layout**:
```
+-----------------------------------------------+
| [Emoji]  Trip Destination Name                 |
|          15 mar - 22 mar 2026                  |
|          Joao Silva (traveler name)            |
|                                                |
| [====================] 100% Pronto             |
|                                                |
| [Imprimir] [Exportar PDF] [Compartilhar]       |
+-----------------------------------------------+
```

**Content**:
- Cover emoji (48px) + destination (h1, bold, 24px)
- Date range (muted text, 16px). If no dates: "Datas nao definidas"
- Traveler name from profile (muted text, 14px)
- Readiness bar (existing, horizontal, #2DB8A0 fill)
- Trip countdown (existing TripCountdown component) -- only shown if trip is in the future

**Action Bar**:
- Three buttons, horizontal row, centered below header
- "Imprimir": ghost variant, printer icon + text
- "Exportar PDF": ghost variant, download icon + text
- "Compartilhar": ghost variant, share icon + text
- All disabled with tooltip for incomplete trips: "Complete todas as fases para habilitar"
- Mobile: buttons stack vertically or use icon-only with labels below

### 4.2 Phase Sections (Collapsible)

**Structure**: 6 sections, one per phase. Each section:

```
+-----------------------------------------------+
| [v] Phase 1: O Chamado           [Concluida]  |
+-----------------------------------------------+
| (expanded content below when open)             |
|                                                |
| Destino: Tokyo, Japan                          |
| Origem: Sao Paulo, Brazil                      |
| Data de ida: 15 mar 2026                       |
| Data de volta: 22 mar 2026                     |
| Viajante principal: Joao Silva                 |
+-----------------------------------------------+
```

**Section Header**:
- Chevron icon (rotates 90deg when expanded)
- Phase icon emoji + "Fase {N}: {Phase Name}" (bold, 18px)
- Status badge: "Concluida" (green), "Em andamento" (blue), "Nao iniciada" (gray)
- Click anywhere on header to toggle expand/collapse
- Keyboard: Enter/Space to toggle

**Default State**:
- Phase 1: expanded by default (first meaningful data)
- Phases 2-6: collapsed by default
- Print: all expanded (forced)

**Animation**: Height transition 200ms ease-out. `prefers-reduced-motion`: instant show/hide.

### 4.3 Phase 1 Content: O Chamado

**Data displayed**:
- Destino: destination city + country
- Origem: origin city + country
- Data de ida: formatted start date
- Data de volta: formatted end date
- Viajante principal: traveler name, email
- Tipo de viagem: trip type classification (if available)

**Layout**: Definition list (`dl` / `dt` + `dd`), 2-column on desktop (label left, value right), stacked on mobile.

### 4.4 Phase 2 Content: O Explorador

**Data displayed**:
- Tipo de viajante: traveler type (e.g., "Aventureiro")
- Estilo de hospedagem: accommodation style preference
- Passageiros: adults, children (with ages), infants
- Preferencias: list of selected preferences per category (chips display)

**Layout**: Same definition list. Preferences shown as compact chip row per category.

### 4.5 Phase 3 Content: A Preparacao

**Data displayed**:
- Checklist progress: "{done} de {total} itens concluidos"
- Required items: list with checkmark/X icons
- Recommended items: list with checkmark/X icons
- Each item: name + status icon

**Layout**: Two sections -- "Obrigatorios" and "Recomendados". Each item on its own line with icon.

### 4.6 Phase 4 Content: A Logistica

**Data displayed**:
- Transportes: each segment as a card-like row
  - Type icon + type name
  - Company (if set)
  - Departure/arrival (if set)
  - Booking code: masked (show last 4 chars, rest as bullets). "Mostrar" toggle to reveal.
- Hospedagens: each accommodation as a card-like row
  - Type icon + type name
  - Name (if set)
  - Check-in / Check-out (if set)
  - Booking code: masked, same as transport
- Mobilidade local: list of selected options (icon + name)

**Layout**: Grouped subsections within Phase 4. Each transport/accommodation row is a mini-card with subtle border.

**Booking code security**: Codes are masked by default on screen and in print. User must explicitly tap "Mostrar" to reveal. Print always shows masked version unless user has revealed and prints immediately.

### 4.7 Phase 5 Content: O Guia do Destino

**Data displayed**:
- Summary: destination summary paragraph (if AI-generated `destinationSummary` field exists)
- Stat cards: timezone, currency, language, electricity (compact inline list, not full cards)
- Key sections: safety tips, cultural notes, local transport tips (first 200 chars each, truncated with "..." for screen, full in print)

**Layout**: Summary paragraph first, then stat list, then content sections.

### 4.8 Phase 6 Content: O Roteiro

**Data displayed**:
- Day-by-day itinerary
- Each day: "Dia {N} -- {date}" header
- Activities: time + activity name + location (if set)
- Notes per day (if set)

**Layout**: Each day as a subsection with activities listed chronologically. Day headers have subtle divider line above.

### 4.9 Print Layout (`@media print`)

**Rules**:
- Hide: navbar, footer, breadcrumbs, action bar, FAB, any fixed/sticky elements
- Hide: collapsible chevrons, "Mostrar" booking code toggles
- Force: all sections expanded (no collapsed content)
- Force: booking codes remain masked (security)
- Page margins: 20mm top/bottom, 15mm left/right (A4 standard)
- Page breaks: `break-before: page` on each phase section (Phase 2-6). Phase 1 stays with header on page 1.
- Font size: body 12pt, h1 18pt, h2 14pt, data labels 11pt
- Colors: simplified to black/dark gray on white. No gradients, no colored badges.
- Phase status badges: print as text-only, no background color
- Readiness bar: print as "Prontidao: {N}%" text, no visual bar
- Trip countdown: print as "Faltam {N} dias" text
- Background graphics: none (`-webkit-print-color-adjust: economy`)

**Page layout**:
```
Page 1:
  Trip Name, Dates, Traveler
  Readiness: 100%
  Phase 1: O Chamado (data)

Page 2:
  Phase 2: O Explorador (data)

Page 3:
  Phase 3: A Preparacao (checklist)

Page 4:
  Phase 4: A Logistica (transport + accommodation + mobility)

Page 5:
  Phase 5: O Guia do Destino (stats + sections)

Page 6+:
  Phase 6: O Roteiro (day-by-day, may span multiple pages)
```

### 4.10 Responsive Behavior

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Single column. Action buttons stack vertically or icon-only row. Definition lists stack (label above value). Phase sections full-width. |
| Tablet (768-1024px) | Single column, wider padding. Action buttons horizontal. Definition lists 2-column. |
| Desktop (> 1024px) | Single column, `max-w-3xl` centered. Action buttons horizontal. Definition lists 2-column. Generous whitespace. |

---

## 5. Interaction States Table

### 5.1 Section Toggle

| User Action | State | Expected Behavior |
|---|---|---|
| Click section header | Collapsed | Expand section. Chevron rotates 90deg clockwise. Content slides down (200ms). |
| Click section header | Expanded | Collapse section. Chevron rotates back. Content slides up (200ms). |
| Enter/Space on focused header | Any | Toggle expand/collapse. Same as click. |
| Tab to section header | Any | Focus ring on header. |
| "Expand all" (keyboard shortcut) | Any | Not implemented in v1. |

### 5.2 Action Bar

| User Action | State | Expected Behavior |
|---|---|---|
| Click "Imprimir" | Trip complete | Expand all sections silently. Trigger `window.print()`. After print dialog closes, restore collapse state. |
| Click "Imprimir" | Trip incomplete | Button disabled. Tooltip: "Complete todas as fases para imprimir." |
| Click "Exportar PDF" | Trip complete | Show loading spinner on button. Generate PDF. Trigger download. Restore button. |
| Click "Exportar PDF" | Trip incomplete | Button disabled. Tooltip: "Complete todas as fases para exportar." |
| Click "Compartilhar" | Trip complete | Show share popover/modal. |
| Click "Compartilhar" | Trip incomplete | Button disabled. Same tooltip. |
| Click "Copiar link" in share modal | Any | Copy URL to clipboard. Toast: "Link copiado!" Button text changes to "Copiado!" for 2s. |
| Click "Compartilhar via..." in share modal | Browser supports Web Share API | Native share sheet opens. |
| Click "Compartilhar via..." in share modal | No Web Share API | Button hidden. Only "Copiar link" shown. |

### 5.3 Booking Code

| User Action | State | Expected Behavior |
|---|---|---|
| Click "Mostrar" next to masked code | Masked | Reveal full code. Toggle text changes to "Ocultar". |
| Click "Ocultar" | Revealed | Mask code again. Toggle text changes to "Mostrar". |
| Print while code revealed | Revealed | Code prints masked (security override). |

### 5.4 Phase Section States

| Phase State | Section Appearance |
|---|---|
| Complete | Full data displayed. Green "Concluida" badge. |
| In progress (partial) | Available data displayed. Missing fields show "Nao preenchido" in italic muted. Blue "Em andamento" badge. |
| Not started | Section content: "Esta fase ainda nao foi iniciada." Centered muted text. Link: "Iniciar fase {N}". Gray badge. |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Keyboard Navigation
- [x] Section headers: `role="button"`, `aria-expanded="true|false"`, `aria-controls="{section-id}"`
- [x] Section content: `id` matching `aria-controls`, `role="region"`, `aria-labelledby="{header-id}"`
- [x] Tab order: header -> action bar -> Phase 1 header -> Phase 1 content (if expanded) -> Phase 2 header -> ...
- [x] Enter/Space toggles section expand/collapse
- [x] Action bar buttons: standard button focus behavior
- [x] Share modal: focus trapped inside, Escape to close, focus returns to trigger
- [x] Booking code toggle: focusable, `aria-label="Mostrar codigo de reserva"` / `"Ocultar codigo de reserva"`
- [x] Focus indicator: 2px solid ring (primary color), 2px offset

### Screen Reader
- [x] Section headers announce: "Fase {N}: {name}, {status}, {collapsed|expanded}"
- [x] Expand/collapse: `aria-expanded` state change announced automatically
- [x] Readiness bar: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [x] Checklist items: announced with status ("concluido" or "pendente")
- [x] Masked booking codes: announced as "Codigo de reserva: oculto. Ativar para revelar."
- [x] Print/Export/Share disabled buttons: `aria-disabled="true"` with description via `aria-describedby`
- [x] Phase icons (emoji): `aria-hidden="true"` (decorative, phase name provides the info)
- [x] Share toast: `aria-live="polite"` announces "Link copiado"

### Color and Contrast
- [x] Definition list labels (muted) against card bg: >= 4.5:1
- [x] Phase status badge text against badge bg: >= 4.5:1
- [x] Chevron icon against section header bg: >= 3:1 (graphical object)
- [x] No information conveyed by color alone: status badges use text, checklist uses icons, booking codes use text toggle
- [x] Print mode: all text black on white (maximum contrast)

### Motion
- [x] Section expand/collapse: `prefers-reduced-motion` uses instant show/hide
- [x] Chevron rotation: disabled under reduced motion
- [x] Loading spinner on PDF export: uses `motion-reduce:animate-none`

### Touch
- [x] Section headers: full-width, minimum 48px height (generous touch target)
- [x] Action bar buttons: minimum 44x44px
- [x] Booking code toggle: minimum 44x44px touch target
- [x] Share modal buttons: minimum 44x44px

---

## 7. Content and Copy

### Key Labels and CTAs

| Key | PT-BR | EN |
|---|---|---|
| `summary.title` | Resumo da Expedicao | Expedition Summary |
| `summary.print` | Imprimir | Print |
| `summary.exportPdf` | Exportar PDF | Export PDF |
| `summary.share` | Compartilhar | Share |
| `summary.copyLink` | Copiar link | Copy link |
| `summary.linkCopied` | Link copiado! | Link copied! |
| `summary.shareVia` | Compartilhar via... | Share via... |
| `summary.readiness` | Prontidao | Readiness |
| `summary.phaseNotStarted` | Esta fase ainda nao foi iniciada. | This phase has not been started yet. |
| `summary.startPhase` | Iniciar fase {N} | Start phase {N} |
| `summary.notFilled` | Nao preenchido | Not filled |
| `summary.showCode` | Mostrar | Show |
| `summary.hideCode` | Ocultar | Hide |
| `summary.bookingCode` | Codigo de reserva | Booking code |
| `summary.disabledTooltip` | Complete todas as fases para habilitar. | Complete all phases to enable. |
| `summary.generatingPdf` | Gerando PDF... | Generating PDF... |
| `summary.checklistProgress` | {done} de {total} itens concluidos | {done} of {total} items completed |
| `summary.requiredItems` | Itens obrigatorios | Required items |
| `summary.recommendedItems` | Itens recomendados | Recommended items |
| `summary.expandAll` | Expandir todas | Expand all |
| `summary.collapseAll` | Recolher todas | Collapse all |

### Section Headers

| Phase | PT-BR | EN |
|---|---|---|
| Phase 1 | Fase 1: O Chamado | Phase 1: The Calling |
| Phase 2 | Fase 2: O Explorador | Phase 2: The Explorer |
| Phase 3 | Fase 3: A Preparacao | Phase 3: The Preparation |
| Phase 4 | Fase 4: A Logistica | Phase 4: The Logistics |
| Phase 5 | Fase 5: O Guia do Destino | Phase 5: The Destination Guide |
| Phase 6 | Fase 6: O Roteiro | Phase 6: The Itinerary |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| PDF generation fails | Nao foi possivel gerar o PDF. Tente novamente. | Could not generate the PDF. Try again. |
| Share link copy fails | Nao foi possivel copiar o link. | Could not copy the link. |
| Data load failure | Nao foi possivel carregar o resumo da expedicao. | Could not load the expedition summary. |

### Tone of Voice
- The summary page is a moment of pride and accomplishment. Copy should feel like a finished product -- clean, professional, and complete.
- For incomplete trips, the tone is encouraging: "This phase has not been started yet" with a direct link to start it.
- Print/PDF output should feel like a professional travel document, not a raw data dump.

---

## 8. Constraints

- **Data source**: `ExpeditionSummary` service already aggregates all 6 phases. New spec requires more detailed data (transport names, accommodation names, checklist items, itinerary days). Service may need expansion.
- **Booking code masking**: `expedition-summary.service.ts` already masks booking codes server-side. The "Mostrar" toggle must call an API to get the unmasked value (never send unmasked to the client by default).
- **PDF generation**: Two approaches -- client-side (html2pdf.js / jsPDF) or server-side (Puppeteer/Playwright rendering). Architect decides. Client-side is simpler but may have font/layout issues. Server-side is more reliable but requires infrastructure.
- **Share link**: The summary page URL is already shareable if the viewer has auth access. For public sharing, a token-based public URL would be needed (not in v1 scope -- share link shares the authenticated URL).
- **A4 print**: Standard A4 is 210mm x 297mm. With 15mm margins = 180mm x 257mm printable area. At 96 DPI this is ~680px x 970px.

---

## 9. Prototype

- [ ] Prototype required: Yes
- **Location**: `docs/prototypes/summary-report.html`
- **Scope**: Header + collapsible phase sections (expanded/collapsed) + action bar + print preview simulation
- **Notes**: To be created as a follow-up. Print styles can be demonstrated with a "Print preview" toggle button.

---

## 10. Open Questions

- [ ] **PDF generation approach**: Client-side (html2pdf.js) vs. server-side (Puppeteer). Trade-offs: bundle size vs. infrastructure cost. **Needs: architect + finops-engineer**
- [ ] **Public share link**: Should v1 support sharing with non-authenticated users via a token? Or only share the URL (requires login)? **Needs: product-owner**
- [ ] **Expanded summary data**: The current `ExpeditionSummary` service returns counts, not details (e.g., transport segment count vs. actual segment data). Expanding the service is required. How much data should be fetched? All at once or lazy-load per section? **Needs: architect**
- [ ] **Booking code reveal API**: Currently codes are masked server-side. Do we need a dedicated API endpoint to fetch an unmasked code on demand? **Needs: architect + security-specialist**
- [ ] **"Expand all" / "Collapse all" control**: Should we add a toggle above the sections? **Needs: product-owner** (This spec includes the i18n keys but leaves it as optional for v1.)

---

## 11. Components to Create / Replace

### New Components

| Component | Replaces | Purpose |
|---|---|---|
| `ExpeditionSummary` (rewrite) | Current `ExpeditionSummary.tsx` | Complete rewrite with collapsible sections, detailed data, action bar |
| `SummaryPhaseSection` | Nothing (new) | Collapsible phase section with header, status badge, content |
| `SummaryActionBar` | Nothing (new) | Print / Export PDF / Share buttons |
| `SummaryShareModal` | Nothing (new) | Share popover with copy link + native share |
| `BookingCodeField` | Nothing (new) | Masked code with show/hide toggle |
| `SummaryPrintStyles` | Nothing (new) | `@media print` stylesheet component or global CSS |

### Components to Deprecate

| Component | Action |
|---|---|
| Current `ExpeditionSummary` | Replace entirely |
| `PhaseDataSummary` (internal sub-component) | Replace with per-phase detailed content |
| `StatusBadge` (internal sub-component) | Rewrite as part of SummaryPhaseSection |

---

## 12. Patterns Used

**From `docs/ux-patterns.md`**: TripCountdown (reused for header), Toast (for clipboard feedback), ErrorBoundaryCard (for data load failures)

**New patterns introduced**: SummaryPhaseSection (collapsible section with status), SummaryActionBar (print/export/share), BookingCodeField (masked reveal toggle), SummaryPrintStyles (A4 print layout)

---

> **Spec Status**: Draft
> Ready for: Architect (pending resolution of open questions in Section 10, especially PDF generation approach and summary data expansion)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-17 | ux-designer | Initial draft. Full audit of current summary + complete rewrite spec with collapsible sections, print layout, PDF export, share, and detailed phase data. |
