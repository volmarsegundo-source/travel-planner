---
spec_id: SPEC-ARCH-004
title: "Navigation Restructure Architecture"
type: architecture
status: Draft
version: "1.0.0"
author: architect
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs:
  - SPEC-ARCH-002
  - SPEC-ARCH-005
  - SPEC-ARCH-006
---

# SPEC-ARCH-004: Navigation Restructure Architecture

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, ux-designer, qa-engineer, security-specialist]
**Product Spec**: TBD (Sprint 28 backlog)
**UX Spec**: TBD
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Overview

The current application has a single `/dashboard` route that renders `AtlasDashboard` -- a monolithic component combining a decorative hero map, a gamification header, and an expedition card list. SPEC-ARCH-002 (Sprint 27) proposed splitting this into `/expeditions` and `/atlas`. Sprint 28 refines and extends that proposal into a full navigation restructure with three distinct pages: **Expeditions** (card list), **My Atlas** (interactive map), and **Journey Summary** (trip overview). This spec defines the route architecture, layout hierarchy, data fetching strategy, code splitting approach, and backward compatibility plan.

The restructure addresses three problems:
1. The dashboard is a single monolithic page that grows more complex with each sprint.
2. Navigation has only two items (Meu Atlas, Meu Perfil), which will not scale as features are added.
3. The map and expedition list compete for screen real estate and serve different user intents.

---

## 2. Architecture Decision Records

### ADR-017: Sub-route Strategy Under /(app) Group

- **Status**: Proposed
- **Context**: SPEC-ARCH-002 proposed top-level routes `/expeditions` and `/atlas`. However, the application already uses a `(app)` route group with a shared layout (`AppShellLayout`) that provides authentication guard, navbar, and footer. We need to decide whether new pages are top-level under `(app)` or sub-routes under `/dashboard`.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Top-level routes (`/expeditions`, `/atlas`) | Clean URLs, clear intent | No URL grouping, `/dashboard` redirect needed, three separate page.tsx files at the same level |
| B: Sub-routes under `/dashboard` (`/dashboard/expeditions`, `/dashboard/atlas`) | Natural grouping, shared layout slot for sub-nav, easier to add more sections later | Longer URLs, `/dashboard` needs a default redirect |
| C: Top-level with tab layout | Clean URLs with shared sub-navigation component | Requires manual active-state tracking, no layout nesting benefit |

- **Decision**: **Option A -- Top-level routes under `(app)`**. Each page has a clear, short URL. The `(app)` layout group already provides the shared shell. A sub-navigation bar is unnecessary at this stage -- the header navbar is sufficient for 3-4 items. The `/dashboard` route becomes a redirect to `/expeditions`.

- **Consequences**:
  - **Positive**: Short, memorable URLs. Each page is independently optimizable. No nested layout complexity.
  - **Negative**: If we later need 6+ top-level routes, the navbar will become crowded. Mitigated by future dropdown/mega-menu.
  - **Risk**: Bookmark breakage for `/dashboard`. Mitigated by permanent redirect.

### ADR-018: Data Fetching Strategy -- Server Components with Parallel Queries

- **Status**: Proposed
- **Context**: Each new page needs different data. `/expeditions` needs trip cards with phase progress. `/atlas` needs trip coordinates. The journey summary needs aggregated data from all 8 phases. We need to decide whether to use a shared data fetch at the layout level or independent fetches per page.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Shared fetch in `(app)/layout.tsx` passed via context/props | Single DB round-trip for all pages | Over-fetches data not needed by every page. Layout re-renders on navigation. Couples all pages to same data shape. |
| B: Independent fetch per page (Server Component) | Each page fetches only what it needs. No wasted bandwidth. | Navigating between pages triggers separate DB calls. |
| C: API route + TanStack Query | Caching across pages, stale-while-revalidate | Adds client-side data layer complexity. Not needed for server-rendered pages. |

