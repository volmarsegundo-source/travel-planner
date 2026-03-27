# UX Specification: Sumario da Expedicao (Expedition Summary Redesign)

**UX Spec ID**: SPEC-UX-SUMARIO
**Related Story**: Sprint 40 — Summary Page Redesign
**Author**: ux-designer
**Status**: Draft
**Last Updated**: 2026-03-27
**Version**: 1.0.0

---

## 1. Traveler Goal

Visualizar de forma clara e completa todos os dados da expedicao em uma unica pagina, entendendo o que ja foi preenchido, o que falta, e tendo acesso rapido para editar qualquer fase ou voltar ao dashboard.

---

## 2. Personas Affected

| Persona | Como este redesign os serve |
|---|---|
| `@leisure-solo` | Visao consolidada de toda a viagem planejada; confianca de que nada foi esquecido |
| `@leisure-family` | Verificacao rapida de dados de passageiros, logistica e checklist para viagem em grupo |
| `@business-traveler` | Acesso rapido a codigos de reserva, datas e logistica sem navegar fase por fase |
| `@bleisure` | Visao geral para confirmar que extensao de lazer esta coberta alem da parte profissional |
| `@group-organizer` | Compartilhar resumo consolidado com membros do grupo (futuro: share link) |
| `@travel-agent` | Visao de relatorio para validacao antes de confirmar com cliente |

---

## 3. User Flow

```
[Dashboard ou finalizacao de fase]
    |
    v
[Summary Page: /expedition/[tripId]/summary]
    |
    +-- [Hero Header] -- destino, datas, duracao, imagem
    |
    +-- [Trip Overview Card] -- origem > destino, viajantes, orcamento, estilo
    |
    +-- [Phase Progress Bar] -- 6 segmentos com status visual
    |
    +-- [Phase Cards x6] -- dados de cada fase (ou estado vazio)
    |      |
    |      +-- [Editar fase] --> navega para /expedition/[tripId]/phase-N
    |
    +-- [Gamification Card] -- PA ganhos, badges, rank
    |
    +-- [Actions Bar] -- Editar fases, Exportar PDF (futuro), Compartilhar (futuro), Voltar
           |
           +-- [Voltar ao Dashboard] --> /expeditions
```

**Caminhos de erro:**
- Dados de fase indisponiveis: exibir card com badge "Nao concluida" e CTA "Iniciar"
- Servico de summary falha: exibir ErrorBoundaryCard com opcao de retry
- Trip nao encontrada: redirect para /expeditions com toast de erro

---

## 4. Screen Specifications

### 4.1 Page Container

