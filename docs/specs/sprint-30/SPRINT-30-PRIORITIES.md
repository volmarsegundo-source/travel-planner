# Sprint 30 — Prioridades e Planejamento

**Versao**: 1.0.0
**Data**: 2026-03-17
**Autor**: product-owner
**Status do produto**: v0.23.0 / v0.24.0 em planejamento
**Budget**: 40–50h
**Contexto critico**: Beta launch bloqueado por crise de navegacao (60%+ falha manual). Sprint 30 e o sprint de desbloqueio.

---

## Situacao Atual

Sprint 29 entregou v0.22.0 com 1776 testes. Em seguida, o Sprint 30 pre-planning identificou que a navegacao de fases esta arquiteturalmente quebrada: SPEC-PROD-001 marcada "Implemented" com apenas 7/18 ACs passando em QA. Os mesmos 5 bugs de navegacao (NAV-001 a NAV-007) continuam recorrendo depois de 5+ sprints de tentativas de correcao.

SPEC-PROD-016 documenta o modelo de estados definitivo e os requisitos de navegacao completos. Nenhum rewrite de feature deve comecar antes que a navegacao esteja estavel — features construidas em cima de navegacao quebrada acumulam retrabalho.

---

## Hierarquia de Prioridade do Sprint 30

```
P0 — Navegacao (bloqueante de beta)
  |
  v
P1 — Bugs de staging identificados (bloqueantes de QA)
  |
  v
P2 — Rewrites de produto (SPEC-PROD-017 a 020)
  |
  v
P3 — Bugs cosmeticos / melhorias menores
```

---

## P0 — SPEC-PROD-016: Phase Navigation System

**Nao e negociavel. Este item nao sai do sprint.**

| Item | Spec | Estimativa | Criterio de conclusao |
|------|------|------------|----------------------|
| Implementar modelo de estados (NOT_STARTED / IN_PROGRESS / COMPLETED) | SPEC-PROD-016, Secao 1 | 4h | Estados persistidos corretamente no banco |
| Resolver NAV-001 (guards bloqueando navegacao valida) | AC-031/032 | 3h | Todos os testes manuais de navegacao retrograda passam |
| Resolver NAV-002 (formulario vazio ao revisitar fase) | AC-018 a AC-021 | 4h | Dados pre-carregados em 100% das revisitas |
| Resolver NAV-006 (Phase 6 sem botao Voltar) | AC-009/010 | 2h | Botao Voltar presente e funcional em Phase 6 |
| Resolver NAV-003 (barra de progresso inconsistente) | AC-001 a AC-008 | 3h | Barra reflete estados corretos apos cada acao |
| Resolver NAV-007 (barra inativa apos conclusao) | AC-022/023 | 2h | Barra exibe COMPLETED para todas as fases apos concluir Phase 6 |
| Dialogo de alteracoes nao salvas ao clicar Voltar | AC-013 | 2h | Dialogo aparece quando ha alteracoes, nao aparece quando nao ha |
| Validacao QA manual de navegacao (full pass) | — | 3h | Taxa de falha manual <= 5% |

**Total P0**: ~23h
**Responsaveis sugeridos**: dev-fullstack-1 (motor de estados, guards), dev-fullstack-2 (barra de progresso, dialogo), qa-engineer (validacao manual)

**Nota sobre phase-config.ts**: O arquivo define 8 fases mas o produto ativo tem 6. O tech-lead deve confirmar se os nomes das fases 5 e 6 no config ("Guia do Destino" e "O Roteiro") estao alinhados com os nomes canonicos. A fase 5 em versoes anteriores tinha nome diferente ("A Conexao", "O Mapa dos Dias"). O config atual (v0.23.0) mostra "Guia do Destino" para Phase 5 — confirmar se este e o nome final antes da implementacao de SPEC-PROD-016.

---

## P1 — Bugs de Staging Identificados

Estes bugs foram identificados em ambiente de staging e bloqueiam sign-off de QA para beta.

### BUG-S30-001: Phase 3 -> 4 advance timeout

**Descricao**: Em staging, o avanco de Phase 3 para Phase 4 ocasionalmente falha com timeout. Nao reproduzivel localmente de forma consistente.
**Impacto**: @leisure-solo e @leisure-family ficam presos na Phase 3. Workaround: recarregar a pagina e tentar novamente — nao aceitavel para beta.
**Hipotese**: A geracao de checklist por AI na Phase 3 bloqueia a navegacao (await nao resolvido antes do redirect). Pode ser relacionado a NAV-001.
**Prioridade no Sprint**: Resolver junto com P0 de navegacao — provavelmente mesma causa raiz.
**Estimativa**: 2h (investigacao) + 2h (correcao) se for causa separada de NAV-001
**AC de aceite**: Phase 3 -> 4 avanca em <= 5 segundos em 100% das tentativas em staging.

