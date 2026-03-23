---
name: Sprint 39 — Landing Page + Login V2
description: UX spec for Landing Page V2 (6 sections from Stitch export) and Login V2 (split-screen) using Atlas design system tokens and components
type: project
---

Sprint 39 UX spec delivered: `docs/specs/sprint-39/UX-SPEC-LANDING-LOGIN-V2.md`

**Why:** First real application of Sprint 38 Atlas design system (59 tokens, 7 components, 2 fonts). Landing page is 100% of new user first impressions. Login is the authenticated entry point.

**How to apply:** This spec is the single source of truth for both pages. Devs implement pixel-by-pixel from visual fidelity checklist.

Key decisions:
- Login focus colors: dual-purpose — teal border (#1c9a8e) for input focus, amber ring (#fe932c) for keyboard focus. Link text uses #005049 (not #1c9a8e) for WCAG AA on small text.
- Login left panel: hidden below 1024px (NOT 50/50 on tablet — brand panel too narrow).
- Floating "Proxima Viagem" card: HARDCODED mock data. Never reads API/session.
- Nav for non-auth: CTAs ("Entrar" + "Comece Agora") instead of avatar/icons.
- Newsletter email: ornamental v1, mock success toast.
- All lh3 AI images replaced with Unsplash or SVG. Images in /public/images/landing/ and /public/images/login/.
- 0 new library components needed; 5 page-level compositions; 4 inline patterns.
- Sprint 38 carryover: 4 low-severity fixes (FIX-001 through FIX-004) specified with exact changes.
- Stitch `orange-400` mapped to `atlas-secondary-fixed-dim` (#ffb77d).
- Stitch `slate-900` mapped to `atlas-primary` (#040d1b).
- AtlasButton loading hides children (spinner only) — conflicts with SPEC-PROD-049 "texto mantido". Flagged as open question Q4.
- 5 open questions (icon library, hero image source, AI mockup format, loading text, copyright entity).
