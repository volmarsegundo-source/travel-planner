---
spec_id: SPEC-UX-012
title: "Journey Summary Page"
type: ux
status: Draft
version: "1.0.0"
author: ux-designer
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs:
  - SPEC-UX-009
  - SPEC-UX-005
---

# SPEC-UX-012: Journey Summary Page — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: N/A (structural improvement)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

The traveler wants to see a comprehensive, at-a-glance summary of everything they have planned across all 8 expedition phases — their personal info, destination, dates, preferences, transport, accommodation, mobility, and destination guide highlights — so they can review their trip readiness and quickly identify what still needs attention.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | A single summary page provides confidence that nothing was forgotten before the trip |
| `@leisure-family` | Reviewing all details in one place helps coordinate with family members who did not participate in planning |
| `@business-traveler` | Quick readiness check before travel; can screenshot or print for expense reports |
| `@bleisure` | Sees both business and leisure components side by side to ensure alignment |
| `@group-organizer` | Can share the summary with group members for review and approval |

## 3. User Flow

### Entry Points

```
[Expedition card on /expeditions page]
    |
    +-- Click "Ver Resumo" action (new) --> /expedition/{id}/summary
    |
[Any phase wizard page]
    |
    +-- Breadcrumb: Home > Expeditions > {Trip Name} > Resumo
    |
[Phase 8 completion]
    |
    +-- After celebration animation --> Redirect to /expedition/{id}/summary
```

### Page Flow

```
[/expedition/{id}/summary loads]
    |
    v
[Server fetches all phase data for this expedition]
    |
    v
[Summary page renders with all sections]
    |
    v
[Traveler reviews sections top to bottom]
    |
    +-- Section complete: green checkmark, data displayed
    |
    +-- Section incomplete: amber warning icon, "Preencha esta etapa" CTA
    |       |
    |       +-- Click CTA --> Navigate to relevant phase wizard
    |
    +-- Section empty: muted placeholder, "Ainda nao iniciada" label
    |
    v
[Readiness banner at top shows overall % and missing items count]
    |
    v
[Optional: "Imprimir resumo" action opens print-friendly view]
```

### Edge Cases

- **Expedition not started (all phases empty)**: Page renders with all sections in empty state. Readiness: 0%. Banner encourages starting Phase 1.
- **Expedition completed (all phases done)**: Page renders fully populated. Readiness: 100%. Banner shows celebratory state.
- **Partial completion**: Mix of complete, incomplete, and empty sections. Readiness calculated as percentage of non-empty phases.
- **No AI guide generated yet**: Phase 5 section shows placeholder with "Gerar guia" CTA linking to Phase 5.
- **User views summary of someone else's expedition**: Not possible (BOLA prevention). Server returns 403.

## 4. Screen Descriptions

### Screen: Journey Summary Page (`/expedition/{id}/summary`)

**Purpose**: Single-page review of all expedition planning data, with clear readiness indication and quick navigation to edit any section.

**Layout**:
- Container: `max-w-4xl`, centered, standard page padding
- Content stacked vertically:
  1. Breadcrumb: Home > Expeditions > {Trip Name} > Resumo
  2. Readiness Banner (sticky on desktop, static on mobile)
  3. Section cards (8 sections, one per phase)
  4. Print action (bottom of page)

#### Readiness Banner

**Purpose**: Immediate visual answer to "Am I ready?"

