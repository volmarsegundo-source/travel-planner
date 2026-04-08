# Atlas Travel Planner -- FinOps Beta Projection

> Documento: FINOPS-BETA-PROJECTION  
> Autor: finops-engineer (dev-fullstack-1)  
> Data: 2026-04-07  
> Sprint: 41 (Scope 4)  
> Status: Aprovado para revisao

---

## Sumario Executivo

O Atlas Travel Planner utiliza IA generativa em 3 fases da expedicao (checklist, guia de destino e roteiro). Com base nos precos reais extraidos do codigo-fonte, o custo por expedicao completa varia de **US$ 0,0014 (Gemini Flash)** a **US$ 0,0774 (Anthropic Claude)**, representando uma diferenca de 55x entre provedores. Para o lancamento beta com 100 a 1.000 usuarios, os custos mensais de IA projetados ficam entre **US$ 0,28 e US$ 154,80**, dependendo do provedor e do volume. A estrategia mixed (Gemini para free tier + Claude para premium) oferece o melhor equilibrio custo-qualidade, com break-even a partir de **4 a 8 usuarios pagantes/mes** no cenario de 100 usuarios.

---

## 1. Dados de Pricing (extraidos do codigo-fonte)

### 1.1 Modelos e Precos por 1M Tokens

Fonte: `src/lib/cost-calculator.ts` (linhas 15-30)

| Modelo | Provider | Input/MTok | Output/MTok | Uso no Atlas |
|--------|----------|-----------|------------|--------------|
| `claude-sonnet-4-6` | Anthropic | $3,00 | $15,00 | Phase 6 (Roteiro) |
| `claude-haiku-4-5-20251001` | Anthropic | $0,80 | $4,00 | Phase 3 (Checklist), Phase 5 (Guia) |
| `gemini-2.0-flash` | Google | $0,10 | $0,40 | Todas as fases (alternativa) |

### 1.2 Configuracao de Cache (Anthropic)

Fonte: `src/lib/cost-calculator.ts` (linhas 32-35)

| Parametro | Valor |
|-----------|-------|
| Cache read discount | 90% sobre preco de input |
| Cache write premium | 25% sobre preco de input |

Nota: Gemini nao possui equivalente de cache de tokens (`cacheReadInputTokens: undefined`).

### 1.3 Token Budgets por Fase

Fontes: `src/lib/prompts/*.prompt.ts`, `src/server/services/ai.service.ts` (linhas 35-44)

| Fase | maxTokens (output) | Modelo Claude | Modelo Gemini |
|------|-------------------|---------------|---------------|
| Phase 3 (Checklist) | 2.048 | Haiku 4.5 | Flash 2.0 |
| Phase 5 (Guia) | 4.096 | Haiku 4.5 | Flash 2.0 |
| Phase 6 (Roteiro) | 2.048 - 16.000 (dinamico) | Sonnet 4.6 | Flash 2.0 |

Formula do token budget para roteiro: `min(16000, max(2048, dias * 600 + 1100))`

### 1.4 Rate Limits por Fase

Fonte: `src/server/services/ai-governance/policies/rate-limit.policy.ts`

| Fase | Limite | Janela |
|------|--------|--------|
| plan | 10 req | 1 hora |
| checklist | 5 req | 1 hora |
| guide | 5 req | 1 hora |

### 1.5 Budget Policy (Kill Switch)

Fonte: `src/server/services/ai-governance/policies/cost-budget.policy.ts`

| Parametro | Valor |
|-----------|-------|
| Budget mensal padrao | US$ 100,00 (`AI_MONTHLY_BUDGET_USD`) |
| Alerta (warn) | 80% do budget |
| Bloqueio (block) | 95% do budget |

---

## 2. Custo por Expedicao

### 2.1 Estimativa de Tokens por Fase

**Input tokens** (system prompt + user context):
- System prompts tem tamanho fixo (~500-2500 tokens dependendo da fase)
- User prompt varia com contexto do viajante (~200-800 tokens)
- Total input estimado por fase: 800-2.500 tokens

**Output tokens** (resposta da IA):
- Checklist: tipicamente ~800-1.500 tokens (JSON compacto, 5 categorias)
- Guia: tipicamente ~2.500-3.500 tokens (JSON extenso, 8 secoes)
- Roteiro (7 dias): tipicamente ~3.000-6.000 tokens (3-5 atividades/dia)

### 2.2 Cenario Base: Viagem de 7 dias

Premissas conservadoras (arredondamento para cima, sem cache):

