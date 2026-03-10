# Sprint 18 -- Task Breakdown

> Criado pelo tech-lead em 2026-03-09
> Branch: `feat/sprint-18` | Base: `master` (v0.11.0, 1231 testes)
> Capacidade: ~40h (2 devs x ~20h cada)

---

## Decisoes do Stakeholder (referencia)

| ID | Decisao |
|----|---------|
| Q1 | Implementar streaming para resolver timeout 10s do Vercel Hobby |
| Q2 | Coletar localizacao no onboarding + editavel no perfil (prep Sprint 19+) |
| Q3 | Estimativas de transporte somente via IA (sem integracao booking) |
| Q4 | Mostrar fases 7-8 como "Em construcao" no dashboard |
| Q5 | Auto-gerar roteiro na primeira visita + disclaimer IA + botao Regenerar |
| Q6 | ANTHROPIC_API_KEY ja configurada no Vercel staging |
| Q7 | Pular ENCRYPTION_KEY para staging |

---

## Analise de Capacidade

### Estimativas por item

| Item | Descricao | Estimativa | Prioridade |
|------|-----------|------------|------------|
| SEC-S17-003 | Limpeza dados na exclusao de conta | 2h | P0 |
| SEC-S17-004 | Hash userId em trip.actions.ts | 0.5h | P0 |
| SEC-S17-005 | Hash userId em auth.service.ts | 0.5h | P0 |
| SEC-S17-006 | Hash userId em profile.service.ts | 0.25h | P0 |
| ITEM-9 | Botao "Continue" nao funciona (z-index) | 1h | P0 |
| ITEM-6 | Streaming AI (ClaudeProvider + API route + UI) | 14h | P0 |
| ITEM-5 | Auto-geracao + disclaimer + Regenerar | 4h | P1 (depende ITEM-6) |
| ITEM-8 | Dashboard cards com ferramentas de fase + "Em construcao" | 8h | P1 |
| ITEM-7 | Barra de progresso com indicadores de fase | 5h | P1 |
| ITEM-1 | Busca destinos i18n + performance | 2h | P1 |

**Total estimado: ~37.25h**

### Veredito de capacidade

Os itens P0 somam **18.25h**. Os itens P1 somam **19h**. Total: **37.25h**.
Cabe nas 40h com ~2.75h de margem para code review, debugging e imprevistos.

**RISCO**: Streaming (ITEM-6 a 14h) e o item de maior incerteza tecnica.
Se exceder a estimativa, ITEM-7 (barra de progresso) sera o primeiro item cortado.

**Decisao**: Incluir todos os itens. Se ITEM-6 ultrapassar 16h, cortar ITEM-7.

---

## Mapa de Dependencias

```
T-S18-001 (z-index fix)           --> independente, pode comecar imediato
T-S18-002 (account deletion)      --> independente, pode comecar imediato
T-S18-003 (hash trip.actions)     --> independente, pode comecar imediato
T-S18-004 (hash auth.service)     --> independente, pode comecar imediato
T-S18-005 (hash profile.service)  --> independente, pode comecar imediato

T-S18-006 (streaming provider)    --> independente, comecar imediato
T-S18-007 (streaming API route)   --> depende T-S18-006
T-S18-008 (streaming UI Phase6)   --> depende T-S18-007

T-S18-009 (auto-gen + disclaimer) --> depende T-S18-008
T-S18-010 (dashboard cards + "Em construcao") --> independente
T-S18-011 (progress bar fases)    --> independente, paralelo com T-S18-010
T-S18-012 (busca destinos i18n)   --> independente
```

### Timeline de execucao paralela

```
dev-fullstack-1 (backend-heavy):
  Dia 1:  T-S18-003 (0.5h) + T-S18-004 (0.5h) + T-S18-005 (0.25h) + T-S18-006 (inicio)
  Dia 2:  T-S18-006 (streaming provider, continuacao)
  Dia 3:  T-S18-006 (conclusao) + T-S18-007 (streaming API route)
  Dia 4:  T-S18-007 (conclusao) + T-S18-012 (busca destinos)
  Dia 5:  Buffer / code review / bugs

dev-fullstack-2 (frontend-heavy):
  Dia 1:  T-S18-001 (1h) + T-S18-002 (2h) + T-S18-010 (inicio)
  Dia 2:  T-S18-010 (dashboard cards, continuacao)
  Dia 3:  T-S18-010 (conclusao) + T-S18-011 (progress bar, inicio)
  Dia 4:  T-S18-011 (conclusao) + T-S18-008 (streaming UI, depende T-S18-007)
  Dia 5:  T-S18-008 (conclusao) + T-S18-009 (auto-gen + disclaimer)
```

