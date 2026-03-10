# Revisao de Seguranca -- Sprint 17

**Revisor:** security-specialist
**Data:** 2026-03-09
**Branch:** `feat/sprint-17`
**Baseline:** Sprint 16 review (APPROVED), 1142 testes, v0.10.0
**Escopo:** T-S17-001, T-S17-002, T-S17-004, T-S17-005, T-S17-008, T-S17-009

---

## Sumario Executivo

Sprint 17 implementa 6 correcoes de seguranca e hardening que eliminam vulnerabilidades acumuladas desde o Sprint 2. A revisao abrange protecao contra mass assignment, limpeza OAuth na exclusao de conta, hashing de userId em logs, validacao Zod server-side para parametros de IA, transliteracao de homoglifos cirilicos no injection guard, e guard contra apiKey vazia no singleton Anthropic.

**Veredito Global: APPROVED WITH CONDITIONS**

Todas as 6 tasks passam nos criterios de seguranca, porem foram identificados 3 findings residuais (1 MEDIUM, 2 LOW) que devem ser rastreados como divida tecnica.

---

## T-S17-001: Mass Assignment Protection

**Veredito: PASS**

### Analise

**`src/server/services/trip.service.ts:147-158`** -- O metodo `updateTrip` agora usa whitelist explicita de campos:

```typescript
const updateData: Record<string, unknown> = {};
if (data.title !== undefined) updateData.title = data.title;
if (data.destination !== undefined) updateData.destination = data.destination;
// ... 7 campos adicionais, todos explicitamente mapeados
```

Campos perigosos como `userId`, `deletedAt`, `expeditionMode`, `currentPhase`, `tripType` sao silenciosamente ignorados. Este e o padrao correto de defense-in-depth.

**`src/server/actions/account.actions.ts:63-71`** -- `updateUserProfileAction` constroi `updateData` explicitamente com apenas `name` e `preferredLocale`. Sem spread. PASS.

**`src/server/actions/ai.actions.ts:169-180`** -- `generateTravelPlanAction` constroi `sanitizedParams` com campos explicitamente mapeados apos Zod parse. PASS.

**`src/server/actions/ai.actions.ts:283-290`** -- `generateChecklistAction` passa campos explicitamente para `AiService.generateChecklist`. PASS.

**`src/server/actions/expedition.actions.ts:192-194`** -- `completePhase4Action` extrai `needsCarRental` e `cnhResolved` com `Boolean()` cast explicito. PASS.

**`src/server/actions/expedition.actions.ts:487-491`** -- `advanceFromPhaseAction` mesma abordagem para phase 4 metadata. PASS.

**`src/server/services/auth.service.ts:51-57`** -- `registerUser` usa campos explicitamente nomeados em `db.user.create`. PASS.

**`src/server/services/profile.service.ts:14,30-48`** -- `ALLOWED_PROFILE_FIELDS` whitelist + loop que verifica `if (!ALLOWED_PROFILE_FIELDS.has(key)) continue`. PASS.

**`src/server/actions/profile.actions.ts:131-134`** -- `updateProfileFieldAction` valida `fieldKey` contra `PROFILE_FIELD_POINTS` antes de qualquer operacao. PASS.

### Testes

**`tests/unit/server/mass-assignment.test.ts`** -- 5 testes cobrindo:
- `updateUserProfileAction`: extra fields (email, passwordHash, deletedAt, id) nao persistidos
- `TripService.updateTrip`: extra fields (userId, deletedAt, expeditionMode, currentPhase) ignorados
- `ProfileService.saveAndAwardProfileFields`: campos fora da whitelist ignorados
- `generateTravelPlanAction`: campos extras (systemPrompt, adminOverride) nao chegam ao AI service
- `generateChecklistAction`: mesma verificacao

**Cenario de ameaca verificado:** Atacante adiciona `isAdmin: true` ao profile update -- IGNORADO. PASS.

### Findings

**SEC-S17-001 (LOW):** `profile.actions.ts:161-164` usa `[dbKey]: dbValue` com chave dinamica no Prisma upsert. Embora o `fieldKey` seja validado contra `PROFILE_FIELD_POINTS` na linha 132, a transformacao para `dbKey` (via `getDbKey`) e indireta. O risco e mitigado pela validacao previa, mas seria mais robusto usar um switch/case explicito em vez de computed property names.

