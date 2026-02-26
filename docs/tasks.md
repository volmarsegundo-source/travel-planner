# Travel Planner — Backlog & Tarefas

**Versão**: 2.0.0
**Atualizado em**: 2026-02-24
**Fonte**: user-story-map-v2.docx (revisão crítica)
**Sprint atual**: 1

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
| T-005 | US-004/005 | Backend | CRUD de viagens — Server Actions, validação Zod, autorização BOLA-safe, testes unitários | dev-fullstack-1 |
| T-006 | US-004/005 | Frontend | UI dashboard de viagens — lista, card visual, modal criação/edição, autocomplete Google Places API | dev-fullstack-2 |
| T-007 | US-006 | Backend 🆕 | Claude API — prompt engineering para geração de plano (itinerário dia a dia, atividades, custos estimados, cache) | dev-fullstack-1 |
| T-008 | US-006 | Frontend 🆕 | UI geração de plano — seleção visual de estilo (ícones), slider de orçamento, animação de loading, máx. 3 interações | dev-fullstack-2 |
| T-009 | US-007 | Frontend | Editor de itinerário — drag-and-drop, add/edit/delete por dia, touch-friendly | dev-fullstack-2 |
| T-010 | US-008 | Backend | Claude API — prompt engineering para checklist por destino (docs, saúde, moeda, clima, tecnologia) | dev-fullstack-1 |
| T-011 | US-008 | Frontend | UI checklist — lista editável, checkbox, categorias visuais, add item manual | dev-fullstack-2 |
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

*(vazio — Sprint 1 em andamento)*

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
