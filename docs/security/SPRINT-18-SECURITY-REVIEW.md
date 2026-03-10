# Revisao de Seguranca -- Sprint 18

**Revisor:** security-specialist
**Data:** 2026-03-09
**Branch:** `feat/sprint-18`
**Baseline:** Sprint 17 review (APPROVED WITH CONDITIONS), 1231 testes, v0.11.0
**Escopo:** T-S18-002, T-S18-003, T-S18-004, T-S18-005, T-S18-006, T-S18-007

---

## Sumario Executivo

Sprint 18 implementa a limpeza de dados na exclusao de conta (SEC-S17-003), hasheia todos os userId restantes em logs (SEC-S17-004/005/006), e introduz streaming de IA com um novo endpoint de API (`POST /api/ai/plan/stream`). A revisao abrange LGPD compliance na exclusao, eliminacao de vazamento de userId em logs, e analise de seguranca completa do pipeline de streaming.

**Veredito Global: APPROVED WITH CONDITIONS**

A implementacao de seguranca e solida no geral. Os 3 conditions do Sprint 17 foram todos resolvidos. Porem, foram identificados 1 MEDIUM e 3 LOW findings no novo endpoint de streaming e na limpeza de conta que devem ser rastreados.

---

## T-S18-002: Limpeza Completa de Dados na Exclusao de Conta (SEC-S17-003)

**Veredito: PASS WITH CONDITIONS**

### Analise

**`src/server/actions/account.actions.ts:137-204`** -- A transacao de exclusao agora executa na ordem correta e ampliada:

1. `tx.account.deleteMany` -- remove tokens OAuth (linha 140-142)
2. `tx.session.deleteMany` -- invalida sessoes (linha 145-147)
3. `tx.userProfile.deleteMany` -- remove PII (passportNumber, nationalId criptografados) (linha 151-153)
4. `tx.userBadge.deleteMany` -- remove badges de gamificacao (linha 154-156)
5. `tx.pointTransaction.deleteMany` -- remove historico de comportamento (linha 157-159)
6. `tx.userProgress.deleteMany` -- remove progresso (linha 160-162)
7. Busca tripIds do usuario (linha 166-170)
8. `tx.expeditionPhase.deleteMany` -- via tripId (linha 173-175)
9. `tx.phaseChecklistItem.deleteMany` -- via tripId (linha 176-178)
10. `tx.itineraryPlan.deleteMany` -- via tripId (linha 179-181)
11. `tx.destinationGuide.deleteMany` -- via tripId (linha 182-184)
12. `tx.user.update` -- soft-delete + anonimizacao PII (linha 188-197)
13. `tx.trip.updateMany` -- cascade soft-delete trips (linha 200-203)

**Propriedades de seguranca verificadas:**

- Todos os deletes estao dentro da MESMA transacao -- rollback atomico garantido.
- Deletes executados ANTES do soft-delete do User -- sem risco de FK violation.
- Condicao `tripIds.length > 0` antes de trip-dependent deletes previne queries desnecessarias.
- UserProfile (com passportNumberEnc e nationalIdEnc) e hard-deleted -- LGPD compliance para PII criptografado.
- hashForLog usado no logger.error (linha 224) -- sem userId raw.

### Findings

**SEC-S18-001 (MEDIUM):** Tres modelos referenciados por `tripId` NAO sao explicitamente deletados na transacao:

| Modelo | FK | onDelete | Deletado? | Dados sensiveis |
|---|---|---|---|---|
| ItineraryDay | tripId -> Trip | Cascade | **NAO** | notes (texto do usuario) |
| Activity | dayId -> ItineraryDay | Cascade (via ItineraryDay) | **NAO** | title, notes |
| ChecklistItem | tripId -> Trip | Cascade | **NAO** | label (texto do usuario) |

Como o Trip e soft-deleted (update, nao delete), as cascades `onDelete: Cascade` do Prisma NAO sao acionadas. Esses registros permanecem orfaos no banco com conteudo gerado pelo/para o usuario.

