# Sprint 9 — User Tier + Gemini Integration + Dividas Tecnicas de Seguranca

**Data**: 2026-03-05
**Autor**: tech-lead
**Versao base**: 0.8.0 (469 testes, build limpo)
**Branch**: `feat/sprint-9` (a criar a partir de `master`)
**Sprint anterior**: Sprint 8 (AI Provider Abstraction + Wizard Improvements)

---

## Objetivo do Sprint

Entregar o modelo freemium (Free/Premium) com integracao Gemini Flash para usuarios free-tier,
resolver todas as dividas de seguranca criticas herdadas dos Sprints 6-8 (validacao Zod server-side,
defesa contra prompt injection, fail-fast de API keys, token logging), e documentar a arquitetura
do AI Provider pattern (ADR-008).

## User Stories de Referencia

| US | Descricao | Origem |
|----|-----------|--------|
| US-113 | User Tier (Free/Premium) — migration Prisma, campo `tier` no User | product-owner Sprint 9 |
| US-114 | Integracao Gemini Flash — `GeminiProvider` + factory por tier | product-owner Sprint 9 |

## Dividas Tecnicas Obrigatorias

| ID | Descricao | Severidade | Origem |
|----|-----------|-----------|--------|
| FIND-S8-M-001 / SEC-S6-001 | Zod validation server-side para GeneratePlanParams | Media | security-specialist Sprint 8 |
| FIND-S8-M-002 | Prompt injection defense — system/user separation | Media | security-specialist Sprint 8 |
| FIND-S8-M-003 | Guard fail-fast se API key ausente no provider | Media | security-specialist Sprint 8 |
| OPT-S8-005 | Logar inputTokens + outputTokens do provider response | Alta | finops-engineer Sprint 8 |
| OPT-S8-003 | Prompt caching Anthropic (cache_control no system prompt) | Alta | finops-engineer Sprint 8 |
| DEBT-S8-001 | ADR-008 documentar AI Provider pattern | Media | architect Sprint 8 |

## Dividas Opcionais (se houver espaco)

| ID | Descricao | Severidade | Decisao |
|----|-----------|-----------|---------|
| BUG-S7-004 | Footer links /terms, /privacy, /support -> 404 | Baixa | INCLUIDA como T-093 |
| RISK-019 | Validacao client-side de datas no wizard step 1 | Baixa | ADIADA para Sprint 10 |

---

## Tarefas

### Fase 1 — Fundacao (sem dependencias, paralelizavel)

---

#### T-082: Zod validation server-side para GeneratePlanParams no action
**Divida**: FIND-S8-M-001 / SEC-S6-001
**Dev**: `dev-fullstack-1`
**Esforco**: S (Small)
**Prioridade**: P0 (bloqueante para seguranca)
**Depende de**: nenhuma

**Descricao**:
Criar schema Zod `GeneratePlanParamsSchema` em `src/lib/validations/ai.schema.ts` que valide
todos os campos de `GeneratePlanParams` recebidos na `generateTravelPlanAction` ANTES de
passar para `AiService.generateTravelPlan`. Criar tambem `GenerateChecklistParamsSchema`.
Atualmente o action recebe `Omit<GeneratePlanParams, "userId">` sem validacao — qualquer valor
invalido (travelStyle fora do enum, budgetTotal negativo, datas invalidas) passa direto para o
prompt da IA.

**Arquivos afetados**:
- `src/lib/validations/ai.schema.ts` (NOVO)
- `src/server/actions/ai.actions.ts` (MODIFICAR — adicionar `.parse()` antes de chamar AiService)
- `tests/unit/lib/validations/ai.schema.test.ts` (NOVO)
- `tests/unit/server/ai.actions.test.ts` (MODIFICAR — adicionar testes de rejeicao de input invalido)

**Criterios de Aceite**:
- [ ] AC-001: `GeneratePlanParamsSchema` valida: `destination` (string, min 1, max 150), `startDate` (string ISO date), `endDate` (string ISO date, >= startDate), `travelStyle` (enum de 9 valores), `budgetTotal` (number, min 0, max 100000), `budgetCurrency` (enum ["BRL","USD","EUR"]), `travelers` (int, min 1, max 20), `language` (enum ["pt-BR","en"]), `travelNotes` (string, max 500, optional)
- [ ] AC-002: `GenerateChecklistParamsSchema` valida: `destination`, `startDate`, `travelers`, `language`
- [ ] AC-003: `generateTravelPlanAction` faz `GeneratePlanParamsSchema.parse(params)` e retorna `{ success: false, error: "errors.validationError" }` se falhar
- [ ] AC-004: `generateChecklistAction` faz `GenerateChecklistParamsSchema.parse(params)` e retorna erro se falhar
- [ ] AC-005: Testes unitarios cobrem: input valido aceito, cada campo invalido rejeitado (>= 12 cenarios)
- [ ] AC-006: Nenhum campo de PII logado nas mensagens de erro de validacao

