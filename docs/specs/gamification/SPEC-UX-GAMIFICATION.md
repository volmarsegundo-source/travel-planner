# SPEC-UX-041: Sistema de Gamificacao — Pontos Atlas (PA) — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: (gamification PA system)
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 0. Contexto e Principio Norteador

O sistema de Pontos Atlas (PA) e a moeda virtual do Atlas. Usuarios ganham PA ao completar fases, preencher perfil e fazer login diario. Gastam PA em features de IA (checklist, guia, roteiro). Podem comprar pacotes de PA.

**Principio UX #1: TRANSPARENCIA**
O viajante deve compreender o sistema PA em menos de 60 segundos. Nenhum custo oculto, nenhuma surpresa, nenhuma manipulacao. O usuario sempre sabe quanto tem, quanto vai gastar e como ganhar mais.

**Dados do sistema (fonte: `gamification.types.ts` + `phase-config.ts`)**:

| Categoria | Detalhes |
|---|---|
| Bonus de boas-vindas | 500 PA |
| Login diario | 10 PA/dia |
| Completar checklist | 20 PA |
| Review de viagem | 500 PA |
| Indicacao (referral) | 300 PA |
| Perfil (11 campos) | 25 PA/campo (max 275 PA) |
| Fases 1-8 rewards | 100, 150, 75, 50, 40, 250, 400, 500 PA (total 1.565/expedicao) |
| Custo IA: Roteiro (Phase 6) | 150 PA |
| Custo IA: Rota | 100 PA |
| Custo IA: Acomodacao | 100 PA |
| Custo IA: Regenerar | 80 PA |
| Custo IA total/expedicao | ~350 PA (Phases 3+4+5) |
| Ranks | Viajante, Explorador, Navegador, Cartografo, Desbravador, Embaixador |
| Badges | 9 tipos (first_step, navigator, host, logistics_master, cartographer, treasurer, pathfinder, ambassador, identity_explorer) |

---

## 1. Objetivo do Viajante

Compreender o sistema de Pontos Atlas — como ganhar, como gastar, quanto custa cada feature de IA — e sentir-se motivado e no controle, nunca frustrado ou surpreendido por custos inesperados.

## 2. Personas Afetadas

| Persona | Como esta feature os serve |
|---|---|
| `@leisure-solo` | Gamificacao cria senso de progressao pessoal; transparencia de custos reduz ansiedade de gasto |
| `@leisure-family` | Clareza sobre PA permite planejar uso de IA sem surpresas; tutorial simples para usuarios menos tecnicos |
| `@business-traveler` | Tabela de custos direta, sem rodeios; historico de transacoes para controle financeiro |
| `@bleisure` | Entende que pode ganhar PA completando fases e gastar em features de IA para a parte lazer |
| `@group-organizer` | Clareza de quanto custa gerar roteiro para grupo; predictive cost ajuda no planejamento |

---

## 3. Fluxos de Usuario

### 3.1 Fluxo Principal: Primeiro Contato com PA

```
[Usuario completa registro]
    |
    v
[Onboarding Modal — Step 1/3]
"Bem-vindo ao Atlas! Voce ganhou 500 PA de presente."
    |
    v
[Onboarding Modal — Step 2/3]
"Use PA para gerar roteiros, guias e checklists com IA."
[Exibe mini-tabela de custos]
    |
    v
[Onboarding Modal — Step 3/3]
"Complete fases e ganhe mais PA!"
[Exibe exemplos de ganhos]
    |
    v
[CTA: "Entendi" | Skip: "Pular"]
    |
    v
[Dashboard — usuario ve saldo no header]
```

### 3.2 Fluxo: Gasto de PA em Feature de IA

```
[Usuario esta na Phase 5 — Guia do Destino]
    |
    v
[Antes do botao "Gerar", exibe cost indicator]
"Gerar guia custa 150 PA. Voce tem 420 PA."
    |
    v
[Usuario clica "Gerar guia"]
    |
    v
[Modal de Confirmacao de Gasto]
"Gerar Guia do Destino custara 150 PA."
"Saldo atual: 420 PA"
"Saldo apos: 270 PA"
[Botoes: "Gerar" (primary) | "Cancelar" (secondary)]
    |
    +-- [Saldo suficiente] --> [IA processa] --> [Conteudo gerado + toast sucesso]
    |
    +-- [Saldo insuficiente] --> [Fluxo de Saldo Insuficiente (3.3)]
```

### 3.3 Fluxo: Saldo Insuficiente

```
[Usuario tenta gerar feature de IA]
    |
    v
[Sistema detecta saldo < custo]
    |
    v
[Modal Empatico — NAO punitivo]
"Voce nao tem PA suficientes para esta acao."
"Custo: 150 PA | Seu saldo: 80 PA | Faltam: 70 PA"
    |
    +-- CTA Primario: "Comprar PA" --> [Pagina de compra]
    |
    +-- CTA Secundario: "Ganhar PA completando fases" --> [Link para proxima fase pendente]
    |
    +-- Texto informativo: "Voce tambem ganha 10 PA por login diario"
    |
    v
[Modal fecha. Usuario continua usando o app normalmente]
[NUNCA bloqueia uso do app — apenas features de IA requerem PA]
```

### 3.4 Fluxo: Level-Up (Subida de Rank)