---

## Tarefas

### P0 -- Bugs

#### T-S18-001: Fix z-index/pointer-events no ExpeditionCard (ITEM-9)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 1h (S)
- **Depende de**: nenhuma
- **Descricao**: O botao "Continue" do ExpeditionCard nao responde a cliques. A causa raiz e o padrao de overlay link: o `<Link>` com `absolute inset-0 z-0` e coberto pelo `<div>` de conteudo com `z-10`, que intercepta os pointer events antes de chegarem ao link subjacente. O conteudo precisa de `pointer-events-none` com `pointer-events-auto` explicito nos sub-links interativos (checklist, itinerary shortcuts).
- **Arquivos**: `src/components/features/dashboard/ExpeditionCard.tsx`, teste correspondente
- **Criterio de aceite**:
  1. Clicar em qualquer area do card (exceto shortcuts) navega para `/expedition/{tripId}`
  2. Clicar nos shortcuts de checklist/itinerary navega para a fase correta
  3. Hover state do card funciona corretamente
  4. Testes unitarios cobrem a renderizacao dos links e seus hrefs
  5. Acessibilidade: navegacao por teclado (Tab + Enter) funciona em todos os links

---

### P0 -- Seguranca (carry-over Sprint 17)

#### T-S18-002: Limpeza completa de dados na exclusao de conta (SEC-S17-003)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 2h (M)
- **Depende de**: nenhuma
- **Spec ref**: docs/sprints/SPRINT-18-BACKLOG-SEEDS.md (SEC-S17-003)
- **Descricao**: A transacao de exclusao em `deleteUserAccountAction` faz soft-delete do User e limpa Account/Session, mas NAO remove UserProfile, UserProgress, PointTransaction, UserBadge, nem ExpeditionPhase. Dados orfaos permanecem no banco com informacoes comportamentais e pessoais (LGPD). Adicionar deletes dentro da transacao existente.
- **Arquivos**:
  - `src/server/actions/account.actions.ts` -- adicionar deletes na transacao
  - `tests/unit/server/account.actions.test.ts` -- testes de cobertura
- **Criterio de aceite**:
  1. Ao excluir conta, UserProfile do usuario e deletado (hard delete)
  2. Ao excluir conta, UserBadge do usuario e deletado (hard delete)
  3. Ao excluir conta, PointTransaction do usuario e deletada (hard delete)
  4. Ao excluir conta, UserProgress do usuario e deletado (hard delete)
  5. Ao excluir conta, ExpeditionPhase das trips do usuario e deletada (hard delete)
  6. Tudo dentro da mesma transacao -- se qualquer delete falhar, rollback completo
  7. Teste unitario valida que `tx.userProfile.deleteMany`, `tx.userBadge.deleteMany`, `tx.pointTransaction.deleteMany`, `tx.userProgress.deleteMany`, `tx.expeditionPhase.deleteMany` sao chamados com os where corretos
  8. Teste verifica que ExpeditionPhase usa tripIds do usuario (join via Trip)

#### T-S18-003: Hash userId em trip.actions.ts (SEC-S17-004)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 0.5h (S)
- **Depende de**: nenhuma
- **Spec ref**: docs/sprints/SPRINT-18-BACKLOG-SEEDS.md (SEC-S17-004)
- **Descricao**: `trip.actions.ts` loga `userId: session.user.id` em texto claro em 5 pontos de `logger.error`. Substituir por `hashUserId()` de `@/lib/hash`.
- **Arquivos**:
  - `src/server/actions/trip.actions.ts`
  - Teste existente (se houver) -- verificar que logs usam hash
- **Criterio de aceite**:
  1. Importar `hashUserId` de `@/lib/hash`
  2. Todas as 5 ocorrencias de `userId: session.user.id` substituidas por `userIdHash: hashUserId(session.user.id)`
  3. Zero ocorrencias de userId raw em logger calls no arquivo
  4. Grep confirma: `grep -n "userId: session" src/server/actions/trip.actions.ts` retorna zero resultados