**Estimativa de testes**: ~15 testes (12 cenarios de validacao + 3 testes de integracao no action)

---

#### T-083: Prompt injection defense — separar system/user message
**Divida**: FIND-S8-M-002
**Dev**: `dev-fullstack-1`
**Esforco**: S (Small)
**Prioridade**: P0 (bloqueante para seguranca)
**Depende de**: nenhuma

**Descricao**:
Atualmente o `ClaudeProvider.generateResponse` recebe um unico `prompt: string` que e enviado
como `messages: [{ role: "user", content: prompt }]`. Todo o conteudo (instrucoes do sistema +
dados do usuario como `travelNotes`) vai junto no mesmo campo. Isso permite que um usuario
injete instrucoes no `travelNotes` que sobrescrevam o system prompt.

A solucao e:
1. Alterar a interface `AiProvider.generateResponse` para receber `systemPrompt: string` e
   `userMessage: string` separadamente (em vez de um unico `prompt: string`).
2. No `ClaudeProvider`, enviar `system: systemPrompt` + `messages: [{ role: "user", content: userMessage }]`.
3. No `AiService`, construir o system prompt (instrucoes + formato JSON) separado do user message
   (dados da viagem + travelNotes com delimitadores).
4. Delimitar `travelNotes` com marcadores claros: `<user_notes>...</user_notes>` para que o modelo
   saiba que aquele conteudo e input do usuario, nao instrucao.

**Arquivos afetados**:
- `src/server/services/ai-provider.interface.ts` (MODIFICAR — assinatura de `generateResponse`)
- `src/server/services/providers/claude.provider.ts` (MODIFICAR — usar `system` + `messages`)
- `src/server/services/ai.service.ts` (MODIFICAR — separar system/user nos metodos `generateTravelPlan` e `generateChecklist`)
- `tests/unit/server/ai.service.test.ts` (MODIFICAR — verificar que prompts sao separados)

**Criterios de Aceite**:
- [ ] AC-001: `AiProvider.generateResponse` recebe `(systemPrompt: string, userMessage: string, maxTokens: number, model: "plan" | "checklist")` em vez de `(prompt: string, maxTokens: number, model: "plan" | "checklist")`
- [ ] AC-002: `ClaudeProvider` envia `system: systemPrompt` no request para a API Anthropic
- [ ] AC-003: `travelNotes` e delimitado com `<user_notes>...</user_notes>` no user message
- [ ] AC-004: System prompt contem instrucoes + formato JSON; user message contem dados da viagem
- [ ] AC-005: Testes verificam que `generateResponse` e chamado com 2 prompts separados
- [ ] AC-006: Testes verificam que travelNotes aparece apenas no user message, nunca no system prompt

**Estimativa de testes**: ~6 testes (3 de separacao de prompts + 3 de delimitacao de travelNotes)

---

#### T-084: Guard fail-fast se API key ausente no provider
**Divida**: FIND-S8-M-003
**Dev**: `dev-fullstack-2`
**Esforco**: XS (Extra Small)
**Prioridade**: P1 (importante)
**Depende de**: nenhuma

**Descricao**:
Atualmente `getAnthropic()` cria o singleton com `apiKey: ""` quando `ANTHROPIC_API_KEY` nao esta
definida. Isso faz com que a chamada falhe com 401 na API Anthropic (erro tardio). O correto e
fail-fast: verificar se a key esta presente no construtor e lancar `AppError("AI_AUTH_ERROR")`
imediatamente.

Aplicar o mesmo pattern para o futuro `GeminiProvider` (T-087).

**Arquivos afetados**:
- `src/server/services/providers/claude.provider.ts` (MODIFICAR — guard em `getAnthropic()`)
- `tests/unit/server/providers/claude.provider.test.ts` (NOVO)

**Criterios de Aceite**:
- [ ] AC-001: Se `ANTHROPIC_API_KEY` nao esta definida ou e string vazia, `ClaudeProvider.generateResponse` lanca `AppError("AI_AUTH_ERROR", "errors.aiAuthError", 401)` ANTES de tentar chamar a API
- [ ] AC-002: Se `ANTHROPIC_API_KEY` esta definida, comportamento normal mantido
- [ ] AC-003: Teste unitario isolado do `ClaudeProvider` valida ambos cenarios
- [ ] AC-004: O singleton `_anthropic` nao e criado quando key esta ausente

**Estimativa de testes**: ~4 testes

---