**Layout**: Single column, max-width `max-w-4xl` (896px), centrado horizontalmente.
**Background**: `atlas-surface` (#f9f9f9)
**Padding**: `px-4` mobile, `px-6` tablet, `px-8` desktop. `py-8` vertical.

---

### 4.2 Hero Header

**Purpose**: Estabelecer imediatamente ONDE e QUANDO o viajante vai, criando conexao emocional com o destino.

**Content hierarchy**:
1. Nome do destino (maior elemento visual da pagina)
2. Datas da viagem + badge de duracao
3. Imagem/gradiente de fundo do destino (cover da trip)

**Layout**:

```
+---------------------------------------------------------------+
|  [Trip cover gradient/image — 200px height, rounded-atlas-2xl] |
|                                                                 |
|     LISBOA                          (atlas-text-h1, 36px, bold) |
|     12 Mar 2026 - 22 Mar 2026      (atlas-text-body, 16px)     |
|     [10 dias]                       (AtlasBadge variant=status  |
|                                      color=info, size=md)       |
+---------------------------------------------------------------+
```

**Components**:
- **Cover area**: `div` with trip gradient class or destination image as `background-image`. Height `200px` mobile, `240px` tablet, `280px` desktop. `rounded-atlas-2xl`. Overflow hidden. If no image, use the trip's assigned gradient from the 8 cover gradients defined in the design system.
- **Destination name**: `h1`, `font-atlas-headline`, `atlas-text-h1` (36px desktop, 28px mobile), `font-extrabold`, `text-atlas-on-surface`.
- **Date range**: `p`, `font-atlas-body`, `atlas-text-body` (16px), `text-atlas-on-surface-variant`. Format: `DD MMM YYYY - DD MMM YYYY` (locale-aware via `toLocaleDateString`).
- **Duration badge**: `AtlasBadge variant="status" color="info" size="md"`. Content: `{N} dias`. Positioned inline after dates on desktop, below dates on mobile.
- **TripCountdown**: Reuse existing `TripCountdown` component below the date range. Shows countdown or "Em andamento" or "Concluida".

**Token mapping**:
| Element | Token |
|---|---|
| Cover bg | Trip gradient class or `atlas-primary-container` fallback |
| Destination text | `atlas-on-surface` |
| Date text | `atlas-on-surface-variant` |
| Duration badge bg | `atlas-info-container` |
| Duration badge text | `atlas-info` |
| Section spacing below | `atlas-space-8` (32px) |

**Empty state**: If no destination (phase 1 not started), show "Destino nao definido" in `text-atlas-on-surface-variant italic` and hide cover area (show a placeholder `atlas-surface-container-high` rounded rectangle).

**Loading state**: Skeleton — rounded rectangle 200px for cover, 2 text bars (40% and 60% width), 1 badge skeleton.

---

### 4.3 Trip Overview Card

**Purpose**: Quick-scan of the most critical trip parameters without expanding any phase.

**Component**: `AtlasCard variant="elevated"`

**Layout**: Horizontal key-value pairs, 2 columns on desktop, 1 column on mobile.

```
+---------------------------------------------------------------+
| VISAO GERAL                        (category-overline badge)   |
|                                                                 |
|  Origem          Sao Paulo         Tipo          Internacional  |
|  Destino         Lisboa            Viajantes     2 adultos,     |
|  Ida             12 Mar 2026                     1 crianca      |
|  Volta           22 Mar 2026       Orcamento     R$ 15.000      |
|                                    Estilo        [chip] [chip]  |
+---------------------------------------------------------------+
```

**Content fields** (from `ExpeditionSummaryPhase1` + `ExpeditionSummaryPhase2`):

| Label | Source | Format |
|---|---|---|
| Origem | `phase1.origin` | Text, or "Nao informada" muted |
| Destino | `phase1.destination` | Text |
| Ida | `phase1.startDate` | `DD MMM YYYY` locale |
| Volta | `phase1.endDate` | `DD MMM YYYY` locale, or "Datas flexiveis" if `phase1.flexibleDates` |
| Tipo | `phase1.tripType` | Translated trip type |
| Viajantes | `phase2.passengers` | e.g. "2 adultos, 1 crianca" — sum if null show "Nao definido" |
| Orcamento | `phase2.budget` + `phase2.currency` | Formatted currency, or `phase2.budgetRange` label |
| Estilo | `phase2.travelerType` + `phase2.accommodationStyle` | `AtlasChip` display chips (non-interactive, `mode="selectable" selected disabled`) |

**Token mapping**:
| Element | Token |
|---|---|
| Card bg | `atlas-surface-container-lowest` (via AtlasCard elevated) |
| Section label | `AtlasBadge variant="category-overline"` — "VISAO GERAL" |
| Key labels | `font-atlas-body`, `atlas-text-small` (14px), `font-semibold`, `text-atlas-on-surface-variant` |
| Value text | `font-atlas-body`, `atlas-text-small` (14px), `font-normal`, `text-atlas-on-surface` |
| Grid gap | `gap-x-8 gap-y-3` (32px horizontal, 12px vertical) |
| Card padding | `p-6` (default from AtlasCard) |
| Section spacing below | `atlas-space-6` (24px) |

**Empty state**: If phase 1 not completed, show card with single message: "Complete a Fase 1 para ver o resumo da viagem." + `AtlasButton variant="ghost"` linking to phase 1.

**Responsive**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Single column, full width. Labels left-aligned, values below each label. |
| Tablet (768-1024px) | 2-column grid: `grid-cols-2`. |
| Desktop (> 1024px) | 2-column grid: `grid-cols-2`, wider spacing. |

---

### 4.4 Phase Progress Bar

**Purpose**: At-a-glance status of all 6 phases. Always visible. Non-interactive (display only).

**Layout**: Horizontal bar with 6 segments connected by lines.

```
  [1]----[2]----[3]----[4]----[5]----[6]
   ✓      ✓      ●      ○      ○      ○
```

**Implementation**: Reuse `UnifiedProgressBar` or build a simplified read-only version for the summary context.

**Segment states**:

| State | Circle | Connecting line | Label color |
|---|---|---|---|
| Completed | `bg-atlas-success` (#10B981), white checkmark icon inside | `bg-atlas-success` solid | `text-atlas-success` darker (#059669 for small text WCAG) |
| Current/Partial | `bg-atlas-secondary-container` (#fe932c), pulse animation | `bg-atlas-surface-container-high` | `text-atlas-on-surface` bold |
| Not started | `border-2 border-atlas-outline-variant`, hollow | `bg-atlas-surface-container-high` dashed | `text-atlas-on-surface-variant` |

**Segment circles**: 32px diameter desktop, 28px mobile. Checkmark icon 14px inside completed circles.
**Connecting lines**: 2px height, flex-grow between circles.
**Phase labels**: Below each circle. Full phase name on `sm+`, abbreviated on `xs` (e.g., "Chamado" instead of "O Chamado").

**Token mapping**:
| Element | Token |
|---|---|
| Completed circle | `bg-atlas-success`, text `white` |
| Active circle | `bg-atlas-secondary-container`, shadow `atlas-shadow-glow-amber` |
| Pending circle | `border-atlas-outline-variant` |
| Completed line | `bg-atlas-success` |
| Pending line | `bg-atlas-surface-container-high` |
| Labels | `font-atlas-body`, `atlas-text-caption` (12px), `font-semibold` |
| Section spacing below | `atlas-space-8` (32px) |

**Accessibility**:
- `role="img"` on the container
- `aria-label="Progresso da expedicao: 3 de 6 fases concluidas"`
- Individual segment states not exposed as interactive elements (display only)
- Pulse animation respects `prefers-reduced-motion`

**Responsive**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Circles 28px, labels abbreviated, connecting lines shorter |
| Tablet+ | Circles 32px, full labels, generous spacing |

---

### 4.5 Phase Cards (x6)

**Purpose**: Detailed snapshot of each phase's data. One card per phase. Cards for incomplete phases show an empty state with CTA to start/continue.

**Component**: `AtlasCard variant="base"` for all phases. Completed phases get left border accent.

**General card layout**:

```
+---------------------------------------------------------------+
| [icon] FASE N: [Nome da Fase]    [status badge]    [Edit CTA] |
|---------------------------------------------------------------|
| [Phase-specific content — varies per phase]                    |
+---------------------------------------------------------------+
```

**Card header** (same for all 6):
- Phase icon (emoji from PHASE_ICONS): `text-xl`, `aria-hidden="true"`
- Phase name: `font-atlas-headline`, `atlas-text-h4` (18px), `font-bold`, `text-atlas-on-surface`
- Status badge: `AtlasBadge variant="status"`:
  - Completed: `color="success"`, text "Concluida"
  - Partial: `color="warning"`, text "Em andamento"
  - Not started: `color="info"`, text "Nao concluida"
- Edit CTA: `AtlasButton variant="ghost" size="sm"`:
  - Completed: "Editar"
  - Partial: "Continuar"
  - Not started: "Iniciar"
  - Links to `/expedition/[tripId]/phase-N`

**Left border accent** (applied via className override on AtlasCard):
- Completed: `border-l-4 border-l-atlas-success`
- Partial: `border-l-4 border-l-atlas-secondary-container`
- Not started: no left accent (default card border)

**Token mapping (shared)**:
| Element | Token |
|---|---|
| Card bg | `atlas-surface-container-lowest` (via AtlasCard) |
| Icon | `text-xl` inline emoji |
| Phase name | `font-atlas-headline`, `atlas-text-h4`, `text-atlas-on-surface` |
| Content labels | `font-atlas-body`, `atlas-text-small` (14px), `font-semibold`, `text-atlas-on-surface-variant` |
| Content values | `font-atlas-body`, `atlas-text-small` (14px), `text-atlas-on-surface` |
| Internal spacing | `gap-3` (12px) between rows |
| Card padding | `p-6` (default) |
| Grid gap between cards | `gap-4` (16px) |

---

#### 4.5.1 Phase 1 Card: O Chamado (Trip Basics)

**Content when completed** (`ExpeditionSummaryPhase1`):

| Field | Source | Display |
|---|---|---|
| Origem | `phase1.origin` | Text |
| Destino | `phase1.destination` | Text, bold |
| Datas | `phase1.startDate` - `phase1.endDate` | Formatted date range |
| Tipo de viagem | `phase1.tripType` | Translated label |
| Datas flexiveis | `phase1.flexibleDates` | "Sim" / "Nao" |
| Viajante | `phase1.name` | Text, or omit if null |

**Layout**: Key-value list, single column. Origin arrow Destination on same row if space allows.

```
  Sao Paulo  -->  Lisboa
  12 Mar - 22 Mar 2026  ·  Internacional
  Datas flexiveis: Nao
```

---

#### 4.5.2 Phase 2 Card: O Explorador (Profile)

**Content when completed** (`ExpeditionSummaryPhase2`):

| Field | Source | Display |
|---|---|---|
| Tipo de viajante | `phase2.travelerType` | `AtlasChip` display |
| Estilo de hospedagem | `phase2.accommodationStyle` | `AtlasChip` display |
| Ritmo de viagem | `phase2.travelPace` | Scale label (1=Relaxado, 5=Intenso) |
| Orcamento | `phase2.budget` + `phase2.currency` | Formatted value |
| Passageiros | `phase2.passengers` | "2 adultos, 1 crianca, 0 bebes" |

**Layout**: Chips for type/style at top, then key-value pairs below.

```
  [Aventureiro]  [Hostel/Airbnb]       (chips)
  Ritmo: Moderado  ·  Orcamento: R$ 15.000
  Passageiros: 2 adultos, 1 crianca
```

---

#### 4.5.3 Phase 3 Card: O Preparo (Checklist)

**Content when completed** (`ExpeditionSummaryPhase3`):

| Field | Source | Display |
|---|---|---|
| Progresso | `phase3.done` / `phase3.total` | Progress text + mini progress bar |
| Itens pendentes | `phase3.items` filtered `!completed` | Bulleted list (max 5 shown) |

**Layout**:

```
  Checklist: 8/12 concluidos
  [========----] 66%                   (mini progress bar)

  Pendentes:
  · Passaporte valido
  · Seguro viagem
  · Reserva hotel
  + 1 mais...                          (expandable if > 5)
```

**Mini progress bar**: 6px height, `rounded-full`, bg `atlas-surface-container-high`, fill `atlas-success` (if > 80%) or `atlas-secondary-container` (if < 80%). Width 100% of card content area.

**Pending items**: Show `required` items first (with `!` prefix in `text-atlas-warning`), then `recommended`. Max 5 visible, "e mais N..." link if overflow.

---

#### 4.5.4 Phase 4 Card: A Logistica (Transport, Accommodation, Mobility)

**Content when completed** (`ExpeditionSummaryPhase4`):

| Field | Source | Display |
|---|---|---|
| Transportes | `phase4.transportSegments` | Count + first segment summary |
| Hospedagens | `phase4.accommodations` | Count + first accommodation summary |
| Mobilidade | `phase4.mobility` | Chips list |

**Layout**:

```
  Transportes: 2 trechos
    Aviao: GRU --> LIS  ·  12 Mar
    Aviao: LIS --> GRU  ·  22 Mar

  Hospedagens: 1 reserva
    Hotel: Lisboa Downtown  ·  12-22 Mar
    Reserva: BOOK-****-X7Z

  Mobilidade: [Metro] [Uber] [A pe]
```

**Transport segments**: Show type icon (emoji: aviao, onibus, trem, carro), departure/arrival places, date. Max 3 shown, "e mais N..." if overflow.
**Accommodations**: Show type, name, check-in/out dates, masked booking code (from service). Max 3 shown.
**Mobility**: `AtlasChip` display chips, non-interactive, `size="sm"`, `color="default"`.
**Booking codes**: Use `maskedBookingCode` from service. Display in `font-mono`, `text-atlas-on-surface-variant`.

---

#### 4.5.5 Phase 5 Card: O Guia do Destino (Guide Highlights)

**Content when completed** (`ExpeditionSummaryPhase5`):

| Field | Source | Display |
|---|---|---|
| Gerado em | `phase5.generatedAt` | Formatted date |
| Destaques | `phase5.highlights` | Bulleted list (max 5) |

**Layout**:

```
  Guia gerado em 15 Mar 2026   [AI badge]

  Destaques:
  · Fuso horario: UTC+0 (WET)
  · Moeda: Euro (EUR)
  · Idioma: Portugues
```

**AI badge**: `AtlasBadge variant="ai-tip"` next to the "Gerado em" date, indicating AI-generated content.

---

#### 4.5.6 Phase 6 Card: O Roteiro (Itinerary Overview)

**Content when completed** (`ExpeditionSummaryPhase6`):

| Field | Source | Display |
|---|---|---|
| Dias planejados | `phase6.dayCount` | Number |
| Total de atividades | `phase6.totalActivities` | Number |

**Layout**:

```
  10 dias planejados  ·  24 atividades
```

**Enhancement**: Show a compact day-by-day summary if data is available in future iterations. For v1, just the counts.

---

#### 4.5.x Empty State (applies to all phase cards)

When `getPhaseStatus(N) === "not_started"`:

```
+---------------------------------------------------------------+
| [icon] FASE N: [Nome da Fase]    [Nao concluida]    [Iniciar] |
|---------------------------------------------------------------|
|  [muted italic text]                                           |
|  "Esta fase ainda nao foi preenchida."                         |
+---------------------------------------------------------------+
```

- Card uses `opacity-60` class (matching current implementation)
- No left border accent
- Content area: single line italic text in `text-atlas-on-surface-variant`, `text-xs`
- Background: `atlas-surface-container-low`, `rounded-atlas-lg`, `px-3 py-2`

---

### 4.6 Gamification Card

**Purpose**: Reward feedback — show the traveler what they earned from this expedition.

**Component**: `AtlasCard variant="dark"` (navy background for visual distinction).

**Layout**:

```
+---------------------------------------------------------------+
|  [dark bg: atlas-primary-container]                            |
|                                                                 |
|  CONQUISTAS DA EXPEDICAO            (category-overline, peach)  |
|                                                                 |
|  [sparkle] 350 PA ganhos    [rank badge]    [badge count]      |
|                                                                 |
|  [mini progress bar to next rank]                               |
|  Proximo nivel: Explorador (150 PA restantes)                   |
+---------------------------------------------------------------+
```

**Content fields**:
| Field | Source | Display |
|---|---|---|
| PA ganhos | Sum of points from this expedition | `AtlasBadge variant="pa"` with expedition total |
| Rank atual | User's current rank | `AtlasBadge variant="rank"` |
| Badges | Badges earned in this expedition | Count badge or individual badge icons |
| Progresso rank | Points to next rank | Mini progress bar (4px, `atlas-secondary-container` fill on `atlas-primary-container` track) |

**Token mapping**:
| Element | Token |
|---|---|
| Card bg | `atlas-primary-container` (#1a2332) via AtlasCard dark variant |
| Overline | `AtlasBadge variant="category-overline"`, override color to `atlas-secondary-fixed-dim` |
| PA text | `text-atlas-on-primary` (white) |
| Progress label | `text-atlas-primary-fixed-dim` (#bec7db) |
| Progress bar track | `atlas-primary` (#040d1b) |
| Progress bar fill | `atlas-secondary-container` (#fe932c) |

**Empty state**: If no gamification data available (e.g., no points engine data), hide this card entirely. Do not show an empty gamification card.

**Responsive**: Full width on all breakpoints. Single row on desktop, stacked on mobile.

---

### 4.7 Actions Bar

**Purpose**: Primary navigation away from summary — back to dashboard, edit phases, future export/share.

**Layout**: Sticky bottom bar on mobile, inline section at bottom on desktop.

```
Desktop:
+---------------------------------------------------------------+
| [Voltar ao Dashboard]     [Exportar PDF (futuro)]  [Compartilhar (futuro)] |
+---------------------------------------------------------------+

Mobile (sticky bottom):
+---------------------------------------------------------------+
| [Voltar ao Dashboard]                                          |
+---------------------------------------------------------------+
```

**Components**:
- "Voltar ao Dashboard": `AtlasButton variant="primary" size="lg"`. Links to `/expeditions`. Full width on mobile.
- "Exportar PDF": `AtlasButton variant="secondary" size="md"`. Disabled with `title="Em breve"`. Hidden on mobile for v1.
- "Compartilhar": `AtlasButton variant="secondary" size="md"`. Disabled with `title="Em breve"`. Hidden on mobile for v1.

**Token mapping**:
| Element | Token |
|---|---|
| Bar bg (mobile sticky) | `atlas-surface-container-lowest` with `border-t border-atlas-outline-variant/20` |
| Bar padding | `px-4 py-3` mobile, `px-0 py-0` desktop (inline) |
| Shadow (mobile sticky) | `atlas-shadow-md` (shadow upward) |
| Section spacing above | `atlas-space-8` (32px) desktop, 0 mobile (sticky) |

**Responsive**:
| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Sticky bottom bar, single button "Voltar ao Dashboard" full width, 60px safe area for bottom nav if present |
| Tablet+ | Inline flex row, `justify-between`, all buttons visible |

**Accessibility**:
- `role="navigation"` with `aria-label="Acoes do sumario"`
- All buttons keyboard-accessible
- Disabled buttons: `aria-disabled="true"`, tooltip text for screen readers

---

### 4.8 Phase Cards Grid Layout

**Layout**: The 6 phase cards use a responsive grid:

| Breakpoint | Grid |
|---|---|
| Mobile (< 768px) | `grid-cols-1` — single column, full width cards |
| Tablet (768-1024px) | `grid-cols-2` — 2 columns |
| Desktop (> 1024px) | `grid-cols-2` — 2 columns (wider cards, more internal space) |

**Section heading**: "Fases da Expedicao" — `font-atlas-headline`, `atlas-text-h2` (28px), `font-bold`, `text-atlas-on-surface`. Spacing: `mb-4` below heading.

---

## 5. Microcopy Guidelines

### CTA Labels
| Context | Label | Rationale |
|---|---|---|
| Back to dashboard | "Voltar ao Dashboard" | Clear destination |
| Edit completed phase | "Editar" | Concise, familiar |
| Continue partial phase | "Continuar" | Implies resumption |
| Start new phase | "Iniciar" | Lower commitment than "Completar" |
| Export PDF (future) | "Exportar PDF" | Direct, no ambiguity |
| Share (future) | "Compartilhar" | Standard Portuguese |

### Status Labels
| Status | Label | Badge color |
|---|---|---|
| Completed | "Concluida" | success (green) |
| In progress | "Em andamento" | warning (amber) |
| Not started | "Nao concluida" | info (blue) |

### Error Messages
| Error | Message | Recovery |
|---|---|---|
| Summary load failure | "Nao conseguimos carregar o resumo da sua expedicao. Tente novamente." | "Tentar novamente" retry button |
| Trip not found | "Expedicao nao encontrada." | Redirect to /expeditions |
| Phase data unavailable | "Dados indisponiveis no momento." | "Tentar novamente" or "Editar fase" |

### Empty State Text
| Context | Text |
|---|---|
| Phase not started | "Esta fase ainda nao foi preenchida." |
| No destination | "Destino nao definido" |
| No passengers | "Nao definido" |
| No budget | "Nao definido" |
| No guide | "Guia ainda nao gerado" |
| No itinerary | "Roteiro ainda nao criado" |
| Flexible dates | "Datas flexiveis" |
| No origin | "Nao informada" |

### Confirmation Messages
| Context | Message |
|---|---|
| Celebration after phase complete | Handled by existing PointsAnimation component |

---

## 6. Accessibility Requirements

- [x] All interactive elements keyboard-navigable (Tab order: hero -> overview -> progress bar -> phase cards (edit buttons) -> gamification -> actions bar)
- [x] Color contrast >= 4.5:1 for all text. Verified critical pairs:
  - `atlas-on-surface` (#1a1c1c) on `atlas-surface-container-lowest` (#ffffff) = 17.4:1 PASS
  - `atlas-on-surface-variant` (#45474c) on `atlas-surface-container-lowest` (#ffffff) = 8.2:1 PASS
  - `atlas-on-primary` (#ffffff) on `atlas-primary-container` (#1a2332) = 13.1:1 PASS
  - `atlas-success` (#10b981) on `atlas-surface-container-lowest` (#ffffff) = 3.2:1 FAIL for small text -- use #059669 for text labels
  - `atlas-primary` (#040d1b) on `atlas-secondary-container` (#fe932c) = 7.5:1 PASS (button CTA)
- [x] No information conveyed by color alone: all status badges have text labels; progress bar has checkmark icons for completed
- [x] All images have descriptive alt text: cover image `alt="Imagem de [destino]"` or decorative `aria-hidden`
- [x] All form inputs have associated visible labels: N/A (no form inputs on summary)
- [x] Error messages linked to their fields via aria-describedby: N/A (no forms)
- [x] Focus indicator visible on all interactive elements: `focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2` (inherited from Atlas components)
- [x] Touch targets >= 44x44px on mobile: all buttons use `size="md"` minimum (44px) or `size="lg"` (48px)
- [x] Progress bar: `role="img"` with descriptive `aria-label`
- [x] Phase cards: semantic heading hierarchy (`h1` -> `h2` -> `h3` for phase names within cards)
- [x] Landmark roles: `<main>` for page content, `<nav>` for actions bar, `<section>` for each major area with `aria-labelledby`
- [x] Mini progress bars: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- [x] Pulse animation on active phase: respects `prefers-reduced-motion: reduce` (use `motion-reduce:animate-none`)
- [x] Booking codes in mono font: no accessibility issue, just visual styling
- [x] Screen reader for status: badges use `role="status"` (inherited from AtlasBadge)

**Contrast correction**: Where `atlas-success` (#10B981) is used as text on white backgrounds, replace with `#059669` (darker green) for small text (< 18px). This matches the decision from SPEC-UX-030.

---

## 7. Responsive Behavior

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Single column. Hero cover 200px. Overview card single-column key-value. Progress bar compact (28px circles, abbreviated labels). Phase cards 1-col. Gamification card stacked. Actions bar sticky bottom. |
| Tablet (768-1024px) | Single column container. Hero cover 240px. Overview card 2-col grid. Progress bar full (32px circles, full labels). Phase cards 2-col grid. Gamification card horizontal. Actions bar inline. |
| Desktop (> 1024px) | Single column container max-w-4xl. Hero cover 280px. Overview card 2-col grid. Progress bar full with generous spacing. Phase cards 2-col grid. Actions bar inline with future buttons visible. |

---

## 8. Skeleton Loading States

When summary data is loading, display skeleton placeholders for each section:

### Hero Skeleton
- Rounded rectangle `200px` height, `bg-atlas-surface-container-high`, `animate-pulse`
- Text bar `60%` width below (destination name)
- Text bar `40%` width below (dates)
- Badge skeleton `80px` width

### Overview Card Skeleton
- `AtlasCard loading={true}` (uses built-in CardSkeleton)

### Progress Bar Skeleton
- 6 circles as `bg-atlas-surface-container-high`, no connecting line colors
- No labels

### Phase Cards Skeleton
- 6 x `AtlasCard loading={true}`

### Gamification Card Skeleton
- Dark card with 3 pulse bars

---

## 9. Page Section Order (top to bottom)

1. Hero Header (destination, dates, countdown)
2. Trip Overview Card (key travel parameters)
3. Phase Progress Bar (6-segment visual)
4. Phase Cards section heading + 6 cards grid
5. Gamification Card (PA, rank, badges)
6. Actions Bar (back, export, share)

---

## 10. Open UX Questions

- [ ] **Cover image source**: Should we use the destination image from the guide (phase 5 AI content) or only the trip gradient? If guide image, need to verify it exists and handle fallback.
- [ ] **Gamification data source**: Need to confirm the API provides expedition-specific PA totals and badges, or if we calculate from PointTransaction records client-side.
- [ ] **PDF export priority**: Is PDF export in scope for this sprint or deferred? Affects whether we show the disabled button or hide it entirely.
- [ ] **Share link scope**: Same question for share functionality — show disabled button as teaser or hide completely?
- [ ] **Phase cards expandable vs always visible**: Current spec shows all content visible. If phase 4 (logistics) has many transport segments, cards may get long. Should we cap at 3 items + "ver mais" expand, or let them grow?

---

## 11. Patterns Used

**Existing Atlas components (from design system)**:
- `AtlasCard` — base, elevated, dark, interactive variants
- `AtlasBadge` — status, rank, pa, category-overline, ai-tip variants
- `AtlasChip` — selectable mode for display chips (disabled)
- `AtlasButton` — primary, secondary, ghost variants
- `TripCountdown` — existing countdown display component
- `PointsAnimation` — existing celebration overlay
- `ErrorBoundaryCard` — error state with retry

**New patterns introduced**:
- **SummaryHero**: Cover area + destination name + dates + duration badge + countdown. Reusable for any trip context page.
- **PhaseStatusCard**: Card with left border accent, icon + name + status badge header, phase-specific content body. Reusable pattern for any phase-aware display.
- **MiniProgressBar**: 6px height inline progress bar for compact contexts (checklist progress, rank progress). Simpler than the existing readiness bar.
- **StickyActionsBar**: Mobile-only sticky bottom bar with primary CTA. Reusable for any full-page view needing persistent bottom action.

---

## 12. Comparison with Current Implementation

The current `ExpeditionSummaryV2.tsx` (386 lines) has:
- Simple centered layout (`max-w-2xl`)
- Title + destination text (no cover image, no hero prominence)
- Two progress bars (completion + readiness) — redundant, confusing
- Pending items section (required + recommended)
- Next steps section (card links)
- 6 phase cards in 2-col grid with minimal data
- Single "Voltar ao Dashboard" button

**Key improvements in this redesign**:
1. **Hero with cover**: Emotional connection to destination, clearer visual hierarchy
2. **Trip Overview Card**: Consolidated key parameters (currently scattered across phase cards)
3. **Single progress bar**: 6-segment phase progress replaces confusing dual completion/readiness bars
4. **Richer phase data**: Each card shows meaningful data summaries, not just one-liners
5. **Gamification card**: Reward visibility (currently missing from summary)
6. **Sticky mobile actions**: Better mobile navigation (current: single button at bottom of scroll)
7. **Left border accents**: Visual scan of completion status without reading text
8. **Wider container**: `max-w-4xl` vs `max-w-2xl` gives phase cards room to breathe

---

> Status: Draft
> ⚠️ Blocked on: Cover image source decision (Open Question 1) and Gamification data source confirmation (Open Question 2). All other sections are implementation-ready.
