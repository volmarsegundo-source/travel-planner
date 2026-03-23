# SPEC-COST-007: Sprint 37 Cost Assessment — Stripe Payment Integration (Real)

**Version**: 1.0.0
**Status**: Draft
**Author**: finops-engineer
**Reviewers**: tech-lead, architect, security-specialist
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 37
**Baseline**: v0.31.0 (Sprint 36 — Gamification Wave 2 + Mock Payment)
**References**: SPEC-COST-006, SPEC-ARCH-030, PA-FINANCIAL-PROJECTION.md

---

## 1. Resumo Executivo

Sprint 37 substitui o MockPaymentProvider por Stripe real, introduzindo o primeiro custo variavel por transacao no Atlas. O custo incremental de infraestrutura permanece zero (Stripe nao cobra hosting, apenas taxa por transacao). A principal recomendacao e priorizar PIX como metodo de pagamento padrao, com vantagem de 4-6 pontos percentuais de margem sobre cartao de credito.

- **Total incremental infra cost (fixo)**: $0.00
- **Custo variavel novo**: 0.99-3.99% + R$0-0.39 por transacao (Stripe)
- **Margem liquida pos-Stripe**: 72.4-82.4% (cartao) / 77.8-85.5% (PIX)
- **Recomendacao principal**: PIX como default, cartao como alternativa

---

## 2. Taxas Stripe Brasil (Marco 2026)

| Item | Taxa | Fixo | Notas |
|---|---|---|---|
| Cartao de credito | 3,99% | R$0,39/tx | Visa, Mastercard, Elo, Amex |
| PIX | 0,99% | R$0,00 | Sem componente fixo |
| Chargebacks | — | R$65,00/disputa | Apenas cartao; PIX nao tem chargeback |
| Payout (PIX) | Gratuito | — | D+2 |
| Payout (cartao) | Gratuito | — | D+31 |
| Stripe Dashboard | Gratuito | — | Incluso |
| Webhook events | Gratuito | — | Incluso |

### 2.1 Observacoes sobre PIX no Stripe

- PIX via Stripe tem janela de expiracao configuravel (padrao 24h)
- Nao ha chargeback em PIX — risco de disputa eliminado
- Payout D+2 melhora fluxo de caixa vs D+31 do cartao
- Stripe PIX gera QR code automatico — nenhuma infra adicional necessaria

---

## 3. Analise de Margem por Pacote

### 3.1 Premissas

| Parametro | Valor | Fonte |
|---|---|---|
| Custo IA por PA | R$0,004 / PA | SPEC-COST-006 Section 3.1 |
| Custo IA por expedicao | R$0,64 (160 PA) | PA-FINANCIAL-PROJECTION.md |
| Cambio BRL/USD | R$5,20 / $1,00 | Estimativa mercado |
| AI Cost max (100% PA gasto em IA) | PA x R$0,004 | Worst-case scenario |
| Breakage estimado | 20% do PA nao utilizado | Benchmark industria moedas virtuais |

### 3.2 Margem por Pacote — Cartao de Credito (3,99% + R$0,39)

| Pacote | Preco (BRL) | PA | Taxa Stripe | Custo IA Max | Receita Liquida | Margem % |
|---|---|---|---|---|---|---|
| Explorador | R$14,90 | 500 | R$0,98 | R$2,00 | R$11,92 | **80,0%** |
| Navegador | R$29,90 | 1.200 | R$1,58 | R$4,80 | R$23,52 | **78,7%** |
| Cartografo | R$59,90 | 2.800 | R$2,78 | R$11,20 | R$45,92 | **76,7%** |
| Embaixador | R$119,90 | 6.000 | R$5,17 | R$24,00 | R$90,73 | **75,7%** |

**Calculo detalhado — Explorador (cartao):**
```
Preco:         R$14,90
Stripe:        R$14,90 x 3,99% + R$0,39 = R$0,59 + R$0,39 = R$0,98
AI Cost Max:   500 PA x R$0,004 = R$2,00
Liquido:       R$14,90 - R$0,98 - R$2,00 = R$11,92
Margem:        R$11,92 / R$14,90 = 80,0%
```

### 3.3 Margem por Pacote — PIX (0,99%, sem fixo)

