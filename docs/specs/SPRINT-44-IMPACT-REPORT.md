---
id: SPRINT-44-IMPACT-REPORT
title: Sprint 44 — Phase Reorder Impact Report
owner: tech-lead
status: Draft
version: 0.1.0
created: 2026-04-15
---

# Sprint 44 — Reestruturação das Fases da Expedição

## 1. Contexto e Objetivo

Reordenar as fases da expedição do Atlas sem alterar Fases 1 e 2:

| Ordem atual | Conteúdo               | Nova ordem |
|-------------|------------------------|------------|
| 1           | A Inspiração           | 1 (=)      |
| 2           | O Perfil               | 2 (=)      |
| 3           | O Preparo (Checklist)  | **6**      |
| 4           | A Logística            | **5**      |
| 5           | Guia do Destino        | **3**      |
| 6           | O Roteiro              | **4**      |

**Nova ordem lógica** (by semântica de conteúdo):
1. Inspiração, 2. Perfil, 3. Guia do Destino, 4. Roteiro, 5. Logística, 6. Checklist/Preparo.

### Premissas críticas
- Fases 7 e 8 (A Expedição, O Legado) permanecem "coming soon" e não são afetadas.
- A base `ExpeditionPhase` armazena `phaseNumber` como índice **posicional** (1-8), não como chave semântica. Logo, a reordenação **exige migração de dados** para expedições em andamento.
- O acoplamento entre `phaseNumber` (índice) e conteúdo semântico (`checklist`, `guide`, `itinerary`, `logistics`) é **implícito e disperso** pelo código — essa é a maior fonte de risco.

---

## 2. Decisão arquitetural pendente (escalar ao architect)

Duas estratégias possíveis. Precisam validação **antes** do Wave 1:

### Opção A — Renumeração direta (hard remap)
- `phase-config.ts` passa a definir phase 3 = Guia, phase 4 = Roteiro, phase 5 = Logística, phase 6 = Checklist.
- URLs `/phase-3`..`/phase-6` são reatribuídas.
- Migração SQL faz `UPDATE expedition_phases` e `UPDATE phase_checklist_items` com um mapa `{3→6, 4→5, 5→3, 6→4}`.
- **Prós**: mínimo de código novo; engines, rotas, i18n seguem o mesmo contrato.
- **Contras**: toda referência literal a `phaseNumber: 3|4|5|6` em `expedition.actions.ts`, `phase-engine.ts`, `checklist-engine.ts`, `expedition-summary.service.ts`, `trip-readiness.service.ts`, `phase-completion.engine.ts`, `checklist-rules.ts` precisa ser reescrita (semanticamente) — risco alto de esquecer um ponto. Analytics históricos ficam inconsistentes.

### Opção B — Camada semântica (`phaseKey` estável + `phaseOrder` mutável)
- Introduzir `phaseKey: "inspiration" | "profile" | "guide" | "itinerary" | "logistics" | "checklist"` como SoT semântica.
- `phaseNumber` passa a ser derivado de `phaseOrder` (configurável, possivelmente via feature flag).
- Migração: adiciona coluna `phaseKey` em `ExpeditionPhase` e `PhaseChecklistItem`; backfill por regra; Sprint 44 troca só `phaseOrder`.
- **Prós**: futuras reordenações são triviais; analytics podem agregar por `phaseKey`; feature flag fica natural (ordenação diferente por usuário).
- **Contras**: ~2x mais código novo; exige refactor das engines para consumirem `phaseKey` (não `phaseNumber`).

**Recomendação tech-lead**: **Opção B** para o core (engines + schema), mantendo **Opção A** cosmeticamente para URLs (`/phase-3` etc. apenas renumera). Isso preserva o investimento em `phase-navigation.engine.ts` e permite rollback via flag sem migração reversa. Aguardando ADR do architect antes de fechar o plano.

> Todo o plano a seguir assume a **Opção B**. Se architect decidir por A, Waves 1-3 encolhem ~30% mas o risco de regressão sobe de P2 para P1.

---

## 3. Lista COMPLETA de arquivos impactados

### 3.1 Engines e configuração (core — CRÍTICO)

