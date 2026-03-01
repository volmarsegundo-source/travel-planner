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
