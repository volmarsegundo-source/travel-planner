---
spec-id: SPEC-PROD-018
title: Meu Atlas — Interactive World Map
version: 1.0.0
status: Draft
author: product-owner
sprint: 30
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-018: Meu Atlas — Interactive World Map

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-17
**Sprint**: 30
**Relacionado a**: SPEC-ARCH-007 (Map Pin Coordinate Persistence, Draft), SPEC-UX-016 (Map Pin Dashboard Interaction, Draft)

---

## Contexto: Por que Este Documento Existe

A pagina "Meu Atlas" existe desde o Sprint 28 como parte da reestruturacao de navegacao. O mapa atual usa react-simple-maps com SVG estatico: sem interatividade, sem pins de expedicao, sem zoom, sem click-to-explore. O mapa e um elemento visual decorativo quando deveria ser o centro da identidade do produto — o "atlas" que da nome ao produto inteiro.

Esta spec define os requisitos de produto para transformar "Meu Atlas" no componente de maior impacto emocional do produto: um mapa mundial interativo que visualiza a historia de viagens do usuario, reforca o loop de gamificacao, e serve como ponto de entrada para expedicoes existentes.

---

## User Story

As a @leisure-solo or @leisure-family,
I want to see all my expedition destinations as pins on an interactive world map,
so that I can visualize my travel history, feel proud of where I have been, and quickly access any expedition from the map.

---

## Contexto do Traveler

- **Pain point**: Apos completar multiplas expedicoes, nao ha forma de ver o progresso geral como traveler. O dashboard lista viagens como linhas de texto — sem senso de geografia ou conquista.
- **Workaround atual**: Nao existe. Usuario nao tem visao de conjunto das suas viagens.
- **Frequencia**: Toda vez que o usuario abre o produto fora do fluxo de planejamento ativo. E a pagina de "retorno" para usuarios engajados.

---

## Requisitos Funcionais

### RF-001 — Renderizacao de pins por expedicao
Para cada expedicao do usuario com destino geocodificado (lat/lon salvo), o mapa exibe um pin na coordenada do destino. Expedicoes sem coordenadas salvas nao exibem pin e sao listadas em uma secao "Expedicoes sem localizacao" abaixo do mapa.

### RF-002 — Estados visuais dos pins
Cada pin reflete o status da expedicao:

| Status da Expedicao | Visual do Pin |
|---------------------|---------------|
| Concluida (todas as 6 fases `COMPLETED`) | Pin dourado, solido |
| Em progresso (pelo menos 1 fase `COMPLETED`, nao todas) | Pin azul com animacao de pulso suave |
| Planejada (criada mas Phase 1 nao concluida) | Pin cinza, sem animacao |

A diferenciacao visual usa cor E forma/tamanho para atender requisitos de acessibilidade (nao apenas cor).

### RF-003 — Popup de expedicao ao clicar no pin
Clicar em qualquer pin exibe um card popup contendo:
- Nome do destino
- Datas da viagem (ou "Datas nao definidas")
- Status atual com badge (Concluida / Em Progresso / Planejada)
- Progresso de fases: indicador visual de quantas fases foram completadas (ex: 4/6)
- Botao primario: "Continuar Expedicao" (status Em Progresso) ou "Ver Summary" (status Concluida) ou "Iniciar" (status Planejada)
- Botao secundario: "Ver Detalhes" — navega para a pagina de detalhes da expedicao

O popup fecha ao clicar fora dele ou na tecla `Escape`.

### RF-004 — Multiplas expedicoes no mesmo destino
Se o usuario tem mais de uma expedicao para o mesmo destino (mesmas coordenadas ou raio de 50km), os pins se agrupam em um cluster numerico. Clicar no cluster exibe uma lista das expedicoes agrupadas. Clicar em uma expedicao da lista abre o popup individual (RF-003).

### RF-005 — Filtro por status
Acima ou ao lado do mapa, um seletor de filtro com opcoes:
- "Todas" (padrao)
- "Concluidas"
- "Em Progresso"
- "Planejadas"

Ao selecionar um filtro, apenas os pins do status selecionado permanecem visiveis. A transicao e animada (fade out dos pins filtrados). O filtro nao recarrega a pagina.

### RF-006 — Zoom e pan
O mapa suporta:
- Zoom in/out via scroll do mouse (desktop) e pinch-to-zoom (mobile)
- Pan via drag (desktop) e swipe (mobile)
- Botoes de zoom (+/-) visiveis em canto do mapa como alternativa acessivel ao scroll
- Zoom range: nivel minimo mostra o mundo completo, nivel maximo mostra resolucao de cidade

### RF-007 — Estado vazio (nenhuma expedicao)
Quando o usuario nao tem nenhuma expedicao criada, o mapa exibe:
- Mapa mundial completo sem pins
- Overlay centralizado com texto: "Seu atlas esta em branco" + subtexto "Crie sua primeira expedicao e adicione o primeiro pin ao seu mapa"
- Botao CTA: "Criar Expedicao"
- O overlay nao bloqueia a interacao com o mapa (usuario pode navegar o mapa mesmo sem pins)

### RF-008 — Estado sem coordenadas salvas
Expedicoes criadas antes da implementacao de geocodificacao (sem lat/lon salvo) nao exibem pin. Sao listadas em uma secao colapsavel "Expedicoes sem localizacao no mapa" abaixo do mapa, com link para cada uma e nota informativa: "Edite a expedicao para atualizar a localizacao no mapa."

### RF-009 — Posicionamento inicial do mapa
Na primeira visita de um usuario com expedicoes, o mapa centraliza automaticamente para exibir todos os pins do usuario. Se o usuario tem apenas 1 pin, centraliza nesse pin com zoom de nivel de pais. Se tem multiplos pins em continentes diferentes, usa zoom de nivel global.

---

## Requisitos de Performance

### RF-010 — Carregamento inicial
O mapa deve ser interativo (pins visiveis e cliclaves) em menos de 2 segundos em conexao 4G simulada. Pins sao renderizados em lote, nao um por um.

### RF-011 — Limite de pins
Para o MVP, o limite de 20 expedicoes ativas por usuario garante no maximo 20 pins. Nenhuma otimizacao de virtualizacao e necessaria para este volume. Documentar o limite para revisao futura quando o limite de expedicoes aumentar.

---

## Requisitos Mobile

### RF-012 — Layout responsive
Em viewports <= 640px:
- O mapa ocupa a tela completa em altura (100dvh ou equivalente), sem sidebar
- Os botoes de filtro sao exibidos como chips horizontais com scroll horizontal acima do mapa
- O popup de expedicao (RF-003) ao ser aberto ocupa a metade inferior da tela (bottom sheet), nao um popup centralizado
- Bottom sheet fecha com swipe down ou toque fora

### RF-013 — Touch targets
Todos os pins tem area de toque minima de 44x44px independente do tamanho visual do pin. A area de toque pode ser maior que o visual do pin usando padding invisivel.

---

## Requisitos de Acessibilidade

### RF-014 — Alternativa textual ao mapa
Para usuarios que nao podem interagir com o mapa interativo, uma lista textual de todas as expedicoes (nome do destino, datas, status) deve estar disponivel como alternativa. Pode ser implementada como um botao "Ver como lista" que substitui o mapa por uma tabela.

### RF-015 — Pins com labels acessiveis
Cada pin tem `aria-label` descrevendo: nome do destino, status, e numero de fases concluidas. Ex: "Rio de Janeiro — Em Progresso, 3 de 6 fases concluidas".

### RF-016 — Navegacao por teclado
Usuario deve poder navegar entre pins usando `Tab`. Ao focar um pin com `Enter`, o popup abre. `Escape` fecha o popup.

---

## Criterios de Aceite

