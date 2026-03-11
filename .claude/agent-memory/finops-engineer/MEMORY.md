# FinOps Engineer — Memória Persistente

## Última Atualização
Data: 2026-02-26
Sprint: 2 (concluído) → Sprint 3 (planejado)
Atualizado por: finops-engineer (revisão Sprint 2)

---

## Estado Atual dos Custos

### Custos Reais Coletados
> Dados reais de produção ainda não disponíveis. Projeto sem usuários reais em produção.
> Primeira coleta real de dados ocorrerá após deploy em produção (Sprint 3).

### Custos Estimados Sprint 2 (concluído)
| Serviço | Custo Estimado | Status |
|---------|---------------|--------|
| Vercel | $0 (free) | Dentro do limite |
| Railway | $0–5 (trial ou Hobby) | ALERTA — verificar status do trial |
| Upstash | $0 (free) | Dentro do limite — uso estimado <1% do free tier |
| Mapbox | $0 (free) | Dentro do limite |
| Sentry | $0 (free) | Dentro do limite |
| Resend | $0 (free) | Configurado, sem emails enviados ainda |
| Anthropic API (prod) | $0 (sem usuários ainda) | OK |
| Claude Pro/Max (dev) | $20–100 | Variação por plano usado |
| GitHub Actions CI | $0 (free tier) | ~250 min/sprint vs 2.000 min free tier |
| **TOTAL** | **$20–105/mês** | Dominado por custo de desenvolvimento |

---

## Alertas Ativos

### CRÍTICO — Railway Trial Status Desconhecido
- **Descrição:** O trial de 30 dias do Railway pode ter expirado no Sprint 2. Status não confirmado.
- **Risco:** Serviço PostgreSQL pode estar em risco de suspensão ou cobrança inesperada
- **Ação necessária:** Verificar dashboard Railway e confirmar ativação do plano Hobby ($5/mês) IMEDIATAMENTE
- **Responsável:** devops-engineer
- **Sprint:** Sprint 3 — URGENTE

### MÉDIO — Modelo de IA Divergente do Planejado
- **Descrição:** `PLAN_MODEL = "claude-sonnet-4-6"` em vez de `claude-sonnet-4-5` como inicialmente planejado
- **Impacto:** Sem impacto de custo estimado (mesma tier de preço), mas requer confirmação da precificação do Sonnet 4.6 quando em produção
- **Ação necessária:** Confirmar pricing do Sonnet 4.6 via API Anthropic quando houver tráfego real
- **Responsável:** finops-engineer
- **Sprint:** Sprint 3

### MÉDIO — Sem logging de tokens por endpoint
- **Descrição:** Não há instrumentação para medir tokens consumidos por tipo de request (itinerário vs checklist)
- **Impacto:** Impossível calcular custo real por feature sem dados de tokens
- **Ação necessária:** Adicionar logging de `usage.input_tokens` e `usage.output_tokens` da resposta Anthropic
- **Responsável:** dev-fullstack-1 ou dev-fullstack-2
- **Sprint:** Sprint 3

### BAIXO — Checklist sem rate limit dedicado
- **Descrição:** `generateChecklistAction` não tem `checkRateLimit` (apenas BOLA check)
- **Impacto:** Baixo — usa Haiku (mais barato), cache de 24h reduz chamadas
- **Ação necessária:** Avaliar se rate limit adicional é necessário após primeiros dados de produção
- **Responsável:** finops-engineer + dev-fullstack-1
- **Sprint:** Sprint 4

### BAIXO — Sem monitoramento real de custos
- **Descrição:** Dashboard de custos não implementado. Todos os dados são estimativas.
- **Ação necessária:** Implementar cost_snapshots e coleta via Anthropic Usage API
- **Responsável:** finops-engineer + dev-fullstack-1
- **Sprint:** Sprint 4

---

## Achados do Sprint 2

### ACH-001 — Rate limiting gera overhead Redis aceitável
**Análise:** `checkRateLimit` executa 2 ops Redis por request de IA (incr + expire).
Com 100 usuários × 2 itinerários/mês = 800 ops Redis adicionais → irrelevante vs. 300k ops/mês do free tier Upstash.
**Impacto:** Nenhum. Proteção de custo supera overhead.

### ACH-002 — Cache de itinerário com MD5 eficaz
**Análise:** Cache key usa MD5 de `${destination}:${travelStyle}:${budgetRange}:${days}:${language}`.
O budget é arredondado para o múltiplo de 500 mais próximo (`Math.floor(budgetTotal / 500) * 500`) — aumenta taxa de cache hit sem perda de qualidade.
TTL de 24h (`CACHE_TTL.AI_PLAN = 86400`) adequado — planos não mudam em 24h.
**Impacto positivo:** Reduz chamadas à API Anthropic em estimados 30-60% em uso real.

### ACH-003 — Cache de checklist usa mês (não data exata)
**Análise:** `getMonthFromDate(startDate)` extrai apenas `YYYY-MM` — múltiplos usuários viajando ao mesmo destino no mesmo mês compartilham o mesmo cache.
**Impacto positivo:** Taxa de cache hit muito mais alta para checklists vs. itinerários.

