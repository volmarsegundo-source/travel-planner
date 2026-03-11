# SPEC-UX-001: Autocomplete Redesign -- UX Specification

**Version**: 1.1.0
**Status**: Approved
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: SPEC-PROD-001 (Phase 1 data collection)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

Quickly find and select a precise destination or origin city from a searchable dropdown that clearly shows City, State/Region, and Country -- without misreading results due to transparent backgrounds or ambiguous place names.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Needs to distinguish between similarly-named cities (e.g., "Salvador, Bahia, Brasil" vs "Salvador, El Salvador") for dream-trip planning |
| `@leisure-family` | Searches for family vacation destinations; needs confident selection to avoid booking the wrong place |
| `@business-traveler` | Speed is essential -- clear formatting reduces time spent scanning results |
| `@bleisure` | May search lesser-known cities; structured results reduce confusion |
| `@group-organizer` | Often enters destinations on behalf of others; clarity prevents costly mistakes |

## 3. User Flow

### Happy Path

1. User focuses the destination (or origin) input field
2. User types at least 2 characters
3. System debounces (400ms) then fetches results from the API
4. Dropdown appears with opaque background, showing formatted results
5. User scans results -- each result shows City (bold), State/Region, Country on structured lines
6. User selects a result via click, tap, or Enter key
7. Input field populates with "City, State/Region, Country" format
8. Dropdown closes

```
[User focuses input]
    |
    v
[Types >= 2 chars] --< 2 chars---> [No dropdown, no fetch]
    |
    v
[400ms debounce]
    |
    v
[API fetch starts] --> [Loading spinner appears in input]
    |
    v
[Results returned?]
   |           |
   YES         NO / Error
   |           |
   v           v
[Dropdown opens]   [No dropdown; if error, show inline hint]
   |
   v
[User selects result]
   |
   v
[Input populated, dropdown closes]
```

### Alternative Paths

- **User keeps typing after results appear**: New debounce triggers, new results replace old ones. Active index resets to -1.
- **User clicks outside the dropdown**: Dropdown closes, typed text remains in the input. No selection is made.
- **User presses Escape**: Dropdown closes, typed text remains.
- **User clears the input**: Dropdown closes, results cleared.

### Error States

- **Network unavailable**: Dropdown does not appear. No error message shown inline (the input still functions as free text). If the user submits with free text, server-side validation handles it.
- **API returns empty results**: Dropdown does not appear. A subtle hint text appears below the input: "Nenhum resultado encontrado. Tente outro nome." / "No results found. Try a different name."
- **API error (500, timeout)**: Same as empty results -- silent failure, input remains functional as free text. The spinner disappears after the failed fetch.

### Edge Cases

- **Very long city names**: Results text wraps within the dropdown item. No truncation -- full names are always visible.
- **Duplicate-looking results**: The structured format (City + State + Country) disambiguates. E.g., "Portland, Oregon, Estados Unidos" vs "Portland, Maine, Estados Unidos".
- **Non-Latin scripts**: The dropdown must handle Arabic, Cyrillic, CJK characters without layout breakage. Text direction follows the content.
- **Returning user**: If the field already has a value (editing a trip), the dropdown does not open until the user modifies the text.

## 4. Screen Descriptions

### Screen 1: Autocomplete Input + Dropdown

**Purpose**: Allow the traveler to search for and select a geographic location with full confidence in what they are selecting.

**Layout**:
- Standard text input with the same styling as other form fields in Phase 1
- Loading spinner (small, 16x16px) appears inside the input, right-aligned, during fetch
- Dropdown appears directly below the input, full width of the input, with:
  - Opaque background (card surface color)
  - Visible border
  - Elevated shadow (medium elevation)
  - High z-index to float above all other content
  - Max height of 300px (approximately 5 results visible), scrollable if more

**Content -- Dropdown Result Item**:
Each result item displays structured location information in a two-line layout:

```
Line 1 (primary):   City Name              [bold, foreground color, 14px]
Line 2 (secondary): State/Region, Country  [regular, muted color, 12px]
```

If `city` is null in the API response, fall back to `displayName` on line 1 and `country` on line 2. If `state` is null, show only `country` on line 2.

**Interactive Elements**:

- **Input field**:
  - Default: standard border, placeholder text
  - Focus: ring highlight (existing pattern), cursor in field
  - Disabled: reduced opacity (existing pattern)
  - With value: shows selected or typed text

- **Dropdown result item**:
  - Default: opaque card background, no highlight
  - Hover / keyboard-active: highlighted background (accent/muted), subtle left border accent
  - Focus (via keyboard ArrowDown/Up): same as hover visual, item scrolled into view if needed
  - Selected (Enter/click): populates input, dropdown closes

- **Loading spinner**:
  - Visible only during API fetch
  - Uses existing spin animation (animate-spin)
  - Color: muted foreground, matching the ring color

- **No-results hint**:
  - Appears below the input (not inside the dropdown) when API returns 0 results
  - Subtle text, muted color, 12px
  - Disappears when user types again

**Empty State**: No dropdown shown. Input works as plain text field with placeholder.

**Loading State**: Small spinner inside the input (right side). Dropdown remains closed until results arrive. If a previous set of results was open, they remain visible while new results load (optimistic UX).

**Error State**: No visible error for API failures -- the component degrades gracefully to free-text input. The no-results hint only shows on explicit empty results, not on errors.

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Dropdown is full-width of the input. Result items have generous vertical padding (12px) for touch targets (min 44px height per item). Font sizes remain the same. Dropdown max-height may be reduced to 240px to keep it within viewport. |
| Tablet (768-1024px) | Same as mobile layout. |
| Desktop (> 1024px) | Standard dropdown. Result items have 8px vertical padding. Hover states fully visible. |

