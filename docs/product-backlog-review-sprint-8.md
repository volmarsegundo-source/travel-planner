# Travel Planner -- Revisao Completa do Backlog e Priorizacao pos-Sprint 7

**Versao**: 1.0.0
**Data**: 2026-03-05
**Autor**: product-owner
**Versao do produto**: 0.7.0 (449 testes, 0 falhas)
**Sprints concluidos**: 1 a 7
**Branch**: `feat/sprint-7` (pendente merge para master)

---

## 1. Diagnostico: Por Que o Usuario Nao Consegue Usar as Features de Trip/AI/Checklist

### 1.1 Resumo Executivo

O codigo para trip CRUD, geracao de itinerario por IA, geracao de checklist por IA e editor de itinerario **existe e esta completo**. Porem, o usuario nao consegue acessar essas funcionalidades por **tres gaps distintos**:

### 1.2 Gap 1 -- ANTHROPIC_API_KEY nao configurada (Bloqueante)

**Evidencia**: O arquivo `src/lib/env.ts` (linha 13) exige:
```
ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-")
```

A variavel `ANTHROPIC_API_KEY` e **obrigatoria** para o build e para qualquer chamada de IA. Se ela nao estiver definida no `.env.local`, o app:
- **Nao compila** (`npm run build` falha na validacao `@t3-oss/env-nextjs`)
- Ou, se `SKIP_ENV_VALIDATION=true`, compila mas as chamadas a Claude retornam erro 401/timeout

**Status no .env.example**: Documentada corretamente na linha 42 como `ANTHROPIC_API_KEY="sk-ant-YOUR_ANTHROPIC_API_KEY"`. Porem, o usuario precisa obter uma chave real em https://console.anthropic.com/.

**Impacto**: Sem esta chave, as features de IA (US-006, US-008) sao completamente inoperantes. O onboarding wizard (US-104) tambem falha no passo 3 ao tentar gerar o plano.

### 1.3 Gap 2 -- Redis nao rodando (Bloqueante)

**Evidencia**: O servico de IA (`src/server/services/ai.service.ts`) depende do Redis para:
- Cache de respostas da IA (linhas 149-153, 254-256)
- O rate limiter (`src/lib/rate-limit.ts`) usa Lua scripts atomicos no Redis

Se o container Docker `travel_planner_redis` nao estiver rodando:
- `checkRateLimit()` em `ai.actions.ts` (linhas 92, 130) falha com erro de conexao
- O cache miss tenta acessar Redis e falha antes de chamar a API Claude

**Como resolver**: Executar `docker compose up -d` no PowerShell (Claude Code nao tem acesso ao Docker CLI).

**Impacto**: Sem Redis, nenhuma acao de IA funciona. O rate limiter bloqueia preventivamente.

### 1.4 Gap 3 -- Falta de navegacao entre sub-paginas de trip (UX Critico)

**Evidencia concreta** analisando o codigo:

1. **TripCard** (`src/components/features/trips/TripCard.tsx`, linha 71): O card da viagem linka para `/{locale}/trips/{id}` -- a pagina de detalhe.

2. **Pagina de detalhe** (`src/app/[locale]/(app)/trips/[id]/page.tsx`, linhas 68-71): Exibe apenas um **placeholder estatico** com a mensagem `tItinerary("noActivities")`. **NAO existe nenhum link, botao ou navegacao para**:
   - `/trips/{id}/generate` (gerar plano com IA)
   - `/trips/{id}/itinerary` (ver/editar itinerario)
   - `/trips/{id}/checklist` (ver checklist)

3. **As sub-paginas existem e funcionam** (confirmado nos arquivos):
   - `/trips/[id]/generate/page.tsx` -- PlanGeneratorWizard completo
   - `/trips/[id]/itinerary/page.tsx` -- ItineraryEditor com dnd-kit
   - `/trips/[id]/checklist/page.tsx` -- ChecklistView com geracao e edicao

4. **O unico caminho para o generate e via itinerary page** (linha 86-92 de itinerary/page.tsx): Se o itinerario esta vazio, aparece um botao "Generate" que leva ao `/generate`. Mas o usuario precisa primeiro saber que deve navegar para `/itinerary`.

**Conclusao**: A pagina de detalhe da viagem (`/trips/[id]`) e um **beco sem saida** -- mostra titulo, destino e um placeholder, mas nao oferece nenhum caminho para as features principais do produto. O usuario fica preso.

### 1.5 Diagnostico Consolidado

