# SPEC-COST-006: Sprint 36 Cost Assessment — WizardFooter Global + Gamification Wave 2

**Version**: 1.0.0
**Status**: Draft
**Author**: finops-engineer
**Reviewers**: tech-lead, architect
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Baseline**: v0.30.0 (Sprint 35 — Gamification Wave 1 MVP)

---

## 1. Resumo Executivo

Sprint 36 e o primeiro sprint onde o Atlas introduz um modelo de receita (pacotes PA). O custo incremental de infraestrutura e proximo de zero, enquanto a economia PA cria margens superiores a 80% em todos os pacotes. O risco financeiro e minimo.

- **Total incremental infra cost**: ~$0.00
- **Receita projetada (se pacotes ativos)**: R$14.90-119.90/transacao com margem >80%
- **Stripe nao integrado neste sprint** — receita real comeca Sprint 37+

---

## 2. Analise de Custo por Feature

### 2.1 WizardFooter Global

| Dimensao | Impacto |
|---|---|
| Frontend | Puro client-side: form hash (djb2), dialog state machine |
| Backend | Reutiliza server actions existentes — nenhuma nova action |
| DB | Zero queries adicionais |
| Redis | Zero operacoes adicionais |
| AI | Zero chamadas de IA |
| **Custo incremental** | **$0.00** |

### 2.2 Sistema de Badges

| Dimensao | Impacto |
|---|---|
| Frontend | Componentes React puros |
| Backend | Badge evaluation event-driven, executa apenas em triggers |
| DB | 1 query UserBadge por trigger (INSERT ON CONFLICT DO NOTHING) |
| Redis | Cache ~500 bytes/usuario, TTL padrao |
| AI | Zero |
| **Custo incremental** | **~$0.00** (negligivel) |

Armazenamento: 16 badges x 1000 usuarios x 3 badges/usuario = 3000 rows x 100 bytes = ~300KB.

### 2.3 Pacotes PA (Mock Gateway)

| Dimensao | Impacto |
|---|---|
| Frontend | UI de pacotes, modal, confirmacao |
| Backend | Mock payment — sem gateway real |
| DB | 1 INSERT PointTransaction + 1 UPDATE UserProgress por compra |
| Stripe | NAO INTEGRADO neste sprint |
| **Custo incremental** | **$0.00** |

---

## 3. Modelo de Receita — Analise de Margem

### 3.1 Custo Real de IA por Expedicao

| Feature de IA | Modelo | Custo PA | Tokens Input (est.) | Tokens Output (est.) | Custo API (USD) |
|---|---|---|---|---|---|
| Checklist (ai_route) | Haiku 4.5 | 30 PA | ~1.500 | ~2.000 | ~$0.012 |
| Guia do Destino (ai_accommodation) | Haiku 4.5 | 50 PA | ~2.000 | ~3.000 | ~$0.017 |
| Roteiro (ai_itinerary) | Sonnet 4.6 | 80 PA | ~3.000 | ~6.000 | ~$0.099 |
| **Total por expedicao** | | **160 PA** | | | **~$0.128** |

**Custo por PA**: 1 PA = R$0.004 em custo de IA (R$0.64 / 160 PA)

### 3.2 Margem Bruta por Pacote (Sem Payment Processing)

| Pacote | PA | Preco (BRL) | Expedicoes Equiv. | Custo IA Max (BRL) | Margem Bruta | Margem % |
|---|---|---|---|---|---|---|
| Explorador | 500 | R$14,90 | 3,1 | R$2,00 | R$12,90 | 86,6% |
| Navegador | 1.200 | R$29,90 | 7,5 | R$4,80 | R$25,10 | 83,9% |
| Cartografo | 2.800 | R$59,90 | 17,5 | R$11,20 | R$48,70 | 81,3% |
| Embaixador | 6.000 | R$119,90 | 37,5 | R$24,00 | R$95,90 | 80,0% |

**Nota**: Margem assume 100% do PA gasto em IA (worst case). Breakage tipico 15-30% eleva margem real a >85%.

### 3.3 Margem com Breakage (20% nao utilizado)

| Pacote | PA Gasto (80%) | Custo IA Real | Margem Ajustada % |
|---|---|---|---|
| Explorador | 400 | R$1,60 | 89,3% |
| Navegador | 960 | R$3,84 | 87,2% |
| Cartografo | 2.240 | R$8,96 | 85,0% |
| Embaixador | 4.800 | R$19,20 | 84,0% |

### 3.4 PA Organico vs. Comprado

PA organico por primeira expedicao completa: **1.700 PA** (boas-vindas 180 + fases 665 + perfil 275 + preferencias 80 + avaliacao 500). Cobre ~10 expedicoes antes de comprar. Cenario conservador: 5-10% conversao nos primeiros 6 meses.

---

## 4. Projecao Stripe (Sprint 37+)

