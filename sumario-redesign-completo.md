# Atlas — Redesign Tela de Sumário/Resumo da Viagem

> **Processo SDD completo | Sprint 41**
> **Objetivo:** Redesenhar a tela de Sumário para mostrar TODAS as informações 
> coletadas durante as Fases 1-6, de forma visual e útil.

---

## PARTE 1 — Prompt para Claude Code (PO + UX definem spec)

Cole este prompt no Claude Code PRIMEIRO, antes de ir ao Stitch:

```
@product-owner @ux-designer

Redesign da tela de Sumário/Resumo da Expedição.

A tela atual não mostra todas as informações coletadas durante 
as 6 fases. Precisamos redesenhar do zero.

PASSO 1 — PO define O QUE deve aparecer no Sumário.

Para cada fase, liste TODAS as informações coletadas que devem 
aparecer no resumo final:

FASE 1 — A INSPIRAÇÃO:
- Cidade de origem
- Cidade de destino (+ país)
- Data de ida
- Data de volta
- Duração da viagem (X dias)
- Número de viajantes (adultos, crianças, bebês, idosos)
- Total de passageiros

FASE 2 — O PERFIL:
- Tipo de viajante (Solo, Casal, Família, Grupo, Negócios, Estudante)
- Estilos de viagem selecionados (Praia, Cultura, Gastronomia, etc.)
- Faixa de orçamento (Econômico, Moderado, Premium) + valor em R$
- Tipo de hospedagem preferida (Hotel, Airbnb, Hostel, etc.)
- Ritmo de viagem (Tranquilo ou Intenso)
- Restrições alimentares (se informadas)
- Interesses e hobbies (se informados)
- Nível de condicionamento físico (se informado)

FASE 3 — O PREPARO:
- Progresso do checklist (X/Y itens completos)
- Itens obrigatórios pendentes
- Itens recomendados pendentes
- Itens adicionados manualmente

FASE 4 — A LOGÍSTICA:
- Transporte principal (Avião, Ônibus, Carro, Trem)
- Transporte local selecionado
- Hospedagem: tipo, check-in, check-out
- Mobilidade local: opções selecionadas
- Aluguel de carro (Sim/Não)
- Status de cada step (completo ou "Ainda não decidi")

FASE 5 — GUIA DO DESTINO:
- Status: gerado ou não
- Resumo das informações principais (segurança, custos, clima)
- Atrações destacadas

FASE 6 — O ROTEIRO:
- Status: gerado ou não
- Número de dias no roteiro
- Total de atividades planejadas
- Custo estimado total
- Destaques por dia

GAMIFICAÇÃO:
- Pontos Atlas ganhos nesta expedição
- Badges conquistados durante o planejamento
- Fase atual / total de fases concluídas

O PO deve produzir: SPEC-SUMARIO-CONTEUDO.md

PASSO 2 — UX Designer define COMO organizar visualmente.

Com base na spec do PO, definir:
- Layout da página (seções, cards, grid)
- Hierarquia visual (o que tem mais destaque)
- Componentes Atlas a usar
- Tokens de cor/tipografia
- Breakpoints responsivos
- Quais informações agrupam em cards
- Ações disponíveis (Exportar PDF, Compartilhar, Editar, 
  Voltar ao Dashboard)

O UX deve produzir: UX-SPEC-SUMARIO.md

Produzam os 2 documentos AGORA.
```

---

## PARTE 2 — Prompt para o Google Stitch

Após PO e UX produzirem as specs, cole este prompt no Stitch:

### Design Context (se necessário)

```
DESIGN CONTEXT — Atlas Travel Planner

Atlas is a Brazilian AI-powered travel planning web app (Next.js + Tailwind CSS).
UI language is Brazilian Portuguese.

Design system:
- Fonts: Plus Jakarta Sans (headlines) + Work Sans (body)
- Primary: Navy (#040d1b), Orange CTA (#fe932c) with navy text
- Teal for links (#005049), Surface white (#ffffff), Gray bg (#f5f5f5)
- Border radius: 16px cards, 8px inputs, full for badges/chips
- Shadows: Soft layered
- WCAG 2.1 AA compliance, touch targets 44px minimum
- Light mode only

This screen must be cohesive with: Landing Page, Login, Dashboard, 
Phase wizards (1-6), and Destination Guide (bento grid style).
```

### Prompt do Sumário