| Gap | Tipo | Severidade | Solucao |
|-----|------|-----------|---------|
| ANTHROPIC_API_KEY ausente | Configuracao | Bloqueante | Configurar chave real no `.env.local` |
| Redis nao rodando | Infraestrutura | Bloqueante | `docker compose up -d` |
| Falta de navegacao na pagina de detalhe | UX/Codigo | Critico | Adicionar action bar com links para itinerary, checklist, generate |

**O Gap 3 e o mais grave do ponto de vista do produto**, porque mesmo com IA e Redis funcionando, o usuario nao tem caminho para descobrir as features. Este e o gap que deve ser resolvido no Sprint 8.

---

## 2. Inventario Completo de Features

### 2.1 Features Implementadas e Testadas

| ID | Feature | Sprint | Testes | Status |
|----|---------|--------|--------|--------|
| US-001 | Criar conta (email + Google OAuth) | 1-2 | Sim | Implementada e testada |
| US-002 | Login e logout | 1-2, 5 | Sim | Implementada e testada |
| US-015 | Alternar idioma PT/EN | 1, 3 | Sim | Implementada e testada |
| US-100 | Navbar autenticada (AppShell) | 5 | Sim | Implementada e testada |
| US-101 | Botao de logout | 5 | Sim | Implementada e testada |
| US-102 | Corrigir erro no LoginForm | 5 | Sim | Implementada e testada |
| US-103 | Breadcrumbs nas sub-paginas | 5 | Sim | Implementada e testada |
| US-104 | Onboarding wizard (3 passos) | 6 | Sim | Implementada e testada |
| US-105 | Trust signals nas telas de auth | 6 | Sim | Implementada e testada |
| US-106 | Header/Footer nas telas de auth | 6 | Sim | Implementada e testada |
| US-107 | Pagina de perfil e configuracoes | 7 | Sim | Implementada e testada |
| US-108 | Footer no layout autenticado | 7 | Sim | Implementada e testada |
| US-109 | Polimento e empty states | 7 | Sim | Implementada e testada |

### 2.2 Features Implementadas mas NAO Acessiveis pelo Usuario (Gap de UX)

| ID | Feature | Componentes Existentes | O que Falta | Severidade |
|----|---------|----------------------|-------------|-----------|
| US-004 | Criar viagem | TripDashboard, CreateTripModal, TripCard, Server Actions | Funciona via dashboard. OK. | -- |
| US-005 | Editar/excluir viagem | EditTripModal, DeleteTripDialog | Funciona via dashboard. OK. | -- |
| US-006 | Gerar plano de viagem com IA | PlanGeneratorWizard, generateTravelPlanAction, AiService.generateTravelPlan, /generate page | **Nao ha link para /generate a partir de /trips/[id]**. So acessivel via URL direta ou onboarding. | CRITICO |
| US-007 | Editar plano gerado (itinerario) | ItineraryEditor, dnd-kit, ItineraryDayCard, ActivityItem, /itinerary page | **Nao ha link para /itinerary a partir de /trips/[id]**. So acessivel via URL direta. | CRITICO |
| US-008 | Gerar checklist com IA | ChecklistView, ChecklistCategorySection, generateChecklistAction, /checklist page | **Nao ha link para /checklist a partir de /trips/[id]**. So acessivel via URL direta. | CRITICO |

### 2.3 Features NAO Implementadas (Backlog Futuro)

| ID | Feature | Sprint Planejado | Dependencias |
|----|---------|-----------------|--------------|
| US-002B | Trust signals no cadastro (v1 original) | Absorvido por US-105 (Sprint 6) | -- |
| US-003 | Onboarding guiado (v1 original) | Absorvido por US-104 (Sprint 6) | -- |
| US-009 | Definir orcamento por categoria | 8 (original 2A) | Trip CRUD |
| US-010 | Links para passagens e hotel | 9 (original 2A) | Itinerario |
| US-011 | Registrar gasto | 8 (original 2B) | Orcamento |
| US-012 | Ver planejado vs. gasto | 8 (original 2B) | Gastos |
| US-013 | Alerta de estouro de orcamento | 8 (original 2B) | Dashboard orcamento |
| US-014 | Ajustar plano on-the-go (mobile) | 9 (original 2B) | Itinerario editor |
| US-016 | Excluir conta e dados (LGPD completa) | 10 (original 2A) | Perfil (US-107) |

### 2.4 Features Fora do Escopo MVP