#### T-S18-004: Hash userId em auth.service.ts (SEC-S17-005)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 0.5h (S)
- **Depende de**: nenhuma
- **Spec ref**: docs/sprints/SPRINT-18-BACKLOG-SEEDS.md (SEC-S17-005)
- **Descricao**: `auth.service.ts` loga userId em texto claro em 5 pontos de `logger.info` cobrindo fluxos criticos (registro, verificacao de email, reset de senha). Substituir por `hashUserId()`.
- **Arquivos**:
  - `src/server/services/auth.service.ts`
- **Criterio de aceite**:
  1. Importar `hashUserId` de `@/lib/hash`
  2. Todas as ocorrencias de userId raw em logger calls substituidas por `hashUserId()`
  3. Zero ocorrencias de userId raw em logger calls no arquivo
  4. Testes existentes continuam passando

#### T-S18-005: Hash userId em profile.service.ts (SEC-S17-006)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 0.25h (S)
- **Depende de**: nenhuma
- **Spec ref**: docs/sprints/SPRINT-18-BACKLOG-SEEDS.md (SEC-S17-006)
- **Descricao**: `profile.service.ts:68` loga `userId` raw em `logger.info("profile.fieldsUpdated")`. Substituir por `hashUserId()`.
- **Arquivos**:
  - `src/server/services/profile.service.ts`
- **Criterio de aceite**:
  1. Importar `hashUserId` de `@/lib/hash`
  2. `userId` raw substituido por `userIdHash: hashUserId(userId)` no logger call
  3. Testes existentes continuam passando

---

### P0 -- Streaming AI (ITEM-6)

#### T-S18-006: Implementar streaming no ClaudeProvider

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 6h (L)
- **Depende de**: nenhuma
- **Descricao**: Adicionar metodo `generateStreamingResponse()` ao `AiProvider` interface e implementar no `ClaudeProvider` usando `client.messages.stream()` da Anthropic SDK. O metodo deve retornar um `ReadableStream<string>` que emite chunks de texto conforme chegam. Manter o metodo `generateResponse()` existente intacto para checklist/guide (que nao precisam de streaming). O streaming resolve o timeout de 10s do Vercel Hobby plan ao manter a conexao ativa com chunks progressivos.
- **Arquivos**:
  - `src/server/services/ai-provider.interface.ts` -- adicionar `generateStreamingResponse` a interface
  - `src/server/services/providers/claude.provider.ts` -- implementar com `client.messages.stream()`
  - Testes unitarios para o novo metodo
- **Criterio de aceite**:
  1. `AiProvider` interface tem novo metodo: `generateStreamingResponse(prompt, maxTokens, model, options?) => Promise<ReadableStream<string>>`
  2. `ClaudeProvider` implementa usando `client.messages.stream()` (NOT `client.messages.create` com `stream: true`)
  3. Stream emite chunks de texto conforme `content_block_delta` events chegam
  4. Stream fecha corretamente ao receber `message_stop`
  5. Erros (auth, rate limit, timeout) sao propagados corretamente via stream error
  6. Token usage e logado apos stream completar (via `finalMessage` ou acumulacao manual)
  7. Timeout de 90s mantido via AbortSignal
  8. Testes unitarios com mock da Anthropic SDK cobrem: sucesso, erro de auth, rate limit, timeout

#### T-S18-007: Criar API route de streaming para itinerario

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 5h (M)
- **Depende de**: T-S18-006
- **Descricao**: Server Actions do Next.js NAO suportam streaming de response body. Criar uma API Route (`POST /api/ai/plan/stream`) que usa o novo `generateStreamingResponse()` e retorna um `ReadableStream` ao client. A rota deve incluir todas as validacoes que existem em `generateTravelPlanAction`: auth, Zod validation, rate limiting, BOLA check, age guard, input sanitization, PII masking. Apos o stream completar, persistir o itinerario no banco (via callback no stream ou endpoint separado de confirmacao).
- **Arquivos**:
  - `src/app/api/ai/plan/stream/route.ts` (novo)
  - `src/server/services/ai.service.ts` -- adicionar metodo `generateTravelPlanStream()` que retorna ReadableStream
  - Testes unitarios para a rota e o metodo do service
