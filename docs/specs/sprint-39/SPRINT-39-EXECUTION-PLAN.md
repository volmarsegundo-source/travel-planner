# Sprint 39 Execution Plan — Landing Page + Login V2

**Version**: 1.0.0
**Created**: 2026-03-23
**Author**: tech-lead
**Target version**: v0.34.0
**Budget**: 50h (Track 1: 25h | Track 2: 20h | Cross-cutting: 5h)
**Specs**: SPEC-PROD-048, SPEC-PROD-049, SPEC-PROD-050
**UX source of truth**: UX-SPEC-LANDING-LOGIN-V2

---

## Pre-Implementation Notes

### Codebase Observations

1. **DesignBranch already exists** at `src/components/ui/DesignBranch.tsx` (Sprint 38). It is a Client Component using `useDesignV2()` hook which reads `NEXT_PUBLIC_DESIGN_V2`. The PO task doc (T1.1) mentions it may need creation — it does NOT. Devs should use the existing component directly.

2. **DesignBranch is a Client Component** (`"use client"`). This means wrapping V2 components inside `DesignBranch` forces them client-side. For the landing page hero (which needs server-side session check for CTA routing), the session must be resolved in the parent Server Component and passed as a prop to LandingPageV2. The `DesignBranch` component must wrap both V1 and V2 as children — both will be client-rendered.

3. **Login page route** exists at `src/app/[locale]/auth/login/page.tsx`.

4. **Landing page route** exists within the `[locale]` directory (need to verify exact path — likely `src/app/[locale]/page.tsx` or within a route group).

5. **Phase config** exists at `src/lib/engines/phase-config.ts` — phase names SHOULD be sourced from here for the 8 Phases section (not hardcoded).

6. **useDesignV2 hook** at `src/hooks/useDesignV2.ts` — calls `isDesignV2Enabled()` from `src/lib/feature-flags.ts`.

7. **Available Atlas components** (Sprint 38): AtlasButton, AtlasInput, AtlasCard, AtlasChip, AtlasBadge, AtlasPhaseProgress, AtlasStepperInput, DesignBranch — all exported from `src/components/ui/index.ts`.

### UX Spec Divergences from PO Task Doc

The UX spec (UX-SPEC-LANDING-LOGIN-V2) is the visual source of truth. Key differences and decisions from UX that devs must follow:

