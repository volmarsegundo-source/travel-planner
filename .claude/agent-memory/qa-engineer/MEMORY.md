# QA Engineer — Persistent Memory

## Project Conventions

### Test File Locations
- Unit tests: `tests/unit/server/services/`, `tests/unit/lib/validations/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/trips/`
- Performance tests: `tests/performance/`
- Accessibility tests: `tests/e2e/accessibility/`
- Fixtures and helpers: `tests/fixtures/`, `tests/helpers/`

### Test Framework Stack
- Unit + Integration: Vitest + `vitest-mock-extended` (mock Prisma with `mockDeep<PrismaClient>()`)
- E2E: Playwright (Chromium P0, Firefox + WebKit P1)
- Accessibility: `@axe-core/playwright`
- Performance: Playwright Lighthouse plugin

### Synthetic Test Data Conventions
- Never use real PII — always `@playwright.invalid` email domains
- Synthetic userIds follow pattern: `test-user-a-cuid00000001`
- Fixtures in `tests/fixtures/users.ts` and `tests/fixtures/trips.ts`
- Integration tests use DB transaction rollback in `afterEach` for idempotency

### Key Security Tests Always Required for Trip Features
- BOLA: User B cannot access User A's resources (expects 404, not 403 — no existence leakage)
- Mass assignment: `userId`, `status`, `deletedAt`, `id` stripped by Zod, never from user input
- Auth check is first statement in every Server Action
- `redirect()` must NOT be inside `try/catch` (Next.js NEXT_REDIRECT exception is caught)

### Soft Delete Critical Test (CR-003)
Integration test must verify soft-deleted records do not appear in `findMany`. This must run against real Prisma (not mocked) to catch deprecated `db.$use` / correct `db.$extends` issues.

### Performance Targets (US-001 baseline)
- FCP `/trips`: < 1,500ms (Lighthouse, 4G)
- `createTrip` Server Action: < 500ms P95
- `listTrips` DB query: < 50ms P95
- `getTripById` DB query: < 20ms P95

### AC Coverage Approach
Every AC from `docs/tasks.md` must map to at least one test in QA-SPEC. Coverage Summary table is the traceability matrix.

## Key Docs for QA Context
- `docs/SPEC-001.md` — data model, Server Actions, business logic
- `docs/ux-patterns.md` — UX-001 screen specs, error states, accessibility checklist
- `docs/SEC-SPEC-001.md` — security findings (FIND-M-001 through FIND-L-003), SR-001..SR-008, CR-001..CR-004
- `docs/tasks.md` — acceptance criteria (source of truth)
- `docs/QA-SPEC-001.md` — this feature's test strategy (Strategy ID: QA-SPEC-001)
