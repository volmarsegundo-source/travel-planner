# Project Bootstrap

## Description
Automated setup for cloning and running the project on a new machine.

## Triggers
- New developer onboarding
- User cloned the project and needs to set it up
- User asks how to run the project from scratch
- CI/CD pipeline initial setup

## Commands
```bash
npm run bootstrap          # Full automated setup
npm run bootstrap:check    # Verify environment (read-only)
npm run bootstrap:fix      # Auto-fix common issues
```

## What it does
1. Detects stack (Next.js, Prisma, Docker, TypeScript)
2. Checks prerequisites (Node.js version, Git, Docker)
3. Installs dependencies (auto-detects npm/yarn/pnpm)
4. Configures .env from .env.example (fills DATABASE_URL, generates secrets)
5. Starts Docker containers (PostgreSQL, Redis)
6. Runs database setup (prisma generate, migrate, seed)
7. Verifies build (type-check, lint, tests)
8. Generates bootstrap-report.md

## .env Auto-fill Strategy
| Pattern | Strategy |
|---------|----------|
| DATABASE_URL | Extracts from docker-compose.yml |
| REDIS_URL | localhost + docker-compose port |
| *_SECRET, *_KEY | Random 64-char hex |
| NEXTAUTH_URL | http://localhost:3000 |
| NODE_ENV | development |
