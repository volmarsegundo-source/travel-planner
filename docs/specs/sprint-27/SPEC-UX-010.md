# SPEC-UX-010: Guide Card Uniformity — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: REC-012, REC-014
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

The traveler wants to read their AI-generated destination guide in a visually cohesive layout where all sections feel like part of the same design system — stat cards, content cards, and the hero summary all share a unified visual language.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | A polished guide builds confidence in the AI-generated content and the platform |
| `@leisure-family` | Uniform cards make it easy to scan for safety, health, and cultural info relevant to families |
| `@business-traveler` | Consistent card heights enable rapid visual scanning without layout jumps |
| `@bleisure` | A cohesive guide feels premium, matching the quality expected of a leisure+business tool |

## 3. Current Problems

### Problem 1: Stat cards and content cards are visually disconnected
- Stat cards (timezone, currency, language, electricity): Small, centered text, 2-column grid, no accent border
- Content cards (connectivity, cultural tips, safety, health, transport, customs): Taller, left-aligned, left accent border in section-specific colors
- They look like two different design systems on the same page

### Problem 2: Cards are not uniform height
- Stat cards vary in height based on the number of tips (0-3 tips per card)
- Content cards vary in height based on summary length, details presence, and tips count
- The result is a ragged, unpolished layout

### Problem 3: Hero banner is not a proper summary
- Current hero banner shows a 2x2 grid of stat section titles with icons
- It does NOT contain a summary paragraph — just icon + title labels
- The traveler expects a narrative summary of the destination at the top

## 4. User Flow

No flow changes. This is a visual redesign of the guide content area within the existing Phase 5 (DestinationGuideWizard). The traveler's journey through the page is unchanged.

```
[Guide loads (auto-generated or regenerated)]
    |
    v
[Hero summary banner — narrative paragraph]
    |
    v
[4 stat cards — uniform 2x2 grid]
    |
    v
[6 content cards — uniform single-column stack]
    |
    v
[AI disclaimer]
    |
    v
[Regenerate (secondary) + Advance (primary)]
```

## 5. Screen Descriptions

### Component: Hero Summary Banner (redesigned)

**Purpose**: Provide an at-a-glance narrative summary of the destination, giving the traveler immediate context before diving into details.

**Current behavior**: Shows 2x2 grid of icon + title for 4 stat sections. No summary text.

**New behavior**:
- Full-width card at the top of the guide content
- Background: Subtle teal tint (`bg-accent/5`), border (`border-accent/30`), rounded-lg
- Content:
  1. **Destination name** as heading (h2, bold, 18px)
  2. **AI-generated summary paragraph** (14px, `text-foreground`, 2-4 sentences max)
  3. **Quick stats row**: 4 inline items (icon + value), separated by vertical dividers
     - Timezone: icon + "UTC+9"
     - Currency: icon + "JPY (Yen)"
     - Language: icon + "Japones"
     - Electricity: icon + "100V, Tipo A/B"

This requires the AI prompt to generate a `summary` field at the guide level (not per-section). If the `summary` field is not available in the current AI response schema, the hero falls back to the existing layout until the schema is updated.

**Data requirement**: A new top-level `summary` string field in `DestinationGuideContent`. The architect and prompt-engineer should coordinate to add this to the AI prompt output schema.

### Component: Stat Cards (redesigned for uniformity)

**Purpose**: Display the 4 quick-reference data points (timezone, currency, language, electricity) in a visually uniform grid.

**Current behavior**: Variable-height cards with centered text, tips inline, no accent border.

**New behavior**:
- 2x2 grid (2 columns on all breakpoints)
- Each card has FIXED height (uniform across all 4): 120px on desktop, auto on mobile (with min-height 100px)
- Card structure (top to bottom):
  1. **Colored top border**: 3px solid, color per category:
     - Timezone: blue-500
     - Currency: green-500
     - Language: amber-500
     - Electricity: indigo-500
  2. **Icon**: 24px, centered or left-aligned
  3. **Title**: Bold, 13px, `text-foreground`
  4. **Value/Summary**: 12px, `text-muted-foreground`, line-clamp-2 (max 2 lines)
  5. **Tips**: HIDDEN on the card. Tips moved to a tooltip/popover on hover/focus.
