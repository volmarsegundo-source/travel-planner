---
spec_id: SPEC-PROD-PHASE5-REDESIGN
title: Phase 5 "Guia do Destino" V2 — Detailed Redesign Spec
version: 1.0.0
status: Draft
sprint: 40
owner: product-owner
created: 2026-03-26
updated: 2026-03-26
feature_flag: NEXT_PUBLIC_DESIGN_V2
stitch_export: docs/design/stitch-exports/phase5_guia_destino/code.html
token_reference: docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md
parent_spec: SPEC-PROD-053
---

# SPEC-PROD-PHASE5-REDESIGN: Phase 5 "Guia do Destino" V2 — Detailed Redesign Spec

> Este documento e o detalhamento exaustivo de Phase 5 dentro de SPEC-PROD-053.
> A fonte de verdade visual e o Stitch export em `docs/design/stitch-exports/phase5_guia_destino/code.html`.
> Os criterios de aceite neste documento substituem os ACs 07-12 de SPEC-PROD-053 para Phase 5.

---

## 1. Problem Statement

A Phase 5 atual ("Guia do Destino") apresenta o conteudo gerado por IA em um layout de lista plana e texto corrido. O viajante recebe informacoes criticas — seguranca, custos, atracacoes — sem hierarquia visual, sem escaneabilidade, e sem o senso de "guia premium" que o produto promete.

O Stitch export para Phase 5 define um layout bento-grid de cinco cards com hierarquia clara: informacoes rapidas escaneavel em segundos, descricao narrativa do destino, dicas de seguranca com indicador de nivel, tabela de custos medios, e carrossel de atracoes nao perder. Esta spec traduz esse design em criterios de aceite precisos e testa veis para o dev-fullstack-2 (Track 2, Sprint 40).

---

## 2. User Story

As a @leisure-solo exploring an unfamiliar destination,
I want the AI-generated destination guide to be presented in a rich, scannable bento-grid layout with clearly separated information zones,
so that I can absorb essential destination knowledge — safety level, daily costs, key attractions, cultural context — in under two minutes, without reading walls of text.

### Traveler Context

- **Pain point**: A versao atual obriga o viajante a ler paragrafos longos para encontrar informacoes objetivas como moeda, fuso horario, e nível de seguranca. Essas sao perguntas de resposta rapida que devem ser respondidas em segundos, nao minutos.
- **Current workaround**: Viajantes abrem o Google ou Lonely Planet em paralelo para verificar informacoes basicas que o guia nao apresenta de forma escaneavel.
- **Frequency**: Phase 5 e acessada em toda expedicao que chega ao destino guia. Para usuários que revisitam o plano antes da viagem, pode ser visitada multiplas vezes. E a fase com maior potencial de impressao positiva apos a Phase 6 (Roteiro).
- **Personas afetadas**: @leisure-solo (primario), @leisure-family (secundario — custos e seguranca sao criticos para familias), @bleisure (rapida referencia de fuso e idioma).

---

## 3. Estrutura de Dados — Fonte do Conteudo

Todo o conteudo de Phase 5 e gerado pelo provedor de IA (GuideProvider) e persistido no campo `guideContent` do model `Trip` (ou equivalente). Nenhuma secao busca dados de fontes externas em tempo real — todos os valores sao resultado da geracao de IA e podem ser regenerados pelo usuario.

### Schema de Dados do Guia (campos esperados)

```
guideContent: {
  destination: {
    name: string,           // Ex: "Lisboa"
    nickname: string,       // Ex: "A Cidade da Luz"
    heroImageQuery: string, // Descricao textual para busca de imagem (nunca URL hardcoded)
    overview: string[],     // Array de paragrafos (minimo 2, maximo 4)
    subtitle: string        // Frase de chamada exibida abaixo do H1
  },
  quickFacts: {
    climate: string,        // Ex: "18-25°C"
    currency: string,       // Ex: "Euro (€)"
    language: string,       // Ex: "Portugues"
    timezone: string,       // Ex: "GMT+0"
    powerOutlet: string,    // Ex: "Tipo F (230V)"
    dialCode: string        // Ex: "+351"
  },
  safety: {
    level: "safe" | "moderate" | "caution",
    tips: string[]          // Array de 3-5 dicas
  },
  costs: {
    items: Array<{
      label: string,        // Ex: "Refeicao (Economica)"
      range: string         // Ex: "€12.00 - €18.00"
    }>,
    localTip: string        // Uma dica de economia local
  },
  attractions: Array<{
    name: string,
    description: string,    // max 120 caracteres
    imageQuery: string      // Descricao textual para busca de imagem
  }>,
  generatedAt: ISO8601DateTime
}
```

---

## 4. Layout Geral

### 4.1 Container e Responsividade

A pagina de Phase 5 usa o `PhaseShellV2` (SPEC-PROD-051) como container pai. O conteudo principal e renderizado dentro do canvas `<main>` que:

- Em desktop (>= 1024px): tem margem esquerda de 256px (largura do sidebar do shell)
- Em tablet (768px - 1023px): sem margem esquerda (sidebar nao existe)
- Em mobile (< 768px): padding horizontal de 16px (4 em tokens de espacamento)

O canvas interno usa padding de 24px (6) a 40px (10) conforme o breakpoint, com `padding-bottom: 128px` para nao sobrepor a bottom action bar fixa.

O grid bento usa 10 colunas em desktop e colapsa para coluna unica em mobile, com gap de 24px entre cards.

### 4.2 Hierarquia da Pagina

```
[PhaseShellV2]
  [TopAppBar — SPEC-PROD-051]
  [Navigation Stepper + Breadcrumb]
  [Desktop Side Navigation — Phase 5 specific]
  <main>
    [Section A] Page Header
    [Section B] Bento Grid
      [B1] Card "Sobre o Destino"      (desktop: 6/10 colunas)
      [B2] Card "Informacoes Rapidas"  (desktop: 4/10 colunas)
      [B3] Card "Dicas de Seguranca"   (desktop: 5/10 colunas)
      [B4] Card "Custos Medios"        (desktop: 5/10 colunas)
      [B5] Card "O que nao perder"     (desktop: 10/10 colunas)
    [Section C] Disclaimer Footer
  </main>
  [Bottom Action Bar — SPEC-PROD-051]
```

---

## 5. Secoes — Criterios de Aceite Detalhados

---

### SECAO A — Page Header

**O que exibe**: Badge "Gerado por IA", titulo H1 com nome do destino, subtitulo descritivo.

**Fonte dos dados**: `guideContent.destination.name`, `guideContent.destination.subtitle`.

**Criterios de Aceite**:

- [ ] **AC-P5-001**: Dado `NEXT_PUBLIC_DESIGN_V2=true` e guia carregado, quando Phase 5 renderiza, entao um badge aparece acima do H1 com:
  - Fundo: `atlas-primary-fixed` (lavanda claro `#dae3f7`)
  - Texto: `atlas-on-primary-fixed` (`#131c2a`), fonte Work Sans, peso 700, tamanho caption (0.75rem / 12px)
  - Texto do badge: "Gerado por IA" (exatamente — sem emoji no DOM)
  - Icone Material Symbols "smart_toy" com FILL=1, tamanho 18px, a esquerda do texto
  - Border-radius full (pill shape)
  - Padding horizontal 12px, padding vertical 4px

- [ ] **AC-P5-002**: Dado guia carregado, quando Phase 5 renderiza, entao o titulo H1 exibe "Guia do Destino: [nome do destino]" onde `[nome do destino]` e `guideContent.destination.name`, com:
  - Fonte: Plus Jakarta Sans
  - Peso: 700 (Bold) ou 800 (ExtraBold) — conforme disponibilidade do token `font-headline`
  - Tamanho: 2.25rem (36px) em mobile, 3rem (48px) em desktop (`text-4xl md:text-5xl`)
  - Cor: `atlas-on-surface` (`#1a1c1c`)
  - Letter-spacing: tight
  - Margem inferior: 8px

- [ ] **AC-P5-003**: Dado guia carregado, quando Phase 5 renderiza, entao o subtitulo abaixo do H1 exibe `guideContent.destination.subtitle` com:
  - Fonte: Work Sans
  - Peso: 500 (Medium)
  - Tamanho: 1.125rem (18px) (`text-lg`)
  - Cor: `atlas-on-surface-variant`
  - Margem inferior: 40px (separando o header do bento grid)

- [ ] **AC-P5-004**: Dado guia ainda nao gerado (estado vazio), quando Phase 5 renderiza, entao o Page Header exibe um skeleton de duas linhas:
  - Linha 1 (badge placeholder): retangulo `atlas-surface-container-high`, largura 120px, altura 24px, border-radius full, animacao pulse
  - Linha 2 (H1 placeholder): retangulo `atlas-surface-container-high`, largura 70% do container, altura 48px, border-radius 4px, animacao pulse
  - Linha 3 (subtitulo placeholder): retangulo `atlas-surface-container-high`, largura 85% do container, altura 24px, border-radius 4px, animacao pulse

- [ ] **AC-P5-005**: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando Phase 5 renderiza, entao o Page Header nao sofre nenhuma alteracao visual em relacao ao V1.

---

### SECAO B1 — Card "Sobre o Destino" (6/10 colunas desktop)

**O que exibe**: Imagem hero do destino com overlay de nome/apelido + dois paragrafos de descricao narrativa.

**Fonte dos dados**: `guideContent.destination.heroImageQuery`, `guideContent.destination.nickname`, `guideContent.destination.overview[]`.

**Criterios de Aceite**:

- [ ] **AC-P5-006**: Dado guia carregado e `NEXT_PUBLIC_DESIGN_V2=true`, quando o Card "Sobre o Destino" renderiza, entao o card usa:
  - Background: `atlas-surface-container-lowest` (branco puro `#ffffff`)
  - Border-radius: 12px (`rounded-xl`)
  - Borda: 1px solida, cor `atlas-outline-variant` com opacidade 15%
  - Sombra: `box-shadow: 0px 24px 48px rgba(4, 13, 27, 0.06)` (sombra sutil do design system)
  - Overflow: hidden (imagem nao vaza do border-radius)
  - Display: flex, flex-direction: column

- [ ] **AC-P5-007**: Dado Card "Sobre o Destino", quando renderiza, entao a zona de imagem hero ocupa a parte superior do card com:
  - Altura fixa: 256px (h-64)
  - Largura: 100% do card
  - `object-fit: cover`
  - Carregamento lazy (`loading="lazy"`)
  - A imagem e servida por integracao de banco de imagens (ex: Unsplash/Pexels via query textual de `heroImageQuery`). Em ausencia de imagem disponivel, exibir um fundo gradiente `atlas-primary` para `atlas-primary-container` como fallback.
  - Gradiente overlay na base da imagem: `linear-gradient(to top, rgba(0,0,0,0.60), transparent)`, altura 96px

- [ ] **AC-P5-008**: Dado imagem hero renderizada, quando o overlay de gradiente e exibido, entao o apelido do destino (`guideContent.destination.nickname`) aparece sobre o gradiente com:
  - Posicao: absolute, bottom 16px, left 24px
  - Cor: branco (`#ffffff`)
  - Fonte: Plus Jakarta Sans
  - Peso: 700
  - Tamanho: 1.25rem (20px) (`text-xl`)
  - Nao pode usar cor `atlas-on-surface` (insuficiente contraste sobre imagem escura)

- [ ] **AC-P5-009**: Dado Card "Sobre o Destino", quando a zona de texto renderiza, entao exibe:
  - Heading "Sobre o Destino" com icone Material Symbols "info" (cor `atlas-secondary-container` #fe932c), fonte Plus Jakarta Sans, peso 700, tamanho 1.25rem (20px)
  - Os paragrafos de `guideContent.destination.overview[]` separados com margem inferior 16px entre eles
  - Texto dos paragrafos: Work Sans, peso 400 (Regular), tamanho 1rem (16px), cor `atlas-on-surface-variant`, line-height 1.625 (relaxed)
  - Padding da zona de texto: 32px em todos os lados (`p-8`)

- [ ] **AC-P5-010**: Dado Card "Sobre o Destino" em estado de carregamento (AI gerando), quando renderiza, entao exibe:
  - Placeholder da imagem: retangulo `atlas-surface-container-high` 256px de altura, sem borda, com animacao pulse
  - Tres linhas de skeleton de texto dentro da zona de conteudo: larguras 100%, 90%, 75%, altura 16px cada, espacamento 12px, animacao pulse

- [ ] **AC-P5-011**: Dado Card "Sobre o Destino" em tela mobile (< 768px), quando renderiza, entao o card ocupa 100% da largura do container (col-span-1 na grid single-column) sem perda de conteudo.

---

### SECAO B2 — Card "Informacoes Rapidas" (4/10 colunas desktop)

**O que exibe**: 6 fatos-chave do destino em grid 2x3 com icone + label + valor para cada fato.

**Fonte dos dados**: `guideContent.quickFacts` (6 campos: climate, currency, language, timezone, powerOutlet, dialCode).

**Mapeamento de icones Material Symbols**:

| Campo | Icone | Label exibido |
|-------|-------|---------------|
| `climate` | `device_thermostat` | Clima |
| `currency` | `payments` | Moeda |
| `language` | `translate` | Idioma |
| `timezone` | `schedule` | Fuso Horario |
| `powerOutlet` | `electrical_services` | Tomada |
| `dialCode` | `phone_iphone` | DDI |

**Criterios de Aceite**:

- [ ] **AC-P5-012**: Dado guia carregado e `NEXT_PUBLIC_DESIGN_V2=true`, quando o Card "Informacoes Rapidas" renderiza, entao o card usa:
  - Background: `atlas-surface-container-low` (`#f3f3f3`) — diferente do B1 para criar contraste visual no bento
  - Border-radius: 12px
  - Borda: 1px solida, cor `atlas-outline-variant` com opacidade 15%
  - Sombra: identica ao B1
  - Padding interno: 32px (`p-8`)

- [ ] **AC-P5-013**: Dado Card "Informacoes Rapidas", quando renderiza, entao o heading "Informacoes Rapidas" aparece com:
  - Fonte: Plus Jakarta Sans, peso 700, tamanho 1.25rem (20px)
  - Cor: `atlas-on-surface`
  - Margem inferior: 24px

- [ ] **AC-P5-014**: Dado Card "Informacoes Rapidas", quando renderiza, entao os 6 fatos sao organizados em grid 2 colunas x 3 linhas (`grid-cols-2`) com:
  - Gap vertical entre linhas: 32px (`gap-y-8`)
  - Gap horizontal entre colunas: 16px (`gap-x-4`)
  - Ordem de leitura: Clima (col1 row1), Moeda (col2 row1), Idioma (col1 row2), Fuso Horario (col2 row2), Tomada (col1 row3), DDI (col2 row3)

- [ ] **AC-P5-015**: Dado cada fato no Card "Informacoes Rapidas", quando renderiza, entao exibe:
  - Container: flex, flex-direction: column, gap: 4px
  - Linha de label: flex, items-center, gap: 8px — contendo:
    - Icone Material Symbols (FILL=0, tamanho 24px), cor `atlas-secondary` (`#904d00`)
    - Texto do label (ex: "Clima"): Work Sans, peso 700, tamanho 0.75rem (12px), caixa alta (`uppercase`), letter-spacing: 0.05em (`tracking-wider`)
    - Cor do texto do label: `atlas-secondary` (igual ao icone)
  - Valor abaixo do label: Work Sans, peso 700, tamanho 1.125rem (18px) (`text-lg`), cor `atlas-on-surface`

- [ ] **AC-P5-016**: Dado Card "Informacoes Rapidas" em estado de carregamento, quando renderiza, entao exibe 6 blocos skeleton com:
  - Cada bloco: retangulo `atlas-surface-container-high`, largura 80%, altura 42px, border-radius 4px, animacao pulse
  - Organizados no mesmo grid 2x3 com os gaps especificados no AC-P5-014

- [ ] **AC-P5-017**: Dado Card "Informacoes Rapidas" em tela mobile (< 768px), quando renderiza, entao o card ocupa 100% da largura. O grid interno mantém 2 colunas (nao colapsa para 1 coluna — os fatos sao curtos o suficiente para 2 colunas em qualquer largura >= 320px).

- [ ] **AC-P5-018**: Dado qualquer fato com valor nulo ou ausente no `quickFacts`, quando renderiza, entao exibe "—" (traco em) no lugar do valor, sem quebrar o layout.

---

### SECAO B3 — Card "Dicas de Seguranca" (5/10 colunas desktop)

**O que exibe**: Indicador de nivel de seguranca (badge colorido) + lista de 3-5 dicas de seguranca com icone de verificacao.

**Fonte dos dados**: `guideContent.safety.level`, `guideContent.safety.tips[]`.

**Mapeamento de niveis de seguranca**:

| Valor de `level` | Label exibido | Cor do badge | Cor do dot | Token de fundo |
|-----------------|---------------|--------------|------------|----------------|
| `safe` | "Seguro" | `atlas-on-tertiary-container` (#1c9a8e teal) | identico | `atlas-on-tertiary-container` com opacidade 10% |
| `moderate` | "Atencao" | `atlas-secondary` (#904d00 amber escuro) | identico | `atlas-secondary` com opacidade 10% |
| `caution` | "Cautela" | `atlas-error` (vermelho — ver token de erro) | identico | `atlas-error` com opacidade 10% |

**Criterios de Aceite**:

- [ ] **AC-P5-019**: Dado guia carregado e `NEXT_PUBLIC_DESIGN_V2=true`, quando o Card "Dicas de Seguranca" renderiza, entao o card usa:
  - Background: `atlas-surface-container-lowest` (branco puro)
  - Border-radius: 12px
  - Borda: 1px solida, cor `atlas-outline-variant` com opacidade 15%
  - Sombra: identica ao B1
  - Padding interno: 32px
  - Display: flex, flex-direction: column, justify-content: space-between (para que o conteudo se distribua verticalmente)

- [ ] **AC-P5-020**: Dado Card "Dicas de Seguranca", quando renderiza, entao a linha de header do card contem:
  - Heading "Dicas de Seguranca" com fonte Plus Jakarta Sans, peso 700, tamanho 1.25rem, cor `atlas-on-surface`
  - Badge de nivel alinhado a direita (flex justify-between) com:
    - Dot circular (8px diametro) na cor correspondente ao nivel (ver tabela)
    - Texto do nivel na cor correspondente ao nivel
    - Fonte Work Sans, peso 700, tamanho 0.75rem
    - Fundo: cor correspondente ao nivel com opacidade 10% (ver tabela)
    - Border-radius full
    - Padding horizontal 12px, vertical 4px
  - Margem inferior do header: 24px

- [ ] **AC-P5-021**: Dado Card "Dicas de Seguranca" com `safety.level = "safe"`, quando renderiza, entao:
  - Badge exibe "Seguro" em `atlas-on-tertiary-container` (#1c9a8e)
  - Fundo do badge e `atlas-on-tertiary-container` com 10% de opacidade
  - Dot e `atlas-on-tertiary-container`

- [ ] **AC-P5-022**: Dado Card "Dicas de Seguranca", quando a lista de dicas renderiza, entao cada item da lista `safety.tips[]` exibe:
  - Container: flex, gap: 12px, align-items: flex-start (topo — nao centro, para dicas longas)
  - Icone Material Symbols "verified" (FILL=0), cor `atlas-secondary-container` (#fe932c), tamanho 24px, flex-shrink: 0
  - Texto da dica: Work Sans, peso 400, tamanho 0.875rem (14px), cor `atlas-on-surface-variant`, line-height 1.5
  - Espacamento vertical entre dicas: 16px (`space-y-4`)

- [ ] **AC-P5-023**: Dado Card "Dicas de Seguranca" em estado de carregamento, quando renderiza, entao exibe:
  - Header row com dois skeletons: um retangulo largo (140px) para o heading e um retangulo pequeno (80px) para o badge
  - Tres linhas de skeleton de dica, cada uma com um circulo de 24px (icone) + retangulo de largura variavel (100%, 85%, 70%)

- [ ] **AC-P5-024**: Dado Card "Dicas de Seguranca" com lista de dicas vazia ou ausente, quando renderiza, entao exibe uma mensagem inline "Nenhuma dica de seguranca disponivel para este destino." em Work Sans, tamanho 14px, cor `atlas-on-surface-variant`. O badge de nivel ainda e exibido se `safety.level` estiver presente.

- [ ] **AC-P5-025**: Dado Card "Dicas de Seguranca" em tela mobile, quando renderiza, entao o card ocupa 100% da largura e todo o conteudo permanece legivel — o badge de nivel deve quebrar para uma nova linha abaixo do heading se o espaco for insuficiente para exibi-los lado a lado (flex-wrap: wrap, com o badge em nova linha).

---

### SECAO B4 — Card "Custos Medios" (5/10 colunas desktop)

**O que exibe**: Tabela de 4 itens de custo tipico + callout de dica local de economia.

**Fonte dos dados**: `guideContent.costs.items[]` (maximo 5 itens), `guideContent.costs.localTip`.

**Criterios de Aceite**:

- [ ] **AC-P5-026**: Dado guia carregado e `NEXT_PUBLIC_DESIGN_V2=true`, quando o Card "Custos Medios" renderiza, entao o card usa:
  - Background: `atlas-surface-container-lowest` (branco puro)
  - Border-radius: 12px
  - Borda: 1px solida, cor `atlas-outline-variant` com opacidade 15%
  - Sombra: identica ao B1
  - Padding interno: 32px

- [ ] **AC-P5-027**: Dado Card "Custos Medios", quando renderiza, entao o heading "Custos Medios" exibe com:
  - Fonte: Plus Jakarta Sans, peso 700, tamanho 1.25rem
  - Cor: `atlas-on-surface`
  - Margem inferior: 24px

- [ ] **AC-P5-028**: Dado Card "Custos Medios", quando a tabela de custos renderiza, entao cada item de `costs.items[]` exibe como uma linha de tabela com:
  - Container: flex, justify-content: space-between, align-items: center
  - Padding vertical por linha: 8px (`py-2`)
  - Separador inferior: borda 1px solida, cor `atlas-surface-container` — exceto na ultima linha, que nao tem borda inferior
  - Label do item (ex: "Refeicao (Economica)"): Work Sans, peso 500 (Medium), tamanho 1rem, cor `atlas-on-surface-variant`
  - Valor/faixa (ex: "€12.00 - €18.00"): Work Sans, peso 700, tamanho 1rem, cor `atlas-on-surface`

- [ ] **AC-P5-029**: Dado Card "Custos Medios", quando o callout de dica local renderiza, entao aparece abaixo da tabela com:
  - Container: fundo `atlas-surface-container-low`, border-radius 8px, padding 16px (`p-4`)
  - Display: flex, gap: 12px, align-items: center
  - Icone Material Symbols "lightbulb" (FILL=0), cor `atlas-secondary` (`#904d00`), tamanho 24px, flex-shrink: 0
  - Texto da dica (`costs.localTip`): Work Sans, peso 400, tamanho 0.75rem (12px), cor `atlas-on-primary-fixed-variant` (`#3e4758`)
  - Margem superior do callout em relacao a tabela: 24px

- [ ] **AC-P5-030**: Dado Card "Custos Medios" com `costs.localTip` ausente ou nulo, quando renderiza, entao o callout nao e exibido. A tabela ocupa todo o espaco disponivel sem gap extra.

- [ ] **AC-P5-031**: Dado Card "Custos Medios" em estado de carregamento, quando renderiza, entao exibe:
  - Skeleton do heading: retangulo `atlas-surface-container-high`, largura 130px, altura 20px
  - Quatro linhas de skeleton de tabela: cada linha com dois retangulos (label 60% / valor 30%) separados por espacamento, altura 16px
  - Skeleton do callout: retangulo `atlas-surface-container-high`, largura 100%, altura 48px, border-radius 8px

- [ ] **AC-P5-032**: Dado Card "Custos Medios" em tela mobile, quando renderiza, entao o card ocupa 100% da largura. As labels de custo que excedam uma linha podem quebrar (word-wrap: break-word) sem impactar o alinhamento do valor a direita.

---

### SECAO B5 — Card "O que nao perder" (10/10 colunas desktop)

**O que exibe**: Carrossel horizontal de cards de atracoes — cada atracao com imagem, nome e descricao curta.

**Fonte dos dados**: `guideContent.attractions[]` (minimo 3, maximo 8 atracoes).

**Criterios de Aceite**:

- [ ] **AC-P5-033**: Dado guia carregado e `NEXT_PUBLIC_DESIGN_V2=true`, quando o Card "O que nao perder" renderiza, entao o card container usa:
  - Background: `atlas-surface-container-lowest`
  - Border-radius: 12px
  - Borda: 1px solida, cor `atlas-outline-variant` com opacidade 15%
  - Sombra: identica ao B1
  - Padding interno: 32px
  - Largura: 100% do grid (10 colunas em desktop)

- [ ] **AC-P5-034**: Dado Card "O que nao perder", quando renderiza, entao o heading "O que nao perder" exibe com:
  - Fonte: Plus Jakarta Sans, peso 700, tamanho 1.25rem
  - Cor: `atlas-on-surface`
  - Margem inferior: 24px

- [ ] **AC-P5-035**: Dado Card "O que nao perder", quando o carrossel renderiza, entao a lista de atracoes e um container com:
  - Display: flex, flex-direction: row
  - `overflow-x: auto` (scroll horizontal)
  - `scroll-behavior: smooth`
  - `-webkit-overflow-scrolling: touch` (momentum scroll em iOS)
  - Padding inferior: 24px (`pb-6`) para nao cortar a sombra dos cards filhos
  - Gap entre cards: 24px
  - Scrollbar personalizada: altura 4px, track `atlas-surface-container-low`, thumb `atlas-secondary-container` (#fe932c), border-radius 10px

- [ ] **AC-P5-036**: Dado o carrossel de atracoes, quando cada card de atracao renderiza, entao o card usa:
  - Largura minima: 280px (`min-w-[280px]`) — nao flexiona para menos
  - Background: branco puro (`#ffffff`)
  - Border-radius: 12px
  - Overflow: hidden
  - Sombra leve: `box-shadow: 0px 2px 8px rgba(0,0,0,0.08)`
  - Em hover (desktop): imagem interna aplica `transform: scale(1.05)` com `transition: transform 500ms ease`

- [ ] **AC-P5-037**: Dado cada card de atracao no carrossel, quando renderiza, entao a zona de imagem exibe:
  - Altura: 160px (`h-40`)
  - Largura: 100% do card
  - `object-fit: cover`
  - Carregamento lazy
  - A imagem e buscada usando `attractions[n].imageQuery` como descricao textual para a integracao de banco de imagens. Em ausencia de imagem, exibir fundo `atlas-surface-container-high` como fallback.
  - O container da imagem tem `overflow: hidden` para conter o efeito de scale no hover

- [ ] **AC-P5-038**: Dado cada card de atracao no carrossel, quando a zona de texto renderiza, entao exibe:
  - Padding: 16px (`p-4`)
  - Nome da atracao (`attractions[n].name`): Plus Jakarta Sans, peso 700, tamanho 1rem, cor `atlas-on-surface`, margem inferior 4px
  - Descricao (`attractions[n].description`): Work Sans, peso 400, tamanho 0.75rem (12px), cor `atlas-on-surface-variant`, `line-clamp: 2` (no maximo 2 linhas — excesso e cortado com ellipsis)

- [ ] **AC-P5-039**: Dado Card "O que nao perder" em estado de carregamento, quando renderiza, entao exibe 4 placeholders de atracao no carrossel:
  - Cada placeholder: 280px de largura minima, border-radius 12px
  - Zona de imagem placeholder: altura 160px, `atlas-surface-container-high`, animacao pulse
  - Zona de texto placeholder: padding 16px, duas linhas de skeleton (100% e 70%), animacao pulse

- [ ] **AC-P5-040**: Dado o carrossel de atracoes, quando o usuario navega apenas com teclado, entao:
  - Cada card de atracao recebe foco com Tab
  - O card com foco tem um outline visivel (`outline: 2px solid atlas-secondary-container`, `outline-offset: 2px`)
  - O carrossel faz scroll automatico para manter o card com foco visivel (usando `scrollIntoView` ou comportamento nativo de foco)

- [ ] **AC-P5-041**: Dado o carrossel de atracoes em tela mobile (< 768px), quando renderiza, entao:
  - O carrossel e horizontalmente scrollavel por swipe
  - A primeira atracao e parcialmente visivel junto com a borda do segundo card (borda do 2o card "espiaando" indica que ha mais conteudo para rolar)
  - Os cards nao flexionam para menos de 240px de largura em telas menores

---

### SECAO C — Disclaimer Footer

**O que exibe**: Aviso de que o conteudo e gerado por IA com base em dados historicos e pode sofrer variacoes.

**Fonte dos dados**: Texto estatico (nao gerado por IA, nao configuravel pelo usuario).

**Texto exato**:
"Aviso: Os dados apresentados, incluindo custos e dicas, sao gerados por inteligencia artificial com base em padroes historicos e podem sofrer variacoes sazonais ou mudancas repentinas. Recomendamos a verificacao de informacoes criticas antes da viagem."

**Criterios de Aceite**:

- [ ] **AC-P5-042**: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 5 renderiza, entao o disclaimer aparece abaixo de todos os cards bento e acima da bottom action bar com:
  - Alinhamento: centralizado (`text-center`)
  - Largura maxima: 672px (`max-w-2xl`), centralizado horizontalmente
  - Fonte: Work Sans, tamanho 0.625rem (10px)
  - Cor: `atlas-on-surface-variant` com opacidade 60% (`text-on-surface-variant/60`)
  - Estilo: itálico
  - Line-height: 1.625 (relaxed)
  - Margem superior do disclaimer: 48px
  - Margem inferior: 80px (espaco antes da bottom bar)

- [ ] **AC-P5-043**: Dado tela de leitura de acessibilidade (screen reader), quando o disclaimer e lido, entao o elemento tem `role="note"` ou e wrapped em `<footer>` semantico para comunicar que e informacao suplementar, nao conteudo principal.

---

### SECAO D — Desktop Side Navigation (Phase 5 specific)

**O que exibe**: Sidebar de navegacao interna da Phase 5, visivel apenas em desktop (>= 1024px), com 5 links de secao e um botao de acao primaria.

**Nota de escopo**: A sidebar usa o framework do `PhaseShellV2` (SPEC-PROD-051), mas o conteudo dos links (quais secoes existem) e especifico de Phase 5 e definido aqui.

**Links da sidebar**:

| Icone | Label | Estado |
|-------|-------|--------|
| `map` | Visao Geral | Nao ativo |
| `event_note` | Itinerario | Nao ativo |
| `payments` | Gastos | Nao ativo |
| `verified_user` | Seguranca | **Ativo** (estado padrao ao entrar na fase) |
| `photo_camera` | Atracoes | Nao ativo |

**Criterios de Aceite**:

- [ ] **AC-P5-044**: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport >= 1024px, quando Phase 5 renderiza, entao a sidebar exibe o titulo "Fase 5" (Plus Jakarta Sans, peso 700, tamanho 1.125rem, cor `atlas-primary`) e o subtitulo "Guia de Destino" (Work Sans, tamanho 0.875rem, cor `atlas-on-surface-variant`), com margem inferior 24px.

- [ ] **AC-P5-045**: Dado sidebar de Phase 5, quando o link inativo renderiza, entao exibe:
  - Container: flex, items-center, gap: 12px, padding 12px x 16px, border-radius 8px
  - Icone Material Symbols (FILL=0), tamanho 24px, cor `atlas-on-surface-variant`
  - Texto: Work Sans, tamanho 0.875rem, peso 500, cor `atlas-on-surface-variant`
  - Em hover: fundo `atlas-surface-container` (`#eeeeee`), translate-x: 4px com transition
  - Sem borda ou sombra

- [ ] **AC-P5-046**: Dado sidebar de Phase 5, quando o link ativo ("Seguranca") renderiza, entao exibe:
  - Fundo: `atlas-secondary-container` (#fe932c)
  - Texto: `atlas-primary` (#040d1b navy)
  - Icone: `atlas-primary` (#040d1b navy)
  - Peso: 700
  - Sombra leve: `box-shadow: 0px 2px 8px rgba(254, 147, 44, 0.20)`
  - Estado: nao responde a hover da mesma forma (sem translate adicional — ja esta ativo)

- [ ] **AC-P5-047**: Dado sidebar de Phase 5, quando o botao "Finalizar Plano" renderiza na base da sidebar, entao exibe:
  - Largura: 100% da sidebar (`w-full`)
  - Background: `atlas-secondary-container` (#fe932c)
  - Texto: `atlas-primary` (#040d1b), Work Sans, peso 700, tamanho 0.875rem
  - Border-radius: 8px
  - Padding vertical: 12px
  - Sombra: `box-shadow: 0px 4px 16px rgba(254, 147, 44, 0.25)`
  - Em hover: `filter: brightness(1.05)`, transition
  - Posicionado no `mt-auto` (empurrado para a base da sidebar)

- [ ] **AC-P5-048**: Dado viewport < 1024px, quando Phase 5 renderiza, entao a sidebar de navegacao nao e exibida. Os links de secao da sidebar nao tem equivalente mobile nesta versao (acesso via scroll direto nos cards).

---

### SECAO E — Navigation Stepper + Breadcrumb

**O que exibe**: Breadcrumb de navegacao + stepper visual de fases, fixo abaixo do TopAppBar.

**Criterios de Aceite**:

- [ ] **AC-P5-049**: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 5 renderiza, entao o breadcrumb exibe: "Minhas Expedicoes > [nome da expedicao] > Guia do Destino" onde:
  - "Minhas Expedicoes" e "Guia do Destino" sao textos fixos
  - "[nome da expedicao]" e o `trip.name` (ou equivalente) da expedicao atual
  - Separadores sao o icone Material Symbols "chevron_right", tamanho 14px
  - Cor do texto: `atlas-on-surface-variant`
  - Fonte: Work Sans, tamanho 0.75rem (12px), peso 500
  - "Guia do Destino" (pagina atual) tem cor `atlas-on-surface` (mais escuro — indica pagina atual)

- [ ] **AC-P5-050**: Dado o stepper de fases, quando Phase 5 renderiza, entao:
  - Fases 1-4 (completas) exibem circulos de 24px com icone "check" (Material Symbols, FILL=1, tamanho 14px), cor dos icones e fundo: `atlas-tertiary-container` para o fundo, `atlas-on-tertiary-container` para o icone — indicando conclusao
  - Fase 5 (ativa) exibe um circulo maior (32px) com o numero "5" em Work Sans, peso 700, tamanho 0.875rem, fundo `atlas-secondary-container` (#fe932c), texto `atlas-on-secondary-container` (#663500), com sombra `box-shadow: 0px 4px 16px rgba(254, 147, 44, 0.20)`
  - Linhas conectoras entre circulos: 16px de largura, 2px de altura, cor `atlas-tertiary-container` para linhas entre fases completas, cor `atlas-secondary-container` para a linha imediatamente antes da fase ativa
  - Label "Fase 5: Guia" ao lado do stepper: Work Sans, peso 700, tamanho 0.75rem, cor `atlas-on-surface`

---

### SECAO F — Bottom Action Bar

**O que exibe**: Barra de navegacao fixa na base da tela com botao "Voltar", indicador de fase, e botao "Avancar".

**Criterios de Aceite**:

- [ ] **AC-P5-051**: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 5 renderiza, entao a bottom action bar aparece fixada na base da tela com:
  - Background: `rgba(255, 255, 255, 0.80)` com `backdrop-filter: blur(12px)` (glassmorphism)
  - Borda superior: 1px solida, cor `atlas-surface-container`
  - Padding: 16px horizontal, 16px vertical
  - Em desktop (>= 1024px): margem esquerda de 256px para nao sobrepor a sidebar (`lg:ml-64`)
  - z-index: suficiente para ficar acima do conteudo scrollavel (50 ou acima)

- [ ] **AC-P5-052**: Dado a bottom action bar, quando os botoes renderizam, entao:
  - Botao "Voltar": flex, items-center, gap: 8px, icone "arrow_back" + texto "Voltar", Work Sans peso 600, cor `atlas-on-surface`, fundo transparente, padding 8px x 16px, border-radius 8px, em hover: fundo `atlas-surface-container-low`
  - Indicador central: texto "Fase 5 de 8", Work Sans peso 700, tamanho 0.875rem, cor `atlas-on-surface-variant`
  - Botao "Avancar": flex, items-center, gap: 8px, texto "Avancar" + icone "arrow_forward", Work Sans peso 700, fundo `atlas-secondary-container` (#fe932c), texto `atlas-primary` (#040d1b), padding 12px x 32px, border-radius 8px, sombra `box-shadow: 0px 4px 16px rgba(254, 147, 44, 0.20)`, em hover: `filter: brightness(1.05)`

- [ ] **AC-P5-053**: Dado a bottom action bar e `prefers-reduced-motion: reduce`, quando o usuario interage com os botoes, entao as transicoes de hover sao suprimidas (nenhuma animacao de transicao e executada).

---

## 6. Comportamentos Globais

### 6.1 Estado de Carregamento (AI Gerando)

**Criterio de Aceite**:

- [ ] **AC-P5-054**: Dado que o conteudo do guia esta sendo gerado pela IA (estado loading), quando Phase 5 renderiza, entao:
  - O Page Header exibe skeletons (AC-P5-004)
  - O Bento Grid exibe todos os 5 cards em estado skeleton simultaneamente (ACs -010, -016, -023, -031, -039)
  - A bottom action bar permanece visivel e o botao "Avancar" esta desabilitado (visualmente com opacidade 40%, cursor: not-allowed) com tooltip "Aguardando geracao do guia..."
  - O estado de loading nao usa spinners circulares — exclusivamente skeletons com animacao pulse

### 6.2 Estado de Erro (Falha na Geracao)

- [ ] **AC-P5-055**: Dado que a geracao do guia falhou, quando Phase 5 renderiza, entao exibe um estado de erro inline dentro do canvas principal (nao uma tela de erro de pagina inteira) com:
  - Icone Material Symbols "error_outline", tamanho 48px, cor `atlas-on-surface-variant`
  - Titulo: "Nao foi possivel gerar o Guia do Destino", Plus Jakarta Sans peso 700, tamanho 1.25rem
  - Descricao: "Ocorreu um erro ao gerar o conteudo. Clique abaixo para tentar novamente." Work Sans, 0.875rem, cor `atlas-on-surface-variant`
  - Botao "Tentar novamente": usando `AtlasButton` (variante primaria), que dispara nova chamada de geracao de guia
  - O custo de PA para regeneracao e o mesmo da geracao inicial e e descontado ao confirmar (conforme gamificacao — ver ATLAS-GAMIFICACAO-APROVADO.md)
  - A bottom action bar permanece visivel com "Avancar" desabilitado

### 6.3 Feature Flag

- [ ] **AC-P5-056**: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando Phase 5 renderiza, entao nenhuma das alteracoes visuais descritas neste spec e aplicada. O componente V1 existente de Phase 5 renderiza sem alteracao.

- [ ] **AC-P5-057**: Dado que a flag e alternada de false para true em runtime (sem recarregar a pagina), quando Phase 5 e a proxima rota navegada, entao o layout V2 renderiza corretamente sem erros de hidratacao.

### 6.4 Acessibilidade

- [ ] **AC-P5-058**: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando Phase 5 e auditada com axe-core no modo WCAG 2.1 AA, entao zero violacoes sao reportadas.

- [ ] **AC-P5-059**: Dado o bento-grid com 5 cards, quando navegado apenas com teclado, entao a ordem de foco segue a ordem do DOM (B1 → B2 → B3 → B4 → B5), independente da ordem visual imposta pelo CSS grid em desktop.

- [ ] **AC-P5-060**: Dado qualquer imagem de destino ou atracao, quando renderizada, entao o atributo `alt` da imagem contem uma descricao significativa do conteudo visual — nunca `alt=""` para imagens de conteudo (reservado apenas para imagens decorativas).

- [ ] **AC-P5-061**: Dado o badge de nivel de seguranca, quando lido por screen reader, entao o nivel e comunicado textualmente — o dot colorido de indicacao de nivel nao e o unico indicador (cor sozinha nao e suficiente para acessibilidade). O texto do badge e suficiente.

- [ ] **AC-P5-062**: Dado o indicador de fase no stepper, quando lido por screen reader, entao o elemento ativo (fase 5) tem `aria-current="step"` e os circulos de fases completas tem `aria-label="Fase [N]: completa"`.

### 6.5 Performance

- [ ] **AC-P5-063**: Dado Phase 5 com guia carregado, quando a pagina e medida com Lighthouse em mobile simulado, entao o CLS (Cumulative Layout Shift) e menor que 0.1 — os skeletons devem ter as mesmas dimensoes dos elementos de conteudo final para evitar layout shift no momento em que o conteudo carrega.

- [ ] **AC-P5-064**: Dado as imagens do carrossel de atracoes, quando a pagina carrega, entao apenas a imagem da primeira atracao visivel e carregada eagerly; todas as demais usam `loading="lazy"`.

---

## 7. Escopo

### In Scope (Phase 5 Redesign)

- Todas as secoes descritas nas Secoes A-F acima
- Comportamentos globais (loading, erro, flag, acessibilidade, performance)
- Responsividade em 375px, 768px, 1024px, 1440px
- Integracao com `PhaseShellV2` (SPEC-PROD-051) como container pai
- Skeletons para todos os estados de carregamento
- Estado de erro com botao de regeneracao
- Componentes: `AtlasCard`, `AtlasButton`, `AtlasChip`, `AtlasBadge` do Component Library Sprint 38

### Out of Scope (v1 desta spec)

- Geracao do conteudo do guia (logica de AI call, prompt engineering — ver SPEC-AI correspondente)
- Integracao de mapa interativo dentro do card de atracoes
- Favoritar ou salvar atracoes individualmente
- Compartilhamento do guia como link publico (SPEC-PROD-014, deferred)
- Traducao automatica do guia para o idioma do usuario
- Ratings de atracoes (informacao nao disponivel no schema atual)
- Dark mode
- Animacoes de scroll reveal entre cards

---

## 8. Constraints

### Seguranca

- O conteudo do guia e especifico por usuario e viagem — nao pode ser cacheado em cache compartilhado de servidor (ex: Redis) com chave apenas do destino, pois diferentes usuarios podem ter guias personalizados para o mesmo destino.
- O `tripId` nos parametros de URL nao pode ser o unico mecanismo de autorizacao — o guard BOLA deve verificar que o `userId` da sessao autenticada e proprietario do `tripId`.

### Acessibilidade

- WCAG 2.1 AA minimo.
- Contraste de texto: todo texto sobre `atlas-secondary-container` (#fe932c) usa `atlas-primary` (#040d1b) — o unico par aprovado para contraste 4.5:1.
- `prefers-reduced-motion`: nenhuma animacao de hover (scale, translate) e executada quando a preferencia e "reduce".

### Performance

- Sem chamadas de AI adicionais disparadas pelo rendering da pagina — o guia e pre-gerado ou gerado sob demanda em acao explicita do usuario.
- Imagens de destino e atracoes devem ser lazy-loaded (exceto a primeira imagem visivel).
- CLS < 0.1 exigido.

### Restricoes Arquiteturais

- Nenhuma alteracao na logica de negocios de geracao de guia.
- Usar exclusivamente tokens `atlas-*` — nenhum valor hardcoded de cor no codigo V2.
- O componente V1 existente de Phase 5 nao pode ser alterado — o V2 e uma nova implementacao gateada pela flag.
- Tecnologia agnostica: esta spec nao referencia Next.js, React, Tailwind, ou bibliotecas especificas.

---

## 9. Dependencias

| Dependencia | Status | Nota |
|-------------|--------|------|
| SPEC-PROD-046 (Design System Foundation) | COMPLETO | Tokens atlas-* disponiveis |
| SPEC-PROD-047 (Component Library v1) | COMPLETO | AtlasCard, AtlasButton, AtlasChip, AtlasBadge disponiveis |
| SPEC-PROD-051 (Phase Shell V2) | Em desenvolvimento | Hard dependency — Phase 5 usa PhaseShellV2 como container |
| Stitch export Phase 5 | DISPONIVEL | `docs/design/stitch-exports/phase5_guia_destino/code.html` |
| UX Parecer Design System | DISPONIVEL | `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md` |
| guideContent schema | Existente | Validar schema atual contra campos definidos na Secao 3 |

---

## 10. Metricas de Sucesso

- Zero regressoes V1: todos os testes existentes de Phase 5 passam com `NEXT_PUBLIC_DESIGN_V2=false`.
- axe-core: zero violacoes AA na Phase 5 V2.
- CLS < 0.1 medido via Lighthouse mobile.
- Cobertura de testes >= 80% nos novos componentes V2 de Phase 5.
- UX Designer aprova fidelidade visual contra o Stitch export antes do merge do PR.
- Validacao interna qualitativa: em sessao de revisao interna, a Phase 5 V2 e descrita como "guia de viagem de qualidade premium" por pelo menos 3 de 3 revisores.

---

## 11. Referencia Visual — Resumo do Stitch Export

O Stitch export (`docs/design/stitch-exports/phase5_guia_destino/code.html`) usa Lisboa como destino de exemplo. A implementacao deve generalizar todos os valores especificos de Lisboa para qualquer destino.

### Tokens usados no Stitch (referencia direta)

| Elemento | Token Stitch | Token atlas-* correspondente |
|----------|-------------|------------------------------|
| Background da pagina | `#f9f9ff` | `atlas-surface` |
| Fundo card B1, B3, B4, B5 | `#ffffff` (surface-container-lowest) | `atlas-surface-container-lowest` |
| Fundo card B2 | `#f0f3ff` (surface-container-low) | `atlas-surface-container-low` |
| Heading H1 | `#121c2a` (on-surface) | `atlas-on-surface` |
| Texto secundario | `#554336` (on-surface-variant) | `atlas-on-surface-variant` |
| Icones de fatos rapidos | `#914d00` (primary no Stitch) | `atlas-secondary` (#904d00) |
| Badge "Gerado por IA" fundo | `#ffdcc3` (primary-fixed no Stitch) | `atlas-primary-fixed` (#dae3f7)* |
| CTA / indicador ativo | `#fe932c` (primary-container no Stitch) | `atlas-secondary-container` |
| Badge de seguranca teal | `#266861` (tertiary no Stitch) com 10% bg | `atlas-on-tertiary-container` (#1c9a8e) |
| Botao "Avancar" texto | `#663400` (on-primary-container no Stitch) | `atlas-primary` (#040d1b)** |
| TopAppBar fundo | `#040d1b` | `atlas-primary` |

> (*) O Stitch usa `primary-fixed = #ffdcc3` (peach) para o badge de IA. O token UX Parecer mapeia `atlas-primary-fixed = #dae3f7` (lavanda azul). Usar `atlas-primary-fixed` conforme o UX Parecer — e a fonte de verdade sobre o DESIGN.md e o Stitch no que se refere a mapeamento de tokens atlas-*.
>
> (**) O Stitch usa `on-primary-container` para texto do botao. O UX Parecer define que texto sobre `atlas-secondary-container` (#fe932c) usa `atlas-primary` (#040d1b) — o par de contraste aprovado. Seguir o UX Parecer.

---

## Change History

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-26 | product-owner | Spec inicial — detalhamento completo de Phase 5 a partir do Stitch export |
