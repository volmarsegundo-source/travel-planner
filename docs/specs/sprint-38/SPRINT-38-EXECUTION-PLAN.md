# Sprint 38 -- Execution Plan: Fundacao do Design System

**Version**: 1.0.0
**Date**: 2026-03-23
**Author**: tech-lead
**Sprint**: 38
**Target version**: v0.33.0
**Budget**: 50h (Track 1: 22h | Track 2: 25h | Cross-cutting: 3h)
**Specs**: SPEC-PROD-046, SPEC-PROD-047
**Source of truth**: UX-PARECER-DESIGN-SYSTEM.md (overrides DESIGN.md)

---

## Priority Order (PO-specified)

1. **FIRST**: Tailwind config + fonts + CSS globals (foundation -- blocks everything)
2. **SECOND**: Component library (depends on tailwind config being done)
3. **THIRD**: Feature flags + ESLint rules (can parallel with components)
4. **FOURTH**: Visual regression setup (depends on components)
5. **LAST**: E2E baseline (final validation)

---

## Track Assignment

### Track 1 -- dev-fullstack-1: Foundation + Infrastructure (~22h)

| Task | Description | Est | Dependencies | Can Parallel With |
|---|---|---|---|---|
| T1.1 (3h) | Extract ALL tokens from UX Parecer into token catalog | 3h | None | T1.3, T1.5 |
| T1.2 (4h) | Update tailwind.config.ts with 40+ color tokens, typography (Plus Jakarta Sans + Work Sans), spacing, border-radius, shadows -- all under `atlas-` prefix in `extend` | 4h | T1.1 | T1.3 |
| T1.3 (2h) | Install fonts via next/font (Plus Jakarta Sans + Work Sans) | 2h | None | T1.1, T1.5 |
| T1.4 (2h) | CSS custom properties in globals.css (all tokens as --atlas-* vars + prefers-reduced-motion) | 2h | T1.3 | T1.5 |
| T1.5 (3h) | Feature flag system: NEXT_PUBLIC_DESIGN_V2 env var + useDesignV2() hook + DesignBranch component | 3h | None | T1.1, T1.3 |
| T1.6 (3h) | ESLint rules: warn on hardcoded colors/spacing, enforce atlas-* prefix | 3h | T1.2 | T2.x (parallel) |
| T1.7 (3h) | Playwright visual regression: capture 10 baseline screenshots | 3h | T2.1-T2.7 | TC.3 |
| T1.8 (2h) | Unit tests for feature flag, token utilities, font loading | 2h | T1.5 | T1.6 |

### Track 2 -- dev-fullstack-2: Component Library (~25h)

**HARD DEPENDENCY**: Must wait for T1.2 (tailwind config) + T1.3 (fonts) before starting component code. Can read specs and prepare folder structure during days 1-2.

| Task | Description | Est | Dependencies | Can Parallel With |
|---|---|---|---|---|
| T2.1 (4h) | Button -- 7 variants (primary with navy-on-orange CTA fix, primary-dark, secondary, ghost, glass, icon-only, danger), 3 sizes, loading, icon, focus-visible:ring-2, 44px touch targets | 4h | T1.2, T1.3 | T2.2 (after T1.2 done) |
| T2.2 (4h) | Input -- label, error, helper, password toggle, 44px height, focus ring (NEVER ring-0), bg change on focus | 4h | T1.2 | T2.3 |
| T2.3 (3h) | Card -- 4 variants (base/elevated/dark/interactive), header/body/footer, hover for interactive, skeleton loading | 3h | T1.2 | T2.4 |
| T2.4 (3h) | Chip -- selectable/removable/colored, 44px touch target, arrow key nav, checkmark on selected (not color-only) | 3h | T1.2 | T2.5 |
| T2.5 (3h) | Badge -- 7 variants (status, rank, PA, category-overline, counter, ai-tip, notification with 99+ cap) | 3h | T1.2 | T2.6 |
| T2.6 (4h) | PhaseProgress -- 2 layouts (unified wizard + dashboard bar), 4 states, clickable completed, pulse active, glow amber | 4h | T1.2 | T2.7 |
| T2.7 (4h) | StepperInput -- 44px buttons (NOT 32px), spinbutton role, keyboard (arrows/Home/End), long-press increment | 4h | T1.2 | -- |

### Cross-cutting (~3h)

| Task | Description | Est | Dependencies | Owner |
|---|---|---|---|---|
| TC.1 (1h) | Update SPEC-STATUS.md with Sprint 38 entries | 1h | Specs approved | tech-lead |
| TC.2 (1h) | Sprint review document | 1h | Sprint complete | tech-lead |
| TC.3 (1h) | Verify E2E green (zero regressions) | 1h | All tasks complete | dev-fullstack-1 or 2 |