#### T-085: Token usage logging no AiService
**Divida**: OPT-S8-005
**Dev**: `dev-fullstack-2`
**Esforco**: XS (Extra Small)
**Prioridade**: P1 (importante para FinOps)
**Depende de**: nenhuma

**Descricao**:
O `AiProviderResponse` ja retorna `inputTokens` e `outputTokens`, mas o `AiService` nao loga
esses valores. Adicionar logging estruturado (via `logger.info`) apos cada chamada ao provider,
incluindo: provider name, model type, inputTokens, outputTokens, cached (boolean), userId (hash).

Isso e a base para o FinOps engineer monitorar custos reais por sprint.

**Arquivos afetados**:
- `src/server/services/ai.service.ts` (MODIFICAR — adicionar `logger.info` apos `provider.generateResponse`)
- `tests/unit/server/ai.service.test.ts` (MODIFICAR — verificar chamadas de logging)

**Criterios de Aceite**:
- [ ] AC-001: Apos cada chamada ao provider, `logger.info("ai.provider.usage", { provider, model, inputTokens, outputTokens, cached: false })` e chamado
- [ ] AC-002: Em cache hit, `logger.info("ai.plan.cache.hit", { userId, cached: true })` ja existe — manter
- [ ] AC-003: userId e logado como hash SHA-256 (nao raw) — consistente com padrao do Sprint 7
- [ ] AC-004: Nenhum PII no log (sem destination, travelNotes, ou qualquer dado da viagem)
- [ ] AC-005: Testes verificam que logger.info e chamado com os campos esperados

**Estimativa de testes**: ~3 testes

---

#### T-086: ADR-008 — Documentar AI Provider Abstraction pattern
**Divida**: DEBT-S8-001
**Dev**: `dev-fullstack-2`
**Esforco**: XS (Extra Small)
**Prioridade**: P2 (documentacao)
**Depende de**: nenhuma

**Descricao**:
Documentar em `docs/architecture.md` a ADR-008 descrevendo o AI Provider Abstraction Layer:
Strategy Pattern, interface `AiProvider`, factory `getProvider()`, decisoes de model selection
por tier, e como adicionar novos providers.

**Arquivos afetados**:
- `docs/architecture.md` (MODIFICAR — adicionar secao ADR-008)

**Criterios de Aceite**:
- [ ] AC-001: ADR-008 segue o formato dos ADRs existentes (Context, Options Considered, Decision, Consequences)
- [ ] AC-002: Documenta: interface AiProvider, ClaudeProvider, GeminiProvider (a ser adicionado), factory getProvider
- [ ] AC-003: Documenta decisao de model selection: Premium -> Claude Sonnet/Haiku, Free -> Gemini Flash
- [ ] AC-004: Documenta como adicionar um novo provider (checklist de passos)
- [ ] AC-005: Referencia as dividas de seguranca resolvidas neste sprint (FIND-S8-M-001..003)

**Estimativa de testes**: 0 (documentacao)

---

### Fase 2 — User Tier (depende da Fase 1 parcialmente)

---

#### T-087: Migration Prisma — campo `tier` no modelo User + enum UserTier
**User Story**: US-113
**Dev**: `dev-fullstack-1`
**Esforco**: S (Small)
**Prioridade**: P0 (bloqueante para US-114)
**Depende de**: nenhuma (pode iniciar em paralelo com Fase 1)

**Descricao**:
Adicionar enum `UserTier` com valores `FREE` e `PREMIUM` ao schema Prisma. Adicionar campo
`tier` ao modelo `User` com default `FREE`. Criar migration. Atualizar o JWT callback em
`auth.config.ts` para propagar `tier` no token e na session, de modo que tanto Server Components
quanto Server Actions tenham acesso ao tier do usuario sem query adicional.

**Arquivos afetados**:
- `prisma/schema.prisma` (MODIFICAR — adicionar enum UserTier, campo tier no User)
- `prisma/migrations/XXXXXXXX_add_user_tier/` (NOVO — migration gerada)
- `src/lib/auth.config.ts` (MODIFICAR — propagar tier no JWT callback + session callback)
- `src/lib/auth.ts` (MODIFICAR — se necessario ajustar tipo de session para incluir tier)
- `src/types/next-auth.d.ts` (MODIFICAR ou NOVO — declare module augmentation para Session incluir tier)
- `prisma/seed.ts` (MODIFICAR — adicionar tier nos usuarios de seed, default FREE)
- `tests/unit/server/ai.actions.test.ts` (MODIFICAR — mock de session agora inclui tier)

