# SPEC-UX-042: Badge Showcase + Unlock Animation — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: Sprint 36
**Sprint**: 36
**Created**: 2026-03-22
**Last Updated**: 2026-03-22

---

## 1. Traveler Goal

View all available badges organized by category, understand what each badge requires, celebrate unlocked achievements, and feel motivated to earn the ones still locked.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Badges create a personal progression narrative; collection motivates exploration of app features |
| `@leisure-family` | Shared screen moment — showing achievements to family members adds social delight |
| `@business-traveler` | Quick scan of progress; values efficiency of categorized grid over scrolling list |
| `@bleisure` | Cross-category badges reward both planning depth and travel breadth |
| `@group-organizer` | "Viajante Frequente" and "Globetrotter" badges reward their heavy usage pattern |

## 3. User Flow

### 3.1 Happy Path — Viewing Badge Showcase

```
[User navigates to "Meu Atlas" (/atlas)]
    |
    v
[Page loads — badge showcase section visible below profile/map area]
    |
    v
[4 category sections render: Explorador, Perfeccionista, Aventureiro, Veterano]
    |
    v
[Each section shows its badges as cards in a grid]
    |
    v
[Unlocked badges: full color + date | Locked badges: grayscale + lock + progress text]
    |
    v
[User taps an unlocked badge]
    |
    v
[Detail modal opens: large icon, name, description, date earned]
    |
    v
[User closes modal (X, Escape, overlay click)]
```

### 3.2 Badge Unlock Moment (Real-Time)

```
[User completes an action that earns a badge (e.g., completes first expedition)]
    |
    v
[Backend awards badge, response includes badge data]
    |
    v
[CelebrationToast appears at top-center]
"Nova conquista: Primeira Viagem!"
[Confetti animation: 1200ms, gold particles]
[Toast auto-dismiss: 5 seconds]
    |
    v
[If user is on /atlas page: badge card animates from locked to unlocked]
[Glow border pulse (600ms), grayscale fades to full color (400ms)]
    |
    v
[If user is NOT on /atlas: toast only. Badge updates next time /atlas loads]
```

### 3.3 Reduced Motion Path

```
[Same trigger as 3.2]
    |
    v
[CelebrationToast appears instantly (no slide)]
"Nova conquista: Primeira Viagem!"
[No confetti — static gold glow ring around badge icon (200ms)]
[Toast auto-dismiss: 5 seconds]
    |
    v
[Badge card: instant state swap from locked to unlocked (no animation)]
```

### Error States

- **Failed to load badges**: Inline error within the section: "Nao foi possivel carregar suas conquistas. Tente novamente." with retry button. Rest of /atlas page loads normally.
- **Badge detail modal fails**: Should not happen (data is already loaded). If image fails: show emoji fallback.

### Edge Cases

- **New user (no badges)**: All 16 badges shown as locked. Encouraging empty-state text at top of section: "Sua colecao de conquistas comeca aqui! Complete fases e atividades para desbloquear badges."
- **All badges unlocked**: Celebratory header text: "Parabens! Voce conquistou todos os badges!" with gold accent.
- **Badge with progress (in-progress state)**: Some badges can show partial progress (e.g., "Viajante Frequente: 3/5 expedicoes"). These show a mini progress bar below the icon.

---

## 4. Screen Descriptions

### Screen 1: Badge Showcase Section (within /atlas)

**Purpose**: Display all 16 badges across 4 categories with clear visual distinction between locked, in-progress, and unlocked states.