| Arquivo | Severidade | Mudança |
|---|---|---|
| `src/lib/engines/phase-config.ts` | **CRÍTICO** | Reordenar `PHASE_DEFINITIONS`; adicionar `phaseKey`; `pointsReward` precisa rediscussão (PA diferentes por fase); `PHASE_TOOLS` hardcoded 3→guide, 4→transport, 5→checklist, 6→itinerary precisa virar `phaseKey`-based. |
| `src/lib/engines/phase-engine.ts` | **CRÍTICO** | Linhas 209-215 (`if phaseNumber >= 3 && <= 5` → prereqs); 481-510 (`validatePhasePrerequisites` com literais 3 e 4); 567-572 (`aiTypeMap` hardcoded {3,5,6}). Tudo deve virar por `phaseKey`. |
| `src/lib/engines/phase-completion.engine.ts` | **CRÍTICO** | `PhaseDataSnapshot` tem keys `phase1..phase6` e funções `evaluatePhase3..6` hardcoded. Refactor para indexar por `phaseKey`. 6 funções de avaliação + dispatcher + summary. |
| `src/lib/engines/phase-navigation.engine.ts` | **moderado** | `PHASE_ROUTE_MAP` e `NON_BLOCKING_PHASES = Set([3, 4])` hardcoded — a noção de "não bloqueante" semanticamente era Checklist + Logística; após reorder, as não-bloqueantes viram **5 (Logística) e 6 (Checklist)**. Ajustar set. |
| `src/lib/engines/checklist-engine.ts` | moderado | Hardcoded `phaseNumber: 3` em `where` clauses (linhas 34, 48). Após reorder: checklist → phase 6. Trocar por `phaseKey: "checklist"` ou constante semântica. |
| `src/lib/engines/next-steps-engine.ts` | moderado | Linha 45: `phase.phase === 3` (checklist). Linha 80: `phaseUrl(tripId, phase)` usa literal. Depende de reorder. |
| `src/lib/engines/phase-completion.service.ts` | moderado | `where: { tripId, phaseNumber: 3 }`. |
| `src/lib/engines/points-engine.ts` | trivial | Verificar `phase_complete` metadata logging (só strings, sem literais). |
| `src/lib/travel/checklist-rules.ts` | moderado | Cada rule tem `phase: 3` ou `phase: 4` (itens de packing ligados a fases antigas). ~40 refs. Após reorder, "flight_tickets" ligado a fase 6 (checklist) e "accommodation" a fase 5 (logística). |
| `src/lib/utils/phase-status.ts` | trivial | Linha 162: `if (phaseNumber >= 7)` — ok. Sem literais 3-6 diretos, mas consome `phaseNumber` e deve respeitar reorder. |
| `src/lib/guards/phase-access.guard.ts` | trivial | Consome `phase-navigation.engine`; passa-through. Verificar testes. |
| `src/lib/gamification/badge-engine.ts` | trivial | Só usa `phaseNumber` via `_count` (count genérico). Ok, mas revisar `phase_complete_all_phases`. |
| `src/types/gamification.types.ts` | moderado | `PhaseNumber = 1..8` e `Phase3ItemKey`. Adicionar `PhaseKey` union. |
| `src/types/expedition.types.ts` | trivial | Agregações agnósticas. |

### 3.2 Prisma schema e migrations (CRÍTICO)

| Arquivo | Severidade | Mudança |
|---|---|---|
| `prisma/schema.prisma` | **CRÍTICO** | `Trip.currentPhase Int` permanece, mas semântica muda. Adicionar (Opção B) `ExpeditionPhase.phaseKey String` + `PhaseChecklistItem.phaseKey`. `@@unique([tripId, phaseNumber])` preservar; adicionar `@@index([tripId, phaseKey])`. |
| `prisma/migrations/20260XXXXX_sprint44_phase_reorder/migration.sql` | **CRÍTICO** (novo) | 1) `ALTER TABLE` adiciona `phaseKey`. 2) Backfill segundo phaseNumber antigo. 3) Recompute `Trip.currentPhase` baseado em `currentPhase_old` → novo índice, caso Opção A. 4) Re-emissão de transações de PA canceladas? **Aguardar decisão PO**. |
| `prisma/seed.ts` (se referenciar phase literais) | trivial | Revisar. |

### 3.3 Server actions e services (CRÍTICO)

| Arquivo | Severidade | Literais encontrados | Mudança |
|---|---|---|---|
| `src/server/actions/expedition.actions.ts` (1730 linhas) | **CRÍTICO** | `phaseNumber: 3` (l.579, 614, 656, 1434), `phaseNumber: 4` (l.707, 740, 1405, 1439), `phaseNumber: 5` (l.800), `phaseNumber: 6` (l.1668) | Substituir por `phaseKey` lookup. Re-revisar BOLA guards. |
| `src/server/actions/transport.actions.ts` | moderado | `phaseNumber: 4` (l.180, 228) — persistência em phase antiga "logistics" | Ligar a `phaseKey: "logistics"`. |
| `src/server/actions/itinerary.actions.ts` | moderado | `revalidatePath('/phase-6')` (l.411) — roteiro antigo = phase 6, novo = phase 4 | Trocar para `getPhaseUrl(tripId, "itinerary")`. |
| `src/server/actions/ai.actions.ts` | moderado | `revalidatePath('/phase-6')` (l.182) | Idem. |
| `src/server/services/expedition-summary.service.ts` | **CRÍTICO** | Literais `phase: 3`, `phase: 4`, `phase: 5`, `phase: 6` em push de pendências (l.272-305); `phaseNumber: 3` em query (l.367) | Refactor completo — usar `phaseKey`. |
| `src/server/services/phase-completion.service.ts` | moderado | `phaseNumber: 3` (l.56) | Idem. |
| `src/server/services/report-generation.service.ts` | moderado | `phaseNumber: 3` (l.107, 163) — report lê checklist | Idem. |
| `src/server/services/trip-readiness.service.ts` | moderado | `phaseNumber: 3` (l.87) | Idem. |
| `src/server/services/expedition.service.ts` | moderado | Checar lógica de `currentPhase`. |
| `src/server/services/itinerary-persistence.service.ts` | trivial | Verifica `acquireGenerationLock` — chave é por `tripId`, não por phase. Ok. |
| `src/server/services/itinerary-plan.service.ts` | trivial | Idem. |

### 3.4 Rotas API (moderado-CRÍTICO)

| Arquivo | Severidade | Mudança |
|---|---|---|
| `src/app/api/ai/guide/stream/route.ts` | moderado | Comentários "Phase 5 destination guide"; logs `phase: "guide"`. Conteúdo é agnóstico de número, mas i18n keys `expedition.phase5.*` (l.203, 213) precisam renomeação. |
| `src/app/api/ai/plan/stream/route.ts` | moderado | Lock genérico por `tripId` — não quebra. Verificar policy engine `phase: "plan"`. |
| `src/app/api/destinations/search/route.ts` | trivial | Não depende de phase. |

### 3.5 Frontend — páginas de rota (CRÍTICO)

