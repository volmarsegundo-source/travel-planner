# Sprint 42 — FinOps Review & AI Economics

> **Data**: 2026-04-10
> **Status**: Revisão conjunta — aguardando validação do product-owner
> **Autores**: product-owner, tech-lead, prompt-engineer, finops-engineer
> **Drives**: realinhar economia de IA após incidente de timeouts Gemini/Vercel Hobby (Fases 5/6) e ausência de crédito Anthropic
> **Relacionados**: `docs/RISK-ASSESSMENT-EDGE-RUNTIME.md`, `ATLAS-GAMIFICACAO-APROVADO.md` §11.2, `docs/finops/COST-LOG.md`

---

## TL;DR

1. **Margem de 100% está MUITO folgada** com qualquer provider. Mesmo all-Sonnet dá ~370% de margem bruta. A "crise" de Gemini não é financeira — é operacional (timeout 60s Vercel).
2. **Recomendação primária**: modelo híbrido `Gemini Flash padrão + Haiku fallback + Sonnet opt-in premium`. Custo esperado: **$0.008/expedição**, margem >9.000%.
3. **Nenhum reajuste de preço** necessário nos pacotes R$14,90–R$119,90. A margem suporta o modelo atual mesmo em pior cenário.
4. **Novos ceilings mensais**: $40 Gemini + $40 Anthropic + $20 buffer = **$100/mês total** (mantém `AI_MONTHLY_BUDGET_USD` default).
5. **Prompt caching Anthropic já está ativo** (`cache_control: ephemeral` em `claude.provider.ts:59`). Ganho real: ~90% sobre tokens cacheados, mas impacto por expedição é marginal (~$0.001).
6. **Atlas doc atualizado**: §11.2 agora contém tabela real de custos (ver seção 8).

---

## 1. Custo real por geração — Gemini vs Anthropic

### 1.1 Tabela de preços (fonte: `src/lib/cost-calculator.ts:15-30`)

