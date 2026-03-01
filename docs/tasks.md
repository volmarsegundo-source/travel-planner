# Travel Planner — Backlog & Tarefas

**Versão**: 3.0.0
**Atualizado em**: 2026-03-01
**Fonte**: user-story-map-v2.docx (revisão crítica) + testes manuais Sprint 1-4
**Sprint atual**: 5

---

## Visão do Produto

> "Diga para onde vai e quando — a IA monta seu plano e checklist em 60 segundos. Você ajusta, acompanha os gastos em tempo real e viaja sem surpresas."

**Plataforma**: Web App responsivo (mobile-first, 375px)
**Modelo**: Freemium | **Idiomas**: PT-BR + EN
**Público-alvo**: Viajante solo, casais, famílias e grupos pequenos (B2C)

### Princípios Inegociáveis

| Princípio | Aplicação |
|-----------|-----------|
| Velocidade até o valor | Primeiro plano gerado em ≤ 60 segundos do cadastro |
| Formulários curtos | Máx. 3 campos visíveis por etapa |
| Mobile-first | Design começa em 375px — validado antes de todo PR |
| Trust signals visíveis | Badge de segurança + mini política na tela de cadastro |
| Privacidade como diferencial | LGPD from day one, exclusão de dados acessível |

---

## Definition of Done (DoD) — v2.0

Uma User Story está **DONE** quando TODOS os critérios abaixo são atendidos:

- [ ] Implementado conforme spec técnica
- [ ] Cobertura ≥ 80% de testes unitários
- [ ] Cenários E2E passando (happy path + edge cases + erro)
- [ ] Aprovado pelo tech-lead (code review)
- [ ] Aprovado pelo security-specialist
- [ ] Tela conforme protótipo do ux-designer
- [ ] Validado em mobile 375px **e** desktop 1280px
- [ ] WCAG 2.1 AA validado (contraste, teclado, aria-labels)
- [ ] Todos os textos traduzidos em PT-BR e EN (i18n)
- [ ] Nenhum formulário com mais de 3 campos visíveis por etapa
- [ ] Nenhum dado PII logado ou exposto em qualquer camada
- [ ] Trust signals visíveis nas telas de autenticação
- [ ] PR aprovado e merged em `main` — nunca commit direto
- [ ] Critérios de aceite validados pelo product-owner

---

## Métricas de Sucesso do MVP (30 dias)

| Métrica | Meta | Evento de Analytics |
|---------|------|---------------------|
| Usuários cadastrados | 100 contas ativas | `user.registered` |
| Aha moment concluído | ≥ 70% dos cadastros | `onboarding.completed` |
| Planos gerados pela IA | ≥ 80% das viagens | `ai.plan.generated` |
| Checklists gerados pela IA | ≥ 70% das viagens | `ai.checklist.generated` |
| Gastos registrados | ≥ 30% dos usuários | `expense.created` |
| Tempo até 1º plano gerado | ≤ 60 segundos | tempo `user.registered` → `ai.plan.generated` |
| Retenção D7 | ≥ 40% | Sessões únicas D+7 |
| NPS | ≥ 50 | Pesquisa in-app após 7 dias |
| Uptime | ≥ 99.9% | Monitoramento Datadog |
| Score WCAG | AA em 100% das telas | axe-core no CI/CD |

---

## 🟡 Sprint 5 — Navegacao Autenticada e Correcoes

**Objetivo**: Resolver bloqueadores de usabilidade identificados em testes manuais pos-Sprint 4 — navegacao autenticada, logout, feedback de erros e orientacao espacial (breadcrumbs). Sem estas correcoes, o MVP e inutilizavel apos o login.

**Contexto**: Os Sprints 1-4 entregaram auth, landing page, dev toolkit e 227 testes passando. Porem, testes manuais revelaram que o usuario fica "preso" apos o login: sem navbar, sem logout, sem feedback de erros, sem navegacao entre sub-paginas. Estes itens sao pre-requisitos para qualquer teste de usuario real.

**Origem**: Testes manuais realizados em 2026-03-01 (login via curl OK, UI com lacunas criticas).

---

### US-100: Navbar autenticada (AppShell)
**Sprint**: 🟡 5 | **Status**: 🔵 Em andamento | **Prioridade**: P0 (bloqueante)

**User Story**
> As a authenticated user (all personas: @leisure-solo, @leisure-family, @business-traveler),
> I want to see a persistent navigation bar on all authenticated pages,
> So that I can navigate between my trips, settings, and other sections without getting stuck.

**Contexto do Viajante**
- **Pain point**: Apos o login, o usuario ve apenas o conteudo da pagina (ex: TripDashboard) sem nenhuma navegacao. Nao ha como voltar a home, acessar outras secoes ou mesmo saber em que pagina esta. E como chegar num aeroporto estrangeiro sem sinalizacao.
- **Workaround atual**: O usuario precisa digitar URLs manualmente na barra do navegador.
- **Frequencia**: 100% dos usuarios autenticados sao impactados em 100% das sessoes.
- **Severidade**: Bloqueante — torna o produto inutilizavel apos o login.

**Criterios de Aceite**
- [ ] AC-001: Navbar persistente visivel em TODAS as paginas autenticadas (/trips, /trips/[id], /trips/[id]/itinerary, /trips/[id]/checklist, /trips/[id]/generate, /onboarding, /account)
- [ ] AC-002: Navbar contem: logo (link para /trips), links de navegacao principal (Minhas Viagens), seletor de idioma (LanguageSwitcher), avatar/menu do usuario com opcao de logout
- [ ] AC-003: Em mobile (375px), navbar usa hamburger menu com painel deslizante — mesma consistencia visual do Header da landing page
- [ ] AC-004: Em desktop (>= 768px), navbar horizontal com todos os itens visiveis
- [ ] AC-005: Navbar implementada via layout compartilhado (ex: layout.tsx do grupo de rotas autenticadas) — nao duplicada em cada pagina
- [ ] AC-006: Navbar destaca visualmente a secao/pagina ativa (active state)
- [ ] AC-007: Logo no canto esquerdo, mesmo estilo do Header publico (consistencia de marca)
- [ ] AC-008: Navbar sticky no topo (position: sticky, z-index adequado), consistente com o Header da landing page
- [ ] AC-009: WCAG 2.1 AA — navegacao completa via teclado (Tab, Enter, Escape para fechar menu), aria-labels em todos os controles interativos, skip-to-content link
- [ ] AC-010: Todos os textos via i18n (useTranslations) — PT-BR e EN
- [ ] AC-011: Nome do usuario exibido no menu (session.user.name) com fallback para email se nome nao disponivel

**Notas Tecnicas**
- O componente Header existente (`src/components/layout/Header.tsx`) e exclusivo da landing page (tem links "Entrar" e "Criar conta"). A navbar autenticada e um componente diferente com proposito diferente.
- Implementar como `AuthenticatedNavbar` ou `AppShell` — componente novo que substitui o Header nas rotas protegidas.
- Usar `auth()` server-side no layout para obter dados da sessao e passar ao componente.
- O `LanguageSwitcher` existente pode ser reutilizado.
- Considerar criar um route group `(app)` ou similar para agrupar todas as rotas autenticadas sob um layout comum.

**Fora do Escopo (v1)**
- Notificacoes no navbar (badge de alertas)
- Barra de busca global
- Menu de configuracoes avancadas

---

### US-101: Botao de logout
**Sprint**: 🟡 5 | **Status**: 🔵 Em andamento | **Prioridade**: P0 (bloqueante)

**User Story**
> As a authenticated user (@leisure-solo, @business-traveler, @leisure-family),
> I want to sign out of my account with a clearly visible button,
> So that I can end my session securely, especially on shared or public devices.

**Contexto do Viajante**
- **Pain point**: Nao existe nenhum botao ou link de logout na interface. O cookie JWT persiste indefinidamente. O usuario nao consegue trocar de conta, encerrar a sessao em dispositivo publico (hotel, aeroporto), ou simplesmente sair.
- **Workaround atual**: Limpar cookies manualmente no DevTools do browser (inviavel para usuarios comuns) ou aguardar expiracao natural do JWT.
- **Frequencia**: Impacta todo usuario que queira encerrar sua sessao ou trocar de conta.
- **Severidade**: Bloqueante — risco de seguranca em dispositivos compartilhados (quiosques de hotel, computadores de coworking). Viola praticas basicas de seguranca de sessao.

**Criterios de Aceite**
- [ ] AC-001: Botao "Sair" (PT-BR) / "Sign out" (EN) visivel no menu do usuario na navbar autenticada (US-100)
- [ ] AC-002: Ao clicar, executa `signOut()` do `next-auth/react` com redirect para a landing page (/)
- [ ] AC-003: Apos logout, o cookie de sessao JWT e removido completamente
- [ ] AC-004: Apos logout, tentar acessar /trips redireciona para /auth/login
- [ ] AC-005: Botao acessivel via teclado (Tab + Enter) e com aria-label descritivo
- [ ] AC-006: Confirmacao visual antes do logout NAO e necessaria (acao deve ser simples e imediata — 1 clique)
- [ ] AC-007: Em mobile, opcao de logout visivel no hamburger menu sem necessidade de scroll
- [ ] AC-008: Texto via i18n — chaves `auth.signOut` ja existem em ambos os arquivos de traducao

**Notas Tecnicas**
- `signOut` de `next-auth/react` ja esta disponivel no projeto — basta chamar `signOut({ callbackUrl: "/" })`.
- Integrar como item do dropdown/menu do usuario na US-100.
- Verificar se `signOut` limpa corretamente cookies HttpOnly (testar com DevTools > Application > Cookies apos logout).
- As chaves de i18n `auth.signOut` ("Sair" / "Sign out") ja existem nos arquivos `messages/pt-BR.json` e `messages/en.json`.

**Fora do Escopo (v1)**
- Logout de todos os dispositivos simultaneamente
- Confirmacao "Tem certeza que deseja sair?"

**Dependencias**
- US-100 (Navbar autenticada) — o botao de logout reside na navbar

---

### US-102: Corrigir exibicao de erro no formulario de login
**Sprint**: 🟡 5 | **Status**: 🔵 Em andamento | **Prioridade**: P0 (bloqueante)

**User Story**
> As a user attempting to sign in with invalid credentials (@leisure-solo, @business-traveler),
> I want to see a clear error message explaining why my login failed,
> So that I can correct my email or password and try again without confusion.

**Contexto do Viajante**
- **Pain point**: Quando o usuario digita credenciais invalidas, o formulario de login nao exibe nenhuma mensagem de erro visivel. O backend rejeita corretamente (testado via curl — retorna status adequado), e o codigo do `LoginForm.tsx` tem a logica de `setErrorKey("errors.invalidCredentials")`, mas algo impede a mensagem de aparecer no browser. O usuario clica "Entrar", nada acontece, e nao sabe o que fazer.
- **Workaround atual**: Nenhum. O usuario fica sem feedback e pode pensar que o sistema esta travado.
- **Frequencia**: Ocorre sempre que credenciais invalidas sao fornecidas — cenario extremamente comum (senhas esquecidas, typos no email).
- **Severidade**: Bloqueante — impede login funcional para qualquer usuario que erre a senha.

