# Changelog — v0.13.0

**Release Date:** 2026-03-10
**Sprint:** 19
**Branch:** feat/sprint-19

---

## Highlights

- Streaming de itinerario agora persiste dados no banco automaticamente, com indicador de progresso visual (sem JSON raw visivel ao usuario)
- Redesign do guia de destino com cards de preview no dashboard e 10 secoes expandidas (safety, health, transport, customs)
- Correcao de cascata de exclusao de conta (LGPD): Activity, ItineraryDay e ChecklistItem agora deletados na exclusao de conta

---

## Bug Fixes

- **ITEM-1 (P0)**: Corrigido streaming de itinerario que exibia JSON raw ao usuario e nao persistia dados no banco. Agora: (a) o output e acumulado e persistido via `itinerary-persistence.service.ts` antes de enviar `[DONE]`; (b) UI mostra indicador de progresso com mensagens traduzidas em vez de texto raw; (c) `Phase6Wizard` recebe `key` prop para forcar remontagem apos `router.refresh()`
- **ITEM-2 (P0)**: Corrigido redirect no `ExpeditionHubPage` para trips com todas as fases completadas. Novo metodo `PhaseEngine.getHighestCompletedPhase()` busca a fase mais alta completada em vez de fallback para phase-1
- **ITEM-3 (P0)**: Corrigida contagem de fases completadas na progress bar do dashboard. Agora usa `Math.max(explicit completed count, currentPhase - 1)` para considerar fases implicitamente completadas
- **ITEM-8 (P0)**: Campo `bio` agora aparece no resumo de confirmacao do Phase1Wizard (Step 4)
- **SEC-S18-001 (P0)**: Corrigida cascata de exclusao de conta — `Activity`, `ItineraryDay` e `ChecklistItem` agora deletados dentro da transacao, na ordem correta de FK constraints (Activities antes de ItineraryDays)

## New Features

- **Itinerary Persistence Service** (`itinerary-persistence.service.ts`): novo servico extraido para persistencia de itinerario, com parse Zod do JSON de AI, lock de geracao por trip (Redis TTL 300s), e reuso entre `ai.actions.ts` e `stream/route.ts`
- **Stream Progress UI** (`stream-progress.ts`): utilidade para exibir mensagens progressivas durante streaming ("Analisando destino...", "Planejando atividades...", "Otimizando roteiro...", "Quase pronto...") com `aria-live="polite"`
- **Destination Guide Redesign** (ITEM-14): cards de preview no dashboard mostrando clima, moeda local e dicas rapidas; guia expandido para 10 secoes (adicionadas: safety, health, transport_overview, local_customs) com tipos `stat` e `content`
- **Currency Utility** (`currency.ts`): `getDefaultCurrency(locale)` retorna moeda padrao por locale (pt-BR -> BRL, en -> USD) e `formatCurrency(value, currency, locale)` formata valores com `Intl.NumberFormat`
- **Auto-advance Phase Transition** (ITEM-9): `PhaseTransition` agora avanca automaticamente apos 2 segundos; botao "Continuar" permanece como fallback; click manual cancela o timer
- **Phase Engine**: novo metodo `getHighestCompletedPhase(tripId, userId)` com BOLA guard

## Security

- **SEC-S18-001**: Eliminados dados orfaos na exclusao de conta — Activity, ItineraryDay e ChecklistItem agora removidos dentro da transacao atomica (conformidade LGPD)
- **Generation Lock**: Lock por trip (Redis, TTL 300s) previne geracoes simultaneas de itinerario para o mesmo trip, retornando HTTP 409 se ja existe geracao em andamento
- **Graceful Lock Degradation**: Se Redis falhar ao adquirir/liberar lock, o sistema continua operando sem lock (disponibilidade sobre consistencia)

## UX Improvements

