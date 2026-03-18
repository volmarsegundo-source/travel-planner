---
spec-id: SPEC-PROD-021
title: Meu Atlas — Interactive World Map Redesign
version: 1.0.0
status: Draft
author: product-owner
sprint: 31
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-021: Meu Atlas — Interactive World Map Redesign

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-17
**Sprint**: 31
**Relacionado a**: SPEC-PROD-018 (deferred from Sprint 30), SPEC-ARCH-007 (coordinate persistence, Sprint 29)

---

## Contexto: Por que Este Documento Existe

A pagina /atlas existe desde o Sprint 10 mas nunca funcionou adequadamente em staging. O mapa SVG implementado renderiza staticamente, sem interatividade real, sem pins de expedicao, e sem qualquer conexao com os dados do usuario. O resultado e uma pagina de perfil de gamificacao sem o elemento central que le da o nome: o mapa do mundo do viajante.

O stack ja inclui Mapbox GL JS (registrado em ADR do Sprint 10). A persistencia de coordenadas de destino foi implementada no Sprint 29 (SPEC-ARCH-007), o que significa que o pre-requisito tecnico de dados esta resolvido. Este spec define os requisitos de produto para transformar /atlas em uma pagina funcional e central da experiencia Atlas.

---

## User Story

As a @leisure-solo or @leisure-family,
I want to see an interactive world map with pins for each of my expeditions,
so that I can visualize my travel history and in-progress plans at a glance, feel pride in completed trips, and quickly navigate to any expedition from the map.

---

## Contexto do Traveler

- **Pain point**: Usuarios que retornam ao app nao tem visao global das suas expedicoes. A lista na pagina /expeditions e funcional mas nao e inspiracional — nao comunica o sentido de "meu atlas de viagens".
- **Workaround atual**: Usuarios navegam por /expeditions para localizar uma expedicao especifica. Nao ha representacao geografica de nenhum tipo.
- **Frequencia**: Toda vez que o usuario abre o app apos a primeira expedicao criada. Alta frequencia, alto impacto emocional — esta pagina deve funcionar como o "home" do viajante.

---

## Requisitos Funcionais

### RF-001 — Mapa interativo com pins de expedicao

O mapa ocupa o espaco principal da pagina (minimo 60% da viewport em desktop, 100% de largura em mobile). Cada expedicao com coordenadas de destino disponíveis e representada por um pin no mapa.

Pin states e cores correspondentes:

| Estado da expedicao | Cor do pin | Criterio |
|---|---|---|
| Planejando | Amarelo (#F59E0B) | currentPhase entre 1 e 5, nenhuma fase concluida alem da 1 |
| Em andamento | Azul (#3B82F6) | Pelo menos Phase 1 concluida, nao todas as 6 concluidas |
| Concluida | Verde (#10B981) | Todas as 6 fases ativas concluidas |

### RF-002 — Popup de expedicao ao clicar no pin

Ao clicar em um pin, um popup aparece sobre o mapa contendo:
1. Nome do destino (campo `destination` da expedicao)
2. Estado atual em texto (ex: "Em andamento — Fase 3 de 6")
3. Datas de viagem (se preenchidas), formatadas como "15 Abr — 22 Abr 2026"
4. Botao "Continuar Expedicao" que navega para `/expedition/[tripId]`

O popup fecha ao clicar fora dele ou no botao "x" do proprio popup.

### RF-003 — Expedicoes sem coordenadas

Expedicoes criadas antes da implementacao de SPEC-ARCH-007, ou em que o autocomplete nao retornou coordenadas, nao aparecem no mapa. Essas expedicoes aparecem em uma secao lateral "Expedicoes sem localizacao" com link para editar o destino em Phase 1.

### RF-004 — Filtro de pins por status

O usuario pode filtrar os pins visíveis por status usando tres toggles visuais (podem ser checkboxes estilizados ou chips):
- "Planejando" (amarelo)
- "Em andamento" (azul)
- "Concluidas" (verde)

Por padrao todos os tres status estao ativos. Desativar um toggle remove os pins correspondentes do mapa sem recarregar a pagina. Os toggles exibem a contagem de expedicoes naquele status entre parenteses.

### RF-005 — Estado vazio (sem expedicoes)

Quando o usuario nao tem nenhuma expedicao criada, o mapa e exibido sem pins e uma sobreposicao central exibe:
- Texto: "Seu atlas esta esperando sua primeira expedicao."
- Botao: "Criar Primeira Expedicao" → navega para `/expedition/new`

### RF-006 — Secao de perfil de gamificacao

Abaixo ou ao lado do mapa (dependendo do layout definido em SPEC-UX), uma secao exibe os dados de gamificacao do usuario:
- Pontos totais acumulados
- Nivel atual (rank) com nome e icone
- Badges conquistados em grid (icone + nome da badge)
- Contagem de expedicoes por status (X planejando, Y em andamento, Z concluidas)

### RF-007 — Navegacao pelo mapa

O mapa suporta as interacoes padrao de mapa interativo:
- Zoom com scroll do mouse (desktop) e pinch (mobile)
- Pan com drag do mouse (desktop) e swipe (mobile)
- Botoes de zoom (+/-) visiveis no mapa
- Botao "Reset" que retorna o mapa ao zoom e centro iniciais (visao global do mundo)

### RF-008 — Agrupamento de pins proximos (clustering)

Quando multiplos pins estao proximos no nivel de zoom atual, eles sao agrupados em um cluster com badge numerico. Ao clicar no cluster, o mapa faz zoom in para separar os pins individuais. Clusters seguem a cor predominante (maioria de um estado).

---

## Requisitos de Performance

### RF-009 — Carregamento progressivo

O mapa carrega e renderiza o tile base antes de adicionar os pins. Os pins sao adicionados progressivamente. O tempo total para mapa renderizado com pins visiveis nao deve exceder 3 segundos em conexao 4G padrao.

### RF-010 — Limite de pins sem degradacao

A pagina deve renderizar sem degradacao de performance para ate 50 expedicoes simultaneas (max 20 por regra de negocio atual, mas spec deve suportar 50 para escalar sem retrabalho).

---

## Requisitos de Acessibilidade

### RF-011 — Alternativa textual ao mapa

Para usuarios que nao podem interagir com o mapa (screen readers, conexoes lentas), a lista de expedicoes da secao de gamificacao serve como alternativa. A pagina deve ser completamente utilizavel sem interagir com o mapa.

### RF-012 — Teclado no popup

O popup de expedicao deve ser navegavel por teclado. `Escape` fecha o popup. O botao "Continuar Expedicao" dentro do popup e alcancavel por Tab.

---

## Criterios de Aceite

- **AC-001**: Dado que o usuario tem 3 expedicoes com coordenadas (1 planejando, 1 em andamento, 1 concluida), quando acessa /atlas, entao o mapa renderiza com 3 pins nas cores amarelo, azul e verde respectivamente, em menos de 3 segundos.
- **AC-002**: Dado um pin de expedicao no mapa, quando o usuario clica no pin, entao um popup aparece com nome do destino, estado atual, datas de viagem (se disponíveis) e botao "Continuar Expedicao".
- **AC-003**: Dado o popup aberto, quando o usuario clica em "Continuar Expedicao", entao e redirecionado para `/expedition/[tripId]` da expedicao correspondente.
- **AC-004**: Dado o popup aberto, quando o usuario clica fora do popup ou no botao "x", entao o popup fecha sem navegar.
- **AC-005**: Dado que o usuario tem expedicoes nos 3 status, quando desativa o toggle "Concluidas", entao os pins verdes desaparecem do mapa sem reload e o toggle exibe a contagem correta.
- **AC-006**: Dado que o usuario reativa o toggle "Concluidas", entao os pins verdes reaparecem no mapa imediatamente.
- **AC-007**: Dado que o usuario nao tem nenhuma expedicao, quando acessa /atlas, entao o mapa e exibido sem pins e uma sobreposicao central exibe o texto de estado vazio com botao "Criar Primeira Expedicao".
- **AC-008**: Dado que o usuario tem 1 expedicao sem coordenadas, quando acessa /atlas, entao essa expedicao aparece na secao "Expedicoes sem localizacao" com link para editar o destino, e NAO aparece no mapa como pin.
- **AC-009**: Dado que o usuario tem badges conquistadas, quando acessa /atlas, entao a secao de gamificacao exibe pontos, nivel, e todas as badges conquistadas em grid.
- **AC-010**: Dado 2 expedicoes com destinos geograficamente proximos no zoom inicial, quando o usuario ve o mapa, entao os 2 pins aparecem agrupados em cluster com badge "2". Ao clicar no cluster, o mapa faz zoom in e os pins sao separados.
- **AC-011**: Dado o mapa renderizado, quando o usuario usa pinch-to-zoom em mobile, entao o mapa responde ao gesto sem interferencia com o scroll da pagina.
- **AC-012**: Dado viewport de 375px, quando o usuario acessa /atlas, entao o mapa ocupa 100% da largura disponivel e os controles de zoom sao visiveis e alcancaveis com o polegar.
- **AC-013**: Dado o mapa renderizado, quando o usuario clica em "Reset", entao o mapa retorna ao zoom global e posicao central iniciais.
- **AC-014**: Dado um screen reader ativo, quando o usuario acessa /atlas, entao a lista de expedicoes na secao de gamificacao e anunciada corretamente sem depender do mapa interativo.

---

## Fora do Escopo (v1 desta spec)

- Compartilhamento do mapa pessoal (URL publica do atlas)
- Rotas desenhadas entre destinos de uma mesma expedicao
- Heatmap de destinos visitados ao longo de toda a vida do usuario
- Integracao com servico de fotos (fotos da viagem no popup)
- Fases 7 e 8 do phase-config.ts — "A Expedicao" e "O Legado" — nao estao no escopo MVP e nao afetam o calculo de estado de expedicao nesta spec

---

## Metricas de Sucesso

| Metrica | Baseline | Meta | Prazo |
|---------|----------|------|-------|
| Taxa de retorno a /atlas apos primeira visita | Desconhecida | >= 40% (sessao seguinte) | Sprint 32 |
| Click-through do pin para expedicao | Desconhecida | >= 30% das sessoes com pins | Sprint 32 |
| NPS qualitativo em beta ("o mapa funciona?") | N/A | 0 reportes de mapa quebrado | Sprint 31 |
| Tempo de carregamento do mapa com pins | N/A | <= 3s em 4G | Sprint 31 |

---

## Dependencias

- **SPEC-ARCH-007** (coordenadas): implementado Sprint 29 — pre-requisito atendido
- **SPEC-ARCH-XXX** (a criar): biblioteca de mapa interativo — Mapbox GL JS ja esta no stack (confirmado), mas SPEC-ARCH deve definir estrategia de tiles, token management e SSR vs CSR
- **SPEC-UX-XXX** (a criar): layout da pagina /atlas (proporcao mapa/perfil, posicionamento dos filtros, design do popup)
- **SPEC-PROD-023** (esta spec nao depende, mas compartilha logica de estado de fase — SPEC-PROD-023 deve ser aprovada antes do inicio da implementacao)

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — Sprint 31 planning. Consolida SPEC-PROD-018 (deferred Sprint 30) com novos requisitos de cluster e estado vazio. |
