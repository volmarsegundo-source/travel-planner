---
spec-id: GENESIS-001
title: Atlas Travel Planner — Especificacao Genesis
version: 1.0.0
status: Draft
owner: architect
reviewers: [tech-lead, product-owner, security-specialist]
created: 2026-03-12
updated: 2026-03-12
---

# Atlas Travel Planner — Especificacao Genesis

## 1. Visao do Produto

**Atlas Travel Planner** e uma aplicacao web de planejamento de viagens gamificado que transforma o processo de organizar uma viagem em uma "expedicao" com fases, pontos e conquistas. O sistema atende viajantes que planejam viagens domesticas e internacionais, centralizando todas as informacoes — destino, datas, documentos, transporte, hospedagem, roteiro, checklist — em uma experiencia unificada e progressiva.

### Problema que Resolve

Planejar uma viagem envolve dezenas de decisoes fragmentadas em multiplas ferramentas (planilhas, apps de notas, emails, PDFs). O Atlas consolida esse processo em um fluxo guiado de 8 fases, onde cada fase conclui uma etapa logica do planejamento e recompensa o viajante com pontos e badges.

### Usuarios-Alvo

- **Viajantes individuais** planejando ferias, viagens de trabalho ou gap years
- **Casais e familias** organizando viagens com passageiros multiplos (adultos, criancas, bebes)
- **Viajantes frequentes** que desejam manter historico e reutilizar preferencias

### Proposta de Valor

1. **Fluxo guiado**: 8 fases sequenciais eliminam a paralisia de decisao
2. **Gamificacao**: pontos, badges e progresso visual motivam a conclusao do planejamento
3. **AI-assisted**: geracao de roteiros e checklists com inteligencia artificial
4. **PII seguro**: dados sensiveis (passaporte, codigos de reserva) criptografados com AES-256-GCM
5. **Bilíngue**: suporte completo a pt-BR e en

---

## 2. Stack Tecnologico

| Camada | Tecnologia | Versao | Justificativa (ADR) |
|--------|-----------|--------|---------------------|
| Framework | Next.js 15 (App Router) | 15.x | Full-stack monolito modular (ADR-001, ADR-002) |
| Linguagem | TypeScript | 5.x strict | Type safety end-to-end |
| Styling | Tailwind CSS 4 + shadcn/ui | 4.x | Utility-first + Radix primitives acessiveis |
| ORM | Prisma | 7.x | Schema-first, migrations seguras (ADR-001) |
| Banco de dados | PostgreSQL | 16.x | Relacional + JSONB para campos flexiveis |
| Cache | Redis (ioredis) | 7.x | Rate limiting + cache de busca |
| Autenticacao | Auth.js v5 | 5.x | JWT strategy, Edge-compatible (ADR-005) |
| AI | Anthropic Claude SDK | latest | Sonnet (roteiro) + Haiku (checklist) via provider abstraction (ADR-003) |
| i18n | next-intl | latest | App Router nativo (ADR-004) |
| Mapas | Mapbox GL JS | 3.x | Vector tiles, customizavel (ADR-001) |
| State | TanStack Query v5 | 5.x | Server state, cache, optimistic updates |
| Forms | React Hook Form + Zod | latest | Validacao type-safe compartilhada |
| Testes unitarios | Vitest + Testing Library | latest | Rapido, Vite-native |
| Testes E2E | Playwright | latest | Cross-browser, CI-friendly |
| CI/CD | GitHub Actions | — | Nativo ao Git |
| Hosting | Vercel (frontend) + Railway/Render (DB) | — | Baixo custo operacional no MVP |

---

## 3. Fases da Expedicao

O Atlas organiza o planejamento de viagem em 8 fases sequenciais. Cada fase tem um nome tematico, pontos associados e um wizard dedicado.

| # | Nome Interno | Nome de Exibicao (pt-BR) | Pontos | Descricao |
|---|-------------|-------------------------|--------|-----------|
| 1 | the_calling | O Chamado | 200 | Informacoes pessoais, destino, datas, estilo de viagem |
| 2 | the_explorer | O Explorador | 300 | Tipo de viagem, passageiros, preferencias de exploracao |
| 3 | the_preparation | A Preparacao | 300 | Checklist de documentos e itens necessarios |
| 4 | the_logistics | A Logistica | 400 | Transporte, hospedagem, mobilidade local |
| 5 | the_guide | O Guia | 300 | Guia do destino gerado por AI |
| 6 | the_itinerary | O Roteiro | 400 | Roteiro dia-a-dia gerado por AI com DnD |
| 7 | summary | Resumo da Jornada | 0 | Consolidacao de todos os dados da expedicao |
| 8 | dashboard | Painel | 200 | Dashboard do viajante com metricas e proximos passos |

