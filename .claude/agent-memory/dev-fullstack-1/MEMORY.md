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

#### Streaming pattern (Sprint 18-19)
- `AiProvider.generateStreamingResponse()` returns `{ stream: ReadableStream<string>, usage: Promise<AiProviderResponse> }`
- Stream text accumulation must use a separate array + `streamComplete` promise to decouple from stream consumption timing
- SSE format: `data: {chunk}\n\n` per chunk, `data: [DONE]\n\n` at end
- API routes (not server actions) needed for streaming — server actions don't support streaming responses
- Route file: `src/app/api/ai/plan/stream/route.ts`
- StreamRequestSchema is FLAT (tripId + GeneratePlanParamsSchema merged), matching Phase6Wizard's fetch body
- Rate limit key: `ai:plan:{userId}` — shared with server action to prevent double quota
- SSE response includes `X-Content-Type-Options: nosniff` header
- `messages.stream()` receives `{ signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS) }` as second arg
- **Sprint 19**: Stream route now persists itinerary to DB before sending [DONE], with Redis NX lock
- Shared persistence logic in `src/server/services/itinerary-persistence.service.ts`
- Redis lock key: `lock:plan:{tripId}`, TTL 300s, returns 409 if already held
- Error SSE events: `{"error":"parse_failed"}`, `{"error":"persist_failed"}`
- Progress UI: `src/lib/utils/stream-progress.ts` — phase detection, day counting from partial JSON
- Phase6Wizard uses `key={phase6-${trip.itineraryDays.length}}` to force remount after router.refresh()

#### Destination guide (Sprint 19)
- Expanded from 6 to 10 sections: added safety, health, transport_overview, local_customs
- Each section has `type: "stat" | "content"` and optional `details: string`
- Token budget increased to 4096
- Guide context in itinerary-plan.service now includes safety + transport summaries
- `GuideSectionKey` type and `GUIDE_SECTION_KEYS` updated in types + expedition.actions

#### Destination search i18n
- Nominatim accepts `Accept-Language` header for localized results
- Cache keys include locale: `dest:search:${locale}:${query}`
- DestinationAutocomplete uses `useLocale()` from next-intl
- When mocking next-intl, must include both `useTranslations` and `useLocale`

#### Phase1Wizard step order (Sprint 20)
- Step 1: About You (birthDate, phone, country, city, bio)
- Step 2: Destination (autocomplete + trip type badge)
- Step 3: Dates (startDate, endDate, flexibleDates)
- Step 4: Confirmation (summary + submit)
- Profile persistence: if userProfile has birthDate+country+city, show summary card with Edit button
- i18n keys: step1=about you, step2=destination, step3=dates (swapped from original)

#### Passengers model (Sprint 20)
- `passengers Json?` on Trip model, structure: { adults, children: { count, ages[] }, seniors, infants }
- PassengersSchema in `src/lib/validations/trip.schema.ts` with getTotalPassengers helper
- Phase2Wizard: "passengers" step replaces "groupSize" for family/group types
- Phase2Schema in expedition.schema.ts has optional passengers field
- ExpeditionService.completePhase2 persists passengers to Trip

#### Sprint 44 Wave 1 — Phase Reorder Foundation
- Feature flag: `NEXT_PUBLIC_PHASE_REORDER_ENABLED` (boolean, default false) in env.ts + helper at `src/lib/flags/phase-reorder.ts`
- New ordering (flag ON): 1=Inspiration, 2=Profile, 3=Guide(AI), 4=Itinerary(AI), 5=Logistics, 6=Checklist(AI)
- `PHASE_DEFINITIONS_REORDERED` added to phase-config.ts; `getPhaseDefinitions()` is flag-aware factory
- `NON_BLOCKING_PHASES_REORDERED = {5,6}` (was {3,4}); `getNonBlockingPhases()` flag-aware
- `evaluatePhaseCompletion` flag-aware dispatch: flag ON re-wires phase3→Guide, phase4→Itinerary, etc.
- Digest scaffold: `src/lib/prompts/digest.ts` — buildGuideDigest, buildItineraryDigest, buildLogisticsDigest (pure functions, zero I/O, sanitizeForPrompt on all user fields)
- `ExpeditionAiContextService.assembleFor(tripId, targetPhase, userId?)` in `src/server/services/expedition-ai-context.service.ts` — canonical AI context assembler with BOLA guard + graceful degradation
- 135 new tests (6 test files), 0 regressions
- Pre-existing failing test: `tests/unit/components/itinerary/PlanGeneratorWizard.test.tsx` (next/server module issue — NOT caused by Sprint 44)

#### Sprint 44 Wave 3 — Frontend flag-aware UI
- `PhaseReorderBanner` — new component, 7 tests, localStorage dismiss, role=status aria-live=polite
- `ExpeditionCardRedesigned` — quick-access order: flag ON = Guide > Itinerary > Checklist > Report
- `ExpeditionSummary` — PHASE_ICONS and phaseNames arrays flag-aware
- `ChecklistProgressMini` — checklist path: phase-3 (flag OFF) → phase-6 (flag ON)
- `PhasesSectionV2` (landing) — icons and i18n keys flag-aware for phases 3-6
- Wizards Phase2/3/4/DestinationGuideV2/Phase6ItineraryV2 — back/next paths + CTA labels + subtitles flag-aware
- i18n: phaseReorderBanner.*, phase{3-6}.subtitleReordered, ctaNextReordered, ctaBackReordered, landingV2.phases.phase{3-6}Reordered
- 3101 tests passing (+79 vs Wave 2 baseline)

### Completed Tasks
- T-012: i18n setup with next-intl (locale routing, messages, middleware)
- T-001: Auth.js backend (auth config, service, actions, route handler, tests)
- T-S18-003: Hash userId in trip.actions.ts (5 occurrences)
- T-S18-004: Hash userId in auth.service.ts (5 occurrences)
- T-S18-005: Hash userId in profile.service.ts (1 occurrence)
- T-S18-006: Streaming in ClaudeProvider (6 tests)
- T-S18-007: Streaming API route for itinerary generation (11 tests)
- T-S18-012: Destination search i18n + performance (24 tests total)
- SEC-S18-002/003/004: Streaming security fixes (schema, timeout, headers, rate limit key)
- T-S19-001a: Progress UI for Phase6Wizard (stream-progress utils + rewritten component)
- T-S19-001b: Persist itinerary after stream + Redis generation lock
- T-S19-001c: Fix stale useState with key prop on Phase6Wizard
- T-S19-007: Cascade deletion test for SEC-S18-001 (code already in place)
- T-S19-008: Guide expansion 6→10 sections, type/details fields, 4096 tokens
- T-S20-001: Guide redesign backward compatibility (null guards for old 6-section guides, 3 tests)
- T-S20-003: Hash userId in gamification engines (12 occurrences across 3 files)
- T-S20-004: Phase1 step reorder — About You first (11 tests)
- T-S20-005: Profile persistence — summary card + Edit toggle (18 tests)
- T-S20-009: Passenger data model — PassengersSchema + migration (21 tests)
- T-S20-010: Passenger UI — airline-style steppers in Phase2Wizard (13 tests)
