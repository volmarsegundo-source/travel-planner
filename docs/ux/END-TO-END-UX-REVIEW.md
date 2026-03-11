# End-to-End UX Audit -- Atlas Travel Planner v0.15.1

**Author**: UX Designer
**Date**: 2026-03-10
**Scope**: Complete application audit -- Register through Phase 6
**Status**: FINAL

---

## Executive Summary

### Overall UX Grade: C+ (Functional but Inconsistent)

The application is feature-complete through Phase 6 with solid foundational UX decisions (i18n, ARIA attributes, touch targets, trust signals). However, the accumulated technical debt across 21 sprints has created a fragmented user experience with three distinct visual languages competing for attention. The gamification layer is undercooked, the Phase 4 architecture breaks wizard conventions, and transition animations lack polish and consistency.

### Top 5 Priorities (ordered by traveler impact)

| # | Issue | Severity | Area |
|---|---|---|---|
| 1 | Phase 4 uses tabs instead of wizard steps, breaking mental model | Critical | Consistency |
| 2 | Three different transition/animation styles across phases | Major | Transitions |
| 3 | Progress bar labels invisible on mobile, phases 7-8 confusing | Major | Navigation |
| 4 | DestinationAutocomplete dropdown z-index/styling inconsistencies | Major | Form UX |
| 5 | No unified loading/saving feedback pattern across forms | Major | Micro-interactions |

---

## A. Consistency Audit

### A-1. Header Pattern (title + subtitle)

**Current state**: Three different header patterns observed.

| Phase | Pattern | h1 class | Subtitle class | Container |
|---|---|---|---|---|
| Phase 1-2 | PhaseProgressBar + centered h1 + subtitle | `text-2xl font-bold text-foreground` | `text-muted-foreground` | `mt-2 text-center` |
| Phase 3-4 | ExpeditionProgressBar + centered h1 + subtitle + destination badge | Same | Same | `mt-4 text-center` |
| Phase 5 | ExpeditionProgressBar + centered h1 + subtitle + destination | Same | Same | `mt-4 text-center` |
| Phase 6 | No progress bar, different layout entirely | `text-2xl font-bold` (no text-foreground) | `text-sm text-muted-foreground` | `mb-6 space-y-1` (left aligned) |

**Findings**:

- **[MAJOR] Phase 1-2 use `PhaseProgressBar` (step-level), Phase 3-5 use `ExpeditionProgressBar` (phase-level)**. Phase 1-2 lack the phase-level expedition bar, so a user starting Phase 1 has no visual cue where they are in the 8-phase journey. Phase 6 has no progress bar at all.
- **[MINOR] Phase 6 header is left-aligned** while all others are centered. This creates a jarring visual shift.
- **[MINOR] The `mt-2` vs `mt-4` gap between progress bar and header** varies between Phase 1-2 (mt-2) and Phase 3-5 (mt-4). Minor but contributes to inconsistency.
- **[ENHANCEMENT] Destination badge** shows in Phase 3-4 as `text-atlas-teal dark:text-atlas-teal-light` but Phase 5 uses `text-atlas-teal-light` only -- not the same dual-mode pattern.

**Recommendation**: Create a `PhaseHeader` component used by all phases:
```
<PhaseHeader
  currentPhase={N}
  totalPhases={8}
  title={t("title")}
  subtitle={t("subtitle")}
  destination={destination}
  tripId={tripId}
/>
```

### A-2. Progress Indicators

**Current state**: Two separate progress bar components exist.

| Component | Used in | Visual | Purpose |
|---|---|---|---|
| `PhaseProgressBar` | Phase 1-2 | Filled dots (atlas-gold completed, muted pending) | Step progress within a phase |
| `ExpeditionProgressBar` | Phase 3-5, NOT 6 | Colored bars (teal=past, gold=current, muted=future) | Phase progress across expedition |
| `DashboardPhaseProgressBar` | Dashboard ExpeditionCard | Segmented bar with icons (check, construction) | Phase overview on cards |

**Findings**:

- **[MAJOR] Phase 1-2 do not show `ExpeditionProgressBar`**. Users in Phase 1 cannot see where they are in the 8-phase journey.
- **[MAJOR] Phase 6 has no progress indicator at all** in the generated itinerary view (after generation completes). The empty state has a title/subtitle but once the `ItineraryEditor` loads, the user loses all expedition context.
- **[CRITICAL] `PhaseProgressBar` and `ExpeditionProgressBar` look completely different**. `PhaseProgressBar` uses a horizontal dot pattern (8px height, gap-2), while `ExpeditionProgressBar` uses narrow rectangular segments (8px height, gap-1.5). A user going from Phase 2 to Phase 3 sees a jarring visual shift.
- **[MINOR] `DashboardPhaseProgressBar` phase labels** are hidden on mobile via `hidden sm:block` (line 65, 90-91). This means mobile users see colored segments with checkmarks and construction icons but no text identifying which phase is which. The `title` attribute provides tooltip text on desktop but is not accessible on touch devices.