### ACH-004 — Health check com custo operacional mínimo
**Análise:** `/api/v1/health` executa `SELECT 1` + `redis.ping()`. Se monitorado a cada 5 min: 17.280 ops Redis/mês = 5,7% do free tier. Aceitável.
**Watchpoint:** Se o health check for chamado por múltiplos monitores em paralelo, o impacto pode multiplicar.

### ACH-005 — Pipeline CI dentro do free tier GitHub Actions
**Análise:** ~25 min por run completo. ~10 runs/sprint = 250 min. Free tier: 2.000 min/mês para repos privados.
**Impacto:** Nenhum no curto prazo. Com crescimento de equipe e frequência de PRs, monitorar.

### ACH-006 — Lazy Anthropic singleton sem impacto de custo
**Análise:** A inicialização lazy (`globalThis._anthropic`) evita acesso a `env` no module-load time.
**Impacto de custo:** Nenhum. Benefício exclusivamente em testabilidade e correção.

### ACH-007 — Transações DB em persistItinerary e persistChecklist
**Análise:** `db.$transaction` garante atomicidade no delete+create de dias/atividades/checklist.
**Impacto de custo:** Sem overhead adicional vs. queries individuais (mesmo connection pool). Transações Railway dentro do plano Hobby.

---

## Otimizações Pendentes

| ID | Otimização | Economia Estimada | Sprint Planejado | Status |
|----|-----------|------------------|-----------------|--------|
| OPT-001 | Prompt caching no system prompt base | 40-60% tokens repetidos | Sprint 3 | Pendente |
| OPT-002 | Batch API para checklists assíncronos | 50% custo de batch ops | Sprint 3 | Pendente |
| OPT-003 | Roteamento Haiku/Sonnet por complexidade | 30-40% custo total IA | Sprint 4 | Pendente |
| OPT-004 | Dashboard de custos in-app (/admin/costs) | Visibilidade total | Sprint 4 | Pendente |
| OPT-005 | Logging de tokens por endpoint | Medição precisa de custo | Sprint 3 | Pendente |
| OPT-006 | Rate limit em generateChecklistAction | Proteção contra abuso | Sprint 4 | Avaliar |

---

## Otimizações Implementadas

| ID | Otimização | Sprint | Economia Real |
|----|-----------|--------|--------------|
| IMP-001 | Rate limiting por usuário — `generateTravelPlanAction` (10 req/hora) | Sprint 1 | Previne abuso — impacto não mensurado ainda |
| IMP-002 | Cache MD5 com budget bucketing para itinerários (TTL 24h) | Sprint 1 | Estimado 30-60% redução de chamadas API |
| IMP-003 | Cache por mês para checklists (maior reuse entre usuários) | Sprint 1 | Maior cache hit rate que cache por data exata |
| IMP-004 | Modelo Haiku para checklists vs Sonnet para itinerários | Sprint 1 | ~87% economia por checklist vs usar Sonnet ($0,007 vs $0,056) |

---

## Tendências Identificadas

> Sem dados reais ainda. A ser preenchido após Sprint 3 (primeiro deploy em produção com usuários reais).
>
> Tendência estrutural observada: a arquitetura de cache (Redis + MD5 bucketing) está bem posicionada para absorver crescimento de usuários sem aumento linear de custo Anthropic.

---

## Decisões de Arquitetura com Impacto de Custo

| Sprint | Decisão | Impacto | Alternativa Considerada |
|--------|---------|---------|------------------------|
| Sprint 1 | Claude Sonnet 4.5 para itinerários | ~$0,056/req médio | Opus (5x mais caro), Haiku (qualidade inferior) |
| Sprint 1 | MAX_TRIPS_PER_USER = 20 | Limita gasto máximo por usuário | Sem limite (risco de abuso) |
| Sprint 1 | Redis para cache de sessões e AI results | Reduz chamadas API | Sem cache (mais lento e mais caro) |
| Sprint 1 | Resend para email | Free tier 3k emails/mês | SendGrid, Nodemailer |
| Sprint 2 | Rate limit apenas em generateTravelPlanAction | Proteção principal — checklist usa Haiku e tem cache alto | Rate limit em todos os endpoints (overhead desnecessário) |
| Sprint 2 | PLAN_MODEL = "claude-sonnet-4-6" | Mesma tier de preço que Sonnet 4.5 — sem impacto | Manter Sonnet 4.5 |
| Sprint 2 | GitHub Actions CI (5 stages, ~25 min) | $0 — dentro do free tier | GitHub Actions pago (desnecessário nesta fase) |

---

## Modelos de Custo por Cenário de Usuários