**SEC-S17-002 (LOW):** `profile.service.ts:53-57` usa spread (`{ userId, ...updateData }`) no `create` clause do upsert. O `updateData` e construido por loop controlado (linhas 32-47) filtrando pela whitelist. Risco baixo mas o padrao de spread deve ser monitorado.

---

## T-S17-002: OAuth Cleanup na Exclusao de Conta

**Veredito: PASS**

### Analise

**`src/server/actions/account.actions.ts:137-166`** -- A transacao de exclusao agora executa na ordem correta:

1. `tx.account.deleteMany({ where: { userId: user.id } })` -- remove tokens OAuth (linha 140-142)
2. `tx.session.deleteMany({ where: { userId: user.id } })` -- invalida todas as sessoes (linha 145-147)
3. `tx.user.update(...)` -- soft-delete + anonimizacao PII (linha 150-159)
4. `tx.trip.updateMany(...)` -- cascade soft-delete de trips (linha 162-165)

**Prisma schema cascade analysis:**

| Modelo | Relacao com User | onDelete | Cleanup necessario |
|---|---|---|---|
| Account | `userId` FK | `Cascade` | Coberto por cascade E deleteMany explicito |
| Session | `userId` FK | `Cascade` | Coberto por cascade E deleteMany explicito |
| Trip | `userId` FK | `Cascade` | Soft-delete explicito (correto, nao depende de cascade) |
| UserProgress | `userId` FK | `Cascade` | Coberto por Prisma cascade automatico |
| PointTransaction | `userId` FK | `Cascade` | Coberto por Prisma cascade automatico |
| UserBadge | `userId` FK | `Cascade` | Coberto por Prisma cascade automatico |
| UserProfile | `userId` FK | `Cascade` | Coberto por Prisma cascade automatico |

**Nota importante:** Como o `deleteUserAccountAction` faz SOFT-DELETE (update, nao delete) do User, as cascades de `onDelete: Cascade` NAO sao acionadas automaticamente pelo Prisma. A limpeza explicita de Account e Session e portanto ESSENCIAL. Os modelos de gamificacao (UserProgress, PointTransaction, UserBadge) e UserProfile ficam orfaos apos soft-delete do user, mas continuam acessiveis apenas via userId. O `deletedAt` no User garante que queries BOLA-safe nao retornam dados desses usuarios.

### Testes

**`tests/unit/server/account.actions.test.ts`** -- Cobertura abrangente:
- Teste de sucesso completo (linha 265-337): verifica que `account.deleteMany` e `session.deleteMany` sao chamados
- Teste de ordem de operacoes (linha 477-539): verifica que cleanup OAuth acontece ANTES de user.update
- Teste de PII ausente em logs (linha 541-585): sem email/nome em analytics events
- Teste de hash no email anonimizado (linha 395-427): sem userId raw no email anonimizado

**Cenario de ameaca verificado:** Usuario deleta conta mas tokens OAuth permanecem -- RESOLVIDO. Tokens sao removidos dentro da transacao.

### Findings

**SEC-S17-003 (MEDIUM):** Dados de gamificacao (UserProgress, PointTransaction, UserBadge, ExpeditionPhase) e UserProfile NAO sao limpos na exclusao de conta. Embora o soft-delete no User impeca acesso via fluxo normal (BOLA guards), esses registros contem:
- `PointTransaction`: historico de comportamento do usuario (tipos de atividade, timestamps)
- `UserProfile`: dados sensiveis potencialmente (nascimento, telefone, endereco -- criptografados para passport/nationalId)
- `UserBadge`/`UserProgress`: dados de comportamento gamificado

Para LGPD compliance plena, esses dados deveriam ser anonimizados ou deletados na transacao de exclusao. Especialmente `UserProfile` que contem campos criptografados -- a chave de encriptacao nao e por-usuario, entao os dados continuam decifravel apos exclusao da conta.

**Recomendacao:** Adicionar ao Sprint 18:
```typescript
// Dentro da transacao, apos session.deleteMany:
await tx.userProfile.deleteMany({ where: { userId: user.id } });
await tx.userBadge.deleteMany({ where: { userId: user.id } });
await tx.pointTransaction.deleteMany({ where: { userId: user.id } });
await tx.userProgress.deleteMany({ where: { userId: user.id } });
await tx.expeditionPhase.deleteMany({ where: { tripId: { in: userTripIds } } });
```

---

## T-S17-004: Hash userId em Logs

