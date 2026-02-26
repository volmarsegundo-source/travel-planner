# dev-fullstack-1 Memory

## Project: Travel Planner

### Stack
- Next.js 15 App Router, TypeScript 5, Tailwind 4
- next-intl 3.x for i18n (locales: pt-BR, en; default: pt-BR)
- next-auth v5 beta + @auth/prisma-adapter
- Prisma + PostgreSQL, ioredis for cache
- Node.js at `/c/Program Files/nodejs/node.exe` — always prefix CLI with `export PATH="/c/Program Files/nodejs:$PATH"`

### Key Patterns

#### Vitest mock hoisting (CRITICAL)
`vi.mock()` is hoisted above all `const` declarations by the transformer.
Any variable used inside a vi.mock factory MUST be created with `vi.hoisted()`.
- For plain `vi.fn()` mocks: use `vi.hoisted(() => ({ myFn: vi.fn() }))` and destructure
- For `mockDeep<PrismaClient>()` inside a factory: this works fine (synchronous, no external deps)
- NEVER use `require()` inside `vi.hoisted()` — vitest-mock-extended is ESM-only via its CJS wrapper
- After mocking @/server/db, cast: `const prismaMock = db as unknown as DeepMockProxy<PrismaClient>`
- See: `tests/unit/server/auth.service.test.ts` for the working pattern

#### Server files
All server files must start with `import "server-only";`
Never log PII — use userId only, never email in logs

#### i18n structure
- Routing config: `src/i18n/routing.ts`
- Request config: `src/i18n/request.ts`
- Messages: `messages/pt-BR.json` and `messages/en.json`
- Root layout: minimal shell at `src/app/layout.tsx`
- Locale layout: `src/app/[locale]/layout.tsx` with NextIntlClientProvider
- next.config.ts wraps with `createNextIntlPlugin('./src/i18n/request.ts')`

#### Auth structure
- Auth config: `src/lib/auth.ts` (NextAuth export)
- Route handler: `src/app/api/auth/[...nextauth]/route.ts`
- Service: `src/server/services/auth.service.ts`
- Actions: `src/server/actions/auth.actions.ts`
- Redis keys: `cache:email-verify:{token}`, `cache:pwd-reset:{token}`

#### Error patterns
- Token errors: throw `new AppError("TOKEN_INVALID", "auth.errors.tokenExpired", 400)`
- Duplicate email: throw `new ConflictError("auth.errors.emailAlreadyExists")`
- Error message values are always i18n keys, never raw strings

### Completed Tasks
- T-012: i18n setup with next-intl (locale routing, messages, middleware)
- T-001: Auth.js backend (auth config, service, actions, route handler, tests)
