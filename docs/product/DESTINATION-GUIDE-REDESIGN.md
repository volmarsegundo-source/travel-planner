# Especificacao UX: Transporte & Guia de Destino

**UX Spec ID**: UX-002 / UX-003
**Itens relacionados**: ITEM-13 (Selecao de Transporte), ITEM-14 (Redesign Guia de Destino)
**Autor**: ux-designer
**Status**: Draft
**Ultima atualizacao**: 2026-03-10

---

## Parte 1 — ITEM-13: Selecao de Transporte (Fase 4 "O Abrigo")

### 1. Objetivo do Viajante

Definir como vai chegar ao destino, como vai se locomover localmente e onde vai se hospedar — de forma rapida, visual e sem pressao. O viajante deve poder pular qualquer etapa se ainda nao decidiu.

### 2. Personas Afetadas

| Persona | Necessidade nesta tela |
|---|---|
| `@leisure-solo` | Quer explorar opcoes com calma, sem compromisso. Pode ainda nao ter decidido transporte. |
| `@leisure-family` | Precisa de opcoes familiares (carro alugado, hotel com quarto familia). Multiplas hospedagens. |
| `@business-traveler` | Rapidez: aviao + taxi/Uber + hotel. Quer preencher rapido e seguir. |
| `@bleisure` | Pode ter trecho corporativo (aviao) + extensao pessoal (trem, Airbnb). |
| `@group-organizer` | Precisa coordenar transporte compartilhado. Multiplas hospedagens possiveis. |
| `@travel-agent` | Preenche para clientes; precisa de campos de referencia de reserva e custo. |

### 3. Principio de Design: Nao-Bloqueante

A Fase 4 NAO bloqueia avanco na expedicao. O viajante pode:
- Pular qualquer sub-etapa
- Voltar depois para preencher
- Selecionar "Ainda nao decidi" explicitamente

Isso respeita o comportamento real: muitas pessoas planejam o destino antes de reservar transporte.

---

### 4. Fluxo do Usuario

```
[Viajante acessa Fase 4 "O Abrigo"]
    |
    v
[Sub-etapa 1/3: Transporte Interurbano]
    |
    +-- Seleciona tipo (card) --> [Campos de detalhes expandem]
    |                                |
    |                                +-- Preenche (opcional) --> [Proximo]
    |
    +-- "Ainda nao decidi" --> [Proximo] (salva como indefinido)
    |
    v
[Sub-etapa 2/3: Transporte Local]
    |
    +-- Multi-selecao (chips/cards) --> [Proximo]
    |
    +-- Pula --> [Proximo]
    |
    v
[Sub-etapa 3/3: Hospedagem]
    |
    +-- Seleciona tipo (card) --> [Campos de detalhes expandem]
    |                                |
    |                                +-- "+ Adicionar outra hospedagem" (max 5)
    |
    +-- "Ainda nao decidi" --> [Concluir]
    |
    v
[Fase 4 completa --> Resumo salvo]
    |
    v
[Retorna ao painel da expedicao]
```

**Fluxo de erro**:
- Nenhum campo e obrigatorio — erros de validacao so para formato (ex: data invalida, custo negativo)
- Se o usuario tentar salvar com custo negativo: "O valor estimado precisa ser positivo" (inline no campo)

---

### 5. Especificacao de Telas

#### 5.1 Container Geral: Wizard de Sub-etapas

**Layout**: Barra de progresso com 3 passos no topo (similar ao OnboardingWizard existente)

```
[Progresso: ● Transporte  ○ Locomocao  ○ Hospedagem]
--------------------------------------------------
|                                                  |
|   [Conteudo da sub-etapa atual]                  |
|                                                  |
--------------------------------------------------
[Voltar]                           [Proximo / Concluir]
```

**Progresso**: indicador linear com 3 steps (icones: aviao, mapa-pin, cama). Step ativo em `--color-primary`. Steps completos em `--color-accent`. Steps futuros em cinza.

**Navegacao**: Botoes "Voltar" (ghost) e "Proximo" (primary). Ultimo passo mostra "Concluir".

**Persistencia**: Cada sub-etapa salva automaticamente ao avancar (auto-save). Se o usuario sair e voltar, os dados persistem.

---

#### 5.2 Sub-etapa 1: Transporte Interurbano

**Titulo**: "Como voce vai chegar la?"
**Subtitulo**: "Selecione o transporte principal ate [Destino]" (nome do destino injetado dinamicamente)

**Seletor de tipo — Cards visuais**:

Para viagens INTERNACIONAIS:
```
[Aviao*]  [Navio]  [Ainda nao decidi]
  ✈️        🚢          🤔
```
* Aviao destacado com borda `--color-primary` e badge "Mais comum"

Para viagens DOMESTICAS:
```
[Aviao]  [Onibus]  [Carro]  [Trem]  [Ainda nao decidi]
  ✈️       🚌       🚗      🚂          🤔
```

Para viagens DENTRO DO MESMO ESTADO/REGIAO:
```
[Carro*]  [Onibus]  [Trem]  [Ainda nao decidi]
  🚗       🚌       🚂          🤔
```
* Carro destacado com badge "Mais comum"

**Especificacao do card de transporte**:

```
┌─────────────────┐
│                  │
│   [Emoji 32px]  │
│                  │
│  [Nome: 14px    │
│   semibold]     │
│                  │
│  [Badge se      │
│   aplicavel]    │
│                  │
└─────────────────┘
```

- Tamanho: min 100px x 100px (touch target garantido)
- Estado default: borda 1px cinza, fundo surface
- Estado hover: borda `--color-primary`, sombra `--shadow-sm`
- Estado selecionado: borda 2px `--color-primary`, fundo `--color-primary-light`, checkmark no canto superior direito
- Estado focus: outline 2px `--color-primary`, offset 2px
- role="radiogroup" no container, role="radio" em cada card
- aria-checked="true" no card selecionado

**Campos de detalhe (expandem apos selecao)**:

Quando o viajante seleciona um tipo (exceto "Ainda nao decidi"), uma secao expande suavemente abaixo dos cards:

```
┌──────────────────────────────────────────────┐
│ Detalhes do voo (ou transporte selecionado)  │
│                                              │
│ [Companhia/Operadora]  [Referencia reserva]  │
│  texto livre            texto livre          │
│                                              │
│ [Data ida]             [Data volta]          │
│  date picker            date picker          │
│                                              │
│ [Custo estimado]                             │
│  R$ ___,__                                   │
│                                              │
│ [Observacoes]                                │
│  textarea 2 linhas                           │
│                                              │
└──────────────────────────────────────────────┘
```

- Labels contextuais: "Companhia aerea" (aviao), "Empresa de onibus" (onibus), "Companhia maritima" (navio), vazio para carro
- Para carro: campos diferentes — "Carro alugado?" (toggle) + se sim: "Locadora" + "CINH necessaria?" (toggle com dica: "Carteira Internacional de Habilitacao — necessaria em alguns paises")
- Todos os campos opcionais — nenhum obrigatorio
- Animacao de expansao: max-height transition 300ms ease, respeitando prefers-reduced-motion
- aria-expanded="true" no card selecionado, aria-controls apontando para o painel de detalhes

**"Ainda nao decidi"**: Selecionar este card limpa qualquer selecao anterior. Nenhum campo de detalhe aparece. Texto reassurante abaixo: "Sem problemas! Voce pode voltar e preencher quando quiser."

---

#### 5.3 Sub-etapa 2: Transporte Local

**Titulo**: "Como voce vai se locomover em [Destino]?"
**Subtitulo**: "Selecione todas as opcoes que pretende usar"

**Seletor — Multi-selecao com chips visuais**:

```
[Metro/Trem]  [Onibus local]  [Taxi/Uber]
    🚇            🚌              🚕

[A pe]        [Bicicleta]     [Carro alugado]
  🚶           🚲               🚗
```

Cada chip tem:
- Emoji (24px) + Nome (14px)
- Descricao curta abaixo em texto muted (12px):
  - Metro/Trem: "Rapido para cobrir longas distancias"
  - Onibus local: "Economico, boa cobertura"
  - Taxi/Uber: "Pratico, porta a porta"
  - A pe: "Ideal para centros historicos"
  - Bicicleta: "Ecologico, otimo para cidades planas"
  - Carro alugado: "Liberdade total de roteiro"

**Especificacao do chip**:
- Tamanho: min 140px x 80px (mobile: full-width em grid 2 colunas)
- Estado default: borda 1px cinza, fundo surface
- Estado selecionado: borda 2px `--color-accent`, fundo `--color-accent-light`, checkmark
- Multi-selecao: o viajante pode selecionar quantos quiser
- role="group" no container com aria-label="Opcoes de transporte local"
- Cada chip: role="checkbox", aria-checked

**Se "Carro alugado" selecionado**: expande secao com campos de locadora (reaproveitando a logica ja existente da Fase 4 atual):
- "Locadora" (texto livre)
- "CINH necessaria?" (toggle)
- "Custo estimado diario" (moeda)

**Estado vazio valido**: O viajante pode pular sem selecionar nada. Nenhum bloqueio.

---

#### 5.4 Sub-etapa 3: Hospedagem

**Titulo**: "Onde voce vai ficar?"
**Subtitulo**: "Voce pode adicionar mais de um local de hospedagem"

**Seletor de tipo — Cards visuais (selecao unica por hospedagem)**:

```
[Hotel]   [Hostel]   [Airbnb/Apartamento]   [Casa de amigos]   [Camping]
  🏨        🛏️          🏠                     👋               ⛺

                    [Ainda nao decidi]
                          🤔
```

**Apos selecao, expande formulario**:

```
┌──────────────────────────────────────────────┐
│ Hospedagem 1: Hotel                    [x]   │
│                                              │
│ [Nome do hotel]                              │
│  texto livre                                 │
│                                              │
│ [Endereco/Localizacao]                       │
│  texto livre                                 │
│                                              │
│ [Check-in]            [Check-out]            │
│  date picker           date picker           │
│                                              │
│ [Custo total estimado]                       │
│  R$ ___,__                                   │
│                                              │
│ [Referencia da reserva]                      │
│  texto livre                                 │
│                                              │
└──────────────────────────────────────────────┘

[+ Adicionar outra hospedagem]
```

