# Tech Lead Review -- Prompt Engineer Audit (Sprint 15)

> **Reviewer:** tech-lead
> **Data:** 2026-03-09
> **Scope:** Review de OPTIMIZATION-BACKLOG.md, injection-guard.ts, e modelo do Destination Guide

---

## 1. Revisao do Backlog de Otimizacao (OPT-001 a OPT-012)

### Validacao de Prioridades

| Item | Prioridade Original | Prioridade Revisada | Justificativa |
|---|---|---|---|
| OPT-001 | P0 | **P0 (mantida)** | System prompts + cache_control e pre-requisito para economia real de tokens. Sem isso, prompt caching nao funciona. |
| OPT-002 | P0 | **P0 (mantida)** | Seguranca critica. Injection guard ja criado mas nao integrado -- risco ativo. |
| OPT-003 | P0 | **P0 (mantida)** | Sem logging de tokens, finops opera no escuro. Implementacao simples. |
| OPT-004 | P1 | **P0 (promovido)** | Bug confirmado -- ver Secao 3. Decisao necessaria antes do Sprint 16 comecar. |
| OPT-005 | P1 | **P1 (mantida)** | Economia modesta. Pode ser feito junto com OPT-001. |
| OPT-006 | P1 | **P1 (mantida)** | Prompt versioning e bom mas nao urgente. Sprint 16 se couber, senao 17. |
| OPT-007 | P2 | **P2 (mantida)** | XML-tagged prompts melhoram qualidade mas requerem testes A/B. Sprint 17-18. |
| OPT-008 | P2 | **P2 (mantida)** | Hallucination bounds sao importantes mas nao criticos agora. |
| OPT-009 | P2 | **P3 (rebaixado)** | Batch API exige re-arquitetura (async jobs). Nao temos volume para justificar. |
| OPT-010 | P3 | **P1 (promovido)** | PII masking pre-API e compliance LGPD. travelNotes pode conter CPF, email, telefone. Deve entrar no Sprint 16. |
| OPT-011 | P3 | **P3 (mantida)** | Circuit breaker e nice-to-have. Redis cache 24h ja mitiga parcialmente. |
| OPT-012 | P3 | **P3 (mantida)** | Fallback chain depende de OPT-011. Backlog futuro. |

### Dependencias entre Itens

```
OPT-001 (system prompts) ← prerequisito para prompt caching funcionar
    |
    v
OPT-006 (prompt versioning) ← facilita manutencao de system prompts
    |
    v
OPT-007 (XML-tagged) ← refactoring de prompts ja extraidos

OPT-002 (injection guard) ← independente, pode ser paralelo com OPT-001
    |
    v
OPT-010 (PII masking) ← pode usar mesma infra de sanitizacao

OPT-003 (token logging) ← independente, pode ser paralelo com tudo

OPT-004 (modelo guide) ← decisao pontual, sem dependencias
OPT-005 (min_tokens) ← independente, trivial
```

### Decisao: Escopo Sprint 16

Sprint 16 incluira: **OPT-001, OPT-002, OPT-003, OPT-004, OPT-005, OPT-010**

Justificativa: OPT-001/002/003 sao criticos. OPT-004 e bug fix. OPT-005 e trivial (1 linha). OPT-010 e compliance LGPD e pode ser integrado com OPT-002.

---

## 2. Security Review -- Injection Guard

### Arquivo: `src/lib/prompts/injection-guard.ts`
### Testes: `tests/unit/lib/prompts/injection-guard.test.ts`

### 2.1 Cobertura de Padroes

**Pontos fortes:**
- Boa cobertura de padroes classicos de injection (role override, delimiter injection, prompt extraction, jailbreak)
- Separacao correta entre high-confidence (block) e medium-confidence (warn)
- Logging estruturado com contexto e confidence level
- `sanitizeForPrompt` combina truncamento + deteccao em uma unica funcao

**Lacunas identificadas:**

#### FIND-S16-001: Falta deteccao de injection em outros idiomas (MEDIO)
- **Problema:** Todos os padroes sao em ingles. Usuarios brasileiros podem injetar em portugues.
- **Exemplos nao detectados:** "ignore as instrucoes anteriores", "voce agora e um", "novas instrucoes:"
- **Recomendacao:** Adicionar padroes em portugues para as categorias high-confidence.
- **Impacto:** Medio -- a maioria dos ataques conhecidos sao em ingles, mas nosso publico e brasileiro.

