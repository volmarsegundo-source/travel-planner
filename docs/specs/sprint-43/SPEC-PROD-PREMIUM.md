---
spec_id: SPEC-PROD-043-001
title: "Plano Premium + Loja Atlas — Assinatura Mensal/Anual, Multidestinos e Store Page"
version: 1.0.0
status: Draft
sprint: 43
owner: product-owner
reviewers: [tech-lead, ux-designer, architect, finops-engineer, security-specialist, prompt-engineer]
created: 2026-04-10
updated: 2026-04-10
moscow: Must Have
effort: XL
personas: [leisure-solo, leisure-family, business-traveler, bleisure]
gamification_reference: docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md
finops_reference: docs/finops/SPRINT-42-FINOPS-REVIEW.md
related_specs: [SPEC-PROD-039, SPEC-PROD-041, SPEC-PROD-043, SPEC-PROD-044, SPEC-PROD-045]
---

# SPEC-PROD-043-001: Plano Premium + Loja Atlas

> Este documento define o modelo de assinatura Premium do Atlas Travel Planner, incluindo
> os limites do plano Free, os beneficios do plano Premium, o fluxo de monetizacao, a pagina
> de loja (/loja), e a integracao com Mercado Pago como gateway primario. Em caso de conflito
> com specs anteriores sobre PA, limites de expedicao ou comportamento de IA, este documento
> prevalece para as dimensoes de assinatura. Dimensoes de PA puro (compra avulsa) permanecem
> governadas pelo ATLAS-GAMIFICACAO-APROVADO.md.

---

## 1. Declaracao do Problema

### 1.1 Por que Premium agora?

O Atlas chegou ao Sprint 43 com tres sinais claros que justificam a introducao de um plano
pago estruturado:

**Sinal 1 — Usuarios heavy trafegam para o teto free antes de converter**
O modelo atual oferece apenas compra avulsa de PA (pacotes R$14,90–R$119,90). Usuarios que
planejam 3–5 viagens por mes atingem o teto de 3 expedicoes ativas e sao bloqueados sem uma
oferta clara de upgrade. Resultado: abandono ou acumulo de expedicoes arquivadas — nao
conversao monetaria. O teto de expedicoes ativas serve de barreira de engajamento mas nao de
funil de receita estruturado.

**Sinal 2 — Multidestinos e a feature mais solicitada por usuarios avancados**
Usuários que planejam road trips, interrail ou "multi-city" precisam de suporte a 2–4 destinos
por expedicao. Hoje o wizard aceita apenas 1 destino (Phase 1 "O Chamado"). Entregar
multidestinos exclusivamente para Premium cria um gatilho de upgrade organico — o usuario
que precisa da feature entende imediatamente o valor do plano.

**Sinal 3 — Receita previsivel vs receita transacional**
Compras avulsas de PA geram receita irregular e dificil de projetar. Uma assinatura mensal
de R$29,90 cria MRR (Monthly Recurring Revenue) previsivel, base para projecoes de runway
e decisoes de investimento. A margem bruta validada no Sprint 42 (>9.000% com Gemini Flash)
confirma que o modelo e financeiramente sustentavel com ampla margem de segurança.

### 1.2 Custo de nao agir

Sem Premium: cada usuario heavy que atinge o teto de 3 expedicoes ativas tem tres opcoes —
arquivar, abandonar, ou comprar PA avulso. O fluxo de compra avulsa e transacional e nao
captura a disposicao de pagar de usuarios que retornam mensalmente. A janela para estabelecer
pricing de assinatura antes de concorrentes (Lambus, Roadtrippers, TripIt) implementarem
AI-powered planning e estimada em 2–3 sprints.

---

## 2. Contexto Economico

### 2.1 Margem bruta validada (fonte: SPRINT-42-FINOPS-REVIEW.md)

| Stack de IA | Custo por expedicao | Receita por expedicao (160 PA) | Margem |
|---|---:|---:|---:|
| Gemini Flash (primario) | $0,005 | $0,783 | 15.560% |
| Hybrid Gemini + Haiku fallback | $0,008 | $0,783 | 9.688% |
| Haiku (fallback) | $0,047 | $0,783 | 1.565% |
| Sonnet opt-in premium (+50 PA) | $0,177 + $0,100 | $1,027 | 342% |

**Conclusao FinOps Sprint 42**: a margem suporta 1.500 PA mensais gratuitos para Premium
sem risco financeiro, desde que o consumo medio de IA por usuario Premium fique dentro dos
parametros abaixo (Secao 6).

### 2.2 Conversao de PA para BRL/USD

Cambio referencia: R$5,00 = $1,00 (fonte: ATLAS-GAMIFICACAO-APROVADO.md §11.2)

| Pacote | PA | Preco | USD | $/PA |
|---|---:|---:|---:|---:|
| Explorador | 500 | R$ 14,90 | $2,98 | $0,00596 |
| Navegador | 1.200 | R$ 29,90 | $5,98 | $0,00498 |
| Cartografo | 2.800 | R$ 59,90 | $11,98 | $0,00428 |
| Embaixador | 6.000 | R$ 119,90 | $23,98 | $0,00400 |
| **Premium mensal** | **1.500** | **R$ 29,90** | **$5,98** | **$0,00399** |
| **Premium anual** | **1.500/mes** | **R$ 299/ano** | **$59,80/ano** | **$0,00332/PA** |

---

## 3. Historias de Usuario

### US-P01 — Usuario heavy que atingiu o teto de expedicoes

```
As a @leisure-solo frequent planner who has 3 active expeditions,
I want to upgrade to Premium so that I can create a new expedition
without archiving an existing one.
```

**Contexto do viajante**:
- Dor: bloqueio ao clicar em "Nova Expedicao" — mensagem "Limite atingido (3/3)"
- Workaround atual: arquivar uma expedicao ativa para abrir slot — perda de contexto
- Frequencia: toda vez que planeja uma nova viagem enquanto tem expedicoes em andamento

**Criterios de aceite (Gherkin)**:

```gherkin
Scenario: Upsell ao atingir limite de expedicoes ativas
  Given o usuario Free tem 3 expedicoes ativas (nao arquivadas)
  When o usuario clica em "Nova Expedicao"
  Then o sistema exibe o modal de upsell Premium
    And o modal exibe a comparacao Free (3 ativas) vs Premium (ilimitadas)
    And o modal oferece botao "Assinar Premium" e link "Arquivar uma expedicao"
    And o modal NAO bloqueia o acesso ao restante do app

Scenario: Usuario Premium cria expedicao sem limite
  Given o usuario tem assinatura Premium ativa
  When o usuario clica em "Nova Expedicao"
  Then o wizard inicia normalmente
    And nenhum bloqueio ou aviso de limite e exibido
```

