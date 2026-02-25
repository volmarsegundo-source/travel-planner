# dev-fullstack-1 Memory

## Stack Versions (Sprint 1 — confirmed installed)
- Next.js 16.1.6 (App Router, Turbopack)
- React 19.2.3
- TypeScript 5.9.3 (strict mode)
- Tailwind CSS 4 + shadcn/ui 3.8.5
- Prisma 7.4.1 (breaking changes — see patterns.md)
- @prisma/client 7.4.1
- @prisma/adapter-pg 7.4.1 (required — Prisma 7 uses driver adapters)
- Auth.js v5 (auth@1.5.0-beta.16) + @auth/prisma-adapter 2.11.1
- next-intl 4.8.3 (NOT v3 — API differences exist; middleware file = proxy.ts in Next.js 16)
- ioredis 5.9.3
- @paralleldrive/cuid2 3.3.0 (NOT cuid2 — that package does not exist on npm)
- zod 4.3.6
- Vitest 4.0.18 + Playwright 1.58.2

## Critical Prisma 7 Breaking Changes
See patterns.md for full details. Key points:
- Generator provider: `prisma-client` (NOT `prisma-client-js` which is deprecated)
- No `url` in datasource block of schema.prisma — goes in prisma.config.ts
- Requires driver adapter: `@prisma/adapter-pg` for PostgreSQL
- Generated client goes to `src/generated/prisma` (not node_modules)
- Import: `from "@/generated/prisma/client"` (not @prisma/client)

## Key File Paths
- Prisma schema: `/c/travel-planner/prisma/schema.prisma`
- Prisma config: `/c/travel-planner/prisma.config.ts`
- DB client: `/c/travel-planner/src/server/db/client.ts`
- Env config: `/c/travel-planner/src/lib/env.ts`
- i18n routing: `/c/travel-planner/src/i18n/routing.ts`
- i18n request: `/c/travel-planner/src/i18n/request.ts`
- i18n navigation: `/c/travel-planner/src/i18n/navigation.ts`
- Middleware: `/c/travel-planner/src/proxy.ts` (Next.js 16: was middleware.ts)
- Messages PT-BR: `/c/travel-planner/messages/pt-BR.json`
- Messages EN: `/c/travel-planner/messages/en.json`

## Project Conventions
- Branch: always from main, never commit directly
- Commits: Conventional Commits (feat:, fix:, test:, refactor:, chore:)
- Code language: English; docs/communication: Portuguese
- No hardcoded secrets — use environment variables
- Tests required: coverage >= 80%

## Details
See `/c/travel-planner/.claude/agent-memory/dev-fullstack-1/patterns.md`
