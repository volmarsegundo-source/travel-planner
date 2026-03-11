# Prompt Engineer Memory

## Sprint 15 — Audit Inicial (2026-03-09)

### Status
- Agent criado e registrado como agente #13
- Audit inicial completo — 3 chamadas Anthropic identificadas
- Backlog de otimizacao criado: `docs/prompts/OPTIMIZATION-BACKLOG.md`
- Middleware de injection guard criado: `src/lib/prompts/injection-guard.ts`
- Diretorio `src/lib/prompts/` criado para templates versionados

### Inventario de Chamadas API

| # | Funcionalidade | Modelo | max_tokens | Cache | Prompt Caching |
|---|---|---|---|---|---|
| 1 | Itinerario | claude-sonnet-4-6 | 2K-16K (dinamico) | Redis 24h | cache_control via system prompt |
| 2 | Checklist | claude-haiku-4-5 | 2,048 | Redis 24h | cache_control via system prompt |
| 3 | Guia destino | claude-haiku-4-5 | 2,048 | Redis 24h | cache_control via system prompt |

### Achados Criticos (Sprint 15)
1. ~~**Sem system prompts**~~ — RESOLVIDO Sprint 16 (OPT-001)
2. **Sem prompt injection detection** — apenas truncamento de travelNotes a 500 chars
3. ~~**Sem token usage logging**~~ — RESOLVIDO Sprint 16 (OPT-003)
4. ~~**Guia do destino usando Haiku**~~ — RESOLVIDO Sprint 16 (model type "guide" adicionado)
5. ~~**min_plan_tokens muito alto**~~ — RESOLVIDO Sprint 16 (OPT-005, reduzido para 2048)

### Guardrails Existentes (OK)
- Auth session + BOLA check
- Age guard 18+
- Rate limiting atomico (Redis + Lua)
- Zod schema validation em todas as respostas
- Input truncation (travelNotes: 500 chars)
- Redis cache 24h com graceful degradation

## Sprint 16 — Prompt Templates Versionados (2026-03-09)

### Template Inventory

| Arquivo | Versao | Modelo | maxTokens | cacheControl | System Prompt |
|---|---|---|---|---|---|
| `src/lib/prompts/travel-plan.prompt.ts` | 1.0.0 | plan | 2048 (dinamico) | true | PLAN_SYSTEM_PROMPT |
| `src/lib/prompts/checklist.prompt.ts` | 1.0.0 | checklist | 2048 | true | CHECKLIST_SYSTEM_PROMPT |
| `src/lib/prompts/destination-guide.prompt.ts` | 1.0.0 | guide | 2048 | true | GUIDE_SYSTEM_PROMPT |

### Arquitetura de Prompts
- `src/lib/prompts/types.ts` — PromptTemplate<TParams>, TravelPlanParams, ChecklistParams, GuideParams
- `src/lib/prompts/system-prompts.ts` — constantes de system prompt (fonte unica)
- `src/lib/prompts/index.ts` — barrel export
- Templates importam system prompts de system-prompts.ts (sem duplicacao)
- ai.service.ts importa templates de @/lib/prompts e usa buildUserPrompt()

### Token Budget Estimates
- Plan: dinamico = days * 600 + 500, clamped [2048, 16000]
- Checklist: fixo 2048
- Guide: fixo 2048

### Pendencias
- [x] OPT-001: System prompts separados + cache_control
- [ ] OPT-002: Integrar injection-guard.ts nas actions
- [x] OPT-003: Logging de token usage para finops
- [x] OPT-005: MIN_PLAN_TOKENS reduzido para 2048
- [x] OPT-006: Prompts extraidos para src/lib/prompts/ com versionamento
- [x] OPT-007: XML tags no template de travel plan (expedition-context)
- [ ] OPT-008: Output guardrails (hallucination bounds)

### Testes
- `tests/unit/lib/prompts/templates.test.ts` — 19 testes para templates versionados
- `tests/unit/lib/prompts/system-prompts.test.ts` — 13 testes (pre-existente)
- `tests/unit/server/ai.service.test.ts` — 36 testes (sem regressao)

### Briefing para Outros Agentes
- **tech-lead:** OPT-006/OPT-007 completos, proxima prioridade e OPT-002 (injection guard)
- **finops-engineer:** Token usage logging ativo (OPT-003), templates permitem A/B testing futuro
- **security-specialist:** Injection guard criado, precisa revisao e integracao (OPT-002)

## Spec-Driven Development (SDD) — Starting Sprint 25

### Role in SDD Process
- SDD is the official development process starting Sprint 25
- Prompt engineer reviews every AI-related spec for token optimization before approval
- Prompt engineer authors SPEC-AI-XXX addendum specs for any feature involving AI calls
- SPEC-AI-XXX addendum is created AFTER the architecture spec (SPEC-ARCH-XXX) and BEFORE implementation

### Mandatory AI Feature Spec Requirements
Every AI feature spec MUST include:
1. **Model selection rationale** — why this model, cost vs quality trade-off, fallback model
2. **Token budget** — estimated tokens per component (system/input/output), cost per request
3. **Prompt template reference** — link to versioned template in src/lib/prompts/
4. **Guardrail requirements** — input (injection, PII, length), output (schema, safety, hallucination), systemic (rate limit, cost cap, fallback)

### Guardrail Co-Ownership
- Prompt engineer and security-specialist co-own guardrail definitions
- Any change to guardrails requires approval from BOTH agents
- Guardrail checklist is part of every SPEC-AI-XXX addendum (Section 4)

### Prompt Template Governance
- All prompt templates versioned in src/lib/prompts/ with semantic versioning
- Templates referenced by spec ID in the SPEC-AI-XXX addendum
- Template changes require a version bump and updated addendum
- Templates must be vendor-independent (system/user message format, no vendor-specific features)

### Cost Collaboration with FinOps
- Token costs estimated per spec in collaboration with finops-engineer
- finops-engineer validates budget estimates against actual usage data from COST-LOG.md
- Cost anomalies flagged jointly during mid-sprint checks

### Template Location
- AI Spec Addendum Template: docs/specs/templates/TEMPLATE-AI-SPEC-ADDENDUM.md
- Architecture Spec Template: docs/specs/templates/TEMPLATE-ARCH-SPEC.md