| Pacote | Preco (BRL) | PA | Taxa Stripe | Custo IA Max | Receita Liquida | Margem % | Delta vs Cartao |
|---|---|---|---|---|---|---|---|
| Explorador | R$14,90 | 500 | R$0,15 | R$2,00 | R$12,75 | **85,6%** | **+5,6pp** |
| Navegador | R$29,90 | 1.200 | R$0,30 | R$4,80 | R$24,80 | **82,9%** | **+4,2pp** |
| Cartografo | R$59,90 | 2.800 | R$0,59 | R$11,20 | R$48,11 | **80,3%** | **+3,6pp** |
| Embaixador | R$119,90 | 6.000 | R$1,19 | R$24,00 | R$94,71 | **79,0%** | **+3,3pp** |

**Calculo detalhado — Explorador (PIX):**
```
Preco:         R$14,90
Stripe PIX:    R$14,90 x 0,99% = R$0,15
AI Cost Max:   500 PA x R$0,004 = R$2,00
Liquido:       R$14,90 - R$0,15 - R$2,00 = R$12,75
Margem:        R$12,75 / R$14,90 = 85,6%
```

### 3.4 Margem Ajustada com Breakage (20% PA nao utilizado)

Cenario mais realista: 20% do PA comprado nunca e gasto em IA (acumulado para ranking, badges, ou inativo).

| Pacote | Metodo | PA Gasto (80%) | Custo IA Real | Taxa Stripe | Receita Liq. | Margem % |
|---|---|---|---|---|---|---|
| Explorador | PIX | 400 | R$1,60 | R$0,15 | R$13,15 | **88,3%** |
| Explorador | Cartao | 400 | R$1,60 | R$0,98 | R$12,32 | **82,7%** |
| Navegador | PIX | 960 | R$3,84 | R$0,30 | R$25,76 | **86,2%** |
| Navegador | Cartao | 960 | R$3,84 | R$1,58 | R$24,48 | **81,9%** |
| Cartografo | PIX | 2.240 | R$8,96 | R$0,59 | R$50,35 | **84,1%** |
| Cartografo | Cartao | 2.240 | R$8,96 | R$2,78 | R$48,16 | **80,4%** |
| Embaixador | PIX | 4.800 | R$19,20 | R$1,19 | R$99,51 | **83,0%** |
| Embaixador | Cartao | 4.800 | R$19,20 | R$5,17 | R$95,53 | **79,7%** |

### 3.5 Impacto do Componente Fixo (R$0,39) nos Pacotes Menores

O componente fixo do cartao de credito e regressivo — pesa mais nos pacotes mais baratos:

| Pacote | Preco | R$0,39 como % do preco | Observacao |
|---|---|---|---|
| Explorador | R$14,90 | **2,62%** | Impacto significativo |
| Navegador | R$29,90 | **1,30%** | Impacto moderado |
| Cartografo | R$59,90 | **0,65%** | Impacto baixo |
| Embaixador | R$119,90 | **0,33%** | Negligivel |

**Conclusao**: O pacote Explorador sofre mais com cartao de credito. PIX elimina completamente este problema por nao ter componente fixo.

---

## 4. Delta de Infraestrutura — Sprint 37

| Componente | Sprint 36 | Sprint 37 | Delta Mensal |
|---|---|---|---|
| Vercel | $0 (Hobby) | $0 (Hobby) | $0 |
| PostgreSQL (Neon) | $0-5 | $0-5 | $0 |
| Redis (Upstash) | $0 (Free) | $0 (Free) | $0 |
| Anthropic API | ~$0,128/exp | ~$0,128/exp | $0 |
| Stripe | $0 (mock) | $0 (sem mensalidade) | $0 |
| Stripe SDK (`@stripe/stripe-js`) | — | ~50KB gzip bundle | $0 |
| **Total Delta Fixo** | | | **$0,00** |

### 4.1 Stripe nao adiciona custo fixo

- Sem mensalidade
- Sem custo de setup
- Sem custo de webhook
- Sem custo de dashboard
- Unico custo: taxa variavel por transacao (cobrada apenas quando ha receita)

Isto significa que Stripe tem **custo zero em meses sem vendas** — risco financeiro nulo para a fase pre-lancamento.

### 4.2 Impacto no Bundle Size

| Item | Tamanho | Carregamento |
|---|---|---|
| `@stripe/stripe-js` | ~50KB gzip | Lazy load na pagina de compra |
| `@stripe/react-stripe-js` | ~15KB gzip | Lazy load na pagina de compra |
| Stripe.js (externo) | ~100KB | Carregado do CDN Stripe (js.stripe.com) |