- **Decision**: **Option B -- Independent fetch per page**. Each `page.tsx` is a Server Component that calls the relevant service method directly. This is consistent with the existing pattern (dashboard/page.tsx already does this). Data is fetched once per navigation, which is acceptable given these are user-initiated page transitions.

- **Consequences**:
  - **Positive**: Each page is self-contained. No over-fetching. Easy to optimize independently.
  - **Negative**: Navigating between `/expeditions` and `/atlas` triggers separate DB queries for overlapping data (trip list). Acceptable because navigation is infrequent and queries are fast (user-scoped, indexed).
  - **Risk**: None significant at current scale (MAX_ACTIVE_TRIPS = 20).

---

## 3. System Design

### 3.1 Route Architecture

```
Current:
  /(app)/dashboard     --> AtlasDashboard (map + cards + header)

Proposed:
  /(app)/dashboard     --> permanent redirect to /expeditions
  /(app)/expeditions   --> ExpeditionsPage (cards + gamification header)
  /(app)/atlas         --> AtlasMapPage (interactive map)
  /(app)/expedition/[tripId]/summary --> JourneySummaryPage (SPEC-ARCH-005)
```

### 3.2 Component Architecture

```
src/app/[locale]/(app)/
  layout.tsx                        <-- EXISTING: AppShellLayout (auth guard, navbar, footer)
  dashboard/page.tsx                <-- MODIFIED: redirect to /expeditions
  expeditions/page.tsx              <-- NEW: Server Component
  atlas/page.tsx                    <-- NEW: Server Component
  expedition/[tripId]/
    summary/page.tsx                <-- NEW: Server Component (SPEC-ARCH-005)

src/components/features/
  expeditions/
    ExpeditionsList.tsx             <-- NEW: Client, extracted from AtlasDashboard
  atlas/
    AtlasInteractiveMap.tsx         <-- NEW: Client, Mapbox GL JS (lazy loaded)
    AtlasMapPin.tsx                 <-- NEW: Pin with status color
  dashboard/
    AtlasDashboard.tsx              <-- DEPRECATED: keep until migration complete
    DashboardHeader.tsx             <-- REUSED: by /expeditions page
    ExpeditionCard.tsx              <-- REUSED: by ExpeditionsList
    DashboardPhaseProgressBar.tsx   <-- REUSED: unchanged
    ChecklistProgressMini.tsx       <-- REUSED: unchanged
```

### 3.3 Layout and Component Hierarchy

```
AppShellLayout (Server Component)
  |-- AuthenticatedNavbar (Client Component)
  |     |-- NavLink: "Expeditions" -> /expeditions
  |     |-- NavLink: "Meu Atlas" -> /atlas
  |     |-- NavLink: "Meu Perfil" -> /profile
  |     |-- GamificationHeaderBadge (Client, SPEC-ARCH-006)
  |     |-- ThemeToggle, LanguageSwitcher, UserMenu
  |-- <main>
  |     |-- [page content varies by route]
  |-- Footer

/expeditions page:
  ExpeditionsPage (Server Component)
    |-- Breadcrumb
    |-- DashboardHeader (rank, points, greeting)
    |-- ExpeditionsList (Client Component)
    |     |-- ExpeditionCard[] (existing)
    |     |-- EmptyState + "New Expedition" CTA

/atlas page:
  AtlasMapPage (Server Component)
    |-- Breadcrumb
    |-- AtlasInteractiveMap (Client, lazy loaded via next/dynamic)
    |     |-- AtlasMapPin[] (status-colored markers)
    |     |-- Popup on pin click (expedition summary)

/expedition/[tripId]/summary page:
  JourneySummaryPage (Server Component, see SPEC-ARCH-005)
```

### 3.4 Data Flow

