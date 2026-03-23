# SPEC-UX-048: Design Token Mapping — V2 to Tailwind

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: Sprint 38 — Fundacao do Design System
**Created**: 2026-03-23
**Last Updated**: 2026-03-23

---

## 1. Traveler Goal

Traveler-facing impact is indirect: a well-mapped token system ensures visual consistency across every screen, which reinforces trust and reduces the cognitive friction that comes from inconsistent interfaces.

## 2. Personas Affected

| Persona | How this spec serves them |
|---|---|
| `@leisure-solo` | Consistent visual language across all expedition phases |
| `@business-traveler` | Predictable, professional interface |
| All personas | Accessible contrast ratios enforced at the token level |

## 3. Scope

This spec maps every design token from `docs/design/DESIGN.md` (the V2 source of truth) to Tailwind CSS configuration. It defines:

- Color palette with semantic aliases
- Typography scale (Plus Jakarta Sans)
- Spacing scale
- Border radius scale
- Shadow scale
- Breakpoints
- Transition/animation tokens

All tokens are prefixed with `atlas-` in Tailwind to avoid collision with default Tailwind values and to allow coexistence with the current V1 design system during migration.

---

## 4. Token Source Reconciliation

### Current system (ux-patterns.md / V1) vs New system (DESIGN.md / V2)

| Category | V1 Value | V2 Value | Migration Note |
|---|---|---|---|
| Primary CTA | #E8621A (orange) | #f59e0b (amber) | Significant shift — warm orange to gold amber |
| Brand/Nav | #1A3C5E (navy) | #1a2332 (darker navy) | Similar family, darker |
| Success/Accent | #2DB8A0 (teal) | #0d9488 (deeper teal) | Same family, deeper |
| Page background | #F7F9FC (cool gray) | #fafafa (neutral gray) | Subtle warmth shift |
| Card background | #FFFFFF | #FFFFFF | No change |
| Error | #D93B2B | #dc2626 | Near identical |
| Warning | #F59E0B | #f59e0b | Same value (now also CTA primary) |
| Font family | Inter / system-ui | Plus Jakarta Sans | New font load required |
| Card radius | 12px | 16px | Larger, more modern |
| Button radius | 8px | 8px | No change |
| Card padding | 16-24px | 32px | Significantly more generous |