| Topic | PO Task Doc Says | UX Spec Says | Follow |
|---|---|---|---|
| Hero min-height | `min-h-[921px]` | `min-h-[85vh]` (viewport-relative) | **UX** — viewport-relative is more flexible |
| Phases 7-8 treatment | Badge only | Badge + `opacity-60` on card + no hover + `aria-disabled="true"` | **UX** — more complete |
| Gamification level pill | Placeholder for non-auth | HIDE entirely for non-auth | **UX** |
| Login link colors | `atlas-on-tertiary-container` (#1c9a8e) | `atlas-on-tertiary-fixed-variant` (#005049) for TEXT, #1c9a8e for border only | **UX** — contrast compliance |
| Login left panel collapse | `hidden lg:flex` (1024px+) | Same | Aligned |
| FIX-003 glow-primary | Navy glow `rgba(4,13,27,0.2)` | Amber glow on primary button; navy glow is a separate token | **UX** — see detailed note below |
| FIX-004 ESLint cn/cva | Implement AST-based fix (2h) | Accept gap for v1, file tech debt | **UX recommends skip** |
| AtlasButton loading state | Text maintained during loading | AtlasButton hides children; accept for v1 | **UX** — accept existing behavior |
| Footer bg | `atlas-primary-container` | `atlas-primary` (#040d1b) | **UX** — Stitch uses slate-900 which maps to atlas-primary |
| Nav for unauthenticated | Not specified clearly | Replace avatar/icons with "Entrar" + "Comece Agora" CTAs | **UX** |

### FIX-003 Clarification

The UX spec clarifies that FIX-003 has two aspects:
1. The CSS custom property `--shadow-glow-primary` with value `0 0 12px rgba(4, 13, 27, 0.2)` — a navy glow token (add to globals.css and tailwind.config.ts)
2. AtlasButton primary variant should use `shadow-atlas-glow-amber` (which already exists) not the navy glow

Both changes should be applied. Total estimated time remains 0.5h.

### FIX-004 Decision: DEFER

Per UX spec Section 3 FIX-004 recommendation: the ESLint cn()/cva() detection gap is acceptable for v1. The existing rule covers `className` which is the majority case. The 7 Atlas components are already migrated. File a tech-debt ticket instead. This frees 2h from Track 2 budget.

**Consequence**: T2.4 is REMOVED from Sprint 39 scope. Budget reallocated to T2.10 (Register Page V2 — optional).

### Open UX Questions — Decisions Needed

| ID | Question | Decision | Decided By |
|---|---|---|---|
| Q1 | Icon library: `@material-symbols/font-600` vs Lucide? | **Lucide React** — already in project dependencies (check), tree-shakeable, no font loading. Map Material Symbol names to Lucide equivalents. If no equivalent exists, use inline SVG. | tech-lead |
| Q2 | Hero image: custom or Unsplash? | **Unsplash** for v1. Document photo ID in IMAGE-CREDITS.md. | PO (pending) |
| Q3 | AI mockup: SVG or screenshot? | **SVG illustration** for v1 — lighter, scalable, brand-consistent. | PO (pending) |
| Q4 | AtlasButton loading hides text — acceptable? | **Yes** for v1. File follow-up for `loadingText` prop. | tech-lead + UX |
| Q5 | Copyright entity name? | **Atlas Travel Planner** — consistent across footer and login. | PO (pending) |

---

## Track Assignment

### Track 1 — dev-fullstack-1: Landing Page V2 (25h)

Priority: hero first, then sections top-to-bottom. Each section is a separate file under `src/components/features/landing/`.

---

#### T1.1 — LandingPageV2 skeleton + DesignBranch wiring (2h)

**Spec refs**: SPEC-PROD-048 AC-001, AC-002, AC-003
**Assigned to**: dev-fullstack-1
**Dependency**: None

**What to do**:
- DesignBranch ALREADY EXISTS at `src/components/ui/DesignBranch.tsx` — do NOT recreate
- Create `src/components/features/landing/LandingPageV2.tsx` as skeleton with 7 section placeholders (Nav, Hero, Phases, AI, Gamification, Destinations, Footer)
- Create section component files with empty exports: `LandingNav.tsx`, `HeroSection.tsx`, `PhasesSectionV2.tsx`, `AiSectionV2.tsx`, `GamificationSectionV2.tsx`, `DestinationsSectionV2.tsx`, `FooterV2.tsx`
- In the landing page route file, resolve session server-side and pass `isAuthenticated` prop
- Wire `<DesignBranch v1={<LandingPageV1 />} v2={<LandingPageV2 isAuthenticated={!!session} />} />`
- Verify: flag OFF = V1 unchanged, flag ON = V2 skeleton (empty, no errors)
- Verify: no hydration errors in console for both states

**Acceptance**:
- [ ] DesignBranch renders V1 when `NEXT_PUBLIC_DESIGN_V2=false`
- [ ] DesignBranch renders V2 skeleton when `NEXT_PUBLIC_DESIGN_V2=true`
- [ ] Zero hydration errors in either state

---

#### T1.2 — LandingNav component (3h)

**Spec refs**: UX-SPEC Section 1.1
**Assigned to**: dev-fullstack-1
**Dependency**: T1.1

**What to do**:
- Create `src/components/features/landing/LandingNav.tsx`
- Sticky header: `sticky top-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm`
- Logo: "Atlas" text in Plus Jakarta Sans, `text-atlas-primary`, font-bold
- Desktop (>= 1024px): nav links (Explorar active, Minhas Viagens, Planejador) — links are decorative `#` for v1
- **Non-authenticated state** (landing page default): show "Entrar" (ghost button) + "Comece Agora" (primary button) instead of avatar/icons
- **Authenticated state** (if `isAuthenticated` prop): show avatar placeholder + notification icon
- Mobile (< 768px): logo + hamburger toggle + "Entrar" AtlasButton. Hamburger opens simple nav menu (no Radix Sheet dependency — use state toggle + absolute positioned div)
- All tokens with `atlas-*` prefix for colors
- i18n keys: `landing.nav.*`

**Acceptance**:
- [ ] Sticky nav with glass blur effect
- [ ] Non-auth: "Entrar" + "Comece Agora" CTAs
- [ ] Auth: avatar area (placeholder)
- [ ] Mobile: hamburger menu functional
- [ ] Height: 64px (h-16)

---

#### T1.3 — Hero Section (4h)

**Spec refs**: SPEC-PROD-048 Section 1, AC-004 to AC-007; UX-SPEC Section 1.2
**Assigned to**: dev-fullstack-1
**Dependency**: T1.1

**What to do**:
- Create `src/components/features/landing/HeroSection.tsx`
- Full-viewport section with background image (Next.js `<Image>` with `priority`, `placeholder="blur"`)
- Source a hero image from Unsplash, save to `/public/images/landing/hero.webp`, create `IMAGE-CREDITS.md`
- Gradient overlay: `bg-gradient-to-r from-atlas-primary/80 via-atlas-primary/40 to-transparent`
- HeroPillBadge: inline `<span>` composition — `bg-atlas-secondary-container text-atlas-on-secondary-container rounded-full py-1 px-3 text-xs font-bold uppercase tracking-widest`
- H1: `font-atlas-headline text-4xl md:text-5xl lg:text-7xl font-extrabold text-white leading-[1.1]`
- Subtitle: `text-white/80 font-atlas-body text-base md:text-lg lg:text-xl`
- CTA primary: `<AtlasButton variant="primary" size="lg">` — navigates to `/auth/register` (non-auth) or `/expeditions` (auth). Receives `isAuthenticated` prop.
- CTA secondary: `<AtlasButton variant="glass" size="lg">` — `<a href="#fases">` with `scrollIntoView({ behavior: 'smooth' })`
- Min height: `min-h-[70vh] md:min-h-[80vh] lg:min-h-[85vh]`
- Alt text via i18n key
- **CRITICAL**: CTA primary text color is `atlas-primary` (navy) on orange bg, NOT white on orange

**Acceptance**:
- [ ] Hero with image, overlay, badge, headline, subtitle, 2 CTAs
- [ ] Responsive min-heights per breakpoint
- [ ] CTA primary navigates correctly for auth/non-auth
- [ ] CTA secondary smooth-scrolls to `#fases`
- [ ] Image has descriptive alt text via i18n

---

#### T1.4 — Phases Section (3h)

**Spec refs**: SPEC-PROD-048 Section 2, AC-008, AC-009; UX-SPEC Section 1.3
**Assigned to**: dev-fullstack-1
**Dependency**: T1.1 (can start in parallel with T1.3)

**What to do**:
- Create `src/components/features/landing/PhasesSectionV2.tsx`
- Section `id="fases"` (scroll anchor for hero CTA)
- Background: `bg-atlas-surface`, `py-24`
- Header: centered H2 + subtitle
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8`
- 8 `<AtlasCard>` with icon, title (H3), description
- Phase names: source from `phase-config.ts` where possible. Icons: use Lucide equivalents for Material Symbols (Sparkles, MapPin, CircleCheckBig, Map, Compass, Calendar, HeadsetHelp, ImageGallery or similar)
- Hover: `hover:translate-y-[-4px] transition-transform duration-200` with `motion-reduce:hover:translate-y-0`
- Phases 7 and 8: `opacity-60` on card, `<AtlasBadge variant="status" color="info">Em Breve</AtlasBadge>` at top-right, NO hover effect, NO link, `aria-disabled="true"`
- All text via i18n: `landing.phases.*`

**Acceptance**:
- [ ] 8 cards in responsive grid (1/2/4 columns)
- [ ] Phases 7-8 with badge "Em Breve" + opacity-60 + no hover
- [ ] Hover lift works with prefers-reduced-motion respected
- [ ] `id="fases"` on section element

---

#### T1.5 — AI Assistant Section (3h)

**Spec refs**: SPEC-PROD-048 Section 3; UX-SPEC Section 1.4
**Assigned to**: dev-fullstack-1
**Dependency**: T1.1

**What to do**:
- Create `src/components/features/landing/AiSectionV2.tsx`
- Background: `bg-atlas-primary-container`
- Two-column desktop, single-column mobile: `flex flex-col lg:flex-row items-center gap-16`
- Left column: H2 white, description `text-atlas-primary-fixed-dim`, checklist with check_circle icons in `text-atlas-secondary`, CTA link `text-atlas-secondary-fixed-dim`
- Right column: glass mockup frame (`bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl`)
- AI mockup image: SVG illustration in `/public/images/landing/ai-mockup.svg` (create placeholder SVG for v1)
- Floating prompt card: `absolute -bottom-6 -left-6` on desktop, repositioned below on mobile
- CTA link arrow: `hover:gap-4` with `motion-reduce:hover:gap-2`
- All text via i18n: `landing.ai.*`

**Acceptance**:
- [ ] Two-column desktop, single-column mobile
- [ ] Glass mockup frame with backdrop-blur
- [ ] Floating card positioned correctly (no overlap on mobile)
- [ ] All tokens use atlas-* prefix

---

#### T1.6 — Gamification Section (3h)

**Spec refs**: SPEC-PROD-048 Section 4; UX-SPEC Section 1.5
**Assigned to**: dev-fullstack-1
**Dependency**: T1.1

**What to do**:
- Create `src/components/features/landing/GamificationSectionV2.tsx`
- Background: `bg-atlas-surface`, `py-24`
- Header row: H2 + description left, level pill right (flex-row desktop, stack mobile)
- Level pill: ONLY shown when `isAuthenticated` AND user has gamification data. Hidden entirely for visitors. Receives prop.
- 3 badge cards (AtlasCard): Explorador Nato, Lendario, Guardiao da Natureza
- Glow effect: `absolute inset-0 bg-[token]/20 rounded-full blur-xl`, intensifies on hover (`group-hover:bg-[token]/40`)
- Glow colors mapped to atlas tokens: `atlas-secondary-container/20` (amber), `atlas-info/20` (blue), `atlas-success/20` (green)
- Icon circle borders: `border-atlas-secondary`, `border-atlas-info`, `border-atlas-success`
- Badge icons: workspace_premium, military_tech, verified — use Lucide equivalents (Award, Medal, ShieldCheck or similar)
- Icons use FILL variant — Lucide icons are filled by default
- Text via i18n: `landing.gamification.*`

**Acceptance**:
- [ ] 3 cards with glow effect using atlas-* tokens
- [ ] Level pill hidden for non-authenticated visitors
- [ ] Glow intensifies on hover
- [ ] No raw Tailwind color classes (amber-500, blue-400, emerald-400)

---

#### T1.7 — Destinations Section (4h)

**Spec refs**: SPEC-PROD-048 Section 5; UX-SPEC Section 1.6
**Assigned to**: dev-fullstack-1
**Dependency**: T1.1

**What to do**:
- Create `src/components/features/landing/DestinationsSectionV2.tsx`
- Create `src/components/features/landing/DestinationCard.tsx` — composition component
- Background: `bg-atlas-surface-container-lowest`
- Header: H2 + "Ver Todos os Destinos" link (href="#" with TODO comment)
- Asymmetric 12-column grid: large (7 cols), medium (5 cols), panoramic (12 cols)
- Each card: background image, gradient overlay, category pill badge, title, description
- Image hover: `group-hover:scale-110 transition-transform duration-700` with `motion-reduce:group-hover:scale-100`
- Gradient overlay: `bg-gradient-to-t from-atlas-primary via-transparent to-transparent opacity-80`
- Images: Next.js `<Image>` with `loading="lazy"`, `placeholder="blur"`, `sizes` attribute
- Source 3 images from Unsplash (Rio, Bonito, Pantanal), save to `/public/images/landing/`
- Document photo credits in `IMAGE-CREDITS.md`
- Mobile: all cards 12-col, heights reduced (350px, 300px, 250px)
- Alt text via i18n keys

**Acceptance**:
- [ ] Asymmetric grid working on desktop (7+5 top, 12 bottom)
- [ ] Mobile: cards stack full-width with reduced heights
- [ ] Hover zoom with 700ms transition, disabled for reduced-motion
- [ ] Local images only (no lh3.googleusercontent.com URLs)
- [ ] All images have descriptive alt text

---

#### T1.8 — Footer V2 (2h)

**Spec refs**: SPEC-PROD-048 Section 6; UX-SPEC Section 1.7
**Assigned to**: dev-fullstack-1
**Dependency**: T1.1

**What to do**:
- Create `src/components/features/landing/FooterV2.tsx`
- Background: `bg-atlas-primary` (#040d1b) — NOT atlas-primary-container
- Grid: 4 columns desktop, 2x2 tablet, stack mobile
- Column 1: "Atlas" logo + tagline
- Column 2: "Explorar" links (Guias, Seguro Viagem, Blog — `#` with TODO)
- Column 3: "Empresa" links (Sobre Nos, Contato, Privacidade — `/privacy` if exists)
- Column 4: Newsletter input (`<AtlasInput>` with sr-only label) + send button
- Newsletter submit: simulated 500ms delay + success toast ("Inscricao registrada! Em breve voce recebera novidades."). No backend. Announce via `aria-live="polite"`.
- Copyright: `{new Date().getFullYear()} Atlas Travel Planner`
- All text via i18n: `landing.footer.*`

**Acceptance**:
- [ ] 4-column desktop, 2x2 tablet, 1-column mobile
- [ ] Links point to existing routes where possible
- [ ] Copyright with dynamic year
- [ ] Newsletter shows mock success toast on submit
- [ ] No backend integration for newsletter

---

#### T1.9 — Responsive polish (2h)

**Spec refs**: SPEC-PROD-048 AC-013, AC-014, AC-015
**Assigned to**: dev-fullstack-1
**Dependency**: T1.2 through T1.8

**What to do**:
- Review ALL sections at 4 breakpoints: 375px, 768px, 1024px, 1440px
- Verify zero horizontal overflow at 375px
- Verify all touch targets >= 44px at 375px
- Adjust gaps, paddings, font sizes per breakpoint
- Verify `max-w-screen-2xl` content containment at 1440px
- Verify landmark structure: `<header>`, `<main>`, `<footer>`

**Acceptance**:
- [ ] Zero overflow at 375px
- [ ] All touch targets >= 44px at 375px
- [ ] Correct layout at all 4 breakpoints
- [ ] Semantic HTML landmarks present

---

#### T1.10 — i18n + Unit Tests + E2E (2h)

**Spec refs**: SPEC-PROD-048 AC-022 to AC-026
**Assigned to**: dev-fullstack-1
**Dependency**: T1.2 through T1.9

**What to do**:
- Add i18n keys in `messages/pt-BR.json` and `messages/en.json`
- Namespaces: `landing.nav.*`, `landing.hero.*`, `landing.phases.*`, `landing.ai.*`, `landing.gamification.*`, `landing.destinations.*`, `landing.footer.*`
- Zero hardcoded pt-BR strings in JSX
- Unit tests:
  - LandingPageV2 renders without errors
  - Hero CTA navigates correctly (auth vs non-auth)
  - Phases 7-8 show "Em Breve" badge
  - Footer copyright has correct year
  - Coverage >= 80%
- E2E with flag ON: all 7 sections rendered, CTAs functional
- E2E with flag OFF: V1 renders unchanged (screenshot comparison)

**Acceptance**:
- [ ] All i18n keys in pt-BR and en
- [ ] Zero hardcoded strings
- [ ] Unit tests passing, coverage >= 80%
- [ ] E2E passing for both flag states

---

### Track 2 — dev-fullstack-2: Login V2 + Carryover (20h)

Priority: carryover fixes first (quick wins, Day 1), then login page.

---

#### T2.1 — FIX-001: AtlasChip aria-pressed removal (0.5h)

**Spec refs**: SPEC-PROD-050 FIX-001, AC-001 to AC-003
**Assigned to**: dev-fullstack-2
**Dependency**: None

**What to do**:
- Read `src/components/ui/AtlasChip.tsx`
- Remove `aria-pressed` from selectable chip — keep only `aria-checked` + `role="checkbox"`
- Update test expectations if they assert `aria-pressed`
- Run existing tests to verify no regression

**Acceptance**:
- [ ] `aria-pressed` not present in accessibility tree
- [ ] `aria-checked` correctly reflects selection state
- [ ] Existing tests pass

---

#### T2.2 — FIX-002: AtlasPhaseProgress 44px mobile (0.5h)

**Spec refs**: SPEC-PROD-050 FIX-002, AC-004 to AC-006
**Assigned to**: dev-fullstack-2
**Dependency**: None

**What to do**:
- Read `src/components/ui/AtlasPhaseProgress.tsx`
- Ensure clickable button wrapper has `min-w-[44px] min-h-[44px]` on all breakpoints
- Visual circle can remain 40px; the button touch target is what matters
- Verify layout does not break at 375px
- Desktop appearance unchanged

**Acceptance**:
- [ ] Touch target >= 44x44px at 375px viewport
- [ ] No layout break on mobile
- [ ] Desktop unchanged visually

---

#### T2.3 — FIX-003: Token glow-primary + AtlasButton primary glow (0.5h)

**Spec refs**: SPEC-PROD-050 FIX-003, AC-007 to AC-009; UX-SPEC Section 3 FIX-003
**Assigned to**: dev-fullstack-2
**Dependency**: None

**What to do**:
- Add to `globals.css` `:root`: `--shadow-atlas-glow-primary: 0 0 12px rgba(4, 13, 27, 0.2);`
- Add to `tailwind.config.ts` boxShadow: `'atlas-glow-primary': '0 0 12px rgba(4, 13, 27, 0.2)'`
- In AtlasButton primary variant, add `shadow-atlas-glow-amber` alongside existing shadow (amber glow on primary button per UX spec)
- Verify any existing fallback for glow-primary is replaced with the token
- Verify AtlasButton primary renders with amber glow on hover

**Acceptance**:
- [ ] `--shadow-atlas-glow-primary` CSS property in `:root`
- [ ] `shadow-atlas-glow-primary` class available in Tailwind
- [ ] AtlasButton primary has amber glow
- [ ] No hardcoded fallback shadows remaining

---

#### T2.4 — FIX-004: ESLint cn()/cva() — DEFERRED to tech debt

**Status**: REMOVED from Sprint 39 per UX spec recommendation
**Rationale**: Existing rule covers className which is the majority case. The 7 Atlas components are already migrated. AST-based enhancement filed as DEBT-S39-001.

---

#### T2.5 — LoginFormV2: Layout + Brand Panel (4h)

**Spec refs**: SPEC-PROD-049 AC-001 to AC-003; UX-SPEC Section 2.1, 2.2
**Assigned to**: dev-fullstack-2
**Dependency**: T2.1-T2.3 can run in parallel; T2.5 can start Day 2

**What to do**:
- Create `src/components/features/auth/LoginFormV2.tsx`
- Root layout: `flex min-h-screen`
- **Left panel** (60%, `hidden lg:flex w-[60%]`):
  - Background: `bg-atlas-primary`
  - Topographic SVG pattern: extract from Stitch to `/public/images/topo-pattern.svg`, use as CSS background-image, `opacity-40`
  - Ambient glow: absolutely positioned div `bg-atlas-on-tertiary-container blur-[140px] opacity-20 rounded-full w-[500px] h-[500px]` centered
  - Logo: explore icon in gradient container `from-atlas-secondary-container to-atlas-secondary-fixed-dim`, rounded-xl
  - "Atlas" text: `font-atlas-headline text-6xl font-black text-white tracking-tighter`
  - Tagline: `text-atlas-on-primary-container text-xl` — "Do sonho ao destino, com inteligencia."
  - Floating card: hardcoded "Rio de Janeiro -> Lisboa", 85% progress bar with `bg-atlas-secondary-container` and amber glow shadow, rotated `-4deg`
  - Decorative mountain image: `/public/images/login/decorative-mountain.webp`, grayscale, opacity-20, -rotate-12
  - All decorative elements: `aria-hidden="true"`
- **Mobile header** (visible `lg:hidden`): Atlas icon + "Atlas" text
- Body: `overflow-hidden` on root; form panel scrolls internally

**Acceptance**:
- [ ] Brand panel visible on desktop (>= 1024px), hidden on mobile/tablet
- [ ] All visual elements using atlas-* tokens
- [ ] Floating card with amber glow progress bar
- [ ] Decorative elements have `aria-hidden="true"`

---

#### T2.6 — LoginFormV2: Form + Authentication (3h)

**Spec refs**: SPEC-PROD-049 AC-004 to AC-008; UX-SPEC Section 2.3
**Assigned to**: dev-fullstack-2
**Dependency**: T2.5

**What to do**:
- **Right panel** (40% desktop, 100% mobile): `w-full lg:w-[40%] bg-white flex flex-col px-8 md:px-20 py-12 justify-center overflow-y-auto`
- Form `max-w-md w-full mx-auto`
- Welcome block: H2 "Bem-vindo de volta" + subtitle
- Email: `<AtlasInput type="email" label="E-mail" placeholder="seu@email.com" leftIcon={<MailIcon />} />`
- Password: custom label wrapper (label + "Esqueceu a senha?" link on same row) + `<AtlasInput type="password" />`
  - Password toggle: button with visibility/visibility_off, `aria-label` updates dynamically ("Mostrar senha" / "Ocultar senha")
  - "Esqueceu a senha?" link: `text-atlas-on-tertiary-fixed-variant` (#005049) — NOT #1c9a8e
- "Lembrar de mim" checkbox: native `<input type="checkbox">` with Tailwind styling, `accent-atlas-secondary-container`
- Submit CTA: `<AtlasButton variant="primary" size="lg" fullWidth type="submit">` — "Entrar" + arrow_forward icon
- Loading state: AtlasButton built-in spinner (accept existing behavior — text hidden during load)
- Error message: `role="alert" aria-live="polite"`, `atlas-error-container` styling
- **CRITICAL**: Reuse existing LoginFormV1 authentication handler. Do NOT duplicate auth logic. Extract shared auth logic if needed.
- Input border on focus: override to `border-atlas-on-tertiary-container` (#1c9a8e teal) via className
- Keyboard focus ring: `atlas-focus-ring` (#fe932c amber) — DO NOT change

**Acceptance**:
- [ ] Login works with valid email/password (correct redirect)
- [ ] Error displayed with invalid credentials
- [ ] Password toggle functional with correct aria-label
- [ ] "Esqueceu a senha?" link works
- [ ] Submit button loading state without layout shift

---

#### T2.7 — LoginFormV2: Social Login + DesignBranch (2h)

**Spec refs**: SPEC-PROD-049 AC-009, AC-010; UX-SPEC Section 2.3
**Assigned to**: dev-fullstack-2
**Dependency**: T2.5, T2.6

**What to do**:
- Divider: `border-atlas-outline-variant/30` with "ou" text centered
- Google button: `<AtlasButton variant="secondary">` with inline SVG Google logo
- GitHub button: `<AtlasButton variant="secondary">` with inline SVG GitHub logo
- Conditional rendering: check `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `process.env.NEXT_PUBLIC_GITHUB_ID`
- If only one provider: `col-span-2` (full width)
- If no providers: hide divider AND social section entirely
- Reuse V1 signIn handlers
- "Criar conta gratis" link: `text-atlas-on-tertiary-fixed-variant`, links to `/auth/register`
- Legal text: 11px, `text-atlas-outline`, links to `/terms` and `/privacy`
- **DesignBranch integration** in `src/app/[locale]/auth/login/page.tsx`:
  ```tsx
  <DesignBranch v1={<LoginFormV1 />} v2={<LoginFormV2 />} />
  ```
- Accessible labels on social buttons: "Entrar com Google", "Entrar com GitHub"

**Acceptance**:
- [ ] Social login buttons shown only when provider configured
- [ ] DesignBranch wired in login route — V1 unchanged with flag OFF
- [ ] Links correct and styled per UX spec
- [ ] Social buttons have full accessible labels

---

#### T2.8 — LoginFormV2: i18n + Unit Tests (2h)

**Spec refs**: SPEC-PROD-049 AC-022 to AC-024
**Assigned to**: dev-fullstack-2
**Dependency**: T2.5 through T2.7

**What to do**:
- Add i18n keys in `messages/pt-BR.json` and `messages/en.json`
- Reuse existing `auth.*` keys where possible
- New keys: `auth.login.welcome_back`, `auth.login.tagline`, `auth.login.remember_me`, `auth.login.legal`, `auth.login.social_google`, `auth.login.social_github`
- Unit tests:
  - Renders without errors (flag ON and OFF)
  - Password toggle: initial `type="password"`, after click `type="text"`, aria-label updated
  - Error message rendered with `role="alert"`
  - Social login hidden when env var absent
  - Social login visible when env var present (mock)
  - Coverage >= 80%

**Acceptance**:
- [ ] i18n keys added in both locales
- [ ] No hardcoded strings
- [ ] Unit tests passing, coverage >= 80%

---

#### T2.9 — E2E: Login with flag ON and OFF (2h)

**Spec refs**: SPEC-PROD-049 AC-025, AC-026
**Assigned to**: dev-fullstack-2
**Dependency**: T2.5 through T2.8

**What to do**:
- E2E flag ON:
  - Full flow: fill email/password, submit, verify redirect to `/expeditions`
  - Error flow: invalid credentials, verify error message visible
  - Password toggle: field type changes
  - Screenshot of full LoginFormV2 (desktop: left + right panels)
  - Mobile viewport (375px): brand panel hidden, form full-width
- E2E flag OFF:
  - Screenshot comparison with Sprint 38 baseline — zero diffs expected

**Acceptance**:
- [ ] Login flow works end-to-end with flag ON
- [ ] Error displayed correctly
- [ ] Zero visual regressions with flag OFF
- [ ] Mobile: brand panel hidden, form full-width

---

#### T2.10 — Register Page V2 (OPTIONAL, 4h if budget allows)

**Spec refs**: None formal — use SPEC-PROD-049 as visual guide
**Assigned to**: dev-fullstack-2
**Dependency**: T2.7 complete AND >= 4h remaining in budget
**Condition**: Start ONLY if T2.1-T2.9 are complete

**What to do**:
- Create `RegisterFormV2` with same two-column layout as LoginFormV2
- Additional fields: name, confirm password, terms acceptance checkbox
- Reuse existing RegisterSchema validation
- DesignBranch wiring in register route
- Basic unit tests

**Acceptance**:
- [ ] Register works with flag ON (user created, redirect)
- [ ] No regression with flag OFF
- [ ] Basic unit tests

---

### Cross-cutting (5h)

| ID | Task | Owner | Est | Dependency |
|---|---|---|---|---|
| TC.1 | Update SPEC-STATUS.md with Sprint 39 entries | tech-lead | 0.5h | None |
| TC.2 | UX Designer mid-sprint review (after T1.3 + T2.5 done) | ux-designer | 2h | T1.3, T2.5 |
| TC.3 | UX Designer final validation (after T1.10 + T2.9) | ux-designer | 2h | T1.10, T2.9 |
| TC.4 | Sprint review document | tech-lead | 0.5h | All |

**TC.2 is BLOCKING**: UX Designer must review hero section and login brand panel before more than 50% of sprint budget is spent. This catches fidelity issues early and prevents rework on downstream sections.

**TC.3 is BLOCKING for merge**: UX Designer approval is required before the V2 PR merges.

---

## Dependency Graph

```
Day 1:
  Track 1: T1.1 (skeleton + DesignBranch wiring)
  Track 2: T2.1, T2.2, T2.3 (carryover fixes — parallel, no deps)

Day 2:
  Track 1: T1.2 (Nav) + T1.3 (Hero) — can overlap
  Track 2: T2.5 start (LoginFormV2 layout + brand panel)

Day 3:
  Track 1: T1.4 (Phases) + T1.5 (AI) — parallel, both depend only on T1.1
  Track 2: T2.5 finish + T2.6 start (form)

Day 4: [MID-SPRINT REVIEW TC.2 — BLOCKING]
  Track 1: T1.6 (Gamification) + T1.7 (Destinations)
  Track 2: T2.6 finish + T2.7 (social login + DesignBranch)

Day 5-6:
  Track 1: T1.8 (Footer) + T1.9 (responsive)
  Track 2: T2.8 (i18n + tests) + T2.9 (E2E)

Day 7:
  Track 1: T1.10 (i18n + unit tests + E2E)
  Track 2: T2.10 (Register V2 — optional)

Day 8: [FINAL REVIEW TC.3 — BLOCKING for merge]
  Both tracks: UX review adjustments
  tech-lead: sprint review TC.4
```

### Parallel Execution Map

```
T1.1 ──────────┬──→ T1.2 (Nav) ──────────┐
               ├──→ T1.3 (Hero) ──────────┤
               ├──→ T1.4 (Phases) ────────┤
               ├──→ T1.5 (AI) ────────────┤ T1.4-T1.8 can all
               ├──→ T1.6 (Gamification) ──┤ start after T1.1
               ├──→ T1.7 (Destinations) ──┤
               └──→ T1.8 (Footer) ────────┘
                                           └──→ T1.9 (responsive) ──→ T1.10 (tests)

T2.1 (chip) ────┐
T2.2 (progress) ┤ parallel, no deps
T2.3 (glow) ────┘
                 └──→ T2.5 (layout) ──→ T2.6 (form) ──→ T2.7 (social + DB) ──→ T2.8 (i18n/tests) ──→ T2.9 (E2E)
                                                                                                        └──→ T2.10 (optional)
```

---

## Key Technical Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **DesignBranch in page.tsx route files, NOT in layout.tsx** | Layout remains V1 for both versions. V2 replaces page content only. |
| 2 | **LandingPageV2 split into 7 section components** | Maintainability, code review granularity, parallel development possible. |
| 3 | **NavV2 as separate component** | Reusable across other V2 pages (future sprints). |
| 4 | **Lucide React for icons (not Material Symbols font)** | Tree-shakeable, no font loading, already in dependency tree (verify). Avoids 100KB+ font download. |
| 5 | **Teal for input focus border, amber for keyboard ring** | UX-SPEC Section 2.4 dual-purpose approach. Two mechanisms serving two purposes. |
| 6 | **Link text color: #005049 (not #1c9a8e)** | #1c9a8e fails WCAG AA for text (3.5:1). #005049 passes (8.2:1). UX decision. |
| 7 | **Session resolved in Server Component, passed as prop** | DesignBranch is Client Component. Auth check must happen server-side. |
| 8 | **FIX-004 deferred** | UX recommends accepting the gap. Frees 2h for optional Register V2. |
| 9 | **Newsletter is ornamental** | No backend. Mock toast on submit. Backend integration in future sprint. |
| 10 | **Images from Unsplash with credits** | All lh3.googleusercontent.com URLs replaced. Photo IDs documented in IMAGE-CREDITS.md. |

---

## Definition of Done — Sprint 39

A task is DONE when:
- [ ] Code implemented per spec
- [ ] Unit tests passing (coverage >= 80% for new components)
- [ ] `npm run lint` without new errors or warnings
- [ ] `npm run build` without errors
- [ ] E2E with flag ON and OFF passing
- [ ] No raw Tailwind color classes (validated by ESLint rule for className)
- [ ] PR description references Spec ID (e.g., `feat(SPEC-PROD-048): hero section`)
- [ ] Commit convention: `feat(SPEC-PROD-0XX): description` or `fix(SPEC-PROD-050): description`

Sprint 39 is COMPLETE when:
- [ ] All P0 and P1 tasks complete (T1.1-T1.10, T2.1-T2.3, T2.5-T2.9)
- [ ] LandingPageV2 renders all 7 sections matching Stitch export
- [ ] LoginPageV2 renders split-screen matching UX spec
- [ ] DesignBranch: flag OFF = V1 unchanged, flag ON = V2 renders
- [ ] 4 Sprint 38 carryover fixes applied (3 of 4; FIX-004 deferred)
- [ ] All Unsplash images have alt text and lazy loading
- [ ] Responsive: works at 375px, 768px, 1024px, 1440px
- [ ] UX Designer approved landing V2 and login V2 (TC.3 signed off)
- [ ] Zero regressions in V1 (flag OFF screenshots)
- [ ] Visual fidelity checklist completed (UX-SPEC Section 4)
- [ ] Sprint review document produced (TC.4)
- [ ] All tests pass, build clean
- [ ] Merged to main via PR

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Stitch CSS patterns do not translate 1:1 to Tailwind + atlas-* tokens | Medium | Medium | UX mid-sprint review (TC.2) catches issues early. UX spec has full token mapping. |
| R2 | Image licensing: Unsplash images used without proper attribution | Low | High | IMAGE-CREDITS.md created in T1.3 with all photo IDs and photographer names. |
| R3 | DesignBranch bundle size: V2 components loaded even when flag OFF | Medium | Low | Use Next.js `dynamic()` with `ssr: false` for V2 component if bundle size exceeds 50KB. |
| R4 | Lucide icons do not have exact equivalents for all Material Symbols | Medium | Low | Use inline SVG for any icon without a Lucide match. Document in implementation. |
| R5 | Auth handler extraction for LoginFormV2 introduces regression in V1 | Low | High | Shared handler lives in separate file. V1 imports same function. Both tested in E2E. |
| R6 | Mid-sprint UX review reveals significant fidelity gaps | Medium | Medium | TC.2 scheduled after hero + brand panel — the two most visually complex elements. Early feedback prevents cascade. |

---

## Tech Debt Created

| ID | Description | Sprint to Address |
|---|---|---|
| DEBT-S39-001 | ESLint cn()/cva() detection (FIX-004 deferred) | Sprint 40 |
| DEBT-S39-002 | AtlasButton `loadingText` prop (text hidden during loading) | Sprint 40 |
| DEBT-S39-003 | Newsletter backend integration (currently ornamental) | TBD |
| DEBT-S39-004 | AtlasCheckbox component (if checkbox pattern recurs) | Sprint 40+ |
| DEBT-S39-005 | AtlasBadge variant="pill" (if pill badge recurs) | Sprint 40+ |
| DEBT-S39-006 | /destinations dynamic page (link currently `#`) | TBD |

---

## Budget Summary

| Track | Task Count | Estimated Hours | Notes |
|---|---|---|---|
| Track 1 (Landing) | 10 tasks | 25h | T1.1-T1.10 |
| Track 2 (Login + Carryover) | 8 tasks + 1 optional | 18h + 4h optional | T2.1-T2.3, T2.5-T2.10 |
| Cross-cutting | 4 tasks | 5h | TC.1-TC.4 |
| **Total** | **22 + 1 optional** | **48h + 4h optional** | Within 50h budget |

FIX-004 removal freed 2h. This slack absorbs potential rework from UX mid-sprint review (TC.2).

---

> Ready to execute. Tracks 1 and 2 can start in parallel immediately. First blocker: TC.2 (UX mid-sprint review) after Day 3-4 delivery of T1.3 + T2.5.
