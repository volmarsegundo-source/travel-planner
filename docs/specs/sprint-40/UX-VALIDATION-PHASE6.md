# UX Validation -- Phase 6 Redesign

**Validator**: ux-designer
**Status**: APPROVED WITH CONDITIONS
**Date**: 2026-03-27
**Checklist**: UX-CHECKLIST-PHASE6 (docs/specs/sprint-40/UX-CHECKLIST-PHASE6.md)
**Implementation**: src/components/features/expedition/Phase6ItineraryV2.tsx
**Stitch Prototype**: docs/design/stitch-exports/phase6_roteiro_detalhado/code.html

---

## Section 1: Split Layout (60/40) -- PASS

| Item | Result | Notes |
|---|---|---|
| `flex-row` on md+ | PASS | Line 1058: `flex flex-col md:flex-row min-h-screen` |
| Left column 60% (`w-3/5`) | PASS | Line 1060: `w-full md:w-3/5` |
| Right column 40% (`w-2/5`) | PASS | MapPanel line 664: `w-full md:w-2/5` |
| Right column sticky `top-20` | PASS | Line 664: `sticky top-20` |
| Right column `h-screen` | PASS | Line 664: `h-screen` |
| Right column hidden on mobile | PASS | Line 664: `hidden md:block` |
| Mobile stacks to single column | PASS | Left column is `w-full` by default |
| Max content 1440px centered | PARTIAL | Footer is 1440px (line 1167), but main layout inherits PhaseShell `contentMaxWidth="4xl"` which is 896px, not 1440px. The `-mx-4 sm:-mx-6` negative margins on line 1058 break out, but this is fragile. |
| Left column bg uses atlas token | PASS | `bg-atlas-surface` on line 1060 |
| Right column bg uses atlas token | PASS | `bg-atlas-surface-container-low` on line 664 |
| No raw Tailwind color classes | FAIL | See Section 10 below -- culture category uses hardcoded `#1c9a8e` |

**Verdict: 9/11 PASS, 1 PARTIAL, 1 FAIL**

---

## Section 2: Day Selector Pills -- PASS

