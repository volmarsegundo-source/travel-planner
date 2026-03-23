---
spec_id: SPEC-PROD-048
title: Landing Page V2
version: 1.0.0
status: Draft
sprint: 39
owner: product-owner
created: 2026-03-23
updated: 2026-03-23
feature_flag: NEXT_PUBLIC_DESIGN_V2
design_reference: docs/design/stitch-exports/atlas_landing_page_a_inspira_o/code.html
token_reference: docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md
screen_index: docs/design/SCREEN-INDEX.md
---

# SPEC-PROD-048: Landing Page V2

## Contexto e Problema

A landing page atual do Atlas foi construida com classes Tailwind ad-hoc sem aderencia ao design system aprovado. Ela nao reflete o posicionamento visual premium e aventureiro definido no design Stitch, nao usa os tokens `atlas-*`, nao usa as fontes corretas (Plus Jakarta Sans / Work Sans), e nao transmite ao visitante a proposta de valor da plataforma com a qualidade visual esperada para o lancamento.

Resultado: primeira impressao aquem do potencial do produto, com risco direto de menor taxa de conversao na tela mais vista por usuarios nao-autenticados.

O Sprint 38 construiu a infraestrutura necessaria (tokens, componentes, feature flag). O Sprint 39 aplica essa infraestrutura na primeira tela real: a landing page.

## User Story

As a @leisure-solo visitando o Atlas pela primeira vez,
I want to see a landing page that immediately conveys the product's quality, adventure spirit, and AI-powered value proposition,
so that I feel confident signing up and starting my first expedition.

## Traveler Context

- **Pain point**: A landing page atual nao diferencia o Atlas de outros planejadores genericos. Visitantes nao conseguem entender em 5 segundos por que o Atlas e melhor.
- **Current workaround**: Usuarios chegam via indicacao (boca a boca) e toleram a landing fraca porque ja tem contexto previo. Para escalar aquisicao organica e paga, isso nao funciona.
- **Frequency**: 100% dos novos usuarios passam por esta tela. E o maior ponto de alavancagem de conversao do produto.

## Escopo

### O que esta spec cobre
- Criacao do componente `LandingPageV2` com todas as secoes definidas no Stitch export
- Integracao com `DesignBranch` para alternancia entre V1 e V2 via feature flag
- Responsividade completa: 375px / 768px / 1024px / 1440px
- Internacionalizacao: pt-BR (primario) e en (secundario)
- Performance: hero image lazy-loaded, fontes preloaded via `next/font`

### O que esta spec NAO cobre
- Alteracao da LandingPageV1 existente (permanece intacta)
- Booking ou integracao com GDS
- Pagina de destinos dinamicos (curadoria editorial — sprint futuro)
- Newsletter backend (campo presente no footer e ornamental em V1; integrar com plataforma de email em sprint dedicado)

## Secoes da Landing Page V2

### Secao 1 — Hero

**Referencia Stitch**: linhas 110-135 do code.html

Layout de tela cheia com imagem de fundo (paisagem brasileira — Chapada Diamantina no export), overlay gradiente `from-atlas-primary/80 via-atlas-primary/40 to-transparent`, e bloco de conteudo alinhado a esquerda no maximo de `max-w-3xl`.

Elementos obrigatorios:
- Badge pill: "A Nova Era do Planejamento" — `atlas-secondary-container` bg, `atlas-on-secondary-container` text, uppercase, tracking-widest
- Headline H1: "A unica plataforma que acompanha sua viagem do inicio ao fim" — `atlas-text-display` (60-72px), `Plus Jakarta Sans`, ExtraBold 800, texto branco, line-height 1.1
- Subtitulo: texto branco/80%, Work Sans, 18-20px, max-w-2xl
- CTA primario: AtlasButton variant="primary" size="lg" — "Comece Sua Viagem Agora" + icone `arrow_forward`
- CTA secundario: AtlasButton variant="glass" size="lg" — "Como Funciona" (scroll ancora para secao de fases)
- Imagem hero: full-bleed, object-cover, lazy-loaded, `min-h-[921px]` no desktop

### Secao 2 — As 8 Fases da Sua Jornada

**Referencia Stitch**: linhas 136-187 do code.html

Background `atlas-surface`, grid 4 colunas no desktop, 2 no tablet, 1 no mobile.

Elementos obrigatorios:
- Header de secao: H2 "As 8 Fases da Sua Jornada", subtitulo explicativo
- 8 cards de fase (AtlasCard variant="default"):
  1. A Inspiracao — icone `auto_awesome`
  2. O Perfil — icone `person_pin`
  3. O Preparo — icone `task_alt`
  4. A Logistica — icone `map`
  5. Guia do Destino — icone `explore`
  6. Roteiro — icone `calendar_today`
  7. Assistencia — icone `support_agent`
  8. Memorias — icone `photo_library`
- Cada card: icone `atlas-secondary` 40px, H3 fase, descricao breve, hover `translate-y-[-4px]` com `atlas-transition-base`
- Fases 7 e 8 devem ter indicacao visual de "em breve" (AtlasBadge "Em Breve") sem link ativo

### Secao 3 — AI Assistant

**Referencia Stitch**: linhas 188-223 do code.html

Background `atlas-primary-container` (navy escuro), layout two-column no desktop (texto esquerda, mockup direita).

Elementos obrigatorios:
- H2: "Viaje com o Seu Assistente Atlas AI" — texto branco, `atlas-text-h1`
- Descricao: `atlas-primary-fixed-dim`, 18px, max-w-xl
- Lista de features com checkmarks `check_circle` em `atlas-secondary`
- CTA inline: "Explorar tecnologia AI" com icone `trending_flat`, texto `atlas-secondary-fixed-dim`
- Mockup visual: container glass (`bg-white/5 backdrop-blur-2xl`, `rounded-3xl`, `border border-white/10`)
- Floating card sobre mockup: pergunta de exemplo ao AI, `atlas-secondary-container` bg

### Secao 4 — Gamification

**Referencia Stitch**: linhas 224-270 do code.html

Background `atlas-surface`, showcase do sistema de rankings e badges PA.

Elementos obrigatorios:
- H2: "Suba de Nivel Como Viajante"
- Descricao do sistema PA (pontos, recompensas)
- 3 cards de badge (AtlasCard): Explorador Nato, Lendario, Guardiao da Natureza
- Cada badge card: avatar circular com glow effect, titulo, descricao de conquista
- Indicador de nivel do usuario logado (condicional — mostrar so se sessao ativa)

### Secao 5 — Destinos em Destaque

**Referencia Stitch**: linhas 272-317 do code.html

Background branco (`atlas-surface-container-lowest`), grid asimetrico 12 colunas.

Elementos obrigatorios:
- H2: "Destinos em Destaque" + link "Ver Todos os Destinos"
- Card grande (7/12 colunas): Rio de Janeiro — `h-[500px]`, `rounded-3xl`, overlay gradiente, badge categoria, CTA
- Card medio (5/12 colunas): Bonito
- Card panoramico (12/12 colunas): Pantanal — `h-[400px]`
- Todos os cards: hover `scale-110` na imagem com `atlas-transition-image` (700ms)
- Badge categoria: `atlas-secondary-container` pill
- Imagens: usar Next.js `<Image>` com placeholder blur, lazy loading

**Nota para implementacao**: as imagens do Stitch sao do Lh3 Googleusercontent (geradas por AI no Stitch). A equipe deve substituir por imagens reais via unsplash ou acervo proprio com licenca apropriada.

### Secao 6 — Footer V2

**Referencia Stitch**: linhas 319-354 do code.html

Background `atlas-primary-container` (equivalente ao `slate-900` do export, mapeado para token atlas).

Colunas (4 no desktop, stack no mobile):
1. Brand: logo "Atlas", tagline
2. Explorar: Guias de Destino, Seguro Viagem, Blog Editorial
3. Empresa: Sobre Nos, Contato, Privacidade (link para `/privacy` existente)
4. Novidades: campo de email (input ornamental em V1) + botao de envio

Rodape: copyright "Atlas Travel Planner" + ano dinamico

## Acceptance Criteria

### Renderizacao e Feature Flag

- [ ] AC-001: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando o usuario acessa `/`, entao a LandingPageV1 e renderizada (comportamento atual sem alteracao)
- [ ] AC-002: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario acessa `/`, entao a LandingPageV2 e renderizada com todas as 6 secoes
- [ ] AC-003: Dado qualquer valor da flag, quando o usuario troca de V1 para V2 ou vice-versa em desenvolvimento, entao nao ha erros de hidratacao no console

### Hero

- [ ] AC-004: Dado viewport desktop (>=1024px), quando a pagina carrega, entao a hero section tem altura minima de 921px com imagem cobrindo toda a area
- [ ] AC-005: Dado viewport mobile (375px), quando a pagina carrega, entao o headline H1 e legivel (minimo 36px) sem overflow horizontal
- [ ] AC-006: Dado que o usuario clica no CTA "Comece Sua Viagem Agora", entao e redirecionado para `/auth/register` (usuario nao autenticado) ou `/expeditions` (usuario autenticado)
- [ ] AC-007: Dado que o usuario clica em "Como Funciona", entao a pagina scrolla suavemente ate a secao de 8 fases

### Fases

- [ ] AC-008: Dado viewport desktop, quando a secao de fases e renderizada, entao os 8 cards estao em grid 4x2 com hover lift de 4px
- [ ] AC-009: Dado qualquer viewport, quando a secao e renderizada, entao as Fases 7 e 8 exibem AtlasBadge "Em Breve" e nao possuem link ativo

### Tokens e Design System

- [ ] AC-010: Dado o codigo fonte do componente, quando inspecionado, entao nenhuma classe Tailwind padrao sem prefixo `atlas-` e usada para cores (exceto utilitarios: `w-`, `h-`, `flex`, `grid`, etc.)
- [ ] AC-011: Dado o componente renderizado, quando inspecionado no DevTools, entao a fonte dos headings e "Plus Jakarta Sans" e a fonte do body e "Work Sans"
- [ ] AC-012: Dado o CTA primario, quando renderizado, entao o contraste texto/fundo e >= 4.5:1 (texto `atlas-primary` #040d1b sobre `atlas-secondary-container` #fe932c = 7.5:1)

### Responsividade

- [ ] AC-013: Dado viewport 375px, quando renderizado, entao todas as secoes sao usaveis sem scroll horizontal e com touch targets >= 44px
- [ ] AC-014: Dado viewport 768px (tablet), quando renderizado, entao o grid de fases exibe 2 colunas e o layout AI section empilha verticalmente
- [ ] AC-015: Dado viewport 1440px, quando renderizado, entao o conteudo e limitado a `max-w-screen-2xl` com gutter lateral adequado

### Performance

- [ ] AC-016: Dado o carregamento inicial, quando medido pelo Lighthouse, entao o LCP (Largest Contentful Paint) e <= 2.5s em conexao 3G simulada
- [ ] AC-017: Dado a hero image, quando inspecionada no HTML, entao possui `loading="lazy"` (exceto a imagem acima da dobra, que deve ter `priority` via Next.js Image)
- [ ] AC-018: Dado as fontes Plus Jakarta Sans e Work Sans, quando o HTML e inspecionado, entao ha `<link rel="preload">` para os pesos utilizados

### Acessibilidade

- [ ] AC-019: Dado qualquer elemento interativo (botoes, links), quando navegado via teclado, entao o indicador de foco e visivel com ring 2px `atlas-focus-ring` (#fe932c) e offset 2px
- [ ] AC-020: Dado o componente, quando validado com axe-core, entao zero violations de nivel A e AA sao reportadas
- [ ] AC-021: Dado que o usuario tem `prefers-reduced-motion: reduce`, quando a pagina e renderizada, entao todas as animacoes (hover scale, translate) sao desativadas

### Internacionalizacao

- [ ] AC-022: Dado `locale=pt-BR`, quando renderizado, entao todo o texto e em portugues brasileiro
- [ ] AC-023: Dado `locale=en`, quando renderizado, entao todo o texto e em ingles com mesma estrutura de layout

### Testes

- [ ] AC-024: Dado o componente, quando os testes unitarios sao executados, entao a cobertura de renderizacao e >= 80% das branches condicionais
- [ ] AC-025: Dado E2E com flag ON, quando executado, entao todas as 6 secoes sao renderizadas e o CTA principal navega corretamente
- [ ] AC-026: Dado E2E com flag OFF, quando executado, entao a LandingPageV1 e renderizada sem regressao visual (screenshot comparison)

## Out of Scope (v1)

- Integracao backend para newsletter (campo de email e submit-only ornamental)
- Pagina dinamica de destinos com filtros
- Animacoes de entrada (scroll-triggered reveals) — avaliado para Sprint 40
- Video background no hero
- A/B testing entre V1 e V2 via analytics
- Dark mode

## Success Metrics

- Taxa de conversao da landing page (cliques em CTA / visitantes unicos): baseline V1 vs V2 apos 2 semanas com flag ON em staging
- Lighthouse Performance Score >= 85 em producao
- Zero regressoes visuais na LandingPageV1 (validado por screenshot E2E com flag OFF)
- UX Designer aprova a fidelidade ao Stitch export antes do merge

## Dependencias

- SPEC-PROD-046 (Design System Foundation — tokens `atlas-*` em tailwind.config.ts): COMPLETO no Sprint 38
- SPEC-PROD-047 (Component Library v1 — AtlasButton, AtlasCard, AtlasBadge, AtlasChip): COMPLETO no Sprint 38
- `DesignBranch` component: a ser criado neste sprint se nao existir
- Stitch export: `docs/design/stitch-exports/atlas_landing_page_a_inspira_o/code.html` — disponivel
- Login Stitch export: `docs/design/stitch-exports/login/code.html` — disponivel

## Notas de Implementacao para Desenvolvedores

1. O Stitch export usa tokens SEM prefixo `atlas-` (ex: `text-primary`, `bg-secondary-container`). No codigo Next.js, TODOS os tokens devem usar prefixo `atlas-` conforme SPEC-PROD-046.

2. O Stitch usa `material-symbols-outlined` via Google Fonts CDN. No Next.js, usar o pacote `@material-symbols/font-600` ou alternativa aprovada pelo tech-lead.

3. As imagens do Stitch sao URLs de IA generativa (lh3.googleusercontent.com). Substituir por imagens locais em `/public/images/landing/` com licenca verificada.

4. O `DesignBranch` component deve ser um Server Component que le `process.env.NEXT_PUBLIC_DESIGN_V2` e renderiza o branch correto. Nao deve usar `useEffect` ou state.

5. Consultar `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md` Secao 2.1 para especificacoes exatas do AtlasButton (incluindo a correcao critica de contraste: texto `atlas-primary` sobre laranja, NAO texto branco).

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-23 | product-owner | Versao inicial — Sprint 39 |