- Border: `border-border`, `rounded-lg`
- Background: `bg-card`

**Why hide tips on stat cards?** The variable number of tips (0-3) is the primary cause of height variance. By moving tips to a hover/focus tooltip, all stat cards achieve uniform height. Tips are still accessible but do not break the grid alignment.

**Tip tooltip**:
- Trigger: hover or focus on the card (the entire card is the trigger area)
- Content: Bulleted list of tips
- Placement: Below the card
- `bg-popover`, `border-border`, `shadow-md`, `rounded-lg`, 8px padding
- Screen reader: Tips are in an `aria-describedby` region linked to the card

### Component: Content Cards (redesigned for uniformity)

**Purpose**: Display the 6 detailed guide sections in a uniform, scannable layout.

**Current behavior**: Variable-height cards with left accent border, icon + title + summary + details + tips.

**New behavior**:
- Single-column stack, full-width
- Each card has a CONSISTENT structure:
  1. **Left accent border**: 4px solid, color per section (existing colors — kept)
  2. **Header row**: Icon (20px) + Title (14px, bold, `text-foreground`) — horizontal, left-aligned
  3. **Summary**: 14px, `text-foreground`, line-clamp-3 on mobile / no clamp on desktop
  4. **Details** (if present): 13px, `text-muted-foreground`, separated by 8px margin
  5. **Tips**: Always visible as a bulleted list below details, 12px, `text-muted-foreground`
     - Bullet: Small colored dot matching the section accent color (not a dash character)
     - If no tips: section omitted (no empty space)
- Border: `border-border`, `rounded-lg`
- Background: `bg-card`
- Padding: 16px
- **Uniform minimum height**: 140px. Cards shorter than this are padded. Cards longer than this expand naturally. This creates a visual baseline alignment without cutting off content.

**Difference from stat cards**: Content cards DO show tips inline because their single-column layout can accommodate variable content without breaking a grid. The minimum height ensures a baseline uniformity even when one section has more content than another.

### Visual Cohesion Rules

To make stat cards and content cards feel like the same design system:

1. **Same border radius**: All cards use `rounded-lg` (8px)
2. **Same border**: `border-border` (1px)
3. **Same background**: `bg-card`
4. **Same padding**: 16px (stat cards currently use 12px — increase to 16px)
5. **Accent color placement**: Stat cards have colored TOP border, content cards have colored LEFT border. Both use a 3-4px colored accent in a different position, creating variety within unity.
6. **Typography scale**: Title is always bold 13-14px; body is always 12-14px; muted info is always 12px

### Dark Theme

- Card bg: `bg-card` (adapts to theme — slate-800 in dark)
- Card border: `border-border` (adapts — slate-700 in dark)
- Accent borders (top and left): Same colors in both themes (blue-500, green-500, etc. are bright enough on dark)
- Text: `text-foreground` and `text-muted-foreground` (adapt to theme)
- Tooltip/popover for stat tips: `bg-popover`, `border-border`
- Hero banner: `bg-accent/5` becomes slightly teal-tinted dark background (works well on slate-800)

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Stat cards: 2x2 grid, auto height (min 100px). Content cards: full-width stack, line-clamp-3 on summaries. Hero: stacked (heading, summary, stats wrap to 2 rows). |
| Tablet (768-1024px) | Same as mobile. Stats may get fixed 120px height. |
| Desktop (> 1024px) | Stat cards: 2x2 grid, fixed 120px height. Content cards: full-width, no line-clamp. Hero: single row for quick stats. |

## 6. Interaction Patterns

- **Stat card tip tooltip**: Appears on hover (300ms delay to avoid flicker) or on focus. Disappears on mouse leave or blur. No animation (instant).
- **Content card**: No interaction — read-only content.
- **Hero summary**: No interaction — read-only narrative.
- **All cards**: No click behavior. Cards are not links or buttons.

### Motion

| Animation | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Stat card tooltip appear | instant (300ms hover delay, then instant show) | — | same |

No other animations. This is a static content layout.