**Criterios de Aceite**:
- [ ] AC-001: Enum `UserTier` com valores `FREE` e `PREMIUM` existe no schema Prisma
- [ ] AC-002: Campo `tier` no modelo User com `@default(FREE)`
- [ ] AC-003: Migration roda sem erro (`npx prisma migrate dev`)
- [ ] AC-004: `session.user.tier` esta disponivel no JWT callback (tipo `"FREE" | "PREMIUM"`)
- [ ] AC-005: Type augmentation: `Session["user"]` inclui `tier: UserTier`
- [ ] AC-006: Seed atualizado: `test@test.com` e `FREE`, pode-se criar um usuario `premium@travel.dev` com `PREMIUM`
- [ ] AC-007: Nenhum usuario existente e afetado (default FREE)
- [ ] AC-008: Testes existentes nao quebram (session mock atualizado)

**Estimativa de testes**: ~5 testes (migration smoke + session tier propagation + seed)

---

### Fase 3 — Gemini Provider (depende de T-083 e T-087)

---

#### T-088: Implementar GeminiProvider + factory getProvider por tier
**User Story**: US-114
**Dev**: `dev-fullstack-1`
**Esforco**: M (Medium)
**Prioridade**: P0 (core feature do sprint)
**Depende de**: T-083 (interface atualizada com system/user separation), T-087 (UserTier disponivel)

**Descricao**:
Implementar `GeminiProvider` que usa `@google/generative-ai` SDK para chamar Gemini 2.0 Flash.
O provider deve implementar a interface `AiProvider` (ja atualizada com `systemPrompt` + `userMessage`
por T-083). Atualizar a factory `getProvider(tier: UserTier)` para retornar `GeminiProvider`
quando `tier === "FREE"` e `ClaudeProvider` quando `tier === "PREMIUM"`.

Atualizar `AiService` para passar o `userTier` recebido do action para a factory.
Atualizar os actions para ler `session.user.tier` e passa-lo ao `AiService`.

**Arquivos afetados**:
- `src/server/services/providers/gemini.provider.ts` (NOVO)
- `src/server/services/ai.service.ts` (MODIFICAR — `getProvider(tier)`, propagar tier nos metodos)
- `src/server/actions/ai.actions.ts` (MODIFICAR — ler `session.user.tier`, passar para AiService)
- `src/lib/env.ts` (MODIFICAR — adicionar validacao de prefixo para GOOGLE_AI_API_KEY se desejado)
- `src/types/ai.types.ts` (MODIFICAR — adicionar `userTier` em GeneratePlanParams e GenerateChecklistParams, ou como param separado)
- `tests/unit/server/providers/gemini.provider.test.ts` (NOVO)
- `tests/unit/server/ai.service.test.ts` (MODIFICAR — testar factory com tier)
- `tests/unit/server/ai.actions.test.ts` (MODIFICAR — session com tier)
- `package.json` (MODIFICAR — adicionar `@google/generative-ai`)

**Criterios de Aceite**:
- [ ] AC-001: `GeminiProvider` implementa `AiProvider` com `name = "gemini"`
- [ ] AC-002: `GeminiProvider` usa modelo `gemini-2.0-flash` para plan e checklist
- [ ] AC-003: `GeminiProvider` faz fail-fast se `GOOGLE_AI_API_KEY` ausente (mesmo pattern de T-084)
- [ ] AC-004: `GeminiProvider` mapeia erros do SDK Google para `AppError` (auth, rate limit, timeout)
- [ ] AC-005: `GeminiProvider` retorna `inputTokens` e `outputTokens` do `usageMetadata` da resposta
- [ ] AC-006: `getProvider("FREE")` retorna `GeminiProvider`; `getProvider("PREMIUM")` retorna `ClaudeProvider`
- [ ] AC-007: Se `GOOGLE_AI_API_KEY` ausente e user e FREE, retorna `ClaudeProvider` como fallback (graceful degradation)
- [ ] AC-008: `generateTravelPlanAction` e `generateChecklistAction` leem `session.user.tier` e passam para AiService
- [ ] AC-009: Dependencia `@google/generative-ai` adicionada com licenca Apache 2.0 (verificar)
- [ ] AC-010: Timeout de 90s configurado (mesmo que Claude)
- [ ] AC-011: Testes unitarios isolados do GeminiProvider (mock do SDK)
- [ ] AC-012: Testes da factory verificam routing por tier

**Estimativa de testes**: ~14 testes (6 GeminiProvider + 4 factory + 4 integracao actions)

---

#### T-089: Prompt caching Anthropic (cache_control no system prompt)
**Divida**: OPT-S8-003
**Dev**: `dev-fullstack-2`
**Esforco**: S (Small)
**Prioridade**: P1 (otimizacao de custo)
**Depende de**: T-083 (system/user separation — necessario para cache_control funcionar no system block)