- **Criterio de aceite**:
  1. `POST /api/ai/plan/stream` aceita body `{ tripId, destination, startDate, endDate, travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes? }`
  2. Retorna `Response` com header `Content-Type: text/event-stream` e body como ReadableStream
  3. Valida auth (401 se nao autenticado)
  4. Valida input com Zod (400 se invalido)
  5. Aplica rate limiting (429 se excedido)
  6. Verifica BOLA: trip pertence ao usuario (404 se nao)
  7. Verifica age guard (403 se menor de 18)
  8. Sanitiza input com `sanitizeForPrompt()` + `maskPII()`
  9. Stream envia chunks como Server-Sent Events: `data: {chunk}\n\n`
  10. Ultimo evento: `data: [DONE]\n\n` com JSON completo do plano parseado/validado
  11. Apos stream completar, persiste itinerario no banco (reutiliza `persistItinerary`)
  12. Log de token usage apos stream completar
  13. Cache: resultado final cacheado no Redis (mesma chave que `generateTravelPlan`)
  14. Testes cobrem: sucesso, auth failure, validation failure, rate limit, BOLA violation

#### T-S18-008: Streaming UI no Phase6Wizard

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 3h (M)
- **Depende de**: T-S18-007
- **Descricao**: Atualizar Phase6Wizard para consumir a API de streaming em vez de chamar `generateTravelPlanAction`. O componente deve mostrar o texto sendo gerado progressivamente (typing effect) durante a geracao, e ao final parsear o JSON completo para renderizar o ItineraryEditor. Isso elimina a experiencia de "tela preta" durante geracao e evita o timeout de 10s.
- **Arquivos**:
  - `src/components/features/expedition/Phase6Wizard.tsx`
  - Testes unitarios para os novos estados do componente
- **Criterio de aceite**:
  1. `handleGenerate()` usa `fetch('/api/ai/plan/stream', ...)` em vez de `generateTravelPlanAction()`
  2. Durante streaming, exibe texto sendo gerado progressivamente (typing effect)
  3. Estado visual: "Gerando..." com texto parcial aparecendo
  4. Ao receber `[DONE]`, faz `router.refresh()` para carregar dados persistidos
  5. Erros HTTP (401, 429, 400, 404, 500) mapeados para mensagens amigaveis
  6. Erro de rede/timeout mostra mensagem generica
  7. Botao "Gerar" desabilitado durante streaming
  8. Botao "Cancelar" disponivel durante streaming (usa AbortController)
  9. Testes cobrem: estado inicial, estado streaming, estado sucesso, estado erro

---

### P1 -- Melhorias

#### T-S18-009: Auto-geracao de roteiro + disclaimer IA + Regenerar (ITEM-5)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 4h (M)
- **Depende de**: T-S18-008
- **Descricao**: Quando o usuario visita a fase 6 pela primeira vez e nao tem roteiro gerado, disparar a geracao automaticamente (streaming). Adicionar disclaimer de IA visivel ("Roteiro gerado por IA -- verifique informacoes criticas"). Manter botao "Regenerar" para re-geracao manual. O auto-trigger so dispara uma vez (guardar flag em state ou verificar se ja existe itinerario).
- **Arquivos**:
  - `src/components/features/expedition/Phase6Wizard.tsx` -- auto-trigger + disclaimer
  - Traducoes: `messages/en.json`, `messages/pt-BR.json` -- novas chaves
  - Testes unitarios
- **Criterio de aceite**:
  1. Na primeira visita a fase 6 sem roteiro, geracao inicia automaticamente
  2. Auto-geracao NAO dispara se ja existe roteiro (initialDays.length > 0)
  3. Auto-geracao NAO dispara em visitas subsequentes se usuario cancelou
  4. Disclaimer de IA visivel abaixo do roteiro gerado: "Conteudo gerado por inteligencia artificial. Verifique informacoes criticas como horarios, precos e requisitos de visto antes de viajar."
  5. Disclaimer estilizado como banner info (nao alarme), com icone de IA
  6. Botao "Regenerar" presente e funcional (reutiliza streaming)
  7. Traducoes em pt-BR e en
  8. Testes cobrem: auto-trigger, disclaimer visivel, regenerar funcional

#### T-S18-010: Dashboard cards com ferramentas de fase + "Em construcao" (ITEM-8 + Q4)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 8h (L)
- **Depende de**: nenhuma (pode comecar em paralelo)
- **Descricao**: Redesenhar os ExpeditionCards no dashboard para mostrar ferramentas relevantes por fase (ex: "Ver Checklist", "Ver Roteiro", "Ver Guia") e indicar fases 7-8 como "Em construcao". Cada card deve mostrar a fase atual com icone e nome, atalhos para ferramentas desbloqueadas, e um indicador visual para fases futuras nao implementadas.
- **Arquivos**:
  - `src/components/features/dashboard/ExpeditionCard.tsx` -- redesenho com ferramentas
  - `src/components/features/dashboard/PhaseToolsBar.tsx` (novo) -- barra de atalhos por fase
  - `src/components/features/dashboard/AtlasDashboard.tsx` -- passar dados adicionais
  - `src/app/[locale]/(app)/dashboard/page.tsx` -- query dados adicionais se necessario
  - Traducoes: novas chaves para nomes de fase e "Em construcao"
  - Testes unitarios
