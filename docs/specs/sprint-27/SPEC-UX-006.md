# SPEC-UX-006: Autocomplete FINAL Fix — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: N/A (bug fix — recurring 4+ sprints)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

The traveler wants to type a destination name and quickly select the correct city from a dropdown that is always fully visible and never clipped by parent containers.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Must find dream destination quickly; broken autocomplete causes abandonment |
| `@leisure-family` | Often searching less common destinations; needs clear city/country disambiguation |
| `@business-traveler` | Speed is critical; dropdown must appear instantly and be keyboard-navigable |
| `@group-organizer` | Creates multiple expeditions; encounters this bug repeatedly |

## 3. Root Cause Analysis

The current implementation renders the dropdown `<ul>` as a child of a `<div class="relative">` container. This container is nested inside wizard forms that have `overflow: hidden` or `overflow: auto` set on ancestor elements (e.g., the wizard card, scrollable phase containers). Despite `z-50` on the dropdown, CSS stacking context rules mean the dropdown is clipped by the nearest ancestor with `overflow` constraints.

**This has failed for 4+ sprints because prior fixes only adjusted z-index or background opacity, without addressing the fundamental stacking context issue.**

### The Fix: Portal-Based Rendering

The dropdown listbox MUST render via a portal pattern — attached to `document.body` (or a designated portal root) rather than inside the component's DOM tree. This completely escapes all parent `overflow` and `transform` stacking contexts.

**Recommended approach**: Replace the custom combobox with the shadcn/ui Combobox pattern, which uses Radix Popover internally. Radix Popover renders content through a portal by default, includes collision detection (the dropdown repositions if it would be cut off by the viewport), and provides full WAI-ARIA combobox semantics out of the box.

**Alternative approach** (if the team prefers to keep the custom implementation): Use `createPortal` from React DOM to render the `<ul role="listbox">` into `document.body`, then position it absolutely using the input element's `getBoundingClientRect()`. This requires manual repositioning on scroll and resize.

**Why not Downshift or cmdk?**
- Downshift is a solid WAI-ARIA compliant option but adds a new dependency when shadcn/ui's Combobox (already in the project's design system) solves the same problem with portal rendering built in.
- cmdk is optimized for command palettes, not destination search with async API results. Its filtering model assumes a static list.

### Recommendation

Use the shadcn/ui Combobox (Popover + Command) pattern. It is already part of the project's component library ecosystem, renders via Radix portal, handles collision detection, and provides complete keyboard/screen reader semantics.

## 4. User Flow

### Happy Path

1. Traveler focuses the destination input field
2. Traveler types at least 2 characters
3. After 400ms debounce, a loading spinner appears in the input's trailing area
4. API results arrive; dropdown appears BELOW the input (or ABOVE if near viewport bottom)
5. Dropdown shows up to 8 results in two-line format
6. Traveler selects via click, Enter key, or arrow keys + Enter
7. Input updates to "City, Country" format; dropdown closes

```
[Traveler focuses input]
    |
    v
[Types >= 2 chars] --< 2 chars---> [No dropdown, no action]
    |
    v
[400ms debounce fires]
    |
    v
[Loading spinner in input] --network error--> [No dropdown; hint: "Nao foi possivel buscar. Tente novamente."]
    |
    v
[Results arrive]
    |
   +-- 0 results --> [Inline hint below input: "Nenhum resultado. Tente outro nome ou verifique a grafia."]
    |
   +-- 1+ results --> [Portal dropdown appears with results]
                          |
                         +-- Click/Enter on result --> [Input = "City, Country"; dropdown closes; onSelect fires]
                          |
                         +-- Escape --> [Dropdown closes; input retains typed text]
                          |
                         +-- Click outside --> [Dropdown closes]
                          |
                         +-- Tab away --> [Dropdown closes; focus moves to next field]
```

### Edge Cases

- **Viewport bottom**: Dropdown flips to render ABOVE the input (collision detection built into Radix Popover)
- **Scrolling while open**: Dropdown repositions with the input (Radix handles this)
- **Rapid typing**: Each keystroke resets the 400ms debounce; only the final query fires
- **Slow network**: Spinner stays visible; previous results do not flash. New results replace old ones atomically.
- **Result with no city name**: Falls back to `displayName` on line 1, `country` on line 2
- **Very long city/state names**: Text truncates with ellipsis; full name in `aria-label`

## 5. Screen Descriptions

### Component: DestinationAutocomplete (redesigned)

**Purpose**: Allow the traveler to search and select a geographic destination with confidence that they have the right city.

**Layout**:
- Text input field, full width of its parent form
- Trailing icon area: magnifying glass icon (idle) or spinner (loading)
- Portal-rendered dropdown listbox positioned below (or above) the input

**Content — Dropdown Result Item**:
- **Line 1**: City name, bold, 14px, foreground color
- **Line 2**: State, Country — 12px, muted foreground color
- Each item: minimum 44px height (touch target), 16px horizontal padding, 12px vertical padding
- Active/highlighted item: accent background color
- Maximum 8 visible results; scrollable if more