**Layout**:
- Section title: "Suas Conquistas" (20px, bold, #1A202C)
- Subtitle: counter "X de 16 badges conquistados" (14px, #5C6B7A)
- 4 category subsections, each with:
  - Category header: emoji + category name (16px, semibold, #1A202C)
  - Badge grid below the header

**Badge categories and their badges** (from gamification.types.ts):

1. **Explorador** (compass emoji): primeira_viagem, viajante_frequente, globetrotter, marco_polo
2. **Perfeccionista** (target emoji): detalhista, planejador_nato, zero_pendencias, revisor
3. **Aventureiro** (mountain emoji): sem_fronteiras, em_familia, solo_explorer, poliglota, multicontinental
4. **Veterano** (star emoji): fiel, maratonista, fundador, aniversario

**Note**: Aventureiro has 5 badges; others have 4. Grid accommodates uneven counts.

**Badge Card — Unlocked**:
- Background: white (#FFFFFF)
- Border: 1px solid #E2E8F0, border-radius 12px
- Subtle glow: box-shadow with category accent color at 15% opacity
- Icon: 48px, full color (emoji or inline SVG)
- Name: 14px, bold, #1A202C
- Date: 12px, #94A3B8, format "Conquistado em DD MMM YYYY"
- Hover: shadow-md elevation, cursor pointer
- Focus: 2px solid #E8621A outline, offset 2px
- Click/tap: opens detail modal

**Badge Card — Locked**:
- Background: #F7F9FC (subtle gray)
- Border: 1px dashed #CBD5E1
- Icon: 48px, grayscale filter, opacity 0.4
- Lock overlay: small lock icon (16px) positioned bottom-right of the badge icon
- Name: 14px, #94A3B8 (muted)
- Progress text: 12px, #94A3B8, e.g., "3/5 expedicoes" or "Complete [action] para desbloquear"
- No hover effect, no pointer cursor
- Not interactive (no click handler)

**Badge Card — In Progress** (applicable to countable badges):
- Background: white (#FFFFFF)
- Border: 1px solid #E2E8F0
- Icon: 48px, partial opacity (0.7), slight color tint
- Mini progress bar below icon: 4px height, rounded, bg #E2E8F0, fill #2DB8A0
- Progress text: "3/5 expedicoes" (12px, #5C6B7A)
- Name: 14px, #5C6B7A
- Not interactive (no click handler — only unlocked badges are clickable)

**Empty State**: "Sua colecao de conquistas comeca aqui! Complete fases e atividades para desbloquear badges." with a subtle illustration of an empty trophy shelf (inline SVG).

**Loading State**: Skeleton grid — 4 sections with 4 skeleton cards each (pulse animation). Cards: rounded rectangle 120x140px with circle placeholder for icon.

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | 2-column grid per category. Badge cards: compact (icon 36px, name 12px). Category headers stack above grids. |
| Tablet (768-1024px) | 3-column grid per category. Standard card size. |
| Desktop (> 1024px) | 4-column grid per category (one badge per column in most categories). Max-width 1200px centered. |

---

### Screen 2: Badge Detail Modal

**Purpose**: Show full details of an unlocked badge — the name, what it means, and when the user earned it.

**Layout**:
- Modal overlay: rgba(0, 0, 0, 0.5)
- Card: centered, max-width 400px, border-radius 16px, bg white, padding 32px
- Close button (X): top-right, 44x44px touch target
- Content centered:
  - Badge icon: 64px, full color
  - Badge name: 20px, bold, #1A202C
  - Badge description: 14px, #5C6B7A, max 2 lines
  - Date earned: 14px, #94A3B8, "Conquistado em DD MMM YYYY"
  - Category tag: pill badge with category name and emoji (12px, muted)
- Footer: "Fechar" button (ghost, full-width on mobile)

**Interactive Elements**:
- Close (X): click/tap closes modal
- Overlay click: closes modal
- "Fechar" button: closes modal
- Escape: closes modal

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Card: full-width with 16px margin, slides up from bottom (bottom sheet style) |
| Tablet (768-1024px) | Card: centered, max-width 400px |
| Desktop (> 1024px) | Same as tablet |

---

### Screen 3: CelebrationToast (Unlock Moment)

**Purpose**: Celebrate the moment a badge is unlocked with a visually distinct, joyful notification.

**Layout**:
- Positioned top-center of viewport (not top-right like standard toasts — this is a celebration)
- Max-width 400px, border-radius 12px
- Background: gradient using category accent color (subtle, 5% to transparent)
- Border: 1px solid category accent at 20% opacity
- Content:
  - Badge icon (32px) + "Nova conquista!" (14px, bold) on first line
  - Badge name (16px, semibold, #1A202C) on second line
- Close (X): 44x44px, top-right
- Auto-dismiss: 5 seconds with progress bar (thin 3px bar at bottom of toast)
- Confetti: canvas overlay behind toast, gold particles, 1200ms duration, `aria-hidden="true"`

**Motion tokens**:

| Animation | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Toast entrance | 300ms | ease-out (slide-down from -20px) | Instant appear |
| Confetti | 1200ms | linear | Disabled — static gold glow ring (200ms) |
| Badge card unlock | 400ms | ease-out (grayscale to color) | Instant state swap |
| Glow border pulse | 600ms | ease-in-out | Disabled |
| Toast exit | 200ms | ease-in (fade-out) | Instant disappear |
| Progress bar | 5000ms | linear | Hidden (timeout-only dismiss) |

---

## 5. Interaction Patterns

- **Category sections**: Always expanded, not collapsible. All 4 categories visible at once to give a sense of the full collection.
- **Badge card hover (unlocked only)**: Elevation increase (shadow-sm to shadow-md), 150ms transition.
- **Badge card click (unlocked only)**: Opens detail modal.
- **Locked badge tap (mobile)**: No response. Not interactive.
- **Modal entrance**: Overlay fade-in 150ms + card scale from 0.95 (200ms ease-out). On mobile: slide-up from bottom (300ms).
- **Modal exit**: Fade-out 150ms. On mobile: slide-down 200ms.
- **Unlock animation (if user is on /atlas)**: Badge card transitions from locked to unlocked state — grayscale fades to color (400ms), border changes from dashed to solid, glow border pulses once (600ms).
- **Toast stacking**: If a level-up toast and badge toast both fire simultaneously, level-up takes priority. Badge toast queues and appears after level-up toast dismisses.

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA (minimum, non-negotiable)

### Keyboard Navigation
- [x] Unlocked badge cards are focusable via Tab (`tabindex="0"` or as buttons)
- [x] Locked and in-progress badge cards are NOT in the tab order (not interactive)
- [x] Tab order within section: left-to-right, top-to-bottom through unlocked badges
- [x] Enter/Space on unlocked badge opens detail modal
- [x] Detail modal has focus trap
- [x] Escape closes detail modal and returns focus to the badge card that triggered it
- [x] Focus indicator: 2px solid #E8621A, outline-offset 2px

### Screen Reader
- [x] Section heading: `<h2>` "Suas Conquistas"
- [x] Category headings: `<h3>` with category name
- [x] Unlocked badge: `aria-label="Badge [name], conquistado em [date]. Clique para detalhes."`
- [x] Locked badge: `aria-label="Badge [name], bloqueado. [How to unlock]."`
- [x] In-progress badge: `aria-label="Badge [name], em progresso: [X] de [Y]. [Action to complete]."`
- [x] Counter: "X de 16 badges conquistados" in a `<p>` with `aria-live="polite"` (updates on unlock)
- [x] Detail modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (badge name)
- [x] CelebrationToast: `role="alert"`, `aria-live="assertive"`
- [x] Confetti canvas and progress bar: `aria-hidden="true"`

### Color & Contrast
- [x] Badge name text (#1A202C on white): 16:1 (passes AAA)
- [x] Muted text (#94A3B8 on white): 3.3:1 — supplementary info only, paired with icon context. Not sole source of meaning.
- [x] Locked vs unlocked: differentiated by grayscale filter + lock icon + dashed border, not color alone
- [x] In-progress bar fill (#2DB8A0 on #E2E8F0): 2.6:1 for UI component — acceptable with text label providing the same info ("3/5")

### Motion
- [x] All animations respect `prefers-reduced-motion`
- [x] Confetti: disabled under reduced motion, replaced by static glow
- [x] Badge unlock: instant swap under reduced motion
- [x] Toast entrance/exit: instant under reduced motion

### Touch
- [x] Unlocked badge cards: minimum 44x44px (cards are larger than this by design)
- [x] Close (X) on modal: 44x44px
- [x] "Fechar" button: 44px height, full-width on mobile
- [x] Spacing between badge cards: minimum 12px gap

---

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `badges.title` | Suas Conquistas | Your Achievements |
| `badges.counter` | {count} de 16 badges conquistados | {count} of 16 badges earned |
| `badges.allUnlocked` | Parabens! Voce conquistou todos os badges! | Congratulations! You've earned all badges! |
| `badges.empty` | Sua colecao de conquistas comeca aqui! Complete fases e atividades para desbloquear badges. | Your achievement collection starts here! Complete phases and activities to unlock badges. |
| `badges.earnedOn` | Conquistado em {date} | Earned on {date} |
| `badges.locked` | Complete {requirement} para desbloquear | Complete {requirement} to unlock |
| `badges.inProgress` | {current} de {total} | {current} of {total} |
| `badges.close` | Fechar | Close |
| `badges.unlock.toast` | Nova conquista: {name}! | New achievement: {name}! |
| `badges.category.explorer` | Explorador | Explorer |
| `badges.category.perfectionist` | Perfeccionista | Perfectionist |
| `badges.category.adventurer` | Aventureiro | Adventurer |
| `badges.category.veteran` | Veterano | Veteran |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Load failure | Nao foi possivel carregar suas conquistas. Tente novamente. | Could not load your achievements. Please try again. |

### Tone of Voice
- Celebratory and encouraging. Badges are rewards, not metrics.
- Locked badges should inspire ("Complete X para desbloquear"), never shame ("Voce ainda nao fez X").
- Unlock moments are genuine celebrations. The confetti and toast should feel earned.

---

## 8. Constraints

- Badge definitions (16 badges, 4 categories) are sourced from `gamification.types.ts`. Do not hardcode badge names or descriptions in the UI.
- Badge icons use emoji (not custom SVGs) for v1, consistent with the existing GamificationBadge pattern.
- The CelebrationToast pattern was defined in SPEC-UX-GAMIFICATION (section 4.8). This spec extends it with badge-specific content but reuses the same component.
- Badge progress data (e.g., 3/5 expeditions for "Viajante Frequente") must be computed server-side and included in the badge API response.
- The /atlas page already has sections for map and transaction history (SPEC-UX-024, SPEC-UX-GAMIFICATION 4.4). Badge showcase sits between profile and transaction history.

---

## 9. Prototype

- [ ] Prototype required: Yes (after spec approval)
- **Location**: `docs/prototypes/badge-showcase.html`
- **Scope**: Badge grid with all 3 states (unlocked, locked, in-progress), detail modal, unlock animation
- **Status**: Deferred to post-approval

---

## 10. Open Questions

- [ ] **Badge icon format**: Should badges use emoji (current plan) or small inline SVGs for more visual distinction? Emoji rendering varies across OS. **Awaits: product-owner**
- [ ] **Progress tracking granularity**: Which badges support in-progress state with a progress bar? Only count-based badges (viajante_frequente, globetrotter) or also boolean badges with partial criteria? **Awaits: architect**
- [ ] **Badge category accent colors**: Each category could have a subtle accent color for its section header and glow borders. Propose: Explorador=#3B82F6 (blue), Perfeccionista=#8B5CF6 (purple), Aventureiro=#F59E0B (amber), Veterano=#10B981 (green). **Awaits: product-owner approval**
- [ ] **Confetti performance**: Canvas-based confetti may lag on low-end mobile devices. CSS-only confetti (fewer particles) or canvas with device capability detection? **Awaits: architect**

---

## 11. Acceptance Criteria

- [ ] **AC-01**: The badge showcase section on /atlas displays all 16 badges organized into 4 named categories: Explorador, Perfeccionista, Aventureiro, Veterano.
- [ ] **AC-02**: Unlocked badges display with full-color icon, badge name, and "Conquistado em [date]" text. They are interactive (clickable/tappable).
- [ ] **AC-03**: Locked badges display with grayscale icon, lock overlay icon, muted name, and descriptive text explaining how to unlock. They are NOT interactive.
- [ ] **AC-04**: In-progress badges (where applicable) display with partial opacity icon, a mini progress bar (e.g., "3/5"), and muted name.
- [ ] **AC-05**: Clicking an unlocked badge opens a detail modal with large icon, name, description, date earned, and category tag. Modal has focus trap and closes on Escape/overlay click/X button.
- [ ] **AC-06**: A counter "X de 16 badges conquistados" is displayed below the section title and updates in real-time when a badge is unlocked.
- [ ] **AC-07**: When a badge is unlocked, a CelebrationToast appears at top-center with confetti animation (1200ms), badge name, and auto-dismisses after 5 seconds.
- [ ] **AC-08**: Under `prefers-reduced-motion`, confetti is replaced by a static gold glow (200ms), and all slide/fade animations are replaced by instant state transitions.
- [ ] **AC-09**: On mobile (< 768px), the badge grid displays 2 columns per category. On tablet, 3 columns. On desktop, 4 columns.
- [ ] **AC-10**: All unlocked badge cards are keyboard-navigable via Tab. Enter/Space opens the detail modal. Focus returns to the badge card on modal close.
- [ ] **AC-11**: Screen readers announce unlocked badges as "Badge [name], conquistado em [date]" and locked badges as "Badge [name], bloqueado. [requirement]."
- [ ] **AC-12**: If badge data fails to load, an inline error with retry button is displayed. The rest of the /atlas page continues to function.

---

## 12. Patterns Used

| Pattern | Source | Usage |
|---|---|---|
| **CelebrationToast** | SPEC-UX-GAMIFICATION 4.8 | Unlock animation toast with confetti |
| **MiniProgressBar** | SPEC-UX-007 | In-progress badge progress indicator |
| **BadgeCard** | SPEC-UX-GAMIFICATION 4.9 | Extended with 3 states (locked/unlocked/in-progress) |

### New Patterns Introduced

| Pattern | Description | Reusable? |
|---|---|---|
| **BadgeShowcaseGrid** | Categorized grid of badge cards with section headers and responsive columns | Yes — any categorized achievement display |
| **BadgeDetailModal** | Modal with badge icon, name, description, date, and category | Yes — any achievement detail view |
| **BadgeUnlockTransition** | Animated state transition from locked to unlocked (grayscale to color + glow) | Yes — any unlock/reveal moment |

---

> **Spec Status**: Draft
> **Ready for**: Architect (4 open questions need resolution before implementation)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-22 | ux-designer | Initial draft — badge showcase grid, detail modal, unlock animation |
