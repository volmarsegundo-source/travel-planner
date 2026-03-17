# SPEC-UX-020: Autocomplete Rewrite -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (cross-cutting UX rewrite)
**Created**: 2026-03-17
**Last Updated**: 2026-03-17

---

## 0. Audit Summary -- Current State

### 0.1 Existing Implementation (`DestinationAutocomplete.tsx`)

| Aspect | Current Behavior | Problem |
|---|---|---|
| Dropdown rendering | Radix Popover portal (`z-[9999]`) | Previous sprints had overflow clipping; portal fixed it but z-index is brute-forced |
| Result format | Two-line: city (bold) + state, country (muted) | Acceptable but no flag emoji, no visual hierarchy on country |
| Mobile experience | Same dropdown as desktop | Dropdown items are 44px min-height (good) but no full-screen overlay for small viewports |
| Loading indicator | Small spinner in input right corner | Spinner is 16x16px, easy to miss. No skeleton results in dropdown. |
| No results | `Command.Empty` with text from i18n key `destination.noResults` | Acceptable but no helpful hint about manual entry |
| Error handling | Catch block sets empty results, no error message shown | User gets silent failure -- no feedback that search is unavailable |
| Recent searches | None | User must re-type destinations they have searched before |
| Keyboard | cmdk handles arrow keys and Enter | Escape closes popover (correct). No `aria-live` for result count updates. |
| Debounce | 400ms | Acceptable |
| Min query length | 2 characters | Acceptable |

### 0.2 Key Issues to Resolve

1. **No mobile-optimized experience** -- dropdown on 375px viewport is cramped and hard to scroll
2. **No recent searches** -- returning travelers re-type the same cities
3. **Silent error state** -- network failures produce no user feedback
4. **No skeleton loading** -- spinner alone does not indicate dropdown is coming
5. **No flag emoji** -- visual scanning aid missing from results
6. **No `aria-live` result count** -- screen readers do not know how many results appeared

---

## 1. Traveler Goal

Quickly and accurately select a travel destination by typing a city name and choosing from intelligent suggestions, with confidence that the system understands their intent even on a small mobile screen.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Explores many destinations -- recent searches save re-typing. Flag emoji aids quick visual scanning. |
| `@leisure-family` | Often searches the same family-friendly destinations repeatedly -- recent searches help. |
| `@business-traveler` | Speed: keyboard-only navigation (arrow + Enter) without touching the mouse. |
| `@bleisure` | May search multiple cities when deciding whether to extend a business trip -- fast selection is key. |
| `@group-organizer` | Creates multiple trips -- recent searches avoid redundant typing across expeditions. |

## 3. User Flow

### 3.1 Happy Path -- Desktop

```
[User focuses destination input]
    |
    v
[Recent searches shown below input (max 3), if any]
    |
    v
[User types >= 2 characters]
    |
    v
[Debounce 400ms] --> [Loading: skeleton items (3) appear in dropdown]
    |
    v
[Results arrive: max 6 visible, scrollable if more]
    |
    v
[User selects via click OR arrow keys + Enter]
    |
    v
[Input populated with "City, Country". Dropdown closes. Recent search saved.]
```

### 3.2 Happy Path -- Mobile (< 768px)

```
[User taps destination input]
    |
    v
[Full-screen overlay slides up from bottom]
    |--- Header: "Escolha o destino" + close (X) button
    |--- Search input (auto-focused, large 48px height)
    |--- Recent searches (if any, max 3)
    |
    v
[User types >= 2 characters]
    |
    v
[Skeleton items (3)] --> [Results list (full-width, large 56px rows)]
    |
    v
[User taps result]
    |
    v
[Overlay closes. Input populated. Recent search saved.]
```

### 3.3 No Results Path

```
[User types query] --> [Results: empty]
    |
    v
[No-results message shown with helpful hint]
[Input remains editable -- user can refine or type manually]
```

### 3.4 Error Path

```
[User types query] --> [Fetch fails (network/server)]
    |
    v
[Error message in dropdown area: "Busca indisponivel. Digite o destino manualmente."]
[Input remains fully functional -- user can type any value]
```