---

### US-P02 — Familia planejando road trip multi-cidade

```
As a @leisure-family planning a 4-city road trip through Brazil,
I want to add multiple destinations to a single expedition so that
I can manage the entire trip in one place instead of 4 separate expeditions.
```

**Contexto do viajante**:
- Dor: precisa criar 4 expedicoes separadas para um road trip (Sao Paulo → Curitiba →
  Florianopolis → Porto Alegre), perdendo a visao consolidada da viagem
- Workaround atual: planilha Excel paralela para consolidar ou 4 expedicoes desconectadas
- Frequencia: qualquer viagem com 2+ destinos — estima-se 35–40% das viagens de familia
  envolvem multidestinos (fonte: pesquisa Skift 2024 sobre planejamento familiar)

**Criterios de aceite (Gherkin)**:

```gherkin
Scenario: Usuario Free tenta adicionar segundo destino
  Given o usuario Free esta na Phase 1 "O Chamado"
  When o usuario tenta adicionar um segundo destino
  Then o sistema exibe tooltip/banner "Multidestinos disponivel no Premium"
    And oferece CTA "Conhecer o Premium" que leva a /loja#premium
    And permite continuar com 1 destino sem bloquear a expedicao

Scenario: Usuario Premium adiciona ate 4 destinos
  Given o usuario tem assinatura Premium ativa
  When o usuario esta na Phase 1 "O Chamado"
  Then o sistema exibe o campo de destino multiplo (max 4 cidades)
    And cada destino tem campo de datas proprias (check-in / check-out)
    And o campo exibe indicador "Destino 1 de 4", "Destino 2 de 4", etc.
    And ao atingir 4 destinos, o botao "Adicionar destino" e desabilitado
      com tooltip "Limite de 4 destinos por expedicao"
```

---

### US-P03 — Nomade digital com multiplas expedicoes simultaneas

```
As a @bleisure digital nomad managing 5+ simultaneous trip plans,
I want unlimited active expeditions and a monthly PA refresh so that
I can plan continuously without running out of points or slots.
```

**Contexto do viajante**:
- Dor: o modelo pay-as-you-go exige compra de PA em momentos imprevistos, interrompendo
  o fluxo de planejamento; o limite de 3 expedicoes ativas e insuficiente para o ritmo
  de viagem de um nomade digital
- Workaround atual: compra de pacote Cartografo (2.800 PA/R$59,90) mensalmente —
  gastando mais do que o Premium anual custaria
- Frequencia: toda nova expedicao que exige geracao de IA

**Criterios de aceite (Gherkin)**:

```gherkin
Scenario: PA mensal Premium creditado no ciclo de cobranca
  Given o usuario tem assinatura Premium ativa (mensal ou anual)
  When o ciclo de cobranca se renova (data de aniversario da assinatura)
  Then o sistema credita 1.500 PA na conta do usuario
    And se o saldo atual do usuario e menor que 1.500 PA:
      Then saldo e elevado para 1.500 PA (replace, nao adiciona)
    And se o saldo atual do usuario e maior ou igual a 1.500 PA:
      Then o sistema adiciona PA ate o teto de 1.500 PA
      And se o saldo ja e >= 1.500 PA, nenhum PA e adicionado neste ciclo
    And uma entrada de transacao "Recarga Premium Mensal" aparece no historico
    And o lifetime totalPoints NAO e incrementado por esta recarga
      (PA Premium contam como availablePoints apenas, preservando integridade de rank)

Scenario: PA Premium expiram sem rollover
  Given o usuario Premium tem 800 PA no fim do ciclo
  When o ciclo de cobranca renova
  Then o saldo e elevado para 1.500 PA (800 → 1.500, nao 800 + 1.500 = 2.300)
    And o saldo nao ultrapassa 1.500 PA por efeito da recarga Premium
```

---

### US-P04 — Usuario casual avaliando o upgrade

```
As a @leisure-solo casual user considering Premium,
I want to try the plan free for 7 days with no credit card required
so that I can experience the benefits before committing financially.
```

**Contexto do viajante**:
- Dor: receio de pagar por algo que nao atende suas necessidades de viajante ocasional
  (1–2 viagens/ano); barreira psicologica ao fornecer cartao antes de experimentar
- Workaround atual: nao converte — permanece Free ou compra PA avulso pontualmente
- Frequencia: decisao de upgrade tipicamente ocorre apos 2–4 sessoes de uso intenso

**Criterios de aceite (Gherkin)**:

```gherkin
Scenario: Inicio de trial sem cartao de credito
  Given o usuario Free nunca teve assinatura Premium
  When o usuario acessa /loja e clica em "Experimentar gratis por 7 dias"
  Then o sistema ativa o plano Premium Trial por 7 dias sem solicitar dados de pagamento
    And exibe banner persistente "Trial encerra em X dias — Assine para continuar"
    And envia email de lembrete no dia 5 do trial

Scenario: Conversao ao fim do trial
  Given o usuario esta no dia 7 do trial Premium
  When o trial encerra
  Then o sistema reverte o usuario para o plano Free automaticamente
    And exibe modal "Seu trial encerrou — continue com Premium por R$29,90/mes"
    And o usuario mantem as expedicoes criadas durante o trial (nao sao deletadas)
    And expedicoes que excedam o limite Free sao arquivadas automaticamente
      com aviso "Expedicao arquivada — reative assinando Premium"
    And os 1.500 PA do trial NAO expiram — ficam no saldo (ate o valor ganho via fases;
      PA de recarga Premium que nao foram usados sao zerados ao fim do trial)

Scenario: Trial disponivel apenas uma vez por conta
  Given o usuario ja usou o trial Premium anteriormente
  When o usuario acessa /loja
  Then o botao "Experimentar gratis" NAO e exibido
    And o CTA exibe "Assinar Premium" diretamente
```

---

### US-P05 — Usuario onboarded que ainda nao pagou

```
As a new user who completed onboarding with 180 PA,
I want to understand what Free gives me and where Premium adds value
so that I can make an informed decision at the right moment —
not feel pressured immediately after signup.
```

**Contexto do viajante**:
- Dor: pop-ups de upsell imediatamente apos cadastro destroem a percepcao de valor e
  aumentam churn precoce (fonte: benchmark Amplitude 2024 — upsell prematuro reduz
  LTV em 23%)
- Workaround atual: ignorar o upsell (nao ha alternativa no modelo atual)
- Frequencia: primeiro contato com limites acontece tipicamente na 2a ou 3a expedicao

**Criterios de aceite (Gherkin)**:

```gherkin
Scenario: Sem upsell durante onboarding
  Given o usuario acabou de criar sua conta
  When o usuario completa o tutorial de PA (180 PA recebidos)
  Then NENHUM modal, banner ou CTA de Premium e exibido no onboarding
    And o upsell aparece apenas quando o usuario atinge um limite Free concretamente

Scenario: Upsell contextual ao atingir limite de destinos
  Given o usuario Free esta na Phase 1 preenchendo o destino
  When o usuario tenta adicionar um segundo destino
  Then o sistema exibe um inline tip: "Multidestinos (ate 4 cidades) disponivel no Premium"
    And o tip tem link discreto para /loja — nao e um modal bloqueante
    And o usuario pode continuar com 1 destino sem friccao
```

---

### US-P06 — Administrador monitorando conversao Premium

```
As an admin (owner),
I want to see Premium subscriber count, trial-to-paid conversion rate, churn,
and MRR in the admin dashboard
so that I can make pricing and feature decisions based on real data.
```

**Contexto**:
- Dor: sem metricas de assinatura no dashboard atual, decisoes de pricing sao baseadas
  em suposicoes
- Frequencia: revisao semanal de metricas de negocio

**Criterios de aceite (Gherkin)**:

```gherkin
Scenario: Metricas de Premium visiveis no admin
  Given o admin acessa /admin/dashboard
  When a aba "Premium" e selecionada
  Then o dashboard exibe:
    - Total de assinantes Premium ativos (mensal + anual separados)
    - Assinantes em trial (contagem + dias restantes por usuario)
    - Taxa de conversao trial→pago (ultimos 30 dias)
    - Churn mensal (cancelamentos / ativos inicio do mes)
    - MRR atual (R$) e projecao anual
    - ARPU (receita media por usuario Premium)
    - Breakdown PA consumidos vs PA de recarga por usuario Premium
```

---

## 4. Comparativo Free vs Premium

| Dimensao | Free | Premium |
|---|---|---|
| **Destinos por expedicao** | 1 | Ate 4 (multidestinos) |
| **Expedicoes ativas** | 3 (nao arquivadas) | Ilimitadas |
| **PA mensais** | 0 (nao ha recarga; apenas ganho por fases) | 1.500/mes (recarga no ciclo de cobranca) |
| **PA de onboarding** | 180 (unica vez) | 180 (unica vez) + 1.500 ao ativar Premium |
| **Modelo AI primario** | Gemini Flash | Gemini Flash (padrao) |
| **Roteiro Premium Sonnet** | Nao disponivel | Opt-in +50 PA (Sonnet 4.6 para Phase 6) |
| **Regeneracoes** | Custo PA padrao (30/50/80 PA) | Custo PA padrao (sem desconto) |
| **Suporte** | Auto-atendimento (FAQ + email) | Prioridade de resposta (48h → 24h) |
| **Badges exclusivas** | — | Badge "Expedicionario Premium" (cosmetic) |
| **Expedicoes arquivadas** | Ilimitadas | Ilimitadas |
| **Historico de PA** | Completo | Completo |
| **Dashboard admin** | Nao | Nao |
| **Trial** | — | 7 dias free (uma vez por conta) |
| **Preco** | Gratis | R$29,90/mes ou R$299/ano |

### 4.1 Regra de rollover de PA Premium

A recarga mensal de 1.500 PA segue a logica de teto (ceiling), nao de adicao simples:

```
saldo_apos_recarga = min(saldo_atual + 1.500, 1.500)

Equivale a:
  - Se saldo < 1.500: eleva para 1.500 (replace parcial)
  - Se saldo >= 1.500: nenhum PA adicionado (teto atingido)
  - Nao acumula (sem rollover): saldo nunca ultrapassa 1.500 pela recarga Premium
```

**Justificativa**: PA acumulados acima de 1.500 devem ser conquistados por atividade
(fases concluidas, badges, streaks) ou comprados avulsamente — nao concedidos
passivamente. Isso preserva o valor economico dos pacotes PA avulso e a integridade
da economia de pontos.

**Nota para implementacao**: `availablePoints` e incrementado; `totalPoints` (base do
rank/lifetime) NAO e alterado pela recarga Premium. Segue o mesmo padrao dos pacotes
avulsos (ATLAS-GAMIFICACAO-APROVADO.md §8, regra "PA comprados contam no lifetime").

**Open Question OQ-001**: equipe decidiu que PA de recarga Premium NAO contam no
lifetime (para nao inflar ranks artificialmente). Esta spec segue essa interpretacao.
Se a decisao mudar, requer Major Version bump neste doc.

---

## 5. Modelo de Precificacao

### 5.1 Precos (travados — nao alterar sem aprovacao de stakeholder)

| Plano | Preco | Equivalencia PA | Observacao |
|---|---:|---|---|
| Premium Mensal | R$ 29,90/mes | ~1.500 PA/mes + beneficios | Cobranca recorrente |
| Premium Anual | R$ 299,00/ano | ~1.500 PA/mes × 12 + beneficios | Desconto de 17% vs mensal |
| Economia anual | R$ 59,80 | — | (R$29,90 × 12) - R$299 = R$59,80 |

### 5.2 Trial

**Decisao recomendada pelo PO: Trial de 7 dias SEM cartao de credito.**

Justificativa:
- O CAC tecnico de um usuario em trial e de $0,005/expedicao (Gemini Flash) — o custo de
  absorver um trial completo com 3 expedicoes e de $0,015, desprezivel
- Exigir cartao aumenta friccao de cadastro e reduz conversao de trial em ate 40%
  (benchmark Stripe 2023 para SaaS B2C com ticket medio < R$50)
- O publico-alvo (viajantes brasileiros, renda media) tem maior sensibilidade a friccao
  de cartao do que a perda de 7 dias de acesso — "sem cartao" e um diferencial competitivo
  explicitamente percebido como honestidade
- Risco de abuso (contas multiplas para trial infinito): mitigado por vinculo a email
  verificado + limite de 1 trial por CPF/email (a ser validado pela security-specialist)

**Flag para security-specialist**: verificar se o limite de 1 trial por email e
suficiente ou se e necessario validacao adicional (telefone, CPF) dado o risco de
multiplas contas de teste.

### 5.3 Politica de reembolso

**Codigo de Defesa do Consumidor (CDC) — Art. 49**: direito de arrependimento de 7 dias
corridos para contratos celebrados fora do estabelecimento comercial (inclui contratos
online). O usuario pode cancelar e obter reembolso integral em ate 7 dias apos a
contratacao, sem necessidade de justificativa.

**Regras de reembolso para esta spec**:

| Situacao | Politica |
|---|---|
| Cancelamento nos primeiros 7 dias (apos trial) | Reembolso integral automatico via Mercado Pago |
| Cancelamento apos 7 dias — plano mensal | Sem reembolso proporcional; acesso mantido ate fim do periodo |
| Cancelamento plano anual — apos 7 dias | Reembolso proporcional de meses restantes (pro-rata) |
| Trial cancelado | Nenhum reembolso necessario (nao houve cobranca) |
| PA de recarga usados antes do cancelamento | PA usados nao sao reembolsados (servico ja prestado) |

**Nota regulatoria**: a pro-rata para cancelamento anual e uma escolha de produto
(acima do minimo legal), incluida para reduzir churn por medo de perder o investimento
anual. O time juridico deve validar o texto exato da politica de reembolso antes do
launch.

---

## 6. Analise de Margem — Cenario Premium

### 6.1 Receita por usuario Premium (mensal)

| Metrica | Valor |
|---|---:|
| Receita bruta mensal | R$ 29,90 (~$5,98) |
| PA inclusos na assinatura | 1.500 PA (nao vendidos, concedidos) |
| Custo dos 1.500 PA em IA (uso maximo) | — (depende do consumo real, ver abaixo) |

### 6.2 Custo de IA por cenario de usuario Premium

Hipotese de usuario heavy: 4 expedicoes/mes, multidestino 3 cidades cada, 1 regeneracao
de roteiro por expedicao.

| Item | Calculo | Custo IA |
|---|---|---:|
| 4 expedicoes × 160 PA (IA basica) | 640 PA consumidos | $0,032 (Gemini) |
| 4 regeneracoes de roteiro (80 PA cada) | 320 PA consumidos | $0,016 (Gemini) |
| 2 opt-ins Sonnet Premium (50 PA extra) | 100 PA consumidos | $0,200 (Sonnet) |
| **Total consumo PA** | **1.060 PA / 1.500 disponíveis** | — |
| **Custo total de IA** | — | **$0,248** |

**Margem no cenario heavy (Gemini primario + 2 opt-ins Sonnet)**:

```
Receita:  $5,98
Custo IA: $0,248
Margem:   $5,732 ($5,98 - $0,248)
Margem %: 2.310%
```

**Cenario extremo (all-Sonnet, 5 opt-ins, 5 expedicoes)**:

```
Custo IA: (5 × $0,177) + (5 × $0,100) = $0,885 + $0,500 = $1,385
Receita:  $5,98
Margem:   $4,595
Margem %: 332%
```

**Conclusao**: mesmo no cenario mais pessimista (all-Sonnet, uso maximo de opt-ins),
a margem de 332% supera amplamente a meta de ~100% definida em ATLAS-GAMIFICACAO-APROVADO.md
§11.2. O modelo Premium e financeiramente robusto.

### 6.3 Break-even de aquisicao

Com CAC tecnico de $0,005/expedicao (Gemini primario) e receita mensal de $5,98, o
break-even de custo de IA por usuario Premium e atingido no primeiro uso de IA no mes.
O payback de qualquer CAC de marketing e funcao do ROAS da campanha — fora do escopo
desta spec (SPEC-ARCH-MULTIDESTINOS devera estimar CAC de infra).

---

## 7. Funil de Monetizacao

```
[1] Cadastro
      | 180 PA onboarding (CAC tecnico: $0,005)
      v
[2] Primeira expedicao completa
      | +460 PA lifetime, nivel Desbravador
      | Custo IA: $0,005 (Gemini)
      v
[3] Segunda e terceira expedicao
      | Saldo PA começa a cair (regeneracoes ou uso intenso)
      | Nivel Navegador
      v
[4] Teto Free atingido (um dos gatilhos):
      | a) 3 expedicoes ativas — bloqueio ao criar nova
      | b) Tentativa de adicionar 2o destino (multidestino)
      | c) Saldo PA < custo da proxima acao de IA
      v
[5] Modal/banner de upsell contextual
      | CTA "Assinar Premium" + "Experimentar gratis 7 dias"
      v
[6] Trial 7 dias (sem cartao)
      | 1.500 PA creditados
      | Multidestinos habilitados
      | Expedicoes ilimitadas
      v
[7] Fim do trial — decisao
      |-- [Converte] --> Assinatura Premium (mensal ou anual)
      |                  MRR registrado
      |-- [Nao converte] --> Reverte para Free
                            Expedicoes acima do limite arquivadas
                            Email de recuperacao D+3, D+7
```

**Meta de conversao trial→pago**: 40% (benchmark SaaS B2C brasileiro com trial sem
cartao, produto com forte product-market-fit: 35–50% — fonte: Aceleradora BR 2024).

---

## 8. Requisitos da Pagina de Loja (/loja)

### 8.1 Rota e localizacao

| Locale | Rota | Observacao |
|---|---|---|
| Portugues (pt) | /pt/loja | Rota principal |
| Ingles (en) | /en/store | Traducao da rota |

A pagina e acessivel por usuarios autenticados e nao autenticados. Usuarios nao
autenticados podem visualizar planos e precos, mas ao clicar em "Assinar" sao
redirecionados para /auth/login?redirect=/loja.

### 8.2 Acesso via header

O icone de loja (sacola de compras) deve ser adicionado ao header autenticado (ao
lado do badge de gamificacao), com tooltip "Loja Atlas". O icone aparece para usuarios
Free e Premium. Para usuarios Premium, o icone exibe um indicador visual discreto
de status ("PRO").

### 8.3 Estrutura de conteudo da pagina /loja