**Recommendation**: Unify into a single `ExpeditionProgressBar` that takes a `showStepProgress` prop:
- Always show the 8-phase bar at the top
- Below it, show step progress within the current phase (if applicable)
- Ensure labels are visible on mobile (use abbreviated names or icons)

### A-3. Button Placement and Styling

**Current state**: Two button layout patterns compete.

| Pattern | Used in | Layout |
|---|---|---|
| Full-width primary | Phase 1 step 1, Phase 2 traveler type, Phase 5-6 generate | `w-full` Button with `size="lg"` |
| Back + Primary (1:3 ratio) | Phase 1 steps 2-4, Phase 2 accommodation onward | `flex gap-3` with outline `flex-1` back + primary `flex-[3]` |

**Findings**:

- **[MINOR] Back button uses arrow character** (`←` via `\u2190` and `&larr;`) rather than a translatable text label with icon. Screen readers announce this as "left-pointing arrow" rather than "Back" or "Voltar". The back button lacks `aria-label`.
- **[MINOR] Phase 4 "Advance" button** uses conditional styling: amber when not all prerequisites met, default primary when complete. This is a good pattern but is not used consistently in Phase 3 (which has the same logic with a different amber implementation).
- **[ENHANCEMENT] No disabled state explanation** -- when the advance button is disabled during submission, the button says "Carregando..." but there is no progress indicator or context for what is happening.

### A-4. Card/Form Layouts

**Findings**:

- **[MINOR] Two different card border styles**: `rounded-xl border border-border bg-card` (TransportStep, AccommodationStep) vs `rounded-xl border border-border bg-muted` (Phase 1 confirmation summary). The bg-muted vs bg-card inconsistency makes confirmation sections look different from form sections.
- **[MINOR] Form field gap inconsistency**: Phase 1 uses `gap-1.5` between label and input, Phase 4 TransportStep uses no explicit gap (Label followed by Input without wrapper). The `grid gap-4 sm:grid-cols-2` pattern in TransportStep/AccommodationStep is good and consistent.

### A-5. Error Message Presentation

**Current state**: All phases use the same error banner pattern:
```
rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30
```

**Findings**:

- **[MINOR] Consistent pattern -- good**. Error banners are visually identical across all phases.
- **[MAJOR] Error messages are not linked to specific fields** via `aria-describedby` in wizard phases. The error message is a generic banner above the form content, but for validation errors like "Destination required", the error should be linked to the destination input. Only the LoginForm and RegisterForm properly link errors to fields.
- **[MINOR] Error message translation inconsistency**: Some errors use `errorMessage.startsWith("errors.")` pattern to resolve i18n keys (Phase 2-4), while Phase 1 directly uses `t("errors.destinationRequired")`. The mixed approach makes maintenance harder.
- **[MAJOR] Hardcoded English text in Phase 2 confirmation**: The preferences count displays `{filledPrefs.length} {filledPrefs.length === 1 ? "category" : "categories"}` (Phase2Wizard lines 493-496). This text is never translated -- Portuguese users see English "categories" in the confirmation summary. Must use an i18n key with ICU pluralization.
- **[ENHANCEMENT] No inline field validation** -- all validation happens on submit/next. Adding real-time validation (onBlur) would reduce error frequency.

### A-6. Loading States

**Findings**:

- **[MAJOR] Phase 4 loading state** is a simple text-only `{tCommon("loading")}` centered in the tab panel area. No skeleton, no spinner, no animation. This is below the quality bar for a data-loading state.
- **[MINOR] Phase 6 has an excellent loading state** with spinner, progress message, progress bar, skeleton loaders, and cancel button. This should be the reference pattern.
- **[MINOR] Spinner component is duplicated** -- both LoginForm and RegisterForm define their own `Spinner()` SVG component inline. This should be extracted to a shared component.

### A-7. Empty States

**Findings**:

- **[MINOR] Dashboard empty state is well-designed**: compass emoji, title, subtitle, CTA button. Good pattern.
- **[MINOR] Phase 6 empty state is also well-designed**: Map icon in gold circle, title, subtitle, CTA with sparkle icon.
- **[ENHANCEMENT] No empty state for TransportStep, AccommodationStep, or MobilityStep** when no data exists. The default behavior is to show one empty form entry, which is functional but could benefit from a brief explanation of why this section matters.

---

## B. Transitions and Animations Audit

### B-1. Animation Components Inventory