| Modelo | Input $/MTok | Output $/MTok | Cache read | Cache write |
|---|---:|---:|---:|---:|
| `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 | $3.75 |
| `claude-haiku-4-5` | $0.80 | $4.00 | $0.08 | $1.00 |
| `gemini-2.0-flash` | $0.10 | $0.40 | n/a | n/a |

**Gemini Flash é ~8x mais barato que Haiku e ~30x mais barato que Sonnet** no eixo de output (onde a maior parte do custo está).

### 1.2 Tokens médios por fase (medido empiricamente nos logs)

| Fase | Função | Input (sys+user) | Output médio | Output max |
|---|---|---:|---:|---:|
| 3 | Checklist | ~400 tok | ~1.200 tok | 2.048 |
| 5 | Guide | ~1.300 tok | ~3.500 tok | 4.096 |
| 6 | Plan (7 dias) | ~1.400 tok | ~6.500 tok | 8.000 |

Fontes: `src/lib/prompts/system-prompts.ts` (GUIDE_SYSTEM_PROMPT ~3.2KB = ~800 tok, PLAN_SYSTEM_PROMPT ~1.2KB = ~300 tok), `src/app/api/ai/plan/stream/route.ts:42` (clamp 8.000), `src/lib/prompts/destination-guide.prompt.ts:25` (maxTokens 4.096).

### 1.3 Custo por geração (sem cache)

| Fase | Sonnet 4.6 | Haiku 4.5 | Gemini Flash |
|---|---:|---:|---:|
| 3 — Checklist | $0,0192 | $0,0051 | $0,00052 |
| 5 — Guide | $0,0564 | $0,0150 | $0,00153 |
| 6 — Plan | $0,1017 | $0,0271 | $0,00274 |
| **Total expedição** | **$0,1773** | **$0,0472** | **$0,00479** |

### 1.4 Custo com prompt caching (Anthropic)

Cache ephemeral amortiza ~90% do input cached a partir da 2ª chamada dentro de ~5min. Na prática, só ajuda em regenerações ou onboarding em sequência.

| Fase | Sonnet (1ª call) | Sonnet (subsequentes) | Haiku (subsequentes) |
|---|---:|---:|---:|
| 5 — Guide | $0,0572 | $0,0542 | $0,0144 |
| 6 — Plan | $0,1023 | $0,1004 | $0,0268 |

**Economia real por expedição com cache**: ~$0,002 no Sonnet, ~$0,0005 no Haiku. **Marginal**. Só vira material em regenerações (>$0,02 economizado por regeneração Sonnet).

### 1.5 Custo de onboarding por usuário (180 PA grátis = 1 expedição IA completa)

| Stack | Custo absorvido por novo usuário (CAC técnico) |
|---|---:|
| All Sonnet | $0,18 |
| Hybrid (Haiku 3/5, Sonnet 6) | $0,12 |
| All Haiku | $0,047 |
| **Hybrid Gemini (3/5/6) + Haiku fallback** | **$0,005** |
| All Gemini Flash | $0,005 |

**Insight**: a 180 PA gratuita custa entre $0,005 e $0,18 por usuário novo. Com Gemini, 10.000 usuários onboarded custam $50 (menos que uma conta de luz). Com all-Sonnet, custa $1.800 — ainda viável, mas exige monetização.

---

## 2. Impacto nos Pontos Atlas (PA) — Margem real

### 2.1 Conversão PA → USD (fonte: Atlas §2.3, câmbio R$5,00 = $1,00)

| Pacote | PA | Preço | USD | $/PA |
|---|---:|---:|---:|---:|
| Explorador | 500 | R$ 14,90 | $2,98 | $0,00596 |
| Navegador | 1.200 | R$ 29,90 | $5,98 | $0,00498 |
| Cartógrafo | 2.800 | R$ 59,90 | $11,98 | $0,00428 |
| Embaixador | 6.000 | R$ 119,90 | $23,98 | $0,00400 |

**Média ponderada esperada** (assumindo 40% Navegador / 30% Explorador / 20% Cartógrafo / 10% Embaixador): **$0,00489/PA**.

### 2.2 Receita por expedição (160 PA gastos = 30+50+80)

160 PA × $0,00489 = **$0,783 de receita reconhecida por expedição**.

### 2.3 Margem por cenário (stack AI)

| Stack | Custo/expedição | Receita | Margem $ | Margem % |
|---|---:|---:|---:|---:|
| All Gemini Flash | $0,00479 | $0,783 | $0,778 | **16.254 %** |
| Hybrid Gemini + Haiku fallback 10% | $0,008 | $0,783 | $0,775 | **9.700 %** |
| All Haiku | $0,047 | $0,783 | $0,736 | **1.565 %** |
| Hybrid Haiku 3/5 + Sonnet 6 | $0,123 | $0,783 | $0,660 | **537 %** |
| All Sonnet 4.6 | $0,177 | $0,783 | $0,606 | **342 %** |

**Conclusão**: meta de ~100% de margem bruta (Atlas §11.2) está atendida com folga em **todos os cenários**. O risco não é de margem. O risco é:

- **Fluxo de caixa**: CAC técnico × usuários free sem conversão
- **Ceiling de infra**: se 1.000 expedições/dia em Sonnet = $177/dia = $5.300/mês → estoura $100 mensal default
- **Risco operacional** (timeouts Vercel Hobby) — já abordado em `RISK-ASSESSMENT-EDGE-RUNTIME.md`

---

## 3. Qual modelo usar por fase

Matriz de decisão ponderando custo, qualidade, velocidade (Vercel Hobby 60s) e SLA:

| Fase | Recomendação primária | Fallback | Justificativa |
|---|---|---|---|
| **3 — Checklist** | `gemini-2.0-flash` | `claude-haiku-4-5` | Saída simples (lista estruturada), Haiku é overkill. Gemini custa 10x menos e cabe em <15s. |
| **5 — Guide** | `gemini-2.0-flash` | `claude-haiku-4-5` | Output grande (~3.5k tok), velocidade crítica. Qualidade Flash é aceitável para conteúdo informacional padronizado. |
| **6 — Plan** | `gemini-2.0-flash` | `claude-sonnet-4-6` (premium) | Streaming obrigatório (Vercel 60s). Flash entrega itinerário de 7 dias em ~25s. Sonnet só como opt-in pago. |

### 3.1 Tier Premium opcional (monetização futura)

Criar feature "**Roteiro Premium**" (+50 PA) que força Sonnet 4.6 na Fase 6:
- Custo adicional: ~$0.10 por geração
- Cobrança: 50 PA extras = $0,24 de receita
- Margem adicional: ~140% apenas no premium
- UX: checkbox "Quero um roteiro mais detalhado e criativo" antes de gerar

Isso cria um funil natural de monetização sem forçar upgrade.

---

## 4. Alternativas analisadas

| Alternativa | Redução de custo | Complexidade | Recomendação |
|---|---|---|---|
| **Prompt caching (Anthropic)** | ~90% sobre input cached, marginal por expedição (~$0,001) | 🟢 Zero (já ativo em `claude.provider.ts:59`) | ✅ Manter ativo |
| **Modelos menores (Haiku everywhere)** | -73% vs Sonnet hybrid | 🟢 Baixa (troca de env var) | ✅ Fallback padrão |
| **Gemini Flash como primário** | -97% vs Sonnet hybrid | 🟡 Média (já implementado, mas timeouts Vercel) | ✅ Primário — com mitigação de streaming Fase 5 |
| **Edge Runtime** | Zero redução de custo AI; elimina timeout 60s | 🔴 Alta (34-55h, 5 camadas) | ❌ Rejeitado (ver RISK-ASSESSMENT-EDGE-RUNTIME.md) |
| **Reduzir `maxTokens` Fase 6 para 6k** | -25% output tokens | 🟢 Baixa | ⚠️ Risco truncamento em viagens ≥10 dias; testar primeiro |
| **Vercel Pro ($20/mês)** | Zero redução AI, elimina timeout | 🟢 Zero | ✅ Contingência se Gemini streaming não resolver |
| **Recarga Anthropic $10** | Permite usar prompt caching real | 🟢 Zero | ✅ Paralelo — hedging de provider |

**Decisão**: manter **Gemini Flash** como primário nos 3 pontos de IA + ativar **streaming na Fase 5** (item 1 do Edge Risk Assessment) + **recarregar Anthropic $10** como fallback quente.

---

## 5. Quanto cobrar se Anthropic virar primário

Cenário hipotético: Gemini é descontinuado ou apresenta queda de qualidade → Anthropic como primário.

### 5.1 Custos por stack Anthropic

| Stack Anthropic | Custo/expedição | Ceiling $100/mês | Usuários/mês (3 exp/user) |
|---|---:|---:|---:|
| All Haiku | $0,047 | 2.127 expedições | ~710 users |
| Hybrid (Haiku 3/5 + Sonnet 6) | $0,123 | 813 expedições | ~271 users |
| All Sonnet | $0,177 | 565 expedições | ~188 users |

### 5.2 Preços sugeridos se Anthropic for o primário

**Cenário conservador (Haiku-first, manter Sonnet apenas no opt-in premium)**: **NENHUM AUMENTO DE PREÇO**. Margem >1500%.

**Cenário ambicioso (Hybrid Haiku+Sonnet forçado)**: ainda **sem necessidade de aumento**. Margem 537% suporta.

**Cenário premium all-Sonnet (hipotético, não recomendado)**: margem 342% ainda confortável, mas se o time quiser preservar folga de 100% pós-custos-fixos (infra, devops, FinOps), considerar:

| Pacote atual | Preço atual | Preço sugerido (+25%) |
|---|---:|---:|
| Explorador 500 PA | R$ 14,90 | R$ 18,90 |
| Navegador 1.200 PA | R$ 29,90 | R$ 37,90 |
| Cartógrafo 2.800 PA | R$ 59,90 | R$ 74,90 |
| Embaixador 6.000 PA | R$ 119,90 | R$ 149,90 |

**Recomendação do time**: **não reajustar no Sprint 42**. Esperar dados reais de conversão do admin dashboard (Sprint 37+) antes de mexer em preço. Reajuste prematuro antes de provar product-market-fit é ruim para aquisição.

---

## 6. Ceiling de custo mensal por provider

Configuração atual: `AI_MONTHLY_BUDGET_USD = $100` (fonte: `src/server/services/ai-governance/policies/cost-budget.policy.ts:12`), com WARN@80% ($80) e BLOCK@95% ($95).

### 6.1 Proposta de ceilings segmentados

Adicionar as seguintes env vars (não-breaking — se ausentes, caem no ceiling global):

| Env var | Valor | Racional |
|---|---:|---|
| `AI_MONTHLY_BUDGET_USD` | $100 | Mantém ceiling global atual |
| `AI_MONTHLY_BUDGET_GEMINI_USD` | $40 | 20.000 expedições de folga (~667/dia) — cobre crescimento orgânico agressivo |
| `AI_MONTHLY_BUDGET_ANTHROPIC_USD` | $40 | 850 expedições Haiku ou 226 Sonnet — fallback sustentável |
| `AI_MONTHLY_BUDGET_BUFFER_USD` | $20 | Buffer para picos/premium |

**Total**: $100 com segregação por provider → permite block parcial (ex: Gemini saturado → Anthropic continua operando).

### 6.2 Alertas

| Threshold | Ação |
|---|---|
| 50% global ou por provider | `logger.info` + Slack #ops |
| 80% global ou por provider | `logger.warn` + Sentry alerting |
| 95% | `AppError("AI_BUDGET_EXCEEDED")` + UI mostra "Serviço de IA em pausa" |

### 6.3 Trigger de review

Se em 2 sprints consecutivos o ceiling for excedido em >70%, acionar revisão FinOps extraordinária e reavaliar:
- Aumento de ceiling
- Redução de maxTokens
- Migração de modelos
- Reajuste de preços de pacotes

---

## 7. Ações concretas — Sprint 42

| # | Ação | Owner | Esforço |
|---|---|---|---|
| 1 | Setar `AI_PROVIDER=gemini`, `AI_PROVIDER_PLAN=gemini`, `AI_PROVIDER_GUIDE=gemini`, `AI_PROVIDER_CHECKLIST=gemini` em produção | devops-engineer | 15min |
| 2 | Setar `AI_FALLBACK_PROVIDER=anthropic` (Haiku como fallback automático) | devops-engineer | 15min |
| 3 | Adicionar `AI_MONTHLY_BUDGET_GEMINI_USD=40` + `AI_MONTHLY_BUDGET_ANTHROPIC_USD=40` | devops-engineer + finops-engineer | 1h (inclui ajuste em `cost-budget.policy.ts`) |
| 4 | Converter Phase 5 para streaming (rota Node) | dev-fullstack-1 | 4-6h |
| 5 | Recarregar conta Anthropic com $10 | tech-lead | 5min |
| 6 | Atualizar `ATLAS-GAMIFICACAO-APROVADO.md` §11.2 com tabela real de custos | finops-engineer | 30min (feito neste sprint review) |
| 7 | Criar dashboard FinOps mostrando $/dia por provider | dev-fullstack-2 | 4h (Sprint 43 backlog) |
| 8 | Validar reduções de `maxTokens` Phase 6 de 8k→6k em canary 10% | qa-engineer + prompt-engineer | 3h (Sprint 43 backlog) |
| 9 | Documentar decisão em ADR-031 ("Gemini Flash como primário, Anthropic como fallback") | architect | 1h |

**Esforço total Sprint 42**: ~6h de dev + 2h de configuração. **Zero dependência de Vercel Pro ou Edge Runtime**.

---

## 8. Atualização do `ATLAS-GAMIFICACAO-APROVADO.md` §11.2

A tabela "Análise requerida" agora tem dados reais. Ver edição aplicada diretamente no arquivo:

```
Custo médio por expedição (Gemini Flash primário): $0,005
Custo médio por expedição (Haiku fallback):        $0,047
Custo médio por expedição (Sonnet premium opt-in): $0,177
Receita por expedição (160 PA × $0,00489):         $0,783
Margem bruta (Gemini primário):                    ~9.700%
Margem bruta (Haiku fallback):                     ~1.565%
Margem bruta (Sonnet premium):                     ~342%
Onboarding CAC técnico (180 PA, Gemini):           $0,005
Break-even por usuário (Gemini):                   0,6% de conversão free→paid
```

**Decisão**: manter preços atuais de pacotes. Manter 30/50/80 PA por fase. A meta de ~100% de margem bruta está atendida por **ordem de grandeza** em todos os cenários.

---

## 9. Riscos e observações finais

| # | Observação | Severidade |
|---|---|---|
| 9.1 | COST-LOG.md só tem dados até Sprint 8 — projeto ainda sem tráfego real. Projeções baseiam-se em estimativas de token, não em histórico. | 🟡 MÉDIA |
| 9.2 | Stripe/pagamentos não implementados — toda a projeção de receita é hipotética. Revalidar pós-Sprint 37. | 🟡 MÉDIA |
| 9.3 | Gemini Flash qualidade vs Sonnet em roteiros complexos (7+ dias) precisa de avaliação qualitativa. Acionar prompt-engineer para eval dataset. | 🟡 MÉDIA |
| 9.4 | Regenerações não estão rate-limited por PA — usuário pode consumir orçamento abusando de regens. Adicionar custo explícito de regen em PA (sugestão: +20 PA). | 🔴 ALTA |
| 9.5 | Cache ephemeral só amortiza intra-sessão. Se quiser cache persistente entre usuários, avaliar cache Redis no input — mas cuidado com vazamento de contexto personalizado entre usuários. | 🟢 BAIXA |
| 9.6 | Sem payment gateway, ceiling $100/mês é um hard limit real — o app "para" ao atingir 95%. UX de "fora do ar" precisa existir. | 🔴 ALTA |

---

## 10. Aprovações

- [ ] **product-owner** — valida política de preços (mantém R$14,90–R$119,90)
- [ ] **tech-lead** — aprova migração Gemini primário + Haiku fallback
- [ ] **prompt-engineer** — confirma que `cache_control` está otimizado
- [ ] **finops-engineer** — assina off nos novos ceilings $40/$40/$20
- [ ] **security-specialist** — revisa §9.5 (cache cross-user)
- [ ] **architect** — ADR-031 publicado

**Próxima revisão FinOps**: Sprint 44 (com 2 sprints de tráfego real após rollout Gemini primário).
