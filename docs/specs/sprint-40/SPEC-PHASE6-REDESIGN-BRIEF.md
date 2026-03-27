---
spec_id: SPEC-PHASE6-REDESIGN-BRIEF
title: Redesign Brief — Phase 6 "O Roteiro" (Itinerario Detalhado)
version: 1.0.0
status: Draft
sprint: 40
owner: product-owner
created: 2026-03-26
updated: 2026-03-26
phase: Phase 6 — "O Roteiro"
parent_spec: SPEC-PROD-053
stitch_reference: docs/design/stitch-exports/phase6_roteiro_detalhado/code.html
---

# SPEC-PHASE6-REDESIGN-BRIEF: Phase 6 — "O Roteiro" Redesign Brief

## 1. Proposito deste Documento

Este documento traduz o prototipo Stitch da Phase 6 (`phase6_roteiro_detalhado/code.html`) em criterios de aceite precisos e linguagem de produto. Ele e o complemento do SPEC-PROD-053 (que define o comportamento geral das Fases 4-6) para a Phase 6 especificamente, entrando nos detalhes visuais e de interacao que os ACs de alto nivel do SPEC-PROD-053 nao cobrem.

O prototipo Stitch e a autoridade de design para esta fase. Onde este documento e o prototipo entrarem em conflito, o prototipo prevalece e este documento deve ser atualizado.

---

## 2. Leitura do Prototipo Stitch

### 2.1 Estrutura geral de layout

O prototipo implementa um layout de duas colunas (split 60/40) em desktop:

| Coluna | Largura relativa | Conteudo |
|--------|-----------------|---------|
| Esquerda (conteudo) | 60% (`md:w-3/5`) | Navegacao de dias + timeline de atividades |
| Direita (mapa) | 40% (`md:w-2/5`) | Mapa interativo com marcadores de locais do dia |

Em mobile (abaixo de `md`, equivalente a < 768px):
- A coluna direita (mapa) e OCULTADA (`hidden md:block`)
- A coluna esquerda ocupa 100% da largura em coluna unica

O layout geral e: header fixo no topo → barra de progresso de fases → conteudo split → footer fixo com CTAs de navegacao.

### 2.2 Header fixo (Top Navigation Bar)

O header e sticky no topo (`sticky top-0 z-50`), com fundo `atlas-background` (#f9f9ff) no modo claro.

Conteudo do header (da esquerda para direita):
1. Logo "Atlas" — tipografia `Plus Jakarta Sans`, `font-extrabold`, cor `#040d1b`
2. Breadcrumb de navegacao (visivel apenas em `md:flex`): "Minhas Expedicoes" → "Nome da viagem" → "Roteiro" — os dois primeiros sao clicaveis em `atlas-on-surface-variant`; o ultimo ("Roteiro") em `atlas-primary-container` (laranja) com `font-bold`
3. Badge de PA balance: pill com fundo `atlas-secondary-container`, texto "180 PA" em `atlas-on-secondary-container` + dot pulsante em `atlas-primary-container`
4. Botao de notificacoes (icone `notifications`) — `atlas-on-surface-variant`
5. Avatar do usuario (foto circular, 40x40px, borda `atlas-surface-container-high`) com separador vertical a esquerda

### 2.3 Secao de progresso de fases

Imediatamente abaixo do header, fundo `atlas-surface-container-low`, padding vertical e horizontal.

Conteudo:
- Stepper horizontal mostrando as 8 fases (Fases 7-8 no estado de MVP ativo, bloqueadas)
- Fases 1-5 concluidas: circulo 32x32px, fundo `atlas-tertiary-fixed-dim` (#92d2c9), icone `check` em `atlas-on-tertiary-fixed-variant`; linha conectora `atlas-tertiary-fixed-dim`
- Fase 6 (ativa): circulo 40x40px (maior que os concluidos), fundo `atlas-primary-container` (#fe932c), numero "6" em `atlas-on-primary` branco, ring externo `ring-4 ring-primary-fixed-dim`; linha conectora antes: `atlas-primary-container`; linha conectora depois: `atlas-surface-container-high`
- Fases 7-8 (bloqueadas): circulo 32x32px, fundo `atlas-surface-container`, icone `lock` em `atlas-on-surface-variant`, opacidade 50%
- Label no canto direito: "Fase 6 de 8" em `atlas-text-small` + `atlas-on-surface-variant`; "Roteiro Detalhado" em `atlas-text-h5` + `font-bold`

### 2.4 Header da secao de conteudo (coluna esquerda)

Dentro da coluna esquerda, um header interno com dois grupos:

**Grupo esquerdo:**
- H1: "Seu Roteiro: [Nome do Destino]" — `Plus Jakarta Sans`, `font-extrabold`, tamanho `text-5xl`, cor `atlas-on-surface`
- Subtitulo: "[N] dias • [N] viajantes • [Estilos de viagem]" — `text-lg`, `atlas-on-surface-variant`, `font-medium`

**Grupo direito (acoes):**
- Botao "Regenerar Roteiro (80 PA)": borda 2px `atlas-primary-container`, texto `atlas-on-primary-container`, icone `refresh`, `font-bold` — comportamento: abre confirmacao de custo em PA antes de regenerar
- Botao "Exportar PDF": sem borda de destaque, texto `atlas-on-surface-variant`, icone `download`, `font-bold` — comportamento: deferred (SPEC-PROD-014)

### 2.5 Seletor de dias (Day Selector Pills)

Barra horizontal de pills/cards para selecao do dia visualizado na timeline.

Especificacoes dos pills:
- Cada pill: `min-w-[100px]`, altura `h-20` (80px), borda arredondada `rounded-xl`
- Conteudo de cada pill: numero do dia ("Dia 1") em `text-sm font-bold` + data no formato "DD Mmm" ("15 Mar") em `text-xs`
- Estado ativo (dia selecionado): fundo `atlas-primary-container`, texto `atlas-on-primary-container`, sombra elevada (`shadow-lg`)
- Estado inativo (dias nao selecionados): fundo `atlas-surface-container-lowest`, texto `atlas-on-surface-variant`; hover: `atlas-surface-container-low`
- Overflow horizontal: scroll sem scrollbar visivel (`overflow-x-auto hide-scrollbar`)
- Touch: a barra de pills e touchable e scrollable em mobile

Comportamento:
- Ao selecionar um pill, a timeline abaixo exibe apenas as atividades do dia selecionado
- O primeiro dia e o estado inicial (selecionado por padrao ao carregar a pagina)
- O numero de pills corresponde exatamente ao numero de dias da viagem (Phase 1: campo de datas)

### 2.6 Timeline de atividades

A timeline e o elemento central da Phase 6. Ela e uma lista vertical de atividades do dia selecionado, com estrutura de linha do tempo visual.

#### Linha do tempo visual

- Linha vertical tracada no lado esquerdo da coluna (`absolute left-[7px] top-24 bottom-0 w-0.5 bg-surface-container-high`) — visivel apenas em `md` (desktop)
- Cada atividade e ancorada na linha por um no circular

#### Header do dia

Antes da lista de atividades, um H2 com o nome e tema do dia:
- Formato: "Dia [N] — [Nome tematico do dia]" (ex: "Dia 1 — Chegada e Alfama")
- Estilo: `text-2xl font-headline font-bold`, borda esquerda 4px `atlas-primary-container`, padding-left para afastamento da borda

#### Estrutura de cada atividade (no de timeline)

Cada atividade e composta por dois elementos lado a lado:

**No (ponto na linha):**
- Circulo `w-4 h-4 rounded-full`, cor dependente do tipo de atividade:
  - Logistica (hotel, transfer): `atlas-primary-container` (laranja)
  - Cultura/Turismo: `atlas-tertiary` (teal)
  - Gastronomia: cor laranja alternativa (`orange-400` no prototipo — mapear para `atlas-primary-fixed-dim`)
- Ring de fundo branco ao redor do circulo: `ring-4 ring-surface` (efeito de separacao da linha)

**Card de atividade:**
- Container: `bg-surface-container-lowest`, `rounded-xl`, `shadow-sm`; hover: `shadow-md` (elevacao suave)
- Borda lateral esquerda (`border-l-8`) na cor da categoria — presente apenas em atividades de Cultura e Gastronomia; ausente em Logistica
- Layout interno do card:

| Area | Conteudo |
|------|---------|
| Topo esquerdo | Horario da atividade: `text-sm font-bold`, cor da categoria |
| Topo direito | Chip de categoria: background suave da cor da categoria + texto tiny (`px-3 py-1 rounded-full text-xs font-medium`) |
| Corpo principal | Nome da atividade: `text-xl font-bold atlas-on-surface`; Localizacao/detalhe: `atlas-on-surface-variant mb-4` |
| Area de metadados | Duracao estimada + custo em BRL — icones `schedule` e `payments`, texto `uppercase tracking-wider text-xs` |
| Dica contextual (opcional) | Container com fundo `atlas-primary-fixed`, texto italico em `atlas-on-primary-fixed-variant`, icone `lightbulb` — exibido quando AI gerou uma dica especifica para a atividade |

#### Categorias de atividade e seus tokens visuais

| Categoria | Cor do no | Borda lateral | Cor do chip | Cor do horario |
|-----------|-----------|--------------|-------------|----------------|
| `logistica` | `atlas-primary-container` | Sem borda lateral | `atlas-surface-container-low` + `atlas-on-surface-variant` | `atlas-primary-container` |
| `cultura` | `atlas-tertiary` | `border-l-8 atlas-tertiary-container` | `atlas-tertiary-fixed` + `atlas-on-tertiary-fixed-variant` | `atlas-tertiary` |
| `gastronomia` | `atlas-primary-fixed-dim` | `border-l-8 atlas-primary-container` | `atlas-primary-fixed` + `atlas-on-primary-fixed-variant` | `atlas-primary-container` |
| `natureza` | A definir pelo ux-designer — nao aparece no prototipo atual | — | — | — |
| `esporte` | A definir pelo ux-designer | — | — | — |
| `compras` | A definir pelo ux-designer | — | — | — |

#### Card de resumo do dia

Ao final da lista de atividades de cada dia, um card de resumo:
- Container: `atlas-surface-container` background, `rounded-xl`, padding generoso
- Layout: icone `analytics` em `atlas-primary-container` + bloco de texto a direita + metricas no canto direito
- Metricas: numero de atividades + duracao total do dia + custo medio estimado em BRL
- Cada metrica: numero em `text-2xl font-headline font-extrabold` + label em `text-xs uppercase font-bold atlas-on-surface-variant opacity-60`

### 2.7 Coluna direita — Mapa interativo

A coluna do mapa e sticky (`sticky top-20`) e ocupa toda a altura da viewport disponivel (`h-screen`).

Estrutura do mapa:
- Container: `rounded-2xl overflow-hidden shadow-xl border border-white/20`
- Fundo de mapa: `bg-[#dbe4f4]` (azul-cinza claro) simulando o tile de mapa
- Imagem de mapa sobreposta com blend-mode e opacidade reduzida

Elementos visuais sobre o mapa:
- Marcadores de locais: circulos 32x32px com icone Material Symbol centralizado, borda 4px branca, sombra elevada
  - Tipo hotel: fundo `atlas-primary-container`, icone `hotel`, texto `atlas-on-primary-container`
  - Tipo museu/cultura: fundo `atlas-tertiary`, icone `museum`, texto branco
  - Tipo restaurante: fundo `atlas-primary-container`, icone `restaurant`, texto `atlas-on-primary-container`
- Label "Mapa interativo" no canto superior esquerdo: glass-morphism (blur + fundo branco/70), icone `map` em `atlas-primary-container`, texto `font-bold atlas-on-surface`
- Controles de mapa no rodape centralizado: glass-morphism container com botoes `zoom_in`, `zoom_out`, separador, `my_location` — cada botao: fundo branco, icone `atlas-on-surface`, hover `atlas-surface-container-low`

Comportamento:
- Os marcadores no mapa correspondem as atividades do dia selecionado
- Ao mudar o dia no seletor de pills, o mapa deve atualizar os marcadores para refletir os locais do novo dia
- A integracao com Mapbox GL JS (existente no projeto) deve ser preservada; este spec nao altera a integracao tecnica, apenas a aparencia

### 2.8 Footer fixo — Wizard Navigation Bar

Footer fixo no rodape (`fixed bottom-0 left-0 right-0`), fundo branco, sombra superior suave (`shadow-[0_-8px_24px_rgba(4,13,27,0.04)]`), z-index 50.

Layout do footer (3 elementos horizontais):

| Posicao | Elemento | Comportamento |
|---------|---------|---------------|
| Esquerda | Botao "Voltar para Guia" | Texto + icone `arrow_back`; `atlas-on-surface-variant`; hover: `atlas-primary-container`; navega para Phase 5 |
| Centro | Indicador de progresso total | Label "Progresso Total" em tiny uppercase + barra de segmentos (1 por fase, 8 total): concluidas `atlas-tertiary-fixed-dim`, ativa `atlas-primary-container`, futuras `atlas-surface-container-high` |
| Direita | Botao "Ver Sumario" | Texto + icone `arrow_forward`; fundo `atlas-on-surface` (#040d1b navy), texto branco; hover: fundo `atlas-primary-container`, texto `atlas-on-primary-container` (navy) |

---

## 3. Criterios de Aceite — Phase 6 V2

Os ACs abaixo complementam os ACs AC-13 a AC-18 do SPEC-PROD-053 com o nivel de detalhe necessario para implementacao e validacao fiel ao prototipo.

### Bloco A: Layout e Estrutura

- [ ] AC-P6-01: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px (`md`), quando Phase 6 renderiza, entao o layout e dividido em duas colunas: coluna de conteudo com 60% da largura e coluna de mapa com 40% da largura, lado a lado.
- [ ] AC-P6-02: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport < 768px, quando Phase 6 renderiza, entao a coluna de mapa e completamente ocultada e a coluna de conteudo ocupa 100% da largura em layout de coluna unica.
- [ ] AC-P6-03: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza, entao o header de navegacao (logo + breadcrumb + PA badge + avatar) e sticky no topo com z-index superior ao conteudo, fundo `atlas-background`, e permanece visivel durante o scroll do conteudo.
- [ ] AC-P6-04: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza, entao o footer de navegacao (Voltar / indicador de progresso / Ver Sumario) e fixo no rodape com z-index superior ao conteudo e permanece visivel durante o scroll do conteudo.

### Bloco B: Stepper de Fases

- [ ] AC-P6-05: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza, entao o stepper de fases exibe 8 nos: Fases 1-5 com circulo 32px e fundo `atlas-tertiary-fixed-dim` + icone check; Fase 6 com circulo 40px e fundo `atlas-primary-container` + numero "6" + ring externo `atlas-primary-fixed-dim`; Fases 7-8 com circulo 32px e icone lock e opacidade 50%.
- [ ] AC-P6-06: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza, entao a linha conectora entre Fase 5 e Fase 6 usa cor `atlas-primary-container`; a linha conectora entre Fase 6 e Fase 7 usa `atlas-surface-container-high`; as demais linhas usam `atlas-tertiary-fixed-dim`.
- [ ] AC-P6-07: Dado qualquer viewport, quando o stepper de fases e renderizado, entao o label "Fase 6 de 8" e "Roteiro Detalhado" sao visiveis a direita do stepper (ou abaixo em mobile) com as tipografias corretas (`atlas-text-small` + `atlas-on-surface-variant` para o label; `atlas-text-h5` + `font-bold` para o titulo da fase).

### Bloco C: Cabecalho do Conteudo e Acoes

- [ ] AC-P6-08: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza, entao o H1 exibe "Seu Roteiro: [Nome do Destino]" em `Plus Jakarta Sans font-extrabold text-5xl atlas-on-surface`; o subtitulo exibe "[N] dias • [N] viajantes • [Estilos detectados]" em `text-lg atlas-on-surface-variant font-medium`.
- [ ] AC-P6-09: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o botao "Regenerar Roteiro (80 PA)" e clicado, entao uma modal ou dialog de confirmacao e exibida informando o custo de 80 PA e solicitando confirmacao antes de iniciar a geracao — o sistema NAO inicia a geracao sem confirmacao do usuario.
- [ ] AC-P6-10: Dado que o usuario confirma a regeneracao, quando a geracao inicia, entao o custo de 80 PA e debitado do saldo do usuario antes da entrega do novo roteiro, conforme economia de PA definida em `ATLAS-GAMIFICACAO-APROVADO.md`.
- [ ] AC-P6-11: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o botao "Exportar PDF" e clicado, entao o sistema exibe um estado de "Em breve" (deferred — SPEC-PROD-014) sem gerar erro — o botao e visivel mas desabilitado com tooltip explicativo.

### Bloco D: Seletor de Dias

- [ ] AC-P6-12: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza com um roteiro de N dias, entao a barra de seletor exibe exatamente N pills, cada um com o numero do dia ("Dia [N]") e a data correspondente no formato "DD Mmm" (ex: "15 Mar"), derivada das datas da viagem definidas na Phase 1.
- [ ] AC-P6-13: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 carrega pela primeira vez, entao o pill "Dia 1" esta no estado ativo (fundo `atlas-primary-container`, texto `atlas-on-primary-container`, sombra elevada) e os demais pills estao no estado inativo.
- [ ] AC-P6-14: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario clica ou toca em um pill de dia diferente, entao o pill clicado assume o estado ativo; o pill anteriormente ativo retorna ao estado inativo; a timeline abaixo e atualizada para exibir as atividades do dia selecionado; o mapa e atualizado para exibir os marcadores correspondentes ao novo dia.
- [ ] AC-P6-15: Dado um roteiro com mais dias do que cabem na viewport (tipicamente > 6 dias em mobile), quando o usuario arrasta a barra de pills horizontalmente, entao o scroll horizontal funciona sem scrollbar visivel e sem interferir com o scroll vertical da pagina.
- [ ] AC-P6-16: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport 375px, quando a barra de pills renderiza, entao cada pill tem largura minima de 100px e altura de 80px, garantindo area de toque >= 44x44px.

### Bloco E: Timeline de Atividades

- [ ] AC-P6-17: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando as atividades de um dia sao exibidas, entao cada atividade e precedida por um header de dia ("Dia [N] — [Tema]") em `text-2xl font-headline font-bold atlas-on-surface` com borda esquerda de 4px na cor `atlas-primary-container`.
- [ ] AC-P6-18: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px, quando as atividades de um dia sao exibidas, entao a linha vertical da timeline e renderizada a esquerda dos cards, na cor `atlas-surface-container-high`, conectando os nos visuais de cada atividade.
- [ ] AC-P6-19: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade de categoria `logistica` e renderizada, entao: o no circular e `atlas-primary-container`; o card NAO tem borda lateral esquerda colorida; o chip de categoria usa fundo `atlas-surface-container-low` e texto `atlas-on-surface-variant`.
- [ ] AC-P6-20: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade de categoria `cultura` e renderizada, entao: o no circular e `atlas-tertiary`; o card tem borda lateral esquerda de 8px na cor `atlas-tertiary-container`; o chip usa fundo `atlas-tertiary-fixed` e texto `atlas-on-tertiary-fixed-variant`; o horario usa cor `atlas-tertiary`.
- [ ] AC-P6-21: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade de categoria `gastronomia` e renderizada, entao: o no circular e `atlas-primary-fixed-dim`; o card tem borda lateral esquerda de 8px na cor `atlas-primary-container`; o chip usa fundo `atlas-primary-fixed` e texto `atlas-on-primary-fixed-variant`; o horario usa cor `atlas-primary-container`.
- [ ] AC-P6-22: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando um card de atividade contem uma dica contextual gerada por IA, entao a dica e exibida em um container com fundo `atlas-primary-fixed`, texto italico em `atlas-on-primary-fixed-variant`, e icone `lightbulb` a esquerda — visualmente distinto do corpo principal do card.
- [ ] AC-P6-23: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario passa o mouse (hover) sobre um card de atividade em desktop, entao a sombra do card aumenta de `shadow-sm` para `shadow-md` com transicao suave — sem outros cambios visuais involuntarios.
- [ ] AC-P6-24: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando as atividades de um dia terminam, entao um card de resumo do dia e exibido ao final exibindo: numero de atividades, duracao total estimada do dia, e custo medio estimado em BRL.
- [ ] AC-P6-25: Dado `prefers-reduced-motion: reduce` no sistema operacional do usuario, quando Phase 6 carrega e o roteiro e gerado via streaming, entao nenhuma animacao e executada — o conteudo aparece instantaneamente sem efeitos de fade-in ou slide.

### Bloco F: Streaming de Geracao

- [ ] AC-P6-26: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o AI esta gerando o roteiro via streaming, entao os blocos de dia aparecem progressivamente na ordem em que sao recebidos — o Dia 1 aparece e fica visivel enquanto o Dia 2 ainda esta sendo gerado; NAO ha uma tela em branco seguida de dump completo de conteudo.
- [ ] AC-P6-27: Dado que o streaming esta em andamento, quando um dia esta parcialmente gerado, entao as atividades ja recebidas sao renderizadas e o fim do conteudo do dia exibe um indicador de carregamento (skeleton ou spinner) indicando que ha mais conteudo a chegar para aquele dia.
- [ ] AC-P6-28: Dado que o streaming esta em andamento, quando o usuario tenta navegar para um dia que ainda nao foi gerado via o seletor de pills, entao o sistema exibe uma mensagem de estado vazio ("Aguardando geracao...") — sem crash, sem erro visivel.

### Bloco G: Mapa Interativo (Coluna Direita)

- [ ] AC-P6-29: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px, quando Phase 6 renderiza, entao a coluna direita exibe um mapa centralizado no destino da viagem com os marcadores dos locais do dia selecionado visiveis.
- [ ] AC-P6-30: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px, quando Phase 6 renderiza, entao o mapa e sticky (`sticky top-20`), permanecendo visivel enquanto o usuario scrolla a coluna de conteudo esquerda.
- [ ] AC-P6-31: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando marcadores sao renderizados no mapa, entao cada marcador tem icone correspondente ao tipo de atividade: `hotel` para hospedagem, `museum` para cultura, `restaurant` para gastronomia — usando Material Symbols dentro de circulos coloridos conforme a paleta de categorias da timeline.
- [ ] AC-P6-32: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario clica em um marcador no mapa, entao o card correspondente na timeline e destacado visualmente (scroll para o card se necessario + estado de destaque temporario).
- [ ] AC-P6-33: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o mapa e renderizado, entao os controles de zoom (`zoom_in`, `zoom_out`) e localizacao (`my_location`) estao visiveis e operacionais no rodape do mapa, dentro de um container glass-morphism.

### Bloco H: Footer de Navegacao

- [ ] AC-P6-34: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza, entao o footer fixo exibe tres elementos: botao "Voltar para Guia" (esquerda), indicador de progresso por segmentos (centro), botao "Ver Sumario" (direita) — todos com as especificacoes de cor e tipografia do prototipo.
- [ ] AC-P6-35: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o indicador de progresso do footer renderiza, entao ele exibe 8 segmentos de barra: segmentos 1-5 com cor `atlas-tertiary-fixed-dim`, segmento 6 com `atlas-primary-container`, segmentos 7-8 com `atlas-surface-container-high`.
- [ ] AC-P6-36: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario clica em "Voltar para Guia", entao e redirecionado para a Phase 5 ("Guia do Destino") da mesma expedicao sem perda de dados.
- [ ] AC-P6-37: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario clica em "Ver Sumario", entao e redirecionado para a pagina de sumario da expedicao (`/expedition/[tripId]/summary`).

### Bloco I: Acessibilidade

- [ ] AC-P6-38: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 e auditada com axe-core em WCAG 2.1 AA, entao zero violacoes sao reportadas.
- [ ] AC-P6-39: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario navega pela Phase 6 usando apenas teclado, entao: a barra de seletor de dias e navegavel com setas; cada card de atividade e focavel via Tab; o botao de regenerar roteiro e ativavel via Enter/Space; os controles do mapa sao acessiveis via Tab.
- [ ] AC-P6-40: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando a estrutura semantica da timeline e auditada, entao cada grupo de atividades de um dia e delimitado por um elemento `<section>` com um `<h2>` acessivel (o header "Dia N — Tema"); as atividades dentro do grupo sao `<article>` ou `<li>` com estrutura de heading hierarquico.
- [ ] AC-P6-41: Dado qualquer card de atividade, quando renderizado, entao o contraste entre o texto de horario e o fundo do card atende ao minimo de 4.5:1 para texto normal conforme WCAG 2.1 AA — especialmente verificar o par `atlas-tertiary` sobre `atlas-surface-container-lowest`.
- [ ] AC-P6-42: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando um screen reader atravessa a timeline, entao o conteudo e lido em ordem logica: header do dia → cada atividade (horario, nome, localizacao, duracao, custo, dica se presente) → card de resumo do dia.

### Bloco J: Regressao V1

- [ ] AC-P6-43: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando Phase 6 renderiza, entao zero mudancas visuais sao observadas em relacao ao estado V1 pre-sprint-40 — validado via Playwright screenshot baseline.
- [ ] AC-P6-44: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando o streaming de geracao de roteiro ocorre, entao o comportamento de streaming e identico ao V1 sem qualquer regressao funcional.

---

## 4. O que NAO esta no escopo desta spec

- Logica de geracao de roteiro por IA (prompt, modelos, parametros) — escopo do prompt-engineer
- Alteracoes na integracao Mapbox GL JS (adicao de camadas, estilos de mapa, geocoding) — escopo SPEC-ARCH correspondente
- Exportacao do roteiro para PDF (SPEC-PROD-014, deferred Sprint 29)
- Link compartilhavel de roteiro (SPEC-PROD-014, deferred Sprint 29)
- Edicao manual de atividades do roteiro — nao ha UI de edicao no prototipo atual
- Dark mode — Won't Have Sprint 40
- Animacoes de scroll reveal — Won't Have Sprint 40

---

## 5. Dependencias

- SPEC-PROD-053 (ACs 13-18): parent spec — esta spec complementa, nao substitui
- SPEC-PROD-051 (Phase Shell V2): hard dependency — shell deve estar aprovado antes de integrar Phase 6
- `docs/design/stitch-exports/phase6_roteiro_detalhado/code.html`: autoridade visual definitiva
- `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md`: tokens de design atomicos
- `ATLAS-GAMIFICACAO-APROVADO.md`: custo de 80 PA para regeneracao de roteiro (AC-P6-10)
- AI streaming infrastructure (Sprint 18-19): preservada, nao alterada
- Mapbox GL JS integration (existente): preservada, apenas os marcadores visuais sao ajustados

---

## 6. Gate de Aprovacao UX Designer

Antes do merge de Phase 6 V2, o UX Designer DEVE validar:

1. Fidelidade do layout split 60/40 contra o prototipo Stitch em viewport 1280px
2. Fidelidade do seletor de dias (pills, estados ativo/inativo, scroll) contra o prototipo
3. Fidelidade dos cards de atividade (nos, bordas laterais, chips de categoria) por categoria
4. Fidelidade do card de resumo do dia
5. Fidelidade dos controles e marcadores do mapa
6. Fidelidade do footer de navegacao
7. Comportamento responsive em 375px (ausencia do mapa, single-column, touch targets)

A aprovacao e documentada em um comentario no PR antes do merge.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-26 | product-owner | Initial draft — leitura completa do prototipo Stitch phase6_roteiro_detalhado + 44 ACs detalhados |
