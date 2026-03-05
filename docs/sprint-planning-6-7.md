# Travel Planner -- Planejamento Sprint 6 e Sprint 7

**Versao**: 1.0.0
**Data**: 2026-03-04
**Autor**: product-owner
**Versao atual do produto**: 0.5.0 (268 testes, 0 falhas)
**Sprints concluidos**: 1-5 (Auth, DB, Landing, Dev toolkit, Navegacao autenticada)

---

## Contexto Estrategico

O MVP do Travel Planner precisa entregar o ciclo completo do viajante: cadastro -> onboarding -> criar viagem -> IA gera plano -> editar itinerario -> checklist -> controle de gastos. Os Sprints 1-5 entregaram a infraestrutura (auth, DB, landing page, navegacao autenticada) e os componentes de backend/frontend para viagens, itinerario e checklist. Porem, o fluxo end-to-end ainda nao funciona porque faltam pecas criticas de UX que conectam essas partes:

1. **Onboarding wizard** -- o usuario se cadastra e nao sabe o que fazer em seguida
2. **Trust signals** -- o usuario nao tem sinais de seguranca na tela de cadastro
3. **Perfil e configuracoes** -- nao existe pagina de conta/perfil
4. **Debitos tecnicos** -- 7 itens pendentes da Sprint 5 review (seguranca, acessibilidade, documentacao)

Os Sprints 6 e 7 devem priorizar: (1) resolver debitos tecnicos que afetam seguranca e qualidade, (2) entregar as funcionalidades que conectam o fluxo principal do MVP.

---

## Itens removidos do backlog

| ID | Item | Motivo |
|----|------|--------|
| S6-003 | Internacionalizar paginas 404 | Ja corrigido na sessao pre-Sprint 6 (catch-all route + client component com Header/Footer/i18n) |

---

## Bugs corrigidos pre-Sprint 6 (nao entram no backlog)

1. Campo "confirmar senha" ausente no RegisterForm -- CORRIGIDO
2. Registro redirecionava para verify-email em vez de login -- CORRIGIDO (redireciona para /auth/login?registered=true com banner verde)
3. Breadcrumbs ausentes na pagina /trips -- CORRIGIDO
4. Pagina 404 sem Header/Footer e sem i18n -- CORRIGIDO

---

## Sprint 6 -- Debitos Tecnicos + Onboarding Wizard

### Objetivo

Resolver os debitos tecnicos de seguranca e qualidade pendentes da Sprint 5, e entregar o onboarding wizard de 3 passos -- a peca que conecta o cadastro ao primeiro plano de viagem gerado pela IA, atingindo o "aha moment" em ate 60 segundos.

### Justificativa da Composicao Mista

O Sprint 6 combina debt e feature por tres razoes:
1. Os debitos de seguranca (CSP, rate limiter) sao riscos que crescem com cada sprint sem correcao
2. O onboarding e a feature com maior impacto no MVP: sem ele, 100% dos novos usuarios ficam perdidos apos o cadastro
3. Os debitos sao itens pequenos (S/XS) que nao comprometem a capacidade de entregar o onboarding (M/L)

---

### User Stories -- Sprint 6

#### US-104: Onboarding wizard (aha moment)
**Sprint**: 6 | **Status**: Pendente | **Prioridade**: P0 (bloqueante para MVP)
**MoSCoW**: Must Have
**Effort**: L
**Business Value**: Retencao -- sem onboarding, taxa de abandono pos-cadastro estimada em 60-70%

**User Story**
> As a novo usuario que acabou de se cadastrar (@leisure-solo, @leisure-family),
> I want to ser guiado em 3 passos ate gerar meu primeiro plano de viagem,
> So that eu entenda o valor do produto em ate 60 segundos e tenha motivacao para continuar usando.

**Contexto do Viajante**
- **Pain point**: Apos o cadastro, o usuario cai na pagina /trips vazia. Nao ha orientacao sobre o que fazer, nenhuma sugestao, nenhum guia. O usuario fecha a aba.
- **Workaround atual**: Nenhum. O usuario precisa descobrir sozinho que deve clicar em "Nova viagem".
- **Frequencia**: 100% dos novos usuarios sao impactados na primeira sessao.

**Criterios de Aceite**
- [ ] AC-001: Apos primeiro login (usuario sem viagens), redirecionar automaticamente para /onboarding
- [ ] AC-002: Wizard de 3 passos: (1) Boas-vindas com nome do usuario + explicacao em 1 frase, (2) Criar viagem rapida (destino + datas + viajantes, max 3 campos), (3) Escolher estilo de viagem (icones visuais) + slider de orcamento -> gerar plano
- [ ] AC-003: Progress indicator visivel em cada etapa (step 1/3, 2/3, 3/3)
- [ ] AC-004: Botao "Pular" (skip) disponivel em cada passo -- pular leva para /trips
- [ ] AC-005: Animacoes suaves entre passos (transition CSS, respeitar prefers-reduced-motion)
- [ ] AC-006: Ao concluir o passo 3, chamar a geracao de plano IA (reutilizar AiService.generateTravelPlan ja implementado em T-007)
- [ ] AC-007: Loading animation durante geracao do plano (reutilizar LoadingPlanAnimation de T-008)
- [ ] AC-008: Apos plano gerado, redirecionar para /trips/[id]/itinerary com o plano visivel
- [ ] AC-009: Evento analytics `onboarding.completed` disparado ao final
- [ ] AC-010: Evento analytics `onboarding.skipped` disparado se usuario clicar "Pular" (com step atual)
- [ ] AC-011: Meta: do cadastro ao primeiro plano gerado em ate 60 segundos
- [ ] AC-012: Mobile 375px: wizard funcional e legivel, sem scroll horizontal
- [ ] AC-013: WCAG 2.1 AA: navegavel via teclado, aria-labels em todos os controles, focus management entre steps
- [ ] AC-014: Textos via i18n (PT-BR e EN) -- namespace `onboarding`
- [ ] AC-015: Usuarios que ja possuem viagens NAO sao redirecionados para onboarding (flag `hasCompletedOnboarding` ou verificar se tem viagens)