**Pontuacao total por expedicao**: 2100 pontos
**Bonus de boas-vindas (primeira vez)**: 500 pontos
**Pontos por campo de perfil**: 25 pontos cada

### Regras de Progressao

- Fases sao sequenciais — a fase N+1 so e acessivel apos completar a fase N
- Cada fase pode ser revisitada apos completada (dados sao pre-populados)
- Pontos sao concedidos apenas na primeira conclusao de cada fase
- Transacoes de pontos sao registradas como audit trail (PointTransaction)

---

## 4. Non-Negotiables (Restricoes Inviolaveis)

Estas restricoes sao absolutas e nao podem ser negociadas, adiadas ou descoped sem aprovacao explicita do stakeholder principal.

### 4.1 Internacionalizacao (i18n)

- **Locales suportados**: pt-BR (default), en
- **Cobertura**: 100% de strings visíveis ao usuario devem ser traduzidas
- **Routing**: prefixo de locale na URL (`/pt/...`, `/en/...`)
- **Imports**: usar `src/i18n/navigation.ts` (Link, redirect, useRouter) — NUNCA `next/link` diretamente
- **Referencia**: ADR-004

### 4.2 Acessibilidade (WCAG)

- **Nivel**: WCAG 2.1 AA minimo
- **Keyboard navigation**: todos os fluxos interativos devem ser acessiveis via teclado
- **Screen reader**: labels ARIA em todos os controles interativos
- **Reduced motion**: respeitar `prefers-reduced-motion`
- **shadcn/ui**: componentes baseados em Radix primitives (acessibilidade built-in)

### 4.3 Criptografia de PII

- **Algoritmo**: AES-256-GCM (implementado em `src/lib/crypto.ts`)
- **Campos criptografados**: `passportNumberEnc`, `bookingCodeEnc` (TransportSegment e Accommodation)
- **Chave de criptografia**: via variavel de ambiente `ENCRYPTION_KEY` — NUNCA hardcoded
- **Regra**: dados criptografados NUNCA cruzam a fronteira server->client em texto claro
- **Mascaramento**: booking codes exibidos mascarados (ex: `****XY7Z`)

### 4.4 Prevencao de BOLA (Broken Object Level Authorization)

- **Regra**: TODA query Prisma que acessa dados de usuario DEVE incluir `userId` no WHERE
- **Verificacao**: auth check ANTES de data access, SEMPRE
- **Server Actions**: sessao validada como primeira operacao
- **Referencia**: OWASP API Security Top 10 — API1:2023

### 4.5 Protecao contra Mass Assignment

- **Regra**: NUNCA fazer spread de input do usuario diretamente no Prisma (`...userInput`)
- **Regra**: mapear campos explicitamente — field por field
- **Referencia**: DT-004 (divida tecnica conhecida em `updateTrip`)

### 4.6 Rate Limiting

- **Implementacao**: script Lua atomico no Redis (`src/lib/rate-limit.ts`)
- **Limites documentados**: ver secao de Rate Limits no agent-memory do architect
- **Regra**: todo endpoint publico e toda server action de AI DEVEM ter rate limiting

---

## 5. Bounded Contexts por Agente

Cada agente opera dentro de um bounded context definido. Nenhum agente deve operar fora do seu contexto sem coordenacao explicita do tech-lead.

### 5.1 Product Owner

- **Contexto**: definicao de WHAT e WHY
- **Artefatos**: SPEC-PROD-XXX, user stories em `docs/tasks.md`, prioridades de backlog
- **Fronteira**: NAO define HOW (implementacao) nem escolhas tecnologicas
- **Inputs**: pesquisa de mercado, feedback de usuarios, metricas de produto
- **Outputs**: specs de produto com acceptance criteria

### 5.2 UX Designer

- **Contexto**: experiencia do viajante
- **Artefatos**: SPEC-UX-XXX, fluxos de usuario, prototipos HTML/CSS, padroes visuais
- **Fronteira**: NAO referencia bibliotecas ou frameworks especificos
- **Inputs**: SPEC-PROD (o que construir), pesquisa de UX, heuristicas de usabilidade
- **Outputs**: specs de UX com fluxos, wireframes, padroes de interacao

### 5.3 Architect

- **Contexto**: decisoes de sistema e HOW to build
- **Artefatos**: SPEC-ARCH-XXX, ADRs, API contracts, data models, AS-IS/TO-BE
- **Fronteira**: NAO implementa features nem faz decisoes de produto
- **Inputs**: SPEC-PROD, SPEC-UX (o que e como o usuario experimenta)
- **Outputs**: specs de arquitetura, ADRs, schemas, diagramas

### 5.4 Data Engineer

- **Contexto**: modelos de dados, event tracking, pipelines de analytics
- **Artefatos**: SPEC-DATA-XXX, schemas de eventos, pipelines ETL
- **Fronteira**: NAO define logica de negocio nem UI
- **Inputs**: SPEC-ARCH (data model), requisitos de analytics
- **Outputs**: schemas de eventos, pipelines, docs de data lineage

### 5.5 Tech Lead

- **Contexto**: orquestracao, qualidade, gate de aprovacao
- **Artefatos**: task breakdown, sprint plans, code reviews, approval final de specs
- **Fronteira**: NAO implementa features de forma regular — coordena
- **Inputs**: todas as specs (aprovacao final)
- **Outputs**: tarefas atribuidas, decisoes de qualidade, sprint retrospectives

### 5.6 Security Specialist

- **Contexto**: seguranca, privacidade, compliance
- **Artefatos**: SPEC-SEC-XXX, threat models, auditorias de dependencias
- **Fronteira**: NAO implementa features — revisa e audita
- **Inputs**: todas as specs (revisao de seguranca)
- **Outputs**: security reviews, CVE reports, compliance checklists

### 5.7 Release Manager

- **Contexto**: impacto de mudancas, versionamento, changelogs
- **Artefatos**: CIA-XXX (Change Impact Analysis), CHANGELOG entries, release notes
- **Fronteira**: NAO implementa nem aprova specs — avalia impacto
- **Inputs**: specs aprovadas, PRs prontos para merge
- **Outputs**: changelogs, versao bump, release notes

### 5.8 DevOps Engineer

- **Contexto**: CI/CD, infraestrutura, observabilidade
- **Artefatos**: pipeline configs, Dockerfiles, monitoring dashboards
- **Fronteira**: NAO define logica de negocio
- **Inputs**: SPEC-ARCH (requisitos de infra)
- **Outputs**: pipelines, configs de deploy, alertas

### 5.9 QA Engineer

- **Contexto**: qualidade, estrategia de teste, conformance
- **Artefatos**: test plans, conformance audits, release sign-off (QA-REL-XXX)
- **Fronteira**: NAO implementa features — valida contra specs
- **Inputs**: specs aprovadas (acceptance criteria)
- **Outputs**: test plans, bug reports, conformance reports

### 5.10 Dev Fullstack 1 & 2

- **Contexto**: implementacao de features (full-stack)
- **Artefatos**: codigo fonte, testes unitarios, PRs
- **Fronteira**: implementam APENAS contra specs aprovadas; desvios requerem protocolo SDD
- **Inputs**: specs aprovadas, tarefas do tech-lead
- **Outputs**: codigo implementado com testes

### 5.11 FinOps Engineer

- **Contexto**: custos de infraestrutura e AI, otimizacao financeira
- **Artefatos**: COST-LOG.md, cost assessments, alertas de custo
- **Fronteira**: NAO implementa features — monitora e otimiza custos
- **Inputs**: SPEC-ARCH, SPEC-PROD (features com impacto de custo)
- **Outputs**: relatorios de custo, recomendacoes de otimizacao

### 5.12 Prompt Engineer

- **Contexto**: design de prompts, otimizacao de tokens, guardrails de AI
- **Artefatos**: SPEC-AI-XXX, templates de prompt, metricas de token
- **Fronteira**: NAO implementa features — projeta e otimiza prompts
- **Inputs**: SPEC-PROD (features de AI), feedback do finops-engineer
- **Outputs**: templates de prompt, guardrails, metricas de custo de token

---

## 6. Modelo de Dados Fundacional

### Entidades Core

```
User (1) ──── (1) UserProfile
  |                  |
  | 1:N              | preferences (JSON, Zod-validated)
  |                  | birthDate, phone, country, city, bio
  v                  | passportNumberEnc (AES-256-GCM)
Trip (N)
  |
  |── adultsCount, childrenCount, infantsCount, childrenAges[]
  |── origin, destination, startDate, endDate
  |── expeditionMode, currentPhase, tripType
  |── destinationLat?, destinationLon?
  |
  |── (1:N) ExpeditionPhase
  |          |── phaseNumber, status, completedAt
  |          |── metadata (JSON)
  |          |── pointsAwarded
  |
  |── (1:N) ItineraryDay
  |          |── (1:N) Activity (orderIndex, startTime, endTime)
  |
  |── (1:N) ChecklistItem
  |
  |── (1:N) TransportSegment
  |          |── type, origin, destination, departureAt, arrivalAt
  |          |── carrier, flightNumber, bookingCodeEnc
  |
  |── (1:N) Accommodation
  |          |── name, address, checkIn, checkOut
  |          |── bookingCodeEnc
  |
  |── (0:1) DestinationGuide (content JSON)
  |
  |── localMobility (String[])

User (1) ──── (1) UserProgress
  |                  |── totalPoints, level, rank
  |
  |── (1:N) PointTransaction (audit trail)
  |── (1:N) UserBadge
```

### Convencoes de Schema

- **IDs**: CUID2 para todas as primary keys
- **Soft deletes**: `deletedAt` (nullable timestamp) em entidades de usuario
- **Timestamps**: `createdAt` + `updatedAt` em todas as tabelas (UTC)
- **Strings extensiveis**: colunas String para value sets (NAO Prisma enums) — rank, badge, status, transportType
- **Cascade**: `onDelete: Cascade` para dados derivados (ChecklistItem, ItineraryDay, TransportSegment, Accommodation)
- **JSON validado por Zod**: DestinationGuide.content, ExpeditionPhase.metadata, UserProfile.preferences

### Limites de Negocio

| Constante | Valor | Justificativa |
|-----------|-------|---------------|
| MAX_ACTIVE_TRIPS | 20 | Prevenir abuso e manter performance |
| MAX_TRANSPORT_SEGMENTS | 10 | Limite razoavel por viagem |
| MAX_ACCOMMODATIONS | 5 | Limite razoavel por viagem |
| MAX_TOTAL_PASSENGERS | 20 | Cap total (adultos + criancas + bebes) |

---

## 7. Integracao com Processos

### SDD (Spec-Driven Development)

- **Efetivo desde**: Sprint 25 (v0.18.0)
- **Referencia**: `docs/specs/SDD-PROCESS.md`
- **Regra**: toda feature de escopo nao-trivial requer spec aprovada antes de codigo

### EDD (Eval-Driven Development)

- **Status**: em definicao (esta genesis spec e parte da iniciativa)
- **Referencia**: `docs/process/EVAL-DRIVEN-DEVELOPMENT.md` (a ser criado)
- **Objetivo**: adicionar metricas objetivas de qualidade ao fluxo SDD

### Sprint Review

- **Mandatorio**: 6 agentes revisam ao final de cada sprint
- **Output**: `docs/sprint-reviews/SPRINT-XXX-review.md`
- **Referencia**: CLAUDE.md — Sprint Review Protocol

---

## 8. Variaveis de Ambiente Requeridas

Todas as variaveis sao validadas no startup via `@t3-oss/env-nextjs` em `src/lib/env.ts`.

| Variavel | Tipo | Obrigatoria | Descricao |
|----------|------|-------------|-----------|
| `DATABASE_URL` | String (URL) | Sim | Connection string PostgreSQL |
| `REDIS_URL` | String (URL) | Sim | Connection string Redis |
| `NEXTAUTH_SECRET` | String (min 32) | Sim | Segredo para JWT Auth.js |
| `NEXTAUTH_URL` | String (URL) | Sim | URL base da aplicacao |
| `ENCRYPTION_KEY` | String (hex 64) | Sim | Chave AES-256-GCM para PII |
| `ANTHROPIC_API_KEY` | String | Nao* | API key Anthropic (*obrigatoria para features de AI) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | String | Nao* | Token publico Mapbox (*obrigatoria para mapas) |
| `GOOGLE_CLIENT_ID` | String | Nao* | OAuth Google (*obrigatoria para login Google) |
| `GOOGLE_CLIENT_SECRET` | String | Nao* | OAuth Google secret |

**Regra**: NUNCA hardcode valores — sempre via variaveis de ambiente ou secret manager.

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.0.0 | 2026-03-12 | architect | Criacao da genesis spec |
