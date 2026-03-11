# SPEC-UX-004: Preferences Pagination -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (profile improvement, no dedicated product spec)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

Fill out travel preferences comfortably without feeling overwhelmed by a wall of 10 categories at once -- and be able to read chip labels fully even on small screens.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Likely to fill all 10 categories thoroughly; pagination prevents fatigue |
| `@leisure-family` | May fill preferences on mobile while coordinating with family; readable chips are essential |
| `@business-traveler` | Wants to fill preferences quickly; clear pagination shows "how much is left" reducing anxiety |
| `@bleisure` | Mix of business and leisure preferences; split pages help them think about each category distinctly |
| `@group-organizer` | May set preferences on behalf of the group; paginated flow is easier to explain/delegate |

## 3. User Flow

### Happy Path

1. User navigates to their profile or is directed to preferences from onboarding
2. Section header shows: title, subtitle, progress bar (X of 10 filled)
3. Page 1 displays categories 1-5 with all their chips visible
4. User selects preferences in each category (auto-saves on each selection)
5. User clicks "Next" to go to Page 2
6. Page 2 displays categories 6-10
7. User selects remaining preferences
8. Progress bar updates in real-time as selections are made
9. User can click "Previous" to go back to Page 1 at any time

```
[User opens Preferences]
    |
    v
[Header: title + progress bar (X/10)]
    |
    v
[Page 1: categories 1-5]
    |
    +---[User selects chips]--->[Auto-save, progress updates]
    |
    +---[Clicks "Next"]
    |
    v
[Page 2: categories 6-10]
    |
    +---[User selects chips]--->[Auto-save, progress updates]
    |
    +---[Clicks "Previous"]--->[Back to Page 1]
    |
    v
[All 10 done -> progress bar full, badge unlocked]
```

### Alternative Paths

- **User only fills some categories**: Progress bar shows partial progress. No blocking -- user can leave at any time. Categories with selections show a summary in the collapsed header.
- **User returns later**: Previously saved preferences are pre-populated. Progress bar reflects saved state. User lands on Page 1 by default but can navigate to Page 2.
- **Preferences displayed within expedition flow** (excludeCategories prop): When certain categories are excluded, the pagination math adjusts. If 5 or fewer categories remain, show them all on one page (no pagination).

### Error States

- **Save failure**: Inline error message below the progress bar: "Nao foi possivel salvar suas preferencias. Suas selecoes serao salvas quando a conexao voltar." / "Could not save your preferences. Your selections will be saved when the connection returns." Selections remain in local state and retry on next interaction.
- **Network unavailable**: Same as save failure. Local state preserved.

### Edge Cases

- **excludeCategories reduces total to <= 5**: Show all categories on a single page. No pagination controls. Progress bar adjusts to show X of (total - excluded).
- **User rapidly switches pages**: Debounce save (500ms, existing). Page transitions do not interrupt pending saves.
- **Chip text is very long (localization)**: Chips expand vertically to fit text. Never truncate. On very small screens (320px), chips take full width (1 column) to ensure readability.

## 4. Screen Descriptions

### Screen 1: Preferences Section (Paginated)

**Purpose**: Allow the traveler to set travel preferences across 10 categories without cognitive overload, with full chip text visibility on all screen sizes.

**Layout -- Top to Bottom**:

1. **Section header card** (persists across pages):
   - Title: "Preferencias de Viagem" / "Travel Preferences" (bold, 16px)
   - Subtitle: "Personalize sua experiencia..." (muted, 12px)
   - Progress bar: 10-segment bar showing filled vs unfilled categories
   - Progress text: context-sensitive (start hint / continue hint / complete message)
   - Page indicator: "1 de 2" / "1 of 2" (muted, right-aligned)
   - Save status: "Salvando..." / "Saving..." or error message

2. **Category cards** (5 per page):
   - Each category is a collapsible card (existing pattern -- keep it)
   - Header shows: category title, summary of selections, expand/collapse arrow
   - Left border accent (3px primary color) when category has selections
   - Expanded view shows: question text, chip grid, points label

3. **Pagination controls** (below category cards):
   - Previous button (outline/secondary): visible on Page 2, hidden on Page 1
   - Next button (primary): visible on Page 1, hidden on Page 2
   - Layout: two buttons side by side, right-aligned
   - Between the buttons: page indicator "Pagina 1 de 2" / "Page 1 of 2"

**Page 1 categories** (5):
1. Travel Pace (travelPace) -- single select
2. Food Preferences (foodPreferences) -- multi select
3. Interests (interests) -- multi select
4. Budget Style (budgetStyle) -- single select
5. Social Preference (socialPreference) -- multi select

**Page 2 categories** (5):
6. Accommodation Style (accommodationStyle) -- multi select
7. Fitness Level (fitnessLevel) -- single select
8. Photography Interest (photographyInterest) -- single select
9. Wake Preference (wakePreference) -- single select
10. Connectivity Needs (connectivityNeeds) -- single select

