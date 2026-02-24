# Travel Planner — UX Patterns & Specifications

**Versao**: 1.0.0
**Atualizado em**: 2026-02-23
**Autor**: ux-designer
**Status**: Active

---

## Design Principles

### 1. Reduzir ansiedade em momentos de alta relevancia
Planejar uma viagem e um ato emocional. Cada confirmacao, exibicao de status e acao destrutiva deve ser cristalina. Sem informacoes ocultas, sem ambiguidade, sem fricao desnecessaria. O viajante deve sempre saber onde esta e o que acontecera a seguir.

### 2. Divulgacao progressiva (Progressive Disclosure)
Mostre apenas o que o viajante precisa em cada etapa. O formulario de criacao nao pergunta sobre atividades — so o essencial para comecar. Complexidade adicional aparece so quando o usuario esta pronto.

### 3. Mobile-first sempre
A maioria dos planejamentos de viagem acontece em dispositivos moveis, muitas vezes em aeroportos, hoteis ou transporte. Todo componente e projetado para 375px primeiro, depois escala para telas maiores.

### 4. Linguagem humana, nunca tecnica
Mensagens de erro sao falhas de UX, nao falhas do usuario. "Algo deu errado" e inaceitavel. A mensagem deve explicar o que aconteceu e como resolver, em portugues simples e acolhedor.

### 5. Confianca por padrao
Sinais de confianca sao incorporados ao design: confirmacoes explicitas antes de acoes destrutivas, feedback imediato apos mutacoes, estados de carregamento que respeitam o tempo do usuario.

---

## Design System Tokens

### Cores

```
/* Paleta principal — inspirada em viagens, calida e confiante */
--color-primary:        #E8621A   /* Laranja vibrante — CTA principal, energia, acao */
--color-primary-hover:  #C9511A   /* Laranja escuro — hover/focus em CTAs */
--color-primary-light:  #FFF0E8   /* Laranja palido — backgrounds de destaque */

--color-secondary:      #1A3C5E   /* Azul marinho profundo — confianca, navegacao */
--color-secondary-light:#E8F0F7   /* Azul muito claro — backgrounds secundarios */

--color-accent:         #2DB8A0   /* Verde-azulado — sucesso, confirmacoes, badges ativos */
--color-accent-light:   #E6F7F4   /* Verde-azulado palido — backgrounds de sucesso */

/* Neutros */
--color-text-primary:   #1A1A2E   /* Quase preto — titulos, corpo principal */
--color-text-secondary: #5C6B7A   /* Cinza azulado — legendas, textos auxiliares */
--color-text-muted:     #9BA8B5   /* Cinza claro — placeholders, meta */
--color-text-inverse:   #FFFFFF   /* Branco — texto sobre fundos escuros */

--color-bg-page:        #F7F9FC   /* Cinza muito frio — fundo da pagina */
--color-bg-surface:     #FFFFFF   /* Branco — cards, modais, formularios */
--color-bg-subtle:      #EEF2F7   /* Cinza suave — estados hover, divisores */

/* Feedback semantico */
--color-error:          #D93B2B   /* Vermelho — erros de validacao */
--color-error-bg:       #FDF2F1   /* Vermelho palido — fundo de mensagens de erro */
--color-warning:        #F59E0B   /* Ambar — avisos, limites se aproximando */
--color-warning-bg:     #FFFBEB   /* Ambar palido — fundo de avisos */
--color-success:        #2DB8A0   /* Verde — confirmacoes, acoes concluidas */
--color-success-bg:     #E6F7F4   /* Verde palido — fundo de sucesso */
--color-info:           #3B82F6   /* Azul — informacoes neutras */
--color-info-bg:        #EFF6FF   /* Azul palido — fundo informativo */

/* Status de viagem — cor unica por status */
--color-status-planning:  #F59E0B   /* Ambar — Planejando */
--color-status-active:    #2DB8A0   /* Verde — Ativa */
--color-status-completed: #3B82F6   /* Azul — Concluida */
--color-status-archived:  #9BA8B5   /* Cinza — Arquivada */

/* Cores de capa de viagem (v1 — sem upload de imagem) */
--cover-sunset:    linear-gradient(135deg, #FF6B6B, #FFE66D)
--cover-ocean:     linear-gradient(135deg, #4ECDC4, #2C3E50)
--cover-forest:    linear-gradient(135deg, #56AB2F, #A8E063)
--cover-desert:    linear-gradient(135deg, #F7971E, #FFD200)
--cover-aurora:    linear-gradient(135deg, #8360C3, #2EBF91)
--cover-city:      linear-gradient(135deg, #373B44, #4286F4)
--cover-sakura:    linear-gradient(135deg, #F953C6, #B91D73)
--cover-alpine:    linear-gradient(135deg, #1A3C5E, #2DB8A0)
```

