# UX Specification: Custos Medios Diarios Card Redesign

**UX Spec ID**: SPEC-UX-037
**Related Story**: Phase 5 Destination Guide — Costs Card
**Author**: ux-designer
**Status**: Draft
**Last Updated**: 2026-03-30

---

## 1. Traveler Goal

Quickly compare daily costs across three budget tiers (Economico, Moderado, Premium) to understand how much a day in the destination will cost and make informed budget decisions.

## 2. Current State Analysis

### Layout Problem

The bento grid uses a 10-column system (`grid-cols-10`). The current card layout is:

| Row | Cards | Span |
|-----|-------|------|
| Row 1 | B1 (Sobre o Destino) + B2 (Info Rapidas) | 6 + 4 = 10 |
| Row 2 | B3 (Seguranca) + B4 (Custos) | 5 + 6 = **11** (overflow) |
| Row 3 | B5 (O Que Nao Perder) | 10 |

Because B3 (5 cols) + B4 (6 cols) = 11, B4 wraps to a third row where it sits alone at 60% width. This creates:

1. **Dead space**: 4 empty columns to the right of the costs card on desktop — wasted real estate and visually unbalanced.
2. **Table compression on mobile**: A 4-column table (category + 3 tiers) crammed into `col-span-6` (roughly 672px at max-w-7xl) is already tight. On mobile (stacked to `col-span-1`), the three tier columns compress to the point where currency values wrap or become unreadable.
3. **Inconsistent visual weight**: The costs card is the most data-dense card in the guide, yet it has less horizontal space than "O Que Nao Perder" which is a simple carousel.
4. **Horizontal scroll trap**: The `overflow-x-auto` wrapper exists but produces a hidden scroll context that many users never discover on mobile — the table simply appears cut off.

### Data Structure (from `ai.types.ts`)

```
DailyCosts {
  items: CostItem[]       // 5-8 rows: { category, budget, mid, premium }
  dailyTotal: { budget, mid, premium }
  tip?: string
}
```

Each value is a pre-formatted string (e.g., "R$ 80-120", "EUR 50-80"). The AI controls the number of categories (typically: Alimentacao, Hospedagem, Transporte, Lazer, Compras; sometimes also Ingressos, Comunicacao, Gorjetas).

## 3. Personas Affected

- `@leisure-solo` — needs budget clarity to plan a solo trip; comparison across tiers is the primary decision tool.
- `@leisure-family` — costs multiply by headcount; the "Total/dia" row is critical for family budget math.
- `@business-traveler` — needs to quickly identify the "Moderado" or "Premium" tier for expense reporting.
- `@bleisure` — compares tiers to decide when to splurge (leisure days) vs. stay moderate (work days).
- `@group-organizer` — uses cost data to set shared budget expectations with group members.
- `@travel-agent` — scans all three tiers to recommend appropriate packages to clients.

## 4. Proposed Layout

### Grid Change

Move B4 (Custos) from `md:col-span-6` to `md:col-span-10` (full width), and reposition it **after** B5 (Must See) so the two full-width cards do not stack visually. The new layout:

| Row | Cards | Span |
|-----|-------|------|
| Row 1 | B1 (Sobre o Destino) + B2 (Info Rapidas) | 6 + 4 = 10 |
| Row 2 | B3 (Seguranca) | 5 (sits alone, but it's already doing this today since B3+B4 overflowed) |
| Row 3 | B5 (O Que Nao Perder) | 10 |
| Row 4 | B4 (Custos Medios Diarios) | **10** |

**Alternative considered**: Make B3 span 4 and B4 span 6 to fit on one row (4+6=10). Rejected because the safety card content needs the 5-col width for emergency numbers, and squeezing it to 4 cols would create the same readability problem we are solving for costs.

**Preferred alternative**: Make B3 span 10 as well, giving both cards full width. However, the safety card content is sparse enough that full width would feel empty. Keep B3 at 5 cols. The whitespace beside B3 is acceptable because the card content is short and left-aligned, creating a natural breathing room before the data-heavy cards below.

### Final Decision

B4 becomes `md:col-span-10`. Its DOM position moves after B5 in the bento grid, so the visual order is:

1. About + Quick Facts (dense info row)
2. Safety (lighter row, breathing room)
3. Must See (full-width carousel)
4. **Costs (full-width table)** — the traveler reaches this after absorbing context about the destination

This ordering follows progressive disclosure: general context first, then actionable financial data.

## 5. Screen Specifications

### Desktop Layout (md and above, col-span-10)

**Purpose**: Let the traveler compare costs across all three tiers at a glance without scrolling or squinting.

**Content hierarchy**:
1. Card title: "Custos Medios Diarios" — `text-lg font-bold font-atlas-headline text-atlas-on-surface`
2. Tier header row: three tier labels with subtle visual differentiation
3. Data rows: category name + three price cells
4. Total row: visually separated, using `atlas-secondary` for emphasis
5. Money-saving tip: contextual, below the table

**Table specification (desktop)**:

```
+------------------------------------------------------------------+
| Custos Medios Diarios                                             |
+------------------------------------------------------------------+
|                  | Economico      | Moderado       | Premium      |
|------------------+----------------+----------------+--------------|
| Alimentacao      | R$ 40-60       | R$ 80-120      | R$ 200+      |
| Hospedagem       | R$ 80-150      | R$ 200-350     | R$ 500+      |
| Transporte       | R$ 15-25       | R$ 40-70       | R$ 100+      |
| Lazer            | R$ 20-40       | R$ 50-100      | R$ 150+      |
| Compras          | R$ 10-30       | R$ 40-80       | R$ 120+      |
|------------------+----------------+----------------+--------------|
| Total/dia        | R$ 165-305     | R$ 410-720     | R$ 1.070+    |
+------------------------------------------------------------------+
| 💡 Dica de economia: [tip text]                                   |
+------------------------------------------------------------------+
```

- The table uses the full available width within the card padding.
- Category column: left-aligned, `text-atlas-on-surface-variant`, `font-medium`.
- Tier value columns: center-aligned, `font-bold text-atlas-on-surface`.
- Column widths: category column takes natural width; three tier columns share remaining space equally. On desktop with full width this gives ample room (roughly 200px+ per tier column).
- Row height: `py-3` (12px vertical padding) instead of the current `py-2.5` — gives more breathing room with the wider card.
- Row dividers: `border-b border-atlas-surface-container` between rows (same as current).

**Tier column headers**:

Each tier header gets a subtle colored dot indicator to aid scanning:

| Tier | Dot color | Semantic meaning |
|------|-----------|------------------|
| Economico | `bg-atlas-on-tertiary-container` (green-ish) | Budget-friendly |
| Moderado | `bg-atlas-secondary` (navy) | Mid-range |
| Premium | `bg-atlas-primary` (orange) | High-end |

The dot is `6px` round, inline before the tier label, `aria-hidden="true"`. This adds a color channel for quick scanning without relying on color alone (the text labels are always present).

**Total row**:

- Background: `bg-atlas-surface-container-low` with `rounded-lg` on the row.
- Text: `font-bold text-atlas-secondary` for the values (emphasizes the summary).
- Left cell: "Total/dia" label in `font-bold text-atlas-on-surface`.
- Visually separated from data rows by `mt-1` spacing (gap between last `<tbody>` row and `<tfoot>`).

**Tip section**:

- Below the table, `mt-4`.
- Container: `p-3 bg-atlas-surface-container-low rounded-lg flex items-start gap-3`.
- Icon: lightbulb emoji, `flex-shrink-0`, `aria-hidden="true"`.
- Text: `text-sm` (up from current `text-xs` — more readable at full width), `text-atlas-on-surface-variant`, `font-atlas-body`.

### Mobile Layout (below md breakpoint, col-span-1 / full width stacked)

On mobile, the 4-column table is the core problem. Three approaches were evaluated:

**Option A: Horizontal scroll (current approach)**
Rejected. Users frequently miss horizontally scrollable content. On a 375px screen, the table still compresses badly even with scroll.

**Option B: Stacked tier cards**
Each tier becomes its own card with all categories listed vertically. The traveler swipes between Economico / Moderado / Premium.
Rejected. Breaks the comparison model — the traveler cannot see two tiers side by side.

**Option C: Responsive table with fixed category column (SELECTED)**
The category column is fixed/sticky on the left. The three tier columns scroll horizontally within a visible scroll container with explicit scroll affordance.

Implementation:

- The table wrapper gets `overflow-x-auto` with a visible horizontal scrollbar (not hidden).
- The category `<th>` and category `<td>` cells get `sticky left-0 bg-atlas-surface-container-lowest z-10` so they stay visible during scroll.
- A subtle shadow (`box-shadow: 4px 0 8px -2px rgba(0,0,0,0.08)`) on the sticky column edge signals that content extends to the right.
- Tier columns get `min-width: 110px` to prevent value wrapping.
- Above the table, a subtle scroll hint appears: a small right-arrow icon with "Deslize para ver todos os valores" text, `text-[11px] text-atlas-on-surface-variant`, visible only on screens where the table overflows (via CSS `@container` or JS-based detection).

**Why Option C**: It preserves the comparison model (all tiers in one table), keeps the category names always visible, and provides explicit affordance that more content exists. The sticky column pattern is well-established in financial comparison tables.

**Mobile tip section**: Same as desktop, no layout change needed (already single-column friendly).

### Tablet Layout (768px-1024px)

The card is full-width (`col-span-10`). The table has enough room for all four columns without scroll. No special handling needed — the desktop layout works as-is.

## 6. Visual Tokens

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Card title | `font-atlas-headline` | `text-lg` (18px) | `font-bold` | `text-atlas-on-surface` |
| Tier header labels | `font-atlas-body` | `text-[11px]` | `font-bold` | `text-atlas-on-surface-variant` |
| Tier header tracking | `uppercase tracking-widest` | -- | -- | -- |
| Category names | `font-atlas-body` | `text-sm` (14px) | `font-medium` | `text-atlas-on-surface-variant` |
| Price values | `font-atlas-body` | `text-sm` (14px) | `font-bold` | `text-atlas-on-surface` |
| Total label | `font-atlas-body` | `text-sm` (14px) | `font-bold` | `text-atlas-on-surface` |
| Total values | `font-atlas-body` | `text-sm` (14px) | `font-bold` | `text-atlas-secondary` |
| Tip text | `font-atlas-body` | `text-sm` (14px) | `font-normal` | `text-atlas-on-surface-variant` |
| Scroll hint (mobile) | `font-atlas-body` | `text-[11px]` | `font-normal` | `text-atlas-on-surface-variant` |

### Spacing

| Element | Value |
|---------|-------|
| Card padding | `p-6` (24px) |
| Title bottom margin | `mb-4` (16px) |
| Table row vertical padding | `py-3` (12px) |
| Table cell horizontal padding | `px-4` (16px) — up from `px-3` for breathing room |
| Total row top separation | `mt-1` (4px gap via border-spacing or margin) |
| Tip container margin-top | `mt-4` (16px) |
| Tip container padding | `p-3` (12px) |
| Tip icon-text gap | `gap-3` (12px) |

### Colors

| Element | Token |
|---------|-------|
| Card background | `bg-atlas-surface-container-lowest` (via `BENTO_CARD_BASE`) |
| Card border | `border border-atlas-outline-variant/15` (via `BENTO_CARD_BASE`) |
| Card shadow | `shadow-[0px_24px_48px_rgba(4,13,27,0.06)]` (via `BENTO_CARD_BASE`) |
| Card border-radius | `rounded-xl` (via `BENTO_CARD_BASE`) |
| Row dividers | `border-atlas-surface-container` |
| Total row background | `bg-atlas-surface-container-low` |
| Total row border-radius | `rounded-lg` |
| Economico dot | `bg-atlas-on-tertiary-container` |
| Moderado dot | `bg-atlas-secondary` |
| Premium dot | `bg-atlas-primary` |
| Sticky column shadow (mobile) | `box-shadow: 4px 0 8px -2px rgba(0,0,0,0.08)` |

## 7. Accessibility Requirements

### Semantic Table Markup

The cost comparison MUST use a proper `<table>` element (not divs). This is non-negotiable for screen reader users.

- [ ] `<table>` with `<caption>` containing "Custos Medios Diarios" (can be `sr-only` since the visual card title serves the same purpose)
- [ ] `<thead>` with `<th scope="col">` for each tier column
- [ ] First cell in each `<tbody>` row: `<th scope="row">` for the category name
- [ ] `<tfoot>` for the total row, with `<th scope="row">` for "Total/dia"
- [ ] Tier header `<th>` elements must include the full text ("Economico", "Moderado", "Premium") — not abbreviated

### Keyboard and Focus

- [ ] The table itself does not need to be focusable (it is read-only data)
- [ ] If the scroll container is active on mobile, it MUST be keyboard-scrollable: `tabindex="0"` on the scroll container with `role="region"` and `aria-label="Tabela de custos medios diarios, deslize para ver todos os valores"`
- [ ] Focus indicator: `2px solid var(--color-primary)` with `outline-offset: 2px` on the scroll region when focused

### Color and Contrast

- [ ] All text meets 4.5:1 contrast ratio against its background (verified: `text-atlas-on-surface` on `bg-atlas-surface-container-lowest` passes)
- [ ] The tier dot indicators are decorative only (`aria-hidden="true"`) — tier names are always displayed as text
- [ ] `text-atlas-secondary` (#1A3C5E) on `bg-atlas-surface-container-low` — verify contrast >= 4.5:1 (navy on light gray: passes)
- [ ] No information conveyed by color alone: tier differentiation uses text labels, dots are supplementary

### Screen Reader Experience

A screen reader traversing the table should hear:
- "Custos Medios Diarios, table, 6 rows, 4 columns"
- "Alimentacao, Economico: R$ 40-60, Moderado: R$ 80-120, Premium: R$ 200+"
- "Total/dia, Economico: R$ 165-305, ..."

This requires proper `<th scope>` attributes as specified above.

### Reduced Motion

- [ ] No animations are used in this card — no `prefers-reduced-motion` handling needed
- [ ] The sticky column shadow is a static CSS property, not animated

## 8. Responsive Behavior

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Full width stacked card. Table uses sticky first column + horizontal scroll for tier columns. Scroll hint visible above table. Min-width 110px on tier columns. |
| Tablet (768-1024px) | `col-span-10` in bento grid. Table displays fully without scroll. Desktop layout applies. |
| Desktop (> 1024px) | `col-span-10` in bento grid. Table has generous spacing. All columns visible. |

## 9. States

### Empty State

If `guide.dailyCosts` is null or undefined, the card does not render (same as current behavior — `if (!costs) return null`). No empty state needed since the entire guide is AI-generated as a unit.

### Loading State

Handled by `BentoSkeleton` at the parent level. The costs card skeleton should update to match the new `col-span-10` width:
- Full-width skeleton card matching `BENTO_CARD_BASE`
- Skeleton rows: 1 title pulse (160px wide) + 5-6 row pulses at full width + 1 wider total row pulse
- This replaces the current `col-span-5` skeleton for B4

### Error State

No card-level error state. If the AI guide generation fails, the error is shown at the parent component level (already handled by the error banner in `DestinationGuideV2`).

## 10. Microcopy

| Element | Text | Notes |
|---------|------|-------|
| Card title | "Custos Medios Diarios" | Unchanged |
| Tier headers | "Economico" / "Moderado" / "Premium" | Unchanged, uppercase styled via CSS |
| Total row label | "Total/dia" | Unchanged |
| Tip prefix icon | Lightbulb emoji | `aria-hidden="true"` |
| Scroll hint (mobile) | "Deslize para ver todos os valores" | Only shown when table overflows; `aria-hidden="true"` since the scroll region has its own `aria-label` |
| Table caption (sr-only) | "Custos medios diarios por categoria e faixa de orcamento" | Screen reader context |

## 11. Acceptance Criteria

1. **AC-1**: The costs card renders at `md:col-span-10` (full bento width) on tablet and desktop viewports.
2. **AC-2**: The card is positioned after the "O Que Nao Perder" card in the bento grid DOM order.
3. **AC-3**: On mobile (< 768px), the category column (`<th scope="row">`) is sticky-left and remains visible while the user scrolls the tier columns horizontally.
4. **AC-4**: A scroll affordance hint ("Deslize para ver todos os valores") is visible on mobile when the table overflows its container.
5. **AC-5**: The table uses semantic HTML: `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, `<th scope="col">`, `<th scope="row">`.
6. **AC-6**: All text within the card meets WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
7. **AC-7**: The horizontal scroll region on mobile has `tabindex="0"`, `role="region"`, and a descriptive `aria-label`.
8. **AC-8**: The `BentoSkeleton` component is updated so the costs card skeleton matches the new `col-span-10` layout.
9. **AC-9**: The total row is visually distinct with `bg-atlas-surface-container-low` background and `text-atlas-secondary` values.
10. **AC-10**: The money-saving tip renders below the table at `text-sm` size (14px), not `text-xs`.
11. **AC-11**: Tier header labels include a colored dot indicator (`6px` round) that is `aria-hidden="true"`.
12. **AC-12**: No regressions in existing bento grid layout — B1, B2, B3, and B5 cards remain unchanged in span and position.

## 12. Patterns Used

From `docs/ux-patterns.md` and existing components:

- `BENTO_CARD_BASE` — shared card styling constant (background, border, shadow, radius)
- `font-atlas-headline` / `font-atlas-body` — typography tokens
- `text-atlas-on-surface` / `text-atlas-on-surface-variant` / `text-atlas-secondary` — color tokens
- `bg-atlas-surface-container-low` — elevated surface for total row and tip
- `SkeletonPulse` — loading state component (needs skeleton update for new width)

No new reusable patterns are introduced. The sticky-column table is specific to this card. If another card needs this pattern in the future, it can be extracted then.

## 13. Open UX Questions

- [ ] **B3 alone on row 2**: With B4 moved to after B5, B3 (Safety, 5 cols) sits alone on its row. Is this acceptable, or should B3 also expand to `col-span-10`? Recommendation: keep at 5 cols — the safety content is concise and full width would create an awkwardly sparse card. The whitespace is intentional breathing room.
- [ ] **Card ordering alternative**: Should costs come before "O Que Nao Perder" instead of after? Current recommendation is after (progressive disclosure: context before money), but the PO may prefer costs higher in the visual hierarchy.
- [ ] **Number of cost categories**: The AI currently generates 5-8 categories. Should we set a maximum (e.g., 8) in the prompt to prevent an overly long table? This is a prompt-engineer question.

---

> Draft — Ready for review by product-owner, architect, and tech-lead before implementation.
