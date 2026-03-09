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
| 1 | Itinerario | claude-sonnet-4-6 | 4K-16K | Redis 24h | AUSENTE |
| 2 | Checklist | claude-haiku-4-5 | 2,048 | Redis 24h | AUSENTE |
| 3 | Guia destino | claude-haiku-4-5 * | 2,048 | Redis 24h | AUSENTE |

> \* Guia usa model type "checklist" (Haiku) — confirmar se intencional

### Achados Criticos
1. **Sem system prompts** — tudo em user message, impossibilita prompt caching
2. **Sem prompt injection detection** — apenas truncamento de travelNotes a 500 chars
3. **Sem token usage logging** — inputTokens/outputTokens capturados mas nao expostos
4. **Guia do destino usando Haiku** — `ai.service.ts:494` passa `"checklist"` como model type
5. **min_plan_tokens muito alto** — 4096 para trips de 1-3 dias (poderia ser 2048)

### Guardrails Existentes (OK)
- Auth session + BOLA check
- Age guard 18+
- Rate limiting atomico (Redis + Lua)
- Zod schema validation em todas as respostas
- Input truncation (travelNotes: 500 chars)
- Redis cache 24h com graceful degradation

### Pendencias Sprint 16
- [ ] OPT-001: Separar system prompts + implementar cache_control
- [ ] OPT-002: Integrar injection-guard.ts nas actions (ja criado, falta integrar)
- [ ] OPT-003: Logging de token usage para finops
- [ ] OPT-004: Confirmar modelo do Destination Guide (Haiku vs Sonnet)
- [ ] OPT-006: Extrair prompts para src/lib/prompts/ com versionamento

### Briefing para Outros Agentes
- **tech-lead:** Priorizar OPT-001 e OPT-002 no Sprint 16
- **finops-engineer:** Sem visibilidade de custo real — OPT-003 e essencial
- **security-specialist:** Injection guard criado, precisa revisao e integracao