**Secao 1 — Toggle Premium** (topo da pagina, destaque maximo)
- Comparativo Free vs Premium em cards lado a lado
- Toggle mensal / anual com calculo do desconto exibido em tempo real
- CTA principal: "Assinar Premium" (plano mensal) ou "Assinar Anual — economize 17%"
- CTA secundario: "Experimentar gratis 7 dias" (apenas para usuarios que nunca fizeram
  trial)
- Para usuarios Premium ativos: exibir status da assinatura, proxima data de cobranca,
  e botao "Gerenciar assinatura"

**Secao 2 — Comparativo detalhado Free vs Premium**
- Tabela completa (ver Secao 4 desta spec)
- Cada linha da tabela deve ter um tooltip ou expand explicando o beneficio em linguagem
  simples para o viajante

**Secao 3 — Pacotes de PA avulso** (complementar ao Premium, nao substituto)
- Cards dos 4 pacotes existentes: Explorador, Navegador, Cartografo, Embaixador
- Tags: "Mais popular" (Navegador) e "Melhor custo-beneficio" (Cartografo)
- Para usuarios Premium: highlight de que os pacotes complementam os 1.500 PA mensais
  para uso intenso

**Secao 4 — FAQ**
- O que sao Pontos Atlas?
- O que acontece com meus PA ao assinar Premium?
- O que sao "expedicoes ativas"? Como arquivar uma expedicao?
- Multidestinos — quantas cidades por expedicao?
- Posso cancelar a qualquer momento?
- O que acontece com minhas expedicoes se eu cancelar o Premium?
- Trial de 7 dias: precisa de cartao de credito?
- Qual a politica de reembolso?

### 8.4 Requisitos nao funcionais da loja

| Requisito | Especificacao |
|---|---|
| Performance | LCP < 2,5s em conexao 4G (mobile-first) |
| Mobile | Totalmente responsiva; cards empilhados em mobile |
| Acessibilidade | WCAG 2.1 AA: contraste, aria-labels, keyboard nav |
| SEO | Meta tags para /loja (titulo, descricao, OG tags) |
| Internacionalizacao | Todos os textos via next-intl; precos em BRL |
| Estado de autenticacao | Comportamento diferente para usuario Free, Premium e visitante |

---

## 9. Integracao com Gateway de Pagamento

### 9.1 Gateway primario: Mercado Pago

**Justificativa para Mercado Pago (Phase 1)**:
- Mercado Pago e o gateway dominante no Brasil para B2C com ticket medio abaixo de
  R$100 — cobertura de cartoes locais (Elo, Hipercard), PIX nativo, e boleto bancario
- Taxa de aprovacao de transacoes superior a Stripe para cartoes brasileiros emitidos
  por bancos nacionais (estimativa da industria: 90–95% vs 80–85%)
- Menor custo de processamento para PIX (0% na maioria dos planos Mercado Pago vs
  0,5–1% no Stripe)
- SDK e documentacao em portugues; suporte local
- Checkout Pro: iframe ou redirect com UX otimizada para celular Android (dominante
  no Brasil)

**Risco de lock-in**: Mercado Pago usa sua propria SDK e webhook formato proprietario.
A SPEC-ARCH-MULTIDESTINOS deve especificar uma camada de abstracao (PaymentProvider
interface) que permita adicionar Stripe como Phase 2 sem reescrever a logica de negocio.

### 9.2 Gateway secundario: Stripe (Phase 2)

Stripe sera implementado em Sprint 44+ para:
- Cartoes internacionais (viajantes que usam o app com locale en)
- Fallback se Mercado Pago apresentar degradacao
- Cobertura de mercados latino-americanos fora do Brasil

### 9.3 Modelos de pagamento suportados (Phase 1 — Mercado Pago)

| Metodo | Suporte Phase 1 | Observacao |
|---|---|---|
| PIX | Sim | Aprovacao instantanea |
| Cartao de credito | Sim | 1–12x (juros do cartao, nao parcelado pelo Atlas) |
| Boleto bancario | Nao (Phase 2) | Complexidade de reconciliacao para assinatura |
| Cartao de debito | Sim (via MP) | Sujeito a disponibilidade do emissor |

### 9.4 Modelo de assinatura

O Mercado Pago Subscriptions (Planos Recorrentes) sera usado para gerenciar o ciclo
de cobranca automatica mensal e anual. O Atlas NAO processa dados de cartao
diretamente — toda a tokenizacao e responsabilidade do Mercado Pago (SAQ A por
PCI-DSS).

---

## 10. Restricoes (Obrigatorias)

### 10.1 Seguranca

- Dados de cartao de credito NUNCA trafegam pelos servidores do Atlas — processamento
  exclusivamente pelo Mercado Pago (SAQ A PCI-DSS)
- Webhooks do Mercado Pago devem ter assinatura verificada (HMAC-SHA256) antes de
  qualquer acao
- Idempotencia obrigatoria em webhooks: processar o mesmo evento duas vezes nao deve
  duplicar credito de PA ou ativacao de Premium
- Endpoints de assinatura protegidos por autenticacao de sessao valida (Auth.js v5)
- BOLA/IDOR: usuario A nao pode cancelar, visualizar ou modificar a assinatura do
  usuario B — validacao via session.user.id em todos os endpoints de assinatura
- PII minima: armazenar apenas o necessario (subscription_id, status, renewal_date,
  plan_type) — dados de pagamento ficam no Mercado Pago, nao no banco do Atlas
- Auditoria: todas as mudancas de status de assinatura (ativacao, cancelamento,
  renovacao, reembolso) geram entradas de audit log com timestamp e trigger

### 10.2 Acessibilidade

- Todos os fluxos de assinatura (loja, modal de upsell, pagina de confirmacao)
  devem ser navegaveis por teclado
- Modais de upsell devem ter foco gerenciado (focus trap) e fechar com Escape
- Comparativo Free vs Premium deve ser acessivel por screen reader (tabela com
  headers adequados, nao CSS grid sem semantica)
- CTA buttons com aria-label descritivo: nao apenas "Assinar" mas "Assinar plano
  Premium mensal por R$29,90"

### 10.3 Performance

| Operacao | Budget |
|---|---|
| Carregamento da pagina /loja | LCP < 2,5s (4G mobile) |
| Resposta do webhook Mercado Pago | < 5s (antes de timeout do MP) |
| Credito de PA apos pagamento confirmado | < 30s apos webhook recebido |
| Ativacao de Premium apos pagamento | < 30s apos webhook recebido |
| Expiracao de trial | Processamento assincrono, maximo 1h de delay |

