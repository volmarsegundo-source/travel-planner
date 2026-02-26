# FinOps Engineer — Memória Persistente

## Última Atualização
Data: Fevereiro/2026
Sprint: 1 (concluído) → Sprint 2 (em andamento)
Atualizado por: finops-engineer (inicialização)

---

## Estado Atual dos Custos

### Custos Reais Coletados
> ⚠️ Dados reais ainda não coletados. Sprint 1 foi desenvolvido localmente.
> Primeira coleta real de dados ocorrerá após deploy em produção (Sprint 3).

### Custos Estimados Sprint 1
| Serviço | Custo Estimado | Status |
|---------|---------------|--------|
| Vercel | $0 (free) | ✅ No limite |
| Railway | $0 (trial 30d) | ⚠️ Trial expira em ~30 dias do início |
| Upstash | $0 (free) | ✅ No limite |
| Mapbox | $0 (free) | ✅ No limite |
| Sentry | $0 (free) | ✅ No limite |
| Anthropic API (prod) | $0 (sem usuários ainda) | ✅ |
| Claude Pro (dev) | $20/mês | ✅ Fixo |
| **TOTAL** | **~$20/mês** | **🟢 OK** |

---

## Alertas Ativos

### 🟡 ATENÇÃO — Railway Trial
- **Descrição:** O trial de 30 dias do Railway expira automaticamente
- **Ação necessária:** Configurar plano Hobby ($5/mês) antes do vencimento no Sprint 2
- **Responsável:** devops-engineer
- **Sprint:** 2

### 🟡 ATENÇÃO — Sem monitoramento real de custos ainda
- **Descrição:** Dashboard de custos não implementado. Dados são estimativas.
- **Ação necessária:** Implementar cost_snapshots e coleta via Anthropic Usage API
- **Responsável:** finops-engineer + dev-fullstack-1
- **Sprint:** 4

---

## Otimizações Pendentes

| ID | Otimização | Economia Estimada | Sprint Planejado | Status |
|----|-----------|------------------|-----------------|--------|
| OPT-001 | Prompt caching no system prompt base | 40-60% tokens repetidos | Sprint 3 | Pendente |
| OPT-002 | Batch API para checklists assíncronos | 50% custo de batch ops | Sprint 3 | Pendente |
| OPT-003 | Roteamento Haiku/Sonnet por complexidade | 30-40% custo total IA | Sprint 4 | Pendente |
| OPT-004 | Dashboard de custos in-app | Visibilidade total | Sprint 4 | Pendente |

---

## Otimizações Implementadas

| ID | Otimização | Sprint | Economia Real |
|----|-----------|--------|--------------|
| IMP-001 | Rate limiting por usuário (MAX_TRIPS=20, rate-limit.ts) | Sprint 1 | Previne abuso — impacto não mensurado ainda |

---

## Tendências Identificadas

> Sem dados reais ainda. A ser preenchido após Sprint 3 (primeiro deploy em produção).

---

## Decisões de Arquitetura com Impacto de Custo

| Sprint | Decisão | Impacto | Alternativa Considerada |
|--------|---------|---------|------------------------|
| Sprint 1 | Claude Sonnet 4.5 para itinerários | ~$0,056/req médio | Opus (5x mais caro), Haiku (qualidade inferior para itinerários longos) |
| Sprint 1 | MAX_TRIPS_PER_USER = 20 | Limita gasto máximo por usuário | Sem limite (risco de abuso) |
| Sprint 1 | Redis para cache de sessões | Reduz leituras ao PostgreSQL | Sem cache (mais lento e mais caro no DB) |
| Sprint 2 | Resend para email | Free tier 3k emails/mês | SendGrid (free tier menor), Nodemailer (mais complexo) |

---

## Modelos de Custo por Cenário de Usuários

| Usuários Ativos/Mês | Itinerários/Usuário/Mês | Custo IA Est. | Custo Total Infra Est. |
|--------------------|------------------------|---------------|----------------------|
| 100 | 2 | ~$11 | ~$16 |
| 500 | 2 | ~$56 | ~$61 |
| 1.000 | 2 | ~$112 | ~$122 |
| 5.000 | 2 | ~$560 | ~$590 |
| 10.000 | 2 | ~$1.120 | ~$1.180 |

*Baseado em custo médio de $0,056/itinerário (Sonnet 4.5, 7 dias). Com prompt caching (OPT-001), reduzir em ~40%.*

---

## Próximas Ações FinOps por Sprint

### Sprint 2 (atual)
- [ ] Confirmar ativação plano Hobby Railway antes do trial expirar
- [ ] Documentar custo real de setup do Resend (email)
- [ ] Adicionar logging de tokens consumidos por endpoint na API
- [ ] Briefar dev-fullstack sobre custo de novos endpoints de IA

### Sprint 3
- [ ] Implementar prompt caching (OPT-001)
- [ ] Implementar Batch API para checklists (OPT-002)
- [ ] Coletar primeiros dados reais de custos em produção
- [ ] Atualizar projeções com dados reais

### Sprint 4
- [ ] Implementar tabela cost_snapshots no banco
- [ ] Criar cron job de coleta diária de custos
- [ ] Desenvolver dashboard /admin/costs
- [ ] Implementar alertas automáticos por email
- [ ] Implementar roteamento de modelos (OPT-003)
- [ ] Gerar primeiro relatório com dados 100% reais

---

## Notas e Observações

- **Troca de máquina Sprint 1:** A migração de PC durante o Sprint 1 não gerou custo adicional de infraestrutura, apenas retrabalho de desenvolvimento. O release-manager monitorou adequadamente.
- **Node.js não instalado:** O PC novo não tinha Node.js, causando falha silenciosa dos agentes. Custo: ~1h de retrabalho de desenvolvimento. Ação preventiva: documentar pré-requisitos de ambiente no CLAUDE.md.