**Fora do Escopo (v1)**
- Onboarding personalizado por persona (aventureiro vs. relaxamento)
- Tutorial interativo com tooltips
- Coleta de preferencias de viagem para recomendacoes futuras

**Dependencias**
- AiService.generateTravelPlan (T-007, ja implementado)
- PlanGeneratorWizard / LoadingPlanAnimation (T-008, ja implementado)
- CRUD de viagens (T-005, ja implementado)
- Rota /onboarding ja existe sob route group (app) (T-032, ja implementado)

**Metricas de Sucesso**
- Aha moment: >= 70% dos cadastros completam o onboarding
- Tempo medio do cadastro ao primeiro plano: <= 60 segundos
- Taxa de skip: <= 30%

---

#### US-105: Trust signals nas telas de autenticacao
**Sprint**: 6 | **Status**: Pendente | **Prioridade**: P1 (importante para conversao)
**MoSCoW**: Should Have
**Effort**: S
**Business Value**: Conversao -- trust signals aumentam taxa de cadastro em 10-15% (benchmark industria de viagens)

**User Story**
> As a novo usuario desconfiante que esta considerando se cadastrar (@leisure-solo, @leisure-family),
> I want to ver sinais claros de seguranca e privacidade nas telas de login e cadastro,
> So that eu me sinta seguro para fornecer meus dados pessoais.

**Contexto do Viajante**
- **Pain point**: As telas de login e cadastro nao possuem nenhum sinal de confianca. O usuario nao sabe se o site e seguro, se seus dados serao protegidos, ou se pode excluir sua conta depois.
- **Workaround atual**: Nenhum. Usuarios desconfiados simplesmente nao se cadastram.
- **Frequencia**: Impacta 100% dos visitantes que chegam as telas de autenticacao.

**Criterios de Aceite**
- [ ] AC-001: Badge de seguranca visivel nas telas de cadastro e login (icone cadeado + texto "Dados protegidos" / "Data protected")
- [ ] AC-002: Mini politica de privacidade em 2 linhas abaixo do formulario (linguagem simples, sem juridiques)
- [ ] AC-003: Link visivel "Saiba como protegemos seus dados" que abre modal ou pagina com detalhes
- [ ] AC-004: Textos revisados -- sem termos tecnicos ou legais (LGPD, GDPR nao devem aparecer para o usuario)
- [ ] AC-005: Mobile 375px: trust signals visiveis sem scroll adicional
- [ ] AC-006: Textos via i18n (PT-BR e EN) -- namespace `auth`

**Fora do Escopo (v1)**
- Certificacoes de terceiros (ex: selos TrustPilot, Norton)
- Pagina completa de politica de privacidade (apenas mini-politica)

**Dependencias**
- LoginForm e RegisterForm ja implementados (Sprints 1-5)

**Metricas de Sucesso**
- Aumento de 10% na taxa de conversao cadastro/visitante
- Reducao de 15% no bounce rate das telas de auth

---

#### US-106: Header e Footer nas telas de autenticacao
**Sprint**: 6 | **Status**: Pendente | **Prioridade**: P1 (consistencia visual)
**MoSCoW**: Should Have
**Effort**: S
**Business Value**: UX -- telas de auth sem header/footer parecem paginas avulsas, reduzem confianca

**User Story**
> As a usuario acessando as telas de login ou cadastro (@leisure-solo, @business-traveler),
> I want to ver o header e footer do site nessas telas,
> So that eu saiba que estou no site correto e possa navegar para outras paginas se necessario.

**Contexto do Viajante**
- **Pain point**: As telas de login e registro nao possuem header nem footer. Parecem paginas isoladas/orfas, sem identidade visual do site. O usuario nao tem como voltar a landing page sem digitar URL.
- **Workaround atual**: Digitar URL manualmente ou clicar "Voltar" no browser.
- **Frequencia**: 100% dos acessos as telas de auth.

**Criterios de Aceite**
- [ ] AC-001: Header publico (mesmo da landing page) visivel em /auth/login e /auth/register
- [ ] AC-002: Footer publico (mesmo da landing page) visivel em /auth/login e /auth/register
- [ ] AC-003: Layout centralizado do formulario mantido (header e footer nao devem empurrar o form para fora da viewport)
- [ ] AC-004: Mobile 375px: header compacto, formulario visivel sem scroll excessivo
- [ ] AC-005: Se o usuario ja estiver logado e acessar /auth/login, redirecionar para /trips

**Fora do Escopo (v1)**
- Header diferenciado para paginas de auth (usar o mesmo da landing)
- Breadcrumbs nas paginas de auth

**Dependencias**
- Header e Footer ja implementados (Sprint 3)

---

### Tarefas Tecnicas (Debitos) -- Sprint 6

#### T-038: Fix CSP -- remover unsafe-eval/unsafe-inline, implementar nonce
**Origem**: S6-001 (Security review Sprint 5)
**Prioridade**: P0 (seguranca)
**Effort**: M
**Dev**: dev-fullstack-1

**Escopo:**
- [ ] Implementar geracao de nonce por request no middleware Next.js
- [ ] Atualizar CSP header para usar `nonce-{value}` em vez de `unsafe-inline` para scripts
- [ ] Remover `unsafe-eval` -- verificar se alguma dependencia requer (TanStack Query, dnd-kit)
- [ ] Configurar `style-src` com nonce ou hash para inline styles do Tailwind
- [ ] Testar que todas as paginas carregam sem erros de CSP no console
- [ ] Adicionar teste que valida CSP header na resposta

