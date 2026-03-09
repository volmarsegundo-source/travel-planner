# Sprint 16 -- Kickoff Plan: Prompt Engineering & AI Guardrails

> **Tech-Lead:** tech-lead
> **Data de inicio:** 2026-03-09
> **Capacidade:** ~40h (2 devs full-stack, ~20h cada)
> **Estimativa total:** ~30h | **Buffer:** ~10h
> **Branch:** `feat/sprint-16`
> **Baseline:** 750+ testes, v0.9.0

---

## Validacao do Plano do Product-Owner

### Ranking de prioridade -- Ajuste tecnico

O PO priorizou por urgencia de negocio: T-S16-005 (PII) > T-S16-004+006 (injection) > T-S16-002 (system prompts) > resto. Essa priorizacao esta **correta do ponto de vista de valor**, mas precisa de um ajuste na **ordem de execucao** por dependencias tecnicas:

1. **T-S16-004 e T-S16-005 nao tem dependencia entre si** -- podem rodar em paralelo. O PO listou T-S16-005 como rank 1 e T-S16-004 como rank 2, mas dev-2 pode iniciar ambos simultaneamente (T-S16-004 no dia 1, T-S16-005 no dia 2 -- ou alternando conforme contexto). O importante e que **ambos estejam prontos antes de T-S16-006**.

2. **T-S16-001 DEVE ser a primeira task de dev-1** -- e pre-requisito tecnico para T-S16-002 (system prompts precisam do model type "guide" na interface). Mesmo com score menor que T-S16-002, a dependencia e estrita.

3. **T-S16-003 depende de T-S16-002** -- o token logging precisa dos system prompts implementados para logar corretamente o contexto. Pode ser feito no mesmo dia que T-S16-002 termina.

4. **T-S16-008 depende de T-S16-004 + T-S16-005 + T-S16-006** -- naturalmente vai para o final. Atribuido a dev-2 (que ja tera contexto dos guards).

**Conclusao:** Ranking do PO aprovado. Ordem de execucao ajustada por dependencias conforme mapa abaixo.

### Distribuicao por dev -- Confirmada

| dev-fullstack-1 (~14h) | dev-fullstack-2 (~16h) |
|---|---|
| T-S16-001 (S, 2h) | T-S16-004 (M, 4h) |
| T-S16-002 (L, 8h) | T-S16-005 (M, 4h) |
| T-S16-003 (S, 2h) | T-S16-006 (M, 4h) |
| T-S16-007 (S, 2h) | T-S16-008 (M, 4h) |

A divisao **provider layer (dev-1) vs security guards (dev-2)** esta correta. As duas trilhas sao independentes ate T-S16-006 (integracao), onde dev-2 precisa que dev-1 tenha concluido T-S16-001 (model type) para passar "guide" corretamente nas actions.

### Capacidade -- Confirmada

- Estimativa total: ~30h de ~40h disponiveis
- Buffer: ~10h (~25% da capacidade)
- O buffer e adequado considerando que T-S16-002 (system prompts, L) tem risco de subestimativa e que T-S16-004 (injection fixes) pode revelar novos false positives durante testes
- Recomendacao do PO de nao adicionar tarefas extras: **aceita**

---

## Mapa de Dependencias

```
dev-fullstack-1 (provider layer)          dev-fullstack-2 (security guards)
===================================       ===================================

T-S16-001 (model type fix)                T-S16-004 (injection guard fixes)
    |                                         |
    v                                     T-S16-005 (PII masker)
T-S16-002 (system prompts + cache)            |
    |                                         v
    v                                     T-S16-006 (integrar guards nas actions)
T-S16-003 (token logging)                    |
                                             v
T-S16-007 (min_tokens) [independente]     T-S16-008 (testes integracao)

Dependencias cruzadas:
- T-S16-006 usa model type "guide" de T-S16-001 (baixa dependencia -- apenas string)
- T-S16-008 valida token logging de T-S16-003 (1 caso de teste)
```

---

## Cronograma Sugerido

| Dia | dev-fullstack-1 | dev-fullstack-2 |
|---|---|---|
| 1 | T-S16-001 + inicio T-S16-002 | T-S16-004 |
| 2 | T-S16-002 (continuacao) | T-S16-005 |
| 3 | T-S16-002 (conclusao) + T-S16-003 | T-S16-006 |
| 4 | T-S16-007 + buffer/review | T-S16-008 |
| 5 | Buffer + code review cruzado | Buffer + code review cruzado |

