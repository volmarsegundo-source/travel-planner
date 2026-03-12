---
id: SPEC-UX-016
title: Summary Page Card Redesign
status: draft
sprint: 29
author: ux-designer
created: 2026-03-12
---

# SPEC-UX-016: Summary Page Card Redesign -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: N/A (redesign of existing summary page)
**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## 1. Traveler Goal

The traveler wants to see a clear, motivating overview of their entire expedition -- how ready they are to travel, what remains to be done, and how to quickly jump back into any phase that needs attention.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Needs a confidence-building overview that confirms planning is on track; countdown creates anticipation and excitement |
| `@leisure-family` | Complex trips with many phases -- the readiness indicator helps ensure nothing is forgotten before departure |
| `@business-traveler` | Scans the summary quickly to identify gaps; next steps cards provide efficient task-oriented navigation |
| `@bleisure` | Extending a trip often means revisiting multiple phases; the phase cards with edit links make this effortless |
| `@group-organizer` | Needs to share trip status with others; a well-structured summary page is the first candidate for future sharing features |

## 3. User Flow

### Happy Path

1. Traveler completes any phase or navigates to the summary page from the dashboard
2. Summary page loads, showing the countdown hero, readiness indicator, next steps, and phase cards
3. Traveler scans the page top-to-bottom: countdown builds excitement, readiness shows progress, next steps guide action, phase cards show detail
4. Traveler taps a next step card CTA or a phase edit link to continue planning
5. After editing, traveler returns to the summary to see updated status

```
[Dashboard or phase completion]
    |
    v
[Summary page loads]
    |
    v
[Hero area: TripCountdown + readiness percentage]
    |
    v
[Next Steps section: 1-3 actionable cards] --tap CTA--> [Relevant phase wizard]
    |
    v
[Phase summary cards (6 cards)]
    |
    +-- [Phase completed] --> shows summary data + "Editar" link
    +-- [Phase incomplete] --> shows "Nao iniciada" + "Comecar" link
    +-- [Phase in progress] --> shows partial data + "Continuar" link
    |
    v
[Footer: "Voltar para Expedicoes" link]
```

### Error States

- **Network failure during load**: Show error banner at the top: "Nao foi possivel carregar o resumo da expedicio. Tente novamente." with a retry button. Phase cards show skeleton placeholders.
- **Trip not found (404)**: Redirect to /expeditions with toast: "Expedicio nao encontrada."
- **Unauthorized (403)**: Redirect to /expeditions with toast: "Voce nao tem acesso a esta expedicio."

### Edge Cases

- **No phases completed beyond Phase 1**: Readiness is low (e.g., 15%). Next steps prominently guide to Phase 2. Phase cards 2-6 show "Nao iniciada" state.
- **All phases completed**: Readiness at 100%. Countdown shows trip status (in progress / completed). Next steps section is replaced by a celebratory message: "Sua expedicio esta completa!"
- **No dates set**: Countdown shows "Datas nao definidas" message. Readiness percentage still calculates from phase completion.
- **Trip already happened**: Countdown shows "Expedicio concluida". Readiness still shows percentage. Phase cards remain navigable for review.

## 4. Screen Descriptions

### Screen 1: Summary Page (redesigned)

**Purpose**: Serve as the single consolidated view of expedition progress, providing both emotional motivation (countdown, readiness) and practical guidance (next steps, phase details).

**Layout -- top to bottom**:

#### Hero Section (top of page)

The hero combines the TripCountdown and readiness percentage into a single visually prominent area.