---

## Dependency Graph

```
                        DAY 1-2                         DAY 3-5                    DAY 5-7               DAY 7-9         DAY 9-10
                     ============                    ===========                 =========             =========         ========

TRACK 1:
  T1.1 (tokens)  -----> T1.2 (tailwind config) -----> T1.6 (ESLint) ................................................> T1.7 (visual regression)
  T1.3 (fonts)   -----> T1.4 (CSS vars)                                                                                    |
  T1.5 (flag)    -----> T1.8 (flag tests)                                                                                   |
       |                     |                                                                                               |
       |                     |   GATE: T1.2 + T1.3 done                                                                     |
       |                     +------------|------------+                                                                     |
       |                                  |            |                                                                     |
TRACK 2:                                  v            v                                                                     |
  (read specs,              T2.1 (Button)   T2.2 (Input)                                                                     |
   prep folders)            T2.3 (Card)     T2.4 (Chip) ------> T2.5 (Badge) -----> T2.6 (PhaseProgress)                     |
                                                                                     T2.7 (StepperInput)                     |
                                                                                            |                                |
                                                                                            v                                v
CROSS-CUTTING:                                                                         TC.1 (specs)               TC.3 (E2E validation)
                                                                                                                   TC.2 (sprint review)
```

**Critical path**: T1.1 -> T1.2 -> T2.1-T2.7 -> T1.7 -> TC.3

---

## Day-by-Day Execution Schedule

### Days 1-2: Foundation (Track 1 focus)

**dev-fullstack-1** (parallel):
- T1.1: Extract ALL tokens from UX Parecer (40+ colors, 9 semantic, 11 font-sizes, 8 shadows, 6 radii, 15 spacings, 5 transitions)
- T1.3: Install Plus Jakarta Sans + Work Sans via next/font
- T1.5: Feature flag system (can start immediately, no deps)

**dev-fullstack-2** (prep):
- Read UX Parecer Secao 2 exhaustively (component specs)
- Read SPEC-PROD-047 for AC mapping
- Create folder structure: `src/components/ui/{Button,Input,Card,Chip,Badge,PhaseProgress,StepperInput}/`
- Create index.ts skeletons for each component
- Set up cva (class-variance-authority) if not already installed

### Days 2-3: Tailwind Config + CSS + Tests

**dev-fullstack-1**:
- T1.2: Update tailwind.config.ts (BLOCKER for Track 2 -- highest priority)
- T1.4: CSS custom properties in globals.css (depends on T1.3)
- T1.8: Unit tests for feature flag and DesignBranch

**dev-fullstack-2**:
- Continue prep work
- Start T2.1 (Button) as soon as T1.2 merges or is available on branch

### Days 3-5: Components Begin + ESLint

**dev-fullstack-1**:
- T1.6: ESLint rules for token enforcement (warn level)

**dev-fullstack-2** (components with tokens available):
- T2.1: Button (7 variants, CTA contrast fix)
- T2.2: Input (focus ring fix, 44px height)
- T2.3: Card (4 variants)

### Days 5-7: Components Continue

**dev-fullstack-1**:
- Support Track 2 with any infra issues
- Start prepping T1.7 (visual regression setup)

**dev-fullstack-2**:
- T2.4: Chip (44px touch target, checkmark indicator)
- T2.5: Badge (7 variants)

### Days 7-9: Complex Components + Review

**dev-fullstack-2**:
- T2.6: PhaseProgress (2 layouts, 4 states -- most complex component)
- T2.7: StepperInput (44px buttons, keyboard nav)

