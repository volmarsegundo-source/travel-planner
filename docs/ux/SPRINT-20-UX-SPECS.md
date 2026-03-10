# Especificacoes UX — Sprint 20

**UX Spec ID**: UX-004 / UX-005 / UX-006
**Itens relacionados**: ITEM-A (Preferencias Pessoais), ITEM-D (Seletor de Passageiros), ITEM-E (Selecao de Transporte)
**Autor**: ux-designer
**Status**: Draft
**Ultima atualizacao**: 2026-03-10

---

## Parte 1 — ITEM-A: Preferencias Pessoais do Viajante (UX-004)

### 1. Objetivo do Viajante

Personalizar o planejamento de viagem informando preferencias pessoais (ritmo, alimentacao, interesses, orcamento, etc.) para que o sistema gere roteiros e sugestoes mais relevantes.

### 2. Personas Afetadas

| Persona | Necessidade |
|---|---|
| `@leisure-solo` | Quer que o app entenda seus interesses (fotografia, historia, culinaria local) para sugestoes personalizadas. |
| `@leisure-family` | Precisa indicar restricoes alimentares de criancas, interesses infantis, nivel de fitness moderado. |
| `@business-traveler` | Preenche rapido: ritmo intenso, hotel, conectividade essencial. Quer eficiencia. |
| `@bleisure` | Mistura interesses corporativos e pessoais: wellness/spa no fim de semana, fine dining. |
| `@group-organizer` | Precisa entender preferencias do grupo para encontrar atividades que agradem a maioria. |
| `@travel-agent` | Preenche em nome do cliente — precisa de categorias claras e faceis de explicar. |

### 3. Principios de Design

- **Tudo opcional**: Nenhuma categoria e obrigatoria. O viajante preenche o que quiser, quando quiser.
- **Gamificacao suave**: +5 pontos por categoria preenchida, badge "Perfil Completo" ao preencher todas as 10 categorias.
- **Progressive disclosure**: As categorias sao apresentadas em cards colapsaveis. O viajante expande apenas as que quer preencher.
- **Chips, nao texto livre**: Cada opcao e um chip selecionavel (toggle). Selecao multipla permitida em todas as categorias. Chips reduzem carga cognitiva e padronizam os dados para uso pelo algoritmo de recomendacao.

---

### 4. As 10 Categorias de Preferencia

#### Categoria 1: Ritmo de Viagem (travelPace)
**Pergunta**: "Qual e o seu ritmo ideal de viagem?"
**Tipo de selecao**: Selecao unica (radio)
**Opcoes**:
| Chip | Emoji | Descricao curta |
|---|---|---|
| Relaxado | 🧘 | "Poucas atividades por dia, com calma" |
| Moderado | 🚶 | "Equilibrio entre passeios e descanso" |
| Intenso | 🏃 | "Aproveitar cada minuto, muitas atividades" |

#### Categoria 2: Preferencias Alimentares (foodPreferences)
**Pergunta**: "Quais sao suas preferencias alimentares?"
**Tipo de selecao**: Multipla (checkbox)
**Opcoes**:
| Chip | Emoji |
|---|---|
| Vegetariano | 🥬 |
| Vegano | 🌱 |
| Halal | 🍖 |
| Kosher | ✡️ |
| Sem gluten | 🌾 |
| Sem lactose | 🥛 |
| Culinaria local | 🍜 |
| Street food | 🥡 |
| Fine dining | 🍷 |
| Sem restricoes | ✅ |

**Regra**: Se "Sem restricoes" e selecionado, desmarca os outros. Se qualquer outro e selecionado, desmarca "Sem restricoes".

#### Categoria 3: Interesses e Hobbies (interests)
**Pergunta**: "O que voce mais gosta de fazer em viagens?"
**Tipo de selecao**: Multipla (checkbox)
**Opcoes**:
| Chip | Emoji |
|---|---|
| Historia e museus | 🏛️ |
| Arte e galerias | 🎨 |
| Natureza e trilhas | 🌿 |
| Vida noturna | 🌙 |
| Compras | 🛍️ |
| Fotografia | 📸 |
| Esportes e aventura | ⛷️ |
| Wellness e spa | 💆 |
| Gastronomia | 🍴 |
| Praias | 🏖️ |
| Arquitetura | 🏗️ |
| Vida selvagem | 🦁 |

#### Categoria 4: Estilo de Orcamento (budgetStyle)
**Pergunta**: "Qual e o seu estilo de orcamento?"
**Tipo de selecao**: Selecao unica (radio)
**Opcoes**:
| Chip | Emoji | Descricao curta |
|---|---|---|
| Economico | 💰 | "Hostels, transporte publico, street food" |
| Moderado | 💳 | "Hoteis 3-4 estrelas, restaurantes locais" |
| Confortavel | 💎 | "Hoteis premium, experiencias exclusivas" |
| Luxo | 👑 | "Resorts, voos executivos, fine dining" |

#### Categoria 5: Preferencia Social (socialPreference)
**Pergunta**: "Como voce prefere viajar?"
**Tipo de selecao**: Multipla (checkbox)
**Opcoes**:
| Chip | Emoji |
|---|---|
| Solo e tranquilo | 🧍 |
| Encontrar outros viajantes | 🤝 |
| Atividades em grupo | 👥 |
| Em familia | 👨‍👩‍👧‍👦 |
| Romantico a dois | 💑 |

#### Categoria 6: Estilo de Hospedagem (accommodationStyle)
**Pergunta**: "Onde voce prefere se hospedar?"
**Tipo de selecao**: Multipla (checkbox)
**Opcoes**:
| Chip | Emoji |
|---|---|
| Hostel | 🛏️ |
| Hotel | 🏨 |
| Airbnb / Apartamento | 🏠 |
| Glamping | ⛺ |
| Resort | 🏝️ |
| Pousada / B&B | 🏡 |

#### Categoria 7: Nivel de Condicionamento Fisico (fitnessLevel)
**Pergunta**: "Qual e o seu nivel de condicionamento fisico?"
**Tipo de selecao**: Selecao unica (radio)
**Opcoes**:
| Chip | Emoji | Descricao curta |
|---|---|---|
| Baixo | 🚶‍♂️ | "Prefiro atividades leves, sem muito esforco" |
| Moderado | 🚴 | "Caminhadas e atividades moderadas" |
| Alto | 🧗 | "Trilhas longas, atividades intensas" |

**Impacto**: Afeta sugestoes de atividades no roteiro. Fitness "Baixo" nao recebe sugestoes de trilhas de 8h.

#### Categoria 8: Interesse em Fotografia (photographyInterest)
**Pergunta**: "Qual e o seu interesse em fotografia?"
**Tipo de selecao**: Selecao unica (radio)
**Opcoes**:
| Chip | Emoji | Descricao curta |
|---|---|---|
| Casual | 📱 | "Fotos rapidas com o celular" |
| Entusiasta | 📷 | "Gosto de explorar angulos e horarios" |
| Profissional | 🎞️ | "Preciso de tempo extra em cada ponto" |

**Impacto**: Afeta o tempo sugerido por ponto de interesse. "Profissional" recebe +30min por ponto no roteiro e sugestoes de golden hour.

#### Categoria 9: Preferencia de Horario (wakeUpPreference)
**Pergunta**: "Voce e mais matutino ou noturno?"
**Tipo de selecao**: Selecao unica (radio)
**Opcoes**:
| Chip | Emoji | Descricao curta |
|---|---|---|
| Madrugador | 🌅 | "Gosto de comecar cedo, aproveitar a manha" |
| Flexivel | ⏰ | "Sem preferencia forte" |
| Noturno | 🌙 | "Prefiro comecar mais tarde, curtir a noite" |

**Impacto**: Afeta o horario de inicio das atividades no roteiro gerado.

#### Categoria 10: Necessidade de Conectividade (connectivityNeeds)
**Pergunta**: "Qual e a sua necessidade de internet durante a viagem?"
**Tipo de selecao**: Selecao unica (radio)
**Opcoes**:
| Chip | Emoji | Descricao curta |
|---|---|---|
| Essencial | 📶 | "Preciso de WiFi o tempo todo (trabalho, comunicacao)" |
| Ocasional | 📱 | "Para mapas, mensagens e fotos" |
| Detox digital | 🌿 | "Quero desconectar e curtir offline" |

**Impacto**: "Essencial" gera dica de chip local/eSIM no guia de destino e prioriza locais com WiFi.

---

### 5. Fluxo do Usuario

```
[Viajante acessa pagina de perfil OU e direcionado apos preencher dados basicos]
    |
    v
[Tela de Preferencias: 10 categorias em cards colapsaveis]
    |
    +-- Toca em uma categoria --> [Card expande, mostrando chips]
    |                                |
    |                                +-- Seleciona chips --> [Salvo automaticamente via debounce 500ms]
    |                                |                       [Toast: "Preferencia salva!" (auto-dismiss 2s)]
    |                                |                       [+5 pontos (se primeira vez preenchendo esta categoria)]
    |                                |
    |                                +-- Desmarca todos os chips --> [Categoria volta a "nao preenchida"]
    |
    +-- Repete para outras categorias
    |
    v
[Barra de progresso atualiza em tempo real: "X de 10 categorias preenchidas"]
    |
    +-- Ao atingir 10/10 --> [Animacao de badge "Perfil Completo" + bonus de pontos]
    |
    v
[Preferencias influenciam geracao de roteiro, guia de destino e sugestoes de atividades]
```

**Fluxo de entrada**:
- Via pagina de perfil (`/account`): secao "Preferencias de Viagem" dentro do ProfileAccordion existente
- Via prompt pos-criacao de expedicao: "Quer personalizar suas preferencias para um roteiro mais certeiro?" (link para perfil)

**Fluxo de erro**:
- Falha ao salvar: Toast de erro "Nao foi possivel salvar. Tente novamente." + chip volta ao estado anterior
- Offline: Salva localmente, sincroniza ao reconectar (se houver suporte offline no futuro; v1 mostra toast de erro)

---

### 6. Especificacao de Tela

#### 6.1 Container: PreferencesSection

**Posicao**: Nova secao no ProfileAccordion, abaixo de "Sobre mim" e acima de "Preferencias" (que sera renomeada para "Acessibilidade e Restricoes").

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  Preferencias de Viagem        [X/10 preenchidas]   │
│  ─────────────────────────────────────────────────   │
│                                                     │
│  [Barra de progresso: X/10]                         │
│  "Complete suas preferencias para receber            │
│   sugestoes mais personalizadas"                    │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │ 🧘 Ritmo de Viagem              [▼]       │     │
│  │     Moderado                               │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │ 🍜 Preferencias Alimentares      [▼]       │     │
│  │     Nao preenchido                         │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │ 🌿 Interesses e Hobbies          [▼]       │     │
│  │     Historia, Fotografia, Gastronomia      │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  [...demais categorias...]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Card de categoria (colapsado)**:
- Icone emoji (20px) + Titulo da categoria (14px semibold)
- Subtitulo: selecoes atuais resumidas (truncado em 1 linha) ou "Nao preenchido" em texto muted
- Chevron indicador de expansao
- Borda esquerda colorida (3px) quando preenchido, cinza quando vazio
- Fundo: `--color-bg-surface` (branco)
- Hover: bg `--color-bg-subtle`

**Card de categoria (expandido)**:
```
┌─────────────────────────────────────────────────────┐
│ 🧘 Ritmo de Viagem                          [▲]    │
│                                                     │
│ "Qual e o seu ritmo ideal de viagem?"               │
│                                                     │
│ ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│ │ 🧘        │  │ 🚶        │  │ 🏃        │        │
│ │ Relaxado  │  │ Moderado  │  │ Intenso   │        │
│ │           │  │ ✓ (sel.)  │  │           │        │
│ │ Poucas    │  │ Equilibrio│  │ Aproveitar│        │
│ │ atividades│  │ entre     │  │ cada      │        │
│ │ por dia   │  │ passeios  │  │ minuto    │        │
│ └───────────┘  └───────────┘  └───────────┘        │
│                                                     │
│                                      [+5 pts ✨]    │
└─────────────────────────────────────────────────────┘
```

#### 6.2 Componente: PreferenceChip

**Especificacao**:
- Tamanho minimo: 100px largura x 64px altura (garante touch target 44x44px)
- Mobile: grid 2 colunas (chips full-width)
- Tablet: grid 3 colunas
- Desktop: grid 3-4 colunas (wrap natural)
- Padding: 12px
- Border-radius: 12px

**Estados**:
| Estado | Visual |
|---|---|
| Default | Borda 1px `#D1D5DB` (gray-300), fundo surface, texto `--color-text-primary` |
| Hover | Borda 1px `--color-primary`, fundo `--color-primary-light`, sombra sm |
| Selected | Borda 2px `--color-primary`, fundo `--color-primary-light`, checkmark no canto superior direito (8px, circulo `--color-primary` com check branco) |
| Focus | Outline 2px `--color-primary`, offset 2px (padrao de acessibilidade do sistema) |
| Disabled | Opacidade 50%, cursor not-allowed (usado apenas se "Sem restricoes" selecionado em alimentacao) |

**Conteudo do chip**:
1. Emoji centralizado (24px)
2. Nome da opcao (14px, semibold, centralizado)
3. Descricao curta (12px, text-muted, centralizado) — apenas para categorias de selecao unica (ritmo, orcamento, fitness, fotografia, horario, conectividade)

**ARIA**:
- Categorias de selecao unica: `role="radiogroup"` no container, `role="radio"` + `aria-checked` em cada chip
- Categorias de selecao multipla: `role="group"` no container, `role="checkbox"` + `aria-checked` em cada chip
- Container: `aria-label="[Pergunta da categoria]"`
- Chip: `aria-label="[Nome da opcao]: [Descricao curta]"` (para screen readers)

#### 6.3 Barra de Progresso de Preferencias

- Posicao: topo da secao PreferencesSection
- Visual: barra horizontal com 10 segmentos (1 por categoria)
- Segmento preenchido: `--color-primary`
- Segmento vazio: `--color-bg-subtle`
- Texto: "X de 10 categorias preenchidas"
- Ao atingir 10/10: barra muda para `--color-accent` (teal), texto muda para "Perfil completo!" com animacao sutil

#### 6.4 Gamificacao

| Acao | Pontos | Condicao |
|---|---|---|
| Preencher uma categoria (primeira vez) | +5 | Pelo menos 1 chip selecionado |
| Badge "Viajante Personalizado" | +25 bonus | Todas as 10 categorias preenchidas |
| Total maximo | 75 pontos | 10 x 5 + 25 bonus |

- Pontos exibidos com micro-animacao "+5" ao lado do titulo da categoria apos salvar
- Badge exibido com animacao de confete (reutilizando PointsAnimation existente)

---

### 7. Microcopy

#### Titulo da secao
- "Preferencias de Viagem"

#### Subtitulo
- "Complete suas preferencias para receber sugestoes mais personalizadas"

#### Card colapsado — sem selecao
- "[Nome da categoria] — Nao preenchido"

#### Card colapsado — com selecao
- "[Nome da categoria] — [Opcao 1], [Opcao 2], [Opcao 3]..." (truncar com "..." se > 3)

#### Toast de sucesso
- "Preferencia salva!"

#### Toast de erro
- "Nao foi possivel salvar. Tente novamente."

#### Badge conquistado
- "Parabens! Voce completou todas as preferencias e ganhou o badge Viajante Personalizado!"

#### Texto informativo (abaixo da barra de progresso)
- 0/10: "Suas preferencias ajudam a gerar roteiros sob medida para voce."
- 1-9/10: "Continue preenchendo! Faltam X categorias para um perfil completo."
- 10/10: "Perfil completo! Seus roteiros serao altamente personalizados."

---

### 8. Acessibilidade

- [ ] Cada card colapsavel: `<button>` com `aria-expanded`, `aria-controls` apontando para o painel de chips
- [ ] Container de chips: `role="radiogroup"` ou `role="group"` com `aria-label` (a pergunta da categoria)
- [ ] Cada chip: `role="radio"` ou `role="checkbox"` com `aria-checked`
- [ ] Navegacao por teclado: Tab entre cards, Enter/Space para expandir/colapsar, Arrow keys entre chips dentro de radiogroup
- [ ] Barra de progresso: `role="progressbar"` com `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label="Progresso de preferencias"`
- [ ] Toast de feedback: `role="status"` com `aria-live="polite"`
- [ ] Micro-animacao de pontos: `aria-live="polite"` para anunciar "+5 pontos" a screen readers
- [ ] Contraste de chips: texto sobre fundo claro >= 4.5:1 (verificado: `#1A1A2E` sobre `#FFFFFF` = 16.7:1; `#1A1A2E` sobre `#FFF0E8` = 14.2:1)
- [ ] Touch targets: chips >= 64px altura >= 100px largura (excede 44x44px minimo)
- [ ] Todos os emojis: tratados como decorativos (`aria-hidden="true"`) — o nome textual e o que conta
- [ ] `prefers-reduced-motion`: sem animacao de pontos nem confete; pontuacao apenas textual

---

### 9. Comportamento Responsivo

| Breakpoint | Layout |
|---|---|
| Mobile (< 768px) | Cards de categoria full-width empilhados. Chips em grid 2 colunas. Barra de progresso full-width. |
| Tablet (768-1024px) | Cards full-width. Chips em grid 3 colunas. |
| Desktop (> 1024px) | Cards full-width (max-width 720px centralizado). Chips em grid 3-4 colunas (wrap natural). |

---

### 10. Armazenamento de Dados

As preferencias sao armazenadas como JSON no campo `UserProfile` (novo campo `preferences Json?`), com a seguinte estrutura:

```json
{
  "travelPace": "moderate",
  "foodPreferences": ["local_cuisine", "street_food"],
  "interests": ["history", "photography", "gastronomy"],
  "budgetStyle": "moderate",
  "socialPreference": ["solo", "couple"],
  "accommodationStyle": ["hotel", "airbnb"],
  "fitnessLevel": "moderate",
  "photographyInterest": "enthusiast",
  "wakeUpPreference": "flexible",
  "connectivityNeeds": "occasional"
}
```

**Nota para o Arquiteto**: Recomendo um campo `preferences Json?` no `UserProfile` em vez de 10 campos separados. Isso permite adicionar novas categorias sem migrations e facilita a leitura/escrita em bloco.

---

### 11. Padroes Reutilizados

De `docs/ux-patterns.md`:
- `ProfileAccordion` (container pai — extendido com nova secao)
- `Toast` (feedback apos salvar)
- `PointsAnimation` (gamificacao)
- `Button` (secondary, para acoes dentro dos cards se necessario)

Novos componentes:
- `PreferenceCategory` — card colapsavel com chips (composicao de Collapsible + chip grid)
- `PreferenceChip` — chip selecionavel com icone, nome e descricao
- `PreferenceProgressBar` — barra segmentada de 10 categorias

---

---

## Parte 2 — ITEM-D: Seletor de Passageiros estilo Aerolinea (UX-005)

### 1. Objetivo do Viajante

Definir rapidamente a composicao do grupo de viagem (adultos, criancas, bebes, idosos) de forma intuitiva e validada, para que o sistema considere esses dados no planejamento do roteiro e na checklist.

### 2. Personas Afetadas

| Persona | Necessidade |
|---|---|
| `@leisure-solo` | Rapidez: 1 adulto ja vem pre-selecionado, nao precisa mexer. |
| `@leisure-family` | Criancas e bebes: precisa informar idade de cada crianca para sugestoes adequadas. |
| `@business-traveler` | Geralmente 1 adulto. Processo deve ser instantaneo — abrir, ver 1, fechar. |
| `@bleisure` | Pode adicionar acompanhante: 2 adultos e rapido. |
| `@group-organizer` | Ate 9 passageiros: precisa de controle granular. |
| `@travel-agent` | Preenche para clientes: precisa de resumo claro para confirmar com o cliente. |

### 3. Referencia: Padroes do Mercado

Baseado em pesquisa de GOL, LATAM, Azul, Google Flights e Booking.com:
- **Google Flights**: 4 steppers (Adults, Children, Infants in seat, Infants on lap) em dropdown
- **LATAM/GOL**: Painel colapsavel com steppers +/- para cada categoria
- **Booking.com**: Stepper para adultos e criancas, com campo de idade por crianca

**Decisao**: Adotamos o padrao stepper em painel colapsavel (como LATAM/GOL) por ser o mais familiar para viajantes brasileiros e o mais eficiente em mobile.

---

### 4. Fluxo do Usuario

```
[Viajante na tela de criacao/edicao de expedicao]
    |
    v
[Campo "Passageiros": mostra resumo compacto]
    ex: "1 Adulto" (default) ou "2 Adultos, 1 Crianca (8a)"
    |
    +-- Toca no campo --> [Painel expande inline (mobile: bottom sheet)]
    |                       |
    |                       +-- Ajusta steppers (+/-)
    |                       |    |
    |                       |    +-- Adultos (12+): min 1, max 9
    |                       |    +-- Criancas (2-11): min 0, max 8
    |                       |    |    +-- Se criancas > 0: campos de idade aparecem
    |                       |    +-- Bebes (0-1): min 0, max = numero de adultos
    |                       |    +-- Idosos (65+): min 0, max 9
    |                       |
    |                       +-- Validacao em tempo real:
    |                       |    +-- Total <= 9
    |                       |    +-- Bebes <= Adultos
    |                       |    +-- Pelo menos 1 adulto
    |                       |
    |                       +-- [Confirmar] --> Painel fecha, resumo atualiza
    |
    v
[Resumo exibe: "2 Adultos, 1 Crianca (8a), 1 Bebe"]
```

**Fluxo de erro**:
- Tentar adicionar passageiro alem de 9 total: botao + desabilitado, texto "Maximo de 9 passageiros"
- Tentar adicionar bebe sem adulto suficiente: botao + desabilitado, texto "Cada bebe precisa de 1 adulto acompanhante"
- Tentar remover ultimo adulto: botao - desabilitado (min 1)

---

### 5. Especificacao de Tela

#### 5.1 Campo Resumo (fechado)

```
┌──────────────────────────────────────────┐
│ 👥 Passageiros                    [▼]    │
│    2 Adultos, 1 Crianca (8a)             │
└──────────────────────────────────────────┘
```

- Aparencia: similar a um campo de formulario (borda, radius, padding)
- Clicavel: abre o painel de selecao
- Icone: silhueta de pessoas (Users icon do Lucide)
- Texto resumo: gerado dinamicamente
- ARIA: `role="button"`, `aria-expanded`, `aria-haspopup="dialog"`, `aria-label="Passageiros: [resumo]"`

#### 5.2 Painel de Selecao (expandido)

```
┌──────────────────────────────────────────────────┐
│  Passageiros                    Total: 4/9       │
│  ──────────────────────────────────────────────   │
│                                                  │
│  Adultos (12+)                                   │
│  [–]  2  [+]                                     │
│                                                  │
│  Criancas (2-11)                                 │
│  [–]  1  [+]                                     │
│                                                  │
│    ┌──────────────────────────────────┐           │
│    │ Crianca 1: Idade  [    8   ] anos│           │
│    └──────────────────────────────────┘           │
│                                                  │
│  Bebes (0-1)                                     │
│  [–]  1  [+]                                     │
│  ℹ️ Cada bebe precisa de 1 adulto                │
│                                                  │
│  Idosos (65+)                                    │
│  [–]  0  [+]                                     │
│  ℹ️ Para considerar necessidades de              │
│     acessibilidade e ritmo                       │
│                                                  │
│  ──────────────────────────────────────────────   │
│  [                 Confirmar                  ]   │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### 5.3 Componente: PassengerStepper

Cada categoria de passageiro e um stepper horizontal:

```
[Label (ex: "Adultos (12+)")]
[–]  [Valor]  [+]
```

**Especificacao do stepper**:
- Botoes +/–: 44x44px (touch target), circulares, borda 1px `--color-secondary`, fundo surface
- Botao hover: fundo `--color-secondary-light`
- Botao disabled: opacidade 30%, cursor not-allowed
- Valor: 32px font-size, bold, centralizado, min-width 48px
- Incremento: 1 por toque (sem long-press rapido — simplicidade)
- Label: 16px, `--color-text-primary`, com sub-label idade entre parenteses em `--color-text-secondary`

**Estados dos botoes**:
| Condicao | Botao – | Botao + |
|---|---|---|
| Adultos = 1 | disabled | enabled (se total < 9) |
| Adultos = 9 | enabled | disabled |
| Criancas = 0 | disabled | enabled (se total < 9) |
| Bebes = Adultos | n/a | disabled + tooltip "Cada bebe precisa de 1 adulto" |
| Total = 9 | enabled | disabled em TODAS as categorias |

#### 5.4 Campos de Idade das Criancas

Quando `criancas > 0`, exibe um campo de idade para cada crianca:

```
┌──────────────────────────────────────┐
│ Crianca 1: Idade  [  select 2-11  ] │
│ Crianca 2: Idade  [  select 2-11  ] │
└──────────────────────────────────────┘
```

- Tipo: `<select>` com opcoes de 2 a 11 (mais acessivel que input numerico livre)
- Default: vazio (placeholder "Idade")
- Obrigatorio? Sim — se crianca foi adicionada, a idade deve ser informada para gerar sugestoes adequadas
- Se idade nao preenchida ao confirmar: highlight no campo + mensagem "Informe a idade da crianca"
- Animacao de entrada: fade-in + slide-down ao adicionar crianca, fade-out + slide-up ao remover
- `prefers-reduced-motion`: sem animacao, aparece/desaparece instantaneamente

#### 5.5 Texto Resumo (logica de formatacao)

Regras para gerar o texto resumo:
- 1 adulto, 0 demais: "1 Adulto"
- 2 adultos, 0 demais: "2 Adultos"
- 2 adultos, 1 crianca: "2 Adultos, 1 Crianca (Xa)"
- 2 adultos, 2 criancas: "2 Adultos, 2 Criancas (Xa, Ya)"
- Com bebe: "2 Adultos, 1 Bebe"
- Com idoso: "2 Adultos, 1 Idoso"
- Combinacao completa: "2 Adultos, 1 Crianca (8a), 1 Bebe, 1 Idoso"
- Truncamento (se muito longo no mobile): "4 passageiros" com detalhes no tooltip

#### 5.6 Contador de Total

- Posicao: canto superior direito do painel
- Formato: "Total: X/9"
- Cor: `--color-text-secondary` quando < 7, `--color-warning` quando 7-8, `--color-error` quando 9
- ARIA: `aria-live="polite"` para anunciar mudancas

---

### 6. Regras de Validacao

| Regra | Mensagem de erro | Momento |
|---|---|---|
| Total de passageiros > 9 | "Maximo de 9 passageiros por viagem" | Em tempo real (botao + desabilitado) |
| Bebes > Adultos | "Cada bebe precisa de 1 adulto acompanhante" | Em tempo real (botao + bebe desabilitado) |
| Adultos < 1 | N/A — botao – desabilitado quando adultos = 1 | Em tempo real |
| Crianca sem idade | "Informe a idade da crianca" | Ao clicar "Confirmar" |
| Idade fora de 2-11 | N/A — select limita opcoes | Impossivel |

---

### 7. Microcopy

#### Labels
- Adultos: "Adultos (12+)"
- Criancas: "Criancas (2-11)"
- Bebes: "Bebes (0-1)"
- Idosos: "Idosos (65+)"

#### Hints (texto informativo abaixo da categoria)
- Bebes: "Cada bebe precisa de 1 adulto acompanhante"
- Idosos: "Para considerar necessidades de acessibilidade e ritmo"

#### Botao de confirmacao
- "Confirmar"

#### Campo resumo (placeholder, sem selecao alem do default)
- "1 Adulto"

#### Limite atingido
- Inline, acima do botao Confirmar: "Maximo de 9 passageiros atingido"

---

### 8. Acessibilidade

- [ ] Campo resumo: `role="button"` com `aria-expanded`, `aria-haspopup="dialog"`
- [ ] Painel: `role="dialog"` com `aria-label="Selecao de passageiros"` (desktop inline) ou `role="dialog"` + `aria-modal="true"` (mobile bottom sheet)
- [ ] Cada stepper: `role="group"` com `aria-label="[Categoria], [valor] selecionado"`
- [ ] Botao –: `aria-label="Diminuir [categoria]"`, `aria-disabled` quando no minimo
- [ ] Botao +: `aria-label="Aumentar [categoria]"`, `aria-disabled` quando no maximo
- [ ] Valor numerico: `aria-live="polite"` para anunciar mudancas
- [ ] Campos de idade: `<label>` visivel + `<select>` com `aria-required="true"`
- [ ] Contador total: `aria-live="polite"`
- [ ] Mensagens de limite: `role="alert"` quando exibidas
- [ ] Tab order: campo resumo > botoes – + (por categoria, top to bottom) > campos idade > confirmar
- [ ] Teclado: Enter/Space nos botoes +/-, Escape fecha o painel
- [ ] Focus trap: ativo quando painel aberto em modo modal (mobile bottom sheet)
- [ ] Touch targets: botoes +/- >= 44x44px
- [ ] Contraste: todos os textos >= 4.5:1

---

### 9. Comportamento Responsivo

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Toque no campo resumo abre bottom sheet (slide up from bottom). Full-width. Botao "Confirmar" fixo no bottom. Focus trap ativo. Overlay escuro no fundo. |
| Tablet (768-1024px) | Painel expande inline abaixo do campo. Sem overlay. Max-width 480px. |
| Desktop (> 1024px) | Painel expande inline abaixo do campo. Max-width 400px. Sombra lg. |

---

### 10. Posicao no Fluxo

O seletor de passageiros aparece em dois contextos:

1. **Fase 1 (Criacao da Expedicao)**: Como step adicional entre "Datas" e "Sobre Voce" — ou como campo na mesma tela de datas.
   - **Recomendacao**: Campo na mesma tela de datas (Step 2 do Phase1Wizard). Nao adiciona um step novo — reduz fricao.

2. **Edicao da Expedicao**: Na pagina de edicao, como campo editavel.

**Nota para o Arquiteto**: Os dados de passageiros devem ser armazenados na Trip (ou em modelo relacionado `TripPassengers`). Estrutura sugerida:

```json
{
  "adults": 2,
  "children": [{ "age": 8 }, { "age": 5 }],
  "infants": 1,
  "seniors": 0
}
```

---

### 11. Padroes Reutilizados

De `docs/ux-patterns.md`:
- `FormField` (container para o campo resumo)
- `Button` (Confirmar, +/-, ghost)
- `Toast` (feedback se necessario)

Novos componentes:
- `PassengerSelector` — campo resumo + painel colapsavel
- `PassengerStepper` — stepper +/- com label, hint e validacao
- `ChildAgeInput` — campo de idade por crianca (select 2-11)
- `BottomSheet` — container modal mobile (reutilizavel para outros features)

---

---

## Parte 3 — ITEM-E: Selecao de Transporte (UX-006) — Resumo

**Nota**: Esta especificacao ja foi detalhada em `docs/product/DESTINATION-GUIDE-REDESIGN.md` (Parte 1, UX-002). Aqui resumimos apenas as decisoes-chave e ajustes para Sprint 20.

### Decisao: Manter UX-002 como esta

A especificacao UX-002 (ITEM-13) cobre completamente o fluxo de transporte com:
- 3 sub-etapas: intercity, local, hospedagem
- Cards selecionaveis com detalhes expansiveis
- Wizard com barra de progresso
- Tudo opcional, "Ainda nao decidi" em cada passo

### Ajustes para Sprint 20

Se o time de desenvolvimento chegar ao ITEM-E neste sprint:

1. **Integrar seletor de passageiros**: Os dados de passageiros (ITEM-D) devem estar disponiveis na Fase 4. Se a viagem tem criancas, destacar opcoes familiares (carro alugado, hotel com quarto familia).

2. **Integrar preferencias**: Se o viajante indicou `accommodationStyle: ["hostel"]` nas preferencias (ITEM-A), pre-selecionar "Hostel" como sugestao (com chip "Baseado no seu perfil").

3. **Sem alteracoes no fluxo base**: O wizard de 3 sub-etapas permanece conforme UX-002.

### Referencia completa
- Fluxo: `docs/product/DESTINATION-GUIDE-REDESIGN.md`, secao "Parte 1 — ITEM-13"
- Componentes: SelectableCard, WizardProgressBar, CollapsibleEntry

---

---

## Parte 4 — Inventario de Componentes (Sprint 20)

### Componentes Novos

| Componente | Feature | Tipo | Descricao |
|---|---|---|---|
| `PreferenceCategory` | ITEM-A | Composicao | Card colapsavel com pergunta, grid de chips, auto-save, pontuacao |
| `PreferenceChip` | ITEM-A | UI | Chip selecionavel com emoji, nome, descricao. Suporta radio e checkbox. |
| `PreferenceProgressBar` | ITEM-A | UI | Barra segmentada 10 categorias com texto de progresso |
| `PassengerSelector` | ITEM-D | Composicao | Campo resumo + painel colapsavel com steppers |
| `PassengerStepper` | ITEM-D | UI | Controle +/- com label, valor, limites e hints |
| `ChildAgeInput` | ITEM-D | UI | Select de idade (2-11) por crianca, com animacao de entrada/saida |
| `BottomSheet` | ITEM-D | UI | Container modal slide-up para mobile. Reutilizavel. |

### Componentes Reutilizados

| Componente | Uso |
|---|---|
| `ProfileAccordion` | Container pai para PreferenceCategory (ITEM-A) |
| `Toast` | Feedback de salvamento (ITEM-A, ITEM-D) |
| `PointsAnimation` | Gamificacao ao completar categorias (ITEM-A) |
| `Button` | CTAs e steppers (ambos) |
| `FormField` | Container do PassengerSelector (ITEM-D) |
| `PhaseProgressBar` | Referencia visual para wizard de transporte (ITEM-E) |

### Componentes shadcn/ui

| Componente | Uso |
|---|---|
| `Collapsible` | PreferenceCategory collapse/expand |
| `Badge` | Indicador "Baseado no seu perfil" (ITEM-E) |
| `Select` | ChildAgeInput (ITEM-D) |
| `Tooltip` | Hints em bebes e idosos (ITEM-D) |

---

## Parte 5 — Checklist de Acessibilidade Consolidado

### ITEM-A: Preferencias Pessoais

- [ ] Cards colapsaveis: `<button>` com `aria-expanded`, `aria-controls`
- [ ] Chips radiogroup: `role="radiogroup"` + `role="radio"` + `aria-checked`
- [ ] Chips checkbox: `role="group"` + `role="checkbox"` + `aria-checked`
- [ ] Teclado: Tab entre cards, Enter/Space para colapsar, Arrow keys entre chips em radiogroup
- [ ] Barra de progresso: `role="progressbar"`, `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=10`
- [ ] Emojis: `aria-hidden="true"` (decorativos)
- [ ] Toast: `role="status"`, `aria-live="polite"`
- [ ] Contraste: texto sobre fundo >= 4.5:1
- [ ] Touch targets: chips >= 64x100px
- [ ] `prefers-reduced-motion`: sem animacoes de pontos

### ITEM-D: Seletor de Passageiros

- [ ] Campo resumo: `role="button"`, `aria-expanded`, `aria-haspopup="dialog"`
- [ ] Painel: `role="dialog"`, `aria-label`
- [ ] Steppers: `role="group"`, `aria-label`, botoes com `aria-label` descritivo
- [ ] Botoes +/-: `aria-disabled` (nao apenas `disabled` visual)
- [ ] Valores: `aria-live="polite"`
- [ ] Campos de idade: `<label>` + `<select>` + `aria-required`
- [ ] Contador total: `aria-live="polite"`
- [ ] Alertas de limite: `role="alert"`
- [ ] Teclado: Enter/Space nos botoes, Escape fecha painel
- [ ] Focus trap: ativo em bottom sheet mobile
- [ ] Touch targets: botoes +/- >= 44x44px
- [ ] Contraste: >= 4.5:1

---

## Questoes UX Abertas

- [ ] **Q1**: As preferencias devem ser solicitadas durante o onboarding (wizard pos-registro) ou apenas no perfil? Recomendacao: apenas no perfil, com um prompt contextual apos criar a primeira expedicao.
- [ ] **Q2**: O seletor de passageiros deve aparecer como step separado no Phase1Wizard (Step 2.5) ou como campo adicional no Step 2 (Datas)? Recomendacao: campo no Step 2.
- [ ] **Q3**: Para "Idosos (65+)", devemos pedir a idade exata como fazemos com criancas? Recomendacao: nao, apenas a contagem e suficiente. Acessibilidade e ritmo ja sao cobertos pelas preferencias (ITEM-A).
- [ ] **Q4**: Qual o campo no Prisma para armazenar passageiros? Sugestao: `passengers Json?` na Trip.
- [ ] **Q5**: As preferencias alimentares devem incluir um campo de texto livre adicional para alergias especificas? Recomendacao: sim, um campo "Outras restricoes" (textarea, max 200 chars) ao final da categoria alimentar.

---

> UX-004 (ITEM-A) Status: Draft — Pronto para revisao do Arquiteto
> UX-005 (ITEM-D) Status: Draft — Pronto para revisao do Arquiteto
> UX-006 (ITEM-E) Status: Referencia a UX-002 com ajustes — Pronto para revisao do Arquiteto