### BUG-S30-002: Guide cards com altura nao uniforme

**Descricao**: Na Phase 5 (Guia do Destino), os cards de categorias do guia tem alturas variaveis baseadas no tamanho do conteudo, criando grade irregular.
**Impacto**: Visual — nao bloqueia funcionalidade. Mas foi reportado em todos os ciclos de teste manual desde Sprint 26. Acumulo de 4+ sprints = deve ser resolvido agora.
**Spec relacionada**: SPEC-UX-010 (Guide Card Uniformity, Draft)
**Estimativa**: 2h
**AC de aceite**: Todos os cards do guia tem altura identica independente do volume de conteudo. Conteudo que nao cabe e truncado com reticencias.

### BUG-S30-003: Profile menu positioning

**Descricao**: Em determinadas resolucoes (especialmente 768px-1024px), o dropdown do menu de perfil no header e posicionado parcialmente fora da tela ou sobrepoe outros elementos.
**Impacto**: @business-traveler e usuarios de tablet nao conseguem acessar configuracoes de perfil sem rolar.
**Estimativa**: 1h
**AC de aceite**: Dropdown do menu de perfil e sempre completamente visivel em viewports de 375px, 768px, 1024px, e 1280px.

### BUG-S30-004: Gamification points display

**Descricao**: O total de pontos exibido no header nao e atualizado em tempo real apos conclusao de uma fase. Requer refresh da pagina para mostrar os pontos ganhos.
**Impacto**: Quebra o loop de gratificacao da gamificacao — usuario completa fase e nao ve recompensa imediatamente.
**Spec relacionada**: SPEC-ARCH-006 (Real-time Gamification in Header, Draft)
**Estimativa**: 3h
**AC de aceite**: Pontos no header sao atualizados em <= 2 segundos apos save bem-sucedido de uma fase, sem refresh de pagina.

### BUG-S30-005: Date fields mandatory enforcement

**Descricao**: Em Phase 1, os campos de data de inicio e fim sao obrigatorios segundo SPEC-PROD-001 mas podem ser submetidos vazios em determinados fluxos (quando o usuario limpa o campo apos ter preenchido anteriormente).
**Impacto**: Expedicoes criadas sem data geram erros downstream na Phase 3 (classificacao de viagem) e Phase 6 (geracao de itinerario com datas).
**Estimativa**: 2h
**AC de aceite**: Nao e possivel avancar de Phase 1 com campos de data vazios. Mensagem de erro inline aparece imediatamente ao tentar avancar.

**Total P1**: ~12h (assumindo BUG-S30-001 resolvido junto com P0)

---

## P2 — Rewrites de Produto (Specs Novas)

Os 4 rewrites definidos nas specs SPEC-PROD-017 a 020 sao de alta importancia para qualidade beta mas sao secundarios a estabilidade de navegacao. Devem ser iniciados somente se P0 e P1 estiverem concluidos dentro do budget.

### Analise de viabilidade dentro do Sprint 30

| Spec | Titulo | Estimativa total | Viavel no Sprint 30? |
|------|--------|-----------------|----------------------|
| SPEC-PROD-017 | Autocomplete Rewrite | 8–12h | Parcial — depende de SPEC-ARCH de provedor |
| SPEC-PROD-018 | Meu Atlas Map | 12–16h | Nao — dependencias nao resolvidas |
| SPEC-PROD-019 | Expedicoes Dashboard | 8–10h | Sim, se P0+P1 cabem no budget |
| SPEC-PROD-020 | Summary Report | 10–14h | Parcial — link de compartilhamento e PDF separados |

**Recomendacao do PO**:

Com P0 em ~23h e P1 em ~12h, restam ~10–15h de budget para P2.

**Incluir no Sprint 30**:
1. **SPEC-PROD-019** (Expedicoes Dashboard): menor dependencia externa, maior impacto imediato em beta. Estimativa 8–10h. Iniciar na segunda semana do sprint.
2. **SPEC-PROD-017 scope reduzido** (Autocomplete): implementar apenas os RFs que nao dependem de decisao de provedor — formato de resultado (RF-002), buscas recentes (RF-003), debounce/velocidade (RF-005), overlay mobile (RF-009/010/011). Estimativa 5–6h se limitado a este escopo.