| Feature | Razao |
|---------|-------|
| Comparativo pos-viagem | Requer dados reais de gastos |
| Compartilhamento e grupo | Complexidade de colaboracao |
| Exportar PDF | Feature de fechamento |
| Multiplos destinos | Simplifica UX no MVP |
| Import reservas via e-mail | Parsing fragil |
| IA -- recomendacoes personalizadas | Requer historico |
| App mobile nativo | Web responsivo valida primeiro |

---

## 3. Proposta de Repriorização dos Sprints 8-10

### Premissa da Repriorização

O roadmap original (Sprint 8 = Orcamento/Gastos) **deve ser ajustado**. A razao: o fluxo principal do MVP (criar viagem -> gerar plano -> ver itinerario -> checklist) **nao funciona end-to-end** porque a pagina de detalhe da viagem nao conecta as sub-paginas. Entregar orcamento e gastos sem resolver este gap e como mobiliar uma casa sem portas.

A nova prioridade e: **primeiro tornar o app funcional end-to-end com as features que ja existem, depois adicionar novas features**.

---

### Sprint 8 -- "O App Funciona" (Must Have)

**Objetivo**: Resolver o gap de navegacao critico, conectar todas as features existentes end-to-end, e garantir que um usuario real possa completar o ciclo completo: criar viagem -> gerar plano IA -> ver/editar itinerario -> gerar/editar checklist.

**Duracao estimada**: 5 dias

#### US-110: Pagina de detalhe da viagem com navegacao completa (Trip Hub)
**Prioridade**: P0 (bloqueante para MVP)
**MoSCoW**: Must Have
**Effort**: L
**Business Value**: Sem esta feature, 100% dos usuarios ficam presos na pagina de detalhe. Nenhuma feature de IA e acessivel. O MVP e inutilizavel.

**User Story**
> As a viajante que criou uma viagem (@leisure-solo, @leisure-family),
> I want to ver todas as opcoes disponiveis para minha viagem na pagina de detalhe,
> So that eu possa navegar para gerar plano, ver itinerario, ver checklist e gerenciar a viagem sem precisar adivinhar URLs.

**Contexto do Viajante**
- **Pain point**: Apos criar uma viagem e clicar no card, o usuario ve apenas titulo, destino e um placeholder vazio. Nao existe nenhum botao, link ou indicacao de que pode gerar um plano, ver itinerario ou checklist. E como reservar um hotel e descobrir que nao ha portas nos quartos.
- **Workaround atual**: Nenhum. O usuario precisa digitar URLs manualmente (/trips/[id]/generate, /trips/[id]/itinerary, /trips/[id]/checklist).
- **Frequencia**: 100% dos usuarios apos criar uma viagem.

**Criterios de Aceite**
- [ ] AC-001: Pagina /trips/[id] exibe action bar com botoes/links para: "Gerar Plano" (/generate), "Itinerario" (/itinerary), "Checklist" (/checklist)
- [ ] AC-002: Se viagem nao tem itinerario gerado, destaque visual no botao "Gerar Plano" (CTA primario)
- [ ] AC-003: Se viagem ja tem itinerario, "Gerar Plano" muda para "Regenerar Plano" com icone de refresh
- [ ] AC-004: Resumo visual na pagina: contagem de dias no itinerario, contagem de itens no checklist, percentual de checklist concluido
- [ ] AC-005: Card de resumo do itinerario (preview dos primeiros 2-3 dias, se existirem)
- [ ] AC-006: Card de resumo do checklist (progresso total + categorias, se existirem)
- [ ] AC-007: Botoes de editar e excluir viagem acessiveis na pagina de detalhe
- [ ] AC-008: Mobile 375px: action bar responsiva (grid ou stack vertical)
- [ ] AC-009: WCAG 2.1 AA: todos os botoes com aria-labels, navegavel via teclado
- [ ] AC-010: Textos via i18n (PT-BR e EN) -- namespace `trips`

**Fora do Escopo (v1)**
- Dashboard de orcamento (Sprint 8B ou 9)
- Mapa do itinerario (futuro)
- Compartilhamento da viagem (fora do MVP)

**Metricas de Sucesso**
- >= 80% dos usuarios que criam viagem acessam pelo menos uma sub-pagina
- Tempo medio entre criacao de viagem e geracao de plano < 30 segundos
- 0% de usuarios reportando "nao sei o que fazer depois de criar viagem"

**Scoring**

| Criterio | Score | Peso | Valor |
|----------|-------|------|-------|
| Pain Severity | 5 | 30% | 1.50 |
| Revenue Impact | 5 | 25% | 1.25 |
| Effort (inv.) | 3 | 20% | 0.60 |
| Strategic Align | 5 | 15% | 0.75 |
| Competitive Diff | 4 | 10% | 0.40 |
| **Total** | | | **4.50** |

