# SPEC-PROD-016: Phase Navigation System — Definitive Requirements

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-16
**Contexto critico**: Revisao de produto solicitada apos 60%+ de falha em testes manuais de v0.23.0

---

## Contexto: Por que Este Documento Existe

SPEC-PROD-001 foi aprovada no Sprint 25 e marcada como "Implemented", mas a conformidade de QA foi de apenas 7/18 ACs. Os mesmos 5 bugs criticos foram "corrigidos" 5+ vezes em sprints consecutivos e continuam recorrendo. v0.23.0 tem 115 testes E2E passando mas taxa de falha manual de 60%+.

O problema nao e de execucao. E de especificacao incompleta. SPEC-PROD-001 definiu O QUE corrigir mas nao definiu o MODELO DE NAVEGACAO completo — as regras precisas que governam cada transicao de estado possivel do sistema. Sem um modelo de estados explicito, cada desenvolvedor infere regras diferentes, producindo comportamentos inconsistentes entre fases.

Este documento define o modelo de navegacao definitivo que SPEC-PROD-001 nao forneceu.

---

## SECAO 1 — MODELO DE ESTADOS (Fonte Unica da Verdade)

Cada fase pode estar exatamente em um de quatro estados:

| Estado | Definicao |
|--------|-----------|
| `NOT_STARTED` | Nenhum dado salvo. Usuario nunca abriu esta fase. |
| `IN_PROGRESS` | Usuario abriu e salvou dados parciais, mas nao concluiu. |
| `COMPLETED` | Campos obrigatorios preenchidos e salvos. Para fases com IA (3, 5, 6): geracao executada com sucesso. |
| `CURRENT` | Estado de UI. A fase que o usuario esta visualizando agora. Nao e persistido no banco de dados. |

**Regra critica**: `CURRENT` e um overlay de UI, nao um estado de banco de dados. Persistir `CURRENT` como estado de fase e um bug.

---

## SECAO 2 — REQUISITOS DE NAVEGACAO

### 2.1 — Quando o usuario pode avancar?

Apenas quando os dados da fase atual sao validos. Se os dados sao invalidos, o sistema exibe erros inline e nao navega. O save e atomico — a navegacao para N+1 so ocorre apos confirmacao de save bem-sucedido.

### 2.2 — Quando o usuario pode recuar?

**Sempre. Sem excecao.**

O botao Voltar nao valida dados. O usuario pode sair de qualquer fase com campos incompletos ou invalidos usando Voltar. Se houver alteracoes nao salvas, exibe dialogo de confirmacao com tres opcoes: "Salvar e Voltar", "Voltar sem Salvar", "Cancelar".

### 2.3 — O que acontece ao revisitar uma fase concluida?

Todos os dados previamente salvos devem estar pre-carregados no formulario. Nao pode haver flash de campos vazios. Os dados vem do banco de dados, nao de cache local.

### 2.4 — O que acontece ao tentar pular fases?

Se a fase de destino for `NOT_STARTED` e nao for a proxima fase esperada na sequencia: tooltip de bloqueio "Complete a Fase [N-1] primeiro" e nao navega. O usuario nunca e silenciosamente redirecionado para uma fase diferente da que clicou.

### 2.5 — Como a barra de progresso deve se comportar?

- Clique em fase `COMPLETED`: navega imediatamente
- Clique em fase `CURRENT`: sem acao
- Clique em fase `IN_PROGRESS` (nao-atual): navega
- Clique em fase `NOT_STARTED` fora de sequencia: tooltip de bloqueio, nao navega
- Apos conclusao de Phase 6 e retorno: TODAS as fases exibem `COMPLETED` — nunca inativas

### 2.6 — Happy path novo usuario

Phase 1 (preenche dados) -> Proximo -> Phase 2 (preferencias, passageiros se familia/grupo) -> Proximo -> Phase 3 (classificacao calculada automaticamente, gera checklist) -> Proximo -> Phase 4 (transporte, acomodacao, mobilidade) -> Proximo -> Phase 5 (gera guia) -> Proximo -> Phase 6 (gera roteiro) -> Concluir Expedicao -> Summary.

### 2.7 — Happy path edicao de viagem existente

Todas as fases COMPLETED -> clica qualquer fase na barra de progresso -> dados pre-carregados -> edita -> Proximo ou navega direto pelo Summary -> dados atualizados persistidos.

---

## SECAO 3 — CRITERIOS DE ACEITE

### Barra de Progresso

- **AC-001**: Clicar em fase `COMPLETED` na barra de progresso navega para essa fase com dados pre-carregados.
- **AC-002**: Clicar em fase `NOT_STARTED` fora de sequencia exibe tooltip "Complete a Fase [N-1] primeiro" e nao navega.
- **AC-003**: Tooltip de bloqueio desaparece apos 3 segundos ou clique em outro lugar.
- **AC-004**: Clicar na fase `CURRENT` nao causa acao nem erro.
- **AC-005**: Barra distingue os 4 estados usando pelo menos dois atributos visuais distintos por estado (nao apenas cor).
- **AC-006**: Cada segmento tem `aria-label` descritivo: "Fase N [nome], [estado]". Estado lido por screen readers sem depender de cor.
- **AC-007**: Cada segmento e ativavel por teclado (Tab + Enter/Space) seguindo as mesmas regras de navegacao.
- **AC-008**: Em 375px, todos os 6 segmentos visiveis sem scroll horizontal.

### Botao Voltar

- **AC-009**: Fase N > 1: clicar Voltar navega para Fase N-1 com dados pre-carregados.
- **AC-010**: Fase 6: clicar Voltar navega para Fase 5 com dados pre-carregados. (Resolve NAV-006.)
- **AC-011**: Fase 1: botao Voltar nao existe dentro do wizard.
- **AC-012**: Botao Voltar NAO valida dados da fase atual. Pode navegar com dados invalidos.
- **AC-013**: Alteracoes nao salvas ao clicar Voltar: dialogo com "Salvar e Voltar", "Voltar sem Salvar", "Cancelar". "Cancelar" mantem o usuario na fase atual.

### Botao Proximo

- **AC-014**: Dados validos: save bem-sucedido, fase atual -> `COMPLETED`, navega para N+1.
- **AC-015**: Dados invalidos: erros inline, sem navegacao, foco no primeiro campo com erro.
- **AC-016**: Falha no save: sem navegacao, mensagem de erro visivel, dados nao perdidos.
- **AC-017**: Fase 6: botao "Proximo" nao existe. Substituido por "Concluir Expedicao" que navega para Summary.

### Restauracao de Dados

- **AC-018**: Revisitar Fase 1 por qualquer metodo: nome, bio, destino, origem, data inicio, data fim pre-carregados.
- **AC-019**: AC-018 aplicado identicamente a todas as fases 2-6 com os dados listados na tabela de cobertura.
- **AC-020**: Sem flash de campos vazios. Dados presentes no render inicial ou skeleton loader exibido ate disponibilidade.
- **AC-021**: Edicao em fase revisitada + save: Summary reflete dados atualizados (nao dados antigos).

### Estado Pos-Conclusao

- **AC-022**: Apos concluir Fase 6 e retornar de qualquer forma: barra de progresso exibe todas as 6 fases como `COMPLETED`, nao inativas. (Resolve NAV-007.)
- **AC-023**: Estado `COMPLETED` de cada fase persistido no banco de dados e lido de la em cada carregamento. Nao inferido de estado local.

### Classificacao de Viagem

- **AC-024**: Origem e destino no mesmo pais -> classificacao "Viagem Nacional / Domestic Trip".
- **AC-025**: Paises diferentes, mesmo continente -> "Viagem Internacional / International Trip".
- **AC-026**: Continentes diferentes -> "Viagem Intercontinental / Intercontinental Trip".
- **AC-027**: Origem nao preenchida -> aviso em Phase 3 "Preencha a cidade de origem em Fase 1 para classificarmos sua viagem corretamente". Checklist nao gerado ate resolucao.
- **AC-028**: Alteracao de destino ou origem em Fase 1: classificacao recalculada. Se Phase 3 ja gerada: aviso "Seu destino foi alterado. Recomendamos regenerar o checklist."

### Identificacao de Fase e Etapa

- **AC-029**: Toda tela da expedicao exibe nome da fase atual e (quando multiplas etapas) numero da etapa. Visivel sem scroll em 375px e 1280px.
- **AC-030**: Mudanca de fase anunciada por screen readers.

### Guards

- **AC-031**: Guards de fase NUNCA bloqueiam navegacao retrograda. So aplicam-se a navegacao progressiva e a tentativas de pular fases via barra de progresso. (Resolve NAV-001.)
- **AC-032**: Guards de BOLA (autorizacao por tripId) permanecem ativos em todas as direcoes.

---

## SECAO 4 — CLASSIFICACAO DE IMPACTO DOS BUGS

### INUTILIZAVEL — P0, resolver imediatamente

| Bug | Por que INUTILIZAVEL |
|-----|---------------------|
| NAV-001: Guards bloqueiam navegacao valida | 100% dos usuarios nao conseguem completar a expedicao. Nao ha workaround. |
| NAV-002: Formulario vazio ao revisitar fase | Destroi confianca. Usuario perde dados ja inseridos. Terceiro carry consecutivo. |
| NAV-006: Phase 6 sem botao Voltar | Beco sem saida. Erro em Phase 6 = deletar expedicao inteira. Estava no Out of Scope de SPEC-PROD-001 — deve ser incluido agora. |

### GRAVE MAS NAO BLOQUEANTE — P1

| Bug | Por que P1 e nao P0 |
|-----|---------------------|
| NAV-003: Barra de progresso inconsistente | Usuario ainda pode avancar com botoes, mas nao sabe seu estado espacial. |
| NAV-005: Classificacao de viagem incorreta | Afeta qualidade do output de IA, mas usuario ainda pode completar o fluxo. |
| NAV-007: Barra inativa apos conclusao | Confuso mas Summary ainda e navegavel via links de edicao. |

### COSMETICO — P2

| Bug | Por que P2 |
|-----|-----------|
| NAV-004: Autocomplete transparente | Specs ja existem (SPEC-UX-001, implementado Sprint 27). Se ocorre, e regressao de CSS especifica. Validar se e regressao ou item genuinamente nao corrigido. |

### Ordem de resolucao recomendada

NAV-001 -> NAV-002 -> NAV-006 -> NAV-003 -> NAV-007 -> NAV-005 -> NAV-004 (validar)

---

## SECAO 5 — OBSERVACAO CRITICA: DIVERGENCIA NO PHASE-CONFIG.TS

Durante a preparacao deste documento, foi identificada uma divergencia entre o arquivo `src/lib/engines/phase-config.ts` e o modelo de produto canonico.

O arquivo define **8 fases**: O Chamado, O Explorador, O Preparo, A Logistica, O Mapa dos Dias, O Tesouro, A Expedicao, O Legado.

O produto ativo tem **6 fases**: O Chamado, O Explorador, O Preparo, A Logistica, A Conexao, O Roteiro.

Ha dois problemas:

1. **Fases 5 e 6 tem nomes diferentes no config vs. no produto**: Phase 5 no config e "O Mapa dos Dias" (que em versoes anteriores causou confusao com o nome da fase de guia). O nome canonico aprovado e "A Conexao". Phase 6 no config e "O Tesouro", mas o nome canonico e "O Roteiro".

2. **Fases 7-8 existem no config mas nao no produto**: Sao roadmap futuro (live tracker, cost manager, retrospective, community). Nao devem interferir com a navegacao das 6 fases ativas.

**Acao necessaria**: O tech-lead deve determinar se as fases 5-6 no config sao deliberadamente diferentes (para o sistema de gamificacao interno) ou se representam desalinhamento com o produto. Se desalinhamento, o config deve ser atualizado para refletir os nomes canonicos. Esta divergencia pode ser uma fonte dos bugs de navegacao.

---

## SECAO 6 — METRICAS DE SUCESSO

| Metrica | Atual | Meta | Prazo |
|---------|-------|------|-------|
| Taxa de falha em testes manuais de navegacao | 60%+ | <= 5% | Sprint 30 |
| Taxa de conclusao de expedicao (Phase 1->6) | ~40% estimado | >= 85% | Sprint 30 |
| Recorrencia de NAV-001 a NAV-007 | 5+ sprints | 0 | Sprint 31 |
| ACs de SPEC-PROD-001 passando em QA conformance | 7/18 | 18/18 | Sprint 30 |
| Relatos de "perda de dados" em feedback beta | N/A | 0 | Sprint 30 |

---

## SECAO 7 — ESCOPO

### Em escopo
- Modelo de estados de fase (NOT_STARTED / IN_PROGRESS / COMPLETED)
- Todas as regras de transicao de navegacao
- Restauracao de dados ao revisitar qualquer fase (6 fases)
- Botao Voltar na Fase 6
- Comportamento da barra de progresso apos conclusao
- Logica de classificacao de viagem (Nacional/Internacional/Intercontinental)
- Dialogo de confirmacao de alteracoes nao salvas

### Fora do escopo
- Animacoes de transicao entre fases (dominio da SPEC-UX)
- Auto-save dentro de sub-etapas da Fase 4 (coberto por SPEC-ARCH-008)
- Fases 7-8 (roadmap futuro)
- Novos campos de dados em qualquer fase
- Logica de geracao de IA

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-16 | product-owner | Documento inicial — revisao critica solicitada apos 60%+ de falha manual em v0.23.0 |