**Criterios de Aceite**
- [ ] AC-001: Ao submeter credenciais invalidas, mensagem de erro "E-mail ou senha incorretos." (PT-BR) / "Invalid email or password." (EN) aparece VISIVELMENTE no formulario, acima dos campos
- [ ] AC-002: A mensagem de erro usa role="alert" e aria-live="assertive" (ja implementado no JSX — verificar se funciona no runtime)
- [ ] AC-003: Mensagem de erro estilizada com fundo vermelho claro, borda vermelha, texto legivel (ja definido no CSS — confirmar renderizacao)
- [ ] AC-004: Ao corrigir e submeter novamente, a mensagem de erro anterior e limpa antes da nova tentativa
- [ ] AC-005: Em caso de erro de rede/servidor (500), exibir mensagem generica: "Ocorreu um erro. Tente novamente." — nunca stack trace
- [ ] AC-006: O botao "Entrar" volta ao estado normal apos erro (nao fica travado em loading)
- [ ] AC-007: Testavel: teste unitario deve confirmar que `setErrorKey` e chamado E que o componente renderiza a mensagem correspondente

**Notas Tecnicas (investigacao)**
O codigo em `LoginForm.tsx` (linhas 86-95) ja implementa a logica:
```typescript
const result = await signIn("credentials", { email, password, redirect: false });
if (!result?.ok) {
  setErrorKey("errors.invalidCredentials");
  return;
}
```
O JSX (linhas 132-141) ja condiciona `{errorKey !== null && (...)}` com o bloco de erro. O metodo `resolveError` (linhas 115-123) tenta resolver a chave via `t()` do next-intl. Possiveis causas do bug:
1. **`signIn` pode retornar `undefined` em vez de `{ ok: false }`** — verificar o comportamento exato do `signIn("credentials", { redirect: false })` do Auth.js v5 quando as credenciais falham. Em algumas versoes, `signIn` pode lancar uma excecao em vez de retornar `{ ok: false }`, e o bloco `finally` reseta `isSubmitting` sem que `setErrorKey` tenha sido chamado.
2. **A funcao `resolveError` pode lancar excecao** se `t("errors.invalidCredentials")` nao encontrar a chave no namespace `auth`. O i18n usa `useTranslations("auth")`, e a chave e `auth.errors.invalidCredentials` — o `t()` recebe `errors.invalidCredentials` como path, o que deveria funcionar com next-intl, mas precisa de validacao em runtime.
3. **O `finally` block executa `setIsSubmitting(false)` que pode causar re-render antes do `setErrorKey` propagar** — embora improvavel em React 18+ batching, vale investigar.
4. **Excecao nao capturada no `try`** — se `signIn` lanca excecao (em vez de retornar resultado), o `catch` nao existe no handler, e o erro vai direto para `finally` sem setar a mensagem.

Recomendacao: adicionar `catch (error)` explicito no handler para capturar excecoes do `signIn` e setar `setErrorKey("errors.invalidCredentials")` tambem no catch.

**Fora do Escopo (v1)**
- Rate limiting visual (mostrar "Muitas tentativas, tente em X minutos")
- CAPTCHA apos N tentativas falhas

---

### US-103: Breadcrumbs e navegacao de retorno nas sub-paginas
**Sprint**: 🟡 5 | **Status**: 🔵 Em andamento | **Prioridade**: P1 (importante, nao bloqueante)

**User Story**
> As a user navigating deep into trip details (@leisure-solo, @leisure-family, @group-organizer),
> I want to see breadcrumbs and a back button on sub-pages (itinerary, checklist, generate),
> So that I always know where I am and can return to the previous page without using the browser back button.

**Contexto do Viajante**
- **Pain point**: Ao acessar /trips/[id]/itinerary, /trips/[id]/checklist ou /trips/[id]/generate, nao ha indicacao visual de onde o usuario esta na hierarquia. Nao ha botao "Voltar" nem breadcrumbs. O usuario depende do botao "Back" do browser, que muitos viajantes em mobile nao usam ou nao encontram facilmente.
- **Workaround atual**: Usar botao "Back" do browser ou digitar URL manualmente.
- **Frequencia**: Ocorre em toda navegacao para sub-paginas de uma viagem — fluxo principal do produto.
- **Severidade**: Importante — nao impede o uso do app, mas cria desorientacao e frustracao, especialmente em mobile.

**Criterios de Aceite**
- [ ] AC-001: Breadcrumb trail visivel em todas as sub-paginas de viagem: `Minhas Viagens > [Nome da Viagem] > Itinerario/Checklist/Gerar Plano`
- [ ] AC-002: Cada segmento do breadcrumb e clicavel e navega para a pagina correspondente
- [ ] AC-003: Em mobile (375px), breadcrumb pode ser simplificado para `< Voltar para [Nome da Viagem]` (botao de retorno compacto) se o espaco horizontal for insuficiente
- [ ] AC-004: Breadcrumb usa semantica HTML correta: `<nav aria-label="Breadcrumb">` com `<ol>` e `aria-current="page"` no item ativo
- [ ] AC-005: Textos do breadcrumb via i18n — nomes de secoes traduzidos (Itinerario/Itinerary, Checklist/Checklist, Gerar Plano/Generate Plan)
- [ ] AC-006: O nome da viagem no breadcrumb e truncado com ellipsis se exceder 25 caracteres (evitar quebra de layout)
- [ ] AC-007: Breadcrumb posicionado abaixo da navbar e acima do conteudo da pagina — consistente em todas as sub-paginas
- [ ] AC-008: Breadcrumb responsivo — nao causa scroll horizontal em nenhuma resolucao
- [ ] AC-009: Componente reutilizavel `<Breadcrumb />` que recebe a hierarquia como props — nao hardcoded em cada pagina

**Notas Tecnicas**
- Criar componente `src/components/layout/Breadcrumb.tsx` reutilizavel.
- Usar `Link` de `@/i18n/navigation` para os links internos.
- O nome da viagem precisa ser obtido do contexto da pagina (params + fetch ou layout context).
- Adicionar chaves i18n necessarias ao namespace `common` ou `navigation`: `breadcrumb.myTrips`, `breadcrumb.itinerary`, `breadcrumb.checklist`, `breadcrumb.generatePlan`.

**Fora do Escopo (v1)**
- Breadcrumbs animados
- Historico de navegacao completo (tipo browser history)
- Breadcrumbs na landing page ou paginas de auth

**Dependencias**
- US-100 (Navbar autenticada) — breadcrumb e posicionado abaixo da navbar

---

### Prioridade e Ordem de Execucao — Sprint 5

| # | Story | Prioridade | Justificativa | Dependencia |
|---|-------|------------|---------------|-------------|
| 1 | US-100 | P0 (bloqueante) | Sem navbar, o app e inutilizavel apos login. Base para logout e toda navegacao. | Nenhuma |
| 2 | US-101 | P0 (bloqueante) | Sem logout, risco de seguranca em dispositivos compartilhados. Impossivel trocar de conta. | US-100 (navbar hospeda o botao) |
| 3 | US-102 | P0 (bloqueante) | Sem feedback de erro, usuario nao consegue resolver problemas de login. Impressao de produto quebrado. | Nenhuma (pode rodar em paralelo com US-100/101) |
| 4 | US-103 | P1 (importante) | Desorientacao em sub-paginas reduz confianca no produto. Menos urgente porque navbar (US-100) ja melhora a navegacao geral. | US-100 (posicionamento abaixo da navbar) |

### Scoring Matrix — Sprint 5

| Story | Pain Severity (30%) | Revenue Impact (25%) | Effort inv. (20%) | Strategic Align (15%) | Competitive Diff (10%) | Score |
|-------|---------------------|----------------------|--------------------|-----------------------|------------------------|-------|
| US-100 | 5 (1.50) | 5 (1.25) | 3 (0.60) | 5 (0.75) | 3 (0.30) | **4.40** |
| US-101 | 5 (1.50) | 4 (1.00) | 5 (1.00) | 5 (0.75) | 2 (0.20) | **4.45** |
| US-102 | 5 (1.50) | 4 (1.00) | 5 (1.00) | 4 (0.60) | 2 (0.20) | **4.30** |
| US-103 | 3 (0.90) | 3 (0.75) | 4 (0.80) | 4 (0.60) | 3 (0.30) | **3.35** |

### Plano de Execucao Detalhado — Sprint 5

**Spec**: SPEC-005 | **ADRs**: ADR-006 (route group), ADR-007 (shared LanguageSwitcher)
**Refinado por**: tech-lead | **Data**: 2026-03-01

#### Mapa de Dependencias

```
T-032 (route group + AppShell) ──┐
                                 ├──> T-031 (AuthenticatedNavbar + UserMenu) ──> T-033 (logout flow)
T-034 (fix LoginForm) ──────────┤                                                     |
                                 └──> T-035 (Breadcrumb component) ──> T-036 (integrar breadcrumbs)
                                                                              |
                                                                              v
                                                                       T-037 (QA final)
```

**Paralelismo**: T-032 e T-034 iniciam simultaneamente (sem dependencia entre si).
Apos T-032 concluir, T-031 e T-035 podem rodar em paralelo.

---

### T-032: Route group (app) + AppShellLayout + i18n + mover LanguageSwitcher
**Story**: US-100 | **Dev**: dev-fullstack-1 | **Esforco**: M
**Depende de**: nenhuma (primeira tarefa do sprint)
**Status**: [ ] Pendente

**Spec ref**: SPEC-005 Sec.2.1, Sec.4.1, Sec.6.1 (ADR-006), Sec.6.2 (ADR-007)

**Escopo:**
- [ ] Criar diretorio `src/app/[locale]/(app)/`
- [ ] Criar `src/app/[locale]/(app)/layout.tsx` (Server Component): chamar `auth()`, redirecionar se `!session?.user`, derivar `displayName`, renderizar skip-to-content + `AuthenticatedNavbar` placeholder + `<main id="main-content">`
- [ ] Mover `src/app/[locale]/trips/` para `src/app/[locale]/(app)/trips/` usando `git mv`
- [ ] Mover `src/app/[locale]/onboarding/page.tsx` para `src/app/[locale]/(app)/onboarding/page.tsx` usando `git mv`
- [ ] Mover `src/app/[locale]/dashboard/page.tsx` para `src/app/[locale]/(app)/dashboard/page.tsx` usando `git mv`
- [ ] Mover `src/components/landing/LanguageSwitcher.tsx` para `src/components/layout/LanguageSwitcher.tsx` usando `git mv`
- [ ] Atualizar import de `LanguageSwitcher` no `src/components/layout/Header.tsx` (de `@/components/landing/LanguageSwitcher` para `@/components/layout/LanguageSwitcher`)
- [ ] Atualizar import de `LanguageSwitcher` no teste `tests/unit/components/layout/Header.test.tsx` (se necessario)
- [ ] Atualizar import de `LanguageSwitcher` no teste `tests/unit/components/landing/LanguageSwitcher.test.tsx` (se necessario; ou mover o teste para `tests/unit/components/layout/`)
- [ ] Adicionar chaves i18n novas em `messages/pt-BR.json` e `messages/en.json`:
  - `common.skipToContent`: "Pular para o conteudo" / "Skip to content"
  - `navigation.myTrips`: "Minhas viagens" / "My trips"
  - `navigation.toggleMenu`: "Abrir menu" / "Toggle menu"
  - `navigation.closeMenu`: "Fechar menu" / "Close menu"
  - `navigation.userMenu`: "Menu do usuario" / "User menu"
  - `navigation.breadcrumb.myTrips`: "Minhas viagens" / "My trips"
  - `navigation.breadcrumb.itinerary`: "Itinerario" / "Itinerary"
  - `navigation.breadcrumb.checklist`: "Checklist" / "Checklist"
  - `navigation.breadcrumb.generatePlan`: "Gerar plano" / "Generate plan"
  - `navigation.breadcrumb.backTo`: "Voltar para {name}" / "Back to {name}"
