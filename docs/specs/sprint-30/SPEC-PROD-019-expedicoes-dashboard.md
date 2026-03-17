---
spec-id: SPEC-PROD-019
title: Expedicoes Dashboard Rewrite
version: 1.0.0
status: Draft
author: product-owner
sprint: 30
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-019: Expedicoes Dashboard Rewrite

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-17
**Sprint**: 30
**Relacionado a**: SPEC-PROD-002 (Dashboard Trip Cards, Implemented partial), SPEC-UX-005 (Dashboard Visual Polish, Approved v1.1.0)

---

## Contexto: Por que Este Documento Existe

O dashboard de expedicoes (/expeditions) passou por ajustes visuais no Sprint 26 (SPEC-UX-005) e pela migracao de /dashboard para /expeditions no Sprint 29. O componente funciona mas apresenta inconsistencias visuais acumuladas: cards com alturas nao uniformes, hierarquia tipografica fraca, ausencia de ordenacao/filtragem, e CTA "Nova Expedicao" que compete visualmente com os cards.

Este documento define os requisitos para um rewrite limpo da pagina de listagem de expedicoes — com layout de card consistente, controles de ordenacao e filtragem, e estado vazio com direcao clara ao usuario.

---

## User Story

As a @leisure-solo or @leisure-family,
I want to see all my expeditions in a clean, consistent list with clear status and progress information,
so that I can quickly find the expedition I want to continue or review, without having to scan inconsistently formatted cards.

---

## Contexto do Traveler

- **Pain point**: Cards com alturas diferentes criam uma grade irregular que e dificil de escanear rapidamente. Usuario com 5+ expedicoes perde tempo procurando a correta.
- **Workaround atual**: Usuario memoriza a ordem das expedicoes. Nao deveria ser necessario.
- **Frequencia**: Toda sessao que nao e a primeira. E a tela "home" para usuarios recorrentes.

---

## Requisitos Funcionais

### RF-001 — Layout de grid de cards
A pagina exibe expedicoes em um grid responsivo:
- Desktop (>= 1024px): 3 colunas
- Tablet (640px–1023px): 2 colunas
- Mobile (< 640px): 1 coluna, cards em lista vertical

### RF-002 — Anatomia do card de expedicao
Cada card contem, nesta ordem visual de cima para baixo:

1. **Header do card**: Nome do destino (tipografia principal, 1 linha com truncamento) + flag emoji do pais do destino
2. **Datas**: Data de inicio e fim formatadas conforme locale do usuario (PT-BR: "15 jan 2026 – 22 jan 2026", EN: "Jan 15 – Jan 22, 2026"). Se datas nao definidas: "Datas nao definidas" em tipografia secundaria.
3. **Badge de status**: pill colorido com texto. Estados: "Planejada" (cinza), "Em Progresso" (azul), "Concluida" (verde). Badge usa cor + icone para distinguir estados sem depender apenas de cor.
4. **Barra de progresso de fases**: barra horizontal dividida em 6 segmentos. Segmentos concluidos preenchidos, restantes vazios. Texto abaixo: "3 de 6 fases" (ou equivalente EN).
5. **Footer do card**: botao primario contextual (ver RF-003) alinhado a direita.

Todos os cards do grid tem altura identica. Conteudo que nao cabe e truncado com reticencias, nunca expande o card.

### RF-003 — Botao primario contextual
O botao primario no footer do card muda conforme o status:

| Status | Label do botao | Destino |
|--------|---------------|---------|
| Planejada (Phase 1 nao concluida) | "Iniciar" | Phase 1 da expedicao |
| Em Progresso | "Continuar" | Proxima fase incompleta |
| Concluida | "Ver Summary" | Pagina de summary da expedicao |

### RF-004 — Menu de acoes secundarias
Cada card tem um icone de menu (tres pontos, "...") no canto superior direito que ao clicar abre um dropdown com:
- "Ver Detalhes" — pagina de detalhes da expedicao
- "Editar Nome" — modal inline para renomear a expedicao
- "Duplicar Expedicao" — se SPEC-PROD-015 implementada; caso contrario, item desabilitado com tooltip "Em breve"
- "Arquivar" — move a expedicao para status `ARCHIVED` (confirmacao requerida)
- "Excluir" — soft delete com dialogo de confirmacao explicito (texto do destino digitado para confirmar)

### RF-005 — Ordenacao
Um seletor de ordenacao acima do grid, com opcoes:
- "Data de viagem" (padrao — ordena por startDate, mais proxima primeiro; sem data vai para o final)
- "Data de criacao" (mais recente primeiro)
- "Destino" (alfabetico A-Z)
- "Status" (Em Progresso > Planejada > Concluida)

A selecao de ordenacao e persistida na sessao (nao no banco de dados). Ao recarregar a pagina, volta ao padrao.

### RF-006 — Filtragem por status
Chips de filtro horizontais acima do grid (abaixo ou junto ao seletor de ordenacao):
- "Todas" (padrao, selecionado)
- "Em Progresso"
- "Planejadas"
- "Concluidas"

Apenas um filtro ativo por vez. Ao selecionar um filtro, o grid re-renderiza mostrando apenas os cards correspondentes. Contador em cada chip indicando quantas expedicoes ha naquele status (ex: "Em Progresso (2)").

### RF-007 — Estado vazio — sem expedicoes
Quando o usuario nao tem nenhuma expedicao criada, a pagina exibe:
- Ilustracao ou icone grande centralizado (nao um mapa — o mapa e dominio do Meu Atlas)
- Titulo: "Sua primeira expedicao te espera"
- Subtexto: "Planeje sua proxima aventura em 6 passos guiados"
- Botao CTA primario: "Criar Expedicao"
- Link secundario: "Ver Meu Atlas" (para usuarios que preferem iniciar pelo mapa)

### RF-008 — Estado vazio — filtro sem resultados
Quando um filtro ativo nao retorna expedicoes:
- Mensagem: "Nenhuma expedicao [status] encontrada"
- Link: "Ver todas as expedicoes" que limpa o filtro

### RF-009 — Botao "Nova Expedicao"
Um botao fixo de destaque para criar nova expedicao, posicionado:
- Desktop: canto superior direito da pagina, acima do grid
- Mobile: botao flutuante (FAB) no canto inferior direito

O botao e sempre visivel, mesmo com expedicoes no grid. Nao compete visualmente com os cards — deve ser hierarquicamente superior a qualquer elemento do grid.

### RF-010 — Limite de expedicoes
Quando o usuario atingiu o limite de 20 expedicoes ativas, o botao "Nova Expedicao" exibe tooltip "Limite de expedicoes ativas atingido. Arquive uma expedicao para criar nova" e esta desabilitado. O limite e verificado antes de abrir o flow de criacao.

---

## Requisitos de Performance

### RF-011 — Carregamento do grid
A lista de expedicoes deve ser renderizada em menos de 1.5 segundos em 4G simulado. Enquanto os dados carregam, o grid exibe skeletons dos cards (placeholders com animacao shimmer) no lugar dos cards reais.

### RF-012 — Paginacao (MVP)
Para o MVP com limite de 20 expedicoes, paginacao nao e necessaria. Toda a lista carrega de uma vez. Documentar para revisao quando o limite aumentar.

---

## Requisitos Mobile

### RF-013 — Cards em coluna unica
Em mobile, cards ocupam 100% da largura disponivel. O botao de menu de acoes secundarias (tres pontos) permanece acessivel e nao se sobrepe ao botao primario.

### RF-014 — Chips de filtro com scroll horizontal
Em mobile, se os chips de filtro nao cabem em uma linha, permitem scroll horizontal. O chip ativo permanece visivel sem necessidade de scroll.

---

## Requisitos de Acessibilidade

### RF-015 — Estrutura semantica
Cada card e um elemento `<article>` com `aria-label` contendo o nome do destino. O grid e uma `<section>` com `aria-label="Lista de expedicoes"` ou equivalente.

### RF-016 — Focus management
Ao abrir e fechar o menu de acoes, o foco retorna ao botao de tres pontos que o originou. Ao confirmar e fechar o dialogo de exclusao, o foco retorna ao proximo card disponivel (ou ao estado vazio se era o ultimo).

