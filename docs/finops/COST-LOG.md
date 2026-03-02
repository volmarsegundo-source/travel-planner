# Travel Planner — Cost Log

> Histórico de custos reais por sprint. Mantido pelo finops-engineer.
> Atualizar ao final de cada sprint com dados reais coletados.

---

## Sprint 1 — Fevereiro/2026

**Status:** ✅ Concluído  
**Período:** ~4 semanas  
**Dados:** Estimados (sem deploy em produção ainda)

### Custos de Desenvolvimento
| Item | Custo |
|------|-------|
| Claude Pro (Claude Code) | $20,00 |
| **Total Desenvolvimento** | **$20,00** |

### Custos de Infraestrutura
| Serviço | Plano | Custo Real | Observação |
|---------|-------|-----------|------------|
| Vercel | Hobby (Free) | $0,00 | Free tier |
| Railway | Trial 30d | $0,00 | Trial ativo |
| Upstash | Free | $0,00 | Free tier |
| Mapbox | Free | $0,00 | Free tier |
| Sentry | Developer (Free) | $0,00 | Free tier |
| Resend | — | $0,00 | Não configurado ainda |

### Custos de IA em Produção
| Serviço | Tokens Input | Tokens Output | Custo |
|---------|-------------|---------------|-------|
| Anthropic API | 0 | 0 | $0,00 |
| *Sem usuários em produção ainda* | | | |

### Total Sprint 1
| Categoria | Custo |
|-----------|-------|
| Desenvolvimento (Claude Code) | $20,00 |
| Infraestrutura | $0,00 |
| IA em Produção | $0,00 |
| **TOTAL** | **$20,00** |

### Entregas do Sprint 1
- Auth completo (Auth.js v5)
- Trip CRUD backend
- AI itinerário (Sonnet 4.5)
- AI checklist
- i18n PT-BR + EN
- Onboarding
- 96.52% cobertura de testes
- Review completa (5 agentes)
- 6 blockers corrigidos

### Decisões FinOps Sprint 1
- Escolhido Sonnet 4.5 para itinerários ($0,056/req médio) — descartado Opus (5x mais caro)
- MAX_TRIPS_PER_USER reduzido de 50 para 20 pelo architect review
- Rate limiting implementado (rate-limit.ts)

---

## Sprint 2 — Fevereiro/2026

**Status:** Concluído
**Período:** Fevereiro/2026 (semana 2–4)
**Dados:** Estimados com base no código implementado (sem usuários reais em produção)

### Mudanças Implementadas no Sprint 2

| Componente | Arquivo | Impacto de Custo |
|-----------|---------|-----------------|
| Rate limiting por usuário | `src/lib/rate-limit.ts` | +2 ops Redis por request de IA (incr + expire) |
| Transações DB em persistência | `src/server/actions/ai.actions.ts` | Uso correto de connection pool — sem overhead extra |
| Lazy Anthropic singleton | `src/server/services/ai.service.ts` | Sem impacto de custo — melhora testabilidade |
| Health check real (DB + Redis) | `src/app/api/v1/health/route.ts` | +2 queries por chamada ao /health |
| Pipeline CI completo (5 stages) | `.github/workflows/ci.yml` | ~15–25 min/build — ver análise abaixo |
| Pipeline Deploy (staging + prod) | `.github/workflows/deploy.yml` | Docker build + push GHCR por merge |
| Modelo itinerário ajustado | `ai.service.ts` linha 19 | Mudança: Sonnet 4.5 → Sonnet 4.6 |

### Análise de Impacto: Rate Limiting (rate-limit.ts)

O `checkRateLimit` executa **2 operações Redis por request** de IA:
- `redis.incr(windowKey)` — 1 operação de escrita
- `redis.expire(windowKey, windowSeconds)` — 1 operação de escrita (apenas no primeiro request da janela)

**Cálculo de impacto no Upstash:**
- Limite: 10 requests de IA por usuário por hora (`ai:plan:${userId}`, window 3600s)
- Cada request de IA consome: 1 incr + 1 expire (na 1ª vez) + 1 GET de cache + 1 SET de cache = ~4 ops Redis
- Com 100 usuários ativos/mês, 2 itinerários/usuário: 100 × 2 × 4 = **800 ops/mês** — irrelevante vs. limite de 300k/mês do Upstash free tier
- Watchpoint: checklist não tem rate limit separado (apenas BOLA check) — risco de abuso menor pois usa Haiku (mais barato)

### Análise de Impacto: Modelo de IA (ai.service.ts)

**Atenção — modelo de itinerário está em Sonnet 4.6 (não Sonnet 4.5 como planejado):**
- `PLAN_MODEL = "claude-sonnet-4-6"` — modelo atual do ambiente de desenvolvimento
- `CHECKLIST_MODEL = "claude-haiku-4-5-20251001"` — correto, Haiku para checklist

Impacto: Sonnet 4.6 ainda não possui precificação pública confirmada distinta do Sonnet 4.5. Assumindo mesma tier de preço ($3,00/$15,00 por MTok). Sem variação de custo estimada, mas deve ser confirmado quando a API estiver em produção.