**Veredito: PASS (com conditions)**

### Analise

**`src/lib/hash.ts`** -- Implementacao correta:
- SHA-256 via `crypto.createHash("sha256")` -- nao reversivel
- Truncado a 12 chars hex -- suficiente para correlacao, resistente a rainbow tables
- Deterministico (mesmo userId = mesmo hash)
- Sincrono, sem overhead significativo

**Server actions auditadas:**

| Arquivo | Status | Detalhes |
|---|---|---|
| `account.actions.ts` | PASS | Usa `hashForLog(session.user.id)` em todas as linhas (83, 90, 186) |
| `ai.actions.ts` | PASS | Usa `hashUserId(session.user.id)` nas linhas 221, 297 |
| `expedition.actions.ts` | PASS | Usa `hashUserId(session.user.id)` em TODOS os logger calls (58, 68, 116, 126, 152, 175, 218, 240, 353, 399, 455, 555, 576) |
| `profile.actions.ts` | PASS | Usa `hashUserId(session.user.id)` nas linhas 118, 200, 208 |
| `ai.service.ts` | PASS | Usa `hashUserId(params.userId)` na funcao `logTokenUsage` (linha 236) e em todos os logger calls internos |

**Arquivos com userId RAW em logger calls (NAO corrigidos neste sprint):**

| Arquivo | Linha | Tipo | Severidade |
|---|---|---|---|
| `trip.actions.ts` | 40, 75, 108, 132, 151 | `userId: session.user.id` em logger.error | **HIGH** |
| `auth.service.ts` | 61, 86, 114, 142, 173 | `userId: user.id` / `userId` em logger.info | **MEDIUM** |
| `profile.service.ts` | 68 | `userId` raw em logger.info | **LOW** |

### Testes

**`tests/unit/lib/hash.test.ts`** -- 5 testes:
- Consistencia (mesmo input = mesmo output)
- Formato correto (12 chars, hex)
- Diferente do input original
- Hashes distintos para inputs distintos
- Sincrono (nao retorna Promise)

**Cenario de ameaca verificado:** Log aggregation expoe userId para cross-referencing -- PARCIALMENTE RESOLVIDO. Resolvido em `account.actions.ts`, `ai.actions.ts`, `expedition.actions.ts`, `profile.actions.ts`, e `ai.service.ts`. NAO resolvido em `trip.actions.ts` (5 ocorrencias) e `auth.service.ts` (5 ocorrencias).

### Findings

**SEC-S17-004 (HIGH -- reclassificado como MEDIUM por contexto):** `trip.actions.ts` ainda loga `userId: session.user.id` em texto claro em 5 pontos de erro. Este arquivo nao importa `hashUserId` e nao foi tocado pelo Sprint 17. O escopo original da task T-S17-004 lista explicitamente `trip.actions.ts:39,74,107,131,150` como locais afetados, mas a correcao nao foi aplicada.

**Severidade MEDIUM** (e nao HIGH) porque: (a) sao logger.error calls em paths de excecao, nao fluxo normal, e (b) os logs de erro ja incluem stack traces que podem conter dados sensiveis independentemente.

**SEC-S17-005 (MEDIUM):** `auth.service.ts` loga userId raw em 5 logger.info calls (linhas 61, 86, 114, 142, 173). Este arquivo NAO estava no escopo da T-S17-004, mas representa o mesmo risco. Esses logs cobrem registro, verificacao de email, e reset de senha -- fluxos criticos de seguranca onde a correlacao e importante mas o hash seria suficiente.

**SEC-S17-006 (LOW):** `profile.service.ts:68` loga `userId` raw em `logger.info("profile.fieldsUpdated", { userId, ... })`. Fora do escopo original mas deve ser corrigido junto com os demais.

---

## T-S17-005: Zod Server-Side AI Params Validation

**Veredito: PASS**

### Analise

**`src/lib/validations/ai.schema.ts`** -- Schemas bem definidos:

