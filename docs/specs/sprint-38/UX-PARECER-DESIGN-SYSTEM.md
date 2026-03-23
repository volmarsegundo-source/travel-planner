# UX Parecer: Fundacao do Design System — Sprint 38

**Version**: 1.0.0
**Status**: In Review
**Author**: ux-designer
**Date**: 2026-03-23
**Scope**: Full audit of DESIGN.md tokens, 5 Stitch screen exports, cross-screen consistency, component inventory, and implementation rules for tailwind.config.ts migration.

---

## Sumario Executivo

Analisei exaustivamente os 5 exports oficiais de tela (Landing Page, Dashboard, Phase 1 Wizard, Phase 3 O Preparo, Roteiro/Itinerario), o documento DESIGN.md, e o design system legado em ux-patterns.md. Este parecer e a decisao final sobre o que sera implementado, o que sera corrigido, e o que sera rejeitado.

**Veredito global**: O design exportado do Stitch apresenta uma linguagem visual coesa baseada no Material Design 3 color scheme, com dois pilares visuais claros (navy profundo + amber/laranja quente). Porem, o DESIGN.md atual e INSUFICIENTE para implementacao — esta incompleto, tem conflitos com a base de tokens legada, e omite dezenas de tokens efetivamente usados nos exports. Este parecer preenche todas as lacunas e se torna a fonte de verdade.

---

## SECAO 1: Tokens Aprovados para Implementacao Tailwind

### 1.1 Paleta de Cores

A paleta nos exports segue o sistema Material Design 3 (M3). Todos os 5 exports HTML usam a mesma configuracao de cores no Tailwind config — esta e consistente. Aprovo a adocao integral desta paleta com o prefixo `atlas-` no Tailwind config.

#### Cores Primarias (Brand)

| Token Tailwind | Hex | Descricao | Uso |
|---|---|---|---|
| `atlas-primary` | `#040d1b` | Navy quase-preto | Textos principais, headings, fundo hero escuro |
| `atlas-primary-container` | `#1a2332` | Navy profundo | Fundo de sidebar AI, secao escura, footer |
| `atlas-primary-fixed` | `#dae3f7` | Azul lavanda claro | Fundo de icones, badges informativos |
| `atlas-primary-fixed-dim` | `#bec7db` | Lavanda medio | Textos terciarios sobre fundo escuro |
| `atlas-on-primary` | `#ffffff` | Branco | Texto sobre primary |
| `atlas-on-primary-container` | `#818a9d` | Cinza-azulado | Texto muted sobre primary-container |
| `atlas-on-primary-fixed` | `#131c2a` | Navy escuro | Texto sobre primary-fixed bg |
| `atlas-on-primary-fixed-variant` | `#3e4758` | Cinza-navy | Icones sobre primary-fixed bg |
| `atlas-inverse-primary` | `#bec7db` | Lavanda | Texto primary em modo invertido |

#### Cores Secundarias (Accent/CTA — Amber/Laranja)

| Token Tailwind | Hex | Descricao | Uso |
|---|---|---|---|
| `atlas-secondary` | `#904d00` | Marrom-laranja escuro | Texto de link, labels de status, hover text |
| `atlas-secondary-container` | `#fe932c` | Laranja vibrante | CTA principal, progress ativo, badges de destaque |
| `atlas-secondary-fixed` | `#ffdcc3` | Peach claro | Fundo de badges, fundo de selecao suave |
| `atlas-secondary-fixed-dim` | `#ffb77d` | Peach medio | Texto sobre fundo escuro (dicas), labels |
| `atlas-on-secondary` | `#ffffff` | Branco | Texto sobre secondary |
| `atlas-on-secondary-container` | `#663500` | Marrom escuro | Texto sobre secondary-container |
| `atlas-on-secondary-fixed` | `#2f1500` | Marrom muito escuro | Texto sobre secondary-fixed bg |
| `atlas-on-secondary-fixed-variant` | `#6e3900` | Marrom medio | Icones sobre secondary-fixed bg |

#### Cores Terciarias (Teal/Verde-azulado)

| Token Tailwind | Hex | Descricao | Uso |
|---|---|---|---|
| `atlas-tertiary` | `#00100d` | Teal quase-preto | Texto terciario de destaque |
| `atlas-tertiary-container` | `#002824` | Teal muito escuro | Container terciario |
| `atlas-tertiary-fixed` | `#89f5e7` | Teal menta claro | Fundo de icones de acao (natureza, checklist) |
| `atlas-tertiary-fixed-dim` | `#6bd8cb` | Teal medio | Fundo de icones de acao (hover) |
| `atlas-on-tertiary` | `#ffffff` | Branco | Texto sobre tertiary |
| `atlas-on-tertiary-container` | `#1c9a8e` | Teal vibrante | Texto/icones sobre fundo claro (sucesso, AI) |
| `atlas-on-tertiary-fixed` | `#00201d` | Teal escuro | Texto sobre tertiary-fixed |
| `atlas-on-tertiary-fixed-variant` | `#005049` | Teal profundo | Icones sobre tertiary-fixed bg |

#### Superficies

| Token Tailwind | Hex | Descricao | Uso |
|---|---|---|---|
| `atlas-surface` | `#f9f9f9` | Cinza quase-branco | Background principal da app |
| `atlas-surface-dim` | `#dadada` | Cinza medio | Disabled, dividers pesados |
| `atlas-surface-bright` | `#f9f9f9` | = surface | Alias |
| `atlas-surface-variant` | `#e2e2e2` | Cinza claro | Fundos alternativos, separadores |
| `atlas-surface-tint` | `#565f70` | Cinza-azulado | Tint overlay (Material) |
| `atlas-surface-container-lowest` | `#ffffff` | Branco puro | Cards, formularios, superficies elevadas |
| `atlas-surface-container-low` | `#f3f3f3` | Cinza-gelo | Inputs (default bg), sidebar bg |
| `atlas-surface-container` | `#eeeeee` | Cinza leve | Containers secundarios |
| `atlas-surface-container-high` | `#e8e8e8` | Cinza medio | Chips nao selecionados, progress bg |
| `atlas-surface-container-highest` | `#e2e2e2` | Cinza | Container mais elevado, progress line bg |
| `atlas-background` | `#f9f9f9` | = surface | Alias (M3 legacy) |
| `atlas-on-surface` | `#1a1c1c` | Cinza-preto | Texto principal sobre surfaces |
| `atlas-on-surface-variant` | `#45474c` | Cinza escuro | Texto secundario, labels, descricoes |
| `atlas-on-background` | `#1a1c1c` | = on-surface | Alias |
| `atlas-inverse-surface` | `#2f3131` | Cinza-grafite | Fundo invertido (tooltips, toasts) |
| `atlas-inverse-on-surface` | `#f0f1f1` | Branco-gelo | Texto sobre inverse-surface |

#### Bordas e Outline

| Token Tailwind | Hex | Descricao | Uso |
|---|---|---|---|
| `atlas-outline` | `#75777d` | Cinza medio | Bordas de inputs focados, separadores fortes |
| `atlas-outline-variant` | `#c5c6cc` | Cinza claro | Bordas suaves de cards, dividers, borders de inputs |

#### Erro

| Token Tailwind | Hex | Descricao | Uso |
|---|---|---|---|
| `atlas-error` | `#ba1a1a` | Vermelho profundo | Texto de erro, icones de erro |
| `atlas-error-container` | `#ffdad6` | Rosa claro | Background de mensagens de erro |
| `atlas-on-error` | `#ffffff` | Branco | Texto sobre fundo error |
| `atlas-on-error-container` | `#93000a` | Vermelho escuro | Texto sobre error-container |

#### Tokens ADICIONADOS pelo UX (ausentes no DESIGN.md e nos exports, mas necessarios)

Estes tokens NAO existem nos exports Stitch, mas sao obrigatorios para estados que o design nao cobriu:

| Token Tailwind | Hex | Descricao | Justificativa |
|---|---|---|---|
| `atlas-warning` | `#f59e0b` | Amber | Avisos, limites proximos — exportado como amber-500 no landing (inline), precisa de token semantico |
| `atlas-warning-container` | `#fffbeb` | Amber palido | Background de avisos |
| `atlas-success` | `#10b981` | Emerald | Checklist concluido (usa green-600 inline no preparo export) — token semantico |
| `atlas-success-container` | `#ecfdf5` | Verde palido | Background de sucesso |
| `atlas-info` | `#3b82f6` | Azul | Mensagens informativas neutras |
| `atlas-info-container` | `#eff6ff` | Azul palido | Background informativo |
| `atlas-focus-ring` | `#fe932c` | = secondary-container | Ring de foco para acessibilidade — usa a cor CTA |
| `atlas-disabled` | `#9ca3af` | Gray-400 | Texto e borda de elementos desabilitados |
| `atlas-disabled-bg` | `#f3f4f6` | Gray-100 | Background de elementos desabilitados |

#### Cores Externas ao Sistema (usadas inline nos exports — NAO aprovar como tokens)

Os exports usam diretamente classes Tailwind padrao (`slate-*`, `amber-*`, `emerald-*`, `blue-*`, `green-*`) em varios locais. Estas NAO devem se tornar tokens do design system. Quando encontradas no codigo, devem ser mapeadas para o token semantico mais proximo:

| Classe Tailwind usada | Mapear para token |
|---|---|
| `slate-900` | `atlas-primary` ou `atlas-primary-container` |
| `slate-500` / `slate-400` | `atlas-on-surface-variant` ou `atlas-outline` |
| `slate-50` | `atlas-surface-container-low` |
| `amber-500` | `atlas-secondary-container` |
| `amber-600` | hover de `atlas-secondary-container` |
| `green-600` / `green-50` | `atlas-success` / `atlas-success-container` |
| `amber-50` / `amber-200` | `atlas-secondary-fixed` / `atlas-warning-container` |

**REGRA CRITICA**: Nenhum dev deve usar classes Tailwind padrao (slate, amber, green, etc.) no codigo final. Apenas tokens `atlas-*`.

### 1.2 Tipografia

O DESIGN.md lista "Plus Jakarta Sans" como fonte principal, com "Sora/Outfit" como alternativa. Os exports usam consistentemente:

| Funcao | Fonte nos Exports | Decisao |
|---|---|---|
| Headlines (H1-H4) | Plus Jakarta Sans | **APROVADO** |
| Body text | Work Sans | **APROVADO** |
| Labels | Work Sans | **APROVADO** |

**CONFLITO com legado**: O ux-patterns.md especifica `Inter` como fonte. A decisao e: **o design Stitch prevalece**. Plus Jakarta Sans e Work Sans substituem Inter.

#### Escala Tipografica Aprovada

| Token | Tamanho | Peso | Line Height | Letter Spacing | Uso |
|---|---|---|---|---|---|
| `atlas-text-display` | 60-72px | 800 (ExtraBold) | 1.1 | -0.02em | Hero headlines (landing) |
| `atlas-text-h1` | 36-48px | 800 (ExtraBold) | 1.1 | -0.02em | Page titles, phase headers |
| `atlas-text-h2` | 28-36px | 700 (Bold) | 1.2 | -0.01em | Section titles, card group headers |
| `atlas-text-h3` | 20-24px | 700 (Bold) | 1.3 | 0 | Card titles, subsection headers |
| `atlas-text-h4` | 18px | 700 (Bold) | 1.4 | 0 | Sidebar headers, small section titles |
| `atlas-text-body` | 16px | 400 (Regular) | 1.6 | 0 | Main body text, paragraphs |
| `atlas-text-body-medium` | 16px | 500 (Medium) | 1.6 | 0 | Emphasized body, form descriptions |
| `atlas-text-small` | 14px | 500-600 | 1.5 | 0 | Form labels, metadata, sidebar items |
| `atlas-text-caption` | 12px | 600-700 (Semibold-Bold) | 1.4 | 0.05-0.2em | Badges, category headers, overlines |
| `atlas-text-micro` | 10px | 700 (Bold) | 1.4 | 0.1-0.2em | Tags, tiny badges ("PROXIMA PARADA") |
| `atlas-text-button` | 14-16px | 700 (Bold) | 1 | 0 | Button labels |

**DESIGN.md esta INCOMPLETO**: Lista apenas 4 tamanhos (36, 24, 16, 14). Os exports usam pelo menos 8 tamanhos distintos incluindo 10px, 12px, 48px, e 72px. A escala acima e a correta.

#### Font Family Config para Tailwind

```js
fontFamily: {
  'atlas-headline': ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
  'atlas-body': ['"Work Sans"', 'system-ui', '-apple-system', 'sans-serif'],
}
```

**Fontes carregadas**: Plus Jakarta Sans (400, 500, 600, 700, 800), Work Sans (400, 500). Carregamento via `next/font` (nao Google Fonts CDN) para performance e privacidade.

### 1.3 Espacamento

O DESIGN.md lista apenas 3 valores vagos (24px mobile gutter, 80px+ desktop gutter, 32px card padding). Isto e insuficiente.

#### Escala de Espacamento Aprovada (base 4px)

Mantemos a escala do ux-patterns.md (ja implementada) com adicoes:

| Token | Valor | Uso nos exports |
|---|---|---|
| `atlas-space-0.5` | 2px | Micro gaps |
| `atlas-space-1` | 4px | Gaps minimos entre icones |
| `atlas-space-1.5` | 6px | Padding interno de badges |
| `atlas-space-2` | 8px | Gap entre chips, padding interno xs |
| `atlas-space-3` | 12px | Gap entre itens de lista, padding interno sm |
| `atlas-space-4` | 16px | Padding base de componentes, gap de grid |
| `atlas-space-5` | 20px | Padding medio |
| `atlas-space-6` | 24px | Gutter mobile, padding de cards, gap de secoes |
| `atlas-space-8` | 32px | Padding generoso de cards (exports usam p-8) |
| `atlas-space-10` | 40px | Padding de cards hero (exports usam p-10) |
| `atlas-space-12` | 48px | Espacamento entre secoes (mobile) |
| `atlas-space-16` | 64px | Espacamento entre secoes (tablet) |
| `atlas-space-20` | 80px | Gutter desktop lateral |
| `atlas-space-24` | 96px | Espacamento entre secoes (desktop) |
| `atlas-space-30` | 120px | Section spacing landing page |

#### Layout Constraints

| Constraint | Valor | Fonte |
|---|---|---|
| Max content width | `max-w-screen-2xl` (1536px) | Todos os 5 exports |
| Max form content | `max-w-3xl` (768px) | Phase 1 Wizard |
| Sidebar width | 256px (`w-64`) | Dashboard, Preparo, Roteiro |
| Navbar height | 64px (`h-16`) | Todos os exports |
| Mobile bottom nav height | ~60px | Dashboard export |

### 1.4 Border Radius

O DESIGN.md lista 3 niveis. Os exports usam mais. Escala aprovada:

| Token | Valor | Tailwind Class | Uso |
|---|---|---|---|
| `atlas-radius-sm` | 4px | `rounded` | DEFAULT border-radius |
| `atlas-radius-md` | 8px | `rounded-lg` | Botoes, inputs, icone containers |
| `atlas-radius-lg` | 12px | `rounded-xl` | Cards padrao, panels, sidebar items ativos |
| `atlas-radius-xl` | 16px | `rounded-2xl` | Cards de destaque, badges grandes, quick actions |
| `atlas-radius-2xl` | 24px | `rounded-3xl` | Cards hero, image containers, map containers |
| `atlas-radius-full` | 9999px | `rounded-full` | Avatares, pills, badges, chips, progress dots, steppers |

**NOTA**: O DESIGN.md diz "Cards: 16px (rounded-2xl)". Nos exports, cards usam `rounded-xl` (12px), `rounded-2xl` (16px), e `rounded-3xl` (24px) dependendo da hierarquia. A escala acima e a verdade observada.

### 1.5 Sombras

O DESIGN.md lista apenas 2 sombras. Os exports usam mais. Escala aprovada:

| Token | Valor | Uso |
|---|---|---|
| `atlas-shadow-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Sidebar items hover, micro elevation |
| `atlas-shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | Cards em repouso, nav bar, sidebar items ativos |
| `atlas-shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Botoes CTA, cards hover, stepper ativo |
| `atlas-shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Cards hero, CTA principal, modals |
| `atlas-shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | Trip card image, overlays elevados |
| `atlas-shadow-2xl` | `0 25px 50px -12px rgb(0 0 0 / 0.25)` | Modais, dialogs |
| `atlas-shadow-glow-amber` | `0 0 12px rgba(254, 147, 44, 0.4)` | Progress step ativo (glow effect) |
| `atlas-shadow-glow-primary` | `0 0 12px rgba(4, 13, 27, 0.2)` | Botoes primary hover |

**NOTA**: As sombras do DESIGN.md ("Soft Layered" e "Elevated Card") correspondem a `atlas-shadow-md` e `atlas-shadow-xl` respectivamente. O DESIGN.md nao estava errado, apenas incompleto.

### 1.6 Transicoes e Animacao

| Token | Valor | Uso |
|---|---|---|
| `atlas-transition-fast` | `150ms ease` | Hover em links, color changes |
| `atlas-transition-base` | `200ms ease` | Hover em cards, botoes, traduzir interacoes |
| `atlas-transition-slow` | `300ms ease` | Expansao de paineis, transicoes de tela |
| `atlas-transition-image` | `700ms ease` | Zoom de imagens em hover (exports usam duration-700) |
| `atlas-transition-progress` | `1000ms ease` | Animacao de progress bar fill |

Todas as animacoes DEVEM respeitar `prefers-reduced-motion: reduce` — substituir por `transition: none` ou opacidade simples.

---

## SECAO 2: Inventario de Componentes

### 2.1 Button

**Prioridade**: P0 (bloqueia todos os fluxos)

#### Variantes

| Variante | Background | Text | Border | Shadow | Uso |
|---|---|---|---|---|---|
| Primary | `atlas-secondary-container` (#fe932c) | `atlas-on-secondary-container` (#663500) ou white | none | `atlas-shadow-md` + glow amber/20% | CTA principal: "Avancar", "Comece Sua Viagem" |
| Primary Dark | `atlas-primary` (#040d1b) | `atlas-on-primary` (#fff) | none | `atlas-shadow-lg` + primary/10% | "Editar Roteiro", "Atlas AI", Send icon |
| Secondary | `atlas-surface-container-lowest` (#fff) | `atlas-primary` (#040d1b) | `atlas-outline-variant`/20% | `atlas-shadow-sm` | "Compartilhar", "Baixar PDF", "Como Funciona" |
| Ghost | transparent | `atlas-on-surface-variant` (#45474c) | none | none | "Salvar rascunho", inline text links |
| Glass | white/10% + backdrop-blur | white | white/30% | none | Hero secondary CTA sobre imagem |
| Icon-only | transparent ou surface | `atlas-on-surface-variant` | none | none | Notificacoes, premium, send |
| Danger | vermelho (a definir) | white | none | shadow-sm | Acoes destrutivas — NAO presente nos exports, adicionar |

#### Estados

| Estado | Comportamento |
|---|---|
| Default | Conforme variante acima |
| Hover | Primary: opacity 90% ou bg mais escuro. Secondary: shadow-md. Ghost: text mais escuro |
| Active | `scale-[0.95]` ou `scale-[0.98]` com `duration-200` (presente em TODOS exports) |
| Focus | Ring 2px `atlas-focus-ring` com offset 2px |
| Disabled | opacity 50%, cursor not-allowed, sem hover/active |
| Loading | Spinner inline, texto mantido, pointer-events none |

#### Tamanhos

| Tamanho | Padding | Font | Min Height | Min Touch |
|---|---|---|---|---|
| sm | `px-4 py-2` | 14px semibold | 36px | 36px (somente desktop) |
| md | `px-6 py-3` | 14px bold | 44px | 44px |
| lg | `px-8 py-4` ou `px-12 py-4` | 16px bold | 48px | 48px |

#### Acessibilidade

- [x] Contraste texto/fundo: primary CTA = branco (#fff) sobre #fe932c = **3.0:1** — **FALHA** para texto normal WCAG AA (precisa 4.5:1)
- **CORRECAO OBRIGATORIA**: O texto do botao primary CTA DEVE usar `atlas-on-secondary-container` (#663500 marrom escuro) em vez de branco, OU o fundo deve escurecer para pelo menos `#c67000`. Os exports mostram `text-primary` (navy) em alguns CTAs e `text-white` em outros — o navy (#040d1b) sobre #fe932c = **7.5:1** PASSA.
- **DECISAO**: Botoes Primary CTA usam texto `atlas-primary` (#040d1b) sobre `atlas-secondary-container` (#fe932c). Nunca texto branco sobre laranja.
- [x] Touch target minimo 44x44px (lg e md atendem; sm apenas desktop)
- [x] Focus ring visivel
- [x] `role="button"` implicito em `<button>`

### 2.2 Input

**Prioridade**: P0 (bloqueia formularios)

#### Variantes

| Variante | Uso |
|---|---|
| Text | Campos de texto simples (origem, destino) |
| Search | Com icone a esquerda (material icon `map`, `flight_takeoff`) |
| Textarea | Textarea expansivel (chat input no Preparo) |
| Date | Input de data (ida/volta) |
| Checkbox | Checkbox padrao ("Datas flexiveis?") |

#### Estilos Observados nos Exports

| Propriedade | Valor |
|---|---|
| Background (default) | `atlas-surface-container-low` (#f3f3f3) |
| Background (focus) | `atlas-surface-container-lowest` (#fff) — muda para branco |
| Border (default) | transparent |
| Border (focus) | `atlas-secondary-container` (#fe932c) |
| Text | `atlas-on-surface` (#1a1c1c) |
| Placeholder | slate-400 → mapear para `atlas-outline-variant` (#c5c6cc) |
| Height | `py-4` (48px total incluindo padding) para inputs grandes, `py-3` para compactos |
| Border radius | `rounded-lg` (8px) |
| Focus ring | `ring-0` nos exports — **CORRECAO**: DEVE ter focus ring visivel `ring-2 ring-atlas-focus-ring` |
| Icon left padding | `pl-12` quando tem icone, `pl-4` sem icone |

#### Estados

| Estado | Comportamento |
|---|---|
| Default | Bg surface-container-low, border transparent |
| Focus | Bg branco, border secondary-container, ring visivel |
| Error | Border atlas-error, ring atlas-error, mensagem abaixo |
| Disabled | Bg disabled-bg, text disabled, cursor not-allowed |
| Filled | Bg branco (se focado antes), text on-surface |

#### Acessibilidade

- [x] Todos inputs DEVEM ter `<label>` visivel associado — os exports usam labels em Bold acima dos inputs
- [x] `aria-required` em campos obrigatorios
- [x] `aria-invalid="true"` + `aria-describedby` em estado de erro
- **CORRECAO**: Os exports usam `focus:ring-0` — isto REMOVE o indicador de foco. NAO IMPLEMENTAR. Substituir por `focus:ring-2 focus:ring-atlas-secondary-container focus:ring-offset-2`.
- [x] Height minima 44px para touch targets

### 2.3 Card

**Prioridade**: P0 (componente mais usado)

#### Variantes

| Variante | Background | Border | Radius | Shadow | Uso |
|---|---|---|---|---|---|
| Base Card | `atlas-surface-container-lowest` (#fff) | `atlas-outline-variant`/10-20% | `rounded-xl` (12px) ou `rounded-2xl` (16px) | `atlas-shadow-sm` | Cards padrao (phase cards, action cards, planning items) |
| Hero Card | imagem + gradient overlay | none | `rounded-3xl` (24px) | `atlas-shadow-xl` | Trip card com imagem (dashboard, landing) |
| Dark Card | `atlas-primary-container` (#1a2332) | none | `rounded-2xl` (16px) | none | Cards "Dica do Especialista", AI section |
| Stat Card | white | `atlas-outline-variant`/10% | `rounded-2xl` (16px) | `atlas-shadow-sm` | Clima, distancia (roteiro sidebar) |
| Phase Card | `atlas-surface-container-lowest` | none | `rounded-xl` | `atlas-shadow-sm` | Cards das 8 fases (landing) |
| Interactive Card | `atlas-surface-container-lowest` | `atlas-outline-variant`/10% | `rounded-2xl` | hover: `atlas-shadow-md` | Quick actions (dashboard) |
| Selectable Card | varies | border 2px (transparent → secondary-container quando selecionado) | `rounded-xl` | none | Tipo de viagem (Phase 1), interesses (Preparo) |
| Tip Card | amber-50/custom | amber-200/50% border | `rounded-2xl` | `atlas-shadow-sm` | Dica do Atlas (Phase 1 sidebar) |

#### Hover Behavior

- Phase cards: `translate-y-[-4px]` com `transition-transform duration-300`
- Hero cards: imagem interna faz `scale-110` com `duration-700`
- Interactive cards: shadow aumenta para `atlas-shadow-md`
- Badge cards: `translate-y-[-2px]`

#### Acessibilidade

- Cards clicaveis: DEVEM ter `role="link"` ou ser `<a>` com `href`
- Cards com acoes internas: acoes devem ser `<button>` distintos, nao card inteiro clicavel
- Contraste de texto sobre gradientes: verificar caso a caso
- `alt` descritivo em todas as imagens dentro de cards

### 2.4 Chip/Tag

**Prioridade**: P1

#### Variantes

| Variante | Uso | Estilo |
|---|---|---|
| Selectable Chip | Destinos sugeridos, tipos de viagem, interesses | `rounded-full`, bg surface-container-high, hover: secondary-container + text white |
| Selected Chip | Estado selecionado | `bg-secondary-container text-white shadow-sm` |
| Budget Chip | Economico/Conforto/Premium | `rounded-full px-6 py-3`, bg surface-container-high |
| Category Label | CULTURA & PRAIA, ECOTURISMO | `rounded-full`, bg secondary-container, text-white ou text-on-secondary-container, text micro uppercase tracking-widest |
| Badge Tag | "12 dias", "2 viajantes" | bg primary-container ou secondary-fixed, text micro bold uppercase |

#### Acessibilidade

- Chips selecionaveis: `role="checkbox"` ou `role="radio"` dependendo se multi ou single select
- Minimo 44px height em mobile (exports usam `py-1.5` = ~28px — **CORRECAO NECESSARIA** para mobile: aumentar para `py-2.5` minimo)
- Estado selecionado: NAO comunicar apenas por cor — incluir checkmark icon ou border visivel
- `aria-pressed` ou `aria-checked` conforme role

### 2.5 Badge

**Prioridade**: P1

#### Variantes

| Variante | Estilo | Uso |
|---|---|---|
| Rank Badge | bg primary, text white, rounded-full, text-sm bold | "Nivel 12 - Explorador Nato" |
| Status Badge | bg secondary-container, text white, rounded-full, text-micro uppercase | "PROXIMA PARADA" |
| PA Badge | bg surface-container-low, border outline-variant/10, rounded-full | "180 PA" com icone |
| Category Overline | text-secondary font-bold text-xs uppercase tracking-widest | "STATUS DO ROTEIRO", "ACOES RAPIDAS" |
| Counter Badge | bg primary-container ou secondary-fixed, rounded-full, text-micro bold | "12 dias", "2 viajantes" |
| AI Tip Badge | text-xs font-bold uppercase tracking-widest text-secondary-fixed-dim | "DICA DO ATLAS", "DICA DO ESPECIALISTA" |
| Live Badge | bg secondary-container, text white, text-micro, rounded-full, uppercase | "Live Map" |

#### Acessibilidade

- Badges informativos: `role="status"` ou `aria-label` descritivo
- Badges interativos (PA): devem ter focus ring e ser keyboard accessible
- Contraste: verificar texto micro branco sobre laranja (mesma issue do botao)

### 2.6 PhaseProgress

**Prioridade**: P0 (presente em 3 dos 5 exports)

#### Variantes Observadas

Os exports mostram 3 representacoes DIFERENTES de progress, o que e um problema de consistencia:

1. **Dashboard progress bar**: 8 segmentos horizontais finos (`h-1.5`), secondary-container para completados, surface-container-high para pendentes. Segmento ativo tem glow.
2. **Phase 1 Wizard progress**: 8 circulos numerados conectados por linha, secondary-container para ativo (com ring), white+border para pendentes, surface-container-low+lock para bloqueados.
3. **O Preparo progress**: 4 circulos com icones (check, edit, map, celebration), linha de progresso preenchida ate metade.

**DECISAO**: Padronizar em DOIS componentes:
- `UnifiedProgressBar` (para wizards): Circulos numerados com labels, linha de conexao, 3 estados (completed/active/pending/locked)
- `DashboardProgressBar` (para cards): Segmentos finos horizontais, 2 estados (completed/pending) com glow no ativo

Isto e coerente com as decisoes de SPEC-UX-026 e SPEC-UX-019 ja aprovadas em sprints anteriores.

#### Estados do Step

| Estado | Circulo | Label | Linha |
|---|---|---|---|
| Completed | bg secondary-container, check icon, text white | text-primary font-semibold | bg secondary-container (filled) |
| Active | bg secondary-container (ou primary), icon, text white, ring 4px white + glow | text-primary font-bold | parcialmente filled |
| Pending | bg white, border outline-variant, numero text slate-400 | text slate-400 medium | bg surface-container-highest |
| Locked | bg surface-container-low, lock icon, text slate-300 | text slate-300 | bg surface-container-highest |

#### Acessibilidade

- `role="progressbar"` com `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Ou `role="list"` com `role="listitem"` para cada step
- Labels de step legiveis por screen reader
- NAO depender apenas de cor — icone de check para completado, lock para bloqueado

### 2.7 StepperInput (Passenger Count)

**Prioridade**: P1

Observado no Phase 1 Wizard export.

| Propriedade | Valor |
|---|---|
| Container | bg surface-container-low, rounded-lg, p-3 |
| Minus button | w-8 h-8 rounded-full, bg white, border outline-variant/30 |
| Plus button | identico ao minus |
| Value display | text-sm font-bold, zero-padded ("02") |
| Label | text-sm font-medium text-slate-600 |

#### Acessibilidade

- **CORRECAO**: Botoes w-8 h-8 (32px) = **FALHA** touch target 44px. AUMENTAR para w-11 h-11 (44px) em mobile.
- `role="spinbutton"` com `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `aria-label` no container ("Numero de viajantes")
- Botoes: `aria-label="Diminuir"` e `aria-label="Aumentar"`

### 2.8 Dialog/Modal

**Prioridade**: P1

NAO presente em nenhum dos 5 exports. Deve ser definido com base em padroes ja aprovados em sprints anteriores (SPEC-UX-031, SPEC-UX-041).

| Propriedade | Valor |
|---|---|
| Overlay | bg black/50% ou primary/50% com backdrop-blur |
| Container | bg surface-container-lowest, rounded-2xl, shadow-2xl, max-w-md |
| Header | text-h3 font-bold text-primary + close button |
| Body | text-body text-on-surface-variant |
| Footer | flex gap-3 justify-end, botoes secondary + primary |
| Animation | fade-in + scale from 95% to 100%, 200ms ease-out |

#### Acessibilidade

- `role="dialog"` com `aria-modal="true"`
- `aria-labelledby` apontando para titulo
- Focus trap: Tab cycling dentro do modal
- Escape fecha e retorna foco ao trigger
- Primeiro elemento focavel recebe foco ao abrir

### 2.9 Toast

**Prioridade**: P2

NAO presente nos exports. Definido por padroes ja aprovados.

| Variante | Left Border | Icon Color | Uso |
|---|---|---|---|
| Success | atlas-success | atlas-success | Acao concluida, fase avancada |
| Error | atlas-error | atlas-error | Falha de acao |
| Warning | atlas-warning | atlas-warning | Limite proximo, aviso |
| Info | atlas-info | atlas-info | Informacao neutra |
| Badge Unlock | atlas-secondary-container | sparkles | Conquista desbloqueada (com confetti) |

Container: bg surface-container-lowest, rounded-lg, shadow-lg, auto-dismiss 4s com progress bar.

#### Acessibilidade

- `role="alert"` para erros, `role="status"` para sucesso/info
- `aria-live="assertive"` para erros, `aria-live="polite"` para outros
- Nao bloquear foco — toast nao deve receber foco automaticamente
- Botao de fechar acessivel (se presente)

### 2.10 Navigation

**Prioridade**: P0

#### TopNav (Header)

Presente em todos os 5 exports, consistente:

| Propriedade | Valor |
|---|---|
| Background | white/80% + backdrop-blur-xl |
| Height | 64px (h-16) |
| Position | sticky top-0 z-50 |
| Shadow | shadow-sm |
| Max width | max-w-screen-2xl |
| Logo | "Atlas" text-2xl font-bold text-slate-900 tracking-tight |
| Nav links | text-slate-500, hover text-slate-700, ativo: text-slate-900 font-semibold border-b-2 border-amber-500 pb-1 |
| Right side | notifications icon + premium icon + avatar 32px |

#### Sidebar (SideNav)

Presente em Dashboard, Preparo, Roteiro (3 de 5 exports):

| Propriedade | Valor |
|---|---|
| Width | 256px (w-64) |
| Background | slate-50 (light) / slate-950 (dark) |
| Border | border-r border-slate-200/50 |
| Position | fixed left-0 ou sticky top-0 |
| Visibility | hidden on mobile, flex on md+ |
| Items | flex items-center gap-3 px-3 py-2, text-slate-500, hover bg-slate-100 + translate-x-1 |
| Active item | bg white, text-slate-900, shadow-sm, rounded-lg |
| AI button | bg primary-container, text white/teal, rounded-xl, with sparkle icon |
| Footer | settings + logout links |

**INCONSISTENCIA**: No Dashboard export, a sidebar inclui o logo "Atlas". No Preparo export, a sidebar NAO tem logo (esta no topbar). No Roteiro export, ambos existem. **DECISAO**: Logo sempre no TopNav. Sidebar nunca tem logo.

#### Mobile Bottom Nav

Presente apenas no Dashboard export:

| Propriedade | Valor |
|---|---|
| Position | fixed bottom-0, z-60 |
| Background | white/80% + backdrop-blur-xl |
| Border | border-t border-slate-100 |
| Items | 3 items: Explorar, Viagens, Perfil com icon + text-10px |
| Active | text-slate-900 font-semibold, icon filled |
| Inactive | text-slate-400 |

**NOTA**: Touch targets dos itens da bottom nav devem ter area minima 44x44px.

#### Breadcrumb

Presente apenas no Phase 1 Wizard:

| Propriedade | Valor |
|---|---|
| Separator | material icon chevron_right, text-slate-400 |
| Items | text-slate-500 text-sm font-medium |
| Current | text-slate-900 font-semibold border-b-2 border-slate-900 pb-1 |

#### Footer

Presente em todos os 5 exports, consistente:

| Propriedade | Valor |
|---|---|
| Background | slate-900 |
| Border top | border-slate-800 |
| Padding | pt-16 pb-8 |
| Grid | 1 col mobile, 4 col md+ |
| Logo | "Atlas" text-xl font-black text-white |
| Section headers | text-white font-bold mb-6 |
| Links | text-slate-400, hover text-white, underline-offset-4 |
| Copyright | text-slate-500 text-sm, border-t border-slate-800 |

---

## SECAO 3: Correcoes Necessarias no DESIGN.md

### 3.1 Problemas Criticos

| # | Problema | Severidade | Correcao |
|---|---|---|---|
| C1 | **Paleta de cores insuficiente**: Lista 7 tokens. Os exports usam 40+ tokens do Material Design 3. | CRITICO | Substituir pela paleta completa da Secao 1 deste parecer |
| C2 | **Tipografia incompleta**: Lista 4 tamanhos. Exports usam 8+. Nao lista line-heights para todos. | CRITICO | Substituir pela escala da Secao 1.2 |
| C3 | **Font family ambigua**: Diz "Plus Jakarta Sans (ou Sora/Outfit como alternativa)". Nao menciona Work Sans que e a body font real. | CRITICO | Definir: Headline = Plus Jakarta Sans, Body = Work Sans. Sem alternativas. |
| C4 | **Border radius incompleto**: Lista 3 valores. Exports usam 6. | ALTO | Substituir pela escala da Secao 1.4 |
| C5 | **Spacing vago**: Apenas 3 guidelines textuais, sem escala numerica. | CRITICO | Adotar escala 4px da Secao 1.3 |
| C6 | **Sombras insuficientes**: Apenas 2. Exports usam 6+ incluindo glow effects. | ALTO | Substituir pela escala da Secao 1.5 |
| C7 | **Componentes superficiais**: Lista 3 componentes com 1 linha cada. Nao cobre estados, variantes, acessibilidade. | CRITICO | Usar inventario da Secao 2 como referencia |

### 3.2 Inconsistencias entre DESIGN.md e Exports

| # | DESIGN.md diz | Exports mostram | Decisao |
|---|---|---|---|
| I1 | `color-navy-900: #1a2332` como "cor principal" | `primary: #040d1b` e a cor principal, `primary-container: #1a2332` e container | **Exports prevalecem** |
| I2 | `color-amber-500: #f59e0b` para CTAs | `secondary-container: #fe932c` para CTAs (mais alaranjado) | **Exports prevalecem**: #fe932c e o CTA real |
| I3 | `color-teal-600: #0d9488` para sucesso | `on-tertiary-container: #1c9a8e` para teal nos exports | **Exports prevalecem** |
| I4 | Input height `h-48px` | Exports usam `py-4` (height depende de content+padding) | **Ambos aceitaveis**: min-height 48px |
| I5 | `color-gray-50: #fafafa` como bg | `surface: #f9f9f9` nos exports | **Exports prevalecem**: diferenca minima mas manter consistente |
| I6 | Nao menciona Work Sans | Todos exports usam Work Sans para body | **Adicionar ao DESIGN.md** |

### 3.3 Inconsistencias entre Exports

| # | Onde | Problema | Decisao |
|---|---|---|---|
| E1 | Landing Page | Usa classes `slate-*` e `amber-*` diretamente no markup (nao via tokens) enquanto outros exports usam tokens M3 | **Normalizar**: todos devem usar tokens atlas-* |
| E2 | Dashboard sidebar | Tem logo "Atlas" na sidebar; Preparo nao tem | **Logo sempre no TopNav, nunca na sidebar** |
| E3 | Phase 1 header | Usa `fixed top-0` (muda scroll behavior). Outros usam `sticky top-0`. | **Padronizar `sticky top-0`** |
| E4 | Landing Page | Hero text subtitle em INGLES ("Atlas is the seasoned travel companion...") | **Bug de export**: todo texto deve ser portugues |
| E5 | CTA text color | Landing usa `text-on-secondary-container` (#663500 marrom); Phase 1 usa `text-primary` (#040d1b navy); dashboard usa `text-white` | **Padronizar**: `text-primary` (#040d1b) sobre secondary-container para AA compliance |
| E6 | Sidebar AI button | Dashboard: `bg-primary-container text-on-tertiary-container`; Preparo: `bg-primary-container text-white/on-primary-container`; Roteiro: `bg-primary text-white` | **Padronizar**: `bg-primary-container text-white` com icone `text-secondary-container` |
| E7 | Phase progress | 3 designs completamente diferentes nos 3 exports que mostram progress | **Ver Secao 2.6**: padronizar em 2 componentes |

---

## SECAO 4: Diretrizes de Acessibilidade

### 4.1 Analise de Contraste — Pares Criticos

| Par de Cores | Ratio | WCAG AA Normal | WCAG AA Large | Status |
|---|---|---|---|---|
| `on-surface` (#1a1c1c) sobre `surface` (#f9f9f9) | **14.9:1** | PASSA | PASSA | OK |
| `on-surface` (#1a1c1c) sobre `surface-container-lowest` (#fff) | **16.3:1** | PASSA | PASSA | OK |
| `on-surface-variant` (#45474c) sobre `surface` (#f9f9f9) | **7.5:1** | PASSA | PASSA | OK |
| `on-surface-variant` (#45474c) sobre `surface-container-lowest` (#fff) | **8.2:1** | PASSA | PASSA | OK |
| `primary` (#040d1b) sobre `secondary-container` (#fe932c) | **7.5:1** | PASSA | PASSA | OK |
| **white (#fff) sobre `secondary-container` (#fe932c)** | **2.3:1** | **FALHA** | **FALHA** | **CRITICO** |
| `on-secondary-container` (#663500) sobre `secondary-container` (#fe932c) | **3.4:1** | **FALHA** (normal) | PASSA (large) | **ATENCAO** |
| `secondary` (#904d00) sobre `surface` (#f9f9f9) | **5.2:1** | PASSA | PASSA | OK |
| `on-primary` (#fff) sobre `primary-container` (#1a2332) | **13.5:1** | PASSA | PASSA | OK |
| `on-primary-container` (#818a9d) sobre `primary-container` (#1a2332) | **3.6:1** | **FALHA** (normal) | PASSA (large) | **CORRIGIR** |
| `outline` (#75777d) sobre `surface` (#f9f9f9) | **3.9:1** | **FALHA** (normal) | PASSA (large) | **CORRIGIR p/ borda** |
| `outline-variant` (#c5c6cc) sobre `surface-container-lowest` (#fff) | **1.8:1** | **FALHA** | **FALHA** | OK para bordas decorativas, FALHA para texto |
| `error` (#ba1a1a) sobre `surface` (#f9f9f9) | **6.4:1** | PASSA | PASSA | OK |
| `secondary-fixed-dim` (#ffb77d) sobre `primary-container` (#1a2332) | **6.8:1** | PASSA | PASSA | OK |
| Slate-400 (#94a3b8) sobre white (#fff) | **3.0:1** | **FALHA** | PASSA (large) | **Placeholder text**: aceitavel como AAA fails gracefully |

### 4.2 Falhas de Contraste que DEVEM ser Corrigidas

| # | Problema | Localizacao | Correcao |
|---|---|---|---|
| A1 | **Branco sobre laranja CTA**: 2.3:1 | Botoes CTA em Landing e Dashboard | Texto = `atlas-primary` (#040d1b) sobre `atlas-secondary-container`. NUNCA texto branco sobre laranja. |
| A2 | **on-primary-container sobre primary-container**: 3.6:1 para texto normal | Sidebar AI button text, labels em fundo escuro | Usar texto branco (#fff) para textos normais. Manter #818a9d apenas para texto large (18px+ bold). |
| A3 | **Outline sobre surface**: 3.9:1 para texto | Labels de formulario se usarem cor outline | Nunca usar `atlas-outline` como cor de texto normal. Usar `atlas-on-surface-variant` (#45474c, 7.5:1). |

### 4.3 Requisitos de Touch Target

| Componente | Tamanho nos Exports | Minimo WCAG | Status | Correcao |
|---|---|---|---|---|
| Botao CTA (lg) | 48px+ | 44px | PASSA | — |
| Botao CTA (md) | 44px | 44px | PASSA | — |
| Navigation icon buttons | p-2 (~40px) | 44px | **FALHA** | Aumentar para p-2.5 ou min-w-11 min-h-11 |
| Stepper +/- buttons | w-8 h-8 (32px) | 44px | **FALHA** | Aumentar para w-11 h-11 (44px) em mobile |
| Chip/tag (destino sugerido) | py-1.5 (~28px) | 44px | **FALHA** | Aumentar para py-2.5 min-h-11 em mobile |
| Bottom nav items | Inadequado | 44px | **VERIFICAR** | Garantir area de toque minima |
| Avatar | w-8 h-8 (32px) | 44px | **FALHA** | Se clicavel: aumentar hit area com padding ou pseudo-element |
| Checkbox | w-4 h-4 (16px) | 44px | **FALHA** | Usar `<label>` como area de toque expandida (ja presente no export) |

### 4.4 Focus Indicator

**PROBLEMA CRITICO**: Os exports usam `focus:ring-0` em inputs, o que REMOVE o indicador de foco. Isto e uma violacao WCAG 2.1 AA (criterio 2.4.7 Focus Visible).

**Regra para implementacao**:
- Todos elementos interativos: `focus-visible:ring-2 focus-visible:ring-atlas-secondary-container focus-visible:ring-offset-2`
- Em fundo escuro: `focus-visible:ring-atlas-secondary-fixed-dim`
- Usar `focus-visible` (nao `focus`) para evitar ring em click de mouse

### 4.5 Reduced Motion

Todas as animacoes nos exports (hover translate, scale, image zoom, progress bar, glow pulse) DEVEM ser desabilitadas com:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4.6 Screen Reader Requirements por Componente

| Componente | Requisito |
|---|---|
| TopNav | `<nav aria-label="Navegacao principal">`, link ativo com `aria-current="page"` |
| Sidebar | `<nav aria-label="Menu do planejamento">`, item ativo com `aria-current="true"` |
| Progress bar | `role="progressbar"` com `aria-valuenow/min/max` e `aria-label` descritivo |
| Hero card image | `alt` descritivo do destino, nao do efeito visual |
| Phase cards | `role="list"` container, `role="listitem"` cada card |
| Selectable chips | `role="checkbox"` ou `role="radio"`, `aria-checked` |
| Badge icons | Se decorativo: `aria-hidden="true"`. Se informativo: `aria-label` |
| Stepper | `role="spinbutton"`, `aria-valuenow/min/max`, `aria-label` |
| Mobile bottom nav | `<nav aria-label="Navegacao rapida">` |
| AI tip sections | `role="complementary"` ou `<aside>`, `aria-label="Dica do Atlas"` |

---

## SECAO 5: Regras de Implementacao para Devs

### 5.1 Nomenclatura de Tokens

- **Prefixo**: Todos os tokens de cor usam prefixo `atlas-` no Tailwind config
- **Mapeamento**: `colors.atlas.primary`, `colors.atlas['secondary-container']`, etc.
- **Uso em classes**: `bg-atlas-primary`, `text-atlas-on-surface`, `border-atlas-outline-variant`
- **CSS custom properties**: Gerar automaticamente via Tailwind plugin para uso em CSS arbitrario quando necessario

```js
// tailwind.config.ts (parcial)
theme: {
  extend: {
    colors: {
      atlas: {
        primary: '#040d1b',
        'primary-container': '#1a2332',
        'primary-fixed': '#dae3f7',
        // ... todos os tokens da Secao 1.1
      }
    },
    fontFamily: {
      'atlas-headline': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      'atlas-body': ['"Work Sans"', 'system-ui', 'sans-serif'],
    },
    borderRadius: {
      'atlas-sm': '4px',
      'atlas-md': '8px',
      'atlas-lg': '12px',
      'atlas-xl': '16px',
      'atlas-2xl': '24px',
    },
    boxShadow: {
      'atlas-xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      'atlas-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      // ... todos da Secao 1.5
    }
  }
}
```

### 5.2 Quando Usar CSS Custom Properties vs Tailwind Classes

| Caso | Abordagem |
|---|---|
| Componentes React/JSX | Classes Tailwind: `className="bg-atlas-primary text-atlas-on-primary"` |
| Temas ou dark mode | CSS custom properties: `var(--atlas-primary)` |
| Animacoes/keyframes | CSS custom properties em `@keyframes` |
| Valores calculados | CSS custom properties com `calc()` |
| **Default**: sempre preferir Tailwind classes. Custom properties sao excecao. |

### 5.3 Regras de Composicao de Componentes

1. **Componentes atomicos primeiro**: Button, Input, Badge, Chip sao atomicos. Card, Dialog, Toast compoem atomicos.
2. **Variantes via props, nao classes**: `<Button variant="primary" size="lg">` nao `<Button className="bg-atlas-secondary-container...">`. Internamente, o componente mapeia variante para classes.
3. **cva (class-variance-authority)** ou equivalente para gerenciar variantes. Ja usado com shadcn/ui no projeto.
4. **Slots para composicao**: Cards devem aceitar children, nao ter 15 props para cada secao.
5. **Forwardref**: Todos componentes interativos devem forwardar ref para o elemento DOM raiz.

### 5.4 Feature Flag

- **Flag**: `NEXT_PUBLIC_DESIGN_V2=true`
- **Estrategia**: Novos componentes sao criados em `src/components/ui/` (ou `src/components/atlas/`)
- **Migracao progressiva**: Paginas migram uma a uma, flag controla qual versao renderizar
- **Nao duplicar logica**: Apenas a camada de apresentacao muda. Hooks, actions, services permanecem identicos.

### 5.5 O Que Devs NUNCA Devem Fazer

| Regra | Justificativa |
|---|---|
| **NUNCA usar classes de cor padrao Tailwind** (slate-500, amber-500, etc.) | Todas as cores devem vir dos tokens atlas-*. Hardcode quebra temas e dark mode. |
| **NUNCA usar valores arbitrarios** (`bg-[#fe932c]`) | Indica token ausente. Reportar ao UX para adicionar. |
| **NUNCA omitir focus-visible** em elementos interativos | WCAG AA nao-negociavel. PR sera rejeitado. |
| **NUNCA usar texto branco sobre atlas-secondary-container** | Falha de contraste 2.3:1. Usar atlas-primary como texto. |
| **NUNCA criar animacao sem prefers-reduced-motion** | Acessibilidade de motion nao-negociavel. |
| **NUNCA omitir aria-label em icon buttons** | Botoes so com icone sao invisiveis para screen readers. |
| **NUNCA usar font-size < 12px** para texto informativo | Legibilidade minima. 10px permitido apenas para badges decorativos. |
| **NUNCA fazer card inteiro clicavel se tem acoes internas** | Nested interactive = confusao para assistive tech. |
| **NUNCA carregar fontes via Google Fonts CDN** | Usar next/font para self-hosting. Privacidade + performance. |

---

## SECAO 6: Status de Aprovacao por Componente

### Tokens

| Item | Status | Condicoes |
|---|---|---|
| Paleta de cores (40 tokens M3) | **APROVADO** | Usar paleta da Secao 1.1 exatamente como documentado |
| Tokens semanticos adicionados (warning, success, info, disabled) | **APROVADO** | Obrigatorios — exports nao os tinham mas sao necessarios |
| Tipografia (Plus Jakarta Sans + Work Sans) | **APROVADO** | Carregar via next/font; incluir escala completa da Secao 1.2 |
| Espacamento (escala 4px) | **APROVADO** | Manter escala do ux-patterns.md, adicionar space-0.5, space-1.5, space-30 |
| Border radius (6 niveis) | **APROVADO** | Escala da Secao 1.4 |
| Sombras (8 niveis incluindo glow) | **APROVADO** | Escala da Secao 1.5 |
| Transicoes (5 niveis) | **APROVADO** | Com prefers-reduced-motion obrigatorio |

### Componentes

| Componente | Status | Condicoes |
|---|---|---|
| **Button** | **APROVADO COM CONDICOES** | (1) Texto CTA primary DEVE ser #040d1b (navy), NUNCA branco sobre laranja. (2) Touch target minimo 44px para md e lg. (3) Variante Danger deve ser adicionada (nao esta nos exports). |
| **Input** | **APROVADO COM CONDICOES** | (1) REMOVER focus:ring-0 dos exports — substituir por focus-visible:ring-2. (2) Placeholder cor nao pode ser outline-variant (#c5c6cc, 1.8:1) para texto obrigatorio — manter como hint apenas. |
| **Card** | **APROVADO** | 8 variantes documentadas na Secao 2.3 cobrem todos os casos dos exports. |
| **Chip/Tag** | **APROVADO COM CONDICOES** | (1) Touch target minimo 44px height em mobile — aumentar padding. (2) Estado selecionado deve ter indicador visual alem de cor (checkmark ou border). |
| **Badge** | **APROVADO** | 7 variantes documentadas. Verificar contraste caso a caso (especialmente branco sobre laranja). |
| **PhaseProgress** | **APROVADO COM CONDICOES** | (1) Padronizar em 2 componentes (Unified e Dashboard) conforme Secao 2.6. (2) NAO implementar as 3 variantes divergentes dos exports. (3) Seguir decisoes de SPEC-UX-026 e SPEC-UX-019. |
| **StepperInput** | **APROVADO COM CONDICOES** | (1) Botoes +/- DEVEM ter 44x44px em mobile (exports tem 32px — FALHA). (2) role="spinbutton" obrigatorio. |
| **Dialog/Modal** | **APROVADO** | Nao presente nos exports — seguir padroes de SPEC-UX-031 e SPEC-UX-041 ja aprovados. Focus trap obrigatorio. |
| **Toast** | **APROVADO** | Nao presente nos exports — seguir padroes ja aprovados. Auto-dismiss 4s com progress bar. |
| **Navigation (TopNav)** | **APROVADO COM CONDICOES** | (1) Icon buttons devem ter 44px touch area (exports tem ~40px). (2) Avatar se clicavel precisa de hit area expandida. |
| **Navigation (Sidebar)** | **APROVADO COM CONDICOES** | (1) Logo NUNCA na sidebar, apenas no TopNav. (2) AI button padronizar bg/text conforme Secao 2.10. |
| **Navigation (Bottom Nav)** | **APROVADO** | Verificar touch targets 44px em todos os itens. |
| **Navigation (Footer)** | **APROVADO** | Consistente em todos exports. |
| **Navigation (Breadcrumb)** | **APROVADO** | Padrao simples, sem issues. |

---

## Resumo de Acoes Obrigatorias Antes da Implementacao

1. **DESIGN.md deve ser REESCRITO** usando este parecer como fonte. O documento atual e inadequado para guiar implementacao.
2. **Paleta de contraste corrigida**: Texto sobre CTA laranja = navy, nunca branco.
3. **Focus indicators adicionados**: Todos exports omitem — implementacao DEVE adicionar.
4. **Touch targets corrigidos**: Steppers, chips, icon buttons, avatar — todos abaixo de 44px nos exports.
5. **Tokens semanticos adicionados**: warning, success, info, disabled, focus-ring — ausentes nos exports.
6. **Fontes via next/font**: Nao usar Google Fonts CDN (presente nos exports como referencia).
7. **Progress bar padronizado**: 2 variantes, nao 3.
8. **Sidebar sem logo**: Corrigir inconsistencia entre exports.
9. **prefers-reduced-motion**: Implementar globalmente para todas as animacoes.

---

> Este parecer e a fonte de verdade para a implementacao do Design System no Sprint 38. Qualquer duvida ou divergencia deve ser resolvida com o ux-designer antes de codificar. Nenhum componente deve ser implementado sem atender as condicoes listadas na Secao 6.

> **Status**: APROVADO PARA IMPLEMENTACAO COM CONDICOES DOCUMENTADAS ACIMA.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-23 | ux-designer | Full UX audit of Stitch design exports and DESIGN.md |
