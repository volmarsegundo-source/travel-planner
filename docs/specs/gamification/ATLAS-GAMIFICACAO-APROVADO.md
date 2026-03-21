# Atlas Gamificacao — Documento Aprovado

**Versao**: 1.1.0
**Data de aprovacao**: 2026-03-21
**Autor**: product-owner
**Status**: APROVADO — fonte da verdade para a economia de PA
**Proxima revisao**: Sprint 37 (antes da integracao de pagamento)

> Este documento define o sistema completo de Pontos Atlas (PA). Todo o codigo, UI e comunicacao de marketing devem ser consistentes com este documento. Divergencias constituem spec drift (bug P0).

---

## 1. Visao Geral do Sistema PA

### 1.1 O que e PA?

Pontos Atlas (PA) e a moeda virtual do Atlas Travel Planner. PA representa o progresso do viajante dentro da plataforma e e o combustivel que aciona as funcionalidades de IA.

### 1.2 Principios da Economia PA

| Principio | Descricao |
|---|---|
| Transparencia total | O usuario sempre ve seu saldo, o custo de cada acao e o historico completo |
| Consentimento antes do gasto | Nenhum PA e debitado sem confirmacao explicita do usuario |
| Generosidade no onboarding | O bonus de boas-vindas cobre pelo menos uma expedicao completa com todas as features de IA |
| Recompensa pelo progresso | Completar fases e preencher o perfil gera PA organicamente |
| Sem dark patterns | Nunca esconder custos, nunca debitar silenciosamente, nunca criar urgencia artificial |

### 1.3 Resumo dos Valores (fonte: gamification.types.ts)

| Constante | Valor |
|---|---|
| `WELCOME_BONUS` | 180 PA |
| `AI_COSTS.ai_itinerary` (Fase 6 — O Roteiro) | 80 PA |
| `AI_COSTS.ai_route` (Fase 3 — Checklist) | 30 PA |
| `AI_COSTS.ai_accommodation` (Fase 5 — Guia do Destino) | 50 PA |
| `AI_COSTS.ai_regenerate` | 0 PA (regeneracao custa o mesmo que geracao original) |
| `EARNING_AMOUNTS.daily_login` | 10 PA |
| `EARNING_AMOUNTS.checklist` | 20 PA |
| `EARNING_AMOUNTS.review` | 500 PA |
| `EARNING_AMOUNTS.referral` | 300 PA |
| `PROFILE_FIELD_POINTS` (por campo) | 25 PA |

---

## 2. Economia de PA

### 2.1 Ganhar PA

#### Tabela Completa de Ganhos

| Evento | PA | Tipo de Transacao | Frequencia | Idempotente? |
|---|---|---|---|---|
| Bonus de boas-vindas (registro) | 180 | `purchase` | Unico | Sim |
| Completar Fase 1 — O Chamado | 100 | `phase_complete` | Por expedicao | Sim (por trip) |
| Completar Fase 2 — O Explorador | 150 | `phase_complete` | Por expedicao | Sim (por trip) |
| Completar Fase 3 — O Preparo | 75 | `phase_checklist` | Por expedicao | Sim (por trip) |
| Completar Fase 4 — A Logistica | 50 | `phase_accommodation` | Por expedicao | Sim (por trip) |
| Completar Fase 5 — Guia do Destino | 40 | `phase_complete` | Por expedicao | Sim (por trip) |
| Completar Fase 6 — O Roteiro | 250 | `phase_complete` | Por expedicao | Sim (por trip) |
| Completar Fase 7 — A Expedicao (*) | 400 | `phase_complete` | Por expedicao | Sim (por trip) |
| Completar Fase 8 — O Legado (*) | 500 | `phase_complete` | Por expedicao | Sim (por trip) |
| Login diario | 10 | `daily_login` | Uma vez por dia UTC | Sim (por dia) |
| Preencher campo de perfil | 25 | `profile_completion` | Por campo (max 11 campos = 275 PA) | Sim (por campo) |
| Indicar um amigo (referral) | 300 | `referral` | Por indicacao aprovada | Sim (por indicado) |
| Avaliar expedicao concluida | 500 | `review` | Uma vez por expedicao | Sim (por trip) |
| Completar checklist de perfil de preferencias | 10 | `preference_fill` | Por categoria preenchida (max 8 cats) | Sim (por categoria) |

(*) Fases 7 e 8 nao estao ativas no MVP. Os valores estao definidos para implementacao futura.

#### Calculo de PA Potencial por Expedicao Completa (Fases 1-6)

| Fonte | PA |
|---|---|
| Bonus de boas-vindas (unico) | 180 |
| Fases 1-6 completas | 665 |
| Perfil 100% preenchido (11 campos) | 275 |
| Preferencias (8 categorias) | 80 |
| Avaliacao da expedicao | 500 |
| **Total potencial (primeira expedicao)** | **1700** |

> Nota sobre o bonus de boas-vindas: os 180 PA de boas-vindas (50 PA criacao de conta + 100 PA tutorial + 30 PA perfil preenchido) cobrem uma expedicao completa incluindo Checklist (30 PA), Guia do Destino (50 PA) e O Roteiro (80 PA), totalizando 160 PA de gasto de IA maximo nas fases 1-6. Sobram 20 PA.

### 2.2 Gastar PA

PA e gasto exclusivamente em funcionalidades de IA. Cada gasto requer confirmacao explicita do usuario antes do debito.

#### Tabela de Custos de IA

| Funcionalidade de IA | PA | Tipo de Transacao | Fase |
|---|---|---|---|
| Gerar Checklist (ai_route) | 30 | `ai_usage` | Fase 3 — O Preparo |
| Gerar Guia do Destino (ai_accommodation) | 50 | `ai_usage` | Fase 5 — Guia do Destino |
| Gerar O Roteiro (ai_itinerary) | 80 | `ai_usage` | Fase 6 — O Roteiro |
| **Total por expedicao** | **160** | | |

> Regeneracao custa o mesmo que a geracao original (30/50/80 PA). Nao existe custo flat separado.

#### Regras de Gasto

1. **Confirmacao obrigatoria**: Modal de confirmacao exibido antes de qualquer debito. O usuario ve o custo e seu saldo atual antes de confirmar.
2. **Atomicidade**: O debito e a chamada de IA sao atomicos — se a IA falhar, o PA e estornado automaticamente.
3. **Saldo insuficiente**: Se o usuario nao tem PA suficiente, o botao de IA e desabilitado e um fluxo de saldo insuficiente e exibido (ver Secao 6).
4. **Regeneracao**: Regenerar custa o MESMO que a geracao original (30/50/80 PA conforme a feature). Nao ha desconto nem sobretaxa.

### 2.3 Comprar PA

Pacotes de PA sao comprados com dinheiro real via gateway de pagamento (integracao Sprint 37+).

#### Tabela de Pacotes

| Pacote | PA | Preco (BRL) | PA/Real | Economia vs menor pacote |
|---|---|---|---|---|
| Explorador | 500 PA | R$ 14,90 | 33,6 PA/R$ | — (referencia) |
| Navegador | 1.200 PA | R$ 29,90 | 40,1 PA/R$ | +19% |
| Cartografo | 2.800 PA | R$ 59,90 | 46,7 PA/R$ | +39% |
| Embaixador | 6.000 PA | R$ 119,90 | 50,0 PA/R$ | +49% |

#### Politica de Compra

- PA comprado nunca expira.
- PA de bonus de boas-vindas nunca expira.
- PA nao e reembolsavel apos gasto em funcionalidade de IA (o servico foi prestado).
- PA nao utilizado e reembolsavel em ate 7 dias apos a compra, desde que nao tenha sido parcialmente gasto (politica de consumidor LGPD/CDC compativel).
- Compras de PA nao dao direito a rank. O rank e calculado exclusivamente sobre `totalPoints` (pontos ganhos por atividade).

> Decisao de design: PA comprado incrementa `availablePoints` mas NAO incrementa `totalPoints`. Isso preserva a integridade do sistema de ranks — ranks refletem engajamento real, nao poder de compra.

---

## 3. Sistema de Ranks

O rank e calculado com base no `totalPoints` acumulado (pontos ganhos por atividade — exclui PA comprado).

### 3.1 Tabela de Ranks

| Rank | ID | Threshold (totalPoints) | Promocao Gatilho |
|---|---|---|---|
| Novato | `novato` | 0 | Registro |
| Desbravador | `desbravador` | 300 | Conclusao da Fase 2 |
| Navegador | `navegador` | 700 | — |
| Capitao | `capitao` | 1.500 | Conclusao da Fase 5 |
| Aventureiro | `aventureiro` | 3.500 | Conclusao da Fase 7 (*) |
| Lendario | `lendario` | 7.000 | — |

(*) Fases 7 e 8 nao ativas no MVP.

### 3.2 Regras de Rank

1. O rank so sobe, nunca desce.
2. A promocao de rank e disparada pelo PhaseEngine ao completar a fase configurada com `rankPromotion`.
3. O rank atual e exibido no header do usuario e na pagina "Meu Atlas".
4. Cada nivel de rank desbloqueia beneficios visuais (badge de rank, cor no avatar) — detalhes na spec UX.
5. Promocao de rank gera notificacao toast celebratoria e, opcionalmente, uma animacao de nivel.

### 3.3 Ranks vs. Badges

Ranks sao cumulativos e representam a jornada total do usuario. Badges sao conquistas especificas, atreladas a eventos discretos. Um usuario pode ter o rank `navegador` e ainda nao ter o badge `detalhista` se nao preencheu todos os campos da Fase 4.

---

## 4. Sistema de Badges

### 4.1 Tabela de Badges (16 badges em 4 categorias)

**Explorador (4)**

| BadgeKey | Nome | Gatilho |
|---|---|---|
| `primeira_viagem` | Primeira Viagem | Completar a primeira expedicao |
| `viajante_frequente` | Viajante Frequente | Completar 3 expedicoes |
| `globetrotter` | Globetrotter | Completar 5 expedicoes |
| `marco_polo` | Marco Polo | Completar 10 expedicoes |

**Perfeccionista (4)**

| BadgeKey | Nome | Gatilho |
|---|---|---|
| `detalhista` | Detalhista | Preencher todos os campos da Fase 4 em 1 expedicao |
| `planejador_nato` | Planejador Nato | Completar todas as 6 fases com 100% de dados |
| `zero_pendencias` | Zero Pendencias | Nenhum item pendente no relatorio de resumo |
| `revisor` | Revisor | Revisitar e atualizar uma fase ja concluida |

**Aventureiro (5)**

| BadgeKey | Nome | Gatilho |
|---|---|---|
| `sem_fronteiras` | Sem Fronteiras | Planejar uma viagem internacional |
| `em_familia` | Em Familia | Planejar uma viagem em familia com criancas |
| `solo_explorer` | Solo Explorer | Planejar uma viagem solo |
| `poliglota` | Poliglota | Usar o app em 2+ idiomas |
| `multicontinental` | Multicontinental | Planejar viagens para 3+ continentes |

**Veterano (4)**

| BadgeKey | Nome | Gatilho |
|---|---|---|
| `fiel` | Fiel | 10+ logins diarios |
| `maratonista` | Maratonista | Completar 3 expedicoes em 30 dias |
| `fundador` | Fundador | Registrado durante o periodo beta |
| `aniversario` | Aniversario | 1 ano desde o registro |

### 4.2 Regras de Badge

1. Badges sao idempotentes: um badge so pode ser concedido uma vez por usuario.
2. Badges nao expiram.
3. Badges nao sao transferiveis entre usuarios.
4. Badges sao event-driven (nao vinculados diretamente a fases no phase-config).
5. Na UI, badges nao conquistados sao exibidos com estado "bloqueado" e indicam o progresso necessario para desbloqueio.

---

## 5. Onboarding e Tutorial

### 5.1 Modal de Boas-vindas (Tutorial de PA)

Exibido uma unica vez no primeiro login apos o registro. Nao pode ser dispensado sem ler pelo menos o primeiro passo.

**Passo 1 — Bem-vindo ao Atlas**
- Titulo: "Bem-vindo ao Atlas, [primeiro nome]!"
- Conteudo: Explicacao do conceito de expedicao e fases.
- CTA: "Proximo"

**Passo 2 — Voce ganhou 180 PA**
- Titulo: "Seu bonus de boas-vindas chegou!"
- Conteudo: "Voce recebeu 180 Pontos Atlas (PA). Com eles voce pode usar a IA para gerar seu checklist de documentos, guia de destino e roteiro completo — tudo incluso."
- Visual: exibir saldo 180 PA de forma proeminente.
- CTA: "Proximo"

**Passo 3 — Como ganhar mais PA**
- Titulo: "PA nao acaba facil"
- Conteudo: "Complete fases, faca login todo dia e indique amigos para ganhar mais PA. Voce tambem pode comprar pacotes a qualquer momento."
- CTA: "Comecar minha expedicao"

