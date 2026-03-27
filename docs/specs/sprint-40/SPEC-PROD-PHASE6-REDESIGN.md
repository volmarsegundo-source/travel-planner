---
spec_id: SPEC-PROD-PHASE6-REDESIGN
title: "Redesign Completo — Phase 6 'O Roteiro' (Itinerario Detalhado V2)"
version: 1.0.0
status: Draft
sprint: 40
owner: product-owner
reviewers: [tech-lead, ux-designer, architect]
created: 2026-03-26
updated: 2026-03-26
feature_flag: NEXT_PUBLIC_DESIGN_V2
parent_spec: SPEC-PROD-053
brief_reference: docs/specs/sprint-40/SPEC-PHASE6-REDESIGN-BRIEF.md
stitch_reference: docs/design/stitch-exports/phase6_roteiro_detalhado/code.html
token_reference: docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md
gamification_reference: docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md
---

# SPEC-PROD-PHASE6-REDESIGN: Redesign Completo — Phase 6 "O Roteiro"

## 1. Declaracao do Problema

A Phase 6 ("O Roteiro") e o artefato central do produto Atlas: o itinerario dia-a-dia gerado por IA e o principal motivo pelo qual o viajante investe tempo e PA nas cinco fases anteriores. Na versao atual (V1), o roteiro e exibido como uma lista scrollavel de blocos de texto com estrutura visual minima. Usuarios relatam dificuldade para escanear o cronograma dia-a-dia, e a entrega do valor gerado por IA nao cria o "momento wow" que justifica o investimento.

O prototipo Stitch `phase6_roteiro_detalhado/code.html` define a visao V2: layout split 60/40 com timeline visual categorizada, seletor de dias em pills, mapa interativo sticky, e footer de navegacao consistente com o WizardFooter padronizado. Esta spec traduz esse prototipo em criterios de aceite verificaveis para implementacao e validacao.

Esta spec e um sub-spec de SPEC-PROD-053. Ela expande os ACs AC-13 a AC-18 daquele spec com o nivel de detalhe necessario para implementacao fiel ao prototipo. Os ACs aqui nao substituem os ACs do parent spec — eles os complementam. Em caso de conflito, o prototipo Stitch prevalece; em caso de conflito entre esta spec e o parent spec, escalar ao PO antes de implementar.

---

## 2. User Story

As a @bleisure traveler reviewing my AI-generated day-by-day itinerary,
I want the itinerary to feel like a professional travel document — structured, visually rich, and easy to navigate day by day —
so that I can confidently share it with travel companions and use it as a real guide during the trip.

### Contexto do Viajante

- **Pain point**: O roteiro atual e uma parede de texto. O viajante nao consegue escanear rapidamente "o que fazemos na manha do dia 3?" sem ler tudo. Em dispositivos moveis, o problema e ainda pior: sem estrutura visual, o conteudo parece uma nota de rodape, nao um itinerario premium.
- **Workaround atual**: Usuarios avancados copiam o roteiro para Notion ou Google Docs e adicionam sua propria estrutura manualmente. Isso e uma falha de produto — o valor gerado pela IA e dilacerado pela falta de apresentacao.
- **Frequencia**: Phase 6 e o terminus de toda expedicao completada. O itinerario e o artefato ao qual o viajante retorna multiplas vezes — antes, durante e apos a viagem. E o artefato com maior frequencia de revisitas em todo o produto.

---

## 3. Criterios de Aceite

Os ACs estao organizados em blocos tematicos. Cada AC segue o padrao: dado [contexto], quando [acao], entao [resultado esperado verificavel].

O prefixo `AC-P6-` e reservado para esta spec. Os ACs `AC-P6-001` a `AC-P6-044` ja foram definidos no brief SPEC-PHASE6-REDESIGN-BRIEF. Esta spec os expande com ACs adicionais e organiza todos em uma estrutura definitiva.

---

### Bloco 1: Estrutura de Layout

**Racional**: O layout split 60/40 e a decisao estrutural mais importante desta fase. Ele permite que o mapa e a timeline sejam vistos simultaneamente em desktop — um padrao estabelecido em produtos como Google Maps, Airbnb e TripAdvisor. Em mobile, o mapa e suprimido para priorizar o conteudo textual.

- [ ] AC-P6-001: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px, quando Phase 6 renderiza, entao o layout apresenta duas colunas lado a lado: coluna de conteudo ocupando 60% da largura total e coluna de mapa ocupando 40% da largura total, sem espaco em branco ou padding externo entre elas.

- [ ] AC-P6-002: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport < 768px, quando Phase 6 renderiza, entao a coluna de mapa e completamente ocultada (nao apenas colapsada ou com display:none com reflow) e a coluna de conteudo ocupa 100% da largura disponivel em layout de coluna unica.

- [ ] AC-P6-003: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px e >= 1024px (tablet landscape / desktop), quando o usuario scrolla a coluna de conteudo (esquerda) para baixo, entao a coluna de mapa (direita) permanece visivel e estatica no viewport — ela nao scrolla junto com o conteudo.