- [ ] Executar `npm run build` e confirmar que compila sem erros
- [ ] Executar `npm run test` e confirmar 227+ testes passando (nenhum regression)
- [ ] Verificar manualmente que as URLs `/trips`, `/onboarding`, `/dashboard` continuam funcionando (route group nao altera URL)

**Done when:**
- Diretorio `(app)` existe com layout funcional
- Todas as rotas autenticadas estao sob `(app)/`
- `LanguageSwitcher` esta em `components/layout/` e `Header.tsx` importa corretamente
- Todas as chaves i18n do Sprint 5 estao em ambos os arquivos de traducao
- `npm run build` e `npm run test` passam sem erros
- O middleware continua protegendo `/trips`, `/onboarding`, `/account`, `/dashboard` (validar com request nao autenticado)

---

### T-034: Fix exibicao de erro no LoginForm
**Story**: US-102 | **Dev**: dev-fullstack-2 | **Esforco**: S
**Depende de**: nenhuma (paralelo com T-032)
**Status**: [ ] Pendente

**Spec ref**: SPEC-005 Sec.4.5

**Escopo:**
- [ ] Adicionar bloco `catch` explicito em `handleCredentialsSubmit` dentro de `src/components/features/auth/LoginForm.tsx`:
  ```typescript
  } catch {
    setErrorKey("errors.invalidCredentials");
  } finally {
  ```
- [ ] Adicionar try/catch defensivo na funcao `resolveError` para retornar a chave bruta como fallback se `t()` do next-intl lancar excecao
- [ ] Verificar que as chaves i18n `auth.errors.invalidCredentials` existem em `messages/pt-BR.json` ("E-mail ou senha incorretos.") e `messages/en.json` ("Invalid email or password.") -- confirmar, nao assumir
- [ ] Atualizar/adicionar testes unitarios em `tests/unit/components/auth/LoginForm.test.tsx`:
  - Teste: `setErrorKey` e chamado quando `signIn` lanca excecao (mock `signIn` para rejeitar com `throw`)
  - Teste: mensagem de erro visivel apos credenciais invalidas (mock `signIn` retornando `{ ok: false }`)
  - Teste: mensagem de erro limpa ao submeter novamente
  - Teste: `resolveError` retorna fallback se chave i18n nao existir
  - Teste: botao "Entrar" volta ao estado normal apos erro (`isSubmitting` = false)
- [ ] Executar `npm run test` e confirmar todos passando

**Done when:**
- `handleCredentialsSubmit` tem `try/catch/finally` completo
- `resolveError` tem fallback defensivo
- 5 testes novos/atualizados passando
- Credenciais invalidas resultam em mensagem de erro visivel (testavel via teste unitario)
- `npm run test` passa com 0 falhas

---

### T-031: Componentes AuthenticatedNavbar + UserMenu
**Story**: US-100, US-101 | **Dev**: dev-fullstack-2 | **Esforco**: L
**Depende de**: T-032 (precisa do `(app)/layout.tsx` e das chaves i18n)
**Status**: [ ] Pendente

**Spec ref**: SPEC-005 Sec.4.2 (AuthenticatedNavbar), Sec.4.3 (UserMenu), Sec.9 (Acessibilidade)

**Escopo:**

**Sub-tarefa 1: UserMenu component**
- [ ] Criar `src/components/layout/UserMenu.tsx` (Client Component `"use client"`)
- [ ] Props: `userName: string`, `userImage: string | null`, `userEmail: string`
- [ ] Renderizar avatar (imagem ou iniciais com `bg-primary/10`) com touch target minimo 44x44px
- [ ] Implementar dropdown com HTML/CSS + estado React (sem Radix DropdownMenu -- spec Sec.4.3 recomenda simplicidade para 1 item)
- [ ] Dropdown contem: nome do usuario, email (subtexto), separador, botao "Sair"
- [ ] `signOut({ callbackUrl: "/" })` de `next-auth/react` no botao "Sair" (US-101)
- [ ] Texto "Sair" via `useTranslations("auth")` -- chave `auth.signOut` ja existente
- [ ] Acessibilidade: `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`, fecha com Escape e clique fora
- [ ] Email renderizado condicionalmente (apenas quando dropdown expandido -- spec Sec.7.3 mitigacao PII)

**Sub-tarefa 2: AuthenticatedNavbar component**
- [ ] Criar `src/components/layout/AuthenticatedNavbar.tsx` (Client Component `"use client"`)
- [ ] Props: `userName: string`, `userImage: string | null`, `userEmail: string`
- [ ] Estrutura desktop (>= 768px): `[Logo + AppName] | [NavLinks: "Minhas Viagens"] | [LanguageSwitcher] [UserMenu]`
- [ ] Estrutura mobile (< 768px): `[Logo + AppName] [Hamburger]` + painel deslizante com links, LanguageSwitcher, info do usuario, botao "Sair"
- [ ] Logo: icone globo + "Travel Planner" (mesmo estilo do Header publico), link para `/trips`
- [ ] `sticky top-0 z-50` + `backdrop-blur` (mesmo pattern do Header existente)
- [ ] Active state no link "Minhas Viagens" via `usePathname()` de `@/i18n/navigation`
- [ ] Hamburger toggle: `transition-all duration-200`, fecha ao clicar link ou pressionar Escape
- [ ] Importar e usar `LanguageSwitcher` de `@/components/layout/LanguageSwitcher`
- [ ] Importar e usar `UserMenu` de `@/components/layout/UserMenu`
- [ ] Textos via `useTranslations("navigation")` para links e `useTranslations("common")` para appName
- [ ] Acessibilidade: `<header role="banner">` > `<nav aria-label="Main navigation">`, hamburger com `aria-expanded`, `aria-controls="mobile-menu"`, `aria-label` traduzido, fecha com Escape
- [ ] `prefers-reduced-motion` respeitado (sem animacao de slide em mobile se preferencia ativada)

**Sub-tarefa 3: Integrar no AppShellLayout**
- [ ] Atualizar `src/app/[locale]/(app)/layout.tsx` para importar e renderizar `AuthenticatedNavbar` (substituir placeholder)
- [ ] Passar `userName`, `userImage`, `userEmail` como props derivadas da sessao

**Sub-tarefa 4: Testes unitarios**
- [ ] Criar `tests/unit/components/layout/AuthenticatedNavbar.test.tsx`:
  - Renderiza logo, link "Minhas viagens", LanguageSwitcher, UserMenu
  - Link ativo destacado quando pathname = `/trips`
  - Mobile: hamburger toggle abre/fecha menu
  - Mobile: Escape fecha menu
- [ ] Criar `tests/unit/components/layout/UserMenu.test.tsx`:
  - Renderiza nome do usuario e iniciais quando sem imagem
  - Chama `signOut({ callbackUrl: "/" })` ao clicar "Sair"
  - Dropdown abre/fecha
  - Fecha com Escape
  - Email visivel apenas quando dropdown expandido
- [ ] Mocks necessarios: `next-auth/react` (signOut), `@/i18n/navigation` (usePathname, useRouter, Link), `next-intl` (useTranslations)
- [ ] Executar `npm run test` e confirmar todos passando

**Done when:**
- `AuthenticatedNavbar` renderiza em todas as rotas autenticadas (via layout)
- Navbar contem: logo (link para /trips), "Minhas Viagens" com active state, LanguageSwitcher, UserMenu
- Desktop: todos os itens visiveis horizontalmente
- Mobile (375px): hamburger menu funcional com todos os itens
- Logout funcional: `signOut({ callbackUrl: "/" })` chamado, redirect para `/`
- WCAG: skip-to-content, aria-labels, keyboard navigation, Escape fecha menus
- Todos os textos via i18n (PT-BR e EN)
- 9+ testes unitarios novos passando
- `npm run build` sem erros

---

### T-033: Validacao completa do fluxo de logout
**Story**: US-101 | **Dev**: dev-fullstack-2 | **Esforco**: S
**Depende de**: T-031 (UserMenu com botao "Sair" implementado)
**Status**: [ ] Pendente

**Spec ref**: SPEC-005 Sec.2.3 (fluxo logout), Sec.7.2 (limpeza de sessao)

**Escopo:**
- [ ] Validar que `signOut({ callbackUrl: "/" })` no UserMenu funciona end-to-end:
  - Cookie de sessao removido apos logout
  - Redirect para `/` (landing page)
  - Tentativa de acessar `/trips` apos logout redireciona para `/auth/login`
- [ ] Verificar que o middleware (`src/middleware.ts`) detecta `!req.auth` corretamente apos logout
- [ ] Testar em mobile: opcao "Sair" visivel no hamburger menu sem necessidade de scroll
- [ ] Adicionar testes unitarios em `tests/unit/components/layout/UserMenu.test.tsx` (se nao cobertos em T-031):
  - Teste: `signOut` chamado com `{ callbackUrl: "/" }` ao clicar "Sair"
  - Teste: botao "Sair" acessivel via teclado (Tab + Enter)

**Done when:**
- Logout limpa sessao completamente
- Redirect para `/` apos logout
- `/trips` redireciona para `/auth/login` apos logout
- Em mobile, "Sair" visivel sem scroll no hamburger
- Testes unitarios passando

---

### T-035: Componente Breadcrumb reutilizavel
**Story**: US-103 | **Dev**: dev-fullstack-1 | **Esforco**: M
**Depende de**: T-032 (precisa das chaves i18n e do route group para testar posicionamento)
**Status**: [ ] Pendente

**Spec ref**: SPEC-005 Sec.4.4 (Breadcrumb), Sec.6.3 (decisao: breadcrumb na pagina), Sec.9.1 (acessibilidade)

**Escopo:**
- [ ] Criar `src/components/layout/Breadcrumb.tsx`
- [ ] Interface de props:
  ```typescript
  interface BreadcrumbItem {
    label: string;
    href?: string; // ultimo item (pagina atual) nao tem href
  }
  interface BreadcrumbProps {
    items: BreadcrumbItem[];
  }
  ```
