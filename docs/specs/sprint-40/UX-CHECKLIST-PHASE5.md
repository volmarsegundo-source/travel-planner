# UX Visual Fidelity Checklist: Phase 5 — Guia do Destino

**Version**: 1.0.0
**Status**: In Review
**Author**: ux-designer
**Date**: 2026-03-26
**Reference Prototype**: `docs/design/stitch-exports/phase5_guia_destino/code.html`
**Reference Screenshot**: `docs/design/stitch-exports/phase5_guia_destino/screen.png`
**Current Implementation**: `src/components/features/expedition/DestinationGuideV2.tsx`
**Design System Source of Truth**: `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md`

---

## Stitch-to-Atlas Color Mapping

The Stitch export uses a Material Design 3 color scheme in its Tailwind config. Below is the exact mapping from prototype CSS values to atlas-* design tokens.

| Stitch Token / Value | Hex | Atlas Token | Notes |
|---|---|---|---|
| `primary` | `#914d00` | `atlas-secondary` | Stitch "primary" = our amber/brown accent |
| `primary-container` | `#fe932c` | `atlas-secondary-container` | Orange CTA color |
| `primary-fixed` | `#ffdcc3` | `atlas-secondary-fixed` | Peach bg for AI badge |
| `primary-fixed-dim` | `#ffb77e` | `atlas-secondary-fixed-dim` | Medium peach |
| `on-primary-fixed-variant` | `#6e3900` | `atlas-on-secondary-fixed-variant` | Dark brown on peach |
| `on-primary-fixed` | `#2f1500` | `atlas-on-secondary-fixed` | Very dark brown |
| `on-primary-container` | `#663400` | `atlas-on-secondary-container` | Brown text on orange |
| `on-primary` | `#ffffff` | `atlas-on-primary` | White |
| `secondary` | `#555f70` | `atlas-surface-tint` | Gray-blue muted |
| `secondary-container` | `#d6e0f4` | `atlas-primary-fixed` | Lavender bg |
| `tertiary` | `#266861` | `atlas-on-tertiary-container` | Teal accent |
| `tertiary-container` | `#7ab9b0` | `atlas-tertiary-fixed-dim` | Teal medium |
| `on-tertiary-container` | `#004a43` | `atlas-on-tertiary-fixed-variant` | Deep teal |
| `background` / `surface` | `#f9f9ff` | `atlas-surface` / `atlas-background` | Page bg |
| `surface-container` | `#e7eeff` | `atlas-surface-container` | Container bg |
| `surface-container-low` | `#f0f3ff` | `atlas-surface-container-low` | Light container |
| `surface-container-lowest` | `#ffffff` | `atlas-surface-container-lowest` | White cards |
| `surface-container-high` | `#dfe8fd` | `atlas-surface-container-high` | Elevated container |
| `surface-container-highest` | `#d9e3f7` | `atlas-surface-container-highest` | Highest elevation |
| `on-surface` | `#121c2a` | `atlas-on-surface` | Primary text |
| `on-surface-variant` | `#554336` | `atlas-on-surface-variant` | Secondary text |
| `outline` | `#887364` | `atlas-outline` | Borders |
| `outline-variant` | `#dcc2b0` | `atlas-outline-variant` | Soft borders |
| `error` | `#ba1a1a` | `atlas-error` | Error red |
| Sidebar active bg | `#fe932c` | `atlas-secondary-container` | Active nav item |
| Header bg | `#040d1b` | `atlas-primary` | Dark navy header |
| `#040d1b` (CTA text) | `#040d1b` | `atlas-primary` | Text on orange buttons |

**CRITICAL NOTE**: The Stitch export swaps M3 "primary" and "secondary" relative to our atlas system. Stitch "primary" = amber/brown = atlas "secondary". Stitch "secondary" = blue-gray = atlas "surface-tint". Developers must follow the atlas-* token mapping, NOT the Stitch class names.

---

## Section 1: Hero Header

### 1.1 Visual Description (Prototype)

The hero section contains:
- An AI badge pill (`"Gerado por IA"`) in peach background with robot icon, positioned top-left
- A large bold headline: `"Guia do Destino: Lisboa"` at 36-48px, Plus Jakarta Sans, ExtraBold, tight tracking
- A subtitle paragraph in muted text, 18px, medium weight
- No destination image in the hero — the image is inside Card 1 (Sobre o Destino)

Typography from prototype:
- AI badge: `bg-primary-fixed text-on-primary-fixed-variant px-3 py-1 rounded-full text-xs font-bold tracking-wide`
- H1: `text-4xl md:text-5xl font-bold font-headline text-on-surface tracking-tight`
- Subtitle: `text-lg text-on-surface-variant font-medium`

### 1.2 Current Implementation — PARTIAL MATCH

The current `DestinationGuideV2.tsx` has:
- `AtlasBadge variant="ai-tip"` — renders as text-only overline style (gold text, no background pill). **FAIL**: Prototype shows a pill badge with peach background.
- H1 uses `text-3xl md:text-4xl font-atlas-headline font-bold text-atlas-on-surface tracking-tight`. **FAIL**: Prototype is `text-4xl md:text-5xl` (one size larger).
- Subtitle uses `text-base font-atlas-body text-atlas-on-surface-variant`. **FAIL**: Prototype is `text-lg font-medium`.
- No destination image or gradient overlay in hero. The prototype has the image inside Card 1, not the hero itself — this is correct separation.