- [ ] AC-P6-004: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza em qualquer viewport, entao o header de navegacao (logo + breadcrumb + PA badge + avatar) e sticky no topo com z-index que garante visibilidade sobre qualquer conteudo scrollavel, e o fundo do header usa a cor `atlas-background` (#f9f9ff).

- [ ] AC-P6-005: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza em qualquer viewport, entao o footer de navegacao do wizard (Voltar / indicador de progresso / Ver Sumario) e fixo no rodape da viewport com z-index que garante visibilidade sobre qualquer conteudo scrollavel, e o fundo do footer e branco (#ffffff).

- [ ] AC-P6-006: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport 768px (tablet portrait), quando Phase 6 renderiza, entao o mapa e exibido abaixo da coluna de conteudo (nao ao lado), ocupando 100% da largura, com altura minima de 300px.

---

### Bloco 2: Header de Navegacao (Top Bar)

**Racional**: O header de Phase 6 segue o mesmo padrao definido no PhaseShell V2 (SPEC-PROD-051). Os ACs aqui documentam os elementos especificos ao contexto da Phase 6 — principalmente o breadcrumb e o badge de PA.

- [ ] AC-P6-007: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o header renderiza em viewport >= 768px, entao o breadcrumb exibe: "Minhas Expedicoes" (clicavel, `atlas-on-surface-variant`) > separador chevron (`atlas-outline-variant`) > "[Nome da viagem]" (clicavel, `atlas-on-surface-variant`) > separador chevron > "Roteiro" (nao clicavel, cor `atlas-primary-container`, `font-bold`).

- [ ] AC-P6-008: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o header renderiza em viewport < 768px, entao o breadcrumb e ocultado para preservar espaco no header — apenas logo, badge de PA e avatar sao visiveis.

- [ ] AC-P6-009: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o badge de PA no header renderiza, entao ele e um pill com fundo `atlas-secondary-container`, texto "[N] PA" em `atlas-on-secondary-container` + `font-bold`, e um ponto circular animado com `animate-pulse` em `atlas-primary-container` a direita do texto.

- [ ] AC-P6-010: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario clica em "Minhas Expedicoes" no breadcrumb, entao e redirecionado para `/expeditions` sem perda de dados da expedicao atual. Quando clica no nome da viagem, e redirecionado para a pagina de detalhes da expedicao correspondente.

---

### Bloco 3: Stepper de Progresso de Fases

**Racional**: O stepper visual imediatamente abaixo do header comunica ao viajante onde ele esta na jornada de 8 fases e quantas fases faltam. Este e um componente critico para reducao de abandono — o viajante que ve "Fase 6 de 8" sabe que esta quase la.

- [ ] AC-P6-011: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o stepper renderiza, entao ele exibe exatamente 8 nos em linha horizontal com linhas conectoras entre eles, sobre fundo `atlas-surface-container-low`.

- [ ] AC-P6-012: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o stepper renderiza, entao os nos das Fases 1 a 5 (concluidas) apresentam: circulo 32x32px, fundo `atlas-tertiary-fixed-dim` (#92d2c9), icone `check` centralizado em `atlas-on-tertiary-fixed-variant`, sem ring externo. As linhas conectoras entre Fases 1-5 usam cor `atlas-tertiary-fixed-dim`.

- [ ] AC-P6-013: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o stepper renderiza, entao o no da Fase 6 (ativa) apresenta: circulo 40x40px (maior que os demais), fundo `atlas-primary-container` (#fe932c), numero "6" em branco (`atlas-on-primary`) e `font-bold`, ring externo `ring-4` na cor `atlas-primary-fixed-dim`. A linha conectora entre Fase 5 e Fase 6 usa `atlas-primary-container`. A linha conectora entre Fase 6 e Fase 7 usa `atlas-surface-container-high`.

- [ ] AC-P6-014: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o stepper renderiza, entao os nos das Fases 7 e 8 (bloqueadas) apresentam: circulo 32x32px, fundo `atlas-surface-container`, icone `lock` centralizado em `atlas-on-surface-variant`, opacidade 50% aplicada ao no inteiro. A linha conectora apos Fase 7 usa `atlas-surface-container-high`.

- [ ] AC-P6-015: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o stepper renderiza, entao o label a direita (ou abaixo em mobile) exibe: "Fase 6 de 8" em `text-sm font-medium atlas-on-surface-variant` na linha superior; "Roteiro Detalhado" em `text-lg font-headline font-bold atlas-on-surface` na linha inferior.

- [ ] AC-P6-016: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport < 768px, quando o stepper renderiza, entao ele permanece visivel mas pode ser horizontalmente scrollavel sem scrollbar visivel caso os nos nao caibam na largura da tela — os nos nunca sao cortados sem possibilidade de scroll.

---

### Bloco 4: Cabecalho do Conteudo e Acoes

**Racional**: O H1 e as acoes ("Regenerar", "Exportar PDF") ficam no topo da coluna de conteudo, imediatamente antes do seletor de dias. Eles contextualizam o roteiro (destino, duracao, viajantes) e dao ao usuario controles para gerenciar o artefato.

- [ ] AC-P6-017: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza com um roteiro gerado, entao o H1 exibe "Seu Roteiro: [Nome do Destino]" usando tipografia `Plus Jakarta Sans font-extrabold text-5xl atlas-on-surface`, e o subtitulo exibe "[N] dias • [N] viajantes • [Estilos detectados]" em `text-lg atlas-on-surface-variant font-medium` — os dados devem ser derivados do objeto Trip associado a expedicao.

- [ ] AC-P6-018: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o botao "Regenerar Roteiro (80 PA)" e clicado, entao o sistema exibe uma modal de confirmacao ANTES de iniciar qualquer chamada de IA. A modal informa: (a) que a acao custara 80 PA do saldo disponivel do usuario; (b) que o roteiro atual sera substituido; (c) botoes "Confirmar" e "Cancelar" claramente distintos. O roteiro atual permanece visivel enquanto a modal esta aberta.

- [ ] AC-P6-019: Dado que o usuario confirma a regeneracao na modal, quando o sistema inicia a geracao, entao: (a) 80 PA sao debitados do saldo do usuario antes da entrega do novo roteiro, conforme regra `ai_itinerary=80 PA` de ATLAS-GAMIFICACAO-APROVADO.md; (b) o saldo atualizado e refletido no badge de PA no header em tempo real; (c) uma transacao e registrada no historico de PA do usuario.

- [ ] AC-P6-020: Dado que o usuario nao possui PA suficiente (saldo < 80 PA) e clica em "Regenerar Roteiro", entao o sistema exibe a modal de saldo insuficiente (padrao do sistema — nao uma nova modal especifica desta fase) com opcao de comprar PA, sem iniciar a geracao.

- [ ] AC-P6-021: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o botao "Exportar PDF" e clicado, entao o sistema exibe um tooltip ou estado inline de "Em breve" indicando que a funcionalidade esta sendo desenvolvida — o botao e visivel e acessivel via teclado, mas nao executa nenhuma acao funcional. O botao nao deve parecer quebrado; deve comunicar intencionalidade do produto (feature deferred).

- [ ] AC-P6-022: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport < 768px, quando o cabecalho de acoes renderiza, entao os botoes "Regenerar" e "Exportar PDF" se recolhem para um menu de icones ou empilham abaixo do H1 — nunca causam overflow horizontal na viewport.

---

### Bloco 5: Seletor de Dias (Day Selector Pills)

**Racional**: O seletor de dias permite que o viajante navegue pelo roteiro sem precisar scrollar toda a pagina. E o padrao UX estabelecido por Google Trips, TripIt e Wanderlog. Cada pill e uma entrada discreta para um dia do roteiro, com a data derivada da data de inicio definida na Phase 1.

- [ ] AC-P6-023: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 renderiza com um roteiro de N dias, entao a barra de pills exibe exatamente N pills. O numero de pills corresponde ao numero de dias da viagem conforme as datas definidas na Phase 1 — nem mais, nem menos.

- [ ] AC-P6-024: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando os pills sao renderizados, entao cada pill exibe: (linha 1) "Dia [N]" em `text-sm font-bold`; (linha 2) data no formato "DD Mmm" (ex: "15 Mar") em `text-xs`. A data e calculada como: data de inicio da viagem (Phase 1) + (N - 1) dias, usando o locale pt-BR para o nome abreviado do mes.

- [ ] AC-P6-025: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 carrega pela primeira vez (ou quando o roteiro e gerado pela primeira vez), entao o pill "Dia 1" esta no estado ativo automaticamente. Estado ativo: fundo `atlas-primary-container` (#fe932c), texto `atlas-on-primary-container` (#663400 — nunca branco), sombra elevada `shadow-lg`, transicao `custom-spring`.

- [ ] AC-P6-026: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando um pill esta no estado inativo, entao seu fundo e `atlas-surface-container-lowest` (#ffffff) e texto em `atlas-on-surface-variant`. Ao hover (desktop), o fundo transiciona suavemente para `atlas-surface-container-low` com duracao de transicao <= 200ms.

- [ ] AC-P6-027: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario clica ou toca em qualquer pill, entao: (a) o pill clicado assume o estado ativo; (b) o pill anteriormente ativo retorna ao estado inativo; (c) a timeline abaixo atualiza para exibir as atividades do dia correspondente; (d) o mapa atualiza para exibir os marcadores do novo dia. Estas quatro acoes ocorrem de forma sincronizada — sem flash ou estado intermediario vazio.

- [ ] AC-P6-028: Dado um roteiro com mais dias do que cabem na viewport (tipicamente > 5 dias em mobile, > 8 em desktop), quando o usuario arrasta a barra de pills horizontalmente, entao o scroll horizontal funciona suavemente, sem scrollbar visivel, e sem interferir com o scroll vertical da pagina quando o gesto e predominantemente vertical.

- [ ] AC-P6-029: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport 375px, quando a barra de pills renderiza, entao cada pill tem dimensao minima de 100px de largura e 80px de altura, garantindo area de toque >= 44x44px conforme WCAG 2.5.5 (Target Size).

- [ ] AC-P6-030: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o dia ativo e alterado pelo seletor de pills, entao o pill que acabou de ser selecionado e scrollado para a posicao visivel na barra (auto-scroll do pill ativo para o centro ou para dentro da viewport) — o usuario nunca precisa scrollar manualmente para ver o pill ativo.

---

### Bloco 6: Header do Dia e Timeline de Atividades

**Racional**: A timeline vertical e o elemento de maior densidade informacional do produto. Ela deve comunicar sequencia temporal, categoria de atividade e custo estimado de forma escaneavel. Os cards de atividade seguem um padrao de cores por categoria que e consistente entre o ponto da linha (no), a borda lateral do card e o chip de categoria.

#### 6.1 Header do Dia

- [ ] AC-P6-031: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando as atividades de um dia sao renderizadas, entao um header H2 e exibido antes da primeira atividade com o formato: "Dia [N] — [Tema do dia gerado por IA]" (ex: "Dia 1 — Chegada e Alfama"). Estilo: `text-2xl font-headline font-bold atlas-on-surface`, com borda esquerda solida de 4px na cor `atlas-primary-container`, e padding-left suficiente para afastar o texto da borda.

- [ ] AC-P6-032: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o dia selecionado no pill muda, entao o header H2 atualiza para refletir o tema do novo dia selecionado.

#### 6.2 Linha Vertical da Timeline

- [ ] AC-P6-033: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px, quando as atividades de um dia sao renderizadas, entao uma linha vertical continua e exibida a esquerda dos cards, na cor `atlas-surface-container-high`, conectando visualmente todos os nos de atividade do dia — desde o primeiro ao ultimo card.

- [ ] AC-P6-034: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport < 768px, quando as atividades sao renderizadas, entao a linha vertical da timeline e ocultada — o layout mobile exibe apenas os nos circulares e os cards sem a linha de conexao, para reduzir densidade visual.

#### 6.3 No Visual de Cada Atividade

- [ ] AC-P6-035: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando qualquer atividade e renderizada, entao o no circular tem dimensao 16x16px (`w-4 h-4`), forma circular, cor dependente da categoria (ver tabela Bloco 7), e um ring de separacao `ring-4` na cor `atlas-surface-container-lowest` ao redor — o ring cria o efeito visual de "flutuacao" sobre a linha vertical.

#### 6.4 Card de Atividade — Estrutura Comum

- [ ] AC-P6-036: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando um card de atividade e renderizado, entao seu container apresenta: fundo `atlas-surface-container-lowest` (#ffffff), borda arredondada `rounded-xl`, sombra `shadow-sm`, padding interno generoso (minimo 24px em desktop, 16px em mobile). Ao hover (desktop), a sombra transiciona para `shadow-md` com duracao <= 200ms — nenhuma outra mudanca visual involuntaria ocorre no hover.

- [ ] AC-P6-037: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando um card de atividade e renderizado, entao o layout interno do card segue esta hierarquia de cima para baixo: (linha 1) horario da atividade (esquerda) + chip de categoria (direita); (linha 2) nome da atividade como H3; (linha 3) localizacao ou descricao; (linha 4) metadados de duracao e custo; (linha 5, opcional) dica contextual de IA.

- [ ] AC-P6-038: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o horario da atividade e exibido no card, entao ele usa `text-sm font-bold` na cor especifica da categoria (ver tabela Bloco 7).

- [ ] AC-P6-039: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando os metadados de duracao e custo sao exibidos, entao eles aparecem com icones `schedule` (duracao) e `payments` (custo), texto em `text-xs font-bold uppercase tracking-wider atlas-on-surface-variant/70` — mantendo a discrecao visual sem sacrificar a informacao.

- [ ] AC-P6-040: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando um card de atividade contem uma dica contextual gerada por IA, entao ela e renderizada em um container com fundo `atlas-primary-fixed` (#ffdcc3), texto italico em `atlas-on-primary-fixed-variant` (#6e3900), icone `lightbulb` a esquerda — visualmente distinto do corpo do card e claramente identificado como sugestao de IA. A dica e opcional e nao aparece em todos os cards.

---

### Bloco 7: Sistema de Categorias de Atividade

**Racional**: Cada categoria de atividade tem um conjunto de tokens visuais proprios: cor do no, presenca e cor da borda lateral do card, fundo e texto do chip de categoria, e cor do horario. Esta tabela e a fonte de verdade para implementacao consistente.

- [ ] AC-P6-041: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade de categoria `logistica` (check-in de hotel, transfer, embarque) e renderizada, entao: no circular usa `atlas-primary-container` (#fe932c); card NAO tem borda lateral esquerda colorida; chip de categoria usa fundo `atlas-surface-container-low` + texto `atlas-on-surface-variant`; horario usa cor `atlas-primary-container`.

- [ ] AC-P6-042: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade de categoria `cultura` (museu, monumento, bairro historico) e renderizada, entao: no circular usa `atlas-tertiary` (#266861 teal escuro); card tem borda lateral esquerda de 8px em `atlas-tertiary-container` (#7ab9b0); chip usa fundo `atlas-tertiary-fixed` (#aeefe5) + texto `atlas-on-tertiary-fixed-variant` (#005049); horario usa cor `atlas-tertiary`.

- [ ] AC-P6-043: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade de categoria `gastronomia` (restaurante, mercado, experiencia culinaria) e renderizada, entao: no circular usa `atlas-primary-fixed-dim` (#ffb77e); card tem borda lateral esquerda de 8px em `atlas-primary-container` (#fe932c); chip usa fundo `atlas-primary-fixed` (#ffdcc3) + texto `atlas-on-primary-fixed-variant` (#6e3900); horario usa cor `atlas-primary-container`.

- [ ] AC-P6-044: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade de categoria `natureza` (parque, praia, trilha, area natural) e renderizada, entao: no circular usa uma cor de natureza a ser definida pelo UX Designer antes da implementacao — o UX Designer DEVE especificar os tokens para esta categoria no gate de aprovacao desta spec (ver Secao 9). Esta AC esta BLOQUEADA ate a aprovacao UX.

- [ ] AC-P6-045: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade de categoria `vida_noturna` (bar, clube, show, evento noturno) e renderizada, entao: tokens visuais a serem definidos pelo UX Designer antes da implementacao — esta AC esta BLOQUEADA ate a aprovacao UX.

- [ ] AC-P6-046: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando uma atividade tem uma categoria desconhecida ou nao mapeada, entao ela e renderizada com o estilo de `logistica` como fallback seguro — sem crash, sem ausencia de estilo, sem cor token invalido.

---

### Bloco 8: Card de Resumo do Dia

**Racional**: O card de resumo ao final de cada dia oferece ao viajante uma visao consolidada do dia antes de passar para o proximo. E um elemento de orientacao que reduz a ansiedade de planejamento ao tornar o custo e o tempo total do dia imediatamente visiveis.

- [ ] AC-P6-047: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando todas as atividades de um dia sao exibidas, entao um card de resumo do dia e renderizado ao final da lista, apos a ultima atividade. O card e sempre o ultimo elemento do grupo de atividades de um dia — nunca dentro da lista, nunca antes de uma atividade.

- [ ] AC-P6-048: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o card de resumo do dia renderiza, entao ele exibe: (a) icone `analytics` em `atlas-primary-container` sobre fundo `atlas-surface-container-lowest` arredondado; (b) titulo "Resumo do Dia [N]" em `text-xl font-headline font-bold`; (c) subtitulo com o tema do dia (mesmo texto do H2 da timeline); (d) tres metricas dispostas lado a lado — numero de atividades, duracao total estimada do dia, custo medio estimado em BRL.

- [ ] AC-P6-049: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando as metricas do card de resumo sao renderizadas, entao cada metrica tem: valor numerico em `text-2xl font-headline font-extrabold atlas-on-surface`; label descritivo em `text-xs uppercase font-bold atlas-on-surface-variant opacity-60`. As metricas sao calculadas a partir das atividades do dia — duracao total e a soma das duracoes de todas as atividades; custo estimado e a soma dos custos ou um range se os custos forem variaveis.

- [ ] AC-P6-050: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport < 768px, quando o card de resumo renderiza, entao as tres metricas empilham verticalmente (coluna unica) — sem overflow horizontal, sem truncamento de texto.

---

### Bloco 9: Mapa Interativo (Coluna Direita)

**Racional**: O mapa e a proposta de valor diferencial da Phase 6 em relacao a concorrentes. A integracao com Mapbox GL JS existente e preservada — esta spec altera apenas a aparencia visual dos marcadores e do container, nao a logica de geocoding ou renderizacao de tiles.

- [ ] AC-P6-051: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px, quando Phase 6 renderiza, entao a coluna direita exibe um mapa centralizado na cidade de destino da viagem, com os marcadores dos locais do dia selecionado visiveis dentro do container arredondado (`rounded-2xl overflow-hidden shadow-xl`).

- [ ] AC-P6-052: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 768px, quando o usuario scrolla a coluna de conteudo esquerda, entao o container do mapa permanece sticky no topo da viewport (`sticky top-20`), ocupando toda a altura disponivel da viewport menos o header (`h-screen` ou equivalente calculado).

- [ ] AC-P6-053: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando marcadores sao renderizados sobre o mapa, entao cada marcador e um circulo de 32x32px com borda branca de 4px e sombra elevada, contendo um icone Material Symbols correspondente ao tipo de atividade: `hotel` para hospedagem, `museum` para cultura/turismo, `restaurant` para gastronomia. A cor de fundo do marcador segue a paleta de categorias: `atlas-primary-container` para logistica/hospedagem/gastronomia, `atlas-tertiary` para cultura.

- [ ] AC-P6-054: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o dia ativo e alterado pelo seletor de pills, entao o mapa atualiza os marcadores para exibir apenas os locais do novo dia selecionado — os marcadores do dia anterior sao removidos e os novos aparecem com animacao de entrada suave (`opacity 0 -> 1` em <= 300ms).

- [ ] AC-P6-055: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario clica em um marcador no mapa, entao: (a) o card de atividade correspondente na timeline e destacado visualmente (estado de destaque: borda ou background de realce temporario por 2-3 segundos); (b) a pagina scrolla suavemente ate o card se ele estiver fora da viewport; (c) o marcador no mapa recebe um estado de selecionado visualmente distinto.

- [ ] AC-P6-056: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o mapa renderiza, entao o label "Mapa interativo" e exibido no canto superior esquerdo do container do mapa, com estilo glass-morphism (fundo branco/70 + backdrop-filter blur), icone `map` em `atlas-primary-container`, e texto `font-bold atlas-on-surface` — este label e informativo, nao interativo.

- [ ] AC-P6-057: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o mapa renderiza, entao os controles de zoom e localizacao sao exibidos no rodape centralizado do container do mapa, em um container glass-morphism com tres botoes: `zoom_in`, `zoom_out` (separados por divisor vertical), e `my_location`. Cada botao tem fundo branco, icone `atlas-on-surface`, e ao hover o fundo transiciona para `atlas-surface-container-low`.

- [ ] AC-P6-058: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o mapa e inicializado, entao o zoom e ajustado automaticamente para que todos os marcadores do dia atual sejam visiveis dentro dos limites do container — sem necessidade de scroll ou zoom manual pelo usuario ao mudar de dia.

---

### Bloco 10: Footer de Navegacao (WizardFooter)

**Racional**: O footer e identico ao padrao WizardFooter definido no Sprint 36 e refinado no SPEC-PROD-051. Os tres elementos (Voltar / indicador / Proximo) sao consistentes em todas as fases. O indicador central e especifico ao progresso da expedicao, nao da fase individual.

- [ ] AC-P6-059: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o footer renderiza, entao ele exibe tres elementos horizontais: (esquerda) botao "Voltar para Guia" com icone `arrow_back`; (centro) indicador de progresso por segmentos com label "Progresso Total"; (direita) botao "Ver Sumario" com icone `arrow_forward`.

- [ ] AC-P6-060: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o botao "Voltar para Guia" e renderizado, entao ele usa texto `atlas-on-surface-variant` e `font-bold`. Ao hover, o texto transiciona para `atlas-primary-container`. Ao clicar, o usuario e redirecionado para a Phase 5 ("Guia do Destino") da mesma expedicao sem perda de dados.

- [ ] AC-P6-061: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o indicador de progresso central renderiza, entao ele exibe: label "Progresso Total" em `text-xs font-bold uppercase tracking-widest atlas-on-surface-variant/60`; abaixo, uma barra com 8 segmentos de `w-6 h-1 rounded-full`: segmentos 1-5 em `atlas-tertiary-fixed-dim`, segmento 6 em `atlas-primary-container`, segmentos 7-8 em `atlas-surface-container-high`.

- [ ] AC-P6-062: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o botao "Ver Sumario" e renderizado, entao ele tem fundo `atlas-on-surface` (#040d1b navy) e texto branco, padding `px-8 py-3`, borda arredondada `rounded-lg`, `font-bold`. Ao hover, o fundo transiciona para `atlas-primary-container` (#fe932c) e o texto para `atlas-on-primary-container` (#663400 — nunca branco). Ao clicar, o usuario e redirecionado para `/expedition/[tripId]/summary`.

- [ ] AC-P6-063: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport < 768px, quando o footer renderiza, entao o label "Progresso Total" e os segmentos de progresso sao ocultados para liberar espaco — apenas os dois botoes de navegacao sao exibidos, um a cada extremidade do footer.

---

### Bloco 11: Estados da Pagina

**Racional**: Phase 6 tem quatro estados distintos conforme o ciclo de vida do roteiro. Cada estado deve ser comunicado claramente ao viajante sem ambiguidade sobre o que esta acontecendo e o que o sistema espera dele.

#### 11.1 Estado Vazio (Roteiro Nao Gerado)

- [ ] AC-P6-064: Dado `NEXT_PUBLIC_DESIGN_V2=true` e nenhum roteiro gerado para a expedicao, quando Phase 6 renderiza, entao a coluna de conteudo exibe um estado vazio centralizado com: icone representativo de roteiro/mapa; titulo "Seu roteiro esta esperando por voce" ou equivalente motivacional; descricao breve do que a IA vai gerar; botao primario "Gerar Roteiro (80 PA)" no estilo `AtlasButton` primario.

- [ ] AC-P6-065: Dado `NEXT_PUBLIC_DESIGN_V2=true` e estado vazio, quando o botao "Gerar Roteiro (80 PA)" e renderizado, entao ele exibe claramente o custo de 80 PA — o usuario nao deve ser surpreendido pelo debito de PA. O custo e parte integral do texto do botao, nao um tooltip ou nota de rodape.

- [ ] AC-P6-066: Dado `NEXT_PUBLIC_DESIGN_V2=true` e estado vazio, quando o usuario clica em "Gerar Roteiro (80 PA)", entao o sistema verifica o saldo de PA antes de exibir a confirmacao: (a) se saldo >= 80 PA, exibe modal de confirmacao; (b) se saldo < 80 PA, exibe modal de saldo insuficiente com opcao de comprar PA.

#### 11.2 Estado de Carregamento / Streaming

- [ ] AC-P6-067: Dado `NEXT_PUBLIC_DESIGN_V2=true` e a geracao do roteiro esta em andamento via streaming, entao o estado de carregamento usa skeletons correspondentes ao layout real: seletor de pills com pills skeleton, header de dia skeleton, e cards de atividade skeleton (mesmo aspect-ratio dos cards reais). NAO e exibida uma tela em branco ou um spinner centralizado isolado.

- [ ] AC-P6-068: Dado que o streaming esta em andamento, quando o primeiro bloco de conteudo e recebido (Dia 1), entao ele e renderizado imediatamente — o usuario ve conteudo real enquanto o restante ainda e gerado. A transicao de skeleton para conteudo real ocorre suavemente por dia, nao em um dump global.

- [ ] AC-P6-069: Dado que o streaming esta em andamento, quando o usuario tenta selecionar um pill de dia que ainda nao foi gerado, entao o sistema exibe uma mensagem inline no espaco da timeline — "Aguardando geracao do Dia [N]..." — sem crash, sem erro vermelho, sem bloqueio da interface.

- [ ] AC-P6-070: Dado que o streaming esta em andamento, quando o usuario tenta clicar em "Regenerar Roteiro", entao o botao esta desabilitado (nao interativo) e exibe um estado visual de "Em andamento" — a geracao nao pode ser reiniciada enquanto uma geracao atual esta em curso.

#### 11.3 Estado Gerado (Conteudo Disponivel)

- [ ] AC-P6-071: Dado `NEXT_PUBLIC_DESIGN_V2=true` e o roteiro foi gerado com sucesso, quando o usuario retorna a Phase 6 em uma sessao subsequente, entao o roteiro e exibido imediatamente do cache/banco sem necessidade de nova geracao — o conteudo persiste entre sessoes.

#### 11.4 Estado de Erro

- [ ] AC-P6-072: Dado `NEXT_PUBLIC_DESIGN_V2=true` e a geracao do roteiro falha (timeout, erro de API, PA insuficiente descoberto apos inicio), entao o sistema exibe uma mensagem de erro clara com: descricao do problema em linguagem de usuario (sem stack trace ou mensagem tecnica); botao "Tentar novamente" que reinicia o processo de confirmacao (nao debita PA novamente automaticamente); os 80 PA debitados previamente devem ser estornados se a geracao falhou antes de produzir conteudo.

- [ ] AC-P6-073: Dado `NEXT_PUBLIC_DESIGN_V2=true` e estado de erro, quando o usuario clica em "Tentar novamente", entao o sistema exibe novamente a modal de confirmacao de custo — o usuario deve confirmar conscientemente uma nova tentativa antes de um novo debito de PA.

---

### Bloco 12: Personalizacao do Roteiro

**Racional**: O Atlas coleta dados de perfil detalhados ao longo das Fases 1-5 (destino, datas, passageiros, preferencias, restricoes alimentares, acessibilidade). O roteiro gerado deve refletir esses dados — nao e aceitavel gerar um roteiro generico ignorando o perfil do usuario.

- [ ] AC-P6-074: Dado um usuario `@leisure-family` com criancas registradas na Phase 2, quando o roteiro e gerado, entao as atividades sugeridas devem incluir opcoes adequadas para criancas (parques, museus interativos, restaurantes family-friendly) e evitar atividades marcadamente adultas (vida noturna, bares). Validacao: o roteiro gerado deve ser revisado pelo QA em pelo menos um caso de teste com passageiros incluindo criancas.

- [ ] AC-P6-075: Dado um usuario com preferencias de `meal_budget: budget` na Phase 2, quando o roteiro e gerado, entao as sugestoes de gastronomia devem priorizar opcoes de custo acessivel — o custo estimado exibido nos cards de gastronomia deve ser coerente com o budget selecionado pelo usuario. Validacao: o QA verifica que os custos estimados sao internamente consistentes com o perfil.

- [ ] AC-P6-076: Dado um usuario com restricoes de acessibilidade (`wheelchair` ou `reduced_mobility`) na Phase 2, quando o roteiro e gerado, entao atividades que exigem caminhada prolongada, escadas ou terreno irregular NAO devem ser incluidas sem avisos de acessibilidade — idealmente substituidas por alternativas acessiveis. Esta e uma restricao de seguranca do usuario, nao apenas de personalizacao.

- [ ] AC-P6-077: Dado um usuario com `travel_pace: relaxed` nas preferencias, quando o roteiro e gerado, entao o numero de atividades por dia deve ser menor (tipicamente 3-4 atividades por dia, com pausas marcadas) comparado a um usuario com `travel_pace: intense` (5-7 atividades). Validacao: QA compara dois roteiros gerados com perfis opostos para o mesmo destino e datas.

- [ ] AC-P6-078: Dado um usuario @business-traveler (Premium tier) com acesso ao Claude Sonnet, quando o roteiro e gerado, entao a qualidade e especificidade do roteiro deve refletir o modelo de IA premium — maior detalhamento de enderecos, horarios de funcionamento, reservas recomendadas, dicas praticas. Esta AC e verificada qualitativamente pelo PO em revisao de sprint.

---

### Bloco 13: Acessibilidade

**Racional**: A Phase 6 e uma das paginas mais densas do produto. A estrutura semantica e a navegabilidade por teclado e leitores de tela sao obrigatorias, nao opcionais. Viajantes com deficiencia visual ou motora devem poder usar o roteiro tanto quanto qualquer outro usuario.

- [ ] AC-P6-079: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 6 e auditada com axe-core em WCAG 2.1 AA, entao zero violacoes automaticas sao reportadas. A auditoria deve ser executada com o roteiro em estado gerado (conteudo real, nao skeleton).

- [ ] AC-P6-080: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario navega pela Phase 6 usando apenas teclado (Tab / Shift+Tab / setas / Enter / Space), entao: o seletor de pills e navegavel com as teclas de seta esquerda/direita; cada card de atividade e focavel via Tab; o botao "Regenerar Roteiro" e ativavel via Enter/Space; os botoes do footer sao acessiveis via Tab; os controles do mapa sao acessiveis via Tab. A ordem de focus e logica e segue o fluxo visual.

- [ ] AC-P6-081: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando a estrutura semantica da timeline e auditada, entao: cada grupo de atividades de um dia e delimitado por um elemento `<section>` com atributo `aria-label` contendo o tema do dia; o header H2 "Dia N — Tema" e o primeiro elemento filho da section; cada card de atividade e um `<article>` ou `<li>` com atributo `aria-label` contendo o nome da atividade; a hierarquia de headings e H1 > H2 (dia) > H3 (nome da atividade).

- [ ] AC-P6-082: Dado qualquer card de atividade, quando renderizado, entao o contraste entre o texto de horario e o fundo do card atende ao minimo de 4.5:1 para texto normal conforme WCAG 2.1 AA — verificar especialmente: `atlas-tertiary` (#266861) sobre `atlas-surface-container-lowest` (#ffffff), que deve atingir >= 5.5:1; `atlas-primary-container` (#fe932c) sobre `atlas-surface-container-lowest` (#ffffff), que deve atingir >= 4.5:1. Se algum par falhar, o UX Designer deve especificar uma alternativa aprovada.

- [ ] AC-P6-083: Dado `prefers-reduced-motion: reduce` no sistema operacional do usuario, quando Phase 6 carrega e o roteiro e gerado via streaming, entao nenhuma animacao, transicao CSS ou efeito de fade-in e executada — o conteudo aparece instantaneamente. O `animate-pulse` do badge de PA e suprimido.

- [ ] AC-P6-084: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando um screen reader atravessa a timeline de um dia, entao o conteudo e lido em ordem logica: header do dia (H2) → para cada atividade: horario, nome da atividade (H3), localizacao/descricao, duracao, custo estimado, dica de IA (se presente) → card de resumo do dia (metricas na ordem: atividades, duracao, custo).

- [ ] AC-P6-085: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando a modal de confirmacao de regeneracao de roteiro esta aberta, entao: o focus e capturado dentro da modal (focus trap); o primeiro elemento focavel dentro da modal recebe focus automaticamente ao abrir; ao fechar (confirmacao ou cancelamento), o focus retorna ao botao "Regenerar Roteiro" que ativou a modal; a modal tem `role="dialog"` e `aria-modal="true"`.

---

### Bloco 14: Regressao V1 e Feature Flag

**Racional**: Toda mudanca V2 esta protegida pelo feature flag `NEXT_PUBLIC_DESIGN_V2`. Com a flag desativada, Phase 6 deve se comportar identicamente ao estado pre-Sprint-40. Esta garantia permite rollback imediato se necessario e protege usuarios em producao durante o desenvolvimento.

- [ ] AC-P6-086: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando Phase 6 renderiza, entao zero mudancas visuais sao observadas em relacao ao estado V1 pre-Sprint-40 — validado via comparacao com Playwright screenshot baseline estabelecido antes do inicio do Sprint 40.

- [ ] AC-P6-087: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando o streaming de geracao de roteiro ocorre, entao o comportamento de streaming e identico ao V1 — mesmo componente, mesma logica, sem regressao funcional.

- [ ] AC-P6-088: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando o usuario navega por Phase 6 (seletor de dias, visualizacao de atividades, navegacao pelo footer), entao todos os fluxos funcionais operam sem erros — a coexistencia dos dois caminhos de codigo (V1 e V2) nao introduz conflito.

- [ ] AC-P6-089: Dado `NEXT_PUBLIC_DESIGN_V2=true` em ambiente de desenvolvimento local, quando o desenvolvedor alterna a flag para `false` e recarrega a pagina, entao Phase 6 exibe imediatamente o V1 sem necessidade de rebuild ou reinicio do servidor.

---

### Bloco 15: Performance

**Racional**: Phase 6 e a fase mais pesada do produto: ela combina conteudo AI-gerado extenso, mapa interativo, e multiplos cards renderizados. O streaming e a estrategia central para nao bloquear o usuario — ele deve ver conteudo enquanto o resto carrega.

- [ ] AC-P6-090: Dado `NEXT_PUBLIC_DESIGN_V2=true` e roteiro ja gerado (conteudo em cache/banco), quando o usuario navega para Phase 6, entao o primeiro conteudo significativo (First Contentful Paint) e exibido em <= 2 segundos em uma conexao 4G simulada (10 Mbps).

- [ ] AC-P6-091: Dado `NEXT_PUBLIC_DESIGN_V2=true` e o streaming esta em andamento, quando o primeiro bloco de conteudo do Dia 1 chega, entao ele e renderizado em <= 500ms apos o recebimento — a arquitetura de streaming dos Sprints 18-19 deve ser preservada sem adicao de latencia pela camada V2.

- [ ] AC-P6-092: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario alterna entre dias no seletor de pills, entao a timeline atualiza em <= 100ms (dado que o conteudo esta em memoria) — a troca de dia e uma operacao puramente de UI state, sem chamada de rede adicional.

- [ ] AC-P6-093: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o mapa e inicializado, entao ele nao bloqueia o render da coluna de conteudo — o mapa carrega de forma assíncrona e a coluna de conteudo esquerda e exibida independentemente do estado de carregamento do mapa.

---

## 4. Escopo

### Dentro do Escopo

- Layout split 60/40 em desktop; single-column em mobile
- Sticky map panel em desktop scroll
- Seletor de dias em pills com estado ativo/inativo e scroll horizontal
- Header de dia com tema gerado por IA e borda lateral colorida
- Timeline vertical com nos coloridos por categoria, linha de conexao e cards estruturados
- Sistema de categorias: logistica, cultura, gastronomia (natureza e vida_noturna: BLOQUEADAS ate aprovacao UX)
- Dica contextual de IA dentro dos cards (campo opcional)
- Card de resumo do dia (metricas: atividades, duracao, custo)
- Mapa com marcadores visuais por categoria, label glass-morphism, controles de zoom
- Interacao click-marcador -> destacar card na timeline
- Auto-zoom do mapa para caber todos os marcadores do dia
- Footer WizardFooter com Voltar / indicador de progresso / Ver Sumario
- Quatro estados da pagina: vazio (com botao de gerar), streaming (skeleton + progressive render), gerado, erro
- Personalizacao do conteudo gerado baseada em perfil (familia, budget, acessibilidade, ritmo)
- WCAG 2.1 AA compliance completa
- Feature flag `NEXT_PUBLIC_DESIGN_V2` protegendo todo o V2
- Regressao zero no V1 com flag desativada

### Fora do Escopo (v1 desta spec)

- Exportacao do roteiro para PDF — SPEC-PROD-014, deferred desde Sprint 29
- Link compartilhavel do roteiro — SPEC-PROD-014, deferred desde Sprint 29
- Edicao manual de atividades do roteiro — sem UI de edicao no prototipo atual; deferred
- Adicao / remocao de atividades pelo usuario — deferred
- Reordenacao de atividades por drag-and-drop — deferred
- Rotas entre marcadores no mapa (linhas de conexao entre pinos) — Could Have, deferred para Sprint 41
- Dark mode — Won't Have Sprint 40
- Animacoes de scroll reveal — Won't Have Sprint 40
- Logica de prompt de geracao de roteiro — escopo do prompt-engineer (SPEC-AI correspondente)
- Alteracoes na integracao Mapbox GL JS (camadas, estilos de tile, geocoding) — escopo SPEC-ARCH
- Categorias `natureza` e `vida_noturna` — BLOQUEADAS ate aprovacao UX Designer (tokens de cor)

---

## 5. Restricoes (Obrigatorias)

### Seguranca

- O roteiro gerado por IA e especifico ao usuario — deve ser buscado com filtro `userId` verificado contra a sessao autenticada. O `tripId` da URL nunca e o unico filtro (prevencao de BOLA/IDOR, conforme SPEC-PROD-053).
- Conteudo AI-gerado nao deve ser armazenado em caches compartilhados de servidor de forma que possa vazar dados de um usuario para outro.
- Os 80 PA debitados antes da geracao devem ser estornados automaticamente em caso de falha da geracao — sem debito sem entrega.
- A modal de confirmacao de PA nao deve ser bypassavel via manipulacao de requests — a verificacao de saldo e debito deve ocorrer server-side.

### Acessibilidade

- WCAG 2.1 AA minimo em todos os componentes V2.
- Estrutura semantica de timeline: `<section>` por dia, `<h2>` acessivel, `<article>` ou `<li>` por atividade.
- Focus trap em modais (confirmacao de PA, saldo insuficiente).
- `prefers-reduced-motion`: zero animacoes quando ativado.
- Todos os pares de cor texto/fundo devem atingir contraste >= 4.5:1 (texto normal) ou >= 3:1 (texto grande >= 18pt).
- `atlas-primary-container` (#fe932c) sobre fundo branco (`atlas-surface-container-lowest`) deve ser verificado — se o par falhar 4.5:1 para texto pequeno, o UX Designer deve especificar alternativa antes da implementacao.

### Performance

- Streaming preservado: a arquitetura de streaming dos Sprints 18-19 nao deve ser alterada pela camada V2 — apenas a camada de renderizacao.
- FCP em roteiro ja gerado: <= 2s em conexao 4G simulada.
- Troca de dia (pills): <= 100ms (operacao de UI state puro, sem chamada de rede).
- Mapa carrega de forma assincrona e nao bloqueia render da coluna de conteudo.

### Limites Arquiteturais

- Esta spec e tecnologia-agnóstica: define O QUE a fase faz, nao COMO e codificada.
- Nao deve alterar a arvore de componentes V1 ou quebrar testes existentes para V1.
- Usar apenas tokens `atlas-*` nos caminhos de codigo V2 — proibido usar classes Tailwind de paleta generica (`orange-*`, `teal-*`, `green-*`) em componentes V2.
- A integracao com Mapbox GL JS existente e preservada — apenas a aparencia visual dos marcadores e alterada.
- Nao introduzir novas chamadas de IA nesta spec — apenas camada visual.

---

## 6. Metricas de Sucesso

- Zero regressoes V1: todos os testes E2E existentes de Phase 6 passam com `NEXT_PUBLIC_DESIGN_V2=false`.
- axe-core: zero violacoes AA em Phase 6 V2 com roteiro gerado (estado real, nao skeleton).
- UX Designer aprova fidelidade visual contra prototipo Stitch em viewport 1280px antes do merge (ver Secao 9).
- Cobertura de testes >= 80% em todos os novos arquivos de componentes V2.
- Qualitativo: revisao interna de usabilidade valida o "momento wow" da Phase 6 antes do fechamento do sprint — ao menos 3 membros da equipe revisam o roteiro gerado no V2 e confirmam que a experiencia e superior ao V1.
- Performance: FCP <= 2s medido com Lighthouse em roteiro ja gerado.
- Personalizacao: QA executa ao menos 2 cenarios de teste com perfis distintos (familia com criancas vs. solo com preferencias de gastronomia) e confirma que os roteiros gerados refletem os perfis.

---

## 7. Dependencias

- **SPEC-PROD-053** (ACs AC-13 a AC-18): parent spec — esta spec complementa, nao substitui. Os ACs do parent permanecem vigentes.
- **SPEC-PROD-051** (Phase Shell V2 + Auth Nav V2): dependencia hard — o shell deve estar aprovado e implementado antes da integracao da Phase 6 V2.
- **SPEC-PROD-046** (Design System Foundation, Sprint 38): COMPLETE — tokens e componentes base disponiveis.
- **SPEC-PROD-047** (Component Library v1, Sprint 38): COMPLETE — `AtlasButton`, `AtlasCard`, `AtlasChip`, `AtlasBadge`, `AtlasPhaseProgress` disponiveis.
- **SPEC-PHASE6-REDESIGN-BRIEF** (`docs/specs/sprint-40/SPEC-PHASE6-REDESIGN-BRIEF.md`): este documento expande o brief — o brief e incorporado por referencia.
- **`docs/design/stitch-exports/phase6_roteiro_detalhado/code.html`**: autoridade visual definitiva para Phase 6. Em caso de conflito entre esta spec e o prototipo, o prototipo prevalece.
- **`docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md`**: fonte de verdade para tokens de design atomicos.
- **`docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md`**: custo de 80 PA para geracao/regeneracao de roteiro (AC-P6-019, AC-P6-065).
- **Infraestrutura de streaming de IA (Sprints 18-19)**: preservada e nao alterada por esta spec.
- **Integracao Mapbox GL JS (existente)**: preservada — apenas aparencia visual dos marcadores e alterada.

---

## 8. Independencia de Fornecedor

Esta spec descreve O QUE a Phase 6 faz e como ela se apresenta ao usuario, nao COMO e implementada. Nao faz referencia a bibliotecas, frameworks ou produtos especificos de fornecedor. Decisoes de implementacao (componentes React, hooks de estado, integracao com Mapbox API) pertencem ao SPEC-ARCH correspondente e aos desenvolvedores responsaveis.

---

## 9. Gate de Aprovacao do UX Designer

Antes do merge de qualquer codigo V2 de Phase 6, o UX Designer DEVE validar e aprovar os seguintes itens documentando a aprovacao em um comentario no PR:

1. Fidelidade do layout split 60/40 contra o prototipo Stitch em viewport 1280px — colunas com proporcoes corretas, sem overflow.
2. Fidelidade do header de navegacao — breadcrumb, badge de PA, avatar.
3. Fidelidade do stepper de fases — tamanhos de circulo, cores por estado, linhas conectoras, labels.
4. Fidelidade do seletor de dias — pills ativo/inativo, dimensoes, scroll horizontal, derivacao de datas.
5. Fidelidade dos cards de atividade por categoria — nos, bordas laterais, chips, horarios — para logistica, cultura e gastronomia.
6. Definicao e aprovacao dos tokens visuais para as categorias `natureza` e `vida_noturna` (ACs P6-044 e P6-045 estao BLOQUEADOS ate esta aprovacao).
7. Verificacao de contraste do par `atlas-primary-container` (#fe932c) sobre branco — confirmacao ou alternativa.
8. Fidelidade do card de resumo do dia — icone, metricas, tipografia.
9. Fidelidade dos controles e marcadores do mapa — glass-morphism, icones, cores.
10. Fidelidade do footer WizardFooter — tres elementos, cores, hover states.
11. Comportamento responsive em viewport 375px — ausencia do mapa, single-column, touch targets.
12. Comportamento responsive em viewport 768px — mapa abaixo do conteudo (tablet portrait).

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-26 | product-owner | Spec inicial — expansao completa do SPEC-PHASE6-REDESIGN-BRIEF com 93 ACs detalhados em 15 blocos tematicos: layout, header, stepper, acoes, pills, timeline, categorias, resumo do dia, mapa, footer, estados, personalizacao, acessibilidade, regressao e performance |