**Mitigacao**: Usar `loadStripe()` com lazy import. Stripe.js so carrega quando o usuario abre a pagina de compra. Zero impacto em LCP/FCP das demais paginas.

---

## 5. Projecao de Receita por Cenario

### 5.1 Premissas dos Cenarios

| Parametro | Valor | Justificativa |
|---|---|---|
| Taxa de conversao | 5% | Benchmark freemium mobile latam |
| Mix de pagamento | 70% PIX / 30% cartao | Tendencia mercado brasileiro 2026 |
| Distribuicao de pacotes | 40% Explorador / 30% Navegador / 20% Cartografo / 10% Embaixador | Distribuicao long-tail tipica |
| Frequencia de compra | 1x/mes (casual) | Conservador |
| Breakage | 20% | Benchmark moedas virtuais |

### 5.2 Ticket Medio Ponderado

```
Ticket medio = (0,40 x R$14,90) + (0,30 x R$29,90) + (0,20 x R$59,90) + (0,10 x R$119,90)
             = R$5,96 + R$8,97 + R$11,98 + R$11,99
             = R$38,90
```

### 5.3 Taxa Stripe Media Ponderada

**PIX (70% do volume):**
```
Taxa PIX media = R$38,90 x 0,99% = R$0,39
```

**Cartao (30% do volume):**
```
Taxa cartao media = R$38,90 x 3,99% + R$0,39 = R$1,55 + R$0,39 = R$1,94
```

**Taxa ponderada:**
```
Taxa media = (0,70 x R$0,39) + (0,30 x R$1,94) = R$0,27 + R$0,58 = R$0,85/transacao
```

### 5.4 Projecao — 100 Usuarios Totais

| Metrica | Valor |
|---|---|
| Usuarios totais | 100 |
| Compradores (5%) | 5 |
| Receita bruta/mes | 5 x R$38,90 = **R$194,50** |
| Taxa Stripe total/mes | 5 x R$0,85 = **R$4,25** |
| Custo IA total/mes (80% breakage) | 5 x R$6,90 = **R$34,50** |
| Custo infra fixo/mes | ~R$26 ($5 x 5,20) |
| **Custo total/mes** | **R$64,75** |
| **Receita liquida/mes** | **R$129,75** |
| **Margem operacional** | **66,7%** |

### 5.5 Projecao — 500 Usuarios Totais

| Metrica | Valor |
|---|---|
| Usuarios totais | 500 |
| Compradores (5%) | 25 |
| Receita bruta/mes | 25 x R$38,90 = **R$972,50** |
| Taxa Stripe total/mes | 25 x R$0,85 = **R$21,25** |
| Custo IA total/mes | 25 x R$6,90 = **R$172,50** |
| Custo infra fixo/mes | ~R$104 ($20 x 5,20) |
| **Custo total/mes** | **R$297,75** |
| **Receita liquida/mes** | **R$674,75** |
| **Margem operacional** | **69,4%** |

### 5.6 Projecao — 1.000 Usuarios Totais

| Metrica | Valor |
|---|---|
| Usuarios totais | 1.000 |
| Compradores (5%) | 50 |
| Receita bruta/mes | 50 x R$38,90 = **R$1.945,00** |
| Taxa Stripe total/mes | 50 x R$0,85 = **R$42,50** |
| Custo IA total/mes | 50 x R$6,90 = **R$345,00** |
| Custo infra fixo/mes | ~R$156 ($30 x 5,20) |
| **Custo total/mes** | **R$543,50** |
| **Receita liquida/mes** | **R$1.401,50** |
| **Margem operacional** | **72,1%** |

### 5.7 Tabela Comparativa

| Escala | Receita/mes | Custo/mes | Lucro/mes | Margem Op. | ARR (BRL) |
|---|---|---|---|---|---|
| 100 usuarios | R$194,50 | R$64,75 | R$129,75 | 66,7% | R$1.557 |
| 500 usuarios | R$972,50 | R$297,75 | R$674,75 | 69,4% | R$8.097 |
| 1.000 usuarios | R$1.945,00 | R$543,50 | R$1.401,50 | 72,1% | R$16.818 |
| 5.000 usuarios | R$9.725,00 | R$2.417,50 | R$7.307,50 | 75,1% | R$87.690 |
| 10.000 usuarios | R$19.450,00 | R$4.585,00 | R$14.865,00 | 76,4% | R$178.380 |