| Arquivo | Severidade | Mudança |
|---|---|---|
| `src/app/[locale]/(app)/expedition/[tripId]/phase-1/page.tsx` | trivial | Fase 1 = inspiração, sem mudança semântica. |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-2/page.tsx` | trivial | Idem fase 2. |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-3/page.tsx` | **CRÍTICO** | Atualmente carrega `ChecklistEngine` → Phase3WizardV2. Precisa carregar `DestinationGuideV2`. |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-4/page.tsx` | **CRÍTICO** | Atualmente carrega `Phase4WizardV2` (logística). Precisa carregar `Phase6ItineraryV2` (roteiro). |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-5/page.tsx` | **CRÍTICO** | Atualmente carrega `DestinationGuideV2`. Precisa carregar `Phase4WizardV2` (logística). |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-6/page.tsx` | **CRÍTICO** | Atualmente carrega `Phase6ItineraryV2`. Precisa carregar `Phase3WizardV2` (checklist). |
| `src/app/[locale]/(app)/expedition/[tripId]/page.tsx` | moderado | Dispatcher baseado em `currentPhase` — impactado por reorder. |
| `src/app/[locale]/(app)/expedition/[tripId]/summary/page.tsx` | trivial | Agregação. |
| `src/app/[locale]/(app)/expeditions/page.tsx` | trivial | Lista — passa-through. |
| `src/app/[locale]/(app)/expedition/new/page.tsx` | trivial | Sem mudança. |
| `src/app/[locale]/(app)/atlas/page.tsx` | trivial | Consome map — ver 3.6. |
| `src/app/[locale]/(app)/admin/feedback/AdminFeedbackClient.tsx` | trivial | Filtro por phase: ver se é por número ou enum. |

### 3.6 Frontend — componentes de expedição (CRÍTICO)

| Arquivo | Severidade | Mudança |
|---|---|---|
| `src/components/features/expedition/Phase3WizardV2.tsx` (496 linhas) | **CRÍTICO** | `router.push('/phase-4')` (l.193, 231). Checklist passa a ser "última fase" → advance vira "summary" ou "complete expedition". |
| `src/components/features/expedition/Phase4WizardV2.tsx` (661 linhas) | **CRÍTICO** | `router.push('/phase-5')` (l.364), `router.push('/phase-3')` back (l.471), `router.push('/phase-5')` revisit (l.631). Após reorder: logística é phase 5, vem após roteiro (phase 4) e antes do checklist (phase 6). |
| `src/components/features/expedition/DestinationGuideV2.tsx` (1151 linhas) | **CRÍTICO** | `router.push('/phase-6')` (l.778, 788), `router.push('/phase-4')` back (l.973, 987, 1140). Guia passa a ser phase 3 → next = phase 4 (roteiro), back = phase 2. |
| `src/components/features/expedition/Phase6ItineraryV2.tsx` (1947 linhas) | **CRÍTICO** | `router.push('/phase-5')` back (l.1665, 1941); `track("ai_generation_*", { phase: 6 })` (l.1333, 1422). Roteiro passa a ser phase 4 → back = phase 3 (guia), next = phase 5 (logística). Analytics precisa revisar (evento envia phase number; preferir `phase_key`). |
| `src/components/features/expedition/DestinationGuideWizard.tsx` | **CRÍTICO** | Legado; `router.push('/phase-6')` (l.210, 224), back phase-4. Considerar deprecação. |
| `src/components/features/expedition/Phase1WizardV2.tsx` / `Phase1Wizard.tsx` | trivial | Sem mudança. |
| `src/components/features/expedition/Phase2WizardV2.tsx` / `Phase2Wizard.tsx` | **CRÍTICO** | `router.push('/phase-3')` (l.211, 239) — após reorder, next = `/phase-3` ainda (phase 3 = guia agora), mas o contexto mudou. Comentário/labels precisam revisão. |
| `src/components/features/expedition/Phase3Wizard.tsx` | moderado | Legado; considerar deprecar. |
| `src/components/features/expedition/PhaseShell.tsx` / `PhaseShellV2.tsx` | moderado | Constrói segmentos 1-8; linhas 90/88 comentário "all 8 phases, 7-8 always locked". Labels via `nameKey` → ok se phase-config reordenado. |
| `src/components/features/expedition/ExpeditionSummary.tsx` / `ExpeditionSummaryV2.tsx` | **CRÍTICO** | `Link href={/phase-3}` (l.792). Renderiza resumo seção-a-seção por phase number. Refactor para `phaseKey`. |
| `src/components/features/expedition/TripReport.tsx` | moderado | `t("phase3Title")..t("phase6Title")`, test IDs `report-phase-3..6`. Labels reatribuídas se Opção A. |
| `src/components/features/expedition/UnifiedProgressBar.tsx` | moderado | Consumo de `phases.*` i18n keys. |
| `src/components/features/expedition/TransportStep.tsx` | trivial | Ligado a phase 4 (logistics). Prop-driven. |
| `src/components/features/expedition/AccommodationStep.tsx` | trivial | Idem. |
| `src/components/features/expedition/MobilityStep.tsx` | trivial | Idem. |
| `src/components/features/expedition/WizardFooter.tsx` | trivial | Genérico. |
| `src/components/features/expedition/AiDisclaimer.tsx` | trivial | Texto apenas. |
| `src/components/features/expedition/ItineraryMap.tsx` | trivial | Phase-agnostic. |

### 3.7 Frontend — dashboard e navegação (CRÍTICO)

| Arquivo | Severidade | Mudança |
|---|---|---|
| `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` | **CRÍTICO** | Renderiza 1..TOTAL_ACTIVE_PHASES por `phase-config`. Passa-through se engines reordenadas. Testes precisam atualizar asserts. |
| `src/components/features/dashboard/ExpeditionCardRedesigned.tsx` | **CRÍTICO** | Hard-coded `href: /phase-3` (checklist), `/phase-5` (guide), `/phase-6` (itinerary) nas quick-access actions (l.224, 233, 242). Refactor para `getPhaseUrl(tripId, "checklist" \| "guide" \| "itinerary")`. |
| `src/components/features/dashboard/ChecklistProgressMini.tsx` | moderado | `router.push('/phase-3')` (l.48, 58). Checklist agora é phase 6 → `/phase-6`. |
| `src/components/features/dashboard/ExpeditionCard.tsx` | moderado | Lê `currentPhase` — só display. Revisar labels. |
| `src/components/features/dashboard/DashboardV2.tsx` | moderado | Consumo das listas. |
| `src/components/features/dashboard/ExpeditionsList.tsx` | trivial | List item. |
| `src/components/features/dashboard/AtlasDashboard.tsx` | trivial | Geral. |
| `src/components/features/atlas/TripMarkerPopup.tsx` | trivial | Popup label. |
| `src/lib/map/build-geojson.ts` | trivial | Verifica literais `phase: 3..6`. Achados — revisar. |
| `src/components/layout/LanguageSwitcher.tsx` | trivial | Comentário fala em `/phase-3` — só doc. |

### 3.8 i18n (moderado)

| Arquivo | Severidade | Mudança |
|---|---|---|
| `messages/en.json` | moderado | 144 chaves com `phase[1-6]`. Principais: `phases.theCalling/theExplorer/thePreparation/theLogistics/theDestinationGuide/theItinerary` (blocos l.1176-1180, l.1897-1902); `summary.phase3..6*`, `plan.phase3..6Title`, `errors.phase5.*`, etc. **Decisão**: trocar `phase3Title` → `guideTitle` (semântico) ou manter numerado? Recomendo semântico + aliases temporários. |
| `messages/pt-BR.json` | moderado | 144 chaves idênticas. |

### 3.9 Testes unitários (CRÍTICO — alto volume de churn)

Total aproximado: **~38 arquivos de teste** com 200+ asserções ligadas a phase numbers. Assumindo 1-2h por arquivo para refactor:

| Arquivo | Refs | Observação |
|---|---|---|
| `tests/unit/lib/engines/phase-config.test.ts` | 8 | Snapshot de definitions — reescrever. |
| `tests/unit/lib/engines/phase-engine.test.ts` | 2 | Cenários de complete — refatorar ordem. |
| `tests/unit/lib/engines/phase-engine-i18n.test.ts` | — | Asserções sobre `nameKey`. |
| `tests/unit/lib/engines/phase-completion.engine.test.ts` | 24 | Refactor pesado — 6 funções de avaliação. |
| `tests/unit/lib/engines/phase-navigation.engine.test.ts` | — | `NON_BLOCKING_PHASES` asserts. |
| `tests/unit/lib/engines/checklist-engine.test.ts` | 15 | Phase 3 → 6. |
| `tests/unit/lib/engines/next-steps-engine.test.ts` | 5 | Ordem sugestões. |
| `tests/unit/lib/utils/phase-status.test.ts` | 6 | Genérico. |
| `tests/unit/lib/map/build-geojson.test.ts` | — | Geo. |
| `tests/unit/lib/expedition-filters.test.ts` | — | Filtro. |
| `tests/unit/lib/validations/gamification.schema.test.ts` | 4 | Schema. |
| `tests/unit/server/expedition.service.test.ts` | — | Service. |
| `tests/unit/server/expedition-summary.service.test.ts` | 26 | Muito impactado. |
| `tests/unit/server/expedition.actions.bola.test.ts` | 8 | BOLA. |
| `tests/unit/server/expedition.name-persistence.test.ts` | — | Persistência. |
| `tests/unit/server/trip.service.test.ts` | 12 | Trip service. |
| `tests/unit/server/trip-readiness.service.test.ts` | 5 | Readiness. |
| `tests/unit/server/services/syncPhaseStatus.test.ts` | 8 | Sync. |
| `tests/unit/server/actions/syncPhase6CompletionAction.test.ts` | 15 | Rename? |
| `tests/unit/server/actions/updatePhase2Action.test.ts` | — | P2 inalterado. |
| `tests/unit/server/actions/gamification.actions.test.ts` | — | Pontos. |
| `tests/unit/server/updatePhase1Action.test.ts` | 1 | P1 inalterado. |
| `tests/unit/server/updatePhase1.multicity.test.ts` | — | P1 inalterado. |
| `tests/unit/server/mass-assignment.test.ts` | — | Segurança. |
| `tests/unit/components/features/dashboard/DashboardPhaseProgressBar.test.tsx` | — | Progress bar. |
| `tests/unit/components/features/dashboard/ExpeditionCard.test.tsx` | — | Card. |
| `tests/unit/components/features/dashboard/ExpeditionCardRedesigned.test.tsx` | — | Quick access hrefs. |
| `tests/unit/components/features/dashboard/ExpeditionsDashboard.test.tsx` | — | Dashboard. |
| `tests/unit/components/features/dashboard/ExpeditionsList.test.tsx` | — | List. |
| `tests/unit/components/features/expedition/ExpeditionSummary.test.tsx` | 15 | Summary. |
| `tests/unit/components/features/expedition/Phase1Wizard.test.tsx` | — | P1 inalterado. |
| `tests/unit/components/features/expedition/Phase1WizardRevisit.test.tsx` | — | P1 inalterado. |
| `tests/unit/components/features/expedition/Phase1WizardV2.test.tsx` | — | P1 inalterado. |
| `tests/unit/components/features/expedition/Phase2WizardV2.test.tsx` | — | P2 + navegação. |
| `tests/unit/components/features/expedition/Phase3WizardV2.test.tsx` | 22 | Wizard renomeado semanticamente. |
| `tests/unit/components/features/expedition/TransportStep.test.tsx` | 32 | Prop-driven. |
| `tests/unit/components/features/expedition/AccommodationStep.test.tsx` | 14 | Prop-driven. |
| `tests/unit/components/features/expedition/MobilityStep.test.tsx` | 6 | Prop-driven. |
| `tests/unit/components/features/expedition/TripReport.test.tsx` | 6 | Labels. |
| `tests/unit/components/itinerary/PlanGeneratorWizard.test.tsx` | — | Gen. |
| `tests/unit/components/landing/PhasesSectionV2.test.tsx` | — | Landing marketing. |
| `tests/unit/api/ai/plan/stream-route.test.ts` | 1 | Stream. |
| `tests/unit/app/app-shell-layout.test.tsx` | — | Layout. |
| `src/components/features/expedition/__tests__/DestinationGuideV2.test.tsx` | — | Guide. |
| `src/components/features/expedition/__tests__/ExpeditionSummaryV2.test.tsx` | — (heavy) | Summary V2. |
| `src/components/features/expedition/__tests__/Phase4WizardV2.test.tsx` | — | Wizard. |
| `src/components/features/expedition/__tests__/Phase6ItineraryV2.test.tsx` | — | Itinerary. |
| `src/components/features/dashboard/__tests__/DashboardV2.test.tsx` | — | Dashboard. |
| `src/components/ui/__tests__/AtlasPhaseProgress.test.tsx` | — | Progress. |

### 3.10 Testes E2E (CRÍTICO)

| Arquivo | Severidade | Mudança |
|---|---|---|
| `tests/e2e/phase-navigation.e2e.spec.ts` | **CRÍTICO** | Reescrever fluxos de navegação sequencial. |
| `tests/e2e/phase-completion.spec.ts` | **CRÍTICO** | Ordem de conclusão muda. |
| `tests/e2e/navigation.e2e.spec.ts` | moderado | Travessia geral. |
| `tests/e2e/expedition-domestic.spec.ts` | **CRÍTICO** | Jornada completa — reescrever. |
| `tests/e2e/full-user-journey.spec.ts` | **CRÍTICO** | Reescrever. |
| `tests/e2e/data-persistence.spec.ts` | moderado | Data por fase. |
| `tests/e2e/expedition.spec.ts` | moderado | Fluxo expedição. |
| `tests/e2e/dashboard.spec.ts` | trivial | Dashboard. |
| `tests/e2e/navigation.spec.ts` | trivial | Navbar. |
| `tests/e2e/trip-flow.spec.ts` | moderado | Trip flow. |

### 3.11 Eval datasets (moderado)

Impacto real só se o número da fase for usado como **chave de comparação**. Se for só metadado, rebaseline automático.

| Arquivo | Mudança |
|---|---|
| `docs/evals/datasets/phase-completion-states.json` | Reassociar `phase: N` ao conteúdo correto. |
| `docs/evals/datasets/completion-engine-fixes.json` | Idem. |
| `docs/evals/datasets/phase-transition-fixes.json` | Reordenar transições. |
| `docs/evals/datasets/phase3-completion-rules.json` | **Renomear** para `checklist-completion-rules.json` e ajustar. |
| `docs/evals/datasets/phase4-mandatory-fields.json` | **Renomear** para `logistics-mandatory-fields.json`. |
| `docs/evals/datasets/phase4-conditional-fields.json` | Idem. |
| `docs/evals/datasets/badge-unlock-criteria.json` | `phase_complete phase:4` — rever regra. |
| `docs/evals/datasets/footer-dirty-state-global.json` | Rotas por fase — atualizar. |
| `docs/evals/datasets/report-completeness*.json` | Seções. |
| `docs/evals/datasets/summary-completeness.json` | Idem. |
| `docs/evals/datasets/itinerary-*.json` | Agnóstico — revisar. |

### 3.12 Scripts e docs

| Arquivo | Severidade | Mudança |
|---|---|---|
| `scripts/*` (verificar) | trivial | Qualquer script que mencione phase literals. |
| `docs/tasks.md` | trivial | Registrar FEATURE-044. |
| `docs/architecture.md` | moderado | ADR novo (phase reorder). |
| `docs/specs/SPRINT-44-*` | — | Spec do sprint (em paralelo por architect). |
| `docs/specs/SPEC-STATUS.md` | trivial | Adicionar specs. |
| `CHANGELOG.md` | trivial | Entrada v0.61.0 (ou próximo). |

### 3.13 Totais

| Categoria | Arquivos | Severidade dominante |
|---|---|---|
| Engines + types | 14 | CRÍTICO |
| Prisma | 2 (+1 migration) | CRÍTICO |
| Server actions + services | 11 | CRÍTICO |
| API routes | 3 | Moderado |
| Pages | 12 | CRÍTICO |
| Frontend components | 22 | CRÍTICO |
| i18n | 2 | Moderado |
| Unit tests | ~38 | CRÍTICO (churn) |
| E2E | 10 | CRÍTICO |
| Eval datasets | 11 | Moderado |
| Scripts/Docs | ~5 | Trivial |
| **Total** | **~130 arquivos** | — |

---

## 4. Plano de implementação — WAVES

### Wave 1 — Fundação (bloqueante)
**Objetivo**: engine semântica + schema + feature flag + migração de dados.

| ID | Task | Assignee | Dep | Paralelizável | Est |
|---|---|---|---|---|---|
| T-S44-001 | ADR: Opção B (`phaseKey` SoT) — arquiteto decide | architect | — | não | 0.5d |
| T-S44-002 | Migration Prisma: adicionar `phaseKey` a `ExpeditionPhase` e `PhaseChecklistItem`; backfill | dev-fullstack-1 | 001 | não | 1d |
| T-S44-003 | Refactor `phase-config.ts`: adicionar `phaseKey`, reordenar `PHASE_DEFINITIONS`, remapear `PHASE_TOOLS` por `phaseKey` | dev-fullstack-1 | 001 | não | 1d |
| T-S44-004 | Refactor `phase-completion.engine.ts`: trocar `phase1..phase6` snapshot keys por `phaseKey` dispatcher | dev-fullstack-2 | 003 | sim (com 005) | 1.5d |
| T-S44-005 | Refactor `phase-engine.ts`: `validatePhasePrerequisites` e `aiTypeMap` por `phaseKey`; `NON_BLOCKING` passa a ler definitions | dev-fullstack-2 | 003 | sim (com 004) | 1.5d |
| T-S44-006 | Refactor `phase-navigation.engine.ts`: derivar `NON_BLOCKING_PHASES` dinamicamente de definitions | dev-fullstack-1 | 003 | sim | 0.5d |
| T-S44-007 | Introduzir feature flag `PHASE_REORDER_ENABLED` (env + DB, ver §5) | dev-fullstack-1 | 001 | sim | 0.5d |
| T-S44-008 | Script de migração de dados para expedições em andamento (`scripts/migrate-phase-reorder.ts`) com dry-run | dev-fullstack-2 | 002 | não | 1d |
| T-S44-009 | Testes unitários das engines refatoradas (bloqueia Wave 2) | dev-fullstack-1 + 2 | 004,005,006 | sim | 1.5d |

**Wave 1 total**: ~6-7 dias/dev (8 dias corridos com paralelização).

### Wave 2 — Backend (API, services, prompts)
| ID | Task | Assignee | Dep | Paralelizável | Est |
|---|---|---|---|---|---|
| T-S44-010 | Refactor `expedition.actions.ts`: substituir todos os `phaseNumber: N` literais por `getPhaseNumberByKey("guide"\|"itinerary"\|...)` | dev-fullstack-1 | Wave 1 | — | 1.5d |
| T-S44-011 | Refactor `expedition-summary.service.ts`, `report-generation.service.ts`, `trip-readiness.service.ts`, `phase-completion.service.ts` | dev-fullstack-2 | Wave 1 | sim (com 010) | 1.5d |
| T-S44-012 | Refactor `checklist-engine.ts`, `checklist-rules.ts` (itens re-associados às novas fases), `next-steps-engine.ts` | dev-fullstack-1 | 010 | sim | 1d |
| T-S44-013 | Refactor `transport.actions.ts`, `itinerary.actions.ts`, `ai.actions.ts` (revalidatePath, locks) | dev-fullstack-2 | 011 | sim | 0.5d |
| T-S44-014 | Prompts review: `checklist.prompt.ts`, `destination-guide.prompt.ts`, `travel-plan.prompt.ts` — comentário "phases 1-5" precisa ser recalculado (agora guia é phase 3 e depende apenas de 1-2) | prompt-engineer + dev-fullstack-1 | Wave 1 | sim | 0.5d |
| T-S44-015 | AI routes: renomear i18n keys `expedition.phase5.*` (regen guide) → `expedition.guide.*` | dev-fullstack-2 | 013 | sim | 0.5d |

**Wave 2 total**: ~3-4 dias/dev (4 dias corridos).

### Wave 3 — Frontend
| ID | Task | Assignee | Dep | Paralelizável | Est |
|---|---|---|---|---|---|
| T-S44-020 | Remapear pages `phase-3..6/page.tsx` para carregar os wizards corretos segundo `phaseKey` | dev-fullstack-2 | Wave 2 | — | 0.5d |
| T-S44-021 | Refactor de navegação interna: `Phase2WizardV2`, `Phase3WizardV2`, `Phase4WizardV2`, `DestinationGuideV2`, `Phase6ItineraryV2` — trocar `router.push('/phase-N')` por `getPhaseUrl(tripId, phaseKey)` | dev-fullstack-1 | 020 | — | 1.5d |
| T-S44-022 | `ExpeditionCardRedesigned`, `ChecklistProgressMini`, `DashboardPhaseProgressBar` — quick-access hrefs via `getPhaseUrl` | dev-fullstack-2 | 020 | sim | 0.5d |
| T-S44-023 | `ExpeditionSummary*`, `TripReport`, `UnifiedProgressBar`, `PhaseShell*` — labels e ordem visual | dev-fullstack-1 | 020 | sim | 1d |
| T-S44-024 | Deprecar `DestinationGuideWizard` (legado) — decisão com architect, se ainda em uso | dev-fullstack-2 | 021 | sim | 0.5d |
| T-S44-025 | Atualizar analytics events: `track("ai_generation_*")` enviar `phase_key` junto de `phase` number | dev-fullstack-1 | 021 | sim | 0.5d |

**Wave 3 total**: ~3-4 dias/dev (4 dias corridos).

### Wave 4 — Testes (unit + E2E + visual)
| ID | Task | Assignee | Dep | Paralelizável | Est |
|---|---|---|---|---|---|
| T-S44-030 | Refactor unit tests (38 arquivos, ~200 asserções) | dev-fullstack-1 + 2 | Wave 3 | sim | 4d |
| T-S44-031 | Refactor E2E specs (10 arquivos) | qa-engineer + dev-fullstack-2 | Wave 3 | sim (com 030) | 2d |
| T-S44-032 | Visual regression: capturar screenshots baseline da nova ordem no dashboard e wizards | qa-engineer | Wave 3 | sim | 1d |
| T-S44-033 | Eval datasets rebaseline (11 datasets) | qa-engineer | Wave 3 | sim | 1d |
| T-S44-034 | Smoke-test migração em staging (expedição em andamento → pós-reorder) | qa-engineer + devops | 008 | — | 0.5d |

**Wave 4 total**: ~5-6 dias/dev.

### Wave 5 — i18n, docs, cleanup
| ID | Task | Assignee | Dep | Paralelizável | Est |
|---|---|---|---|---|---|
| T-S44-040 | Atualizar `messages/en.json` + `messages/pt-BR.json` (keys semânticas + aliases temporários) | dev-fullstack-1 | Wave 3 | sim | 1d |
| T-S44-041 | ADR-018 Phase Reorder escrito e commitado | architect | 001 | sim | 0.5d |
| T-S44-042 | CHANGELOG v0.X.0, migration notes, release-risk | release-manager | Wave 4 | — | 0.5d |
| T-S44-043 | Remover feature flag + código de compat | dev-fullstack-1 | Wave 4 + soak | — | 0.5d (Sprint 45) |
| T-S44-044 | Atualizar agent memory (tech-lead MEMORY.md, architect) | tech-lead | — | sim | 0.25d |

**Wave 5 total**: ~2-3 dias/dev.

---

## 5. Feature Flag `PHASE_REORDER_ENABLED`

### Estratégia
- **Camada 1 — env var**: `PHASE_REORDER_ENABLED=true|false` em `.env` (default `false` até QA assinar).
- **Camada 2 — DB override**: tabela `FeatureFlag` existente (ou criar `app_flags`) com key `phase_reorder_enabled` e valor boolean, por-usuário ou global. Permite canary (ex.: ativa só para admin/beta testers).
- **Leitura**: novo helper `isPhaseReorderEnabled(userId?)` em `src/lib/feature-flags.ts`. Lê env como fallback; DB se disponível.

### Pontos de leitura
- `phase-config.ts` — retorna `PHASE_DEFINITIONS_NEW` ou `PHASE_DEFINITIONS_LEGACY` conforme flag.
- `phase-navigation.engine.ts` — reconstrói `PHASE_ROUTE_MAP` e `NON_BLOCKING_PHASES` segundo flag.
- Pages `phase-3..6/page.tsx` — dispatcher seleciona wizard correto.
- `ExpeditionCardRedesigned`, `ChecklistProgressMini` — hrefs.
- **Regra de ouro**: nenhum componente deve ler a flag diretamente; todos consultam `getPhaseUrl(tripId, phaseKey)` que internamente resolve.

### Rollback
- Migração de dados é **aditiva** (só adiciona `phaseKey`, não remove colunas). Rollback = desligar flag.
- Script de rollback SQL preparado: `scripts/rollback-phase-reorder.sql` (revisado pelo security-specialist).
- Tempo máximo de rollback: < 5 min (flag flip).

### Soak period
- 1 sprint em staging com flag ligada para usuários internos.
- Rollout canary em produção: 1% → 10% → 50% → 100% ao longo de 3 dias.

---

## 6. Estimativa de esforço

| Wave | Paralela? | Dias/dev | Calendário (2 devs) |
|---|---|---|---|
| 1 — Fundação | parcial | 7 | 4 dias |
| 2 — Backend | sim | 4 | 2 dias |
| 3 — Frontend | sim | 4 | 2 dias |
| 4 — Testes | sim | 6 | 3 dias |
| 5 — i18n + docs | sim | 3 | 1.5 dia |
| **Total** | — | **24 dias/dev** | **~13 dias corridos** |

- **Story points**: ~55 SP (features + tests + flag + migration).
- **Buffer de risco**: +20% por spec drift potencial e migração de dados → **29 dias/dev**.
- **Pessoas**: 2 devs + 1 qa + 0.5 architect + 0.5 prompt-engineer → viável em **1 sprint (2 semanas)**, porém **apertado**. Recomendação: spillar Wave 5 para início do Sprint 45.

---

## 7. Riscos de regressão

### P0 — Bloqueadores
1. **Quebra de expedições em andamento**: usuários que estão na "phase 3 = checklist" antiga acordam em "phase 3 = guia". Migração precisa recomputar `Trip.currentPhase` e preservar `completedPhases`. Se backfill falhar, usuário perde contexto. **Mitigação**: script de dry-run + smoke-test em snapshot de produção + flag controla visibilidade.
2. **Gamificação — PA atribuído na ordem errada**: `PHASE_DEFINITIONS.pointsReward` está acoplado ao número (atualmente: 3=75, 4=50, 5=40, 6=250). Se reordenarmos por `phaseKey` mantendo os pontos por fase semântica, **não há perda**. Se reordenarmos por posição, usuário ganha/perde PA comparado ao histórico. **Mitigação**: ADR decide; `PointTransaction` audit mostra desvio; architect revisa. **Escalar para PO**: os pontos-por-fase são por posição ou por conteúdo? Recomendo **por conteúdo** (checklist sempre vale 75 PA, etc.).
3. **Prerequisites engine**: `phase-engine.ts` linha 209 `if phaseNumber >= 3 && <= 5` está semanticamente ligado a "fases com conteúdo validável". Após reorder esse range muda (agora seria phase 3,4,5,6). Se não refatorar corretamente, expedições não avançam.

### P1 — Altos
4. **Analytics e tracking**: eventos `ai_generation_triggered` e `phase_complete` enviam `phase` como número. Dashboards de analytics históricos continuarão usando a numeração antiga. Coordenar com `data-engineer` para dual-emit (`phase` + `phase_key`).
5. **Cache Redis**: `acquireGenerationLock` usa `tripId` (não quebra), mas **policy engine** (`src/app/api/ai/plan/stream/route.ts` l.87) passa `phase: "plan"` (enum string) — ok. Se algum cache usar chave numérica, precisa invalidar. **Ação**: grep por `redis.get`/`redis.set` com padrão `phase` durante dev (não achei nenhum caso crítico, mas confirmar).
6. **i18n**: 144 chaves com `phase[1-6]` em cada locale. Se renomearmos para semântico sem aliases, qualquer componente esquecido vira string quebrada. **Mitigação**: aliases em `messages/*.json` durante flag=on; `npm run i18n:check` como gate.
7. **DestinationGuideWizard legado**: se ainda em uso em alguma rota escondida, vai apontar para `/phase-6` (antigo roteiro = novo itinerário). Precisa auditoria antes de deprecar.

### P2 — Moderados
8. **Checklist rules tied to phase number**: `PHASE3_CHECKLIST` tem itens com `phase: 3 | 4` — essa numeração é **data**, não lógica. Se a constante `PHASE3_CHECKLIST` for renomeada, grep por todos os imports.
9. **Test snapshots**: `DashboardPhaseProgressBar`, `AtlasPhaseProgress`, `TripReport` têm asserções com labels literais ("The Preparation", "The Logistics"). Refazer snapshots.
10. **Eval regression**: 11 datasets têm `phase: N` como input. Rebaseline adequado é essencial senão o gate de eval reprova a sprint.
11. **SEO/permalinks**: usuários podem ter bookmarks `/expedition/.../phase-6`. Após reorder, phase-6 passa a ser checklist (antes era roteiro). **Mitigação**: não há migração de URL — expedições novas usam nova ordem; expedições pré-flag mantêm antiga ordem por flag-switch.

---

## 8. Critérios de Definition-of-Done — Sprint 44

- [ ] ADR-018 Phase Reorder aprovado e commitado
- [ ] SPEC-PROD-044 + SPEC-UX-044 + SPEC-ARCH-044 aprovados (status `Approved` no SPEC-STATUS.md)
- [ ] Migração Prisma aditiva testada em snapshot de produção (dry-run)
- [ ] Feature flag `PHASE_REORDER_ENABLED` implementada e testada nos dois estados
- [ ] Todas as 130+ refs migradas (grep limpo por `phaseNumber: [3-6]` e `phase-[3-6]` fora de casos legítimos)
- [ ] `npm run test` passa com ≥80% coverage nas engines e services refatorados
- [ ] `npm run test:e2e` passa todos os fluxos de expedição nos dois estados da flag
- [ ] `npm run i18n:check` limpo (sem chaves órfãs nem missing)
- [ ] `npm run eval:gate` passa com trust score ≥ 0.9 em staging
- [ ] `npm run lint` e `npm run build` limpos
- [ ] Script de rollback testado em staging
- [ ] Analytics events dual-emit implementado (phase + phase_key)
- [ ] Sprint review protocol cumprido: architect, security, devops, tech-lead, release-manager, finops
- [ ] Canary de 1% em produção estável por 24h antes de 10%
- [ ] CHANGELOG e release notes publicados
- [ ] Nenhum P0/P1 aberto

---

## 9. Decisões pendentes — escalar

### Para o Architect
1. **Opção A vs B** (renumeração direta vs camada semântica `phaseKey`) — ver §2. **Bloqueante do Wave 1**.
2. Refactor de `PhaseDataSnapshot` em `phase-completion.engine.ts` — chaves `phase1..phase6` são fontes de repetição; aceitar substituir por `Record<PhaseKey, ...>`?
3. `NON_BLOCKING_PHASES` deve passar a ser derivado dinamicamente de `PHASE_DEFINITIONS[*].nonBlocking`? (trivial, mas quebra um contrato público da engine).
4. Destino do wizard legado `DestinationGuideWizard` — deprecar nesta sprint ou Sprint 45?

### Para o Product Owner
5. **Gamificação — pontos por posição ou por conteúdo?** (Ver risco P0 #2.) Recomendo por conteúdo; precisa confirmar.
6. **Usuários em expedições em andamento**: preservar ordem antiga (flag per-trip) ou forçar nova ordem após migração? Experiência UX precisa decisão.
7. Nomenclatura final das fases após reorder — `nameKey` "thePreparation" fará sentido como última fase ou renomear para algo como "theFinalCheck"?
8. Revisão dos PA por fase nova — phase 6 (checklist) recebendo só 75 PA como "última fase" pode parecer pobre. Ajustar curva?

### Para o Security-Specialist
9. BOLA guards no `expedition.actions.ts` — garantir que nenhum refactor aberto deixa um endpoint sem verificação de ownership após trocar literais por `phaseKey`.
10. Migração de dados: PII em `metadata` do `ExpeditionPhase`? Revisar antes de qualquer backfill.

### Para o FinOps / Prompt Engineer
11. O comentário em `travel-plan.prompt.ts` ("Structures all user data from phases 1-5") vai mudar? Afeta custo do prompt do roteiro se o contexto de "logística" (fase 5 nova) ainda não existir quando o usuário gera o roteiro na fase 4 nova.

### Para o Data Engineer
12. Dual-emit de analytics (phase + phase_key) precisa de novo schema de eventos? Dashboards históricos precisam ser reescritos?

---

> Blocked on: decisão architect (Opção A vs B) e PO (pontos por posição vs conteúdo). Sem essas duas respostas, Wave 1 não pode começar.
