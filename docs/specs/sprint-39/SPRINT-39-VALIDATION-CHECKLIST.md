# Sprint 39 Validation Checklist

**Validated by**: tech-lead
**Date**: 2026-03-23
**Branch**: master (commit 00fdb65)

---

## TELAS V2

### 1. NavV2 (LandingNav)
**Status**: PASS

**File**: `src/components/features/landing/LandingNav.tsx`

**Evidence**:
- **CTAs for unauthenticated**: Lines 62-80 -- conditional `!isAuthenticated` renders "login" (ghost, line 66) and "getStarted" (primary, line 71) buttons. Mobile shows single "login" button (line 76).
- **Sticky**: Line 21 -- `className="sticky top-0 z-50 ..."`.
- **atlas-* tokens**: Lines 32, 41, 47, 82, 88, 104, 108 -- uses `text-atlas-primary`, `border-atlas-secondary-container`, `text-atlas-on-surface-variant`, `bg-atlas-surface-container`, etc.

Note: i18n keys `t("login")` and `t("getStarted")` render the Portuguese labels "Entrar" and "Comece Agora" respectively. Verified via i18n key mapping in `landingV2.nav` namespace.

---

### 2. HeroSectionV2
**Status**: PASS

**File**: `src/components/features/landing/HeroSectionV2.tsx`

**Evidence**:
- **Dark navy bg**: Line 27 -- `bg-gradient-to-br from-atlas-primary via-atlas-primary-container to-atlas-primary` (atlas-primary is the dark navy token).
- **Headline**: Line 40 -- `<h1>` with `font-atlas-headline text-4xl md:text-5xl lg:text-7xl font-extrabold text-white`.
- **Subtitle**: Line 45 -- `<p>` with `text-white/80`.
- **CTA button**: Lines 52-58 -- `AtlasButton variant="primary" size="lg"` with ArrowRight icon.
- **min-h-[85vh]**: Line 24 -- `min-h-[70vh] md:min-h-[80vh] lg:min-h-[85vh]` (85vh at lg breakpoint).

---

### 3. PhasesSectionV2
**Status**: PASS

**File**: `src/components/features/landing/PhasesSectionV2.tsx`

**Evidence**:
- **8 phase cards**: Line 18 -- `TOTAL_PHASES = 8`; line 53 -- `Array.from({ length: TOTAL_PHASES }, ...)`.
- **Phases 7-8 "Em Breve" badge**: Line 21 -- `COMING_SOON_PHASES = new Set([7, 8])`; lines 77-83 -- `AtlasBadge` rendered with `t("comingSoon")` (i18n key for "Em Breve").
- **opacity-60**: Line 64 -- `isComingSoon && "opacity-60"`.
- **aria-disabled**: Line 66 -- `aria-disabled={isComingSoon || undefined}`.

---

### 4. AiSectionV2
**Status**: PASS

**File**: `src/components/features/landing/AiSectionV2.tsx`

**Evidence**:
- **Exists**: 71 lines, fully implemented.
- **atlas-* tokens**: Line 12 -- `bg-atlas-primary-container`; line 16 -- `font-atlas-headline`; line 19 -- `text-atlas-primary-fixed-dim`; line 28 -- `text-atlas-secondary`; line 39 -- `text-atlas-secondary-fixed-dim`; line 62 -- `text-atlas-primary`.

---

### 5. GamificationSectionV2
**Status**: PASS

**File**: `src/components/features/landing/GamificationSectionV2.tsx`

**Evidence**:
- **Exists**: 119 lines, fully implemented with 3 badge showcase cards.
- **atlas-* tokens**: Line 50 -- `bg-atlas-surface`; line 24 -- `bg-atlas-secondary-container/20`; line 55 -- `text-atlas-primary`; line 95 -- `bg-atlas-primary-container`; line 104 -- `text-atlas-primary font-atlas-headline`.

---

### 6. DestinationsSectionV2
**Status**: PASS

**File**: `src/components/features/landing/DestinationsSectionV2.tsx`