### Tipografia

```
/* Familia tipografica */
--font-family-display: 'Inter', system-ui, -apple-system, sans-serif
--font-family-body:    'Inter', system-ui, -apple-system, sans-serif
--font-family-mono:    'JetBrains Mono', 'Fira Code', monospace

/* Escala tipografica — baseada em modular scale (ratio 1.25) */
--text-xs:    12px / 1.4   /* Legendas, badges, meta */
--text-sm:    14px / 1.5   /* Corpo auxiliar, labels de formulario */
--text-base:  16px / 1.6   /* Corpo principal */
--text-lg:    18px / 1.5   /* Subtitulos, perguntas de formulario */
--text-xl:    20px / 1.4   /* Titulos de secao */
--text-2xl:   24px / 1.3   /* Titulos de pagina (mobile) */
--text-3xl:   30px / 1.2   /* Titulos de pagina (desktop) */
--text-4xl:   36px / 1.1   /* Titulos heros, destaque */

/* Pesos */
--font-weight-normal:    400
--font-weight-medium:    500
--font-weight-semibold:  600
--font-weight-bold:      700
```

### Espacamento

```
/* Escala de 4px */
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
--space-20:  80px
--space-24:  96px
```

### Border Radius

```
--radius-sm:   4px    /* Badges, chips pequenos */
--radius-md:   8px    /* Inputs, botoes */
--radius-lg:   12px   /* Cards */
--radius-xl:   16px   /* Modais, paineis */
--radius-2xl:  24px   /* Cards de viagem (destaque) */
--radius-full: 9999px /* Avatares, pills */
```

### Sombras

```
--shadow-xs:  0 1px 2px rgba(26,60,94,0.06)
--shadow-sm:  0 2px 8px rgba(26,60,94,0.08)
--shadow-md:  0 4px 16px rgba(26,60,94,0.10)
--shadow-lg:  0 8px 32px rgba(26,60,94,0.12)
--shadow-xl:  0 16px 48px rgba(26,60,94,0.16)
```

### Transicoes

```
--transition-fast:    150ms ease
--transition-base:    250ms ease
--transition-slow:    400ms ease
```

---

## Component Library (MVP)

### Componentes de Layout
- `AppShell` — estrutura global: sidebar/nav + main content
- `PageHeader` — titulo da pagina + breadcrumb + acoes primarias
- `Section` — bloco de conteudo com titulo e espacamento padrao
- `EmptyState` — estado vazio com ilustracao, titulo, descricao e CTA

### Componentes de Navegacao
- `TopNav` — navegacao principal mobile (hamburger + logo + avatar)
- `SideNav` — navegacao lateral desktop (links + avatar + logout)
- `Breadcrumb` — trilha de navegacao para paginas aninhadas
- `TabBar` — abas de navegacao dentro de uma pagina (ex: viagem ativa)

### Componentes de Dados
- `TripCard` — card de viagem (capa, titulo, destino, datas, status, acoes)
- `TripGrid` — grid responsivo de TripCards
- `StatusBadge` — badge colorido de status de viagem
- `TripCounter` — contador "X de 20 viagens ativas"
- `DateRange` — exibicao formatada de periodo (partida → retorno)

### Componentes de Formulario
- `FormField` — container de campo: label + input + mensagem de erro
- `TextInput` — input de texto com estados: default, focus, error, disabled
- `Textarea` — textarea com contador de caracteres
- `DatePicker` — seletor de data nativo com validacao customizada
- `CoverPicker` — seletor de cor/gradiente de capa (grid de opcoes)
- `EmojiPicker` — seletor de emoji para capa (v1)
- `CharCounter` — contador de caracteres em tempo real
- `FormActions` — linha de botoes do formulario (cancelar + confirmar)

### Componentes de Feedback
- `Alert` — mensagem inline: info, warning, error, success
- `Toast` — notificacao temporaria no canto da tela
- `ConfirmDialog` — dialogo de confirmacao para acoes destrutivas
- `DeleteConfirmDialog` — variante com campo de digitacao do titulo
- `Skeleton` — placeholder de carregamento por tipo de conteudo
- `LoadingSpinner` — spinner para acoes de curta duracao

### Componentes de Acao
- `Button` — primario, secundario, ghost, destructive; tamanhos sm/md/lg
- `IconButton` — botao somente icone com tooltip e aria-label
- `DropdownMenu` — menu de contexto (acoes de viagem: editar, arquivar, excluir)

---

## UX-001: Criacao e Gestao de Viagens

**UX Spec ID**: UX-001
**Related Story**: US-001
**Author**: ux-designer
**Status**: Approved
**Last Updated**: 2026-02-23

---

### Overview

O fluxo de criacao e gestao de viagens e o ponto de entrada central do produto. Ele resolve a dor imediata do viajante — ter um lugar unico e estruturado para registrar os dados basicos de uma viagem — enquanto prepara o terreno para funcionalidades futuras como itinerario, orcamento e colaboracao.

A experiencia foi projetada para ser completa em menos de 60 segundos no fluxo principal (criar uma viagem), enquanto oferece recursos de gestao (editar, arquivar, excluir) acessiveis de forma contextual, sem poluir a interface principal.

**Personas primarias**: `@leisure-solo`, `@leisure-family`, `@business-traveler`

---

### User Flow Diagram (ASCII)

```
[Usuario nao autenticado acessa /trips]
    │
    ▼
[Redirect → /login?callbackUrl=/trips]
    │
    ▼ (apos login)
    │
[Usuario autenticado acessa /trips]
    │
    ├── Sem viagens ──▶ [Empty State: ilustracao + "Criar minha primeira viagem"]
    │                        │
    │                        ▼
    └── Com viagens ──▶ [Trip Dashboard: grid de cards]
                             │
          ┌──────────────────┼──────────────────────┐
          │                  │                       │
          ▼                  ▼                       ▼
    [Clica "Nova      [Clica em um         [Menu de contexto
     viagem"]          TripCard]            no TripCard]
          │                  │                       │
          ▼                  │            ┌──────────┼──────────┐
    [/trips/new]             │            ▼          ▼          ▼
          │                  │         [Editar]  [Arquivar] [Excluir]
    [Formulario de           │            │          │          │
     criacao]                │            ▼          ▼          ▼
          │                  │      [/trips/[id] [Confirm  [Confirm
    ┌─────┴─────┐            │        /edit]     dialog]   dialog +
    │           │            │            │          │      titulo]
  [Valido]  [Invalido]       │            ▼          ▼          │
    │           │       [/trips/[id]]  [Salva]   [Status=  [deletedAt]
    ▼           │       [Trip Detail]    │        ARCHIVED]      │
  [Cria       [Erros       │          [Toast      [Toast       [Toast
  viagem]     inline]      │         "Salvo!"]  "Arquivado"] "Excluida"]
    │                      │                        │              │
    ▼                      │                   [Redir /trips] [Redir /trips]
  [Redir →                 │
  /trips/[id]]             │
    │                      │
    ▼                      ▼
  [Trip Detail Page ← ─ ─ ─ ┘]
          │
    ┌─────┴─────────────────┐
    │                       │
    ▼                       ▼
  [Botao "Editar"]     [Acoes rapidas:
    │                  Arquivar / Excluir]
    ▼
  [/trips/[id]/edit]
  [Formulario pre-
   preenchido]
    │
  ┌─┴──────┐
  │        │
[Salva]  [Cancela]
  │        │
  ▼        ▼
[Trip    [Trip
Detail]  Detail]

ESTADOS DE ERRO:
- Limite de 20 viagens ─▶ [Alert no topo do formulario /trips/new]
- Campos invalidos ──────▶ [Erros inline em cada campo]
- Data retorno < partida ▶ [Erro no campo data de retorno]
- Sem permissao (403) ───▶ [Pagina de erro 403 com link /trips]
- Viagem nao encontrada ─▶ [Pagina de erro 404 com link /trips]
```

---

### Screen Specifications

---

#### Tela 1: Trip Dashboard (/trips)

**Proposito**: Dar ao viajante uma visao completa de todas as suas viagens, permitindo navegar para qualquer viagem rapidamente ou iniciar o fluxo de criacao.

**Entry points**:
- Navegacao lateral/superior (link "Minhas Viagens")
- Redirect apos login com callbackUrl=/trips
- Redirect apos criacao de viagem bem-sucedida (revalidatePath)
- Redirect apos arquivamento ou exclusao de viagem

**Hierarquia de conteudo (populated state)**:
1. PageHeader: "Minhas viagens" + contador "X de 20 viagens ativas" + botao "Nova viagem"
2. Filtros de status: tabs Todas / Planejando / Ativas / Concluidas / Arquivadas
3. Grid de TripCards (2 colunas tablet, 3 colunas desktop, 1 coluna mobile)
4. Paginacao (se > 20 viagens)

**Componentes usados**:
- `PageHeader` com `TripCounter` e `Button` primario "Nova viagem"
- `TabBar` para filtro por status
- `TripGrid` com `TripCard`
- `Skeleton` durante carregamento (3 cards em grid)
- `Pagination` se > 20 registros

**TripCard — conteudo e estados**:
```
┌─────────────────────────────────────────┐
│ [CAPA — gradiente + emoji, altura 120px]│
│                              [... menu] │
│─────────────────────────────────────────│
│ [StatusBadge: Planejando]               │
│ Viagem para Lisboa            [titulo]  │
│ Portugal                      [destino] │
│ 15 mai — 28 mai 2026          [periodo] │
└─────────────────────────────────────────┘
```

Estados do TripCard:
- **Default**: sombra shadow-sm, capa com gradiente
- **Hover**: sombra shadow-md, leve translate-y(-2px), cursor pointer
- **Capa sem datas**: exibe "Datas em aberto" com icone de calendario
- **Menu de contexto (...)**: aparece no hover/focus, contem: Editar, Arquivar/Desarquivar, Excluir
- **Status archived**: opacidade 0.7, badge "Arquivada" em cinza, removido da aba padrao

**Empty state (sem viagens)**:
- Ilustracao SVG: aviao sobre mapa estilizado (cores da paleta, nao fotografica)
- Titulo: "Sua proxima aventura comeca aqui"
- Descricao: "Crie sua primeira viagem e comece a organizar tudo em um so lugar — destino, datas e muito mais."
- CTA primario: botao "Criar minha primeira viagem" (icone + texto)
- Tom: entusiasmante, nao tecnico, nao culpabilizante

**Loading state**:
- 3 SkeletonCards em grid com animacao de pulse
- PageHeader sem skeleton — titulo aparece imediatamente (Server Component)