---

## Tarefas

### Backend -- Provider Layer (dev-fullstack-1)

#### T-S16-001: Expandir tipo de modelo na interface AiProvider
- **Dev:** dev-fullstack-1
- **Tamanho:** S (~2h)
- **Dependencia:** Nenhuma (primeira task)
- **Spec ref:** OPT-004 (OPTIMIZATION-BACKLOG.md)
- **Revisao de seguranca:** Nao necessaria
- **Status:** [ ] Pendente

**Arquivos a modificar:**
- `src/server/services/ai-provider.interface.ts` -- expandir tipo `model` para `"plan" | "checklist" | "guide"`
- `src/server/services/providers/claude.provider.ts` -- mapear `"guide"` -> `CHECKLIST_MODEL` (Haiku) com comentario explicativo
- `src/server/services/ai.service.ts:494` -- corrigir `"checklist"` para `"guide"` em `generateDestinationGuide`

**Criterios de aceite:**
- [ ] `generateDestinationGuide` passa `"guide"` como model type (nao `"checklist"`)
- [ ] `ClaudeProvider` mapeia `"guide"` -> Haiku intencionalmente, com comentario documentando decisao
- [ ] Testes existentes passam sem modificacao
- [ ] Teste unitario novo confirma que guide usa Haiku
- [ ] Tipo `model` na interface aceita os 3 valores

---

#### T-S16-002: Implementar system prompts separados com cache_control
- **Dev:** dev-fullstack-1
- **Tamanho:** L (~8h) -- maior task do sprint
- **Dependencia:** T-S16-001 (model type precisa incluir "guide")
- **Spec ref:** OPT-001 (OPTIMIZATION-BACKLOG.md)
- **Revisao de seguranca:** Nao necessaria (nao toca em dados de usuario)
- **Status:** [ ] Pendente

**Arquivos a modificar:**
- `src/server/services/ai-provider.interface.ts` -- adicionar parametro opcional `systemPrompt?: string` em `generateResponse`
- `src/server/services/providers/claude.provider.ts` -- quando `systemPrompt` presente, enviar como `role: "system"` com `cache_control: {"type": "ephemeral"}`
- `src/server/services/ai.service.ts` -- nos 3 metodos (`generatePlan`, `generateChecklist`, `generateDestinationGuide`):
  - Separar instrucoes de sistema (persona, regras, constraints, formato) do conteudo dinamico (dados da viagem)
  - System prompt = parte estatica (cacheavel)
  - User message = dados dinamicos da viagem (nao cacheavel)

**Criterios de aceite:**
- [ ] Cada uma das 3 chamadas AI envia system prompt via `role: "system"` com `cache_control`
- [ ] User message contem apenas dados dinamicos (trip details, destination, preferences)
- [ ] Testes unitarios verificam que `systemPrompt` e passado ao provider nos 3 metodos
- [ ] Testes existentes continuam passando (regressao zero)
- [ ] System prompts devem ser escritos em ingles (lingua de operacao do modelo)

---

#### T-S16-003: Adicionar logging estruturado de token usage
- **Dev:** dev-fullstack-1
- **Tamanho:** S (~2h)
- **Dependencia:** T-S16-002 (logar apos chamadas com system prompt)
- **Spec ref:** OPT-003 (OPTIMIZATION-BACKLOG.md)
- **Revisao de seguranca:** Nao necessaria (nao loga PII)
- **Status:** [ ] Pendente

**Arquivos a modificar:**
- `src/server/services/ai.service.ts` -- adicionar log apos cada `provider.generateResponse`

**Formato do log:**
```typescript
logger.info("ai.tokens.usage", {
  userId,        // ja disponivel no contexto
  feature: "plan" | "checklist" | "guide",
  model: provider.name,
  inputTokens: response.inputTokens,
  outputTokens: response.outputTokens,
  estimatedCostUsd: calculateCost(response),
});
```

**Criterios de aceite:**
- [ ] Cada chamada AI (plan, checklist, guide) loga tokens e custo estimado
- [ ] Formato parseavel por finops-engineer (campos estruturados, nao string livre)
- [ ] Nenhum PII no log (sem travelNotes, sem nome de usuario, sem email)
- [ ] Helper `calculateCost()` usa precos corretos por modelo (Sonnet vs Haiku)
- [ ] Teste unitario confirma que log e emitido apos chamada bem-sucedida

---

