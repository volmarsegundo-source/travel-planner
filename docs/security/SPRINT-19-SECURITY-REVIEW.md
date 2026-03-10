# Sprint 19 Security Review

**Reviewer:** security-specialist
**Date:** 2026-03-10
**Branch:** feat/sprint-19
**Scope:** T-S19-001a/b/c, T-S19-002, T-S19-003 (SEC-S18-001), T-S19-008 (guide prompt)

---

## Executive Summary

Sprint 19 resolve o finding MEDIUM mais importante pendente (SEC-S18-001) com uma implementacao correta e atomica de cascade deletion para ItineraryDay, Activity e ChecklistItem. A nova funcionalidade de streaming persistence (T-S19-001a/b) segue o padrao defense-in-depth existente com BOLA check, Zod validation, rate limiting, injection guard e PII masking. O Redis lock para prevenir geracoes duplicadas esta bem implementado com TTL e release em ambos os caminhos de sucesso e erro.

Foram identificados 2 findings LOW pre-existentes (raw userId em logs de phase-engine.ts, points-engine.ts e itinerary-plan.service.ts) que nao sao regressoes deste sprint mas devem ser enderecados. Nenhum finding MEDIUM ou superior foi encontrado neste sprint. A revisao recomenda APROVACAO.

---

## Review Results

### SEC-CHECK-001: Cascade Deletion (T-S19-003 / SEC-S18-001)

**Status:** PASS
**Files reviewed:** `src/server/actions/account.actions.ts`, `prisma/schema.prisma`

**Verification:**

1. **All child models deleted:** Activity (line 174), ItineraryDay (line 177), ChecklistItem (line 180) agora sao explicitamente deletados dentro da transacao. Isso complementa os deletes pre-existentes de ExpeditionPhase, PhaseChecklistItem, ItineraryPlan e DestinationGuide.

2. **FK constraint order respeitada:** Activities sao deletados ANTES de ItineraryDays (linhas 174-178). Activity tem FK `dayId -> ItineraryDay.id`, portanto a ordem esta correta. ChecklistItem referencia `tripId` diretamente, sem dependencia de ordem com ItineraryDay.

3. **BOLA protection:** Deletes sao scoped via `tripIds` que foram obtidos de `tx.trip.findMany({ where: { userId: user.id } })` (linha 166-170). Apenas trips do proprio usuario sao afetados.

4. **Atomicidade:** Todos os deletes estao dentro do mesmo `db.$transaction()` (linha 137). Se qualquer operacao falhar, rollback completo e executado.

5. **Schema completeness check:** Revisando `prisma/schema.prisma`, os modelos que referenciam Trip direta ou indiretamente sao:
   - **Via userId:** Account, Session, UserProfile, UserBadge, PointTransaction, UserProgress -- todos deletados (linhas 140-162)
   - **Via tripId:** ItineraryDay, ChecklistItem, ExpeditionPhase, PhaseChecklistItem, DestinationGuide, ItineraryPlan -- todos deletados (linhas 174-194)
   - **Via dayId (ItineraryDay):** Activity -- deletado (linha 174)
   - **VerificationToken:** nao referencia userId, sem acao necessaria

   **Nenhum modelo orfao restante.** SEC-S18-001 esta RESOLVIDO.

6. **Edge case (tripIds = []):** O bloco `if (tripIds.length > 0)` (linha 172) protege contra execucao desnecessaria quando usuario nao tem trips.

---

### SEC-CHECK-002: Redis Lock (T-S19-001b)

**Status:** PASS
**Files reviewed:** `src/server/services/itinerary-persistence.service.ts`, `src/app/api/ai/plan/stream/route.ts`

**Verification:**

1. **Lock previne duplicatas:** `acquireGenerationLock()` usa `redis.set(lockKey, "1", "EX", TTL, "NX")` (linha 139 do service). O flag `NX` garante atomicidade -- apenas a primeira request adquire o lock. Retorna 409 se lock ja existe (stream/route.ts linha 122-124).

2. **TTL previne deadlocks:** `GENERATION_LOCK_TTL_SECONDS = 300` (5 minutos). Mesmo que o release falhe, o lock expira automaticamente. O `maxDuration = 120` do endpoint e menor que o TTL, garantindo que o lock sobrevive ao timeout da request.