```
Design a comprehensive trip summary/overview screen for "Atlas" travel planning app.
This is the "Sumário da Expedição" (Expedition Summary). Desktop layout, 1440px wide.
All text in Brazilian Portuguese. This is the FINAL screen of the planning process — 
it must show ALL information collected across 6 phases in a beautiful, scannable format.
The user should feel proud of their planning and excited about their trip.

LAYOUT: Full width with sidebar navigation (same PhaseLayout as other phases)

LEFT SIDEBAR (220px, sticky)
- Phase progress: 8 phases vertical
  - Phases 1-6: completed (teal circles with checkmarks)
  - Phases 7-8: locked (gray with lock, "Em Breve")
- Breadcrumb: "Expedições / [Trip Name] / Sumário"

MAIN CONTENT (scrollable, max-width ~1100px)

═══════════════════════════════════════════════════
SECTION 1 — TRIP HEADER (hero-style, full width)
═══════════════════════════════════════════════════
- Large destination photo as background (from Unsplash, same as Dashboard)
- Dark gradient overlay for text readability
- Top-right: Status badge "✅ Planejamento Completo" in teal (or "🔄 Em Andamento" in orange)
- Bottom content over image:
  - Trip name large: "Expedição Fortaleza 2026"
  - Route: "São Paulo → Fortaleza, Ceará, Brasil"
  - Details row with icons: "📅 29 Mar - 04 Abr 2026  •  ⏱️ 6 dias  •  👥 7 viajantes  •  👨‍👩‍👧 Família"
- Action buttons row below the hero (not over image):
  "📥 Exportar PDF" (outlined) | "📤 Compartilhar" (outlined) | "✏️ Editar Expedição" (ghost)

═══════════════════════════════════════════════════
SECTION 2 — PROGRESS OVERVIEW (horizontal strip)
═══════════════════════════════════════════════════
- Phase progress bar showing all 8 phases horizontally with status:
  Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅ | Phase 5 ✅ | Phase 6 ✅ | Phase 7 🔒 | Phase 8 🔒
- "6 de 8 etapas concluídas" text
- Each completed phase is clickable (takes user back to that phase)
- Below: Gamification bar showing PA earned: "🏆 +180 Pontos Atlas ganhos nesta expedição"

═══════════════════════════════════════════════════
SECTION 3 — TRIP DETAILS GRID (bento-style, 2 columns)
═══════════════════════════════════════════════════

ROW 1 — Two cards side by side:

  LEFT CARD — "📍 Destino e Datas" (from Phase 1)
  ┌─────────────────────────────────────────┐
  │ 📍 Destino e Datas                      │
  │                                         │
  │ Origem:     São Paulo, SP               │
  │ Destino:    Fortaleza, Ceará, Brasil    │
  │ Ida:        29 de Março de 2026         │
  │ Volta:      04 de Abril de 2026        │
  │ Duração:    6 dias                      │
  │ Viajantes:  2 adultos, 3 crianças,     │
  │             1 idoso, 1 bebê = 7 total   │
  └─────────────────────────────────────────┘

  RIGHT CARD — "👤 Perfil do Viajante" (from Phase 2)
  ┌─────────────────────────────────────────┐
  │ 👤 Perfil do Viajante                   │
  │                                         │
  │ Tipo:        Família                    │
  │ Estilos:     🏖️ Praia  🍕 Gastronomia  │
  │              🏛️ Cultura                 │
  │ Ritmo:       🐢 Tranquilo              │
  │ Orçamento:   💰 Econômico (R$ 1.000)   │
  │ Hospedagem:  🏨 Hotel                  │
  │ Restrições:  Sem glúten                │
  │ Interesses:  ⚽ Futebol, 📸 Fotografia │
  └─────────────────────────────────────────┘

ROW 2 — Two cards side by side:

  LEFT CARD — "🚗 Logística" (from Phase 4)
  ┌─────────────────────────────────────────┐
  │ 🚗 Logística                            │
  │                                         │
  │ Transporte principal:  ✈️ Avião         │
  │ Mobilidade local:     🚕 Táxi/App      │
  │                       🚌 Transporte Púb │
  │ Hospedagem:           Hotel Centro     │
  │   Check-in:  29/03    Check-out: 04/04 │
  │ Aluguel de carro:     Não              │
  │                                         │
  │ ⚠️ Transporte: Ainda não definido      │
  │ (se o usuário marcou "Ainda não decidi")│
  └─────────────────────────────────────────┘

  RIGHT CARD — "✅ Checklist de Preparo" (from Phase 3)
  ┌─────────────────────────────────────────┐
  │ ✅ Checklist de Preparo                  │
  │                                         │
  │ Progresso: ████████░░ 80%               │
  │ 8/10 itens completos                    │
  │                                         │
  │ Obrigatórios: 4/5 ✅                    │
  │ Recomendados: 3/4 ✅                    │
  │ Manuais:      1/1 ✅                    │
  │                                         │
  │ ⚠️ Pendente: Seguro viagem             │
  │                                         │
  │ [Ver checklist completo →]              │
  └─────────────────────────────────────────┘

ROW 3 — Full width card:

  "🗺️ Guia do Destino" (from Phase 5 — compact summary)
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 🗺️ Guia do Destino: Fortaleza                                      │
  │                                                                     │
  │ 🌡️ Clima: 28-32°C   💱 Moeda: R$ (BRL)   🛡️ Segurança: ● Seguro  │
  │                                                                     │
  │ ⭐ Destaques: Praia de Iracema • Beach Park • Centro Dragão do Mar │
  │                                                                     │
  │ 💰 Custo médio diário: R$ 250-400/pessoa                           │
  │                                                                     │
  │ [Ver guia completo →]                                               │
  └─────────────────────────────────────────────────────────────────────┘

ROW 4 — Full width card:

  "📋 Roteiro" (from Phase 6 — compact overview)
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 📋 Roteiro: 6 dias de aventura                                     │
  │                                                                     │
  │ Dia 1: Chegada + Beira Mar          4 atividades  ~R$ 200          │
  │ Dia 2: Praia de Iracema + Centro    5 atividades  ~R$ 280          │
  │ Dia 3: Beach Park                   3 atividades  ~R$ 350          │
  │ Dia 4: Cumbuco + Kitesurf          4 atividades  ~R$ 300          │
  │ Dia 5: Centro Dragão + Compras     4 atividades  ~R$ 250          │
  │ Dia 6: Último dia + Aeroporto      2 atividades  ~R$ 150          │
  │                                                                     │
  │ Total: 22 atividades  •  Custo estimado: R$ 1.530/pessoa           │
  │                                                                     │
  │ [Ver roteiro completo →]                                            │
  └─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════
SECTION 4 — BUDGET OVERVIEW (visual card)
═══════════════════════════════════════════════════
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 💰 Orçamento Estimado                                              │
  │                                                                     │
  │ ┌──────────────┬──────────────┬──────────────┬──────────────┐      │
  │ │  Transporte  │  Hospedagem  │  Alimentação │   Atividades │      │
  │ │   R$ 2.800   │   R$ 3.600   │   R$ 1.800   │   R$ 1.200  │      │
  │ │     30%      │     38%      │     19%      │     13%     │      │
  │ └──────────────┴──────────────┴──────────────┴──────────────┘      │
  │                                                                     │
  │ [Donut chart visualization showing breakdown]                       │
  │                                                                     │
  │ Total estimado: R$ 9.400 (R$ 1.343/pessoa)                         │
  │ Orçamento definido: R$ 1.000/pessoa                                │
  │ ⚠️ Acima do orçamento em R$ 343/pessoa                             │
  └─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════
SECTION 5 — GAMIFICATION (compact strip)
═══════════════════════════════════════════════════
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 🏆 Conquistas desta Expedição                                      │
  │                                                                     │
  │ +180 Pontos Atlas  •  Nível 9: Desbravador  •  2 badges            │
  │ [🎖️ Primeira Viagem]  [🎖️ Explorador do Nordeste]                  │
  │                                                                     │
  │ Próximo nível: Nível 10 (675 pts faltantes)  ████████░░ 55%        │
  └─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════
SECTION 6 — ACTIONS & ALERTS
═══════════════════════════════════════════════════
- If any phase has "Ainda não decidi": amber alert card listing pending items
- If checklist has pending obligatory items: red alert
- Timestamps: "Última atualização: 27 Mar 2026, 14:30"
- Disclaimer: "Custos são estimativas geradas por IA. Valores reais podem variar."

BOTTOM ACTION BAR (sticky):
- Left: "← Voltar para Roteiro" (ghost button)
- Center: "Sumário da Expedição"
- Right: "Voltar ao Dashboard →" (primary button, orange)

FOOTER V2 (standard)

═══════════════════════════════════════════════════
DESIGN REQUIREMENTS
═══════════════════════════════════════════════════
- This is a CELEBRATION page — the user finished planning!
  Visual should feel accomplished, not like another form.
- Hero with destination photo creates emotional connection
- Cards use consistent style: white bg, 16px border-radius, soft shadow
- Icons in every heading add personality and scannability
- Progress indicators (bars, percentages) give sense of completion
- Alert states (amber for pending, red for required) are actionable
- Budget visualization with donut chart is the visual centerpiece
- Responsive: cards stack to single column on mobile, hero stays full width
- All data is REAL (pulled from database, not mocked)
- Links "Ver completo →" navigate back to the respective phase
- The overall feeling: "I planned an amazing trip and I'm ready to go!"
```

