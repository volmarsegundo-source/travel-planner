# Atlas — Sprint 40: Stitch Prompts + Kickoff

> **Sprint 40:** "Migração das Fases 1–6 + Dashboard V2"
> **Baseline:** v0.34.0 (Sprint 39) — 2644 unit tests, Landing V2 + Login V2 live
> **Telas a gerar no Stitch:** Phase 2, Phase 4, Phase 5, Phase 6, Sumário

---

## PARTE 1 — Prompts para o Google Stitch

> **Lembrete:** Se o Stitch perdeu o contexto da sessão anterior, 
> cole o Design Context primeiro (abaixo), depois os prompts das telas.

### Design Context (colar primeiro se necessário)

```
DESIGN CONTEXT — Atlas Travel Planner

Atlas is a Brazilian AI-powered travel planning web app (Next.js + Tailwind CSS).
UI language is Brazilian Portuguese.

Design system (from UX Parecer — Sprint 38):
- Fonts: Plus Jakarta Sans (headlines, bold) + Work Sans (body, regular)
- Primary: Navy (#040d1b), Orange CTA (#fe932c) with navy text (not white)
- Teal for links (#005049, 8.2:1 contrast), Surface white (#ffffff)
- Gray background (#f5f5f5), Border (#e5e7eb)
- Border radius: 16px cards, 8px inputs, full for badges/chips
- Shadows: Soft layered, no harsh drop shadows
- Inputs: 48px height, focus-visible:ring-2 (teal border + amber keyboard ring)
- Touch targets: minimum 44px on all interactives
- WCAG 2.1 AA compliance required (minimum 4.5:1 contrast)
- 59 color tokens with atlas-* prefix
- 7 reusable components: AtlasButton, AtlasInput, AtlasCard, AtlasChip, 
  AtlasBadge, AtlasPhaseProgress, AtlasStepperInput

Existing screens already designed: Landing Page (7 sections), Login (split-screen 60/40),
Dashboard, Phase 1 Wizard, Phase 3 O Preparo, AI-Powered Itinerary.

All new screens must be visually cohesive with existing ones.
```

---

### PROMPT — Phase 2: "O Perfil" (Preferences)

```
Design a travel preferences wizard screen for "Atlas" travel planning app. 
This is Phase 2 called "O Perfil" (The Profile). Desktop layout, 1440px wide. 
All text in Brazilian Portuguese. Must be cohesive with existing screens.

TOP BAR (sticky)
- Left: Atlas logo (small) + breadcrumb: "Minhas Expedições > [Trip Name] > O Perfil"
- Right: User avatar, Pontos Atlas counter "180 PA" with golden coin icon, notification bell.

PROGRESS INDICATOR
- Horizontal stepper showing 8 phases as connected nodes:
  Phase 1 "A Inspiração" (completed — teal with checkmark)
  Phase 2 "O Perfil" (ACTIVE — orange filled circle with pulse glow)
  Phases 3-6 (upcoming — outlined gray)
  Phases 7-8 (locked — gray with lock icon, "Em Breve" badge)
- "Fase 2 de 8" subtitle below active node

MAIN CONTENT (centered, max-width ~900px)
- Phase heading: "Qual é o seu estilo de viagem?" in display font
- Subtitle: "Personalize suas preferências para um roteiro sob medida." in muted gray.

PREFERENCES CARD (elevated white card, 16px border-radius, soft shadow):

  SECTION 1 — Travel Style
  - Label: "Estilo de viagem" with subtitle "Selecione até 3 opções"
  - Grid of selectable chips (3 columns, multiple selection):
    "🏖️ Praia & Relax" | "🏛️ Cultura & História" | "🍕 Gastronomia"
    "🌿 Natureza & Aventura" | "🛍️ Compras" | "💑 Romântica"
    "👨‍👩‍👧‍👦 Família" | "🎭 Vida Noturna" | "📸 Fotografia"
  - Chips: outlined by default, filled orange with checkmark when selected
  - Each chip minimum 44px height for touch target

  SECTION 2 — Budget Range
  - Label: "Faixa de orçamento por pessoa"
  - Three large selectable cards in a row:
    "💰 Econômico" (R$ 50-150/dia) | "💎 Moderado" (R$ 150-400/dia) | "👑 Premium" (R$ 400+/dia)
  - Single selection, active card has orange border and subtle glow
  - Each card ~200px wide with icon, title, and price range

  SECTION 3 — Accommodation
  - Label: "Tipo de hospedagem preferida"
  - Row of selectable chips:
    "🏨 Hotel" | "🏠 Airbnb" | "🏕️ Hostel" | "⛺ Camping" | "🏰 Resort"
  - Multiple selection allowed

  SECTION 4 — Pace
  - Label: "Ritmo de viagem"
  - Toggle between two options (pill-shaped toggle):
    "🐢 Tranquilo — Menos atividades, mais tempo livre"
    "🐆 Intenso — Muitas atividades, aproveitar cada minuto"
  - Active option has filled orange background

  SECTION 5 — Dietary Restrictions (optional)
  - Label: "Restrições alimentares" with "(opcional)" tag
  - Small chips: "Vegetariano" | "Vegano" | "Sem Glúten" | "Sem Lactose" | "Halal" | "Kosher"

BOTTOM ACTION BAR
- Left: "← Voltar" text button (ghost style, teal)
- Right: "Avançar →" primary button (orange bg, navy text, 48px height)
- Between: Small text "Fase 2 de 8" in muted gray

DESIGN REQUIREMENTS:
- Same color palette as Landing Page and Login (navy, orange, teal)
- Chips use outlined → filled orange transition with checkmark icon
- All touch targets minimum 44px
- Generous spacing between sections (32px gap)
- Card has subtle entrance animation (slide up + fade in)
- Responsive: sections stack vertically on mobile
```

---

### PROMPT — Phase 4: "A Logística" (Logistics Wizard)

```
Design a logistics wizard screen for "Atlas" travel planning app. 
This is Phase 4 called "A Logística" (The Logistics). Desktop layout, 1440px wide. 
All text in Brazilian Portuguese. This phase has a 3-step internal wizard.

TOP BAR (sticky) — same as other phases with breadcrumb "A Logística"

PROGRESS INDICATOR — Phase 4 active (orange), Phases 1-3 completed (teal checkmarks)

MAIN CONTENT (centered, max-width ~900px)

INTERNAL WIZARD — 3 steps shown as tabs or mini-stepper at top of the card:
  Step 1: "Transporte" (active)
  Step 2: "Hospedagem" 
  Step 3: "Seguro Viagem"

STEP 1 — TRANSPORTE (showing this step):

  LOGISTICS CARD (elevated white card, 16px border-radius):

  Heading: "Como você pretende se deslocar?"
  Subtitle: "A IA vai gerar estimativas de custo baseadas nas suas escolhas."

  FIELD 1 — Main Transport
  - Label: "Transporte principal (ida e volta)"
  - Large selectable cards in a row:
    "✈️ Avião" | "🚌 Ônibus" | "🚗 Carro" | "🚂 Trem"
  - Single selection, active has orange border

  FIELD 2 — Local Transport
  - Label: "Transporte no destino"
  - Chips (multiple selection):
    "🚕 Táxi/Uber" | "🚇 Metrô" | "🚌 Ônibus Local" | "🚲 Bicicleta" | "🚶 A pé"

  FIELD 3 — Estimated Budget
  - Label: "Orçamento estimado para transporte"
  - AI-generated estimate card with lightbulb icon:
    "💡 Estimativa da IA: R$ 1.200 - R$ 1.800 por pessoa"
    "Baseado em: São Paulo → Lisboa, 12 dias, 2 viajantes"
  - Small disclaimer: "Estimativa gerada por IA. Valores reais podem variar."
  - Card has soft yellow/amber background tint

  BOTTOM: "← Voltar" | Step indicator "1 de 3" | "Próximo Passo →"

DESIGN REQUIREMENTS:
- Internal wizard steps use a mini-stepper or segmented control at top
- AI estimate card has distinct visual treatment (amber tint, lightbulb icon)
- Transport cards are large enough for easy selection (~180px each)
- "Estimativa da IA" clearly labeled as AI-generated content
- Same visual language as other phases
```

---

### PROMPT — Phase 5: "Guia do Destino" (Destination Guide)

```
Design a destination guide screen for "Atlas" travel planning app.
This is Phase 5 called "Guia do Destino" (Destination Guide). Desktop layout, 1440px wide.
All text in Brazilian Portuguese. This screen shows AI-generated destination information.

TOP BAR + PROGRESS INDICATOR — Phase 5 active, Phases 1-4 completed

MAIN CONTENT (max-width ~1100px, wider than form phases)

PAGE HEADING
- "Guia do Destino: Lisboa" in large display font
- Subtitle: "Informações essenciais para sua viagem" in muted gray
- Small badge: "🤖 Gerado por IA" in amber tint

BENTO GRID LAYOUT (2 columns, asymmetric cards):

  TOP ROW:
  - LEFT (large card, 60%): "Sobre o Destino"
    - Brief AI-generated description of destination (3-4 sentences)
    - Small map thumbnail or destination photo placeholder
    
  - RIGHT (smaller card, 40%): "Informações Rápidas"
    - Icon rows: 🌡️ Clima: "18-25°C em março" | 💱 Moeda: "Euro (EUR)" | 
      🗣️ Idioma: "Português" | ⏰ Fuso: "GMT+0 (−3h do Brasil)" |
      🔌 Tomada: "Tipo F, 230V" | 📱 DDI: "+351"

  MIDDLE ROW:
  - LEFT (card): "Dicas de Segurança"
    - Traffic light indicator: 🟢 "Destino seguro para turistas"
    - 3-4 bullet points with safety tips
    
  - RIGHT (card): "Custos Médios"
    - Price comparison table:
      "🍽️ Refeição: R$ 60-120" | "🚕 Táxi (5km): R$ 25" | 
      "☕ Café: R$ 12" | "🎫 Atração: R$ 40-80"

  BOTTOM ROW:
  - FULL WIDTH (card): "O que não perder"
    - Horizontal scrollable cards with top attractions:
      "Torre de Belém" | "Mosteiro dos Jerónimos" | "Alfama" | "Pastéis de Belém"
    - Each mini-card has: photo placeholder, name, brief description, estimated time

BOTTOM ACTION BAR:
- "← Voltar" | "Fase 5 de 8" | "Avançar →"
- Small text: "Dados gerados por IA com base em fontes públicas. Sempre verifique informações antes de viajar."

DESIGN REQUIREMENTS:
- Bento grid layout — cards of different sizes creating visual interest
- AI-generated content clearly labeled with amber badge
- Information-dense but scannable (icons, short text, clear hierarchy)
- Cards have subtle hover elevation effect
- Destination-specific data should feel fresh and useful, not generic
- Same color system as other phases
```

---

### PROMPT — Phase 6: "Roteiro" (Itinerary — Detailed)

```
Design a detailed day-by-day itinerary screen for "Atlas" travel planning app.
This is Phase 6 called "Roteiro" (Itinerary). Desktop layout, 1440px wide.
All text in Brazilian Portuguese. This is the core AI-generated travel plan.

TOP BAR + PROGRESS INDICATOR — Phase 6 active, Phases 1-5 completed

LAYOUT: Two-column (60% itinerary / 40% map)

LEFT COLUMN (60%) — Itinerary Timeline

  HEADER:
  - "Seu Roteiro: Lisboa" in display font
  - "12 dias • 2 viajantes • Cultura & Gastronomia" in muted gray
  - Two buttons: "🔄 Regenerar Roteiro" (outlined, costs PA) and "📥 Exportar PDF" (ghost)
  - AtlasBadge showing "80 PA" cost for generation

  DAY SELECTOR:
  - Horizontal scrollable pills for each day: "Dia 1", "Dia 2", ... "Dia 12"
  - Active day pill filled orange, others outlined
  - Shows date below: "15 Mar"

  SELECTED DAY CONTENT (vertical timeline):
  - Day title: "Dia 1 — Chegada e Alfama" with date "Sábado, 15 de Março"
  
  Timeline entries (vertical line connecting activities):
  
  ENTRY 1 (morning):
  - Time: "09:00" | Activity: "Check-in no hotel"
  - Location: "Hotel Lisboa Centro" with small map pin icon
  - Duration: "~30 min"
  - Tip: "💡 Chegue cedo para garantir o quarto"
  
  ENTRY 2 (mid-morning):
  - Time: "10:00" | Activity: "Explorar Alfama"
  - Description: "Caminhe pelas ruas medievais do bairro mais antigo de Lisboa"
  - Duration: "~2h"
  - Cost: "Grátis"
  - Category chip: "🏛️ Cultura"
  
  ENTRY 3 (lunch):
  - Time: "12:30" | Activity: "Almoço no Time Out Market"
  - Description: "Mercado gastronômico com diversas opções"
  - Duration: "~1h30"
  - Cost: "R$ 80-120/pessoa"
  - Category chip: "🍕 Gastronomia"

  Show 2-3 more entries to fill the day...

  BOTTOM OF DAY:
  - Daily summary card: "📊 Resumo do Dia 1"
    - "4 atividades • ~8h • Custo estimado: R$ 200-300/pessoa"
  - Navigation: "← Dia anterior" | "Dia seguinte →"

RIGHT COLUMN (40%) — Interactive Map
  - Map showing all day's activities as numbered pins
  - Connected route between pins
  - Active pin highlighted in orange
  - Map controls: zoom in/out
  - Below map: "🗺️ Mapa interativo — clique nos pins para detalhes"

BOTTOM ACTION BAR:
- "← Voltar para Guia" | "Fase 6 de 8" | "Ver Sumário →"

DESIGN REQUIREMENTS:
- Timeline uses a vertical line with dots/icons at each entry
- Each activity card has subtle left border color matching its category
- Map and itinerary are synchronized (selecting activity highlights pin)
- AI-generated content clearly labeled
- "Regenerar" button shows PA cost prominently
- Day selector is horizontally scrollable on mobile
- On mobile: map moves below itinerary (stacked layout)
```

---

### PROMPT — Sumário da Expedição (Summary Page)

```
Design a trip summary/overview screen for "Atlas" travel planning app.
This is the "Sumário da Expedição" (Expedition Summary). Desktop layout, 1440px wide.
All text in Brazilian Portuguese. This is an overview of the entire planned trip.

TOP BAR — breadcrumb: "Minhas Expedições > Lisboa 2026 > Sumário"

PAGE HEADER
- Trip name: "Expedição Lisboa 2026" in large display font
- Trip details: "São Paulo → Lisboa • 15-26 Mar 2026 • 12 dias • 2 viajantes"
- Status badge: "✅ Planejamento Completo" in teal
- Action buttons: "📥 Exportar PDF" | "📤 Compartilhar" | "✏️ Editar"

SUMMARY GRID (3 columns top row, 2 columns bottom):

  ROW 1:
  - Card 1: "📊 Orçamento Total"
    - Large number: "R$ 8.400"
    - Subtitle: "R$ 4.200 por pessoa"
    - Mini breakdown: Transporte 35% | Hospedagem 40% | Alimentação 15% | Outros 10%
    - Small donut/pie chart visualization

  - Card 2: "🗓️ Roteiro"
    - "12 dias, 38 atividades"
    - Mini calendar visualization showing filled days
    - Link: "Ver roteiro completo →" in teal

  - Card 3: "✅ Checklist"
    - Progress: "12/18 itens completos"
    - Progress bar (teal fill, 67%)
    - Link: "Ver checklist →" in teal

  ROW 2:
  - Card 4 (wide): "📋 Fases da Expedição"
    - Horizontal phase progress bar showing all 8 phases
    - Phases 1-6 completed (teal checkmarks)
    - Phases 7-8 locked ("Em Breve")
    - Each phase clickable to revisit

  - Card 5: "🎮 Gamificação"
    - Current level: "Aventureiro" with level badge
    - PA earned this trip: "+180 PA"
    - Badges earned: 3 small badge icons
    - Progress bar to next level

BOTTOM SECTION:
- "🤖 Gerado com IA" disclaimer
- "Última atualização: 23 Mar 2026, 14:30"
- AtlasButton: "Voltar ao Dashboard" (secondary style)

DESIGN REQUIREMENTS:
- Dashboard-like layout with information-dense cards
- Each card has consistent padding, border-radius 16px, soft shadow
- Numbers and stats prominently displayed (large font, bold)
- Progress bars use teal for completed portions
- Phase progress bar matches the one used in phase screens
- Gamification section uses the rank/badge visual system
- Clean, scannable layout — user should get trip overview at a glance
```

---

## PARTE 2 — Exportação após gerar

Para cada tela gerada no Stitch:

1. Exportar como .zip (code.html + screen.png)
2. Salvar em `docs/design/stitch-exports/` com nome:
   - `phase2_o_perfil/`
   - `phase4_a_logistica/`
   - `phase5_guia_destino/`
   - `phase6_roteiro_detalhado/`
   - `summary_expedicao/`
3. Atualizar `docs/design/SCREEN-INDEX.md` com as novas telas
4. Commitar:
```bash
git add docs/design/
git commit -m "docs: add Stitch exports for Phases 2,4,5,6 and Summary (Sprint 40)"
```

---

## PARTE 3 — Sprint 40 Kickoff

### ETAPA 1 — PO reconcilia backlog

```
@product-owner

Estamos iniciando o Sprint 40 — "Migração das Fases 1-6 + Dashboard V2".

Contexto:
- Sprint 38: Design System Foundation (59 tokens, 7 componentes Atlas)
- Sprint 39: Landing V2 + Login V2 live no staging com feature flag
- Novos exports do Stitch: Phase 2, 4, 5, 6, Sumário (em docs/design/stitch-exports/)
- Telas já exportadas: Phase 1, Phase 3, Dashboard, Roteiro

Objetivo: Migrar TODAS as telas internas do app para Design V2.
Este é o sprint mais pesado — muitas telas, todas usando os componentes Atlas.

Telas a migrar (10 total):
1. Dashboard "Meu Atlas" (lista de expedições)
2. Phase 1 — A Inspiração (formulário)
3. Phase 2 — O Perfil (preferências com chips)
4. Phase 3 — O Preparo (checklist AI)
5. Phase 4 — A Logística (wizard 3 steps)
6. Phase 5 — Guia do Destino (bento grid informativo)
7. Phase 6 — Roteiro (itinerário + mapa)
8. Sumário da Expedição
9. PhaseLayout wrapper (progress bar, breadcrumb, PA counter)
10. Nav autenticada (diferente da Nav unauth da Landing)

Cada tela tem export do Stitch como referência visual.

IMPORTANTE:
- Feature flag NEXT_PUBLIC_DESIGN_V2 controla tudo (já funciona)
- Usar DesignBranch para cada tela (V1 intacto com flag OFF)
- UX Designer valida cada tela contra screen.png antes do merge
- Se não couber tudo no sprint, priorizar: PhaseLayout → Fases 1-3 → Dashboard → resto

Reconcilie o backlog com specs SDD (9 dimensões).
```

---

### ETAPA 2 — UX Designer define critérios

```
@ux-designer

Sprint 40 — Migração das Fases 1-6 + Dashboard V2.

Novos exports do Stitch disponíveis em docs/design/stitch-exports/:
- phase2_o_perfil/
- phase4_a_logistica/
- phase5_guia_destino/
- phase6_roteiro_detalhado/
- summary_expedicao/

Já existentes:
- phase_1_a_inspira_o_wizard_1/
- trip_planning_hub_o_preparo/
- atlas_user_dashboard_o_perfil_1/
- ai_powered_itinerary_roteiro/

Para cada tela, defina:
1. Mapeamento para componentes Atlas existentes
2. Composições page-level necessárias
3. Tokens específicos por tela
4. Breakpoints responsivos
5. Checklist de fidelidade visual

Atenção especial:
- PhaseLayout wrapper precisa ser consistente em todas as fases
- Phase 6 (Roteiro) tem layout split com mapa — validar responsivo
- Sumário tem data visualization (donut chart, progress bars)
- Dashboard pode reutilizar AtlasCard para trip cards

Produza o spec visual para todas as telas.
Siga o processo SDD — alimenta a dimensão UX.
```

---

### ETAPA 3 — Tech Lead valida e planeja

```
@tech-lead

Sprint 40 — Migração das Fases 1-6 + Dashboard V2.
PO criou specs e UX Designer definiu critérios visuais.

Antes de começar:
1. Leia o spec visual do UX Designer para Sprint 40
2. Leia os exports do Stitch para cada tela
3. Leia atlas-design-migration-plan.md seção 4 (Sprint 40)

IMPORTANTE: Spec SDD com 9 dimensões antes de codar.

Este sprint tem 10 telas — distribuição sugerida:

Track 1 — dev-fullstack-1 (~30h): Layout + Fases ímpares
  - PhaseLayoutV2 (wrapper: progress bar, breadcrumb, PA)
  - Phase1FormV2 — A Inspiração
  - Phase3V2 — O Preparo
  - Phase5V2 — Guia do Destino
  - SummaryPageV2

Track 2 — dev-fullstack-2 (~30h): Dashboard + Fases pares
  - DashboardV2 — Meu Atlas
  - Nav autenticada V2
  - Phase2FormV2 — O Perfil
  - Phase4V2 — A Logística (wizard 3 steps)
  - Phase6V2 — Roteiro (itinerário + mapa)

Cross-cutting:
  - UX Designer: mid-sprint review (Day 5) + final validation
  - QA: E2E com flags ON e OFF
  - QA: Visual regression baselines V2 de todas telas
  - QA: Teste responsivo
  - Após aprovação total: remover código V1 e feature flags

Se não couber tudo, priorizar Track 1 (PhaseLayout + Fases 1,3,5) 
pois o layout wrapper desbloqueia todas as fases.

Valide e inicie a execução.
```

---

### ETAPA 4 — Execução (go)

```
Aprovado. Lance ambos devs seguindo o plano.

Ordem de dependência:
1. PhaseLayoutV2 PRIMEIRO (ambos tracks dependem dele)
2. Depois fases em paralelo

Lembretes:
- Fonte de verdade: UX-PARECER-DESIGN-SYSTEM.md (tokens) + spec visual Sprint 40
- DesignBranch em cada tela
- Flag OFF por padrão
- Nenhum merge sem UX Designer sign-off
- UX mid-sprint review no Day 5

Reporte progresso após PhaseLayout + primeiras 2 fases prontas.
```

---

### ETAPA 5 — Validação Final

```
@ux-designer

Sprint 40 — validação final de todas as telas migradas.

Acesse o staging com NEXT_PUBLIC_DESIGN_V2=true e valide:

Para cada tela (Dashboard, Phase 1-6, Summary, PhaseLayout, Nav):
1. Fidelidade visual com screen.png do Stitch
2. Componentes Atlas usados corretamente
3. Tokens corretos (cores, tipografia, espaçamento)
4. Responsivo (375px, 768px, 1440px)
5. Contraste WCAG AA
6. Touch targets ≥ 44px
7. Focus dual (teal border + amber ring)
8. prefers-reduced-motion respeitado

Teste o fluxo completo:
Login → Dashboard → Criar Expedição → Fase 1 → 2 → 3 → 4 → 5 → 6 → Sumário

Se tudo aprovado, confirme para removermos o código V1 e as feature flags.
Emita parecer final.
```

---

### ETAPA 6 — Fechar Sprint + Remover V1

```
@tech-lead

UX Designer aprovou todas as telas.

1. Remova o código V1 de todas as telas migradas
2. Remova o DesignBranch wrapper — V2 é o único code path
3. Remova o feature flag system (NEXT_PUBLIC_DESIGN_V2)
4. Rode npm run build — deve compilar clean
5. Rode npm run test — todos testes devem passar
6. Atualize testes que referenciavam V1

Gere sprint review em docs/sprint-reviews/SPRINT-40-REVIEW.md
```

```
@release-manager

Crie a release v0.35.0-rc com tag e changelog.
Título: "Phases 1-6 + Dashboard V2 — Release Candidate"
Escopo: Todas telas internas migradas para Design V2.
Nota: Código V1 removido. Single code path.
```

```bash
git push origin main --tags
```
