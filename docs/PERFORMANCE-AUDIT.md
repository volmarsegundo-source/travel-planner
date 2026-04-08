# Performance Audit - Sprint 41

**Date**: 2026-04-07
**Version**: 0.35.1

---

## 1. Bundle Analysis Setup

Installed `@next/bundle-analyzer` and integrated into `next.config.ts` alongside the existing `next-intl` plugin. Activated via `ANALYZE=true` environment variable. Reports saved to `.next/analyze/` (HTML, not opened automatically -- suitable for CI).

Run locally: `ANALYZE=true npm run build` (or `npx cross-env ANALYZE=true npm run build` on Windows).

---

## 2. Bundle Size Findings

### Top 5 Largest Routes (First Load JS)

| Route | First Load JS | Notes |
|---|---|---|
| `/[locale]/trips/[id]/generate` | 213 kB | AI generation page |
| `/[locale]/trips/[id]/checklist` | 208 kB | Trip checklist |
| `/[locale]/trips/[id]/itinerary` | 181 kB | DnD itinerary editor (now lazy loaded) |
| `/[locale]/trips/[id]` | 180 kB | Trip detail page |
| `/[locale]/expedition/[tripId]/phase-5` | 174 kB | Phase 5 wizard |

### Shared JS

| Chunk | Size |
|---|---|
| Shared by all routes | 103 kB |
| `chunks/1255-*.js` | 45.7 kB |
| `chunks/4bd1b696-*.js` | 54.2 kB |

### Middleware

| Asset | Size |
|---|---|
| Middleware bundle | 104 kB |

---

## 3. Lazy Loading Changes

### Already Lazy Loaded (no changes needed)

| Component | File | Import Pattern |
|---|---|---|
| `LeafletMapInner` | `InteractiveAtlasMap.tsx` | `dynamic(() => import("./LeafletMapInner"), { ssr: false })` |
| `ItineraryMap` | `Phase6ItineraryV2.tsx` | `dynamic(() => import("./ItineraryMap"), { ssr: false })` |

### Newly Lazy Loaded

| Component | Consumer | Change |
|---|---|---|
| `ItineraryEditor` (DnD Kit) | `trips/[id]/itinerary/page.tsx` | Created `LazyItineraryEditor.tsx` client wrapper with `dynamic(() => import(...), { ssr: false })`. The page is a Server Component so `ssr: false` cannot be used directly -- the thin client wrapper solves this. |

### Not Applicable

| Library | Status |
|---|---|
| `cmdk` | Installed as dependency but no direct `cmdk` import found in application code. Only used internally by shadcn `command` component. No action needed. |
| Chart libraries | No external chart library used. Admin dashboard uses custom SVG-based charts. No action needed. |

---

## 4. Image Optimization

### Changes Made

| Component | Before | After |
|---|---|---|
| `DestinationsSectionV2.tsx` | Raw `<img>` with Unsplash URLs | `next/image` with `fill` prop + responsive `sizes` attribute |
| `UserMenu.tsx` | Raw `<img>` for OAuth avatars | `next/image` with explicit `width={32} height={32}` |

### Config

Added `lh3.googleusercontent.com` to `next.config.ts` `images.remotePatterns` for Google OAuth avatar support.

### Hero Section

`HeroSectionV2.tsx` uses a CSS `background-image` with an Unsplash URL behind a gradient overlay. Converting to `next/image` would require a significant refactor (absolute positioned Image with gradient overlay div) for minimal benefit since the image is decorative and always LCP-critical. The CSS approach is acceptable here. **Recommendation**: consider converting to `next/image` with `priority` prop in a future sprint for better LCP scores.

---

## 5. Font Optimization

### Status: Well Configured

All fonts use `next/font/google` with `display: "swap"` -- no external CSS imports.

| Font | Variable | Weights | Usage |
|---|---|---|---|
| Plus Jakarta Sans | `--font-atlas-headline` | 400, 500, 600, 700, 800 | Atlas headline text |
| Work Sans | `--font-atlas-body` | 400, 500 | Atlas body text |
| Cormorant Garamond | `--font-heading` | 400, 600, 700 | Legacy heading font |
| DM Sans | `--font-body` | 400, 500, 600 | Legacy body font |
| Space Mono | `--font-mono` | 400, 700 | Monospace / code |

### Optimizations Applied

- **Removed unused weight 300** from Cormorant Garamond and DM Sans (no `font-light` usage found in codebase)
- **Removed unused italic style** from Cormorant Garamond (no italic heading usage found)
- This reduces the total font download by ~4 font files

### Future Recommendation

Once the Atlas Design System migration is complete (Sprint 40+), the legacy fonts (Cormorant Garamond, DM Sans, Space Mono) can potentially be removed entirely, saving significant font download bandwidth.

---

## 6. Recommendations for Future Optimization

### High Priority

1. **Code-split trip detail pages**: `/trips/[id]`, `/trips/[id]/generate`, and `/trips/[id]/checklist` are the largest routes (180-213 kB). Investigate which shared chunks are pulling in unnecessary code.

2. **Hero image conversion**: Convert `HeroSectionV2` CSS background-image to `next/image` with `priority` prop for better LCP.

3. **Middleware size**: At 104 kB, the middleware is large. Audit what is included (auth, i18n, CSP) and whether any can be deferred.

### Medium Priority

4. **Remove legacy fonts**: After Atlas Design System migration, remove Cormorant Garamond, DM Sans, and Space Mono to save ~15-20 kB of font data.

5. **Route-level code splitting**: The 103 kB shared JS baseline is reasonable but worth monitoring. Ensure heavy libraries (date-fns, zod) are tree-shaken properly.

6. **Dynamic import for admin routes**: Admin pages (`/admin/dashboard`, `/admin/evals`, `/admin/ai-governance`) could benefit from route-level lazy loading of admin-only components.

### Low Priority

7. **Image CDN**: Consider using a dedicated image CDN or Next.js Image Optimization API for Unsplash images instead of direct URLs.

8. **Prefetch hints**: Add `<link rel="prefetch">` for commonly navigated routes (expeditions, trip detail).

---

## 7. Lighthouse Targets

| Category | Target | Current Estimate |
|---|---|---|
| Performance | > 80 | ~75-85 (depends on network, needs live measurement) |
| Accessibility | > 80 | ~90+ (WCAG 2.1 AA compliance maintained) |
| Best Practices | > 80 | ~85+ (CSP headers, HTTPS, no deprecated APIs) |
| SEO | > 80 | ~85+ (metadata, robots.txt, sitemap.xml present) |

**Note**: Actual Lighthouse scores require a running instance. These are estimates based on bundle sizes, font loading strategy, and image optimization status.

---

## 8. Files Modified

| File | Change |
|---|---|
| `next.config.ts` | Added `@next/bundle-analyzer`, Google OAuth image domain |
| `src/lib/fonts.ts` | Removed unused font weight 300 and italic style |
| `src/components/features/landing/DestinationsSectionV2.tsx` | `<img>` to `next/image` with `fill` + `sizes` |
| `src/components/layout/UserMenu.tsx` | `<img>` to `next/image` with explicit dimensions |
| `src/components/features/itinerary/LazyItineraryEditor.tsx` | **New** -- client wrapper for lazy loading DnD editor |
| `src/app/[locale]/(app)/trips/[id]/itinerary/page.tsx` | Use `LazyItineraryEditor` instead of direct import |
| `docs/PERFORMANCE-AUDIT.md` | **New** -- this document |
