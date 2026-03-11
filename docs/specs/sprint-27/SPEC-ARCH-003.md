# SPEC-ARCH-003: Autocomplete Component -- Alternative Evaluation

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, ux-designer, qa-engineer, finops-engineer]
**Product Spec**: N/A (Infrastructure improvement)
**UX Spec**: N/A
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Overview

The `DestinationAutocomplete` component has been a recurring source of bugs for 4+ sprints (see ARCH-RCA-S27, REC-001). The component's CSS is correct in isolation, but the dropdown renders inside the wizard's DOM hierarchy and is subject to stacking context and overflow clipping issues from parent containers. Each sprint's fix addresses the immediate symptom but does not solve the structural problem.

This spec evaluates four alternative approaches to resolve the autocomplete issues permanently, with a decision matrix and clear recommendation.

---

## 2. Architecture Decision Records

### ADR-016: Autocomplete Implementation Strategy

- **Status**: Proposed
- **Context**: The current `DestinationAutocomplete` is a custom combobox (~260 lines) that implements keyboard navigation, debounced search, dropdown positioning, and click-outside detection from scratch. It fetches from our Nominatim proxy (`/api/destinations/search`). The dropdown renders as an `<ul>` with `position: absolute; z-index: 50` inside the component's own `<div>`. This makes it vulnerable to any ancestor that creates a CSS stacking context or clips overflow. The bug has recurred across Sprints 11, 17, 19, 21, and 23. Each fix was correct but insufficient because the root cause is architectural (DOM hierarchy), not cosmetic (CSS values).
- **Decision**: See evaluation below. Recommendation: **Option B (cmdk library + portal)**.
- **Consequences**: See per-option analysis.

---

## 3. Options Evaluated

### Option A: Add React Portal to Current Component

**Description**: Keep the current custom component but render the dropdown via `createPortal(document.body)`. Compute dropdown position using `getBoundingClientRect()` on the input element. Update position on scroll/resize.

**Implementation**:
```tsx
// Inside DestinationAutocomplete
const inputRect = inputRef.current?.getBoundingClientRect();
const dropdownStyle = {
  position: "fixed",
  top: inputRect.bottom + window.scrollY,
  left: inputRect.left,
  width: inputRect.width,
  zIndex: 9999,
};

return (
  <div ref={containerRef} className="relative">
    <input ... />
    {isOpen && results.length > 0 && createPortal(
      <ul style={dropdownStyle} ...>{...}</ul>,
      document.body
    )}
  </div>
);
```

**Changes required**:
1. Add `useRef` for the input element.
2. Replace the inline `<ul>` with a portal.
3. Compute position in `useEffect` + `ResizeObserver`.
4. Update click-outside detection to handle portal (dropdown is no longer inside `containerRef`).
5. Handle scroll repositioning.

| Criterion | Score (1-5) | Notes |
|---|---|---|
| Fixes root cause | 5 | Portal escapes all stacking contexts |
| Implementation effort | 3 | ~4h. Position math and edge cases (scroll, resize, viewport overflow) add complexity |
| Maintenance burden | 2 | We still own 260+ lines of custom combobox code. Keyboard nav, ARIA, position math, click-outside -- all maintained by us |
| Accessibility | 3 | Current ARIA implementation is decent but untested against screen readers. Portal adds complication (focus management) |
| API provider flexibility | 5 | No change to API layer. Still uses Nominatim proxy |
| Bundle size impact | 5 | No new dependencies |
| Vendor lock-in | 5 | No vendor involvement |
| Risk | 3 | Position calculation bugs are common. May need to handle edge cases (dropdown at bottom of viewport, mobile keyboards, etc.) |

**Total: 31/40**

---

### Option B: Replace with cmdk Library + Portal