- **AC-001**: Dado que o usuario tem 3 expedicoes (1 concluida, 1 em progresso, 1 planejada), quando acessa "Meu Atlas", entao 3 pins aparecem no mapa com cores/estilos distintos conforme a tabela de estados visuais.
- **AC-002**: Dado que a expedicao esta concluida, entao seu pin e dourado e solido (sem animacao).
- **AC-003**: Dado que a expedicao esta em progresso, entao seu pin e azul com animacao de pulso visivel.
- **AC-004**: Dado que o usuario clica em um pin em progresso, entao um popup abre com nome do destino, progresso de fases, e botao "Continuar Expedicao".
- **AC-005**: Dado que o usuario clica no botao "Continuar Expedicao" no popup, entao e navegado para a proxima fase incompleta da expedicao.
- **AC-006**: Dado que o usuario clica fora do popup, entao o popup fecha sem alterar nenhum dado.
- **AC-007**: Dado que o filtro "Concluidas" e selecionado, entao apenas pins dourados permanecem visiveis e os outros desaparecem com transicao animada.
- **AC-008**: Dado que o usuario usa pinch-to-zoom em mobile, entao o mapa aumenta/diminui o zoom conforme o gesto.
- **AC-009**: Dado que o usuario nao tem nenhuma expedicao, entao o mapa exibe overlay "Seu atlas esta em branco" com botao "Criar Expedicao", e o mapa de fundo permanece interativo.
- **AC-010**: Dado que o usuario tem 2 expedicoes para "Paris", entao um cluster numerico "2" aparece nas coordenadas de Paris, e ao clicar exibe lista das duas expedicoes.
- **AC-011**: Dado viewport de 375px e o usuario clica em um pin, entao um bottom sheet abre na metade inferior da tela com as informacoes da expedicao.
- **AC-012**: Dado que uma expedicao nao tem coordenadas salvas, entao ela nao aparece como pin mas aparece na secao "Expedicoes sem localizacao" abaixo do mapa.
- **AC-013**: Dado um screen reader, ao focar um pin, o anuncio inclui destino, status e progresso de fases.
- **AC-014**: Dado que o mapa carrega, entao os pins estao visiveis e cliclaves em menos de 2 segundos em 4G simulado.
- **AC-015**: Dado que o usuario pressiona `Escape` com popup aberto, entao o popup fecha e o foco retorna ao pin que o originou.

---

## Fora do Escopo (v1 desta spec)

- Mapa de calor (heatmap) de paises visitados
- Contador de paises/cidades visitadas como estatistica
- Compartilhamento publico do mapa pessoal
- Pins para cidades de origem (apenas destinos)
- Rotas/linhas conectando pins em ordem cronologica
- Animacao de "fly to" ao abrir o produto (Sprint 31+)
- Integracao com Phase 7 (live tracker) — roadmap futuro

---

## Metricas de Sucesso

| Metrica | Baseline | Meta | Prazo |
|---------|----------|------|-------|
| Sessoes que incluem visita ao Meu Atlas | Desconhecida | >= 40% das sessoes | Sprint 31 |
| Click-through de pin para expedicao | N/A | >= 25% das visitas ao Atlas | Sprint 31 |
| Tempo medio na pagina Meu Atlas | Desconhecido | >= 45 segundos | Sprint 31 |
| Taxa de retencao de usuarios com >= 2 expedicoes | Desconhecida | +15% vs usuarios sem mapa | Sprint 32 |

---

## Dependencias

- **SPEC-ARCH-007** (Map Pin Coordinate Persistence): coordenadas lat/lon devem estar salvas no banco antes que os pins possam ser renderizados
- **SPEC-ARCH-XXX** (a criar): decisao sobre biblioteca de mapa interativo — Mapbox GL JS (ja no stack) vs Leaflet vs alternativa
- **SPEC-UX-016** (Map Pin Dashboard Interaction): especificacao visual detalhada dos pins, popup, e animacoes

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — Sprint 30 rewrite planning |