**Deferir para Sprint 31**:
- SPEC-PROD-018 (Meu Atlas): depende de SPEC-ARCH-007 (coordenadas) estar implementado. Coordenadas podem nao estar disponiveis para todos os usuarios em Sprint 30.
- SPEC-PROD-020 (Summary completo): funcionalidade de PDF e link de compartilhamento sao complexas (SPEC-ARCH nova necessaria). O summary base (SPEC-PROD-007) ja foi implementado — Sprint 30 pode incluir apenas a logica de impressao CSS (`@media print`), que e de baixo risco.

---

## P3 — Itens de Baixa Prioridade (Sprint 31+)

Estes itens sao importantes mas nao desbloqueiam beta:

- SPEC-PROD-018 completo (Meu Atlas interativo)
- SPEC-PROD-020 completo (PDF + link de compartilhamento)
- DEBT-S7-002, DEBT-S7-003, DEBT-S8-005 (debitos tecnicos acumulados)
- BUG-S7-001 (raw userId em logger)
- Fases 7-8 do phase-config.ts (roadmap futuro — nao interferem com MVP)

---

## Ordem de Sacrificio (se o budget estourar)

Na seguinte ordem, estes itens podem ser removidos do Sprint 30 sem bloquear beta:

1. SPEC-PROD-017 scope reduzido (autocomplete melhorias) — beta funciona com autocomplete atual
2. BUG-S30-002 (guide cards altura) — cosmético, nao bloqueia funcionalidade
3. BUG-S30-003 (profile menu) — workaround existe (scroll)
4. SPEC-PROD-019 (dashboard rewrite) — dashboard atual funciona

**Nao negociavel**: P0 completo (SPEC-PROD-016) e BUG-S30-001 (Phase 3->4 timeout) e BUG-S30-005 (datas obrigatorias).

---

## Criterio de GO/NO-GO para Beta Launch (Sprint 30 Review)

O beta launch pode receber GO se ao final do Sprint 30:

| Criterio | Threshold |
|----------|-----------|
| Taxa de falha em testes manuais de navegacao | <= 5% |
| SPEC-PROD-016 ACs passando em QA conformance | >= 16/18 (ACs cosmeticos podem pender) |
| BUG-S30-001 (Phase 3->4 timeout) | 0 reproductions em staging |
| BUG-S30-005 (datas obrigatorias) | Corrigido e testado |
| LGPD pages | Presentes e revisadas (entregues Sprint 28) |
| GeminiProvider (free tier) | Implementado (necessario para beta com usuarios reais) |

Se qualquer criterio P0 nao for atendido, o beta launch e automaticamente adiado para Sprint 31.

---

## Specs Criadas neste Sprint Planning

| Spec ID | Titulo | Status | Prioridade de implementacao |
|---------|--------|--------|----------------------------|
| SPEC-PROD-016 | Phase Navigation System | Draft | P0 imediato |
| SPEC-PROD-017 | Autocomplete Rewrite | Draft | P2 Sprint 30 (escopo reduzido) |
| SPEC-PROD-018 | Meu Atlas Interactive Map | Draft | P2 Sprint 31 |
| SPEC-PROD-019 | Expedicoes Dashboard Rewrite | Draft | P2 Sprint 30 |
| SPEC-PROD-020 | Expedition Summary & Trip Report | Draft | P2 Sprint 30 parcial / Sprint 31 completo |

**Proximas acoes de spec** (antes de implementacao):
- SPEC-ARCH para SPEC-PROD-017: decisao de provedor de autocomplete (Nominatim vs Google Places)
- SPEC-ARCH para SPEC-PROD-018: biblioteca de mapa interativo (Mapbox GL JS esta no stack)
- SPEC-ARCH para SPEC-PROD-020: token de link compartilhavel + estrategia de cache offline
- SPEC-UX para SPEC-PROD-017, 018, 019, 020: especificacoes visuais detalhadas

---

## Mapeamento de Bugs vs Specs Existentes

| Bug | Spec relacionada | Status da spec | Acao necessaria |
|-----|-----------------|----------------|-----------------|
| Phase 3->4 timeout | SPEC-PROD-016 (NAV-001) | Draft | Incluir como AC adicional em SPEC-PROD-016 |
| Guide cards altura | SPEC-UX-010 | Draft | Aprovar SPEC-UX-010 para implementacao |
| Profile menu positioning | Nenhuma | — | Criar mini-spec ou incluir como AC em SPEC-PROD-019 |
| Gamification points display | SPEC-ARCH-006 | Draft | Aprovar SPEC-ARCH-006 |
| Date fields mandatory | SPEC-PROD-016 | Draft | Incluir como AC em SPEC-PROD-016 (Phase 1 validation) |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — Sprint 30 planning |