- Indicador de progresso visual durante geracao de itinerario (spinner + mensagens traduzidas pt-BR/en) em vez de JSON raw
- Cards de preview do guia de destino no dashboard com layout responsivo (1/2/3 colunas)
- Botoes duplicados de Checklist/Roteiro removidos do ExpeditionCard (ITEM-6) — PhaseToolsBar e a fonte unica
- Deduplicacao de resultados no autocomplete de destinos
- Formato de moeda consistente com `Intl.NumberFormat` em todo o app

## Breaking Changes

- Nenhum. Todas as mudancas sao aditivas ou correcoes de bugs.

## Migration Notes

- **Sem nova migration Prisma**: nenhuma alteracao no schema do banco de dados
- **Sem novas variaveis de ambiente**: nenhuma nova env var necessaria
- **Sem novas dependencias**: nenhuma nova dependencia npm adicionada
- **Tipo `GuideSectionData` expandido**: campos opcionais `type` e `details` adicionados — consumidores existentes nao afetados (aditivo)
- **Tipo `GuideSectionKey` expandido**: 4 novas chaves (`safety`, `health`, `transport_overview`, `local_customs`) — consumidores existentes nao afetados (union type expandido)

---

## Change Impact Assessment: CIA-005

**Verdict**: Non-breaking, version bump MINOR (0.12.0 -> 0.13.0)

### API Contract Changes

| Type | Change | Breaking? | Reason |
|---|---|---|---|
| SSE behavior changed | Stream route now persists before `[DONE]` | No | Client receives same SSE format; `[DONE]` still signals completion |
| SSE new error events | `{"error":"persist_failed"}` and `{"error":"parse_failed"}` before `[DONE]` | No | Additive — clients ignoring these continue to work |
| HTTP 409 added | Stream route returns 409 if generation lock held | No | New status code — existing clients get success or existing errors |
| Type expanded | `GuideSectionData.type` and `.details` added | No | Optional fields — existing consumers unaffected |
| Type expanded | `GuideSectionKey` union expanded with 4 keys | No | Additive union — existing pattern matches continue to work |
| Method added | `PhaseEngine.getHighestCompletedPhase()` | No | New static method — additive |
| Service added | `itinerary-persistence.service.ts` | No | New module — no existing imports affected |
| Utility added | `currency.ts` | No | New module — additive |

### Database Schema Changes

Nenhuma alteracao no schema Prisma.

### Risk Level

**Overall Risk**: BAIXO

- Sistema em Bootstrap Phase (zero usuarios em producao)
- Sem alteracao de schema
- Sem nova dependencia
- Todas as mudancas sao aditivas ou correcoes de bugs existentes
- Lock de geracao tem degradacao graciosa (Redis failure -> continua sem lock)

---

## Full Commit Log

```
7fe9516 docs(sprint-19): Sprint 19 security review — APPROVED
ad30bc9 feat(sprint-19): T-S19-009 — card-based destination guide redesign
84347b9 chore(sprint-19): update i18n messages and agent memory
f3d7a7b feat(sprint-19): T-S19-011 — consistent currency format with Intl.NumberFormat
78c1247 feat(sprint-19): T-S19-009 — destination guide dashboard cards
f0b69f8 feat(sprint-19): T-S19-006 — deduplicate destinations in autocomplete
0582700 feat(sprint-19): T-S19-005 — show bio in Phase1Wizard confirmation
27d7a03 feat(sprint-19): T-S19-004 — auto-advance PhaseTransition with 2s timer
f55b70c feat(sprint-19): T-S19-003 — fix completedPhases count in dashboard
bce792d feat(sprint-19): T-S19-002 — fix navigation for completed trips
bdae35e feat(sprint-19): T-S19-008 — expand guide to 10 sections with stat/content types
782845b feat(sprint-19): T-S19-007 — cascade delete ItineraryDay/Activity/ChecklistItem
c04bc83 feat(sprint-19): T-S19-001c — fix useState stale state with key prop
7a2c734 feat(sprint-19): T-S19-001b — persist itinerary in DB after stream
d9f10b3 feat(sprint-19): T-S19-001a — parse streaming JSON into progress UI
b3816ce docs(sprint-19): planning docs, backlog, tasks, and product specs
```