### 3.5 Recent Searches Path

```
[User focuses empty input (or clears input)]
    |
    v
[Recent searches appear (max 3), stored in localStorage]
    |
    v
[User clicks recent search]
    |
    v
[Input populated immediately. No API call. Dropdown closes.]
```

---

## 4. Screen Descriptions

### 4.1 Desktop Dropdown

**Purpose**: Show destination suggestions in a positioned dropdown below the input field.

**Layout**:
- Dropdown positioned directly below input, matching input width
- Maximum 6 results visible without scrolling (each row ~56px = 336px max-height)
- If more than 6 results, vertical scroll with subtle scrollbar
- Opaque background (card surface color), solid border, drop shadow
- 4px gap between input bottom and dropdown top

**Result Item Layout**:
```
[Flag emoji]  [City Name (bold)]
              [State/Region, Country (muted text)]
```

- Flag emoji: derived from `countryCode` (ISO 3166-1 alpha-2 to emoji). If no countryCode, omit flag.
- City name: `font-weight: 600`, foreground color, `font-size: 14px`
- State/Region + Country: `font-size: 12px`, muted foreground color
- If no state/region, show only country on second line

**Recent Searches Section** (when input is empty/focused):
- Header: "Buscas recentes" in muted small text
- Max 3 items, same layout as results but with a clock icon instead of flag
- Stored in `localStorage` key `atlas-recent-destinations`
- Each entry: `{ displayName, city, country, countryCode, lat, lon, timestamp }`
- Entries expire after 30 days
- "Clear" link aligned right of header to remove all

**Loading State**:
- 3 skeleton items in dropdown, each with:
  - Small circle skeleton (flag placeholder)
  - Two line skeletons (city + region)
- Pulse animation, respects `prefers-reduced-motion`

**Empty State (no results)**:
- Single row in dropdown: magnifying glass icon + "Nenhuma cidade encontrada. Tente outra ortografia."
- Muted text, centered

**Error State**:
- Single row: warning icon + "Busca indisponivel. Digite o destino manualmente."
- Muted text, no retry button (input itself is the recovery path)

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Full-screen overlay (see 4.2) |
| Tablet (768-1024px) | Standard dropdown, 6 items visible |
| Desktop (> 1024px) | Standard dropdown, 6 items visible |

### 4.2 Mobile Full-Screen Overlay

**Purpose**: Replace the cramped dropdown with an immersive search experience on small screens.

**Layout (top to bottom)**:
1. **Header bar** (56px height): "Escolha o destino" (h2, left-aligned) + close button (X icon, right-aligned, 44x44px touch target)
2. **Search input** (48px height): large text, auto-focused on open, clear button (X) inside input when text present
3. **Divider line** (1px, muted)
4. **Results area** (fills remaining viewport, scrollable):
   - Recent searches (when input empty)
   - Skeleton items (when loading)
   - Result items (when results arrive)
   - No-results / error message (when applicable)

**Result Item in Overlay**:
- Same layout as desktop but taller rows: 56px minimum height
- Larger tap target padding: `py-3 px-4`
- Active state on tap: brief highlight (100ms)

**Transitions**:
- Overlay slides up from bottom: `transform: translateY(100%)` to `translateY(0)`, 200ms ease-out
- Close: reverse slide, 150ms
- `prefers-reduced-motion`: instant show/hide, no slide

**Background**: Full dark scrim (`bg-black/50`) behind overlay

---

## 5. Interaction States Table

### 5.1 Input Field

| User Action | State | Expected Behavior |
|---|---|---|
| Focus (empty input) | Idle | Show recent searches if any exist. Desktop: dropdown. Mobile: open overlay. |
| Focus (has value, >= 2 chars) | Idle | Show previous results if cached, or trigger new search. |
| Type character (< 2 chars total) | Typing | Close dropdown/results. Show nothing. |
| Type character (>= 2 chars) | Typing | Start 400ms debounce. Show loading skeleton after debounce fires. |
| Clear input (backspace to empty) | Idle | Show recent searches. |
| Clear input (X button, mobile) | Idle | Clear text, show recent searches. |
| Blur (desktop, no item selected) | Any | Close dropdown after 150ms delay (allows click on item). |
| Escape | Any | Close dropdown/overlay. Return focus to input. Clear results. |