**tech-lead**:
- TC.1: Update SPEC-STATUS.md
- Begin code review of T2.1-T2.5 (review as they come in, don't batch)

### Days 9-10: Validation + Wrap-up

**dev-fullstack-1**:
- T1.7: Capture 10 baseline screenshots (requires components done)

**Both devs**:
- TC.3: E2E validation, build verification
- Address any code review feedback

**tech-lead**:
- Final code reviews on T2.6, T2.7
- TC.2: Sprint review document
- Verify Definition of Done checklist

---

## Key Corrections from UX Parecer (Devs Must Read)

These corrections are NON-NEGOTIABLE. Any PR that violates them is automatically rejected.

### 1. Font Change
- **WRONG**: Outfit + DM Sans (from DESIGN.md)
- **CORRECT**: Plus Jakarta Sans (headlines) + Work Sans (body)
- **Source**: UX Parecer Secao 1.2

### 2. Color Token Count
- **WRONG**: 7-8 tokens from DESIGN.md
- **CORRECT**: 40+ tokens from UX Parecer Secao 1.1 (Material Design 3 palette) + 9 semantic tokens
- **Source**: UX Parecer Secao 1.1

### 3. CTA Button Text Color
- **WRONG**: White text on orange background (2.3:1 -- FAILS WCAG AA)
- **CORRECT**: Navy text (#040d1b / atlas-primary) on orange background (#fe932c / atlas-secondary-container) (7.5:1 -- PASSES)
- **Source**: UX Parecer Secao 2.1, Secao 4.2 (A1)

### 4. Focus Ring
- **WRONG**: `focus:ring-0` (as exported from Stitch) -- REMOVES focus indicator, violates WCAG 2.4.7
- **CORRECT**: `focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2` on ALL interactive elements
- **Source**: UX Parecer Secao 4.4

### 5. Touch Targets
- **WRONG**: Stepper buttons 32px, chips 28px, icon buttons 40px
- **CORRECT**: ALL interactive elements >= 44px (sm buttons exempt on desktop only)
- **Source**: UX Parecer Secao 4.3

### 6. Token Prefix
- **WRONG**: `navy-900`, `amber-500` (collides with Tailwind defaults)
- **CORRECT**: `atlas-primary`, `atlas-secondary-container` (M3 naming with atlas- prefix)
- **Source**: UX Parecer Secao 5.1

### 7. Reduced Motion
- **NOT IN v1.0.0**: Must add `@media (prefers-reduced-motion: reduce)` to globals.css
- **Source**: UX Parecer Secao 4.5

### 8. No Standard Tailwind Colors
- **RULE**: New components must NEVER use `slate-*`, `amber-*`, `green-*`, etc. Only `atlas-*` tokens.
- **Source**: UX Parecer Secao 5.5

---

## Code Review Checklist (tech-lead applies to every PR)

### Design System Compliance
- [ ] All colors use `atlas-*` tokens (zero hex values, zero Tailwind defaults)
- [ ] All interactive elements have `focus-visible:ring-2`
- [ ] All touch targets >= 44px (verify with explicit min-h-11 or equivalent)
- [ ] CTA buttons: text atlas-primary on atlas-secondary-container (NEVER white)
- [ ] Animations respect prefers-reduced-motion
- [ ] Font families are atlas-headline / atlas-body (Plus Jakarta Sans / Work Sans)

### Standard Checklist
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized
- [ ] PII not logged or exposed
- [ ] Tests included with >= 80% coverage
- [ ] forwardRef on all interactive components
- [ ] WCAG 2.1 AA accessibility: roles, aria-labels, keyboard nav
- [ ] Feature flag: zero visual diff with NEXT_PUBLIC_DESIGN_V2=false

### Bias & Ethics (design system specific)
- [ ] Color tokens do not disadvantage colorblind users (information not conveyed by color alone)
- [ ] All text meets minimum contrast ratios (4.5:1 normal, 3:1 large)
- [ ] Touch targets accessible for users with motor impairments

---

## Definition of Done

- [ ] tailwind.config.ts has ALL tokens from UX Parecer (40+ colors, 9 semantic, 8 shadows, 6 radii, 11 font-sizes, 15 spacings, 5 transitions)
- [ ] Plus Jakarta Sans + Work Sans installed and working via next/font
- [ ] CSS custom properties in globals.css (50+ --atlas-* variables)
- [ ] prefers-reduced-motion media query in globals.css
- [ ] Feature flag: NEXT_PUBLIC_DESIGN_V2=false -> zero visual diff
- [ ] 7 components built, tested, accessible (WCAG 2.1 AA)
- [ ] ALL components use focus-visible:ring-2 (NOT focus:ring-0)
- [ ] ALL touch targets >= 44px
- [ ] CTA buttons: navy text on orange (NOT white)
- [ ] ESLint warns on hardcoded colors
- [ ] 10 baseline screenshots captured
- [ ] E2E suite green (>= 120/130 passing)
- [ ] Sprint review committed
- [ ] Code review approved by tech-lead
- [ ] Test coverage >= 80% on all components and utilities
- [ ] No standard Tailwind color classes (slate-*, amber-*) in new components -- atlas-* only

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| T1.2 delays block all of Track 2 | HIGH -- 25h of work stalled | T1.2 is highest priority; dev-fullstack-1 starts day 1 |
| Plus Jakarta Sans / Work Sans not available in next/font | MEDIUM | Fallback: download .woff2 files manually, configure via next/font/local |
| ESLint custom rules complexity (T1.6) | LOW | If custom plugin too complex, use eslint-plugin-tailwindcss with custom config |
| PhaseProgress (T2.6) underestimated at 4h | MEDIUM | Start early in day 7; reduce dashboard variant scope if needed |
| Playwright visual regression flaky in CI | MEDIUM | Use toHaveScreenshot with threshold; run only on UI-touching PRs |

---

## Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-23 | tech-lead | Initial execution plan based on UX Parecer v1.0.0 corrections |