### 1.3 Atlas Components

- `AtlasBadge` — needs a new variant or className override to render as a pill with background
- Standard `<h1>` with atlas typography tokens
- Standard `<p>` with atlas typography tokens

### 1.4 Token Mapping

| Property | Prototype Value | Atlas Token |
|---|---|---|
| AI badge bg | `#ffdcc3` (primary-fixed) | `bg-atlas-secondary-fixed` |
| AI badge text | `#6e3900` (on-primary-fixed-variant) | `text-atlas-on-secondary-fixed-variant` |
| AI badge padding | `px-3 py-1` | 12px horizontal, 4px vertical |
| AI badge radius | `rounded-full` | `rounded-atlas-full` |
| AI badge font | `text-xs font-bold tracking-wide` | `text-atlas-text-caption` (12px, bold) |
| H1 font family | Plus Jakarta Sans | `font-atlas-headline` |
| H1 size | 36px / 48px (md) | `text-atlas-text-h1` (36-48px, 800 weight) |
| H1 color | `#121c2a` (on-surface) | `text-atlas-on-surface` |
| H1 tracking | `tracking-tight` | `-0.02em` |
| Subtitle size | 18px | `text-lg` (18px) |
| Subtitle color | `#554336` (on-surface-variant) | `text-atlas-on-surface-variant` |
| Subtitle weight | 500 (medium) | `font-medium` |
| Section top margin | `mb-10` (40px below header) | `atlas-space-10` |

### 1.5 Pass/Fail Checklist

- [ ] AI badge has peach pill background (`bg-atlas-secondary-fixed`), not text-only overline
- [ ] AI badge text is dark brown (`text-atlas-on-secondary-fixed-variant`), not gold
- [ ] AI badge includes robot/AI icon to left of text
- [ ] AI badge has `rounded-full` border radius
- [ ] H1 is `text-4xl md:text-5xl` (not `text-3xl md:text-4xl`)
- [ ] H1 uses `font-atlas-headline` (Plus Jakarta Sans)
- [ ] H1 weight is 800 (ExtraBold) or 700 (Bold)
- [ ] H1 has `tracking-tight` letter spacing
- [ ] H1 color is `text-atlas-on-surface`
- [ ] Subtitle is `text-lg` (18px), not `text-base` (16px)
- [ ] Subtitle weight is `font-medium` (500)
- [ ] Subtitle color is `text-atlas-on-surface-variant`
- [ ] Subtitle uses `font-atlas-body` (Work Sans)
- [ ] Margin below header is 40px (`mb-10`)
- [ ] Keyboard: AI badge is not focusable (decorative)
- [ ] Screen reader: AI badge has appropriate `role="status"` or `aria-label`

---

## Section 2: Quick Facts (Informacoes Rapidas)

### 2.1 Visual Description (Prototype)

Right-side card spanning 4 of 10 grid columns. Contains:
- Card title: `"Informacoes Rapidas"` — `text-xl font-bold font-headline`, 24px bottom margin
- 2x3 grid of fact items (`grid-cols-2 gap-y-8 gap-x-4`)
- Each fact item has:
  - Icon row: Material icon + uppercase label in primary color (`text-primary`, which is amber `#914d00`)
  - Value row: `text-lg font-bold text-on-surface`
- 6 facts: Clima, Moeda, Idioma, Fuso Horario, Tomada, DDI
- Card bg: `surface-container-low` (`#f0f3ff`)
- Card has `rounded-xl p-8 shadow-[0px_24px_48px_rgba(4,13,27,0.06)] border border-outline-variant/15`

### 2.2 Current Implementation — PARTIAL MATCH

The current implementation renders stat sections (timezone, currency, language, electricity) inside an `AtlasCard variant="base"` with `!bg-atlas-surface-container-low`:
- Uses emoji icons instead of Material icons. **ACCEPTABLE** — emoji approach is simpler and avoids icon font dependency.
- Label styling: `text-[10px] font-atlas-body font-bold uppercase tracking-widest text-atlas-on-surface-variant`. **FAIL**: Prototype uses `text-xs` (12px) with `text-primary` (amber) color, not on-surface-variant gray.
- Value styling: `text-base font-atlas-headline font-bold text-atlas-on-surface`. **FAIL**: Prototype uses `text-lg` (18px).
- Only 4 stats, prototype has 6. **INFO**: AI generates 4 stat sections; adding DDI and Tomada requires AI schema change.
- Grid: `grid-cols-2 gap-y-6 gap-x-4` vs prototype `gap-y-8 gap-x-4`. **FAIL**: vertical gap should be 32px not 24px.
- Card title: `text-lg` (18px) vs prototype `text-xl` (20px). **FAIL**.
- Tips rendered as `text-[10px]` list items below values. Prototype does NOT show tips — values only. **FAIL**: Tips should be hidden or moved to tooltips per SPEC-UX-010.

### 2.3 Atlas Components

- `AtlasCard variant="base"` with className override for bg
- Custom internal layout (no dedicated stat component exists)

### 2.4 Token Mapping