```
                         +------------------+
                         |   PostgreSQL     |
                         +--------+---------+
                                  |
              +-------------------+-------------------+
              |                   |                   |
   +----------v----------+  +----v---------+  +------v-----------+
   | /expeditions         |  | /atlas       |  | /expedition/     |
   | (Server Component)   |  | (SC)         |  |   [id]/summary   |
   |                      |  |              |  | (SC, SPEC-005)   |
   | Promise.all([        |  | getUserTrips |  | getJourneySummary|
   |   getProgressSummary,|  | ForAtlas()   |  | (userId, tripId) |
   |   getUserTripsWithExp|  |              |  |                  |
   |   editionData()      |  | Returns:     |  | Returns: all 8   |
   | ])                   |  |  - id        |  | phase aggregation|
   |                      |  |  - dest      |  |                  |
   | Same as current      |  |  - lat/lon   |  +------------------+
   | dashboard/page.tsx   |  |  - status    |
   +----------+-----------+  +----+---------+
              |                    |
   +----------v----------+  +-----v----------+
   | ExpeditionsList      |  | AtlasMap       |
   | (Client Component)   |  | (Client, lazy) |
   +----------------------+  +----------------+
```

### 3.5 Navigation State Management

The navbar determines the active page via `usePathname()` (already implemented). Updated active-state logic:

```typescript
// src/components/layout/AuthenticatedNavbar.tsx

const pathname = usePathname();

const isExpeditionsActive = pathname === "/expeditions"
  || pathname.startsWith("/expedition/");
const isAtlasActive = pathname === "/atlas";
const isProfileActive = pathname === "/profile";
```

Navigation items array (replaces current hardcoded links):

```typescript
const navItems = [
  {
    href: "/expeditions",
    labelKey: "navigation.expeditions",
    isActive: isExpeditionsActive,
  },
  {
    href: "/atlas",
    labelKey: "navigation.myAtlas",
    isActive: isAtlasActive,
  },
  {
    href: "/profile",
    labelKey: "navigation.myProfile",
    isActive: isProfileActive,
  },
];
```

This refactoring replaces the current two hardcoded `<Link>` blocks with a `navItems.map()` loop, reducing duplication in both desktop and mobile nav sections.

---

## 4. Backward Compatibility

### 4.1 Redirect Strategy

The `/dashboard` route must continue to work for:
- Users who bookmarked it.
- Internal links in i18n message files.
- Any hardcoded references in the codebase.

**Implementation**:

```typescript
// src/app/[locale]/(app)/dashboard/page.tsx
import { redirect } from "@/i18n/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/expeditions", locale });
}
```

Note: Next.js App Router `redirect()` from `@/i18n/navigation` performs a server-side redirect. The HTTP status code depends on the `next-intl` configuration; ensure it produces a 308 (permanent redirect) or 307 (temporary). For backward compatibility during transition, 307 is safer. After one sprint, switch to 308.

### 4.2 Internal Reference Audit

The following files reference `/dashboard` and must be updated:

| File | Reference | Action |
|---|---|---|
| `AuthenticatedNavbar.tsx` | Logo `href="/dashboard"`, nav link `href="/dashboard"` | Change logo to `/expeditions`, remove dashboard nav link, add new items |
| `dashboard/page.tsx` | Self (route) | Convert to redirect |
| `ExpeditionCard.tsx` | No dashboard reference | No change |
| Breadcrumb in `dashboard/page.tsx` | `breadcrumb.home` -> `/dashboard` | Move to `/expeditions` page, update href |
| i18n message files | `navigation.myAtlas` | Update key usage; add `navigation.expeditions` |
| Phase wizard "back" buttons | Some reference `/dashboard` | Audit and update to `/expeditions` |
| Middleware (`src/middleware.ts`) | May match on `/dashboard` | Verify -- likely no change needed (uses `(app)` group matching) |

---

## 5. Performance Considerations

### 5.1 Code Splitting

Each page is a separate Next.js route, which means automatic code splitting. The key concern is the atlas page:

| Page | Key Dependencies | Est. Bundle Impact |
|---|---|---|
| `/expeditions` | ExpeditionCard, DashboardHeader, gamification components | ~15KB (already loaded) |
| `/atlas` | Mapbox GL JS (~200KB gzip) | Must be lazy-loaded via `next/dynamic` with `ssr: false` |