This grouping is intentional: Page 1 contains the categories most relevant to AI trip generation (pace, food, interests, budget, social). Page 2 contains lifestyle/logistic categories. This ensures users who only fill Page 1 still provide the most valuable data for AI personalization.

**Chip Grid -- Revised Layout**:

The current 2-column (mobile) / 3-column (sm+) grid truncates chip text. New specification:

| Breakpoint | Columns | Chip behavior |
|---|---|---|
| < 375px | 1 column | Full width, text wraps |
| 375-767px | 2 columns | Text wraps within chip, min-height 44px |
| 768px+ | 3 columns | Text wraps within chip, min-height 40px |

Chips MUST:
- Never truncate text (remove `truncate` / `line-clamp-1` classes)
- Wrap text to multiple lines if needed
- Maintain minimum touch target of 44x44px on mobile
- Show description text (if available) below the label in smaller, muted text
- Have adequate padding: 8px horizontal, 8px vertical minimum

**Interactive Elements**:

- **Category collapse/expand** (existing pattern):
  - Default: collapsed, shows summary
  - Click: toggles expanded/collapsed
  - Expanded: shows question + chip grid
  - `aria-expanded` on the toggle button, `aria-controls` pointing to panel

- **Preference chips**:
  - Default: outlined, muted background
  - Selected: filled primary color, white/contrasting text
  - Hover: subtle background change
  - Focus: ring highlight (2px)
  - Disabled: reduced opacity (for mutual exclusivity, e.g., "no_restrictions")
  - `role="radio"` (single) or `role="checkbox"` (multi) -- existing

- **Next button**:
  - Default: primary style
  - Hover: slightly elevated
  - Focus: ring
  - Label: "Proximo" / "Next" with right arrow icon

- **Previous button**:
  - Default: outline/secondary style
  - Hover: subtle fill
  - Focus: ring
  - Label: left arrow icon + "Anterior" / "Previous"

**Empty State**: All categories show "Nao preenchido" / "Not filled" summary text. Progress bar at 0/10. Page 1 is shown by default.

**Loading State**: When the component mounts with initialPreferences, categories render immediately with pre-populated data. No loading skeleton needed (data comes from server component props).

**Error State**: Save error shown as inline text below the progress bar (red, role="alert"). Does not block interaction -- user can continue selecting preferences; save retries on next selection.

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Full-width cards, 16px side padding. Chip grid 2 columns (1 column below 375px). Pagination buttons full-width stacked (Previous on top, Next below). Page indicator centered between. |
| Tablet (768-1024px) | Cards max-width 640px, centered. Chip grid 3 columns. Pagination buttons inline, right-aligned. |
| Desktop (> 1024px) | Cards max-width 640px, centered or left-aligned in profile page layout. Same as tablet. |

## 5. Interaction Patterns

- **Page transitions**: When clicking Next/Previous, the current page's categories fade out (150ms) and the new page's categories fade in (150ms). With `prefers-reduced-motion`: instant swap, no animation.
- **Auto-save feedback**: "Salvando..." text appears near the progress bar during save. Disappears on success. On failure, shows error text that persists until next successful save.
- **Success feedback**: Progress bar segment fills immediately on selection (optimistic UI). Points label "+5" appears briefly if this is the first selection in a category.
- **Error feedback**: Inline error text below progress bar. No toast. Error persists until resolved.
- **Progressive disclosure**: Categories remain collapsible (existing pattern). The pagination is the primary disclosure mechanism -- 5 categories at a time instead of 10.

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [ ] All category toggle buttons reachable via Tab
  - [ ] All chips within expanded categories reachable via Tab
  - [ ] Next/Previous buttons reachable via Tab
  - [ ] Tab order: header -> category 1 toggle -> (if expanded) chips -> category 2 toggle -> ... -> pagination buttons
  - [ ] Focus indicator visible on all interactive elements (2px)
  - [ ] When switching pages, focus moves to the first category toggle on the new page
  - [ ] No keyboard traps
- **Screen Reader**:
  - [ ] Section title announced as heading (h3)
  - [ ] Each category toggle has `aria-expanded` and `aria-controls` (existing)
  - [ ] Chip groups have `role="radiogroup"` (single) or `role="group"` (multi) with `aria-label` (existing)
  - [ ] Each chip has `role="radio"` or `role="checkbox"` with `aria-checked` (existing)
  - [ ] Progress bar has text alternative: "X de 10 categorias preenchidas" / "X of 10 categories filled"
  - [ ] Page change announced via `aria-live="polite"` region: "Pagina 2 de 2" / "Page 2 of 2"
  - [ ] Save status announced via `aria-live="polite"` (existing)
  - [ ] Error messages linked to context via `role="alert"` (existing)