**Severidade MEDIUM** porque: (a) esses dados nao contem PII diretamente (sao itinerarios e checklists), mas podem conter informacoes comportamentais e preferencias do usuario, e (b) nao sao acessiveis via fluxo normal (BOLA guards filtram por userId/deletedAt), mas existem no banco de dados.

**Recomendacao:** Adicionar a transacao:
```typescript
if (tripIds.length > 0) {
  // Buscar dayIds para cascade manual de Activity
  const dayIds = await tx.itineraryDay.findMany({
    where: { tripId: { in: tripIds } },
    select: { id: true },
  });
  if (dayIds.length > 0) {
    await tx.activity.deleteMany({
      where: { dayId: { in: dayIds.map(d => d.id) } },
    });
  }
  await tx.itineraryDay.deleteMany({
    where: { tripId: { in: tripIds } },
  });
  await tx.checklistItem.deleteMany({
    where: { tripId: { in: tripIds } },
  });
}
```

Alternativamente, considerar hard-delete das Trips na exclusao de conta (em vez de soft-delete), permitindo que as cascades do Prisma limpem automaticamente todos os dados dependentes. A unica razao para soft-delete de trips na exclusao e auditoria/analytics -- mas como o User ja esta anonimizado, trips orfas tem pouco valor.

---

## T-S18-003: Hash userId em trip.actions.ts (SEC-S17-004)

**Veredito: PASS**

### Analise

**`src/server/actions/trip.actions.ts`** -- Todas as 5 ocorrencias anteriores de `userId: session.user.id` em logger calls foram corrigidas:

| Linha | Antes | Depois |
|---|---|---|
| 14 | (nao importava) | `import { hashUserId } from "@/lib/hash"` |
| 41 | `userId: session.user.id` | `userIdHash: hashUserId(session.user.id)` |
| 76 | `userId: session.user.id` | `userIdHash: hashUserId(session.user.id)` |
| 109 | `userId: session.user.id` | `userIdHash: hashUserId(session.user.id)` |
| 133 | `userId: session.user.id` | `userIdHash: hashUserId(session.user.id)` |
| 152 | `userId: session.user.id` | `userIdHash: hashUserId(session.user.id)` |

**Verificacao grep:** Zero ocorrencias de userId raw em logger calls no arquivo. PASS.

---

## T-S18-004: Hash userId em auth.service.ts (SEC-S17-005)

**Veredito: PASS**

### Analise

**`src/server/services/auth.service.ts`** -- Todas as 5 ocorrencias foram corrigidas:

| Linha | Antes | Depois |
|---|---|---|
| 8 | (nao importava) | `import { hashUserId } from "@/lib/hash"` |
| 62 | `userId: user.id` | `userIdHash: hashUserId(user.id)` |
| 87 | `userId` | `userIdHash: hashUserId(userId)` |
| 115 | `userId` | `userIdHash: hashUserId(userId)` |
| 143 | `userId: user.id` | `userIdHash: hashUserId(user.id)` |
| 174 | `userId` | `userIdHash: hashUserId(userId)` |

**Verificacao grep:** Zero ocorrencias de userId raw em logger calls no arquivo. PASS.

---

## T-S18-005: Hash userId em profile.service.ts (SEC-S17-006)

**Veredito: PASS**

### Analise

**`src/server/services/profile.service.ts:69`** -- Corrigido de `userId` para `userIdHash: hashUserId(userId)`.

Import de `hashUserId` adicionado na linha 7. PASS.

### Auditoria Transversal de userId em Logs

Grep completo executado em `src/server/` e `src/app/` para `logger.*userId` excluindo `hashUserId|hashForLog|userIdHash`:

**Resultados em `ai.service.ts`:** 15 ocorrencias de `userId: hid` -- onde `hid` e declarado como `const hid = hashUserId(params.userId)` (verificado no Sprint 17). PASS -- sao hashes, nao raw.