## 7. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA
- **Keyboard Navigation**:
  - [x] Stat cards are focusable (tabindex="0") to allow keyboard users to trigger tip tooltips
  - [x] Content cards are NOT focusable (no interaction needed)
  - [x] Tab order: hero banner (read) -> stat cards (left to right, top to bottom) -> content cards (skip, no interaction) -> action buttons
- **Screen Reader**:
  - [x] Hero summary: h2 for destination name, paragraph for summary
  - [x] Quick stats in hero: each stat is a `<span>` with `aria-label` (e.g., "Fuso horario: UTC+9")
  - [x] Stat cards: each has `aria-label` with title + summary + tips (so all content is accessible even if tips are visually hidden)
  - [x] Stat card tooltip tips: linked via `aria-describedby` from the card
  - [x] Content cards: semantic heading (h3) for title, paragraph for summary/details, list for tips
  - [x] Section icons: `aria-hidden="true"` (decorative)
  - [x] Tip bullet dots: `aria-hidden="true"` (decorative)
- **Color & Contrast**:
  - [x] All text on card backgrounds >= 4.5:1 (verified in existing theme)
  - [x] Accent border colors are NOT the only differentiator between sections — each section has a unique title
  - [x] Tooltip text on popover background >= 4.5:1
- **Touch**:
  - [x] Stat cards with tooltip: entire card is touch target (well above 44x44px)
  - [x] No small touch targets in this spec (all content is read-only)

## 8. Content & Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `expedition.phase5.heroTitle` | Sobre {destination} | About {destination} |
| `expedition.phase5.heroSummaryFallback` | Resumo do destino sera exibido aqui | Destination summary will appear here |
| `expedition.phase5.tipsLabel` | Dicas | Tips |
| `expedition.phase5.noTips` | Sem dicas adicionais | No additional tips |

### Tone of Voice

- The hero summary should feel like a knowledgeable friend describing the destination — warm, helpful, specific.
- Section content is informational and practical. No marketing language.

## 9. Constraints

- The `DestinationGuideContent` type currently does NOT have a top-level `summary` field. The AI generates per-section summaries but no overall destination summary.
- Adding a `summary` field requires:
  1. Updating the AI prompt (prompt-engineer)
  2. Updating the `DestinationGuideContent` type
  3. Handling backward compatibility (guides generated before this change will not have the field)
- **Fallback**: If `summary` is missing, the hero banner shows the existing 2x2 stat icon layout (current behavior). This ensures no regression for existing guides.
- The `line-clamp-2` on stat card summaries may truncate useful information. The tooltip ensures full content is always accessible.

## 10. Prototype

- [ ] Prototype required: Yes (visual redesign — developers need a reference)
- **Location**: `docs/prototypes/guide-card-uniformity.html`
- **Scope**: Hero banner (with and without summary), stat cards (uniform grid with tooltip), content cards (uniform stack), dark theme
- **Status**: Deferred — spec is sufficient for architect to plan data changes

## 11. Open Questions

- [ ] Does the AI prompt need to generate a top-level `summary` field, or can we derive it from existing section summaries? **Recommendation**: Generate a dedicated summary. Concatenating section summaries would be redundant and poorly structured. The prompt-engineer should add a `destinationSummary` instruction to the guide prompt.
- [ ] Should stat card tips be a tooltip (hover/focus) or a collapsible section within the card? **Recommendation**: Tooltip. It keeps the card height uniform and tips are supplementary information. The tooltip is keyboard-accessible via focus.
- [ ] Fixed height (120px) on stat cards may cause content overflow if the AI generates long summaries. Should we use `line-clamp` + tooltip as the safety valve? **Recommendation**: Yes. `line-clamp-2` on the summary text within the card, full content in `aria-label` and in the tooltip.

## 12. Patterns Used

- **DestinationStatCard** (from ux-patterns, Sprint 26 — being redesigned)
- **DestinationContentCard** (from ux-patterns, Sprint 26 — being refined)
- **New pattern: GuideHeroBanner** — narrative summary + quick stats row
- **New pattern: CardTipTooltip** — hover/focus tooltip for supplementary tips on compact cards

---

> **Spec Status**: Draft
> Ready for: Architect (blocked on AI schema update for `summary` field — coordinate with prompt-engineer)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft |
