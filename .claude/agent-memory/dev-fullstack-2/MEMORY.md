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

## Sprint 18 — Completed Tasks (dev-fullstack-2)
- T-S18-001: Fixed z-index/pointer-events on ExpeditionCard (pointer-events-none on content wrapper, pointer-events-auto on interactive children)
- T-S18-002: Account deletion data cleanup — added UserProfile, UserBadge, PointTransaction, UserProgress, ExpeditionPhase, PhaseChecklistItem, ItineraryPlan, DestinationGuide cleanup in transaction
- T-S18-010: Dashboard cards with phase tools — PHASE_TOOLS config, PhaseToolsBar component, "Em construcao" for phases 4/7/8
- T-S18-008: Streaming UI in Phase6Wizard — replaced server action with fetch to /api/ai/plan/stream (SSE), cancel button, HTTP error mapping
- T-S18-009: Auto-generation + AI disclaimer + regenerate with confirm dialog
- T-S18-011: DashboardPhaseProgressBar — 8 segments with completed/current/future/coming-soon states

## Sprint 18 Patterns
- Streaming fetch: use ReadableStream reader + TextDecoder, parse SSE lines starting with "data: "
- Auto-trigger: useEffect + useRef guard (hasTriggeredRef) to prevent double-trigger in StrictMode
- Overlay card pattern: z-0 Link + z-10 pointer-events-none wrapper + z-20 pointer-events-auto children
- Phase tools: separate PHASE_TOOLS config in phase-config.ts, PhaseTool interface with status field
- Test pre-existing failure: project-bootstrap.test.ts ".env.local" test fails in worktrees (no .env.local)