**Multiplas hospedagens**:
- Maximo de 5 hospedagens por viagem
- Cada hospedagem e um bloco colapsavel apos preenchido
- Bloco colapsado mostra: "[Tipo] — [Nome] — [Check-in] a [Check-out]"
- Botao de remover (X) em cada bloco com confirmacao inline: "Remover esta hospedagem?"
- Botao "+ Adicionar outra hospedagem" desabilitado ao atingir 5 (aria-disabled + tooltip "Maximo de 5 hospedagens")
- Ao atingir 4: texto informativo "Voce pode adicionar mais 1 hospedagem"

**Labels contextuais por tipo**:
- Hotel: "Nome do hotel"
- Hostel: "Nome do hostel"
- Airbnb/Apartamento: "Nome do anuncio ou endereco"
- Casa de amigos: "Nome do anfitriao" (campo endereco tem label "Regiao/Bairro")
- Camping: "Nome do camping"

**"Ainda nao decidi"**: Comportamento identico ao transporte interurbano — texto reassurante, sem campos.

**"Casa de amigos"**: Nao exibe campo de custo (presume-se gratuito). Exibe campo "Observacoes" no lugar.

---

### 6. Microcopy

#### CTAs
- "Proximo" (avancar sub-etapa)
- "Voltar" (retroceder sub-etapa)
- "Concluir" (finalizar Fase 4)
- "+ Adicionar outra hospedagem"
- "Ainda nao decidi"

#### Mensagens de validacao
- Custo negativo: "O valor estimado precisa ser positivo"
- Data check-out antes de check-in: "O check-out deve ser depois do check-in"
- Data invalida: "Esta data nao parece valida. Verifique o formato."

#### Textos de ajuda
- Apos "Ainda nao decidi": "Sem problemas! Voce pode voltar e preencher quando quiser."
- CINH: "A Carteira Internacional de Habilitacao pode ser exigida em alguns paises. Verifique com o consulado do destino."
- Custo estimado: "Valor aproximado para ajudar no seu orcamento. Nao precisa ser exato."

#### Titulo do resumo (apos concluir)
- Tudo preenchido: "Transporte e hospedagem definidos!"
- Parcialmente: "Informacoes salvas. Voce pode completar depois."
- Nada preenchido: "Fase concluida. Voce pode voltar e preencher quando precisar."

---

### 7. Hierarquia de Componentes

```
TransportWizard (container)
├── WizardProgressBar (3 steps)
├── TransportStep (sub-etapa 1)
│   ├── TransportTypeSelector (radiogroup de cards)
│   │   ├── TransportCard (radio individual)
│   │   └── UndecidedCard
│   └── TransportDetailsPanel (expansivel)
│       ├── FormField (companhia)
│       ├── FormField (referencia)
│       ├── FormField (data ida)
│       ├── FormField (data volta)
│       ├── FormField (custo)
│       ├── FormField (observacoes)
│       └── CarRentalFields (condicional)
│           ├── Toggle (alugado?)
│           ├── FormField (locadora)
│           └── Toggle (CINH)
├── LocalTransportStep (sub-etapa 2)
│   ├── LocalTransportSelector (checkbox group de chips)
│   │   └── TransportChip (checkbox individual)
│   └── CarRentalDetailsPanel (condicional)
├── AccommodationStep (sub-etapa 3)
│   ├── AccommodationTypeSelector (radiogroup de cards)
│   │   ├── AccommodationCard (radio individual)
│   │   └── UndecidedCard
│   ├── AccommodationEntryList (array de entries)
│   │   └── AccommodationEntry (colapsavel)
│   │       ├── FormField (nome)
│   │       ├── FormField (endereco)
│   │       ├── FormField (check-in)
│   │       ├── FormField (check-out)
│   │       ├── FormField (custo)
│   │       └── FormField (referencia)
│   └── AddAccommodationButton (max 5)
└── WizardNavigation (voltar / proximo / concluir)
```

---

### 8. Gestao de Estado

- **Estado local**: React state para selecoes ativas, formularios de detalhe, sub-etapa atual
- **Auto-save**: Ao avancar sub-etapa, dados sao salvos via Server Action
- **Dados persistidos**: Ao voltar a Fase 4, tudo pre-preenchido
- **Tipo de viagem**: Lido do contexto da expedicao (internacional/domestica/regional) para condicionar cards exibidos
- **Validacao**: Zod schema com campos opcionais, validacao only-if-filled (custo positivo, datas coerentes)

---

### 9. Comportamento Responsivo

| Breakpoint | Layout |
|---|---|
| Mobile (< 768px) | Cards de transporte: grid 2 colunas (3 para domestico, "Ainda nao decidi" full-width). Chips locais: grid 2 colunas. Campos de detalhe: empilhados verticalmente. Hospedagem: cards tipo em scroll horizontal snap. |
| Tablet (768-1024px) | Cards: grid 3 colunas. Chips: grid 3 colunas. Campos de detalhe: 2 colunas (data ida + volta lado a lado). |
| Desktop (> 1024px) | Cards: grid em linha unica (ate 5 items). Chips: grid 3 colunas. Campos: 2 colunas. Container max-width 720px centralizado. |

**Mobile-first decisions**:
- Barra de progresso: icones only no mobile, icones + texto no desktop
- Botoes de navegacao: full-width no mobile, inline no desktop
- Cards grandes o suficiente para toque confortavel (min 100x100px)

---

### 10. Padroes Reutilizados

De `docs/ux-patterns.md`:
- `FormField` (label + input + error + hint)
- `Button` (primary, ghost)
- `Alert` (para mensagens informativas)
- `Toast` (feedback apos salvar)

Novos componentes a criar:
- `TransportCard` / `AccommodationCard` (card selecionavel com icone)
- `TransportChip` (chip multi-selecao com icone e descricao)
- `WizardProgressBar` (reutilizavel — 3 steps com icones)
- `CollapsibleEntry` (bloco colapsavel para hospedagem multipla)

---

## Parte 2 — ITEM-14: Redesign do Guia de Destino (Fase 5 "O Mapa dos Dias")

### 1. Objetivo do Viajante

Consultar rapidamente informacoes praticas sobre o destino — fuso, moeda, idioma, tomadas, internet e cultura — sem precisar clicar ou expandir nada. O conteudo deve ser visivel, escaneavel e visualmente atraente.

### 2. Problema Atual

O layout atual usa accordions (colapsaveis) para cada categoria. Isso:
- Esconde informacao util atras de cliques
- Dificulta escaneamento rapido
- Nao aproveita o espaco disponivel em desktop
- Reduz a percepcao de valor do conteudo gerado por IA

### 3. Personas Afetadas

| Persona | Necessidade |
|---|---|
| `@leisure-solo` | Quer absorver tudo rapidamente para se sentir preparado. Gosta de dicas culturais. |
| `@leisure-family` | Precisa de info pratica (tomadas, moeda) para preparar a familia. |
| `@business-traveler` | Quer dados factuais rapidos: fuso, moeda, tomada. Nao quer ler muito. |
| `@bleisure` | Quer dicas culturais para a parte pessoal da viagem. |
| `@group-organizer` | Compartilha info com o grupo — conteudo precisa ser claro fora de contexto. |

---

### 4. Tres Opcoes de Layout

---

#### Opcao A: Card Grid (estilo Pinterest/Masonry)

**Conceito**: Cada categoria e um card independente em um grid responsivo. Cards podem ter alturas diferentes conforme o conteudo. Todas as 6 categorias visiveis simultaneamente.

**Wireframe**:
```
Desktop (2 colunas):
┌──────────────────┐  ┌──────────────────┐
│ 🕐 Fuso Horario  │  │ 💰 Moeda         │
│                  │  │                  │
│ Roma esta 4h     │  │ Euro (EUR)       │
│ a frente de      │  │ 1 EUR ≈ R$ 6,20 │
│ Brasilia (CET,   │  │                  │
│ UTC+1). No       │  │ Cartoes aceitos  │
│ verao, UTC+2.    │  │ em quase toda    │
│                  │  │ parte. Leve um   │
│                  │  │ pouco de cash.   │
└──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐
│ 🗣️ Idioma        │  │ 🔌 Eletricidade  │
│                  │  │                  │
│ Italiano.        │  │ Tipo C e L       │
│ Ingles limitado  │  │ 230V / 50Hz      │
│ em areas         │  │                  │
│ turisticas.      │  │ Adaptador        │
│ Aprenda: Grazie, │  │ necessario para  │
│ Per favore,      │  │ plugues BR.      │
│ Scusi, Quanto    │  │                  │
│ costa?           │  └──────────────────┘
└──────────────────┘
┌──────────────────┐  ┌──────────────────┐
│ 📶 Conectividade │  │ 🎭 Dicas         │
│                  │  │    Culturais     │
│ Chip pre-pago:   │  │                  │
│ TIM, Vodafone,   │  │ - Gorjetas nao   │
│ Wind. eSIM       │  │   sao obrigato-  │
│ disponivel.      │  │   rias, mas      │
│ WiFi gratis em   │  │   arredonde.     │
│ cafes e hoteis.  │  │ - Almoco: 12-14h │
│                  │  │ - Jantar: 20-22h │
│                  │  │ - Vista-se para  │
│                  │  │   igrejas.       │
│                  │  │ - "Coperto" e    │
│                  │  │   taxa de mesa.  │
└──────────────────┘  └──────────────────┘
```

**Mobile (1 coluna)**: Cards empilhados, full-width, ordem: Fuso > Moeda > Idioma > Eletricidade > Conectividade > Dicas Culturais.

**Estilo (dark theme)**:
- Card: bg `#1E293B` (slate-800), borda 1px `#334155` (slate-700), radius 12px
- Header do card: icone emoji (24px) + titulo em `--color-primary` (#E8621A), font-semibold 16px
- Corpo: texto `#CBD5E1` (slate-300), font 14px, line-height 1.6
- Hover: borda muda para `--color-primary` com transicao suave

**Conteudo curto vs longo**:
- Cards curtos (Fuso, Eletricidade): ficam menores naturalmente
- Cards longos (Dicas Culturais): expandem, mas grid masonry acomoda
- Se conteudo > 200 caracteres: truncar com "Ver mais" inline (nao accordion — expande in-place)

**Pros**: Escaneavel, modular, acomoda conteudo de tamanhos variados, familiar (padrao card grid)
**Contras**: Pode parecer fragmentado. Masonry grid requer CSS especifico ou JS.

---

#### Opcao B: Layout Magazine (estilo editorial)

**Conceito**: Layout com hero no topo, fatos rapidos como badges compactos, e secoes detalhadas abaixo em blocos de texto mais generosos. Sensacao de "guia de viagem premium".

**Wireframe**:
```
┌─────────────────────────────────────────────┐
│                                             │
│   [Gradiente hero com nome do destino]      │
│   ✈️ Roma, Italia                           │
│   "Tudo que voce precisa saber"             │
│                                             │
└─────────────────────────────────────────────┘

┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ 🕐      │ │ 💰      │ │ 🗣️      │ │ 🔌      │
│ UTC+1   │ │ EUR     │ │ Italiano│ │ Tipo C/L│
│ (+4h BR)│ │ R$6,20  │ │         │ │ 230V    │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
         [Badges de referencia rapida]

─── Conectividade ──────────────────────────────
Chip pre-pago: TIM, Vodafone, Wind. eSIM
disponivel em operadoras internacionais.
WiFi gratis em cafes, hoteis e espacos publicos.
Para dados moveis, recomenda-se um chip local
com 10-20GB por aproximadamente EUR 15-25.

─── Dicas Culturais ────────────────────────────
Gorjetas nao sao obrigatorias na Italia, mas
arredondar a conta e apreciado. O almoco e
servido entre 12h e 14h, e o jantar a partir
das 20h — restaurantes abrem tarde.

Vista-se adequadamente para visitar igrejas:
ombros e joelhos cobertos. O "coperto" na conta
e uma taxa de mesa, nao gorjeta.

Evite comer perto de pontos turisticos — ande
algumas quadras para encontrar comida melhor e
mais barata.
```

**Mobile**: Badges em grid 2x2. Secoes detalhadas full-width empilhadas.

**Estilo (dark theme)**:
- Hero: gradiente da viagem (reutiliza cover) com overlay escuro, titulo branco 24px bold
- Badges: bg `#1E293B`, borda `#334155`, radius 8px, padding 12px. Icone 20px + dado principal em bold 16px + dado secundario em muted 12px
- Secoes detalhadas: titulo com icone + linha separadora `--color-primary` 2px. Corpo em texto claro 14px com line-height 1.7. Espacamento generoso entre paragrafos.
- Secao Dicas Culturais: tipografia maior (16px), com icones de bullet (circulos `--color-accent`)

**Conteudo curto vs longo**:
- Badges sempre compactos (1-2 linhas)
- Secoes detalhadas: sem limite, fluem naturalmente
- Se secao muito longa (>500 chars): divide em paragrafos com espacamento

**Pros**: Sensacao premium, otimo para leitura imersiva, hierarquia clara (rapido no topo, detalhes embaixo)
**Contras**: Menos modular. Secoes longas empurram conteudo para baixo. Hero ocupa espaco no mobile.

---

#### Opcao C: Dashboard Cards (estilo info-hub)

**Conceito**: Divide informacoes em dois niveis visuais: linha superior com "stat cards" compactos para dados factuais rapidos (fuso, moeda, idioma, tomada), e linha inferior com cards de conteudo maior para informacoes textuais (conectividade, dicas culturais).

**Wireframe**:
```
[Quick Facts — referencia rapida]

┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ 🕐        │ │ 💰        │ │ 🗣️        │ │ 🔌        │
│ Fuso      │ │ Moeda     │ │ Idioma    │ │ Tomada    │
│           │ │           │ │           │ │           │
│ CET       │ │ EUR       │ │ Italiano  │ │ Tipo C/L  │
│ UTC+1     │ │ € 1 =    │ │           │ │ 230V      │
│           │ │ R$ 6,20   │ │ Ingles    │ │ 50Hz      │
│ +4h de    │ │           │ │ limitado  │ │           │
│ Brasilia  │ │ Cartao    │ │ em zonas  │ │ Adaptador │
│           │ │ aceito em │ │ turisti-  │ │ necessario│
│ Verao:    │ │ quase     │ │ cas       │ │ para BR   │
│ UTC+2     │ │ toda      │ │           │ │           │
│           │ │ parte     │ │ Frases:   │ │           │
│           │ │           │ │ Grazie,   │ │           │
│           │ │ Leve um   │ │ Scusi,    │ │           │
│           │ │ pouco de  │ │ Per       │ │           │
│           │ │ cash      │ │ favore    │ │           │
└───────────┘ └───────────┘ └───────────┘ └───────────┘

[Guia Detalhado]

┌──────────────────────────┐ ┌──────────────────────────┐
│ 📶 Conectividade         │ │ 🎭 Dicas Culturais       │
│                          │ │                          │
│ Chip pre-pago: TIM,     │ │ Gorjetas: nao            │
│ Vodafone, Wind.          │ │ obrigatorias, mas        │
│                          │ │ arredonde a conta.       │
│ eSIM disponivel.         │ │                          │
│                          │ │ Horarios de refeicao:    │
│ WiFi gratis em cafes,   │ │ Almoco 12-14h            │
│ hoteis e espacos         │ │ Jantar 20-22h            │
│ publicos.                │ │                          │
│                          │ │ Igrejas: ombros e        │
│ Dados moveis: chip       │ │ joelhos cobertos.        │
│ local 10-20GB por        │ │                          │
│ EUR 15-25.               │ │ "Coperto" e taxa de      │
│                          │ │ mesa, nao gorjeta.       │
│                          │ │                          │
│                          │ │ Dica: ande algumas       │
│                          │ │ quadras longe de pontos  │
│                          │ │ turisticos para comida   │
│                          │ │ melhor e mais barata.    │
└──────────────────────────┘ └──────────────────────────┘
```

**Mobile**: Stat cards em grid 2x2 na parte superior. Cards de conteudo em 1 coluna abaixo.

**Estilo (dark theme)**:
- Secao "Quick Facts": label em texto muted 12px uppercase, tracking wide
- Stat cards: bg `#1E293B`, borda `#334155`, radius 12px. Icone 24px centralizado no topo. Titulo em `--color-primary` 14px semibold. Dado principal em branco 18px bold. Detalhes em slate-300 13px.
- Separador visual entre Quick Facts e Guia Detalhado: linha pontilhada ou espaco generoso
- Cards de conteudo: bg `#1E293B`, borda `#334155`, radius 12px. Titulo com icone em `--color-primary`. Corpo em slate-300 14px, line-height 1.6.

**Conteudo curto vs longo**:
- Stat cards: altura fixa por linha (todos na mesma row tem mesma altura, definida pelo maior)
- Cards de conteudo: altura variavel, mas em grid 2-col desktop, podem desalinhar — aceitar masonry ou igualar alturas
- Conteudo muito longo em stat card: truncar em 6 linhas + "Ver mais" (raro)

**Pros**: Melhor uso do espaco, hierarquia clara (rapido vs detalhado), familiar para dashboards, eficiente para `@business-traveler`
**Contras**: Stat cards podem ficar apertados com conteudo longo. Dois niveis visuais podem confundir usuarios menos tecnicos.

---

### 5. Recomendacao: Opcao C (Dashboard Cards) com elementos da Opcao B

**Justificativa**:

1. **Hierarquia de informacao natural**: O padrao "quick facts no topo + detalhes abaixo" espelha como viajantes realmente consultam informacoes — primeiro checam dados factuais (fuso, moeda, tomada), depois leem dicas e orientacoes.

2. **Eficiencia para todos os perfis**: `@business-traveler` obtem dados rapidos nos stat cards sem scroll. `@leisure-solo` pode mergulhar nas dicas culturais abaixo. Ambos atendidos sem compromisso.

3. **Comportamento responsivo natural**: Grid 4-col > 2-col > 2-col (mobile) e um padrao nativo do CSS Grid, sem necessidade de JS para masonry.

4. **Escaneabilidade**: Stat cards criam pontos de ancoragem visual — o olho identifica rapidamente "onde esta a info de moeda" pelo icone e posicao.

5. **Consistencia com o app**: O Dashboard do Atlas ja usa cards como padrao. Manter este vocabulario visual reduz a carga cognitiva.

**Elemento emprestado da Opcao B**: Secao label "Quick Facts" / "Referencia Rapida" no topo, e "Guia Detalhado" antes dos cards maiores — dando estrutura editorial sem hero que ocupa espaco.

**Trade-offs aceitos**:
- Stat cards podem precisar de truncamento para conteudo AI muito longo (mitigacao: instrucoes no prompt de geracao limitam stat facts a 2-3 frases)
- Dois niveis visuais (stat + content cards) — mitigado com label de secao claro e separador visual

---

### 6. Especificacao Detalhada da Opcao Recomendada (C+B)

#### 6.1 Layout Geral

```
[Header da secao]
  "Guia de Destino" + icone bussola + badge "Gerado por IA"

[Referencia Rapida — 4 stat cards em linha]
  Fuso | Moeda | Idioma | Eletricidade

[Separador visual — linha sutil ou espaco 32px]

[Guia Detalhado — 2 content cards]
  Conectividade | Dicas Culturais
```

#### 6.2 Stat Card (componente: DestinationStatCard)

```
┌──────────────────────┐
│  [Icone 28px]        │
│  [Titulo 14px muted] │
│                      │
│  [Dado principal     │
│   18px bold branco]  │
│                      │
│  [Detalhes           │
│   13px slate-300     │
│   max 4 linhas]      │
│                      │
└──────────────────────┘
```

- Fundo: `#1E293B`
- Borda: 1px `#334155`
- Borda superior: 3px solid com cor tematica:
  - Fuso: `--color-info` (#3B82F6, azul)
  - Moeda: `--color-warning` (#F59E0B, ambar)
  - Idioma: `--color-accent` (#2DB8A0, teal)
  - Eletricidade: `--color-primary` (#E8621A, laranja)
- Padding: 16px
- Radius: 12px
- Min-height: 160px (garante alinhamento visual)
- Hover: borda top muda para 4px, sutil elevacao (shadow-sm)

#### 6.3 Content Card (componente: DestinationContentCard)

```
┌────────────────────────────────────┐
│  [Icone 24px] [Titulo 16px bold]  │
│  ────────────────────────────      │
│                                    │
│  [Conteudo em texto corrido        │
│   14px, line-height 1.7,          │
│   cor slate-300]                   │
│                                    │
│  [Pode ter bullets, paragrafos,   │
│   ou sub-secoes com bold]         │
│                                    │
└────────────────────────────────────┘
```

- Fundo: `#1E293B`
- Borda: 1px `#334155`
- Borda esquerda: 3px solid `--color-accent` (conectividade) ou `--color-primary` (dicas culturais)
- Padding: 20px
- Radius: 12px
- Titulo: cor `--color-primary` com icone alinhado
- Separador abaixo do titulo: 1px `#334155`
- Conteudo: suporta markdown leve (bold, italico, listas)
- Sem limite de altura — conteudo flui naturalmente

#### 6.4 Badge "Gerado por IA"

- Posicao: ao lado do titulo da secao
- Estilo: pill badge, bg `#334155`, texto `#94A3B8`, borda `#475569`, icone sparkle
- Texto: "Gerado por IA"
- Proposito: transparencia — o viajante sabe que o conteudo e gerado automaticamente
- aria-label: "Conteudo gerado por inteligencia artificial"

#### 6.5 Botao "Regenerar Guia"

- Posicao: abaixo de todos os cards, alinhado a direita
- Estilo: botao ghost com icone de refresh
- Texto: "Atualizar informacoes"
- Estado loading: "Atualizando..." com spinner
- Tooltip: "Gera novas informacoes com IA. Pode levar alguns segundos."
- Limite: 1 regeneracao por sessao (apos uso, desabilitado com tooltip "Voce ja atualizou nesta sessao")

---

### 7. Comportamento Responsivo (Opcao Recomendada)

| Breakpoint | Stat Cards | Content Cards | Notas |
|---|---|---|---|
| Mobile (< 768px) | Grid 2x2 | 1 coluna empilhada | Stat cards com min-height 140px. Content cards full-width. |
| Tablet (768-1024px) | Grid 4x1 (linha unica) | 2 colunas | Stat cards mais largos. |
| Desktop (> 1024px) | Grid 4x1 (linha unica) | 2 colunas | Container max-width 960px centralizado. |

---

### 8. Acessibilidade (Opcao Recomendada)

- Secao inteira: `<section aria-labelledby="destination-guide-title">`
- Titulo: `<h2 id="destination-guide-title">Guia de Destino</h2>`
- Cada stat card: `<article aria-label="[Categoria]: [dado principal]">` (ex: "Fuso horario: CET, UTC+1")
- Cada content card: `<article aria-labelledby="[id-titulo]">`
- Badge IA: aria-label descritivo, nao apenas visual
- Conteudo de texto: usa elementos semanticos (p, ul, li, strong) — nao apenas divs
- Contraste: texto slate-300 (#CBD5E1) sobre bg slate-800 (#1E293B) = ratio 7.5:1 (passa AA e AAA)
- Bordas coloridas: decorativas (nao portam informacao sozinhas — titulo e icone tambem identificam a categoria)
- Focus visible em botao "Atualizar informacoes"
- prefers-reduced-motion: sem hover transitions

---

## Parte 3 — Checklist de Acessibilidade (Ambos os Recursos)

### ITEM-13: Selecao de Transporte

- [ ] TransportTypeSelector: role="radiogroup" com aria-label="Tipo de transporte interurbano"
- [ ] Cada TransportCard: role="radio" com aria-checked, aria-label descritivo
- [ ] Painel de detalhes: aria-expanded no card, aria-controls apontando para o painel
- [ ] LocalTransportSelector: role="group" com aria-label="Opcoes de transporte local"
- [ ] Cada TransportChip: role="checkbox" com aria-checked
- [ ] AccommodationTypeSelector: role="radiogroup"
- [ ] Cada AccommodationCard: role="radio" com aria-checked
- [ ] Todos os FormFields: label visivel + htmlFor/id + aria-required (se aplicavel) + aria-describedby para erros
- [ ] Botao "+ Adicionar hospedagem": aria-disabled quando limite atingido + aria-label descritivo
- [ ] Botao remover hospedagem: aria-label "Remover hospedagem [nome]"
- [ ] WizardProgressBar: role="navigation" com aria-label="Progresso da fase", aria-current="step" no passo ativo
- [ ] Tab order logico: cards > detalhes > navegacao
- [ ] Teclado: Space/Enter seleciona card, Arrow keys navegam entre cards do mesmo grupo
- [ ] Focus trap: nao aplicavel (wizard nao e modal)
- [ ] Contraste: todos os textos >= 4.5:1, bordas >= 3:1
- [ ] Touch targets: >= 44x44px em todos os interativos
- [ ] prefers-reduced-motion respeitado em expansoes e transicoes

### ITEM-14: Guia de Destino

- [ ] Section wrapper: `<section aria-labelledby="destination-guide-title">`
- [ ] Stat cards: `<article>` com aria-label descritivo
- [ ] Content cards: `<article>` com aria-labelledby
- [ ] Badge IA: aria-label explicativo
- [ ] Conteudo: semantico (h3, p, ul, li, strong)
- [ ] Botao regenerar: aria-label, estado disabled comunicado via aria-disabled
- [ ] Contraste texto/fundo: >= 4.5:1 (verificado: slate-300 em slate-800 = 7.5:1)
- [ ] Bordas coloridas: puramente decorativas, informacao duplicada por icone+texto
- [ ] Focus visible em botao regenerar
- [ ] Heading hierarchy: h2 (titulo secao) > nenhum h3 nos stat cards > h3 nos content cards
- [ ] Touch targets: botao regenerar >= 44px altura
- [ ] prefers-reduced-motion: sem hover animations

---

## Parte 4 — Inventario de Componentes

### Componentes Novos (a criar)

| Componente | Feature | Tipo | Descricao |
|---|---|---|---|
| `TransportWizard` | ITEM-13 | Container | Wizard de 3 sub-etapas para Fase 4 |
| `WizardProgressBar` | ITEM-13 | UI | Barra de progresso com icones (3 steps). Reutilizavel. |
| `SelectableCard` | Ambos | UI | Card clicavel com icone, titulo, e estados (default/hover/selected/focus). Suporta role="radio" e role="checkbox". Componente base reutilizavel. |
| `TransportTypeSelector` | ITEM-13 | Composicao | Radiogroup de SelectableCards para transporte interurbano |
| `LocalTransportSelector` | ITEM-13 | Composicao | Checkbox group de SelectableCards (chips) para transporte local |
| `AccommodationTypeSelector` | ITEM-13 | Composicao | Radiogroup de SelectableCards para hospedagem |
| `AccommodationEntry` | ITEM-13 | Composicao | Bloco colapsavel com formulario de hospedagem |
| `AccommodationEntryList` | ITEM-13 | Container | Lista de AccommodationEntry com botao "Adicionar" |
| `TransportDetailsPanel` | ITEM-13 | Composicao | Painel expansivel com campos de detalhe do transporte |
| `CarRentalFields` | ITEM-13 | Composicao | Campos especificos para carro alugado (locadora, CINH) |
| `DestinationGuide` | ITEM-14 | Container | Layout completo do guia de destino (stat cards + content cards) |
| `DestinationStatCard` | ITEM-14 | UI | Card compacto para dados factuais (fuso, moeda, idioma, tomada) |
| `DestinationContentCard` | ITEM-14 | UI | Card expandido para conteudo textual (conectividade, dicas) |
| `AiBadge` | ITEM-14 | UI | Badge "Gerado por IA" com icone sparkle. Reutilizavel. |

### Componentes Reutilizados (de ux-patterns.md)

| Componente | Uso |
|---|---|
| `FormField` | Todos os campos de formulario em ITEM-13 |
| `Button` | Navegacao do wizard, "Adicionar hospedagem", "Atualizar informacoes" |
| `Alert` | Mensagens informativas e de ajuda |
| `Toast` | Feedback apos salvar etapa |
| `Toggle` (shadcn/ui Switch) | CINH, carro alugado |
| `Skeleton` | Loading state dos cards do guia de destino |

### Componentes shadcn/ui a Integrar

| Componente | Uso |
|---|---|
| `Card` | Base para SelectableCard, DestinationStatCard, DestinationContentCard |
| `Badge` | AiBadge, badges "Mais comum" no transporte |
| `Collapsible` | AccommodationEntry colapsavel |
| `Tooltip` | Dicas em "CINH", limite de hospedagens, botao regenerar |

---

## Questoes UX Abertas

- [ ] **Q1**: O conteudo do guia de destino deve ser editavel pelo viajante, ou somente gerado por IA? (Impacta se precisamos de estado editable nos content cards)
- [ ] **Q2**: Deve haver um indicador visual de "completude" na Fase 4, ou basta o viajante poder avancar? (Ex: "2 de 3 etapas preenchidas")
- [ ] **Q3**: Para viagens com multiplos destinos (futuro), como o guia de destino se adapta? (Um guia por destino? Tabs?)
- [ ] **Q4**: O custo estimado nos campos de transporte e hospedagem deve alimentar um resumo de orcamento em outra tela?
- [ ] **Q5**: Para o campo "Referencia da reserva", devemos suportar upload de PDF/imagem do voucher no futuro?

---

> UX-002 (ITEM-13) Status: Draft — Pronto para revisao do Arquiteto
> UX-003 (ITEM-14) Status: Draft — Pronto para revisao do Arquiteto
> Prototipo: docs/prototypes/destination-guide-redesign.html