**Interactive Elements**:
- **Input field**: `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
- **Dropdown**: `role="listbox"`, rendered via portal, positioned using reference element coordinates
- **Each result**: `role="option"`, `aria-selected` for active item, `aria-label` with full "City, State, Country"
- **Keyboard**: ArrowDown/ArrowUp navigate, Enter selects, Escape closes, Home/End jump to first/last

**Empty State** (no results):
- Text below input (NOT in the dropdown): "Nenhum resultado encontrado. Tente outro nome ou verifique a grafia."
- `aria-live="polite"` so screen readers announce it

**Loading State**:
- Spinner icon replaces magnifying glass in input trailing area
- Screen reader: `<span role="status" class="sr-only">` with "Buscando destinos..."
- No skeleton in dropdown; dropdown only appears when results arrive

**Error State** (network failure):
- Text below input: "Nao foi possivel buscar destinos. Verifique sua conexao e tente novamente."
- `aria-live="polite"`

### Dark Theme

- Input: `bg-background`, `border-border`, `text-foreground` (existing theme tokens)
- Dropdown: `bg-popover` (opaque, not transparent), `border-border`, `shadow-lg`
- Active item: `bg-accent`, `text-accent-foreground`
- CRITICAL: Dropdown background MUST be fully opaque. Previous bug had semi-transparent background revealing content beneath.

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Input full-width. Dropdown full-width of input. Min-height 44px per item. Dropdown max-height 50vh to avoid covering keyboard on mobile browsers. |
| Tablet (768-1024px) | Same as mobile. |
| Desktop (> 1024px) | Same behavior. Dropdown max-height 320px (approx 7 items). |

## 6. Interaction Patterns

- **Debounce**: 400ms after last keystroke before API call fires
- **Dropdown appearance**: Instant (no animation). Previous SPEC-UX-001 specified no animation on dropdown, and this still applies. Animation on a frequently-appearing element adds latency feel.
- **Dropdown dismissal**: Instant on Escape, click outside, or Tab away
- **Selection**: Input updates immediately, dropdown closes immediately
- **Focus management**: After selection, focus remains on the input field (traveler can Tab to next field)

### Motion

- No animation on dropdown open/close (instant appearance avoids perceived lag)
- Spinner: CSS `animate-spin` with `motion-reduce:animate-none`

## 7. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [x] Input reachable via Tab
  - [x] ArrowDown opens dropdown if results exist
  - [x] ArrowUp/ArrowDown navigate results
  - [x] Enter selects active result
  - [x] Escape closes dropdown, returns focus to input
  - [x] Tab closes dropdown and moves focus forward
  - [x] Home/End jump to first/last result
  - [x] No keyboard traps
- **Screen Reader**:
  - [x] Input has visible label (provided by parent form)
  - [x] `role="combobox"` on input
  - [x] `aria-expanded="true|false"` reflects dropdown state
  - [x] `aria-activedescendant` points to active option ID
  - [x] Each option has `aria-label` with full "City, State, Country"
  - [x] No-results message announced via `aria-live="polite"`
  - [x] Loading state announced via `role="status"` live region
  - [x] Result count announced: "N resultados encontrados" via live region
- **Color & Contrast**:
  - [x] Dropdown bg fully opaque (no transparency issues)
  - [x] Line 1 (city): foreground on popover bg >= 4.5:1
  - [x] Line 2 (state/country): muted-foreground on popover bg >= 4.5:1
  - [x] Active item: accent-foreground on accent >= 4.5:1
- **Touch**:
  - [x] Each dropdown item >= 44px height
  - [x] Items have >= 0px gap (border separator sufficient)

## 8. Content & Copy

### Key Labels

| Key | PT-BR | EN |
|---|---|---|
| `destination.searching` | Buscando destinos... | Searching destinations... |
| `destination.noResults` | Nenhum resultado encontrado. Tente outro nome ou verifique a grafia. | No results found. Try another name or check your spelling. |
| `destination.networkError` | Nao foi possivel buscar destinos. Verifique sua conexao e tente novamente. | Could not search destinations. Check your connection and try again. |
| `destination.resultsCount` | {count} resultados encontrados | {count} results found |
| `destination.placeholder` | Para onde voce quer ir? | Where do you want to go? |

### Tone of Voice

- Friendly, never technical. The traveler should feel guided, not corrected.
- No-results message offers actionable help (try another name, check spelling).

## 9. Constraints (from prior sprints)

- API endpoint: `/api/destinations/search?q=...&locale=...` (Nominatim proxy with Redis cache + rate limit)
- API returns `DestinationResult` with `city`, `state`, `country`, `countryCode`, `lat`, `lon`, `displayName`, `formattedName`
- Debounce at 400ms (established in Sprint 11)
- Maximum 8 results per query (server-side limit)
- The component is used in Phase 1 wizard and potentially in trip edit flow

## 10. Prototype

- [ ] Prototype required: No (this is a behavior fix, not a new visual design)
- The two-line format and visual styling were already specified in SPEC-UX-001 (Sprint 26) and are currently implemented correctly — the only issue is the dropdown being clipped.

## 11. Open Questions

- [x] Use shadcn/ui Combobox (Radix Popover) or keep custom with `createPortal`? **Recommendation: shadcn/ui Combobox** for portal rendering, collision detection, and WAI-ARIA compliance out of the box.
- [ ] Should the dropdown width match the input exactly, or be allowed to be wider? **Recommendation: match input width** via CSS `--radix-popover-trigger-width`.

## 12. Patterns Used

- **FormField** (label + input + error + hint) from `docs/ux-patterns.md`
- **New pattern: PortalCombobox** — combobox with portal-rendered listbox (to be added to ux-patterns)

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft — FINAL fix for recurring autocomplete clipping |
