# Prompt Engineering Optimization Backlog

> **Sprint:** 15
> **Auditor:** prompt-engineer (agent #13)
> **Data:** 2026-03-09
> **Status:** Audit inicial completo

---

## Inventario de Chamadas Anthropic API

| # | Funcionalidade | Arquivo | Modelo Atual | max_tokens | Cache | Rate Limit |
|---|---|---|---|---|---|---|
| 1 | Itinerario de viagem | `ai.service.ts:261-302` | claude-sonnet-4-6 | 4K-16K (dinamico) | Redis 24h | 10/hr |
| 2 | Checklist pre-viagem | `ai.service.ts:400-415` | claude-haiku-4-5 | 2,048 | Redis 24h | 5/hr |
| 3 | Guia do destino (Fase 5) | `ai.service.ts:476-491` | claude-haiku-4-5 * | 2,048 | Redis 24h | 3/trip |

> \* **Achado:** A geracao do guia usa `model: "checklist"` (linha 494), que mapeia para **Haiku** em `claude.provider.ts:10`. Provavelmente nao intencional (deveria ser Sonnet?), mas e uma economia de custo. Manter Haiku se a qualidade for aceitavel.

---

## Backlog de Otimizacao (Priorizado)

### P0 — Criticos (Sprint 16)

#### OPT-001: Adicionar system prompt separado (todas as chamadas)
- **Impacto:** Permite prompt caching com `cache_control`, reduz custo de input em ~80% em chamadas repetidas
- **Estado atual:** Todas as 3 chamadas usam apenas `role: "user"`. Nenhum system prompt explícito.
- **Acao:** Mover instrucoes de sistema para `role: "system"` com `cache_control: {"type": "ephemeral"}`
- **Economia estimada:** ~40-60% em tokens de input para chamadas repetidas
- **Arquivos:** `claude.provider.ts` (suportar system message), `ai.service.ts` (separar prompts)

#### OPT-002: Implementar prompt injection detection middleware
- **Impacto:** Seguranca — prevenir manipulacao de prompts via input do usuario
- **Estado atual:** Apenas truncamento de `travelNotes` a 500 chars. Sem deteccao de padroes.
- **Acao:** Criar `src/lib/prompts/injection-guard.ts` com regex + heuristicas
- **Arquivos:** Novo arquivo + integrar em `ai.actions.ts` e `expedition.actions.ts`

#### OPT-003: Logging de token usage para finops
- **Impacto:** Visibilidade de custos — essencial para monitoramento
- **Estado atual:** `inputTokens` e `outputTokens` retornados pelo provider mas nao logados
- **Acao:** Adicionar log estruturado com tokens e custo estimado por chamada
- **Arquivos:** `ai.service.ts` (apos cada chamada)

### P1 — Altos (Sprint 16-17)

#### OPT-004: Confirmar modelo do Destination Guide
- **Impacto:** Qualidade vs custo — decisao consciente
- **Estado atual:** Usa Haiku (via `"checklist"` model type) em vez de Sonnet
- **Acao:** Testar qualidade com Haiku. Se aceitavel, documentar como otimizacao intencional. Se nao, corrigir para Sonnet.
- **Arquivo:** `ai.service.ts:494`

#### OPT-005: Reduzir max_tokens do itinerario para trips curtas
- **Impacto:** Economia de tokens — trips de 3 dias nao precisam de 4096 tokens
- **Estado atual:** MIN_PLAN_TOKENS = 4096 (muito alto para trips curtas)
- **Acao:** Reduzir minimo para 2048 para trips de 1-3 dias
- **Arquivo:** `ai.service.ts:26`

#### OPT-006: Adicionar prompt versioning
- **Impacto:** Rastreabilidade — saber qual versao do prompt gerou cada resultado
- **Estado atual:** Prompts sao strings inline em `ai.service.ts`
- **Acao:** Extrair para `src/lib/prompts/` como constantes versionadas
- **Arquivos:** Novos arquivos em `src/lib/prompts/`

### P2 — Medios (Sprint 17-18)

#### OPT-007: Converter prompts para formato XML-tagged
- **Impacto:** Melhor aderencia do Claude a instrucoes estruturadas
- **Estado atual:** Prompts em texto natural com JSON inline
- **Acao:** Usar tags XML (`<system>`, `<task>`, `<constraints>`, `<output_schema>`)
- **Economia estimada:** ~10-15% menos tokens por instrucao mais precisa

#### OPT-008: Implementar output guardrails (hallucination bounds)
- **Impacto:** Qualidade — validar estimativas de custo contra dados de mercado
- **Estado atual:** Apenas validacao de schema Zod. Sem bounds check em valores.
- **Acao:** Adicionar validacao de ranges (custo estimado vs budget informado)

#### OPT-009: Batch API para geracoes nao-urgentes
- **Impacto:** 50% reducao de custo para operacoes em batch
- **Estado atual:** Todas as chamadas sao sincronas
- **Acao:** Avaliar quais chamadas podem ser batched (ex: relatorios, re-geracoes)

### P3 — Baixos (Backlog)

#### OPT-010: PII masking pre-API call
- **Impacto:** Compliance LGPD — nao enviar dados pessoais para LLM
- **Estado atual:** Sem filtragem de PII no conteudo dos prompts (travelNotes pode conter PII)
- **Acao:** Implementar regex para CPF, email, telefone, cartao de credito antes da chamada

#### OPT-011: Circuit breaker para chamadas AI
- **Impacto:** Resiliencia — fallback automatico se API estiver instavel
- **Estado atual:** Retry apenas para truncamento. Sem circuit breaker.
- **Acao:** Implementar circuit breaker com threshold de erro >10% em 5min

#### OPT-012: Fallback chain (Sonnet -> Haiku -> cached -> static)
- **Impacto:** Disponibilidade — garantir resposta mesmo com falha de API
- **Estado atual:** Sem fallback — erro retornado ao usuario
- **Acao:** Implementar cadeia de fallback progressiva

---

## Guardrails Existentes (Auditoria)

| Guardrail | Status | Implementacao |
|---|---|---|
| Autenticacao (session) | OK | `auth()` em todas as actions |
| Autorizacao (BOLA) | OK | `trip.userId === session.user.id` |
| Age guard (18+) | OK | `canUseAI(birthDate)` |
| Rate limiting | OK | Redis atomico com Lua script |
| Input truncation | PARCIAL | Apenas `travelNotes` (500 chars). Outros inputs nao limitados. |
| Prompt injection | AUSENTE | Nenhuma deteccao de padroes maliciosos |
| Output schema validation | OK | Zod schemas para todas as respostas |
| PII masking | AUSENTE | Nenhuma filtragem pre-API |
| Token budget logging | AUSENTE | Tokens capturados mas nao logados |
| Prompt caching | AUSENTE | Sem `cache_control` nas chamadas |

---

## Recomendacao de Modelo por Funcionalidade

| Funcionalidade | Modelo Atual | Modelo Recomendado | Justificativa |
|---|---|---|---|
| Itinerario (plano de viagem) | Sonnet | **Sonnet** (manter) | Geracao complexa com JSON estruturado |
| Checklist pre-viagem | Haiku | **Haiku** (manter) | Extracao simples, custo baixo |
| Guia do destino | Haiku * | **Haiku** (confirmar) | Se qualidade OK, manter. Testar antes. |
| Futuro: chat conversacional | N/A | **Sonnet** | Interacao natural requer modelo maior |
| Futuro: classificacao/routing | N/A | **Haiku** | Classificacao simples, custo minimo |

---

## Proximo Sprint (Sprint 16)

Recomendacao: implementar OPT-001, OPT-002 e OPT-003 como prioridade.
Economia projetada: 40-60% em tokens de input (prompt caching).