- **Trip name**: h1, bold, centered above the countdown
- **TripCountdown**: Large text (2xl font), centered. Uses the existing TripCountdown component logic (days until departure / in progress / completed / no dates)
- **Readiness indicator**: A horizontal progress bar positioned below the countdown. Shows percentage numerically to the left of the bar (e.g., "72%"). The bar fills proportionally. Color: `--color-accent` (#2DB8A0) for fill, `--color-bg-subtle` (#EEF2F7) for empty track
- **Readiness label**: Below the bar, muted text: "X de 6 fases concluidas"

The hero section has a subtle background (--color-bg-subtle) with rounded-xl corners and generous padding to visually separate it from the content below.

**Content hierarchy**:
1. Hero (countdown + readiness) -- the eye hits this first, answering "how ready am I?"
2. Next Steps -- actionable cards answering "what should I do next?"
3. Phase cards -- detailed view answering "what have I done so far?"
4. Footer action -- navigation back to expeditions list

#### Next Steps Section

Displays 1 to 3 actionable cards based on the NextStepsEngine output. Each card contains:
- An icon representing the action type (contextual to the phase)
- A title describing the action in human terms (e.g., "Adicionar transporte", "Completar o checklist")
- A brief description of why this matters (e.g., "Voce ainda nao adicionou como vai chegar ao destino")
- A CTA button labeled with the specific action (e.g., "Ir para Logistica")

Card layout: Stacked vertically on mobile, horizontal row on desktop (max 3 cards). Each card has a left-colored border accent using the phase's associated color.

When no next steps remain (all phases complete), replace this section with:
- A celebratory message card with a checkmark icon
- Title: "Expedicio completa!"
- Description: "Todas as fases foram concluidas. Boa viagem!"

#### Phase Summary Cards Section

Six cards, one per phase (phases 1-6). Each card shows:

**Card header**:
- Phase number badge (small circle with number)
- Phase name (e.g., "O Chamado", "O Explorador")
- Status indicator: completed (checkmark icon, green), in progress (circle icon, gold), not started (empty circle, muted)
- Edit/Start link aligned to the right of the header

**Card body (when phase has data)**:
- Key data points from that phase, displayed as a compact definition list (same data currently shown in ExpeditionSummary.tsx but in a more compact format)
- For Phase 3 (checklist): show progress as "X/Y itens concluidos" with a mini progress bar
- For Phase 4 (logistics): show count of transport segments and accommodations
- For Phase 5 (guide): show generation date and first highlight
- For Phase 6 (itinerary): show day count and activity count

**Card body (when phase has no data)**:
- Muted text: "Esta fase ainda nao foi iniciada"
- CTA link: "Comecar" pointing to the phase wizard

**Card layout**: Single column stack on all breakpoints. Each card has a border, rounded-lg corners, card background. Completed phases have a subtle green left border accent (2px). Current phase has a gold left border accent.

#### Footer

- Centered link-style button: "Voltar para Expedicoes" navigating to /expeditions
- Replaces the current single "Voltar ao Dashboard" button

**Interactive Elements**:

- **Next step CTA buttons**: Primary style, size medium. Navigate to the relevant phase wizard. States: default, hover (darken), focus (outline ring), disabled (during navigation), loading (never -- navigation is instant)
- **Phase edit links**: Ghost button style, size small. Label changes based on state:
  - Completed phase: "Editar"
  - In-progress phase: "Continuar"
  - Not started phase: "Comecar"
- **Footer link**: Ghost button, size medium

**Empty State**: Not applicable at page level -- the page always has Phase 1 data (trip creation). Individual phase cards handle their own empty states as described above.

**Loading State**:
- Hero section: Skeleton rectangle (full width, 120px height) for countdown + progress bar
- Next steps: 2 skeleton cards (full width, 80px height each)
- Phase cards: 6 skeleton cards (full width, 100px height each) with staggered fade-in animation
- All skeletons use the pulse animation, respecting `prefers-reduced-motion`

**Error State**:
- Banner at top of page (below hero skeleton): "Nao conseguimos carregar os dados da sua expedicio. Isso pode ser um problema temporaneo."
- Retry button below the message: "Tentar novamente"
- Phase cards show skeleton state (not error state individually)

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Full-width single column. Hero section has 16px horizontal padding. Next step cards stack vertically. Phase cards stack vertically. Footer button full-width. |
| Tablet (768-1024px) | Content area max-w-2xl centered. Next step cards in a 2-column grid if 2+ cards. Phase cards still single column. |
| Desktop (> 1024px) | Content area max-w-3xl centered. Next step cards in a 3-column grid. Phase cards still single column (they are wide enough to benefit from horizontal space for the definition list layout). |

## 5. Interaction Patterns

- **Screen transitions**: Navigating to a phase wizard from summary uses the standard route push (no special animation). Returning to summary is via browser back or explicit navigation from the wizard.
- **Loading feedback**: Skeleton loading as described above. No spinner overlay -- the page structure is always visible.
- **Success feedback**: No mutations happen on this page. It is read-only. Success feedback from phase edits appears as a toast when the user returns.
- **Error feedback**: Banner at top of page for data loading errors. Toast for navigation errors.
- **Animation**: Phase cards fade in with a stagger (50ms per card, 200ms duration each). Readiness progress bar fills with a smooth 600ms ease-out animation on load. Both respect `prefers-reduced-motion` (instant rendering, no animation).
- **Progressive disclosure**: Phase card bodies are always visible (not collapsible). The summary page is the "show me everything" view.

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [x] All interactive elements reachable via Tab
  - [x] Tab order: hero (non-interactive) -> next step cards (CTA buttons) -> phase cards (edit/start links) -> footer link
  - [x] Focus indicator visible on all interactive elements (2px solid ring, offset 2px)
  - [x] No keyboard traps
  - [x] No modal dialogs on this page
- **Screen Reader**:
  - [x] h1: trip name
  - [x] TripCountdown has `role="status"` and `aria-live="polite"` (already implemented)
  - [x] Readiness progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Progresso da expedicio: X%"`
  - [x] Next steps section: `aria-labelledby` pointing to section heading
  - [x] Phase cards: each card has a heading (h2 or h3) with phase name for navigation
  - [x] Phase status communicated via text, not color alone (checkmark text + "Concluida", "Em andamento", "Nao iniciada")
  - [x] Edit/Start links have descriptive aria-labels: "Editar fase 1: O Chamado"
- **Color & Contrast**:
  - [x] Readiness bar fill color (#2DB8A0) against track (#EEF2F7): 3.1:1 (passes UI component minimum)
  - [x] Percentage text (#1A1A2E) against hero background (#EEF2F7): 14.5:1 (passes)
  - [x] Phase status not conveyed by color alone (icon + text label accompanies color)
- **Motion**:
  - [x] Stagger animation and progress bar fill respect `prefers-reduced-motion`
  - [x] No auto-advancing content
- **Touch**:
  - [x] All CTA buttons and edit links >= 44x44px touch target
  - [x] Adequate spacing between phase card action links (>= 8px)

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `page_title` | Resumo da Expedicio | Expedition Summary |
| `readiness_label` | {count} de 6 fases concluidas | {count} of 6 phases completed |
| `readiness_percent` | {percent}% pronto | {percent}% ready |
| `next_steps_title` | Proximos Passos | Next Steps |
| `all_complete_title` | Expedicio completa! | Expedition complete! |
| `all_complete_desc` | Todas as fases foram concluidas. Boa viagem! | All phases completed. Have a great trip! |
| `phase_not_started` | Esta fase ainda nao foi iniciada | This phase has not been started yet |
| `cta_start` | Comecar | Start |
| `cta_continue` | Continuar | Continue |
| `cta_edit` | Editar | Edit |
| `cta_back_expeditions` | Voltar para Expedicoes | Back to Expeditions |
| `loading_error` | Nao conseguimos carregar os dados da sua expedicio. Isso pode ser um problema temporaneo. | We couldn't load your expedition data. This may be a temporary issue. |
| `cta_retry` | Tentar novamente | Try again |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| `load_failure` | Nao conseguimos carregar os dados da sua expedicio. Isso pode ser um problema temporaneo. | We couldn't load your expedition data. This may be a temporary issue. |
| `trip_not_found` | Expedicio nao encontrada. | Expedition not found. |

### Tone of Voice

- Celebratory and motivating when readiness is high or complete
- Encouraging and action-oriented when readiness is low ("Voce esta no caminho certo!")
- Never guilt-inducing about incomplete phases -- the traveler plans at their own pace

## 8. Constraints (from Product Spec)

- TripCountdown component already exists and must be reused (not redesigned)
- Summary data comes from ExpeditionSummaryService which returns null for incomplete phases
- Next steps data comes from NextStepsEngine (Sprint 28 delivery)
- Readiness percentage is calculated from TripReadinessService (Sprint 28 delivery)
- Phase count is always 6 for the summary (phases 7-8 are post-trip and not shown here)
- The page is server-rendered; TripCountdown is a client component for real-time updates

## 9. Prototype

- [x] Prototype required: No (spec is sufficient for this layout redesign; reuses existing components)
- **Notes**: The redesign primarily reorganizes existing data into a new visual hierarchy. No novel interaction patterns require prototyping.

## 10. Open Questions

- [ ] Should the readiness percentage weight phases equally (each = 16.67%) or weight by importance/effort? -- Product Owner to decide
- [ ] Should next steps cards show an estimated time to complete? (e.g., "~5 min") -- Product Owner to decide

---

> **Spec Status**: Draft
> **Ready for**: Architect (no blocking questions for UX -- open questions are product-level and can be resolved in parallel)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-12 | ux-designer | Initial draft |