The atlas page MUST use dynamic import:

```tsx
const AtlasInteractiveMap = dynamic(
  () => import("@/components/features/atlas/AtlasInteractiveMap"),
  { ssr: false, loading: () => <MapSkeleton /> }
);
```

### 5.2 Performance Targets

| Metric | `/expeditions` | `/atlas` | Notes |
|---|---|---|---|
| LCP | < 1.5s | < 3.0s | Atlas includes map tile loading |
| FCP | < 0.8s | < 1.0s | Server-rendered shell appears fast |
| TTI | < 2.0s | < 4.0s | Map interaction readiness |
| CLS | < 0.05 | < 0.1 | MapSkeleton prevents layout shift |

### 5.3 Prefetching

Next.js App Router automatically prefetches `<Link>` targets on viewport intersection. The navbar links will trigger prefetch of the destination page's RSC payload. This means:
- Navigating from `/expeditions` to `/atlas` will feel fast (RSC payload prefetched).
- The Mapbox JS bundle is NOT prefetched (it is dynamically imported on the client side after the page component mounts).

To optimize atlas first-load, consider adding `<link rel="preload">` for the Mapbox CSS in the atlas page's `<head>` via Next.js metadata.

---

## 6. Security Considerations

- **BOLA**: No change to security model. All pages fetch data via `session.user.id` in WHERE clause. Each page.tsx calls `auth()` and redirects if unauthenticated (inherited from `(app)/layout.tsx`).
- **No new API surface**: All pages are Server Components calling Prisma directly. No new API routes.
- **Mapbox token**: `NEXT_PUBLIC_MAPBOX_TOKEN` is a public token. Must be scoped to application domain via Mapbox dashboard URL restrictions. Add to `src/lib/env.ts` validation.
- **Redirect safety**: The `/dashboard` redirect uses `@/i18n/navigation` redirect, which is safe against open redirect attacks (destination is hardcoded, not user-supplied).

---

## 7. Implementation Guide

### Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `src/app/[locale]/(app)/expeditions/page.tsx` | Create | Server Component: fetch trips + progress, render ExpeditionsList |
| `src/app/[locale]/(app)/atlas/page.tsx` | Create | Server Component: fetch trips for atlas, render AtlasInteractiveMap |
| `src/app/[locale]/(app)/dashboard/page.tsx` | Modify | Replace content with redirect to `/expeditions` |
| `src/components/features/expeditions/ExpeditionsList.tsx` | Create | Client component: card list + empty state (extracted from AtlasDashboard) |
| `src/components/features/atlas/AtlasInteractiveMap.tsx` | Create | Client component: Mapbox GL JS map |
| `src/components/features/atlas/AtlasMapPin.tsx` | Create | Pin component with status color |
| `src/components/features/atlas/MapSkeleton.tsx` | Create | Loading placeholder for lazy-loaded map |
| `src/components/layout/AuthenticatedNavbar.tsx` | Modify | Update nav items: add Expeditions, update active state logic, refactor to loop |
| `src/lib/env.ts` | Modify | Add `NEXT_PUBLIC_MAPBOX_TOKEN` validation |
| `messages/en.json` | Modify | Add `navigation.expeditions` key |
| `messages/pt-BR.json` | Modify | Add `navigation.expeditions` key |

### Migration Strategy

1. **Phase 1 (low risk)**: Create `/expeditions` page as a copy of current `/dashboard` logic. Create redirect in `/dashboard`. Update navbar. This gives us immediate value with no map dependency.
2. **Phase 2 (medium risk)**: Create `/atlas` page with Mapbox integration. Add `destinationLat`/`destinationLon` fields to Trip model (migration from SPEC-ARCH-002 applies here).
3. **Phase 3 (cleanup)**: Deprecate `AtlasDashboard` component. Remove `AtlasHeroMap` if no longer used.