#### T-S16-007: Reduzir MIN_PLAN_TOKENS para 2048
- **Dev:** dev-fullstack-1
- **Tamanho:** S (~2h)
- **Dependencia:** Nenhuma (independente)
- **Spec ref:** OPT-005 (OPTIMIZATION-BACKLOG.md)
- **Revisao de seguranca:** Nao necessaria
- **Status:** [ ] Pendente

**Arquivos a modificar:**
- `src/server/services/ai.service.ts:26` -- alterar `MIN_PLAN_TOKENS = 4096` para `MIN_PLAN_TOKENS = 2048`

**Criterios de aceite:**
- [ ] `calculatePlanTokenBudget(3)` retorna `max(2048, 3*600+500)` = 2300
- [ ] Trips longas (>= 10 dias) nao sao afetadas (ainda clampadas por MAX_PLAN_TOKENS)
- [ ] Teste unitario cobre caso de trip curta (3 dias) com novo valor minimo

---

### Backend -- Security Guards (dev-fullstack-2)

#### T-S16-004: Corrigir e expandir injection guard
- **Dev:** dev-fullstack-2
- **Tamanho:** M (~4h)
- **Dependencia:** Nenhuma (primeira task de dev-2)
- **Spec ref:** OPT-002 + FIND-S16-001, FIND-S16-002, FIND-S16-003
- **Revisao de seguranca:** SIM -- security-specialist deve revisar PR
- **Status:** [ ] Pendente

**Arquivos a modificar:**
- `src/lib/prompts/injection-guard.ts` -- correcoes e expansao
- `tests/unit/lib/prompts/injection-guard.test.ts` -- novos testes

**Acoes obrigatorias:**
1. Aplicar `text.normalize('NFKD')` antes de rodar regex (FIND-S16-002)
2. Adicionar padroes high-confidence em portugues (FIND-S16-001):
   - `/\bignor[ae]\s+(as\s+)?instruc[oõ]es?\s+anteriores?\b/i`
   - `/\bvoc[eê]\s+agora\s+[eé]\b/i`
   - `/\bnovas?\s+instruc[oõ]es?\s*:/i`
3. Refinar `/\bsystem\s*:\s*/i` para evitar false positive (FIND-S16-003):
   - Substituir por `/\bsystem\s*:\s*(?:override|ignore|new|you|reset|prompt)/i`
   - OU `/^\s*system\s*:/im` (apenas inicio de linha)
4. Adicionar testes para edge cases: input vazio, whitespace-only, emojis, multiplos padroes, portugues, false positive "transit system: Tokyo Metro"

**Criterios de aceite:**
- [ ] Zero false positives para frases comuns de viagem (testar com 10+ exemplos em pt-BR e en)
- [ ] "transit system: Tokyo Metro" NAO e detectado como injection
- [ ] "ignore as instrucoes anteriores" E detectado como injection (pt-BR)
- [ ] Unicode obfuscation normalizado antes de regex (NFKD)
- [ ] Testes >= 35 (atualmente ~24)

---

#### T-S16-005: Implementar PII masking pre-API call
- **Dev:** dev-fullstack-2
- **Tamanho:** M (~4h)
- **Dependencia:** Nenhuma (paralelo com T-S16-004)
- **Spec ref:** OPT-010 (OPTIMIZATION-BACKLOG.md)
- **Revisao de seguranca:** SIM -- security-specialist deve revisar PR (compliance LGPD)
- **Status:** [ ] Pendente

**Arquivos a criar:**
- `src/lib/prompts/pii-masker.ts` -- funcao `maskPII(text: string): string`
- `tests/unit/lib/prompts/pii-masker.test.ts` -- testes unitarios

**Padroes a mascarar (substituir por `[REDACTED]`):**

| Tipo | Regex | Exemplo |
|---|---|---|
| CPF | `/\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}/g` | 123.456.789-00 |
| Email | `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` | user@example.com |
| Telefone BR | `/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g` | +55 (11) 99999-1234 |
| Cartao | `/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g` | 4111 1111 1111 1111 |
| Passaporte BR | `/\b[A-Z]{2}\d{6}\b/g` | YA123456 |

**Criterios de aceite:**
- [ ] Todos os 5 padroes acima mascarados corretamente (com e sem formatacao)
- [ ] Texto normal de viagem nao afetado (ex: "Hotel Copacabana, 5 noites" intacto)
- [ ] Funcao e idempotente (aplicar 2x nao muda resultado)
- [ ] Testes >= 15
- [ ] Export unico e limpo: `export function maskPII(text: string): string`