**Evidence**:
- **Destination cards**: Lines 13-32 -- 3 destinations (rio, bonito, pantanal) with asymmetric grid layout.
- **atlas-* tokens**: Line 56 -- `bg-atlas-surface-container-lowest`; line 17 -- `from-atlas-secondary-container/80`; line 60 -- `text-atlas-primary font-atlas-headline`; line 89 -- `from-atlas-primary`; line 96 -- `bg-atlas-secondary-container text-atlas-on-secondary-container`.

---

### 7. FooterV2
**Status**: PARTIAL

**File**: `src/components/features/landing/FooterV2.tsx`

**Evidence**:
- **bg-atlas-primary**: Line 40 -- `className="bg-atlas-primary w-full pt-16 pb-8 ..."`. This is `bg-atlas-primary`, NOT `bg-atlas-primary-container`. **Matches requirement.**
- **LGPD text**: Line 170 -- `{t("lgpd")}` rendered in bottom bar.
- **Copyright**: Line 167 -- `&copy; {currentYear} {t("copyright")}`.

**Finding**: The requirement said verify `bg-atlas-primary (NOT atlas-primary-container)`. The actual class is `bg-atlas-primary` -- this is correct. However, marking PARTIAL because the footer lacks a dedicated LGPD compliance link (only has plain text, no clickable privacy policy link in the bottom bar -- the privacy link is in column 3 at line 110 but points to `#`).

---

### 8. LoginFormV2
**Status**: PASS

**File**: `src/components/features/auth/LoginFormV2.tsx`

**Evidence**:
- **Split-screen 60/40**: Line 139 -- BrandPanel `w-[60%]`; line 280 -- form panel `lg:w-[40%]`.
- **Brand panel hidden < lg**: Line 139 -- `hidden lg:flex`.
- **Teal focus border**: Lines 343, 359 -- `[&_input]:focus:border-atlas-on-tertiary-container` (teal token).
- **Link color #005049**: Lines 363, 454, 465, 472 -- `text-atlas-on-tertiary-fixed-variant`. The token `atlas-on-tertiary-fixed-variant` maps to `#005049` in the design system.

---

## FEATURE FLAGS

### 9. DesignBranch in Landing
**Status**: PASS

**File**: `src/app/[locale]/page.tsx`

**Evidence**: Lines 3, 22-26 -- imports `DesignBranch` from `@/components/ui`; wraps `LandingPageV1` as `v1` and `LandingPageV2` as `v2`.

---

### 10. DesignBranch in Login
**Status**: PASS

**File**: `src/app/[locale]/auth/login/page.tsx`

**Evidence**: Lines 4-5 -- imports `LoginFormV2` and `DesignBranch`; lines 18-21 -- wraps `LoginForm` as `v1` and `LoginFormV2` as `v2`.

---

### 11-13. Flag behavior
**Status**: PASS

**Evidence**:
- `.env.example` line 65 -- `NEXT_PUBLIC_DESIGN_V2="false"` (correctly defaults to false).
- `.env` -- does NOT contain `NEXT_PUBLIC_DESIGN_V2` at all (safe; undefined = false via the hook).
- `.env.local` -- does NOT contain `NEXT_PUBLIC_DESIGN_V2` at all (safe; undefined = false via the hook).
- `DesignBranch` component (line 23) reads the flag via `useDesignV2()` hook.

**SECURITY ALERT (out of scope but critical)**: Both `.env` (line 38) and `.env.local` (line 52) contain what appears to be a real Anthropic API key. This MUST be rotated immediately and these files should never be committed. The `.env` file appears to be tracked in git -- this is a P0 security incident.

---

## QUALIDADE

### 14. Tests
**Status**: PENDING

**Evidence**: Cannot run test suite in this session (Bash not available). Last known result from sprint documentation: 2644 tests across 177 files. Requires manual verification via `npm run test`.

---

### 15. Link color
**Status**: PASS

**File**: `src/components/features/auth/LoginFormV2.tsx`

**Evidence**: Lines 363, 454, 465, 472 -- all link elements use `text-atlas-on-tertiary-fixed-variant` which resolves to `#005049` in the Atlas design token system. The forgot-password link (line 363), create-account link (line 454), terms link (line 465), and privacy link (line 472) all use this token.

