# PA Financial Projection

> **Autor**: finops-engineer
> **Data**: 2026-03-21
> **Versao**: 1.1.0
> **Status**: Draft
> **Fontes**: `src/types/gamification.types.ts`, `src/lib/engines/phase-config.ts`, `src/lib/engines/points-engine.ts`

---

## Premissas

| Parametro | Valor | Fonte |
|---|---|---|
| Welcome Bonus | 180 PA | `WELCOME_BONUS` em `gamification.types.ts` |
| Cambio BRL/USD | R$ 5,20 / $1,00 | Estimativa mercado |
| Custo checklist (Haiku) | $0,005 / chamada | Prompt-engineer estimate |
| Custo guide (Haiku) | $0,015 / chamada | Prompt-engineer estimate |
| Custo itinerary (Sonnet) | $0,060 / chamada | Prompt-engineer estimate |
| Custo total por expedicao completa (AI) | $0,08 USD | Soma dos 3 acima |
| PA total por expedicao (AI) | 160 PA | 30 + 50 + 80 (Phases 3, 5, 6) |
| Custos fixos mensais | ~$50/mes | Vercel + Neon + Redis |

### Custos de AI por Fase (do codigo-fonte)

| Fase | Nome | AI Cost (PA) | Points Reward (PA) | USD Infra Cost |
|---|---|---|---|---|
| 1 | O Chamado | 0 | 100 | $0,000 |
| 2 | O Explorador | 0 | 150 | $0,000 |
| 3 | O Preparo | 30 | 75 | $0,005 |
| 4 | A Logistica | 0 | 50 | $0,000 |
| 5 | Guia do Destino | 50 | 40 | $0,015 |
| 6 | O Roteiro | 80 | 250 | $0,060 |
| 7 | A Expedicao | 0 | 400 | $0,000 |
| 8 | O Legado | 0 | 500 | $0,000 |
| **Total** | | **160** | **1.565** | **$0,080** |

> **Nota**: Os custos de AI estao definidos tanto em `phase-config.ts` (campo `aiCost`) quanto
> em `AI_COSTS` globais em `gamification.types.ts` (`ai_route: 30`, `ai_accommodation: 50`,
> `ai_itinerary: 80`, `ai_regenerate: 0`). Regeneracao custa o mesmo que a geracao original.

### Custos de AI Features (do codigo-fonte: `AI_COSTS`)

| Feature | PA Cost | USD Infra Cost |
|---|---|---|
| `ai_itinerary` (Roteiro, Phase 6) | 80 PA | $0,060 |
| `ai_route` (Checklist, Phase 3) | 30 PA | $0,005 |
| `ai_accommodation` (Guia, Phase 5) | 50 PA | $0,015 |
| `ai_regenerate` | 0 PA (custo = geracao original) | variavel |

---

## 1. PA → USD Conversion Rate

### Custo de uma expedicao completa com AI

Uma expedicao tipica consome as seguintes features de AI:

| Feature | PA | USD |
|---|---|---|
| Checklist (ai_route, Phase 3) | 30 PA | $0,005 |
| Guide (ai_accommodation, Phase 5) | 50 PA | $0,015 |
| Itinerary (ai_itinerary, Phase 6) | 80 PA | $0,060 |
| **Total** | **160 PA** | **$0,080** |

### Taxa de conversao

```
1 PA = $0,080 / 160 = $0,000500 USD
```

Ou equivalentemente:

```
1.000 PA = $0,500 USD em custo de infraestrutura
```

---

## 2. Onboarding Gift Cost

| Metrica | Valor |
|---|---|
| Welcome Bonus | 180 PA |
| Custo infra do gift | 180 x $0,000500 = **$0,090 USD** |
| Custo em BRL | $0,090 x R$5,20 = **R$0,47** |
| Expeditions possiveis | 180 / 160 = **1,13 expedicoes** |

### Analise

O welcome bonus de 180 PA cobre **1 expedicao completa com AI** (160 PA) e sobram 20 PA.
O bonus de 180 PA se decompoe em: 50 PA (criacao de conta) + 100 PA (tutorial) + 30 PA (primeiro campo de perfil).

**Custo de aquisicao de cliente (CAC) via gift: $0,090 USD (R$0,47)**

Este e um CAC extremamente baixo. Para contexto:
- CAC medio de apps de viagem: $3-8 USD
- Nosso CAC de gift: $0,090 USD (98,8% menor que a media)