**Zero ocorrencias residuais de userId raw em logger calls em todo o codebase.**

A condicao SEC-S17-004 e SEC-S17-005 do Sprint 17 estao **RESOLVIDAS**.

---

## T-S18-006: Streaming no ClaudeProvider

**Veredito: PASS**

### Analise

**`src/server/services/providers/claude.provider.ts:108-196`** -- Metodo `generateStreamingResponse` implementado corretamente.

**Propriedades de seguranca verificadas:**

1. **API key nao exposta:** A chave e acessada via `getAnthropic()` (singleton com guard). Nenhum erro retornado ao caller inclui a chave. Erros do SDK sao mapeados para `AppError` com mensagens genericas (`errors.aiAuthError`, `errors.rateLimitExceeded`, `errors.timeout`).

2. **Error sanitization:** Erros do SDK sao capturados em dois pontos:
   - `catch` no `start()` do ReadableStream (linha 164-166): erro propagado via `controller.error()`. O erro original do SDK (que pode conter detalhes internos) e passado diretamente ao stream. Porem, o consumidor (API route) nao expoe esse erro ao cliente -- ele e logado e o stream e encerrado.
   - `mapStreamErrorSync` (linha 199-209): mapeia erros do SDK para `AppError` genericos. Log do erro original para debug. Mensagens ao caller sao i18n keys, nao stack traces.
   - `mapStreamError` (linha 212-214): wrapper que faz `throw` do resultado de `mapStreamErrorSync`.

3. **Stream lifecycle:**
   - Stream fecha corretamente: `controller.close()` apos iteracao completa (linha 163).
   - Erros encerram o stream: `controller.error(error)` no catch (linha 165).
   - `streamDone!()` chamado no `finally` (linha 167) garante que `usagePromise` resolve mesmo em erro.

4. **Token usage logging:** Apos stream completar, `usagePromise` resolve com dados de tokens da `finalMessage()`. Log no caller (API route), nao no provider.

5. **Timeout:** O SDK `messages.stream()` nao recebe `AbortSignal` diretamente nesta implementacao. O timeout de 90s e herdado do SDK default, mas nao ha AbortSignal explicito como no `generateResponse`.

### Findings

**SEC-S18-002 (LOW):** O metodo `generateStreamingResponse` NAO passa `AbortSignal.timeout(CLAUDE_TIMEOUT_MS)` ao `messages.stream()`, diferente do `generateResponse` que usa `{ signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS) }`. Embora o SDK tenha timeout interno e o Vercel imponha `maxDuration`, a ausencia de timeout explicito no provider e uma inconsistencia. Se o SDK ficar pendurado, a unica protecao e o `maxDuration` do Vercel (120s).

**Recomendacao:** Passar `{ signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS) }` como segundo parametro do `messages.stream()` para manter paridade com `generateResponse`.

---

## T-S18-007: API Route de Streaming

**Veredito: PASS WITH CONDITIONS**

### Analise

**`src/app/api/ai/plan/stream/route.ts`** -- Endpoint `POST /api/ai/plan/stream` com 217 linhas.

#### Checklist de Seguranca

| Verificacao | Status | Detalhes |
|---|---|---|
| Auth check | PASS | `auth()` na linha 53, retorna 401 se sem sessao |
| Zod validation | PASS | `StreamRequestSchema.safeParse(body)` na linha 68, retorna 400 se invalido |
| TripId validation | PASS | `TripIdSchema.safeParse(tripId)` na linha 76 (dupla validacao -- redundante mas seguro) |
| Rate limiting | PASS | `checkRateLimit()` na linha 82, 10 req/hr/user, retorna 429 |
| BOLA check | PASS | `db.trip.findFirst({ where: { id, userId, deletedAt: null } })` na linha 88, retorna 404 |
| Age guard | PASS | `canUseAI(userProfile?.birthDate)` na linha 101, retorna 403 |
| Injection guard | PASS | `sanitizeForPrompt()` na linha 108, retorna 400 se detectado |
| PII masking | PASS | `maskPII()` nas linhas 109 e 123 |
| travelNotes sanitization | PASS | Mesmo pipeline (sanitize + mask) na linha 122-124 |
| Error responses | PASS | Genericos: "Unauthorized", "Invalid JSON", "Validation failed", etc. |
| Stack traces | PASS | Nenhum stack trace exposto ao cliente |
| API key exposure | PASS | Nenhuma referencia a API key no response |
| maxDuration | PASS | `export const maxDuration = 120` na linha 18 |
| hashUserId em logs | PASS | `hid = hashUserId(session.user.id)` na linha 58, usado em todos os logs |
| SSE format | PASS | `data: ${value}\n\n` e `data: [DONE]\n\n` -- apenas texto do AI |
| Token usage logging | PASS | `usagePromise.then()` nao bloqueante (linha 182-200) |