```
[Usuario completa fase que concede rank promotion]
    |
    v
[PointsAnimation existente exibe pontos ganhos]
    |
    v
[Toast de Level-Up aparece]
"Parabens! Voce subiu para Explorador!"
[Badge animado + confetti (respeita prefers-reduced-motion)]
[Auto-dismiss: 5 segundos]
    |
    v
[Header atualiza com novo rank]
[Rank badge pulsa 600ms (se motion permitido)]
```

### 3.5 Fluxo: Consulta de Historico

```
[Usuario acessa "Meu Atlas"]
    |
    v
[Secao "Historico de Transacoes"]
    |
    v
[Lista cronologica com filtros]
[Filtros: Todos | Ganhos | Gastos | Compras]
    |
    v
[Cada item mostra: data, descricao, valor (+/-), saldo resultante]
```

---

## 4. Especificacoes de Tela

### 4.1 Pagina "Como Funciona" (`/como-funciona`)

**Proposito**: Explicar o sistema PA em linguagem simples, com hierarquia visual clara, em menos de 60 segundos de leitura.

**Layout**:
- Hero compacto: titulo "Como funcionam os Pontos Atlas" + subtitulo de 1 linha
- 3 secoes horizontais (cards em desktop, empilhados em mobile): Ganhe PA, Use PA, Compre PA
- Tabela de custos de IA
- FAQ com perguntas expansiveis

**Conteudo — Secao "Ganhe PA"**:
- Icone: moeda/estrela dourada
- Titulo: "Ganhe Pontos Atlas"
- Lista de formas de ganho com icone + valor:
  - "Complete fases da expedicao" — 40 a 500 PA por fase
  - "Preencha seu perfil" — 25 PA por campo (ate 275 PA)
  - "Faca login diariamente" — 10 PA/dia
  - "Indique amigos" — 300 PA por indicacao
  - "Escreva reviews" — 500 PA por review
- Destaque: "Ao se cadastrar, voce ganha 500 PA de presente!"

**Conteudo — Secao "Use PA"**:
- Icone: varinha/sparkle
- Titulo: "Use PA em Features de IA"
- Tabela visual de custos:

| Feature de IA | Custo | Fase |
|---|---|---|
| Gerar checklist de viagem | 100 PA | Fase 3 |
| Gerar recomendacoes de logistica | 100 PA | Fase 4 |
| Gerar guia do destino | 150 PA | Fase 5 |
| Regenerar qualquer conteudo | 80 PA | Qualquer |

- Nota: "Uma expedicao completa usa aproximadamente 350 PA em IA"
- Nota: "Completar a mesma expedicao rende 1.565 PA — voce sempre ganha mais do que gasta"

**Conteudo — Secao "Compre PA"**:
- Icone: sacola/carteira
- Titulo: "Compre Pacotes de PA"
- Texto: "Quer acelerar? Compre pacotes de PA a qualquer momento."
- Nota: pacotes e precos definidos pelo PO (placeholder aqui)
- CTA: "Ver pacotes disponiveis"

**Conteudo — FAQ**:
- "PA expiram?" — "Nao. Seus Pontos Atlas nunca expiram."
- "Posso usar o app sem PA?" — "Sim! Todas as funcoes manuais sao gratuitas. PA so sao necessarios para gerar conteudo com IA."
- "Quanto PA ganho por expedicao?" — "Ate 1.565 PA completando todas as 8 fases."
- "Posso transferir PA?" — "Nao. PA sao pessoais e intransferiveis."
- "Onde vejo meu saldo?" — "Seu saldo aparece no topo de cada pagina, ao lado do seu rank."

**Estados**:
- Loading: skeleton de 3 cards + skeleton de tabela
- Erro: banner "Nao foi possivel carregar esta pagina. Tente novamente." + botao retry
- Pagina e publica (acessivel sem login)

**Responsividade**:

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Cards empilhados verticalmente, tabela de custos com scroll horizontal, FAQ accordion |
| Tablet (768-1024px) | 3 cards em linha, tabela normal, FAQ accordion |
| Desktop (> 1024px) | 3 cards em linha com max-width 1200px centralizado, tabela full-width dentro do container, FAQ accordion |

---

### 4.2 Tooltips Contextuais nos Pontos de Gasto de IA

**Proposito**: Antes de cada botao "Gerar" nas fases 3, 5 e 6, informar o custo exato e o saldo atual.

**Layout**:
- Inline, imediatamente acima ou ao lado do botao "Gerar"
- Compacto: icone de info (circulo com "i") + texto em 1 linha
- Texto: "Gerar [nome] custa X PA. Voce tem Y PA."
- Se Y < X: texto em cor warning (#F59E0B), com adicao: "Saldo insuficiente"
- Se Y >= X: texto em cor muted (#5C6B7A)

**Interacao**:
- Icone de info: hover/focus revela tooltip com detalhes expandidos
- Tooltip conteudo: "Apos gerar, seu saldo sera Y-X PA. Voce tambem pode regenerar por 80 PA."
- Tooltip fecha: ao mover mouse/desfocalizar, apos 300ms delay (evita flicker)
- Mobile: tap no icone abre tooltip, tap fora fecha

**Acessibilidade do tooltip**:
- Icone: `role="button"`, `aria-label="Informacoes sobre custo de PA"`, `aria-expanded`
- Tooltip: `role="tooltip"`, `id` vinculado via `aria-describedby` no icone
- Conteudo do tooltip acessivel por teclado (Tab para focar, Escape para fechar)
- Touch target do icone: minimo 44x44px

---

### 4.3 Indicador Preditivo de Custo no Card de Expedicao

**Proposito**: Na tela de listagem de expedicoes, antes de entrar, mostrar o custo estimado total de PA para features de IA ainda nao geradas.

**Layout**:
- Subtexto no card de expedicao, abaixo do progress bar
- Texto: "~X PA para features de IA restantes"
- Icone: sparkle pequeno (reutiliza AiBadge pattern)
- Cor: muted (#5C6B7A) — informativo, nao alarmante

**Calculo**:
- Soma os `aiCost` das fases que o usuario AINDA NAO completou
- Se todas as fases com custo de IA ja foram completadas: nao exibir (ou "IA concluida")
- Exemplo: usuario completou fases 1-3 (custo IA de fase 3 ja pago). Fases 4 (100 PA) e 5 (150 PA) pendentes. Exibe: "~250 PA para features de IA restantes"

**Edge cases**:
- Nova expedicao (nenhuma fase completa): "~350 PA para features de IA"
- Expedicao completa: nao exibir indicador
- Saldo insuficiente para o total: adicionar nota sutil "(voce tem Y PA)"

---

### 4.4 Historico de Transacoes em "Meu Atlas"

**Proposito**: Lista completa de todas as transacoes de PA — ganhos, gastos e compras — para total transparencia.

**Layout**:
- Secao dentro da pagina /atlas, abaixo do mapa e badges
- Titulo: "Historico de Pontos Atlas"
- Filtros: chips selecionaveis "Todos", "Ganhos", "Gastos", "Compras"
- Chip ativo: fundo primary (#E8621A), texto branco
- Chip inativo: fundo subtle (#EEF2F7), texto secondary (#5C6B7A)

**Cada item da lista**:

```
+----------------------------------------------------------+
| [icone tipo] Completou Fase 2 — O Explorador    +150 PA  |
| 18 mar 2026                          Saldo: 1.250 PA     |
+----------------------------------------------------------+
| [icone tipo] Gerou Guia do Destino               -150 PA |
| 17 mar 2026                          Saldo: 1.100 PA     |
+----------------------------------------------------------+
```

- Ganhos: valor em verde (#2DB8A0), prefixo "+"
- Gastos: valor em cor text-secondary (#5C6B7A), prefixo "-" (NAO vermelho — gasto e normal, nao erro)
- Compras: valor em verde (#2DB8A0), prefixo "+", icone de sacola

**Paginacao**: 20 itens por pagina, botao "Carregar mais" (nao paginacao numerada)

**Empty state**: "Nenhuma transacao ainda. Complete fases para ganhar Pontos Atlas!"

**Loading state**: skeleton de 5 linhas com animacao pulse

**Erro**: banner inline "Nao foi possivel carregar o historico. Tente novamente." + botao retry

**Responsividade**:

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Lista vertical full-width, icone + descricao em cima, valor + data embaixo |
| Tablet (768-1024px) | Lista com 2 colunas (descricao | valor+data) |
| Desktop (> 1024px) | Tabela com 4 colunas (data | descricao | valor | saldo) |

---

### 4.5 Fluxo de Saldo Insuficiente

**Proposito**: Comunicar de forma empatica que o usuario nao tem PA suficientes, sem punir ou culpar, e oferecer caminhos claros para resolver.

**Layout — Modal**:
- Overlay com fundo escuro semi-transparente (rgba(0,0,0,0.5))
- Card centralizado, max-width 480px
- Icone: moeda com seta para baixo (nao X vermelho, nao erro)
- Titulo: "PA insuficientes para esta acao"
- Corpo:
  - Linha 1: "Custo: X PA"
  - Linha 2: "Seu saldo: Y PA"
  - Linha 3: "Faltam: X-Y PA" (em bold, cor warning #F59E0B)
- Separador visual
- CTAs:
  - Primario: "Comprar PA" — navega para pagina/modal de compra
  - Secundario: "Ganhar PA completando fases" — navega para dashboard com foco na proxima fase
- Texto informativo abaixo dos botoes: "Voce tambem ganha 10 PA por login diario e 25 PA por campo do perfil preenchido."

**Tom**: informativo, encorajador. NUNCA usar vermelho no titulo ou no icone principal. O usuario nao cometeu um erro — ele simplesmente precisa de mais PA.

**Acessibilidade**:
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (titulo), `aria-describedby` (corpo)
- Focus trap dentro do modal
- Escape fecha e retorna foco ao botao que disparou
- Todos os botoes: min 44x44px touch target

---

### 4.6 Tutorial Onboarding (Modal 3 Steps)

**Proposito**: Apresentar o sistema PA ao novo usuario de forma rapida, visual e nao-intrusiva.

**Disparador**: Primeira vez que o usuario acessa o dashboard apos registro. Mostrado UMA vez. Flag `onboardingPASeen` no perfil do usuario.

**Layout — Modal com Steps**:
- Overlay suave (rgba(0,0,0,0.4))
- Card centralizado, max-width 520px
- Dot indicator (3 pontos) no rodape do card
- Botao "Pular" (link discreto) no canto superior direito

**Step 1: "Bem-vindo ao Atlas!"**
- Ilustracao: moeda dourada com brilho (inline SVG, nao externo)
- Titulo: "Bem-vindo ao Atlas!"
- Subtitulo: "Voce ganhou 500 Pontos Atlas de presente para comecar sua jornada."
- Exibe saldo: "500 PA" em destaque (fonte grande, cor dourada)
- CTA: "Proximo" (primary)

**Step 2: "Use PA em Features de IA"**
- Ilustracao: varinha com sparkles
- Titulo: "Crie conteudo com Inteligencia Artificial"
- Mini-tabela simplificada:
  - Checklist: 100 PA
  - Guia: 150 PA
  - Roteiro: 150 PA
  - Regenerar: 80 PA
- Texto: "Uma expedicao completa usa ~350 PA em IA"
- CTA: "Proximo" (primary)

**Step 3: "Ganhe mais PA!"**
- Ilustracao: grafico subindo com estrelas
- Titulo: "Complete fases e ganhe mais PA!"
- Lista simplificada:
  - "Complete fases" — ate 500 PA cada
  - "Preencha seu perfil" — 25 PA por campo
  - "Login diario" — 10 PA/dia
- Texto: "Voce sempre ganha mais do que gasta completando expedicoes."
- CTA: "Entendi" (primary, fecha modal)

**Transicoes entre steps**:
- Slide horizontal (200ms ease-out)
- Reduced motion: fade simples (150ms)
- Back: botao "Anterior" (ghost) aparece nos steps 2 e 3

**Acessibilidade**:
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-label="Tutorial de Pontos Atlas"`
- Focus trap
- Dot indicators: `role="tablist"` com `role="tab"` + `aria-selected`
- "Pular": `aria-label="Pular tutorial"`
- Cada step: conteudo em `aria-live="polite"` para anunciar mudanca

---

### 4.7 Saldo de PA no Header

**Proposito**: Manter o usuario sempre ciente do seu saldo e rank.

**Estado atual**: GamificationBadge existe como `<div>` display-only com `role="status"` (ref: SPEC-UX-027).

**Evolucao proposta**: Ao clicar no badge (desktop), abrir dropdown compacto com:
- Saldo: "420 PA" (fonte grande, dourada)
- Rank: badge com emoji + nome do rank
- Mini progress bar para proximo rank
- Link: "Historico de transacoes" -> secao no /atlas
- Link: "Comprar PA" -> pagina/modal de compra
- Link: "Como funciona?" -> /como-funciona

**Nota**: Isso reverte parcialmente a decisao de SPEC-UX-027 que tornou o badge nao-interativo. A justificativa e que o badge agora serve como ponto de acesso rapido ao sistema de PA, nao como duplicacao de navegacao para /atlas. O dropdown contem informacoes unicas (saldo detalhado, links de PA) que nao existem em nenhum outro lugar da navegacao.

**Desktop (>= 768px)**:
- Badge no header: estrela + "420 PA" + "Explorador"
- Clique: abre dropdown abaixo do badge
- Dropdown: card com saldo, rank, progress bar, 3 links
- Fecha: click fora, Escape, navegacao

**Mobile (< 768px)**:
- Badge compacto: estrela + "420 PA"
- Tap: abre card expandido (mesmo conteudo do dropdown desktop)
- Fecha: tap fora, scroll, Escape

**Acessibilidade (atualizada)**:
- Badge muda de `role="status"` para `role="button"` com `aria-haspopup="true"` e `aria-expanded`
- `aria-label="420 pontos Atlas, nivel Explorador. Clique para detalhes."`
- Dropdown: `role="menu"` com `role="menuitem"` nos links
- Focus trap NO (menu, nao dialog) — fecha ao Tab sair
- Min touch target: 44x44px

---

### 4.8 Toast de Level-Up

**Proposito**: Celebrar a subida de rank com feedback visual marcante mas nao intrusivo.

**Layout**:
- Toast posicionado no topo central da tela (nao canto — e uma celebracao)
- Largura: max-width 400px
- Fundo: gradiente sutil usando cor do rank (cada rank tem cor tematica)
- Icone do rank (emoji grande, 32px)
- Titulo: "Parabens!"
- Subtitulo: "Voce subiu para [Nome do Rank]!"
- Efeito confetti: particulas douradas caindo (canvas overlay, duration 1200ms)
- Auto-dismiss: 5 segundos com barra de progresso visual

**Motion tokens**:

| Animacao | Duracao | Easing | Reduced Motion |
|---|---|---|---|
| Toast entrada | 300ms | ease-out (slide-down) | Instant appear |
| Confetti | 1200ms | linear | Static badge glow (200ms) |
| Toast saida | 200ms | ease-in (fade-out) | Instant disappear |
| Barra progresso | 5000ms | linear | Nao exibida (dismiss por timeout) |

**Acessibilidade**:
- `role="alert"`, `aria-live="assertive"` (evento importante)
- Screen readers: anunciam "Parabens! Voce subiu para Explorador!" imediatamente
- Confetti: `aria-hidden="true"` (decorativo)
- Barra de progresso: `aria-hidden="true"` (decorativa)
- Botao fechar (X): disponivel para dismiss manual, min 44x44px

---

### 4.9 Grid de Badges em "Meu Atlas"

**Proposito**: Exibir todos os badges existentes, destacando os conquistados e motivando a conquista dos pendentes.

**Layout**:
- Secao em /atlas, acima do historico de transacoes
- Titulo: "Suas Conquistas"
- Grid de cards: 3 colunas (desktop), 2 colunas (tablet), 2 colunas (mobile)
- Cada card: 1 badge

**Badge Card — Desbloqueado**:
- Fundo: branco com borda sutil
- Icone/emoji do badge: 48px, colorido
- Nome do badge: texto bold
- Data de conquista: texto muted "Conquistado em 15 mar 2026"
- Hover: sombra elevada (shadow-md)
- Click: abre modal de detalhes

**Badge Card — Bloqueado**:
- Fundo: cinza sutil (#EEF2F7)
- Icone: silhueta cinza com icone de cadeado pequeno sobreposto
- Nome do badge: texto muted
- Texto: "Complete [descricao] para desbloquear"
- Sem hover effect (nao interativo)
- Opacity: 0.6

**Badge Card — Em Progresso** (se aplicavel):
- Fundo: branco com borda accent sutil
- Icone: parcialmente colorido (ou com progress ring ao redor)
- Barra de progresso abaixo do icone: "3/8 fases completas"
- Texto: "Continue para desbloquear!"

**Modal de Detalhes do Badge (desbloqueado)**:
- Icone grande (64px)
- Nome do badge
- Descricao: o que significa
- Data de conquista
- Botao: "Fechar"
- `role="dialog"`, focus trap, Escape fecha

**Empty state** (nenhum badge): "Nenhuma conquista ainda. Complete sua primeira fase para ganhar seu primeiro badge!"

**Responsividade**:

| Breakpoint | Grid |
|---|---|
| Mobile (< 768px) | 2 colunas, cards compactos (icone menor 36px) |
| Tablet (768-1024px) | 3 colunas |
| Desktop (> 1024px) | 4 colunas, max-width 1200px |

---

### 4.10 Modal de Confirmacao de Gasto de IA

**Proposito**: Antes de cada geracao de IA, confirmar o custo e mostrar impacto no saldo. Evitar gastos acidentais.

**Disparador**: Usuario clica em qualquer botao "Gerar" que consome PA.

**Layout — Modal**:
- Overlay semi-transparente
- Card centralizado, max-width 420px
- Icone: sparkle (IA)
- Titulo: "Gerar [Nome da Feature]?"
- Corpo:
  - "Esta acao custara **X PA**."
  - "Saldo atual: **Y PA**"
  - "Saldo apos: **Y-X PA**" (em bold)
- Se Y-X < 100: nota adicional em warning: "Atencao: seu saldo ficara baixo apos esta acao."
- Botoes:
  - Primario: "Gerar" (confirma e inicia geracao)
  - Secundario: "Cancelar" (fecha modal, nenhum gasto)
- Se saldo insuficiente: redireciona automaticamente para o fluxo de saldo insuficiente (4.5) em vez de mostrar este modal

**Protecao contra double-click**:
- Apos clique em "Gerar", botao muda para "Gerando..." com spinner
- Botao desabilitado durante processamento
- "Cancelar" tambem desabilitado durante processamento

**Acessibilidade**:
- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- Focus trap
- Escape = Cancelar (fecha sem gastar)
- Focus inicial no botao "Cancelar" (padrao seguro — evita confirmacao acidental por Enter)

---

### 4.11 Dashboard Administrativo (`/admin/gamification`) — Owner-Only

**Proposito**: Visibilidade da economia de PA para o administrador do sistema.

**Acesso**: Somente usuarios com role "admin". Rota protegida por middleware.

**Layout**:
- Header: "Economia de Pontos Atlas"
- Periodo selecionavel: Ultimos 7 dias | 30 dias | 90 dias | Personalizado
- 4 stat cards no topo:
  1. "PA em circulacao": total de PA disponiveis em todas as contas
  2. "PA gastos (periodo)": total gasto no periodo selecionado
  3. "PA comprados (periodo)": total comprado no periodo
  4. "Receita (periodo)": valor monetario de PA vendidos

- Grafico de linha: PA gastos vs PA ganhos ao longo do tempo
- Tabela: distribuicao de usuarios por tier/rank
- Tabela: top 10 features de IA por gasto de PA

**Nota**: Esta tela e funcional, nao precisa ser "bonita". Prioridade e clareza de dados.

**Responsividade**: Desktop-only (admin tools nao precisam de mobile). Em mobile, exibir aviso: "Acesse pelo desktop para melhor experiencia."

---

## 5. Padroes de Interacao

### Transicoes entre telas
- Navegacao para /como-funciona: transicao padrao do Next.js (sem animacao custom)
- Abertura de modais (confirmacao, insuficiente, badge): fade-in overlay 200ms + scale card 200ms ease-out
- Reduced motion: instant appear/disappear

### Feedback de sucesso apos gasto de PA
- Toast: "Guia gerado com sucesso! -150 PA" (auto-dismiss 4s)
- Header badge atualiza saldo imediatamente

### Feedback de ganho de PA
- Toast: "+100 PA — Fase 1 concluida!" (auto-dismiss 4s, cor accent)
- Header badge atualiza saldo com counter animation (400ms)
- Se level-up: toast de celebracao substitui (4.8)

### Progressive disclosure
- /como-funciona: FAQ fechado por padrao, expande ao clicar
- Badge details: click para expandir
- Tooltips de custo: hover/tap para detalhes

---

## 6. Requisitos de Acessibilidade (OBRIGATORIO)

**Nivel WCAG**: AA (minimo, nao-negociavel)

### Navegacao por Teclado
- [x] Todos os elementos interativos alcancaveis por Tab
- [x] Tab order segue ordem logica de leitura
- [x] Focus indicator visivel em todos os elementos (minimo 2px solid)
- [x] Sem keyboard traps (exceto focus trap em modais)
- [x] Modais capturam foco ate serem fechados
- [x] Escape fecha overlays e retorna foco ao trigger
- [x] FAQ items em /como-funciona: ativaveis por Enter/Space

### Leitor de Tela
- [x] Tooltips de custo vinculados via `aria-describedby`
- [x] Modais com `aria-labelledby` e `aria-describedby`
- [x] Transacoes no historico: cada item tem contexto completo ("Completou Fase 2, ganhou 150 PA, saldo resultante 1.250 PA")
- [x] Badges bloqueados: `aria-label` inclui "Badge bloqueado: [nome]. [como desbloquear]"
- [x] Badges desbloqueados: `aria-label` inclui "Badge [nome], conquistado em [data]"
- [x] Confetti e barra de progresso do toast: `aria-hidden="true"`
- [x] Valores de PA: lidos como numero completo ("420 pontos atlas", nao "4 2 0 P A")
- [x] Live regions (`aria-live="polite"`) para atualizacoes de saldo no header
- [x] Level-up toast: `aria-live="assertive"` (evento importante)

### Cor e Contraste
- [x] Texto: contraste >= 4.5:1 em todos os contextos
- [x] Valores positivos (verde #2DB8A0 em fundo branco): 3.5:1 — usar bold + icone "+" para compensar (nao depender so da cor)
- [x] Valores negativos: texto secondary (#5C6B7A), nao vermelho
- [x] Warning (#F59E0B em fundo branco): 3.3:1 para texto normal — usar bold + icone para garantir informacao sem depender so da cor
- [x] Badges bloqueados vs desbloqueados: diferenciados por opacidade + icone de cadeado, nao so por cor

### Motion
- [x] Todas as animacoes respeitam `prefers-reduced-motion`
- [x] Confetti: desativado com reduced motion (substituto: glow estatico)
- [x] Counter animation: instant com reduced motion
- [x] Toast slide: instant com reduced motion

### Touch
- [x] Todos os botoes e links: minimo 44x44px
- [x] Chips de filtro no historico: minimo 44px altura, spacing 8px entre chips
- [x] Icone de info nos tooltips: area de toque 44x44px (mesmo que icone visual seja menor)
- [x] Badge cards no grid: minimo 44px altura area de toque

---

## 7. Conteudo e Copy

### Labels e CTAs Principais

| Chave | PT-BR | EN |
|---|---|---|
| `pa.howItWorks.title` | Como funcionam os Pontos Atlas | How Atlas Points Work |
| `pa.howItWorks.earn` | Ganhe Pontos Atlas | Earn Atlas Points |
| `pa.howItWorks.spend` | Use PA em Features de IA | Spend PA on AI Features |
| `pa.howItWorks.buy` | Compre Pacotes de PA | Buy PA Packages |
| `pa.tooltip.cost` | Gerar {feature} custa {cost} PA. Voce tem {balance} PA. | Generating {feature} costs {cost} PA. You have {balance} PA. |
| `pa.tooltip.insufficient` | Saldo insuficiente | Insufficient balance |
| `pa.confirm.title` | Gerar {feature}? | Generate {feature}? |
| `pa.confirm.cost` | Esta acao custara {cost} PA. | This action will cost {cost} PA. |
| `pa.confirm.balance` | Saldo atual: {balance} PA | Current balance: {balance} PA |
| `pa.confirm.after` | Saldo apos: {after} PA | Balance after: {after} PA |
| `pa.confirm.cta` | Gerar | Generate |
| `pa.confirm.cancel` | Cancelar | Cancel |
| `pa.insufficient.title` | PA insuficientes para esta acao | Not enough PA for this action |
| `pa.insufficient.need` | Custo: {cost} PA | Cost: {cost} PA |
| `pa.insufficient.have` | Seu saldo: {balance} PA | Your balance: {balance} PA |
| `pa.insufficient.missing` | Faltam: {missing} PA | Missing: {missing} PA |
| `pa.insufficient.buy` | Comprar PA | Buy PA |
| `pa.insufficient.earn` | Ganhar PA completando fases | Earn PA by completing phases |
| `pa.levelUp.title` | Parabens! | Congratulations! |
| `pa.levelUp.message` | Voce subiu para {rank}! | You've reached {rank}! |
| `pa.history.title` | Historico de Pontos Atlas | Atlas Points History |
| `pa.history.all` | Todos | All |
| `pa.history.earned` | Ganhos | Earned |
| `pa.history.spent` | Gastos | Spent |
| `pa.history.purchased` | Compras | Purchased |
| `pa.history.empty` | Nenhuma transacao ainda. Complete fases para ganhar Pontos Atlas! | No transactions yet. Complete phases to earn Atlas Points! |
| `pa.badges.title` | Suas Conquistas | Your Achievements |
| `pa.badges.locked` | Complete {requirement} para desbloquear | Complete {requirement} to unlock |
| `pa.badges.earnedOn` | Conquistado em {date} | Earned on {date} |
| `pa.onboarding.step1.title` | Bem-vindo ao Atlas! | Welcome to Atlas! |
| `pa.onboarding.step1.body` | Voce ganhou 500 Pontos Atlas de presente para comecar sua jornada. | You've received 500 Atlas Points as a welcome gift to start your journey. |
| `pa.onboarding.step2.title` | Crie conteudo com Inteligencia Artificial | Create content with Artificial Intelligence |
| `pa.onboarding.step3.title` | Complete fases e ganhe mais PA! | Complete phases and earn more PA! |
| `pa.onboarding.skip` | Pular | Skip |
| `pa.onboarding.understood` | Entendi | Got it |
| `pa.onboarding.next` | Proximo | Next |
| `pa.onboarding.previous` | Anterior | Previous |
| `pa.predictive.remaining` | ~{cost} PA para features de IA restantes | ~{cost} PA for remaining AI features |
| `pa.predictive.done` | IA concluida | AI completed |
| `pa.card.lowBalance` | Atencao: seu saldo ficara baixo apos esta acao. | Note: your balance will be low after this action. |
| `pa.header.details` | Clique para detalhes | Click for details |
| `pa.header.history` | Historico de transacoes | Transaction history |
| `pa.header.buy` | Comprar PA | Buy PA |
| `pa.header.howItWorks` | Como funciona? | How does it work? |

### Mensagens de Erro

| Cenario | PT-BR | EN |
|---|---|---|
| Falha ao carregar saldo | Nao foi possivel carregar seu saldo. Tente novamente. | Could not load your balance. Please try again. |
| Falha ao gerar IA | Algo deu errado ao gerar o conteudo. Nenhum PA foi descontado. Tente novamente. | Something went wrong generating content. No PA was charged. Please try again. |
| Falha ao carregar historico | Nao foi possivel carregar o historico. Tente novamente. | Could not load history. Please try again. |
| Falha na compra | A compra nao foi concluida. Nenhuma cobranca foi realizada. Tente novamente. | Purchase was not completed. No charge was made. Please try again. |

### Tom de Voz
- Celebratorio nos ganhos. Nunca punitivo nos gastos.
- Gastos sao normais e esperados — nao tratar como evento negativo.
- Saldo insuficiente e uma orientacao, nao um bloqueio. Sempre oferecer caminho.
- Numeros formatados com separador de milhar do locale (1.250 em PT, 1,250 em EN).
- "PA" e a abreviacao oficial. Em contextos onde cabe, usar "Pontos Atlas" completo.

---

## 8. Restricoes

- O sistema de PA ja existe no backend (`PointsEngine`, `PhaseEngine`, `gamification.types.ts`)
- Os custos e valores de ganho sao definidos em `gamification.types.ts` e `phase-config.ts` — nao hardcodar na UI, consumir das constantes
- GamificationBadge ja existe como `<div>` display-only (SPEC-UX-027) — esta spec propoe reativa-lo como botao com dropdown
- O onboarding modal precisa de um campo `onboardingPASeen: boolean` no modelo de usuario (ou localStorage para MVP)
- /como-funciona deve ser pagina publica (SEO, acessivel antes do login)
- A pagina admin requer role="admin" — middleware de protecao ja existe para /admin/*
- Compra de PA: fluxo de pagamento nao definido nesta spec (dependencia de PO/Architect para gateway de pagamento)
- Predictive cost: requer calculo server-side baseado em fases completadas da expedicao

---

## 9. Prototipo

- [ ] Prototipo requerido: Sim (apos aprovacao do spec)
- **Location**: `docs/prototypes/gamification-pa-system.html`
- **Scope**: /como-funciona (3 secoes + FAQ), modal de confirmacao, modal de insuficiente, onboarding 3 steps, badge grid, header dropdown
- **Status**: Adiado para apos aprovacao do spec pelo PO e Architect

---

## 10. Questoes em Aberto

- [ ] **Pacotes de compra de PA**: quais pacotes, precos e gateway de pagamento? **Aguarda: product-owner + architect**
- [ ] **Reativacao do GamificationBadge**: SPEC-UX-027 tornou o badge display-only. Esta spec propoe reativa-lo como botao com dropdown. **Aguarda: product-owner confirmacao**
- [ ] **Flag de onboarding**: usar campo no modelo do usuario (`onboardingPASeen`) ou localStorage? localStorage e mais simples mas nao persiste entre dispositivos. **Aguarda: architect**
- [ ] **Predictive cost na card de expedicao**: exibir o saldo atual ao lado do custo estimado pode criar ansiedade. Exibir so o custo, sem comparacao com saldo? **Aguarda: product-owner**
- [ ] **Admin dashboard**: e prioridade para MVP ou pode ser adiado? **Aguarda: product-owner**
- [ ] **Confetti no level-up**: custo de performance do canvas overlay em dispositivos low-end. CSS confetti (menos particulas) ou canvas? **Aguarda: architect**
- [ ] **Threshold de "saldo baixo"**: definido como < 100 PA. E o valor correto? **Aguarda: product-owner**
- [ ] **Posicao do toast de level-up**: topo central (proposto) ou topo direito (padrao dos outros toasts)? Usar posicao diferente para diferenciar celebracao de feedback normal? **Aguarda: product-owner**

---

## 11. Componentes e Padroes

### Padroes Existentes Reutilizados
- **GamificationBadge** (SPEC-UX-027) — evoluido de display-only para botao com dropdown
- **Toast** (ux-patterns.md) — reutilizado para feedback de ganho/gasto
- **AiBadge** (SPEC-UX-003 area) — reutilizado no indicador preditivo
- **ConfirmDialog** (ux-patterns.md) — base para modal de confirmacao de gasto
- **MiniProgressBar** (SPEC-UX-007) — reutilizado no header dropdown e badge progress

### Novos Padroes Introduzidos

| Padrao | Descricao | Reutilizavel? |
|---|---|---|
| **PATooltip** | Tooltip contextual de custo de PA com saldo inline | Sim — qualquer ponto de gasto de PA |
| **PAConfirmModal** | Modal de confirmacao pre-gasto com saldo antes/depois | Sim — todos os gastos de PA |
| **PAInsufficientModal** | Modal empatico de saldo insuficiente com CTAs de compra/ganho | Sim — qualquer ponto de gasto |
| **OnboardingStepModal** | Modal multi-step com dot indicator, skip e navegacao | Sim — qualquer onboarding futuro |
| **BadgeCard** | Card de badge com estados locked/unlocked/in-progress | Sim — qualquer grid de conquistas |
| **CelebrationToast** | Toast especial com confetti e auto-dismiss longo | Sim — qualquer evento de celebracao |
| **TransactionList** | Lista filtrada de transacoes com paginacao e empty state | Sim — qualquer historico |
| **CostInfoSection** | Secao de 3 cards com icones para explicar um sistema (ganhe/use/compre) | Sim — qualquer pagina informativa |
| **HeaderDropdown** | Dropdown acionado por badge no header com links e info | Sim — qualquer widget de header |

---

## 12. Criterios de Aceite

### Transparencia e Compreensao

- [ ] **AC-01**: A pagina /como-funciona exibe as 3 secoes (Ganhe, Use, Compre) com tabela de custos de IA, e um usuario de teste consegue descrever o sistema PA corretamente em menos de 60 segundos apos ler a pagina.
- [ ] **AC-02**: Antes de cada botao "Gerar" nas fases 3, 4 e 5, o custo em PA e exibido inline junto ao saldo atual do usuario.
- [ ] **AC-03**: A pagina /como-funciona e acessivel sem login (pagina publica).

### Gasto de PA

- [ ] **AC-04**: Todo gasto de PA apresenta modal de confirmacao mostrando custo, saldo atual e saldo apos a operacao. O usuario deve confirmar explicitamente antes de qualquer debito.
- [ ] **AC-05**: O botao "Gerar" no modal de confirmacao exibe estado "Gerando..." com spinner durante processamento e protege contra double-click.
- [ ] **AC-06**: Quando o saldo e insuficiente, o modal de insuficiencia e exibido com custo, saldo, diferenca e dois CTAs (comprar PA, ganhar PA) — sem mensagens punitivas.
- [ ] **AC-07**: Nenhuma funcionalidade do app alem de features de IA e bloqueada por falta de PA.

### Saldo e Historico

- [ ] **AC-08**: O saldo de PA e visivel em todas as paginas autenticadas no header (GamificationBadge).
- [ ] **AC-09**: O historico de transacoes em /atlas exibe data, descricao, valor (+/-) e saldo resultante, com filtros por tipo (ganhos/gastos/compras).
- [ ] **AC-10**: O indicador preditivo de custo na card de expedicao mostra o custo estimado de PA para features de IA restantes, calculado com base nas fases nao-concluidas.

### Onboarding e Celebracao

- [ ] **AC-11**: O tutorial de 3 steps e exibido na primeira visita ao dashboard apos registro, com opcao de pular a qualquer momento. Nao e exibido novamente apos conclusao ou skip.
- [ ] **AC-12**: Ao subir de rank, um toast de celebracao e exibido por 5 segundos com animacao de confetti (que respeita `prefers-reduced-motion`).

### Badges

- [ ] **AC-13**: A grid de badges em /atlas exibe badges desbloqueados (coloridos, com data) e bloqueados (cinza, com icone de cadeado e descricao de como desbloquear).
- [ ] **AC-14**: Clicar em um badge desbloqueado abre modal de detalhes com nome, descricao e data de conquista.

### Acessibilidade

- [ ] **AC-15**: Todos os modais (confirmacao, insuficiente, onboarding, badge) possuem focus trap, sao fechaveis por Escape e retornam foco ao elemento trigger.
- [ ] **AC-16**: Valores de PA sao anunciados corretamente por leitores de tela (ex: "420 pontos Atlas", nao "4 2 0 P A").
- [ ] **AC-17**: Todas as animacoes (confetti, counter, slide, fade) respeitam `prefers-reduced-motion` com alternativas instantaneas ou estaticas.
- [ ] **AC-18**: Nenhuma informacao e transmitida apenas por cor — todos os valores positivos/negativos tem prefixo +/- e/ou icone associado.
- [ ] **AC-19**: Todos os touch targets >= 44x44px em mobile.
- [ ] **AC-20**: Contraste de texto >= 4.5:1 em todos os contextos. Quando a cor nao atinge (ex: green on white, warning on white), informacao redundante por icone/peso de fonte.

### Admin (se priorizado)

- [ ] **AC-21**: O dashboard administrativo em /admin/gamification exibe PA em circulacao, PA gastos, PA comprados e receita no periodo selecionado, acessivel apenas por usuarios admin.

---

> **Spec Status**: Draft
> **Ready for**: Product Owner e Architect (10 questoes em aberto precisam de decisao antes de implementacao)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | ux-designer | Draft inicial — 11 componentes/telas, 21 criterios de aceite, sistema PA completo |