- **Criterio de aceite**:
  1. Card mostra nome da fase atual com icone (usando `PHASE_DEFINITIONS[].nameKey`)
  2. Card mostra atalhos para ferramentas desbloqueadas:
     - Fase >= 3: link "Guia do Destino" (fase 3)
     - Fase >= 4: link "Hospedagem" (fase 4)
     - Fase >= 5: link "Checklist" (fase 5)
     - Fase >= 6 ou hasItineraryPlan: link "Roteiro" (fase 6)
  3. Se currentPhase >= 7: mostrar badge "Em construcao" com icone de obras
  4. Fases 7-8 na UI de progresso aparecem com estilo diferenciado (opacidade reduzida, icone de cadeado/obras)
  5. Traducoes em pt-BR e en
  6. Testes unitarios cobrem: renderizacao condicional de atalhos, badge "Em construcao", fases futuras

#### T-S18-011: Barra de progresso com indicadores de fase (ITEM-7)

- **Assignee**: `dev-fullstack-2`
- **Estimativa**: 5h (M)
- **Depende de**: nenhuma (pode comecar em paralelo)
- **Descricao**: Substituir a barra de progresso simples no ExpeditionCard por uma barra segmentada com indicadores por fase. Cada segmento representa uma fase (1-8), com cores diferentes para: completada (dourado), atual (pulsante), futura (cinza), e "em construcao" (hachurado/opaco) para fases 7-8.
- **Arquivos**:
  - `src/components/features/dashboard/PhaseProgressBar.tsx` (novo)
  - `src/components/features/dashboard/ExpeditionCard.tsx` -- substituir barra simples
  - Testes unitarios
- **Criterio de aceite**:
  1. Barra segmentada com 8 segmentos (um por fase)
  2. Segmentos completados: cor dourada solida com checkmark
  3. Segmento atual: cor primaria com animacao pulse sutil
  4. Segmentos futuros (3-6): cor cinza
  5. Segmentos 7-8: estilo "em construcao" (hachurado ou opacidade 50%)
  6. Tooltip ou aria-label em cada segmento com nome da fase
  7. Responsivo: funciona em mobile sem quebrar layout
  8. Testes unitarios cobrem: todas as combinacoes de estado (fase 1, fase 4, fase 7, fase 8)

#### T-S18-012: Busca de destinos -- i18n e performance (ITEM-1)

- **Assignee**: `dev-fullstack-1`
- **Estimativa**: 2h (S)
- **Depende de**: nenhuma
- **Descricao**: Melhorias rapidas na busca de destinos: (1) passar `accept-language` header para Nominatim baseado no locale do usuario para receber nomes localizados, (2) adicionar debounce mais longo (500ms em vez do atual) no client para reduzir chamadas redundantes, (3) cachear por locale (prefixar cacheKey com locale).
- **Arquivos**:
  - `src/app/api/destinations/search/route.ts` -- accept-language + cache key com locale
  - `src/components/features/expedition/DestinationAutocomplete.tsx` -- debounce
  - Testes unitarios
- **Criterio de aceite**:
  1. Nominatim recebe header `Accept-Language` com o locale do usuario (ex: `pt-BR,pt;q=0.9,en;q=0.8`)
  2. Cache key inclui locale: `dest:search:{locale}:{query}`
  3. Debounce no client ajustado para 500ms
  4. Resultados em portugues quando locale = pt-BR (ex: "Londres" em vez de "London")
  5. Testes cobrem: header enviado, cache key com locale, resultados parseados

---

## Distribuicao de Carga

| Dev | Tarefas | Total |
|-----|---------|-------|
| `dev-fullstack-1` | T-S18-003 (0.5h) + T-S18-004 (0.5h) + T-S18-005 (0.25h) + T-S18-006 (6h) + T-S18-007 (5h) + T-S18-012 (2h) | **14.25h** |
| `dev-fullstack-2` | T-S18-001 (1h) + T-S18-002 (2h) + T-S18-008 (3h) + T-S18-009 (4h) + T-S18-010 (8h) + T-S18-011 (5h) | **23h** |