### 10.4 Fronteiras Arquiteturais

- Esta spec define O QUE e O PORQUE — implementacao em SPEC-ARCH-PREMIUM
- A spec NAO referencia bibliotecas, frameworks ou SDKs especificos
- O modelo de dados (User.subscriptionStatus, SubscriptionPlan, etc.) e responsabilidade
  de SPEC-ARCH-PREMIUM
- Migracao do schema Prisma e responsabilidade do architect + data-engineer
- A camada de abstracao PaymentProvider (interface) deve ser definida antes de qualquer
  implementacao especifica do Mercado Pago

---

## 11. Metricas de Sucesso (KPIs)

### 11.1 KPIs primarios (Sprint 43 + 30 dias pos-launch)

| KPI | Target | Prazo de medicao | Metodo |
|---|---|---|---|
| Taxa de conversao Free → Premium | >= 3% dos MAU | 30 dias pos-launch | admin dashboard |
| Taxa de conversao trial → pago | >= 40% dos trials | 30 dias pos-launch | admin dashboard |
| Churn mensal Premium | <= 5% | 60 dias pos-launch | admin dashboard |
| ARPU Premium | R$ 29,90/mes (mensal) | 30 dias pos-launch | admin dashboard |
| MRR (Meta Sprint 43) | > R$ 1.000 | 60 dias pos-launch | admin dashboard |

### 11.2 KPIs de saude do produto

| KPI | Target | Observacao |
|---|---|---|
| Abandono no fluxo de pagamento | < 20% | Da pagina de preco ate confirmacao |
| Suporte tickets relacionados a Premium | < 5% dos assinantes/mes | Indica clareza do produto |
| Usuarios Premium com saldo PA = 0 no fim do ciclo | < 30% | Indica que 1.500 PA sao suficientes |
| Opt-in Sonnet Premium (Roteiro Premium) | 10–25% dos Premium | Indica percepcao de valor do Sonnet |

### 11.3 Payback period

```
CAC de marketing (estimado): R$ 0 (organico no MVP)
CAC tecnico (infra + IA): ~$0,015 por trial com 3 expedicoes
Receita mensal: R$ 29,90 (~$5,98)
Payback: < 1 mes (desde a 1a cobranca)
```

Para campanhas pagas futuras: payback < 3 meses com CPC estimado de R$ 5–15 por lead
(Google Ads viagem no Brasil — benchmark 2025).

---

## 12. Escopo

### 12.1 Em escopo (Sprint 43)

- Definicao e aplicacao dos limites Free (1 destino, 3 expedicoes ativas)
- Logica de recarga mensal de 1.500 PA para Premium (ceiling, sem rollover)
- Trial de 7 dias sem cartao de credito
- Pagina /loja com comparativo Free vs Premium + pacotes PA avulso + FAQ
- Icone de loja no header autenticado
- Modal de upsell contextual (bloqueio de expedicao, bloqueio de multidestino)
- Integracao com Mercado Pago Subscriptions (mensal + anual)
- Webhook de Mercado Pago com idempotencia e assinatura HMAC
- Ativacao/desativacao automatica do Premium por webhook
- Arquivamento automatico de expedicoes ao regredir de Premium para Free
- Email de lembrete de trial (D+5) e de recuperacao pos-trial (D+3, D+7)
- Metricas de assinatura no admin dashboard (/admin/premium)
- Badge cosmetic "Expedicionario Premium" para assinantes ativos
- Politica de reembolso CDC (7 dias) via Mercado Pago

### 12.2 Fora de escopo (Sprint 43 — deferred)

| Item | Justificativa | Sprint estimado |
|---|---|---|
| Integracao Stripe | Phase 2 — mercado internacional | Sprint 44+ |
| Planos familia / multi-usuario | Complexidade de licenciamento, baixa demanda MVP | Roadmap |
| Gifting de Premium | Fluxo de pagamento adicional, baixa prioridade | Roadmap |
| Programa de referidos com recompensa Premium | Depende de metricas de conversao organica | Sprint 45+ |
| Parcelamento em boleto | Complexidade de reconciliacao para assinatura recorrente | Roadmap |
| App mobile nativo com in-app purchase (Apple/Google) | Fora do escopo MVP (web-first) | Post-MVP |
| Plano Enterprise / agencias de viagem | Personas B2B — fora do foco MVP | Roadmap |
| Cancelamento com pesquisa de saida (offboarding survey) | UX adicional, nao bloqueante | Sprint 44 |

---

## 13. Dependencias

### 13.1 Specs que devem existir antes da implementacao

| Spec | Responsavel | Descricao | Status |
|---|---|---|---|
| SPEC-ARCH-PREMIUM | architect | Schema Prisma (User.subscriptionStatus, Subscription model), PaymentProvider interface, webhook handler, PA credit job | A criar |
| SPEC-UX-LOJA | ux-designer | Fluxo visual completo da /loja, comparativo, modal de upsell, estados de pagamento | A criar |
| SPEC-ARCH-MULTIDESTINOS | architect | Mudancas no schema de Trip para suportar multiplos destinos com datas proprias | A criar |
| SPEC-AI-MULTIDESTINOS | prompt-engineer | Adaptacao dos prompts de Phase 5 e Phase 6 para N destinos; custo de tokens para 4 cidades | A criar |
| SPEC-SEC-PREMIUM | security-specialist | Threat model de pagamento, BOLA em endpoints de assinatura, trial abuse prevention, audit log | A criar |

### 13.2 Features que devem estar implementadas

| Feature | Spec referencia | Status |
|---|---|---|
| Admin dashboard basico | SPEC-PROD-044 | Implementado (Sprint 36) |
| Compra avulsa de PA (mock) | SPEC-PROD-041 | Implementado (Sprint 36) |
| Stripe integration (base) | SPEC-PROD-043 | Implementado (Sprint 37) — ATENCAO: Stripe sera substituido por Mercado Pago como Phase 1; a abstracao PaymentProvider do Sprint 37 deve ser reutilizada |
| Phase 1 wizard (1 destino) | SPEC-PROD-051 | Implementado (Sprint 40) |
| Gamification PA engine | SPEC-PROD-039 | Implementado (Sprint 36) |

### 13.3 Decisoes externas pendentes