---

## 6. Analise PIX vs Cartao — Recomendacao

### 6.1 Vantagens do PIX como Default

| Dimensao | PIX | Cartao | Vencedor |
|---|---|---|---|
| Taxa percentual | 0,99% | 3,99% | **PIX** (4x menor) |
| Componente fixo | R$0,00 | R$0,39 | **PIX** |
| Chargeback | Impossivel | R$65/disputa | **PIX** |
| Liquidacao | D+2 | D+31 | **PIX** (15x mais rapido) |
| Margem Explorador | 85,6% | 80,0% | **PIX** (+5,6pp) |
| Margem Embaixador | 79,0% | 75,7% | **PIX** (+3,3pp) |
| Conversao | Instant (QR) | Form input | Empate* |
| Recorrencia | Manual | Automatizavel | **Cartao** |

*PIX tem alta adocao no Brasil (>70% da populacao adulta), compensando a fricao do QR code.

### 6.2 Economia Anual por Priorizacao de PIX

Assumindo 1.000 usuarios, 50 compras/mes, mix 70/30 PIX/cartao vs 30/70 PIX/cartao:

| Cenario | Taxa media/tx | Taxa total/mes | Economia anual vs 30/70 |
|---|---|---|---|
| 70% PIX / 30% cartao | R$0,85 | R$42,50 | **Referencia** |
| 30% PIX / 70% cartao | R$1,47 | R$73,50 | — |
| **Delta** | | | **R$372,00/ano** |

Com 5.000 usuarios: economia de **R$1.860,00/ano** ao priorizar PIX.

### 6.3 Risco de Chargeback

Com cartao de credito, cada chargeback custa R$65 independente do valor da compra:

| Pacote | Preco | Chargeback | Perda total (preco + taxa + PA creditado) |
|---|---|---|---|
| Explorador | R$14,90 | R$65,00 | R$79,90 + PA ja creditado |
| Navegador | R$29,90 | R$65,00 | R$94,90 + PA ja creditado |

**Um unico chargeback do Explorador anula o lucro de 6-7 vendas PIX desse pacote.** PIX elimina este risco completamente.

### 6.4 Recomendacao Final

**PIX como metodo de pagamento padrao (default selecionado na UI).**

Razoes:
1. Margem 4-6pp superior em todos os pacotes
2. Zero risco de chargeback (economia de R$65/disputa)
3. Liquidacao D+2 vs D+31 (fluxo de caixa 15x mais rapido)
4. Alta adocao no Brasil (>150 milhoes de usuarios PIX)
5. UX simplificada (QR code escaneavel, sem digitacao de cartao)

Cartao de credito deve ser oferecido como segunda opcao para usuarios que preferem parcelamento futuro ou nao tem PIX configurado.

---

## 7. Impacto no Break-Even

### 7.1 Break-Even Atualizado (com Stripe)

**Cenario mix realista (70% free, 20% casual Explorador, 10% power Navegador):**

Para cada 100 usuarios:
- 70 free: custo IA ~R$1,46/mes, receita R$0
- 20 casual (1 Explorador/trimestre): receita R$99,33/mes, custo R$5,00/mes, Stripe R$1,48/mes
- 10 power (1 Navegador/mes): receita R$299,00/mes, custo R$48,00/mes, Stripe R$8,50/mes

```
Receita total/mes:      R$398,33
Custo IA total/mes:     R$54,46
Custo Stripe total/mes: R$9,98
Custo infra fixo/mes:   R$26,00
---
Lucro/mes:              R$307,89 (77,3%)
```

**Break-even com Stripe: ~21 usuarios pagantes** (vs ~22 sem Stripe em SPEC-COST-006).

A diferenca e minima porque as taxas Stripe sao pequenas frente a margem bruta.

### 7.2 Comparacao Pre/Pos Stripe

| Metrica | Sem Stripe (mock) | Com Stripe (real) | Delta |
|---|---|---|---|
| Margem Explorador PIX | 86,6% | 85,6% | -1,0pp |
| Margem Explorador Cartao | 86,6% | 80,0% | -6,6pp |
| Margem Navegador PIX | 83,9% | 82,9% | -1,0pp |
| Margem Navegador Cartao | 83,9% | 78,7% | -5,2pp |
| Break-even (usuarios pagantes) | ~20 | ~21 | +1 |
| Custo fixo adicional | $0 | $0 | $0 |

