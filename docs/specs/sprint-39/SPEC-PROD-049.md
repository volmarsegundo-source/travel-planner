---
spec_id: SPEC-PROD-049
title: Login Page V2
version: 1.0.0
status: Draft
sprint: 39
owner: product-owner
created: 2026-03-23
updated: 2026-03-23
feature_flag: NEXT_PUBLIC_DESIGN_V2
design_reference: docs/design/stitch-exports/login/code.html
token_reference: docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md
screen_index: docs/design/SCREEN-INDEX.md
---

# SPEC-PROD-049: Login Page V2

## Contexto e Problema

A pagina de login atual do Atlas usa componentes shadcn/ui genericos que nao pertencem ao design system Atlas. O formulario nao usa AtlasInput nem AtlasButton, as fontes sao inconsistentes com o resto do produto V2, e o layout nao transmite a identidade visual da plataforma — especialmente critico porque e a segunda tela que usuarios novos veem apos a landing page, e a tela que usuarios recorrentes veem a cada sessao.

O Stitch gerou um export oficial para a pagina de login (`docs/design/stitch-exports/login/code.html`) com um layout two-column premium: painel esquerdo da marca (60%, dark navy com efeito topografico e glow teal) e formulario de login limpo a direita (40%, fundo branco).

## User Story

As a @leisure-solo returning to Atlas after a break,
I want a login experience that feels as polished and on-brand as the landing page,
so that my trust in the platform is reinforced from the very first authenticated interaction.

## Traveler Context

- **Pain point**: A transicao entre a landing page (quando migrada para V2) e o login atual cria uma quebra visual notavel. O usuario sai de um design premium e entra em um formulario generico — sinal negativo de inconsistencia.
- **Current workaround**: Usuarios ja autenticados raramente veem o login. O impacto maior e em novos usuarios que fazem o fluxo landing -> register -> (primeiro login ou retorno).
- **Frequency**: Todo usuario nao-autenticado que tenta acessar uma rota protegida passa pelo login. Alta frequencia para novos usuarios nas primeiras semanas de uso.

## Escopo

### O que esta spec cobre
- Criacao do componente `LoginFormV2` usando AtlasInput e AtlasButton
- Layout two-column conforme Stitch export: painel de marca (desktop only) + formulario
- Integracao com `DesignBranch` na rota de login existente
- Todos os campos e acoes do LoginFormV1 preservados com o mesmo comportamento funcional
- Social login buttons (Google, GitHub) condicionais — exibidos apenas se os providers OAuth estiverem configurados via env vars
- i18n: reuso das chaves existentes em `en.json` e `pt-BR.json`, novas chaves onde necessario

### O que esta spec NAO cobre
- Alteracao da logica de autenticacao (Auth.js v5 — permanece identica)
- Alteracao do RegisterFormV1 (avaliado em T2.4 como "se tempo permitir")
- Two-factor authentication (2FA)
- Passkey / biometric login
- Alteracao de rotas ou redirects de autenticacao

## Layout do Stitch Export

### Painel Esquerdo — Marca (60% desktop, oculto mobile)

- Background: `atlas-primary` (#040d1b)
- Efeito topografico: SVG pattern watermark com `opacity-40`
- Ambient glow: circulo teal `#1c9a8e` com `blur-[140px] opacity-20`
- Logo: icone `explore` (filled) em container gradiente `from-atlas-secondary-container to-orange-400`, rounded-xl, shadow
- Titulo: "Atlas" — `Plus Jakarta Sans`, 60px, font-black, texto branco, tracking-tighter
- Tagline: "Do sonho ao destino, com inteligencia." — `atlas-on-primary-container`, 20px, centralizado
- Floating card: card glass com backdrop-blur exibindo preview de proxima viagem ("Rio de Janeiro -> Lisboa"), progresso 85%, `atlas-secondary-container` progress bar com glow amber
- Imagem decorativa: foto de montanha, grayscale, rotacionada -12deg, opacity-20, canto superior direito

### Painel Direito — Formulario (40% desktop, 100% mobile)

- Background: branco (`atlas-surface-container-lowest`)
- Padding: `px-8 md:px-20 py-12`
- Max-width do formulario: `max-w-md mx-auto`

**Mobile header** (visivel apenas em mobile, oculto desktop):
- Icone `explore` (filled) em `atlas-secondary-container`
- Titulo "Atlas" em `atlas-primary`

**Bloco de boas-vindas**:
- H2: "Bem-vindo de volta" — `atlas-text-h2`, `Plus Jakarta Sans`, Bold
- Subtitulo: "Entre na sua conta para continuar sua expedicao" — `atlas-on-surface-variant`, 16px

**Campos do formulario**:
- Email: AtlasInput type="email", placeholder="seu@email.com", icone esquerdo `mail`, label "E-mail"
- Senha: AtlasInput type="password" com toggle de visibilidade, icone esquerdo `lock`, label "Senha", link "Esqueceu a senha?" alinhado a direita do label
- Checkbox "Lembrar de mim": estilizado com `atlas-secondary-container` quando selecionado

**CTA principal**:
- AtlasButton variant="primary" size="lg" fullWidth type="submit"
- Texto: "Entrar" + icone `arrow_forward`
- Estado loading: spinner substituindo icone, texto mantido

**Divisor**:
- Linha `atlas-outline-variant/30` com texto "ou" centralizado em fundo branco

**Social login** (condicional):
- Dois botoes side-by-side: Google e GitHub
- Variante: AtlasButton variant="secondary" com icone do provider
- Exibidos apenas se `GOOGLE_CLIENT_ID` (Google) ou `GITHUB_ID` (GitHub) estiverem definidos

**Links inferiores**:
- "Nao tem uma conta? Criar conta gratis" — link para `/auth/register`
- Bloco legal: "Ao continuar, voce concorda com nossos Termos de Uso e nossa Politica de Privacidade" — 11px, `atlas-outline`, links para `/terms` e `/privacy`

## Acceptance Criteria

### Renderizacao e Feature Flag

- [ ] AC-001: Dado `NEXT_PUBLIC_DESIGN_V2=false`, quando o usuario acessa `/auth/login`, entao o LoginFormV1 e renderizado (comportamento atual sem alteracao)
- [ ] AC-002: Dado `NEXT_PUBLIC_DESIGN_V2=true`, quando o usuario acessa `/auth/login`, entao o LoginFormV2 e renderizado com layout two-column
- [ ] AC-003: Dado `NEXT_PUBLIC_DESIGN_V2=true` e viewport mobile (<1024px), quando o usuario acessa `/auth/login`, entao o painel esquerdo esta oculto e o formulario ocupa tela cheia

### Campos e Funcionalidade

- [ ] AC-004: Dado o formulario V2, quando o usuario preenche email e senha validos e submete, entao a autenticacao ocorre com o mesmo comportamento do V1 (redirect para `/expeditions` ou URL de retorno)
- [ ] AC-005: Dado o formulario V2, quando o usuario submete com credenciais invalidas, entao a mensagem de erro e exibida com styling `atlas-error` sem quebrar o layout
- [ ] AC-006: Dado o campo de senha, quando o usuario clica no botao de toggle de visibilidade, entao o campo alterna entre `type="password"` e `type="text"` e o icone alterna entre `visibility` e `visibility_off`
- [ ] AC-007: Dado o formulario V2, quando o usuario clica em "Esqueceu a senha?", entao e redirecionado para a rota de recuperacao de senha existente
- [ ] AC-008: Dado o formulario V2, quando o usuario clica em "Criar conta gratis", entao e redirecionado para `/auth/register`
- [ ] AC-009: Dado que o provider Google esta configurado via env, quando o V2 e renderizado, entao o botao "Google" e exibido e funciona com o mesmo handler do V1
- [ ] AC-010: Dado que o provider Google NAO esta configurado via env, quando o V2 e renderizado, entao o botao "Google" NAO e exibido (sem erros)

### Componentes Atlas

- [ ] AC-011: Dado o formulario, quando inspecionado, entao os campos de entrada sao instancias de `AtlasInput` (nao inputs shadcn ou nativos sem wrapper)
- [ ] AC-012: Dado o CTA de submit, quando inspecionado, entao e uma instancia de `AtlasButton` variant="primary"
- [ ] AC-013: Dado o botao de submit em estado de loading, quando o formulario esta sendo submetido, entao o botao exibe spinner e `pointer-events: none` sem mudanca de largura (sem layout shift)

### Tokens e Design System

- [ ] AC-014: Dado o painel esquerdo (desktop), quando renderizado, entao o background e `atlas-primary` (#040d1b) e a tagline usa `atlas-on-primary-container` (#818a9d)
- [ ] AC-015: Dado os campos de formulario, quando em estado de foco, entao a borda muda para `atlas-on-tertiary-container` (#1c9a8e — teal) conforme Stitch export
- [ ] AC-016: Dado qualquer elemento interativo, quando focado via teclado, entao o ring de foco e visivel com 2px `atlas-focus-ring` (#fe932c) e offset 2px

### Acessibilidade (WCAG 2.1 AA — nivel atual deve ser mantido ou melhorado)

- [ ] AC-017: Dado todos os campos do formulario, quando inspecionados, entao cada input tem `id` e `label[for]` correspondentes (sem aria-label substituindo label visivel)
- [ ] AC-018: Dado o botao de toggle de senha, quando ativado via teclado, entao o `aria-label` atualiza dinamicamente ("Mostrar senha" / "Ocultar senha")
- [ ] AC-019: Dado uma mensagem de erro de autenticacao, quando exibida, entao ela tem `role="alert"` e `aria-live="polite"`
- [ ] AC-020: Dado o formulario completo, quando validado com axe-core, entao zero violations de nivel A e AA sao reportadas
- [ ] AC-021: Dado viewport mobile, quando o formulario e renderizado, entao todos os elementos interativos tem touch target >= 44x44px

### Internacionalizacao

- [ ] AC-022: Dado `locale=pt-BR`, quando renderizado, entao todos os labels, placeholders e mensagens de erro estao em portugues brasileiro
- [ ] AC-023: Dado `locale=en`, quando renderizado, entao todos os textos estao em ingles com mesmo layout

### Testes

- [ ] AC-024: Dado o componente LoginFormV2, quando os testes unitarios sao executados, entao cobertura >= 80% incluindo estados: idle, loading, error, success, toggle-senha, social-login-ausente
- [ ] AC-025: Dado E2E com flag ON, quando executado, entao o fluxo completo de login (email/senha validos) funciona sem erros
- [ ] AC-026: Dado E2E com flag OFF, quando executado, entao o LoginFormV1 e renderizado sem regressao (screenshot comparison)

## Out of Scope (v1)

- RegisterPageV2 (avaliada como item opcional T2.4 no plano de sprint — depende de sobra de budget)
- ForgotPasswordPageV2
- Animacoes de transicao entre os dois paineis
- Dark mode do formulario
- Biometric / Passkey login

## Success Metrics

- Zero regressoes de autenticacao apos deploy (taxa de erro no fluxo de login = 0% nos primeiros 7 dias)
- Lighthouse Accessibility Score >= 95 no LoginPageV2
- UX Designer aprova fidelidade ao Stitch export antes do merge
- Zero violations axe-core nivel A e AA

## Dependencias

- SPEC-PROD-046 (tokens `atlas-*`): COMPLETO Sprint 38
- SPEC-PROD-047 (AtlasInput, AtlasButton): COMPLETO Sprint 38
- `DesignBranch` component: criado em SPEC-PROD-048 (Track 1) — Track 2 pode iniciar em paralelo usando implementacao provisoria
- Auth.js v5 (autenticacao existente): nenhuma alteracao necessaria
- SPEC-PROD-050 (carryover fixes): AtlasChip aria fix nao impacta login; AtlasInput fix pode ser necessario se o componente tiver issues de a11y

## Notas de Implementacao para Desenvolvedores

1. O floating card do painel esquerdo e puramente decorativo — nao precisa exibir dados reais da sessao. Pode usar dados mock hardcoded ("Rio de Janeiro -> Lisboa", "85% pronto") pois seu proposito e visual.

2. O efeito topografico do painel esquerdo e um SVG pattern inline no CSS do Stitch. Pode ser extraido para `/public/images/topo-pattern.svg` e referenciado via `background-image` em CSS.

3. O ambient glow (circulo teal com blur extremo) pode ser implementado como `div` absoluta com `bg-[#1c9a8e] blur-[140px] opacity-20 rounded-full`. Nao usar `filter: blur()` em imagens reais — apenas em elementos decorativos.

4. O checkbox "Lembrar de mim" nao implementa persistencia de sessao diferenciada em V1. O V2 deve manter o mesmo comportamento do V1 (sem modificar a logica de session duration).

5. Os links "Termos de Uso" e "Politica de Privacidade" apontam para `/terms` e `/privacy`. Verificar se essas rotas existem; se nao, usar `href="#"` com comentario `// TODO: link para pagina de termos`.

6. Consultar `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md` Secao 2.3 (AtlasInput) para especificacoes exatas de estados: default, focus, error, disabled.

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-23 | product-owner | Versao inicial — Sprint 39 |