| Decisao | Owner | Impacto |
|---|---|---|
| Abertura de conta Mercado Pago Business | tech-lead / stakeholder | Bloqueia integracao real; mock pode ser usado em dev |
| Validacao juridica da politica de reembolso | stakeholder | Bloqueia copy da /loja |
| Definicao de CNPJ para emissao de NF de assinatura | stakeholder | Obrigatorio para compliance tributario (ISS sobre SaaS) |
| Definicao de email transacional (trial, renovacao, cancelamento) | ux-designer + devops | Bloqueia fluxo de trial |

---

## 14. Riscos

| # | Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|---|
| R-01 | Preco R$29,90 alto para o publico brasileiro (renda media ~R$2.800) | Media | Alto | Trial sem cartao reduz barreira; anual (R$299) dilui para R$24,90/mes — comunicar como "menos que uma pizza" |
| R-02 | Preco R$29,90 baixo — nao cobre COGS + custos operacionais em escala | Baixa | Medio | Margem de 2.310% (cenario heavy) confirma que o preco e sustentavel; revisitar em Sprint 46 com dados reais |
| R-03 | Lock-in Mercado Pago — dificuldade de migrar para Stripe em Phase 2 | Media | Medio | Mitigado pela PaymentProvider interface (SPEC-ARCH-PREMIUM) |
| R-04 | Tributacao — ISS sobre SaaS (variaveis por municipio, 2–5%) nao precificado | Alta | Medio | Stakeholder deve confirmar regime tributario antes do launch; ajuste de preco pode ser necessario |
| R-05 | Churn por experiencia ruim no trial (IA lenta, expedicao bugada) | Alta | Alto | Trial deve coincidir com sprint de estabilizacao (Sprint 43 tem QA rigoroso); nao lancar Premium em sprint com bugs conhecidos em Phase 5/6 |
| R-06 | Abuso de trial (multiplas contas por email descartavel) | Media | Baixo | Custo do trial e $0,015 — aceitavel mesmo com 10% de abuso; bloquear por telefone se necessario (security-specialist decide) |
| R-07 | Usuarios Premium que acumulam PA e nunca atingem o teto de 1.500 — percepcao de "perda" na renovacao | Baixa | Medio | Comunicar claramente: "PA nao usados nao acumulam — use para explorar mais destinos antes do renovar" |
| R-08 | Mercado Pago webhook instavel (latencia, retries) — Premium nao ativado apos pagamento | Media | Alto | Idempotencia + retry logic no handler; polling fallback na UI ("aguardando confirmacao...") |
| R-09 | Regulacao LGPD — dados de pagamento e assinatura sao dados sensiveis | Alta | Alto | Mitigado pela abordagem SAQ A (dados ficam no MP); DPA com Mercado Pago necessario |

---

## 15. Questoes Abertas (Open Questions)

| ID | Questao | Impacto | Quem decide | Prazo |
|---|---|---|---|---|
| OQ-001 | PA de recarga Premium contam no lifetime (rank) ou apenas em availablePoints? A decisao atual (nao conta no lifetime) pode ser revisitada se o time quiser que Premium acelere o rank. | Modelo de dados, comunicacao ao usuario | product-owner + tech-lead | Antes de SPEC-ARCH-PREMIUM |
| OQ-002 | Trial sem cartao: e suficiente vincular ao email verificado, ou precisamos de telefone/CPF? | Seguranca, UX de onboarding | security-specialist | Sprint 43 planning |
| OQ-003 | Badges Premium ("Expedicionario Premium") sao apenas cosmeticas ou tambem desbloqueiam PA bonus? A spec atual define como cosmetica — mas um bonus de +50 PA ao ativar Premium aumentaria o valor percebido. | Economia PA, diferenciacao | product-owner | Sprint 43 planning |
| OQ-004 | Sonnet "Roteiro Premium" (+50 PA opt-in) — o custo adicional e em PA do usuario ou e incluido na assinatura? A spec assume PA do usuario. Se for incluido, muda a analise de margem. | Margem, comunicacao de valor | product-owner + finops-engineer | Antes de SPEC-ARCH-PREMIUM |
| OQ-005 | Plano anual: o usuario pode mudar de anual para mensal no meio do periodo? Qual o fluxo de downsell? | UX de gerenciamento de assinatura, SPEC-ARCH-PREMIUM | ux-designer + architect | Sprint 43 |
| OQ-006 | Mulitdestinos no limite Premium e 4 cidades por expedicao. Esse limite deve ser hard (erro) ou soft (aviso)? Se soft, o usuario pode adicionar um 5o destino e o sistema aceita mas avisa? | UX, Phase 1 wizard | ux-designer | SPEC-UX-LOJA |
| OQ-007 | Texto PO discorda da decisao de nao oferecer desconto de fidelidade para assinantes Premium que atingem nivel Lendario. Um desconto de 10% para nivel 6 aumentaria retenção e premiaria os usuarios mais engajados. Registrado como questao aberta para discussao com o time. | Retencao, economia PA | product-owner + stakeholder | Sprint 44 |

---

## 16. Esforco Estimado (PO Tracking — nao dev effort)

| Atividade PO | Esforco estimado |
|---|---|
| Criacao desta spec (SPEC-PROD-PREMIUM) | 4h |
| Revisao e aprovacao de SPEC-UX-LOJA | 2h |
| Revisao e aprovacao de SPEC-ARCH-PREMIUM | 2h |
| Revisao de SPEC-SEC-PREMIUM (threat model) | 1h |
| Revisao de SPEC-AI-MULTIDESTINOS | 1h |
| Validacao de ACs com QA apos implementacao | 3h |
| Comunicacao de produto (copy da /loja, email trial) | 3h |
| Atualizacao do docs/tasks.md com US-P01..P06 | 1h |
| Alinhamento com stakeholder (preco, juridico, MP account) | 2h |
| **Total PO Sprint 43** | **~19h** |

---

## 17. Rollout e Timeline

### 17.1 Fases de rollout

| Fase | Descricao | Gatilho de avanco |
|---|---|---|
| **Alpha interno** | Premium ativo apenas para admin (owner); testar webhook MP, credito de PA, ciclo de cobranca | 0 bugs P0 em 48h de teste |
| **Beta fechado** | Trial habilitado para lista de 20–30 usuarios convidados (heavy users identificados no admin) | NPS do beta >= 7/10; zero bugs P0 |
| **Canary 10%** | 10% dos novos cadastros veem o CTA de trial e /loja | Taxa de conversao trial > 20% em 7 dias |
| **Launch completo** | 100% dos usuarios tem acesso ao Premium; campanha de comunicacao | Canary sem alertas de custo ou bugs criticos |

