---
spec_id: SPEC-PROD-REORDER-PHASES
title: "Reordenacao das Fases da Expedicao — Nova Sequencia Logica"
version: 1.0.0
status: Draft
sprint: 44
owner: product-owner
reviewers: [tech-lead, ux-designer, architect, prompt-engineer, finops-engineer, qa-engineer]
created: 2026-04-15
updated: 2026-04-15
moscow: Must Have
effort: L
personas: [leisure-solo, leisure-family, bleisure, business-traveler, group-organizer]
gamification_reference: docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md
parent_specs: [SPEC-PROD-001, SPEC-PROD-055, SPEC-GUIA-PERSONALIZACAO, SPEC-ROTEIRO-REGEN-INTELIGENTE]
---

# SPEC-PROD-REORDER-PHASES: Reordenacao das Fases da Expedicao

> Este documento define a mudanca na sequencia das 6 fases ativas do wizard de expedicao
> do Atlas. Esta spec e a fonte da verdade para a nova ordem. Toda implementacao, comunicacao
> de UI e atualizacao de gamificacao devem ser consistentes com este documento.
> Divergencias constituem spec drift (bug P0).

---

## 1. Declaracao do Problema

### 1.1 Sequencia Atual — O Problema

A sequencia vigente das fases foi definida na arquitetura inicial (Sprints 1-9) com base em
uma logica de "coleta de dados antes da geracao de IA". Ela pressupunha que o usuario deveria
preencher toda a logistica (documentos, transporte, hospedagem) ANTES de ver o guia do destino
e o roteiro. Esta logica tem dois problemas estruturais:

**Problema 1 — O viajante planeja de fora para dentro, nao de dentro para fora**

O comportamento real do viajante e: primeiro inspiro-me no destino (imagens, curiosidades,
pontos turisticos), depois imagino como seria minha estadia, depois resolvo a logistica
(passagens, hotel, documentos). A sequencia atual inverte este fluxo natural: pede ao usuario
que resolva checklist de documentos (Phase 3) e logistica de transporte (Phase 4) antes de
ver uma unica imagem do destino ou uma sugestao de atividade. O resultado e uma sensacao de
"burocracia antes da aventura" que reduz o engajamento nas primeiras fases criticas.

**Problema 2 — A IA das fases tardias nao usa contexto das fases intermediarias**

Na sequencia atual:
- Phase 5 (Guia do Destino) e gerada com contexto de Phase 1 e Phase 2 apenas.
- Phase 6 (O Roteiro) e gerada com contexto de Phases 1, 2, e opcionalmente 5.
- Phase 3 (Checklist) e gerada antes de qualquer conteudo de IA sobre o destino.
- Phase 4 (Logistica) e preenchida manualmente sem sugestoes baseadas no roteiro.

A consequencia: o Guia do Destino gera recomendacoes genericas (sem contexto de hospedagem
ou transporte ja decididos); o Roteiro nao sabe quais meios de transporte o usuario tem
disponivel; o Checklist de documentos e gerado antes que o usuario saiba o roteiro
(podendo recomendar documentos desnecessarios ou omitir documentos relevantes).

Esta sequencia desperdicada resulta em prompts maiores e respostas menos precisas — custos
de PA e custo de tokens de IA mais altos para um resultado qualitativo inferior.

### 1.2 Evidencias do Problema

- Feedback qualitativo recorrente (Sprints 26-39): usuarios descrevem as fases 3 e 4 como
  "chatas" e relatam abandono de expedicao antes de chegar ao Guia e ao Roteiro.
- Taxa de conclusao de Phase 6 significativamente abaixo da taxa de conclusao de Phase 1
  (evidencia de funil — cada fase adicional antes do "conteudo interessante" e uma barreira).
- Custo de tokens: Phase 6 (O Roteiro) nao tem contexto de acomodacao e transporte no
  prompt atual porque esses dados estao em Phase 4, que e concluida antes, mas o prompt
  nao os usa. Oportunidade: se Phase 4 vem DEPOIS de Phase 6, o prompt de Phase 6 pode
  receber contexto parcial de Phase 4 (modo de transporte preferido, cidade de origem).
- SPEC-PROD-033 (Enriquecimento do Prompt da Fase 6) foi criado em Sprint 33 precisamente
  para suprir a lacuna de contexto — reordenar as fases elimina parte desta complexidade
  estruturalmente, em vez de corrigi-la com prompt engineering.

---

## 2. User Story

As a @leisure-solo planning a new expedition in Atlas,
I want the wizard to guide me in the natural order of travel planning —
first inspire me with the destination, then help me build an itinerary, then plan logistics —
so that I stay engaged through the entire wizard and my AI-generated content is more relevant
to the real plans I have already made in earlier phases.

### Contexto do Viajante

- **Pain point**: Ser obrigado a preencher checklist de documentos e detalhes de transporte
  antes de ver qualquer sugestao de atividade ou guia do destino. A motivacao cai porque
  o usuario nao ve valor antes de ter que resolver burocracia.
- **Workaround atual**: Muitos usuarios pulam as Phases 3 e 4 (deixando em branco ou com
  dados ficticios) para chegar ao Guia e ao Roteiro. Isto degrada a qualidade do checklist
  gerado por IA (dados de perfil incompletos) e gera dados de logistica invalidos.
- **Frequencia**: Toda nova expedicao passa pelo wizard completo. Cada usuario que cria uma
  expedicao enfrenta esta sequencia. Alta frequencia e alto impacto.

---

## 3. Nova Ordem Definitiva das Fases

### 3.1 Mapeamento Completo (atual -> novo)

| Posicao Atual | Nome Atual | Nova Posicao | Nome (mantido) | Mudanca de Posicao |
|---|---|---|---|---|
| 1 | A Inspiracao | 1 | A Inspiracao | Sem mudanca |
| 2 | O Perfil | 2 | O Perfil | Sem mudanca |
| 3 | O Preparo (Checklist) | 6 | O Preparo | Desce 3 posicoes |
| 4 | A Logistica | 5 | A Logistica | Desce 1 posicao |
| 5 | Guia do Destino | 3 | Guia do Destino | Sobe 2 posicoes |
| 6 | O Roteiro | 4 | O Roteiro | Sobe 2 posicoes |

> NOTA: Os nomes das fases NAO mudam. Apenas a posicao na sequencia muda.
> Os IDs internos das fases nos sistemas de backend (ExpeditionPhase, PointTransaction)
> devem ser reassociados — isto e responsabilidade de SPEC-ARCH correspondente.

### 3.2 Sequencia Nova — Detalhamento por Fase

---