---

## PARTE 3 — Prompt para Claude Code (implementação SDD)

Após gerar no Stitch, exportar e commitar, cole este prompt:

```
@product-owner @ux-designer @tech-lead

REDESIGN COMPLETO — Tela de Sumário da Expedição.
Processo SDD — mesmo rigor da Fase 5 e Fase 6.

Protótipo: docs/design/stitch-exports/summary_expedicao/

PASSO 1 — SPECS (antes de codar):

A) PO: SPEC-SUMARIO-CONTEUDO.md já produzido. Revisar e aprovar.

B) UX Designer:
   - Comparar protótipo Stitch com implementação atual
   - Criar UX-CHECKLIST-SUMARIO.md com critérios pass/fail
   - Definir componentes Atlas, tokens, breakpoints
   - Checklist cobre: desktop 1440px, tablet 768px, mobile 375px

C) Tech Lead: revisar e aprovar specs antes da implementação.

PASSO 2 — IMPLEMENTAÇÃO:

A) APAGAR componente atual do Sumário completamente.
B) REESCREVER do zero seguindo protótipo Stitch.
C) Todos os dados devem ser REAIS (do banco, não mock):
   - Fase 1: trip.origin, trip.destination, trip.startDate, 
     trip.endDate, trip.travelers
   - Fase 2: trip.travelStyle, trip.budget, trip.accommodation,
     trip.pace, trip.dietary, trip.interests
   - Fase 3: trip.checklist (progresso, itens pendentes)
   - Fase 4: trip.transport, trip.mobility, trip.accommodation dates
   - Fase 5: trip.guide (status, highlights)
   - Fase 6: trip.itinerary (dias, atividades, custos)
   - Gamificação: user.level, user.points, user.badges

PASSO 3 — TESTES:
A) Testes unitários: renderização de cada seção, dados vazios, 
   dados parciais, dados completos
B) E2E: fluxo completo até o sumário, verificar dados corretos
C) Rodar suite E2E completa — zero regressões

PASSO 4 — UX Designer valida ANTES do merge.
"APROVADO" ou "REJEITADO" explícito.

PASSO 5 — Tech Lead: build + test + E2E.

PASSO 6 — PO review final no staging.

PASSO 7 — Sprint review documentado.
```