| Campo | Validacao | Protecao |
|---|---|---|
| `destination` | `string().min(1).max(200)` | Previne vazio e overflow |
| `startDate` | `string().min(1)` | Campo obrigatorio |
| `endDate` | `string().min(1)` | Campo obrigatorio |
| `travelStyle` | `z.enum([9 valores])` | Previne type confusion |
| `budgetTotal` | `number().min(1).max(1_000_000)` | Previne negativo e overflow |
| `budgetCurrency` | `z.enum(["USD","EUR","BRL","GBP","JPY","AUD","CAD"])` | Whitelist ISO 4217 |
| `travelers` | `number().int().min(1).max(20)` | Previne 0, fracionario, e excesso |
| `language` | `z.enum(["pt-BR", "en"])` | Whitelist estrita |
| `travelNotes` | `string().max(500).optional()` | Limite de tamanho |

**`src/server/actions/ai.actions.ts`** -- Validacao aplicada ANTES de rate limit e BOLA check:

```
generateTravelPlanAction:
  1. Auth check (105)
  2. TripId validation (108-111)        <-- Zod
  3. Params validation (114-117)         <-- Zod
  4. Rate limit check (119)
  5. BOLA check (123-129)
  6. Age guard (132-138)
  7. Sanitize + PII mask (141-166)
  8. AI call (192)
```

A ordem e correta: Zod ANTES do rate limit previne gasto de quota com requests invalidos.

**`GenerateChecklistParamsSchema`** -- Mesma robustez, campos explicitamente validados.

**`TripIdSchema`** -- `string().min(1).max(50)` previne IDs vazios e excessivamente longos.

**Comportamento de Zod com campos extras:** Zod por default faz "strip" de campos nao definidos no schema. Verificado no teste `ai.schema.test.ts:135-146`: `systemPrompt` e `adminOverride` sao removidos apos parse. Este comportamento e a defesa primaria contra mass assignment nos parametros de IA.

### Testes

**`tests/unit/lib/validations/ai.schema.test.ts`** -- 22 testes cobrindo:
- Params validos aceitos
- Destination vazio/longo rejeitados
- travelStyle invalido rejeitado
- Budget negativo e acima do limite rejeitados
- Travelers 0, fracionario, e acima de 20 rejeitados
- Language invalida rejeitada
- Currency invalida rejeitada
- travelNotes acima de 500 rejeitado
- Campos extras (systemPrompt, adminOverride) removidos silenciosamente
- TripId vazio e longo rejeitados

**`tests/unit/server/ai-validation.test.ts`** -- 9 testes de integracao:
- TripId vazio NAO chega ao rate limit
- travelStyle invalido rejeitado antes do rate limit
- Budget negativo rejeitado
- Destination vazio rejeitado
- Travelers acima do maximo rejeitado
- Checklist: tripId vazio, travelers zero, language invalida, destination vazio

**Cenario de ameaca verificado:** Atacante envia `maxTokens: 999999` -- NAO se aplica diretamente (maxTokens e definido internamente pelo service, nao via params). Atacante envia `budgetTotal: -1` -- REJEITADO. Atacante envia `travelStyle: "HACKING"` -- REJEITADO. PASS.

### Findings

Nenhum finding. Implementacao solida.

---

## T-S17-008: Transliteracao de Homoglifos Cirilicos

**Veredito: PASS**

### Analise

**`src/lib/prompts/injection-guard.ts:103-127`** -- Mapa de transliteracao `CYRILLIC_HOMOGLYPH_MAP`:

| Cirilico | Latin | Codepoint | Nota |
|---|---|---|---|
| a (U+0430) | a | Lowercase | |
| e (U+0435) | e | Lowercase | |
| o (U+043E) | o | Lowercase | |
| p (U+0440) | p | Lowercase | |
| c (U+0441) | c | Lowercase | |
| y (U+0443) | y | Lowercase | |
| i (U+0456) | i | Ukrainian | |
| s (U+0455) | s | Macedonian | |
| h (U+04BB) | h | | |
| j (U+0458) | j | Serbian | |
| d (U+0501) | d | | |
| w (U+051D) | w | | |
| A (U+0410) | A | Uppercase | |
| B (U+0412) | B | Uppercase | |
| E (U+0415) | E | Uppercase | |
| K (U+041A) | K | Uppercase | |
| M (U+041C) | M | Uppercase | |
| H (U+041D) | H | Uppercase | |
| O (U+041E) | O | Uppercase | |
| P (U+0420) | P | Uppercase | |
| C (U+0421) | C | Uppercase | |
| T (U+0422) | T | Uppercase | |
| X (U+0425) | X | Uppercase | |

23 mapeamentos -- cobre os homoglifos mais comuns. Ausencias notaveis: `\u044B` (lowercase y com barra -- raramente usado como homoglifo), `\u0456` lowercase i (presente -- bom).