### 4.1 Taxas Stripe Brasil

| Item | Taxa |
|---|---|
| Cartao credito | 3,99% + R$0,39 |
| Pix | 0,99% (sem fixo) |
| Chargebacks | R$65,00/disputa |

### 4.2 Margem Liquida — Cartao

| Pacote | Preco | Taxa Stripe | Custo IA Max | Receita Liquida | Margem % |
|---|---|---|---|---|---|
| Explorador | R$14,90 | R$0,98 | R$2,00 | R$11,92 | 80,0% |
| Navegador | R$29,90 | R$1,58 | R$4,80 | R$23,52 | 78,7% |
| Cartografo | R$59,90 | R$2,78 | R$11,20 | R$45,92 | 76,7% |
| Embaixador | R$119,90 | R$5,17 | R$24,00 | R$90,73 | 75,7% |

### 4.3 Margem Liquida — Pix

| Pacote | Preco | Taxa Pix | Custo IA Max | Receita Liquida | Margem % |
|---|---|---|---|---|---|
| Explorador | R$14,90 | R$0,15 | R$2,00 | R$12,75 | 85,6% |
| Navegador | R$29,90 | R$0,30 | R$4,80 | R$24,80 | 82,9% |
| Cartografo | R$59,90 | R$0,59 | R$11,20 | R$48,11 | 80,3% |
| Embaixador | R$119,90 | R$1,19 | R$24,00 | R$94,71 | 79,0% |

**Recomendacao**: Priorizar Pix — diferenca de +4-6pp em margem.

---

## 5. Delta de Infraestrutura

| Componente | Atual | Sprint 36 | Delta |
|---|---|---|---|
| Vercel | $0 (Hobby) | $0 | $0 |
| PostgreSQL | $0-5/mes | $0-5/mes | $0 |
| Redis | $0 (Free) | $0 (Free) | $0 |
| Anthropic API | ~$0.128/exp | ~$0.128/exp | $0 |
| Stripe | N/A | $0 (mock) | $0 |
| **Total Delta** | | | **$0.00** |

---

## 6. Projecao em Escala

### Custos Mensais (Pos-Stripe)

| Escala | Usuarios | Exp/mes | Custo IA (USD) | Infra (USD) | Total (USD) |
|---|---|---|---|---|---|
| MVP | 100 | 200 | ~$25 | ~$5 | ~$30 |
| Crescimento | 1.000 | 2.000 | ~$256 | ~$20 | ~$276 |
| Escala | 10.000 | 20.000 | ~$2.560 | ~$100 | ~$2.660 |

### Receita (5% Conversao)

| Escala | Compradores/mes | Ticket Medio | Receita/mes | Custo/mes | Resultado |
|---|---|---|---|---|---|
| MVP | 5 | R$29,90 | R$149,50 | ~R$150 | ~Breakeven |
| Crescimento | 50 | R$29,90 | R$1.495 | ~R$1.380 | +R$115 |
| Escala | 500 | R$29,90 | R$14.950 | ~R$13.300 | +R$1.650 |

---

## 7. Riscos Financeiros

| Risco | Prob. | Impacto | Mitigacao |
|---|---|---|---|
| Abuso de regeneracao | Media | Baixo | Rate limit; PA finito |
| Inflacao PA organico | Alta | Medio | Monitorar ratio organico/gasto |
| Breakage excessivo | Baixa | Misto | Comunicacao proativa de saldo |
| Chargebacks (Sprint 37+) | Baixa | R$65/cb | 3D Secure; PA nao-transferivel |
| Custo Anthropic aumenta | Baixa | Medio | Haiku em 2/3 features; prompt caching |

---

## 8. Recomendacoes

### Sprint 36

| ID | Recomendacao | Prioridade |
|---|---|---|
| REC-S36-001 | Instrumentar metricas PA: logar emitido/gasto por tipo | ALTA |
| REC-S36-002 | Mock payment simular Stripe response shape | MEDIA |
| REC-S36-003 | Testar edge case saldo negativo | ALTA |
| REC-S36-004 | Precos de pacotes nao em constantes client-side | MEDIA |

### Sprint 37

| ID | Recomendacao | Prioridade |
|---|---|---|
| REC-S37-001 | Pix como metodo padrao: +5pp margem | ALTA |
| REC-S37-002 | Webhook idempotente para payment_intent.succeeded | CRITICA |
| REC-S37-003 | Receipt/invoice para compliance fiscal | ALTA |
| REC-S37-004 | Monitorar ratio PA organico/comprado | MEDIA |

---

## 9. Veredito

**APROVADO — Custo Zero + Modelo de Receita Saudavel**

Sprint 36 nao introduz custos incrementais. Margens brutas 80-87%, liquidas 76-86%. Breakeven ~100 usuarios ativos com 5% conversao. Principal risco: inflacao PA organico.

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — Sprint 36 cost assessment |