---

## PARTE 4 — Checklist de Validação Final

Usar este checklist no PO review (Passo 6):

```
SUMÁRIO — CHECKLIST PO REVIEW:

HEADER:
- [ ] Foto do destino (Unsplash, não gradiente)
- [ ] Nome da expedição
- [ ] Rota (origem → destino)
- [ ] Detalhes (datas, duração, viajantes, tipo)
- [ ] Status badge (Completo ou Em Andamento)
- [ ] Botões de ação (Exportar, Compartilhar, Editar)

PROGRESSO:
- [ ] 8 fases com status correto
- [ ] Fases clicáveis (navega para a fase)
- [ ] PA ganhos nesta expedição

FASE 1 — DESTINO E DATAS:
- [ ] Origem correta
- [ ] Destino correto
- [ ] Datas corretas
- [ ] Duração calculada
- [ ] Viajantes (adultos, crianças, idosos, bebês)

FASE 2 — PERFIL:
- [ ] Tipo de viajante
- [ ] Estilos de viagem (chips)
- [ ] Orçamento (faixa + valor)
- [ ] Hospedagem preferida
- [ ] Ritmo
- [ ] Restrições alimentares
- [ ] Interesses

FASE 3 — CHECKLIST:
- [ ] Progresso (barra + porcentagem)
- [ ] Itens obrigatórios vs recomendados
- [ ] Pendências destacadas
- [ ] Link "Ver checklist completo"

FASE 4 — LOGÍSTICA:
- [ ] Transporte principal
- [ ] Mobilidade local
- [ ] Hospedagem com datas
- [ ] Aluguel de carro
- [ ] Alertas "Ainda não decidi"

FASE 5 — GUIA:
- [ ] Resumo compacto (clima, moeda, segurança)
- [ ] Destaques/atrações
- [ ] Custo médio diário
- [ ] Link "Ver guia completo"

FASE 6 — ROTEIRO:
- [ ] Resumo por dia (tema, atividades, custo)
- [ ] Total de atividades
- [ ] Custo estimado total
- [ ] Link "Ver roteiro completo"

ORÇAMENTO:
- [ ] Breakdown por categoria
- [ ] Visualização (donut chart ou barras)
- [ ] Total vs orçamento definido
- [ ] Alerta se acima do orçamento

GAMIFICAÇÃO:
- [ ] PA ganhos
- [ ] Nível atual
- [ ] Badges conquistados
- [ ] Progresso para próximo nível

ALERTAS:
- [ ] Itens pendentes destacados
- [ ] Timestamp da última atualização
- [ ] Disclaimer de IA
```
