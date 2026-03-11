# dev-fullstack-2 Memory

## Project Setup
- Branch convention: `feat/sprint-1` for Sprint 1 work
- Node PATH must be set: `export PATH="/c/Program Files/nodejs:$PATH"` before any CLI
- Working dir: `/c/travel-planner` (use absolute paths always)
- Tailwind 4 is used — shadcn init does NOT take `--css-variables` as a flag; use `--defaults --base-color slate` only
- shadcn adds components to `src/components/ui/`; features go in `src/components/features/`

## Architecture Patterns
- All user-visible strings go through `useTranslations()` / `getTranslations()` — no hardcoded strings
- Auth: `signIn`/`signOut` from `next-auth/react` (client); `auth()` from `@/lib/auth` (server)
- Server actions in `src/server/actions/` — called from client components via import
- `src/i18n/routing.ts` defines locales: `['pt-BR', 'en']`, defaultLocale `'pt-BR'`, prefix `as-needed`
- Route guards: use `auth()` in server components + `redirect()` from `next/navigation`

## Testing Patterns (see patterns.md for full detail)
- Mock `next-intl` as: `useTranslations: (ns) => (key) => \`${ns}.${key}\``
- Mock `next/navigation` as: `useRouter: () => ({ push: mockRouterPush })`
- Use `vi.hoisted()` for all mock function vars referenced in `vi.mock()` factories
- `fireEvent.submit(form)` works better than `fireEvent.click(button)` for react-hook-form
- `screen.getByLabelText()` finds inputs by `for` attribute on label — works with shadcn FormLabel
- Always use `waitFor()` after async form submissions

## Known Gotchas
- react-hook-form: empty string `""` fails `z.string().min(1)` even when field is `.optional()` — use `.transform(val => val.trim() === "" ? undefined : val)` in client schema
- shadcn `Form` uses shadcn `FormLabel` which generates IDs via `useId()` — test IDs like `_r_h_-form-item` are ephemeral
- `aria-label` on a button overrides text content for accessible name — avoid setting both
- ProgressIndicator mock returns key string without interpolation since `"onboarding.progress"` doesn't contain `{current}` literal — test for `"onboarding.progress"` not interpolated value

## Sprint 26 — Completed Tasks (dev-fullstack-2)
- TASK-26-001: Autocomplete UX fix — two-line results, opaque dropdown, no-results hint, mobile touch targets, City/Country selected format
- TASK-26-002: Autocomplete tests — 20 tests (up from 12) covering all new UX behaviors
- TASK-26-008: Preferences pagination — 2 pages of 5, Previous/Next, single-page fallback, focus management, aria-live
- TASK-26-009: Preferences tests — 24 tests (up from 16) covering pagination, chip truncation fix
- TASK-26-010: Dashboard card redesign — non-interactive progress bar, travel dates, completed badge, keyboard nav
- TASK-26-011: Dashboard tests — 32 tests covering visual states, dates, badge, keyboard

## Sprint 26 Patterns
- Autocomplete: useTranslations("destination") for no-results/searching; two-line layout via getResultLines()
- formattedName field added to API route: city + state + country assembled from Nominatim data
- Preferences pagination: CATEGORIES_PER_PAGE=5, needsPagination when >5, useEffect for focus on page change
- DashboardPhaseProgressBar: removed tripId prop, Link wrappers, phase labels; segments are read-only divs
- ExpeditionCard: role="article", tabIndex=0, onKeyDown Enter/Space triggers link click
- Pre-existing failures: Phase6Wizard.test.tsx (server-only import), 30 TS errors in test mocks (not runtime)