**Done when:**
- CSP header nao contem `unsafe-eval` nem `unsafe-inline`
- Todas as paginas funcionam sem erros de CSP
- Build + testes passando

---

#### T-039: Atomizar rate limiter com Lua script
**Origem**: S6-002 (Security + FinOps review Sprint 5)
**Prioridade**: P0 (seguranca)
**Effort**: S
**Dev**: dev-fullstack-1

**Escopo:**
- [ ] Substituir INCR + EXPIRE separados por script Lua atomico no Redis
- [ ] Usar `MULTI/EXEC` ou `EVAL` com script Lua que faz INCR + EXPIRE em uma unica operacao
- [ ] Manter interface publica do rate limiter inalterada (retrocompativel)
- [ ] Adicionar teste unitario para race condition (2 requests simultaneos)
- [ ] Atualizar documentacao do rate limiter

**Done when:**
- Rate limiter usa operacao atomica Redis
- Testes passando, interface retrocompativel
- Race condition documentada como resolvida

---

#### T-040: Corrigir ADR-005 (database sessions vs JWT)
**Origem**: S6-004 (Architect + FinOps review Sprint 5)
**Prioridade**: P1 (documentacao)
**Effort**: XS
**Dev**: architect (ou qualquer dev)

**Escopo:**
- [ ] Atualizar ADR-005 em `docs/architecture.md`: substituir "database sessions" por "JWT sessions" com explicacao da escolha
- [ ] Documentar que PrismaAdapter e usado para persistir User/Account, mas sessions sao stateless (JWT)
- [ ] Atualizar diagrama se houver referencia a session store no Redis para auth

**Done when:**
- ADR-005 reflete a implementacao real (JWT)
- Sem contradicoes na documentacao

---

#### T-041: Rate limit para generateChecklistAction
**Origem**: S6-005 (FinOps review Sprint 5)
**Prioridade**: P1 (custo/seguranca)
**Effort**: S
**Dev**: dev-fullstack-1

**Escopo:**
- [ ] Adicionar rate limiting a `generateChecklistAction` (mesma logica do rate limiter existente)
- [ ] Limite sugerido: 5 requests por usuario por hora (evitar abuso de chamadas a API Claude)
- [ ] Retornar erro amigavel quando limite atingido (mensagem i18n)
- [ ] Teste unitario para rate limit atingido

**Done when:**
- generateChecklistAction tem rate limit
- Mensagem de erro amigavel ao atingir limite
- Teste passando

---

#### T-042: Fix acessibilidade UserMenu (role="menuitem" sem parent role="menu")
**Origem**: S6-006 (Tech Lead review Sprint 5)
**Prioridade**: P1 (acessibilidade)
**Effort**: XS
**Dev**: dev-fullstack-2

**Escopo:**
- [ ] Adicionar `role="menu"` ao container pai dos itens com `role="menuitem"` no UserMenu inline mode
- [ ] Validar com axe-core que nao ha mais violacoes de ARIA roles
- [ ] Atualizar teste existente do UserMenu

**Done when:**
- Hierarquia ARIA correta: role="menu" > role="menuitem"
- axe-core sem violacoes no UserMenu
- Teste atualizado

---

#### T-043: Playwright -- workers condicional e timeout por ambiente
**Origem**: S6-007 (DevOps review Sprint 5)
**Prioridade**: P2 (DX)
**Effort**: XS
**Dev**: devops-engineer (ou qualquer dev)

**Escopo:**
- [ ] Configurar `playwright.config.ts` para usar `workers: process.env.CI ? 1 : undefined` (default auto em local)
- [ ] Configurar timeout condicional: CI = 60000ms, local = 30000ms
- [ ] Documentar configuracao no README ou dev-testing-guide

**Done when:**
- Playwright usa workers e timeout adequados por ambiente
- Documentado

---

#### T-044: Documentar REDIS_HOST/REDIS_PORT em .env.example
**Origem**: S6-008 (DevOps review Sprint 5)
**Prioridade**: P2 (DX)
**Effort**: XS
**Dev**: qualquer dev

**Escopo:**
- [ ] Adicionar `REDIS_HOST=localhost` e `REDIS_PORT=6379` ao `.env.example`
- [ ] Adicionar comentario explicativo

**Done when:**
- .env.example atualizado

---

#### T-045: Mover sprint-5-stabilization.md para docs/
**Origem**: S6-009 (Release Manager review Sprint 5)
**Prioridade**: P2 (organizacao)
**Effort**: XS
**Dev**: qualquer dev

**Escopo:**
- [ ] `git mv sprint-5-stabilization.md docs/sprint-5-stabilization.md`
- [ ] Atualizar referencias se houver

**Done when:**
- Arquivo na pasta correta

---

#### T-046: Implementacao do Onboarding Wizard (US-104)
**Story**: US-104 | **Dev**: dev-fullstack-2 | **Effort**: L

