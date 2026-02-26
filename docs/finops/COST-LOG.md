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

## Sprint 2 — [A preencher]

**Status:** 🔄 Em andamento  
**Período:** —  
**Dados:** A coletar

### Custos Estimados (pré-sprint)
| Serviço | Plano Planejado | Custo Estimado |
|---------|----------------|----------------|
| Vercel | Hobby (Free) | $0,00 |
| Railway | Hobby ($5/mês) | $5,00 |
| Upstash | Free | $0,00 |
| Mapbox | Free | $0,00 |
| Sentry | Developer (Free) | $0,00 |
| Resend | Free (3k emails/mês) | $0,00 |
| Anthropic API | Pay-as-you-go | $0–2,00 |
| Claude Pro (dev) | Pro | $20,00 |
| **TOTAL ESTIMADO** | | **$25–27/mês** |

### Ações FinOps Sprint 2
- [ ] Ativar Railway Hobby antes do trial expirar
- [ ] Configurar Resend free tier
- [ ] Adicionar logging de tokens por endpoint
- [ ] Documentar custos reais ao final do sprint

---

## Sprint 3 — [A preencher]

**Status:** 📋 Planejado  
**Período:** —

### Foco FinOps Sprint 3
- Primeiro deploy em produção — dados reais começam aqui
- Implementar prompt caching (OPT-001) → economia estimada 40-60% em tokens
- Implementar Batch API (OPT-002) → 50% desconto em operações assíncronas
- Configurar domínio customizado → Vercel Pro $20/mês

### Custo Estimado Sprint 3
| Serviço | Custo Estimado |
|---------|----------------|
| Infraestrutura total | ~$25–30/mês |
| IA em Produção (primeiros usuários) | ~$5–15/mês |
| Claude Pro (dev) | $20/mês |
| **TOTAL ESTIMADO** | **$50–65/mês** |

---

## Sprint 4 — [A preencher]

**Status:** 📋 Planejado  
**Período:** —

### Foco FinOps Sprint 4
- Dashboard de custos /admin/costs
- Tabela cost_snapshots + cron job diário
- Roteamento inteligente de modelos Haiku/Sonnet (OPT-003)
- Alertas automáticos por email
- Primeiro relatório 100% baseado em dados reais

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