#### FIND-S16-002: Falta deteccao de unicode obfuscation (BAIXO)
- **Problema:** Atacantes podem usar caracteres unicode lookalike (ex: "i]gnore" com bracket, "sуstem" com cirillico)
- **Recomendacao:** Normalizar texto com `normalize('NFKD')` antes de aplicar regex.
- **Impacto:** Baixo -- ataque sofisticado, improvavel no nosso contexto.

#### FIND-S16-003: Regex `\bsystem\s*:\s*/i` pode dar false positive (MEDIO)
- **Problema:** Um usuario pode escrever "The system: of trains in Japan is efficient" em travelNotes.
- **Recomendacao:** Tornar o padrao mais especifico: `/^\s*system\s*:/i` (apenas no inicio) ou `/\bsystem\s*:\s*(?:override|ignore|new|you)/i`.
- **Impacto:** Medio -- false positive pode bloquear usuario legitimo.

### 2.2 Risco de False Positives em Contexto de Viagem

| Padrao | Risco | Exemplo Legitimo | Acao |
|---|---|---|---|
| `/\bsystem\s*:\s*/i` | ALTO | "transit system: Tokyo Metro" | Restringir -- ver FIND-S16-003 |
| `/\byou\s+are\s+now\b/i` | MEDIO | "When you are now in Paris..." | Aceitavel -- frase incomum em notas |
| `/\boverride\b/i` (medium) | BAIXO | "override the default route" | OK -- apenas warning, nao bloqueia |
| `/\bpretend\s+(you\s+are\|to\s+be)\b/i` (medium) | BAIXO | Improvavel em notas de viagem | OK |

### 2.3 Tratamento de Erros

- **Correto:** `AppError` com status 400 e codigo semantico `PROMPT_INJECTION_DETECTED`.
- **Correto:** Logging antes do throw para auditoria.
- **Melhoria sugerida:** Incluir um trecho truncado do input no log (primeiros 50 chars) para facilitar investigacao de false positives, desde que nao contenha PII. Considerar logar apenas se o padrao for high-confidence.

### 2.4 Decisao sobre Medium-Confidence

**Pergunta do prompt-engineer:** Devemos bloquear padroes medium-confidence?

**Decisao: NAO.** Manter como warning por agora. Razoes:
1. Risco de false positive em contexto de viagem
2. travelNotes ja e truncado a 500 chars, limitando superficie de ataque
3. System prompt (OPT-001) vai separar instrucoes de sistema do input do usuario, reduzindo eficacia de injections
4. Podemos promover padroes especificos para high-confidence com base em dados reais dos logs

### 2.5 Avaliacao dos Testes

**24 testes -- cobertura boa.** Pontos:
- Testa inputs seguros comuns (viagem, dieta, acessibilidade) -- bom para regressao de false positives
- Testa todos os padroes high-confidence individualmente
- Testa case insensitivity
- Testa `sanitizeForPrompt` com truncamento e throw

**Lacunas nos testes:**
- Falta teste para input vazio (`""`)
- Falta teste para input com apenas whitespace (`"   "`)
- Falta teste para input com emojis (comum em notas de viagem)
- Falta teste para multiplos padroes no mesmo input (high + medium)
- Falta teste que confirme que o texto sanitizado preserva conteudo apos padroes medium (nao e truncado)

---

## 3. Investigacao do Bug do Modelo -- Destination Guide

### Achado

**Arquivo:** `src/server/services/ai.service.ts`, linha 494
**Codigo:**
```typescript
const response = await provider.generateResponse(prompt, MAX_TOKENS_GUIDE, "checklist");
```

**Arquivo:** `src/server/services/providers/claude.provider.ts`, linhas 9-10 e 35
```typescript
const PLAN_MODEL = "claude-sonnet-4-6";
const CHECKLIST_MODEL = "claude-haiku-4-5-20251001";
// ...
const modelId = model === "plan" ? PLAN_MODEL : CHECKLIST_MODEL;
```

### Analise

O terceiro argumento `"checklist"` faz com que o provider selecione `claude-haiku-4-5-20251001` para gerar o destination guide. O tipo `model: "plan" | "checklist"` na interface `AiProvider` so tem duas opcoes, entao "checklist" e a unica alternativa a "plan".