## 5. Interaction Patterns

- **Dropdown opening**: Instant appearance (no animation). Reduced-motion users are unaffected since there is no animation to begin with.
- **Loading feedback**: Inline spinner in the input during fetch. No skeleton in the dropdown -- results appear atomically.
- **Selection feedback**: Input value updates immediately. Dropdown closes immediately.
- **No-results feedback**: Inline hint below input, appears after fetch completes with 0 results.
- **Progressive disclosure**: Dropdown only appears when there are results. No-results hint only appears on empty results (not preemptively).

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [x] Input reachable via Tab (existing)
  - [x] ArrowDown/ArrowUp navigates results (existing)
  - [x] Enter selects active result (existing)
  - [x] Escape closes dropdown (existing)
  - [ ] Ensure active result scrolls into view when navigating with arrows in a long list
  - [x] No keyboard traps (existing)
- **Screen Reader**:
  - [x] Input has `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` (existing)
  - [x] Each result has `role="option"` and `id` for `aria-activedescendant` (existing)
  - [ ] Each result option must have an `aria-label` with the full structured text: "City, State, Country" -- not just the display text, to ensure screen readers announce the full location
  - [ ] No-results hint must use `role="status"` and `aria-live="polite"` so screen readers announce it
  - [ ] Loading state should have an `aria-busy="true"` on the input or a visually hidden live region announcing "Buscando..." / "Searching..."
- **Color & Contrast**:
  - [ ] Primary text (city name) on dropdown background: must pass 4.5:1
  - [ ] Secondary text (state, country) on dropdown background: must pass 4.5:1
  - [ ] Active/highlighted result must have sufficient contrast in both light and dark themes
  - [ ] No information conveyed by color alone (the two-line structure provides hierarchy, not just color)
- **Motion**:
  - [x] Spinner uses `animate-spin` which is CSS-based; should respect `prefers-reduced-motion` by stopping the spin (existing `motion-safe:` or `motion-reduce:` prefix needed)
- **Touch**:
  - [ ] Each dropdown result item must be at least 44px tall on mobile (currently `py-2` = 32px on text-sm, insufficient)
  - [ ] Adequate spacing between result items (border or gap of at least 1px)

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `destination_placeholder` | Buscar cidade... (ex: Salvador, Paris) | Search city... (e.g., Salvador, Paris) |
| `origin_placeholder` | Cidade de origem... (ex: Sao Paulo) | Origin city... (e.g., Sao Paulo) |
| `no_results` | Nenhum resultado encontrado. Tente outro nome. | No results found. Try a different name. |
| `loading_sr` | Buscando destinos... | Searching destinations... |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| No results | Nenhum resultado encontrado. Tente outro nome. | No results found. Try a different name. |

### Tone of Voice

- Friendly, brief, helpful. The placeholder should inspire by suggesting real city names.
- No-results message is empathetic -- suggests an action ("try another name") rather than just stating failure.

## 8. Constraints (from Product Spec)

- The autocomplete is used in Phase 1 for both destination and origin fields (SPEC-PROD-001, Phase Data Ownership table)
- The API endpoint is `/api/destinations/search` which proxies Nominatim with Redis cache + rate limiting
- The API response includes `displayName`, `shortName`, `city`, `state`, `country`, `countryCode`, `lat`, `lon`, and the new `formattedName` field
- **Stakeholder decision (Q4):** The API will return a pre-formatted `formattedName` field ("City, State, Country") assembled server-side from `city`, `state`, and `country` fields. This resolves the `shortName` issue where city names were sometimes omitted. The client uses `formattedName` directly for display and selection.

## 9. Prototype

- [ ] Prototype required: No (changes are contained to an existing component with well-defined visual specs above)
- **Notes**: The changes are primarily CSS fixes (opaque background, shadow, z-index) and content formatting (structured two-line result items). A prototype would not add significant validation value.

## 10. Open Questions (RESOLVED)

- [x] **Q4 resolved:** The API endpoint `/api/destinations/search` will be updated to return a pre-formatted `formattedName` field containing the full "City, State, Country" string (e.g., "Salvador, Bahia, Brasil"). The client uses this `formattedName` directly for both the dropdown display and the input value after selection. The client does NOT need to assemble city+state+country from separate fields. The existing `city`, `state`, `country` fields remain available for structured access if needed, but `formattedName` is the primary display field.
- [x] **Input display resolved:** The selected value in the input shows the full `formattedName` ("City, State, Country"). The pre-formatted string from the API ensures consistency between dropdown display and input value.

---

## Dark Theme Considerations

- Dropdown background must use `bg-card` (not `bg-background`) to ensure it is visually distinct from the page background in dark mode
- Border: `border-border` (adapts to dark theme automatically via Tailwind)
- Shadow: `shadow-lg` with dark-mode-safe shadow (Tailwind handles this)
- Active/hover state: `bg-accent` / `bg-muted` (both adapt to dark mode)
- Text colors: `text-foreground` for city name, `text-muted-foreground` for state/country -- both are dark-mode-aware

## Motion Specifications

- **Dropdown appear/disappear**: No animation (instant). This is deliberate -- autocomplete dropdowns should feel snappy and immediate.
- **Loading spinner**: `animate-spin` with `motion-reduce:animate-none` fallback. When reduced motion is preferred, the spinner should show a static loading indicator (e.g., three dots or a static circle icon).
- **No-results hint**: Fade in with `animate-in fade-in` (150ms). With reduced motion: instant appearance.

---

> **Spec Status**: Approved
> Ready for: Task breakdown

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft for Sprint 26 autocomplete fixes |
| 1.1.0 | 2026-03-11 | tech-lead | Approved with stakeholder decisions: Q4 (API returns pre-formatted `formattedName` field; open questions closed) |
