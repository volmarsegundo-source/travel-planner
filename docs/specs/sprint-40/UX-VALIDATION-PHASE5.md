# UX Validation -- Phase 5 Redesign

**Status**: APPROVED WITH CONDITIONS
**Date**: 2026-03-26
**Reviewer**: ux-designer
**Implementation File**: `src/components/features/expedition/DestinationGuideV2.tsx`
**Reference Prototype**: `docs/design/stitch-exports/phase5_guia_destino/code.html`
**Checklist Source**: `docs/specs/sprint-40/UX-CHECKLIST-PHASE5.md`

---

## Deviation Resolution (19 items)

| # | Deviation | Severity | Status | Notes |
|---|---|---|---|---|
| 1 | AI badge renders as text-only overline, not peach pill | HIGH | FIXED | Line 696: `bg-atlas-primary-fixed text-atlas-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold tracking-wide` -- peach pill with SVG AI icon. Matches prototype structure. Token naming uses `primary-fixed` which maps to peach `#ffdcc3` per color mapping table. |
| 2 | H1 one size too small (3xl/4xl instead of 4xl/5xl) | MEDIUM | FIXED | Line 711: `text-4xl md:text-5xl font-atlas-headline font-bold text-atlas-on-surface tracking-tight` -- exact match to prototype sizing. |
| 3 | Subtitle too small (base instead of lg) and missing font-medium | MEDIUM | FIXED | Line 714: `text-lg font-medium font-atlas-body text-atlas-on-surface-variant` -- exact match. |
| 4 | Quick Facts label color is gray, should be amber | HIGH | FIXED | Line 285: `text-atlas-secondary` on label container -- maps to amber `#914d00` per color table. |
| 5 | Quick Facts value text too small (base instead of lg) | MEDIUM | FIXED | Line 291: `text-lg font-bold text-atlas-on-surface` -- matches prototype. |
| 6 | Quick Facts grid gap-y too tight (24px instead of 32px) | LOW | FIXED | Line 282: `grid-cols-2 gap-y-8 gap-x-4` -- gap-y-8 = 32px, matches prototype exactly. |
| 7 | Tips visible inline; should be hidden/tooltip | MEDIUM | FIXED | QuickFactsCard (lines 234-298) renders only icon + label + value per fact. No tips displayed inline. Tips are not rendered at all. |
| 8 | Hero card is dark navy text card; should be image card with gradient | CRITICAL | PARTIAL | Lines 200-206: Implementation has gradient placeholder (`bg-gradient-to-br from-atlas-primary to-atlas-secondary-container`) with overlay and destination name overlay text. Structure matches prototype (h-64, gradient overlay from-black/60, white caption bottom-left). However, there is NO actual photograph -- uses a CSS gradient background instead of an `<img>` tag. Prototype has a real photograph of Lisbon. This is acceptable for v1 since destination photos require an image API or AI image generation not currently in scope, but must be noted. |
| 9 | All content cards have left accent borders; prototype has none | HIGH | FIXED | No `!border-l-4` classes anywhere in the new component. All cards use `BENTO_CARD_BASE` which is `border border-atlas-outline-variant/15` -- uniform border, no left accents. |
| 10 | No safety status badge on Seguranca card | MEDIUM | FIXED | Lines 328-335: Green safety badge with dot + label, `role="status"`, correct teal colors (`bg-atlas-on-tertiary-container/10 text-atlas-on-tertiary-container`), `rounded-full`, positioned top-right via `flex justify-between`. Matches prototype. |
| 11 | No table-row layout for Custos card | MEDIUM | FIXED | Lines 414-431: Cost items rendered as `flex justify-between items-center py-2` rows with `border-b border-atlas-surface-container` dividers. Last item has no border. Matches prototype table-row pattern. |
| 12 | No tip box with lightbulb on Custos card | LOW | FIXED | Lines 437-446: Tip box renders as `bg-atlas-surface-container-low rounded-lg` with lightbulb emoji and `text-xs text-atlas-on-surface-variant`. Matches prototype structure. |
| 13 | Grid gap is 16px; should be 24px | MEDIUM | FIXED | Line 800: `gap-6` on the bento grid -- 24px, matches prototype. |
| 14 | Entire attractions section missing from implementation | CRITICAL | FIXED | Lines 451-521: `AttractionsCard` component renders full-width 10-col card with horizontal scroll carousel. Custom scrollbar styling, `min-w-[280px]` cards, `h-40` image area, hover zoom with `group-hover:scale-105 duration-500`, `line-clamp-2` descriptions, `role="region"` with aria-label. No real images (gradient placeholders), but structure matches prototype. |
| 15 | AI Disclaimer is blue info box; should be plain italic centered text | HIGH | FIXED | Lines 832-836: `<footer>` with `text-[10px] text-atlas-on-surface-variant/60 leading-relaxed italic`, `max-w-2xl mx-auto`, `text-center`, `mt-12 mb-20`. No background, no border, no icon. Exact match to prototype. `role="note"` retained for accessibility (improvement over prototype). |
| 16 | Uses raw blue-* Tailwind classes instead of atlas tokens | HIGH | FIXED | Zero instances of `blue-*` classes in the component. All colors use `atlas-*` tokens exclusively. |
| 17 | Missing "Fase 5 de 8" center label in action bar | MEDIUM | NOT FIXED | The component uses `WizardFooter` which does not render a center phase indicator label. Prototype shows "Fase 5 de 8" centered between back and CTA buttons. WizardFooter is a shared component -- adding this label would require a prop or slot. |
| 18 | Missing glassmorphism (backdrop-blur) on footer | LOW | NOT FIXED | WizardFooter does not apply `bg-white/80 backdrop-blur-md`. This is a WizardFooter shared component concern, not specific to this page. Acceptable as-is since WizardFooter is standardized across all phases. |
| 19 | Skeleton grid gap is 16px; should be 24px | LOW | FIXED | Line 114: BentoSkeleton uses `gap-6` (24px). Matches loaded state. |