### 17.2 A/B test de pricing (opcional, Sprint 44)

Se a conversao trial→pago ficar abaixo de 30% apos 14 dias de canary, considerar:
- Variante A: R$29,90/mes (preco atual)
- Variante B: R$24,90/mes (price anchoring mais agressivo)
- Variante C: R$34,90/mes com 30 dias de trial (test de valor percebido vs preco)

O A/B test requer instrumentacao analitica (SPEC-DATA-PREMIUM) e aprovacao do
tech-lead antes de executar.

### 17.3 Regioes

Launch 100% Brasil (pt locale). Locale en (/en/store) recebe a pagina mas o
pagamento via Mercado Pago e restrito a metodos brasileiros. Usuarios internacionais
com locale en veem a pagina e podem assinar via PIX ou cartao brasileiro — sem
restricao geografica, mas sem Stripe (Phase 2).

---

## 18. Criterios de Aceite Consolidados

### Bloco 1 — Limites Free

- [ ] AC-F01: usuario Free com 3 expedicoes ativas nao consegue criar uma 4a sem modal de upsell
- [ ] AC-F02: usuario Free consegue criar nova expedicao apos arquivar uma das 3 ativas
- [ ] AC-F03: usuario Free ve tooltip ao tentar adicionar 2o destino na Phase 1
- [ ] AC-F04: usuario Free com 0 expedicoes ativas ve o dashboard sem nenhum bloquio ou upsell
- [ ] AC-F05: usuario Free pode ter expedicoes arquivadas ilimitadas (arquivo nao conta no limite)

### Bloco 2 — Assinatura Premium

- [ ] AC-P01: usuario Premium pode criar expedicoes sem limite de quantidade ativa
- [ ] AC-P02: usuario Premium ve campo de multidestino na Phase 1 (ate 4 cidades)
- [ ] AC-P03: usuario Premium recebe 1.500 PA no ciclo de renovacao (logica de ceiling correta)
- [ ] AC-P04: PA de recarga Premium NAO incrementam totalPoints (lifetime/rank)
- [ ] AC-P05: usuario Premium ve badge "Expedicionario Premium" no perfil e no Meu Atlas
- [ ] AC-P06: cancelamento Premium preserva todas as expedicoes (nao deleta)
- [ ] AC-P07: expedicoes acima de 3 sao arquivadas automaticamente ao regredir para Free
- [ ] AC-P08: usuario regredido ve mensagem clara sobre expedicoes arquivadas com link para reativar

### Bloco 3 — Trial

- [ ] AC-T01: trial ativado sem cartao de credito, vinculado ao email verificado
- [ ] AC-T02: trial disponivel apenas uma vez por conta (email)
- [ ] AC-T03: banner de trial exibe dias restantes com precisao de 1 dia
- [ ] AC-T04: email de lembrete enviado no dia 5 do trial
- [ ] AC-T05: ao fim do trial sem conversao, usuario reverte para Free automaticamente
- [ ] AC-T06: PA de recarga do trial nao usados sao zerados ao regredir para Free

### Bloco 4 — Pagamento (Mercado Pago)

- [ ] AC-MP01: webhook de pagamento aprovado ativa Premium em < 30s
- [ ] AC-MP02: webhook processado duas vezes nao credita PA ou ativa Premium duas vezes (idempotencia)
- [ ] AC-MP03: assinatura de webhook HMAC verificada antes de qualquer acao
- [ ] AC-MP04: cancelamento via Mercado Pago desativa Premium no proximo ciclo
- [ ] AC-MP05: reembolso nos primeiros 7 dias procesado e Premium desativado imediatamente
- [ ] AC-MP06: dados de cartao nunca trafegam pelos servidores do Atlas

### Bloco 5 — Loja (/loja)

- [ ] AC-L01: pagina /loja carrega em < 2,5s em conexao 4G (mobile)
- [ ] AC-L02: visitante nao autenticado ve precos e planos; CTA redireciona para login
- [ ] AC-L03: toggle mensal/anual atualiza precos e desconto em tempo real sem reload
- [ ] AC-L04: usuario Free ve CTA "Experimentar gratis 7 dias" (se nunca fez trial)
- [ ] AC-L05: usuario com trial ativo ve status do trial e CTA "Assinar agora"
- [ ] AC-L06: usuario Premium ve status de assinatura e proximo ciclo de cobranca
- [ ] AC-L07: icone de loja no header autenticado navega para /loja
- [ ] AC-L08: FAQ responde as 8 perguntas listadas na Secao 8.3 desta spec

### Bloco 6 — Admin

- [ ] AC-A01: /admin/premium exibe contagem de assinantes Premium (mensal + anual)
- [ ] AC-A02: /admin/premium exibe trials ativos com dias restantes
- [ ] AC-A03: /admin/premium exibe taxa de conversao trial→pago (ultimos 30 dias)
- [ ] AC-A04: /admin/premium exibe churn mensal e MRR atual
- [ ] AC-A05: /admin/premium exibe ARPU e projecao anual

### Bloco 7 — Segurança e Compliance

- [ ] AC-S01: usuario A nao pode acessar dados de assinatura do usuario B (BOLA)
- [ ] AC-S02: todas as mudancas de status de assinatura geram entrada de audit log
- [ ] AC-S03: DPA com Mercado Pago documentado antes do launch (decisao de stakeholder)
- [ ] AC-S04: politica de reembolso exibida na /loja antes do checkout

---

## 19. Criterios de EDD (Eval-Driven Development)

| Metrica | Threshold | Grader |
|---|---|---|
| Idempotencia de webhook | 100% (0 duplicacoes em 100 eventos simulados) | Programatico |
| Latencia de ativacao de Premium | p95 < 30s | Heuristico |
| Credito de PA Premium (ceiling logic) | 100% correto em todos os cenarios de saldo | Programatico (Vitest) |
| Acessibilidade /loja | 0 erros WCAG 2.1 AA criticos | Automatico (axe-core) |
| Cobertura de testes (Premium service) | >= 80% | Vitest coverage |

---

## Historico de Mudancas

| Versao | Data | Autor | Descricao |
|---|---|---|---|
| 1.0.0 | 2026-04-10 | product-owner | Draft inicial — Premium subscription, loja, Mercado Pago, trial, multidestinos |