**Descricao**:
A API Anthropic suporta prompt caching via `cache_control: { type: "ephemeral" }` no bloco
`system`. Isso reduz o custo de input tokens em ~90% para prompts repetidos (mesmo system prompt).
Como o system prompt do travel plan e do checklist sao praticamente identicos entre chamadas
(so o user message muda), o cache hit rate sera alto.

Implementar no `ClaudeProvider` o envio do `system` como array de content blocks com
`cache_control` no ultimo bloco.

**Arquivos afetados**:
- `src/server/services/providers/claude.provider.ts` (MODIFICAR — system como content block com cache_control)
- `tests/unit/server/providers/claude.provider.test.ts` (MODIFICAR — verificar formato do request)

**Criterios de Aceite**:
- [ ] AC-001: System prompt enviado como `system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]`
- [ ] AC-002: O `AiProviderResponse` agora inclui `cacheReadTokens` e `cacheCreationTokens` (opcionais)
- [ ] AC-003: Logger registra `cacheReadTokens` quando disponivel na resposta
- [ ] AC-004: Testes verificam que o formato do request para Anthropic inclui `cache_control`
- [ ] AC-005: Sem impacto no `GeminiProvider` (que nao suporta esse feature)

**Estimativa de testes**: ~4 testes

---

### Fase 4 — Validacao e Polimento

---

#### T-090: Atualizar env.ts com validacao de prefixo para GOOGLE_AI_API_KEY
**Divida**: FIND-S8-L-002
**Dev**: `dev-fullstack-2`
**Esforco**: XS (Extra Small)
**Prioridade**: P2 (baixa)
**Depende de**: T-088 (Gemini integrado, faz sentido validar a key)

**Descricao**:
Atualmente `GOOGLE_AI_API_KEY` e `z.string().optional()` sem nenhuma validacao de formato.
Adicionar `.startsWith("AI")` ou uma validacao de comprimento minimo para evitar keys invalidas
sendo aceitas silenciosamente (similar ao `ANTHROPIC_API_KEY` que valida prefixo `sk-ant-`).

**Arquivos afetados**:
- `src/lib/env.ts` (MODIFICAR — refinar validacao de GOOGLE_AI_API_KEY)
- `.env.example` (MODIFICAR — atualizar comentario se necessario)

**Criterios de Aceite**:
- [ ] AC-001: `GOOGLE_AI_API_KEY` validada com `.min(10)` (keys Google AI tem pelo menos 39 caracteres)
- [ ] AC-002: Continua optional (app funciona sem Gemini)
- [ ] AC-003: Build nao quebra sem a key definida
- [ ] AC-004: `.env.example` atualizado com formato correto

**Estimativa de testes**: ~2 testes (validacao env em testes existentes)

---

#### T-091: Atualizar cache key para incluir provider/tier
**Dev**: `dev-fullstack-1`
**Esforco**: XS (Extra Small)
**Prioridade**: P1 (importante)
**Depende de**: T-088 (factory por tier)

**Descricao**:
Atualmente a cache key do Redis para planos e checklists nao inclui o provider. Quando o mesmo
usuario gera um plano como FREE (Gemini) e depois faz upgrade para PREMIUM (Claude), o cache
retornaria o plano gerado pelo Gemini. A cache key deve incluir o nome do provider.

**Arquivos afetados**:
- `src/server/services/ai.service.ts` (MODIFICAR — incluir provider name na cache key)
- `tests/unit/server/ai.service.test.ts` (MODIFICAR — verificar nova cache key)

**Criterios de Aceite**:
- [ ] AC-001: Cache key inclui o nome do provider (ex: `ai:plan:claude:<hash>` ou `ai:plan:gemini:<hash>`)
- [ ] AC-002: Planos cached com provider X nao sao servidos quando usuario muda para provider Y
- [ ] AC-003: Testes verificam que cache keys sao diferentes para providers diferentes

**Estimativa de testes**: ~3 testes

---

#### T-092: Testes de integracao da factory + providers + tier flow
**Dev**: `dev-fullstack-1` ou `dev-fullstack-2`
**Esforco**: S (Small)
**Prioridade**: P1 (qualidade)
**Depende de**: T-088, T-089, T-091

**Descricao**:
Testes de integracao (com mocks de SDK) que validam o fluxo completo:
1. User FREE -> factory retorna GeminiProvider -> prompt separado system/user -> response com tokens
2. User PREMIUM -> factory retorna ClaudeProvider -> prompt com cache_control -> response com tokens
3. Fallback: User FREE sem GOOGLE_AI_API_KEY -> factory retorna ClaudeProvider
4. Token logging em ambos cenarios

