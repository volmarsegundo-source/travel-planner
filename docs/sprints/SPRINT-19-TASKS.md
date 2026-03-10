# Sprint 19 -- Task Breakdown

> Criado pelo tech-lead em 2026-03-10
> Branch: `feat/sprint-19` | Base: `master` (v0.12.0, 1288 testes)
> Capacidade: ~40h (2 devs x ~20h cada)

---

## Root Cause Analysis

### ITEM-1 [P0]: Streaming shows raw JSON, then returns to Generate screen

**Three distinct bugs in one symptom:**

1. **Raw JSON displayed**: The system prompt (`PLAN_SYSTEM_PROMPT`) instructs Claude to respond with pure JSON. The streaming endpoint (`/api/ai/plan/stream/route.ts`) sends raw AI output chunks via SSE. `Phase6Wizard.tsx` accumulates these in `streamingText` and renders them in a `<pre>` tag (line 201-203). The user sees raw JSON because the AI output IS raw JSON -- there is no intermediate formatting or progress indicator hiding it.

2. **No persistence**: The streaming route (`/api/ai/plan/stream/route.ts`) does NOT call `persistItinerary()` after the stream completes. The original non-streaming `generateTravelPlanAction` in `ai.actions.ts` DOES persist via `persistItinerary()` (line 190). The streaming route only logs token usage. So even after `router.refresh()` re-runs the server component, there is no data in the DB to load.

3. **State not refreshed**: After streaming completes and `[DONE]` is received (line 126), the component calls `router.refresh()` then `setIsGenerating(false)`. But `days` state was initialized from `initialDays` via `useState(initialDays)` (line 58) -- and `useState` only uses the initial value ONCE. Even after refresh, `days` remains `[]`, so `hasItinerary` stays `false`, showing the empty/generate screen. The component would need to be re-keyed or use `useEffect` to sync from props.

**Fix plan (3 parts)**:

- Part A: Add a `POST /api/ai/plan/persist` endpoint (or inline in the stream route's `start()` callback after `[DONE]`) that parses the accumulated JSON and calls `persistItinerary()`.
- Part B: Replace the `<pre>` raw text display with a progress indicator (spinner + step messages like "Analyzing destination...", "Creating day 1...", etc.) so the user never sees raw JSON. Alternatively, parse partial JSON to show a count of days being generated.
- Part C: After persistence + `router.refresh()`, force the component to re-read `initialDays` from the server. The cleanest approach: the parent server component passes a `key` prop based on `initialDays.length` or a version timestamp, so React remounts `Phase6Wizard` with fresh state.

**Files affected**: `src/app/api/ai/plan/stream/route.ts`, `src/components/features/expedition/Phase6Wizard.tsx`, `src/app/[locale]/(app)/expedition/[tripId]/phase-6/page.tsx`

---

### ITEM-2 [P0]: "Continuar" button broken for Phase 6+ trips

**Root cause**: The ExpeditionCard (line 42-46) places a `<Link>` at `z-0 absolute inset-0` as the overlay click target. The content sits in a div at `z-10 pointer-events-none`. This pattern works IF clicks fall through the `pointer-events-none` content to the z-0 Link below. HOWEVER, the `PhaseToolsBar` is rendered inside the `pointer-events-none` div (line 105) and its active links DO have `pointer-events-auto` and `z-20` (in `PhaseToolsBar.tsx` line 70). This correctly lets tool links intercept clicks.

The real issue is navigation behavior, not click events. When the user clicks the card (reaching the z-0 Link), they navigate to `/expedition/${tripId}`. The `ExpeditionHubPage` (line 25) calls `PhaseEngine.getCurrentPhase(tripId, userId)` and redirects based on the result. For phase 6, it redirects to `/expedition/${tripId}/phase-6`.

**The actual bug**: If `PhaseEngine.getCurrentPhase()` returns `null` (all phases completed, no "active" phase), the fallback is `phaseNumber = 1` (line 23), and the redirect goes to `/expedition/${tripId}/phase-2` (line 34). For a user who completed phase 6 and expects to revisit their itinerary, being sent to phase 2 is confusing and appears "broken".

Additionally, the `PhaseToolsBar` for phase 6 shows an "Itinerary" link (`/expedition/${tripId}/phase-6`) which DOES work (it has `pointer-events-auto z-20`). But the card's main overlay link (`z-0`) navigates to the hub which may redirect incorrectly.

**Fix plan**:

- Fix `ExpeditionHubPage` to handle the case where `getCurrentPhase` returns null or a completed-past-6 state: redirect to the highest completed phase (phase 6 if itinerary exists) rather than defaulting to phase 1.
- Verify pointer events work correctly end-to-end (the current code DOES have the right pattern -- the bug is in the redirect logic, not click handling).

**Files affected**: `src/app/[locale]/(app)/expedition/[tripId]/page.tsx`, possibly `src/lib/engines/phase-engine.ts`

---

## Analise de Capacidade

### Estimativas por item

| ID | Descricao | Estimativa | Prioridade | Atribuicao |
|----|-----------|------------|------------|------------|
| ITEM-1 | Streaming: persist + hide raw JSON + state refresh | 8h | P0 | dev-fullstack-1 |
| ITEM-2 | ExpeditionHub redirect logic for Phase 6+ | 2h | P0 | dev-fullstack-2 |
| SEC-S18-001 | ItineraryDay/Activity/ChecklistItem cascade deletion | 2h | P0 | dev-fullstack-2 |
| ITEM-3 | Progress bar wrong completed count | 1.5h | P0 | dev-fullstack-2 |
| ITEM-8 | Confirmation screen missing bio in summary | 0.5h | P0 | dev-fullstack-2 |
| ITEM-14 | Destination guide redesign (dashboard cards) | 6h | P1 | dev-fullstack-2 |
| ITEM-6 | Remove duplicate Checklist/Roteiro buttons | 1h | P1 | dev-fullstack-2 |
| ITEM-7 | Phase 1 personal info before trip info + persist in Profile | 4h | P1 | dev-fullstack-1 |
| ITEM-9 | Phase transition auto-advance without click | 2h | P1 | dev-fullstack-1 |
| ITEM-11 | Default currency based on locale | 1h | P1 | dev-fullstack-1 |
| ITEM-4 | Progress bar clickable segments for navigation | 3h | P2 | dev-fullstack-1 |
| ITEM-5 | Progress bar phase labels (number + name) | 1.5h | P2 | dev-fullstack-2 |
| ITEM-10 | Traveler count adult/child/senior breakdown | 3h | P2 | deferred |
| ITEM-12 | Expand personal preferences with toggles | 3h | P2 | deferred |

**Total P0: 14h** | **Total P1: 14h** | **Total P2 included: 4.5h** | **Grand total: 32.5h**

ITEM-10 and ITEM-12 are deferred to Sprint 20 -- they require UX research and schema changes that exceed remaining capacity.

**Margem: 7.5h** para code review, debugging, e imprevistos.

---

## Mapa de Dependencias

```
[P0 -- paralelo imediato]
T-S19-001a (stream persist endpoint)    --> independente
T-S19-001b (stream UI: hide raw JSON)   --> depende T-S19-001a
T-S19-001c (state refresh after persist) --> depende T-S19-001a
T-S19-002 (hub redirect fix)            --> independente
T-S19-003 (cascade deletion)            --> independente
T-S19-004 (progress bar count fix)      --> independente
T-S19-005 (confirmation bio fix)        --> independente

[P1 -- pode comecar em paralelo com P0]
T-S19-006 (destination guide redesign)  --> independente
T-S19-007 (remove duplicate buttons)    --> independente (mas relacionado a T-S19-006)
T-S19-008 (Phase 1 step reorder)        --> independente
T-S19-009 (auto-advance transition)     --> independente
T-S19-010 (default currency)            --> independente

[P2]
T-S19-011 (clickable progress bar)      --> depende T-S19-004
T-S19-012 (progress bar labels)         --> depende T-S19-004
```

### Timeline de execucao paralela

```
dev-fullstack-1 (streaming fix + Phase 1 reorder):
  Dia 1:  T-S19-001a (3h) -- streaming persistence endpoint
  Dia 2:  T-S19-001b (3h) -- UI: progress indicator instead of raw JSON
  Dia 3:  T-S19-001c (2h) -- state refresh + T-S19-010 (1h) -- default currency
  Dia 4:  T-S19-008 (4h) -- Phase 1 step reorder + profile persist
  Dia 5:  T-S19-009 (2h) -- auto-advance + T-S19-011 (3h) -- clickable progress bar

dev-fullstack-2 (bug fixes + dashboard redesign):
  Dia 1:  T-S19-002 (2h) + T-S19-003 (2h) -- hub redirect + cascade deletion
  Dia 2:  T-S19-004 (1.5h) + T-S19-005 (0.5h) + T-S19-007 (1h) -- progress bar + bio + duplicates
  Dia 3:  T-S19-006 (6h, parte 1) -- destination guide redesign
  Dia 4:  T-S19-006 (continuacao) + T-S19-012 (1.5h) -- labels
  Dia 5:  Buffer / code review / bugs
```

---

## Tarefas

### P0 -- Bugs Criticos

#### T-S19-001a: Streaming -- Adicionar persistencia apos stream completar (ITEM-1 parte A)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 3h (M)
- **Depende de**: nenhuma
- **Descricao**: O streaming endpoint (`/api/ai/plan/stream/route.ts`) envia chunks ao client mas NAO persiste o itinerario no banco. O `generateTravelPlanAction` original usa `persistItinerary()` -- o stream route deve fazer o mesmo. Duas opcoes: (A) acumular o output completo no stream handler, parsear JSON, e persistir inline antes de enviar `[DONE]`; ou (B) criar um endpoint separado `POST /api/ai/plan/persist` que o client chama apos `[DONE]`. Opcao A e mais simples e atomica -- preferir esta.
- **Arquivos**:
  - `src/app/api/ai/plan/stream/route.ts` -- acumular output, parsear, persistir antes de `[DONE]`
  - `src/server/actions/ai.actions.ts` -- extrair `persistItinerary` para funcao exportada (ou mover para service)
  - Testes unitarios para a logica de persistencia no stream
- **Criterio de aceite**:
  1. Apos stream completar, o JSON acumulado e parseado com o mesmo schema de `ItineraryPlan`
  2. Se parse ok: `persistItinerary(tripId, plan)` e chamado ANTES de enviar `data: [DONE]\n\n`
  3. Se parse falha: envia `data: {"error":"parse_failed"}\n\n` seguido de `data: [DONE]\n\n`
  4. Dados persistidos no banco: ItineraryDay + Activity criados corretamente
  5. Se ja existiam dados anteriores (re-geracao), os antigos sao deletados (upsert semantics)
  6. Cache Redis invalidado/atualizado apos persistencia
  7. Teste: mock do stream + verificar que `persistItinerary` e chamado com dados corretos
  8. Teste: parse failure nao causa crash -- envia erro gracioso

#### T-S19-001b: Streaming -- Substituir exibicao de JSON raw por indicador de progresso (ITEM-1 parte B)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 3h (M)
- **Depende de**: T-S19-001a
- **Descricao**: O `Phase6Wizard.tsx` mostra o texto raw do streaming em um `<pre>` tag (linhas 199-204). O usuario ve JSON cru. Substituir por um indicador de progresso amigavel: spinner + mensagens progressivas ("Analisando destino...", "Planejando dia 1...", "Finalizando roteiro..."). NAO mostrar o texto raw. Opcionalmente, parsear chunks parciais para mostrar contagem de dias detectados.
- **Arquivos**:
  - `src/components/features/expedition/Phase6Wizard.tsx` -- substituir `<pre>` por progress UI
  - Traducoes: `messages/en.json`, `messages/pt-BR.json` -- novas chaves de progresso
  - Testes unitarios para estados de progresso
- **Criterio de aceite**:
  1. Durante streaming, usuario NAO ve JSON raw em nenhum momento
  2. Exibe spinner + mensagem de progresso que muda conforme o tempo:
     - 0-5s: "Analisando destino e preferencias..."
     - 5-15s: "Planejando atividades dia a dia..."
     - 15-30s: "Otimizando roteiro..."
     - 30s+: "Quase pronto..."
  3. Se o stream acumula dados, opcionalmente mostra "X dias planejados ate agora" (parse parcial)
  4. Botao "Cancelar" continua funcional durante progresso
  5. Skeleton loaders visiveis enquanto nao ha dados
  6. Traducoes em pt-BR e en
  7. Acessibilidade: `aria-live="polite"` nos status updates
  8. Testes cobrem: transicoes de mensagem, cancelamento, ausencia de raw JSON

#### T-S19-001c: Streaming -- Fix state refresh apos persistencia (ITEM-1 parte C)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 2h (S)
- **Depende de**: T-S19-001a
- **Descricao**: Apos `router.refresh()`, o `Phase6Wizard` nao recarrega os dados porque `useState(initialDays)` so usa o valor inicial uma vez. Solucao: no server component pai (`phase-6/page.tsx`), passar um `key` prop ao `Phase6Wizard` baseado na contagem de itinerary days (ex: `key={initialDays.length}`). Quando `router.refresh()` re-renderiza o server component com novos dados, o `key` muda, forcando React a remontar o component com `initialDays` atualizado.
- **Arquivos**:
  - `src/app/[locale]/(app)/expedition/[tripId]/phase-6/page.tsx` -- adicionar `key` prop
  - `src/components/features/expedition/Phase6Wizard.tsx` -- cleanup: remover `streamingText` state que nao sera mais exibido
  - Testes unitarios
- **Criterio de aceite**:
  1. Apos streaming + persistencia + `router.refresh()`, o componente mostra o `ItineraryEditor` com os dados persistidos
  2. `Phase6Wizard` recebe `key` prop que muda quando `initialDays` muda
  3. Re-geracao funciona: apos regenerar, novo roteiro aparece sem precisar reload manual
  4. Teste: verificar que apos refresh, `hasItinerary` e `true` e `ItineraryEditor` e renderizado

---

#### T-S19-002: Fix redirect no ExpeditionHubPage para Phase 6+ (ITEM-2)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 2h (S)
- **Depende de**: nenhuma
- **Descricao**: O `ExpeditionHubPage` chama `PhaseEngine.getCurrentPhase()` e redireciona com base no resultado. Se `getCurrentPhase()` retorna `null` (todas as fases completadas), o fallback `phaseNumber = 1` redireciona para phase-2, que e confuso para usuarios na fase 6+. Corrigir para: (1) se getCurrentPhase retorna null, buscar a fase mais alta completada; (2) redirecionar para essa fase; (3) se fase >= 7, renderizar a pagina "Coming Soon" existente.
- **Arquivos**:
  - `src/app/[locale]/(app)/expedition/[tripId]/page.tsx` -- fix redirect logic
  - `src/lib/engines/phase-engine.ts` -- possivelmente adicionar `getHighestCompletedPhase()` helper
  - Testes unitarios para os novos cenarios de redirect
- **Criterio de aceite**:
  1. Se todas as fases ate 6 estao completadas e nenhuma esta "active", redireciona para phase-6
  2. Se fase atual e 6 (active), redireciona para phase-6
  3. Se fase atual e 7+ (coming soon), renderiza pagina "Coming Soon" com breadcrumbs
  4. Se nenhuma fase existe (trip sem expedition), redireciona para phase-2 (comportamento existente ok)
  5. Teste: getCurrentPhase retorna null com fases 1-6 completed -> redirect phase-6
  6. Teste: getCurrentPhase retorna phase 3 active -> redirect phase-3 (regressao)

---

#### T-S19-003: Cascade deletion de ItineraryDay/Activity/ChecklistItem na exclusao de conta (SEC-S18-001)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 2h (M)
- **Depende de**: nenhuma
- **Spec ref**: SEC-S18-001 (carry-over Sprint 18)
- **Descricao**: A transacao de exclusao em `deleteUserAccountAction` ja limpa `ExpeditionPhase`, `PhaseChecklistItem`, `ItineraryPlan`, e `DestinationGuide`, mas NAO limpa `ItineraryDay`, `Activity`, e `ChecklistItem`. Esses modelos referenciam tripId (ItineraryDay, ChecklistItem) e dayId (Activity). Como os trips sao soft-deleted (nao hard-deleted), o `onDelete: Cascade` do Prisma NAO dispara. Resultado: dados orfaos permanecem no banco (LGPD).
- **Arquivos**:
  - `src/server/actions/account.actions.ts` -- adicionar deletes na transacao
  - Testes unitarios existentes -- adicionar cobertura
- **Criterio de aceite**:
  1. Dentro da transacao existente, ANTES do soft-delete de trips:
     - Para cada tripId do usuario: deletar `Activity` via join com `ItineraryDay` (ou deletar ItineraryDay primeiro que cascadeia para Activity via DB constraint... MAS como estamos fazendo delete explicito, devemos ser explicitos)
     - `tx.activity.deleteMany({ where: { day: { tripId: { in: tripIds } } } })` -- deletar Activities primeiro (FK para ItineraryDay)
     - `tx.itineraryDay.deleteMany({ where: { tripId: { in: tripIds } } })` -- depois ItineraryDays
     - `tx.checklistItem.deleteMany({ where: { tripId: { in: tripIds } } })` -- e ChecklistItems
  2. Ordem: Activities antes de ItineraryDays (FK constraint)
  3. Tudo dentro da mesma transacao -- rollback completo se falhar
  4. Testes: verificar que `tx.activity.deleteMany`, `tx.itineraryDay.deleteMany`, `tx.checklistItem.deleteMany` sao chamados com where corretos
  5. Teste de regressao: cenario sem trips nao causa erro (tripIds = [])

---

#### T-S19-004: Fix contagem de fases completadas na progress bar (ITEM-3)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 1.5h (S)
- **Depende de**: nenhuma
- **Descricao**: A progress bar mostra "4 de 8" quando deveria mostrar "6 de 8". A contagem vem de `trip.service.ts` linha 232: `completedPhases: trip.phases.filter((p) => p.status === "completed").length`. Se fases intermediarias (ex: fase 3 e 4 com `nonBlocking: true`) foram puladas e nao tem registro `ExpeditionPhase` com `status: "completed"`, elas nao sao contadas. A logica precisa considerar que fases anteriores a `currentPhase` estao implicitamente completadas, mesmo sem registro explicito.
- **Arquivos**:
  - `src/server/services/trip.service.ts` -- fix logica de contagem
  - Testes unitarios
- **Criterio de aceite**:
  1. `completedPhases` = `max(fases com status "completed", currentPhase - 1)` -- fases anteriores a fase atual sao consideradas completadas
  2. Se currentPhase = 6, completedPhases >= 5 (mesmo que fases 3-4 nao tenham registro explicito)
  3. Texto exibido: "6 de 8" para trip na fase 6 (5 completed + 1 current... ou 6 se fase 6 tambem esta completed)
  4. Progress bar visual: 5 segmentos dourados + 1 pulsante + 2 cinza (para fase 6 ativa)
  5. Teste: trip com currentPhase=6 e 3 registros `completed` -> completedPhases = 5 (nao 3)
  6. Teste: trip com currentPhase=2 e 1 registro `completed` -> completedPhases = 1 (regressao)

---

#### T-S19-005: Fix tela de confirmacao sem bio no resumo (ITEM-8)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 0.5h (S)
- **Depende de**: nenhuma
- **Descricao**: O Step 4 (confirmacao) do `Phase1Wizard.tsx` mostra birthDate, phone, country e city no resumo (linhas 393-419), mas NAO mostra o campo `bio` que foi preenchido no Step 3. Adicionar bio ao resumo de confirmacao.
- **Arquivos**:
  - `src/components/features/expedition/Phase1Wizard.tsx` -- adicionar bio ao step 4
  - Traducoes: `messages/en.json`, `messages/pt-BR.json` -- chave para label de bio no resumo
  - Teste unitario
- **Criterio de aceite**:
  1. Se bio foi preenchido, aparece no resumo de confirmacao (step 4)
  2. Label traduzido: "Bio" / "Bio" (ou "Sobre voce" / "About you")
  3. Bio truncado a 100 chars no resumo com "..." se maior
  4. Condicional em `(birthDate || phone || country || city || bio)` para mostrar secao de perfil
  5. Teste: verificar que bio aparece no resumo quando preenchido

---

### P1 -- Melhorias

#### T-S19-006: Redesign do guia de destino com cards no dashboard (ITEM-14)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 6h (L)
- **Depende de**: nenhuma
- **Descricao**: Redesenhar a apresentacao do guia de destino no dashboard. Atualmente, o guia e acessado via link na PhaseToolsBar. O redesign deve mostrar cards de preview no dashboard com informacoes resumidas (clima, idioma, moeda, melhor epoca) quando o guia ja foi gerado, com link para ver guia completo. Layout responsivo com 2-3 cards por linha.
- **Arquivos**:
  - `src/components/features/dashboard/DestinationGuidePreview.tsx` (novo) -- componente de preview card
  - `src/components/features/dashboard/AtlasDashboard.tsx` -- integrar preview cards
  - `src/app/[locale]/(app)/dashboard/page.tsx` -- query dados do guia
  - `src/server/services/trip.service.ts` -- adicionar dados do guia ao query existente
  - Traducoes: novas chaves
  - Testes unitarios
- **Criterio de aceite**:
  1. Dashboard mostra cards de preview do guia para expeditions que tem guia gerado
  2. Cada card mostra: destino, clima resumido, moeda local, 1-2 dicas rapidas
  3. Card clicavel leva para `/expedition/{tripId}/phase-5` (pagina completa do guia)
  4. Layout responsivo: 1 coluna mobile, 2 colunas tablet, 3 colunas desktop
  5. Se nao tem guia gerado, nao mostra card de preview
  6. Estilo consistente com ExpeditionCard existente
  7. Traducoes em pt-BR e en
  8. Testes cobrem: renderizacao com/sem guia, layout responsivo, link correto

---

#### T-S19-007: Remover botoes duplicados de Checklist/Roteiro no ExpeditionCard (ITEM-6)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 1h (S)
- **Depende de**: nenhuma (mas relacionado a T-S19-006)
- **Spec ref**: DEBT-S18-001 (PhaseToolsBar duplica checklist/itinerary shortcuts)
- **Descricao**: O `ExpeditionCard` tem shortcuts manuais para Checklist (fase >= 5) e Itinerary (hasItineraryPlan) nas linhas 82-103, E TAMBEM mostra `PhaseToolsBar` que inclui "Checklist" (fase 5) e "Itinerary" (fase 6). Resultado: botoes duplicados. Remover os shortcuts manuais e manter apenas o `PhaseToolsBar` como fonte unica de atalhos. O `PhaseToolsBar` ja tem os mesmos links com icones e labels traduzidos.
- **Arquivos**:
  - `src/components/features/dashboard/ExpeditionCard.tsx` -- remover bloco linhas 82-103
  - `src/components/features/dashboard/ChecklistProgressMini.tsx` -- manter (nao e botao duplicado, e badge de progresso)
  - Testes unitarios -- atualizar para refletir nova estrutura
- **Criterio de aceite**:
  1. Nao ha botoes duplicados de "Checklist" ou "Roteiro" no card
  2. `PhaseToolsBar` e a unica fonte de atalhos de ferramentas
  3. `ChecklistProgressMini` badge continua visivel (nao e um botao, e indicador de progresso)
  4. Links da PhaseToolsBar continuam funcionais (pointer-events-auto z-20)
  5. Testes atualizados para nova estrutura

---

#### T-S19-008: Reordenar Phase 1 -- info pessoal antes de info da viagem (ITEM-7)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 4h (M)
- **Depende de**: nenhuma
- **Descricao**: Atualmente, o Phase1Wizard tem 4 steps: (1) Destino, (2) Datas, (3) Sobre Voce, (4) Confirmacao. O stakeholder pede que info pessoal venha ANTES de info da viagem: (1) Sobre Voce, (2) Destino, (3) Datas, (4) Confirmacao. Alem disso, os dados pessoais devem ser persistidos no `UserProfile` ao confirmar (ja acontece via `createExpeditionAction` -> `profileFields`). Se o usuario ja tem perfil preenchido, os campos devem vir pre-populados (ler do `UserProfile` no server component e passar como props).
- **Arquivos**:
  - `src/components/features/expedition/Phase1Wizard.tsx` -- reordenar steps
  - `src/app/[locale]/(app)/expedition/new/page.tsx` -- query UserProfile e passar como props
  - Traducoes: ajustar subtitles se necessario
  - Testes unitarios -- ajustar ordem dos steps
- **Criterio de aceite**:
  1. Ordem dos steps: (1) Sobre Voce, (2) Destino, (3) Datas, (4) Confirmacao
  2. Step 1 (Sobre Voce) mostra campos: birthDate, phone, country, city, bio
  3. Se usuario ja tem UserProfile, campos pre-populados
  4. Step "Sobre Voce" e opcional -- usuario pode avancar sem preencher nada
  5. Confirmacao mostra TODOS os dados (pessoais + viagem + bio)
  6. `createExpeditionAction` recebe os mesmos `profileFields` (sem mudanca no backend)
  7. Navegacao back/next funciona corretamente com nova ordem
  8. Testes cobrem: ordem dos steps, pre-populacao, skip sem preencher

---

#### T-S19-009: Auto-avanco de transicao de fase sem click (ITEM-9)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 2h (S)
- **Depende de**: nenhuma
- **Descricao**: O `PhaseTransition.tsx` mostra uma animacao de transicao entre fases com botao "Continuar" que o usuario precisa clicar. O stakeholder pede auto-avanco: apos exibir a animacao por ~3 segundos, avancar automaticamente sem necessidade de click. Manter o botao como fallback para acessibilidade e impaciencia.
- **Arquivos**:
  - `src/components/features/expedition/PhaseTransition.tsx` -- adicionar timer de auto-avanco
  - Testes unitarios
- **Criterio de aceite**:
  1. Apos exibir o estado "Avancando para fase X" por 3 segundos, chamar `onContinue()` automaticamente
  2. Botao "Continuar" permanece visivel e funcional (click imediato cancela o timer)
  3. Se usuario clica antes dos 3s, timer e cancelado (nao chama onContinue duas vezes)
  4. Timer e cancelado no cleanup do useEffect (evita memory leak)
  5. Teste: verificar que onContinue e chamado apos timeout
  6. Teste: verificar que click manual cancela timer

---

#### T-S19-010: Moeda padrao baseada no locale (ITEM-11)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 1h (S)
- **Depende de**: nenhuma
- **Descricao**: O Phase2Wizard (ou onde budget/currency e definido) usa USD como default. Quando locale = pt-BR, o default deveria ser BRL. Criar um mapeamento simples de locale para moeda padrao e usar como valor inicial.
- **Arquivos**:
  - `src/lib/utils/currency.ts` (novo) -- `getDefaultCurrency(locale: string): string`
  - Component que define currency (Phase2Wizard ou similar) -- usar `getDefaultCurrency`
  - Testes unitarios
- **Criterio de aceite**:
  1. `getDefaultCurrency("pt-BR")` retorna `"BRL"`
  2. `getDefaultCurrency("en")` retorna `"USD"`
  3. Fallback para locale desconhecido: `"USD"`
  4. Componente de budget usa o resultado como default (sem impedir usuario de mudar)
  5. Teste unitario para o mapeamento

---

### P2 -- Nice-to-Have

#### T-S19-011: Progress bar com segmentos clicaveis para navegacao (ITEM-4)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 3h (M)
- **Depende de**: T-S19-004
- **Descricao**: Os segmentos da `DashboardPhaseProgressBar` sao atualmente divs nao-interativos. Tornar segmentos de fases completadas e fase atual clicaveis, navegando para a fase correspondente. Fases futuras e "Em construcao" nao sao clicaveis.
- **Arquivos**:
  - `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` -- tornar segmentos clicaveis
  - Testes unitarios
- **Criterio de aceite**:
  1. Segmentos completados: clicaveis, navegam para `/expedition/{tripId}/phase-{N}`
  2. Segmento atual: clicavel, navega para a fase atual
  3. Segmentos futuros: nao-clicaveis, cursor default
  4. Segmentos 7-8: nao-clicaveis, tooltip "Em construcao"
  5. Cursor: pointer em segmentos clicaveis, default em nao-clicaveis
  6. Precisa receber `tripId` como prop (atualmente nao recebe)
  7. Pointer-events: segmentos clicaveis com `pointer-events-auto` (dentro do container pointer-events-none do ExpeditionCard)
  8. Testes cobrem: renderizacao de links para fases completadas, ausencia de links para futuras

---

#### T-S19-012: Labels de fase na progress bar (ITEM-5)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 1.5h (S)
- **Depende de**: T-S19-004
- **Descricao**: Adicionar numero + nome da fase como label visivel em cada segmento da progress bar. Em mobile, mostrar apenas o numero. Em desktop, mostrar numero + nome abreviado. Tooltip ja existe (title attribute).
- **Arquivos**:
  - `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` -- adicionar labels
  - Testes unitarios
- **Criterio de aceite**:
  1. Cada segmento mostra o numero da fase (1-8) centralmente
  2. Em telas >= sm: mostra nome abreviado da fase abaixo da barra (ou como tooltip expandido)
  3. Layout nao quebra em mobile -- numeros sao pequenos (text-[10px])
  4. Contraste acessivel: numeros legiveis sobre as cores de fundo dos segmentos
  5. Testes cobrem: renderizacao dos numeros, responsividade

---

## Distribuicao de Carga

| Dev | Tarefas | Total |
|-----|---------|-------|
| `dev-fullstack-1` | T-S19-001a (3h) + T-S19-001b (3h) + T-S19-001c (2h) + T-S19-008 (4h) + T-S19-009 (2h) + T-S19-010 (1h) + T-S19-011 (3h) | **18h** |
| `dev-fullstack-2` | T-S19-002 (2h) + T-S19-003 (2h) + T-S19-004 (1.5h) + T-S19-005 (0.5h) + T-S19-006 (6h) + T-S19-007 (1h) + T-S19-012 (1.5h) | **14.5h** |

**Nota sobre balanceamento**: dev-fullstack-1 tem mais horas porque as 3 partes do ITEM-1 (streaming fix) sao complexas e sequenciais. dev-fullstack-2 pode absorver T-S19-011 se dev-fullstack-1 ficar atrasado.

---

## Itens Deferidos (Sprint 20)

| Item | Motivo |
|------|--------|
| ITEM-10 | Breakdown adulto/crianca/senior requer mudanca de schema (Trip.travelers Int -> relacao) + UX research |
| ITEM-12 | Preferencias expandidas com toggles requer ADR + pesquisa de opcoes relevantes |
| ITEM-13 | Planejamento de transporte -- deferido pelo stakeholder |

---

## Definition of Done

- [ ] Todas as tarefas acima marcadas [x]
- [ ] Code review aprovado pelo tech-lead
- [ ] Cobertura de testes >= 80% nos arquivos novos/modificados
- [ ] Security checklist passed:
  - [ ] SEC-S18-001 resolvido: ItineraryDay/Activity/ChecklistItem deletados na exclusao de conta
  - [ ] Persistencia no streaming nao expoe dados entre usuarios (BOLA check mantido)
  - [ ] Nenhum segredo hardcoded
  - [ ] Zero userId raw em novos logger calls
- [ ] Bias & ethics checklist passed:
  - [ ] Moeda default baseada em locale e nao em nacionalidade (nao-discriminatorio)
  - [ ] Mensagens de progresso neutras e inclusivas
  - [ ] Nenhuma logica discriminatoria nos redirects
- [ ] Nenhum import de `next/link` ou `next/navigation` em components (exceto excecoes documentadas)
- [ ] Build passa sem erros
- [ ] Todos os testes passam (meta: >= 1340 testes)
- [ ] PR mergeado para main via feature branch

---

## Notas Tecnicas para Devs

### Streaming persistence (T-S19-001a)

A funcao `persistItinerary` esta em `src/server/actions/ai.actions.ts` (linha 33) como funcao privada. Para reutiliza-la no stream route, extrair para um modulo compartilhado:

```
Opcao recomendada:
  src/server/services/itinerary.service.ts -- novo arquivo
  - exporta persistItinerary(tripId, plan)
  - importado por ai.actions.ts E stream/route.ts
```

No stream route, acumular output DENTRO do `start()` callback do ReadableStream:

```
let accumulated = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  accumulated += value;  // acumular antes de enviar
  controller.enqueue(encoder.encode(`data: ${value}\n\n`));
}
// Parsear e persistir ANTES de enviar [DONE]
const plan = parseItineraryJSON(accumulated);
await persistItinerary(tripId, plan);
controller.enqueue(encoder.encode("data: [DONE]\n\n"));
controller.close();
```

### ExpeditionHubPage redirect fix (T-S19-002)

Logica corrigida:

```typescript
let phaseNumber = 1;
try {
  const currentPhase = await PhaseEngine.getCurrentPhase(tripId, userId);
  if (currentPhase) {
    phaseNumber = currentPhase.phaseNumber;
  } else {
    // Nenhuma fase "active" -- buscar a mais alta completada
    const highest = await PhaseEngine.getHighestCompletedPhase(tripId, userId);
    phaseNumber = highest?.phaseNumber ?? 1;
  }
} catch {
  // fallback
}
```

### Cascade deletion order (T-S19-003)

Adicionar DENTRO do bloco `if (tripIds.length > 0)` existente, ANTES dos deletes existentes:

```typescript
// Activities -> ItineraryDays -> ChecklistItems (FK order)
await tx.activity.deleteMany({
  where: { day: { tripId: { in: tripIds } } },
});
await tx.itineraryDay.deleteMany({
  where: { tripId: { in: tripIds } },
});
await tx.checklistItem.deleteMany({
  where: { tripId: { in: tripIds } },
});
```

### Progress bar count fix (T-S19-004)

Em `trip.service.ts` linha 232, mudar de:
```typescript
completedPhases: trip.phases.filter((p) => p.status === "completed").length,
```
Para:
```typescript
completedPhases: Math.max(
  trip.phases.filter((p) => p.status === "completed").length,
  trip.currentPhase - 1,  // fases antes da atual sao implicitamente completadas
),
```

### Phase1Wizard step reorder (T-S19-008)

Mapeamento de steps antigo -> novo:
```
Antigo: Step 1 (Destino) -> Step 2 (Datas) -> Step 3 (Sobre Voce) -> Step 4 (Confirm)
Novo:   Step 1 (Sobre Voce) -> Step 2 (Destino) -> Step 3 (Datas) -> Step 4 (Confirm)
```

O server component `expedition/new/page.tsx` deve fazer query ao UserProfile e passar campos existentes como props para pre-popular o step 1.