**Conclusao**: O gift de 180 PA e altamente sustentavel. O custo real para nos e quase
insignificante porque pagamos apenas quando o usuario de fato consome features de AI.

---

## 3. Package Margin Analysis

### Tabela de Pacotes

| Pacote | PA | Preco BRL | Preco USD | Custo Infra (PA x $0,000500) | Lucro Bruto | Margem Bruta |
|---|---|---|---|---|---|---|
| Explorador | 500 PA | R$ 14,90 | $2,87 | $0,250 | $2,62 | **91,3%** |
| Navegador | 1.200 PA | R$ 29,90 | $5,75 | $0,600 | $5,15 | **89,6%** |
| Capitao | 2.800 PA | R$ 59,90 | $11,52 | $1,400 | $10,12 | **87,8%** |
| Lendario | 6.000 PA | R$ 119,90 | $23,06 | $3,000 | $20,06 | **87,0%** |

### Detalhamento por Pacote

#### Explorador (R$ 14,90 → 500 PA)
- Expedicoes possiveis: 3,13
- Custo por PA vendido: R$ 14,90 / 500 = **R$ 0,0298/PA**
- Custo infra por PA: $0,000500 x R$5,20 = **R$ 0,00260/PA**
- **Markup**: 11,5x sobre custo de infra

#### Navegador (R$ 29,90 → 1.200 PA)
- Expedicoes possiveis: 7,50
- Custo por PA vendido: R$ 29,90 / 1.200 = **R$ 0,0249/PA** (16% desconto vs Explorador)
- **Markup**: 9,6x sobre custo de infra

#### Capitao (R$ 59,90 → 2.800 PA)
- Expedicoes possiveis: 17,50
- Custo por PA vendido: R$ 59,90 / 2.800 = **R$ 0,0214/PA** (28% desconto vs Explorador)
- **Markup**: 8,2x sobre custo de infra

#### Lendario (R$ 119,90 → 6.000 PA)
- Expedicoes possiveis: 37,50
- Custo por PA vendido: R$ 119,90 / 6.000 = **R$ 0,0200/PA** (33% desconto vs Explorador)
- **Markup**: 7,7x sobre custo de infra

### Analise de Margem

Todos os pacotes tem margem bruta **acima de 87%**, muito acima do target de 100% (que
corresponderia a 50% de margem). A economia de PA virtual e extremamente favoravel porque:

1. **O custo marginal de AI e muito baixo** (~$0,08 por expedicao completa)
2. **Nem todo PA comprado e convertido em AI** — usuarios acumulam PA para ranking/badges
3. **Phase rewards geram deflacao**: usuarios ganham 1.565 PA ao completar todas as fases,
   reduzindo necessidade de compra

---

## 4. User Scenarios

### Cenario A: Free User (apenas welcome gift)

| Metrica | Mes 1 | Mes 2 | Mes 3 | Mes 12 |
|---|---|---|---|---|
| PA Inicio | 180 | 285 | 315 | 455 |
| Welcome Bonus | 180 | — | — | — |
| Daily Login (10 PA x ~20 dias) | +200 | +200 | +200 | +200 |
| Checklist earn (20 PA x ~2) | +40 | +40 | +40 | +40 |
| Phase Rewards | +265 | +90 | +250 | — |
| AI Spend (1 expedicao) | -160 | 0 | -160 | 0 |
| PA Fim | ~525 | ~615 | ~645 | ~695 |
| Expedicoes | 1 | 0 | 1 | 0 |
| Revenue | $0 | $0 | $0 | $0 |
| Custo Infra | $0,08 | $0 | $0,08 | $0 |

**Resumo anual Free User**: ~6 expedicoes, $0,48 custo infra, $0 revenue.
Free users sao sustentaveis porque geram volume e potencial de conversao. Com 180 PA de bonus
e 160 PA de custo por expedicao, o free user pode fazer 1 expedicao imediata.

### Cenario B: Casual (1 pacote Starter/trimestre)

| Metrica | Mensal (media) |
|---|---|
| PA de compra | 500 / 3 = 167/mes |
| Daily Login | +200/mes |
| Checklist earn | +40/mes |
| Total PA disponivel | ~407/mes |
| Expedicoes/mes | ~1,2 |
| Revenue | R$14,90 / 3 = **R$4,97/mes** ($0,96/mes) |
| Custo Infra AI | $0,096/mes |
| Lucro Bruto | **$0,86/mes** |
| Margem | **90,0%** |