---

## 8. Custos de Implementacao (Sprint 37)

### 8.1 Dependencias Novas

| Pacote | Versao | Tamanho | Licenca | Custo |
|---|---|---|---|---|
| `stripe` (Node SDK) | ^17.x | ~200KB | MIT | $0 |
| `@stripe/stripe-js` | ^4.x | ~50KB gzip | MIT | $0 |
| `@stripe/react-stripe-js` | ^3.x | ~15KB gzip | MIT | $0 |

### 8.2 Variaveis de Ambiente Novas

| Variavel | Descricao | Gestao |
|---|---|---|
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | Secrets Manager / env |
| `STRIPE_PUBLISHABLE_KEY` | Chave publica Stripe | env (exposta ao client) |
| `STRIPE_WEBHOOK_SECRET` | Segredo para validar webhooks | Secrets Manager / env |
| `PAYMENT_PROVIDER` | `"stripe"` (substitui `"mock"`) | env |

### 8.3 Custos de Desenvolvimento

| Item | Custo |
|---|---|
| Claude Code (dev) | $20-100/mes (ja incluso) |
| Stripe test mode | $0 (ilimitado) |
| Stripe production activation | $0 |
| **Total adicional** | **$0** |

---

## 9. Riscos Financeiros

| ID | Risco | Prob. | Impacto | Mitigacao |
|---|---|---|---|---|
| RISK-S37-001 | Chargebacks em cartao | Media | R$65/disputa | 3D Secure obrigatorio; PA nao-transferivel; PIX prioritario |
| RISK-S37-002 | Fraude de cartao | Baixa | Perda do valor + chargeback | Stripe Radar (incluso); verificacao de email |
| RISK-S37-003 | Webhook delivery failure | Baixa | PA nao creditado | Idempotency key; retry com backoff; reconciliacao manual |
| RISK-S37-004 | Cambio BRL/USD desfavoravel | Media | Margem comprimida | Custos de IA em USD, receita em BRL — monitorar trimestralmente |
| RISK-S37-005 | Stripe indisponivel | Muito Baixa | Vendas bloqueadas | MockProvider como fallback? Ou graceful degradation na UI |
| RISK-S37-006 | PA creditado sem pagamento confirmado | Critica | Perda financeira | NUNCA creditar PA antes do webhook `payment_intent.succeeded` |

### 9.1 Mitigacao de Chargeback — Detalhamento

Custo medio de um chargeback: R$65 + valor da compra + PA ja consumido.

| Acao | Tipo | Impacto |
|---|---|---|
| PIX como default | Preventiva | Elimina chargebacks para 70%+ das transacoes |
| 3D Secure em todos os cartoes | Preventiva | Reduz fraude em ~80% (liability shift) |
| Limitar PA credit a webhook confirmado | Preventiva | Impede credito sem pagamento |
| PA nao-transferivel | Estrutural | Sem incentivo para fraude (PA so serve para o proprio usuario) |
| Rate limit: 5 compras/hr (SEC-036-012) | Preventiva | Limita velocidade de ataque |
| Refund window 7 dias | Estrutural | Reduz motivacao para chargeback |

---

## 10. Metricas de Monitoramento (Sprint 37+)

### 10.1 KPIs Financeiros

| Metrica | Target | Alerta |
|---|---|---|
| Margem bruta media (pos-Stripe) | >78% | <75% |
| Mix PIX/cartao | >60% PIX | <50% PIX |
| Taxa de chargeback | <0,5% | >1% (urgente >2%) |
| ARPU (avg revenue per paying user) | >R$25/mes | <R$15/mes |
| Conversion rate (free→pago) | >5% | <3% |
| PA breakage rate | 15-25% | <10% (inflacao) ou >40% (valor percebido baixo) |
| Time to first purchase | <30 dias | >60 dias |

### 10.2 Instrumentacao Recomendada

| Evento | Payload | Destino |
|---|---|---|
| `purchase.initiated` | packageId, method (pix/card), userId | Logs + analytics |
| `purchase.completed` | packageId, method, amount, stripeFee, netRevenue | Logs + analytics |
| `purchase.failed` | packageId, method, reason | Logs + alertas |
| `chargeback.received` | purchaseId, amount, reason | Logs + alerta imediato |
| `refund.processed` | purchaseId, amount, paReturned | Logs + analytics |

