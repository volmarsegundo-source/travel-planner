# SPEC-UX-047: Design System Component Specifications

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: Sprint 38 — Fundacao do Design System
**Created**: 2026-03-23
**Last Updated**: 2026-03-23

---

## 1. Traveler Goal

The traveler interacts with a consistent, accessible, and visually cohesive interface across every screen of Atlas, reinforcing trust, reducing cognitive load, and enabling confident decision-making at every step of expedition planning.

## 2. Personas Affected

| Persona | How this spec serves them |
|---|---|
| `@leisure-solo` | Consistent visual language reduces learning curve across phases |
| `@leisure-family` | Larger touch targets and clear states aid quick mobile interactions |
| `@business-traveler` | Predictable component behavior enables efficient task completion |
| `@group-organizer` | Stepper and chip components streamline multi-passenger and preference flows |

## 3. Scope

This spec defines the visual behavior, states, accessibility, and responsive rules for 7 foundational components of the Atlas V2 design system. These components are gated behind `NEXT_PUBLIC_DESIGN_V2=false` and MUST NOT alter any existing visual until the flag is enabled.

All token references in this spec map to `docs/design/DESIGN.md` (the V2 source of truth). A mapping to Tailwind config is provided in SPEC-UX-048.

---

## 4. Design Token Quick Reference

These tokens from DESIGN.md are referenced throughout this spec:

| Token | Value | Usage |
|---|---|---|
| `color-navy-900` | `#1a2332` | Brand primary, headings, navigation |
| `color-amber-500` | `#f59e0b` | CTA primary, active states |
| `color-amber-600` | `#d97706` | CTA hover/focus |
| `color-teal-600` | `#0d9488` | Links, success, AI indicators |
| `color-gray-50` | `#fafafa` | Page background |
| `color-gray-200` | `#e5e7eb` | Borders, dividers |
| `color-gray-500` | `#6b7280` | Supporting text, labels |
| `color-white` | `#ffffff` | Card surfaces |
| `font-display` | 36px / Bold | Hero titles |
| `font-h2` | 24px / Semibold | Section titles |
| `font-body` | 16px / Regular | Body text |
| `font-small` | 14px / Semibold | Labels, metadata |
| `radius-buttons` | 8px | Buttons, inputs |
| `radius-cards` | 16px | Cards |
| `radius-pills` | 9999px | Badges, chips |
| `shadow-soft` | 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) | Default elevation |
| `shadow-elevated` | 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) | Elevated cards |

---

## 5. Component Specifications

---

### 5.1 Button

**Purpose**: The primary interactive element for triggering actions across the application. Buttons must communicate their purpose, importance level, and current state at a glance.

#### 5.1.1 Variants