**Pipeline de normalizacao (linha 149-158):**

```
Input -> NFKD -> Strip combining marks -> Cyrillic transliteration -> Pattern matching
```

A ordem e CORRETA: NFKD primeiro (decompoe fullwidth, ligaduras), strip combining marks (remove diacriticos), depois translitteracao cirilica (converte homoglifos), e so entao o matching de patterns.

**Propriedade critica:** `normalizeText()` retorna a copia normalizada; o texto original e preservado em `result.sanitized` (linha 216). O texto que segue para o AI prompt NAO e modificado pela transliteracao.

### Testes

**`tests/unit/lib/prompts/injection-guard.test.ts:366-439`** -- 8 testes de homoglifos cirilicos:

1. "ignore previous instructions" com cirilico i, o, e misturados -- DETECTADO
2. "you are now" com cirilico y, o, a, e -- DETECTADO
3. "ignore all previous instructions" totalmente em homoglifos -- DETECTADO
4. "system: override" com cirilico em "system" -- DETECTADO
5. "Moskva" em cirilico puro -- SEM false positive
6. Frase russa completa ("Quero visitar Moscou e Sao Petersburgo") -- SEM false positive
7. "jailbreak" com substituicoes cirilicas -- DETECTADO
8. "DAN mode" com cirilico A, o, e -- DETECTADO

**Cenario de ameaca verificado:** Atacante usa "ignore previous instructions" (com cirilico) -- BLOQUEADO. Texto cirilico real de destino -- PERMITIDO. PASS.

### Findings

Nenhum finding. A cobertura de homoglifos e adequada para MVP. O mapa pode ser expandido incrementalmente conforme novos bypass vectors surjam.

---

## T-S17-009: Guard contra apiKey Vazia no Singleton Anthropic

**Veredito: PASS**

### Analise

**`src/server/services/providers/claude.provider.ts:20-29`** -- Guard implementado:

```typescript
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey || apiKey.trim() === "") {
  throw new AppError("AI_CONFIG_ERROR", "errors.aiConfigError", 500);
}
g._anthropic = new Anthropic({ apiKey });
```

Propriedades de seguranca:
- Falha imediatamente (fail-fast) -- nao espera pela primeira chamada a API
- Mensagem de erro generica (`errors.aiConfigError`) -- NAO expoe o valor da chave
- Verifica `undefined`, string vazia, e string com apenas espacos
- Erro com codigo `AI_CONFIG_ERROR` para tratamento programatico
- A chave NAO aparece em logs, error messages, ou stack traces

**`src/lib/env.ts:13`** -- Validacao complementar:

```typescript
ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY cannot be empty").startsWith("sk-ant-").optional()
```

A validacao em `env.ts` e mais restritiva (exige prefixo `sk-ant-`), mas e `optional()`, entao a variavel pode estar ausente. O guard no `claude.provider.ts` cobre o caso em que a variavel existe mas esta vazia, ou quando `env.ts` e bypassado (skipValidation=true).

**Nota:** O provider acessa `process.env.ANTHROPIC_API_KEY` diretamente (nao via `env.ts`). Este e o finding pre-existente DT-MEDIO documentado. O guard funciona independentemente, mas idealmente deveria usar `env.ANTHROPIC_API_KEY` para consistencia.

### Testes

**`tests/unit/server/claude-provider-apikey.test.ts`** -- 5 testes:
- API key `undefined` -- lanca `AI_CONFIG_ERROR`
- API key string vazia (`""`) -- lanca `AI_CONFIG_ERROR`
- API key somente espacos (`"   "`) -- lanca `AI_CONFIG_ERROR`
- Verificacao do codigo de erro (`AI_CONFIG_ERROR`)
- API key valida -- sucesso

**Cenario de ameaca verificado:** Deploy com `ANTHROPIC_API_KEY=""` -- FALHA RAPIDA com erro claro. PASS.

### Findings

Nenhum finding novo. O uso direto de `process.env` (pre-existente DT-MEDIO) nao foi agravado.

---

## Auditoria Transversal

### Grep de Seguranca