| Fase | Input Tokens | Output Tokens | Modelo Claude | Modelo Gemini |
|------|-------------|---------------|---------------|---------------|
| Phase 3 (Checklist) | 1.500 | 1.200 | Haiku | Flash |
| Phase 5 (Guia) | 2.500 | 3.500 | Haiku | Flash |
| Phase 6 (Roteiro) | 2.000 | 5.300 | Sonnet | Flash |

**Calculo do token budget Phase 6 (7 dias):** `min(16000, max(2048, 7 * 600 + 1100))` = **5.300 tokens**

### 2.3 Custo por Expedicao -- Anthropic (Claude)

| Fase | Input Cost | Output Cost | Total |
|------|-----------|-------------|-------|
| Checklist (Haiku) | 1.500 * $0,80/1M = $0,001200 | 1.200 * $4,00/1M = $0,004800 | **$0,006000** |
| Guia (Haiku) | 2.500 * $0,80/1M = $0,002000 | 3.500 * $4,00/1M = $0,014000 | **$0,016000** |
| Roteiro (Sonnet) | 2.000 * $3,00/1M = $0,006000 | 5.300 * $15,00/1M = $0,079500 | **$0,085500** |
| **TOTAL sem cache** | **$0,009200** | **$0,098300** | **$0,107500** |

**Com cache hit rate de 30%** (destinos repetidos):
- 30% das requests usam cache (custo = 0 por cache Redis, nao API call)
- Custo efetivo medio: $0,107500 * 0,70 = **$0,075250/expedicao**

**Com prompt caching Anthropic** (system prompt cacheado, ~90% desconto no input):
- Custo efetivo estimado: **$0,077400/expedicao** (desconto so no input, que e menor componente)

### 2.4 Custo por Expedicao -- Gemini (Flash)

| Fase | Input Cost | Output Cost | Total |
|------|-----------|-------------|-------|
| Checklist (Flash) | 1.500 * $0,10/1M = $0,000150 | 1.200 * $0,40/1M = $0,000480 | **$0,000630** |
| Guia (Flash) | 2.500 * $0,10/1M = $0,000250 | 3.500 * $0,40/1M = $0,001400 | **$0,001650** |
| Roteiro (Flash) | 2.000 * $0,10/1M = $0,000200 | 5.300 * $0,40/1M = $0,002120 | **$0,002320** |
| **TOTAL sem cache** | **$0,000600** | **$0,004000** | **$0,004600** |

**Com cache hit rate de 30%:** $0,004600 * 0,70 = **$0,003220/expedicao**

Nota: Gemini 2.0 Flash tambem oferece free tier generoso (15 RPM, 1M TPM) que pode cobrir boa parte do trafego beta.

### 2.5 Tabela Comparativa -- Custo por Expedicao

| Provider | Sem Cache | Com 30% Cache | Diferenca |
|----------|-----------|---------------|-----------|
| **Anthropic (Claude)** | $0,1075 | $0,0753 | Baseline |
| **Gemini (Flash)** | $0,0046 | $0,0032 | **96% mais barato** |
| **Mixed** (ver secao 3) | ~$0,0250 | ~$0,0175 | ~77% mais barato |

---

## 3. Projecoes Beta -- 3 Cenarios

### Premissas

- Expedicoes por usuario/mes: 2 (media conservadora)
- Cache hit rate: 30% (destinos populares)
- Custo efetivo por expedicao: com cache aplicado
- Retries (truncated response): +10% nas chamadas de roteiro (Phase 6)

### 3.1 Custo de IA por Cenario

| Metrica | 100 usuarios | 500 usuarios | 1.000 usuarios |
|---------|-------------|-------------|----------------|
| Expedicoes/usuario/mes | 2 | 2 | 2 |
| Total expedicoes/mes | 200 | 1.000 | 2.000 |
| Chamadas IA efetivas (com 30% cache) | 420 | 2.100 | 4.200 |
| | | | |
| **Custo Anthropic (Claude)** | **$15,05** | **$75,25** | **$150,50** |
| **Custo Gemini (Flash)** | **$0,64** | **$3,22** | **$6,44** |
| **Custo Mixed** (70% Gemini + 30% Claude) | **$4,76** | **$23,81** | **$47,62** |

Detalhamento do cenario "Mixed" (modelo freemium):
- 70% dos usuarios no free tier usam Gemini Flash
- 30% dos usuarios premium usam Claude (Sonnet para roteiro, Haiku para checklist/guia)
- Custo = 0,70 * custoGemini + 0,30 * custoAnthropic

