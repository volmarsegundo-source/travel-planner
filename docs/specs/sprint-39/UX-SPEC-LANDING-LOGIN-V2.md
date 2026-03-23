---
spec_id: UX-SPEC-LANDING-LOGIN-V2
title: Landing Page V2 + Login Page V2 — UX Specification
version: 1.0.0
status: Draft
sprint: 39
owner: ux-designer
created: 2026-03-23
updated: 2026-03-23
related_stories: SPEC-PROD-048, SPEC-PROD-049
token_reference: docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md
validation_reference: docs/specs/sprint-38/UX-VALIDACAO-FINAL-SPRINT-38.md
design_references:
  - docs/design/stitch-exports/atlas_landing_page_a_inspira_o/code.html
  - docs/design/stitch-exports/atlas_landing_page_a_inspira_o/screen.png
  - docs/design/stitch-exports/login/code.html
  - docs/design/stitch-exports/login/screen.png
---

# UX Specification: Landing Page V2 + Login Page V2

---

## SECTION 1: Landing Page V2 — Section-by-Section Breakdown

The Stitch export contains 6 distinct sections: Navigation Header, Hero, 8 Phases, AI Assistant, Gamification, Featured Destinations, and Footer. Each is analyzed below.

---

### Section 1.1: Navigation Header

**Visual description**: A sticky top bar with frosted glass effect. Left side: "Atlas" wordmark + 3 nav links (Explorar active with amber underline, Minhas Viagens, Planejador). Right side: notification icon, premium icon, avatar circle.

**Atlas components used**:
- AtlasButton variant="icon-only" for notification and premium icons
- No existing component for the nav bar itself

**New compositions needed**:
- `LandingNav` — a composition-only component (not reusable library). Contains logo, nav links, and right-side controls. Authenticated state: show avatar + icons. Non-authenticated state: show "Entrar" and "Criar Conta" buttons instead.

**Token mapping**:
| Property | Token |
|---|---|
| Background | `bg-white/80 backdrop-blur-xl` (glass — uses white + opacity, not a token) |
| Text (logo) | `text-atlas-primary` |
| Text (active link) | `text-atlas-primary` + `border-b-2 border-atlas-secondary-container` |
| Text (inactive link) | `text-atlas-on-surface-variant` hover `text-atlas-on-surface` |
| Shadow | `shadow-sm` (Tailwind default — acceptable for nav; not a colored shadow) |
| Height | `h-16` (64px) |
| Max width | `max-w-screen-2xl mx-auto` |
| Padding | `px-6` |

**Responsive behavior**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Logo + hamburger menu (nav links hidden). Right side: single "Entrar" AtlasButton. |
| Tablet (768-1024px) | Logo + nav links visible. Right side: condensed controls. |
| Desktop (> 1024px) | Full layout per Stitch export. |

**Animations**:
- Sticky header appears with `backdrop-blur-xl` — no entrance animation needed.
- Link hover: color transition `atlas-transition-fast` (150ms).
- `prefers-reduced-motion`: No animations to disable (color transitions only).

**Image strategy**: No images. Logo is text-only ("Atlas" in Plus Jakarta Sans bold).

**UX decision — Nav for non-authenticated visitors**: The Stitch export shows an authenticated nav with avatar and notification icons. For the landing page (public), the nav must adapt: replace avatar/icons with "Entrar" (ghost) and "Comece Agora" (primary) CTAs. This is critical — visitors cannot see "Minhas Viagens" or notifications before logging in.

---

### Section 1.2: Hero Section

**Visual description**: Full-viewport section with a dramatic landscape photo (Chapada Diamantina at sunset), dark gradient overlay from left to right, content block aligned left. Contains: orange pill badge, massive headline, subtitle, two CTAs.

**Atlas components used**:
- AtlasBadge variant="category-overline" — for the "A Nova Era do Planejamento" pill. However, this needs a pill container (the current category-overline has no background). See Component Gap Analysis.
- AtlasButton variant="primary" size="lg" — "Comece Sua Viagem Agora" with rightIcon arrow.
- AtlasButton variant="glass" size="lg" — "Como Funciona".

**New compositions needed**:
- `HeroPillBadge` — inline pill with `bg-atlas-secondary-container text-atlas-on-secondary-container` background, rounded-full, uppercase, tracking-widest. This is NOT the same as AtlasBadge category-overline (which has no background). Create as a simple span composition.
- `HeroSection` — layout wrapper with background image, gradient overlay, content positioning.

**Token mapping**:
| Property | Token |
|---|---|
| Background image overlay | `bg-gradient-to-r from-atlas-primary/80 via-atlas-primary/40 to-transparent` |
| Pill badge bg | `bg-atlas-secondary-container` |
| Pill badge text | `text-atlas-on-secondary-container` |
| Headline | `text-white` (text on dark overlay) |
| Headline font | Plus Jakarta Sans (`font-atlas-headline`), `atlas-text-display` (72px on desktop) |
| Headline weight | `font-extrabold` (800) |
| Subtitle | `text-white/80` |
| Subtitle font | Work Sans (`font-atlas-body`), 18-20px |
| CTA primary | AtlasButton primary: `bg-atlas-secondary-container text-atlas-primary` (navy on orange) |
| CTA secondary | AtlasButton glass: `bg-white/10 backdrop-blur text-white border-white/30` |
| Min height | `min-h-[85vh]` on desktop (Stitch says 921px; using viewport-relative for flexibility) |
| Content max-width | `max-w-3xl` |
| Padding | `px-6 md:px-12`, `py-20` |
| Spacing between elements | `space-y-8` |

**Responsive behavior**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | H1 scales to `text-4xl` (36px). Subtitle `text-base`. CTAs stack vertically (`flex-col`). Min-height `min-h-[70vh]`. Image crops to center. |
| Tablet (768-1024px) | H1 `text-5xl`. CTAs remain side-by-side. Min-height `min-h-[80vh]`. |
| Desktop (> 1024px) | H1 `text-7xl` (atlas-text-display). Full layout per Stitch. Min-height `min-h-[85vh]`. |

**Animations**:
- None in v1 (scroll-triggered animations evaluated for Sprint 40 per SPEC-PROD-048 Out of Scope).
- Hover on CTAs: `active:scale-[0.98]` per AtlasButton built-in.
- `prefers-reduced-motion`: AtlasButton already handles this.

**Image strategy**:
- The Stitch export uses an AI-generated Chapada Diamantina image from lh3.googleusercontent.com. This CANNOT go to production.
- Recommended: High-quality landscape photo from Unsplash (search: "brazil landscape aerial sunset mountains"). Save to `/public/images/landing/hero.webp`.
- Use Next.js `<Image>` with `priority` (above the fold), `placeholder="blur"`, `blurDataURL` (10px base64 preview).
- Provide `alt` text: "Vista aerea de montanhas brasileiras ao por do sol com ceu dramatico em tons de laranja e roxo" (pt-BR) / English equivalent via i18n.
- Fallback: If image fails to load, the gradient overlay on `atlas-primary` background ensures content remains readable.