#### FASE 1 — A Inspiracao
**Posicao**: 1 de 6 (sem mudanca)
**Slug interno atual**: `phase-1` / `o_chamado` (codigo legado usa "O Chamado")
**Descricao para o usuario**: "Defina o destino, as datas e o proposito da sua expedicao."
**Icone conceitual**: bussola / mapa
**Conteudo da fase**: Destino (autocomplete), datas de partida e retorno, nome da expedicao, origem da viagem, proposito (lazer / negocios / bleisure).
**Gatilho de conclusao**: Destino + datas preenchidos e confirmados.
**PA ganhos ao concluir**: 100 PA (sem mudanca)
**IA**: Nao usa IA nesta fase.
**Justificativa de posicao**: Ponto de entrada obrigatorio. Define o contexto base de destino e datas que alimenta todas as fases seguintes e todos os prompts de IA.

---

#### FASE 2 — O Perfil
**Posicao**: 2 de 6 (sem mudanca)
**Slug interno atual**: `phase-2` / `o_explorador`
**Descricao para o usuario**: "Conte-nos sobre voce: seu estilo de viagem, preferencias e quem viaja com voce."
**Icone conceitual**: pessoa com mochila
**Conteudo da fase**: Estilo de viagem (pace, periodo do dia, budget), passageiros (adultos, criancas, bebes, idosos), preferencias de 8 categorias (US-123), restricoes alimentares, acessibilidade.
**Gatilho de conclusao**: Pelo menos 1 adulto confirmado + estilo de viagem selecionado.
**PA ganhos ao concluir**: 150 PA (sem mudanca)
**IA**: Nao usa IA nesta fase.
**Justificativa de posicao**: Perfil do viajante e o segundo insumo mais critico para a IA das Fases 3 e 4 (nova ordem). Deve estar completo antes da primeira geracao de IA.

---

#### FASE 3 — Guia do Destino (SOBE de posicao 5 para 3)
**Posicao**: 3 de 6 (era 5)
**Slug interno atual**: `phase-5` / `guia_do_destino`
> ATENCAO: O slug interno sera `phase-3` apos a reordenacao. Detalhes de migracao de dados
> sao responsabilidade do SPEC-ARCH correspondente.

**Descricao para o usuario**: "Descubra seu destino: pontos essenciais, dicas culturais, seguranca e custos — tudo personalizado para o seu perfil de viagem."
**Icone conceitual**: livro aberto / guia de viagem
**Conteudo da fase**: Guia gerado por IA com 8 secoes definidas em SPEC-GUIA-DESTINO-CONTEUDO (informacoes essenciais, seguranca, custos medios, atracacoes, cultura, gastronomia, transportes locais, dicas praticas). Personalizacao pos-geracao (SPEC-GUIA-PERSONALIZACAO): 9 chips de categoria + notas pessoais de 500 chars.
**Gatilho de conclusao**: Guia gerado com sucesso (ou usuario pula a fase com confirmacao explicita).
**PA ganhos ao concluir**: 40 PA (sem mudanca)
**Custo de IA**: 50 PA para geracao inicial e para cada regeneracao (constante `AI_COSTS.ai_accommodation` — sem mudanca de valor).
**IA**: Geracao manual via botao CTA conforme SPEC-PROD-055. PA debitado somente apos sucesso.
**Justificativa de posicao**: Posicionado imediatamente apos o perfil porque:
  (a) Maximiza engajamento — o viajante ve conteudo inspirador antes de qualquer logistica.
  (b) O Guia fornece contexto real para o Roteiro (Fase 4): atividades sugeridas, bairros, custos tipicos.
  (c) O Guia custa menos tokens que o Roteiro (50 PA vs 80 PA) — a progressao de custo PA e suave.

---

#### FASE 4 — O Roteiro (SOBE de posicao 6 para 4)
**Posicao**: 4 de 6 (era 6)
**Slug interno atual**: `phase-6` / `o_roteiro`
> ATENCAO: O slug interno sera `phase-4` apos a reordenacao.

**Descricao para o usuario**: "Construa seu roteiro dia a dia com atividades, horarios e dicas personalizadas — enriquecido com as informacoes do seu Guia do Destino."
**Icone conceitual**: calendario / timeline
**Conteudo da fase**: Roteiro dia-a-dia gerado por IA conforme SPEC-PROD-PHASE6-REDESIGN. Atividades manuais com preservacao na regeneracao (SPEC-ROTEIRO-REGEN-INTELIGENTE). Organizacao por categorias, timeline, mapa, resumo do dia.
**Gatilho de conclusao**: Roteiro gerado com sucesso para pelo menos 1 dia (ou usuario pula com confirmacao).
**PA ganhos ao concluir**: 250 PA (sem mudanca)
**Custo de IA**: 80 PA para geracao inicial e regeneracao (constante `AI_COSTS.ai_itinerary` — sem mudanca de valor).
**IA**: Geracao manual via botao CTA conforme SPEC-PROD-055. PA debitado somente apos sucesso.
**Justificativa de posicao**: Com o Guia do Destino ja gerado (Fase 3), o prompt do Roteiro agora tem:
  (a) Destino e datas (Fase 1).
  (b) Perfil completo do viajante, estilo, passageiros (Fase 2).
  (c) Informacoes reais do destino: atracacoes, bairros, custos, cultura (Fase 3).
  Isto aumenta a especificidade do roteiro sem aumentar o numero de tokens de entrada — o Guia
  e mais conciso e estruturado do que dados brutos de perfil. Reducao estimada de tokens de
  saida: 10-20% por reducao de alucinacoes e repeticoes de informacoes genericas.
  Alem disso, o Roteiro com 250 PA de recompensa posicionado na quarta fase cria o pico
  motivacional ideal: o usuario ja passou pelo engajamento do Guia e esta pronto para o
  commit de planejamento detalhado.

---

#### FASE 5 — A Logistica (DESCE de posicao 4 para 5)
**Posicao**: 5 de 6 (era 4)
**Slug interno atual**: `phase-4` / `a_logistica`
> ATENCAO: O slug interno sera `phase-5` apos a reordenacao.

**Descricao para o usuario**: "Organize os detalhes praticos da sua expedicao: transporte, hospedagem e mobilidade local — com base no roteiro que voce ja criou."
**Icone conceitual**: aviao + cama / mala
**Conteudo da fase**: Transporte (voos, trem, onibus — ida e volta, multitrechos), hospedagem (ate 5 registros), mobilidade local (multi-select de opcoes). Campos preenchidos manualmente. Estimativa de custo via IA e opcional (US-119, Could Have, nao alterado).
**Gatilho de conclusao**: Pelo menos 1 registro de transporte OU confirmacao "Ainda nao decidi" + pelo menos 1 hospedagem OU confirmacao "Ainda nao decidi".
**PA ganhos ao concluir**: 50 PA (sem mudanca)
**IA**: Nao usa IA nesta fase (estimativa de custo e opcional, coberta por US-119).
**Justificativa de posicao**: A Logistica vem DEPOIS do Roteiro porque:
  (a) Com o roteiro em maos, o usuario sabe quais cidades visitar e em que ordem — pode
      escolher transportes entre cidades com base em dias reais de itinerario.
  (b) Com o Guia gerado, o usuario tem informacoes de transportes locais para decidir se
      aluga carro, usa metro ou contrata transfers.
  (c) Reduz o numero de usuarios que preenchem transporte com dados ficticios "so para
      passar de fase" — o contexto do roteiro torna a decisao logistica mais concreta.

---

#### FASE 6 — O Preparo (DESCE de posicao 3 para 6)
**Posicao**: 6 de 6 (era 3)
**Slug interno atual**: `phase-3` / `o_preparo`
> ATENCAO: O slug interno sera `phase-6` apos a reordenacao.

**Descricao para o usuario**: "Prepare-se para decolar: seu checklist personalizado de documentos, itens essenciais e requisitos de entrada — baseado no seu destino e roteiro completos."
**Icone conceitual**: lista de verificacao / passaporte
**Conteudo da fase**: Checklist gerado por IA com documentos e itens especificos ao destino, datas, tipo de viagem, passageiros e — agora com acesso ao roteiro completo — atividades planejadas (ex: trilha exige equipamento especifico, show exige ingressos antecipados). Checklist completado manualmente pelo usuario com states: confirmado / pendente / nao aplicavel.
**Gatilho de conclusao**: Checklist gerado + pelo menos 80% dos itens marcados como confirmados OU nao aplicaveis (regra de conclusao conforme SPEC-PROD-036).
**PA ganhos ao concluir**: 75 PA (sem mudanca)
**Custo de IA**: 30 PA para geracao do checklist (constante `AI_COSTS.ai_route` — sem mudanca de valor).
**IA**: Geracao via botao CTA (comportamento similar a SPEC-PROD-055, porem custo e 30 PA).
> DECISAO PENDENTE DP-001: A geracao do checklist em Phase 3 original nao foi explicitamente
> coberta pela SPEC-PROD-055 (que cobriu apenas Phases 5 e 6). Confirmar com PO se o
> comportamento de geracao manual do checklist (com estado vazio, botao CTA, custo 30 PA
> visivel antes da geracao) deve ser tornado explicito nesta spec ou em spec separada.

**Justificativa de posicao**: O Checklist na posicao final e a decisao de maior impacto de
qualidade desta reordenacao:
  (a) **Checklist mais preciso**: O prompt de checklist agora tem acesso a: destino (F1),
      passageiros com idades (F2), atividades do roteiro (F4 nova), transporte e hospedagem
      (F5 nova). Um roteiro com trilha em parque nacional gera checklist diferente de um
      roteiro urbano com shows e restaurantes.
  (b) **Reducao de tokens estimada**: O prompt de checklist na posicao 3 original era
      alimentado apenas por destino + tipo de viagem (dados limitados). Na posicao 6, o
      prompt tem contexto rico mas conciso — pode gerar listas mais curtas e mais precisas,
      evitando itens genericos que o usuario nao usa.
  (c) **Timing natural**: Na vida real, o viajante faz o checklist de mala e documentos
      na ultima semana antes da viagem — nao na hora de sonhar com o destino.
  (d) **Reducao de abandono**: Mover o "trabalho chato" para o final, quando o usuario ja
      esta emocionalmente comprometido com a expedicao (Guia gerado, Roteiro pronto,
      Logistica decidida), aumenta a probabilidade de completar o checklist.

---

### 3.3 Tabela Resumo — Nova Ordem

| Nova Pos. | Nome | Anterior | IA? | Custo PA | Ganho PA |
|---|---|---|---|---|---|
| 1 | A Inspiracao | 1 | Nao | 0 | 100 |
| 2 | O Perfil | 2 | Nao | 0 | 150 |
| 3 | Guia do Destino | 5 | Sim | 50 | 40 |
| 4 | O Roteiro | 6 | Sim | 80 | 250 |
| 5 | A Logistica | 4 | Nao | 0 | 50 |
| 6 | O Preparo | 3 | Sim | 30 | 75 |
| **Total** | | | | **160** | **665** |

> Total de PA gasto em IA por expedicao completa: 160 PA. VALOR IDENTICO AO ATUAL.
> Os custos individuais por feature nao mudam — apenas a posicao das fases.

---

## 4. Justificativa de Negocio

### 4.1 UX — Fluxo Natural de Planejamento de Viagem

A nova sequencia espelha o comportamento real do viajante identificado em pesquisas da
industria (Skift, Phocuswire) e nos dados de uso do Atlas:

```
Inspiracao -> Planejamento de conteudo -> Logistica -> Preparativos finais
(Fases 1-2)     (Fases 3-4 nova ordem)   (Fase 5)      (Fase 6)
```

Este e o mesmo fluxo usado pelos principais produtos de planejamento de viagem do mercado
(TripIt, Google Trips, Wanderlog): primeiro o usuario define PARA ONDE e COM QUEM, depois
o que vai FAZER, depois COMO CHEGAR e ONDE FICAR, e por fim o que PRECISA LEVAR.

### 4.2 Reducao de Tokens de IA — Estimativa

| Feature de IA | Contexto atual (tokens estimados) | Contexto novo (tokens estimados) | Delta |
|---|---|---|---|
| Guia do Destino (Phase 3 nova) | Destino + Perfil (2 fases) | Destino + Perfil (2 fases) | 0% |
| O Roteiro (Phase 4 nova) | Destino + Perfil + Guia (3 fases) | Destino + Perfil + Guia (3 fases) | 0% |
| Checklist (Phase 6 nova) | Destino + tipo de viagem apenas | Destino + Perfil + Guia + Roteiro + Logistica (5 fases) | +tokens de entrada |

> NOTA IMPORTANTE: A reducao de tokens nao vem de menos input, mas de output mais preciso.
> Um prompt de checklist com contexto rico (roteiro detalhado + logistica confirmada) gera
> checklists mais curtos e mais especificos — menos itens genericos, mais itens relevantes.
> O custo de PA permanece 30 PA (definido no documento economico aprovado). A reducao e
> de custo de provedor de IA (tokens faturados pela Anthropic/Google), nao de PA.
>
> Estimativa de reducao de tokens de OUTPUT do checklist: 15-25% por maior especificidade.
> Estimativa de reducao de tokens de OUTPUT do roteiro: 10-20% por menor necessidade de
> incluir informacoes de destino que o Guia ja cobriu.
> Estas estimativas devem ser validadas pelo prompt-engineer antes da implementacao.
> DECISAO PENDENTE DP-002: prompt-engineer deve revisar e confirmar (ou refutar) estas
> estimativas antes do inicio do Sprint 44.

### 4.3 Impacto em Engajamento — Hipotese

| Metrica | Hipotese de Impacto | Mecanismo |
|---|---|---|
| Taxa de conclusao de fases 3-6 | +15-25% | Remocao da "barreira burocratica" antes do conteudo inspirador |
| Taxa de geracao do Guia | +20-30% | Guia na posicao 3 e a primeira feature de IA que o usuario encontra |
| Taxa de conclusao do Checklist | +10-20% | Usuario chega no checklist ja comprometido com a expedicao |
| Abandono de wizard antes do Roteiro | -20-30% | Roteiro agora e a 4a fase, nao a 6a |

> Estas hipoteses devem ser instrumentadas como eventos de analytics para validacao
> nas primeiras 2 semanas apos o deploy.

---

## 5. Economia de PA — Impacto da Reordenacao

### 5.1 Custos de IA

Os custos de PA POR FEATURE nao mudam. Os valores sao definidos no documento economico
`docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md` e nao sao alterados por esta spec:

| Constante | Valor atual | Valor apos reordenacao | Status |
|---|---|---|---|
| `AI_COSTS.ai_accommodation` (Guia) | 50 PA | 50 PA | SEM MUDANCA |
| `AI_COSTS.ai_itinerary` (Roteiro) | 80 PA | 80 PA | SEM MUDANCA |
| `AI_COSTS.ai_route` (Checklist) | 30 PA | 30 PA | SEM MUDANCA |
| **Total por expedicao** | **160 PA** | **160 PA** | **SEM MUDANCA** |

### 5.2 Ganhos de PA por Fase — Nova Sequencia

A tabela de ganhos de PA por fase em `ATLAS-GAMIFICACAO-APROVADO.md` Secao 2.1 usa os
NOMES DAS FASES, mas os valores foram associados a posicoes numericas. A reordenacao
exige que as associacoes nome-valor sejam mantidas. As fases ganham PA pelo que SAO,
nao pelo numero da sua posicao:

| Nome da Fase | PA ganhos (atual) | PA ganhos (novo) | Tipo de Transacao |
|---|---|---|---|
| A Inspiracao | 100 | 100 | `phase_complete` |
| O Perfil | 150 | 150 | `phase_complete` |
| Guia do Destino | 40 | 40 | `phase_complete` |
| O Roteiro | 250 | 250 | `phase_complete` |
| A Logistica | 50 | 50 | `phase_accommodation` |
| O Preparo | 75 | 75 | `phase_checklist` |
| **Total Fases 1-6** | **665** | **665** | |

> Os valores sao identicos. A reordenacao nao altera o total de PA ganho por expedicao.

### 5.3 Sequencia de Ganho de PA no Onboarding

O usuario que chega ao Atlas com 180 PA de boas-vindas e usa as features de IA progressivamente:

#### Sequencia Atual (ordem antiga)
```
Bonus inicial:  +180 PA  (saldo: 180)
Fase 1:         +100 PA  (saldo: 280)
Fase 2:         +150 PA  (saldo: 430)
Fase 3 (Prep):  +75 PA   (saldo: 505) — gera checklist -30 PA => saldo: 475
Fase 4 (Log):   +50 PA   (saldo: 525)
Fase 5 (Guia):  +40 PA   (saldo: 565) — gera guia -50 PA => saldo: 515
Fase 6 (Rot):   +250 PA  (saldo: 765) — gera roteiro -80 PA => saldo: 685

Saldo minimo antes de cada gasto de IA:
  - Checklist: 505 PA -> 475 PA (usuario NUNCA fica sem PA aqui)
  - Guia:      565 PA -> 515 PA (usuario NUNCA fica sem PA aqui)
  - Roteiro:   765 PA -> 685 PA (usuario NUNCA fica sem PA aqui)
```

#### Sequencia Nova (nova ordem) — MUDANCA DE COMPORTAMENTO
```
Bonus inicial:  +180 PA  (saldo: 180)
Fase 1:         +100 PA  (saldo: 280)
Fase 2:         +150 PA  (saldo: 430)
Fase 3 (Guia):  +40 PA   (saldo: 470) — usuario clica "Gerar Guia" -50 PA => saldo: 460
Fase 4 (Rot):   +250 PA  (saldo: 710) — usuario clica "Gerar Roteiro" -80 PA => saldo: 630
Fase 5 (Log):   +50 PA   (saldo: 680)
Fase 6 (Prep):  +75 PA   (saldo: 755) — usuario clica "Gerar Checklist" -30 PA => saldo: 725

Saldo antes de cada gasto de IA (cenario sem interacoes entre fases):
  - Guia:      470 PA -> 420 PA  (usuario TEM saldo suficiente: 420 >= 50 OK)
  - Roteiro:   670 PA -> 590 PA  (usuario TEM saldo suficiente: 590 >= 80 OK) (*)
  - Checklist: 755 PA -> 725 PA  (usuario TEM saldo suficiente: 725 >= 30 OK)
```

(*) Saldo antes do Roteiro na nova ordem:
- Bonus (180) + Fase 1 (100) + Fase 2 (150) + Fase 3-ganho (40) - Guia-custo (50) + Fase 4-ganho (250) = 670 PA disponivel antes de gastar com o Roteiro. Saldo liquido apos o Roteiro: 590 PA. Suficiente.

> CONCLUSAO IMPORTANTE: O bonus de boas-vindas de 180 PA continua cobrindo uma expedicao
> completa incluindo todas as 3 features de IA (160 PA total), na nova sequencia tambem.
> O principio de "Generosidade no onboarding" (ATLAS-GAMIFICACAO-APROVADO.md Sec 1.2)
> e preservado. Saldo minimo apos completar todas as 6 fases com IA: 725 PA (vs 685 PA
> na sequencia antiga) — a nova ordem e ligeiramente mais favoravel ao usuario porque
> o Roteiro (maior recompensa: 250 PA) vem antes da Logistica e do Preparo.

### 5.4 Impacto nos Ranks

Os ranks sao calculados sobre `totalPoints` (pontos ganhos por atividade). A reordenacao
nao altera os valores ganhos por fase, apenas a sequencia em que sao ganhos.

Impacto: o usuario pode atingir o rank `desbravador` (300 PA) ligeiramente mais cedo
na sequencia nova, pois a Fase 3 (Guia) tem ganho de 40 PA enquanto a Fase 3 antiga
(Checklist) tem 75 PA. Ou seja, na nova ordem, o usuario chega ao rank desbravador
apos Fase 2 (Bonus 180 + F1 100 + F2 150 = 430 PA > 300) — mesmo que antes.
Nenhuma mudanca de logica e necessaria nas regras de rank.

O gatilho `Capitao` (1.500 PA, gatilho: conclusao da Fase 5) deve ser reavaliado:
- Atual: Fase 5 = Guia do Destino (totalPoints apos F1+F2+F3+F4+F5 = 100+150+75+50+40 = 415 PA acumulado de fases)
- Novo: Fase 5 = A Logistica (totalPoints apos F1+F2+F3+F4+F5 = 100+150+40+250+50 = 590 PA acumulado de fases)
- Threshold do rank Capitao: 1.500 PA (inclui bonus 180 + perfil 275 + preferencias 80 + logins + etc.)
- O gatilho continua sendo logicamente correto (Fase 5 e ainda uma fase intermediaria relevante).

> DECISAO PENDENTE DP-003: O campo `rankPromotion` na configuracao de fase (phase-config)
> associa o gatilho de rank `capitao` a "conclusao da Fase 5". Com a reordenacao, "Fase 5"
> passa a ser "A Logistica" (era "Guia do Destino"). Confirmar com PO se o gatilho de
> promoc'ao ao rank Capitao deve permanecer na posicao 5 (A Logistica — novo) ou ser
> movido para permanecer associado ao mesmo nome de fase ("Guia do Destino" — agora posicao 3).
> Recomendacao do PO: manter o gatilho de Capitao atrelado ao NOME "Guia do Destino"
> (nova posicao 3), pois o gatilho semantico "usuario que criou o guia esta engajado o
> suficiente para ser Capitao" faz mais sentido do que "usuario que preencheu logistica".
> Esta recomendacao requer aprovacao do PO antes da implementacao.

---

## 6. Impacto no Relatorio da Expedicao (Expedition Summary)

O relatorio da expedicao (Summary) exibe as 6 fases em ordem sequencial. Com a reordenacao,
as secoes do relatorio devem seguir a nova ordem:

### 6.1 Nova Ordem das Secoes no Relatorio

| Ordem no Relatorio | Secao | Especificacao de conteudo |
|---|---|---|
| 1 | A Inspiracao | Destino, datas, origem, proposito |
| 2 | O Perfil | Estilo de viagem, passageiros, preferencias |
| 3 | Guia do Destino | Preview do guia gerado (top 3 destaques) |
| 4 | O Roteiro | Resumo do roteiro (dias, top atividades) |
| 5 | A Logistica | Transportes, hospedagens, mobilidade local |
| 6 | O Preparo | Status do checklist (X de Y itens concluidos) |

### 6.2 Impacto nas Specs de Conteudo do Summary

O arquivo `docs/specs/sprint-40/SPEC-SUMARIO-CONTEUDO.md` define o contrato de conteudo do
Relatorio de Expedicao. Ele deve ser atualizado para refletir a nova ordem das secoes.
Esta atualizacao e responsabilidade do product-owner e deve ocorrer antes do inicio do
Sprint 44. Sera documentada como versao 2.0.0 de SPEC-SUMARIO-CONTEUDO.

---

## 7. Politica para Expedicoes Existentes em Andamento

### 7.1 Contexto do Problema

No momento do deploy da reordenacao, existirao expedicoes criadas pelos usuarios que:
- Ja completaram algumas fases na ordem ANTIGA.
- Tem dados gravados em fases especificas (ex: Phase 4 = Logistica com dados de transporte).
- Tem PA ja gasto em geracoes de IA em fases especificas.

### 7.2 Opcoes Avaliadas

**Opcao A — Migracao in-place (renumerar fases automaticamente)**
- O sistema remapeia automaticamente os numeros de fase: dados da antiga Phase 4 viram Phase 5, dados da antiga Phase 5 viram Phase 3, etc.
- Pro: transparente para o usuario, sem interrupcao.
- Contra: risco alto de corrupcao de dados e de estado inconsistente (ex: usuario com Phase 3 "concluida" que agora e Phase 6 — mas o wizard mostra que Phase 3 esta "vazia" na nova ordem).
- Risco: A/B comparacao impossivel entre expedicoes antigas e novas.

**Opcao B — Finalizar na ordem antiga**
- Expedicoes criadas antes do deploy continuam usando a sequencia antiga ate serem concluidas ou arquivadas.
- Pro: zero risco de corrupcao de dados. Pro: usuario nao e surpreendido por mudanca mid-expedition.
- Contra: manutencao de duas sequencias em paralelo. Complexidade de desenvolvimento consideravel.

**Opcao C — Rollback voluntario**
- Usuario recebe um banner informativo sobre a nova ordem e pode escolher: "Atualizar minha expedicao para a nova sequencia" ou "Continuar na sequencia atual".
- Pro: agencia para o usuario. Contra: confuso (dois caminhos), exige UI adicional.

**Opcao D — Reset de fases nao-iniciadas, preservacao de fases com dados**
- Fases com dados gravados sao preservadas e remapeadas para o novo numero.
- Fases sem dados (nao iniciadas) simplesmente aparecem no novo slot vazio.
- O wizard exibe um banner no proximo acesso: "Reorganizamos as fases para um planejamento mais natural. Seus dados foram preservados."
- Pro: melhor equilibrio entre continuidade e clareza. Cons: requer logica de migracao de dados cuidadosa.

### 7.3 Recomendacao do PO — Opcao D com verificacao de estado

**Recomendar Opcao D**: migracao in-place com preservacao de dados e banner informativo.

Logica de migracao de estado por fase:

| Fase (nome) | Tem dados? | Acao |
|---|---|---|
| A Inspiracao | Sim (sempre) | Preservar na posicao 1 |
| O Perfil | Sim/Nao | Preservar ou manter vazia na posicao 2 |
| Guia do Destino | Sim (guideContent) | Preservar na posicao 3; conteudo ja gerado exibido sem custo |
| O Roteiro | Sim (itinerary) | Preservar na posicao 4; conteudo ja gerado exibido sem custo |
| A Logistica | Sim/Nao | Preservar ou manter vazia na posicao 5 |
| O Preparo | Sim (checklist) | Preservar na posicao 6; checklist gerado exibido sem custo |

**Condicao critica**: Se uma expedicao tinha Phase 3 (Checklist) CONCLUIDA e Phase 5 (Guia)
NAO INICIADA na ordem antiga, apos a migracao ela tera:
- Posicao 3 (Guia): nao iniciada — estado vazio com botao de geracao.
- Posicao 6 (Checklist): concluida — dados preservados.

O wizard deve reconhecer que o "proximo passo" logico do usuario e a posicao 3 (Guia),
nao a posicao 4 (Roteiro), mesmo que o usuario tenha completado a posicao 6 na ordem antiga.
O engine de navegacao de fases (SPEC-PROD-001, SPEC-PROD-016) deve ser atualizado para
calcular "proxima fase nao concluida" com base nos DADOS PRESENTES, nao no numero de fase.

> DECISAO PENDENTE DP-004: Confirmar com PO e architect se a Opcao D e tecnicamente
> viavel sem risco de corrupcao de dados, ou se a Opcao B (duas sequencias em paralelo,
> usando um campo `expeditionVersion` na entidade Trip) e mais segura para o MVP.
> Esta e a decisao de maior impacto tecnico desta spec. Requer aprovacao antes do Sprint 44.

### 7.4 Banner Informativo para Expedicoes Migradas

Para expedicoes criadas antes do deploy:

- Exibir uma vez no proximo acesso ao wizard.
- Texto: "Melhoramos a sequencia de planejamento do Atlas para um fluxo mais natural. Seus dados de expedicao foram preservados integralmente. Descubra a nova ordem das fases e aproveite um planejamento mais fluido."
- CTA: "Entendi, continuar"
- O banner nao bloqueia a navegacao — e dispensavel com um clique.

---

## 8. Criterios de Aceite

### Navegacao e Ordem

- [ ] AC-001: Dado que um usuario inicia uma nova expedicao, quando o wizard e exibido, entao as fases aparecem nesta ordem: (1) A Inspiracao, (2) O Perfil, (3) Guia do Destino, (4) O Roteiro, (5) A Logistica, (6) O Preparo.

- [ ] AC-002: Dado que um usuario esta em qualquer fase, quando ele clica em uma fase anterior ja concluida no stepper de progresso, entao ele e redirecionado corretamente para aquela fase com seus dados preservados.

- [ ] AC-003: Dado que um usuario conclui a Fase 3 (Guia do Destino), quando a fase e marcada como concluida, entao o proximo passo automatico e a Fase 4 (O Roteiro), nao a Fase 3 antiga (O Preparo).

- [ ] AC-004: Dado o componente `AtlasPhaseProgress` na sidebar ou barra horizontal, quando renderizado para uma nova expedicao, entao as 6 fases aparecem em etiquetas na nova ordem, com os nomes corretos de cada fase.

### Gamificacao — Ganhos de PA

- [ ] AC-005: Dado que um usuario conclui a Fase 3 (Guia do Destino), quando o evento de conclusao e processado, entao o usuario recebe exatamente 40 PA (equivalente ao ganho anterior de "Completar Fase 5 — Guia do Destino") — sem mudanca de valor.

- [ ] AC-006: Dado que um usuario conclui a Fase 4 (O Roteiro), quando o evento de conclusao e processado, entao o usuario recebe exatamente 250 PA (equivalente ao ganho anterior de "Completar Fase 6 — O Roteiro") — sem mudanca de valor.

- [ ] AC-007: Dado que um usuario conclui a Fase 5 (A Logistica), quando o evento de conclusao e processado, entao o usuario recebe exatamente 50 PA (equivalente ao ganho anterior de "Completar Fase 4 — A Logistica") — sem mudanca de valor.

- [ ] AC-008: Dado que um usuario conclui a Fase 6 (O Preparo), quando o evento de conclusao e processado, entao o usuario recebe exatamente 75 PA (equivalente ao ganho anterior de "Completar Fase 3 — O Preparo") — sem mudanca de valor.

- [ ] AC-009: Dado um usuario com 180 PA de bonus de boas-vindas que completa as Fases 1 e 2 sem usar IA, quando ele chega na Fase 3 (Guia do Destino), entao seu saldo de `availablePoints` e suficiente para gerar o guia (>= 50 PA). Valor calculado: 180 + 100 + 150 = 430 PA > 50 PA. OK.

- [ ] AC-010: Dado um usuario que completou as Fases 1, 2, e gerou o Guia (Fase 3), quando ele chega na Fase 4 (O Roteiro), entao seu saldo e suficiente para gerar o roteiro (>= 80 PA). Valor calculado: (180+100+150+40) - 50 = 420 PA > 80 PA. OK.

### Historico de Transacoes

- [ ] AC-011: Dado que a reordenacao foi aplicada, quando um usuario visualiza seu historico de transacoes em "Meu Atlas > Meu Saldo", entao as descricoes das transacoes de ganho de PA exibem o NOME da fase (ex: "Conclusao — Guia do Destino"), nao a posicao numerica (nao deve exibir "Conclusao — Fase 3").

### Relatorio da Expedicao

- [ ] AC-012: Dado uma expedicao com todas as 6 fases concluidas, quando o usuario acessa o Relatorio da Expedicao (Summary), entao as secoes aparecem na nova ordem: Inspiracao > Perfil > Guia > Roteiro > Logistica > Preparo.

### Expedicoes Migradas

- [ ] AC-013: Dado uma expedicao criada antes do deploy da reordenacao com dados em Fases 3 e 4 antigas (Checklist e Logistica), quando o usuario acessa o wizard pela primeira vez apos o deploy, entao um banner informativo e exibido uma unica vez com o texto definido na Secao 7.4 desta spec.

- [ ] AC-014: Dado uma expedicao migrada com conteudo de guia ja gerado (guideContent existente), quando o usuario acessa a nova Fase 3 (Guia do Destino), entao o conteudo e exibido imediatamente sem estado vazio e sem debito de PA — exatamente como o comportamento de "revisita" definido em SPEC-PROD-055.

- [ ] AC-015: Dado uma expedicao migrada, quando o usuario navega pelo wizard, entao nenhum dado existente (transporte, hospedagem, checklist, guia, roteiro) e perdido ou corrompido.

### IA — Contexto Enriquecido

- [ ] AC-016: Dado que a Fase 4 (O Roteiro na nova ordem) e gerada, quando o prompt e construido, entao ele inclui o conteudo resumido do Guia do Destino (Fase 3) como contexto adicional — alem do destino, datas e perfil do viajante.

- [ ] AC-017: Dado que a Fase 6 (O Preparo na nova ordem) gera o checklist, quando o prompt e construido, entao ele inclui: destino, passageiros, atividades principais do roteiro (Fase 4), e modal de transporte decidido (Fase 5) como contexto — alem do tipo de viagem e datas.

### Acessibilidade

- [ ] AC-018: Dado a nova ordem de fases no stepper de progresso, quando auditado com axe-core (WCAG 2.1 AA), entao zero violacoes sao reportadas para o componente de navegacao de fases.

- [ ] AC-019: Dado o banner informativo de migracao (AC-013), quando exibido, entao ele e acessivel via teclado (dispensavel com Enter/Escape) e anunciado por leitores de tela via `aria-live`.

---

## 9. Escopo

### Em Escopo

- Reordenacao da sequencia de fases no wizard de expedicao (fases 3, 4, 5, 6).
- Atualizacao do motor de navegacao de fases para respeitar a nova sequencia.
- Atualizacao dos ganhos de PA por fase para manter associacao correta nome-valor.
- Atualizacao do Relatorio de Expedicao para refletir a nova ordem.
- Banner informativo para expedicoes migradas.
- Atualizacao do contexto de prompt das Fases 4 (Roteiro) e 6 (Checklist) para usar dados das fases anteriores na nova ordem.
- Atualizacao de `ATLAS-GAMIFICACAO-APROVADO.md` para refletir a nova associacao posicao-nome-valor (delta definido na Secao 11 desta spec).
- Atualizacao de `SPEC-SUMARIO-CONTEUDO.md` para nova ordem de secoes.

### Fora de Escopo

- Alteracao nos valores de PA (custos de IA ou ganhos por fase).
- Alteracao nos nomes das fases.
- Adicao ou remocao de fases.
- Alteracao no conteudo interno de cada fase.
- Redesign visual das fases (coberto por SPEC-PROD-051 a 053).
- Fases 7 e 8 ("A Expedicao", "O Legado") — nao ativas no MVP, nao afetadas.
- Sistema de badges — os badges sao event-driven por nome de fase, nao por posicao numerica. Verificar impacto especificamente para o badge `detalhista` (Preencher todos os campos da Fase 4). Com a reordenacao, "Fase 4" passa a ser "O Roteiro", nao "A Logistica". O badge deve ser re-associado ao nome "A Logistica".
  > DECISAO PENDENTE DP-005: Confirmar qual e o criterio correto para o badge `detalhista`
  > apos a reordenacao. Recomendacao: manter o criterio como "preencher todos os campos da
  > A Logistica" (independente de qual numero de fase ela tenha).

---

## 10. Restricoes

### Seguranca

- A verificacao de BOLA (acesso ao `tripId` por `userId` autenticado) deve continuar funcionando corretamente para todas as fases, independentemente da sua nova posicao numerica.
- O debito de PA por geracao de IA continua sendo validado no servidor. A reordenacao nao altera as regras de atomicidade (SPEC-PROD-055 BR-001 a BR-007 permanecem validos).
- Nenhuma nova coleta de dados pessoais e introduzida por esta spec.

### Acessibilidade

- O stepper de progresso (lateral em desktop, horizontal em mobile) deve comunicar a ordem das 6 fases de forma clara e acessivel, incluindo qual e a fase atual, quais estao concluidas e quais estao pendentes — tudo via `aria-label` e `aria-current`.
- WCAG 2.1 AA para todos os componentes de navegacao afetados.

### Performance

- O calculo de "proxima fase" pelo motor de navegacao deve ser O(1) — lookup em configuracao estatica, nao query de banco.
- O banner de migracao deve ser armazenado em estado de sessao (nao banco de dados) para nao adicionar uma query extra em cada carregamento do wizard.

### Integridade da Economia PA

- Os valores de PA definidos em `ATLAS-GAMIFICACAO-APROVADO.md` sao autoritativos e nao podem ser alterados por esta spec. Esta spec apenas reordena QUANDO durante a expedicao esses valores sao ganhos ou gastos.
- O principio "Generosidade no onboarding" (bonus de 180 PA cobre uma expedicao completa de IA) permanece valido na nova sequencia — demonstrado na Secao 5.3.

---

## 11. Delta de Atualizacao — ATLAS-GAMIFICACAO-APROVADO.md

> Esta secao define EXATAMENTE o que deve ser alterado em `ATLAS-GAMIFICACAO-APROVADO.md`
> quando esta spec for aprovada. NAO EDITAR o arquivo antes da aprovacao desta spec.

### 11.1 Secao 1.3 — Resumo dos Valores

Linha atual:
```
| `AI_COSTS.ai_route` (Fase 3 — Checklist) | 30 PA |
| `AI_COSTS.ai_accommodation` (Fase 5 — Guia do Destino) | 50 PA |
| `AI_COSTS.ai_itinerary` (Fase 6 — O Roteiro) | 80 PA |
```

Deve se tornar:
```
| `AI_COSTS.ai_route` (Fase 6 — O Preparo / Checklist) | 30 PA |
| `AI_COSTS.ai_accommodation` (Fase 3 — Guia do Destino) | 50 PA |
| `AI_COSTS.ai_itinerary` (Fase 4 — O Roteiro) | 80 PA |
```

### 11.2 Secao 2.1 — Tabela Completa de Ganhos

As linhas que referenciam numeros de fase devem ser atualizadas para refletir a nova posicao:

Linhas atuais:
```
| Completar Fase 3 — O Preparo | 75 | `phase_checklist` | Por expedicao | Sim (por trip) |
| Completar Fase 4 — A Logistica | 50 | `phase_accommodation` | Por expedicao | Sim (por trip) |
| Completar Fase 5 — Guia do Destino | 40 | `phase_complete` | Por expedicao | Sim (por trip) |
| Completar Fase 6 — O Roteiro | 250 | `phase_complete` | Por expedicao | Sim (por trip) |
```

Devem se tornar:
```
| Completar Fase 3 — Guia do Destino | 40 | `phase_complete` | Por expedicao | Sim (por trip) |
| Completar Fase 4 — O Roteiro | 250 | `phase_complete` | Por expedicao | Sim (por trip) |
| Completar Fase 5 — A Logistica | 50 | `phase_accommodation` | Por expedicao | Sim (por trip) |
| Completar Fase 6 — O Preparo | 75 | `phase_checklist` | Por expedicao | Sim (por trip) |
```

> NOTA: O total de 665 PA (Fases 1-6) permanece identico. Apenas a ordem das linhas e os
> numeros de fase mudam.

### 11.3 Secao 2.2 — Tabela de Custos de IA

Linhas atuais:
```
| Gerar Checklist (ai_route) | 30 | `ai_usage` | Fase 3 — O Preparo |
| Gerar Guia do Destino (ai_accommodation) | 50 | `ai_usage` | Fase 5 — Guia do Destino |
| Gerar O Roteiro (ai_itinerary) | 80 | `ai_usage` | Fase 6 — O Roteiro |
```

Devem se tornar:
```
| Gerar Guia do Destino (ai_accommodation) | 50 | `ai_usage` | Fase 3 — Guia do Destino |
| Gerar O Roteiro (ai_itinerary) | 80 | `ai_usage` | Fase 4 — O Roteiro |
| Gerar Checklist (ai_route) | 30 | `ai_usage` | Fase 6 — O Preparo |
| **Total por expedicao** | **160** | | |
```

### 11.4 Secao 3.1 — Tabela de Ranks (Linha do Capitao)

Linha atual:
```
| Capitao | `capitao` | 1.500 | Conclusao da Fase 5 |
```

Apos aprovacao de DP-003, deve se tornar:
```
| Capitao | `capitao` | 1.500 | Conclusao da Fase 3 — Guia do Destino |
```

### 11.5 Secao 5.1 — Modal de Boas-vindas (Passo 2)

O texto atual menciona as features de IA sem referenciar numeros de fase — sem mudanca necessaria.
O texto "gere seu checklist de documentos, guia de destino e roteiro completo" permanece correto
(menciona os tres por nome, nao por numero de fase).

### 11.6 Historico de Revisoes

Adicionar entrada:
```
| 2.0.0 | 2026-04-15 | product-owner | Reordenacao de fases: Guia (5->3), Roteiro (6->4), Logistica (4->5), Preparo (3->6). Valores de PA sem mudanca. |
```

---

## 12. Metricas de Sucesso

| Metrica | Baseline | Meta (4 semanas pos-deploy) | Metodo de medicao |
|---|---|---|---|
| Taxa de conclusao das 6 fases | Atual (desconhecida — instrumentar pre-deploy) | +15% vs baseline | Evento `expedition_completed` / `expedition_created` |
| Taxa de geracao do Guia do Destino | Atual desconhecida | +20% vs baseline | Evento `ai_generation_triggered` (phase: guide) |
| Taxa de abandono antes do Roteiro | Atual desconhecida | -20% vs baseline | Funil de eventos por fase |
| Taxa de conclusao do Checklist | Atual desconhecida | +10% vs baseline | Evento `phase_completed` (phase: preparo) |
| PA gasto em geracoes de Guia | Atual desconhecida | +25% vs baseline (mais usuarios gerando) | Transacoes `ai_usage` (type: ai_accommodation) |
| Erros de dados corrompidos em expedicoes migradas | N/A | 0 (zero tolerancia) | Error tracking (Sentry) |
| NPS qualitativo sobre a sequencia de fases | Negativo (feedback recorrente de "chato") | Sem mencoes negativas em sessoes de teste pos-deploy | Sessoes de teste qualitativas |

---

## 13. Riscos de Produto

| ID | Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|---|
| RISK-001 | Corrupcao de dados em expedicoes migradas (fases com dados remapeados incorretamente) | Media | Alta | Opcao D com rollback tecnico (campo `expeditionVersion`). Testes de migracao obrigatorios antes do deploy. |
| RISK-002 | Usuario confuso ao encontrar Guia antes de Logistica (expectativa formada pelo V1) | Media | Media | Banner informativo de migracao. Tour relampago (3 tooltips) na primeira visita pos-reordenacao. |
| RISK-003 | Estimativas de reducao de tokens nao se concretizam (prompt de Roteiro com contexto do Guia pode ser MAIOR) | Media | Baixa | Validacao pelo prompt-engineer antes da implementacao (DP-002). Nao e um risco de produto — e um risco de custo operacional. |
| RISK-004 | Engine de navegacao de fases (SPEC-PROD-016) nao suporta reordenacao dinamica sem refatoracao | Baixa | Alta | Identificar na fase de SPEC-ARCH antes do Sprint 44. Se refatoracao necessaria, alocar 2-3 dias extras. |
| RISK-005 | Badge `detalhista` associado a "Fase 4" no codigo — apos reordenacao "Fase 4" e O Roteiro, nao A Logistica | Alta | Media | Decisao DP-005: re-associar badge por nome de fase, nao numero. Verificar implementacao atual do BadgeEngine. |
| RISK-006 | PA acumulado pelo usuario antes da geracao do Guia (nova Fase 3) pode ser insuficiente se houver bug no bonus de boas-vindas | Baixa | Alta | AC-009 e AC-010 sao criterios de aceite especificamente para este cenario. |
| RISK-007 | Historico de transacoes de PA com referencias a "Fase X" no banco de dados ficara semanticamente errado para transacoes antigas | Media | Baixa | As descricoes de transacoes ja devem usar nome da fase, nao numero (AC-011). Se houver referencias numericas no banco, planejar migracao de dados de texto como parte do Sprint 44. |

---

## 14. Dependencias

| Dependencia | Status | Notas |
|---|---|---|
| SPEC-PROD-001 (Expedition Navigation & Phase Sequencing) | Implemented | Motor de navegacao que sera reconfigurado |
| SPEC-PROD-016 (Phase Navigation Engine) | Implemented | Logica de "proxima fase" que deve respeitar nova ordem |
| SPEC-PROD-055 (Manual AI Generation) | Approved | Comportamento de geracao manual permanece valido para todas as fases de IA |
| SPEC-GUIA-PERSONALIZACAO | Draft — Sprint 41 | Compativel com a reordenacao (personaliza Phase 5 -> agora Phase 3) |
| SPEC-ROTEIRO-REGEN-INTELIGENTE | Draft — Sprint 41 | Compativel com a reordenacao (regenera Phase 6 -> agora Phase 4) |
| SPEC-SUMARIO-CONTEUDO | Draft — Sprint 40 | Deve ser atualizado para nova ordem de secoes (v2.0.0) |
| ATLAS-GAMIFICACAO-APROVADO.md | v1.1.0 Aprovado | Delta definido na Secao 11 desta spec |
| SPEC-ARCH-REORDER-PHASES (a criar) | A criar — Sprint 44 | Architect deve criar spec tecnica para migracao de dados, reconfig de phase-config, e impacto em BadgeEngine |

---

## 15. Vendor Independence

Esta spec define O QUE muda na sequencia de planejamento e O QUE o usuario experimenta —
nao COMO e implementado tecnicamente. Nao faz referencia a Next.js, Prisma, React, ou
qualquer biblioteca especifica. Detalhes de implementacao pertencem ao SPEC-ARCH-REORDER-PHASES
correspondente, a ser criado pelo architect antes do Sprint 44.

---

## 16. Decisoes Pendentes — Aprovacao Humana Requerida Antes do Sprint 44

As decisoes abaixo requerem resposta do PO (usuario humano) antes do inicio da implementacao.
Nenhuma delas pode ser assumida pelo time de desenvolvimento.

| ID | Decisao | Opcoes | Impacto se nao decidido | Recomendacao do PO |
|---|---|---|---|---|
| DP-001 | O comportamento de geracao manual do Checklist (Fase 6 nova, 30 PA, estado vazio + CTA) deve ser formalizado nesta spec ou em spec separada? | (A) Incluir aqui como extensao de SPEC-PROD-055; (B) Criar SPEC-PROD-056 dedicado | Sprint 44 nao pode implementar a Fase 6 sem este comportamento especificado | Recomendado: Opcao A (incluir nesta spec como Secao 5.3, evita uma spec extra para comportamento analogo) |
| DP-002 | O prompt-engineer deve validar as estimativas de reducao de tokens (10-25%) antes do Sprint 44 iniciar? | (A) Sim, validar antes; (B) Implementar e medir pos-deploy | Se Opcao B: risco de nao atingir a justificativa de reducao de tokens da spec | Recomendado: Opcao A (validar antes — a reducao de tokens e parte da justificativa de negocio) |
| DP-003 | O gatilho de rank `capitao` (1.500 PA) deve permanecer associado a posicao numerica 5 (A Logistica — novo) ou ao nome "Guia do Destino" (nova posicao 3)? | (A) Manter por posicao 5; (B) Mover para "Guia do Destino" (posicao 3) | Impacto na semantica do rank e em quando o usuario e promovido | Recomendado: Opcao B (gatilho semantico faz mais sentido em "Guia do Destino") |
| DP-004 | Politica de migracao para expedicoes existentes: Opcao D (migracao in-place com banner) ou Opcao B (duas sequencias em paralelo via `expeditionVersion`)? | (A) Opcao D — mais simples, risco de dados; (B) Opcao B — mais seguro, mais complexo | E a decisao tecnica mais critica desta spec — architect nao pode iniciar sem ela | Recomendado: Opcao D se architect confirmar viabilidade tecnica sem risco de dados; Opcao B como fallback |
| DP-005 | O badge `detalhista` (preencher todos os campos de "Fase 4") deve ser re-associado ao nome "A Logistica" (independente da posicao numerica) ou manter a associacao ao numero 4 (que sera O Roteiro)? | (A) Associar por nome "A Logistica"; (B) Associar por posicao 4 (O Roteiro — novo) | Badge `detalhista` se tornaria incorreto semanticamente se mantido na posicao 4 | Recomendado: Opcao A (associar por nome de fase — consistente com AC-011) |

---

## Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-04-15 | product-owner | Versao inicial — Sprint 44. Nova sequencia de fases, justificativa de negocio, economia PA, politica de migracao, delta ATLAS-GAMIFICACAO-APROVADO.md |