### E um bug?

**Sim, e um bug de classificacao.** O destination guide foi adicionado no Sprint 11 (expeditions, fase 5). O tipo do modelo na interface so previa dois casos originais (itinerario = plan, checklist = checklist). Quando o guide foi adicionado, reutilizou-se `"checklist"` por conveniencia, mas sem uma decisao consciente sobre qual modelo usar.

### Impacto de Qualidade: Haiku vs Sonnet para Destination Guide

O destination guide gera 6 secoes estruturadas (timezone, currency, language, electricity, connectivity, cultural_tips) com summaries e tips curtos. Este e um caso de **extracao de informacao factual estruturada**, similar em complexidade a uma checklist.

**Avaliacao:**
- O output e JSON com campos curtos (1-2 frases + 1-3 tips por secao)
- Nao requer raciocinio complexo ou criatividade (diferente do itinerario)
- Haiku e capaz de gerar JSON estruturado com qualidade para este caso
- A economia e significativa: Haiku custa ~10x menos que Sonnet

### Decisao: Manter Haiku, mas corrigir a tipagem

**Acao:** Nao mudar o modelo. Haiku e adequado para este caso.
**Mas:** Corrigir a interface para tornar isso explicito:
1. Expandir o tipo de modelo para `"plan" | "checklist" | "guide"` na interface `AiProvider`
2. No `ClaudeProvider`, mapear `"guide"` para `CHECKLIST_MODEL` (Haiku) intencionalmente
3. Documentar no codigo que guide usa Haiku por decisao de otimizacao

Isso elimina a ambiguidade sem mudar o comportamento. Se no futuro quisermos promover guide para Sonnet, basta mudar o mapeamento.

---

## 4. Plano de Tarefas -- Sprint 16

### [SPRINT-16] Prompt Engineering & AI Guardrails
**Specs:** OPTIMIZATION-BACKLOG.md (OPT-001 a OPT-005, OPT-010) | **Status:** Planejado

### Mapa de Dependencias

```
T-S16-001 (interface model type) ← prerequisito para T-S16-002 e T-S16-004
    |
    v
T-S16-002 (system prompts + cache_control) ← maior task, backend
    |
    v
T-S16-003 (token logging) ← depende de T-S16-002 (logar apos cada chamada)

T-S16-004 (injection guard fixes) ← paralelo com T-S16-002
    |
    v
T-S16-005 (PII masking) ← depende de T-S16-004 (mesma infra de sanitizacao)
    |
    v
T-S16-006 (integrar guards nas actions) ← depende de T-S16-004 e T-S16-005

T-S16-007 (min_tokens ajuste) ← independente, trivial
T-S16-008 (testes integracao) ← depende de tudo acima
```

### Tarefas

#### Backend -- Provider Layer

- [ ] `dev-fullstack-1` -- **T-S16-001**: Expandir tipo de modelo na interface AiProvider para `"plan" | "checklist" | "guide"`
  - Spec ref: OPT-004 (OPTIMIZATION-BACKLOG.md)
  - Arquivos: `src/server/services/ai-provider.interface.ts` (interface), `src/server/services/providers/claude.provider.ts` (mapeamento), `src/server/services/ai.service.ts:494` (corrigir `"checklist"` para `"guide"`)
  - Acceptance: `generateDestinationGuide` passa `"guide"` como model type; ClaudeProvider mapeia guide -> Haiku; testes existentes passam; comentario no provider documenta que guide usa Haiku intencionalmente
  - Est: S

- [ ] `dev-fullstack-1` -- **T-S16-002**: Implementar system prompts separados com cache_control em todas as 3 chamadas AI
  - Spec ref: OPT-001 (OPTIMIZATION-BACKLOG.md)
  - Depende de: T-S16-001
  - Arquivos:
    - `src/server/services/ai-provider.interface.ts` -- alterar `generateResponse` para aceitar `systemPrompt?: string`
    - `src/server/services/providers/claude.provider.ts` -- adicionar system message com `cache_control: {"type": "ephemeral"}` quando systemPrompt presente
    - `src/server/services/ai.service.ts` -- separar instrucoes de sistema (role/persona/constraints) do conteudo dinamico (trip details) nos 3 metodos
  - Acceptance:
    - Cada chamada envia system prompt via `role: "system"` com `cache_control`
    - User message contem apenas dados dinamicos da viagem
    - Testes unitarios verificam que systemPrompt e passado ao provider
    - Testes existentes continuam passando
  - Est: L