**Content notes**:
- The Stitch subtitle is in English ("Atlas is the seasoned travel companion..."). This is a Stitch error. The production text must be in Portuguese for pt-BR locale. Use i18n key `landing.hero.subtitle`.
- CTA "Comece Sua Viagem Agora" links to `/auth/register` (non-authenticated) or `/expeditions` (authenticated). Use server-side session check.
- CTA "Como Funciona" scrolls to the 8 Phases section. Use `scrollIntoView({ behavior: 'smooth' })` with `id="fases"` anchor.

---

### Section 1.3: 8 Phases Section

**Visual description**: Light background section with centered header and 4x2 grid of cards. Each card has a Material icon in amber, a phase name heading, and a brief description. Cards have subtle lift on hover.

**Atlas components used**:
- AtlasCard variant="base" — each phase card.
- AtlasBadge variant="status" color="info" — for "Em Breve" badge on Phases 7 and 8.

**New compositions needed**:
- `PhaseFeatureCard` — composition wrapping AtlasCard with icon slot, title, description, and optional badge. Not a new library component; just a composition in the landing page.

**Token mapping**:
| Property | Token |
|---|---|
| Section background | `bg-atlas-surface` |
| Section padding | `py-24` (96px) |
| Section max-width | `max-w-screen-2xl mx-auto px-6` |
| Header H2 | `text-atlas-primary`, Plus Jakarta Sans, `atlas-text-h2` (36px), `font-bold` |
| Header subtitle | `text-atlas-on-surface-variant`, Work Sans |
| Card background | `bg-atlas-surface-container-lowest` (white) |
| Card border radius | `rounded-atlas-xl` (16px) — Stitch uses `rounded-xl` on these cards |
| Card shadow | `shadow-atlas-sm` |
| Card padding | `p-8` (32px) |
| Icon color | `text-atlas-secondary` (#904d00) |
| Icon size | `text-4xl` (40px) — this is the Material Symbol font size |
| Card title | `text-atlas-primary`, `atlas-text-h4` (18px), `font-bold` |
| Card description | `text-atlas-on-surface-variant`, `text-sm` (14px) |
| Card hover | `hover:translate-y-[-4px]` with `atlas-transition-base` (200ms) |

**Icon mapping** (Material Symbols Outlined):
| Phase | Icon | Name |
|---|---|---|
| 1. A Inspiracao | `auto_awesome` | Sparkle/magic wand |
| 2. O Perfil | `person_pin` | Person with location |
| 3. O Preparo | `task_alt` | Checkmark circle |
| 4. A Logistica | `map` | Map |
| 5. Guia do Destino | `explore` | Compass |
| 6. Roteiro | `calendar_today` | Calendar |
| 7. Assistencia | `support_agent` | Headset agent |
| 8. Memorias | `photo_library` | Photo album |

**Important**: Material Symbols requires either `@material-symbols/font-600` package or inline SVG equivalents. The Stitch uses Google Fonts CDN which is NOT acceptable in production. Recommend using Lucide icons as mapping or the `@material-symbols/font-600` npm package (tech-lead decision).

**Responsive behavior**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | 1-column grid. Cards stack vertically. |
| Tablet (768-1024px) | 2-column grid. |
| Desktop (> 1024px) | 4-column grid (4x2 layout). |

**Animations**:
- Card hover lift: `transform: translateY(-4px)` with `transition-transform duration-200`.
- `prefers-reduced-motion`: `motion-reduce:hover:translate-y-0` — disable lift.

**Image strategy**: No images. Icons only (Material Symbols or Lucide SVG).

**"Em Breve" treatment for Phases 7 and 8**:
- Overlay the card with `opacity-60` to visually communicate unavailability.
- Add `AtlasBadge variant="status" color="info"` with text "Em Breve" positioned at top-right of card.
- Card does NOT have hover lift effect.
- Card is NOT wrapped in a link.
- `aria-disabled="true"` on the card wrapper (informational; these are not interactive elements since no phase card links anywhere in v1).

---

### Section 1.4: AI Assistant Section

**Visual description**: Dark navy section with two-column layout. Left: heading, description, feature checklist with teal checkmarks, inline CTA link. Right: glass-morphism container with a phone/app mockup image, and a floating card with an example AI prompt.

**Atlas components used**:
- AtlasCard variant="dark" — the floating prompt card uses similar dark-on-orange styling.
- AtlasButton variant="ghost" or inline link — "Explorar tecnologia AI" CTA.

**New compositions needed**:
- `AiShowcaseSection` — layout composition only.
- `GlassMockupFrame` — `bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl` container for the mockup image.
- `FloatingPromptCard` — positioned absolutely over the mockup. `bg-atlas-secondary-container p-6 rounded-2xl shadow-xl`. Contains example AI prompt text.

**Token mapping**:
| Property | Token |
|---|---|
| Section background | `bg-atlas-primary-container` (#1a2332) |
| Section padding | `py-24`, `px-6` |
| H2 | `text-white`, Plus Jakarta Sans, `atlas-text-h1` (48px), `font-bold` |
| Description text | `text-atlas-primary-fixed-dim` (#bec7db), 18px |
| Checklist icon | `text-atlas-secondary` (#904d00) — the `check_circle` icons |
| Checklist text | `text-white/90` |
| CTA link text | `text-atlas-secondary-fixed-dim` (#ffb77d), `font-bold` |
| CTA link arrow | `text-atlas-secondary-fixed-dim` |
| Glass frame bg | `bg-white/5` with `backdrop-blur-2xl` |
| Glass frame border | `border border-white/10` |
| Glass frame radius | `rounded-3xl` (24px) |
| Floating card bg | `bg-atlas-secondary-container` (#fe932c) |
| Floating card text | `text-atlas-primary` (#040d1b), `font-bold`, `text-sm` |
| Floating card radius | `rounded-2xl` (16px) |

**Responsive behavior**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Single column. Text block first, mockup below. Floating card repositioned below mockup (not overlapping). |
| Tablet (768-1024px) | Single column (same as mobile — the mockup needs width). |
| Desktop (> 1024px) | Two columns: `flex-1` each. Text left, mockup right. Floating card overlaps mockup at `absolute -bottom-6 -left-6`. |

**Animations**:
- CTA link: `hover:gap-4` (arrow moves right on hover) with `transition-all`.
- `prefers-reduced-motion`: `motion-reduce:hover:gap-2` — keep gap static.

**Image strategy**:
- The mockup image (phone with AI app interface) is AI-generated. Replace with:
  - Option A (recommended): SVG illustration of a stylized phone showing an Atlas-branded screen. Create as inline SVG in `/public/images/landing/ai-mockup.svg`.
  - Option B: Screenshot of the actual Atlas app on a phone frame. More effort but higher fidelity.
- The floating prompt card uses no image — it is text only.

---

### Section 1.5: Gamification Section

**Visual description**: Light background section. Header row with H2 + description on the left and a user level pill on the right. Below: 3 badge showcase cards, each with a circular icon container with glow effect, badge name, and description.

**Atlas components used**:
- AtlasCard variant="interactive" — the badge cards have hover effects.
- AtlasBadge variant="rank" — for the "Nivel 12 - Explorador Nato" pill in the header.

**New compositions needed**:
- `BadgeShowcaseCard` — composition wrapping AtlasCard with centered layout, circular icon with glow, title, description.
- `GlowCircle` — decorative element: `absolute inset-0 bg-amber-500/20 rounded-full blur-xl` behind the icon circle. This uses a non-token color (`amber-500/20`) for the glow — must be mapped to `atlas-secondary-container/20` instead.

**Token mapping**:
| Property | Token |
|---|---|
| Section background | `bg-atlas-surface` |
| H2 | `text-atlas-primary`, `atlas-text-h2`, `font-bold` |
| Description | `text-atlas-on-surface-variant` |
| Level pill bg | `bg-atlas-surface-container-high` |
| Level pill text | `text-atlas-primary font-bold` |
| Level rank bg | `bg-atlas-primary text-white` (inline badge within pill) |
| Badge card bg | `bg-atlas-surface-container-lowest` (white) |
| Badge card border | `border border-atlas-outline-variant/10` |
| Badge card radius | `rounded-2xl` (24px) = `rounded-atlas-2xl` |
| Badge card shadow | `shadow-atlas-sm` |
| Icon circle bg | `bg-atlas-primary-container` |
| Icon circle border (Explorador) | `border-2 border-atlas-secondary` |
| Icon circle border (Lendario) | `border-2 border-blue-400` -> map to `border-atlas-info` |
| Icon circle border (Guardiao) | `border-2 border-emerald-400` -> map to `border-atlas-success` |
| Glow (Explorador) | `bg-atlas-secondary-container/20 blur-xl` |
| Glow (Lendario) | `bg-atlas-info/20 blur-xl` |
| Glow (Guardiao) | `bg-atlas-success/20 blur-xl` |
| Badge title | `text-atlas-primary`, `atlas-text-h3`, `font-bold` |
| Badge description | `text-atlas-on-surface-variant`, `text-sm` |

**Responsive behavior**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Header stacks: H2+description above, level pill below. Badge cards: 1-column stack. |
| Tablet (768-1024px) | Header: H2 left, pill right (flex-row). Cards: still 1-column (3 cards are wide). |
| Desktop (> 1024px) | Header: H2 left, pill right. Cards: 3-column grid. |

**Animations**:
- Glow hover: `group-hover:bg-[color]/40` — glow intensifies on hover.
- `prefers-reduced-motion`: Color transitions are acceptable; no motion to disable.

**Image strategy**: No images. Icons are Material Symbols (`workspace_premium`, `military_tech`, `verified`) with `FILL 1` weight setting.

**UX decision — Conditional level pill**: The "Seu Nivel Atual" pill with rank must ONLY render when the visitor is authenticated AND has gamification data. For non-authenticated visitors, hide the pill entirely (do not show a placeholder). The section itself always shows — it is a marketing showcase.

---

### Section 1.6: Featured Destinations

**Visual description**: White background section with H2 + "Ver Todos" link header. Below: asymmetric grid with 3 destination cards: a large card (7/12 cols), a medium card (5/12 cols), and a full-width panoramic card (12/12 cols). Each card has a background image, gradient overlay from bottom, category pill badge, destination name, and description.

**Atlas components used**:
- AtlasBadge (custom pill variant) — category badges ("CULTURA & PRAIA", "ECOTURISMO", "FAUNA SILVESTRE") with `bg-atlas-secondary-container text-atlas-on-secondary-container`.
- AtlasButton variant="icon-only" — the navigation arrow on the Pantanal card.

**New compositions needed**:
- `DestinationCard` — image card with overlay, badge, title, description. Accepts size (large/medium/panoramic) to control column span and height.
- `AsymmetricGrid` — CSS Grid with 12-column template and `gap-6`.

**Token mapping**:
| Property | Token |
|---|---|
| Section background | `bg-atlas-surface-container-lowest` (white) |
| Section padding | `py-24`, `px-6` |
| H2 | `text-atlas-primary`, `atlas-text-h2`, `font-bold` |
| "Ver Todos" link | `text-atlas-secondary font-bold hover:underline underline-offset-4` |
| Card border radius | `rounded-3xl` = `rounded-atlas-2xl` (24px) |
| Image overlay (large/side) | `bg-gradient-to-t from-atlas-primary via-transparent to-transparent opacity-80` |
| Image overlay (panoramic) | `bg-gradient-to-t from-atlas-primary/80 via-atlas-primary/20 to-transparent` |
| Category badge | `bg-atlas-secondary-container text-atlas-on-secondary-container text-xs font-bold px-3 py-1 rounded-full` |
| Destination title (large) | `text-white`, `text-4xl`, `font-bold` |
| Destination title (medium) | `text-white`, `text-3xl`, `font-bold` |
| Destination description | `text-white/70` |
| Navigation button | `bg-white text-atlas-primary` hover `bg-atlas-secondary-container text-atlas-on-secondary-container` |
| Card heights | Large: `h-[500px]`, Medium: `h-[500px]`, Panoramic: `h-[400px]` |

**Responsive behavior**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | All cards full-width (12/12 cols). Heights reduce: Large `h-[350px]`, Medium `h-[300px]`, Panoramic `h-[250px]`. |
| Tablet (768-1024px) | Large: 12 cols. Medium: 6 cols (two side-by-side if there are two medium cards — here Bonito takes 6 cols). Panoramic: 12 cols. |
| Desktop (> 1024px) | Asymmetric: 7+5 top row, 12 bottom. Per Stitch. |

**Animations**:
- Image hover: `transform: scale(1.1)` with `atlas-transition-image` (700ms).
- `prefers-reduced-motion`: `motion-reduce:group-hover:scale-100` — disable zoom.

**Image strategy**:
- Rio de Janeiro: Unsplash search "christ the redeemer rio de janeiro aerial". Save as `/public/images/landing/rio.webp`.
- Bonito: Unsplash search "bonito mato grosso do sul crystal water". Save as `/public/images/landing/bonito.webp`.
- Pantanal: Unsplash search "pantanal wetlands sunset brazil". Save as `/public/images/landing/pantanal.webp`.
- All images: Next.js `<Image>` with `loading="lazy"`, `placeholder="blur"`, `sizes` attribute for responsive loading.
- Alt text must be descriptive and in the active locale (i18n keys).

---

### Section 1.7: Footer

**Visual description**: Dark navy footer with 4-column grid. Column 1: logo + tagline. Column 2: "Explorar" links. Column 3: "Empresa" links. Column 4: "Novidades" newsletter input. Bottom bar: copyright.

**Atlas components used**:
- AtlasInput — for the newsletter email field (simplified, no label visible — uses placeholder only).
- AtlasButton variant="primary" size="sm" — send button with icon.

**New compositions needed**:
- `FooterV2` — layout composition. This is a standalone component since the footer is shared across multiple pages.

**Token mapping**:
| Property | Token |
|---|---|
| Background | `bg-atlas-primary` (#040d1b) — note: Stitch uses `bg-slate-900` which must be mapped to `atlas-primary` |
| Border top | `border-t border-atlas-primary-container` (#1a2332) |
| Logo text | `text-white font-black text-xl` |
| Tagline | `text-atlas-on-primary-container` (#818a9d), `text-sm` |
| Column headings | `text-white font-bold` |
| Link text | `text-atlas-on-primary-container` hover `text-white` |
| Newsletter input bg | `bg-white/10 border-none rounded-lg text-white` |
| Newsletter input focus | `focus:ring-2 focus:ring-atlas-focus-ring` (amber #fe932c) |
| Newsletter button | `bg-atlas-secondary-container text-atlas-primary` (amber, navy text) |
| Copyright text | `text-atlas-on-primary-container/60`, `text-sm` |
| Copyright year | Dynamic: `new Date().getFullYear()` |

**Responsive behavior**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | 1-column stack. All columns stack vertically. |
| Tablet (768-1024px) | 2x2 grid. |
| Desktop (> 1024px) | 4-column grid. |

**Animations**: None. Footer is static.

**Image strategy**: None. Text-only footer.

**UX decision — Newsletter input**: Per SPEC-PROD-048, the newsletter email is ornamental in v1 (no backend integration). The form should submit with a success toast ("Inscricao registrada! Em breve voce recebera novidades.") without actually sending data. The button should show a loading state briefly (500ms simulated delay) then the toast. This prevents user confusion.

**Accessibility note for newsletter input**: Even though AtlasInput requires a `label` prop, the footer email field in the Stitch export has no visible label. Use `aria-label="Seu email para newsletter"` as a workaround. Alternatively, the label can be rendered as `sr-only`. I recommend the sr-only approach to maintain AtlasInput's required label prop contract.

---

## SECTION 2: Login Page V2 — Split-Screen Design

### 2.1 Overall Layout

```
+----------------------------------+--------------------+
|                                  |                    |
|     LEFT PANEL (60%)             |  RIGHT PANEL (40%) |
|     Brand / Atmosphere           |  Login Form        |
|     bg: atlas-primary            |  bg: white         |
|                                  |                    |
|     Desktop + Tablet >= 1024px   |  All viewports     |
|                                  |                    |
+----------------------------------+--------------------+
```

- `<main class="flex min-h-screen">`
- Left panel: `hidden lg:flex w-[60%]`
- Right panel: `w-full lg:w-[40%]`
- Body: `overflow-hidden` (no page-level scroll — form panel scrolls internally via `overflow-y-auto`)

---

### 2.2 Left Panel (60%) — Brand Panel

**Purpose**: Create an emotional, premium-feeling branded space that reinforces trust and the Atlas identity. This panel is purely decorative — it displays no functional content.

**Background and effects**:
- Base: `bg-atlas-primary` (#040d1b)
- Topographic pattern: SVG pattern watermark via CSS `background-image`, `opacity-40`. Extract the inline SVG data URI from the Stitch export to `/public/images/topo-pattern.svg` and reference as `background-image: url('/images/topo-pattern.svg')`.
- Ambient glow: Absolutely positioned `div`, `w-[500px] h-[500px]`, centered in panel (`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`), `bg-[#1c9a8e] blur-[140px] opacity-20 rounded-full`. The color `#1c9a8e` is `atlas-on-tertiary-container`. Use: `bg-atlas-on-tertiary-container blur-[140px] opacity-20`.

**Logo block** (centered, z-10):
- Row: icon + "Atlas" text, `gap-4`, `mb-6`
- Icon container: `w-16 h-16`, `bg-gradient-to-br from-atlas-secondary-container to-orange-400` — note: `orange-400` is NOT a token. Map to `from-atlas-secondary-container to-atlas-secondary-fixed-dim` (#ffb77d) for a similar warm gradient.
- Icon container radius: `rounded-xl`, `shadow-lg shadow-atlas-primary/50`
- Icon: `explore` (filled) — Material Symbols with FILL=1. Size `text-4xl`, color `text-atlas-primary`.
- "Atlas" text: `font-atlas-headline text-6xl font-black text-white tracking-tighter`
- Tagline: `font-atlas-headline text-xl text-atlas-on-primary-container max-w-xs text-center leading-relaxed` — "Do sonho ao destino, com inteligencia."

**Floating "Proxima Viagem" card** (decorative, hardcoded):
- Position: `absolute bottom-32 left-1/2 -translate-x-1/2 translate-y-12 rotate-[-4deg] z-20`
- Container: `bg-atlas-primary-container/80 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-2xl w-72`
- Header row: left = overline label "PROXIMA VIAGEM" (`text-[10px] text-atlas-on-primary-container uppercase tracking-widest font-bold`) + route "Rio de Janeiro -> Lisboa" (`text-white font-atlas-headline font-semibold text-sm`). Right = circle with airplane icon.
- Progress: "12 dias restantes" and "85% pronto" labels (`text-[11px] text-atlas-on-primary-container`)
- Progress bar: `w-full h-1.5 bg-white/10 rounded-full`. Fill: `bg-atlas-secondary-container w-[85%] rounded-full shadow-[0_0_10px_rgba(254,147,44,0.5)]` (amber glow on progress).

**Important**: This card displays HARDCODED mock data. It must NOT read from any API or session. Its purpose is purely visual — to suggest what the product looks like when you are actively planning.

**Decorative image** (top-right corner):
- Position: `absolute top-10 right-10 opacity-20 grayscale`
- `w-48 h-48 rounded-2xl object-cover -rotate-12 border border-white/20`
- Replace Stitch AI image with a mountain/landscape from `/public/images/login/decorative-mountain.webp` (Unsplash, grayscale applied via CSS `grayscale`).

**Responsive behavior**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 1024px) | Entire left panel is `hidden`. Form occupies 100% width. |
| Desktop (>= 1024px) | `flex w-[60%]`. Full brand experience. |

---

### 2.3 Right Panel (40%) — Login Form

**Purpose**: Efficient, focused login experience with zero distraction.

**Layout**:
- Container: `w-full lg:w-[40%] bg-white flex flex-col px-8 md:px-20 py-12 justify-center relative overflow-y-auto`
- Form max-width: `max-w-md w-full mx-auto`

**Mobile header (visible only < 1024px)**:
- `lg:hidden flex items-center gap-2 mb-12`
- Icon: `explore` filled in `text-atlas-secondary-container text-3xl`
- Title: `font-atlas-headline text-2xl font-black text-atlas-primary` — "Atlas"

**Welcome block**:
- `mb-10`
- H2: `font-atlas-headline text-[28px] font-bold text-atlas-primary mb-2` — "Bem-vindo de volta"
- Subtitle: `text-atlas-on-surface-variant text-base` — "Entre na sua conta para continuar sua expedicao"

**Email field**:
- Component: `AtlasInput type="email" label="E-mail" placeholder="seu@email.com" leftIcon={<MailIcon />}`
- The Stitch shows an icon that changes color on focus (`group-focus-within:text-on-tertiary-container`). The current AtlasInput handles leftIcon as a static muted element. To match Stitch: either enhance AtlasInput to accept `focusIconColor` prop, or accept the current behavior (icon stays muted). **Decision**: Accept current behavior for v1. The icon color change is a polish item — the focus ring on the input itself is the primary focus indicator.

**Password field**:
- Component: `AtlasInput type="password" label="Senha" placeholder="••••••••" leftIcon={<LockIcon />}`
- The label row has "Esqueceu a senha?" link aligned right. AtlasInput does not support a secondary element in the label row. **Decision**: Render the password field with a custom wrapper: a `<div>` containing the label + link on the same row, then the AtlasInput below. Pass `label` as a hidden sr-only (or override with custom label rendering). See implementation note below.

**Password label row implementation approach**:
```
<div class="flex justify-between items-center mb-1.5">
  <label for="password" class="text-sm font-medium text-atlas-on-surface-variant">Senha</label>
  <a href="/auth/forgot-password" class="text-sm font-semibold text-atlas-on-tertiary-container hover:underline">
    Esqueceu a senha?
  </a>
</div>
<AtlasInput type="password" id="password" label="" {/* label rendered above manually */} ... />
```
This is a pragmatic composition. AtlasInput's label prop can be passed as empty string with the external label handling `htmlFor`. Alternatively, enhance AtlasInput to accept `labelExtra` slot. **Decision for v1**: External label wrapper approach. Document this pattern for the team.

**"Lembrar de mim" checkbox**:
- `<input type="checkbox" id="remember">` with custom styling.
- Stitch: `w-5 h-5 rounded border-atlas-outline-variant text-atlas-secondary-container focus:ring-atlas-secondary-container`
- No AtlasCheckbox exists in the component library. Compose with native `<input type="checkbox">` + Tailwind styling.
- Token: selected state uses `accent-atlas-secondary-container` (or `[&:checked]:bg-atlas-secondary-container`).
- Touch target: The checkbox itself is 20px but the label acts as the click target. Ensure `<label for="remember">` wraps or is associated. Combined target area exceeds 44px.

**Submit CTA**:
- Component: `AtlasButton variant="primary" size="lg" fullWidth type="submit"`
- Content: "Entrar" + rightIcon `arrow_forward`
- Loading state: AtlasButton's built-in spinner. Text remains visible per SPEC-PROD-049 AC-013. **Correction**: AtlasButton replaces children with Spinner when loading. The SPEC-PROD-049 says "texto mantido". This is a gap — AtlasButton hides children during loading. **Decision**: For v1, accept the existing AtlasButton behavior (spinner replaces children). The user sees the spinner which is clear feedback. If PO insists on text+spinner, file a follow-up to add `loadingText` prop to AtlasButton.

**Divider**:
- `<div>` with absolute positioned `border-t border-atlas-outline-variant/30` and centered "ou" text with `bg-white` background knockout.
- Text: `text-atlas-outline font-medium text-sm`

**Social login buttons**:
- Layout: `grid grid-cols-2 gap-4`
- Google button: `AtlasButton variant="secondary"` with Google logo (inline SVG, not external image).
- GitHub button: `AtlasButton variant="secondary"` with GitHub logo (inline SVG).
- Conditional rendering: Google shown only if `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. GitHub shown only if `process.env.NEXT_PUBLIC_GITHUB_ID` is set.
- If only one provider is configured: single button, `col-span-2` (full width).
- If no providers: hide divider AND social buttons section entirely.

**"Criar conta" link**:
- `mt-10 text-center text-sm text-atlas-on-surface-variant`
- Link text: `text-atlas-on-tertiary-container font-bold hover:underline` — "Criar conta gratis"
- Links to `/auth/register`

**Legal text**:
- `mt-16 text-center`
- `text-[11px] text-atlas-outline leading-relaxed max-w-xs mx-auto`
- Links to `/terms` and `/privacy`: `text-atlas-on-tertiary-container font-medium hover:underline`

---

### 2.4 Focus Color Decision

**The question**: The Stitch export uses `atlas-on-tertiary-container` (#1c9a8e — teal) for input focus borders, link colors, and interactive accents on the login page. Meanwhile, the AtlasInput component uses `atlas-focus-ring` (#fe932c — amber/orange) for keyboard focus rings, per the UX Parecer. Should the login form use teal or amber for focus?

**Decision: Dual-purpose approach**:

1. **Keyboard focus ring** (`:focus-visible:ring-*`): Remains `atlas-focus-ring` (#fe932c amber). This is the WCAG-compliant keyboard focus indicator and MUST be consistent across all Atlas components. Non-negotiable.

2. **Input border on focus** (`:focus:border-*`): The Stitch intentionally uses teal (#1c9a8e) for the border color change when an input is focused. This is a visual affordance (not the accessibility focus ring). The current AtlasInput uses `border-atlas-outline` on focus. **For the Login V2**: override the input border focus color to `border-atlas-on-tertiary-container` (#1c9a8e) via className prop. This creates the teal border the Stitch shows while preserving the amber ring for keyboard navigation.

3. **Link colors**: Use `text-atlas-on-tertiary-container` for "Esqueceu a senha?", "Criar conta gratis", "Termos de Uso", "Politica de Privacidade" links. This is consistent with the Stitch and creates a secondary interactive color distinct from the primary CTA (orange).

**Rationale**: The teal provides a calmer, more sophisticated feel for the login form — appropriate for a focused, task-oriented screen. The amber focus ring remains as the universal keyboard focus indicator. Two different mechanisms serving two different purposes. This pattern is documented here for the team.

**Contrast check**: `#1c9a8e` (teal) on white (#ffffff) = 3.5:1. This passes WCAG AA for UI components (3:1 minimum) but does NOT pass for text (4.5:1). The border use is a UI component use (passes). The link text use is a text use — **#1c9a8e fails for small text**. For link text, use `atlas-on-tertiary-fixed-variant` (#005049) instead, which is 8.2:1 on white. **Final decision**:
- Border on focus: `#1c9a8e` (passes as UI component)
- Link text: `#005049` (`atlas-on-tertiary-fixed-variant`) for WCAG AA compliance on small text
- Keyboard ring: `#fe932c` (unchanged)

---

### 2.5 Responsive Collapse

| Breakpoint | Left Panel | Right Panel |
|---|---|---|
| Mobile (< 768px) | Hidden (`hidden`) | 100% width. Mobile header with Atlas logo shown. Padding `px-8 py-12`. |
| Tablet (768-1024px) | Hidden (`hidden`) | 100% width. Mobile header shown. Padding `px-20 py-12`. |
| Desktop (>= 1024px) | Visible (`lg:flex w-[60%]`) | 40% width (`lg:w-[40%]`). Mobile header hidden. |

**Note**: The SPEC-PROD-049 mentions "Tablet: 50/50" but the Stitch uses `lg:flex` which is >= 1024px. There is no tablet breakpoint with visible left panel in the Stitch export. **Decision**: Follow the Stitch export. Left panel only appears at `lg` (>= 1024px). On tablets (768-1024px), the form takes full width with the mobile header — this is a better UX for tablets because the brand panel would be too narrow to look good at 50%.

---

## SECTION 3: Sprint 38 Carryover Fixes

### FIX-001: AtlasChip aria-pressed removal

**Issue**: `aria-pressed` and `aria-checked` are both present on AtlasChip in selectable mode. For `role="checkbox"`, only `aria-checked` is appropriate.

**Exact change needed in `src/components/ui/AtlasChip.tsx`**:
- Locate the line where `aria-pressed` is set on the selectable chip element.
- Remove the `aria-pressed` attribute entirely.
- Keep `aria-checked={isSelected}` and `role="checkbox"`.
- Update corresponding test expectations if they assert `aria-pressed`.

**Severity**: Low. Assistive technology may announce both states redundantly but it does not block functionality.

---

### FIX-002: AtlasPhaseProgress wizard circle 40px on mobile

**Issue**: Wizard circle segments are `size-10` (40px) on mobile, below the 44px minimum touch target.

**Exact change needed in `src/components/ui/AtlasPhaseProgress.tsx`**:
- Find the circle element that uses `size-10 md:size-11` (or equivalent).
- Change to `size-11` (44px) on all breakpoints, or add `min-w-[44px] min-h-[44px]` to the clickable button wrapper.
- If the circles become visually too large on small screens, keep `size-10` for the visual circle but ensure the `<button>` wrapper has `min-w-[44px] min-h-[44px]` with transparent padding — the touch target is what matters, not the visual circle size.

**Severity**: Low. Practical impact is minimal given the spacing between segments, but WCAG 2.5.8 (Target Size) recommends 44px.

---

### FIX-003: atlas-glow-primary shadow token

**Issue**: AtlasButton primary variant was specified with "shadow-md + glow amber" but the glow was not implemented.

**Exact CSS value to add in `globals.css`** (alongside existing shadows):
```
--shadow-atlas-glow-primary: 0 0 12px rgba(254, 147, 44, 0.3);
```

This token already exists as `atlas-glow-primary` in the validation report with value `0 0 12px rgba(4, 13, 27, 0.2)`. The issue is that the PRIMARY button should have an AMBER glow (not a navy glow). The `atlas-glow-amber` token (`0 0 12px rgba(254, 147, 44, 0.4)`) already exists and is the correct one to use.

**Exact change in AtlasButton.tsx**:
- In the `primary` variant, add `shadow-atlas-glow-amber` alongside `shadow-atlas-md`.
- Result: `"bg-atlas-secondary-container text-atlas-primary font-bold shadow-atlas-md shadow-atlas-glow-amber hover:opacity-90"`

**Severity**: Low. Aesthetic enhancement only.

---

### FIX-004: ESLint cn()/cva() detection gap

**Issue**: The `no-raw-tailwind-colors` ESLint rule does not detect raw color classes inside `cn()` or `cva()` function arguments.

**Recommended approach**: This is a known limitation of static string analysis. Two options:
1. **Accept the gap** (recommended for v1) — the 7 Atlas components are already migrated and use only atlas-* tokens. New components will be written with tokens from the start. The ESLint rule catches issues in JSX `className` which covers the majority of cases.
2. **Enhanced rule** (Sprint 40+) — parse AST to detect string literals inside `cn()` and `cva()` calls. Requires changing from regex-based to AST-based rule (use `CallExpression` visitor in ESLint).

**Decision**: Accept for v1. The existing rule provides sufficient guardrails. File a tech-debt ticket for AST-based enhancement.

---

## SECTION 4: Visual Fidelity Checklist

This checklist is the acceptance gate for implementation. Both the implementing developer and the UX Designer must sign off on each item before the PR is approved.

### Landing Page — Visual Fidelity Checklist

#### Navigation Header
- [ ] Sticky top, frosted glass effect (`backdrop-blur-xl`)
- [ ] "Atlas" wordmark: Plus Jakarta Sans, font-bold, `text-atlas-primary`
- [ ] Active link underline: `border-b-2 border-atlas-secondary-container`
- [ ] Non-authenticated state: "Entrar" + "Comece Agora" CTAs (NOT avatar/icons)
- [ ] Mobile: hamburger menu (nav links hidden)
- [ ] Height: 64px (h-16)

#### Hero Section
- [ ] Background: landscape photo with `bg-gradient-to-r from-atlas-primary/80 via-atlas-primary/40 to-transparent` overlay
- [ ] Pill badge: `bg-atlas-secondary-container text-atlas-on-secondary-container` rounded-full uppercase
- [ ] Headline: Plus Jakarta Sans, font-extrabold (800), white, 72px desktop / 36px mobile
- [ ] Subtitle: Work Sans, `text-white/80`, 18-20px
- [ ] CTA primary: AtlasButton variant="primary" size="lg" — navy text on orange bg, NOT white on orange
- [ ] CTA secondary: AtlasButton variant="glass" size="lg" — `bg-white/10 backdrop-blur text-white`
- [ ] Min height: ~85vh on desktop
- [ ] Hero image: Next.js Image with `priority`, `placeholder="blur"`, descriptive alt text
- [ ] Mobile: headline 36px, CTAs stack vertically, min-height 70vh
- [ ] CTA "Comece Sua Viagem Agora" navigates to `/auth/register` (non-auth) or `/expeditions` (auth)
- [ ] CTA "Como Funciona" smooth-scrolls to `#fases`

#### 8 Phases Section
- [ ] `id="fases"` attribute on section element (scroll anchor target)
- [ ] Background: `bg-atlas-surface`
- [ ] H2: Plus Jakarta Sans, `text-atlas-primary`, 36px, centered
- [ ] Grid: 4 cols desktop, 2 cols tablet, 1 col mobile
- [ ] Cards: `bg-atlas-surface-container-lowest`, `rounded-atlas-xl`, `shadow-atlas-sm`, `p-8`
- [ ] Icons: `text-atlas-secondary` (amber/brown), 40px
- [ ] Card hover: `translateY(-4px)` with 200ms transition
- [ ] `prefers-reduced-motion`: hover lift disabled
- [ ] Phases 7-8: `opacity-60` + AtlasBadge "Em Breve", no hover effect, no link
- [ ] 8 correct icon-name pairs (auto_awesome, person_pin, task_alt, map, explore, calendar_today, support_agent, photo_library)

#### AI Assistant Section
- [ ] Background: `bg-atlas-primary-container` (#1a2332)
- [ ] H2: white, Plus Jakarta Sans, 48px, font-bold
- [ ] Description: `text-atlas-primary-fixed-dim` (#bec7db)
- [ ] Checklist items: `check_circle` icon in `text-atlas-secondary`, text `text-white/90`
- [ ] CTA link: `text-atlas-secondary-fixed-dim` (#ffb77d)
- [ ] Glass mockup frame: `bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10`
- [ ] Floating prompt card: `bg-atlas-secondary-container`, navy text
- [ ] Mobile: single column, mockup below text
- [ ] Desktop: two columns, floating card overlaps mockup

#### Gamification Section
- [ ] Background: `bg-atlas-surface`
- [ ] H2: `text-atlas-primary`, 36px, font-bold
- [ ] Level pill: ONLY shown for authenticated users with gamification data
- [ ] 3 badge cards: white bg, `rounded-atlas-2xl`, `border-atlas-outline-variant/10`
- [ ] Each badge: circular icon container with colored glow effect
- [ ] Glow colors: amber (Explorador), blue/info (Lendario), green/success (Guardiao)
- [ ] Icon borders match glow theme (secondary, info, success tokens)
- [ ] Mobile: 1-column stack; Desktop: 3-column grid

#### Featured Destinations
- [ ] Background: `bg-atlas-surface-container-lowest` (white)
- [ ] H2 + "Ver Todos os Destinos" link in header row
- [ ] Asymmetric grid: 7+5 top row, 12 bottom (desktop)
- [ ] Cards: `rounded-3xl`, gradient overlay from bottom, category badge, title, description
- [ ] Image hover: `scale(1.1)` with 700ms transition
- [ ] `prefers-reduced-motion`: zoom disabled
- [ ] Images: Next.js Image, lazy-loaded, blur placeholder, descriptive alt text
- [ ] NO lh3.googleusercontent.com URLs in production code
- [ ] Mobile: all cards 12-col, reduced heights

#### Footer
- [ ] Background: `bg-atlas-primary` (#040d1b)
- [ ] Logo: white, Plus Jakarta Sans, font-black
- [ ] Links: `text-atlas-on-primary-container` hover `text-white`
- [ ] Newsletter input: `bg-white/10`, focus ring amber
- [ ] Newsletter submit: shows mock success toast (no backend)
- [ ] Copyright: dynamic year, `text-atlas-on-primary-container/60`
- [ ] 4-column desktop, 1-column mobile

---

### Login Page — Visual Fidelity Checklist

#### Left Panel (Desktop Only)
- [ ] `bg-atlas-primary` (#040d1b) base
- [ ] Topographic SVG pattern at `opacity-40`
- [ ] Teal ambient glow: `bg-atlas-on-tertiary-container blur-[140px] opacity-20`
- [ ] Logo icon: gradient `from-atlas-secondary-container to-atlas-secondary-fixed-dim`, `rounded-xl`, explore icon filled
- [ ] "Atlas" text: 60px, font-black, white, tracking-tighter
- [ ] Tagline: 20px, `text-atlas-on-primary-container`, centered
- [ ] Floating card: rotated -4deg, `bg-atlas-primary-container/80 backdrop-blur-xl`, hardcoded "Rio de Janeiro -> Lisboa" + "85% pronto"
- [ ] Progress bar: `bg-atlas-secondary-container` with amber glow shadow
- [ ] Decorative mountain image: grayscale, `opacity-20`, rotated -12deg, top-right corner
- [ ] Panel hidden below 1024px

#### Right Panel (Form)
- [ ] Background: white (`bg-atlas-surface-container-lowest` or `bg-white`)
- [ ] Mobile header: Atlas icon + "Atlas" text, visible only < 1024px
- [ ] H2 "Bem-vindo de volta": Plus Jakarta Sans, 28px, font-bold, `text-atlas-primary`
- [ ] Subtitle: `text-atlas-on-surface-variant`, 16px
- [ ] Email input: AtlasInput with mail icon left, `type="email"`, placeholder "seu@email.com"
- [ ] Password input: AtlasInput with lock icon left, `type="password"`, toggle visibility
- [ ] "Esqueceu a senha?" link: `text-atlas-on-tertiary-fixed-variant` (#005049), aligned right of password label
- [ ] "Lembrar de mim" checkbox: 20px, styled with `atlas-secondary-container` when checked
- [ ] Submit CTA: AtlasButton variant="primary" size="lg" fullWidth — "Entrar" + arrow icon
- [ ] Submit CTA: navy text on orange bg (7.5:1 contrast) — NOT white on orange
- [ ] Loading state: spinner visible during submission
- [ ] Divider: `border-atlas-outline-variant/30` with "ou" text
- [ ] Social buttons: 2-col grid, `AtlasButton variant="secondary"`, conditional on env vars
- [ ] If one provider only: full-width single button
- [ ] If no providers: divider + social section hidden entirely
- [ ] "Criar conta gratis" link: `text-atlas-on-tertiary-fixed-variant` (#005049), font-bold
- [ ] Legal text: 11px, `text-atlas-outline`, links to `/terms` and `/privacy`
- [ ] Keyboard focus ring: `atlas-focus-ring` (#fe932c) — amber, NOT teal
- [ ] Input border on focus: `border-atlas-on-tertiary-container` (#1c9a8e) — teal
- [ ] All touch targets >= 44px on mobile
- [ ] Form max-width: `max-w-md` centered

---

## SECTION 5: Image Strategy

### Summary Table

| Image Slot | Location | Stitch Source | Production Strategy | File Path |
|---|---|---|---|---|
| Hero landscape | Landing Hero | lh3 AI (Chapada Diamantina) | Unsplash landscape photo, `.webp`, 1920x1080 | `/public/images/landing/hero.webp` |
| AI mockup | Landing AI Section | lh3 AI (phone interface) | SVG illustration of phone frame OR app screenshot | `/public/images/landing/ai-mockup.svg` |
| Rio de Janeiro | Landing Destinations | lh3 AI (Christ the Redeemer) | Unsplash city photo, `.webp`, 1200x800 | `/public/images/landing/rio.webp` |
| Bonito | Landing Destinations | lh3 AI (crystal water) | Unsplash nature photo, `.webp`, 1200x800 | `/public/images/landing/bonito.webp` |
| Pantanal | Landing Destinations | lh3 AI (wetlands sunset) | Unsplash nature photo, `.webp`, 1200x800 | `/public/images/landing/pantanal.webp` |
| Login decorative mountain | Login left panel | lh3 AI (mountain peaks) | Unsplash mountain photo, `.webp`, 384x384 | `/public/images/login/decorative-mountain.webp` |
| Google logo | Login social button | lh3 AI (Google logo) | Inline SVG (official Google "G" logo path) | Inline in component |
| GitHub logo | Login social button | Inline SVG in Stitch | Keep Stitch inline SVG (already correct) | Inline in component |
| Topo pattern | Login left panel | Inline SVG data URI | Extract to file | `/public/images/topo-pattern.svg` |
| User avatar | Landing Nav (auth) | lh3 AI | Dynamic from session | N/A |
| Phase icons | Landing 8 Phases | Material Symbols CDN | `@material-symbols/font-600` npm package OR Lucide equivalents | npm dependency |
| Badge icons | Landing Gamification | Material Symbols CDN filled | Same as above with FILL=1 | npm dependency |

### Image Requirements

1. **Format**: All raster images in `.webp` format for optimal compression. Provide `.jpg` fallback only if Next.js Image component does not handle format negotiation (it does — `<Image>` serves `.webp` automatically when supported).
2. **Sizing**: Use `sizes` attribute on all `<Image>` components to enable responsive loading. Example: `sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 58vw"`.
3. **Lazy loading**: All images below the fold use `loading="lazy"`. The hero image uses `priority` (eager loading).
4. **Blur placeholder**: Generate base64 blur data URLs using `plaiceholder` or similar. Store in a constants file.
5. **Alt text**: All alt text via i18n keys. Two locales: pt-BR and en. Descriptive, not decorative ("Vista aerea de montanhas brasileiras" not "hero image").
6. **License**: All Unsplash images are under the Unsplash License (free for commercial use). Document the specific photo IDs and photographers in a `IMAGE-CREDITS.md` file.

---

## SECTION 6: Component Gap Analysis

### Elements in Stitch NOT covered by the 7 Atlas components

| Element | Stitch Location | Recommendation |
|---|---|---|
| **Pill Badge with background** | Hero "A Nova Era do Planejamento", Destination category badges | The current `AtlasBadge variant="category-overline"` has NO background — it is text-only. Create a `HeroPillBadge` inline composition: `<span class="inline-block py-1 px-3 rounded-full bg-atlas-secondary-container text-atlas-on-secondary-container text-xs font-bold uppercase tracking-widest">`. Do NOT create a new library component — this is a simple span. If this pattern recurs across multiple pages, promote to `AtlasBadge variant="pill"` in Sprint 40. |
| **Glass Morphism Container** | AI Section mockup frame, Login floating card | Composition using `bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10`. Create as a utility CSS class or inline Tailwind. Do NOT create a component — glass morphism is a styling pattern, not a behavior. |
| **Asymmetric Image Card** | Destinations section — cards with image bg, overlay, text | Create `DestinationCard` as a landing-page-level composition (`src/components/features/landing/DestinationCard.tsx`). Accepts: image src, alt, title, description, category, size (large/medium/panoramic), href. NOT a library component — this is page-specific. |
| **Topographic SVG Pattern** | Login left panel | CSS background-image. No component needed. |
| **Checkbox** | Login "Lembrar de mim" | No `AtlasCheckbox` exists. For v1, use native `<input type="checkbox">` with Tailwind styling. If checkboxes appear in more than 2 locations, create `AtlasCheckbox` in a future sprint. |
| **Divider with centered text** | Login "ou" divider | Simple HTML composition. `<div class="relative my-10"><div class="absolute inset-0 flex items-center"><div class="w-full border-t border-atlas-outline-variant/30"></div></div><div class="relative flex justify-center text-sm"><span class="px-4 bg-white text-atlas-outline font-medium">ou</span></div></div>`. No component needed. |
| **Newsletter Input (no visible label)** | Footer | Use `AtlasInput` with `label` rendered as `sr-only`. Pass className to override visual label display. |
| **Floating Decorative Card** | Login left panel "Proxima Viagem" | Composition-only. Hardcoded JSX within the login brand panel. Not reusable. |
| **Glow Circle** | Gamification badge cards | Decorative `div` with blur. Inline Tailwind: `absolute inset-0 bg-[token]/20 rounded-full blur-xl`. No component needed. |
| **Hamburger Menu** | Nav mobile | Need a mobile drawer/overlay menu component OR a simple toggle. Recommend using Radix `Dialog` or `Sheet` for the mobile nav menu. This is new functionality not in the Stitch export. **Decision**: Use a `<button>` that toggles a `<div>` with nav links. Simple state management, no new library dependency. |
| **Social Login Button with logo** | Login Google/GitHub | Use `AtlasButton variant="secondary"` with `leftIcon={<GoogleLogo />}`. The logos are inline SVGs. No new component needed — AtlasButton's leftIcon prop handles this. |

### Summary

- **New library components needed**: 0 (zero)
- **New page-level compositions needed**: 5 (`LandingNav`, `HeroSection`, `PhaseFeatureCard`, `DestinationCard`, `FooterV2`)
- **New inline patterns (no component)**: 4 (HeroPillBadge, GlassMorphism, Divider, GlowCircle)
- **Future component candidates**: `AtlasCheckbox` (if pattern recurs), `AtlasBadge variant="pill"` (if pill badges recur)

---

## Accessibility Summary

All WCAG 2.1 AA requirements from the Sprint 38 foundation carry forward:

- [ ] All interactive elements keyboard-navigable
- [ ] Focus ring: 2px `atlas-focus-ring` (#fe932c) with offset 2px on ALL interactive elements
- [ ] Color contrast >= 4.5:1 for text, >= 3:1 for UI components
- [ ] No information conveyed by color alone (Phases 7-8 "Em Breve" uses badge text, not just opacity)
- [ ] All images have descriptive alt text (via i18n)
- [ ] All form inputs have associated visible labels (login: email, password — both have labels)
- [ ] Error messages linked to fields via `aria-describedby` (login form errors)
- [ ] Touch targets >= 44px on mobile
- [ ] `prefers-reduced-motion`: all hover animations (lift, zoom, glow) disabled
- [ ] Landmark regions: `<header>`, `<main>`, `<footer>` structure on landing page
- [ ] Login form: `<form>` with proper `action`, `role` not needed (native `<form>` is sufficient)
- [ ] Login left panel: decorative content has `aria-hidden="true"` where appropriate (floating card, topo pattern, glow)
- [ ] Language attribute: `<html lang="pt-BR">` or `<html lang="en">` per locale

**New accessibility considerations for these pages**:
- Hero section images with overlay: ensure the image has a meaningful alt (not empty) since it contributes to the page's visual message
- Smooth scroll for "Como Funciona" CTA: ensure the target section (`#fases`) receives focus after scroll for keyboard users
- Social login buttons: include provider name in accessible label ("Entrar com Google", "Entrar com GitHub") not just "Google"
- Login floating card: `aria-hidden="true"` (decorative, hardcoded data)
- Newsletter submit: announce success via `aria-live="polite"` region (the toast)

---

## Open UX Questions

- [ ] **Q1**: Icon library decision — `@material-symbols/font-600` npm package or Lucide equivalents? Impacts bundle size and visual consistency with Stitch. Tech-lead/architect decision needed.
- [ ] **Q2**: Hero image — should we commission a custom photo or use Unsplash? Impacts brand uniqueness. PO decision.
- [ ] **Q3**: AI mockup — SVG illustration or actual app screenshot? SVG is lighter and brand-consistent; screenshot is more realistic. PO decision.
- [ ] **Q4**: AtlasButton loading state hides children text. SPEC-PROD-049 says "texto mantido". Is the current spinner-only behavior acceptable, or must we add a `loadingText` prop? PO/tech-lead decision.
- [ ] **Q5**: The Stitch export footer says "(C) 2024 Atlas Travel Planner". Should the copyright entity be "Atlas Travel Planner" or "Atlas Viagens" (as in the login footer)? PO decision on legal entity name.

---

## Patterns Used (from existing Atlas Design System)

| Pattern | Source | Usage |
|---|---|---|
| AtlasButton (7 variants) | `src/components/ui/AtlasButton.tsx` | Hero CTAs, footer send, login submit, social buttons |
| AtlasInput | `src/components/ui/AtlasInput.tsx` | Login email, login password, footer newsletter |
| AtlasCard (4 variants) | `src/components/ui/AtlasCard.tsx` | Phase cards (base), badge showcase cards (interactive) |
| AtlasBadge (7 variants) | `src/components/ui/AtlasBadge.tsx` | "Em Breve" status badges, gamification rank pill |
| AtlasPhaseProgress | `src/components/ui/AtlasPhaseProgress.tsx` | Not directly used on landing/login, but floating card references progress concept |
| DesignBranch | `src/components/ui/DesignBranch.tsx` | Feature flag gate: V1 vs V2 rendering |
| Design tokens (59 colors) | `globals.css` | Every element on both pages |
| Typography tokens (11 levels) | `globals.css` | display, h1, h2, h3, h4, body, small, caption |
| Shadow tokens (8 levels) | `globals.css` | Cards, buttons, glass containers |
| Transition tokens (5 levels) | `globals.css` | Hover effects, image zoom |

---

> APPROVED FOR ARCHITECT — Ready for technical specification.
>
> Pending open questions Q1-Q5 are non-blocking for architecture work. They affect implementation details (icon package choice, image sourcing, loading state text) but not structural decisions.
>
> Sprint 38 carryover fixes (FIX-001 through FIX-004) can be implemented as a separate PR at any point during Sprint 39.