- **Color & Contrast**:
  - [ ] Selected chip text on primary background: must pass 4.5:1
  - [ ] Unselected chip text on muted background: must pass 4.5:1
  - [ ] Left accent border is decorative (not sole information carrier -- summary text also indicates selection)
  - [ ] Progress bar filled vs unfilled segments distinguishable without color (filled segments could use a pattern or different border in addition to color)
- **Motion**:
  - [ ] Page transition fade respects `prefers-reduced-motion` (instant swap)
  - [ ] Points animation (+5) respects `prefers-reduced-motion` (existing concern from E2E audit)
- **Touch**:
  - [ ] All chips are at least 44x44px touch target on mobile
  - [ ] Pagination buttons are at least 44px tall
  - [ ] Category toggle headers are at least 44px tall (existing: py-3 on text = ~44px, verify)
  - [ ] Adequate spacing between chips (8px gap minimum)

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `section_title` | Preferencias de Viagem | Travel Preferences |
| `section_subtitle` | Personalize sua experiencia de viagem | Personalize your travel experience |
| `cta_next` | Proximo | Next |
| `cta_previous` | Anterior | Previous |
| `page_indicator` | Pagina {current} de {total} | Page {current} of {total} |
| `progress_start` | Comece selecionando suas preferencias | Start by selecting your preferences |
| `progress_continue` | Faltam {remaining} categorias | {remaining} categories remaining |
| `progress_complete` | Todas as preferencias preenchidas! | All preferences filled! |
| `saving` | Salvando... | Saving... |
| `not_filled` | Nao preenchido | Not filled |
| `points_per_category` | +5 pontos | +5 points |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Save failed | Nao foi possivel salvar suas preferencias. Suas selecoes serao salvas quando a conexao voltar. | Could not save your preferences. Your selections will be saved when the connection returns. |

### Tone of Voice

- Encouraging and non-pressuring. Progress hints motivate without guilt-tripping.
- "Start by selecting" is an invitation, not a demand.
- Completion message is celebratory: "All preferences filled!" with the gamification badge.

## 8. Constraints (from Product Spec)

- 10 preference categories defined in `preferences.schema.ts` -- this is the authoritative list
- Preferences stored as JSON field in UserProfile (not 10 separate columns)
- Gamification: +5 points per category first fill, badge at 10/10 (+25 bonus), max 75 points total
- Auto-save with 500ms debounce (existing)
- The `excludeCategories` prop must continue to work (used when preferences are shown within expedition flow)
- Chip labels come from i18n keys, not hardcoded text

## 9. Prototype

- [ ] Prototype required: No
- **Notes**: The pagination is a straightforward UX pattern (show 5 items, Next/Previous buttons). The chip text fix is CSS (remove truncation, allow wrapping). No novel interaction patterns that require prototype validation.

## 10. Open Questions

- [ ] Should the page grouping (categories 1-5 and 6-10) be fixed or should we order by "most impactful for AI" on page 1? Recommendation: fixed grouping as specified (Page 1 = trip-shaping preferences, Page 2 = lifestyle preferences). This is already reflected in the spec above. (Product Owner to confirm)
- [ ] Should there be a "Skip" option to bypass preferences entirely? Currently there is no skip -- the section is always shown but is non-blocking (all optional). Recommendation: keep current behavior (no explicit skip, user can simply navigate away). (Product Owner to decide)
- [ ] On the profile page, should pagination be the default or should there be a "Show all" toggle for power users who prefer seeing everything at once? Recommendation: pagination only, no toggle. Simplicity over flexibility here. (UX decision, documented)

---

## Dark Theme Considerations

- Category cards: `bg-card` background, `border-border` border (existing, adapts automatically)
- Selected chips: primary color background with white text. Verify contrast in dark mode -- `bg-primary` on dark typically uses the orange (#E8621A). White text on #E8621A = 3.1:1 (FAILS AA for normal text). Solution: use `text-primary-foreground` which should be configured for sufficient contrast. If not, the chip needs a darker variant in dark mode.
- Unselected chips: `bg-muted` background, `text-foreground` text (adapts automatically)
- Progress bar segments: filled = `bg-primary`, unfilled = `bg-muted` (adapts)
- Pagination buttons: standard button variants (adapt automatically)

**Action item**: Verify `text-primary-foreground` contrast on `bg-primary` in dark mode. If below 4.5:1, create a dark-mode-specific chip selected state.

## Motion Specifications

- **Page transition**: `opacity 1->0` (150ms ease-out) on exit, `opacity 0->1` (150ms ease-out) on enter. Reduced motion: instant swap.
- **Progress bar fill**: `width` transition on the filled portion, 300ms ease-out. Reduced motion: instant width change.
- **Points badge (+5)**: `motion-safe:animate-bounce` for 2 seconds, then disappear. Reduced motion: static text, disappears after 2 seconds.
- **Save indicator**: Fade in/out (150ms). Reduced motion: instant appear/disappear.

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft -- split 10 categories into 2 pages, fix chip truncation |