| Variant | Background | Text Color | Border | Use Case |
|---|---|---|---|---|
| `primary` | `color-amber-500` (#f59e0b) | `color-white` (#ffffff) | none | Main CTAs: "Avancar", "Criar Expedicao", "Salvar" |
| `secondary` | `color-gray-50` (#fafafa) | `color-navy-900` (#1a2332) | 1px solid `color-gray-200` (#e5e7eb) | Secondary actions: "Cancelar", "Voltar" |
| `outline` | transparent | `color-navy-900` (#1a2332) | 1px solid `color-navy-900` (#1a2332) | Tertiary actions, less emphasis |
| `ghost` | transparent | `color-navy-900` (#1a2332) | none | Inline actions, icon-only buttons, navigation links |
| `danger` | `#dc2626` | `color-white` (#ffffff) | none | Destructive actions: "Excluir Expedicao" |

#### 5.1.2 Sizes

| Size | Height | Padding (horizontal) | Font Size | Icon Size |
|---|---|---|---|---|
| `sm` | 32px (h-8) | 12px | 14px (font-small) | 16px |
| `md` | 40px (h-10) | 16px | 16px (font-body) | 20px |
| `lg` | 48px (h-12) | 24px | 18px | 24px |

#### 5.1.3 States

| State | Visual Change | Notes |
|---|---|---|
| **Default** | As defined per variant | Resting state |
| **Hover** | Primary: bg shifts to `color-amber-600` (#d97706). Secondary/Outline/Ghost: bg shifts to `color-gray-200` (#e5e7eb) at 50% opacity. Danger: bg shifts to #b91c1c. | Cursor: pointer. Transition: 150ms ease. |
| **Active (pressed)** | Scale 0.98 transform. Primary: bg #b45309. | Provides tactile feedback. |
| **Focused** | 2px solid ring in `color-amber-500` (#f59e0b) with 2px offset. | Visible on keyboard navigation (focus-visible). Ring must not be obscured by adjacent elements. |
| **Disabled** | Opacity 0.5. Cursor: not-allowed. | No hover/active transitions. aria-disabled="true". |
| **Loading** | Text replaced by a 20px spinner (animated). Button remains at same width to prevent layout shift. Disabled during loading. | aria-busy="true". aria-label must describe what is loading. Spinner respects prefers-reduced-motion (static icon fallback). |

#### 5.1.4 Icon Support

- Optional `leadingIcon` or `trailingIcon` slot.
- Icon is spaced 8px from text.
- Icon-only buttons: must have `aria-label` describing the action. Minimum 44x44px touch target even if visually smaller.

#### 5.1.5 Full Width

- Optional `fullWidth` prop renders button at 100% container width.
- Always full width on mobile (< 768px) for primary CTAs in wizard footers.

#### 5.1.6 Typography

- Button text uses Plus Jakarta Sans (matches DESIGN.md heading font), weight 600 (Semibold).
- Text is never truncated. If text does not fit, the button grows.
- Text-transform: none (no uppercase forced).

#### 5.1.7 Border Radius

- All sizes: 8px (`radius-buttons` from DESIGN.md).

#### 5.1.8 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Primary CTAs in footers are full-width. `sm` size buttons min-width 80px. Touch targets enforced at 44x44px minimum. |
| Tablet (768-1024px) | Buttons at intrinsic width. Button groups stack if total width exceeds container. |
| Desktop (> 1024px) | Buttons at intrinsic width. Button groups stay inline. |

#### 5.1.9 Accessibility

- **Role**: `<button>` element (never `<a>` styled as button unless navigating).
- **Keyboard**: Enter and Space activate the button. Tab moves focus to next interactive element.
- **Contrast**: Primary variant: white on #f59e0b = 3.0:1. This passes WCAG for large text (18px+ bold or 14px+ semibold at `md`/`lg` sizes). For `sm` size (14px semibold), this meets the 3:1 ratio for UI components. NOTE: If the text is regular weight 14px, an alternative with higher contrast must be used. The 600 weight at 14px qualifies as large text per WCAG definition (14pt bold = 18.67px, but semibold at 14px may not strictly qualify). **Open question: confirm with architect whether sm primary buttons need navy text instead of white for strict AA compliance.**
- **Danger contrast**: white on #dc2626 = 4.6:1 (passes AA).
- **Disabled**: `aria-disabled="true"` preferred over `disabled` attribute to keep buttons in tab order for discoverability.
- **Loading**: `aria-busy="true"`, `aria-label="Carregando..."` (i18n key: `button.loading`).

#### 5.1.10 i18n Considerations

- Button labels come from i18n keys, never hardcoded.
- Button width adapts to text length (Portuguese strings are typically 20-30% longer than English).
- No `text-overflow: ellipsis` on buttons.

#### 5.1.11 Acceptance Criteria

1. **AC-BTN-01**: All 5 variants render visually distinct and maintain contrast ratios at every size.
2. **AC-BTN-02**: Loading state replaces text with spinner, maintains button width, sets `aria-busy="true"`, and prevents double-click.
3. **AC-BTN-03**: Focus indicator (2px amber ring, 2px offset) is visible on keyboard navigation across all variants.
4. **AC-BTN-04**: Disabled state reduces opacity to 0.5, prevents interaction, and sets `aria-disabled="true"`.
5. **AC-BTN-05**: On mobile (< 768px), primary CTA buttons in wizard footers render full-width with minimum 48px height.

---

### 5.2 Input

**Purpose**: The primary form element for text entry. Inputs must be clearly labeled, provide helpful guidance, surface errors without blame, and be fully operable by keyboard and screen reader.

#### 5.2.1 Anatomy

From top to bottom:
1. **Label** (required, always visible) — 14px, semibold 600, `color-navy-900` (#1a2332)
2. **Required indicator** (when applicable) — asterisk (*) in `color-amber-500`, appended to label text
3. **Input field** — 48px height, 16px horizontal padding, `font-body` (16px), `color-navy-900` text
4. **Helper text OR Error message** (mutually exclusive) — 14px, regular 400
5. **Character count** (optional) — 14px, right-aligned, `color-gray-500`

#### 5.2.2 Visual Specification

| Property | Value |
|---|---|
| Height | 48px |
| Border | 1px solid `color-gray-200` (#e5e7eb) |
| Border radius | 8px (`radius-buttons`) |
| Background | `color-white` (#ffffff) |
| Text color | `color-navy-900` (#1a2332) |
| Placeholder color | `color-gray-500` (#6b7280) |
| Font size | 16px (prevents iOS zoom on focus) |
| Padding | 0 16px |

#### 5.2.3 States

| State | Visual Change |
|---|---|
| **Default** | 1px solid #e5e7eb border |
| **Hover** | Border shifts to `color-gray-500` (#6b7280). Transition 150ms ease. |
| **Focused** | Border: 2px solid `color-amber-500` (#f59e0b). Outer ring: 0 0 0 3px rgba(245,158,11,0.2). Padding adjusts -1px to compensate for 2px border (prevent layout shift). |
| **Filled** | Same as default, text in `color-navy-900`. |
| **Error** | Border: 2px solid #dc2626. Error message appears below in #dc2626, 14px. Error icon (exclamation circle) inline before message. Padding adjusts -1px. |
| **Disabled** | Opacity 0.5. Background: `color-gray-50` (#fafafa). Cursor: not-allowed. Text unselectable. |
| **Read-only** | No border change. Background: `color-gray-50`. Cursor: default. Text selectable. |

#### 5.2.4 Helper Text

- Position: Below input, 4px gap.
- Style: 14px, regular (400), `color-gray-500` (#6b7280).
- Usage: Provides guidance BEFORE the user interacts (e.g., "Use o formato DD/MM/AAAA").
- Hides when error message is displayed (same space, error takes priority).

#### 5.2.5 Error Messages

- Position: Below input (replacing helper text), 4px gap.
- Style: 14px, regular (400), #dc2626.
- Prefix: Inline error icon (16px, same red).
- Tone: Never blame the user. Always suggest a fix.
  - Bad: "Data invalida"
  - Good: "Essa data ja passou. Escolha uma data futura."
- Linked to input via `aria-describedby`.
- Announced by screen readers when error appears (aria-live="polite" on error container).

#### 5.2.6 Password Toggle

- Eye icon button inside the input, right-aligned, 44x44px touch target.
- Toggle between `type="password"` and `type="text"`.
- `aria-label`: "Mostrar senha" / "Ocultar senha" (toggles with state).
- Icon: eye-open when hidden, eye-closed when visible.

#### 5.2.7 Character Count

- Position: Below input, right-aligned, same line as helper/error text.
- Format: "12/100" (current/max).
- Color: `color-gray-500` by default. Shifts to `color-amber-500` at 90% capacity. Shifts to #dc2626 at 100%.
- `aria-live="polite"` announces when approaching limit.

#### 5.2.8 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Full width. Font-size 16px (mandatory to prevent iOS zoom). Labels stack above. |
| Tablet (768-1024px) | Can be placed in 2-column grid. Labels remain above. |
| Desktop (> 1024px) | Can be placed in multi-column layouts. Side labels optional but above-label preferred for consistency. |

#### 5.2.9 Accessibility

- **Label**: Every input has a visible `<label>` with `htmlFor` matching `id`. No placeholder-only labels.
- **Required**: `aria-required="true"` on required fields. Visual asterisk is decorative (also convey via label text for screen readers or via aria-required).
- **Error**: `aria-invalid="true"` when validation fails. Error message container has `id` linked via `aria-describedby`.
- **Helper**: Also linked via `aria-describedby` (combined with error id if both exist).
- **Keyboard**: Tab to focus, type to enter. No custom keyboard shortcuts.
- **Autocomplete**: Use `autocomplete` attribute where applicable (name, email, tel, etc.) for browser autofill.
- **Contrast**: Placeholder #6b7280 on #ffffff = 4.6:1 (passes AA). Label #1a2332 on #fafafa = 15.6:1 (passes AAA).

#### 5.2.10 i18n Considerations

- Labels, placeholders, helper text, and error messages all from i18n keys.
- Placeholder text must be descriptive, not just "Digite aqui" (e.g., "Ex: Paris, Franca").
- Character count format: "{current}/{max}" — numbers are universal, no translation needed.
- Right-to-left (RTL): not in scope for MVP but layout should not hardcode `text-align: left`.

#### 5.2.11 Acceptance Criteria

1. **AC-INP-01**: Every input has a visible label above it, associated via `htmlFor`/`id`, and required fields show asterisk + `aria-required="true"`.
2. **AC-INP-02**: Error state shows red border (2px, #dc2626), inline error message below, and sets `aria-invalid="true"` + `aria-describedby` pointing to the error message.
3. **AC-INP-03**: Focus state shows amber ring (2px solid #f59e0b + outer glow) with no layout shift.
4. **AC-INP-04**: Password toggle is keyboard-operable, has descriptive aria-label that changes with state, and the touch target is at least 44x44px.
5. **AC-INP-05**: Font-size is 16px minimum to prevent iOS auto-zoom on focus.

---

### 5.3 Card

**Purpose**: The primary container for grouping related content. Cards create visual hierarchy and separate information into scannable chunks. Used for expedition cards, phase summary cards, destination info cards, and more.

#### 5.3.1 Anatomy (Slots)

| Slot | Required | Description |
|---|---|---|
| **Header** | Optional | Title area. May include icon, title text, and optional action (e.g., menu, edit link). |
| **Body** | Required | Main content area. Free-form content. |
| **Footer** | Optional | Action area. Contains buttons, links, or metadata. Visually separated by 1px top border or spacing. |

#### 5.3.2 Variants

| Variant | Background | Border | Shadow | Use Case |
|---|---|---|---|---|
| `bordered` | `color-white` (#ffffff) | 1px solid `color-gray-200` (#e5e7eb) | none | Default, most cards. Low visual weight. |
| `elevated` | `color-white` (#ffffff) | none | `shadow-soft` (0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)) | Featured cards, dashboard cards, cards needing depth. |

#### 5.3.3 Visual Specification

| Property | Value |
|---|---|
| Border radius | 16px (`radius-cards` from DESIGN.md) |
| Padding | 32px (desktop) / 24px (mobile) |
| Header padding-bottom | 16px |
| Footer padding-top | 16px |
| Footer border-top | 1px solid `color-gray-200` (optional, when visually needed) |
| Min-height | none (content-driven) |
| Max-width | Determined by grid container |

#### 5.3.4 Interactive Cards (Clickable)

When the entire card is a clickable link (e.g., expedition card navigating to detail):

| State | Visual Change |
|---|---|
| **Default** | As per variant |
| **Hover** | Elevated: shadow shifts to `shadow-elevated`. Bordered: adds shadow-soft. Subtle scale(1.01) transform. Transition 200ms ease. Cursor: pointer. |
| **Active** | Scale(0.99). Shadow reduces slightly. |
| **Focused** | 2px solid `color-amber-500` ring with 2px offset, outside border-radius. |

- Interactive cards: rendered as `<a>` or use `role="link"` / `role="button"` as appropriate.
- If card contains nested interactive elements (buttons, links), use `stopPropagation` on nested elements to prevent card click. The card itself should use a stretched-link pattern (invisible overlay link) so the primary action covers the card, but nested elements override it.

#### 5.3.5 Left Accent Border

For status-indicating cards (expedition phase cards, summary cards):

| Status | Left Border |
|---|---|
| Completed | 4px solid `color-teal-600` (#0d9488) |
| Active/Current | 4px solid `color-amber-500` (#f59e0b) |
| Planned/Pending | 4px solid `color-gray-200` (#e5e7eb) |
| Overdue | 4px solid #dc2626 |

The left accent replaces the full border on the left side only. `border-left: 4px solid [color]` with `border-radius` on top-left and bottom-left only.

#### 5.3.6 Empty State

When a card represents a collection with no items:
- Center-aligned illustration or icon (muted, decorative).
- Message: descriptive, encouraging (e.g., "Nenhuma expedicao ainda. Que tal comecar uma?").
- Optional CTA button below message.
- `aria-label` on card describes the empty state for screen readers.

#### 5.3.7 Loading State

- Skeleton: 3 rectangular placeholder blocks mimicking header/body/footer layout.
- Background: `color-gray-200` (#e5e7eb) with subtle shimmer animation (left-to-right gradient pulse).
- Border radius on skeleton blocks matches content blocks.
- Animation respects `prefers-reduced-motion`: static gray blocks (no shimmer).
- `aria-busy="true"` on card. `aria-label="Carregando..."`.

#### 5.3.8 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Cards stack vertically, full width. Padding: 24px. |
| Tablet (768-1024px) | 2-column grid. Cards maintain 16px gap. |
| Desktop (> 1024px) | 2 or 3-column grid depending on context. Cards maintain 24px gap. |

#### 5.3.9 Accessibility

- Semantic HTML: `<article>` for standalone content cards, `<div>` for layout containers.
- Interactive cards: focus indicator visible (2px amber ring).
- Card header: use appropriate heading level (h2, h3) based on page hierarchy. Never skip heading levels.
- Images within cards: descriptive `alt` text.
- Status accent border: must not be the only status indicator. Always pair with text label or icon+text.

#### 5.3.10 i18n Considerations

- Card content flows naturally with variable-length text.
- No fixed-height constraints on text areas (content truncation only as last resort, with "Ver mais" link).
- Date/number formatting locale-aware.

#### 5.3.11 Acceptance Criteria

1. **AC-CRD-01**: Both `bordered` and `elevated` variants render correctly with 16px border-radius and appropriate padding (32px desktop, 24px mobile).
2. **AC-CRD-02**: Interactive cards show hover effect (shadow transition + subtle scale), focus ring on keyboard navigation, and correct cursor.
3. **AC-CRD-03**: Loading skeleton displays shimmer animation that respects `prefers-reduced-motion`, and sets `aria-busy="true"`.
4. **AC-CRD-04**: Left accent border correctly maps to 4 status colors and is always paired with a text/icon status indicator.
5. **AC-CRD-05**: Nested interactive elements within clickable cards are independently operable and do not trigger the card-level action.

---

### 5.4 Chip

**Purpose**: Compact interactive elements for selection (preferences), filtering (tags), and status display. Chips enable quick, low-effort choices especially suited for the preference and filter flows.

#### 5.4.1 Behavior Modes

| Mode | Interaction | Use Case |
|---|---|---|
| `selectable` | Toggle on/off on click. Can be radio (single) or checkbox (multi) semantics. | Preference categories, filter chips |
| `removable` | Click X button to remove. Not toggleable. | Applied tags, active filters |

#### 5.4.2 Visual Specification

| Property | Unselected (default) | Selected |
|---|---|---|
| Background | `color-white` (#ffffff) | `color-amber-500` (#f59e0b) at 10% opacity (#f59e0b1a) |
| Border | 1px solid `color-gray-200` (#e5e7eb) | 2px solid `color-amber-500` (#f59e0b) |
| Text color | `color-navy-900` (#1a2332) | `color-navy-900` (#1a2332) |
| Font weight | Regular (400) | Medium (500) |

#### 5.4.3 Sizes

| Size | Height | Padding (H) | Font Size | Icon Size |
|---|---|---|---|---|
| `sm` | 28px | 8px | 12px | 14px |
| `md` | 36px | 12px | 14px | 16px |

Minimum touch target: 44x44px on mobile. If chip height is less than 44px, add transparent padding to reach 44px touch area.

#### 5.4.4 Color Variants (for status/removable chips)

| Variant | Background | Text | Border |
|---|---|---|---|
| `default` | white | navy-900 | gray-200 |
| `primary` | amber-500 at 10% | navy-900 | amber-500 |
| `success` | teal-600 at 10% | navy-900 | teal-600 |
| `warning` | #f59e0b at 10% | navy-900 | #f59e0b |
| `danger` | #dc2626 at 10% | navy-900 | #dc2626 |

#### 5.4.5 States

| State | Visual Change |
|---|---|
| **Default** | As per variant/selection state |
| **Hover** | Background opacity increases. Unselected: bg shifts to gray-50. Selected: amber opacity increases to 20%. Transition 150ms. |
| **Active** | Scale 0.96 transform. |
| **Focused** | 2px solid `color-amber-500` ring, 2px offset. |
| **Disabled** | Opacity 0.5. No interaction. `aria-disabled="true"`. |

#### 5.4.6 Icon Support

- Optional leading icon (emoji or SVG), 16px for `md`, 14px for `sm`.
- Removable chips: trailing X icon (12px), spaced 4px from text.
- X icon has its own 44x44px touch target on mobile (transparent hit area extends beyond visible icon).

#### 5.4.7 Text Rules

- **Never truncate chip text.** Chips wrap to the next line if container is too narrow.
- Maximum text length: recommend 30 characters. Longer text should use a different pattern.
- Text: single line preferred but wrapping allowed for i18n flexibility.

#### 5.4.8 Border Radius

- All chips: 9999px (`radius-pills` from DESIGN.md). Full-round pill shape.

#### 5.4.9 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Chips wrap in a flex container. Touch targets enforced at 44x44px. `md` size recommended. |
| Tablet (768-1024px) | Chips in flex-wrap row. `md` or `sm` depending on density needs. |
| Desktop (> 1024px) | Chips in flex-wrap row. `sm` or `md` as appropriate. |

#### 5.4.10 Accessibility

- **Selectable (radio)**: Container has `role="radiogroup"` with `aria-label`. Each chip has `role="radio"` + `aria-checked`.
- **Selectable (checkbox)**: Container has `role="group"` with `aria-label`. Each chip has `role="checkbox"` + `aria-checked`.
- **Removable**: X button has `aria-label="Remover [chip label]"`.
- **Keyboard**: Arrow keys navigate between chips in a group. Space/Enter toggle selection. For removable chips, Delete or Backspace removes.
- **Contrast**: Navy-900 text on all backgrounds passes AA (checked: #1a2332 on #f59e0b1a background over white = effectively white bg + overlay, text remains high contrast).

#### 5.4.11 i18n Considerations

- Chip labels from i18n keys.
- No text truncation. Chip container uses flex-wrap to accommodate longer strings.
- Emoji prefixes (e.g., preference categories) are decorative and have `aria-hidden="true"`.

#### 5.4.12 Acceptance Criteria

1. **AC-CHP-01**: Selectable chips toggle visual state on click, and report correct `aria-checked` value.
2. **AC-CHP-02**: Removable chips have a visible X icon with 44x44px touch target and `aria-label="Remover [label]"`.
3. **AC-CHP-03**: Chip text is never truncated; chips wrap within their flex container.
4. **AC-CHP-04**: Keyboard navigation works: arrow keys move focus between chips in a group, Space/Enter toggles selection.
5. **AC-CHP-05**: All color variants maintain text contrast ratio >= 4.5:1 against their backgrounds.

---

### 5.5 Badge

**Purpose**: Non-interactive visual indicators that communicate status, rank, counts, or category. Badges are always informational and never actionable on their own (unless attached to an interactive parent).

#### 5.5.1 Sub-types

| Sub-type | Shape | Content | Use Case |
|---|---|---|---|
| **Status** | Pill (rounded-full) | Text label | Phase status, expedition status |
| **Rank** | Pill with icon | Rank name + icon | Gamification rank in header/profile |
| **PA** | Pill with icon | PA balance number | PA balance display in header |
| **Notification** | Circle/dot or number | Number (1-99) or empty dot | Unread notifications, pending items |

#### 5.5.2 Status Badge

| Status | Background | Text | Border |
|---|---|---|---|
| `success` | `color-teal-600` at 15% (#0d94881a + slight) | `#065f46` (dark teal) | none |
| `warning` | `color-amber-500` at 15% | `#92400e` (dark amber) | none |
| `error` | #dc2626 at 15% | `#991b1b` (dark red) | none |
| `info` | #3b82f6 at 15% | `#1e3a5f` (dark blue) | none |
| `neutral` | `color-gray-200` at 50% | `color-gray-500` | none |

Text contrast note: Using dark text on light tinted backgrounds ensures AA compliance. All combinations above exceed 4.5:1.

#### 5.5.3 Rank Badge

- Background: varies by rank tier (defined in gamification system).
- Contains: rank icon (16px) + rank name text.
- Font: 12px, semibold (600).
- Padding: 4px 10px.
- Border-radius: 9999px.
- The rank badge in the header displays as `role="status"` with `aria-label="Nivel: [rank name]"`.

#### 5.5.4 PA Badge

- Background: `color-amber-500` at 10%.
- Contains: sparkle icon (16px) + PA number.
- Font: 14px, semibold (600), `color-amber-600` (#d97706).
- Padding: 4px 12px.
- Border-radius: 9999px.
- `aria-label="Saldo: [number] PA"`.
- Number format: locale-aware (1.500 in pt-BR, 1,500 in en).

#### 5.5.5 Notification Badge

- **Dot only**: 8px circle, solid fill (#dc2626), positioned top-right of parent element with -4px offset.
- **Number**: 18px min-width circle, 12px font, white text on #dc2626, positioned top-right of parent.
- If count > 99, display "99+".
- `aria-label` on parent element includes notification count (e.g., "Notificacoes, 3 novas").

#### 5.5.6 Sizes

| Size | Height | Font Size | Padding (H) |
|---|---|---|---|
| `sm` | 20px | 12px | 6px |
| `md` | 24px | 14px | 8px |

#### 5.5.7 States

Badges are non-interactive by default. They do not have hover, active, or focus states of their own. When a badge is inside a focusable parent (e.g., a button, a link), the parent's focus indicator covers it.

Exception: If a badge needs to convey live-updating information (PA balance, notification count), the container should have `aria-live="polite"` so screen readers announce changes.

#### 5.5.8 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Badges shrink to `sm` size. Notification dot may replace number badge if space is constrained. PA badge may show number only (no icon). |
| Tablet (768-1024px) | `sm` or `md` depending on context. |
| Desktop (> 1024px) | `md` size preferred. Full content visible. |

#### 5.5.9 Accessibility

- **Role**: `role="status"` for live-updating badges (PA, notification count). Decorative badges: no role needed if adjacent text conveys the same info.
- **Color**: Status badges must always include a text label. Color alone does not convey status.
- **Live region**: `aria-live="polite"` on PA and notification badges.
- **Contrast**: All text/background combinations verified above 4.5:1.

#### 5.5.10 i18n Considerations

- Status label text from i18n keys.
- PA number formatted by locale.
- Notification count: "99+" is universal.

#### 5.5.11 Acceptance Criteria

1. **AC-BDG-01**: All 5 status variants render with correct tinted background and dark text, maintaining 4.5:1+ contrast.
2. **AC-BDG-02**: PA badge displays locale-formatted number with sparkle icon and `aria-label` including "PA".
3. **AC-BDG-03**: Notification badge displays correct count (capped at "99+"), and parent element's `aria-label` includes the count.
4. **AC-BDG-04**: Live-updating badges use `aria-live="polite"` to announce changes to screen readers.
5. **AC-BDG-05**: On mobile, badges gracefully degrade to `sm` size without losing readability.

---

### 5.6 PhaseProgress

**Purpose**: Visualizes the traveler's progression through the 6 expedition phases. This is a central navigation and orientation element that appears in wizard headers and dashboard cards. It answers "Where am I?" and "What's left?" at a glance.

#### 5.6.1 Structure

- 6 segments arranged horizontally, connected by lines.
- Each segment: circle indicator (24px diameter on desktop, 20px on mobile) + connecting line to next segment.
- Label below each segment: phase short name.

#### 5.6.2 Segment States

| State | Circle | Connecting Line (to next) | Label Color | Behavior |
|---|---|---|---|---|
| **Completed** | Solid `color-teal-600` (#0d9488), white checkmark icon inside | Solid `color-teal-600` | `color-navy-900` (#1a2332) | Clickable. Navigates to phase for editing. Cursor: pointer. |
| **Active (current)** | Solid `color-amber-500` (#f59e0b), pulsing ring animation | Dashed `color-gray-200` | `color-navy-900`, font-weight 600 | Not clickable (already here). Indicated by subtle pulsing glow. |
| **Pending** | Outlined, 2px solid `color-gray-200` (#e5e7eb), empty inside | Dashed `color-gray-200` | `color-gray-500` (#6b7280) | Not clickable. Visually muted. |
| **Locked** | Outlined, 2px dashed `color-gray-200`, lock icon (12px, gray-500) inside | Dashed `color-gray-200` at 50% opacity | `color-gray-500` at 50% opacity | Not clickable. For future phases not yet unlockable. |

#### 5.6.3 Animation

- **Completion fill**: When a phase completes, the connecting line from previous to current fills with teal from left to right, 300ms ease-out.
- **Active pulse**: Current phase circle has a subtle scale pulse (1.0 to 1.1 and back), 1200ms, infinite, ease-in-out. Opacity of outer ring pulses 0.3 to 0.6.
- **prefers-reduced-motion**: No pulse, no fill animation. States change instantly. Active phase indicated by a static 3px ring instead of animation.

#### 5.6.4 Labels

- Position: Below each segment circle, centered, 4px gap.
- Desktop (>= 640px): Full phase name (e.g., "A Inspiracao", "O Perfil").
- Mobile (< 640px): Short name (e.g., "P1", "P2") or just the number.
- Font: 11px, regular (400) for UnifiedProgressBar. 9px for dashboard variant.
- **Contrast fix**: Completed phase labels use `#059669` (not #0d9488) for small text to ensure 4.5:1 on white/gray-50 backgrounds.

#### 5.6.5 Clickable Completed Segments

- Only completed segments are interactive.
- Click navigates to that phase in edit mode (per SPEC-UX-017 edit mode pattern).
- Focus: 2px amber ring around the circle.
- `aria-label="Fase [N]: [name] — Concluida. Clique para revisar."` (i18n key).
- `role="link"` since it navigates.

#### 5.6.6 Dashboard Variant

On dashboard cards, a compact variant is used:
- Smaller circles (16px diameter).
- No labels (tooltip on hover/focus instead).
- Connecting lines: 2px height.
- Non-interactive (display only, `role="img"` with `aria-label` describing overall progress).

#### 5.6.7 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Horizontal scroll if needed (rare with 6 compact items). Short labels. Circles 20px. Touch targets padded to 44x44px with transparent hit area. |
| Tablet (768-1024px) | Full horizontal layout. Full labels. Circles 24px. |
| Desktop (> 1024px) | Full horizontal layout. Full labels. Circles 24px. Generous spacing between segments. |

#### 5.6.8 Accessibility

- **Container**: `role="navigation"` with `aria-label="Progresso da expedicao"`.
- **Segments**: Each segment is either `role="link"` (completed, clickable) or `role="img"` (non-interactive) with descriptive `aria-label`.
- **Active phase**: `aria-current="step"`.
- **Progress announcement**: On phase completion, `aria-live="polite"` region announces "Fase [N] concluida. Avancando para Fase [N+1]."
- **Keyboard**: Tab moves between clickable (completed) segments. Enter/Space activates navigation. Non-interactive segments are skipped in tab order.
- **Color**: Status is never conveyed by color alone. Each state has a distinct visual indicator: checkmark (completed), pulse (active), empty circle (pending), lock icon (locked).

#### 5.6.9 i18n Considerations

- Phase names from i18n keys (both full and short variants).
- `aria-label` strings from i18n keys.
- Number formatting: phase numbers are universal.

#### 5.6.10 Acceptance Criteria

1. **AC-PGS-01**: All 4 segment states (completed, active, pending, locked) are visually distinct without relying on color alone.
2. **AC-PGS-02**: Completed segments are keyboard-navigable, clickable, and have descriptive `aria-label` including phase name and "Concluida".
3. **AC-PGS-03**: Active segment shows pulse animation that degrades to static ring when `prefers-reduced-motion` is active.
4. **AC-PGS-04**: Completion animation (line fill) plays in 300ms and respects reduced motion preference.
5. **AC-PGS-05**: On mobile, all 6 segments fit horizontally with short labels, and touch targets meet 44x44px minimum.

---

### 5.7 StepperInput

**Purpose**: A numeric input with increment/decrement buttons for selecting quantities with defined constraints. Primary use case: passenger counts (adults, children, infants) in the expedition planning flow.

#### 5.7.1 Anatomy

From top to bottom:
1. **Label** (required) — 14px, semibold (600), `color-navy-900`.
2. **Description** (optional) — 14px, regular (400), `color-gray-500`. Contextual hint (e.g., "12 anos ou mais" for adults).
3. **Stepper control**: horizontal row of [-] [value] [+].
4. **Constraint hint** (optional) — 12px, `color-gray-500`. Shows limits (e.g., "Maximo: 9").

#### 5.7.2 Visual Specification

| Element | Specification |
|---|---|
| Container width | 160px (fixed) or flex within parent |
| Button (- and +) | 40px x 40px circle. Background: `color-gray-50` (#fafafa). Border: 1px solid `color-gray-200`. Text: 20px, `color-navy-900`. Border-radius: 9999px (circle). |
| Value display | 48px wide, centered. Font: 24px, semibold (600), `color-navy-900`. No border (read-only visual). |
| Row gap | 8px between button and value |
| Total row height | 40px |

#### 5.7.3 States

| State | Visual Change |
|---|---|
| **Default** | Buttons in default style. Value shown. |
| **Hover (button)** | Background shifts to `color-gray-200`. Transition 150ms. Cursor: pointer. |
| **Active (button)** | Background: `color-amber-500` at 20%. Scale 0.95. |
| **Focused (button)** | 2px solid `color-amber-500` ring, 2px offset. |
| **At minimum** | Minus (-) button: opacity 0.3, `aria-disabled="true"`, cursor: not-allowed. |
| **At maximum** | Plus (+) button: opacity 0.3, `aria-disabled="true"`, cursor: not-allowed. |
| **Disabled (whole)** | Entire stepper at opacity 0.5. Both buttons non-interactive. Value grayed out. |

#### 5.7.4 Constraints

| Constraint | Behavior |
|---|---|
| `min` | Value cannot go below. Minus button disables at min. |
| `max` | Value cannot exceed. Plus button disables at max. |
| `step` | Increment/decrement amount (default: 1). |
| Cross-field | Infants cannot exceed adults. Total passengers cannot exceed global max (20). These are validated at the form level, not within the stepper component itself. |

#### 5.7.5 Keyboard Interaction

| Key | Action |
|---|---|
| Tab | Moves focus to the stepper (focuses the value area or the first button, depending on implementation). |
| Arrow Up | Increment by step. |
| Arrow Down | Decrement by step. |
| Home | Jump to min value. |
| End | Jump to max value. |
| Direct number input | If the value area is focused and editable, user can type a number directly. Value is clamped to min/max on blur. |

#### 5.7.6 Value Change Feedback

- Value updates immediately on click/keypress (no debounce needed for integer steps).
- Announce to screen readers: `aria-live="assertive"` on value display so each change is read (e.g., "2 adultos").
- Brief scale animation on value text (1.0 to 1.1 to 1.0, 200ms) on change. Respects prefers-reduced-motion.

#### 5.7.7 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Buttons are 44x44px (larger touch target). Value font stays 24px. Full-width within its column. Each stepper takes full row in a stacked form. |
| Tablet (768-1024px) | Steppers can be side-by-side (2 per row). Buttons 40x40px. |
| Desktop (> 1024px) | Steppers inline in a row (3 per row for adults/children/infants). Buttons 40x40px. |

#### 5.7.8 Accessibility

- **Role**: `role="spinbutton"` on the value element with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`.
- **Label**: Associated via `aria-labelledby` pointing to the label element.
- **Buttons**: Minus has `aria-label="Diminuir [label]"`. Plus has `aria-label="Aumentar [label]"`.
- **At limits**: Disabled buttons have `aria-disabled="true"`. Screen reader announcement: "Valor minimo atingido" / "Valor maximo atingido".
- **Valuetext**: `aria-valuetext="[N] [label plural]"` (e.g., "2 adultos", "1 crianca"). Localized pluralization.
- **Contrast**: Button borders (gray-200 on white = 1.4:1) are supplemented by the circular shape and +/- text as visual affordance. The +/- text (#1a2332) on gray-50 = 15.6:1 (passes AAA).

#### 5.7.9 i18n Considerations

- Label, description, constraint hint from i18n keys.
- `aria-valuetext` must handle pluralization rules (Portuguese: "1 adulto" / "2 adultos", "1 crianca" / "2 criancas", "1 bebe" / "2 bebes").
- Number display: universal digits, no locale formatting needed for small integers.

#### 5.7.10 Acceptance Criteria

1. **AC-STP-01**: Plus and minus buttons correctly increment/decrement the value and disable at min/max with `aria-disabled="true"`.
2. **AC-STP-02**: Keyboard navigation (Arrow Up/Down, Home, End) works on the stepper and clamps values to min/max.
3. **AC-STP-03**: `role="spinbutton"` is set with correct `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` (localized plural).
4. **AC-STP-04**: Value changes are announced via `aria-live` region.
5. **AC-STP-05**: On mobile, touch targets for plus/minus buttons are at least 44x44px.

---

## 6. Cross-Component Accessibility Requirements (MANDATORY)

These apply to ALL 7 components uniformly:

- **WCAG Level**: AA minimum, non-negotiable.
- **Keyboard Navigation**:
  - [ ] All interactive elements reachable via Tab.
  - [ ] Tab order follows logical reading order.
  - [ ] Focus indicator visible on all interactive elements (2px solid `color-amber-500`, 2px offset).
  - [ ] No keyboard traps.
- **Screen Reader**:
  - [ ] All form inputs have visible, associated labels.
  - [ ] Error messages linked to fields via `aria-describedby`.
  - [ ] Dynamic content changes announced via `aria-live` regions.
  - [ ] Decorative elements hidden from assistive technology (`aria-hidden="true"`).
- **Color & Contrast**:
  - [ ] Text contrast ratio >= 4.5:1 for normal text.
  - [ ] UI component contrast ratio >= 3:1.
  - [ ] No information conveyed by color alone.
- **Motion**:
  - [ ] All animations respect `prefers-reduced-motion`.
- **Touch**:
  - [ ] Touch targets >= 44x44px on mobile.
  - [ ] Spacing between touch targets >= 8px.

## 7. Interaction Patterns (Cross-Component)

- **Transitions**: All state changes use `transition: 150ms ease` for color/opacity, `200ms ease` for transform. Respects `prefers-reduced-motion: reduce` (instant transitions).
- **Loading feedback**: Skeleton shimmer for content loading, spinner for action loading. Never leave the user without visual feedback for more than 100ms.
- **Error feedback**: Inline (below the field/component), never modal. Red border + message. Never blame the user.
- **Success feedback**: Teal accent, checkmark icon, brief animation. Toast for transient confirmations.

## 8. Constraints

- All components are gated behind `NEXT_PUBLIC_DESIGN_V2=false`. When the flag is off, existing components render unchanged.
- Typography: DESIGN.md specifies Plus Jakarta Sans. This requires a font load. If not yet available, system-ui fallback in the same weight/size.
- Token values come from DESIGN.md, not from the current ux-patterns.md. This spec uses the V2 token set.
- No external CDN dependencies for fonts or icons in production. Fonts must be self-hosted or use next/font.

## 9. Prototype

- [ ] Prototype required: No (component library, not a feature flow)
- Individual components will be prototyped as part of the Storybook/component development process.
- Storybook stories serve as the living prototype for each component.

## 10. Open Questions

- [ ] **OQ-047-01**: Button `sm` primary variant (14px semibold white on amber-500): Does 14px semibold qualify as "large text" under WCAG? If not, `sm` primary buttons need navy text. — Needs: architect + accessibility review.
- [ ] **OQ-047-02**: Plus Jakarta Sans font loading strategy: next/font with self-hosted files or Google Fonts variable font? — Needs: architect + devops.
- [ ] **OQ-047-03**: Should the PhaseProgress dashboard variant be completely non-interactive (current recommendation) or allow click-to-navigate? — Needs: product-owner.

---

> **Spec Status**: Draft
> Ready for: Architect (pending open questions, but none are blocking for component scaffolding)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-23 | ux-designer | Initial draft — 7 component specifications |