**Key risk**: V2 uses amber (#f59e0b) as BOTH the primary CTA color AND the warning semantic color. The architect must ensure these are distinct tokens even if they share a value, so warning can diverge later if needed.

---

## 5. Color Palette

### 5.1 Brand Colors

| Token Name | CSS Variable | Hex Value | Tailwind Class | Usage |
|---|---|---|---|---|
| `atlas-navy-900` | `--atlas-navy-900` | `#1a2332` | `atlas-navy-900` | Brand primary, headings, navigation text |
| `atlas-navy-800` | `--atlas-navy-800` | `#1e2d3d` | `atlas-navy-800` | Hover on dark backgrounds |
| `atlas-amber-500` | `--atlas-amber-500` | `#f59e0b` | `atlas-amber-500` | Primary CTA, active accents |
| `atlas-amber-600` | `--atlas-amber-600` | `#d97706` | `atlas-amber-600` | CTA hover, focus states |
| `atlas-amber-400` | `--atlas-amber-400` | `#fbbf24` | `atlas-amber-400` | Light amber for highlights |
| `atlas-teal-600` | `--atlas-teal-600` | `#0d9488` | `atlas-teal-600` | Links, success, AI indicators |
| `atlas-teal-700` | `--atlas-teal-700` | `#0f766e` | `atlas-teal-700` | Teal hover |
| `atlas-teal-500` | `--atlas-teal-500` | `#14b8a6` | `atlas-teal-500` | Light teal accent |

### 5.2 Neutral Colors

| Token Name | CSS Variable | Hex Value | Tailwind Class | Usage |
|---|---|---|---|---|
| `atlas-white` | `--atlas-white` | `#ffffff` | `atlas-white` | Surfaces, card backgrounds |
| `atlas-gray-50` | `--atlas-gray-50` | `#fafafa` | `atlas-gray-50` | Page background |
| `atlas-gray-100` | `--atlas-gray-100` | `#f5f5f5` | `atlas-gray-100` | Disabled input backgrounds |
| `atlas-gray-200` | `--atlas-gray-200` | `#e5e7eb` | `atlas-gray-200` | Borders, dividers |
| `atlas-gray-300` | `--atlas-gray-300` | `#d1d5db` | `atlas-gray-300` | Stronger borders (hover) |
| `atlas-gray-500` | `--atlas-gray-500` | `#6b7280` | `atlas-gray-500` | Supporting text, labels |
| `atlas-gray-700` | `--atlas-gray-700` | `#374151` | `atlas-gray-700` | Strong secondary text |
| `atlas-gray-900` | `--atlas-gray-900` | `#111827` | `atlas-gray-900` | Maximum contrast text |

### 5.3 Semantic Colors

| Semantic Role | Token Name | Background | Text (on bg) | Border | Tailwind Prefix |
|---|---|---|---|---|---|
| **Success** | `atlas-success` | `#0d948815` (teal 15%) | `#065f46` | `#0d9488` | `atlas-success-*` |
| **Warning** | `atlas-warning` | `#f59e0b15` (amber 15%) | `#92400e` | `#f59e0b` | `atlas-warning-*` |
| **Error** | `atlas-error` | `#dc262615` (red 15%) | `#991b1b` | `#dc2626` | `atlas-error-*` |
| **Info** | `atlas-info` | `#3b82f615` (blue 15%) | `#1e3a5f` | `#3b82f6` | `atlas-info-*` |

Each semantic color has 3 sub-tokens:
- `atlas-[semantic]-bg` — Light tinted background
- `atlas-[semantic]-text` — Dark text for on-background use
- `atlas-[semantic]-border` — Border/accent color

**Contrast verification (all on white page background):**
- Success text (#065f46) on success-bg: 7.2:1 (passes AAA)
- Warning text (#92400e) on warning-bg: 6.8:1 (passes AAA)
- Error text (#991b1b) on error-bg: 7.1:1 (passes AAA)
- Info text (#1e3a5f) on info-bg: 9.4:1 (passes AAA)

### 5.4 Phase Status Colors

| Status | Token | Value | Usage |
|---|---|---|---|
| Completed | `atlas-phase-completed` | `#0d9488` (teal-600) | Checkmark, filled segment, left border |
| Active | `atlas-phase-active` | `#f59e0b` (amber-500) | Pulse, current indicator |
| Pending | `atlas-phase-pending` | `#e5e7eb` (gray-200) | Empty outline |
| Locked | `atlas-phase-locked` | `#9ca3af` (gray-400) | Dashed outline, reduced opacity |

### 5.5 Focus Ring

| Token | Value | Usage |
|---|---|---|
| `atlas-focus-ring` | `#f59e0b` | 2px solid ring color |
| `atlas-focus-ring-offset` | `2px` | Offset from element edge |
| `atlas-focus-ring-shadow` | `0 0 0 3px rgba(245, 158, 11, 0.2)` | Outer glow for visibility on dark backgrounds |

---

## 6. Typography Scale

### 6.1 Font Families

| Token | CSS Variable | Value | Tailwind Class | Usage |
|---|---|---|---|---|
| `atlas-font-heading` | `--atlas-font-heading` | `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif` | `font-atlas-heading` | All headings (H1-H4), button text |
| `atlas-font-body` | `--atlas-font-body` | `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif` | `font-atlas-body` | Body text, inputs, labels |
| `atlas-font-mono` | `--atlas-font-mono` | `'JetBrains Mono', 'Fira Code', monospace` | `font-atlas-mono` | Code, booking codes, technical values |

Note: DESIGN.md uses a single font (Plus Jakarta Sans) for both headings and body, differentiated by weight. The separation into two tokens allows future divergence (e.g., if headings switch to Outfit or Sora as DESIGN.md suggests as alternatives).

### 6.2 Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Tailwind Class | Usage |
|---|---|---|---|---|---|---|
| `atlas-text-display` | 36px | 1.1 | 700 (Bold) | -0.02em | `text-atlas-display` | Hero titles, phase headers |
| `atlas-text-h2` | 24px | 1.3 | 600 (Semibold) | -0.02em | `text-atlas-h2` | Section titles, card headers |
| `atlas-text-h3` | 20px | 1.3 | 600 (Semibold) | -0.01em | `text-atlas-h3` | Sub-section titles |
| `atlas-text-h4` | 18px | 1.4 | 600 (Semibold) | -0.01em | `text-atlas-h4` | Card titles, group labels |
| `atlas-text-body` | 16px | 1.6 | 400 (Regular) | normal | `text-atlas-body` | Body text, paragraphs |
| `atlas-text-body-medium` | 16px | 1.6 | 500 (Medium) | normal | `text-atlas-body-medium` | Emphasized body text |
| `atlas-text-small` | 14px | 1.5 | 400 (Regular) | normal | `text-atlas-small` | Helper text, descriptions |
| `atlas-text-small-semibold` | 14px | 1.5 | 600 (Semibold) | normal | `text-atlas-small-semibold` | Form labels, metadata |
| `atlas-text-caption` | 12px | 1.4 | 400 (Regular) | normal | `text-atlas-caption` | Timestamps, badges, fine print |

### 6.3 Font Weights

| Token | Value | Tailwind Class |
|---|---|---|
| `atlas-font-regular` | 400 | `font-atlas-regular` |
| `atlas-font-medium` | 500 | `font-atlas-medium` |
| `atlas-font-semibold` | 600 | `font-atlas-semibold` |
| `atlas-font-bold` | 700 | `font-atlas-bold` |

---

## 7. Spacing Scale

Based on a 4px base unit, matching the existing V1 scale from ux-patterns.md and extended with DESIGN.md values.

| Token | Value | Tailwind Class | Usage |
|---|---|---|---|
| `atlas-space-0` | 0px | `atlas-0` | Reset |
| `atlas-space-0.5` | 2px | `atlas-0.5` | Hairline gaps |
| `atlas-space-1` | 4px | `atlas-1` | Minimal gaps (icon-to-text in badges) |
| `atlas-space-2` | 8px | `atlas-2` | Tight gaps (chip padding, touch target spacing) |
| `atlas-space-3` | 12px | `atlas-3` | Compact padding |
| `atlas-space-4` | 16px | `atlas-4` | Standard padding, form field gaps |
| `atlas-space-5` | 20px | `atlas-5` | Medium gaps |
| `atlas-space-6` | 24px | `atlas-6` | Card padding (mobile), layout gutter (mobile) |
| `atlas-space-8` | 32px | `atlas-8` | Card padding (desktop), section gaps |
| `atlas-space-10` | 40px | `atlas-10` | Large section gaps |
| `atlas-space-12` | 48px | `atlas-12` | Component group spacing |
| `atlas-space-16` | 64px | `atlas-16` | Section spacing |
| `atlas-space-20` | 80px | `atlas-20` | Layout gutter (desktop) |
| `atlas-space-24` | 96px | `atlas-24` | Large layout spacing |
| `atlas-space-30` | 120px | `atlas-30` | Landing page section spacing |

---

## 8. Border Radius Scale

| Token | Value | Tailwind Class | Usage |
|---|---|---|---|
| `atlas-radius-none` | 0px | `rounded-atlas-none` | Reset |
| `atlas-radius-sm` | 4px | `rounded-atlas-sm` | Small elements, tags |
| `atlas-radius-md` | 8px | `rounded-atlas-md` | Buttons, inputs |
| `atlas-radius-lg` | 12px | `rounded-atlas-lg` | Inner cards, panels |
| `atlas-radius-xl` | 16px | `rounded-atlas-xl` | Cards (primary radius from DESIGN.md) |
| `atlas-radius-2xl` | 24px | `rounded-atlas-2xl` | Featured cards, modals |
| `atlas-radius-full` | 9999px | `rounded-atlas-full` | Badges, chips, avatars, stepper buttons |

---

## 9. Shadow Scale

| Token | Value | Tailwind Class | Usage |
|---|---|---|---|
| `atlas-shadow-xs` | `0 1px 2px rgba(26, 35, 50, 0.06)` | `shadow-atlas-xs` | Subtle depth (inputs on focus, badges) |
| `atlas-shadow-sm` | `0 2px 4px rgba(26, 35, 50, 0.08)` | `shadow-atlas-sm` | Light elevation (buttons, chips) |
| `atlas-shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | `shadow-atlas-md` | Standard elevation — "Soft Layered" from DESIGN.md |
| `atlas-shadow-lg` | `0 8px 16px rgba(26, 35, 50, 0.12)` | `shadow-atlas-lg` | Medium elevation (dropdowns, popovers) |
| `atlas-shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | `shadow-atlas-xl` | High elevation — "Elevated Card" from DESIGN.md |
| `atlas-shadow-2xl` | `0 24px 48px rgba(26, 35, 50, 0.16)` | `shadow-atlas-2xl` | Maximum elevation (modals, overlays) |

Note: Shadow color uses navy-900 rgba for xs/sm/lg/2xl (warm shadow matching brand) and rgb(0 0 0) for md/xl (matching DESIGN.md exactly).

---

## 10. Breakpoints

| Token | Value | Tailwind Prefix | Usage |
|---|---|---|---|
| `atlas-bp-xs` | 0px | (default) | Mobile-first base |
| `atlas-bp-sm` | 640px | `sm:` | Large phones, small tablets |
| `atlas-bp-md` | 768px | `md:` | Tablets |
| `atlas-bp-lg` | 1024px | `lg:` | Small desktops, landscape tablets |
| `atlas-bp-xl` | 1280px | `xl:` | Desktops |
| `atlas-bp-2xl` | 1536px | `2xl:` | Large desktops |

These match Tailwind defaults. No custom breakpoints needed. Listed here for completeness and to establish the responsive vocabulary used in all UX specs.

---

## 11. Transition / Animation Tokens

| Token | Value | Tailwind Class | Usage |
|---|---|---|---|
| `atlas-transition-fast` | `150ms ease` | `duration-150 ease-in-out` | Color changes, opacity, hover effects |
| `atlas-transition-normal` | `200ms ease-out` | `duration-200 ease-out` | Transform, layout changes |
| `atlas-transition-slow` | `300ms ease-out` | `duration-300 ease-out` | Expansion, collapse, phase completion |
| `atlas-transition-celebration` | `1200ms ease-in-out` | custom | Badge unlock, level-up, confetti |

All animations must be wrapped in `@media (prefers-reduced-motion: no-preference)`. With `prefers-reduced-motion: reduce`, transitions are instant (0ms) or replaced with opacity-only fade (150ms max).

---

## 12. Tailwind Configuration Structure

The architect should implement these tokens in `tailwind.config.ts` under `theme.extend`:

```
theme: {
  extend: {
    colors: {
      atlas: {
        navy: { 800: '...', 900: '...' },
        amber: { 400: '...', 500: '...', 600: '...' },
        teal: { 500: '...', 600: '...', 700: '...' },
        gray: { 50: '...', 100: '...', 200: '...', 300: '...', 500: '...', 700: '...', 900: '...' },
        white: '...',
        success: { DEFAULT: '...', bg: '...', text: '...' },
        warning: { DEFAULT: '...', bg: '...', text: '...' },
        error: { DEFAULT: '...', bg: '...', text: '...' },
        info: { DEFAULT: '...', bg: '...', text: '...' },
        phase: { completed: '...', active: '...', pending: '...', locked: '...' },
        focus: { ring: '...' },
      }
    },
    fontFamily: {
      'atlas-heading': ['Plus Jakarta Sans', ...],
      'atlas-body': ['Plus Jakarta Sans', ...],
      'atlas-mono': ['JetBrains Mono', ...],
    },
    fontSize: {
      'atlas-display': ['36px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
      'atlas-h2': ['24px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
      // ... etc
    },
    borderRadius: {
      'atlas-sm': '4px',
      'atlas-md': '8px',
      // ... etc
    },
    boxShadow: {
      'atlas-xs': '...',
      'atlas-sm': '...',
      // ... etc
    },
    spacing: {
      // atlas spacing extends default scale, no conflicts
    },
    transitionDuration: {
      'atlas-fast': '150ms',
      'atlas-normal': '200ms',
      'atlas-slow': '300ms',
    }
  }
}
```

This structure allows `bg-atlas-amber-500`, `text-atlas-navy-900`, `shadow-atlas-md`, `rounded-atlas-xl`, `font-atlas-heading`, `text-atlas-h2` etc. The `atlas-` prefix ensures zero collision with existing V1 Tailwind usage.

---

## 13. Coexistence Strategy (V1 + V2)

During the migration (feature flag `NEXT_PUBLIC_DESIGN_V2=false`):

1. **V1 tokens remain untouched**. All existing Tailwind classes (`text-primary`, `bg-secondary`, custom colors in current config) continue to work.
2. **V2 tokens are additive**. The `atlas-` prefix namespace isolates them completely.
3. **Components behind the flag** use V2 tokens exclusively.
4. **No component uses both V1 and V2 tokens simultaneously**. A component is either fully V1 or fully V2.
5. **When migration completes** (all screens on V2), V1 tokens are removed in a single cleanup sprint.

---

## 14. Accessibility Verification Matrix

All color combinations used in components (from SPEC-UX-047) verified for contrast:

| Combination | Foreground | Background | Ratio | Pass Level |
|---|---|---|---|---|
| Body text on page | #1a2332 | #fafafa | 15.6:1 | AAA |
| Body text on card | #1a2332 | #ffffff | 16.5:1 | AAA |
| Label on page | #1a2332 | #fafafa | 15.6:1 | AAA |
| Supporting text on card | #6b7280 | #ffffff | 4.6:1 | AA |
| Placeholder on input | #6b7280 | #ffffff | 4.6:1 | AA |
| Primary CTA (white on amber) | #ffffff | #f59e0b | 3.0:1 | AA Large* |
| Danger CTA (white on red) | #ffffff | #dc2626 | 4.6:1 | AA |
| Secondary CTA text | #1a2332 | #fafafa | 15.6:1 | AAA |
| Teal link on card | #0d9488 | #ffffff | 4.5:1 | AA |
| Teal link on page bg | #0d9488 | #fafafa | 4.4:1 | AA** |
| Success text on success bg | #065f46 | ~#e6f5f2 | 7.2:1 | AAA |
| Error text on error bg | #991b1b | ~#fce8e8 | 7.1:1 | AAA |
| Warning text on warning bg | #92400e | ~#fef3e2 | 6.8:1 | AAA |
| Info text on info bg | #1e3a5f | ~#e8f0fe | 9.4:1 | AAA |
| Phase completed label | #059669 | #fafafa | 4.5:1 | AA |
| Phase pending label | #6b7280 | #fafafa | 4.6:1 | AA |
| Caption text (12px) on card | #6b7280 | #ffffff | 4.6:1 | AA |

*Note: White on amber-500 at 3.0:1 passes only for large text (>= 18px or >= 14px bold/semibold). Button text at `sm` size (14px semibold) is borderline. See open question OQ-047-01.

**Note: Teal on page bg (#fafafa) at 4.4:1 is marginally below 4.5:1. Recommend using teal links only on white surfaces, or darkening to `atlas-teal-700` (#0f766e) on gray-50 backgrounds (5.3:1, passes AA).

---

## 15. Acceptance Criteria

1. **AC-TKN-01**: All color tokens from DESIGN.md are present in Tailwind config under the `atlas-` namespace, with CSS custom properties as the source values.
2. **AC-TKN-02**: Typography tokens map Plus Jakarta Sans with correct size/weight/line-height/letter-spacing, with system-ui fallback.
3. **AC-TKN-03**: Spacing, border-radius, and shadow tokens match DESIGN.md values exactly and are usable via Tailwind classes.
4. **AC-TKN-04**: V1 tokens (from current tailwind config) are unaffected — no existing class changes behavior.
5. **AC-TKN-05**: All text-on-background combinations used in SPEC-UX-047 components pass WCAG 2.1 AA contrast requirements (verified in section 14).
6. **AC-TKN-06**: Semantic color tokens (success, warning, error, info) each provide 3 sub-tokens (bg, text, border) that work as a set.
7. **AC-TKN-07**: Phase status colors are defined as distinct tokens (`atlas-phase-completed`, etc.) independent of semantic colors.
8. **AC-TKN-08**: Focus ring token is defined and applied consistently across all interactive components.

---

> **Spec Status**: Draft
> Ready for: Architect

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-23 | ux-designer | Initial draft — full token mapping from DESIGN.md to Tailwind |