#### Ordem de Verificacoes (Defense-in-Depth)

```
1. Auth (401)
2. JSON parse (400)
3. Zod validation (400)
4. TripId validation (400) -- redundante com step 3
5. Rate limit (429)
6. BOLA check (404)
7. Age guard (403)
8. Input sanitization (400)
9. PII masking
10. Prompt construction
11. Streaming
```

A ordem e CORRETA: auth e validacao antes de rate limit (nao gasta quota), rate limit antes de DB query (protege banco), BOLA antes de AI call (previne uso indevido).

#### Cenarios de Ameaca

| # | Cenario | Resultado | Evidencia |
|---|---|---|---|
| 1 | Request sem autenticacao | **401** | Linha 54-56 |
| 2 | Trip de outro usuario | **404** (nao 403, previne enumeracao) | Linha 92-94 |
| 3 | Injection em destination | **400** "Invalid input" | Linha 112-113 |
| 4 | PII em travelNotes | **Mascarado** por maskPII() | Linha 123 |
| 5 | API key em erro | **Nao exposta** -- `AppError.message` e i18n key | Linha 213 |
| 6 | Stack trace em erro | **Nao exposta** -- "Internal server error" generico | Linha 215 |
| 7 | Rate limit bypass | **Enforced** -- 10 req/hr com Lua atomico | Linha 82-85 |
| 8 | Usuario menor de 18 | **403** "Age restriction" | Linha 101-103 |
| 9 | Requests concorrentes | **Isolados** -- cada request cria seu proprio stream | Design do handler |
| 10 | Client aborta stream | **Cleanup** -- AbortController no client, stream fecha server-side quando pipe quebra | Phase6Wizard:162 |

### Findings

**SEC-S18-003 (LOW):** O endpoint NAO define headers CORS explicitamente. Isso e seguro por default porque:
- Next.js API routes nao adicionam `Access-Control-Allow-Origin` automaticamente.
- O middleware (`src/middleware.ts:56`) faz `return` early para rotas `/api` sem processar CSP/headers de seguranca.
- Porem, a ausencia de processamento pelo middleware significa que headers como `X-Frame-Options` e `X-Content-Type-Options` NAO sao aplicados a esta rota.

**Recomendacao:** Adicionar headers de seguranca na Response do streaming endpoint, ou ajustar o middleware para aplicar headers (exceto CSP) a rotas `/api`:
```typescript
return new Response(sseStream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Content-Type-Options": "nosniff",
  },
});
```

**SEC-S18-004 (LOW):** O rate limit key usa `ai:plan:stream:${session.user.id}`, diferente do rate limit key de `generateTravelPlanAction` que usa `ai:plan:${userId}`. Isso significa que um usuario pode fazer 10 requests via streaming E 10 requests via server action na mesma hora -- efetivamente dobrando o limite. Embora o server action esteja em desuso para plan (substituido por streaming), o endpoint ainda existe.

**Recomendacao:** Usar o mesmo rate limit key (`ai:plan:${session.user.id}`) para ambos os endpoints, ou documentar que os limites sao independentes.

### Nota sobre Request Body Mismatch (funcional, nao security)