---

#### T-S16-006: Integrar guards nas server actions
- **Dev:** dev-fullstack-2
- **Tamanho:** M (~4h)
- **Dependencia:** T-S16-004 + T-S16-005 (ambos guards devem estar prontos)
- **Spec ref:** OPT-002 (OPTIMIZATION-BACKLOG.md)
- **Revisao de seguranca:** SIM -- security-specialist deve revisar PR
- **Status:** [ ] Pendente

**Arquivos a modificar:**
- `src/server/actions/ai.actions.ts` -- em todas as actions que recebem `travelNotes`:
  1. Substituir `trim().slice(0, 500)` por `sanitizeForPrompt(travelNotes, "travelNotes", 500)`
  2. Aplicar `maskPII()` no resultado antes de passar para o AiService
- `src/server/actions/expedition.actions.ts` -- em `generateDestinationGuideAction`:
  1. Aplicar `sanitizeForPrompt(destination, "destination", 200)` no nome do destino
  2. Aplicar `maskPII()` se houver texto livre

**Pipeline de sanitizacao (ordem):**
```
input -> sanitizeForPrompt(trim, truncate, injection check) -> maskPII() -> AI service
```

**Criterios de aceite:**
- [ ] Todas as 3 actions que chamam AI passam por injection check + PII masking
- [ ] Testes de actions existentes atualizados para refletir novo pipeline
- [ ] Fluxo happy path nao quebra (travelNotes normal passa sem erro)
- [ ] AppError 400 retornado quando injection detectada
- [ ] PII mascarado antes de chegar ao AiService (verificar via mock)

---

### Cross-cutting

#### T-S16-008: Testes de integracao para fluxo completo de sanitizacao
- **Dev:** dev-fullstack-2 (recomendado -- ja tera contexto dos guards)
- **Tamanho:** M (~4h)
- **Dependencia:** T-S16-004, T-S16-005, T-S16-006 (todo o pipeline de guards)
- **Spec ref:** Sprint 16 Definition of Done
- **Revisao de seguranca:** Nao necessaria (sao testes)
- **Status:** [x] Concluido

**Arquivo a criar:**
- `tests/integration/sanitization-pipeline.test.ts` (ou equivalente)

**Casos de teste obrigatorios:**
1. Action com `travelNotes` contendo injection (en) -> retorna AppError 400
2. Action com `travelNotes` contendo injection (pt-BR) -> retorna AppError 400
3. Action com `travelNotes` contendo CPF -> CPF mascarado antes de chegar ao AiService
4. Action com `travelNotes` contendo email -> email mascarado
5. Action com `travelNotes` limpo -> fluxo normal, sem erro
6. Action com `destination` contendo injection -> retorna AppError 400
7. Action com `destination` limpo -> fluxo normal
8. Action com `travelNotes` contendo medium-confidence pattern -> warning logado, mas nao bloqueado
9. Action com `travelNotes` contendo PII + medium-confidence pattern -> PII mascarado, warning logado, nao bloqueado
10. Token logging emitido apos chamada bem-sucedida (se T-S16-003 estiver pronto)

**Criterios de aceite:**
- [x] >= 10 testes de integracao (31 testes criados)
- [x] Cobertura dos guards (injection-guard.ts + pii-masker.ts) >= 90%
- [x] Nenhum mock de guard nos testes de integracao (testar pipeline real)

---

## Definition of Done -- Sprint 16

- [ ] Todas as 8 tarefas marcadas como concluidas
- [ ] Code review aprovado pelo tech-lead
- [ ] Cobertura de testes >= 80% em todos os arquivos novos/modificados
- [ ] Security checklist aprovado:
  - [ ] Nenhum PII enviado para API Anthropic (PII masker integrado)
  - [ ] Injection guard ativo em todas as actions que chamam AI
  - [ ] Nenhum credential hardcoded
  - [ ] Token usage logado para finops (sem PII nos logs)
- [ ] Zero false positives confirmados para 20+ frases comuns de viagem (pt-BR e en)
- [ ] Testes existentes nao quebrados (regressao zero)
- [ ] >= 40 novos testes (790+ total)
- [ ] security-specialist revisou T-S16-004, T-S16-005, T-S16-006
- [ ] Merged via PR para master -- nenhum commit direto

---

## Revisores por Task