3. **Release em ambos os caminhos:**
   - Sucesso: `finally` block no ReadableStream `start()` (stream/route.ts linha 248-251)
   - Erro pre-stream: release explicito nos catch blocks de sanitizacao (linhas 133, 148)
   - Erro no stream setup: release no catch externo (linha 286)
   - Release failures sao silenciados com `.catch(() => {})` para nao mascarar o erro original

4. **Lock scoped por tripId:** Key e `lock:plan:${tripId}` (service linha 138), nao por userId. Correto -- permite que o mesmo usuario gere para trips diferentes simultaneamente.

5. **Race condition:** Se Redis falha ao adquirir lock, o codigo faz graceful degradation (`lockAcquired = true`, linha 119-121). Isso significa que em caso de falha do Redis, duas geracoes podem ocorrer simultaneamente. Aceitavel como trade-off de disponibilidade vs. consistencia -- a persistencia usa `deleteMany` antes de `create` (upsert semantics), entao a segunda geracao simplesmente sobrescreve a primeira.

---

### SEC-CHECK-003: Streaming Persistence BOLA (T-S19-001b)

**Status:** PASS
**Files reviewed:** `src/app/api/ai/plan/stream/route.ts`, `src/server/services/itinerary-persistence.service.ts`

**Verification:**

1. **BOLA check:** Trip ownership e verificada em `stream/route.ts` linhas 97-103: `db.trip.findFirst({ where: { id: tripIdResult.data, userId, deletedAt: null } })`. O `validatedTripId` passado para `persistItinerary()` (linha 204) e o mesmo que foi validado.

2. **Data validation antes do DB write:** O JSON acumulado e parseado via `parseItineraryJson()` que usa Zod (`ItineraryPlanSchema.safeParse`) antes de persistir. Schema valida tipos de todos os campos: dayNumber (number), date (string), theme (string), activities (array com campos tipados). Se parse falha, envia `{"error":"parse_failed"}` ao client e NAO persiste.

3. **PII no streaming response:** O stream envia apenas os chunks raw do AI provider, que contem dados de itinerario (titulos de atividades, horarios, custos). O destino ja foi sanitizado via `sanitizeForPrompt` + `maskPII` antes de ser enviado ao AI (linhas 127-153). A resposta do AI nao contem dados do usuario.

4. **Error handling em falha de persistencia:** Se `persistItinerary()` falha, o erro e logado (linha 228-231) e `{"error":"persist_failed"}` e enviado ao client antes de `[DONE]`. O stream nao crashea.

5. **JSON validation:** `parseItineraryJson()` (service linhas 92-128) tenta 3 estrategias de parsing (direct JSON, markdown code fence extraction, raw JSON extraction) e valida com Zod em todas. Se nenhuma funciona, retorna null e a persistencia e pulada.

---

### SEC-CHECK-004: Navigation Authorization (T-S19-002)

**Status:** PASS
**Files reviewed:** `src/app/[locale]/(app)/expedition/[tripId]/page.tsx`, `src/lib/engines/phase-engine.ts`

**Verification:**

1. **BOLA protection:** `ExpeditionHubPage` verifica autenticacao (linha 15-18). `PhaseEngine.getCurrentPhase()` e `PhaseEngine.getHighestCompletedPhase()` ambos fazem BOLA check interno: `db.trip.findFirst({ where: { id: tripId, userId, deletedAt: null } })` e lancam `ForbiddenError` se trip nao pertence ao usuario.

2. **Phase escalation prevention:** O redirect na `ExpeditionHubPage` vai para `phase-${targetPhase}` (linha 41). Para fases 1-6, redireciona para a fase correta. Para fases 7+, renderiza "Coming Soon" (linhas 46-66). A pagina de cada fase individual (e.g., `phase-6/page.tsx`) tem seu proprio BOLA check via `PhaseEngine.canAccessPhase()` ou equivalente, que verifica se o status da fase e "active" ou "completed".

3. **Novo getHighestCompletedPhase:** O metodo (phase-engine.ts linhas 108-129) faz BOLA check, busca a fase completada mais alta com `orderBy: { phaseNumber: "desc" }`. Se nenhuma fase esta completada, retorna null e o fallback e `phaseNumber = 1` -> redirect para phase-2.

4. **URL manipulation:** Um usuario que tenta acessar `/expedition/{tripId}/phase-7` sera tratado pela logica de cada page component, que verifica status da fase. Nao ha bypass possivel via URL porque os server components consultam o banco.

---

### SEC-CHECK-005: Guide Prompt Safety (T-S19-008)