### 5.2 Primeiro Acesso sem Expedicao

Apos o tutorial, o usuario e direcionado para criar sua primeira expedicao. O saldo PA (180) deve estar visivelmente presente no header desde o primeiro acesso.

### 5.3 Tooltip de Custo In-Line

Em qualquer botao que gaste PA, exibir um tooltip (ou texto auxiliar) com o custo antes do clique. Exemplo: "Gerar roteiro — 80 PA". Isso evita surpresas no modal de confirmacao.

---

## 6. Fluxo de Saldo Insuficiente

Quando o usuario tenta acionar uma feature de IA sem PA suficiente:

### 6.1 Estado Preventivo (antes do clique)

- O botao de IA e exibido com estado visual distinto (desabilitado ou com icone de aviso).
- Tooltip ou label: "Saldo insuficiente — [X] PA necessarios".
- O usuario ainda ve o custo da feature.

### 6.2 Modal de Saldo Insuficiente (se o usuario clicar mesmo assim)

- Titulo: "PA insuficiente"
- Conteudo: "Voce precisa de [X] PA para usar esta funcionalidade. Seu saldo atual e [Y] PA."
- Opcoes:
  1. "Comprar PA" — abre modal/pagina de pacotes.
  2. "Ver como ganhar PA gratis" — abre secao de como ganhar PA.
  3. "Fechar" — dispensa o modal sem acao.

### 6.3 Ganhar PA Gratis (alternativa ao pagamento)

Exibir resumo das formas gratuitas disponiveis para o usuario especifico:
- Login diario (+10 PA amanha)
- Campos de perfil nao preenchidos (listar com PA correspondente)
- Categorias de preferencias nao preenchidas
- Expedicoes com fases incompletas

---

## 7. Transparencia — Como Funciona

### 7.1 Pagina "Como Funciona o PA"

Pagina estatica acessivel do header e do modal de saldo insuficiente. Deve conter:

1. O que e PA e por que existe
2. Tabela completa de formas de ganhar PA
3. Tabela de custos de cada feature de IA
4. Tabela de pacotes de compra
5. Politica de expiracao (PA nao expira)
6. Politica de reembolso
7. Relacao entre PA, ranks e badges

### 7.2 Historico de Transacoes

Acessivel em "Meu Atlas" > "Meu Saldo". Exibir todas as transacoes paginadas com:
- Data e hora
- Descricao da transacao (ex: "Conclusao da Fase 3 — O Preparo")
- Valor (positivo = ganho, negativo = gasto)
- Saldo resultante

### 7.3 Principio LGPD

O saldo e historico de PA sao dados pessoais do usuario. Devem ser incluidos no export de dados (LGPD Art. 18) e anonimizados na exclusao de conta.

---

## 8. Dashboard Admin (Futuro — Sprint 38+)

> Esta secao define requisitos para implementacao futura. Nao faz parte do MVP.

### 8.1 Metricas de Economia

- Total de PA emitido (bonus + compras + ganhos por atividade)
- Total de PA gasto em IA
- Taxa de conversao de PA -> Compra de pacote
- Usuarios com saldo negativo (anomalia — deve ser 0)
- Distribuicao de saldo por faixa

### 8.2 Controles Administrativos

- Emitir PA para usuario especifico (com justificativa)
- Estornar transacao especifica (com justificativa)
- Ajustar preco de features de IA sem deploy (via feature flag)
- Pausar compra de pacotes (manutencao de gateway)

### 8.3 Alertas de Saude da Economia

- Alerta se taxa de gasto/ganho cair abaixo de threshold (usuarios acumulando PA sem usar)
- Alerta se conversao de insuficiente -> compra cair abaixo de 5%
- Relatorio semanal automatico para o PO

---

## Historico de Revisoes

| Versao | Data | Autor | Descricao |
|---|---|---|---|
| 1.0.0 | 2026-03-21 | product-owner | Documento inicial aprovado |
| 1.1.0 | 2026-03-21 | product-owner | Correcoes PO: welcome bonus 500->180 PA, AI costs 350->160 PA (30/50/80), ranks RPG (novato/desbravador/navegador/capitao/aventureiro/lendario), 16 badges em 4 categorias, regeneracao = custo original |