O Phase6Wizard envia os parametros flat (`{ tripId, destination, startDate, ... }`), mas o `StreamRequestSchema` espera `{ tripId, params: { destination, startDate, ... } }`. Isso fara com que TODA request seja rejeitada com 400 (Zod validation failure). Do ponto de vista de seguranca, isso e SAFE (requests invalidas sao rejeitadas), mas a feature de streaming nao funciona. Este e um bug funcional que deve ser corrigido pelo time de desenvolvimento.

---

## Auditoria Transversal

### Grep de Seguranca -- userId em Logs

| Verificacao | Resultado |
|---|---|
| `trip.actions.ts` -- raw userId em logger | **0 ocorrencias** -- RESOLVIDO |
| `auth.service.ts` -- raw userId em logger | **0 ocorrencias** -- RESOLVIDO |
| `profile.service.ts` -- raw userId em logger | **0 ocorrencias** -- RESOLVIDO |
| `account.actions.ts` -- raw userId em logger | **0 ocorrencias** (usa hashForLog) |
| `ai.service.ts` -- raw userId em logger | **0 ocorrencias** (usa hid = hashUserId) |
| `expedition.actions.ts` -- raw userId em logger | **0 ocorrencias** (usa hashUserId) |
| Codebase-wide grep para userId raw em logger | **0 ocorrencias residuais** |

### Modelos Prisma -- Cobertura de Exclusao de Conta

| Modelo | Referencia | Deletado na transacao? | Tipo de delete |
|---|---|---|---|
| Account | userId FK | Sim | Hard delete |
| Session | userId FK | Sim | Hard delete |
| UserProfile | userId FK | Sim | Hard delete |
| UserBadge | userId FK | Sim | Hard delete |
| PointTransaction | userId FK | Sim | Hard delete |
| UserProgress | userId FK | Sim | Hard delete |
| ExpeditionPhase | tripId FK | Sim | Hard delete |
| PhaseChecklistItem | tripId FK | Sim | Hard delete |
| ItineraryPlan | tripId FK | Sim | Hard delete |
| DestinationGuide | tripId FK | Sim | Hard delete |
| **ItineraryDay** | tripId FK | **NAO** | **Orfao** |
| **Activity** | dayId FK (via ItineraryDay) | **NAO** | **Orfao** |
| **ChecklistItem** | tripId FK | **NAO** | **Orfao** |
| Trip | userId FK | Soft delete | Anonimizado (deletedAt) |
| User | -- | Soft delete | PII anonimizado |

### Tabela Consolidada de Findings

| ID | Severidade | Task | Descricao | Arquivo:Linha | Status |
|---|---|---|---|---|---|
| SEC-S18-001 | **MEDIUM** | T-S18-002 | ItineraryDay, Activity, ChecklistItem nao deletados na exclusao de conta | `account.actions.ts:172-185` | Debt Sprint 19 |
| SEC-S18-002 | LOW | T-S18-006 | AbortSignal.timeout ausente em generateStreamingResponse | `claude.provider.ts:140` | Debt Sprint 19 |
| SEC-S18-003 | LOW | T-S18-007 | Headers de seguranca ausentes na response do streaming endpoint | `route.ts:202-208` | Debt Sprint 19 |
| SEC-S18-004 | LOW | T-S18-007 | Rate limit key diferente entre streaming e server action (double quota) | `route.ts:82` | Debt Sprint 19 |

### Conditions Resolvidas do Sprint 17

| ID Sprint 17 | Descricao | Status Sprint 18 |
|---|---|---|
| SEC-S17-003 (MEDIUM) | UserProfile + gamificacao nao limpos na exclusao | **RESOLVIDO** (T-S18-002) -- com ressalva SEC-S18-001 |
| SEC-S17-004 (MEDIUM) | trip.actions.ts loga userId raw | **RESOLVIDO** (T-S18-003) |
| SEC-S17-005 (MEDIUM) | auth.service.ts loga userId raw | **RESOLVIDO** (T-S18-004) |