### RF-017 — Reducao de movimento
A animacao de shimmer dos skeletons deve respeitar `prefers-reduced-motion`. Quando ativo, os skeletons sao estaticos.

---

## Criterios de Aceite

- **AC-001**: Dado que o usuario tem 5 expedicoes, quando acessa /expeditions, entao 5 cards sao exibidos em grid com altura identica.
- **AC-002**: Dado uma expedicao com destino "Buenos Aires, Argentina", entao o card exibe "Buenos Aires" com flag 🇦🇷 no header.
- **AC-003**: Dado que a expedicao tem 4 de 6 fases concluidas e status "Em Progresso", entao o card exibe badge azul com icone + "Em Progresso", barra de progresso com 4 segmentos preenchidos, e botao "Continuar".
- **AC-004**: Dado que o botao "Continuar" e clicado, entao o usuario e navegado para a quinta fase (proxima incompleta) da expedicao.
- **AC-005**: Dado que o usuario seleciona ordenacao "Destino", entao os cards sao reordenados alfabeticamente pelo nome do destino.
- **AC-006**: Dado que o usuario seleciona filtro "Concluidas", entao apenas cards com status "Concluida" sao exibidos e o chip "Concluidas" exibe o contador correto.
- **AC-007**: Dado que o filtro "Em Progresso" esta ativo e nao ha expedicoes em progresso, entao uma mensagem "Nenhuma expedicao Em Progresso encontrada" e exibida com link "Ver todas as expedicoes".
- **AC-008**: Dado que o usuario nao tem expedicoes, entao o estado vazio e exibido com CTA "Criar Expedicao".
- **AC-009**: Dado que o usuario atingiu 20 expedicoes ativas, entao o botao "Nova Expedicao" esta desabilitado com tooltip explicativo.
- **AC-010**: Dado que o usuario abre o menu de acoes (tres pontos) de um card e clica "Excluir", entao um dialogo de confirmacao e exibido antes de qualquer acao de exclusao.
- **AC-011**: Dado que os dados estao carregando, entao skeletons dos cards sao exibidos no lugar dos cards reais.
- **AC-012**: Dado viewport de 375px, entao os cards sao exibidos em coluna unica e os chips de filtro permitem scroll horizontal.
- **AC-013**: Dado que o usuario usa `prefers-reduced-motion`, entao os skeletons sao estaticos sem animacao shimmer.
- **AC-014**: Dado que o usuario fecha o dialogo de exclusao com "Cancelar", entao o foco retorna ao botao de tres pontos do card.
- **AC-015**: Dado que a expedicao concluida tem Summary disponivel, entao o botao no card e "Ver Summary" e navega para /expedition/[tripId]/summary.

---

## Fora do Escopo (v1 desta spec)

- Busca por texto livre entre as expedicoes
- Tags ou categorias personalizadas pelo usuario
- Compartilhamento de expedicao diretamente do card
- Visualizacao em modo lista (apenas grid nesta versao)
- Drag-and-drop para reordenar manualmente
- Notificacoes de expedicoes proximas (feature separada)

---

## Metricas de Sucesso

| Metrica | Baseline | Meta | Prazo |
|---------|----------|------|-------|
| Tempo para encontrar e abrir uma expedicao especifica | Desconhecido | <= 10 segundos | Sprint 31 |
| Taxa de click em "Continuar" vs tempo medio na pagina | Desconhecida | >= 60% saem direto para expedicao | Sprint 31 |
| Taxa de uso do filtro (usuarios que usam ao menos uma vez) | N/A | >= 30% | Sprint 31 |
| Reclamacoes de "interface confusa" em feedback beta | N/A | 0 | Sprint 30 |

---

## Dependencias

- **SPEC-PROD-015** (Trip Duplication): para o item "Duplicar" no menu de acoes estar habilitado
- **SPEC-ARCH-007**: coordenadas para que flags de pais possam ser derivadas do destino geocodificado
- **SPEC-UX-XXX** (a criar): especificacao visual do card, badge styles, e estado vazio

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — Sprint 30 rewrite planning |