| Component | Animation | Duration | Trigger |
|---|---|---|---|
| `PointsAnimation` | Full-screen overlay, fade in/out, opacity transition | 2500ms display + 300ms fade | Phase completion (points awarded) |
| `PhaseTransition` | Full-screen overlay, emoji swap (checkmark -> rocket), auto-advance | 1200ms celebration + 2000ms auto-advance | After PointsAnimation dismisses |
| Phase 3 `itemPoints` popup | `animate-bounce` on a floating badge | 2000ms timeout | Checklist item toggled |
| Phase 5 `sectionPoints` popup | `animate-bounce` on a floating badge | 2000ms timeout | Guide section viewed |
| Phase 6 progress spinner | Large spinning circle + skeleton loaders | Duration of AI generation | AI itinerary generation |
| `DashboardPhaseProgressBar` current segment | `animate-pulse` | Infinite | Current phase indicator |
| `AtlasHeroMap` pin pulse | SVG `<animate>` (radius + opacity cycle) | 2s infinite | Map destination markers |

### B-2. Issues Found

- **[CRITICAL] Three incompatible animation systems**:
  1. **CSS transitions** (opacity, transform) used by PointsAnimation and PhaseTransition
  2. **Tailwind keyframe animations** (animate-bounce, animate-pulse, animate-spin) used by progress indicators and point popups
  3. **SVG `<animate>`** used by AtlasHeroMap pins

  These are technically different layers, but the user perceives them as a jarring mishmash. The PointsAnimation fade is smooth; the bounce popup is cheap-feeling; the pulse is ambient. There is no unified motion design language.

- **[MAJOR] PointsAnimation auto-dismisses after 2.5 seconds** with no user control. If a user earns a badge and a rank simultaneously, the overlay shows three lines of text that may not be fully read before dismissal. There is no "tap to continue" affordance.

- **[MAJOR] PhaseTransition auto-advances after 2 seconds** once the "advancing" state appears. The user gets a "Continue" button but also an auto-advance timer. If the user is reading the phase name, they get teleported to the next phase. The `autoAdvance` label is in tiny 70% opacity text at `text-xs`. This is anxiety-inducing for slow readers and users with cognitive disabilities.

- **[MINOR] `prefers-reduced-motion` is NOT respected** by any animation component. The animate-pulse, animate-bounce, animate-spin, and SVG animate elements continue regardless of user motion preferences. This is a WCAG 2.1 AA violation (2.3.3 Animation from Interactions).

- **[MINOR] The PointsAnimation background overlay** (`bg-black/50`) does not trap focus. The underlying page remains interactive to keyboard users while the overlay is visible. This is a focus trap violation.

### B-3. Unified Transition System Specification

**Recommended architecture**:

```
Phase Complete
    |
    v
[PointsOverlay] -- 3s, tap-to-continue, shows points + badge + rank
    |
    v (on dismiss OR after 5s)
[PhaseTransition] -- celebration card (1.5s) then advance card
    |                 NO auto-advance, requires explicit tap
    v
[Next Phase loads]
```

**Motion tokens to define**:
- `--duration-fast`: 150ms (hover, focus)
- `--duration-normal`: 300ms (panel open/close, element enter/exit)
- `--duration-slow`: 500ms (page transitions, overlay enter/exit)
- `--duration-celebration`: 3000ms (points display minimum)
- `--easing-default`: `cubic-bezier(0.4, 0, 0.2, 1)`
- `--easing-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)` (for celebration bounce)

**All animations must**:
1. Respect `prefers-reduced-motion: reduce` by collapsing to instant state changes
2. Use consistent easing curves
3. Never auto-advance without explicit user control (except dismissible toasts)

---

## C. Form UX Audit

### C-1. Input Field Sizes and Spacing

**Findings**:

- **[MINOR] Two input styling approaches**:
  1. shadcn `<Input>` component (used in auth forms, Phase 1, Phase 2 budget, Phase 4 transport/accommodation)
  2. Raw `<input>` with manual Tailwind classes (used in DestinationAutocomplete, Phase 1 bio textarea, Phase 3 checkbox)

  The shadcn Input has consistent height, border, and focus ring. The raw inputs sometimes miss focus ring styles.

- **[MINOR] `<textarea>` elements** in Phase 1 (bio) and Phase 4 (TransportStep notes, AccommodationStep notes) use different class strings. Phase 1 bio textarea has `focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50` while Phase 4 notes use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. These produce different visual results (focus vs focus-visible).

- **[MINOR] `<select>` elements** (Phase 2 currency, PassengersStep child ages) use raw HTML styling that does not match the shadcn Input aesthetic. The currency select in Phase 2 line 357 manually applies `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm` -- functional but should use a shared Select component for consistency.

### C-2. Label Placement

**Findings**:

- **[MINOR] Consistent pattern**: Labels are above inputs using `<Label>` component or raw `<label>`. The gap between label and input is `gap-1.5` in most places.
- **[MINOR] Phase 2 traveler type step** uses `VisualCardSelector` with a hidden label (the `label` prop is used for `aria-label` on the radiogroup, not as a visible label). The `h2` element acts as the visible label, which is fine but the connection is implicit.