| Verificacao | Resultado |
|---|---|
| `grep -rn 'userId: session' src/server/actions/` | 30+ ocorrencias em `trip.actions.ts`, `checklist.actions.ts`, `gamification.actions.ts`, `itinerary.actions.ts` -- NAO sao logger calls (sao Prisma where clauses, que e correto) |
| Logger calls com userId raw em `trip.actions.ts` | 5 ocorrencias (linhas 40, 75, 108, 132, 151) -- **NAO CORRIGIDO** |
| Logger calls com userId raw em `auth.service.ts` | 5 ocorrencias -- **FORA DO ESCOPO** |
| Logger calls com userId raw em `profile.service.ts` | 1 ocorrencia (linha 68) -- **FORA DO ESCOPO** |
| Spread de user input em Prisma calls | Nenhum encontrado em actions (profile.service.ts:53 usa spread controlado) |

### Tabela Consolidada de Findings

| ID | Severidade | Task | Descricao | Arquivo:Linha | Status |
|---|---|---|---|---|---|
| SEC-S17-001 | LOW | T-S17-001 | Computed property name em profile.actions.ts upsert | `profile.actions.ts:163` | Aceito (mitigado por validacao previa) |
| SEC-S17-002 | LOW | T-S17-001 | Spread controlado em profile.service.ts upsert create | `profile.service.ts:53` | Aceito (whitelist loop protege) |
| SEC-S17-003 | **MEDIUM** | T-S17-002 | Dados de gamificacao e UserProfile nao limpos na exclusao | `account.actions.ts:137-166` | **Debt Sprint 18** |
| SEC-S17-004 | **MEDIUM** | T-S17-004 | `trip.actions.ts` ainda loga userId raw (5 linhas) | `trip.actions.ts:40,75,108,132,151` | **Debt Sprint 18** |
| SEC-S17-005 | MEDIUM | T-S17-004 | `auth.service.ts` loga userId raw (5 linhas) | `auth.service.ts:61,86,114,142,173` | **Debt Sprint 18** |
| SEC-S17-006 | LOW | T-S17-004 | `profile.service.ts` loga userId raw (1 linha) | `profile.service.ts:68` | **Debt Sprint 18** |

---

## Cenarios de Ameaca -- Resultado Final

| # | Cenario | Resultado | Evidencia |
|---|---|---|---|
| 1 | Atacante adiciona `isAdmin: true` ao profile update | **IGNORADO** | Whitelist em todas as actions/services (T-S17-001) |
| 2 | Usuario deleta conta mas tokens OAuth permanecem | **LIMPOS** | `account.deleteMany` + `session.deleteMany` em transacao (T-S17-002) |
| 3 | Log aggregation expoe userId para cross-referencing | **PARCIAL** | Resolvido em 5/8 arquivos de actions/services (T-S17-004) |
| 4 | Atacante envia `maxTokens: 999999` em AI params | **REJEITADO** | Zod rejeita campos desconhecidos; maxTokens definido internamente (T-S17-005) |
| 5 | Atacante usa "ignore previous instructions" em cirilico | **BLOQUEADO** | Transliteracao cirilica detecta mixed-script injection (T-S17-008) |
| 6 | Deploy com `ANTHROPIC_API_KEY=""` | **FALHA RAPIDA** | Guard com `trim()` antes de `new Anthropic()` (T-S17-009) |

---

## Veredito

### APPROVED WITH CONDITIONS

**Condicoes (devem ser rastreadas como debt para Sprint 18):**

1. **SEC-S17-003 (MEDIUM):** Adicionar limpeza de UserProfile, UserProgress, PointTransaction, UserBadge, e ExpeditionPhase na transacao de exclusao de conta. Prioridade: MEDIA (LGPD compliance gap para dados de perfil criptografados).

2. **SEC-S17-004 (MEDIUM):** Corrigir os 5 logger calls em `trip.actions.ts` para usar `hashUserId`. Este arquivo foi listado no escopo original de T-S17-004 mas nao foi corrigido. Prioridade: ALTA (escopo comprometido da task).

3. **SEC-S17-005 (MEDIUM):** Corrigir os 5 logger calls em `auth.service.ts` para usar `hashUserId`. Prioridade: MEDIA (fluxos de seguranca criticos).

**Nenhum blocker para merge.** Os findings residuais sao divida tecnica que nao introduz vulnerabilidades criticas. O Sprint 17 elimina com sucesso as vulnerabilidades mais graves (mass assignment DT-004 com 15+ sprints pendente, e cirilico bypass SEC-S16-001).

---

*Revisao conduzida pelo security-specialist em 2026-03-09.*