| Usuários Ativos/Mês | Itinerários/Usuário/Mês | Custo IA Est. | Custo Total Infra Est. |
|--------------------|------------------------|---------------|----------------------|
| 100 | 2 | ~$11 | ~$16 |
| 500 | 2 | ~$56 | ~$61 |
| 1.000 | 2 | ~$112 | ~$122 |
| 5.000 | 2 | ~$560 | ~$590 |
| 10.000 | 2 | ~$1.120 | ~$1.180 |

*Baseado em custo médio de $0,056/itinerário (Sonnet 4.6, 7 dias médios). Com prompt caching (OPT-001), reduzir em ~40%.*

**Impacto do cache na projeção:** Assumindo 30% de cache hit rate nos primeiros meses:
- 100 usuários, 2 itinerários: 60% chamadas reais = ~$6,60 (vs $11 sem cache)
- 1.000 usuários: ~$67 (vs $112 sem cache)

---

## Próximas Ações FinOps por Sprint

### Sprint 3 (próximo)
- [ ] Confirmar status Railway trial — URGENTE — pode ter expirado
- [ ] Implementar logging de tokens consumidos por endpoint na API (OPT-005)
- [ ] Implementar prompt caching (OPT-001) — maior alavanca de redução de custo
- [ ] Implementar Batch API para checklists (OPT-002)
- [ ] Coletar primeiros dados reais de custos em produção
- [ ] Confirmar pricing Sonnet 4.6 na Anthropic API em produção
- [ ] Atualizar projeções com dados reais

### Sprint 4
- [ ] Implementar tabela cost_snapshots no banco
- [ ] Criar cron job de coleta diária de custos (Anthropic Usage API)
- [ ] Desenvolver dashboard /admin/costs
- [ ] Implementar alertas automáticos por email quando threshold for atingido
- [ ] Implementar roteamento de modelos (OPT-003)
- [ ] Avaliar rate limit em generateChecklistAction (OPT-006)
- [ ] Gerar primeiro relatório com dados 100% reais

---

## Estado dos Free Tiers

| Serviço | Limite Free Tier | Uso Estimado | Status | Alerta em |
|---------|-----------------|-------------|--------|-----------|
| Vercel | 100GB banda/mês | <1GB | OK | 80GB |
| Railway | Trial 30d ou $5 crédito | DESCONHECIDO | VERIFICAR | Imediato |
| Upstash | 10k req/dia (ou 300k/mês) | <1% | OK | 8k req/dia |
| Mapbox | 50k loads/mês | 0 (sem usuários) | OK | 40k loads |
| Sentry | 5k erros/mês | 0 (sem usuários) | OK | 4k erros |
| Resend | 3k emails/mês | 0 | OK | 2.400 emails |
| GitHub Actions | 2.000 min/mês (privado) | ~250 min/sprint | OK | 1.600 min |

---

## Spec-Driven Development (SDD) — Sprint 25+

### Process
- SDD is the official development process starting Sprint 25
- FinOps reviews cost impact in every SPEC-ARCH-XXX spec before approval
- Use `docs/specs/templates/CHECKLIST-FINOPS-REVIEW.md` for structured review

### Requirements for Architecture Specs
- Performance budgets MUST include cost considerations (token limits, API call budgets)
- Every spec with AI features MUST include token cost estimates (input + output per request)
- Caching strategy MUST be evaluated for cost reduction potential
- Rate limiting MUST be specified to prevent cost overruns
- Third-party API costs MUST be identified and quantified

### Sprint Cost Reports
- Sprint cost reports (docs/finops/COST-LOG.md) MUST reference spec IDs (SPEC-ARCH-XXX)
- Cost overruns MUST be traced back to specific specs for accountability
- Variance analysis: estimated (from spec) vs actual (from production telemetry)

### FinOps Review Verdict Options
- APPROVED — cost impact acceptable
- APPROVED WITH CONDITIONS — specific cost optimizations required before implementation
- BLOCKED — cost impact too high, alternatives needed; spec returns to architect

### Integration Points
- Architect creates SPEC-ARCH-XXX -> finops-engineer reviews cost section
- finops-engineer verdict is MANDATORY for spec approval (alongside security-specialist)
- Any architectural deviation from approved spec requires finops re-review if cost-impacting

---

## Notas e Observações

- **Sprint 2 — Múltiplos agentes paralelos:** O Sprint 2 utilizou múltiplos subagentes em paralelo (5+ agentes simultâneos). Isso justifica potencialmente Claude Max ($100/mês) em vez de Claude Pro ($20/mês). O custo de desenvolvimento é o item dominante enquanto não há usuários em produção.
- **Sprint 1 — Troca de máquina:** A migração de PC durante o Sprint 1 não gerou custo adicional de infraestrutura.
- **Arquitetura de cache bem dimensionada:** O sistema de cache com Redis (MD5 + TTL 24h + bucketing de budget) está adequadamente dimensionado para absorver crescimento inicial sem custos lineares de IA.
- **Modelo Sonnet 4.6:** Detectado uso de `claude-sonnet-4-6` em vez de `claude-sonnet-4-5`. Sem impacto de custo conhecido, mas requer monitoramento quando em produção real.