**Escopo:**
- [ ] Criar `src/components/features/onboarding/OnboardingWizard.tsx` (Client Component)
- [ ] Step 1: Tela de boas-vindas com nome do usuario (session.user.name), explicacao em 1 frase, botao "Comecar" e "Pular"
- [ ] Step 2: Formulario de criacao rapida de viagem (destino, datas, numero de viajantes) -- reutilizar validacao Zod de TripSchema
- [ ] Step 3: Selecao visual de estilo de viagem (icones: aventura, cultura, relaxamento, gastronomia) + slider de orcamento -- reutilizar componentes de PlanGeneratorWizard (T-008)
- [ ] Progress indicator (step dots ou barra de progresso)
- [ ] Botao "Pular" em cada step -> redirecionar para /trips
- [ ] Ao concluir step 3: criar viagem (reutilizar createTripAction) + chamar generateTravelPlan + mostrar LoadingPlanAnimation
- [ ] Apos geracao: redirect para /trips/[id]/itinerary
- [ ] Deteccao de primeiro acesso: verificar se usuario tem 0 viagens (listUserTripsAction)
- [ ] Atualizar `src/app/[locale]/(app)/onboarding/page.tsx` para renderizar o wizard
- [ ] Adicionar logica de redirect em `/trips/page.tsx`: se 0 viagens e nao veio de onboarding, redirecionar para /onboarding
- [ ] Chaves i18n no namespace `onboarding`: titulo, descricao, labels dos steps, botoes
- [ ] Testes unitarios: renderizacao de cada step, navegacao entre steps, skip, form validation
- [ ] Mobile 375px: validar layout em cada step
- [ ] WCAG: focus management entre steps, aria-labels, keyboard navigation

**Done when:**
- Onboarding wizard funcional com 3 passos
- Primeiro acesso redireciona para onboarding
- Plano de viagem gerado pela IA ao concluir
- Testes passando, mobile validado, WCAG OK

---

#### T-047: Trust signals nas telas de auth (US-105)
**Story**: US-105 | **Dev**: dev-fullstack-2 | **Effort**: S

**Escopo:**
- [ ] Criar componente `TrustBadge` reutilizavel (icone cadeado + texto)
- [ ] Adicionar TrustBadge + mini politica de privacidade em LoginForm e RegisterForm
- [ ] Adicionar link "Saiba como protegemos seus dados" (modal simples ou anchor)
- [ ] Chaves i18n no namespace `auth`: trust signals texts
- [ ] Testes unitarios: badge renderiza, link funciona
- [ ] Mobile 375px: trust signals visiveis

**Done when:**
- Trust signals visiveis em login e registro
- Textos i18n, testes passando, mobile OK

---

#### T-048: Header e Footer nas telas de auth (US-106)
**Story**: US-106 | **Dev**: dev-fullstack-2 | **Effort**: S

**Escopo:**
- [ ] Criar ou atualizar layout das paginas de auth para incluir Header e Footer publicos
- [ ] Verificar que o formulario continua centralizado verticalmente
- [ ] Adicionar redirect /auth/login -> /trips se usuario ja logado
- [ ] Mobile 375px: validar que header nao empurra form para fora da viewport
- [ ] Testes: header e footer presentes nas paginas de auth

**Done when:**
- Header e Footer visiveis em /auth/login e /auth/register
- Layout correto em mobile e desktop
- Redirect funcional para usuarios logados

---

#### T-049: QA e validacao final do Sprint 6
**Story**: ALL | **Dev**: qa-engineer | **Effort**: M

**Escopo:**
- [ ] Validar onboarding wizard end-to-end: cadastro -> onboarding -> plano gerado
- [ ] Validar trust signals visiveis em login e registro
- [ ] Validar header/footer nas telas de auth
- [ ] Validar CSP sem unsafe-eval/unsafe-inline (DevTools > Console)
- [ ] Validar rate limiter atomico (testes de concorrencia)
- [ ] Validar acessibilidade UserMenu (axe-core)
- [ ] Regressao: 268+ testes existentes passando
- [ ] Mobile 375px: todas as novas telas
- [ ] WCAG 2.1 AA: axe-core nos novos componentes

**Done when:**
- Todos os criterios de aceite das 3 user stories validados
- Todos os debitos tecnicos verificados
- 0 regressoes, build limpo

---

### Priorizacao e Ordem de Execucao -- Sprint 6

| # | Item | Tipo | Prioridade | Effort | Justificativa |
|---|------|------|------------|--------|---------------|
| 1 | T-038 (CSP fix) | Debt | P0 | M | Vulnerabilidade de seguranca -- cada sprint sem correcao aumenta o risco |
| 2 | T-039 (Rate limiter atomico) | Debt | P0 | S | Race condition em seguranca -- pode ser explorada |
| 3 | T-046 (Onboarding wizard) | Feature | P0 | L | Feature #1 do MVP para retencao -- sem ela usuarios abandonam |
| 4 | T-041 (Rate limit checklist) | Debt | P1 | S | Prevencao de abuso de API Claude (custo) |
| 5 | T-042 (Fix UserMenu ARIA) | Debt | P1 | XS | Acessibilidade -- afeta screen readers |
| 6 | T-047 (Trust signals) | Feature | P1 | S | Conversao de cadastro |
| 7 | T-048 (Header/Footer auth) | Feature | P1 | S | Consistencia visual e navegacao |
| 8 | T-040 (ADR-005 fix) | Debt | P1 | XS | Documentacao correta evita decisoes erradas |
| 9 | T-043 (Playwright config) | Debt | P2 | XS | DX -- melhora experiencia de desenvolvimento |
| 10 | T-044 (.env.example Redis) | Debt | P2 | XS | DX -- onboarding de novos devs |
| 11 | T-045 (Mover arquivo) | Debt | P2 | XS | Organizacao |
| 12 | T-049 (QA final) | QA | P0 | M | Validacao obrigatoria |

### Scoring Matrix -- Sprint 6

| Item | Pain (30%) | Revenue (25%) | Effort inv. (20%) | Strategic (15%) | Competitive (10%) | Score |
|------|-----------|--------------|-------------------|----------------|-------------------|-------|
| T-046 (Onboarding) | 5 (1.50) | 5 (1.25) | 2 (0.40) | 5 (0.75) | 4 (0.40) | **4.30** |
| T-038 (CSP) | 4 (1.20) | 3 (0.75) | 3 (0.60) | 5 (0.75) | 3 (0.30) | **3.60** |
| T-039 (Rate limiter) | 4 (1.20) | 3 (0.75) | 4 (0.80) | 5 (0.75) | 2 (0.20) | **3.70** |
| T-047 (Trust signals) | 3 (0.90) | 4 (1.00) | 4 (0.80) | 4 (0.60) | 3 (0.30) | **3.60** |
| T-048 (Header auth) | 3 (0.90) | 3 (0.75) | 4 (0.80) | 3 (0.45) | 2 (0.20) | **3.10** |
| T-041 (Rate checklist) | 3 (0.90) | 4 (1.00) | 4 (0.80) | 4 (0.60) | 2 (0.20) | **3.50** |
| T-042 (ARIA fix) | 2 (0.60) | 1 (0.25) | 5 (1.00) | 4 (0.60) | 2 (0.20) | **2.65** |
| T-040 (ADR-005) | 1 (0.30) | 1 (0.25) | 5 (1.00) | 3 (0.45) | 1 (0.10) | **2.10** |

### Mapa de Dependencias -- Sprint 6

```
T-044 (.env.example) ──────────────────────────────────────────────────> independente
T-045 (mover arquivo) ─────────────────────────────────────────────────> independente
T-040 (ADR-005) ────────────────────────────────────────────────────────> independente
T-043 (Playwright config) ─────────────────────────────────────────────> independente

T-039 (rate limiter atomico) ──> T-041 (rate limit checklist) ──┐
                                                                 │
T-038 (CSP nonce) ──────────────────────────────────────────────>├──> T-049 (QA final)
                                                                 │
T-042 (ARIA UserMenu) ─────────────────────────────────────────>│
                                                                 │
T-048 (Header/Footer auth) ──> T-047 (Trust signals) ──────────>│
                                                                 │
T-046 (Onboarding wizard) ─────────────────────────────────────>│
```

### Cronograma de Execucao -- Sprint 6

```
Dia 1:  [dev-fullstack-1] T-038 (CSP nonce) -- INICIO
        [dev-fullstack-2] T-048 (Header/Footer auth) + T-042 (ARIA fix) + T-044 + T-045
        [architect]       T-040 (ADR-005 fix)

Dia 2:  [dev-fullstack-1] T-038 (CSP nonce) -- CONCLUSAO + T-039 (rate limiter atomico)
        [dev-fullstack-2] T-046 (Onboarding wizard) -- INICIO (step 1 + step 2)

Dia 3:  [dev-fullstack-1] T-041 (rate limit checklist) + T-043 (Playwright config)
        [dev-fullstack-2] T-046 (Onboarding wizard) -- step 3 + integracao IA

Dia 4:  [dev-fullstack-1] Suporte a integracao + code review
        [dev-fullstack-2] T-046 (Onboarding wizard) -- testes + T-047 (Trust signals)

Dia 5:  [qa-engineer]     T-049 (QA final)
        [dev-fullstack-1]  Suporte a QA + fixes
        [dev-fullstack-2]  Suporte a QA + fixes
```

### Definition of Done -- Sprint 6

- [ ] T-038: CSP sem unsafe-eval/unsafe-inline, nonce implementado
- [ ] T-039: Rate limiter atomico com Lua script
- [ ] T-040: ADR-005 corrigido (JWT, nao database sessions)
- [ ] T-041: generateChecklistAction com rate limit
- [ ] T-042: UserMenu ARIA hierarchy correta
- [ ] T-043: Playwright workers/timeout por ambiente
- [ ] T-044: .env.example com REDIS_HOST/REDIS_PORT
- [ ] T-045: sprint-5-stabilization.md movido para docs/
- [ ] T-046: Onboarding wizard funcional, 3 passos, IA integrada
- [ ] T-047: Trust signals em login e registro
- [ ] T-048: Header e Footer nas telas de auth
- [ ] T-049: QA final -- 0 falhas, WCAG OK, mobile OK
- [ ] Code review aprovado pelo tech-lead
- [ ] Security checklist passado
- [ ] `npm run build` sem erros
- [ ] Total de testes >= 290 passando, 0 falhas
- [ ] Sprint review executada por 6 agentes

---

## Sprint 7 -- Perfil do Usuario + Footer Autenticado + Polimento Pre-MVP

### Objetivo

Entregar a pagina de perfil/configuracoes do usuario, o footer no layout autenticado, e polir o fluxo end-to-end do MVP para que esteja pronto para testes com usuarios reais.

### Justificativa

Apos o Sprint 6, o fluxo principal do MVP estara funcional: cadastro -> onboarding -> viagem criada -> plano gerado -> itinerario editavel -> checklist. Porem, faltam duas lacunas criticas:
1. **Perfil do usuario** -- nao existe pagina para editar nome, email, preferencias ou excluir conta. Sem isso, o app viola requisitos basicos de LGPD (direito de acesso e retificacao dos dados).
2. **Footer no layout autenticado** -- as paginas autenticadas nao possuem footer, criando uma experiencia incompleta.
3. **Polimento** -- varios detalhes de UX precisam ser refinados antes de expor o MVP a usuarios reais.

---

### User Stories -- Sprint 7

#### US-107: Pagina de perfil e configuracoes
**Sprint**: 7 | **Status**: Pendente | **Prioridade**: P0 (bloqueante para MVP)
**MoSCoW**: Must Have
**Effort**: L
**Business Value**: Compliance LGPD + retencao (usuario precisa gerenciar sua conta)

**User Story**
> As a usuario autenticado (@leisure-solo, @business-traveler, @leisure-family),
> I want to visualizar e editar meu perfil (nome, email, avatar) e acessar configuracoes da conta,
> So that eu possa manter meus dados atualizados e gerenciar minha conta de forma autonoma.

**Contexto do Viajante**
- **Pain point**: Nao existe nenhuma pagina de perfil ou configuracoes. O usuario nao pode alterar seu nome, ver seu email cadastrado, ou acessar opcoes de conta. Pior: nao ha caminho para exclusao de conta (LGPD).
- **Workaround atual**: Nenhum. Dados sao imutaveis apos o cadastro.
- **Frequencia**: Todo usuario precisa acessar configuracoes pelo menos uma vez (nome, idioma, conta).

**Criterios de Aceite**
- [ ] AC-001: Pagina /account acessivel via link no UserMenu (navbar autenticada)
- [ ] AC-002: Secao "Informacoes pessoais": nome (editavel), email (somente leitura com indicacao), avatar (iniciais automaticas, upload em v2)
- [ ] AC-003: Secao "Preferencias": idioma preferido (PT-BR/EN), com salvamento no perfil do usuario
- [ ] AC-004: Secao "Conta": botao "Excluir minha conta" claramente visivel (sem dark patterns)
- [ ] AC-005: Edicao do nome com validacao (min 2 chars, max 100 chars)
- [ ] AC-006: Feedback visual apos salvar (toast de sucesso / erro)
- [ ] AC-007: Exclusao de conta: modal de confirmacao em 2 passos (aviso -> confirmacao com digitacao do email)
- [ ] AC-008: Apos exclusao: logout automatico, redirect para landing page, dados removidos (soft delete com prazo LGPD)
- [ ] AC-009: Evento analytics `account.deleted` disparado (sem PII -- apenas hash do user ID)
- [ ] AC-010: Mobile 375px: layout de perfil legivel e funcional
- [ ] AC-011: WCAG 2.1 AA: formulario acessivel, focus management, aria-labels
- [ ] AC-012: Textos via i18n (PT-BR e EN) -- namespace `account`

**Fora do Escopo (v1)**
- Upload de foto de perfil (usar iniciais do nome)
- Alteracao de email (requer re-verificacao -- complexidade alta)
- Alteracao de senha (implementar em sprint futuro)
- Notificacoes por email (provider nao escolhido ainda)
- Tema claro/escuro

**Dependencias**
- UserMenu ja tem link para /account (US-100, Sprint 5)
- Rota /account ja existe no route group (app)
- Soft delete policy definida (deletedAt para User)

**Metricas de Sucesso**
- >= 20% dos usuarios acessam a pagina de perfil na primeira semana
- 0 tickets de suporte sobre "como excluir minha conta"
- Compliance LGPD: exclusao funcional em ate 30 dias

---

#### US-108: Footer no layout autenticado
**Sprint**: 7 | **Status**: Pendente | **Prioridade**: P1 (consistencia)
**MoSCoW**: Should Have
**Effort**: S
**Business Value**: UX -- experiencia completa e profissional

**User Story**
> As a usuario autenticado navegando pelo app (@leisure-solo, @leisure-family),
> I want to ver um footer consistente em todas as paginas autenticadas,
> So that eu tenha acesso a links uteis (suporte, termos, politica) e a experiencia pareca completa e profissional.

**Contexto do Viajante**
- **Pain point**: As paginas autenticadas (/trips, /trips/[id], etc.) nao possuem footer. A pagina termina abruptamente apos o conteudo, dando impressao de site incompleto.
- **Workaround atual**: Nenhum.
- **Frequencia**: 100% das sessoes autenticadas.

**Criterios de Aceite**
- [ ] AC-001: Footer visivel em todas as paginas autenticadas (via AppShellLayout)
- [ ] AC-002: Conteudo do footer: copyright, link para termos, link para politica de privacidade, link para suporte/contato
- [ ] AC-003: Footer nao deve "flutuar" no meio da tela em paginas com pouco conteudo (usar min-h-screen no layout)
- [ ] AC-004: Footer responsivo: layout adequado em mobile 375px e desktop
- [ ] AC-005: Textos via i18n
- [ ] AC-006: Footer visualmente consistente com o footer da landing page (mesma paleta, mesmo estilo)

**Fora do Escopo (v1)**
- Links para redes sociais
- Newsletter signup no footer

**Dependencias**
- Footer component ja existe (Sprint 3)
- AppShellLayout ja existe (Sprint 5)

---

#### US-109: Polimento do fluxo end-to-end pre-MVP
**Sprint**: 7 | **Status**: Pendente | **Prioridade**: P1 (qualidade)
**MoSCoW**: Should Have
**Effort**: M
**Business Value**: Qualidade -- primeira impressao do usuario deve ser impecavel

**User Story**
> As a viajante usando o Travel Planner pela primeira vez (@leisure-solo, @leisure-family),
> I want to ter uma experiencia fluida e sem arestas do cadastro ate a visualizacao do meu plano,
> So that eu confie no produto e queira continuar usando.

**Contexto do Viajante**
- **Pain point**: Embora as features individuais funcionem, a transicao entre elas pode ter arestas: redirects lentos, estados de loading inconsistentes, mensagens de erro genericas, etc.
- **Workaround atual**: Nenhum -- o usuario simplesmente desiste.
- **Frequencia**: 100% dos primeiros acessos.

**Criterios de Aceite**
- [ ] AC-001: Fluxo completo testado E2E: landing -> cadastro -> login -> onboarding -> criar viagem -> gerar plano -> ver itinerario -> ver checklist -> voltar para /trips
- [ ] AC-002: Todos os redirects acontecem em < 1 segundo (sem tela em branco intermediaria)
- [ ] AC-003: Estados de loading consistentes em todas as acoes assincronas (spinners ou skeletons)
- [ ] AC-004: Mensagens de erro amigaveis em todos os formularios (nunca stack trace ou erro tecnico)
- [ ] AC-005: Empty states em todas as telas que podem ficar vazias (/trips sem viagens apos skip onboarding, checklist sem itens, etc.)
- [ ] AC-006: Pagina /trips com viagens existentes exibe lista funcional com acoes (editar, excluir, ver itinerario)
- [ ] AC-007: Performance: First Contentful Paint < 2s em 3G simulado
- [ ] AC-008: Teste de regressao completo: todos os testes existentes + novos cenarios

**Fora do Escopo (v1)**
- Otimizacao de performance avancada (Lighthouse score > 90)
- Animacoes de transicao entre paginas
- Service worker / offline mode

---

### Tarefas Tecnicas -- Sprint 7

#### T-050: Pagina de perfil -- backend (US-107)
**Story**: US-107 | **Dev**: dev-fullstack-1 | **Effort**: M

**Escopo:**
- [ ] Criar Server Action `updateUserProfileAction` (nome, idioma preferido)
- [ ] Criar Server Action `deleteUserAccountAction` (soft delete: set deletedAt, anonimizar PII, audit log)
- [ ] Validacao Zod para update de perfil
- [ ] Testes unitarios: update perfil, delete conta, validacoes, autorizacao
- [ ] Garantir que deleteUserAccountAction remove/anonimiza: nome, email, avatar, viagens (cascade soft delete)

**Done when:**
- Server Actions funcionais com validacao e testes
- Soft delete com anonimizacao de PII
- Audit log da exclusao (hash do user ID, timestamp)

---

#### T-051: Pagina de perfil -- frontend (US-107)
**Story**: US-107 | **Dev**: dev-fullstack-2 | **Effort**: L

**Escopo:**
- [ ] Criar `src/app/[locale]/(app)/account/page.tsx`
- [ ] Criar `src/components/features/account/ProfileForm.tsx` -- edicao de nome + selecao de idioma
- [ ] Criar `src/components/features/account/DeleteAccountModal.tsx` -- confirmacao 2 passos
- [ ] Integrar com Server Actions (T-050)
- [ ] Toast de feedback apos salvar/excluir
- [ ] Chaves i18n namespace `account`
- [ ] Testes unitarios: renderizacao, validacao, modal de exclusao
- [ ] Mobile 375px: layout responsivo
- [ ] WCAG: aria-labels, focus trap no modal

**Done when:**
- Pagina de perfil funcional com edicao e exclusao
- i18n, testes, mobile, WCAG OK

---

#### T-052: Footer no layout autenticado (US-108)
**Story**: US-108 | **Dev**: dev-fullstack-2 | **Effort**: S

**Escopo:**
- [ ] Importar Footer existente no AppShellLayout (`src/app/[locale]/(app)/layout.tsx`)
- [ ] Garantir min-h-screen no layout para que footer nao flutue
- [ ] Verificar consistencia visual com footer da landing page
- [ ] Teste: footer presente em rotas autenticadas

**Done when:**
- Footer visivel em todas as paginas autenticadas
- Nao flutua em paginas com pouco conteudo
- Teste passando

---

#### T-053: Polimento e empty states (US-109)
**Story**: US-109 | **Dev**: dev-fullstack-1 + dev-fullstack-2 | **Effort**: M

**Escopo:**
- [ ] Revisar e adicionar empty states em: /trips (0 viagens), checklist (0 itens), itinerario (0 dias)
- [ ] Revisar todos os redirects do fluxo principal -- eliminar telas em branco
- [ ] Padronizar loading states (skeleton ou spinner) em todas as acoes assincronas
- [ ] Revisar mensagens de erro em todos os formularios
- [ ] Testar fluxo E2E completo manualmente
- [ ] Adicionar cenarios E2E Playwright para o fluxo completo

**Done when:**
- Empty states em todas as telas relevantes
- Redirects sem tela em branco
- Loading states consistentes
- E2E passando

---

#### T-054: Automacao de plano de testes por sprint
**Story**: Melhoria interna | **Dev**: qa-engineer | **Effort**: S

**Escopo:**
- [ ] Criar script ou template que gera plano de testes baseado nas user stories do sprint
- [ ] Integrar com `npm run sprint:start` ou como script separado
- [ ] Template inclui: cenarios happy path, edge cases, regressao, mobile, acessibilidade

**Done when:**
- Template/script funcional
- Documentado no dev-testing-guide

---

#### T-055: QA e validacao final do Sprint 7
**Story**: ALL | **Dev**: qa-engineer | **Effort**: L

**Escopo:**
- [ ] Validar perfil: edicao de nome, exclusao de conta (2 passos), feedback
- [ ] Validar footer em todas as paginas autenticadas
- [ ] Validar fluxo E2E completo: cadastro -> onboarding -> viagem -> plano -> itinerario -> checklist -> perfil -> logout
- [ ] Validar empty states em todas as telas
- [ ] Regressao completa: todos os testes existentes
- [ ] Mobile 375px: todas as telas
- [ ] WCAG 2.1 AA: axe-core em todos os novos componentes
- [ ] Performance: FCP < 2s em 3G simulado

**Done when:**
- Fluxo E2E completo funcional
- 0 regressoes, build limpo
- MVP pronto para testes com usuarios reais

---

### Priorizacao e Ordem de Execucao -- Sprint 7

| # | Item | Tipo | Prioridade | Effort | Justificativa |
|---|------|------|------------|--------|---------------|
| 1 | T-050 (Perfil backend) | Feature | P0 | M | Backend necessario antes do frontend |
| 2 | T-051 (Perfil frontend) | Feature | P0 | L | Pagina de perfil e requisito LGPD |
| 3 | T-052 (Footer autenticado) | Feature | P1 | S | Experiencia completa |
| 4 | T-053 (Polimento + empty states) | Polish | P1 | M | Qualidade da primeira impressao |
| 5 | T-054 (Automacao testes) | Infra | P2 | S | Melhoria de processo |
| 6 | T-055 (QA final) | QA | P0 | L | Validacao obrigatoria pre-MVP |

### Scoring Matrix -- Sprint 7

| Item | Pain (30%) | Revenue (25%) | Effort inv. (20%) | Strategic (15%) | Competitive (10%) | Score |
|------|-----------|--------------|-------------------|----------------|-------------------|-------|
| T-050+051 (Perfil) | 4 (1.20) | 4 (1.00) | 2 (0.40) | 5 (0.75) | 3 (0.30) | **3.65** |
| T-052 (Footer) | 2 (0.60) | 2 (0.50) | 5 (1.00) | 3 (0.45) | 1 (0.10) | **2.65** |
| T-053 (Polimento) | 4 (1.20) | 4 (1.00) | 3 (0.60) | 5 (0.75) | 3 (0.30) | **3.85** |
| T-054 (Auto testes) | 2 (0.60) | 1 (0.25) | 4 (0.80) | 3 (0.45) | 2 (0.20) | **2.30** |

### Mapa de Dependencias -- Sprint 7

```
T-050 (Perfil backend) ──> T-051 (Perfil frontend) ──┐
                                                       ├──> T-055 (QA final)
T-052 (Footer autenticado) ──────────────────────────>│
                                                       │
T-053 (Polimento + empty states) ────────────────────>│
                                                       │
T-054 (Automacao testes) ────────────────────────────>│
```

### Cronograma de Execucao -- Sprint 7

```
Dia 1:  [dev-fullstack-1] T-050 (Perfil backend -- Server Actions + validacao + testes)
        [dev-fullstack-2] T-052 (Footer autenticado) -- item rapido, libera para T-051

Dia 2:  [dev-fullstack-1] T-053 (Polimento -- empty states + loading states) -- INICIO
        [dev-fullstack-2] T-051 (Perfil frontend) -- INICIO (ProfileForm + layout)

Dia 3:  [dev-fullstack-1] T-053 (Polimento -- redirects + mensagens de erro + E2E)
        [dev-fullstack-2] T-051 (Perfil frontend -- DeleteAccountModal + testes)

Dia 4:  [dev-fullstack-1] T-053 (Polimento -- CONCLUSAO)
        [dev-fullstack-2] T-051 (Perfil frontend -- CONCLUSAO + T-054 se tempo)
        [qa-engineer]     T-054 (Automacao testes)

Dia 5:  [qa-engineer]     T-055 (QA final -- fluxo E2E completo + regressao)
        [dev-fullstack-1]  Suporte a QA + fixes
        [dev-fullstack-2]  Suporte a QA + fixes
```

### Definition of Done -- Sprint 7

- [ ] T-050: Server Actions de perfil funcionais com testes
- [ ] T-051: Pagina de perfil completa (edicao + exclusao de conta)
- [ ] T-052: Footer em todas as paginas autenticadas
- [ ] T-053: Empty states, loading states, mensagens de erro, redirects polidos
- [ ] T-054: Template/script de automacao de plano de testes
- [ ] T-055: QA final -- fluxo E2E completo validado
- [ ] Code review aprovado pelo tech-lead
- [ ] Security checklist passado (especialmente exclusao de conta + anonimizacao)
- [ ] `npm run build` sem erros
- [ ] Total de testes >= 320 passando, 0 falhas
- [ ] Sprint review executada por 6 agentes
- [ ] MVP pronto para testes com usuarios reais

---

## Resumo Executivo

### Sprint 6 (Misto: Debt + Feature)
| Categoria | Itens | Effort total estimado |
|-----------|-------|-----------------------|
| Debitos tecnicos (seguranca) | T-038, T-039 | M + S |
| Debitos tecnicos (qualidade) | T-040, T-041, T-042, T-043, T-044, T-045 | XS + S + XS + XS + XS + XS |
| Features | T-046 (Onboarding), T-047 (Trust), T-048 (Header auth) | L + S + S |
| QA | T-049 | M |
| **Total** | **12 tarefas** | **~5 dias com 2 devs** |

### Sprint 7 (Feature + Polish)
| Categoria | Itens | Effort total estimado |
|-----------|-------|-----------------------|
| Features | T-050 (Perfil BE), T-051 (Perfil FE), T-052 (Footer) | M + L + S |
| Polish | T-053 (Polimento E2E) | M |
| Infra | T-054 (Auto testes) | S |
| QA | T-055 | L |
| **Total** | **6 tarefas** | **~5 dias com 2 devs** |

### Roadmap pos-Sprint 7

Apos a conclusao do Sprint 7, o MVP tera o fluxo core completo:

```
Landing -> Cadastro (trust signals) -> Login -> Onboarding (3 steps) -> Viagem criada
    -> Plano gerado pela IA -> Itinerario editavel (drag & drop) -> Checklist IA
    -> Perfil/Configuracoes -> Exclusao de conta (LGPD) -> Logout
```

Os proximos sprints (8+) devem focar em:
1. **Sprint 8**: Orcamento e gastos (US-009, US-011, US-012, US-013) -- ciclo financeiro
2. **Sprint 9**: Links para reservas (US-010) + ajuste on-the-go (US-014) -- ciclo DURANTE a viagem
3. **Sprint 10**: Exclusao de conta LGPD completa (US-016) + security audit + deploy producao

### IDs utilizados neste planejamento

| Tipo | Range | Proximo disponivel |
|------|-------|--------------------|
| User Stories | US-104 a US-109 | US-110 |
| Tasks | T-038 a T-055 | T-056 |

---

*Planejamento elaborado pelo product-owner em 2026-03-04.*
*Proxima acao: tech-lead validar viabilidade tecnica e ajustar cronograma se necessario.*