**Description**: Replace the custom autocomplete with [cmdk](https://cmdk.paco.me/) (Command Menu component by Pacopacks). cmdk is a headless, composable combobox/command-palette built on top of Radix primitives. It handles keyboard navigation, filtering, ARIA attributes, and portal rendering out of the box.

**Why cmdk specifically**:
- Already used by shadcn/ui's `<Command>` component (our UI library). May already be in the dependency tree.
- Headless: renders no styles by default, fully compatible with Tailwind.
- Portal support via Radix `<Popover>`.
- 5.7KB gzipped. Minimal bundle impact.
- MIT licensed.

**Implementation**:
```tsx
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "cmdk";

// Wrap in Popover for portal behavior
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger asChild>
    <Command shouldFilter={false}>
      <CommandInput
        value={value}
        onValueChange={handleInputChange}
        placeholder={placeholder}
      />
    </Command>
  </PopoverTrigger>
  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" portal>
    <CommandList>
      <CommandEmpty>{td("noResults")}</CommandEmpty>
      {results.map((result) => (
        <CommandItem key={...} onSelect={() => handleSelect(result)}>
          ...
        </CommandItem>
      ))}
    </CommandList>
  </PopoverContent>
</Popover>
```

**Changes required**:
1. Install `cmdk` (may already be present via shadcn/ui).
2. Rewrite `DestinationAutocomplete` to use `Command` components (~80 lines vs current ~260).
3. Debounced fetch logic stays the same. Set `shouldFilter={false}` (we do server-side filtering via Nominatim).
4. Remove manual keyboard handling, click-outside, and ARIA management (cmdk handles all of it).
5. Update tests to match new DOM structure.

| Criterion | Score (1-5) | Notes |
|---|---|---|
| Fixes root cause | 5 | Radix Popover uses portal by default |
| Implementation effort | 4 | ~6h. Rewrite component + update tests. cmdk API is well-documented |
| Maintenance burden | 5 | Keyboard nav, ARIA, portal, focus trap -- all handled by library. We maintain only the fetch logic and styling |
| Accessibility | 5 | cmdk/Radix are rigorously tested for WCAG compliance |
| API provider flexibility | 5 | No change to API layer. Still uses Nominatim proxy |
| Bundle size impact | 4 | ~5.7KB gzip for cmdk. May already be bundled if shadcn Command component is used elsewhere |
| Vendor lock-in | 4 | MIT licensed, open source, widely adopted. Low risk. |
| Risk | 4 | Well-tested library. Main risk is learning curve for team, but shadcn/ui patterns are already familiar |

**Total: 36/40**

---

### Option C: Use Radix Combobox Directly

**Description**: Use `@radix-ui/react-combobox` (if available) or compose with `@radix-ui/react-popover` + custom list. Radix is already a transitive dependency via shadcn/ui.

**Status**: As of March 2026, Radix UI does not ship a dedicated `Combobox` primitive. The recommended pattern is to use `Popover` + `Command` (cmdk) -- which is exactly Option B. Some teams compose `Popover` + `Select` but this does not support text input filtering.

**Conclusion**: This option converges to Option B. Not evaluated separately.

---

### Option D: Switch API to Google Places Autocomplete

**Description**: Replace both the component AND the API backend with Google Places Autocomplete. Google provides a drop-in `<Autocomplete>` widget that handles the entire UI (input, dropdown, keyboard nav, place selection) and the API (no proxy needed).

**Implementation**:
```tsx
import { Autocomplete } from "@react-google-maps/api";

<Autocomplete
  onPlaceChanged={handlePlaceChanged}
  restrictions={{ types: ["(cities)"] }}
>
  <input ... />
</Autocomplete>
```

**Changes required**:
1. Add `@react-google-maps/api` dependency.
2. Obtain Google Maps API key with Places API enabled.
3. Add `NEXT_PUBLIC_GOOGLE_MAPS_KEY` to env vars.
4. Rewrite `DestinationAutocomplete` to use Google widget.
5. Remove `/api/destinations/search` proxy route and Nominatim integration.
6. Update `DestinationResult` type to map from Google Place to our schema.
7. Update tests.

| Criterion | Score (1-5) | Notes |
|---|---|---|
| Fixes root cause | 5 | Google widget manages its own dropdown rendering |
| Implementation effort | 3 | ~8h. New dependency, API key management, type mapping, remove old proxy |
| Maintenance burden | 4 | Google maintains the widget. We maintain only the integration layer |
| Accessibility | 4 | Google widget has decent ARIA support but is less customizable |
| API provider flexibility | 1 | **Hard vendor lock-in**. Google Places API has unique data format, billing, and ToS. Switching away requires full rewrite |
| Bundle size impact | 2 | Google Maps JS SDK is ~150KB+. Must be lazy loaded |
| Vendor lock-in | 1 | Google Places API pricing: $2.83/1000 requests after free tier (200/day). ToS requires displaying Google logo. Cannot cache results. |
| Risk | 2 | Cost risk: if usage exceeds free tier, monthly bills appear. Compliance: Google ToS may conflict with data residency requirements |

**Total: 22/40**

---

### Option E: Switch API to Mapbox Geocoding

**Description**: Replace the Nominatim proxy with Mapbox Geocoding API. Keep the custom component (or combine with Option B). Mapbox is already in our tech stack (ADR-001).

**Implementation**:
1. Replace `/api/destinations/search` to call Mapbox Geocoding API instead of Nominatim.
2. Or use Mapbox Search JS widget (drop-in autocomplete).

| Criterion | Score (1-5) | Notes |
|---|---|---|
| Fixes root cause | 3 | Only fixes if we also use Mapbox Search widget (which handles dropdown). If we keep custom UI, same DOM issue |
| Implementation effort | 3 | ~6h for API swap, ~10h if also using Mapbox Search widget |
| Maintenance burden | 3 | Mapbox maintains the API. We maintain the component (unless using their widget) |
| Accessibility | 3 | Mapbox Search widget accessibility is adequate but less mature than cmdk/Radix |
| API provider flexibility | 2 | Mapbox lock-in. Better than Google (data format is closer to our schema) but still proprietary |
| Bundle size impact | 2 | Mapbox Search JS is ~80KB. On top of Mapbox GL JS for the atlas page |
| Vendor lock-in | 2 | Mapbox pricing: 100,000 requests/month free, then $0.75/1000. More generous than Google but still a paid API |
| Risk | 3 | Moderate. Consolidates on one vendor (Mapbox for both maps and geocoding), which simplifies vendor management but increases single-vendor risk |

**Total: 21/40**

---

## 4. Decision Matrix Summary

| Criterion (weight) | A: Portal | B: cmdk | D: Google | E: Mapbox |
|---|---|---|---|---|
| Fixes root cause (x2) | 10 | 10 | 10 | 6 |
| Implementation effort | 3 | 4 | 3 | 3 |
| Maintenance burden | 2 | 5 | 4 | 3 |
| Accessibility | 3 | 5 | 4 | 3 |
| API flexibility | 5 | 5 | 1 | 2 |
| Bundle size | 5 | 4 | 2 | 2 |
| Vendor lock-in | 5 | 4 | 1 | 2 |
| Risk | 3 | 4 | 2 | 3 |
| **Weighted Total** | **36** | **41** | **27** | **24** |

---

## 5. Recommendation

**Option B: cmdk library with Radix Popover portal**.

### Rationale

1. **Eliminates the root cause permanently**: Radix Popover renders via portal, escaping all CSS stacking contexts. This is a structural fix, not a CSS band-aid.

2. **Dramatic maintenance reduction**: The current 260-line custom component shrinks to ~80 lines. We delete: manual keyboard navigation, manual ARIA attributes, manual click-outside detection, manual active index management. cmdk handles all of these with battle-tested implementations.

3. **Consistent with existing stack**: shadcn/ui already uses cmdk for its `<Command>` component. The patterns and styling approach are already familiar to the team.

4. **No API change**: We keep our Nominatim proxy (`/api/destinations/search`), preserving our zero-cost geocoding solution. The `shouldFilter={false}` flag tells cmdk to skip client-side filtering (we filter server-side).

5. **Accessibility improvement**: cmdk's ARIA implementation has been tested across screen readers (NVDA, VoiceOver, JAWS). Our current implementation has correct `role="combobox"` and `aria-activedescendant` but has not been tested against assistive technology.

6. **Minimal bundle impact**: cmdk is ~5.7KB gzipped and may already be in the dependency tree.

7. **No vendor lock-in**: MIT license, open source, no API costs.

### What We Reject

- **Option D (Google Places)**: Introduces significant vendor lock-in and ongoing costs. Google ToS restrictions (no caching, mandatory logo) conflict with our goals. The free tier (200 requests/day) is insufficient for active users.

- **Option E (Mapbox Geocoding)**: While Mapbox is in our stack, consolidating geocoding on Mapbox adds single-vendor risk and recurring costs. The current Nominatim solution is free and adequate.

- **Option A (Portal only)**: Technically correct but leaves us maintaining a complex custom combobox. The portal solves the rendering issue but does not address the ongoing maintenance burden of custom keyboard/ARIA/click-outside code.

---

## 6. Implementation Plan

### Phase 1: Component Replacement (6h)

1. **Verify cmdk dependency**: Check if `cmdk` is already installed via shadcn/ui.
   ```bash
   npm ls cmdk
   ```

2. **Create new component**: `src/components/features/expedition/DestinationAutocomplete.tsx` (rewrite in place).

3. **Component structure**:
   ```tsx
   "use client";

   import { useState, useRef, useCallback, useEffect } from "react";
   import { useTranslations, useLocale } from "next-intl";
   import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "cmdk";
   import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

   // ... same DestinationResult interface ...
   // ... same DestinationAutocompleteProps interface ...

   export function DestinationAutocomplete({ ... }) {
     // Keep: fetchResults, debounce logic, result formatting
     // Remove: keyboard handling, activeIndex, click-outside, manual ARIA
     // Add: Popover + Command composition
   }
   ```

4. **Preserve API contract**: The component's props interface (`value`, `onChange`, `onSelect`, `placeholder`, `disabled`, `id`, `name`) must remain identical. All consumers (Phase1Wizard step 2 -- destination and origin fields) should require zero changes.

5. **Preserve test IDs**: Keep `data-testid="destination-listbox"`, `data-testid="result-line1"`, `data-testid="result-line2"`, `data-testid="no-results-hint"`.

### Phase 2: Test Updates (2h)

1. Update `DestinationAutocomplete.test.tsx` to match new DOM structure (cmdk renders different elements than raw `<ul>/<li>`).
2. Verify existing Phase1Wizard integration tests still pass.
3. Add a specific test: "dropdown renders outside parent overflow:hidden container" -- create a test wrapper with `overflow: hidden` and verify the dropdown is still visible (rendered via portal).

### Phase 3: Visual QA (1h)

1. Test both autocomplete instances in Phase1Wizard (destination + origin).
2. Test on mobile viewport (dropdown should not overflow screen).
3. Test with keyboard navigation (ArrowDown, ArrowUp, Enter, Escape).
4. Test screen reader behavior (optional but recommended).

---

## 7. Security Considerations

- No security impact. The component change is purely UI-layer.
- The Nominatim proxy (`/api/destinations/search`) remains unchanged.
- No new data exposure. No new external dependencies with network access.

---

## 8. Performance Requirements

| Metric | Current | After Change | Notes |
|---|---|---|---|
| Component bundle size | ~8KB (custom) | ~14KB (cmdk + custom) | Acceptable. cmdk may already be in bundle |
| Dropdown render time | < 16ms | < 16ms | No change expected |
| API latency | 400ms debounce + Nominatim RTT | Unchanged | API layer not affected |

---

## 9. Testing Strategy

### Unit Tests
- Autocomplete renders input with correct ARIA attributes.
- Typing triggers debounced fetch.
- Results appear in dropdown after fetch completes.
- Selecting a result calls `onSelect` and `onChange` with correct values.
- No results message appears for empty result set.
- Keyboard navigation: ArrowDown/Up changes selection, Enter selects, Escape closes.

### Integration Tests
- Phase1Wizard Step 2: type destination, select from dropdown, verify form state updates.
- Phase1Wizard Step 2: type origin, select from dropdown, verify trip type badge appears.

### Regression Tests
- Dropdown is visible when parent has `overflow: hidden` (portal test).
- Dropdown closes on outside click.
- Dropdown closes on Escape.
- Two autocomplete instances on same page do not interfere.

---

## 10. Open Questions

- [ ] Is cmdk already in the dependency tree via shadcn/ui `<Command>`? (Check `package.json` or `npm ls cmdk`)
- [ ] Does the ux-designer want any visual changes to the dropdown while we are rebuilding? (Opportunity for minor UX improvements at low cost.)
- [ ] Should we also apply this pattern to other combobox-like components in the codebase (if any)?

---

## 11. Definition of Done

- [ ] `DestinationAutocomplete` rewritten using cmdk + Radix Popover portal
- [ ] Props interface unchanged (no breaking changes to consumers)
- [ ] Dropdown renders outside DOM hierarchy (verified via portal)
- [ ] All existing unit tests pass (updated for new DOM structure)
- [ ] Portal-specific regression test added
- [ ] Keyboard navigation works: ArrowDown, ArrowUp, Enter, Escape
- [ ] Visual QA: tested on desktop and mobile viewports
- [ ] No regressions in Phase1Wizard integration tests
- [ ] ADR-016 documented in docs/architecture.md
- [ ] Bundle size increase < 10KB gzipped

---

## 12. Vendor Dependencies

| Vendor | Usage | License | Bundle Size | Exit Strategy |
|---|---|---|---|---|
| cmdk | Headless combobox primitives | MIT | ~5.7KB gzip | Replace with custom combobox + portal (Option A). The component interface is ours. |
| @radix-ui/react-popover | Portal rendering for dropdown | MIT | Already bundled (shadcn dep) | Replace with manual `createPortal`. |
| Nominatim (OSM) | Geocoding API | ODbL | N/A (server-side) | Replace with Mapbox Geocoding or Google Places API. Proxy interface (`/api/destinations/search`) stays the same. |

---

## 13. Constraints

- **Props interface is frozen**: `DestinationAutocompleteProps` must not change. All six props (value, onChange, onSelect, placeholder, disabled, id/name) must be preserved.
- **Nominatim API stays**: No API provider change in this spec. The improvement is UI-only.
- **No new environment variables**: cmdk requires no configuration.
- **Test IDs preserved**: `data-testid` values must match current values to avoid breaking E2E tests.

---

> Draft -- Ready for tech-lead review. Pending confirmation that cmdk is in dependency tree.