**Status:** PASS
**Files reviewed:** `src/lib/prompts/system-prompts.ts`, `src/lib/prompts/destination-guide.prompt.ts`, `src/server/actions/expedition.actions.ts`, `src/server/services/ai.service.ts`

**Verification:**

1. **No PII no system prompt:** O `GUIDE_SYSTEM_PROMPT` contem apenas instrucoes estruturais (JSON schema, nomes de secoes, limites de palavras). Nenhum dado de usuario.

2. **No coleta/exposicao de dados:** O prompt instrui o AI a gerar conteudo informativo sobre destinos (timezone, moeda, idioma, etc.). Nenhuma instrucao para coletar ou retornar dados pessoais.

3. **Novas secoes (safety, health, transport_overview, local_customs):** Sao secoes de conteudo descritivo sobre o destino. Nao introduzem vetores de prompt injection adicionais alem do que ja existia.

4. **Sanitizacao do destino:** Em `expedition.actions.ts` linhas 268-279, o destino e sanitizado via `sanitizeForPrompt()` + `maskPII()` ANTES de ser passado para `AiService.generateDestinationGuide()`. O prompt template (`destination-guide.prompt.ts` linha 26) insere o destino sanitizado.

5. **Validacao da resposta:** `AiService.generateDestinationGuide()` (ai.service.ts linhas 509-513) valida a resposta com `DestinationGuideContentSchema.safeParse()` que usa Zod para validar a estrutura de todas as 10 secoes. Respostas invalidas lancam `AI_SCHEMA_ERROR`.

---

### SEC-CHECK-006: General Security (userId hashing, rate limiting, auth)

**Status:** CONDITIONAL
**Severity:** LOW (pre-existing, not a Sprint 19 regression)

**Verification:**

1. **Raw userId em logs -- novos arquivos Sprint 19:**
   - `stream/route.ts`: Usa `hashUserId()` em todos os logger calls. PASS.
   - `itinerary-persistence.service.ts`: `logPersistence()` usa `hashUserId()`. PASS.
   - `account.actions.ts` (cascade deletion): Usa `hashForLog()`. PASS.

2. **Raw userId em logs -- pre-existentes (NOT Sprint 19 regressions):**
   - `phase-engine.ts` linhas 52, 286-293, 372-377, 463: logs com `userId` raw em 4 locais
   - `points-engine.ts` linhas 48, 228, 283, 307: logs com `userId` raw em 4 locais
   - `itinerary-plan.service.ts` linha 42: log com `userId` raw

   Estes sao pre-existentes desde Sprint 9/11. Registrado como SEC-S19-001 para correcao futura.

3. **Rate limiting no streaming endpoint:** Rate limit check esta presente (stream/route.ts linhas 91-94) com key `ai:plan:${userId}`, consistente com o server action em `ai.actions.ts` linha 80. PASS.

4. **Auth check no streaming endpoint:** Session verificada em stream/route.ts linhas 61-64. PASS.

5. **Security headers no streaming response:** `X-Content-Type-Options: nosniff` presente (stream/route.ts linha 281). PASS.

---

## Findings Summary

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| SEC-S18-001 | MEDIUM | ItineraryDay/Activity/ChecklistItem nao deletados na exclusao de conta | **RESOLVED** (T-S19-003) |
| SEC-S19-001 | LOW | Raw userId em logger calls em phase-engine.ts (4), points-engine.ts (4), itinerary-plan.service.ts (1) -- pre-existente, nao regressao Sprint 19 | OPEN (debt) |

---

## Verdict

**APPROVED**

Nenhum finding MEDIUM ou superior aberto. SEC-S18-001 foi corretamente resolvido com cascade deletion atomica e completa. O streaming endpoint mantem o padrao defense-in-depth existente. O Redis lock esta bem implementado com TTL e graceful degradation.

O finding LOW SEC-S19-001 (raw userId em gamification engines) e pre-existente e nao foi introduzido neste sprint. Recomenda-se correcao em sprint futuro.

---

## Recommendations for Sprint 20

1. **SEC-S19-001 (LOW):** Aplicar `hashUserId()` em todos os logger calls em `phase-engine.ts`, `points-engine.ts` e `itinerary-plan.service.ts`. Sao 9 ocorrencias no total. Estimativa: 1h.

2. **Monitoring:** Considerar adicionar metricas de observabilidade para o Redis lock (rate de conflitos, timeouts) para detectar padroes de abuso ou bugs de concorrencia.