**Resumo anual Casual**: R$59,60 revenue, $3,83 lucro bruto, ~14 expedicoes.

### Cenario C: Power User (1 pacote Explorer/mes)

| Metrica | Mensal |
|---|---|
| PA de compra | 1.200/mes |
| Daily Login | +300/mes (30 dias) |
| Checklist earn | +60/mes |
| Total PA disponivel | ~1.560/mes |
| Expedicoes/mes | ~4,5 |
| Revenue | **R$29,90/mes** ($5,75/mes) |
| Custo Infra AI | $0,36/mes |
| Lucro Bruto | **$5,39/mes** |
| Margem | **93,7%** |

**Resumo anual Power User**: R$358,80 revenue, $64,68 lucro bruto, ~54 expedicoes.

---

## 5. Break-Even Analysis

### Custos Fixos Mensais

| Servico | Custo/mes | Notas |
|---|---|---|
| Vercel (Pro) | $20 | Hosting + Edge |
| Neon (Free→Pro) | $19 | PostgreSQL managed |
| Upstash Redis | $10 | Serverless Redis |
| Dominio | $1 | ~$12/ano |
| **Total** | **$50/mes** | |

### Custo Variavel por Usuario

| Tipo | Custo Variavel/mes |
|---|---|
| Free User | $0,04 (media ~0,5 exp/mes) |
| Casual | $0,096/mes |
| Power User | $0,36/mes |

### Break-Even por Tipo de Usuario

**Cenario: 100% Casual users (pior cenario realista)**

```
Break-even = Custo Fixo / (Revenue - Custo Variavel) por usuario
           = $50 / ($0,96 - $0,096)
           = $50 / $0,864
           = 58 usuarios pagantes
```

**Cenario: 100% Power users (melhor cenario)**

```
Break-even = $50 / ($5,75 - $0,36)
           = $50 / $5,39
           = 10 usuarios pagantes
```

**Cenario misto realista (70% free, 20% casual, 10% power)**

Para cada 100 usuarios:
- 70 free: custo $2,80/mes, revenue $0
- 20 casual: custo $1,92/mes, revenue $19,20/mes
- 10 power: custo $3,60/mes, revenue $57,50/mes

```
Revenue total: $76,70/mes
Custo variavel: $8,32/mes
Contribuicao: $68,38/mes

Break-even com 100 usuarios: custos ($50 + $8,32) vs revenue $76,70
Lucro: $18,38/mes ✅
```

**Break-even com mix realista: ~74 usuarios totais (15 casual + 7 power + 52 free)**

---

## 6. Recommendations

### 6.1 Margem atual: EXCELENTE (94-96%)

A margem bruta esta bem acima do target de 100% markup (50% margem). Com margens de 94-96%,
temos espaco significativo para:

### 6.2 Oportunidades de Promocao

| Acao | Impacto |
|---|---|
| **Promo "primeira compra" 20% off** | Margem cai para ~92% — ainda excelente |
| **PA bonus em feriados (+30%)** | Custo adicional minimo, alto valor percebido |
| **Referral bonus: 300 PA** (ja implementado) | CAC de $0,069 por referral — sustentavel |
| **Streak bonus semanal: +50 PA** | Engagement boost, custo ~$0,011/semana |

### 6.3 Riscos e Mitigacoes

| Risco | Probabilidade | Mitigacao |
|---|---|---|
| Inflacao de PA por phase rewards | Media | Monitorar ratio earn/spend mensal |
| Acumulo sem conversao (PA hoarding) | Media | Introducir PA expiration (365 dias) |
| Aumento de custo Anthropic API | Baixa | Guardar margem de 2x sobre custo |
| Abuso de multi-account para bonus | Media | Verificacao de email + rate limit |
| Cambio BRL/USD desfavoravel | Media | Reajustar precos trimestralmente |

### 6.4 Pricing Otimo para 100% Markup Target

Se o objetivo fosse **exatamente 100% markup** (50% margem), os precos seriam:

| Pacote | PA | Preco Atual | Preco para 50% margem |
|---|---|---|---|
| Explorador | 500 | R$ 14,90 | R$ 2,60 |
| Navegador | 1.200 | R$ 29,90 | R$ 6,24 |
| Capitao | 2.800 | R$ 59,90 | R$ 14,56 |
| Lendario | 6.000 | R$ 119,90 | R$ 31,20 |