- [ ] Estrutura HTML semantica: `<nav aria-label="Breadcrumb">` > `<ol>` > `<li>` com separadores `aria-hidden="true"`
- [ ] Ultimo item com `<span aria-current="page">` (sem link)
- [ ] Itens intermediarios com `<Link>` de `@/i18n/navigation`
- [ ] Truncamento: nomes > 25 caracteres recebem `truncate` CSS + `title` attribute com texto completo
- [ ] Responsividade mobile (< 640px): `hidden sm:flex` para trail completo + `flex sm:hidden` para back link compacto ("< Voltar para {name}")
- [ ] Texto do back link via `useTranslations("navigation")` -- chave `navigation.breadcrumb.backTo`
- [ ] Criar `tests/unit/components/layout/Breadcrumb.test.tsx`:
  - Renderiza trail completo com links clicaveis
  - Ultimo item sem link, com `aria-current="page"`
  - Truncamento em nomes > 25 caracteres (verifica `title` attribute)
  - Mobile: renderiza back link compacto (verifica texto e link)
  - Separadores com `aria-hidden="true"`
- [ ] Executar `npm run test` e confirmar todos passando

**Done when:**
- Componente `Breadcrumb` criado e exportado
- Suporta N itens de navegacao via props
- Semantica HTML e acessibilidade WCAG corretas
- Responsivo: trail completo em desktop, back link compacto em mobile
- Truncamento funciona para nomes longos
- 5+ testes unitarios passando
- `npm run build` sem erros

---

### T-036: Integrar breadcrumbs nas sub-paginas de viagem
**Story**: US-103 | **Dev**: dev-fullstack-1 | **Esforco**: M
**Depende de**: T-035 (componente Breadcrumb pronto), T-032 (rotas sob (app))
**Status**: [ ] Pendente

**Spec ref**: SPEC-005 Sec.4.4 (posicionamento na pagina), Sec.6.3 (decisao: cada pagina renderiza seu breadcrumb)

**Escopo:**
- [ ] Adicionar `<Breadcrumb>` em `src/app/[locale]/(app)/trips/[id]/page.tsx`:
  ```typescript
  <Breadcrumb items={[
    { label: tNav("breadcrumb.myTrips"), href: "/trips" },
    { label: trip.title },
  ]} />
  ```
- [ ] Adicionar `<Breadcrumb>` em `src/app/[locale]/(app)/trips/[id]/itinerary/page.tsx`:
  ```typescript
  <Breadcrumb items={[
    { label: tNav("breadcrumb.myTrips"), href: "/trips" },
    { label: trip.title, href: `/trips/${trip.id}` },
    { label: tNav("breadcrumb.itinerary") },
  ]} />
  ```
- [ ] Adicionar `<Breadcrumb>` em `src/app/[locale]/(app)/trips/[id]/checklist/page.tsx`:
  ```typescript
  <Breadcrumb items={[
    { label: tNav("breadcrumb.myTrips"), href: "/trips" },
    { label: trip.title, href: `/trips/${trip.id}` },
    { label: tNav("breadcrumb.checklist") },
  ]} />
  ```
- [ ] Adicionar `<Breadcrumb>` em `src/app/[locale]/(app)/trips/[id]/generate/page.tsx`:
  ```typescript
  <Breadcrumb items={[
    { label: tNav("breadcrumb.myTrips"), href: "/trips" },
    { label: trip.title, href: `/trips/${trip.id}` },
    { label: tNav("breadcrumb.generatePlan") },
  ]} />
  ```
- [ ] Garantir que cada pagina obtem `trip.title` via fetch/params (verificar como as paginas atuais obtem dados da viagem)
- [ ] Remover links "Voltar" existentes nas sub-paginas (se houver), substituidos pelo breadcrumb
- [ ] Posicionar breadcrumb logo apos a abertura do `<main>`, antes do conteudo da pagina
- [ ] Executar `npm run build` e confirmar que compila sem erros

**Done when:**
- Breadcrumb visivel em `/trips/[id]`, `/trips/[id]/itinerary`, `/trips/[id]/checklist`, `/trips/[id]/generate`
- Cada segmento do breadcrumb e clicavel e navega corretamente
- Em mobile, back link compacto funciona
- Nomes de viagem truncados corretamente
- `npm run build` sem erros

---

### T-037: Testes finais e validacao QA do Sprint 5
**Story**: ALL | **Dev**: qa-engineer | **Esforco**: M
**Depende de**: T-031, T-033, T-034, T-035, T-036 (todas as tarefas de implementacao)
**Status**: [ ] Pendente

**Spec ref**: SPEC-005 Sec.10 (Testing Strategy completa)

**Escopo:**

**Testes unitarios (revisao de cobertura):**
- [ ] Confirmar >= 80% de cobertura nos novos componentes: `AuthenticatedNavbar`, `UserMenu`, `Breadcrumb`
- [ ] Confirmar testes do `LoginForm` atualizados (catch + resolveError fallback)
- [ ] Verificar que todos os mocks estao corretos e isolados

**Testes de integracao:**
- [ ] AppShellLayout renderiza navbar quando sessao valida
- [ ] AppShellLayout redireciona quando sessao invalida

**Testes E2E (se Playwright configurado):**
- [ ] Navbar presente em rotas autenticadas: login > verificar navbar em /trips, /trips/[id], /trips/[id]/itinerary
- [ ] Logout funcional: login > clicar Sair > verificar redirect para / > acessar /trips > verificar redirect para /auth/login
- [ ] Erro de login visivel: navegar para /auth/login > submeter credenciais invalidas > verificar mensagem de erro visivel
- [ ] Breadcrumb navegacao: login > ir para /trips/[id]/itinerary > verificar breadcrumb > clicar no nome da viagem > verificar navegacao
- [ ] Mobile navbar (375px): viewport 375px > login > verificar hamburger > abrir menu > verificar links > logout

**Validacao de acessibilidade:**
- [ ] axe-core sem violacoes em AuthenticatedNavbar, UserMenu, Breadcrumb
- [ ] Keyboard navigation: Tab completo pela pagina, Escape fecha menus, Enter ativa links
- [ ] Contraste minimo 4.5:1 para texto, 3:1 para componentes UI

**Validacao final:**
- [ ] `npm run build` sem erros
- [ ] `npm run test` com 0 falhas (total >= 250 testes)
- [ ] Mobile 375px: todas as telas validadas visualmente
- [ ] Desktop 1280px: todas as telas validadas visualmente

**Done when:**
- Cobertura >= 80% nos novos componentes
- Todos os testes E2E passando (happy path + erro)
- WCAG 2.1 AA validado (axe-core + manual)
- 0 regressoes nos 227 testes existentes
- Build limpo

---

### Cronograma de Execucao — Sprint 5

```
Dia 1:  [dev-fullstack-1] T-032 (route group + AppShell + i18n + mover arquivos)
        [dev-fullstack-2] T-034 (fix LoginForm — paralelo, sem dependencia)

Dia 2:  [dev-fullstack-1] T-035 (Breadcrumb component)         ← depende de T-032
        [dev-fullstack-2] T-031 (AuthenticatedNavbar + UserMenu) ← depende de T-032

Dia 3:  [dev-fullstack-1] T-036 (integrar breadcrumbs nas paginas) ← depende de T-035
        [dev-fullstack-2] T-033 (validacao logout flow)             ← depende de T-031

Dia 4:  [qa-engineer]     T-037 (testes finais + validacao QA)     ← depende de tudo
        [dev-fullstack-1]  Suporte a QA + fixes
        [dev-fullstack-2]  Suporte a QA + fixes
```

### Definition of Done — Sprint 5

- [ ] T-032: Route group `(app)` criado, rotas movidas, chaves i18n adicionadas
- [ ] T-034: LoginForm corrigido com catch + resolveError defensivo + testes
- [ ] T-031: AuthenticatedNavbar + UserMenu implementados com testes
- [ ] T-033: Logout validado end-to-end (cookie, redirect, middleware)
- [ ] T-035: Componente Breadcrumb reutilizavel com testes
- [ ] T-036: Breadcrumbs integrados em todas as sub-paginas de viagem
- [ ] T-037: QA final — cobertura >= 80%, WCAG validado, mobile 375px OK
- [ ] Code review aprovado pelo tech-lead para cada PR
- [ ] Security checklist passado (sem secrets, PII nao logada, inputs validados)
- [ ] Nenhum risco de bias identificado
- [ ] Merged em main via PR — nenhum commit direto
- [ ] `npm run build` sem erros
- [ ] Total de testes >= 250 passando, 0 falhas
- [ ] ADRs 006 e 007 documentados em `docs/architecture.md` (ja feito pelo architect)

---

## 🟢 Sprint 1 — Em Andamento

**Objetivo**: MVP funcionando end-to-end — autenticação com trust signals, onboarding guiado, criação de viagem, IA gerando plano e checklist, i18n.

---

### US-001: Criar conta
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0

**User Story**
> As a novo usuário,
> I want to criar uma conta em ≤ 3 campos (Google OAuth ou email),
> So that eu possa começar a planejar minha viagem rapidamente com segurança.

**Critérios de Aceite**
- [ ] AC-001: Cadastro via Google OAuth em 1 clique
- [ ] AC-002: Cadastro via email com máx. 3 campos visíveis (email, senha, confirmação)
- [ ] AC-003: Verificação de e-mail obrigatória antes do primeiro acesso
- [ ] AC-004: Mensagens de erro em português, nunca códigos técnicos
- [ ] AC-005: Formulário validado em mobile 375px e desktop 1280px

---

### US-002: Login e logout
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0

**User Story**
> As a usuário cadastrado,
> I want to fazer login com sessão persistente e logout seguro,
> So that eu possa acessar minhas viagens de qualquer dispositivo com segurança.

**Critérios de Aceite**
- [ ] AC-001: Login via Google OAuth ou email/senha
- [ ] AC-002: Sessão persistente (não expira em uso normal)
- [ ] AC-003: Logout limpa sessão completamente (database sessions, não JWT)
- [ ] AC-004: Recuperação de senha em 2 passos (email → nova senha)
- [ ] AC-005: Redirecionamento pós-login para última página visitada

---

### US-002B: Trust signals no cadastro 🆕
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0

**User Story**
> As a novo usuário desconfiante,
> I want to ver sinais claros de segurança e privacidade na tela de cadastro,
> So that eu me sinta seguro para fornecer meus dados.

**Critérios de Aceite**
- [ ] AC-001: Badge de segurança visível na tela de cadastro
- [ ] AC-002: Mini política de privacidade em 2 linhas (linguagem simples, sem juridiquês)
- [ ] AC-003: Link visível para "excluir minha conta" acessível a partir do cadastro
- [ ] AC-004: Textos revisados por UX designer — sem termos técnicos ou legais

---

### US-003: Aha moment — onboarding guiado 🆕
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0

**User Story**
> As a novo usuário que acabou de se cadastrar,
> I want to ser guiado em 3 passos até gerar meu primeiro plano de viagem,
> So that eu entenda o valor do produto em ≤ 60 segundos.

**Critérios de Aceite**
- [ ] AC-001: Onboarding de 3 passos pós-cadastro: boas-vindas → criar viagem → gerar plano
- [ ] AC-002: Progress indicator visível em cada etapa
- [ ] AC-003: Opção de "pular" (skip) disponível em cada passo
- [ ] AC-004: Animações suaves entre os passos (sem travamentos)
- [ ] AC-005: Meta: do cadastro ao primeiro plano gerado em ≤ 60 segundos
- [ ] AC-006: Evento `onboarding.completed` disparado ao final

---

### US-004: Criar viagem
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0
**Spec**: SPEC-001 | **Security**: SEC-SPEC-001 — CLEARED WITH CONDITIONS
**QA**: QA-SPEC-001 | **Release**: CIA-001 — v0.1.0

**User Story**
> As a viajante planejando uma viagem,
> I want to criar uma nova viagem com destino, datas e número de viajantes,
> So that eu possa organizar meu planejamento em um só lugar.

**Critérios de Aceite**
- [ ] AC-001: Formulário com máx. 3 campos visíveis (destino, datas, nº viajantes)
- [ ] AC-002: Autocomplete de destino via Google Places API
- [ ] AC-003: Seletor de datas com validação (data início ≤ data fim)
- [ ] AC-004: Limite de 20 viagens ativas por usuário
- [ ] AC-005: Redirecionamento para tela de geração de plano após criação

**Fora do Escopo (v1)**
- Múltiplos destinos (MVP2)
- Upload de imagem de capa (usar gradiente/emoji)

---

### US-005: Editar e excluir viagem
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0

**User Story**
> As a viajante com planos que mudaram,
> I want to editar os dados da minha viagem ou excluí-la,
> So that minhas informações estejam sempre atualizadas.

**Critérios de Aceite**
- [ ] AC-001: Todos os campos editáveis após criação
- [ ] AC-002: Exclusão com confirmação explícita (digitar nome da viagem)
- [ ] AC-003: Lista de viagens atualizada imediatamente após edição/exclusão
- [ ] AC-004: Soft delete — dados recuperáveis por 30 dias (LGPD)
- [ ] AC-005: Autorização BOLA-safe — usuário só acessa suas próprias viagens

---

### US-006: Gerar plano de viagem com IA 🆕
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0

**User Story**
> As a viajante que criou uma viagem,
> I want to gerar automaticamente um plano de itinerário com a IA em ≤ 3 interações,
> So that eu tenha um ponto de partida completo sem precisar pesquisar horas.

**Critérios de Aceite**
- [ ] AC-001: Fluxo em máx. 3 interações: destino+datas → estilo visual → orçamento slider → gerar
- [ ] AC-002: Seleção visual de estilo de viagem (ícones: aventura, cultura, relaxamento, gastronomia)
- [ ] AC-003: Slider de orçamento total (R$ ou USD)
- [ ] AC-004: Animação/loading durante geração — nunca tela em branco
- [ ] AC-005: Plano gerado em ≤ 60 segundos
- [ ] AC-006: Cache de respostas similares para reduzir custo de API
- [ ] AC-007: Evento `ai.plan.generated` disparado ao concluir

---

### US-007: Editar plano gerado
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0

**User Story**
> As a viajante com o plano gerado pela IA,
> I want to ajustar o itinerário (adicionar, editar, reordenar e excluir atividades),
> So that o plano final reflita exatamente o que quero fazer.

**Critérios de Aceite**
- [ ] AC-001: Drag-and-drop para reordenar atividades dentro de um dia
- [ ] AC-002: Drag-and-drop para mover atividades entre dias
- [ ] AC-003: Adicionar nova atividade em qualquer dia
- [ ] AC-004: Editar e excluir atividades existentes
- [ ] AC-005: Interface touch-friendly (funciona em mobile 375px)
- [ ] AC-006: Alterações salvas automaticamente (auto-save)

---

### US-008: Gerar checklist com IA
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P0

**User Story**
> As a viajante se preparando para a viagem,
> I want to receber automaticamente um checklist adaptado ao destino,
> So that eu não esqueça documentos, vacinas, moeda local ou itens específicos.

**Critérios de Aceite**
- [ ] AC-001: Checklist gerado automaticamente ao criar o plano
- [ ] AC-002: Categorias: documentos, saúde, moeda, clima, tecnologia
- [ ] AC-003: Checklist editável — adicionar, editar e excluir itens
- [ ] AC-004: Checkbox interativo (marcar/desmarcar itens)
- [ ] AC-005: Categorias visualmente distintas (ícone + cor)
- [ ] AC-006: Evento `ai.checklist.generated` disparado ao concluir

---

### US-015: Alternar idioma PT/EN
**Sprint**: 🟢 1 | **Status**: 🔵 Em andamento | **Prioridade**: P1

**User Story**
> As a usuário,
> I want to alternar entre português e inglês na interface,
> So that eu possa usar o app no idioma de minha preferência.

**Critérios de Aceite**
- [ ] AC-001: Interface 100% traduzida em PT-BR e EN
- [ ] AC-002: Seletor de idioma visível no perfil do usuário
- [ ] AC-003: Preferência de idioma salva no perfil (persiste entre sessões)
- [ ] AC-004: Estrutura i18n preparada para adicionar novos idiomas facilmente
- [ ] AC-005: Todos os textos gerados pela IA respeitam o idioma selecionado

---

## 🟡 Sprint 2A — Backlog

**Objetivo**: Completar o ciclo ANTES — orçamento planejado, câmbio em tempo real, links externos e exclusão de dados (LGPD).

---

### US-009: Definir orçamento
**Sprint**: 🟡 2A | **Status**: ⬜ Pendente | **Prioridade**: P0

**User Story**
> As a viajante planejando os custos,
> I want to definir um orçamento por categoria com suporte a múltiplas moedas,
> So that eu saiba exatamente quanto posso gastar em cada área da viagem.

**Critérios de Aceite**
- [ ] AC-001: Orçamento definível por categoria (hospedagem, transporte, alimentação, atividades, outros)
- [ ] AC-002: Seletor visual de moeda (bandeira + código: BRL, USD, EUR...)
- [ ] AC-003: Câmbio em tempo real via ExchangeRate-API
- [ ] AC-004: Total calculado automaticamente ao alterar valores
- [ ] AC-005: Cache de câmbio por 1 hora com fallback gracioso se API falhar

---

### US-010: Links para passagens e hotel
**Sprint**: 🟡 2A | **Status**: ⬜ Pendente | **Prioridade**: P1

**User Story**
> As a viajante pronto para reservar,
> I want to ver links diretos para buscar voos e hotéis a partir do meu itinerário,
> So that eu possa reservar sem sair do contexto da minha viagem.

**Critérios de Aceite**
- [ ] AC-001: Cards no itinerário com deep-link para Kayak (voos) pré-preenchido com destino e datas
- [ ] AC-002: Cards no itinerário com deep-link para Booking (hotéis) pré-preenchido
- [ ] AC-003: Links abrem em nova aba
- [ ] AC-004: Sem booking interno — apenas redirecionamento para parceiros

---

### US-016: Excluir conta e dados (LGPD) 🆕
**Sprint**: 🟡 2A | **Status**: ⬜ Pendente | **Prioridade**: P0

**User Story**
> As a usuário que deseja remover seus dados,
> I want to excluir minha conta e todos os meus dados em 2 passos,
> So that eu possa exercer meu direito à exclusão garantido pela LGPD.

**Critérios de Aceite**
- [ ] AC-001: Opção "Excluir minha conta" visível no perfil (sem obstáculos ou dark patterns)
- [ ] AC-002: Confirmação em 2 passos: aviso claro → confirmação final
- [ ] AC-003: Remoção de TODOS os dados do usuário (viagens, gastos, checklist, perfil)
- [ ] AC-004: Audit log da exclusão mantido por 7 anos (apenas hash do ID, sem PII)
- [ ] AC-005: Confirmação enviada por e-mail após exclusão concluída
- [ ] AC-006: Processo concluído em ≤ 30 dias (LGPD Art. 18)

---

## 🟣 Sprint 2B — Backlog

**Objetivo**: Completar o ciclo DURANTE — gastos reais, dashboard planejado vs. gasto, alertas de estouro.

---

### US-011: Registrar gasto
**Sprint**: 🟣 2B | **Status**: ⬜ Pendente | **Prioridade**: P0

**User Story**
> As a viajante em viagem,
> I want to lançar um gasto em ≤ 3 toques (valor, categoria, confirmar),
> So that eu consiga registrar gastos rapidamente sem interromper o passeio.

**Critérios de Aceite**
- [ ] AC-001: Fluxo máx. 3 toques: valor → categoria (ícones) → confirmar
- [ ] AC-002: Interface touch-friendly, testada em 375px
- [ ] AC-003: Campos: valor, moeda, categoria, data (default: hoje), descrição (opcional)
- [ ] AC-004: Gasto aparece imediatamente no dashboard após confirmação

---

### US-012: Ver planejado vs. gasto
**Sprint**: 🟣 2B | **Status**: ⬜ Pendente | **Prioridade**: P0

**User Story**
> As a viajante controlando o orçamento,
> I want to ver em tempo real quanto gastei vs. quanto planejei por categoria,
> So that eu possa ajustar meus gastos antes de estourar o orçamento.

**Critérios de Aceite**
- [ ] AC-001: Dashboard visual com barra de progresso por categoria
- [ ] AC-002: Total restante calculado em tempo real
- [ ] AC-003: Atualização imediata ao registrar novo gasto (sem reload)
- [ ] AC-004: Exibição em moeda local do usuário com conversão automática

---

### US-013: Alerta de estouro de orçamento
**Sprint**: 🟣 2B | **Status**: ⬜ Pendente | **Prioridade**: P1

**User Story**
> As a viajante se aproximando do limite do orçamento,
> I want to receber um alerta visual não invasivo ao atingir 80% e 100% do orçamento,
> So that eu seja avisado antes de estourar sem ser interrompido.

**Critérios de Aceite**
- [ ] AC-001: Alerta visual (badge/banner) ao atingir 80% do orçamento por categoria
- [ ] AC-002: Alerta visual ao atingir 100% (estouro)
- [ ] AC-003: Alertas não bloqueiam a tela (não-invasivos)
- [ ] AC-004: Opção de dismiss (fechar) disponível
- [ ] AC-005: Alertas persistem até que o usuário faça dismiss

---

### US-014: Ajustar plano on-the-go
**Sprint**: 🟣 2B | **Status**: ⬜ Pendente | **Prioridade**: P1

**User Story**
> As a viajante que precisa mudar os planos durante a viagem,
> I want to editar meu itinerário diretamente no celular,
> So that eu possa adaptar o roteiro em tempo real sem precisar do desktop.

**Critérios de Aceite**
- [ ] AC-001: Interface de edição otimizada para touch (mobile 375px)
- [ ] AC-002: Botões com área de toque ≥ 44x44px (WCAG 2.5.5)
- [ ] AC-003: Edição funcional em conexão lenta (3G simulado)
- [ ] AC-004: Alterações salvas com feedback visual imediato

---

## ❌ Fora do Escopo — MVP2

| Feature | Razão |
|---------|-------|
| Comparativo pós-viagem | Requer dados reais de gastos — validar primeiro |
| Compartilhamento & grupo | Complexidade de colaboração — validar uso solo/casal primeiro |
| Exportar PDF | Feature de fechamento — só útil após validar ciclo completo |
| Múltiplos destinos | Simplifica UX — 1 destino valida o core loop |
| Import reservas via e-mail | Parsing de e-mail frágil — adicionar após IA validada |
| IA — recomendações personalizadas | Requer histórico — impossível no MVP |
| App mobile nativo | Web responsivo valida o produto; nativo após tração |

---

## 📋 Lista de Tarefas — 30 Tasks

### 🟢 Sprint 1 (T-001 a T-014)

| # | Stories | Tipo | Descrição | Agente |
|---|---------|------|-----------|--------|
| T-001 | US-001/002 | Backend | ✅ Auth.js — Google OAuth + credentials, verificação de e-mail obrigatória, recuperação de senha 2 passos | dev-fullstack-1 |
| T-002 | US-001/002 | Frontend | UI autenticação — cadastro máx. 3 campos, login, recuperação — WCAG 2.1 AA, mobile-first 375px | dev-fullstack-2 |
| T-003 | US-002B | Frontend 🆕 | Trust signals no cadastro — badge de segurança, mini política em 2 linhas, linguagem simples | dev-fullstack-2 |
| T-004 | US-003 | Frontend 🆕 | Onboarding 3 passos pós-cadastro — animações suaves, progress indicator, skip opcional, aha moment ≤ 60s | dev-fullstack-2 |
| T-005 | US-004/005 | Backend | ✅ CRUD de viagens — Server Actions, validação Zod, autorização BOLA-safe, testes unitários | dev-fullstack-1 |
| T-006 | US-004/005 | Frontend | ✅ UI dashboard de viagens — lista, card visual, modal criação/edição, TripDashboard SSR + TanStack Query | dev-fullstack-2 |
| T-007 | US-006 | Backend 🆕 | ✅ Claude API — prompt engineering para geração de plano (itinerário dia a dia, atividades, custos estimados, cache) | dev-fullstack-1 |
| T-008 | US-006 | Frontend 🆕 | ✅ UI geração de plano — seleção visual de estilo (ícones), slider de orçamento, animação de loading, máx. 3 interações | dev-fullstack-2 |
| T-009 | US-007 | Frontend | ✅ Editor de itinerário — drag-and-drop, add/edit/delete por dia, touch-friendly | dev-fullstack-2 |
| T-010 | US-008 | Backend | ✅ Claude API — prompt engineering para checklist por destino (docs, saúde, moeda, clima, tecnologia) | dev-fullstack-1 |
| T-011 | US-008 | Frontend | ✅ UI checklist — lista editável, checkbox, categorias visuais, add item manual | dev-fullstack-2 |
| T-012 | US-015 | Backend | ✅ Setup i18n (next-intl) — PT-BR e EN, estrutura para novos idiomas, seletor no perfil | dev-fullstack-1 |
| T-013 | ALL | QA | Testes unitários Sprint 1 — cobertura ≥ 80%, foco em auth, IA e CRUD de viagens | qa-engineer |
| T-014 | ALL | QA | E2E Sprint 1 — cadastro → onboarding → criar viagem → gerar plano → gerar checklist → validar 375px | qa-engineer |

### 🟡 Sprint 2A (T-015 a T-021)

| # | Stories | Tipo | Descrição | Agente |
|---|---------|------|-----------|--------|
| T-015 | US-009 | Backend | CRUD de orçamento — categorias configuráveis, valor planejado, suporte multicurrency | dev-fullstack-1 |
| T-016 | US-009 | Frontend | UI orçamento — input por categoria, seletor visual de moeda, total calculado em tempo real | dev-fullstack-2 |
| T-017 | US-009 | Backend | Integração ExchangeRate-API — câmbio em tempo real, cache 1h, fallback gracioso | dev-fullstack-1 |
| T-018 | US-010 | Frontend | Cards do itinerário com deep-link Kayak (voos) e Booking (hotéis) por destino e data | dev-fullstack-2 |
| T-019 | US-016 | Backend 🆕 | Endpoint exclusão de conta — remove todos os dados (LGPD), confirmação 2 passos, audit log | dev-fullstack-1 |
| T-020 | US-016 | Frontend 🆕 | UI exclusão de conta no perfil — visível, sem obstáculos, linguagem clara, confirmação 2 passos | dev-fullstack-2 |
| T-021 | ALL | QA | Testes Sprint 2A — orçamento, câmbio, links, exclusão de dados, cenários de erro | qa-engineer |

### 🟣 Sprint 2B (T-022 a T-030)

| # | Stories | Tipo | Descrição | Agente |
|---|---------|------|-----------|--------|
| T-022 | US-011 | Backend | CRUD de gastos — valor, categoria, data, descrição, moeda | dev-fullstack-1 |
| T-023 | US-011 | Frontend | UI lançar gasto — ≤ 3 toques: valor, categoria (ícones), confirmar — touch-friendly | dev-fullstack-2 |
| T-024 | US-012 | Frontend | Dashboard planejado vs. gasto — barra de progresso por categoria, total restante, tempo real | dev-fullstack-2 |
| T-025 | US-013 | Frontend | Alertas de estouro — badge visual em 80% e 100%, não invasivo, dismiss opcional | dev-fullstack-2 |
| T-026 | US-014 | Frontend | Edição de itinerário responsiva — touch-friendly, testada em 375px | dev-fullstack-2 |
| T-027 | ALL | QA | Testes Sprint 2B — gastos, dashboard, alertas, E2E completo ciclo DURANTE, teste 3G simulado | qa-engineer |
| T-028 | ALL | Security | Security audit pré-release — OWASP Top 10, dados financeiros, PII, LGPD compliance | security-specialist |
| T-029 | ALL | DevOps | CI/CD produção — pipeline completo, deploy canary, smoke tests, monitoring, alertas P0/P1 | devops-engineer |
| T-030 | ALL | DevOps | Observabilidade — dashboards Datadog, SLOs, axe-core no pipeline para WCAG automático | devops-engineer |

---

## ✅ Concluído

- T-012: i18n setup (next-intl) — PT-BR e EN, namespaces, middleware, locale routing
- T-001: Auth.js backend — Google OAuth + credentials, verificação de e-mail, recuperação de senha, testes unitários
- T-005: CRUD de viagens — TripService, Server Actions, BOLA-safe, testes unitários (15 tests)
- T-006: UI dashboard de viagens — TripDashboard, TripCard, modais, QueryProvider, SSR + TanStack Query
- T-007: Claude API — AiService.generateTravelPlan, cache Redis MD5, Zod validation, 12 testes unitários
- T-010: Claude API — AiService.generateChecklist, cache por mês, Zod validation (incluído em T-007)
- T-008: UI geração de plano — PlanGeneratorWizard 3 passos, LoadingPlanAnimation, page /generate
- T-009: Editor drag-and-drop — ItineraryEditor (dnd-kit), ItineraryDayCard, ActivityItem, page /itinerary
- T-011: UI checklist — ChecklistView, ChecklistCategorySection, ChecklistItemRow, page /checklist

---

*Fonte: user-story-map-v2.docx — Travel Planner MVP v2.0, revisão crítica Fevereiro 2026*
*Gerado pelo time: product-owner · architect · ux-designer · tech-lead · security-specialist*

---

## Sprint 1 — Plano Detalhado

**Periodo**: Semana 1 + Semana 2 (10 dias uteis)
**Sprint Goal**: MVP funcionando end-to-end — cadastro com trust signals → onboarding → criar viagem → IA gera plano e checklist → i18n PT/EN

---

### Setup Obrigatorio (Dia 0 — antes do primeiro commit)

- [ ] SETUP-001: Variaveis de ambiente configuradas e validadas via `src/lib/env.ts` (`ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL`)
- [ ] SETUP-002: Branch `feat/sprint-1` criada a partir de `main` — todos os PRs apontam para esta branch
- [ ] SETUP-003: `next-intl` instalado e configurado com estrutura de namespaces (`common`, `auth`, `trips`, `onboarding`, `checklist`); arquivos `messages/pt-BR.json` e `messages/en.json` criados
- [ ] SETUP-004: Prisma schema atualizado com modelos `User`, `Trip`, `ItineraryDay`, `Activity`, `ChecklistItem` — migration inicial executada em dev
- [ ] SETUP-005: Subpastas de codigo criadas conforme `docs/architecture.md`: `src/server/services/`, `src/server/actions/`, `src/server/cache/`, `src/components/features/trips/`, `src/components/features/onboarding/`, `src/components/features/itinerary/`, `src/components/features/checklist/`
- [ ] SETUP-006: `docker-compose.yml` funcional com PostgreSQL 16 e Redis 7 — `docker compose up -d` executado com sucesso no ambiente de cada dev
- [ ] SETUP-007: `.env.example` atualizado com todas as novas variaveis do Sprint 1 (sem valores reais)
- [ ] SETUP-008: `vitest.config.ts` e `playwright.config.ts` configurados; `npm run test` e `npm run test:e2e` executam sem erro

---

### Mapa de Dependencias

```
SETUP (Dia 0)
    |
    +---> T-001 (Auth backend) ---------> T-002 (Auth frontend UI)
    |                                           |
    |                                           +---> T-003 (Trust signals)   [paralelo com T-004]
    |                                           |
    |                                           +---> T-004 (Onboarding)      [paralelo com T-003]
    |
    +---> T-012 (i18n setup) -----------> [TODOS os textos frontend dependem disto]
    |
    +---> T-005 (CRUD viagens backend) -> T-006 (UI dashboard viagens)
    |
    +---> T-007 (Claude API plano) -----> T-008 (UI geracao de plano)
    |         |
    |         +---> cache Redis TTL 24h
    |
    +---> T-010 (Claude API checklist) -> T-011 (UI checklist)
              |
              [paralelo com T-007]

T-008 + T-009 (Editor drag-and-drop) ---> T-013 (QA unit tests)  [Semana 2]
T-002 + T-006 + T-011               ---> T-014 (QA E2E)         [Semana 2]

Restricoes criticas:
- T-012 DEVE preceder qualquer hardcode de texto no frontend (comeca Dia 1)
- T-001 DEVE estar completo antes de T-002 integrar (contrato de API acordado no Dia 1)
- T-005 DEVE estar completo antes de T-006 integrar (mock local para dev-2 nos Dias 1-4)
- T-007 DEVE estar completo antes de T-008 integrar (mock de resposta Claude para dev-2 nos Dias 3-5)
- T-003 e T-004 DEPENDEM da estrutura de T-002 estar estabelecida
```

---

### Semana 1 — Fundacao

#### Dia 1 — Setup e Contratos

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | T-001 (Auth backend) + T-012 (i18n) | **Manha**: Configurar Auth.js v5 — `src/lib/auth.ts` com providers Google OAuth e credentials; `src/app/auth/[...nextauth]/route.ts`; schema Prisma para `Account`, `Session`, `VerificationToken` (seguir Auth.js v5 adapter para Prisma) |
| | | **Tarde**: Setup `next-intl` no servidor — `src/i18n/routing.ts`, `src/i18n/request.ts`, middleware de locale; criar arquivos `messages/pt-BR.json` e `messages/en.json` com namespace `auth` completo; configurar `src/lib/env.ts` com `@t3-oss/env-nextjs` validando todas as vars do sprint |
| **dev-fullstack-2** | T-002 (UI auth — estrutura) | **Manha**: Criar estrutura de rotas `src/app/(public)/auth/login/page.tsx` e `src/app/(public)/auth/register/page.tsx`; instalar e configurar `next-intl` no cliente (`NextIntlClientProvider`); criar `src/components/features/auth/` com `LoginForm.tsx` (esqueleto) e `RegisterForm.tsx` (esqueleto) sem textos hardcoded — todos via `useTranslations('auth')` |
| | | **Tarde**: Configurar `react-hook-form` + Zod em `src/lib/validations/user.schema.ts` — `LoginSchema` e `RegisterSchema`; integrar shadcn/ui `Form`, `Input`, `Button`; layout mobile-first 375px validado no browser |

**Ponto de sincronizacao Dia 1 — 17h**: dev-1 e dev-2 alinham o contrato de sessao Auth.js (shape do objeto `session.user`) e o contrato de redirect pos-login antes de cada um continuar isoladamente.

---

#### Dia 2 — Auth completo + i18n fundacao

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | T-001 (Auth backend — continua) | **Manha**: Implementar verificacao de e-mail obrigatoria — Server Action `sendVerificationEmail`, token com TTL 24h armazenado no Redis (`cache:email-verify:{token}`); endpoint de verificacao `src/app/auth/verify-email/route.ts`; bloquear acesso a rotas protegidas ate verificacao |
| | | **Tarde**: Implementar recuperacao de senha em 2 passos — Server Action `requestPasswordReset` (gera token Redis TTL 1h) e `confirmPasswordReset` (valida token, atualiza hash bcrypt); testes unitarios `tests/unit/server/auth.service.test.ts` cobrindo: login valido, senha errada, token expirado, usuario nao verificado |
| **dev-fullstack-2** | T-002 (UI auth — integracao) + T-012 (i18n frontend) | **Manha**: Conectar `LoginForm` e `RegisterForm` aos Server Actions de Auth.js; implementar feedback de erro em portugues via `useTranslations` — nunca expor codigos tecnicos; implementar fluxo de Google OAuth (botao "Entrar com Google" — 1 clique); estado de loading durante submit |
| | | **Tarde**: Pagina `verify-email/page.tsx` — instrucoes claras, botao "Reenviar e-mail"; pagina `forgot-password/page.tsx` e `reset-password/page.tsx`; adicionar namespaces `common` e `auth` completos em ambos os arquivos de mensagens PT-BR e EN |

---

#### Dia 3 — Trust signals + Onboarding (estrutura) + CRUD backend inicia

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | T-005 (CRUD viagens backend) | **Manha**: Schema Prisma — modelos `Trip`, `ItineraryDay`, `Activity`, `ChecklistItem` conforme data model de `docs/architecture.md`; adicionar campos `travelStyle` (enum: `ADVENTURE`, `CULTURE`, `RELAXATION`, `GASTRONOMY`), `budgetTotal` (Decimal), `budgetCurrency` (String), `destinationName` (String), `destinationPlaceId` (String); migration `npx prisma migrate dev --name add-trip-models` |
| | | **Tarde**: `src/server/services/trip.service.ts` — metodos `createTrip`, `getTripsByUser`, `getTripById`; validacao BOLA-safe (sempre filtrar por `userId`); regra de negocio `MAX_TRIPS_PER_USER = 20`; soft delete com `deletedAt`; todos os queries com `select` explicito (nao usar `findMany` sem select — regra SR-005) |
| **dev-fullstack-2** | T-003 (Trust signals) + T-004 (Onboarding — estrutura) | **Manha**: Componente `src/components/features/auth/TrustSignals.tsx` — badge de segurança (icone cadeado + "Seus dados estao seguros"), mini politica de privacidade em 2 linhas (texto via i18n, sem juridiques), link "Excluir minha conta" visivel; integrar no `RegisterForm` abaixo do submit; validar em 375px |
| | | **Tarde**: Estrutura do onboarding — `src/app/(auth)/onboarding/page.tsx`; componente `src/components/features/onboarding/OnboardingWizard.tsx` com 3 passos (estado gerenciado por `useState`); `ProgressIndicator.tsx` com indicador visual de etapa (1/3, 2/3, 3/3); botao "Pular" em cada etapa; transicoes com `transition-all duration-300` do Tailwind; textos via `useTranslations('onboarding')` |

---

#### Dia 4 — CRUD backend completo + UI dashboard viagens inicia

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | T-005 (CRUD viagens — Server Actions) | **Manha**: `src/server/actions/trip.actions.ts` — `createTrip`, `updateTrip`, `deleteTrip` (soft delete); validacao Zod `TripCreateSchema` e `TripUpdateSchema` em `src/lib/validations/trip.schema.ts`; `redirect()` FORA do try/catch (FIND-M-001 — padrao obrigatorio); cache Redis: invalidar `CacheKeys.userTrips(userId)` apos mutacoes |
| | | **Tarde**: `getTripById` Server Action com autorizacao BOLA-safe; `listUserTrips` com paginacao (page, pageSize=10); confirmar exclusao exige digitar nome da viagem (validado no schema antes de `deleteTrip`); testes unitarios `tests/unit/server/trip.service.test.ts` — mock Prisma com `vitest-mock-extended`; cobrir: criar com limite atingido, acesso a viagem de outro usuario, soft delete |
| **dev-fullstack-2** | T-006 (UI dashboard viagens) | **Manha**: `src/app/(auth)/trips/page.tsx` — lista de viagens via TanStack Query (`useQuery`) buscando Server Action `listUserTrips`; componente `TripCard.tsx` com: emoji/gradiente de capa, titulo, destino, datas, numero de viajantes; skeleton loading durante fetch; estado vazio com CTA "Criar primeira viagem" |
| | | **Tarde**: Modal `CreateTripModal.tsx` usando shadcn/ui `Dialog` — formulario com 3 campos: destino (autocomplete Google Places — usar mock local no Dia 4, integrar API real no Dia 5), seletor de datas com `react-day-picker`, numero de viajantes (counter +/-); validacao client-side com Zod; submit via Server Action `createTrip`; otimistic update com TanStack Query `useMutation` |

**Ponto de sincronizacao Dia 4 — fim do dia**: dev-1 entrega contrato da Server Action `createTrip` (tipos de entrada/saida) para dev-2 integrar no Dia 5.

---

#### Dia 5 — Google Places + Claude API inicia

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | T-007 (Claude API — plano de viagem) | **Manha**: `src/server/services/ai.service.ts` com `import "server-only"` — metodo `generateTravelPlan(params: GeneratePlanParams)`: construir prompt estruturado para `claude-sonnet-4-6`; params incluem `destination`, `startDate`, `endDate`, `travelStyle`, `budgetTotal`, `budgetCurrency`, `travelers`, `language` (PT-BR ou EN); output tipado: `ItineraryPlan` com array de `DayPlan[]` cada um com `activities[]`; usar SDK `@anthropic-ai/sdk` |
| | | **Tarde**: Cache Redis para prompts similares: chave `cache:ai-plan:{hash}` onde hash = MD5 de `{destination}:{travelStyle}:{budgetRange}:{days}:{language}` (budgetRange = bucket de R$500 para evitar miss por diferenca minima); TTL 24h (86400s); if cache hit: retornar sem chamar Claude; timeout de 55s na chamada (meta <= 60s); testes unitarios com mock do SDK Anthropic |
| **dev-fullstack-2** | T-006 (Google Places) + T-008 (UI geracao — estrutura) | **Manha**: Integrar Google Places Autocomplete no campo destino — `src/components/features/trips/DestinationAutocomplete.tsx` usando `@react-google-maps/api` ou fetch direto para `/api/v1/places/autocomplete` (proxy server-side para nao expor API key no cliente); salvar `placeId` e `displayName` separadamente |
| | | **Tarde**: Estrutura da UI de geracao de plano — `src/app/(auth)/trips/[id]/generate/page.tsx`; componente `PlanGeneratorWizard.tsx` com 3 passos: (1) confirmar destino/datas ja preenchidos, (2) selecao visual de estilo (4 cards com icone + label via i18n), (3) slider de orcamento; botao "Gerar plano" dispara loading state; mock de resposta Claude para desenvolver UI sem depender do backend |

---

### Semana 2 — Integracao e QA

#### Dia 6 — Claude API checklist + UI geracao de plano integra

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | T-010 (Claude API — checklist) | **Manha**: `ai.service.ts` — metodo `generateChecklist(params: GenerateChecklistParams)`: usar `claude-haiku-4-5-20251001` (mais rapido e barato para checklist); params: `destination`, `startDate`, `endDate`, `travelers`, `language`; output tipado `ChecklistCategory[]` com categorias `DOCUMENTS`, `HEALTH`, `CURRENCY`, `WEATHER`, `TECHNOLOGY`; cada categoria tem `items: ChecklistItem[]` |
| | | **Tarde**: Cache Redis para checklist: chave `cache:ai-checklist:{hash}` onde hash = MD5 de `{destination}:{month}:{travelers}:{language}` (mes em vez de datas exatas para maximizar reuso); TTL 24h; Server Action `generateChecklist` em `src/server/actions/ai.actions.ts`; testes unitarios com mock Anthropic SDK |
| **dev-fullstack-2** | T-008 (UI geracao — integracao real) | **Manha**: Integrar `PlanGeneratorWizard` com Server Action real `generateTravelPlan`; implementar `LoadingPlanAnimation.tsx` — animacao durante geracao (nunca tela em branco): spinner + mensagem rotativa ("Analisando destino...", "Montando itinerario...", "Finalizando plano...") com `useEffect` trocando mensagem a cada 4s |
| | | **Tarde**: Pagina de resultado `src/app/(auth)/trips/[id]/itinerary/page.tsx` — renderizar `ItineraryPlan` retornado pela IA; componente `ItineraryDayCard.tsx` com lista de atividades por dia; botao "Gerar Checklist" abaixo do plano; disparar evento analytics `ai.plan.generated`; tratar erro de timeout com mensagem amigavel e botao "Tentar novamente" |

**Ponto de sincronizacao Dia 6 — manha**: dev-1 entrega tipos `ItineraryPlan` e `ChecklistCategory[]` (exportados de `src/types/ai.types.ts`) para dev-2 usar na UI.

---

#### Dia 7 — Editor drag-and-drop + UI checklist

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | T-005 (auto-save) + T-010 (integracao checklist no banco) | **Manha**: Server Actions para atividades do itinerario — `updateActivity`, `reorderActivities` (recebe array de `{id, orderIndex}` e atualiza em transacao Prisma), `addActivity`, `deleteActivity`; Server Actions para checklist — `saveChecklist` (persiste no banco apos geracao pela IA), `updateChecklistItem` (toggle checked, editar texto), `addChecklistItem`, `deleteChecklistItem` |
| | | **Tarde**: Testes de integracao `tests/integration/trip.service.test.ts` e `tests/integration/ai.service.test.ts` — usar banco de teste Docker; cobrir reordenamento atomico, soft delete de atividade, checklist salvo corretamente por categoria |
| **dev-fullstack-2** | T-009 (Editor drag-and-drop) + T-011 (UI checklist) | **Manha**: `src/components/features/itinerary/DraggableActivityList.tsx` usando `@dnd-kit/core` e `@dnd-kit/sortable` (MIT license) — drag dentro do mesmo dia e entre dias diferentes; `ActivityItem.tsx` com handle de drag, botoes editar/excluir, campo de horario; touch sensor configurado para mobile (`TouchSensor` do dnd-kit); auto-save: `useMutation` com debounce 1s apos cada reordenamento |
| | | **Tarde**: `src/components/features/checklist/ChecklistView.tsx` — agrupar itens por categoria; cada categoria com icone distinto (shadcn/ui `Icon` ou heroicons MIT); `ChecklistItem.tsx` com checkbox interativo, campo de texto editavel inline, botao excluir; botao "Adicionar item" no final de cada categoria; disparar evento `ai.checklist.generated` no mount |

**Ponto de sincronizacao Dia 7 — 17h**: dev-1 e dev-2 testam juntos o fluxo completo em modo local — cadastro → onboarding → criar viagem → gerar plano → editor → checklist. Identificar e corrigir problemas de integracao antes do QA.

---

#### Dia 8 — i18n completa + QA inicia

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | T-012 (i18n — seletor de idioma e preferencia) | **Manha**: Server Action `updateUserLocale` — salvar preferencia de idioma no perfil do usuario (campo `locale` na tabela `User`, valores `'pt-BR'` e `'en'`); middleware `src/middleware.ts` com `next-intl` — detectar idioma da preferencia do usuario autenticado, fallback para header `Accept-Language`, depois `pt-BR` como default |
| | | **Tarde**: Auditar todos os arquivos `.tsx` criados nas semanas 1-2 — garantir zero textos hardcoded; qualquer string fora de `useTranslations()` ou `getTranslations()` e um bug; completar `messages/pt-BR.json` e `messages/en.json` para todos os namespaces: `auth`, `common`, `trips`, `onboarding`, `checklist`, `itinerary`, `errors`; testar troca de idioma com recarga de pagina |
| **dev-fullstack-2** | T-012 (seletor UI) + T-004 (onboarding — refinamento) | **Manha**: Componente `LanguageSwitcher.tsx` — botao na navbar e na pagina de perfil `src/app/(auth)/account/page.tsx`; mostrar idioma atual (ex: "PT" / "EN"); ao clicar, chamar `updateUserLocale` e recarregar pagina com novo locale via `router.refresh()`; salvar em cookie tambem para usuarios nao autenticados (antes do login) |
| | | **Tarde**: Refinamento do onboarding — integrar o `OnboardingWizard` completo: Passo 1 (boas-vindas com nome do usuario), Passo 2 (redireciona para `CreateTripModal` pre-aberto), Passo 3 (redireciona para `generate/page.tsx` com instrucoes); disparar `onboarding.completed` via analytics ao concluir Passo 3 ou ao pular qualquer etapa; animacoes validadas em 375px |

---

#### Dia 9 — QA: testes unitarios e E2E

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **qa-engineer** | T-013 (testes unitarios) | **Manha**: Auditar cobertura atual com `npm run test -- --coverage`; identificar servicos abaixo de 80%; focar em `trip.service.ts`, `ai.service.ts`, `user.schema.ts`, `trip.schema.ts`; cobrir casos de borda: limite de 20 viagens, token expirado, resposta Claude malformada, cache hit vs miss |
| | | **Tarde**: Escrever testes unitarios faltantes — mock do `@anthropic-ai/sdk` para testar `generateTravelPlan` e `generateChecklist` com resposta simulada valida e com resposta malformada; verificar que erros da Claude API sao tratados graciosamente (nao expose stack trace) |
| **qa-engineer** | T-014 (E2E — Playwright) | **Manha**: `tests/e2e/auth.spec.ts` — fluxo completo: cadastro email → verificacao de e-mail (interceptar chamada de e-mail em teste) → login → trust signals visiveis → logout; fluxo Google OAuth (mock com `page.route()`) |
| | | **Tarde**: `tests/e2e/onboarding.spec.ts` — pos-cadastro: wizard 3 passos, skip funciona, progresso visivel; `tests/e2e/trip-flow.spec.ts` — criar viagem com autocomplete → gerar plano (mock Claude) → editor drag-and-drop → checklist; validar em viewport 375x812 (mobile) e 1280x800 (desktop) |

---

#### Dia 10 — QA final + validacao E2E + ajustes

| Dev | Task | Subtarefas (cada uma <= 4h) |
|-----|------|-----------------------------|
| **dev-fullstack-1** | Correcoes QA + revisao de seguranca | **Manha**: Atender issues P0/P1 levantados pelo qa-engineer nos Dias 8-9; revisar todos os Server Actions criados — confirmar que `redirect()` esta FORA do try/catch (FIND-M-001); confirmar que `db.$extends` e usado para soft-delete (nao `db.$use`) (FIND-M-002) |
| | | **Tarde**: Revisar queries Prisma — confirmar `select` explicito em todos (SR-005); rate limiting no Server Action `generateTravelPlan` (max 10 geracoes/usuario/hora via Redis counter); confirmar zero PII em logs |
| **dev-fullstack-2** | Correcoes QA + validacao mobile | **Manha**: Atender issues de UI levantados pelo qa-engineer; testar todos os fluxos em iPhone SE (375px) e Samsung Galaxy S20 (360px) via DevTools; validar que areas de toque sao >= 44x44px (WCAG 2.5.5); testar drag-and-drop com touch em mobile real ou emulacao |
| | | **Tarde**: Teste cronometrado: do cadastro ao primeiro plano gerado em <= 60 segundos — medir com `performance.now()` ou Playwright `page.waitForSelector` com timeout configurado; documentar resultado no PR; corrigir gargalos se necessario |
| **qa-engineer** | T-014 (validacao final) | **Manha + Tarde**: Executar suite E2E completa; validar criterios: i18n 100% (nenhum texto em ingles na UI PT-BR e vice-versa), WCAG via `axe-playwright` em todas as paginas criadas no sprint, tempo cadastro → primeiro plano <= 60s medido pelo Playwright; emitir QA sign-off se todos os criterios forem atingidos |

---

### Pontos de Sincronizacao Obrigatorios

| Momento | Dev-1 entrega | Dev-2 aguarda | O que sincronizar |
|---------|---------------|---------------|-------------------|
| Dia 1 — 17h | Contrato de sessao Auth.js (`session.user` shape) | Antes de implementar guards de rota | `{ id, email, name, emailVerified, locale }` — alinhar nomes de campo |
| Dia 4 — fim do dia | Tipos `TripCreateInput` e `TripCreateResult` exportados de `src/types/trip.types.ts` | Antes de conectar `CreateTripModal` ao Server Action | Contrato completo incluindo campos opcionais e erros possiveis |
| Dia 5 — manha | API key Google Places configurada em `.env.local` da equipe | Antes de integrar autocomplete | Confirmar quota do projeto e se proxy server-side e necessario |
| Dia 6 — manha | Tipos `ItineraryPlan` e `ChecklistCategory[]` em `src/types/ai.types.ts` | Antes de renderizar resultado da IA | Shape exato dos dados retornados pela Claude API |
| Dia 7 — 17h | Server Actions de reordenamento e checklist funcionais | Teste de integracao manual conjunto | Fluxo completo do MVP em ambiente local — go/no-go para QA |
| Dia 8 — fim do dia | `messages/pt-BR.json` e `messages/en.json` completos | Antes de QA auditar i18n | Confirmar que nao ha chaves faltando em nenhum dos dois arquivos |

---

### Riscos do Sprint 1

| Risco | Probabilidade | Impacto | Plano de contingencia |
|-------|---------------|---------|----------------------|
| Claude API latencia alta (>30s) | Media | Alto | Implementar streaming com `stream: true` no SDK Anthropic — UI exibe atividades conforme chegam; se latencia > 55s, retornar erro com mensagem amigavel e opcao de retry |
| Google Places API key nao configurada no Dia 1 | Alta | Medio | dev-2 usa campo de texto livre para destino nos Dias 1-4; autocomplete integrado no Dia 5 — nao bloqueia progresso inicial |
| Drag-and-drop nao funciona em mobile (touch events) | Media | Alto | Usar `@dnd-kit` com `TouchSensor` e `MouseSensor` configurados; testar em dispositivo fisico ou BrowserStack no Dia 7; fallback: botoes "mover para cima/baixo" como alternativa touch-safe |
| `next-intl` com App Router tem configuracao fragil | Media | Medio | Seguir documentacao oficial next-intl v3 para App Router; configurar no Dia 1 antes de qualquer texto hardcoded; se houver bloqueio, abrir issue e contornar com context API simples temporariamente |
| Resposta Claude API malformada (JSON invalido) | Baixa | Alto | Usar `zod.safeParse()` na resposta da Claude antes de persistir; prompt deve incluir instrucao "responda APENAS com JSON valido no formato..."; se parse falhar, retornar erro com mensagem "Nao foi possivel gerar o plano. Tente novamente." |
| Cache Redis miss rate alto (pouca reutilizacao) | Baixa | Baixo | Ajustar granularidade do hash de cache — usar bucket de R$1000 em vez de R$500 se miss rate > 80% na primeira semana; monitorar com Redis `INFO stats` |
| Cobertura de testes < 80% no Dia 9 | Media | Alto | dev-1 prioriza testes junto com implementacao (nao deixar para o fim); qa-engineer audita cobertura no Dia 9 manha com tempo suficiente para correcoes |
| Tempo cadastro → plano > 60 segundos | Media | Alto | Medir no Dia 7 durante sincronizacao; se lento: habilitar streaming Claude, revisar queries N+1, confirmar indice em `userId` na tabela `trips` |

---

### Criterios de Conclusao do Sprint 1

- [ ] Fluxo E2E completo executado sem erros: cadastro → verificacao de e-mail → login → onboarding 3 passos → criar viagem com autocomplete → gerar plano IA → editor drag-and-drop → gerar checklist IA
- [ ] Validado em mobile 375px E desktop 1280px para todas as telas do sprint
- [ ] i18n: 100% dos textos em PT-BR e EN — nenhuma string hardcoded no frontend
- [ ] Cobertura de testes >= 80% em `trip.service.ts`, `ai.service.ts`, `user.schema.ts`, `trip.schema.ts`
- [ ] Security review aprovado pelo `security-specialist` — FIND-M-001 e FIND-M-002 verificados
- [ ] Trust signals presentes e visiveis na tela de cadastro (badge + mini politica + link exclusao)
- [ ] Tempo cronometrado cadastro → primeiro plano gerado <= 60 segundos (resultado documentado no PR)
- [ ] WCAG 2.1 AA: zero violacoes criticas detectadas pelo `axe-playwright` nas telas de auth, onboarding, criacao de viagem, itinerario e checklist
- [ ] Nenhum dado PII logado ou exposto em qualquer resposta de API ou mensagem de erro
- [ ] Todos os PRs revisados e aprovados pelo tech-lead — nenhum commit direto em `feat/sprint-1` ou `main`
- [ ] QA sign-off emitido pelo `qa-engineer`
- [ ] PR de `feat/sprint-1` para `main` aprovado e merged

---

*Plano elaborado pelo tech-lead em 2026-02-24 com base no user-story-map-v2.docx, docs/architecture.md e restricoes de seguranca de SEC-SPEC-001*