**Nota sobre desbalanceamento**: dev-fullstack-2 tem mais horas porque T-S18-008 e T-S18-009 dependem do trabalho de streaming de dev-fullstack-1 e so podem comecar apos T-S18-007. Na pratica, dev-fullstack-2 comeca com T-S18-001 + T-S18-002 + T-S18-010 + T-S18-011 (16h) em paralelo enquanto dev-fullstack-1 trabalha em streaming. Quando streaming estiver pronto (dia 3-4), dev-fullstack-2 faz T-S18-008 + T-S18-009 (7h).

Se dev-fullstack-1 terminar antes, pode assumir T-S18-011 para rebalancear.

---

## Itens Deferidos (Sprint 19+)

| Item | Motivo |
|------|--------|
| ITEM-2 | Profile toggles/checkboxes -- LOW severity, precisa pesquisa UX |
| ITEM-3 | Deteccao viagem internacional + transporte -- tamanho L, precisa ADR-009 |
| ITEM-4 | Redesign guia do destino -- precisa input do UX designer |
| Q2 | Localizacao do usuario no onboarding -- prep para ITEM-3, depende de ADR-009 |

---

## Definition of Done

- [ ] Todas as tarefas acima marcadas [x]
- [ ] Code review aprovado pelo tech-lead
- [ ] Cobertura de testes >= 80% nos arquivos novos/modificados
- [ ] Security checklist passed:
  - [ ] Zero userId raw em logger calls (grep confirma)
  - [ ] Exclusao de conta remove TODOS os dados do usuario
  - [ ] Streaming API route tem auth, rate limit, BOLA check, input sanitization
  - [ ] Nenhum segredo hardcoded
- [ ] Bias & ethics checklist passed:
  - [ ] Disclaimer de IA presente e visivel
  - [ ] Nenhuma logica discriminatoria
  - [ ] Mensagens de erro neutras
- [ ] Nenhum import de `next/link` ou `next/navigation` em components (exceto excecoes documentadas)
- [ ] Build passa sem erros
- [ ] Todos os testes passam (meta: >= 1280 testes)
- [ ] PR mergeado para main via feature branch

---

## Notas Tecnicas para Devs

### Streaming -- Padrao recomendado (T-S18-006/007/008)

```
ClaudeProvider.generateStreamingResponse()
  --> usa client.messages.stream() da Anthropic SDK
  --> retorna ReadableStream<string>

API Route /api/ai/plan/stream
  --> valida auth, input, rate limit, BOLA, age guard
  --> chama AiService.generateTravelPlanStream()
  --> retorna Response com ReadableStream (SSE format)
  --> apos stream completar: persiste itinerario + loga tokens

Phase6Wizard (client)
  --> fetch('/api/ai/plan/stream', { method: 'POST' })
  --> consome response.body como ReadableStream
  --> exibe texto progressivamente
  --> ao receber [DONE]: router.refresh()
```

### ExpeditionCard z-index fix (T-S18-001)

O padrao correto para card clickavel com sub-links:
```tsx
<div className="relative ...">
  <Link href="..." className="absolute inset-0 z-0" />    {/* overlay link */}
  <div className="relative z-10 pointer-events-none ...">  {/* content: NAO intercepta clicks */}
    <span>...</span>                                        {/* texto: herda pointer-events-none */}
    <Link className="relative z-20 pointer-events-auto">   {/* sub-link: intercepta clicks */}
    </Link>
  </div>
</div>
```

### Account deletion cleanup (T-S18-002)

Ordem dos deletes dentro da transacao (apos os deletes existentes de Account e Session):
1. `tx.userProfile.deleteMany({ where: { userId: user.id } })`
2. `tx.userBadge.deleteMany({ where: { userId: user.id } })`
3. `tx.pointTransaction.deleteMany({ where: { userId: user.id } })`
4. `tx.userProgress.deleteMany({ where: { userId: user.id } })`
5. Buscar tripIds: `tx.trip.findMany({ where: { userId: user.id }, select: { id: true } })`
6. `tx.expeditionPhase.deleteMany({ where: { tripId: { in: tripIds } } })`

Esses deletes devem ocorrer ANTES do soft-delete do User (step 3 atual) para evitar problemas de FK.
