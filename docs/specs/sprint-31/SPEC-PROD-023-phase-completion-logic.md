---
spec-id: SPEC-PROD-023
title: Phase Completion Logic — Business Rules for Phase States
version: 1.0.0
status: Draft
author: product-owner
sprint: 31
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-023: Phase Completion Logic — Business Rules for Phase States

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-17
**Sprint**: 31
**Relacionado a**: SPEC-PROD-016 (Navigation System, Sprint 30), SPEC-PROD-022 (Dashboard Improvements — consumidor deste spec)
**Requisitos de negocio cobertos**: REQ-004 (estados), REQ-009 (Phase 3 checklist blocking rule)

---

## Contexto: Por que Este Documento Existe

O sistema de navegacao SPEC-PROD-016 definiu o modelo de estados de navegacao (NOT_STARTED / IN_PROGRESS / COMPLETED) mas nao especificou os criterios precisos para cada fase individual. O que significa "Phase 1 concluida"? Quando exatamente a Phase 3 passa para COMPLETED? Essas regras estao atualmente dispersas em validacoes de formulario, guards de navegacao e logica de gamificacao, sem uma fonte de verdade unica.

Este spec define, de forma exaustiva e testavel, as regras de negocio para determinar o estado de cada fase. Esses criterios sao consumidos por:
1. A barra de progresso no dashboard (SPEC-PROD-022)
2. Os guards de navegacao (SPEC-PROD-016)
3. O calculo de conclusao de expedicao (automatica quando 6 fases concluidas)
4. A engine de pontos de gamificacao (award de pontos por fase concluida)

---

## User Story

As a @leisure-solo or @leisure-family,
I want the app to accurately reflect which phases I have truly completed versus which I have only partially filled,
so that I trust the progress indicator and know exactly what remains to be done before my trip.

---

## Contexto do Traveler

- **Pain point**: Usuarios relatam confusao sobre "por que a Phase 2 aparece como concluida se eu nao selecionei o estilo de viagem?" O sistema atual marca fases como concluidas por proximidade (fases anteriores a atual) e nao por verificacao real de dados.
- **Workaround atual**: Nenhum — o usuario e surpreendido por dados faltando em fases posteriores.
- **Frequencia**: Afeta toda expedicao criada. Impacto de qualidade alto.

---

## Definicao dos 4 Estados de Fase

Os estados sao mutuamente exclusivos para qualquer fase em qualquer momento:

| Estado | Codigo | Descricao |
|---|---|---|
| Pendente | `NOT_STARTED` | Fase nao foi acessada e nenhum dado foi salvo |
| Em andamento | `IN_PROGRESS` | Fase foi acessada OU tem dados parciais, mas nao atende aos criterios de conclusao |
| Concluida | `COMPLETED` | Todos os criterios de conclusao desta fase estao satisfeitos |
| Atual | `CURRENT` | Esta e a fase que o usuario esta visualizando agora (estado de UI, nao persiste) |

**Nota**: `CURRENT` e um estado de UI derivado de `currentPhase` no `Trip`. Nao e persistido separadamente. Uma fase pode ser simultaneamente `COMPLETED` e `CURRENT` (usuario revisitando uma fase ja concluida).

---

## Regras de Conclusao por Fase

### Phase 1 — O Chamado

**Estado COMPLETED quando**:
- `trip.destination` preenchido (string nao vazia)
- `trip.startDate` preenchido e valido
- `trip.endDate` preenchido e valido
- `trip.name` preenchido (string nao vazia)
- `userProfile.birthDate` preenchido (campo de perfil, nao da expedicao)

**Estado IN_PROGRESS quando**:
- Pelo menos um dos campos acima foi preenchido mas nao todos

**Estado NOT_STARTED quando**:
- Nenhum dado da expedicao foi salvo alem do ID (expedicao recem criada)

**Campos opcionais que NAO bloqueiam conclusao**:
- `trip.origin` (pre-populado do perfil mas nao obrigatorio para concluir)
- `trip.destinationLat` / `trip.destinationLon` (coordenadas — desejavel mas nao obrigatorio para v1)

---

### Phase 2 — O Explorador

**Estado COMPLETED quando**:
- `trip.travelerType` preenchido (enum nao nulo)
- `userProfile.preferences` tem pelo menos 1 categoria preenchida (qualquer das 8 categorias)

**Estado IN_PROGRESS quando**:
- `trip.travelerType` preenchido mas preferences vazias, OU
- Preferences preenchidas mas `travelerType` nao selecionado

**Estado NOT_STARTED quando**:
- `trip.travelerType` e nulo E nenhuma preferencia foi salva para esta expedicao