| Property | Prototype Value | Atlas Token |
|---|---|---|
| Card bg | `#f0f3ff` (surface-container-low) | `bg-atlas-surface-container-low` |
| Card border | `outline-variant/15` | `border-atlas-outline-variant/15` |
| Card radius | `rounded-xl` (12px) | `rounded-atlas-lg` |
| Card padding | `p-8` (32px) | `p-8` / `atlas-space-8` |
| Card shadow | `0px 24px 48px rgba(4,13,27,0.06)` | `shadow-atlas-lg` (closest) |
| Title font | `text-xl font-bold font-headline` | `font-atlas-headline text-xl font-bold` |
| Title margin | `mb-6` (24px) | `mb-6` |
| Grid | `grid-cols-2 gap-y-8 gap-x-4` | 2 cols, 32px row gap, 16px col gap |
| Label icon color | `#914d00` (primary/amber) | `text-atlas-secondary` |
| Label text | `text-xs font-bold uppercase tracking-wider` | 12px, bold, uppercase |
| Label color | `#914d00` (primary/amber) | `text-atlas-secondary` |
| Value size | `text-lg` (18px) | `text-lg` |
| Value weight | `font-bold` (700) | `font-bold` |
| Value color | `#121c2a` (on-surface) | `text-atlas-on-surface` |

### 2.5 Pass/Fail Checklist

- [ ] Card background is `bg-atlas-surface-container-low`
- [ ] Card has `border border-atlas-outline-variant/15`
- [ ] Card uses `rounded-xl` (12px) border radius
- [ ] Card padding is 32px (`p-8`)
- [ ] Card shadow matches `shadow-atlas-lg` or custom `0px 24px 48px rgba(4,13,27,0.06)`
- [ ] Card spans 4 columns on md+ (`md:col-span-4`)
- [ ] Card title is `text-xl font-bold font-atlas-headline`
- [ ] Card title has `mb-6` (24px) bottom margin
- [ ] Grid uses `grid-cols-2 gap-y-8 gap-x-4`
- [ ] Label icon and text use amber color (`text-atlas-secondary`)
- [ ] Label text is `text-xs font-bold uppercase tracking-wider`
- [ ] Value is `text-lg font-bold text-atlas-on-surface`
- [ ] Tips are NOT displayed inline below values (hidden or tooltip)
- [ ] 6 stat items shown if data available (Clima, Moeda, Idioma, Fuso, Tomada, DDI)
- [ ] Each fact item has icon + label row, then value row (two distinct lines)
- [ ] Responsive: stacks to single column on mobile
- [ ] Accessibility: stat items use semantic markup (dl/dt/dd or equivalent)

---

## Section 3: Bento Grid (Sobre, Melhor Epoca/Seguranca, Custos)

### 3.1 Visual Description (Prototype)

A 10-column CSS grid containing 4 major cards:

**Card 1 — Sobre o Destino (6 cols)**:
- Has a 256px hero image with gradient overlay (`h-64`, `bg-gradient-to-t from-black/60 to-transparent`)
- White text caption over gradient: `"A Cidade da Luz"` (font-headline bold text-xl)
- Below image: `p-8` content area with section title (icon + "Sobre o Destino") and two paragraphs
- Title: `text-xl font-bold font-headline` with Material icon in `text-primary-container` (orange `#fe932c`)
- Body text: `text-on-surface-variant leading-relaxed`
- Card: `bg-surface-container-lowest rounded-xl overflow-hidden shadow-[...] border border-outline-variant/15`

**Card 2 — Dicas de Seguranca (5 cols)**:
- Header: title + green safety badge (`bg-tertiary/10 text-tertiary`, pill with green dot + "Seguro")
- Bulleted list with orange checkmark icons (`text-primary-container`)
- Body: `text-on-surface-variant text-sm`
- Card: white bg, `rounded-xl p-8 shadow-[...] border border-outline-variant/15`

**Card 3 — Custos Medios (5 cols)**:
- Table-like rows with divider lines (`border-b border-surface-container`)
- Left: item name in `text-on-surface-variant font-medium`
- Right: price range in `font-bold text-on-surface`
- Bottom tip box: `bg-surface-container-low rounded-lg` with lightbulb icon
- Card: white bg, `rounded-xl p-8 shadow-[...] border border-outline-variant/15`

### 3.2 Current Implementation — SIGNIFICANT DEVIATION

The current implementation uses a flat bento grid with:
- A **dark card** (`AtlasCard variant="dark"`) for the hero summary spanning 6 cols — renders as navy background with concatenated stat text. **FAIL**: Prototype has an image card with photo + gradient overlay, not a dark text card.
- Content sections rendered as uniform `AtlasCard variant="base"` cards with left accent borders (`!border-l-4 !border-l-atlas-*`). **FAIL**: Prototype uses no left accent borders; instead uses full-width cards with internal visual hierarchy.
- No distinction between "Sobre" (with image), "Seguranca" (with status badge), and "Custos" (with table layout). **FAIL**: All content cards look identical in current implementation.
- No image anywhere in the guide. **FAIL**: Prototype has a large hero image in Card 1.
- No safety status badge (green "Seguro" pill). **FAIL**.
- No cost table layout with rows and dividers. **FAIL**.
- No tip box with lightbulb icon. **FAIL**.

### 3.3 Atlas Components