### 5.2 Result Items

| User Action | Item State | Expected Behavior |
|---|---|---|
| Mouse hover | Default | Background highlight (`bg-accent`). Cursor pointer. |
| Mouse click | Highlighted | Select item. Populate input. Close dropdown. Save to recent. |
| Arrow Down | Any | Move highlight to next item. Scroll into view if needed. |
| Arrow Up | Any | Move highlight to previous item. Wrap to last from first. |
| Arrow Down from last | Last item | Wrap to first item. |
| Enter | Item highlighted | Select highlighted item. Same as click. |
| Enter | No item highlighted | No action. Input retains typed value. |
| Tap (mobile) | Default | Brief highlight (100ms), then select. |

### 5.3 Recent Searches

| User Action | State | Expected Behavior |
|---|---|---|
| Click recent item | Default | Populate input with saved `displayName`. Fire `onSelect` with saved data. Close dropdown. |
| Click "Clear" | Default | Remove all entries from localStorage. Hide recent searches section. |
| Type after viewing recent | Recent visible | Replace recent section with search results. |

### 5.4 Overlay (Mobile)

| User Action | State | Expected Behavior |
|---|---|---|
| Tap close (X) button | Open | Close overlay. Return focus to original input. |
| Tap scrim (background) | Open | Close overlay. Return focus to original input. |
| Swipe down on header | Open | Close overlay (optional enhancement -- not required for v1). |
| Hardware back button | Open | Close overlay. |
| Select result | Open | Populate input, close overlay, save recent search. |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Keyboard Navigation
- [x] Input has `role="combobox"`, `aria-expanded`, `aria-controls` pointing to listbox ID
- [x] Results list has `role="listbox"`, each item `role="option"`
- [x] Arrow Up/Down navigates options, with `aria-activedescendant` on input tracking highlighted option
- [x] Enter selects highlighted option
- [x] Escape closes dropdown/overlay and returns focus to input
- [x] Tab from input closes dropdown (focus moves to next element)
- [x] No keyboard traps in mobile overlay (close button is focusable, Escape works)
- [x] Focus indicator: 2px solid ring on input, on each option, on close button

### Screen Reader
- [x] `aria-live="polite"` region announces result count: "{N} resultados encontrados" or "Nenhum resultado"
- [x] Each option announces: "{flag} {city}, {state}, {country}" via accessible name
- [x] Loading state announced: "Buscando destinos..." via `aria-live="polite"`
- [x] Error state announced: "Busca indisponivel" via `aria-live="polite"`
- [x] Recent searches section: `role="group"` with `aria-label="Buscas recentes"`
- [x] Decorative flag emoji: included in accessible name (provides country context)
- [x] Mobile overlay: `aria-modal="true"`, `aria-label="Buscar destino"`, focus trapped inside