| Task | Code Review | Security Review |
|---|---|---|
| T-S16-001 | tech-lead | -- |
| T-S16-002 | tech-lead | -- |
| T-S16-003 | tech-lead + finops-engineer (formato do log) | -- |
| T-S16-004 | tech-lead | security-specialist |
| T-S16-005 | tech-lead | security-specialist |
| T-S16-006 | tech-lead | security-specialist |
| T-S16-007 | tech-lead | -- |
| T-S16-008 | tech-lead | -- |

---

## Briefing dev-fullstack-1

### Resumo
Voce e responsavel pela **camada de provider AI** neste sprint. Suas 4 tasks evoluem a interface e o servico de AI para suportar system prompts cacheados, corrigir a tipagem do modelo, e adicionar observabilidade de custo.

### Ordem de execucao recomendada

1. **T-S16-001** (S, 2h) -- Expandir model type para `"plan" | "checklist" | "guide"`
   - Comece por aqui -- e pre-requisito para T-S16-002
   - Arquivos: `ai-provider.interface.ts`, `claude.provider.ts`, `ai.service.ts:494`
   - Detalhe: mudar `"checklist"` para `"guide"` na chamada de `generateDestinationGuide`. No `ClaudeProvider`, mapear `"guide"` -> Haiku com comentario `// Intentional: guide uses Haiku -- factual extraction, see OPT-004`

2. **T-S16-002** (L, 8h) -- System prompts + cache_control
   - Maior task do sprint. Divida em 3 sub-etapas: (a) alterar interface, (b) alterar provider, (c) alterar ai.service.ts (3 metodos)
   - Na interface: `systemPrompt?: string` como parametro opcional em `generateResponse`
   - No provider: quando `systemPrompt` presente, usar array de messages com `[{role: "system", content: systemPrompt, cache_control: {type: "ephemeral"}}]`
   - No servico: para cada metodo, extrair as instrucoes fixas (persona, regras, formato JSON) como system prompt e deixar apenas os dados da viagem no user message
   - Consulte a documentacao da Anthropic API sobre `cache_control` e system messages

3. **T-S16-003** (S, 2h) -- Token usage logging
   - Adicionar apos cada chamada `provider.generateResponse` nos 3 metodos
   - Usar `logger.info("ai.tokens.usage", {...})` com campos estruturados
   - Criar helper `calculateEstimatedCost(model, inputTokens, outputTokens)` -- precos: Sonnet input $3/MTok output $15/MTok, Haiku input $0.25/MTok output $1.25/MTok (verificar precos atuais)
   - NAO logar userId diretamente se for UUID -- usar hash ou omitir (verificar com security-specialist)

4. **T-S16-007** (S, 2h) -- Reduzir MIN_PLAN_TOKENS
   - Trivial: alterar constante de 4096 para 2048 em `ai.service.ts:26`
   - Adicionar/atualizar teste para `calculatePlanTokenBudget(3)` = 2300

### Dependencias da outra trilha
- T-S16-006 (dev-2) vai chamar `sanitizeForPrompt` + `maskPII` nas actions, mas nao depende diretamente do seu codigo -- apenas do model type "guide" de T-S16-001
- Se T-S16-001 estiver pronto antes de dev-2 comecar T-S16-006, avise para que ele use "guide" na action de destination guide

### Expectativa de testes
- ~10-12 testes novos estimados para suas 4 tasks
- Foco: testes unitarios em `claude.provider.ts` (model mapping), `ai.service.ts` (system prompt separacao, token logging), e `calculatePlanTokenBudget`

### Arquivos-chave para referencia
- `src/server/services/ai-provider.interface.ts` -- interface (atualmente 30 linhas)
- `src/server/services/providers/claude.provider.ts` -- provider (model selection)
- `src/server/services/ai.service.ts` -- servico principal (3 metodos de geracao)
- `tests/unit/server/services/ai.service.test.ts` -- testes existentes

---

## Briefing dev-fullstack-2

### Resumo
Voce e responsavel pelos **guardrails de seguranca** neste sprint. Suas 4 tasks criam e integram as defesas que protegem dados pessoais e previnem prompt injection antes de qualquer chamada AI.

### Ordem de execucao recomendada