---

## 8. i18n Changes

### New Keys

```json
// messages/en.json
{
  "navigation": {
    "expeditions": "Expeditions",
    "myAtlas": "My Atlas",
    "myProfile": "My Profile"
  }
}

// messages/pt-BR.json
{
  "navigation": {
    "expeditions": "Expedições",
    "myAtlas": "Meu Atlas",
    "myProfile": "Meu Perfil"
  }
}
```

### Breadcrumb Updates

```json
// Expeditions page breadcrumb
{
  "navigation": {
    "breadcrumb": {
      "home": "Home",
      "expeditions": "Expeditions",
      "atlas": "My Atlas"
    }
  }
}
```

---

## 9. Testing Strategy

### Unit Tests
- Navbar active state logic: verify `isExpeditionsActive`, `isAtlasActive`, `isProfileActive` for all relevant pathname patterns.
- ExpeditionsList component: renders cards, empty state, "new expedition" CTA.
- MapSkeleton: renders loading state.

### Integration Tests
- `/dashboard` redirects to `/expeditions` (assert redirect response).
- `/expeditions` renders expedition cards from server data.
- `/atlas` renders map container (Mapbox mocked).
- Navbar renders three navigation items with correct labels.

### E2E Tests
- Navigate from login to `/expeditions` (default landing).
- Click "Meu Atlas" in navbar -> `/atlas` loads.
- Click "Meu Perfil" in navbar -> `/profile` loads.
- Click logo -> navigates to `/expeditions`.
- Visit `/dashboard` -> redirected to `/expeditions`.

---

## 10. Open Questions

- [ ] Should the logo link go to `/expeditions` or remain `/dashboard` (which redirects)? Recommendation: `/expeditions` to avoid unnecessary redirect.
- [ ] Mobile layout for `/atlas`: full-screen map or map with collapsible card drawer? Deferred to UX spec.
- [ ] Should `/expeditions` show the gamification header (rank + points), or move it to the navbar globally (see SPEC-ARCH-006)?
- [ ] Mapbox free tier verification: 50,000 map loads/month. Consult finops-engineer.

---

## 11. Vendor Dependencies

| Vendor | Usage | Abstraction Layer | Exit Strategy |
|---|---|---|---|
| Mapbox GL JS 3.x | Interactive map on `/atlas` page | `AtlasInteractiveMap` component encapsulates all Mapbox API calls | Replace with Leaflet + OpenStreetMap tiles. Component interface (props: trips with coordinates) remains stable. |
| react-simple-maps | Current decorative map in AtlasHeroMap | Isolated in `AtlasHeroMap` component | Remove after `/atlas` page replaces it. |

---

## 12. Constraints (MANDATORY)

### Architectural Boundaries
- New pages MUST be Server Components at the page level, with Client Components for interactive elements only.
- No new API routes. Data fetching happens server-side via Prisma.
- No shared data context between pages. Each page fetches its own data.
- The `(app)/layout.tsx` MUST NOT be modified to fetch page-specific data.

### Performance Budgets
- `/expeditions` LCP < 1.5s (no map library loaded).
- `/atlas` initial bundle must NOT include Mapbox if the user never visits the atlas page (dynamic import required).
- Navbar re-render on route change must be < 16ms (no heavy computation in active state detection).

### Security Requirements
- Auth guard inherited from `(app)/layout.tsx` -- no bypass possible for new routes.
- BOLA: all data queries filter by `session.user.id`.
- Mapbox token validation in `env.ts`.

### Scalability
- Route architecture supports adding future pages (e.g., `/settings`, `/community`) without navbar refactoring -- just add to `navItems` array.
- MAX_ACTIVE_TRIPS = 20 means no pagination needed on `/expeditions` for MVP.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | architect | Initial draft -- extends SPEC-ARCH-002 with implementation details |

---

> Draft -- Pending UX spec for mobile atlas layout and finops review of Mapbox costs. Ready for tech-lead architectural review.