### Color and Contrast
- [x] City name text (foreground on card bg): passes 4.5:1
- [x] Muted region/country text: passes 4.5:1 (use `text-muted-foreground` which is #9BA8B5 on dark bg #1E293B = 4.2:1 -- needs verification; if fails, use #CBD5E1 = 7.5:1)
- [x] Highlighted option: sufficient contrast between highlight bg and text
- [x] No information conveyed by color alone: flag emoji + text labels, not color-coded results

### Motion
- [x] Mobile overlay slide: respects `prefers-reduced-motion` (instant show/hide)
- [x] Skeleton pulse animation: disabled under reduced motion (static gray)
- [x] Highlight transition on hover: 100ms, disabled under reduced motion

### Touch
- [x] Each result item: minimum 44px height (56px on mobile overlay)
- [x] Close button (mobile): 44x44px
- [x] Clear button (mobile input): 44x44px
- [x] Spacing between items: no gap needed (full-width rows, large height prevents mis-taps)

---

## 7. Content and Copy

### Key Labels and CTAs

| Key | PT-BR | EN |
|---|---|---|
| `destination.searchLabel` | Buscar destino | Search destination |
| `destination.overlayTitle` | Escolha o destino | Choose destination |
| `destination.recentSearches` | Buscas recentes | Recent searches |
| `destination.clearRecent` | Limpar | Clear |
| `destination.searching` | Buscando destinos... | Searching destinations... |
| `destination.resultsCount` | {count} {count, plural, one {resultado encontrado} other {resultados encontrados}} | {count} {count, plural, one {result found} other {results found}} |
| `destination.noResults` | Nenhuma cidade encontrada. Tente outra ortografia. | No cities found. Try a different spelling. |
| `destination.searchError` | Busca indisponivel. Digite o destino manualmente. | Search unavailable. Please type your destination manually. |
| `destination.placeholder` | Para onde voce vai? | Where are you going? |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Network failure | Busca indisponivel. Digite o destino manualmente. | Search unavailable. Please type your destination manually. |
| No results | Nenhuma cidade encontrada. Tente outra ortografia. | No cities found. Try a different spelling. |
| API rate limited | Muitas buscas. Aguarde alguns segundos. | Too many searches. Wait a few seconds. |

### Tone of Voice
- Destination search is an exciting moment -- the traveler is choosing where to go. Copy should feel helpful and encouraging.
- Error states always offer a clear recovery: manual typing. Never say "try again later" without an alternative.
- Recent searches label is factual and concise -- no excitement needed for utility features.

---

## 8. Constraints

- **API**: Nominatim proxy at `/api/destinations/search` with rate limiting and Redis cache. Max ~1 req/s per user. Debounce at 400ms handles this.
- **Country code**: Nominatim returns `countryCode` as ISO 3166-1 alpha-2. Flag emoji conversion: each letter maps to regional indicator symbol (A=U+1F1E6, etc.).
- **localStorage**: Recent searches stored client-side. No server persistence. Max 3 entries. 30-day TTL.
- **Portal rendering**: Dropdown must use portal rendering to escape parent `overflow: hidden` containers. Current implementation already uses Radix Popover portal -- this must be preserved.
- **Dark theme**: Dropdown bg must use card surface color (`bg-card`), not transparent or semi-transparent.

---

## 9. Prototype

- [ ] Prototype required: Yes
- **Location**: `docs/prototypes/autocomplete-rewrite.html`
- **Scope**: Desktop dropdown (all states) + mobile overlay (open/results/empty/error)
- **Notes**: To be created as a follow-up after spec approval.

---

## 10. Open Questions

- [ ] **Flag emoji rendering on Windows**: Windows renders flag emojis as two-letter codes in some contexts. Should we use a small flag image sprite instead? **Needs: architect** (trade-off: emoji = zero bundle size vs. sprite = consistent rendering)
- [ ] **Recent searches cap**: This spec proposes 3. Should power users (travel agents) have a higher cap (e.g., 10)? **Needs: product-owner**
- [ ] **Overlay breakpoint**: This spec uses 768px as the mobile/desktop threshold. Should tablet (768-1024px) also use the overlay? **Needs: product-owner**

---

## 11. Components to Create / Replace

### New Components

| Component | Replaces | Purpose |
|---|---|---|
| `DestinationAutocomplete` (rewrite) | Current `DestinationAutocomplete.tsx` | Complete rewrite with mobile overlay, recent searches, skeleton loading, error states |
| `DestinationOverlay` | Nothing (new) | Mobile full-screen search overlay |
| `RecentSearches` | Nothing (new) | localStorage-backed recent destination list |

### Components to Deprecate

| Component | Action |
|---|---|
| Current `DestinationAutocomplete` | Replace entirely |

---

## 12. Patterns Used

**From `docs/ux-patterns.md`**: FormField (label + input + error + hint), Toast (for edge-case feedback)

**New patterns introduced**: DestinationOverlay (mobile full-screen search), RecentSearches (localStorage-backed recency list), SkeletonResultItem (loading placeholder for list items)

---

> **Spec Status**: Draft
> Ready for: Architect (pending resolution of open questions in Section 10)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-17 | ux-designer | Initial draft. Full audit of current autocomplete + complete rewrite spec with mobile overlay, recent searches, and interaction states table. |
