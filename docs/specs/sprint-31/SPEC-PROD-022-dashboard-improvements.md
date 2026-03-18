---
spec-id: SPEC-PROD-022
title: Dashboard Improvements — Phase States, Quick Access & Report Generation
version: 1.0.0
status: Draft
author: product-owner
sprint: 31
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-022: Dashboard Improvements — Phase States, Quick Access & Report Generation

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-17
**Sprint**: 31
**Relacionado a**: SPEC-PROD-023 (Phase Completion Logic — fonte de verdade dos estados), SPEC-PROD-016 (Navigation System, Sprint 30)
**Requisitos de negocio cobertos**: REQ-004, REQ-007, REQ-008, REQ-010, REQ-011, REQ-012

---

## Contexto: Por que Este Documento Existe

O dashboard de expedicoes (/expeditions) e a primeira tela que o usuario ve apos login. Atualmente, os cards de expedicao comunicam progresso apenas via barra de segmentos e um contador de fases ("Fase 3 de 6"). Essa representacao e ambigua: nao distingue entre uma fase em andamento e uma fase nao iniciada, nao indica quais ferramentas foram geradas (checklist, guia), e nao oferece atalhos para retornar rapidamente a uma ferramenta especifica.

Os 6 requisitos de negocio coletados definem melhorias claras e incrementais ao card existente. Este spec consolida todos eles para evitar multiplas implementacoes concorrentes no mesmo componente.

**Relacao com SPEC-PROD-023**: Este spec define O QUE exibir no card. SPEC-PROD-023 define as regras de negocio para calcular os estados. A implementacao deste spec depende de SPEC-PROD-023 estar aprovada e implementada.

---

## User Story

As a @leisure-solo or @leisure-family,
I want to see at a glance which phases are done, what tools I have available, and navigate directly to a specific tool from the expeditions dashboard,
so that I spend zero time hunting for where I was and can immediately continue where I left off.

---

## Contexto do Traveler

- **Pain point**: Usuario retorna ao app 3 dias apos criar o checklist. Precisa lembrar em qual fase estava, se o guia foi gerado, e onde fica o itinerario. Atualmente nao ha atalhos — precisa entrar na expedicao e navegar manualmente ate a ferramenta.
- **Workaround atual**: Usuarios vao para a expedicao e clicam nas fases uma por uma ate encontrar o que procuram.
- **Frequencia**: Em toda sessao de retorno (estimado: 60%+ das sessoes nao sao de criacao mas de continuacao).

---

## Requisitos Funcionais

### REQ-004 / RF-001 — Estados visuais de fase no card

O `DashboardPhaseProgressBar` atual exibe segmentos em atlas-gold (concluido) ou primary (atual). Este requisito expande o vocabulario visual para 4 estados explicitamente distintos:

| Estado | Cor | Criterio (definido em SPEC-PROD-023) |
|---|---|---|
| Concluida | Verde (#10B981 / `atlas-teal`) | Todos os dados obrigatorios da fase preenchidos/gerados |
| Em andamento | Amarelo/ambar (#F59E0B / `atlas-gold`) | Fase iniciada mas incompleta |
| Pendente | Cinza (#6B7280 / `muted-foreground`) | Fase nao iniciada |
| Atual | Azul (`primary`) | Fase que o usuario esta visualizando agora (currentPhase) |

A barra de progresso de fase no card deve refletir esses 4 estados. Fases 7 e 8 continuam exibidas com estilo "coming soon" (dashed border, opacidade reduzida).

### REQ-008 / RF-002 — Label de status textual no card

O card exibe, abaixo do nome do destino, um label de status textual claro. Exemplos:

- "Em andamento — Fase 3 de 6"
- "Planejando — Fase 1 de 6"
- "Pronta para embarcar — Todas as fases concluidas"

O label atual ("X fases concluidas") e substituido por esse formato mais contextual. Os textos devem ter traducoes em PT-BR e EN.

### REQ-007 / RF-003 — Botao "Gerar Relatorio"

Quando uma expedicao tem as fases 3 (O Preparo — checklist), 5 (Guia do Destino) e 6 (O Roteiro — itinerario) com conteudo gerado, o card exibe um botao "Gerar Relatorio" (ou link equivalente).

O botao navega para `/expedition/[tripId]/summary` onde o relatorio consolidado ja existe (implementado em Sprint 26 via SPEC-PROD-007). O botao so aparece quando as tres ferramentas de conteudo AI (checklist, guia, itinerario) foram geradas — nao basta as fases estarem "concluidas" no sentido de SPEC-PROD-023; o conteudo AI deve existir.

Criterio tecnico: `checklistGenerated AND guideGenerated AND itineraryGenerated`.

### REQ-010 / RF-004 — Quick access a ferramentas

O card exibe uma secao de "acesso rapido" com links diretos para as ferramentas disponiveis da expedicao. Ferramentas aparecem apenas quando o conteudo correspondente foi gerado:

| Ferramenta | Condicao de exibicao | Destino |
|---|---|---|
| Checklist | Phase 3 gerou checklist | `/expedition/[tripId]/phase-3` |
| Guia do Destino | Phase 5 gerou guia | `/expedition/[tripId]/phase-5` |
| Roteiro | Phase 6 gerou itinerario | `/expedition/[tripId]/phase-6` |
| Logistica | Phase 4 tem >= 1 entry (transport ou accommodation) | `/expedition/[tripId]/phase-4` |

Os links aparecem como chips ou botoes compactos dentro do card. Maximo de 4 links simultaneos.

### REQ-011 / RF-005 — Link "Ver Checklist" no card

Quando a Phase 3 tem checklist gerado, o card exibe um link "Ver Checklist" de acesso direto. Este requisito e um subset de RF-004 (REQ-010) mas e listado separadamente por ter sido solicitado como item independente. A implementacao de RF-004 satisfaz este requisito.

**Nota de implementacao**: RF-005 nao cria comportamento separado — e satisfeito pela implementacao do link de Checklist em RF-004.

### REQ-012 / RF-006 — Link "Ver Guia" no card

Quando a Phase 5 tem guia gerado, o card exibe um link "Ver Guia" de acesso direto. Identico ao caso do checklist. A implementacao de RF-004 satisfaz este requisito.

**Nota de implementacao**: RF-006 nao cria comportamento separado — e satisfeito pela implementacao do link de Guia em RF-004.

---

## Requisitos de UX

### RF-007 — Card compacto por padrao

O card deve manter densidade visual adequada. Com a adicao de quick-access links, o card nao pode crescer verticalmente de forma irrestrita. O design deve:
- Exibir os quick-access links apenas se existirem (nenhum espaco reservado quando vazio)
- Usar chips compactos (altura maxima 28px) para os links
- O botao "Gerar Relatorio" aparece apenas quando qualificado — nao reserva espaco visual quando ausente

### RF-008 — Estados vazios coerentes

Em expedicoes recém criadas (Phase 1 apenas, sem ferramentas), o card nao exibe a secao de quick-access nem o botao de relatorio. O card mostra apenas destino, datas, label de status e barra de progresso.

---

## Criterios de Aceite

- **AC-001**: Dado uma expedicao com Phase 1 e Phase 2 concluidas e Phase 3 em andamento, quando o card e renderizado, entao a barra de progresso exibe Phase 1 em verde, Phase 2 em verde, Phase 3 em amarelo, e Phases 4-6 em cinza.
- **AC-002**: Dado uma expedicao em que a phase atual (currentPhase) e 4, quando o card e renderizado, entao o segmento 4 e exibido na cor azul (estado "Atual"), independente de estar concluida ou nao.
- **AC-003**: Dado uma expedicao com todas as 6 fases concluidas, quando o card e renderizado, entao todos os 6 segmentos sao exibidos em verde e o label de status exibe "Pronta para embarcar — Todas as fases concluidas" (PT-BR) ou equivalente EN.
- **AC-004**: Dado uma expedicao com Phase 1 nao iniciada, quando o card e renderizado, entao o label de status exibe "Planejando — Fase 1 de 6".
- **AC-005**: Dado uma expedicao com checklist gerado (Phase 3), guia gerado (Phase 5) e itinerario gerado (Phase 6), quando o card e renderizado, entao o botao "Gerar Relatorio" e exibido e ao clicar navega para `/expedition/[tripId]/summary`.
- **AC-006**: Dado uma expedicao com checklist gerado mas SEM guia gerado, quando o card e renderizado, entao o botao "Gerar Relatorio" NAO e exibido.
- **AC-007**: Dado uma expedicao com checklist gerado, quando o card e renderizado, entao um chip/link "Ver Checklist" aparece na secao de quick-access apontando para `/expedition/[tripId]/phase-3`.
- **AC-008**: Dado uma expedicao com guia gerado, quando o card e renderizado, entao um chip/link "Ver Guia" aparece na secao de quick-access apontando para `/expedition/[tripId]/phase-5`.
- **AC-009**: Dado uma expedicao com itinerario gerado, quando o card e renderizado, entao um chip/link "Ver Roteiro" aparece na secao de quick-access apontando para `/expedition/[tripId]/phase-6`.
- **AC-010**: Dado uma expedicao recém criada (apenas Phase 1 iniciada, nenhuma ferramenta gerada), quando o card e renderizado, entao a secao de quick-access NAO e exibida e nenhum espaco vazio reservado e visivel.
- **AC-011**: Dado viewport de 375px, quando o card e renderizado com 3 quick-access links, entao todos os chips sao visiveis sem overflow horizontal e cada chip tem area de toque >= 44px de altura.
- **AC-012**: Dado um screen reader, quando o usuario foca o card, entao os chips de quick-access sao anunciados com labels descritivos (ex: "Ver Checklist — Expedicao Paris") e nao apenas com o texto do chip.
- **AC-013**: Dado uma expedicao com Phase 4 com pelo menos 1 entrada de transporte ou acomodacao, quando o card e renderizado, entao um chip "Logistica" aparece na secao de quick-access.
- **AC-014**: Dado o dashboard com 5 cards de expedicao, quando todos os cards sao renderizados, entao o tempo de renderizacao total do dashboard nao excede 2 segundos em conexao 4G.
- **AC-015**: Dado uma expedicao com status label em PT-BR e o usuario muda o locale para EN, entao o status label e os labels dos chips sao exibidos em ingles.

---

## Fora do Escopo (v1 desta spec)

- Reordenacao manual dos cards por drag-and-drop
- Filtro de cards por status no dashboard (item separado, pode ser Sprint 32)
- Notificacoes push quando uma ferramenta AI termina de gerar
- Paginacao do dashboard quando ha mais de 20 expedicoes (regra atual: max 20 ativas)
- Preview inline do conteudo da ferramenta (ex: primeiras linhas do itinerario no card)

---

## Metricas de Sucesso

| Metrica | Baseline | Meta | Prazo |
|---------|----------|------|-------|
| Taxa de acesso a ferramentas via quick-access vs navegacao manual | 0% (feature inexistente) | >= 40% dos acessos a ferramentas | Sprint 32 |
| Tempo medio para retornar a uma ferramenta existente | Desconhecido | <= 10 segundos desde /expeditions | Sprint 32 |
| Click-through em "Gerar Relatorio" (entre usuarios qualificados) | N/A | >= 25% | Sprint 32 |

---

## Dependencias

- **SPEC-PROD-023** (Phase Completion Logic): deve ser aprovada e implementada ANTES da implementacao deste spec — os estados de fase no card dependem do modelo de calculo definido em SPEC-PROD-023
- **SPEC-UX-XXX** (a criar): especificacao visual do card expandido (layout dos chips, posicao do botao de relatorio, tratamento de overflow)
- **`ExpeditionCard.tsx`** e **`DashboardPhaseProgressBar.tsx`**: componentes que serao modificados

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — consolida REQ-004, REQ-007, REQ-008, REQ-010, REQ-011, REQ-012 para Sprint 31 |