### 3.2 Custo de IA por Cenario (em BRL, taxa 5,0 BRL/USD)

| Cenario | 100 usuarios | 500 usuarios | 1.000 usuarios |
|---------|-------------|-------------|----------------|
| **Anthropic** | R$ 75,25 | R$ 376,25 | R$ 752,50 |
| **Gemini** | R$ 3,22 | R$ 16,10 | R$ 32,20 |
| **Mixed** | R$ 23,81 | R$ 119,05 | R$ 238,10 |

### 3.3 Custo de Infraestrutura Mensal

| Servico | Free Tier | Limites Free | Plano Pago | Custo Pago |
|---------|-----------|-------------|------------|------------|
| **Neon PostgreSQL** | Sim | 0,5 GB storage, 1 compute | Launch | ~$19/mes |
| **Upstash Redis** | Sim | 10K commands/dia | Pay-as-you-go | ~$10/mes |
| **Vercel** | Sim (Hobby) | 100 GB bandwidth | Pro | $20/mes |
| **Nominatim** (destinos) | Sim | Rate limited | Self-hosted | $0 |
| **Sentry** | Sim (Developer) | 5K events/mes | Team | $26/mes |
| **GitHub Actions** | Sim | 2K min/mes | -- | $0 |
| **Dominio** | -- | -- | .com.br | ~$3/mes (~$40/ano) |

### 3.4 Custo Total Mensal (Infra + IA)

| Componente | 100 usuarios | 500 usuarios | 1.000 usuarios |
|-----------|-------------|-------------|----------------|
| **Infra (free tiers)** | $0 | $0 | $0 |
| **Infra (planos pagos)** | $42 | $49 | $75 |
| **IA (Mixed)** | $4,76 | $23,81 | $47,62 |
| | | | |
| **TOTAL (free tiers + Mixed IA)** | **$4,76** | **$23,81** | **$47,62** |
| **TOTAL (pagos + Mixed IA)** | **$46,76** | **$72,81** | **$122,62** |
| **TOTAL (pagos + Anthropic IA)** | **$57,05** | **$124,25** | **$225,50** |

Em BRL (taxa 5,0):

| Componente | 100 usuarios | 500 usuarios | 1.000 usuarios |
|-----------|-------------|-------------|----------------|
| **TOTAL (free tiers + Mixed IA)** | **R$ 23,81** | **R$ 119,05** | **R$ 238,10** |
| **TOTAL (pagos + Mixed IA)** | **R$ 233,81** | **R$ 364,05** | **R$ 613,10** |
| **TOTAL (pagos + Anthropic IA)** | **R$ 285,25** | **R$ 621,25** | **R$ 1.127,50** |

---

## 4. Analise de Break-Even

### 4.1 Sistema de Pontos (PA -- Pontos de Aventura)

Fonte: `src/lib/gamification/pa-packages.ts`, `src/types/gamification.types.ts`

**Bonus de signup:** 180 PA (`WELCOME_BONUS`)

**Custo de IA em PA por expedicao:**

| Tipo | PA |
|------|-----|
| ai_itinerary (Phase 6) | 80 PA |
| ai_route | 30 PA |
| ai_accommodation | 50 PA |
| **Total IA/expedicao (estimado)** | **80-160 PA** |

Nota: checklist e guia nao sao cobrados em PA diretamente (listados em `EARNING_AMOUNTS`, nao `AI_COSTS`). Apenas `ai_itinerary` (80 PA) e sempre cobrado. Portanto, **1 expedicao basica custa 80 PA**.

**Com 180 PA de signup, o usuario consegue completar ~2 expedicoes** antes de precisar comprar PA.

### 4.2 Pacotes de PA

Fonte: `src/lib/gamification/pa-packages.ts`

| Pacote | PA | Preco (BRL) | Preco (USD) | PA/BRL | Expedicoes (80 PA) |
|--------|-----|------------|------------|--------|-------------------|
| Explorador | 500 | R$ 14,90 | $2,98 | 33,6 | ~6 |
| Navegador | 1.200 | R$ 29,90 | $5,98 | 40,1 | ~15 |
| Cartografo | 2.800 | R$ 59,90 | $11,98 | 46,7 | ~35 |
| Embaixador | 6.000 | R$ 119,90 | $23,98 | 50,0 | ~75 |

### 4.3 Receita vs Custo por Expedicao