**Contador de viagens ativas**:
- Exibido ao lado do titulo: "12 de 20 viagens ativas"
- Quando >= 18/20: cor warning (#F59E0B), tooltip "Voce esta se aproximando do limite"
- Quando 20/20: cor error (#D93B2B), texto "Limite atingido — arquive ou exclua uma viagem para criar novas"
- O botao "Nova viagem" e desabilitado com aria-disabled="true" quando limite = 20

**Acessibilidade**:
- Heading h1: "Minhas viagens" (aria-level="1")
- TripCard tem role="article" e aria-label="Viagem para Lisboa, Portugal, 15 a 28 de maio de 2026, status Planejando"
- Botao de menu "..." tem aria-label="Opcoes para Viagem para Lisboa" e aria-haspopup="menu"
- Grid tem role="list" e cada card tem role="listitem"
- Focus visible em todos os elementos interativos
- Tab order: header actions → filtros → cards (esquerda para direita, cima para baixo) → paginacao

---

#### Tela 2: Criar Viagem (/trips/new)

**Proposito**: Coletar as informacoes essenciais de uma nova viagem de forma rapida e sem atrito. O usuario deve conseguir preencher o formulario em menos de 60 segundos no fluxo padrao.

**Entry points**:
- Botao "Nova viagem" no Dashboard
- CTA do empty state "Criar minha primeira viagem"

**Hierarquia de conteudo**:
1. PageHeader com breadcrumb "Minhas viagens > Nova viagem" + botao Cancelar
2. Preview da capa (atualizado em tempo real enquanto usuario escolhe cor/emoji)
3. Formulario com campos na ordem de relevancia cognitiva
4. Botoes de acao: "Cancelar" (ghost) e "Criar viagem" (primary)

**Campos do formulario**:

**Campo: Nome da viagem**
- Label: "Nome da viagem"
- Placeholder: "Ex: Ferias em Portugal, Congresso anual..."
- Tipo: text input
- Obrigatorio: sim (asterisco + aria-required="true")
- Validacao:
  - Min 3 caracteres: "O nome precisa ter pelo menos 3 caracteres"
  - Max 100 caracteres: "O nome pode ter no maximo 100 caracteres"
  - Em branco: "Por favor, de um nome para sua viagem"
- CharCounter: exibido quando usuario foca no campo, formato "23/100"
- Comportamento: CharCounter aparece suavemente (opacity transition), muda para cor warning em >= 80 chars, cor error em >= 100

**Campo: Destino principal**
- Label: "Destino principal"
- Placeholder: "Ex: Lisboa, Portugal ou Toquio, Japao"
- Tipo: text input (texto livre — sem autocomplete Mapbox no v1)
- Nota inline (abaixo do placeholder): icone info + "Busca inteligente de destinos em breve"
- Obrigatorio: sim
- Validacao:
  - Min 2 caracteres: "Digite pelo menos 2 caracteres para o destino"
  - Max 150 caracteres: "O destino pode ter no maximo 150 caracteres"
  - Em branco: "Por favor, informe o destino da viagem"

**Campo: Data de partida**
- Label: "Data de partida"
- Placeholder: "DD/MM/AAAA"
- Tipo: date input (nativo, com formatacao brasileira via Intl.DateTimeFormat)
- Obrigatorio: sim
- Validacao:
  - Em branco: "Informe a data de partida"
  - Data no passado: "A data de partida nao pode ser no passado"
- Comportamento: ao selecionar data de partida, o campo "Data de retorno" e habilitado e seu minimo e definido como a data de partida

**Campo: Data de retorno**
- Label: "Data de retorno"
- Placeholder: "DD/MM/AAAA"
- Tipo: date input
- Obrigatorio: sim (mas desabilitado ate data de partida ser selecionada)
- Estado desabilitado: fundo sutil, cursor not-allowed, label em cinza claro
- Validacao:
  - Em branco: "Informe a data de retorno"
  - Anterior a partida: "A data de retorno deve ser posterior a data de partida"
  - Igual a partida: permitido (viagem de um dia)

**Campo: Descricao / notas**
- Label: "Descricao (opcional)"
- Placeholder: "Ideias, motivacao, detalhes importantes sobre a viagem..."
- Tipo: textarea, 3 linhas de altura padrao
- Obrigatorio: nao
- Max 500 chars com CharCounter ativo
- Comportamento: auto-expand ate 6 linhas, depois scroll

**Campo: Capa da viagem**
- Label: "Capa da viagem"
- Descricao: "Escolha uma cor e um emoji que representem sua viagem"
- Tipo: grid de 8 opcoes de gradiente (CoverPicker) + grid de emoji sugeridos
- Comportamento: selecao atualiza o preview da capa em tempo real (acima do formulario)
- Padrao: primeira opcao (Sunset) pre-selecionada
- Emoji padrao: aviao (Unicode ✈)
- Opcoes de gradiente: Sunset, Ocean, Forest, Desert, Aurora, City, Sakura, Alpine

**Alert de limite atingido**:
- Exibido no topo do formulario se usuario tiver 20 viagens ativas
- Tipo: Alert error
- Texto: "Limite de viagens atingido. Voce ja tem 20 viagens ativas. Arquive ou exclua uma viagem para poder criar novas."
- Link: "Ver minhas viagens" → /trips
- O botao "Criar viagem" e desabilitado neste estado

**Submit behavior**:
- Validacao client-side inline (React Hook Form + Zod) antes do submit
- Durante submit: botao muda para "Criando..." com spinner, ambos os botoes ficam desabilitados
- Sucesso: redirect para /trips/[id] com toast "Sua viagem foi criada com sucesso!"
- Erro de servidor: Alert no topo "Nao foi possivel criar a viagem. Tente novamente em alguns instantes." (botoes re-habilitados)

**Loading state da pagina**:
- Formulario aparece completo (Server Component renderiza o HTML)
- Nenhum skeleton necessario — pagina e simples e rapida

**Acessibilidade**:
- Cada input tem label associado via htmlFor/id
- Erros vinculados via aria-describedby ao campo correspondente
- role="alert" nas mensagens de erro para anuncio imediato em leitores de tela
- aria-required="true" em campos obrigatorios
- aria-invalid="true" em campos com erro
- aria-live="polite" no CharCounter
- Tab order: Nome → Destino → Data partida → Data retorno → Descricao → CoverPicker → Emoji → Cancelar → Criar viagem
- Focus move para o primeiro campo com erro apos submit mal-sucedido

---

#### Tela 3: Detalhe da Viagem (/trips/[id])

**Proposito**: Exibir todas as informacoes de uma viagem e ser o ponto de entrada para acoes de gestao (editar, arquivar, excluir) e, em versoes futuras, o construtor de itinerario.

**Entry points**:
- Clique em TripCard no dashboard
- Redirect apos criacao de nova viagem
- Redirect apos edicao bem-sucedida

**Hierarquia de conteudo**:
1. Hero da viagem: capa (gradiente + emoji, 240px desktop / 180px mobile), sobreposicao com titulo e badge de status
2. Breadcrumb: "Minhas viagens > [nome da viagem]"
3. Info header: destino, periodo, dias restantes ou dias da viagem
4. Acoes rapidas: "Editar viagem" + menu "..." (Arquivar / Excluir)
5. Placeholder do construtor de itinerario (US-002): "Em breve: construa o roteiro dia a dia"
6. Secao de notas/descricao (se preenchida)

**Trip Hero**:
- Background: gradiente escolhido pelo usuario
- Emoji centralizado, tamanho 64px (desktop) / 48px (mobile)
- Titulo da viagem: text-3xl, font-bold, branco, texto-sombra leve para legibilidade
- StatusBadge sobreposto: canto superior direito do hero
- Overlay gradient sutil na parte inferior para garantir legibilidade do titulo

**Info Header (abaixo do hero)**:
- Destino com icone de localizacao
- Periodo: "15 mai — 28 mai 2026" ou "Datas em aberto" se sem datas
- Contagem: "em X dias" (futuro) / "X dias de viagem" (ativa) / "ha X dias" (passada)
- Duracao: "14 dias" calculada automaticamente

**Acoes**:
- Botao primario "Editar viagem" (sempre visivel, icone lapiz)
- IconButton "..." com DropdownMenu: "Arquivar viagem" e "Excluir viagem"
- Acoes destrutivas em vermelho no dropdown

**Placeholder US-002**:
- Card com fundo sutil (--color-bg-subtle)
- Icone de calendario + texto "Roteiro dia a dia em breve"
- Descricao: "Em breve voce podera construir o itinerario completo da sua viagem — atividades, horarios e mapas."
- Sem CTA falso — nao enganar o usuario sobre funcionalidades nao existentes

**Descricao**:
- Exibida so se preenchida
- Label "Notas" com icone de bloco de notas
- Texto em text-base, cor text-secondary

**Loading state**:
- Hero renderizado pelo servidor (sem skeleton)
- Info header com skeleton de 2 linhas durante hidratacao se necessario

**Error states**:
- Viagem nao encontrada: pagina 404 com mensagem "Esta viagem nao existe ou foi excluida" + botao "Voltar para Minhas Viagens"
- Sem permissao: pagina 403 com mensagem "Voce nao tem acesso a esta viagem" + botao "Voltar para Minhas Viagens"

**Acessibilidade**:
- h1: nome da viagem
- Hero image: role="img" com aria-label="Capa da viagem [Nome]: [descricao do gradiente] com emoji [nome do emoji]"
- Botoes de acao: aria-label descritivo ("Editar viagem para Lisboa", "Opcoes para viagem Lisboa")
- StatusBadge: aria-label="Status: Planejando"

---

#### Tela 4: Editar Viagem (/trips/[id]/edit)

**Proposito**: Permitir que o viajante atualize qualquer campo da viagem existente com o mesmo nivel de clareza e conforto da criacao.

**Abordagem de design**: Pagina dedicada (nao modal) — garante que o usuario nao perca o contexto de formularios longos em mobile, e e mais simples de implementar com Server Actions e redirect.

**Entry points**:
- Botao "Editar viagem" na tela de detalhe
- Link "Editar" no DropdownMenu do TripCard no dashboard

**Hierarquia de conteudo**:
1. PageHeader: breadcrumb "Minhas viagens > [Nome] > Editar" + botao Cancelar
2. Preview da capa (atualizado em tempo real)
3. Formulario identico ao de criacao, pre-preenchido com dados atuais
4. Botoes: "Cancelar" (ghost, volta para /trips/[id]) + "Salvar alteracoes" (primary)

**Diferencias do formulario de criacao**:
- Titulo da pagina: "Editar viagem" (nao "Nova viagem")
- Todos os campos pre-preenchidos com valores atuais
- CoverPicker com opcao atual selecionada
- Botao CTA: "Salvar alteracoes" (nao "Criar viagem")
- Sem alerta de limite (usuario ja possui a viagem)
- Datas no passado: permitidas (viagem ja ocorreu — nao bloquear edicao)

**Submit behavior**:
- Validacao identica ao formulario de criacao
- Durante submit: "Salvando..." com spinner
- Sucesso: redirect para /trips/[id] + toast "Alteracoes salvas com sucesso!"
- Erro: Alert "Nao foi possivel salvar as alteracoes. Tente novamente."

**Acessibilidade**: identica ao formulario de criacao

---

### Dialogs de Confirmacao

#### Dialog: Arquivar Viagem

**Gatilho**: Menu "..." > "Arquivar viagem" (em TripCard ou Trip Detail)
**Tipo**: Confirm Dialog (nao destrutivo — reversivel)

**Conteudo**:
- Icone: caixa com seta (arquivo)
- Titulo: "Arquivar esta viagem?"
- Descricao: "A viagem '[Nome da viagem]' sera movida para Arquivadas e deixara de aparecer na lista principal. Voce pode desarquiva-la a qualquer momento."
- Botoes: "Cancelar" (ghost) + "Arquivar" (secondary, nao destructive)

**Comportamento**:
- Trap focus dentro do dialog
- Fechar com Escape ou "Cancelar"
- Apos confirmar: toast "Viagem arquivada" + revalidatePath

#### Dialog: Excluir Viagem

**Gatilho**: Menu "..." > "Excluir viagem"
**Tipo**: Delete Confirm Dialog (destrutivo — irreversivel)

**Conteudo**:
- Icone: lixeira em vermelho
- Titulo: "Excluir permanentemente?"
- Descricao: "Esta acao nao pode ser desfeita. A viagem '[Nome da viagem]' sera permanentemente excluida, junto com todos os dados associados."
- Campo de confirmacao: input com label "Digite o nome da viagem para confirmar" e placeholder "[Nome da viagem]"
- Botoes: "Cancelar" (ghost) + "Excluir permanentemente" (destructive, desabilitado ate campo correto)
- O botao destructive so e habilitado quando o campo de confirmacao contem exatamente o nome da viagem

**Comportamento**:
- Trap focus dentro do dialog
- Fechar com Escape ou "Cancelar" (nao fechar ao clicar no overlay — risco de excluir acidentalmente)
- Apos confirmar: soft delete (deletedAt) + redirect para /trips + toast "Viagem excluida"

---

### Interaction Patterns

**Feedback de mutacao (otimismo responsavel)**:
- Criacao: redirect imediato apos resposta do servidor (nao otimista — aguarda confirmacao)
- Arquivamento: toast imediato + card desaparece do grid com animacao fade-out
- Exclusao: toast imediato + card desaparece do grid com animacao fade-out
- Edicao: redirect para detalhe + toast de sucesso

**Menu de contexto do TripCard**:
- Abre com clique no botao "..."
- Fecha ao clicar fora ou pressionar Escape
- Items: "Editar" (icone lapiz), "Arquivar" (icone arquivo) / "Desarquivar", divisor, "Excluir" (icone lixeira, cor error)
- Posicionamento: abre para baixo com fallback para cima em cards no final da lista

**Hover states**:
- TripCard: leve elevacao + sombra mais profunda (transition 250ms)
- Botoes: darken primario, bg-subtle em ghost
- Links: underline + cor primary

**Animacoes**:
- Entrada de cards no grid: fade-in + slide-up (stagger 50ms por card, so no carregamento inicial)
- Dialog: fade-in + scale (200ms ease)
- Toast: slide-in da direita, auto-dismiss em 4s com barra de progresso visual
- Card saindo da lista (arquivado/excluido): fade-out + collapse-height (300ms)

---

### Error & Empty States

| Estado | Tela | Conteudo | Acao disponivel |
|---|---|---|---|
| Sem viagens | /trips | Ilustracao + "Sua proxima aventura comeca aqui" | "Criar minha primeira viagem" |
| Limite atingido (20/20) | /trips/new | Alert error no topo do formulario | Link "Ver minhas viagens" |
| Campo em branco | /trips/new, /trips/[id]/edit | Mensagem inline especifica por campo | Foco no campo |
| Data invalida | Formulario | "A data de retorno deve ser posterior a data de partida" | Foco no campo |
| Erro de servidor | Formulario | Alert no topo: "Nao foi possivel criar/salvar. Tente novamente." | Botao novamente |
| Viagem nao encontrada | /trips/[id] | 404 com mensagem e link | "Voltar para Minhas Viagens" |
| Sem permissao | /trips/[id]/edit | 403 com mensagem e link | "Voltar para Minhas Viagens" |
| Sessao expirada | Qualquer pagina auth | Redirect /login com callbackUrl preservada | Login |

---

### Responsive Behavior (Mobile-First)

| Breakpoint | /trips (Dashboard) | /trips/new (Criar) | /trips/[id] (Detalhe) |
|---|---|---|---|
| Mobile (< 640px) | 1 coluna de cards, botao "Nova viagem" fixo no rodape (FAB), filtros em scroll horizontal | Formulario full-width, campos empilhados, CoverPicker em grid 4x2 | Hero 180px, info empilhado verticalmente, acoes em linha |
| Tablet (640–1024px) | 2 colunas de cards, botao no header | Formulario centralizado max-w-lg, campos lado a lado (datas) | Hero 200px, layout de 1 coluna ainda |
| Desktop (> 1024px) | 3 colunas de cards, sidebar de navegacao | Formulario centralizado max-w-xl com preview lateral da capa | Hero 240px, layout 2 colunas (info + placeholder itinerario) |

**FAB (Floating Action Button) no mobile**:
- Presente em /trips quando viewport < 640px
- Posicao: fixed, bottom-6, right-6
- Conteudo: icone "+" + texto "Nova viagem"
- z-index acima do conteudo, abaixo de modais
- Ausente quando limite de 20 viagens atingido (replaced por alert)

---

### Accessibility Checklist (UX-001)

**Navegacao por teclado**:
- [x] Todos os elementos interativos alcancaveis por Tab
- [x] Tab order logico e intuitivo em todos os formularios
- [x] Focus visible com outline 2px na cor primary (nao outline do browser padrao)
- [x] Dialogs capturam e trancam o foco (focus trap)
- [x] Escape fecha dialogs e menus de contexto
- [x] Enter/Space ativam botoes e checkboxes
- [x] Arrow keys navegam entre opcoes do CoverPicker

**Semantica e leitores de tela**:
- [x] h1 unico por pagina, hierarquia correta (h1 > h2 > h3)
- [x] Todos os inputs tem label associado (htmlFor/id)
- [x] Erros vinculados via aria-describedby
- [x] aria-required="true" em campos obrigatorios
- [x] aria-invalid="true" em campos com erro
- [x] aria-live="polite" em contadores de caractere e mensagens dinamicas
- [x] role="alert" em mensagens de erro criticas
- [x] Dialog tem role="dialog", aria-modal="true", aria-labelledby, aria-describedby
- [x] DropdownMenu tem role="menu", items tem role="menuitem"
- [x] StatusBadge comunica status por texto, nao so por cor

**Contraste e cor**:
- [x] Texto sobre fundo: minimo 4.5:1 (WCAG AA)
- [x] Texto grande (>= 18px ou 14px bold): minimo 3:1
- [x] Componentes UI e bordas: minimo 3:1
- [x] Gradientes de capa: overlay garantindo legibilidade do texto sobreposto
- [x] Status badges: texto legivel com contraste adequado em todos os 4 estados
- [x] Erros nao comunicados apenas por cor — acompanhados de icone e texto

**Alvos de toque (Touch targets)**:
- [x] Todos os botoes interativos >= 44x44px em mobile
- [x] Botao "..." do TripCard: 44x44px com area de toque expandida
- [x] Items do CoverPicker: 56x56px (facil de selecionar com polegar)
- [x] Items do dropdown: padding vertical minimo 12px

**Reducao de movimento**:
- [x] Todas as animacoes respeitam prefers-reduced-motion
- [x] Versao sem animacao: mudancas instantaneas de estado

---

> UX-001 Status: Approved
> Prototype: docs/prototypes/feature-001.html
> Ready for Architect