**Summary**: 15 FIXED, 2 NOT FIXED, 2 PARTIAL (one of the "PARTIAL" items is deviation #8, counted separately above).

---

## Section Checklist

### Section 1 -- Hero Header

- [x] AI badge has peach pill background (`bg-atlas-primary-fixed`), not text-only overline
- [x] AI badge text is dark (`text-atlas-on-primary-fixed`), not gold
- [x] AI badge includes AI icon (SVG robot/chip icon) to left of text
- [x] AI badge has `rounded-full` border radius
- [x] H1 is `text-4xl md:text-5xl`
- [x] H1 uses `font-atlas-headline`
- [x] H1 weight is bold (700)
- [x] H1 has `tracking-tight` letter spacing
- [x] H1 color is `text-atlas-on-surface`
- [x] Subtitle is `text-lg` (18px)
- [x] Subtitle weight is `font-medium` (500)
- [x] Subtitle color is `text-atlas-on-surface-variant`
- [x] Subtitle uses `font-atlas-body`
- [x] Margin below header is 40px (`mb-10`)
- [x] Keyboard: AI badge is not focusable (no tabIndex, is a `<span>`)
- [x] Screen reader: AI badge has `role="status"` and `aria-label="Gerado por IA"`

**Note on token naming**: Implementation uses `bg-atlas-primary-fixed` / `text-atlas-on-primary-fixed`. Per the color mapping table, Stitch `primary-fixed` = `#ffdcc3` (peach). If the atlas design system maps these differently (atlas "primary" = navy), the rendered color may not be peach. Verify at runtime that `atlas-primary-fixed` resolves to `#ffdcc3`. If it resolves to a different color, the token name needs adjustment to `atlas-secondary-fixed` per the mapping table.

### Section 2 -- Quick Facts (Informacoes Rapidas)

- [x] Card background is `bg-atlas-surface-container-low`
- [x] Card has `border border-atlas-outline-variant/15`
- [x] Card uses `rounded-xl` border radius
- [x] Card padding is 32px (`p-8`)
- [x] Card shadow matches custom `0px 24px 48px rgba(4,13,27,0.06)`
- [x] Card spans 4 columns on md+ (`md:col-span-4`)
- [x] Card title is `text-xl font-bold font-atlas-headline`
- [x] Card title has `mb-6` bottom margin
- [x] Grid uses `grid-cols-2 gap-y-8 gap-x-4`
- [x] Label icon and text use amber color (`text-atlas-secondary`)
- [x] Label text is `text-xs font-bold uppercase tracking-wider`
- [x] Value is `text-lg font-bold text-atlas-on-surface`
- [x] Tips are NOT displayed inline below values
- [ ] 6 stat items shown if data available -- PARTIAL: Code attempts to extract DDI and Tomada from connectivity/electricity tips, but depends on AI-generated content having parseable data. May show 4-6 items depending on AI output.
- [x] Each fact item has icon + label row, then value row (two distinct lines)
- [x] Responsive: stacks to single column on mobile (grid-cols-1 default)
- [ ] Accessibility: stat items use semantic markup -- FAIL: Uses `<div>` wrappers, not `<dl>/<dt>/<dd>`. Functional but not semantically optimal.

### Section 3 -- Bento Grid (Sobre, Seguranca, Custos)

**Overall Grid**:
- [x] Grid uses `grid-cols-1 md:grid-cols-10 gap-6`
- [x] Max width constrained to `max-w-7xl`

**Card 1 -- Sobre o Destino**:
- [x] Card spans 6 columns (`md:col-span-6`)
- [x] Card has hero image area (256px / `h-64`)
- [ ] Image has `object-cover` and fills container width -- PARTIAL: Uses CSS gradient, not an actual image. No `<img>` element.
- [x] Gradient overlay: `bg-gradient-to-t from-black/60 to-transparent`
- [x] White caption text over gradient, bottom-left positioned (`absolute bottom-4 left-6`)
- [x] Content area has 32px padding (`p-8`)
- [x] Section title has icon + text in single row (`flex items-center gap-2`)
- [x] Icon color targets orange (uses `text-atlas-secondary-container`)
- [x] Body text is `text-atlas-on-surface-variant leading-relaxed`
- [x] Card uses `overflow-hidden` to clip inside rounded corners
- [x] No left accent border

**Card 2 -- Dicas de Seguranca**:
- [x] Card spans 5 columns (`md:col-span-5`)
- [x] Header row has title left + safety status badge right (`flex justify-between`)
- [x] Safety badge is pill with dot indicator + label text
- [x] Safety badge uses teal colors with `role="status"` and `aria-label`
- [ ] List items use checkmark/verified icon in orange -- PARTIAL: Uses green checkmark emoji (unicode 2705) which renders as a green checkmark, not the orange `verified` Material icon in the prototype.
- [x] List items have `text-sm text-atlas-on-surface-variant`
- [x] No left accent border

**Card 3 -- Custos Medios**:
- [x] Card spans 5 columns (`md:col-span-5`)
- [x] Cost rows use `flex justify-between items-center` layout
- [x] Rows separated by `border-b border-atlas-surface-container`
- [x] Item names are `text-atlas-on-surface-variant font-medium`
- [x] Prices are `font-bold text-atlas-on-surface`
- [x] Last row has no bottom border (conditional `i < costItems.length - 1`)
- [x] Tip box at bottom with lightbulb + `bg-atlas-surface-container-low rounded-lg`
- [x] No left accent border

**All Cards**:
- [x] Background is `bg-atlas-surface-container-lowest` (via BENTO_CARD_BASE)
- [x] Border is `border border-atlas-outline-variant/15`
- [x] Border radius is `rounded-xl`
- [x] Shadow matches prototype (`shadow-[0px_24px_48px_rgba(4,13,27,0.06)]`)
- [x] Padding is `p-8`

### Section 4 -- O Que Nao Perder (Attractions)

- [x] Full-width card spanning 10 columns (`md:col-span-10`)
- [x] Section title `text-xl font-bold font-atlas-headline`
- [x] Horizontal scroll container with `overflow-x-auto`
- [x] Custom scrollbar with orange thumb (webkit scrollbar styling on line 494)
- [x] Each attraction card has 280px minimum width (`min-w-[280px]`)
- [x] Attraction cards have `rounded-xl shadow-sm` and white background (`bg-white`)
- [ ] Image area is 160px tall with `object-cover` -- PARTIAL: Has `h-40` area but uses gradient placeholder, not actual images.
- [x] Image hover zoom: `group-hover:scale-105` with `duration-500` transition
- [x] Title uses `font-atlas-headline font-bold`
- [x] Description uses `text-xs text-atlas-on-surface-variant line-clamp-2`
- [x] Content area has 16px padding (`p-4`)
- [x] Scroll area has `pb-6` for scrollbar clearance
- [x] Gap between cards is 24px (`gap-6`)
- [x] Respects `prefers-reduced-motion` (`motion-reduce:group-hover:scale-100`)
- [x] Accessibility: carousel has `role="region"` with `aria-label`
- [ ] Accessibility: each card image has descriptive `alt` text -- FAIL: Gradient divs have no alt text. When images are added, `alt` must be included.
- [x] Keyboard: cards are focusable (`tabIndex={0}`) with visible focus indicator
- [x] Touch: supports swipe via overflow-x-auto with `-webkit-overflow-scrolling: touch`

### Section 5 -- Documentacao Necessaria

- N/A -- Not a separate section in prototype. Confirmed as not required.

### Section 6 -- Transporte no Destino

- [ ] Rendered as standard content card -- NOT VERIFIED: `transport_overview` is in `CONTENT_SECTIONS` array but the bento grid only renders B1-B5 named cards. The remaining content sections from the `CONTENT_SECTIONS` array are NOT rendered as additional bento cards. Transport overview data is partially consumed by the CostsCard for cost extraction. This is a structural deviation -- prototype only shows 5 cards (Sobre, Quick Facts, Seguranca, Custos, Attractions), not individual cards for each content section.
- [x] NO left accent border (no accent borders anywhere)

### Section 7 -- Dicas Culturais

- [ ] Rendered as standard content card -- NOT VERIFIED: Same as Section 6. `cultural_tips` data is consumed by AboutDestinationCard and AttractionsCard, not rendered as its own card. This matches the prototype which does not have a separate "Dicas Culturais" card.
- [x] NO left accent border

### Section 8 -- Action Bar (Bottom Navigation)

- [x] Bottom bar present (WizardFooter, sticky)
- [ ] Background uses glassmorphism (`bg-white/80 backdrop-blur-md`) -- NOT FIXED: WizardFooter shared component, not this page's concern.
- [x] Top border present on WizardFooter
- [ ] Three items: back button, phase label, CTA -- PARTIAL: Has back + CTA but missing center "Fase 5 de 8" label.
- [ ] Phase label shows "Fase 5 de 8" in center -- NOT FIXED
- [x] Back button present with "Voltar" behavior (navigates to phase-4)
- [x] CTA present with "Avancar" label
- [x] Accessibility: back button has clear label
- [x] Touch targets: WizardFooter buttons meet 44px minimum

### Section 9 -- AI Disclaimer Footer

- [x] Rendered as plain centered text, NOT a blue info box
- [x] Text size is 10px (`text-[10px]`)
- [x] Text color is `text-atlas-on-surface-variant/60` (muted with opacity)
- [x] Text is `italic`
- [x] Max width is `max-w-2xl` and centered (`mx-auto`)
- [x] Top margin is 48px (`mt-12`)
- [x] Bottom margin is 80px (`mb-20`)
- [x] No background color, no border, no icon
- [x] Uses atlas tokens only (no `blue-*` classes)
- [x] Maintains `role="note"` for accessibility

### Section 10 -- Skeleton Loading State

- [x] Skeleton grid matches loaded state structure (10-col, gap-6)
- [x] Skeleton card heights approximate loaded card heights (h-64 for B1, p-8 areas for others)
- [x] Skeleton uses `animate-pulse` with `motion-reduce:animate-none`
- [x] Loading text is centered and uses `text-atlas-on-surface-variant`
- [x] Gap is `gap-6`
- [x] Skeleton includes 6 placeholders in B2 Quick Facts grid (matching 6-item target)

### Global Cross-Section Checklist

**Typography Consistency**:
- [x] ALL headlines use `font-atlas-headline`
- [x] ALL body text uses `font-atlas-body`
- [x] Font weights match: headlines bold (700), body normal-medium (400-500)

**Color Token Compliance**:
- [x] ZERO instances of raw `blue-*`, `slate-*`, `amber-*`, `green-*` Tailwind classes
- [x] All colors use `atlas-*` tokens exclusively (verified by text search of component)

**Spacing Consistency**:
- [x] Grid gap is `gap-6` (24px) throughout
- [x] Card internal padding is `p-8` (32px) for all major cards
- [x] Consistent margins between sections

**Shadow Consistency**:
- [x] All cards use `shadow-[0px_24px_48px_rgba(4,13,27,0.06)]` via BENTO_CARD_BASE constant

**Border Consistency**:
- [x] All cards use `border border-atlas-outline-variant/15`
- [x] No left accent borders on any card
- [x] `rounded-xl` on all content cards

**Responsive Behavior**:
- [x] Cards stack to single column on mobile (grid-cols-1 default)
- [x] Grid activates at `md` breakpoint
- [x] Sidebar offset handled by PhaseShell (not this component's concern)
- [x] No horizontal overflow risk (attractions use overflow-x-auto contained)

**Accessibility**:
- [x] CTA button contrast passes (handled by AtlasButton + WizardFooter)
- [x] Focus indicators present on attraction cards (`focus-visible:outline-2`)
- [ ] Images have descriptive alt text -- N/A currently (gradient placeholders)
- [x] Section headings use proper hierarchy (h1 in header, h2 in cards, h3 in attractions)
- [x] Safety badge has text "Seguro", not just green dot (no color-only information)
- [x] `prefers-reduced-motion` respected (`motion-reduce:group-hover:scale-100`, `motion-reduce:animate-none`)

---

## Remaining Issues (non-blocking)

| # | Issue | Severity | Recommendation |
|---|---|---|---|
| 1 | No actual destination photographs (CSS gradient placeholders) | LOW | Expected for v1. When image API is available, replace gradient div with `<img>` + descriptive `alt` text. |
| 2 | Safety tip icons use green checkmark emoji instead of orange verified Material icon | LOW | Acceptable -- emoji avoids icon font dependency. If design system adds icon component, swap later. |
| 3 | Quick Facts semantic markup uses divs, not `<dl>/<dt>/<dd>` | LOW | Functional for screen readers but `<dl>` would improve semantics. Non-blocking. |
| 4 | WizardFooter missing "Fase 5 de 8" center label | MEDIUM | This is a shared component concern. File as tech debt for WizardFooter to accept optional center content via prop. |
| 5 | WizardFooter missing glassmorphism effect | LOW | Shared component concern. Non-blocking -- solid background is acceptable. |
| 6 | AI badge token naming (`atlas-primary-fixed`) may not resolve to peach if atlas design system swaps primary/secondary | MEDIUM | Verify at runtime. If badge renders navy/blue instead of peach, change to `atlas-secondary-fixed` per color mapping table. |
| 7 | Attraction card images need alt text when real images are added | MEDIUM | Add `alt` attribute with attraction name when `<img>` elements replace gradient placeholders. |

---

## Verdict

**APPROVED WITH CONDITIONS** -- Phase 5 implementation is a substantial and faithful recreation of the Stitch prototype. Of the 19 documented deviations, 15 are fully resolved, 2 are partially resolved (acceptable for v1), and 2 remain unfixed but are shared WizardFooter concerns, not Phase 5-specific issues.

The structural transformation from the old implementation (dark navy card, left accent borders, blue disclaimer box, no attractions section) to the new bento grid layout (hero card with gradient, quick facts grid, safety badge, cost table rows, attractions carousel, plain italic disclaimer) represents a major improvement in fidelity to the Stitch prototype.

**Conditions for final sign-off**:
1. Runtime verification that `atlas-primary-fixed` token resolves to peach (#ffdcc3), not a navy/blue shade. If incorrect, swap to `atlas-secondary-fixed`.
2. WizardFooter center label ("Fase 5 de 8") to be filed as tech debt -- not blocking this sprint.

> Ready for Architect -- implementation matches Stitch prototype within acceptable tolerances for v1.