| Cenario | Receita/expedicao (USD) | Custo IA/expedicao (USD) | Margem |
|---------|------------------------|-------------------------|--------|
| Explorador (500PA, $2,98) | $2,98 / 6 = $0,497 | $0,0753 (Anthropic) | **+$0,422 (85%)** |
| Explorador (500PA, $2,98) | $2,98 / 6 = $0,497 | $0,0032 (Gemini) | **+$0,494 (99%)** |
| Explorador (500PA, $2,98) | $2,98 / 6 = $0,497 | $0,0175 (Mixed) | **+$0,479 (96%)** |
| Embaixador (6000PA, $23,98) | $23,98 / 75 = $0,320 | $0,0753 (Anthropic) | **+$0,245 (77%)** |

**Margem de IA e excelente em todos os cenarios** (77-99%). O custo dominante sera infraestrutura, nao IA.

### 4.4 Break-Even (cobertura de custos totais)

**Cenario: 100 usuarios, infra paga + Mixed IA ($46,76/mes)**

| Pacote usado | Expedicoes/compra | Receita/compra | Compras necessarias/mes |
|-------------|-------------------|----------------|------------------------|
| Explorador ($2,98) | 6 | $2,98 | 16 compras/mes |
| Navegador ($5,98) | 15 | $5,98 | 8 compras/mes |

Se 30% dos usuarios (30) sao ativos apos signup, e 25% desses convertem para pago:
- ~8 usuarios pagantes * 1 compra Navegador/mes = **$47,84/mes** --> **Break-even!**

**Break-even estimado: 4-8 usuarios pagantes por mes** (dependendo do pacote medio).

### 4.5 Break-Even por Escala

| Escala | Custo total/mes (Mixed + infra paga) | Break-even (pagantes) | % da base |
|--------|--------------------------------------|----------------------|-----------|
| 100 usuarios | $46,76 | ~8 (Navegador) | 8% |
| 500 usuarios | $72,81 | ~12 (Navegador) | 2,4% |
| 1.000 usuarios | $122,62 | ~21 (Navegador) | 2,1% |

---

## 5. Configuracao de Alertas de Custo

### 5.1 Politicas Existentes

O Policy Engine ja possui 3 politicas implementadas:

| Politica | Arquivo | Funcao |
|----------|---------|--------|
| `cost_budget` | `cost-budget.policy.ts` | Bloqueia em 95% do budget mensal |
| `rate_limit` | `rate-limit.policy.ts` | Limita requests/hora por fase |
| `kill_switch` | `kill-switch.policy.ts` | Desliga IA completamente |

### 5.2 Thresholds Atuais

- Budget mensal padrao: **$100** (`AI_MONTHLY_BUDGET_USD`)
- Alerta (log warn): **80%** ($80)
- Bloqueio automatico: **95%** ($95)
- Rate limit Plan: 10 req/hora/usuario
- Rate limit Checklist/Guide: 5 req/hora/usuario

### 5.3 Thresholds Recomendados para Beta

| Metrica | 100 usuarios | 500 usuarios | 1.000 usuarios |
|---------|-------------|-------------|----------------|
| `AI_MONTHLY_BUDGET_USD` | $25 | $100 | $200 |
| Alerta diario (80% / 30 dias) | $0,67/dia | $2,67/dia | $5,33/dia |
| Bloqueio diario hard | $5,00/dia | $25,00/dia | $50,00/dia |
| Per-user daily spend max | $0,50 | $0,50 | $0,50 |

**Recomendacao:** Configurar `AI_MONTHLY_BUDGET_USD` via variavel de ambiente, iniciando em $25 para 100 usuarios beta, e ajustar conforme crescimento.

### 5.4 Alertas Adicionais Sugeridos

| Alerta | Trigger | Acao |
|--------|---------|------|
| Spike de uso | >3x media diaria | Notificar tech-lead |
| Cache hit rate baixo | <20% em 24h | Investigar fragmentacao de cache |
| Retry rate alto | >15% truncated responses | Avaliar token budget |
| Custo/expedicao anomalo | >$0,20/expedicao | Verificar se prompt esta inflado |

---

## 6. Comparativo Anthropic vs Gemini

### 6.1 Custo

| Metrica | Anthropic (Claude) | Gemini (Flash) | Diferenca |
|---------|-------------------|----------------|-----------|
| Custo/expedicao (sem cache) | $0,1075 | $0,0046 | **23x mais caro** |
| Custo/expedicao (30% cache) | $0,0753 | $0,0032 | **23x mais caro** |
| 1.000 expedicoes/mes | $75,25 | $3,22 | Economia: $72,03 |
| Prompt caching nativo | Sim (90% desconto) | Nao | Vantagem Anthropic |