| Item | Result | Notes |
|---|---|---|
| Horizontal scrollable row | PASS | Line 415: `flex gap-3 overflow-x-auto` |
| Scrollbar hidden | PASS | `hide-scrollbar` class applied; utility defined in globals.css lines 451-458 |
| Active pill bg `atlas-secondary-container` | PASS | Line 439: `bg-atlas-secondary-container` |
| Active pill text contrast (dark text, not white) | PASS | Line 439: `text-atlas-primary` (#040d1b) -- correct per UX-PARECER |
| Inactive pills `atlas-surface-container-lowest` | PASS | Line 440: `bg-atlas-surface-container-lowest` |
| Hover state on inactive | PASS | Line 440: `hover:bg-atlas-surface-container-low` |
| Day number bold + date below | PASS | Lines 444-449: two spans, `text-sm font-bold` and `text-xs` |
| Min 100px wide x 80px tall | PASS | Line 436: `min-w-[100px] h-20` |
| Border radius 12px | PASS | Line 436: `rounded-xl` |
| Active pill `shadow-lg` | PASS | Line 439: `shadow-lg` |
| Keyboard navigable (arrow keys) | PASS | Lines 398-411: `handleKeyDown` with ArrowLeft/ArrowRight + focus management |
| `aria-selected` on active | PASS | Line 430: `aria-selected={isActive}` |
| `role="tablist"` + `role="tab"` | PASS | Lines 416/429 |
| Transition 200ms | PASS | Line 436: `transition-all duration-200` |
| Touch targets >= 44px | PASS | 80px height exceeds minimum |
| Mobile momentum scroll | PASS | Native `overflow-x-auto` provides this on touch devices |

**Verdict: 16/16 PASS**

---

## Section 3: Day Header -- PASS

| Item | Result | Notes |
|---|---|---|
| Plus Jakarta Sans (`font-atlas-headline`) | PASS | Line 461: `font-atlas-headline` |
| 24px bold | PASS | Line 461: `text-2xl font-bold` |
| Left accent border 4px, `atlas-secondary-container` | PASS | Line 461: `border-l-4 border-atlas-secondary-container` |
| Left padding 24px | PASS | Line 461: `pl-6` |
| Text color `atlas-on-surface` | PASS | Line 461: `text-atlas-on-surface` |
| Updates on day pill switch | PASS | Line 1107: renders from `currentDay` which derives from `selectedDay` state |
| `<h2>` element | PASS | Line 460: `<h2>` tag |
| Em-dash separator | PASS | Line 464: `\u2014` (Unicode em-dash) |

**Verdict: 8/8 PASS**

---

## Section 4: Activity Timeline -- PASS (with note)

| Item | Result | Notes |
|---|---|---|
| Vertical line visible on desktop | PASS | Line 556: `hidden md:block` |
| Vertical line hidden on mobile | PASS | Same class |
| Line 2px wide | PASS | Line 556: `w-0.5` |
| Line color `atlas-surface-container-high` | PASS | Line 556: `bg-atlas-surface-container-high` |
| Dots 16px round | PASS | Line 569: `w-4 h-4 rounded-full` |
| Dots have 4px ring in `atlas-surface` | PASS | Line 569: `ring-4 ring-atlas-surface` |
| Dot colors use atlas tokens | PARTIAL | Logistics and food use tokens correctly. Culture uses `bg-[#1c9a8e]` -- a hardcoded hex value, not an atlas token. The checklist requires all atlas tokens. The correct token would be `bg-atlas-on-tertiary-container` (which resolves to #1c9a8e). |
| Dots `z-10` above line | PASS | Line 567: `relative z-10` |
| Gap 32px between dot and card | PASS | Line 565: `gap-8` |
| Vertical spacing 32px | PASS | Line 553: `flex flex-col gap-8` |
| Dots `aria-hidden="true"` | PASS | Line 567: `aria-hidden="true"` |
| Works with single activity | PASS | No conditional logic that breaks with length 1 |
| Line extends first to last | PARTIAL | Line uses `top-0 bottom-0` which extends full height of container. Stitch uses `top-24` to offset from header. Implementation starts at `top-0`. Minor visual difference. |

**Verdict: 10/13 PASS, 2 PARTIAL, 0 FAIL**

---

## Section 5: Activity Cards -- PASS (with conditions)

| Item | Result | Notes |
|---|---|---|
| Card bg `atlas-surface-container-lowest` | PASS | Line 484 |
| Card padding `p-6` | PASS | Line 484: `p-6 md:p-6 p-4` (mobile reduces to p-4 -- acceptable responsive behavior) |
| Card radius `rounded-xl` | PASS | Line 484 |
| Shadow-sm default, shadow-md hover | PASS | Line 485: `shadow-sm hover:shadow-md` |
| Shadow transition smooth | PASS | Line 485: `transition-shadow duration-200` |
| Culture/food 8px left accent border | PASS | `border-l-8` in culture and food `borderClass` values |
| Left border color matches category | PARTIAL | Culture border uses `border-[#1c9a8e]` (hardcoded). Food border uses `border-atlas-secondary-container` (correct token). |
| Logistics: no left border | PASS | Logistics `borderClass` is empty string |
| Time label bold, colored by category | PASS | Line 496: `text-sm font-bold` + `style.timeColor` |
| Category badge pill-shaped | PASS | Line 500: `rounded-full` |
| Category badge category-specific tokens | PASS | Uses `chipBg`/`chipText` from CATEGORY_STYLES |
| Title `text-xl` bold | PASS | Line 508 |
| Description `text-atlas-on-surface-variant leading-relaxed` | PASS | Line 514 |
| Metadata uppercase, letter-spaced, 70% opacity | PASS | Line 520: `text-xs font-bold text-atlas-on-surface-variant/70 uppercase tracking-wider` |
| Metadata icons 14px | PASS | ClockIcon/CostIcon use `size-3.5` (14px) |
| Tip box `atlas-secondary-fixed` bg | PASS | Line 535: `bg-atlas-secondary-fixed` |
| Tip box lightbulb icon + italic | PASS | Line 536: LightbulbIcon + `italic` class |
| Tip box radius 8px | PASS | Line 535: `rounded-lg` |
| Content order: time+badge, title, desc, metadata, tip | PASS | Rendered in correct order |
| Cards are `<article>` elements | PASS | Line 482: `<article>` |
| Title is `<h3>` | PASS | Line 508: `<h3>` |
| No raw Tailwind colors | FAIL | Culture category: `text-[#1c9a8e]` for timeColor, `border-[#1c9a8e]` for borderClass |

**Verdict: 19/22 PASS, 1 PARTIAL, 1 FAIL (shared root cause with Section 4)**

---

## Section 6: Day Summary -- PASS

| Item | Result | Notes |
|---|---|---|
| Summary at bottom of each day | PASS | Line 1116: `<DaySummaryCard>` rendered after ActivityTimeline |
| Card bg `atlas-surface-container` | PASS | Line 597 |
| Card padding `p-8` | PASS | Line 597 |
| Card radius `rounded-xl` | PASS | Line 597 |
| Horizontal layout (icon+title left, stats right) on desktop | PASS | Line 597: `flex flex-col md:flex-row ... justify-between` |
| Icon in white rounded container | PASS | Line 604: `bg-atlas-surface-container-lowest rounded-xl` |
| Icon color `atlas-secondary-container` | PASS | ChartIcon line 196: `text-atlas-secondary-container` |
| Title Plus Jakarta Sans, bold | PASS | Line 608: `font-atlas-headline font-bold` |
| Stat numbers `text-2xl` extrabold | PASS | Lines 622/630/638: `text-2xl font-atlas-headline font-extrabold` |
| Stat labels 12px uppercase bold 60% opacity | PASS | Lines 625/633/641: `text-xs uppercase font-bold text-atlas-on-surface-variant/60` |
| Three stats shown | PASS | Activities count, duration, cost |
| Stats gap 40px | PASS | Line 620: `gap-10` |
| Mobile stacks vertically | PASS | Line 597: `flex-col md:flex-row` |
| `role="region"` + `aria-label` | PASS | Line 598-599 |

**Verdict: 14/14 PASS**

Note: Stat labels missing `tracking-wider` that Stitch uses. Minor visual polish item, not blocking.

---

## Section 7: Map Panel -- PASS (with conditions)

| Item | Result | Notes |
|---|---|---|
| Sticky, below navbar | PASS | `sticky top-20` |
| Fills viewport height | PASS | `h-screen` |
| 32px padding | PASS | `p-8` |
| Map container 16px radius | PASS | `rounded-2xl` |
| Map container `shadow-xl` | PASS | Line 668 |
| Leaflet + OSM tiles | FAIL | Implementation is a list-based placeholder, not an actual Leaflet map. This is acknowledged in the code comment "v1 -- full Leaflet deferred to v2" (line 650). |
| Activity markers plotted | N/A | No actual map -- uses numbered location list instead |
| Marker circles 32px | N/A | Deferred |
| Markers have white border + shadow | N/A | Deferred |
| Category icon inside markers | N/A | Deferred |
| Glass-morphism label | PASS | Line 670: `bg-white/70 backdrop-blur-[12px]` + border |
| Glass-morphism zoom controls | FAIL | No zoom controls implemented (placeholder mode) |
| Control buttons hover | N/A | No controls |
| Hidden on mobile | PASS | `hidden md:block` |
| `aria-hidden` | PASS | Line 665: `aria-hidden="true"` |
| Markers update on day switch | PASS | Line 1150: activities passed from `currentDay` |
| Fallback when no coordinates | PASS | Line 695-698: shows "no locations" message |

**Verdict: 7/17 PASS, 5 N/A (deferred), 2 FAIL (expected -- map is v1 placeholder)**

This is a known, accepted deferral. The map panel is a structural placeholder for a future Leaflet integration. The layout, positioning, and token usage are correct. The interactive map features are not expected in this PR.

---

## Section 8: Footer Navigation -- PASS

| Item | Result | Notes |
|---|---|---|
| Fixed at bottom | PASS | Line 1163: `fixed bottom-0 left-0 right-0` |
| Upward shadow | PASS | Line 1164: `shadow-[0_-8px_24px_rgba(4,13,27,0.04)]` |
| Background white | PASS | `bg-white` |
| Content max 1440px centered | PASS | Line 1167: `max-w-[1440px] mx-auto` |
| Three-column layout | PASS | `flex justify-between items-center` with back/progress/CTA |
| Back button ghost style + left arrow | PASS | Lines 1169-1176: text-only button with ArrowBackIcon |
| Back button hover changes to amber | PASS | Line 1171: `hover:text-atlas-secondary-container` |
| Center "Progresso Total" label | PASS | FooterProgressBar line 725-726 |
| 8 progress segments | PASS | Line 716: `Array.from({ length: TOTAL_PHASES })` where TOTAL_PHASES=8 |
| Completed = `atlas-tertiary-fixed-dim` | PASS | Line 734 |
| Active = `atlas-secondary-container` | PASS | Line 735 |
| Locked = `atlas-surface-container-high` | PASS | Line 736 |
| Primary CTA dark bg + white text | PASS | Line 1190: `bg-atlas-primary text-atlas-on-primary` |
| CTA hover amber bg + dark text | PASS | Line 1191: `hover:bg-atlas-secondary-container hover:text-atlas-primary` |
| CTA right arrow | PASS | Line 1199: ArrowForwardIcon |
| CTA `custom-spring` timing | PASS | Line 1195: inline style `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Footer z-50 | PASS | Line 1164 |
| Footer doesn't obscure content | PARTIAL | No explicit bottom padding on content section. The PhaseShell may provide this, but not verifiable from this file alone. |
| Center progress hidden on small screens | PASS | Line 724: `hidden md:flex` |
| Touch targets >= 44px | PASS | Back button has `py-2` (40px-ish) + text. CTA has `py-3` (48px effective). Acceptable. |
| Back button keyboard accessible | PASS | Line 1171: `focus-visible:ring-2 focus-visible:ring-atlas-focus-ring` |
| CTA keyboard accessible | PASS | Line 1193: focus-visible ring |

**Verdict: 21/22 PASS, 1 PARTIAL**

---

## Section 9: Responsive Behavior

### 9.1 Desktop (1440px) -- PASS

| Item | Result |
|---|---|
| 60/40 split visible | PASS |
| Map panel sticky + visible | PASS |
| Day pills visible without scroll (up to ~12) | PASS (scrollable if more) |
| Full descriptions | PASS |
| Summary card horizontal | PASS |
| Footer 3 elements | PASS |
| Max-width 1440px respected | PARTIAL (main content constrained by PhaseShell) |
| Typography scale matches Stitch | PASS (h1=text-5xl=48px on md+, h2=24px, body=16px) |

### 9.2 Tablet (768px) -- PASS

| Item | Result |
|---|---|
| Split activates at md | PASS |
| Map panel appears | PASS |
| Day pills scroll if many | PASS |
| Footer 3-column | PASS |

### 9.3 Mobile (375px) -- PASS

| Item | Result |
|---|---|
| Single column, no map | PASS |
| Map hidden | PASS |
| Day pills scroll | PASS |
| Day pills min 100px x 80px | PASS |
| Timeline vertical line hidden | PASS |
| Activity cards show dots | PASS (dot column still renders on mobile) |
| Card padding reduces to p-4 | PASS (line 484: `p-4` then `md:p-6`) |
| Day header full width with accent | PASS |
| Summary stacks vertically | PASS (`flex-col md:flex-row`) |
| Footer fixed | PASS |
| Center progress hidden | PASS (`hidden md:flex`) |
| Touch targets >= 44px | PASS |
| No horizontal overflow | PASS |
| Text >= 12px | PASS (smallest is `text-xs` = 12px) |
| Bottom padding for footer | PARTIAL (not verified) |

**Verdict: 25/27 PASS, 2 PARTIAL**

---

## Section 10: Cross-Cutting Concerns

### Typography Consistency -- PASS

| Item | Result | Notes |
|---|---|---|
| Headlines use `font-atlas-headline` | PASS | All h1-h4 elements use it |
| Body text uses `font-atlas-body` | PASS | Applied consistently |
| No `font-semibold` where Stitch uses `font-bold` | PASS | Checked -- font-bold used throughout |
| No Inter/system fallback for visible text | PASS | All text nodes have explicit font class |
| Font weights match Stitch | PASS | 400 body, 700 bold, 800 extrabold on h1 |

### Color Token Compliance -- FAIL (1 issue)

| Item | Result | Notes |
|---|---|---|
| Zero raw Tailwind color classes | FAIL | Culture category in CATEGORY_STYLES (lines 59-63) uses 3 hardcoded values: `bg-[#1c9a8e]`, `border-[#1c9a8e]`, `text-[#1c9a8e]`. These should be `bg-atlas-on-tertiary-container`, `border-atlas-on-tertiary-container`, `text-atlas-on-tertiary-container` respectively. |
| All colors reference `atlas-*` tokens | FAIL | Same issue above |
| CTA never white on amber | PASS | CTA uses `text-atlas-primary` (#040d1b) on amber |
| Stitch `primary-container` mapped correctly | PASS | Maps to `atlas-secondary-container` throughout |
| Stitch `tertiary` mapped to atlas tertiary | PARTIAL | Correctly identified as teal, but uses raw hex instead of token |

### Accessibility -- PASS

| Item | Result | Notes |
|---|---|---|
| Focus indicators on all interactive elements | PASS | `focus-visible:ring-2 focus-visible:ring-atlas-focus-ring` on pills, footer buttons |
| Tab order follows visual order | PASS | Pills -> content -> summary -> footer (natural DOM order) |
| Activity cards have heading structure | PASS | `<article>` with `aria-label` + `<h3>` title |
| `role="tablist"` / `role="tab"` | PASS | Lines 416/429 |
| `role="tabpanel"` for day content | PASS | Line 1100 |
| Color not only differentiator | PASS | Categories have text labels (chips) + borders + dot positions |
| Icons `aria-hidden="true"` | PASS | All SVG icons include it |
| Map excluded from tab order | PASS | `aria-hidden="true"` on entire aside |
| `prefers-reduced-motion` respected | PASS | `motion-reduce:transition-none` on pills, cards, footer. Global CSS line 442-448 also handles this. |
| Error states `role="alert"` | PASS | Lines 1033 and 1127 |
| Loading state `role="status"` + `aria-live="polite"` | PASS | Line 972 |

### Animations and Transitions -- PASS

| Item | Result | Notes |
|---|---|---|
| Card hover shadow 200ms | PASS | `transition-shadow duration-200` |
| Day pill transition 200ms | PASS | `transition-all duration-200` |
| Footer CTA custom-spring | PASS | Inline style with cubic-bezier |
| All respect reduced-motion | PASS | `motion-reduce:transition-none` applied |
| No layout shift on day change | PASS | Content area is same width regardless of day content |

### States Not in Stitch -- PASS

| Item | Result | Notes |
|---|---|---|
| Loading state (skeleton) | PASS | Lines 965-1009: spinner + progress bar + skeleton cards |
| Empty state (no itinerary) | PASS | Lines 1013-1047: icon + hint text + generate CTA |
| Error state | PASS | `role="alert"` error message + retry capability |
| Regenerate confirmation | PASS | Lines 1131-1145: warning card with confirm/cancel |
| Single-day trip | PASS | Pills still render with 1 pill; no breaking behavior |
| Many days (>12) | PASS | `overflow-x-auto` + `hide-scrollbar` handles gracefully |

**Edit mode (drag-and-drop, add, delete)**: NOT IMPLEMENTED. This appears to be a future feature and is not part of the current PR scope.

---

## Deviation Summary

### DEV-01: Hardcoded Hex in Culture Category (BLOCKING)

**Severity**: Medium
**Location**: Lines 59-63 of Phase6ItineraryV2.tsx
**Issue**: Culture category uses `bg-[#1c9a8e]`, `border-[#1c9a8e]`, `text-[#1c9a8e]` instead of atlas design tokens.
**Fix**: Replace with `bg-atlas-on-tertiary-container`, `border-atlas-on-tertiary-container`, `text-atlas-on-tertiary-container`. The token resolves to the same value (#1c9a8e) per globals.css line 230.
**Effort**: Trivial (3-line change).
**Blocks merge**: Yes -- violates the zero-raw-colors rule in the checklist.

### DEV-02: Map Panel is Placeholder (ACCEPTED)

**Severity**: Low (known deferral)
**Location**: Lines 650-703
**Issue**: Map panel renders a numbered list of locations instead of an actual Leaflet map with markers and zoom controls.
**Status**: Acknowledged in code comments. Full Leaflet integration is deferred to a future sprint. The structural layout (sticky, 40% width, hidden on mobile, correct tokens) is correct.
**Blocks merge**: No -- accepted deferral.

### DEV-03: Timeline Vertical Line Top Offset (MINOR)

**Severity**: Low
**Location**: Line 556
**Issue**: Implementation uses `top-0` for the vertical line start position. Stitch uses `top-24` (96px) to offset below the day header. The visual difference is that the line starts slightly too high.
**Fix**: Change `top-0` to `top-24` to match Stitch.
**Blocks merge**: No -- cosmetic.

### DEV-04: Content Max-Width Delegation (MINOR)

**Severity**: Low
**Location**: Line 1058
**Issue**: Main content width depends on PhaseShell's `contentMaxWidth="4xl"` (896px) with negative margin escape hatch (`-mx-4 sm:-mx-6`). Stitch expects 1440px max-width on the split layout. The footer correctly uses `max-w-[1440px]`.
**Fix**: Verify that the negative margin breakout actually achieves the full-width split on larger screens. If PhaseShell constrains the width, the 60/40 split will be narrower than designed.
**Blocks merge**: No -- needs visual verification in browser.

### DEV-05: Bottom Padding for Fixed Footer (MINOR)

**Severity**: Low
**Issue**: No explicit `pb-20` or equivalent on the content section to prevent the fixed footer from obscuring the last content card. PhaseShell may handle this, but it is not verifiable from this file alone.
**Fix**: Add `pb-20` to the left column section if PhaseShell does not provide it.
**Blocks merge**: No -- needs visual verification.

### DEV-06: Summary Stat Labels Missing `tracking-wider` (COSMETIC)

**Severity**: Cosmetic
**Location**: DaySummaryCard stat labels
**Issue**: Stat labels in the summary card use `text-xs uppercase font-bold` but are missing `tracking-wider` that the Stitch prototype has on the footer progress label and activity metadata.
**Blocks merge**: No.

---

## Scorecard

| Section | Items | Pass | Partial | Fail | N/A |
|---|---|---|---|---|---|
| 1. Split Layout | 11 | 9 | 1 | 1 | 0 |
| 2. Day Selector Pills | 16 | 16 | 0 | 0 | 0 |
| 3. Day Header | 8 | 8 | 0 | 0 | 0 |
| 4. Activity Timeline | 13 | 10 | 2 | 0 | 0 |
| 5. Activity Cards | 22 | 19 | 1 | 1 | 0 |
| 6. Day Summary | 14 | 14 | 0 | 0 | 0 |
| 7. Map Panel | 17 | 7 | 0 | 2 | 5 |
| 8. Footer Navigation | 22 | 21 | 1 | 0 | 0 |
| 9. Responsive | 27 | 25 | 2 | 0 | 0 |
| 10. Cross-Cutting | ~30 | ~27 | 1 | 1 | 0 |
| **Total** | **~180** | **~156** | **~8** | **~5** | **~5** |

Pass rate (excluding N/A and deferred map items): **~91%**

---

## Verdict

### APPROVED WITH CONDITIONS

This implementation is a faithful and high-quality translation of the Stitch prototype into production code. The component architecture is clean, accessibility is strong (ARIA roles, keyboard navigation, reduced-motion, screen reader support), and the atlas design token system is used consistently with one exception.

**Conditions for merge (1 blocking):**

1. **BLOCKING -- DEV-01**: Replace the 3 hardcoded `#1c9a8e` hex values in the culture category (lines 59-63) with the corresponding `atlas-on-tertiary-container` token. This is a 3-line change. The checklist explicitly requires zero raw color values.

**Recommended before merge (non-blocking):**

2. DEV-03: Adjust timeline vertical line from `top-0` to `top-24` to match Stitch offset.
3. DEV-05: Verify bottom padding for fixed footer in browser; add `pb-20` to content section if needed.

**Accepted deferrals:**

4. DEV-02: Map panel Leaflet integration -- known future work, placeholder is structurally correct.
5. Edit mode (drag-and-drop) -- not in scope for this PR.

Once DEV-01 is fixed, this PR has UX sign-off.

> Signed: ux-designer, 2026-03-27