**Campos opcionais que NAO bloqueiam conclusao**:
- Numero de passengers (adults/children/infants/seniors) — tem valores default validos (1 adulto)
- Preferencias de todas as 8 categorias (1 categoria suficiente)

---

### Phase 3 — O Preparo

**Estado COMPLETED quando** (REQ-009):
- O checklist da expedicao foi gerado (AI call concluida, items existem no banco)
- **TODOS** os itens de checklist com `priority = REQUIRED` tem `checked = true`

**Estado IN_PROGRESS quando**:
- Checklist foi gerado mas pelo menos 1 item REQUIRED nao foi marcado, OU
- Checklist ainda nao foi gerado mas a fase foi acessada

**Estado NOT_STARTED quando**:
- Checklist nao foi gerado E a fase nunca foi acessada

**Regra critica (REQ-009)**: Itens com `priority = RECOMMENDED` ou `priority = OPTIONAL` **nao bloqueiam** a conclusao da Phase 3. Apenas itens `REQUIRED` sao blocking. Um usuario que marca todos os REQUIRED e ignora todos os RECOMMENDED esta em estado COMPLETED.

**Definicao de "gerado"**: `trip.checklistGeneratedAt` nao e nulo.

---

### Phase 4 — A Logistica

**Estado COMPLETED quando**:
- Pelo menos 1 entrada de transporte (`Transport` records) OU pelo menos 1 entrada de acomodacao (`Accommodation` records) existe para a expedicao

**Estado IN_PROGRESS quando**:
- A fase foi acessada mas nenhuma entrada foi salva ainda (ex: usuario abriu mas nao preencheu)

**Estado NOT_STARTED quando**:
- Nenhuma entrada de transporte ou acomodacao existe E a fase nunca foi acessada

**Campos opcionais que NAO bloqueiam conclusao**:
- Mobilidade local (`localMobility`) — pode ser vazio
- Multiplas entradas de transporte ou acomodacao — 1 e suficiente
- `bookingCode` em transporte ou acomodacao — campo opcional

**Rationale**: Phase 4 e marcada como `nonBlocking: true` em `phase-config.ts`. O criterio de conclusao e intencionalmente baixo (1 entrada) para nao bloquear viajantes que ainda nao reservaram tudo mas precisam avancar para o roteiro.

---

### Phase 5 — Guia do Destino

**Estado COMPLETED quando**:
- O guia do destino foi gerado (AI call concluida, conteudo existe)
- Definicao tecnica: `trip.guideGeneratedAt` nao e nulo OU existe pelo menos 1 `GuideCard` associado a expedicao

**Estado IN_PROGRESS quando**:
- A fase foi acessada mas o guia ainda nao foi gerado (usuario clicou em gerar mas esta aguardando, ou saiu antes de concluir)

**Estado NOT_STARTED quando**:
- Nenhuma chamada de geracao foi feita E a fase nunca foi acessada

**Campos opcionais que NAO bloqueiam conclusao**:
- Categorias especificas do guia — qualquer conteudo gerado suficiente
- Interacao do usuario com os cards (expandir, favoritar) — nao relevante para o estado

---

### Phase 6 — O Roteiro

**Estado COMPLETED quando**:
- O itinerario foi gerado (AI call concluida, conteudo existe)
- Definicao tecnica: `trip.itineraryGeneratedAt` nao e nulo OU existe pelo menos 1 `ItineraryDay` associado a expedicao

**Estado IN_PROGRESS quando**:
- A fase foi acessada mas o itinerario ainda nao foi gerado

**Estado NOT_STARTED quando**:
- Nenhuma chamada de geracao foi feita E a fase nunca foi acessada

**Campos opcionais que NAO bloqueiam conclusao**:
- Edicoes manuais no itinerario
- Numero de dias — qualquer conteudo gerado e suficiente

---

## Regra de Conclusao da Expedicao

Uma expedicao e marcada como CONCLUIDA automaticamente quando as 6 fases ativas (1 a 6) estao simultaneamente no estado COMPLETED. Nao existe botao "Completar Expedicao" — a conclusao e automatica.

**Nota**: Fases 7 e 8 (`phase-config.ts` phaseNumbers 7 e 8) sao roadmap futuro e nao participam do calculo de conclusao no MVP.

Esta regra substitui o botao "Completar Expedicao" mencionado em REQ-006 (coberto em SPEC-PROD-024).

---

## Propagacao dos Estados

Os estados calculados sao consumidos pelos seguintes pontos do sistema:

1. **`DashboardPhaseProgressBar`**: renderiza cores por estado (SPEC-PROD-022 RF-001)
2. **`ExpeditionCard`** status label: texto de status derivado do estado predominante (SPEC-PROD-022 RF-002)
3. **Navigation guards** (SPEC-PROD-016): determinam se fase pode ser acessada
4. **Points engine**: fase muda para COMPLETED → `PointsEngine` credita `phase.pointsReward`
5. **Trip completion**: todas as 6 fases em COMPLETED → `trip.status` muda para COMPLETED

---

## Criterios de Aceite

- **AC-001**: Dado uma expedicao nova com apenas `destination` preenchido, quando o sistema calcula o estado da Phase 1, entao o estado e `IN_PROGRESS` (campo parcialmente preenchido).
- **AC-002**: Dado uma expedicao com `destination`, `startDate`, `endDate`, `name` preenchidos e `userProfile.birthDate` preenchido, quando o sistema calcula o estado da Phase 1, entao o estado e `COMPLETED`.
- **AC-003**: Dado uma expedicao com `travelerType` nulo e sem preferencias salvas, quando o sistema calcula o estado da Phase 2, entao o estado e `NOT_STARTED`.
- **AC-004**: Dado uma expedicao com `travelerType` preenchido e pelo menos 1 categoria de preferencia salva, quando o sistema calcula o estado da Phase 2, entao o estado e `COMPLETED`.
- **AC-005**: Dado uma expedicao com checklist gerado e 3 itens REQUIRED, sendo 2 marcados e 1 nao marcado, quando o sistema calcula o estado da Phase 3, entao o estado e `IN_PROGRESS`.
- **AC-006**: Dado uma expedicao com checklist gerado, todos os itens REQUIRED marcados, e 5 itens RECOMMENDED nao marcados, quando o sistema calcula o estado da Phase 3, entao o estado e `COMPLETED` (itens RECOMMENDED nao bloqueiam).
- **AC-007**: Dado uma expedicao sem nenhum Transport ou Accommodation registrado e Phase 4 nunca acessada, quando o sistema calcula o estado da Phase 4, entao o estado e `NOT_STARTED`.
- **AC-008**: Dado uma expedicao com pelo menos 1 registro de Transport salvo, quando o sistema calcula o estado da Phase 4, entao o estado e `COMPLETED`.
- **AC-009**: Dado uma expedicao com guia gerado (guideGeneratedAt nao nulo), quando o sistema calcula o estado da Phase 5, entao o estado e `COMPLETED`.
- **AC-010**: Dado uma expedicao com itinerario gerado (itineraryGeneratedAt nao nulo), quando o sistema calcula o estado da Phase 6, entao o estado e `COMPLETED`.
- **AC-011**: Dado uma expedicao onde todas as 6 fases (1 a 6) estao em COMPLETED, quando o sistema avalia o estado da expedicao, entao `trip.status` e automaticamente atualizado para COMPLETED sem acao manual do usuario.
- **AC-012**: Dado a mudanca de estado de uma fase para COMPLETED, quando o evento e processado, entao o `PointsEngine` credita os pontos definidos em `PHASE_DEFINITIONS[n].pointsReward` para o usuario.

---

## Fora do Escopo (v1 desta spec)

- Logica de estados para fases 7 e 8 (roadmap futuro)
- Downgrade de estado (ex: usuario apaga todos os itens do checklist — o estado deve voltar de COMPLETED para IN_PROGRESS). Essa regra e importante mas pode ser implementada em Sprint 32 como refinamento.
- Notificacoes ao usuario quando uma fase muda de estado automaticamente

---

## Metricas de Sucesso

| Metrica | Baseline | Meta | Prazo |
|---------|----------|------|-------|
| Reducao de reportes "fase aparece como concluida incorretamente" | N/A (novo) | 0 reportes em beta | Sprint 32 |
| Consistencia entre estado exibido no dashboard e estado real da expedicao | Desconhecida | 100% (sem divergencia spec vs code) | Sprint 31 |

---

## Dependencias

- **SPEC-PROD-016** (Navigation System, Sprint 30): modelo de estados `NOT_STARTED / IN_PROGRESS / COMPLETED` deve estar implementado antes deste spec ser implementado
- **Schema Prisma**: campos `checklistGeneratedAt`, `guideGeneratedAt`, `itineraryGeneratedAt` em `Trip` — confirmar existencia antes da implementacao (podem ter nomes diferentes no schema atual)
- **SPEC-PROD-022**: consumidor direto das regras deste spec — deve ser implementado depois

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — define criterios exaustivos por fase para Sprint 31 |