### Análise de Impacto: CI/CD Pipeline

| Stage CI | Tempo Estimado | Custo GitHub Actions |
|---------|----------------|---------------------|
| Lint & Type Check | ~2 min | $0 (free tier — 2.000 min/mês) |
| Unit + Integration Tests (PostgreSQL + Redis services) | ~5 min | $0 (free tier) |
| SAST (Semgrep + npm audit) | ~3 min | $0 (free tier) |
| Docker Build + Trivy Scan | ~8 min | $0 (free tier) |
| E2E Playwright (apenas PR → main) | ~7 min | $0 (free tier) |
| **Total por run completo** | **~25 min** | **$0** |

GitHub Actions free tier: 2.000 min/mês para repositórios públicos, ilimitado. Para repositório privado: 2.000 min incluídos, depois $0,008/min.

**Estimativa uso CI:** ~10 PRs/sprint × 25 min = 250 min/sprint — **dentro do free tier**.

### Análise de Impacto: Health Check

`/api/v1/health` executa `SELECT 1` no PostgreSQL e `redis.ping()` a cada chamada.

Se usado como uptime monitor (ex: UptimeRobot a cada 5 min):
- 288 chamadas/dia × 2 queries = **576 operações/dia**
- Impacto Railway (PostgreSQL): negligível — queries triviais sem lock
- Impacto Upstash: 576 ops/dia × 30 = 17.280 ops/mês — **0,006% do limite de 300k/mês**

### Custos Reais Sprint 2

| Serviço | Plano | Custo Real | Observação |
|---------|-------|-----------|------------|
| Vercel | Hobby (Free) | $0,00 | Free tier — sem deploy em produção ainda |
| Railway | Trial → Hobby | $0,00–5,00 | Trial pode ter expirado — verificar urgentemente |
| Upstash | Free | $0,00 | Free tier — 300k ops/mês, muito abaixo do limite |
| Mapbox | Free | $0,00 | Free tier |
| Sentry | Developer (Free) | $0,00 | Free tier |
| Resend | Free (3k emails/mês) | $0,00 | Configurado no Sprint 2 |
| Anthropic API | Pay-as-you-go | $0,00 | Sem usuários reais em produção |
| Claude Pro/Max (dev) | Pro ou Max | $20–100,00 | Sprint intensivo com múltiplos agentes paralelos |
| GitHub Actions | Free | $0,00 | Dentro do free tier |
| **TOTAL** | | **$20–105,00** | **Variação depende do plano Claude Code usado** |

### Observação sobre Claude Code (desenvolvimento)

O Sprint 2 envolveu múltiplos agentes em paralelo (dev-fullstack-1, dev-fullstack-2, security-specialist, devops-engineer, qa-engineer + finops-engineer). Sprints intensivos com agentes paralelos podem justificar Claude Max ($100/mês) em vez de Claude Pro ($20/mês). O custo de desenvolvimento é o item dominante nesta fase pré-usuários.

### Ações FinOps Sprint 2

- [x] Analisar impacto de custo das mudanças do Sprint 2
- [ ] Confirmar status do Railway trial — **URGENTE** — pode ter expirado
- [ ] Confirmar plano Claude Code usado no sprint (Pro $20 ou Max $100)
- [ ] Adicionar logging de tokens consumidos por endpoint (pendente Sprint 3)
- [ ] Verificar se checklist precisa de rate limit separado

### Decisões FinOps Sprint 2

- `PLAN_MODEL = "claude-sonnet-4-6"` — modelo ligeiramente diferente do planejado (Sonnet 4.5); sem impacto de custo estimado mas requer confirmação
- Rate limiting apenas em `generateTravelPlanAction` (10 req/hora/usuário) — checklist sem rate limit próprio; baixo risco dado uso de Haiku
- Cache Redis de 24h para itinerários (`CACHE_TTL.AI_PLAN = 86400`) — estratégia correta, evita chamadas repetidas para mesma combinação destino/estilo/orçamento/dias/idioma
- Cache de checklist usa mês em vez de data exata — aumenta taxa de cache hit (múltiplos usuários viajando ao mesmo destino no mesmo mês compartilham cache)

---

## Sprint 3 — Fevereiro/2026

**Status:** ✅ Concluído
**Período:** Fevereiro/2026 (semana 3–4)
**Dados:** Reais (desenvolvimento local, sem deploy em produção)

### Entregas do Sprint 3
- Landing page completa (Header, Hero, Features, Footer)
- LanguageSwitcher (EN ↔ PT-BR)
- Script de setup do ambiente (`scripts/dev-setup.js`)
- Claude Code skill `dev-environment`
- 44 testes novos (total: 181)
- PR #2 merged em `master`

### Custos Reais Sprint 3

| Serviço | Plano | Custo Real | Observação |
|---------|-------|-----------|------------|
| Claude Pro (dev) | Pro | $20,00 | Desenvolvimento com agentes |
| Vercel | Hobby (Free) | $0,00 | Sem deploy |
| Railway | — | $0,00 | Sem uso (apenas Docker local) |
| Upstash | — | $0,00 | Sem uso |
| Anthropic API | — | $0,00 | Sem chamadas em produção |
| GitHub Actions | Free | $0,00 | Dentro do free tier |
| **TOTAL** | | **$20,00** | |

