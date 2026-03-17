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

## Sprint 30 — Completed Tasks (dev-fullstack-2)
- Dashboard rewrite: ExpeditionsDashboard (filter/sort), ExpeditionCardRedesigned (status accents), ExpeditionCardSkeleton
- ExpeditionDTO type + deriveExpeditionStatus utility in src/types/expedition.types.ts
- expedition-filters.ts: filterExpeditions, sortExpeditions, filterAndSortExpeditions (pure functions)
- Bug 1 fix: Phase 5 re-advance — skip completePhase5Action when revisiting already-completed phase
- Bug 6 fix: Schengen displays as "International" in UI badges (data stays "schengen" in classifier)
- Bug 10 fix: revalidatePath("/") added to advanceFromPhaseAction + completeExpeditionAction + completePhase5Action
- Bug 11 fix: Dates mandatory in Phase1Wizard handleStep3Next (unless flexibleDates checked)
- 73 new tests: 19 filter, 28 dashboard, 22 card, 4 skeleton

## Sprint 30 Patterns
- ExpeditionDTO: plain serializable object (no Date objects), createdAt + status added to page.tsx mapping
- Status derivation: completed > overdue (startDate < today) > active (phase > 1) > planned
- Filter chips: role="radiogroup", 3 options (all/active/completed), client-side with useState
- Sort: newest (createdAt desc), departure (startDate asc, nulls last), destination (A-Z)
- Card: Link as root element, 4px left border accent, status badge, contextual CTA
- Grid: CSS grid-cols-1 md:grid-cols-2 lg:grid-cols-3, max-w-6xl
- Mobile FAB: fixed bottom-right, md:hidden, 56x56px rounded-full

## Sprint 26 — Completed Tasks (dev-fullstack-2)
- [sprint-26.md](sprint-26.md) for full details

## Sprint 20 — Completed Tasks (dev-fullstack-2)
- [sprint-20.md](sprint-20.md) for full details

## Sprint 19 — Completed Tasks (dev-fullstack-2)
- [sprint-19.md](sprint-19.md) for full details

## Sprint 18 — Completed Tasks (dev-fullstack-2)
- [sprint-18.md](sprint-18.md) for full details