**Arquivos afetados**:
- `tests/unit/server/ai.service.test.ts` (MODIFICAR — adicionar suite de integracao)
- `tests/unit/server/ai.actions.test.ts` (MODIFICAR — testar tier propagation)

**Criterios de Aceite**:
- [ ] AC-001: Suite "Provider selection by tier" com >= 4 cenarios
- [ ] AC-002: Suite "Token logging" com >= 2 cenarios (plan + checklist)
- [ ] AC-003: Suite "Fallback behavior" com >= 2 cenarios (key missing, provider error)
- [ ] AC-004: Cobertura >= 80% em `ai.service.ts`, `claude.provider.ts`, `gemini.provider.ts`

**Estimativa de testes**: ~10 testes

---

#### T-093: Criar paginas estaticas /terms, /privacy, /support (divida BUG-S7-004)
**Divida**: BUG-S7-004
**Dev**: `dev-fullstack-2`
**Esforco**: S (Small)
**Prioridade**: P2 (nice-to-have, mas links quebrados sao visiveis)
**Depende de**: nenhuma (pode rodar em paralelo com qualquer fase)

**Descricao**:
Os links no Footer apontam para /terms, /privacy e /support, mas essas paginas nao existem.
Criar paginas estaticas com conteudo placeholder (a ser revisado pelo juridico antes do Sprint 10).

**Arquivos afetados**:
- `src/app/[locale]/(app)/terms/page.tsx` (NOVO) ou `src/app/[locale]/terms/page.tsx` (avaliar se deve ser publica)
- `src/app/[locale]/(app)/privacy/page.tsx` (NOVO)
- `src/app/[locale]/(app)/support/page.tsx` (NOVO)
- `messages/en.json` (MODIFICAR — adicionar namespace `legal`)
- `messages/pt-BR.json` (MODIFICAR — adicionar namespace `legal`)
- `tests/unit/app/legal-pages.test.tsx` (NOVO)

**Criterios de Aceite**:
- [ ] AC-001: Paginas /terms, /privacy, /support renderizam sem erro (status 200)
- [ ] AC-002: Conteudo placeholder com aviso "Este conteudo sera atualizado antes do lancamento"
- [ ] AC-003: Paginas acessiveis tanto autenticadas quanto nao-autenticadas (avaliar route group)
- [ ] AC-004: i18n completo (PT-BR e EN)
- [ ] AC-005: Links do Footer funcionam corretamente (nao retornam 404)
- [ ] AC-006: WCAG 2.1 AA: heading hierarchy, aria-labels
- [ ] AC-007: Mobile 375px responsivo

**Estimativa de testes**: ~6 testes

---

#### T-094: QA e validacao final Sprint 9
**Dev**: `qa-engineer`
**Esforco**: M (Medium)
**Prioridade**: P0 (bloqueante para merge)
**Depende de**: todas as tarefas anteriores

**Descricao**:
Validacao end-to-end de todas as features e dividas do Sprint 9. Verificar que:
- Geracao de plano funciona com ambos providers (Claude e Gemini)
- Factory routing por tier esta correto
- Validacao Zod rejeita input invalido
- Prompt injection defense esta ativa (system/user separados)
- Token logging aparece nos logs
- Cache key diferencia providers
- Paginas legais acessiveis

**Criterios de Aceite**:
- [ ] AC-001: Todos os testes automatizados passando (meta: >= 510 testes)
- [ ] AC-002: Build limpo (`npm run build` sem erros)
- [ ] AC-003: Lint limpo (`npm run lint` sem erros)
- [ ] AC-004: Fluxo E2E validado: user FREE -> gera plano (Gemini mock) -> plano salvo
- [ ] AC-005: Fluxo E2E validado: user PREMIUM -> gera plano (Claude mock) -> plano salvo
- [ ] AC-006: Validacao de input: campos invalidos retornam erro amigavel
- [ ] AC-007: Logs de token usage presentes e formatados corretamente
- [ ] AC-008: Nenhum PII nos logs
- [ ] AC-009: Cobertura >= 80% nos arquivos de service e schema

**Estimativa de testes**: incluso nos testes das tarefas anteriores

---

## Mapa de Dependencias