---

### 16. Focus dual
**Status**: PARTIAL

**File**: `src/components/features/auth/LoginFormV2.tsx`

**Evidence**:
- **Teal border**: Lines 343, 359 -- `[&_input]:focus:border-atlas-on-tertiary-container` (present).
- **Amber ring (atlas-focus-ring)**: Line 374 -- `focus:ring-atlas-focus-ring` on the checkbox only. The main input fields use `[&_input]:focus:border-atlas-on-tertiary-container` but do NOT explicitly add `focus:ring-atlas-focus-ring`. The amber ring behavior depends on whether `AtlasInput` internally applies the focus ring. The checkbox at line 374 has explicit `focus:ring-2 focus:ring-atlas-focus-ring`.

Marking PARTIAL: The dual-focus pattern (teal border + amber ring) is only explicit on the checkbox. For text inputs, the amber ring depends on AtlasInput's built-in styles.

---

## CARRYOVER

### 17. aria-pressed fix (AtlasChip)
**Status**: PASS

**File**: `src/components/ui/AtlasChip.tsx`

**Evidence**: Lines 145-146 -- selectable mode uses `role="checkbox"` and `aria-checked={mode === "selectable" ? selected : undefined}`. There is NO `aria-pressed` attribute anywhere in the file. Correct ARIA pattern for chip selection.

---

### 18. 44px touch (AtlasPhaseProgress)
**Status**: PASS

**File**: `src/components/ui/AtlasPhaseProgress.tsx`

**Evidence**:
- Wizard layout: Line 148 -- clickable button has `min-w-[44px] min-h-[44px]`.
- Dashboard layout: Line 247 -- clickable button has `min-h-[44px]`.

Both clickable elements meet the WCAG 2.5.8 minimum target size of 44x44px.

---

### 19. Glow shadow (AtlasButton)
**Status**: PASS

**File**: `src/components/ui/AtlasButton.tsx`

**Evidence**: Line 23 -- primary variant includes `shadow-atlas-glow-amber`:
```
"shadow-atlas-md shadow-atlas-glow-amber",
```

---

### 20. ESLint deferred (FIX-004 NOT implemented)
**Status**: PASS

**Evidence**: The path `src/lib/eslint-rules/` does not exist. No cn/cva AST traversal ESLint rule was implemented. FIX-004 was correctly deferred as planned.

---

## APPROVAL STATUS

### 21. UX Validation
**Status**: FAIL

**Evidence**: File `docs/specs/sprint-39/UX-VALIDACAO-FINAL-SPRINT-39.md` does not exist.

---

### 22. Sprint Review
**Status**: FAIL

**Evidence**: File `docs/sprint-reviews/SPRINT-039-review.md` does not exist.

---

### 23. PO Approval
**Status**: FAIL

**Evidence**: No formal PO sign-off document found in `docs/specs/sprint-39/`.

---

## Summary

| Status | Count | Items |
|--------|-------|-------|
| PASS | 15 | #1, #2, #3, #4, #5, #6, #8, #9, #10, #11-13, #15, #17, #18, #19, #20 |
| PARTIAL | 2 | #7 (FooterV2 LGPD link), #16 (focus dual on inputs) |
| FAIL | 3 | #21 (UX validation), #22 (sprint review), #23 (PO approval) |
| PENDING | 1 | #14 (test count -- manual run needed) |

**Totals**: 15 PASS, 2 PARTIAL, 3 FAIL, 1 PENDING

---

## Critical Security Alert (Out of Scope)

**SEC-S39-001 (CRITICAL)**: Both `.env` and `.env.local` contain what appears to be a real Anthropic API key committed to the repository. The `.env` file is tracked in git history. **Action required**:
1. Rotate the Anthropic API key immediately at console.anthropic.com
2. Remove `.env` from git tracking (`git rm --cached .env`)
3. Add `.env` to `.gitignore` if not already present
4. Scrub the key from git history using `git filter-branch` or BFG Repo-Cleaner