---

#### US-111: Validacao de pre-requisitos de infraestrutura (DX Health Check)
**Prioridade**: P0 (bloqueante para desenvolvimento com IA)
**MoSCoW**: Must Have
**Effort**: S
**Business Value**: Sem esta feature, qualquer desenvolvedor ou tester que nao configure Redis + ANTHROPIC_API_KEY vera erros silenciosos. Reduz drasticamente o tempo de troubleshooting.

**User Story**
> As a developer ou tester configurando o ambiente (@dev, @qa),
> I want to ver uma mensagem clara se ANTHROPIC_API_KEY ou Redis nao estiverem configurados,
> So that eu saiba exatamente o que preciso corrigir antes de testar as features de IA.

**Contexto**
- **Pain point**: O usuario (ou tester) tenta usar a geracao de plano, a chamada falha silenciosamente ou mostra erro generico. Nao ha indicacao de que o problema e falta de configuracao.
- **Workaround atual**: Ler README, verificar .env.local manualmente, inspecionar logs do servidor.
- **Frequencia**: Cada novo desenvolvedor ou tester, cada setup de ambiente.

**Criterios de Aceite**
- [ ] AC-001: Se ANTHROPIC_API_KEY nao esta definida, a UI exibe mensagem amigavel na tela de geracao de plano: "Configuracao de IA nao encontrada. Configure a chave da API no arquivo .env.local."
- [ ] AC-002: Se Redis nao esta acessivel, mensagem de erro especifica ao tentar gerar plano/checklist
- [ ] AC-003: Health check endpoint ou Server Action que valida conectividade Redis + presenca da API key
- [ ] AC-004: Mensagem nao exibe a chave real (seguranca) -- apenas indica se esta presente ou ausente
- [ ] AC-005: Em producao, essas mensagens nao sao exibidas (apenas em development)

**Fora do Escopo (v1)**
- Dashboard de status da infraestrutura
- Monitoramento continuo

---

#### Debitos Tecnicos a Resolver no Sprint 8