## Sprint 20 — Completed Tasks (dev-fullstack-2)
- T-S20-002: Remove duplicate checklist/itinerary shortcuts from ExpeditionCard (PhaseToolsBar already provides them)
- T-S20-006: Preferences schema — Prisma migration (preferences Json? on UserProfile), Zod PreferencesSchema with 10 categories, PreferencesService
- T-S20-007: Preferences UI — PreferenceChip, PreferenceCategory, PreferenceProgressBar, PreferencesSection with debounced auto-save (500ms)
- T-S20-008: Preferences gamification — savePreferencesAction awards 5pts per newly filled category, identity_explorer badge at 5+ categories
- T-S20-011: Transport data model — TransportSegment + Accommodation Prisma models, Zod schemas, Phase 4 rename "A Logistica", cascade deletion
- T-S20-012: Fix test regressions — phase-engine test (Phase 4 rename), account.actions test (transport/accommodation mock in makeMockTx)

## Sprint 20 Patterns
- Preferences: 10 categories, 6 single-select (nullable enum) + 4 multi-select (string array), stored as Json in UserProfile
- Chip-based UI: PreferenceChip with role="radio"|"checkbox", min 44px touch target, aria-checked
- Debounced auto-save: useRef for debounce timer, useTransition for isPending state, 500ms delay
- "no_restrictions" mutual exclusivity: selecting it clears other food preferences, selecting others clears it
- Prisma permission denied on Windows: create migration SQL manually, skip prisma generate (tests mock PrismaClient)
- When adding cascade deletion models, update makeMockTx() in account.actions.test.ts

## Sprint 19 — Completed Tasks (dev-fullstack-2)
- T-S19-002: Fix navigation for completed trips — added `getHighestCompletedPhase()` to PhaseEngine, simplified ExpeditionHubPage redirect logic
- T-S19-003: Cascade deletion (SEC-S18-001) — added Activity, ItineraryDay, ChecklistItem cleanup in deleteUserAccountAction transaction
- T-S19-004: Fix completedPhases count — `Math.max(explicit, currentPhase - 1)` in trip.service.ts
- T-S19-005: Show bio in Phase1Wizard confirmation — added bio display with 100-char truncation, i18n keys
- T-S19-006: Deduplicate destinations — dedup by city+state+country in API route, keeping higher importance
- T-S19-011: Consistent currency format — `getDefaultCurrency(locale)` + `formatCurrency()` utility, updated Phase2Wizard, PlanGeneratorWizard, OnboardingWizard
- T-S19-009: SKIPPED — T-S19-008 (guide backend by dev-1) not committed yet

## Sprint 19 — Pre-existing Test Failures (NOT regressions)
- `ai.service.test.ts`: "passes system prompt to provider for guide generation" — expects "6 sections" but prompt now says "10 sections" (guide redesign by another agent)
- `DestinationGuideWizard.test.tsx`: "section buttons have aria-expanded attribute" — expects 6 sections but now 10 (same cause)

## Sprint 19 Patterns
- Currency utility: `src/lib/utils/currency.ts` — `getDefaultCurrency(locale)` and `formatCurrency(value, currency, locale)`
- PhaseTransition auto-advance: useEffect with 2s timer after `showAdvancing` state, cancelled on manual click or unmount
- Destination dedup: Map by `city|state|country` lowercase key, keep entry with higher `importance` from Nominatim
- completedPhases fix: `Math.max(explicit_count, currentPhase - 1)` accounts for skipped non-blocking phases

## Sprint 18 — Completed Tasks (dev-fullstack-2)
- T-S18-001: Fixed z-index/pointer-events on ExpeditionCard
- T-S18-002: Account deletion data cleanup
- T-S18-010: Dashboard cards with phase tools
- T-S18-008: Streaming UI in Phase6Wizard
- T-S18-009: Auto-generation + AI disclaimer + regenerate
- T-S18-011: DashboardPhaseProgressBar

## Sprint 18 Patterns
- Streaming fetch: use ReadableStream reader + TextDecoder, parse SSE lines starting with "data: "
- Auto-trigger: useEffect + useRef guard (hasTriggeredRef) to prevent double-trigger in StrictMode
- Overlay card pattern: z-0 Link + z-10 pointer-events-none wrapper + z-20 pointer-events-auto children
- Phase tools: separate PHASE_TOOLS config in phase-config.ts, PhaseTool interface with status field
- Test pre-existing failure: project-bootstrap.test.ts ".env.local" test fails in worktrees (no .env.local)