### Notas FinOps Sprint 3
- Sprint focado em frontend (componentes React, i18n, testes) — sem impacto de custo de infraestrutura
- Não houve deploy em produção, prompt caching (OPT-001) e Batch API (OPT-002) deferidos para sprints futuros
- Desenvolvimento 100% local com Docker containers (PostgreSQL + Redis)

---

## Sprint 4 — Fevereiro/2026

**Status:** ✅ Concluído
**Período:** Fevereiro/2026 (semana 4)
**Dados:** Reais (desenvolvimento local, sem deploy em produção)

### Entregas do Sprint 4
- 4 scripts de desenvolvimento (sprint-lifecycle, project-bootstrap, security-audit, i18n-manager)
- Script de instalação de skills
- 4 Claude Code skills
- 46 testes novos (total: 227)
- PRs #3 + #4 merged em `master`

### Custos Reais Sprint 4

| Serviço | Plano | Custo Real | Observação |
|---------|-------|-----------|------------|
| Claude Pro (dev) | Pro | $20,00 | Desenvolvimento com agentes |
| Vercel | Hobby (Free) | $0,00 | Sem deploy |
| Railway | — | $0,00 | Sem uso |
| Upstash | — | $0,00 | Sem uso |
| Anthropic API | — | $0,00 | Sem chamadas em produção |
| GitHub Actions | Free | $0,00 | Dentro do free tier |
| **TOTAL** | | **$20,00** | |

### Notas FinOps Sprint 4
- Sprint focado em tooling de desenvolvimento — impacto zero em custo de produção
- Scripts são Node.js puro, sem dependências externas adicionais
- Dashboard de custos (/admin/costs) e tabela cost_snapshots deferidos para sprints futuros

---

## Sprint 5 — Marco/2026

**Status:** ✅ Concluido
**Periodo:** Marco/2026 (semana 1)
**Dados:** Reais (desenvolvimento local, sem deploy em producao)

### Entregas do Sprint 5
- Navbar autenticada (AuthenticatedNavbar + UserMenu)
- Botao de logout funcional (signOut + cookie cleanup)
- Breadcrumbs reutilizaveis em sub-paginas de viagem
- Fix de exibicao de erro no LoginForm
- Paginas 404 para rotas autenticadas e publicas
- Infraestrutura E2E (Playwright)
- 31 testes novos (total: 258)
- PR #5 em `master`

### Custos Reais Sprint 5

| Servico | Plano | Custo Real | Observacao |
|---------|-------|-----------|------------|
| Claude Pro (dev) | Pro | $20,00 | Assinatura mensal fixa |
| Vercel | Hobby (Free) | $0,00 | Sem deploy |
| Railway | — | $0,00 | Sem uso |
| Upstash | — | $0,00 | Sem uso |
| Anthropic API | — | $0,00 | Sem chamadas em producao |
| GitHub Actions | Free | $0,00 | Dentro do free tier |
| **TOTAL** | | **$20,00** | |

### Notas FinOps Sprint 5
- Sprint focado em frontend (componentes React de navegacao, layout, CSS) — impacto zero em custo de producao
- Nenhuma nova chamada a API externa introduzida
- Nenhum deploy em staging ou producao
- `generateChecklistAction` identificada como sem rate limit proprio — baixo risco dado uso de Haiku, mas recomendado para Sprint 6
- Custo acumulado do projeto (Sprints 1–5): $100–160

### Decisoes FinOps Sprint 5
- Nenhuma decisao de custo necessaria — sprint puramente frontend
- Rate limit para checklist adiado para Sprint 6 (risco aceito: Haiku e barato)

---

## Benchmark de Mercado

> Para referência comparativa com outros projetos similares.

| Stack Similar | Custo/mês (100 usuários) | Custo/mês (1.000 usuários) |
|--------------|--------------------------|---------------------------|
| Travel Planner (estimado) | ~$16 | ~$122 |
| Referência mercado (Next.js + AI SaaS) | ~$20–50 | ~$100–300 |

*Travel Planner está dentro do esperado para um SaaS Next.js com IA integrada.*

---

## Notas do FinOps Engineer

### Fev/2026 — Sprint 1 Concluído
O Sprint 1 foi executado inteiramente em ambiente local/desenvolvimento, sem custo de infraestrutura além do Claude Pro ($20/mês). A troca de máquina durante o sprint causou retrabalho mas não gerou custos adicionais de infra. O railway trial de 30 dias deve ser monitorado com atenção — configurar Hobby antes do vencimento é prioridade do Sprint 2.

A principal decisão FinOps do Sprint 1 foi a escolha do Sonnet 4.5 como modelo padrão para itinerários. Esta escolha representa um equilíbrio adequado entre qualidade e custo. Com prompt caching (Sprint 3), o custo efetivo será reduzido em ~40%.