### C-3. Placeholder Text Quality

**Findings**:

- **[MINOR] Good placeholders**: Phase 1 name "Como voce gostaria de ser chamado?", bio "Conte um pouco sobre voce e seu estilo de viagem" are helpful and human.
- **[MINOR] Poor placeholder: Phase 4 currency** field uses `placeholder="BRL"` as a hardcoded English/Portuguese string. This should be the default currency based on locale, not a static placeholder.
- **[ENHANCEMENT] Missing placeholders**: Phase 1 country and city inputs have no placeholder text. Adding hints like "ex: Brasil" and "ex: Sao Paulo" would help.

### C-4. Validation Feedback

**Findings**:

- **[MAJOR] All wizard phases use submit-time validation only**. There is no onBlur or onChange validation. Users fill multiple fields, press "Next", and then see a generic error banner at the top. They must scroll up to find the error, then scroll down to find the field. This is especially problematic on mobile.
- **[MINOR] RegisterForm has proper field-level errors** via react-hook-form. This pattern should be replicated in wizard steps.
- **[ENHANCEMENT] Required vs optional field indicators** are inconsistent. Phase 1 step 1 has a note "Estes dados sao opcionais" at the bottom. Phase 4 transport fields are all optional but there is no indication. Phase 1 step 2 destination is required but has no asterisk or "(required)" label.

### C-5. DestinationAutocomplete Issues

**Findings**:

- **[MAJOR] The autocomplete dropdown** uses `class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg"`. The `bg-card` class respects theme, but the dropdown items use `text-foreground/80` which reduces contrast. In dark mode, this can create items that are harder to read against the card background.
- **[MAJOR] No loading indicator text** is visible to screen readers. The spinning border circle has no `aria-label` or `role="status"`. The `isLoading` state only shows a visual spinner.
- **[MINOR] The dropdown sits directly below the input** with `mt-1`. In cases where the input is near the bottom of the viewport, the dropdown may extend below the visible area with no scroll-into-view behavior.

---

## D. Navigation Audit

### D-1. Phase Navigation (Back/Forward)

**Findings**:

- **[MAJOR] Users cannot go back to previous phases from within a phase wizard**. Once you are in Phase 3, there is no UI element to return to Phase 2. The only way back is:
  1. Use the browser back button (which may not work correctly with client-side state)
  2. Navigate to the dashboard and click the expedition card
  3. In Phase 3-5, use the `ExpeditionProgressBar` clickable segments for past phases

  Phase 1-2 lack the `ExpeditionProgressBar` entirely, so there is no way to navigate between phases from within the wizard content (the breadcrumb at the page level provides only a route back to the dashboard, not to other phases).

- **[MINOR] The `ExpeditionProgressBar`** makes past phases clickable (teal-colored segments) but the click target is only 24px wide and 8px tall (the `h-2 w-6` segment). This is well below the 44x44px minimum touch target for mobile. The `hover:-translate-y-0.5` provides no benefit on touch devices.

- **[ENHANCEMENT] No "Save and Exit" option** in any wizard phase. If a user is mid-wizard and needs to leave, their progress is lost (except Phase 4 which has explicit save buttons per tab).

### D-2. Progress Bar Intuition

**Findings**:

- **[MAJOR] The `DashboardPhaseProgressBar` phase labels** are always visible on desktop via `sm:opacity-100` but positioned with `absolute -top-8` which creates overlap with other content. The labels are white-on-dark backgrounds (`bg-foreground/90 text-background`) and are `pointer-events-none`, so they cannot be dismissed or interacted with. On mobile, they are hidden entirely (`hidden sm:block`).

- **[MINOR] Phases 7-8 show a `Construction` icon** (small, 12x12px) with `text-muted-foreground/50` -- barely visible. The "Coming soon" label at 8px font size is extremely difficult to read. Users may not understand what these segments represent.

### D-3. Breadcrumb Consistency

**Findings**:

- **[GOOD] Breadcrumbs are present** on all phase pages (1-6) and the dashboard. All use the same pattern: `Home > Expedition`.
- **[MINOR] Breadcrumb depth is shallow** -- all phase pages show the same `Home > Expedition` trail regardless of which phase the user is in. A richer breadcrumb like `Home > Expedition > Phase 3: Checklist` would provide better context.
- **[MINOR] Mobile breadcrumb** correctly simplifies to a back arrow + parent page name. Good pattern.

---

## E. Responsive Design Audit

### E-1. Wizard Layout on Mobile

**Findings**:

- **[MINOR] All wizards use `max-w-md` (448px)** which works well on all screen sizes. The `p-6` padding reduces available width on 320px screens to 272px, which is adequate.
- **[MINOR] Phase 4 uses `max-w-2xl` (672px)** which is wider than other phases. This creates a visual width inconsistency when transitioning from Phase 3 (448px) to Phase 4 (672px).
- **[MINOR] The grid layout in Phase 1 step 1** uses `grid grid-cols-2 gap-3` for country/city inputs. On 320px screens, each input gets approximately 124px of width. This is tight but functional.

