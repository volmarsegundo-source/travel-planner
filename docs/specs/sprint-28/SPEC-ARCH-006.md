---
spec_id: SPEC-ARCH-006
title: "Real-time Gamification in Header"
type: architecture
status: Draft
version: "1.0.0"
author: architect
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs:
  - SPEC-ARCH-004
  - SPEC-ARCH-005
---

# SPEC-ARCH-006: Real-time Gamification in Header

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: tech-lead, ux-designer, qa-engineer, finops-engineer
**Product Spec**: SPEC-PROD-010
**UX Spec**: SPEC-UX-011
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Overview

Display real-time gamification data (points, level, phase name) in the authenticated navbar header. The challenge is balancing data freshness with performance — the header renders on every page, so we must avoid expensive DB queries on each navigation.

---

## 2. Current State

### Data Sources
- `UserProgress` model: `totalPoints`, `currentLevel`, `currentPhase`
- `PointTransaction` model: individual point awards with timestamps
- `PHASE_DEFINITIONS` in `src/lib/engines/phase-config.ts`: phase names and thresholds

### Current Access Pattern
- Gamification data is fetched only on the dashboard page via `getUserProgress()` server action
- Navbar has no access to gamification data
- Points are awarded via `PointsEngine.awardPoints()` during expedition actions

---

## 3. Proposed Architecture

### 3.1 Option A: Session-Embedded Data (Recommended)

Embed lightweight gamification summary in the JWT session token via Auth.js callbacks.

```
┌─────────────┐    JWT includes:         ┌───────────────┐
│   Auth.js   │ ──── { totalPoints,  ──→ │  Navbar       │
│   Session   │      currentLevel,       │  (Server Comp)│
│             │      phaseName }         │               │
└─────────────┘                          └───────────────┘
```

**Pros:**
- Zero additional DB queries per page load
- Available in server components via `auth()`
- Already using JWT strategy

**Cons:**
- Data staleness: JWT refreshes only on session update
- Need to trigger session update after point awards
- Adds ~100 bytes to JWT payload

**Implementation:**
1. Extend `jwt` callback in `src/lib/auth.config.ts`:
   ```ts
   jwt({ token, trigger, session }) {
     if (trigger === "update" && session?.gamification) {
       token.totalPoints = session.gamification.totalPoints;
       token.currentLevel = session.gamification.currentLevel;
       token.phaseName = session.gamification.phaseName;
     }
     return token;
   }
   ```

2. After `PointsEngine.awardPoints()`, call `update({ gamification: { ... } })` from the client via `useSession().update()`

3. On initial login, populate gamification data in the `signIn` callback

### 3.2 Option B: Client-Side SWR Fetch

Use `useSWR` or React Query to fetch gamification data on the client side with caching.

```
┌──────────┐    GET /api/gamification/me    ┌──────────┐
│  Navbar  │ ──────────────────────────────→ │   API    │
│ (Client) │ ←────── { points, level } ──── │  Route   │
└──────────┘    SWR cache: 60s              └──────────┘
```

**Pros:**
- Always fresh data (within cache TTL)
- Decoupled from auth session
- Can show optimistic updates

**Cons:**
- Additional API request on every page load (cached)
- Navbar must be a client component (or nested client island)
- N+1 if many concurrent tabs

**Implementation:**
1. Create `GET /api/gamification/me` route
2. Navbar wraps `<GamificationBadge />` as client component with `useSWR("/api/gamification/me", { refreshInterval: 60000 })`
3. Optimistic update: when points are awarded, mutate SWR cache locally

### 3.3 Option C: Hybrid (Session + Event-Driven Update)

Use session-embedded data as baseline, with client-side event bus for real-time updates within the same session.

**Implementation:**
1. Session JWT carries gamification data (same as Option A)
2. Create a React context `GamificationContext` wrapping the app layout
3. When `PointsEngine.awardPoints()` completes, emit an event via context
4. Navbar subscribes to context and shows optimistic increment animation
5. On next page navigation, server component reads updated session

---

## 4. Recommendation: Option A (Session-Embedded)

**Rationale:**
- Simplest implementation — no new API routes, no new client-side data fetching
- Zero performance impact — data is already in the session token
- Sufficient freshness — points update in the same user flow that awards them
- Auth.js `update()` is designed exactly for this use case
- Aligns with existing JWT strategy (no architectural drift)

**Acceptable staleness:** Points update within the same user action flow. If user opens a second tab, they see the data from their last session update. This is acceptable for gamification — it's not financial data.

---

## 5. Component Architecture

```
AppShellLayout (Server Component)
  └── auth() → session.user.totalPoints, currentLevel, phaseName
      └── AuthenticatedNavbar (Server Component)
          ├── Logo
          ├── NavLinks
          ├── GamificationBadge (Client Component)
          │   ├── Points display (atlas-gold badge)
          │   ├── Phase name
          │   └── Pulse animation on update
          ├── LanguageSwitcher
          └── UserMenu
```

### GamificationBadge Component
```tsx
interface GamificationBadgeProps {
  totalPoints: number;
  currentLevel: number;
  phaseName: string;
}
```

- Receives data as props from server component (from session)
- Client component only for: animation on mount, click interaction, responsive behavior
- No data fetching inside this component

---

## 6. Data Flow on Point Award

```
1. User completes action (e.g., fills phase field)
2. Server action: PointsEngine.awardPoints() → DB write
3. Server action returns: { success: true, newTotal: 150 }
4. Client: update session → useSession().update({ gamification: { totalPoints: 150, ... } })
5. Next render: AuthenticatedNavbar reads updated session
6. GamificationBadge shows new total with pulse animation
```

---

## 7. Session Token Extension

### Current Session Type (extend)
```ts
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    // NEW:
    totalPoints: number;
    currentLevel: number;
    phaseName: string;
  }
}
```

### JWT Size Impact
- Additional fields: ~80-120 bytes
- Current JWT size: ~500 bytes
- New JWT size: ~620 bytes
- Cookie size limit: 4096 bytes → well within limit

---

## 8. Performance Considerations

- **No additional DB queries** for header rendering (Option A)
- **Session update** only triggered when points change (not on every page load)
- **Animation** uses CSS only (no JS animation loop)
- **Code splitting**: `GamificationBadge` is tiny (~2KB) — no lazy loading needed

---

## 9. Migration Strategy

1. Extend Auth.js types (`next-auth.d.ts`) with gamification fields
2. Update JWT callback to include gamification data
3. Update session callback to expose gamification data
4. Create `GamificationBadge` client component
5. Add badge to `AuthenticatedNavbar`
6. Update all `PointsEngine.awardPoints()` call sites to trigger session update
7. Tests: mock session with gamification fields

---

## 10. Trade-offs

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Data freshness | Eventual (within same flow) | Acceptable for gamification scores |
| Architecture | Session-embedded | Zero additional requests |
| Component type | Client island in server layout | Needed for animation only |
| Caching | JWT token = implicit cache | No separate cache layer needed |
| Multi-tab sync | Not real-time | Tab refresh gets latest data — acceptable |