---

## Cenarios de Ameaca -- Resultado Final

| # | Cenario | Resultado | Evidencia |
|---|---|---|---|
| 1 | Atacante acessa stream sem auth | **401 Unauthorized** | route.ts:54-56 |
| 2 | Atacante solicita trip de outro usuario | **404 Not Found** (nao 403) | route.ts:92-94 |
| 3 | Injection "ignore instructions" em destination | **400 Invalid input** | route.ts:112-113 |
| 4 | CPF ou email em travelNotes | **Mascarado** por maskPII | route.ts:123 |
| 5 | ANTHROPIC_API_KEY em erro | **Nunca exposta** | AppError com i18n keys |
| 6 | Stack trace em response de erro | **Nunca exposta** | "Internal server error" generico |
| 7 | Rate limit burst | **Enforced** (10/hr, Lua atomico) | route.ts:82-85 |
| 8 | Menor de 18 anos | **403 Age restriction** | route.ts:101-103 |
| 9 | Requests concorrentes | **Streams isolados** | Cada request instancia proprio provider |
| 10 | Client aborta mid-stream | **Cleanup** via AbortController | Phase6Wizard:78,162 |
| 11 | Dados orfaos apos exclusao de conta | **PARCIAL** | 3 modelos nao limpos (SEC-S18-001) |
| 12 | userId raw em log aggregation | **RESOLVIDO** | Zero ocorrencias codebase-wide |

---

## Veredito

### APPROVED WITH CONDITIONS

**Condicoes (devem ser rastreadas como debt para Sprint 19):**

1. **SEC-S18-001 (MEDIUM):** Adicionar limpeza de ItineraryDay (com cascade manual de Activity) e ChecklistItem na transacao de exclusao de conta. Esses modelos contem dados de usuario que devem ser removidos para LGPD compliance completa. Prioridade: MEDIA.

2. **SEC-S18-004 (LOW):** Unificar rate limit key entre streaming endpoint e server action para evitar double quota. Prioridade: BAIXA.

**Nota funcional (nao blocker de seguranca):** O request body mismatch entre Phase6Wizard (flat) e StreamRequestSchema (nested `params`) impede o funcionamento da feature de streaming. Isso deve ser corrigido pelo time de desenvolvimento, mas do ponto de vista de seguranca, requests invalidas sao corretamente rejeitadas.

**Nenhum blocker de seguranca para merge.** Os findings residuais sao divida tecnica de baixa severidade. As 3 conditions do Sprint 17 foram todas resolvidas. O novo endpoint de streaming implementa defense-in-depth completo (auth, Zod, rate limit, BOLA, age guard, injection, PII masking) e nao expoe dados internos ao cliente.

---

---

## Re-Review: Correcoes SEC-S18-002, SEC-S18-003, SEC-S18-004 + StreamRequestSchema

**Revisor:** security-specialist
**Data:** 2026-03-09
**Escopo:** Re-verificacao das 4 correcoes aplicadas apos a revisao inicial

### 1. StreamRequestSchema -- Body Format Fix

**Status: RESOLVIDO**

O schema foi corrigido de formato nested (`{ tripId, params: { ... } }`) para flat (`{ tripId, destination, startDate, ... }`), alinhado com o que o Phase6Wizard envia.

Implementacao verificada em `src/app/api/ai/plan/stream/route.ts:44-46`:
```typescript
const StreamRequestSchema = z.object({
  tripId: z.string().min(1).max(50),
}).merge(GeneratePlanParamsSchema);
```

O `.merge(GeneratePlanParamsSchema)` incorpora todos os campos de validacao (`destination`, `startDate`, `endDate`, `travelStyle`, `budgetTotal`, `budgetCurrency`, `travelers`, `language`, `travelNotes?`) com as mesmas constraints (min/max length, enums, number bounds). A validacao permanece estrita -- Zod rejeita campos desconhecidos por default em `.object()`. Teste em `stream-route.test.ts:222-241` confirma aceitacao do formato flat.