- [ ] `dev-fullstack-1` -- **T-S16-003**: Adicionar logging estruturado de token usage apos cada chamada AI
  - Spec ref: OPT-003 (OPTIMIZATION-BACKLOG.md)
  - Depende de: T-S16-002
  - Arquivos: `src/server/services/ai.service.ts` (apos cada `provider.generateResponse`)
  - Formato do log:
    ```typescript
    logger.info("ai.tokens.usage", {
      userId,
      feature: "plan" | "checklist" | "guide",
      model: provider.name,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      cached: false, // TODO: detectar cache hit do Anthropic
      estimatedCostUsd: calculateCost(response), // helper
    });
    ```
  - Acceptance: Cada chamada AI loga tokens e custo estimado; finops-engineer pode parsear logs; nenhum PII no log
  - Est: S

#### Backend -- Security Guards

- [ ] `dev-fullstack-2` -- **T-S16-004**: Corrigir e expandir injection guard (FIND-S16-001, FIND-S16-002, FIND-S16-003)
  - Spec ref: OPT-002 + achados da revisao do tech-lead
  - Arquivos: `src/lib/prompts/injection-guard.ts`, `tests/unit/lib/prompts/injection-guard.test.ts`
  - Acoes:
    1. Adicionar padroes high-confidence em portugues (ex: `/\bignore\s+(as\s+)?instrucoes?\s+anteriores?\b/i`, `/\bvoce\s+agora\s+e\b/i`, `/\bnovas?\s+instrucoes?\s*:/i`)
    2. Aplicar `text.normalize('NFKD')` antes de rodar regex
    3. Refinar `/\bsystem\s*:\s*/i` para `/^\s*system\s*:/im` ou `/\bsystem\s*:\s*(?:override|ignore|new|you|reset)/i`
    4. Adicionar testes para: input vazio, whitespace-only, emojis, multiplos padroes, padroes em portugues, false positive "transit system: Tokyo Metro"
  - Acceptance: Zero false positives para frases comuns de viagem (testar com 10+ exemplos); deteccao funciona em pt-BR e en; testes >= 35
  - Est: M