| ID | Debito | Prioridade | Effort | Justificativa |
|----|--------|-----------|--------|---------------|
| BUG-S7-001 | Raw userId em logger.info (updateProfile) | P2 | XS | Seguranca -- PII em logs |
| BUG-S7-004 | Footer links /terms, /privacy, /support retornam 404 | P1 | S | UX -- links quebrados visíveis |
| BUG-S7-005 | "Traveler" hardcoded English fallback em layout | P2 | XS | i18n -- inconsistencia |
| BUG-S7-006 | aria-label="Loading" hardcoded English nos loading.tsx | P2 | XS | i18n + acessibilidade |
| RISK-010 | Headers de seguranca ausentes em /api/* | P1 | S | Seguranca -- headers missing |
| SEC-S6-001 | Validacao Zod server-side para input de IA | P1 | S | Seguranca -- input nao validado |

#### Tarefas Tecnicas -- Sprint 8

| # | Task | Story/Debt | Tipo | Dev | Effort | Prioridade |
|---|------|-----------|------|-----|--------|-----------|
| T-056 | Trip Hub -- redesign pagina /trips/[id] com action bar | US-110 | Feature | dev-fullstack-2 | L | P0 |
| T-057 | Trip Hub -- resumo de itinerario e checklist na pagina de detalhe | US-110 | Feature | dev-fullstack-2 | M | P0 |
| T-058 | Health check para ANTHROPIC_API_KEY e Redis | US-111 | Feature | dev-fullstack-1 | S | P0 |
| T-059 | Criar paginas estaticas /terms, /privacy, /support | BUG-S7-004 | Debt | dev-fullstack-1 | S | P1 |
| T-060 | Adicionar headers de seguranca em /api/* routes | RISK-010 | Debt | dev-fullstack-1 | S | P1 |
| T-061 | Validacao Zod server-side para input do PlanGeneratorWizard | SEC-S6-001 | Debt | dev-fullstack-1 | S | P1 |
| T-062 | Fix i18n: "Traveler" fallback + "Loading" aria-labels | BUG-S7-005/006 | Debt | dev-fullstack-2 | XS | P2 |
| T-063 | Fix logger: remover raw userId em updateProfile | BUG-S7-001 | Debt | dev-fullstack-1 | XS | P2 |
| T-064 | QA e validacao final Sprint 8 | ALL | QA | qa-engineer | M | P0 |

#### Mapa de Dependencias -- Sprint 8

```
T-058 (Health check) ──────────────────────────────────────────┐
                                                                │
T-056 (Trip Hub action bar) ──> T-057 (Resumo itinerary/ckl) ──├──> T-064 (QA)
                                                                │
T-059 (Paginas /terms, /privacy, /support) ────────────────────│
T-060 (Headers seguranca /api/*) ──────────────────────────────│
T-061 (Zod server-side AI input) ──────────────────────────────│
T-062 (Fix i18n fallbacks) ────────────────────────────────────│
T-063 (Fix logger PII) ───────────────────────────────────────┘
```

#### Scoring Matrix -- Sprint 8

| Item | Pain (30%) | Revenue (25%) | Effort inv. (20%) | Strategic (15%) | Competitive (10%) | Score |
|------|-----------|--------------|-------------------|----------------|-------------------|-------|
| T-056+057 (Trip Hub) | 5 (1.50) | 5 (1.25) | 2 (0.40) | 5 (0.75) | 4 (0.40) | **4.30** |
| T-058 (Health check) | 4 (1.20) | 3 (0.75) | 4 (0.80) | 4 (0.60) | 2 (0.20) | **3.55** |
| T-059 (Paginas legais) | 3 (0.90) | 2 (0.50) | 4 (0.80) | 4 (0.60) | 1 (0.10) | **2.90** |
| T-060 (Headers seguranca) | 4 (1.20) | 2 (0.50) | 4 (0.80) | 5 (0.75) | 2 (0.20) | **3.45** |
| T-061 (Zod AI input) | 4 (1.20) | 3 (0.75) | 4 (0.80) | 5 (0.75) | 2 (0.20) | **3.70** |

#### Cronograma de Execucao -- Sprint 8

```
Dia 1:  [dev-fullstack-1] T-058 (Health check) + T-063 (Fix logger)
        [dev-fullstack-2] T-056 (Trip Hub -- action bar + redesign) -- INICIO

Dia 2:  [dev-fullstack-1] T-060 (Headers seguranca) + T-061 (Zod AI input)
        [dev-fullstack-2] T-056 (Trip Hub -- CONCLUSAO) + T-057 (Resumo) -- INICIO

Dia 3:  [dev-fullstack-1] T-059 (Paginas /terms, /privacy, /support)
        [dev-fullstack-2] T-057 (Resumo itinerary/checklist -- CONCLUSAO) + T-062 (Fix i18n)

Dia 4:  [dev-fullstack-1] Code review + suporte
        [dev-fullstack-2] Testes + code review

Dia 5:  [qa-engineer]     T-064 (QA final -- fluxo E2E completo com IA)
        [dev-fullstack-1]  Suporte a QA + fixes
        [dev-fullstack-2]  Suporte a QA + fixes
```

#### Definition of Done -- Sprint 8

- [ ] T-056: Pagina /trips/[id] tem action bar com links para generate, itinerary, checklist
- [ ] T-057: Resumo visual de itinerario e checklist na pagina de detalhe
- [ ] T-058: Health check para API key e Redis com mensagens amigaveis
- [ ] T-059: Paginas /terms, /privacy, /support criadas (conteudo placeholder)
- [ ] T-060: Headers de seguranca em todas as rotas /api/*
- [ ] T-061: Validacao Zod completa no input de geracao de plano
- [ ] T-062: Nenhum texto hardcoded em ingles (i18n completo)
- [ ] T-063: userId nao aparece raw em logs
- [ ] T-064: QA final -- fluxo E2E com IA validado, todos os testes passando
- [ ] Total de testes >= 480 passando, 0 falhas
- [ ] Sprint review executada por 6 agentes

---

### Sprint 9 -- "O App e Util" (Should Have)

**Objetivo**: Entregar as features financeiras que diferenciam o produto (orcamento + gastos) e os links de booking que conectam planejamento a acao.

#### User Stories do Sprint 9

| ID | Story | Prioridade | Effort | Justificativa |
|----|-------|-----------|--------|---------------|
| US-009 | Definir orcamento por categoria | P0 | L | Feature financeira core -- diferencial competitivo |
| US-011 | Registrar gasto (3 toques) | P0 | M | Completa o ciclo DURANTE a viagem |
| US-012 | Ver planejado vs. gasto | P1 | M | Dashboard visual -- retencao |
| US-013 | Alerta de estouro de orcamento | P1 | S | Notificacao proativa -- diferencial |

#### Tarefas Tecnicas -- Sprint 9

| # | Task | Story | Tipo | Dev | Effort |
|---|------|-------|------|-----|--------|
| T-065 | CRUD de orcamento -- backend (Server Actions, Zod, testes) | US-009 | Backend | dev-fullstack-1 | M |
| T-066 | UI orcamento -- categorias, moeda, total em tempo real | US-009 | Frontend | dev-fullstack-2 | L |
| T-067 | Integracao ExchangeRate-API -- cambio real, cache 1h, fallback | US-009 | Backend | dev-fullstack-1 | M |
| T-068 | CRUD de gastos -- backend | US-011 | Backend | dev-fullstack-1 | M |
| T-069 | UI lançar gasto -- 3 toques, touch-friendly | US-011 | Frontend | dev-fullstack-2 | M |
| T-070 | Dashboard planejado vs. gasto -- barras de progresso | US-012 | Frontend | dev-fullstack-2 | M |
| T-071 | Alertas de estouro -- badge visual 80% e 100% | US-013 | Frontend | dev-fullstack-2 | S |
| T-072 | QA e validacao final Sprint 9 | ALL | QA | qa-engineer | L |

#### Modelos de dados necessarios (Prisma)

Novos modelos a criar em `prisma/schema.prisma`:

```
model Budget {
  id         String  @id @default(cuid())
  tripId     String
  category   String  @db.VarChar(50)
  amount     Decimal @db.Decimal(10, 2)
  currency   String  @db.VarChar(3)

  trip       Trip    @relation(...)
  @@unique([tripId, category])
}

model Expense {
  id          String   @id @default(cuid())
  tripId      String
  category    String   @db.VarChar(50)
  amount      Decimal  @db.Decimal(10, 2)
  currency    String   @db.VarChar(3)
  description String?  @db.VarChar(200)
  date        DateTime @default(now())

  trip        Trip     @relation(...)
  @@index([tripId, category])
}
```

---

### Sprint 10 -- "O App e Confiavel" (Preparacao para Producao)

**Objetivo**: Fechar todas as lacunas de compliance (LGPD), seguranca e operabilidade para deploy em producao.

#### User Stories e Tasks do Sprint 10

| # | Item | Tipo | Prioridade | Effort | Justificativa |
|---|------|------|-----------|--------|---------------|
| US-010 | Links para passagens e hotel (Kayak/Booking deep-links) | Feature | P1 | M | Conecta planejamento a acao |
| US-014 | Ajustar plano on-the-go (mobile optimization) | Feature | P1 | M | Usabilidade mobile |
| US-016 | LGPD compliance completa (exclusao de dados confirmada por email) | Feature | P0 | L | Legal -- obrigatorio |
| T-073 | Security audit pre-release (OWASP Top 10) | Seguranca | P0 | L | Obrigatorio |
| T-074 | CI/CD producao -- pipeline, canary deploy, smoke tests | DevOps | P0 | L | Infraestrutura |
| T-075 | Observabilidade -- dashboards, SLOs, alertas P0/P1 | DevOps | P1 | M | Operabilidade |
| T-076 | Lighthouse audit -- score >= 80 em todas as paginas | QA | P1 | M | Performance |

---

## 4. Debitos Tecnicos -- Status Completo

### 4.1 Debitos Resolvidos (Sprints 1-7)

| ID | Descricao | Sprint | Status |
|----|-----------|--------|--------|
| S6-001 | CSP com unsafe-eval/unsafe-inline | 6 (T-038) | RESOLVIDO -- nonce implementado |
| S6-002 | Rate limiter nao atomico | 6 (T-039) | RESOLVIDO -- Lua script |
| S6-003 | Paginas 404 sem i18n | Pre-Sprint 6 | RESOLVIDO -- catch-all + client component |
| S6-004 | ADR-005 incorreto (database vs JWT sessions) | 6 (T-040) | RESOLVIDO |
| S6-005 | generateChecklistAction sem rate limit | 6 (T-041) | RESOLVIDO |
| S6-006 | UserMenu ARIA role hierarchy | 6 (T-042) | RESOLVIDO |
| S6-007 | Playwright workers/timeout | 6 (T-043) | RESOLVIDO |
| S6-008 | .env.example sem REDIS_HOST/PORT | 6 (T-044) | RESOLVIDO |
| S6-009 | sprint-5-stabilization.md fora de docs/ | 6 (T-045) | RESOLVIDO |
| BUG-S7-000 | Rotas pt-BR tela branca | Pre-Sprint 8 | CORRIGIDO |

### 4.2 Debitos Pendentes (a resolver no Sprint 8)

| ID | Descricao | Prioridade | Effort | Impacto |
|----|-----------|-----------|--------|---------|
| BUG-S7-001 | Raw userId em logger.info (updateProfile) | P2 | XS | Seguranca -- PII em logs (baixo risco em dev, alto em prod) |
| BUG-S7-004 | Footer links /terms, /privacy, /support retornam 404 | P1 | S | UX -- links quebrados visiveis para 100% dos usuarios |
| BUG-S7-005 | "Traveler" hardcoded English fallback em layout | P2 | XS | i18n -- inconsistencia em PT-BR |
| BUG-S7-006 | aria-label="Loading" hardcoded English nos loading.tsx | P2 | XS | i18n + acessibilidade |
| RISK-010 | Headers de seguranca ausentes em rotas /api/* | P1 | S | Seguranca -- sem X-Content-Type-Options, X-Frame-Options, etc. |
| SEC-S6-001 | Validacao Zod server-side incompleta para input de IA | P1 | S | Seguranca -- input do usuario nao validado antes de enviar ao Claude |

### 4.3 Debitos Aceitos (nao serao corrigidos no MVP)

| ID | Descricao | Razao |
|----|-----------|-------|
| Autocomplete de destino (Mapbox) | US-004 AC-002 | Complexidade de integracao -- free text e suficiente para MVP |
| Upload de avatar | US-107 | UX nao essencial -- iniciais do nome sao suficientes |
| Alteracao de senha | US-107 | Fluxo complexo (re-verificacao) -- deferred |
| Alteracao de email | US-107 | Requer re-verificacao de email -- deferred |
| Notificacao por email de exclusao | US-016 AC-005 | Provider de email nao escolhido -- deferred para Sprint 10 |

---

## 5. Metricas de Sucesso: Status Atual vs Meta

### 5.1 Metricas Definidas no Backlog (30 dias pos-lancamento)

| Metrica | Meta | Status Atual | Gap | Bloqueador |
|---------|------|-------------|-----|-----------|
| Usuarios cadastrados | 100 contas ativas | N/A (pre-lancamento) | -- | Deploy em producao |
| Aha moment concluido | >= 70% dos cadastros | Onboarding implementado, mas depende de IA funcionar | Parcial | ANTHROPIC_API_KEY + Redis |
| Planos gerados pela IA | >= 80% das viagens | Codigo pronto, mas **inacessivel pela UI** | CRITICO | Gap 3 (navegacao /trips/[id]) |
| Checklists gerados pela IA | >= 70% das viagens | Codigo pronto, mas **inacessivel pela UI** | CRITICO | Gap 3 (navegacao /trips/[id]) |
| Gastos registrados | >= 30% dos usuarios | NAO implementado | -- | Sprint 9 |
| Tempo ate 1o plano | <= 60 segundos | Onboarding wizard faz em 3 passos, mas depende de IA + config | Parcial | ANTHROPIC_API_KEY + Redis |
| Retencao D7 | >= 40% | N/A (pre-lancamento) | -- | Deploy em producao |
| NPS | >= 50 | N/A (pre-lancamento) | -- | Pesquisa in-app |
| Uptime | >= 99.9% | N/A (pre-lancamento) | -- | Monitoramento |
| Score WCAG | AA em 100% das telas | Validado em Sprints 5-7 | OK | Manter em sprints futuros |

### 5.2 Avaliacao de Prontidao do MVP

| Criterio | Status | Detalhes |
|----------|--------|---------|
| Cadastro funcional | OK | Email + Google OAuth, trust signals, confirm password |
| Login/logout funcional | OK | JWT sessions, cookie cleanup, redirect |
| Onboarding wizard | OK (parcial) | 3 passos funcionais, mas passo 3 depende de IA |
| Criar/editar/excluir viagem | OK | TripDashboard completo |
| Gerar plano de viagem IA | CODIGO OK, **UX QUEBRADO** | PlanGeneratorWizard existe, nao e acessivel |
| Editar itinerario | CODIGO OK, **UX QUEBRADO** | ItineraryEditor existe, nao e acessivel |
| Gerar checklist IA | CODIGO OK, **UX QUEBRADO** | ChecklistView existe, nao e acessivel |
| Perfil e configuracoes | OK | Nome, idioma, exclusao de conta |
| i18n PT-BR/EN | OK | Completo com fallbacks (exceto bugs listados) |
| Acessibilidade WCAG AA | OK | Validado via axe-core |
| Mobile 375px | OK | Validado em todas as telas |

### 5.3 Conclusao

**O MVP NAO esta pronto para lancamento.** A razao principal nao e falta de features, mas sim **falta de conectividade entre features existentes**. O Sprint 8 proposto resolve exatamente este problema.

Apos o Sprint 8, o MVP estara em condicao de teste com usuarios reais (alpha). Apos o Sprint 9 (orcamento/gastos), o MVP estara em condicao de beta publico. Apos o Sprint 10 (LGPD + security audit + deploy), o MVP estara pronto para producao.

---

## 6. Visao Original vs Realidade

### Visao do Produto
> "Diga para onde vai e quando -- a IA monta seu plano e checklist em 60 segundos. Voce ajusta, acompanha os gastos em tempo real e viaja sem surpresas."

### Analise por Segmento

| Segmento da Visao | Implementado? | Funciona End-to-End? | Sprint para Completar |
|-------------------|--------------|---------------------|----------------------|
| "Diga para onde vai e quando" | Sim (CreateTripModal) | Sim | -- |
| "a IA monta seu plano" | Sim (AiService + PlanGeneratorWizard) | **NAO** (UX inacessivel) | Sprint 8 |
| "e checklist em 60 segundos" | Sim (AiService + ChecklistView) | **NAO** (UX inacessivel) | Sprint 8 |
| "Voce ajusta" | Sim (ItineraryEditor dnd-kit) | **NAO** (UX inacessivel) | Sprint 8 |
| "acompanha os gastos em tempo real" | NAO | NAO | Sprint 9 |
| "viaja sem surpresas" | Parcial (checklist existe) | **NAO** (UX inacessivel) | Sprint 8 |

### Conclusao

O produto esta **mais proximo do MVP do que parece**. A maioria das features core (70-80%) esta implementada. O problema e um gap de UX na pagina de detalhe da viagem que impede o acesso. O Sprint 8 resolve este gap com esforco relativamente baixo (uma pagina a redesenhar, debitos menores a corrigir).

---

## 7. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| ANTHROPIC_API_KEY nao configurada em producao | Media | Alto | Health check (T-058) + documentacao + alertas |
| Redis indisponivel em producao | Baixa | Alto | Upstash managed Redis + fallback gracioso |
| Custo de API Claude descontrolado | Media | Medio | Rate limiter ja implementado (10 req/h plano, 5 req/h checklist) + cache Redis 24h |
| Paginas legais (/terms, /privacy) sem conteudo real | Alta | Medio | Criar com conteudo placeholder no Sprint 8, revisar com juridico antes do Sprint 10 |
| Performance da geracao de IA > 60 segundos | Media | Alto | Timeout de 55s configurado + LoadingPlanAnimation + cache agressivo |
| Usuarios testando sem Docker (Redis) | Alta | Alto | Health check (T-058) + mensagens claras + documentacao |

---

## 8. Resumo Executivo para Stakeholders

### O que ja temos (Sprints 1-7)
- Sistema de autenticacao completo (email + Google)
- Landing page bilíngue com trust signals
- Onboarding wizard de 3 passos
- CRUD de viagens com dashboard visual
- Geracao de itinerario por IA (Claude) -- **codigo pronto**
- Editor de itinerario com drag-and-drop -- **codigo pronto**
- Geracao de checklist por IA -- **codigo pronto**
- Perfil do usuario com exclusao de conta
- 449 testes automatizados, 0 falhas
- WCAG AA validado, mobile-first

### O que falta para o MVP funcionar (Sprint 8)
- **Uma pagina**: redesenhar /trips/[id] para conectar todas as features existentes
- **Debitos tecnicos**: 6 itens menores (seguranca, i18n, links 404)
- **Health check**: feedback claro quando IA/Redis nao estao configurados

### Roadmap resumido

| Sprint | Tema | Prazo Estimado |
|--------|------|---------------|
| **8** | O App Funciona (Trip Hub + debitos) | 1 semana |
| **9** | O App e Util (Orcamento + Gastos) | 2 semanas |
| **10** | O App e Confiavel (LGPD + Security + Deploy) | 2 semanas |

---

> **Proximo Passo**: O tech-lead deve iniciar o Sprint 8 imediatamente, priorizando T-056 (Trip Hub) como primeira tarefa. Em paralelo, garantir que o ambiente de desenvolvimento tenha ANTHROPIC_API_KEY e Redis configurados para testes manuais das features de IA existentes.

---

*Documento gerado pelo product-owner em 2026-03-05*
*Proxima revisao: apos Sprint 8 review*