```
                        FASE 1 (paralela)
    +-----------+    +----------+    +-----------+    +-----------+    +-----------+
    | T-082     |    | T-083    |    | T-084     |    | T-085     |    | T-086     |
    | Zod valid.|    | Prompt   |    | API key   |    | Token log |    | ADR-008   |
    | [dev-1]   |    | defense  |    | fail-fast |    | [dev-2]   |    | [dev-2]   |
    |           |    | [dev-1]  |    | [dev-2]   |    |           |    |           |
    +-----+-----+    +----+-----+    +-----+-----+    +-----+-----+    +-----------+
          |               |                |                |
          |               |                |                |
          v               v                v                v
    +-----+---------------+----------+-----+----------------+
    |              FASE 2            |
    |    T-087: Migration Prisma     |   (pode iniciar Day 1 em paralelo)
    |    User Tier + JWT [dev-1]     |
    +---------------+----------------+
                    |
                    v
    +--------------++--------------+
    |   FASE 3                     |
    |   T-088: GeminiProvider      |-----> T-089: Prompt caching [dev-2]
    |   + factory [dev-1]          |          (depende de T-083)
    +------+-----------+-----------+
           |           |
           v           v
    +------+--+  +-----+-----+
    | T-090   |  | T-091     |
    | env.ts  |  | Cache key |
    | [dev-2] |  | [dev-1]   |
    +----+----+  +-----+-----+
         |             |
         v             v
    +----+-------------+----+       +-------------+
    | T-092: Integracao     |       | T-093       |    (paralela, sem deps)
    | tests [dev-1 ou 2]    |       | Legal pages |
    +----------+------------+       | [dev-2]     |
               |                    +------+------+
               v                           |
    +----------+---------------------------+---+
    |          T-094: QA Final                 |
    |          [qa-engineer]                   |
    +------------------------------------------+
```

---

## Ordem de Execucao Recomendada (5 dias)

### Dia 1: Fundacao de Seguranca + Migration

| Dev | Tarefa | Fase | Esforco |
|-----|--------|------|---------|
| `dev-fullstack-1` | **T-082**: Zod validation server-side | 1 | S |
| `dev-fullstack-1` | **T-083**: Prompt injection defense (inicio) | 1 | S |
| `dev-fullstack-2` | **T-084**: Guard fail-fast API key | 1 | XS |
| `dev-fullstack-2` | **T-085**: Token usage logging | 1 | XS |
| `dev-fullstack-2` | **T-086**: ADR-008 documentacao | 1 | XS |

**Resultado esperado Dia 1**: T-082, T-084, T-085, T-086 completas. T-083 em andamento.

### Dia 2: Migration Prisma + Prompt Defense + Gemini (inicio)

| Dev | Tarefa | Fase | Esforco |
|-----|--------|------|---------|
| `dev-fullstack-1` | **T-083**: Prompt injection defense (conclusao) | 1 | -- |
| `dev-fullstack-1` | **T-087**: Migration Prisma User Tier | 2 | S |
| `dev-fullstack-2` | **T-093**: Paginas legais /terms, /privacy, /support | 4 | S |
| `dev-fullstack-2` | **T-089**: Prompt caching Anthropic (inicio, depende T-083) | 3 | S |

**Resultado esperado Dia 2**: T-083, T-087, T-093 completas. T-089 em andamento.

### Dia 3: GeminiProvider + Prompt Caching

| Dev | Tarefa | Fase | Esforco |
|-----|--------|------|---------|
| `dev-fullstack-1` | **T-088**: GeminiProvider + factory por tier | 3 | M |
| `dev-fullstack-2` | **T-089**: Prompt caching (conclusao) | 3 | -- |
| `dev-fullstack-2` | **T-090**: env.ts validacao GOOGLE_AI_API_KEY | 4 | XS |

**Resultado esperado Dia 3**: T-089, T-090 completas. T-088 em andamento.

### Dia 4: Integracao + Cache Key + Code Review

| Dev | Tarefa | Fase | Esforco |
|-----|--------|------|---------|
| `dev-fullstack-1` | **T-088**: GeminiProvider (conclusao) | 3 | -- |
| `dev-fullstack-1` | **T-091**: Cache key com provider | 4 | XS |
| `dev-fullstack-2` | **T-092**: Testes de integracao | 4 | S |
| `tech-lead` | Code review de T-082..T-091 | -- | -- |

**Resultado esperado Dia 4**: T-088, T-091, T-092 completas. Code review em andamento.

### Dia 5: QA Final + Fixes

| Dev | Tarefa | Fase | Esforco |
|-----|--------|------|---------|
| `qa-engineer` | **T-094**: QA e validacao final | 5 | M |
| `dev-fullstack-1` | Suporte a QA + fixes | -- | -- |
| `dev-fullstack-2` | Suporte a QA + fixes | -- | -- |
| `tech-lead` | Review final + aprovacao | -- | -- |

**Resultado esperado Dia 5**: Sprint 9 completo. Todos os testes passando.

---

## Alocacao e Paralelismo