---

## 11. Comparacao com Alternativas a Stripe

### 11.1 Por que Stripe (confirmacao)

| Criterio | Stripe | MercadoPago | PagSeguro | iugu |
|---|---|---|---|---|
| PIX | 0,99% | 0,99% | 1,19% | 0,98% |
| Cartao | 3,99% + R$0,39 | 4,99% | 4,99% | 3,49% + R$0,70 |
| SDK Next.js | Excelente | Basico | Basico | Razoavel |
| Webhooks | Robusto, retry | OK | OK | OK |
| Docs/DX | Referencia | Bom | Razoavel | Bom |
| Expansao internacional | Global | LATAM | Brasil | Brasil |
| PCI compliance | Full (Elements) | Full | Full | Full |

**Decisao**: Stripe permanece a melhor opcao por DX, SDK quality, e expansao internacional futura. A taxa de cartao e competitiva e a de PIX e padrao de mercado.

---

## 12. Compliance Fiscal

### 12.1 Obrigacoes

| Obrigacao | Status Sprint 37 | Notas |
|---|---|---|
| Nota Fiscal de Servico (NFS-e) | Fora do escopo | Necessario antes de faturamento real |
| Receipt/comprovante ao usuario | **Obrigatorio** | Email com detalhes da compra |
| Retencao de ISS | A definir | Depende do municipio de registro |
| CDC (Codigo Defesa Consumidor) | Refund 7 dias ja previsto | SPEC-ARCH-030 Section 5 |

### 12.2 Recomendacao

O MVP pode operar sem NFS-e automatica desde que:
1. Comprovante de compra seja enviado por email apos `purchase.completed`
2. Termos de uso incluam clausula sobre moeda virtual (PA nao e dinheiro)
3. Politica de reembolso esteja visivel antes da compra

NFS-e automatica deve ser priorizada para Sprint 38-39 (ex: Nota Facil, eNotas, ou API prefeitura).

---

## 13. Recomendacoes Sprint 37

| ID | Recomendacao | Prioridade | Impacto |
|---|---|---|---|
| REC-S37-001 | PIX como metodo padrao na UI (pre-selecionado) | **CRITICA** | +4-6pp margem |
| REC-S37-002 | Webhook `payment_intent.succeeded` idempotente | **CRITICA** | Previne double-credit |
| REC-S37-003 | 3D Secure obrigatorio em cartao | ALTA | Liability shift, -80% fraude |
| REC-S37-004 | Lazy load Stripe.js (apenas na pagina de compra) | ALTA | Zero impacto em perf global |
| REC-S37-005 | Comprovante por email apos compra | ALTA | Compliance fiscal minima |
| REC-S37-006 | Dashboard de metricas financeiras (admin) | MEDIA | Visibilidade de revenue |
| REC-S37-007 | Stripe Radar ativo (anti-fraude incluso) | MEDIA | Protecao automatica |
| REC-S37-008 | Alertas de chargeback via webhook | MEDIA | Resposta rapida a disputas |
| REC-S37-009 | Reconciliacao Stripe vs DB (cron semanal) | BAIXA | Detecta inconsistencias |
| REC-S37-010 | NFS-e automatica (Sprint 38-39) | MEDIA | Compliance fiscal completa |

---

## 14. Veredito

**APROVADO — Risco Financeiro Minimo, Modelo de Receita Validado**

Sprint 37 substitui o mock por Stripe real sem custos fixos adicionais. A taxa variavel por transacao (0,99-3,99%) reduz a margem bruta em apenas 1-6,6 pontos percentuais dependendo do metodo de pagamento. Com PIX como default (recomendacao principal), a margem liquida permanece acima de 79% em todos os pacotes — saudavel para um SaaS B2C.

| KPI | Valor |
|---|---|
| Margem liquida media (PIX) | **82,0%** |
| Margem liquida media (Cartao) | **77,8%** |
| Margem liquida media (mix 70/30) | **80,7%** |
| Break-even | ~21 usuarios pagantes |
| Custo fixo incremental | $0,00 |
| Custo variavel | 0,99-3,99% + R$0-0,39 por transacao |
| Recomendacao #1 | PIX como default |

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-23 | Criacao inicial — Sprint 37 Stripe payment integration cost assessment |
