# Sprint 39 — Breakdown de Tarefas

**Versao**: 1.0.0
**Data**: 2026-03-23
**Autor**: product-owner (tech-lead deve revisar e ajustar estimativas antes de iniciar)
**Sprint**: 39 — "Landing Page + Login V2"
**Versao alvo**: v0.34.0
**Budget**: 50h (Track 1: 25h | Track 2: 20h | Cross-cutting: 5h)
**Specs**: SPEC-PROD-048, SPEC-PROD-049, SPEC-PROD-050
**Source of truth de tokens**: `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md`
**Design references**:
- `docs/design/stitch-exports/atlas_landing_page_a_inspira_o/code.html`
- `docs/design/stitch-exports/login/code.html`

---

## Restricao Global (herdada do Sprint 38)

**O produto DEVE ser identico ao v0.33.0 do ponto de vista do usuario final.**

`NEXT_PUBLIC_DESIGN_V2=false` em staging e producao. Todo codigo V2 deve estar dentro de branches condicionais controlados pelo `DesignBranch` component. Qualquer PR que altere o comportamento visual para usuarios com a flag OFF e **automaticamente rejeitado**.

---

## Track 1 — dev-fullstack-1: Landing Page V2

**Spec**: SPEC-PROD-048
**Estimativa total**: 25h
**Pode iniciar**: imediatamente

---

### T1.1 — DesignBranch component + LandingPageV2 skeleton

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-048 AC-001, AC-002, AC-003
**Assigned to**: dev-fullstack-1
**Dependencia**: nenhuma

**O que fazer**:
- Verificar se o `DesignBranch` component ja existe no Sprint 38; se nao, criar em `src/components/features/design-system/DesignBranch.tsx`
- `DesignBranch` e um Server Component que le `process.env.NEXT_PUBLIC_DESIGN_V2` e renderiza `children` ou `fallback` conforme o valor
- Criar `src/components/features/landing/LandingPageV2.tsx` como estrutura vazia com as 6 secoes como comentarios
- Integrar `DesignBranch` na rota de landing (`src/app/[locale]/page.tsx`):
  - `<DesignBranch v2={<LandingPageV2 />} v1={<LandingPageV1 />} />`
- Verificar que com flag OFF a pagina e identica ao v0.33.0

**Criterios de conclusao**:
- [ ] DesignBranch renderiza V1 quando `NEXT_PUBLIC_DESIGN_V2=false`
- [ ] DesignBranch renderiza V2 skeleton (vazio, sem erros) quando `NEXT_PUBLIC_DESIGN_V2=true`
- [ ] Sem erros de hidratacao no console em ambos os estados

---

### T1.2 — Hero Section

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-048 Secao 1, AC-004, AC-005, AC-006, AC-007
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.1

**O que fazer**:
- Implementar a hero section conforme `code.html` linhas 110-135
- Usar Next.js `<Image>` com `priority` (acima da dobra) para a hero image
- Selecionar imagem placeholder de `/public/images/landing/` (ou Unsplash com licenca — verificar com tech-lead)
- Overlay: `bg-gradient-to-r from-atlas-primary/80 via-atlas-primary/40 to-transparent`
- Badge pill: `atlas-secondary-container` + `atlas-on-secondary-container`
- Headline H1: `font-atlas-headline text-[60px] md:text-[72px] font-extrabold text-white leading-[1.1]`
- CTA primario: `<AtlasButton variant="primary" size="lg">` + icone `arrow_forward`
  - Texto do botao: key i18n `landing.hero.cta_primary`
  - Redirect: `/auth/register` (nao autenticado) ou `/expeditions` (autenticado) — verificar session no Server Component
- CTA secundario: `<AtlasButton variant="glass" size="lg">` — "Como Funciona"
  - Deve usar `<a href="#phases-section">` com scroll-behavior smooth

**ATENCAO**: Nao usar texto branco sobre `atlas-secondary-container` no CTA primario. Usar `atlas-primary` (#040d1b) sobre laranja. Ver UX Parecer Secao 2.1.

**Criterios de conclusao**:
- [ ] Hero com imagem full-bleed, overlay, badge, headline, subtitulo, 2 CTAs
- [ ] Min-height 921px no desktop, adequado em mobile sem overflow
- [ ] CTA primario redireciona corretamente para autenticados e nao-autenticados
- [ ] CTA secundario ancora na secao de fases

---

### T1.3 — Secao: As 8 Fases da Jornada

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-048 Secao 2, AC-008, AC-009
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.2 (precisa do skeleton em T1.1 — pode iniciar em paralelo com T1.2)

**O que fazer**:
- Implementar secao conforme `code.html` linhas 136-187
- Background: `atlas-surface`
- `id="phases-section"` para o ancora do CTA "Como Funciona"
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8`
- 8 `<AtlasCard>` com icone Material Symbols, titulo H3, descricao
- Icones: auto_awesome, person_pin, task_alt, map, explore, calendar_today, support_agent, photo_library
- Hover: `hover:translate-y-[-4px] transition-transform duration-200` (usar `atlas-transition-base`)
- Fases 7 e 8: adicionar `<AtlasBadge variant="info">Em Breve</AtlasBadge>` e remover qualquer link/interacao
- Nomes canonicos das fases devem vir de `phase-config.ts` (nao hardcoded) — verificar com tech-lead

**Criterios de conclusao**:
- [ ] 8 cards em grid responsivo (1/2/4 colunas)
- [ ] Fases 7 e 8 com badge "Em Breve" sem link ativo
- [ ] Hover lift funciona (respeitando prefers-reduced-motion)

---

### T1.4 — Secao: AI Assistant

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-048 Secao 3
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.1

**O que fazer**:
- Implementar secao conforme `code.html` linhas 188-223
- Background: `atlas-primary-container`
- Layout two-column no desktop: `flex flex-col lg:flex-row items-center gap-16`
- Coluna texto: H2 branco, descricao `atlas-primary-fixed-dim`, lista com checkmarks `atlas-secondary`
- Coluna visual: container glass `bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10`
- Usar Next.js `<Image>` com `loading="lazy"` para o mockup de app
- Floating card sobre mockup: `absolute -bottom-6 -left-6`, bg `atlas-secondary-container`, texto de exemplo
- Todos os textos em i18n

**Criterios de conclusao**:
- [ ] Layout two-column no desktop, stack no mobile
- [ ] Floating card posicionado corretamente (sem quebra em mobile)
- [ ] Container glass com backdrop-blur funcional

---

### T1.5 — Secao: Gamification

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-048 Secao 4
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.1

**O que fazer**:
- Implementar secao conforme `code.html` linhas 224-270
- 3 `<AtlasCard>` de badge: Explorador Nato (amber glow), Lendario (blue glow), Guardiao da Natureza (emerald glow)
- Glow effect: `div absolute inset-0 bg-[color]/20 rounded-full blur-xl`
- Nota sobre cores: o Stitch usa `amber-500`, `blue-400`, `emerald-400` inline. No codigo Next.js, mapear para tokens `atlas-*`:
  - amber: `atlas-secondary-container`
  - blue: nao ha token direto — usar `atlas-info` (token adicionado pelo UX Parecer)
  - emerald: `atlas-success`
- Indicador de nivel: condicional baseado em sessao ativa — mostrar placeholder se nao autenticado
- Nomes dos ranks e descricoes em i18n

**Criterios de conclusao**:
- [ ] 3 cards com glow effect usando tokens atlas-*
- [ ] Indicador de nivel condicional (visivel para autenticados, oculto para visitantes)
- [ ] Nenhum uso de `amber-500`, `blue-400`, `emerald-400` diretos no codigo

---

### T1.6 — Secao: Destinos em Destaque

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-048 Secao 5
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.1

**O que fazer**:
- Implementar secao conforme `code.html` linhas 272-317
- Grid asimetrico 12 colunas: `grid grid-cols-12`
- Card grande: `col-span-12 lg:col-span-7 h-[500px] rounded-3xl overflow-hidden`
- Card medio: `col-span-12 md:col-span-6 lg:col-span-5 h-[500px] rounded-3xl overflow-hidden`
- Card panoramico: `col-span-12 h-[400px] rounded-3xl overflow-hidden`
- Hover de imagem: `group-hover:scale-110 transition-transform duration-700` (usar `atlas-transition-image`)
- Overlay gradient: `bg-gradient-to-t from-atlas-primary via-transparent to-transparent`
- Badge categoria: pill `atlas-secondary-container`
- Imagens: Next.js `<Image>` com `loading="lazy"`, `placeholder="blur"`, `blurDataURL` adequado
- Substituir URLs do Lh3 Googleusercontent por imagens locais aprovadas
- Link "Ver Todos os Destinos": rota para `/destinations` (se existir) ou `#` com TODO

**Criterios de conclusao**:
- [ ] Grid asimetrico funcionando em desktop (3 cards distribuidos corretamente)
- [ ] Em mobile: cards em coluna completa
- [ ] Hover scale com transition 700ms (desativado com prefers-reduced-motion)
- [ ] Imagens locais (nao URLs externas de AI)

---

### T1.7 — Footer V2

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-048 Secao 6
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.1

**O que fazer**:
- Implementar footer conforme `code.html` linhas 319-354
- Background: `atlas-primary-container` (mapeado de `slate-900` do export)
- Grid 4 colunas desktop, stack mobile
- Links: verificar rotas existentes (/privacy existe; /terms e /about — verificar)
- Campo email newsletter: `<AtlasInput type="email">` placeholder + botao `<AtlasButton variant="primary-dark" size="sm">` icone `send`
  - Campo e ornamental em V1: sem action, submit deve mostrar toast "Em breve"
- Copyright: `© {new Date().getFullYear()} Atlas Travel Planner`
- Todos os links e textos em i18n

**Criterios de conclusao**:
- [ ] Footer 4-colunas desktop, stack mobile
- [ ] Links corretos para rotas existentes
- [ ] Copyright com ano dinamico
- [ ] Campo newsletter com feedback "Em breve" no submit

---

### T1.8 — Responsividade Completa

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-048 AC-013, AC-014, AC-015
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.2-T1.7 (revisao pos-implementacao)

**O que fazer**:
- Revisar TODOS os breakpoints: 375px, 768px, 1024px, 1440px
- Verificar overflow horizontal em cada secao no mobile
- Verificar touch targets >= 44px em todos os elementos interativos do mobile
- Ajustar gaps, paddings, e font sizes para cada breakpoint
- Testar em Playwright com viewports configurados nos 4 breakpoints

**Criterios de conclusao**:
- [ ] Zero overflow horizontal em 375px
- [ ] Todos os touch targets >= 44px em 375px (verificado com DevTools)
- [ ] Layout adequado em todos os 4 breakpoints alvo

---

### T1.9 — i18n + Unit Tests

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-048 AC-022, AC-023, AC-024
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.2-T1.7

**O que fazer**:
- Adicionar chaves i18n em `messages/pt-BR.json` e `messages/en.json` para todos os textos novos
- Namespace sugerido: `landing.hero.*`, `landing.phases.*`, `landing.ai.*`, `landing.gamification.*`, `landing.destinations.*`, `landing.footer.*`
- Escrever unit tests para:
  - LandingPageV2 renderiza sem erros
  - Hero CTA redireciona corretamente (autenticado vs nao-autenticado)
  - Fases 7 e 8 exibem badge "Em Breve"
  - Footer copyright tem ano correto
- Cobertura >= 80% das branches

**Criterios de conclusao**:
- [ ] Todas as chaves i18n adicionadas em pt-BR e en
- [ ] Sem strings hardcoded em pt-BR no JSX
- [ ] Unit tests passando com cobertura >= 80%

---

### T1.10 — E2E: Landing Page com Flag ON e OFF

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-048 AC-025, AC-026
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.9

**O que fazer**:
- E2E com flag ON (`NEXT_PUBLIC_DESIGN_V2=true`):
  - Verificar que todas as 6 secoes sao renderizadas (por heading ou elemento identificador)
  - Verificar que CTA "Comece Sua Viagem" leva para `/auth/register`
  - Verificar que "Como Funciona" ancora na secao de fases
  - Screenshot da landing V2 para comparacao futura
- E2E com flag OFF (`NEXT_PUBLIC_DESIGN_V2=false`):
  - Screenshot comparison com baseline do Sprint 38 — zero diffs esperados

**Criterios de conclusao**:
- [ ] E2E flag ON: todas as 6 secoes presentes, CTAs funcionando
- [ ] E2E flag OFF: zero regressoes visuais (screenshot diff < 0.1%)

---

## Track 2 — dev-fullstack-2: Login V2 + Carryover

**Specs**: SPEC-PROD-049, SPEC-PROD-050
**Estimativa total**: 20h
**Pode iniciar**: imediatamente com os carryover fixes

---

### T2.1 — Sprint 38 Carryover: AtlasChip aria-pressed fix

**Estimativa**: 1h
**Spec refs**: SPEC-PROD-050 FIX-001, AC-001, AC-002, AC-003
**Assigned to**: dev-fullstack-2
**Dependencia**: nenhuma

**O que fazer**:
- Ler `src/components/ui/AtlasChip.tsx`
- Identificar o duplicado de `aria-pressed`
- Remover do elemento filho, manter apenas no `<button>` raiz
- Se o contexto de uso for multipla selecao, avaliar `aria-checked` vs `aria-pressed` com o UX Designer
- Rodar testes unitarios existentes para garantir sem regressao

**Criterios de conclusao**:
- [ ] axe-core sem violation de aria-pressed duplicado
- [ ] Testes existentes passando sem alteracao

---

### T2.2 — Sprint 38 Carryover: PhaseProgress 44px mobile

**Estimativa**: 1h
**Spec refs**: SPEC-PROD-050 FIX-002, AC-004, AC-005, AC-006
**Assigned to**: dev-fullstack-2
**Dependencia**: nenhuma

**O que fazer**:
- Ler o componente de progress de fases (AtlasPhaseProgress ou equivalente)
- Adicionar `min-w-[44px] min-h-[44px]` para circulos em mobile (`sm:` prefix)
- Alternativa: usar padding para expandir area de toque sem alterar visual (`-m-[2px] p-[2px]` trick)
- Verificar que o layout do progress bar nao quebra em 375px
- Testar em Playwright no viewport 375px

**Criterios de conclusao**:
- [ ] Touch target >= 44x44px verificado em viewport 375px
- [ ] Layout nao quebra em 375px
- [ ] Desktop sem alteracao visual

---

### T2.3 — Sprint 38 Carryover: Token glow-primary

**Estimativa**: 0.5h
**Spec refs**: SPEC-PROD-050 FIX-003, AC-007, AC-008, AC-009
**Assigned to**: dev-fullstack-2
**Dependencia**: nenhuma

**O que fazer**:
- Adicionar em `tailwind.config.ts`:
  ```
  boxShadow: {
    'atlas-glow-primary': '0 0 12px rgba(4, 13, 27, 0.2)',
  }
  ```
- Adicionar em `globals.css`:
  ```css
  --shadow-glow-primary: 0 0 12px rgba(4, 13, 27, 0.2);
  ```
- Verificar se algum componente do Sprint 38 usa fallback para este shadow e substituir

**Criterios de conclusao**:
- [ ] Token disponivel e funcional em tailwind e globals.css
- [ ] Nenhum fallback hardcoded remanescente

---

### T2.4 — Sprint 38 Carryover: ESLint cn()/cva() detection

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-050 FIX-004, AC-010, AC-011, AC-012, AC-013
**Assigned to**: dev-fullstack-2
**Dependencia**: nenhuma

**O que fazer**:
- Localizar a ESLint rule customizada do Sprint 38 (provavelmente em `.eslintrc.js` ou `eslint-plugin-atlas/`)
- Estender a logica de deteccao para capturar argumentos string em chamadas de `cn()` e `cva()`
- Usar o AST: identificar `CallExpression` com `callee.name === 'cn'` ou `callee.name === 'cva'`
- Para cada argumento `StringLiteral`, aplicar a mesma regex de cor que ja existe para `className`
- Testar com casos positivos (deve reportar) e negativos (nao deve reportar)
- Executar `npm run lint` na base inteira — corrigir eventuais warnings novos legados

**Criterios de conclusao**:
- [ ] `cn("bg-amber-500")` gera warning
- [ ] `cn("bg-atlas-primary")` nao gera warning
- [ ] `cn("flex items-center")` nao gera warning
- [ ] `npm run lint` sem warnings espurios novos na base existente

---

### T2.5 — LoginFormV2: Layout e painel esquerdo

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-049 layout Stitch, AC-001, AC-002, AC-003
**Assigned to**: dev-fullstack-2
**Dependencia**: T2.1-T2.4 (carryover pode ser feito em paralelo; T2.5 pode comecar apos T2.3)

**O que fazer**:
- Criar `src/components/features/auth/LoginFormV2.tsx`
- Layout raiz: `flex min-h-screen`
- **Painel esquerdo** (60%, `hidden lg:flex`):
  - Background: `atlas-primary`
  - Topographic SVG pattern: extrair SVG do Stitch para `/public/images/topo-pattern.svg`
  - Ambient glow: `div` absoluta `w-[500px] h-[500px] bg-[#1c9a8e] blur-[140px] opacity-20 rounded-full` — usar `atlas-on-tertiary-container` como token aproximado
  - Logo container: icone `explore` filled em gradiente `from-atlas-secondary-container to-orange-400`, rounded-xl
  - Titulo "Atlas": `Plus Jakarta Sans`, 60px, font-black, texto branco
  - Tagline: `atlas-on-primary-container`, 20px, centralizado
  - Floating card: hardcoded mock "Rio de Janeiro -> Lisboa", progresso 85%, shadow glow amber
  - Imagem decorativa: grayscale, rotated -12deg, opacity-20 (usar Next.js Image com `loading="lazy"`)
- **Mobile header** (visible apenas `<1024px`): logo simplificado

**Criterios de conclusao**:
- [ ] Painel esquerdo visivel em desktop, oculto em mobile/tablet
- [ ] Todos os elementos do painel usando tokens atlas-*
- [ ] Floating card com progress bar glow amber

---

### T2.6 — LoginFormV2: Formulario e autenticacao

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-049 AC-004, AC-005, AC-006, AC-007, AC-008
**Assigned to**: dev-fullstack-2
**Dependencia**: T2.5

**O que fazer**:
- **Painel direito** (40% desktop, 100% mobile):
  - Bloco de boas-vindas: H2 "Bem-vindo de volta", subtitulo
  - Campo email: `<AtlasInput type="email" icon="mail" label="E-mail" />`
  - Campo senha: `<AtlasInput type="password" icon="lock" label="Senha" passwordToggle />`
    - Toggle: botao `visibility`/`visibility_off` com aria-label dinamico
    - Link "Esqueceu a senha?" alinhado a direita no header do label
  - Checkbox "Lembrar de mim": estilizado com `atlas-secondary-container`
  - CTA: `<AtlasButton variant="primary" size="lg" fullWidth type="submit">` com icone `arrow_forward`
  - Estado loading do botao: spinner inline, pointer-events none
- Conectar ao handler de autenticacao existente do LoginFormV1 (nao duplicar logica — extrair se necessario)
- Mensagem de erro: `role="alert" aria-live="polite"`, styling `atlas-error-container`

**ATENCAO**: Nao quebrar o fluxo de autenticacao existente. Testar com credenciais reais em ambiente de dev.

**Criterios de conclusao**:
- [ ] Login funciona com email/senha validos (redirect correto)
- [ ] Erro exibido com credenciais invalidas
- [ ] Toggle de senha funcional com aria-label correto
- [ ] Link "Esqueceu a senha?" funcionando
- [ ] Botao loading sem layout shift

---

### T2.7 — LoginFormV2: Social login + DesignBranch integration

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-049 AC-009, AC-010
**Assigned to**: dev-fullstack-2
**Dependencia**: T2.5, T2.6

**O que fazer**:
- **Divisor** "ou": linha `atlas-outline-variant/30` com texto centralizado
- **Social login**:
  - Verificar env vars: `GOOGLE_CLIENT_ID` (Google) e `GITHUB_ID` (GitHub)
  - Renderizacao condicional — se env var ausente, nao exibir o botao correspondente
  - Botao Google: `<AtlasButton variant="secondary">` com SVG Google logo
  - Botao GitHub: `<AtlasButton variant="secondary">` com SVG GitHub logo
  - Handlers: reutilizar `signIn('google')` e `signIn('github')` do V1
- **Links inferiores**: "Criar conta gratis" -> `/auth/register`, links legais -> `/terms` e `/privacy`
- **DesignBranch**: integrar na rota de login (`src/app/[locale]/auth/login/page.tsx`):
  ```tsx
  <DesignBranch v2={<LoginFormV2 />} v1={<LoginFormV1 />} />
  ```

**Criterios de conclusao**:
- [ ] Social login exibido apenas se provider configurado
- [ ] DesignBranch integrado na rota — V1 sem alteracao com flag OFF
- [ ] Links inferiores corretos

---

### T2.8 — LoginFormV2: i18n + Unit Tests

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-049 AC-022, AC-023, AC-024
**Assigned to**: dev-fullstack-2
**Dependencia**: T2.5-T2.7

**O que fazer**:
- Adicionar chaves i18n novas em `messages/pt-BR.json` e `messages/en.json`
  - Reutilizar chaves existentes em `auth.*` onde possivel
  - Novas chaves: `auth.login.welcome_back`, `auth.login.tagline`, `auth.login.remember_me`, `auth.login.legal`
- Unit tests:
  - Renderizacao sem erros (flag ON e OFF)
  - Toggle de senha: estado inicial `type="password"`, apos click `type="text"`, aria-label atualizado
  - Mensagem de erro renderizada com role="alert"
  - Social login oculto quando env var ausente
  - Social login visivel quando env var presente (mock)
  - Cobertura >= 80%

**Criterios de conclusao**:
- [ ] Chaves i18n adicionadas
- [ ] Unit tests passando com cobertura >= 80%

---

### T2.9 — E2E: Login com Flag ON e OFF

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-049 AC-025, AC-026
**Assigned to**: dev-fullstack-2
**Dependencia**: T2.5-T2.8

**O que fazer**:
- E2E com flag ON:
  - Fluxo completo: preencher email/senha, submeter, verificar redirect para `/expeditions`
  - Testar erro: credenciais invalidas, verificar mensagem de erro visivel
  - Testar toggle de senha: campo muda para text e volta para password
  - Screenshot do LoginFormV2 completo (painel left + right no desktop)
- E2E com flag OFF:
  - Screenshot comparison com baseline Sprint 38 — zero diffs esperados
- Viewport mobile (375px): verificar que painel esquerdo esta oculto, formulario ocupa tela cheia

**Criterios de conclusao**:
- [ ] Fluxo de login funciona end-to-end com flag ON
- [ ] Erro exibido corretamente
- [ ] Zero regressoes visuais com flag OFF

---

### T2.10 (Opcional) — Register Page V2

**Estimativa**: 5h
**Spec refs**: Nenhuma spec formal — usar SPEC-PROD-049 como guia visual
**Assigned to**: dev-fullstack-2
**Dependencia**: T2.7 concluido E >= 5h disponivel no budget
**Condicao**: Iniciar APENAS se T2.1-T2.9 estiverem concluidos antes de 40h de sprint

**O que fazer**:
- Criar `RegisterFormV2` com mesmo layout two-column do LoginFormV2
- Campos adicionais vs login: nome, confirmar senha, checkbox de aceite de termos
- Validacao: reutilizar RegisterSchema existente
- DesignBranch na rota de register
- Testes unitarios basicos

**Criterios de conclusao**:
- [ ] Register funciona com flag ON (usuario criado e redirecionado)
- [ ] Sem regressao com flag OFF
- [ ] Testes unitarios basicos

---

## Cross-cutting

| ID | Tarefa | Responsavel | Estimativa | Dependencia |
|----|--------|-------------|-----------|-------------|
| TC.1 | UX Designer mid-sprint review (apos T1.2 + T2.5 prontos) | ux-designer | 2h | T1.2, T2.5 |
| TC.2 | UX Designer final validation (apos T1.10 + T2.9) | ux-designer | 2h | T1.10, T2.9 |
| TC.3 | Sprint review document | tech-lead | 1h | todos |

**TC.1 — Mid-sprint review**: O UX Designer deve ver o hero renderizado e o painel esquerdo do login antes de mais da metade do sprint ser gasto. Isso garante que eventuais ajustes de fidelidade ao design nao gerem retrabalho nas secoes seguintes.

**TC.2 — Final validation**: O UX Designer valida TODAS as 6 secoes da landing + login completo. Aprovacao do UX e bloqueante para o merge do PR.

---

## Ordem de Inicio

```
Dia 1:
  Track 1: T1.1 (DesignBranch + skeleton)
  Track 2: T2.1, T2.2, T2.3 (carryover fixes rapidos)

Dia 2:
  Track 1: T1.2 (Hero)
  Track 2: T2.4 (ESLint fix) + T2.5 inicio (layout LoginFormV2)

Dia 3:
  Track 1: T1.3 (Fases) + T1.4 (AI)
  Track 2: T2.5 conclusao + T2.6 inicio (formulario)

Dia 4-5: [MID-SPRINT REVIEW TC.1]
  Track 1: T1.5 (Gamification) + T1.6 (Destinos)
  Track 2: T2.6 conclusao + T2.7 (social login + DesignBranch)

Dia 6:
  Track 1: T1.7 (Footer) + T1.8 (responsividade)
  Track 2: T2.8 (i18n + tests)

Dia 7:
  Track 1: T1.9 (i18n + unit tests) + T1.10 (E2E)
  Track 2: T2.9 (E2E) + T2.10 se sobrar budget

Dia 8: [FINAL REVIEW TC.2]
  Ambos tracks: ajustes de UX review
  tech-lead: sprint review document TC.3
```

---

## Definicao de Pronto (DoD) — Sprint 39

Uma tarefa e considerada PRONTA quando:
- [ ] Codigo implementado conforme spec
- [ ] Testes unitarios passando (cobertura >= 80% para novas features)
- [ ] `npm run lint` sem erros ou warnings novos
- [ ] `npm run build` sem erros
- [ ] E2E com flag ON e OFF passando
- [ ] Screenshot baseline atualizado (quando aplicavel)
- [ ] Sem classes Tailwind sem prefixo `atlas-` para cores (validado pela ESLint rule)
- [ ] PR description referencia o Spec ID (ex: `feat(SPEC-PROD-048): hero section`)

O Sprint 39 e COMPLETO quando:
- [ ] Todas as tarefas P0 e P1 concluidas
- [ ] UX Designer aprovou landing V2 e login V2
- [ ] Zero regressoes no produto V1 (flag OFF)
- [ ] Sprint review document produzido e commitado