### dev-fullstack-1 (Backend-focused neste sprint)
| Dia | Tarefas |
|-----|---------|
| 1 | T-082 (Zod validation) + T-083 (inicio prompt defense) |
| 2 | T-083 (conclusao) + T-087 (Migration Prisma) |
| 3 | T-088 (GeminiProvider — tarefa mais complexa do sprint) |
| 4 | T-088 (conclusao) + T-091 (Cache key) |
| 5 | Suporte QA + fixes |

### dev-fullstack-2 (Cross-cutting + Frontend neste sprint)
| Dia | Tarefas |
|-----|---------|
| 1 | T-084 (API key guard) + T-085 (Token logging) + T-086 (ADR-008) |
| 2 | T-093 (Paginas legais) + T-089 (inicio prompt caching) |
| 3 | T-089 (conclusao) + T-090 (env.ts) |
| 4 | T-092 (Testes integracao) |
| 5 | Suporte QA + fixes |

---

## Estimativa Total de Testes

| Tarefa | Testes estimados |
|--------|-----------------|
| T-082 | ~15 |
| T-083 | ~6 |
| T-084 | ~4 |
| T-085 | ~3 |
| T-086 | 0 |
| T-087 | ~5 |
| T-088 | ~14 |
| T-089 | ~4 |
| T-090 | ~2 |
| T-091 | ~3 |
| T-092 | ~10 |
| T-093 | ~6 |
| T-094 | 0 (validacao dos anteriores) |
| **Total novos** | **~72 testes** |
| **Total projetado** | **~541 testes** (469 existentes + 72 novos) |

---

## Definition of Done — Sprint 9

- [ ] T-082: Validacao Zod server-side para GeneratePlanParams e GenerateChecklistParams
- [ ] T-083: Prompt injection defense — system/user separation com delimitadores
- [ ] T-084: Guard fail-fast em ClaudeProvider quando API key ausente
- [ ] T-085: Token usage logging com inputTokens + outputTokens em cada chamada
- [ ] T-086: ADR-008 documentado em docs/architecture.md
- [ ] T-087: Migration Prisma com enum UserTier e campo tier no User
- [ ] T-088: GeminiProvider funcional com factory routing por tier
- [ ] T-089: Prompt caching Anthropic com cache_control no system prompt
- [ ] T-090: env.ts com validacao de GOOGLE_AI_API_KEY
- [ ] T-091: Cache key inclui provider/tier
- [ ] T-092: Testes de integracao cobrindo factory + providers + tier flow
- [ ] T-093: Paginas /terms, /privacy, /support criadas (links do footer funcionais)
- [ ] T-094: QA final aprovado
- [ ] Total de testes >= 510 passando, 0 falhas
- [ ] Build limpo
- [ ] Cobertura >= 80% em ai.service.ts, ai.schema.ts, claude.provider.ts, gemini.provider.ts
- [ ] Code review aprovado pelo tech-lead
- [ ] Security checklist passed (sem credentials em codigo, input validado, PII protegido)
- [ ] Sprint review executada por 6 agentes obrigatorios
- [ ] Version bump para 0.9.0
- [ ] PR criado e mergeado em master

---

## Checklist de Seguranca do Sprint

- [ ] Nenhuma API key hardcoded em codigo (ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY)
- [ ] Todas as keys lidas via `process.env` e validadas em `env.ts`
- [ ] Input do usuario validado com Zod ANTES de processar (T-082)
- [ ] travelNotes delimitado e separado do system prompt (T-083)
- [ ] Providers fazem fail-fast quando key ausente (T-084)
- [ ] Nenhum PII nos logs (T-085 — userId hasheado)
- [ ] Session propagation segura (tier via JWT, nao via client)
- [ ] Dependencia @google/generative-ai verificada: licenca Apache 2.0 (T-088)
- [ ] Rate limiting mantido nos actions (10 req/h plan, 5 req/h checklist)
- [ ] BOLA check mantido em todos os actions (trip.userId === session.user.id)

---

## Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| SDK Gemini incompativel com Edge runtime | Media | Alto | GeminiProvider usa `server-only`, nao roda em middleware |
| Gemini Flash output nao segue formato JSON esperado | Media | Medio | Reutilizar `extractJsonFromResponse` + `repairTruncatedJson` do AiService |
| Token count do Gemini em formato diferente | Baixa | Baixo | Mapear `usageMetadata.promptTokenCount`/`candidatesTokenCount` para interface |
| Migration Prisma falha em usuarios existentes | Baixa | Alto | Default `FREE` na migration garante compatibilidade |
| Prompt caching nao reduz custo como esperado | Baixa | Medio | Logar `cacheReadTokens` para medir efetividade real |

---

*Documento gerado pelo tech-lead em 2026-03-05*
*Proxima acao: criar branch `feat/sprint-9` e iniciar Fase 1*