1. **T-S16-004** (M, 4h) -- Injection guard fixes
   - Comece por aqui -- a base ja existe em `src/lib/prompts/injection-guard.ts`
   - 3 correcoes obrigatorias:
     (a) Adicionar `text.normalize('NFKD')` como primeira operacao em `checkPromptInjection`
     (b) Adicionar padroes pt-BR ao array `HIGH_CONFIDENCE_PATTERNS`
     (c) Refinar regex `system:` para evitar false positive em "transit system: Tokyo"
   - Expandir testes de ~24 para >= 35. Incluir edge cases: vazio, whitespace, emojis, portugues, false positive regression
   - ATENCAO: o security-specialist vai revisar este PR. Documente cada padrao pt-BR com comentario explicativo

2. **T-S16-005** (M, 4h) -- PII masker
   - Criar arquivo novo `src/lib/prompts/pii-masker.ts`
   - 5 regex patterns: CPF, email, telefone BR, cartao de credito, passaporte BR
   - Substituir por `[REDACTED]` -- nao por placeholder diferenciado (privacidade maxima)
   - Testar com inputs mistos (texto de viagem + PII embutido)
   - ATENCAO: security-specialist revisara. Manter regex conservativo -- melhor deixar passar algo ambiguo do que bloquear texto legitimo de viagem

3. **T-S16-006** (M, 4h) -- Integrar nas actions
   - Depende de T-S16-004 e T-S16-005 estarem prontos
   - Modificar `ai.actions.ts` e `expedition.actions.ts`
   - Pipeline: `input -> sanitizeForPrompt() -> maskPII() -> AI service`
   - Atualizar testes existentes das actions para incluir mocks de `sanitizeForPrompt` e `maskPII`
   - Lembre: `redirect()` deve ficar FORA do try/catch (FIND-M-001)

4. **T-S16-008** (M, 4h) -- Testes de integracao
   - Criar `tests/integration/sanitization-pipeline.test.ts`
   - >= 10 testes end-to-end do pipeline
   - Testar injection em pt-BR e en, PII masking, happy path, medium-confidence warnings
   - NAO mockar os guards -- testar pipeline real

### Dependencias da outra trilha
- T-S16-001 (dev-1) expande o model type. Para T-S16-006, voce precisa usar `"guide"` (nao `"checklist"`) na action de destination guide. Se dev-1 ainda nao tiver terminado T-S16-001 quando voce comecar T-S16-006, combine com ele o valor correto
- T-S16-003 (token logging) -- um dos seus testes de integracao (T-S16-008 caso 10) valida que o log e emitido. Se T-S16-003 nao estiver pronto, marque esse teste como `.todo()`

### Expectativa de testes
- ~28-30 testes novos estimados para suas 4 tasks
- Breakdown: ~11 novos em injection-guard (de 24 para 35+), ~15 em pii-masker, ~10 em integracao
- Foco: cobertura >= 90% em `injection-guard.ts` e `pii-masker.ts`

### Arquivos-chave para referencia
- `src/lib/prompts/injection-guard.ts` -- guard existente (141 linhas, precisa de fixes)
- `src/lib/prompts/pii-masker.ts` -- a ser criado
- `src/server/actions/ai.actions.ts` -- actions que chamam AI (integracao)
- `src/server/actions/expedition.actions.ts` -- expedition actions (destination guide)
- `tests/unit/lib/prompts/injection-guard.test.ts` -- testes existentes (~24)
- `src/lib/errors.ts` -- AppError (usar para injection detection)
- `src/lib/logger.ts` -- logger (usar para warnings)

---

## Riscos Monitorados

| Risco | Probabilidade | Impacto | Mitigacao | Owner |
|---|---|---|---|---|
| False positives em injection guard | Media | Alto | Medium-confidence = WARN only. Testar com 20+ frases reais | dev-2 + security-specialist |
| PII masker remove conteudo legitimo | Baixa | Medio | Regex conservativo. Ex: numero de voo parece telefone | dev-2 |
| T-S16-002 subestimado (L = 8h) | Media | Medio | 10h buffer. Se necessario, T-S16-003 desliza para Sprint 17 | dev-1 |
| System prompt quebra respostas AI | Baixa | Alto | Testes de regressao obrigatorios nos 3 metodos | dev-1 |

---

## Meta de Testes

| Area | Testes atuais | Novos estimados | Total estimado |
|---|---|---|---|
| injection-guard.ts | ~24 | +11 | ~35 |
| pii-masker.ts | 0 | +15 | ~15 |
| ai.service.ts (provider) | existentes | +10 | existentes + 10 |
| integracao sanitizacao | 0 | +10 | ~10 |
| **Total novos** | | **~46** | **796+ total** |

Meta minima: +40 novos testes (790+ total).