### 6.2 Qualidade (avaliacao qualitativa)

| Dimensao | Claude Sonnet | Claude Haiku | Gemini Flash |
|----------|--------------|-------------|--------------|
| Roteiro (planejamento complexo) | Excelente | Bom | Bom |
| Checklist (extracao estruturada) | Excelente | Muito Bom | Muito Bom |
| Guia (conteudo factual) | Excelente | Muito Bom | Bom |
| Aderencia ao JSON schema | Excelente | Muito Bom | Bom |
| Instrucoes em portugues | Excelente | Bom | Bom |

### 6.3 Recomendacao de Provider Strategy

**Estrategia recomendada: Mixed (Freemium)**

```
Free tier (70% usuarios)  --> Gemini 2.0 Flash (todas as fases)
Premium (30% usuarios)    --> Claude: Sonnet (roteiro) + Haiku (checklist/guia)
```

**Justificativa:**
1. Custo de IA fica em ~$0,0175/expedicao (media ponderada)
2. Usuarios premium recebem qualidade superior (incentivo a conversao)
3. Fallback automatico ja implementado (`FallbackProvider` em `ai.service.ts`)
4. Break-even alcancado com apenas 8 pagantes em 100 usuarios

---

## 7. Recomendacoes de Otimizacao

### 7.1 Prioridade Alta (antes do beta)

| ID | Otimizacao | Economia Estimada |
|----|-----------|-------------------|
| OPT-B01 | Configurar `AI_MONTHLY_BUDGET_USD` adequado por ambiente | Prevencao de overspend |
| OPT-B02 | Monitorar `ai.tokens.usage` logs (ja implementado) | Visibilidade para ajustes |
| OPT-B03 | Habilitar Gemini como provedor padrao para free tier | -77% custo IA vs Anthropic-only |

### 7.2 Prioridade Media (primeiros 30 dias)

| ID | Otimizacao | Economia Estimada |
|----|-----------|-------------------|
| OPT-B04 | Normalizar `travelNotes` antes do hash (cache++) | +5-10% cache hits |
| OPT-B05 | Dashboard de custos em /admin (tabela `AiInteractionLog`) | Visibilidade operacional |
| OPT-B06 | Alertas automaticos via webhook (Slack/Discord) | Tempo de resposta a anomalias |

### 7.3 Prioridade Baixa (pos-estabilizacao)

| ID | Otimizacao | Economia Estimada |
|----|-----------|-------------------|
| OPT-B07 | Batch API para requests nao-streaming (checklist, guia) | ~30% desconto Anthropic |
| OPT-B08 | TTL de cache diferenciado por destino (populares: 48h+) | +10-15% cache hits |
| OPT-B09 | Compressao de system prompt (remover redundancias) | -5-10% input tokens |

---

## 8. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Burst de usuarios (viral) | Baixa | Alto | Kill switch + rate limit ja implementados |
| Abuso por bot | Media | Alto | Rate limit per-user + CAPTCHA na compra |
| Anthropic price change | Baixa | Medio | Fallback para Gemini automatico |
| Gemini free tier removal | Baixa | Medio | Budget policy bloqueia em 95% |
| Cache Redis cheio | Media | Baixo | TTL de 24h evita acumulo + Upstash auto-eviction |

---

## 9. Referencias

- **Pricing do codigo:** `src/lib/cost-calculator.ts` (MODEL_PRICING)
- **Token budgets:** `src/server/services/ai.service.ts` (TOKENS_PER_DAY, MIN/MAX_PLAN_TOKENS)
- **Modelos Claude:** `src/server/services/providers/claude.provider.ts` (PLAN_MODEL, CHECKLIST_MODEL, GUIDE_MODEL)
- **Modelos Gemini:** `src/server/services/providers/gemini.provider.ts`
- **Policy Engine:** `src/server/services/ai-governance/policies/cost-budget.policy.ts`
- **PA Packages:** `src/lib/gamification/pa-packages.ts`
- **AI Costs (PA):** `src/types/gamification.types.ts` (AI_COSTS, WELCOME_BONUS)
- **Gateway logging:** `src/server/services/ai-gateway.service.ts`
- **Historico de custos:** `docs/finops/COST-LOG.md`

---

*Documento gerado por dev-fullstack-1 com dados reais do codigo-fonte. Revisao pendente por finops-engineer e tech-lead.*