### E-2. Touch Targets

**Findings**:

- **[MAJOR] `ExpeditionProgressBar` segments**: 24x8px (h-2 w-6). Well below 44x44px minimum. These are clickable navigation elements.
- **[MINOR] `DashboardPhaseProgressBar` segments**: h-2.5 flex-1. On 8 segments in a ~400px container, each is approximately 48x10px. Width passes, height fails.
- **[MINOR] `ChecklistRow` buttons**: Full-width, min-height not specified but padding `p-3` plus content creates adequate height. Passes.
- **[MINOR] `VisualCardSelector` cards**: `p-4` with content creates cards approximately 200x80px. Passes.
- **[MINOR] Passenger stepper buttons**: `h-11 w-11` (44x44px). Passes exactly.
- **[MINOR] `PreferenceChip`**: `min-h-[44px] min-w-[100px]`. Passes.
- **[MINOR] `LanguageSwitcher` links**: `px-2 py-1` -- approximately 30x28px. Below 44px touch target. Risk of mis-tap.
- **[MINOR] `ThemeToggle` button**: `h-9 w-9` (36x36px). Below 44px minimum.
- **[MINOR] Navbar hamburger**: `min-h-[44px] min-w-[44px]`. Passes.
- **[MINOR] `UserMenu` avatar button**: `min-h-[44px] min-w-[44px]`. Passes.

### E-3. Text Readability

**Findings**:

- **[MINOR] Phase labels** at `text-[8px]` in DashboardPhaseProgressBar and `text-[10px]` phase name tooltips. These are below the 12px minimum recommended for readable text.
- **[MINOR] Phase 4 transport type selector** buttons use `text-xs` (12px). This is the minimum acceptable size.

---

## F. Accessibility Audit

### F-1. ARIA Labels

**Findings**:

- **[GOOD] VisualCardSelector**: Proper `role="radiogroup"` with `aria-label`, buttons have `role="radio"` and `aria-checked`.
- **[GOOD] ChecklistRow**: `role="checkbox"` with `aria-checked` and descriptive `aria-label`.
- **[GOOD] DestinationAutocomplete**: `role="combobox"` with `aria-autocomplete`, `aria-expanded`, `aria-controls`, `aria-activedescendant`. Excellent implementation.
- **[GOOD] MobilityStep**: Uses `aria-pressed` for toggle buttons. Correct pattern.
- **[MAJOR] Back buttons in wizard steps** use `←` character with no `aria-label`. Screen readers announce "left-pointing arrow" which is not meaningful.
- **[MAJOR] Phase 4 car rental Yes/No buttons** use `aria-pressed` but they function as a mutually exclusive radio group. Should be `role="radiogroup"` with `role="radio"` and `aria-checked`.
- **[MAJOR] Phase 4 tab panel `aria-labelledby` references non-existent IDs**. Tab panels declare `aria-labelledby="tab-transport"` (line 455), `aria-labelledby="tab-accommodation"` (line 468), `aria-labelledby="tab-mobility"` (line 481), but the tab buttons have no `id` attributes at all. This creates broken ARIA references that screen readers cannot resolve.
- **[MINOR] ThemeToggle aria-label** is hardcoded in English: "Switch to light mode" / "Switch to dark mode". Should use i18n.

### F-2. Keyboard Navigation

**Findings**:

- **[MAJOR] No focus trap** on PointsAnimation and PhaseTransition overlays. These are modal overlays (`fixed inset-0 z-50`) but keyboard focus can reach elements behind them.
- **[MINOR] `VisualCardSelector`** does not support arrow key navigation between radio options. Standard radiogroup keyboard interaction expects ArrowUp/ArrowDown to move between options. Only Tab works currently.
- **[MINOR] `UserMenu` dropdown** does not support arrow key navigation between menu items. Users can Tab between items, but the standard menu keyboard pattern (ArrowUp/ArrowDown) is not implemented.

### F-3. Focus Management

**Findings**:

- **[GOOD] Phase 1 `goToStep`** function focuses the first input in the new step via `requestAnimationFrame`. This is a good pattern.
- **[GOOD] Phase 2 `goToStep`** uses the same pattern.
- **[MINOR] When PointsAnimation dismisses**, focus is not returned to any element. The user ends up in the PhaseTransition overlay with no focus management.
- **[MINOR] When an error banner appears**, focus is not moved to it. Users must visually discover the error.

### F-4. Color Contrast

**Findings**:

- **[MINOR] `text-muted-foreground/70`** used in several places (bio character count, auto-advance message, PreferenceCategory toggle chevron). The `/70` opacity reduces contrast below 4.5:1 in some theme combinations.
- **[MINOR] Phase labels** at `text-muted-foreground/50` and `text-muted-foreground/60` in DashboardPhaseProgressBar are likely below 3:1 contrast ratio for UI components.
- **[MINOR] `text-atlas-gold` on `bg-atlas-gold/10`** (used in trip type badge, points badges) -- need to verify contrast ratio. Gold-on-light-gold can be problematic.

### F-5. prefers-reduced-motion

**[MAJOR]** No component in the application checks `prefers-reduced-motion`. The following animations run unconditionally:
- `animate-pulse` (DashboardPhaseProgressBar current segment)
- `animate-bounce` (point popup badges)
- `animate-spin` (loading spinners)
- SVG `<animate>` (map pins)
- CSS opacity transitions (PointsAnimation)

This is a WCAG 2.1 AA violation. Recommendation: Add a global CSS rule:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## G. Dark Mode Audit

### G-1. Theme Coverage

**Findings**:

- **[GOOD] Most components use Tailwind semantic colors** (`text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`) which automatically adapt to theme. This is the correct approach.
- **[MAJOR] AtlasHeroMap has hardcoded colors**: `OCEAN_BG = "#0D1B2A"`, `CONTINENT_FILL = "#1E3A5F"`. These do not adapt to theme. The map always appears in dark mode aesthetics, which works well on the dark theme but clashes with the light theme.
- **[MINOR] Phase 6 AI disclaimer** uses explicit light/dark classes: `border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-200`. While this works, it introduces non-semantic colors that bypass the design system. Same pattern for the regenerate confirm dialog (`border-amber-200 bg-amber-50` etc.).
- **[MINOR] Phase 4 advance button** uses hardcoded amber colors for incomplete state: `bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700`. This pattern is also used in Phase 3. Should be a design token.

### G-2. Hardcoded Colors

| Component | Hardcoded Color | Issue |
|---|---|---|
| AtlasHeroMap | `#0D1B2A`, `#1E3A5F` | Always dark regardless of theme |
| Phase 6 AI disclaimer | `blue-200/50/800`, `blue-800/950/200` | Non-semantic, bypasses design system |
| Phase 6 regenerate confirm | `amber-200/50/800`, `amber-800/950/300` | Non-semantic, bypasses design system |
| Google icon in LoginForm | `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` | Brand colors -- acceptable |

---

## H. Micro-Interactions Audit

### H-1. Hover States

**Findings**:

- **[GOOD] VisualCardSelector cards**: `hover:border-atlas-gold/40` -- subtle border color shift. Good.
- **[GOOD] ExpeditionCard**: `hover:shadow-md hover:shadow-atlas-gold/5` -- subtle shadow lift. Good.
- **[MINOR] ChecklistRow**: `hover:border-atlas-gold/30` -- only on uncompleted items. Completed items have no hover feedback.
- **[MINOR] ThemeToggle**: `hover:bg-muted` -- adequate.

### H-2. Active/Pressed States

**Findings**:

- **[MINOR] No active/pressed state** defined for VisualCardSelector buttons. The selected state (border change) is good, but there is no immediate visual feedback on press (no scale, no color pulse).
- **[MINOR] Stepper buttons** (PassengersStep) have no active state beyond the default browser behavior.

### H-3. Success Feedback

**Findings**:

- **[MINOR] Phase 3 checklist toggle**: A `+points` badge bounces for 2 seconds. Functional but the bounce animation feels cheap. A brief scale + fade would be more polished.
- **[MINOR] Phase 5 section view**: Same bounce pattern for `+5` points badge.
- **[MAJOR] Phase 4 Transport/Accommodation save**: Button text changes to "Salvando..." / "Saving..." during save, but there is no success confirmation after save completes. The button reverts to "Salvar" / "Save" silently. The user has no confidence that the save worked. A brief success toast or checkmark animation is needed.

### H-4. Error Feedback

**Findings**:

- **[MINOR] Error banner pattern is consistent** across all phases. Good.
- **[MINOR] No shake/attention animation** on error. The banner appears statically. A brief attention animation (pulse, border flash) would help users notice the error, especially on longer forms where the banner may be above the fold.

### H-5. Loading Spinners/Skeletons

**Findings**:

- **[GOOD] Phase 6 generation state**: Full loading experience with spinner, progress messages, progress bar, skeleton loaders, and cancel button. This is the gold standard.
- **[MINOR] Phase 4 loading state**: Plain text "Carregando..." centered. Needs skeleton or spinner.
- **[MINOR] Button loading states**: Buttons show a Spinner SVG inline during submission. Consistent pattern. Could add `aria-busy="true"` to the parent form during submission (auth forms do this already).

---

## I. Gamification UX Audit

### I-1. Points Display Clarity

**Findings**:

- **[MINOR] PointsDisplay** on dashboard shows total points with compass emoji and "sr-only" text. Clean implementation. But the points have no context -- the user does not know how many points they need for the next rank.
- **[ENHANCEMENT] Add "X points to next rank" indicator** on the dashboard, either as a progress bar or text below the current points.

### I-2. Badge Earning Celebration

**Findings**:

- **[MAJOR] PointsAnimation auto-dismisses in 2.5 seconds**. For a badge earn + rank up (which can show 3 lines of text), this is not enough time. The celebration feels rushed.
- **[ENHANCEMENT] Badge history** is not visible anywhere in the current UI. Users earn badges but cannot review them. A badge collection screen on the profile would increase engagement.

### I-3. Rank Progression Visibility

**Findings**:

- **[MINOR] RankBadge** shows current rank with emoji and name. The rank colors use a progression from muted (traveler) to gold (ambassador). Good design.
- **[ENHANCEMENT] No rank progression explanation** -- users don't know what ranks exist or how to advance. A "Ranks" info section would add motivation.

### I-4. Progress Bar Satisfaction

**Findings**:

- **[MINOR] DashboardPhaseProgressBar** with 8 segments provides a clear visual of expedition progress. The checkmark icons on completed phases are satisfying.
- **[MINOR] Phases 7-8 with Construction icons** create uncertainty. Users may wonder if these phases are broken or simply not yet built. The "Coming Soon" text at 8px is too small to reassure.
- **[ENHANCEMENT] Consider using a different visual for "coming soon" phases**: a lighter fill with a "coming soon" tooltip on hover rather than a construction icon that suggests breakage.

---

## J. Internationalization (i18n) Audit

### J-1. Hardcoded Strings

**Findings**:

- **[MAJOR] Phase 2 confirmation summary**: `"category" / "categories"` hardcoded in English (Phase2Wizard lines 493-496). Portuguese users see English text.
- **[MAJOR] RegisterForm optional label**: `(opcional)` hardcoded in Portuguese (RegisterForm line 347). English users see `"Your name (opcional)"` -- mixed language.
- **[MINOR] ThemeToggle aria-labels**: `"Switch to light mode"` / `"Switch to dark mode"` hardcoded in English. Must use i18n keys.
- **[MINOR] `DashboardPhaseProgressBar` state labels**: `"completed"`, `"current"`, `"coming soon"`, `"upcoming"` (lines 80-85) are hardcoded in English for screen reader labels. Should use i18n keys.
- **[MINOR] Zod validation messages** in RegisterForm (line 31-33): `"Confirm password is required"` and `"Passwords do not match"` are in English in the schema. The `ZOD_MESSAGE_TO_KEY` map handles translation at display time, but if a Zod message is not mapped, the raw English string leaks to the UI.

### J-2. Translation Quality

**Findings**:

- **[GOOD] Both locales (en.json, pt-BR.json) appear complete** for all major sections.
- **[MINOR] Some key names use abbreviations** that could confuse translators: `step1.soloEmoji`, `step2.budgetEmoji`. The emoji values themselves are language-independent so this is acceptable.
- **[ENHANCEMENT] ICU message format** is used correctly for pluralization (`{count, plural, ...}`) in passenger totals. This should be applied to the hardcoded "categories" text in Phase 2.

---

## Phase 4 Redesign Specification

### Current Problem

Phase 4 ("A Logistica") uses a tabbed interface (Transport | Accommodation | Mobility) while all other phases use sequential wizard steps. This creates three problems:

1. **Mental model break**: Users have learned the step-by-step pattern from Phases 1-3. Tabs require a different interaction model.
2. **Save confusion**: Each tab has its own Save button, but users expect the overall "Advance to Phase 5" button to save everything. If they fill out transport, switch to accommodation without saving transport, their transport data may be lost.
3. **Progress uncertainty**: Within each tab, there is no indication of completion. Users cannot tell which tabs they have completed.

### Proposed Redesign: 3-Step Wizard

Replace tabs with 3 sequential wizard steps, consistent with other phases.

```
[ExpeditionProgressBar: Phase 4 highlighted]
[PhaseProgressBar: Step 1/3]

Step 1: Transport (Intercity)
  - Transport type selector (radiogroup)
  - N segments with add/remove
  - Auto-save on field change (debounced)
  - [Back] [Next]

Step 2: Accommodation
  - Accommodation type selector (radiogroup)
  - N entries with add/remove
  - Auto-save on field change (debounced)
  - [Back] [Next]

Step 3: Local Mobility + Confirmation
  - Mobility multi-select grid
  - Car rental prerequisite check
  - CINH warning (if applicable)
  - Summary card showing transport, accommodation, mobility choices
  - [Back] [Advance to Phase 5]
```