**Content**:
- Left side: Circular progress indicator (64px diameter) showing completion percentage
  - Ring color: `--color-success` (#2DB8A0) for filled portion, `--color-bg-subtle` for unfilled
  - Center: percentage number (24px, bold)
- Right side (stacked):
  - Expedition name (h1, 20px, bold)
  - Destination + dates summary (14px, `text-muted-foreground`)
  - Missing items count: "X itens pendentes" in amber, or "Tudo pronto!" in green
- Background: `bg-card`, `border-border`, `rounded-lg`, `shadow-sm`
- Padding: 24px

**Readiness calculation**:
- Each of the 8 phases contributes equally (12.5% each)
- A phase is "complete" if its mandatory data is filled (even if optional fields are empty)
- Phase 5 (guide): complete if guide has been generated
- Phase 6 (budget): complete if at least one budget item exists
- Total = (completed phases / 8) * 100, rounded to nearest integer

#### Section Cards (8 sections)

Each section card represents one expedition phase and follows a consistent structure:

**Card structure**:
1. **Header row**: Phase icon (20px) + Phase name (16px, bold) + Status indicator (right-aligned)
   - Complete: Green checkmark icon + "Completo" label
   - Incomplete: Amber warning icon + "Incompleto" label
   - Empty: Muted dash icon + "Nao iniciada" label
2. **Content area**: Summary of the phase data (varies by phase — see below)
3. **Footer row**: "Editar" link button (right-aligned) navigating to the relevant phase wizard

**Card styling**:
- Background: `bg-card`
- Border: `border-border`, `rounded-lg`
- Left accent border: 3px solid, colored per phase (reuses phase color from ExpeditionProgressBar)
- Padding: 16px
- Gap between cards: 16px

**Content per section**:

| Phase | Section Title | Content when populated | Content when empty |
|---|---|---|---|
| 1 - O Chamado | Informacoes Pessoais | Name, origin city, contact | "Preencha seus dados pessoais" |
| 2 - O Explorador | Destino e Datas | Destination, start/end dates, trip type, passengers | "Escolha seu destino e datas" |
| 3 - O Preparo | Checklist | X de Y itens concluidos (progress bar) | "Monte seu checklist de viagem" |
| 4 - A Logistica | Transporte e Hospedagem | Transport type + booking ref, accommodation name + dates, mobility options | "Adicione suas reservas" |
| 5 - O Mapa dos Dias | Guia do Destino | Destination summary (2 lines, truncated) + "Ver guia completo" link | "Gere o guia do seu destino" |
| 6 - O Tesouro | Orcamento | Total budget amount + category breakdown (3 largest) | "Planeje seu orcamento" |
| 7 - A Expedicao | Itinerario | Number of days planned + first/last day summary | "Monte seu itinerario" |
| 8 - O Legado | Finalizacao | Completion date, total points earned | "Conclua sua expedicao" |

#### Missing Items Callout

Below the readiness banner and above the section cards:

- Only shown if readiness < 100%
- A compact horizontal bar listing the incomplete/empty phase names as chips
- Each chip is clickable, navigating to the relevant phase
- Background: `bg-warning/10`, border: `border-warning/30`, `rounded-lg`
- Icon: amber warning triangle
- Text: "Etapas pendentes:" followed by clickable phase name chips

#### Print Action

- Text link at the bottom of the page: "Imprimir resumo"
- Opens the browser print dialog
- Print styles: hide header/footer/nav, remove shadows/borders, single-column layout, serif font for readability, include all section content expanded

### Dark Theme

- Readiness banner: `bg-card` adapts to dark. Progress ring colors work on dark backgrounds.
- Section cards: `bg-card`, `border-border` adapt. Left accent borders remain vibrant.
- Missing items callout: `bg-warning/10` on dark is subtle amber tint on dark surface.
- Status indicators: green/amber/muted colors all have sufficient contrast on dark `bg-card`.

### Wireframe Description

```
Desktop (>= 1024px):
+----------------------------------------------------------+
| Breadcrumb: Home > Expeditions > Tokyo 2026 > Resumo     |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | [Progress Ring 75%]  Tokyo 2026                      | |
| |                      Tokyo, Japao - 15/06 a 25/06   | |
| |                      2 itens pendentes               | |
| +------------------------------------------------------+ |
|                                                          |
| [!] Etapas pendentes: [O Tesouro] [O Legado]            |
|                                                          |
| +------------------------------------------------------+ |
| | [Icon] Informacoes Pessoais          [v] Completo    | |
| | Nome: Joao Silva | Origem: Sao Paulo                | |
| |                                      [Editar ->]     | |
| +------------------------------------------------------+ |
|                                                          |
| +------------------------------------------------------+ |
| | [Icon] Destino e Datas               [v] Completo    | |
| | Tokyo, Japao | 15/06 - 25/06 | 2 adultos, 1 crianca | |
| |                                      [Editar ->]     | |
| +------------------------------------------------------+ |
|                                                          |
| ... (6 more section cards) ...                           |
|                                                          |
| [Imprimir resumo]                                        |
+----------------------------------------------------------+

Mobile (< 768px):
+----------------------------------+
| Home > ... > Resumo              |
+----------------------------------+
| [Ring 75%] Tokyo 2026            |
| Tokyo, Japao - 15/06 a 25/06    |
| 2 itens pendentes                |
+----------------------------------+
| [!] Pendentes: [O Tesouro]      |
|                [O Legado]        |
+----------------------------------+
| [Icon] Informacoes Pessoais [v]  |
| Nome: Joao Silva                 |
| Origem: Sao Paulo               |
|                    [Editar ->]   |
+----------------------------------+
| ... (stacked cards) ...          |
+----------------------------------+
```

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Single column. Readiness banner stacks vertically (ring above text). Section cards full-width. Missing items chips wrap. Print link centered. |
| Tablet (768-1024px) | Single column, wider cards. Readiness banner horizontal. Same card structure. |
| Desktop (> 1024px) | Single column, max-w-4xl centered. Readiness banner horizontal. Cards with comfortable padding. |

## 5. Interaction Patterns

- **Edit links**: Standard navigation links. No animation. Navigate to `/expedition/{id}/phase-{N}`.
- **Missing items chips**: Clickable, navigate to the relevant phase. Hover: `bg-warning/20`. Focus: standard outline.
- **Print**: Opens browser print dialog via `window.print()`. No custom print preview.
- **Scroll**: Standard page scroll. No sticky elements on mobile (readiness banner scrolls with content). On desktop, readiness banner may optionally be sticky (architect decision based on implementation complexity).
- **No auto-refresh**: Data loads once on page load. If the traveler edits a phase and returns, the summary reflects updated data (server-rendered).

### Motion

No animations on this page. It is a static summary view. The only motion is standard page transition when navigating to/from phase wizards.

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA
- **Keyboard Navigation**:
  - [x] All "Editar" links and missing items chips are focusable via Tab
  - [x] Tab order follows visual order: banner -> missing items -> section 1 edit -> section 2 edit -> ... -> print
  - [x] Focus indicator visible on all interactive elements
  - [x] No keyboard traps
- **Screen Reader**:
  - [x] Page has `<h1>` with expedition name + "Resumo"
  - [x] Readiness banner: progress ring has `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Progresso da expedicao: X%"`
  - [x] Each section card: `<section>` with `aria-labelledby` pointing to the section heading
  - [x] Status indicators: text labels (not icon-only). Screen reader hears "Completo" / "Incompleto" / "Nao iniciada"
  - [x] Phase icons: `aria-hidden="true"` (decorative)
  - [x] Missing items callout: announced as a list with `role="list"`, each chip as `role="listitem"`
  - [x] Print link: clearly labeled "Imprimir resumo da expedicao"
- **Color & Contrast**:
  - [x] Status green checkmark: accompanied by text "Completo" (not color alone)
  - [x] Status amber warning: accompanied by text "Incompleto" (not color alone)
  - [x] Progress ring: percentage number in center provides non-color information
  - [x] All text on card backgrounds >= 4.5:1
  - [x] Left accent borders: decorative, not sole information carrier (phase name in header provides identity)
- **Touch**:
  - [x] "Editar" links: minimum 44x44px tap target (link area includes padding)
  - [x] Missing items chips: minimum 44px height, adequate horizontal padding
  - [x] Print link: 44px tap target

## 7. Content & Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `summary.pageTitle` | Resumo da Expedicao | Expedition Summary |
| `summary.breadcrumb` | Resumo | Summary |
| `summary.readiness` | Progresso da expedicao: {percent}% | Expedition progress: {percent}% |
| `summary.allReady` | Tudo pronto! | All set! |
| `summary.pendingCount` | {count} etapas pendentes | {count} pending steps |
| `summary.pendingLabel` | Etapas pendentes: | Pending steps: |
| `summary.statusComplete` | Completo | Complete |
| `summary.statusIncomplete` | Incompleto | Incomplete |
| `summary.statusNotStarted` | Nao iniciada | Not started |
| `summary.editAction` | Editar | Edit |
| `summary.printAction` | Imprimir resumo | Print summary |
| `summary.phase1.title` | Informacoes Pessoais | Personal Information |
| `summary.phase1.empty` | Preencha seus dados pessoais | Fill in your personal details |
| `summary.phase2.title` | Destino e Datas | Destination & Dates |
| `summary.phase2.empty` | Escolha seu destino e datas | Choose your destination and dates |
| `summary.phase3.title` | Checklist | Checklist |
| `summary.phase3.empty` | Monte seu checklist de viagem | Build your travel checklist |
| `summary.phase4.title` | Transporte e Hospedagem | Transport & Accommodation |
| `summary.phase4.empty` | Adicione suas reservas | Add your bookings |
| `summary.phase5.title` | Guia do Destino | Destination Guide |
| `summary.phase5.empty` | Gere o guia do seu destino | Generate your destination guide |
| `summary.phase6.title` | Orcamento | Budget |
| `summary.phase6.empty` | Planeje seu orcamento | Plan your budget |
| `summary.phase7.title` | Itinerario | Itinerary |
| `summary.phase7.empty` | Monte seu itinerario | Build your itinerary |
| `summary.phase8.title` | Finalizacao | Completion |
| `summary.phase8.empty` | Conclua sua expedicao | Complete your expedition |

### Tone of Voice

- Informational and supportive. The summary is a review tool, not a judgment.
- Empty/incomplete states use encouraging language: "Preencha..." not "Voce esqueceu...".
- The readiness banner celebrates progress ("75% concluido!") rather than highlighting gaps.

## 8. Constraints

- This page requires read access to ALL phase data for a single expedition. This is a new data aggregation endpoint or a composite of existing service calls.
- Phase data structures vary by phase (checklist items, transport records, accommodation records, budget entries, itinerary days). The architect must define a unified summary response or the frontend must call multiple services.
- BOLA prevention: the page must verify that the authenticated user owns the expedition before rendering any data.
- Print styles: CSS `@media print` rules must be included. No JavaScript-based PDF generation in v1.
- The page should be server-rendered (not client-side) for performance and SEO-irrelevance (behind auth, but server render is still preferred for speed).

## 9. Prototype

- [ ] Prototype required: Yes (new page layout with multiple states)
- **Location**: `docs/prototypes/journey-summary.html`
- **Scope**: Full page with readiness banner, all 8 sections (mix of complete/incomplete/empty), missing items callout, dark theme variant
- **Status**: Deferred to implementation sprint — spec and wireframe are sufficient for architect

## 10. Open Questions

- [ ] Should the summary page be accessible from the expedition card dropdown menu, or as a separate navigation element? **Recommendation**: Add a "Ver Resumo" action to the expedition card's action menu, and also make it accessible via breadcrumb navigation from any phase wizard.
- [ ] Should the readiness percentage include Phase 8 (completion) in the calculation? Phase 8 is only "complete" when the entire expedition is finished, which means readiness can never reach 100% until the traveler explicitly completes. **Recommendation**: Include all 8 phases. 100% means the expedition is fully complete. 87.5% (7/8) means "planning complete, ready to finalize."
- [ ] Should the print layout include the destination guide highlights or just a reference? **Recommendation**: Include a condensed version (section titles + summaries, no tips/details) to keep the print concise.

## 11. Patterns Used

- **ExpeditionProgressBar** (phase colors reused for left accent borders)
- **StatusBadge** (adapted for complete/incomplete/empty states)
- **Breadcrumb** (existing pattern)
- **EmptyState** (per-section variant, more compact than full-page empty state)
- **New pattern: ReadinessBanner** — circular progress + expedition summary + missing items count
- **New pattern: SummaryCard** — standardized section card with header/content/edit action

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft |
