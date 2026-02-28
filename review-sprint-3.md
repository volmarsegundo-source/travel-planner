# Sprint 3 — Review

## Resumo

O Sprint 3 transformou o Travel Planner de uma aplicação com landing page vazia em uma aplicação navegável e testável por qualquer pessoa. O foco foi em três áreas: automação do ambiente de desenvolvimento, navegação completa via landing page, e documentação operacional.

## O que foi implementado

### 1. Script de Setup do Ambiente (`scripts/dev-setup.js`)
- Script Node.js completo com 4 modos: `--check`, `--reset`, `--users-only`, e setup completo
- Verifica Docker, containers, portas PostgreSQL (5432) e Redis (6379)
- Executa migrations e gera Prisma Client automaticamente
- Cria 4 usuários de teste com senhas hasheadas (bcrypt 12 rounds)
- Cria 3 viagens de exemplo para o Power User (com dias e atividades)
- Escaneia `src/app/` para descobrir rotas automaticamente
- Testa cada rota se o dev server estiver rodando
- Exibe painel final com credenciais e URLs
- Registrado no `package.json`: `dev:setup`, `dev:check`, `dev:reset`, `dev:users`

### 2. Landing Page com Navegação Completa
- **Header** (`src/components/layout/Header.tsx`): Sticky, logo, language switcher (EN/PT), Login, Sign Up, menu hamburger mobile
- **Hero Section** (`src/components/landing/HeroSection.tsx`): Título i18n, subtítulo, CTA "Get Started" → registro, link "Já tem conta? Entrar" → login, fundo gradiente
- **Features Section** (`src/components/landing/FeaturesSection.tsx`): 4 cards (AI Planning, Drag & Drop, Multi-language, Responsive) em grid responsivo com ícones SVG
- **Footer** (`src/components/layout/Footer.tsx`): Copyright, links Login/Sign Up, language switcher
- **Language Switcher** (`src/components/landing/LanguageSwitcher.tsx`): Troca EN↔PT preservando a rota atual
- Todas as strings via i18n (EN e PT-BR) nos arquivos `messages/en.json` e `messages/pt-BR.json`
- Layout responsivo (mobile, tablet, desktop)

### 3. Navegação e Redirects
- Usuário autenticado na landing page → redirect para `/trips`
- Rota `/dashboard` criada e protegida (redirect para `/trips`)
- Middleware atualizado: `/dashboard` adicionado às rotas protegidas
- Acesso ao dashboard sem auth → redirect para `/auth/login`

### 4. Claude Code Skill
- Criado `.claude/skills/dev-environment/SKILL.md` com:
  - Arquitetura do ambiente
  - Checklist pré-voo
  - Tabela de usuários de teste
  - 4 fluxos de teste manual (New User, Returning User, i18n, Edge Cases)
  - Guia de troubleshooting
  - Checklist pós-sprint

## Testes

### Resultado: 181 testes passando (15 arquivos, 0 falhas)

#### Testes existentes (137 testes — todos passando)
| Arquivo | Testes | Status |
|---------|--------|--------|
| `LoginForm.test.tsx` | 8 | ✅ |
| `RegisterForm.test.tsx` | 12 | ✅ |
| `TrustSignals.test.tsx` | 4 | ✅ |
| `OnboardingWizard.test.tsx` | 7 | ✅ |
| `ProgressIndicator.test.tsx` | 5 | ✅ |
| `trip.schema.test.ts` | 51 | ✅ |
| `ai.service.test.ts` | 12 | ✅ |
| `auth.service.test.ts` | 12 | ✅ |
| `trip.service.test.ts` | 20 | ✅ |

#### Testes novos (44 testes)
| Arquivo | Testes | Cobertura |
|---------|--------|-----------|
| `Header.test.tsx` | 10 | Logo, login/signup links, language switcher, mobile menu toggle, sticky positioning |
| `HeroSection.test.tsx` | 7 | Título, subtítulo, CTA link, login link, gradiente |
| `FeaturesSection.test.tsx` | 5 | 4 cards, títulos h3, ícones SVG, grid layout |
| `Footer.test.tsx` | 5 | Copyright, login/signup links, language switcher |
| `LanguageSwitcher.test.tsx` | 7 | EN/PT options, highlighting, locale links |
| `dev-setup.test.ts` | 10 | Route scanning, port checking, route groups, nested dirs, sorting |

## Issues Encontradas e Resolvidas

### 1. Testes AI Service falhando (pré-existente)
- **Causa**: Vitest 4.x requer `function` (não arrow) para mocks usados como construtores
- **Fix**: Alterado mock do `@anthropic-ai/sdk` de arrow function para regular function
- **Causa 2**: Singleton `globalThis._anthropic` não era limpo entre testes
- **Fix**: Adicionado `globalThis._anthropic = undefined` no `beforeEach`

### 2. Testes duplicados da subpasta `travel-planner/`
- **Causa**: Diretório `travel-planner/` não-rastreado dentro do projeto causava vitest a encontrar testes duplicados
- **Fix**: Adicionado `travel-planner/**` ao `exclude` do vitest.config.ts

### 3. Testes E2E rodando no vitest
- **Causa**: Testes E2E no subdiretório `travel-planner/tests/e2e/` não eram excluídos
- **Fix**: Adicionado `**/e2e/**` ao exclude do vitest.config.ts

## Arquivos Modificados/Criados

### Novos (12 arquivos)
- `scripts/dev-setup.js` — Script de setup do ambiente
- `src/components/layout/Header.tsx` — Header com navegação
- `src/components/layout/Footer.tsx` — Footer
- `src/components/landing/HeroSection.tsx` — Hero section
- `src/components/landing/FeaturesSection.tsx` — Features section
- `src/components/landing/LanguageSwitcher.tsx` — Language switcher
- `src/app/[locale]/dashboard/page.tsx` — Dashboard redirect
- `.claude/skills/dev-environment/SKILL.md` — Skill do Claude Code
- `tests/unit/components/layout/Header.test.tsx` — Testes do Header
- `tests/unit/components/layout/Footer.test.tsx` — Testes do Footer
- `tests/unit/components/landing/HeroSection.test.tsx` — Testes do Hero
- `tests/unit/components/landing/FeaturesSection.test.tsx` — Testes do Features
- `tests/unit/components/landing/LanguageSwitcher.test.tsx` — Testes do Language Switcher
- `tests/unit/scripts/dev-setup.test.ts` — Testes do dev-setup

### Modificados (6 arquivos)
- `src/app/[locale]/page.tsx` — Landing page completa com auth redirect
- `src/middleware.ts` — Adicionado `/dashboard` às rotas protegidas
- `messages/en.json` — Strings i18n da landing page (EN)
- `messages/pt-BR.json` — Strings i18n da landing page (PT-BR)
- `package.json` — Scripts `dev:setup`, `dev:check`, `dev:reset`, `dev:users`
- `vitest.config.ts` — Exclusão de duplicatas e E2E
- `tests/unit/server/ai.service.test.ts` — Fix do mock do Anthropic SDK

## Próximos Passos (Sprint 4)

1. **Fluxo pós-login**: Implementar dashboard real com overview de viagens, atividades recentes e status
2. **Logout**: Adicionar botão de logout no header quando autenticado (menu dropdown do usuário)
3. **Onboarding flow**: Conectar o onboarding wizard após primeiro registro
4. **SEO**: Adicionar meta tags, Open Graph, e structured data na landing page
5. **Animações**: Adicionar transições suaves entre seções e micro-interações nos cards
6. **Performance**: Lazy loading das seções abaixo do fold, otimização de imagens
7. **Acessibilidade**: Audit completo WCAG 2.1 AA, skip navigation, focus management
8. **E2E tests**: Converter fluxos de teste manual em testes Playwright automatizados