**Key changes**:
- Remove tabs entirely
- Add `PhaseProgressBar` with 3 steps
- Move car rental/CINH prerequisites to Step 3 (before confirmation)
- Add auto-save (debounced, like PreferencesSection) to eliminate explicit Save buttons
- Add step completion indicators (checkmark on PhaseProgressBar for steps with data)
- Reduce `max-w-2xl` to `max-w-md` for consistency with other phases
- Transport and Accommodation forms can remain at `max-w-2xl` with horizontal scroll or stacked layout on mobile

---

## Unified Design System Recommendations

### 1. Motion Design Tokens

```css
:root {
  --motion-duration-instant: 0ms;
  --motion-duration-fast: 150ms;
  --motion-duration-normal: 300ms;
  --motion-duration-slow: 500ms;
  --motion-duration-celebration: 3000ms;
  --motion-easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-fast: 0ms;
    --motion-duration-normal: 0ms;
    --motion-duration-slow: 0ms;
    --motion-duration-celebration: 0ms;
  }
}
```

### 2. Shared Components to Extract

| Component | Currently duplicated in | Proposed location |
|---|---|---|
| `Spinner` | LoginForm, RegisterForm | `src/components/ui/spinner.tsx` |
| `PhaseHeader` | Phase 1-6 (inline) | `src/components/features/expedition/PhaseHeader.tsx` |
| `WizardNavButtons` | Phase 1-4 (inline) | `src/components/features/expedition/WizardNavButtons.tsx` |
| `SaveIndicator` | PreferencesSection, TransportStep, AccommodationStep | `src/components/ui/save-indicator.tsx` |
| `SuccessToast` | Not implemented | `src/components/ui/success-toast.tsx` |

### 3. Wizard Step Pattern (codified)

Every wizard step must follow this structure:
```
<PhaseHeader />
<ExpeditionProgressBar currentPhase={N} />
<PhaseProgressBar currentStep={M} totalSteps={T} />

<div aria-live="polite">
  {errorBanner}
  {stepContent}
</div>

<WizardNavButtons
  onBack={...}
  onNext={...}
  backLabel={t("common.back")}
  nextLabel={t("common.next")}
  isLastStep={boolean}
  isSubmitting={boolean}
/>
```

### 4. Form Validation Pattern

- **onBlur validation** for individual fields (email format, date range, required fields)
- **onSubmit validation** for cross-field rules (password match, date range validity)
- **Inline error messages** linked via `aria-describedby` to their fields
- **Banner errors** only for server-side or cross-field errors
- **Focus the first errored field** after validation failure

### 5. Save Feedback Pattern

Every save action must provide:
1. **Loading state**: Button text changes + spinner icon
2. **Success state**: Brief checkmark animation or toast (2 seconds)
3. **Error state**: Error banner with retry path

### 6. Color Audit Actions

- Replace all `text-muted-foreground/50`, `text-muted-foreground/60`, `text-muted-foreground/70` with proper semantic tokens that guarantee contrast
- Define `--color-warning: amber-500` and `--color-warning-muted: amber-500/10` as design tokens rather than hardcoding amber classes
- Define `--color-info: blue-500` and `--color-info-muted: blue-50` tokens for informational banners

---

## Issue Severity Summary

| Severity | Count | Key Issues |
|---|---|---|
| Critical | 2 | Phase 4 tabs vs wizard steps; 3 competing animation systems |
| Major | 16 | Missing expedition progress bar (Phase 1-2, 6); auto-dismiss animations; no save confirmation; no focus traps; touch targets too small; back button accessibility; prefers-reduced-motion not respected; field-level error linking; autocomplete contrast; inline validation missing; phase navigation limitations; progress bar labels on mobile; loading state quality; PointsAnimation timing; Phase 4 broken aria-labelledby on tab panels; hardcoded English "categories" in Phase 2 confirmation |
| Minor | 30+ | Spacing inconsistencies; duplicated spinner; header alignment; select styling; placeholder quality; breadcrumb coverage; ThemeToggle English labels; hover state gaps; hardcoded colors |
| Enhancement | 10+ | Points-to-next-rank; badge collection screen; rank explanation; empty state guidance; required field indicators; form auto-save; coming-soon phase visual; error attention animation |

---

## Implementation Priority Order

1. **Sprint 22**: Phase 4 redesign (3-step wizard), prefers-reduced-motion global fix, extract PhaseHeader component
2. **Sprint 23**: Unified animation system (fix auto-dismiss, add focus traps), save feedback pattern, field-level validation
3. **Sprint 24**: Progress bar mobile labels, touch target fixes, ExpeditionProgressBar on all phases, back button accessibility
4. **Sprint 25**: Color contrast audit, dark mode hardcoded colors, shared component extraction (Spinner, WizardNavButtons)
5. **Sprint 26**: Gamification enhancements (rank progression, badge collection, points-to-next-rank)

---

> This audit was prepared by the UX Designer based on a comprehensive code review of all UI components, i18n files, and page structures. No production testing or user research was conducted -- findings are based on heuristic evaluation and WCAG 2.1 AA compliance analysis.