- `AtlasCard variant="base"` — for standard content cards (Seguranca, Custos)
- `AtlasCard` — needs hero variant or custom wrapper for image + gradient card (Sobre)
- `AtlasBadge variant="status" color="success"` — for "Seguro" safety badge
- Custom tip box component or inline layout

### 3.4 Token Mapping

**Card 1 — Sobre o Destino**:

| Property | Prototype Value | Atlas Token |
|---|---|---|
| Card bg | white (`surface-container-lowest`) | `bg-atlas-surface-container-lowest` |
| Card radius | `rounded-xl` (12px) | `rounded-atlas-lg` |
| Card shadow | `0px 24px 48px rgba(4,13,27,0.06)` | `shadow-atlas-lg` |
| Card border | `outline-variant/15` | `border-atlas-outline-variant/15` |
| Image height | 256px (`h-64`) | `h-64` |
| Gradient overlay | `from-black/60 to-transparent` | `bg-gradient-to-t from-black/60 to-transparent` |
| Image caption | white, headline font, bold, text-xl | `text-white font-atlas-headline font-bold text-xl` |
| Content padding | `p-8` (32px) | `atlas-space-8` |
| Section title | `text-xl font-bold font-headline` | `font-atlas-headline text-xl font-bold` |
| Section icon color | `#fe932c` (primary-container) | `text-atlas-secondary-container` |
| Body text color | on-surface-variant | `text-atlas-on-surface-variant` |
| Body line height | `leading-relaxed` (1.625) | `leading-relaxed` |
| Grid span | 6 of 10 cols | `md:col-span-6` |

**Card 2 — Dicas de Seguranca**:

| Property | Prototype Value | Atlas Token |
|---|---|---|
| Safety badge bg | `tertiary/10` | `bg-atlas-on-tertiary-container/10` or `bg-atlas-success/10` |
| Safety badge text | `tertiary` (#266861) | `text-atlas-on-tertiary-container` or `text-atlas-success` |
| Safety badge dot | `bg-tertiary` (green) | `bg-atlas-success` |
| Safety badge radius | `rounded-full` | `rounded-atlas-full` |
| Check icon color | `#fe932c` (primary-container) | `text-atlas-secondary-container` |
| List item gap | `space-y-4` | 16px vertical spacing |
| Body text | `text-on-surface-variant text-sm` | `text-atlas-on-surface-variant text-sm` |
| Grid span | 5 of 10 cols | `md:col-span-5` |

**Card 3 — Custos Medios**:

| Property | Prototype Value | Atlas Token |
|---|---|---|
| Row divider | `border-b border-surface-container` | `border-b border-atlas-surface-container` |
| Row padding | `py-2` | 8px vertical |
| Left text | `text-on-surface-variant font-medium` | `text-atlas-on-surface-variant font-medium` |
| Right text | `font-bold text-on-surface` | `font-bold text-atlas-on-surface` |
| Tip box bg | `surface-container-low` | `bg-atlas-surface-container-low` |
| Tip box radius | `rounded-lg` | `rounded-atlas-md` (8px) |
| Tip icon | `text-primary` (amber) | `text-atlas-secondary` |
| Tip text | `text-xs text-on-secondary-fixed-variant` | `text-xs text-atlas-on-surface-variant` |
| Grid span | 5 of 10 cols | `md:col-span-5` |

### 3.5 Pass/Fail Checklist

**Overall Grid**:
- [ ] Grid uses `grid-cols-1 md:grid-cols-10 gap-6` (gap is 24px, not current 16px)
- [ ] Max width constrained to `max-w-7xl`

**Card 1 — Sobre o Destino**:
- [ ] Card spans 6 columns (`md:col-span-6`)
- [ ] Card has hero image area (256px / `h-64`)
- [ ] Image has `object-cover` and fills container width
- [ ] Gradient overlay: `bg-gradient-to-t from-black/60 to-transparent`
- [ ] White caption text over gradient, bottom-left positioned
- [ ] Content area has 32px padding (`p-8`)
- [ ] Section title has icon + text in single row
- [ ] Icon color is orange (`text-atlas-secondary-container`)
- [ ] Body text is `text-atlas-on-surface-variant leading-relaxed`
- [ ] Card uses `overflow-hidden` to clip image inside rounded corners
- [ ] No left accent border (removed from this card)

**Card 2 — Dicas de Seguranca**:
- [ ] Card spans 5 columns (`md:col-span-5`)
- [ ] Header row has title left + safety status badge right (`flex justify-between`)
- [ ] Safety badge is green pill with dot indicator + "Seguro" text
- [ ] Safety badge uses `AtlasBadge variant="status" color="success"` or equivalent
- [ ] List items use checkmark/verified icon in orange (`text-atlas-secondary-container`)
- [ ] List items have `text-sm text-atlas-on-surface-variant`
- [ ] No left accent border

**Card 3 — Custos Medios**:
- [ ] Card spans 5 columns (`md:col-span-5`)
- [ ] Cost rows use `flex justify-between items-center` layout
- [ ] Rows separated by `border-b border-atlas-surface-container`
- [ ] Item names are `text-atlas-on-surface-variant font-medium`
- [ ] Prices are `font-bold text-atlas-on-surface`
- [ ] Last row has no bottom border
- [ ] Tip box at bottom with lightbulb icon + `bg-atlas-surface-container-low rounded-lg`
- [ ] No left accent border

**All Cards**:
- [ ] Background is `bg-atlas-surface-container-lowest` (white)
- [ ] Border is `border border-atlas-outline-variant/15`
- [ ] Border radius is `rounded-xl` (12px)
- [ ] Shadow matches prototype (`shadow-atlas-lg` or custom value)
- [ ] Padding is `p-8` (32px)

---

## Section 4: O Que Nao Perder (Attractions)

### 4.1 Visual Description (Prototype)

Full-width card spanning all 10 columns containing a horizontally scrollable attraction carousel:
- Card: white bg, `rounded-xl p-8`, full 10-col span
- Title: `text-xl font-bold font-headline`
- Horizontal scroll container: `flex gap-6 overflow-x-auto pb-6` with custom scrollbar (orange thumb)
- Each attraction card:
  - Width: `min-w-[280px]`
  - Image area: `h-40` with `object-cover` and hover zoom (`group-hover:scale-105 transition-transform duration-500`)
  - White bg, `rounded-xl overflow-hidden shadow-sm`
  - Title: `font-bold font-headline text-on-surface`
  - Description: `text-xs text-on-surface-variant line-clamp-2`
  - Content padding: `p-4`

### 4.2 Current Implementation — NOT IMPLEMENTED

The current `DestinationGuideV2.tsx` does not render an attractions carousel. Content sections are rendered as flat bento cards. The "O que nao perder" section would need to be a new section type in the AI-generated guide content, or built from existing content sections.

**FAIL**: Section entirely missing from current implementation.

### 4.3 Atlas Components

- `AtlasCard variant="base"` — outer container
- Custom `AttractionCard` — inner scrollable items (no existing component)
- No existing carousel/scroll component in the design system

### 4.4 Token Mapping

| Property | Prototype Value | Atlas Token |
|---|---|---|
| Outer card bg | white | `bg-atlas-surface-container-lowest` |
| Outer card span | 10 cols | `md:col-span-10` |
| Outer card padding | `p-8` | `atlas-space-8` |
| Scroll gap | `gap-6` (24px) | `gap-6` |
| Scrollbar track | `#f0f3ff` | `atlas-surface-container-low` |
| Scrollbar thumb | `#fe932c` | `atlas-secondary-container` |
| Attraction card width | 280px min | `min-w-[280px]` |
| Attraction card bg | white | `bg-white` |
| Attraction card radius | `rounded-xl` | `rounded-atlas-lg` |
| Attraction card shadow | `shadow-sm` | `shadow-atlas-sm` |
| Image height | 160px (`h-40`) | `h-40` |
| Image hover | `scale-105` over 500ms | `group-hover:scale-105 duration-500` |
| Title font | `font-bold font-headline` | `font-atlas-headline font-bold` |
| Title color | on-surface | `text-atlas-on-surface` |
| Description | `text-xs text-on-surface-variant` | `text-xs text-atlas-on-surface-variant` |
| Description clamp | 2 lines | `line-clamp-2` |
| Content padding | `p-4` | `p-4` / `atlas-space-4` |

### 4.5 Pass/Fail Checklist

- [ ] Full-width card spanning 10 columns
- [ ] Section title `text-xl font-bold font-atlas-headline`
- [ ] Horizontal scroll container with `overflow-x-auto`
- [ ] Custom scrollbar with orange thumb (Webkit/Chromium)
- [ ] Each attraction card has 280px minimum width
- [ ] Attraction cards have `rounded-xl shadow-sm` and white background
- [ ] Image area is 160px tall with `object-cover`
- [ ] Image hover zoom: `scale-105` with `duration-500` transition
- [ ] Title uses `font-atlas-headline font-bold`
- [ ] Description uses `text-xs text-atlas-on-surface-variant line-clamp-2`
- [ ] Content area has 16px padding (`p-4`)
- [ ] Scroll area has `pb-6` for scrollbar clearance
- [ ] Gap between cards is 24px (`gap-6`)
- [ ] Respects `prefers-reduced-motion` (disable hover zoom)
- [ ] Accessibility: carousel has `role="region"` with `aria-label`
- [ ] Accessibility: each card image has descriptive `alt` text
- [ ] Keyboard: horizontal scroll navigable with arrow keys or tab
- [ ] Touch: supports swipe gesture on mobile

---

## Section 5: Documentacao Necessaria

### 5.1 Visual Description (Prototype)

This section is NOT present as a separate card in the Stitch prototype. In the current AI guide schema, documentation/visa info may be part of a content section. The prototype covers this implicitly within the bento grid content cards.

### 5.2 Current Implementation

The `CONTENT_SECTIONS` array in `DestinationGuideV2.tsx` does not include a dedicated "documentation" key. If the AI generates documentation content, it would appear under one of the 6 content sections (connectivity, cultural_tips, safety, health, transport_overview, local_customs).

**STATUS**: N/A — Not a separate section in prototype. If this section is required, it needs:
1. A new `GuideSectionKey` added to `ai.types.ts`
2. AI prompt update to generate documentation content
3. Rendering logic in the component

### 5.3 Pass/Fail Checklist

- [ ] If documentation section is required by PO, it must be added as a new AI section key
- [ ] If present, follows the same card pattern as other content cards (5 cols, accent border)
- [ ] Content includes visa requirements, passport validity, vaccination, entry forms
- [ ] Marked as N/A if PO confirms documentation is not a separate section

---

## Section 6: Transporte no Destino

### 6.1 Visual Description (Prototype)

Not a visually distinct section in the Stitch prototype. Transport info appears as one of the bento content cards.

### 6.2 Current Implementation

Transport overview exists as `transport_overview` in `CONTENT_SECTIONS`. Rendered as an `AtlasCard variant="base"` with left accent border `!border-l-4 !border-l-atlas-secondary`.

**DEVIATION**: The prototype does not use left accent borders on content cards. The accent should be removed to match the prototype's cleaner visual style.

### 6.3 Atlas Components

- `AtlasCard variant="base"` — without left accent border modification

### 6.4 Token Mapping

Same as all content cards in Section 3. No special styling.

### 6.5 Pass/Fail Checklist

- [ ] Rendered as standard content card (5 cols on md+)
- [ ] NO left accent border (`!border-l-4` classes removed)
- [ ] Section icon rendered to left of title
- [ ] Title uses `font-atlas-headline font-bold text-atlas-on-surface`
- [ ] Summary text uses `text-sm font-atlas-body text-atlas-on-surface leading-relaxed`
- [ ] Tips rendered as bulleted list with orange dots (`text-atlas-secondary-container`)
- [ ] Card matches standard bento card styling (white bg, outline border, rounded-xl, shadow, p-8)

---

## Section 7: Dicas Culturais

### 7.1 Visual Description (Prototype)

Also rendered as a standard bento content card in the prototype. No special visual treatment beyond the standard content card pattern.

### 7.2 Current Implementation

`cultural_tips` exists in `CONTENT_SECTIONS` with accent `!border-l-4 !border-l-atlas-warning`. Same deviation as Section 6 — left accent border not in prototype.

### 7.3 Pass/Fail Checklist

- [ ] Rendered as standard content card (5 cols on md+)
- [ ] NO left accent border (remove `!border-l-4 !border-l-atlas-warning`)
- [ ] Section icon rendered to left of title
- [ ] Title uses `font-atlas-headline font-bold text-atlas-on-surface`
- [ ] Summary + details text uses appropriate body text tokens
- [ ] Tips as bulleted list with orange dots
- [ ] Standard bento card styling

---

## Section 8: Action Bar (Bottom Navigation)

### 8.1 Visual Description (Prototype)

Fixed bottom bar spanning full width:
- Position: `fixed bottom-0 left-0 right-0 z-50`
- Background: `bg-white/80 backdrop-blur-md`
- Top border: `border-t border-surface-container`
- Content: 3 items in `flex justify-between`
  - Left: "Voltar" button (ghost style with back arrow icon)
  - Center: Phase indicator text "Fase 5 de 8" (`text-sm font-bold text-on-surface-variant`)
  - Right: "Avancar" CTA button (orange bg, dark text, with forward arrow icon)
- Left padding for sidebar: `lg:ml-64`
- Container: `max-w-7xl mx-auto`

Button styles:
- Back button: `text-on-surface font-semibold hover:bg-surface-container-low px-4 py-2 rounded-lg`
- CTA button: `bg-[#fe932c] text-[#040d1b] font-bold px-8 py-3 rounded-lg shadow-lg shadow-primary-container/20`

### 8.2 Current Implementation — USES WIZARDFOOTER

The current implementation uses `<WizardFooter>` component which renders its own footer bar. This is the standardized footer component across all phase wizards.

**Key differences**:
- WizardFooter is a sticky bar, not fixed. **ACCEPTABLE** — sticky is actually better UX as it stays in scroll flow.
- WizardFooter does not show phase indicator text in center. **FAIL**: Missing "Fase 5 de 8" label.
- WizardFooter does not have `backdrop-blur-md` glass effect. **FAIL**: Prototype has glassmorphism.
- WizardFooter may not have left offset for sidebar. **VERIFY**: Check if PhaseShell handles this.

### 8.3 Atlas Components

- `WizardFooter` — existing standardized component
- `AtlasButton variant="primary"` — for CTA
- `AtlasButton variant="ghost"` — for back button

### 8.4 Token Mapping

| Property | Prototype Value | Atlas Token |
|---|---|---|
| Bar bg | `white/80 + backdrop-blur-md` | `bg-white/80 backdrop-blur-md` |
| Bar border | `border-t border-surface-container` | `border-t border-atlas-surface-container` |
| Bar padding | `px-6 py-4` | 24px horizontal, 16px vertical |
| Bar position | `fixed bottom-0` | `fixed bottom-0` or `sticky bottom-0` |
| Bar z-index | `z-50` | `z-50` |
| Sidebar offset | `lg:ml-64` | `lg:ml-64` (if sidebar present) |
| Back button text | `text-on-surface font-semibold` | `AtlasButton variant="ghost"` |
| Back button icon | `arrow_back` | Left arrow icon |
| Phase label | `text-sm font-bold text-on-surface-variant` | `text-sm font-bold text-atlas-on-surface-variant` |
| CTA bg | `#fe932c` | `bg-atlas-secondary-container` |
| CTA text | `#040d1b` | `text-atlas-primary` |
| CTA weight | `font-bold` | Included in `AtlasButton variant="primary"` |
| CTA padding | `px-8 py-3` | `AtlasButton size="lg"` |
| CTA radius | `rounded-lg` (8px) | `rounded-atlas-md` |
| CTA shadow | `shadow-lg shadow-primary-container/20` | `shadow-atlas-lg shadow-atlas-glow-amber` |
| CTA icon | `arrow_forward` | Right arrow icon |
| Active state | `active:scale-[0.98]` | Included in `AtlasButton` base styles |

### 8.5 Pass/Fail Checklist

- [ ] Bottom bar is fixed or sticky at viewport bottom
- [ ] Background uses glassmorphism (`bg-white/80 backdrop-blur-md`)
- [ ] Top border uses `border-atlas-surface-container`
- [ ] Three items: back button, phase label, CTA
- [ ] Phase label shows "Fase 5 de 8" in center
- [ ] Phase label uses `text-sm font-bold text-atlas-on-surface-variant`
- [ ] Back button uses `AtlasButton variant="ghost"` with arrow icon
- [ ] Back button label is "Voltar"
- [ ] CTA uses `AtlasButton variant="primary" size="lg"` with arrow icon
- [ ] CTA label is "Avancar"
- [ ] CTA text color is dark (`text-atlas-primary`), NOT white
- [ ] CTA has glow shadow (`shadow-atlas-glow-amber`)
- [ ] Bar has `lg:ml-64` offset when sidebar is present
- [ ] Content constrained to `max-w-7xl`
- [ ] Padding is `px-6 py-4`
- [ ] z-index is 50
- [ ] Accessibility: back button has clear label for screen readers
- [ ] Keyboard: Tab order flows logically (back -> CTA)
- [ ] Touch targets: both buttons meet 44px minimum height

---

## Section 9: AI Disclaimer Footer

### 9.1 Visual Description (Prototype)

Centered text block below the bento grid:
- Max width: `max-w-2xl mx-auto`
- Text: `text-[10px] text-on-surface-variant/60 leading-relaxed italic`
- Content: Legal disclaimer about AI-generated content and data accuracy
- Margin: `mt-12 mb-20`

### 9.2 Current Implementation — USES AIDISCLAIMER COMPONENT

The `AiDisclaimer` component renders as a blue info box with icon (`border-blue-200 bg-blue-50`). **FAIL**: Prototype shows plain italic text, not a blue box.

**Deviations**:
- Current: Blue info box with Info icon. Prototype: Plain centered italic text. **FAIL**.
- Current: Uses non-atlas colors (`blue-200`, `blue-50`, `blue-500`, `blue-700`). **FAIL**: Must use atlas tokens.
- Current: `role="note"`. Prototype: No specific ARIA role (decorative text). **ACCEPTABLE** — keeping role="note" is better for accessibility.

### 9.3 Token Mapping

| Property | Prototype Value | Atlas Token |
|---|---|---|
| Text size | `text-[10px]` (10px) | `text-atlas-text-micro` |
| Text color | `on-surface-variant/60` (40% opacity gray) | `text-atlas-on-surface-variant/60` |
| Line height | `leading-relaxed` | `leading-relaxed` |
| Font style | `italic` | `italic` |
| Max width | `max-w-2xl` (672px) | `max-w-2xl` |
| Alignment | `text-center` | `text-center` |
| Top margin | `mt-12` (48px) | `mt-12` |
| Bottom margin | `mb-20` (80px) | `mb-20` |

### 9.4 Pass/Fail Checklist

- [ ] Rendered as plain centered text, NOT a blue info box
- [ ] Text size is 10px (`text-[10px]`)
- [ ] Text color is `text-atlas-on-surface-variant/60` (muted with opacity)
- [ ] Text is `italic`
- [ ] Max width is `max-w-2xl` and centered (`mx-auto`)
- [ ] Top margin is 48px (`mt-12`)
- [ ] Bottom margin is 80px (`mb-20`) to clear fixed bottom bar
- [ ] No background color, no border, no icon
- [ ] Uses atlas tokens only (no `blue-*` Tailwind classes)
- [ ] `AiDisclaimer` component updated or replaced with inline text
- [ ] Maintains `role="note"` for accessibility

---

## Section 10: Skeleton Loading State

### 10.1 Visual Description (Prototype)

Not explicitly shown in the Stitch export. The current implementation provides a skeleton state.

### 10.2 Current Implementation — NEEDS ALIGNMENT

Current skeleton renders:
- `AtlasCard loading` instances in a `grid-cols-1 md:grid-cols-10 gap-4` layout
- One 6-col card, one 4-col card, six 5-col cards
- Loading text centered below: `tCommon("loading")`

**PARTIAL MATCH**: Grid structure matches but gap should be `gap-6` (24px) to match the loaded state.

### 10.3 Pass/Fail Checklist

- [ ] Skeleton grid matches loaded state structure (10-col, gap-6)
- [ ] Skeleton card heights approximate loaded card heights
- [ ] Skeleton uses `animate-pulse` with `motion-reduce:animate-none`
- [ ] Loading text is centered and uses `text-atlas-on-surface-variant`
- [ ] Gap is `gap-6` (not `gap-4`)

---

## Global Cross-Section Checklist

### Typography Consistency

- [ ] ALL headlines use `font-atlas-headline` (Plus Jakarta Sans)
- [ ] ALL body text uses `font-atlas-body` (Work Sans)
- [ ] No instances of system-ui or Inter fallback rendering visibly
- [ ] Font weights match: headlines 700-800, body 400-500, labels 600-700

### Color Token Compliance

- [ ] ZERO instances of raw Tailwind color classes (no `blue-*`, `slate-*`, `amber-*`, `green-*`)
- [ ] All colors use `atlas-*` tokens exclusively
- [ ] Dark mode tokens applied where `dark:` variants exist on `AtlasCard`

### Spacing Consistency

- [ ] Grid gap is `gap-6` (24px) throughout, matching prototype
- [ ] Card internal padding is `p-8` (32px) for all major cards
- [ ] Consistent margins between sections

### Shadow Consistency

- [ ] All cards use the same shadow value: `0px 24px 48px rgba(4,13,27,0.06)` or `shadow-atlas-lg`
- [ ] No mix of different shadow depths on peer-level cards

### Border Consistency

- [ ] All cards use `border border-atlas-outline-variant/15` (subtle, not /20)
- [ ] No left accent borders on content cards (removed — prototype does not use them)
- [ ] `rounded-xl` (12px) on all content cards

### Responsive Behavior

| Breakpoint | Expected Layout |
|---|---|
| Mobile (< 768px) | All cards stack to single column, full width |
| Tablet (768-1024px) | 10-column grid active, cards span as specified |
| Desktop (> 1024px) | 10-column grid, sidebar offset (`lg:ml-64`), max-w-7xl |

- [ ] Cards stack to single column on mobile
- [ ] Grid activates at `md` breakpoint (768px)
- [ ] Sidebar offset applies at `lg` breakpoint (1024px)
- [ ] Action bar adjusts for sidebar at `lg`
- [ ] All text remains readable at all breakpoints
- [ ] No horizontal overflow on mobile

### Accessibility

- [ ] All text meets WCAG 2.1 AA contrast (4.5:1 for body, 3:1 for large text)
- [ ] CTA button: dark text on orange (`atlas-primary` on `atlas-secondary-container`) = 7.5:1 PASSES
- [ ] All interactive elements have visible focus indicators (`ring-2 ring-atlas-focus-ring ring-offset-2`)
- [ ] All images have descriptive `alt` text
- [ ] Section headings use proper heading hierarchy (h1 > h2 > h3)
- [ ] No information conveyed by color alone (safety badge has text "Seguro", not just green dot)
- [ ] Touch targets minimum 44x44px on all interactive elements
- [ ] `prefers-reduced-motion` disables all hover transforms and scroll animations
- [ ] Screen reader announces section structure logically
- [ ] Horizontal scroll carousel is keyboard navigable

---

## Summary of Critical Failures (Must Fix Before Merge)

| # | Section | Issue | Severity |
|---|---|---|---|
| 1 | Hero | AI badge renders as text-only overline, not peach pill | HIGH |
| 2 | Hero | H1 one size too small (3xl/4xl instead of 4xl/5xl) | MEDIUM |
| 3 | Hero | Subtitle too small (base instead of lg) and missing font-medium | MEDIUM |
| 4 | Quick Facts | Label color is gray, should be amber (`text-atlas-secondary`) | HIGH |
| 5 | Quick Facts | Value text too small (base instead of lg) | MEDIUM |
| 6 | Quick Facts | Grid gap-y too tight (24px instead of 32px) | LOW |
| 7 | Quick Facts | Tips visible inline; should be hidden/tooltip | MEDIUM |
| 8 | Bento | Hero card is dark navy text card; should be image card with gradient | CRITICAL |
| 9 | Bento | All content cards have left accent borders; prototype has none | HIGH |
| 10 | Bento | No safety status badge on Seguranca card | MEDIUM |
| 11 | Bento | No table-row layout for Custos card | MEDIUM |
| 12 | Bento | No tip box with lightbulb on Custos card | LOW |
| 13 | Bento | Grid gap is 16px; should be 24px | MEDIUM |
| 14 | Attractions | Entire section missing from implementation | CRITICAL |
| 15 | AI Disclaimer | Blue info box; should be plain italic centered text | HIGH |
| 16 | AI Disclaimer | Uses raw `blue-*` Tailwind classes instead of atlas tokens | HIGH |
| 17 | Action Bar | Missing "Fase 5 de 8" center label | MEDIUM |
| 18 | Action Bar | Missing glassmorphism (backdrop-blur) on footer | LOW |
| 19 | Skeleton | Grid gap is 16px; should be 24px | LOW |

**CRITICAL items** (2): Hero image card missing, attractions carousel missing. These require structural changes and potentially AI schema updates.

**HIGH items** (5): AI badge style, label colors, accent borders, disclaimer styling. These are CSS/token changes.

**MEDIUM items** (8): Typography sizes, layouts, missing sub-elements. Mix of CSS and minor structural changes.

**LOW items** (4): Spacing fine-tuning, minor visual polish.

---

> BLOCKED on: (1) PO confirmation whether "O Que Nao Perder" attractions section requires AI schema changes or can use existing data; (2) Availability of destination hero images — are these AI-generated, fetched from an API, or placeholder?