### 2. SEC-S18-002 -- AbortSignal.timeout em generateStreamingResponse

**Status: RESOLVIDO**

AbortSignal agora e passado como segundo parametro ao `messages.stream()` em `src/server/services/providers/claude.provider.ts:140-143`:
```typescript
const sdkStream = getAnthropic().messages.stream(
  createParams as unknown as Anthropic.MessageCreateParamsStreaming,
  { signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS) },
);
```

`CLAUDE_TIMEOUT_MS` confirmado como `90_000` (linha 13). Paridade com `generateResponse` (linha 71-74) agora garantida. Dois testes cobrem este fix:
- `stream-route.test.ts:256-279` -- verifica que `signal: expect.any(AbortSignal)` e passado.
- `stream-route.test.ts:199-228` -- verifica indiretamente ao validar a chamada com systemPrompt.

### 3. SEC-S18-003 -- X-Content-Type-Options: nosniff no SSE Response

**Status: RESOLVIDO**

Header presente em `src/app/api/ai/plan/stream/route.ts:201-208`:
```typescript
return new Response(sseStream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Content-Type-Options": "nosniff",
  },
});
```

Teste dedicado em `stream-route.test.ts:212-219` confirma: `expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")`.

Este header previne MIME-sniffing do navegador na response SSE -- importante porque o middleware CSP nao processa rotas `/api`.

### 4. SEC-S18-004 -- Rate Limit Key Unificada

**Status: RESOLVIDO**

Rate limit key no streaming endpoint (`route.ts:81`):
```
ai:plan:${session.user.id}
```

Rate limit key no server action (`ai.actions.ts:116`):
```
ai:plan:${session.user.id}
```

Keys identicas -- confirmado por inspecao direta. Ambos os endpoints agora compartilham o mesmo bucket de rate limit (10 req/hr/user). Teste em `stream-route.test.ts:243-255` verifica que `checkRateLimit` e chamado com `"ai:plan:user-1"`.

### Cobertura de Testes

| Fix | Arquivo de Teste | Testes Relevantes |
|---|---|---|
| StreamRequestSchema flat | `stream-route.test.ts` | `accepts flat request body matching Phase6Wizard format` (L222) |
| SEC-S18-002 AbortSignal | `claude-provider-streaming.test.ts` | `passes AbortSignal.timeout to messages.stream` (L256) |
| SEC-S18-003 nosniff | `stream-route.test.ts` | `includes X-Content-Type-Options: nosniff header` (L212) |
| SEC-S18-004 rate key | `stream-route.test.ts` | `calls rate limit with correct key` (L243) |

### Novas Issues Introduzidas pelas Correcoes

Nenhuma nova vulnerabilidade identificada. As correcoes sao cirurgicas e nao alteram fluxo de controle, autenticacao, ou autorizacao.

### Tabela Consolidada Atualizada

| ID | Severidade | Descricao | Status |
|---|---|---|---|
| SEC-S18-001 | **MEDIUM** | ItineraryDay, Activity, ChecklistItem nao deletados na exclusao de conta | **STILL OPEN** -- Debt Sprint 19 |
| SEC-S18-002 | LOW | AbortSignal.timeout ausente em generateStreamingResponse | **RESOLVED** |
| SEC-S18-003 | LOW | Headers de seguranca ausentes na response do streaming endpoint | **RESOLVED** |
| SEC-S18-004 | LOW | Rate limit key diferente entre streaming e server action | **RESOLVED** |

### Veredito Atualizado

**APPROVED WITH CONDITIONS** (sem alteracao no veredito global)

A unica condicao remanescente e **SEC-S18-001 (MEDIUM)** -- limpeza de ItineraryDay/Activity/ChecklistItem na exclusao de conta. Os 3 findings LOW foram todos resolvidos com correcoes verificadas e testes adequados.

---

*Re-review conduzida pelo security-specialist em 2026-03-09.*