- [ ] `dev-fullstack-2` -- **T-S16-005**: Implementar PII masking pre-API call
  - Spec ref: OPT-010 (OPTIMIZATION-BACKLOG.md)
  - Arquivos: Novo `src/lib/prompts/pii-masker.ts`, testes em `tests/unit/lib/prompts/pii-masker.test.ts`
  - Padroes a mascarar (substituir por `[REDACTED]`):
    - CPF: `/\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}/g`
    - Email: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`
    - Telefone BR: `/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g`
    - Cartao de credito: `/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g`
    - Passaporte BR: `/\b[A-Z]{2}\d{6}\b/g`
  - API: `export function maskPII(text: string): string`
  - Acceptance: Todos os padroes acima mascarados corretamente; texto normal de viagem nao afetado; testes >= 15
  - Est: M

- [ ] `dev-fullstack-2` -- **T-S16-006**: Integrar injection guard + PII masker nas server actions
  - Spec ref: OPT-002 (OPTIMIZATION-BACKLOG.md)
  - Depende de: T-S16-004, T-S16-005
  - Arquivos:
    - `src/server/actions/ai.actions.ts` -- substituir `trim().slice(0, 500)` por `sanitizeForPrompt(travelNotes, "travelNotes", 500)` + `maskPII()`
    - `src/server/actions/expedition.actions.ts` -- aplicar `sanitizeForPrompt` no `destination` em `generateDestinationGuideAction`
  - Acceptance: Todas as 3 actions que chamam AI passam por injection check e PII masking antes da chamada; testes de actions atualizados; fluxo happy path nao quebra
  - Est: M

#### Backend -- Otimizacao

- [ ] `dev-fullstack-1` -- **T-S16-007**: Reduzir MIN_PLAN_TOKENS para 2048 em trips curtas
  - Spec ref: OPT-005 (OPTIMIZATION-BACKLOG.md)
  - Arquivo: `src/server/services/ai.service.ts:26`
  - Acao: Mudar `MIN_PLAN_TOKENS = 4096` para `MIN_PLAN_TOKENS = 2048`
  - Acceptance: `calculatePlanTokenBudget(3)` retorna 2300 (3*600+500); trips longas nao afetadas; teste unitario
  - Est: S

#### Cross-cutting

- [ ] `dev-fullstack-1` ou `dev-fullstack-2` -- **T-S16-008**: Testes de integracao para o fluxo completo de sanitizacao
  - Depende de: T-S16-004, T-S16-005, T-S16-006
  - Testes:
    1. Action com travelNotes contendo injection -> retorna erro 400
    2. Action com travelNotes contendo CPF -> CPF mascarado antes de chegar ao AiService
    3. Action com travelNotes limpo -> fluxo normal
    4. Action com destination contendo injection -> retorna erro 400
    5. Token logging emitido apos chamada bem-sucedida
  - Acceptance: >= 10 testes de integracao; coverage dos guards >= 90%
  - Est: M

### Estimativa Total

| Tamanho | Quantidade | Total |
|---|---|---|
| S (Small, ~2h) | 3 | ~6h |
| M (Medium, ~4h) | 4 | ~16h |
| L (Large, ~8h) | 1 | ~8h |
| **Total** | **8 tasks** | **~30h** |

### Distribuicao por Desenvolvedor

| dev-fullstack-1 | dev-fullstack-2 |
|---|---|
| T-S16-001 (S) -- model type fix | T-S16-004 (M) -- injection guard fixes |
| T-S16-002 (L) -- system prompts + cache | T-S16-005 (M) -- PII masker |
| T-S16-003 (S) -- token logging | T-S16-006 (M) -- integrar nas actions |
| T-S16-007 (S) -- min_tokens | T-S16-008 (M) -- testes integracao |

### Paralelismo

- **Dia 1-2:** T-S16-001 (dev-1) em paralelo com T-S16-004 (dev-2)
- **Dia 2-3:** T-S16-002 (dev-1) em paralelo com T-S16-005 (dev-2)
- **Dia 3-4:** T-S16-003, T-S16-007 (dev-1) em paralelo com T-S16-006 (dev-2)
- **Dia 4-5:** T-S16-008 (qualquer dev disponivel)

### Definition of Done

- [ ] Todas as 8 tarefas marcadas como concluidas
- [ ] Code review aprovado pelo tech-lead
- [ ] Cobertura de testes >= 80% em todos os arquivos novos/modificados
- [ ] Security checklist aprovado:
  - [ ] Nenhum PII enviado para API Anthropic (PII masker integrado)
  - [ ] Injection guard ativo em todas as actions que chamam AI
  - [ ] Nenhum credential hardcoded
  - [ ] Token usage logado para finops
- [ ] Zero false positives confirmados para 20+ frases comuns de viagem (pt-BR e en)
- [ ] Testes existentes nao quebrados (regressao zero)
- [ ] Merged via PR -- nenhum commit direto em main

---

## 5. Notas para Outros Agentes

### Para security-specialist
- Revisar FIND-S16-001 (padroes pt-BR) e FIND-S16-003 (false positive `system:`) no PR
- Validar se PII masker cobre padroes LGPD relevantes

### Para finops-engineer
- OPT-003 (token logging) vai gerar dados para COST-LOG.md a partir do Sprint 16
- Format do log: `ai.tokens.usage` com campos `inputTokens`, `outputTokens`, `estimatedCostUsd`
- Prompt caching (OPT-001) deve reduzir custo de input em 40-60% para chamadas repetidas com mesmo system prompt

### Para qa-engineer
- Plano de teste deve cobrir: injection detection (pt-BR + en), PII masking, false positive regression, token logging
- Target: +40 testes novos (injection guard expansion + PII masker + integracao)

### Para prompt-engineer
- Bom trabalho no audit inicial. Backlog bem estruturado.
- Prioridade do OPT-010 (PII masking) promovida de P3 para P1 -- compliance LGPD
- Prioridade do OPT-009 (Batch API) rebaixada de P2 para P3 -- sem volume para justificar
- OPT-004 decidido: manter Haiku para guide, corrigir tipagem. Documentar como otimizacao intencional.