**Conclusao**: Os precos atuais estao ~5,7x acima do minimo para 100% markup. Isto e
**intencional e correto** porque:

1. Custos fixos precisam ser cobertos
2. Margem para marketing e crescimento
3. Valor percebido da experiencia gamificada (nao apenas custo de API)
4. Reserva para flutuacoes de custo de AI

**Recomendacao: Manter precos atuais.** A margem bruta de 87-91% e saudavel para um SaaS
B2C em fase de crescimento. Considerar promocoes pontuais para aquisicao.

---

## 7. Monthly Revenue Projection

### Por Numero de Usuarios Totais (mix 70/20/10)

| Usuarios | Free | Casual | Power | Revenue/mes | Custo Total/mes | Lucro/mes | Margem Op. |
|---|---|---|---|---|---|---|---|
| 50 | 35 | 10 | 5 | $38,35 | $54,16 | -$15,81 | -41% |
| 100 | 70 | 20 | 10 | $76,70 | $58,32 | **$18,38** | **24%** |
| 250 | 175 | 50 | 25 | $191,75 | $70,80 | **$120,95** | **63%** |
| 500 | 350 | 100 | 50 | $383,50 | $91,60 | **$291,90** | **76%** |
| 1.000 | 700 | 200 | 100 | $767,00 | $133,20 | **$633,80** | **83%** |
| 5.000 | 3.500 | 1.000 | 500 | $3.835,00 | $466,00 | **$3.369,00** | **88%** |
| 10.000 | 7.000 | 2.000 | 1.000 | $7.670,00 | $882,00 | **$6.788,00** | **89%** |

> **Nota**: Custos fixos ($50/mes) incluidos. A partir de 5.000 usuarios, considerar upgrade
> de infra (~$200/mes adicional para Vercel Enterprise + Neon Scale).

### Projecao Anual (ARR)

| Usuarios | ARR (USD) | ARR (BRL) |
|---|---|---|
| 100 | $920 | R$ 4.786 |
| 500 | $4.602 | R$ 23.930 |
| 1.000 | $9.204 | R$ 47.861 |
| 5.000 | $46.020 | R$ 239.304 |
| 10.000 | $92.040 | R$ 478.608 |

---

## 8. Resumo Executivo

| KPI | Valor |
|---|---|
| **1 PA** | $0,000500 USD em custo de infra |
| **1 expedicao completa** | 160 PA / $0,08 USD |
| **Welcome gift (180 PA)** | $0,090 USD — cobre 1,13 expedicoes |
| **Margem bruta media** | **88,9%** |
| **Break-even (mix realista)** | **~74 usuarios** (15 casual + 7 power) |
| **CAC via gift** | $0,090 USD (vs $3-8 industria) |
| **LTV Casual (12 meses)** | $11,52 USD |
| **LTV Power (12 meses)** | $69,00 USD |
| **LTV/CAC ratio Casual** | 101x |
| **LTV/CAC ratio Power** | 605x |

### Veredito

A economia de PA e **altamente sustentavel e lucrativa**. As margens brutas de 87-91%
oferecem ampla protecao contra flutuacao de custos de AI e cambio. O modelo de monetizacao
via moeda virtual (PA) desacopla efetivamente o preco ao consumidor do custo de
infraestrutura, criando um buffer estrategico saudavel.

**Proximos passos**:
1. Implementar telemetria de PA earn/spend ratio por cohort
2. Configurar alertas de custo se margem bruta cair abaixo de 85%
3. Revisar precos trimestralmente com base no cambio e custos de API
4. Modelar impacto de PA expiration policy antes de implementar

---

*Documento gerado pelo finops-engineer. Proxima revisao: Sprint 33.*

---

## Historico de Revisoes

| Versao | Data | Autor | Descricao |
|---|---|---|---|
| 1.0.0 | 2026-03-21 | finops-engineer | Projecao inicial com AI costs 350 PA/expedicao |
| 1.1.0 | 2026-03-21 | dev-fullstack-1 | Recalculo com AI costs corrigidos: 160 PA/expedicao, welcome bonus 180 PA, taxa $0.000500/PA, margens 87-91%, nomes de pacotes alinhados com ranks RPG |
