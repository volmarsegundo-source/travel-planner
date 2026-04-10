# Technical Specification: AiGenerationProgress (Shared Component)

**Spec ID**: SPEC-ARCH-AI-PROGRESS
**Related Story**: Staging Round 2 — UX improvement item 5
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-04-09

---

## 1. Overview

`AiGenerationProgress` is a shared, presentational React client component that renders the "generation in progress" UI used during any AI call in the expedition wizard (checklist — Phase 3, destination guide — Phase 5, itinerary — Phase 6). It consolidates three divergent implementations into a single, Atlas Design V2-compliant component with a predictable state machine that guarantees the flow **Generation Screen -> Progress -> Result** never regresses mid-stream.

This component is **UI-only**. It does not own the generation lifecycle, does not call server actions, and does not manage cancellation side-effects beyond invoking the provided `onCancel` callback.

## 2. Scope

### In scope
- Visual progress container (spinner, message, progress bar, skeletons, cancel button)
- Progress phases and i18n-backed message rotation
- Optional determinate progress percentage (streaming flows)
- Accessible live region (`role="status"`, `aria-live="polite"`)
- Cancel button that forwards intent to the parent via `onCancel`
- Visual consistency with Atlas V2 tokens (`atlas-*` Tailwind classes, `AtlasCard`, `AtlasButton`)

### Out of scope
- Network calls / fetch / streaming logic (owned by parent component)
- Timeout/fallback strategy (see SPEC-ARCH-AI-TIMEOUT in Analysis 1)
- Error states post-failure (parent decides; component only emits `onCancel`)
- Persistence of generation state across route changes
- Progress phase *definitions* (stay in `@/lib/ai/progress-phases`, reused as-is)

## 3. File Location & Layout

```
src/components/shared/
  AiGenerationProgress.tsx        # Main component (client)
  AiGenerationProgress.test.tsx   # Unit tests (co-located)
```

Confirmed path: `src/components/shared/AiGenerationProgress.tsx`.
Rationale: existing `src/components/shared/` convention for cross-phase UI (see `ErrorBoundaryCard`, `TripCountdownInline`). Not placed under `features/expedition/` because Phase 3 checklist also uses it and future AI features (e.g. trip report) may too.

## 4. Props (TypeScript Interface)

```ts
export type AiGenerationVariant = "checklist" | "guide" | "itinerary";

export interface AiGenerationProgressProps {
  // ─── Required ───────────────────────────────────────────────────────────
  /** Which AI feature is generating. Drives default title, message namespace, skeleton shape. */
  variant: AiGenerationVariant;

  /** Current progress message (already translated by parent). */
  message: string;

  // ─── Optional ───────────────────────────────────────────────────────────
  /** Determinate progress 0-100. If omitted, bar is indeterminate (animated shimmer). */
  progressPercent?: number;

  /** Optional sub-label (e.g. "3 of 5 days planned"). */
  progressDetail?: string;

  /** Title override. Defaults to `t("<variant>.generating")`. */
  title?: string;

  /** Cancel handler. If omitted, Cancel button is hidden. */
  onCancel?: () => void;

  /** True while the request is active (enables cancel button + spinner). Defaults to true. */
  isStreaming?: boolean;

  /** Test ID prefix. Defaults to `ai-generation-progress`. */
  "data-testid"?: string;

  /** Extra className appended to the outer container. */
  className?: string;
}
```

### Design notes on props
- **`variant` is required** so the component can render the correct skeleton shape (checklist rows vs bento skeleton vs day cards) without the parent passing JSX children.
- **`message` is required and pre-translated**. The component does NOT call `useTranslations` for the rotating message — parents already own the phase/message mapping. This keeps the component locale-agnostic and testable.
- **`progressPercent` optional** so non-streaming flows (guide, checklist) can use the indeterminate bar; streaming (itinerary) passes a real number.
- **`onCancel` optional** so Phase 3 checklist (which cannot be cancelled mid-SDK call) can hide the button cleanly.
- **No `error` prop** — the component does not render error states. The parent switches to a separate error view on failure.

## 5. State Machine (Parent-Owned)

The component itself is stateless. The **parent** must implement this state machine to satisfy the "flow never regresses" guarantee:

```
             onGenerate()
    idle ─────────────────▶ generating ──┬─▶ success (result view)
     ▲                        │          │
     │                        │          └─▶ error   (error view)
     │                        │
     └──── onCancel ──────────┘  (only while generating, only via user action)
```

### Invariants the parent MUST enforce
1. **One-way transition from `generating` to `success`**: once the terminal `[DONE]` marker or successful server action return is received AND the result is parsed/persisted, set state to `success`. Never set back to `idle`.
2. **Do not unmount `AiGenerationProgress` on transient network events**. Mid-stream failures must be handled inside the parent's try/catch and either (a) complete via server-side recovery (see SPEC-ARCH-AI-TIMEOUT) or (b) transition to `error`. Never flip back to `idle`.
3. **`onCancel` is the only user-initiated exit from `generating`**. After calling `onCancel`, the parent must `abort` the fetch/stream, set `state=idle`, and clear any progress timers.
4. **`useRef` guards** (like `hasTriggeredRef`) prevent double-fires from React Strict Mode remounts — keep them in the parent.
5. **Progress-phase timer is owned by the parent**, not the component. The component only displays `message`.

### Why the state machine lives in the parent
Encapsulating the state machine inside `AiGenerationProgress` would require the component to also own fetch/abort/stream logic, which is highly variant-specific (streaming SSE for itinerary, server action for guide, server action for checklist). Keeping the component pure lets each parent retain control of its data-fetching contract while still guaranteeing visual consistency.

## 6. Rendering Contract (Visual)

The component renders a single fragment (no `PhaseShell` wrapping — parent owns shell). Structure:

```
<div role="status" aria-live="polite" aria-label={title}>
  <SpinnerIcon />                    // Atlas spinner, motion-reduce safe
  <Title />                          // Headline, font-atlas-headline
  <Message />                        // Body, font-atlas-body
  <ProgressBar />                    // Determinate if progressPercent provided
  <ProgressDetail />                 // Optional sub-label
  <SkeletonGroup variant={variant}/> // Variant-specific skeleton
  {onCancel && <CancelButton/>}
</div>
```

UX Designer will finalize spacing, skeleton shapes, and copy in a separate UX spec. This architecture spec fixes the *contract*, not the pixels.

## 7. Accessibility

- `role="status"` on outer container (announces changes politely).
- `aria-live="polite"` on message element so screen readers announce new phases without interrupting.
- `aria-label` on container uses `title` prop for initial announcement.
- Spinner marked `aria-hidden="true"` (decorative).
- Progress bar uses `role="progressbar"` + `aria-valuenow` / `aria-valuemin=0` / `aria-valuemax=100` when `progressPercent` is provided. When omitted, no `role="progressbar"` to avoid announcing meaningless values.
- Cancel button must be keyboard-focusable and include a visible label plus `aria-label` for icon-only fallback.
- `motion-reduce:animate-none` on spinner and progress bar to respect `prefers-reduced-motion`.
- Minimum contrast ratio 4.5:1 for text on container background (verified via Atlas tokens).

## 8. Migration Path (Non-Breaking)

Migration is opt-in and incremental. No big-bang refactor.

### Step 1 — create component + tests (1 PR)
- Add `src/components/shared/AiGenerationProgress.tsx` with the full prop API.
- Add unit tests covering: renders title, renders message, renders cancel when `onCancel` provided, hides cancel otherwise, emits `onCancel` on click, respects `progressPercent`, uses correct skeleton per variant.
- Does NOT touch Phase3/5/6 yet.

### Step 2 — migrate Phase 6 first (1 PR)
- Replace the inline `if (isGenerating) { return ... }` block (lines ~1468-1513 of `Phase6ItineraryV2.tsx`) with `<AiGenerationProgress variant="itinerary" ... />` inside the existing `PhaseShell`.
- Keep all existing state (`isGenerating`, `progressMessage`, `progressPercent`, `daysGenerated`) in the parent; pass them as props.
- Update snapshot/unit tests in `Phase6ItineraryV2.test.tsx` — watch for `progress-message-v2` / `progress-bar-v2` test IDs (component accepts `data-testid` prefix to preserve these).

### Step 3 — migrate Phase 5 guide (1 PR)
- Replace the `BentoSkeleton` + "Generating..." block in `DestinationGuideV2.tsx` (lines ~734-760) with `<AiGenerationProgress variant="guide" progressPercent={undefined} ... />`.
- Parent keeps its own progress-message timer (Phase 5 is non-streaming so updates are client-side fake progress).

### Step 4 — migrate Phase 3 checklist (1 PR)
- Replace inline loading UI in `Phase3ChecklistV2` with `<AiGenerationProgress variant="checklist" />`.
- No `onCancel` prop (checklist is non-cancellable once fired).

### Step 5 — delete the 3 legacy inline progress blocks and associated unused styles (cleanup PR).

### Backward compatibility during migration
- The existing `progress-message-v2` and `progress-bar-v2` test IDs MUST be preserved via the `data-testid` prefix prop, so Phase 6 tests keep passing during step 2.
- `PhaseShell` continues to wrap the component in each parent — no layout regression.

## 9. Consistency with Atlas Design V2

Inferred from existing V2 components (`Phase6ItineraryV2`, `DestinationGuideV2`, `LoginFormV2`, `ErrorBoundaryCard`):

- Tokens: `atlas-surface-container-*`, `atlas-on-surface`, `atlas-on-surface-variant`, `atlas-secondary-container`, `atlas-tertiary-fixed-dim`.
- Fonts: `font-atlas-headline` (titles), `font-atlas-body` (body).
- Shadows/radius: follow `AtlasCard` defaults (`rounded-xl`, Atlas shadow tokens).
- Spinner: reuse Phase 6's `border-atlas-secondary-container` spinner pattern.
- Skeletons: reuse `AtlasCard loading` (already used in Phase 6) and `SkeletonPulse` helper (used in DestinationGuideV2).
- Cancel: `AtlasButton variant="secondary"` with `XIcon` leftIcon — matches Phase 6 pattern.

UX Designer must confirm any deviation from these tokens in their UX spec.

## 10. Testing Strategy

### Unit tests (Vitest + RTL, coverage target >=90%)
- Renders title from prop; falls back to variant default when omitted.
- Renders translated message as passed.
- Renders determinate progress bar when `progressPercent` provided; has `role="progressbar"` + correct ARIA values.
- Renders indeterminate bar (no `role="progressbar"`) when omitted.
- Renders cancel button only when `onCancel` provided; calls handler on click.
- Respects `data-testid` prefix for all testable children.
- Renders correct skeleton group for each `variant`.
- Container has `role="status"` and `aria-live="polite"`.
- `motion-reduce:animate-none` class present on spinner.

### Integration tests (parent-level, no re-implementation)
- Phase 6: existing E2E "streaming happy path" must pass without regression after migration.
- Phase 6: simulated stream error -> mid-stream recovery still transitions to result view (validates state-machine invariant #2).
- Phase 5: cached guide load does NOT show progress component (only first-time generation does).

### No new E2E needed
The existing Playwright flows already cover the three parents. Migration should only change markup, not behavior.

## 11. Performance

- Component is small (<200 lines), no heavy deps.
- No effects, no timers, no fetch -> zero runtime cost beyond render.
- Skeletons are static divs (no SVG animation beyond CSS pulse).
- Does not trigger re-renders on its own; reflects parent props.

## 12. Security

UI-only component, no security surface. Caveats for parents:
- Parent must sanitize any dynamic `message` before passing in (already done via i18n — messages come from translation catalogs, not user input).
- Do NOT pass user input (e.g., destination name from a form) into `title` or `message` without sanitization — XSS risk.

## 13. SDD 9-Dimension Coverage Matrix

| # | Dimension | Coverage | Section |
|---|---|---|---|
| 1 | Purpose / problem statement | Yes | 1 |
| 2 | Scope (in/out) | Yes | 2 |
| 3 | UX / visual | Deferred to UX Designer | 6 |
| 4 | API / interface contract | Yes | 4, 5 |
| 5 | State management | Yes | 5 |
| 6 | Accessibility | Yes | 7 |
| 7 | Testing | Yes | 10 |
| 8 | Performance | Yes (minimal surface) | 11 |
| 9 | Security | Yes (UI-only, noted) | 12 |

Dimensions N/A for a pure UI component: data model, external integrations, DB migrations, rate limiting. Explicitly omitted.

## 14. Open Questions

- [ ] OQ-1: UX Designer — final skeleton shapes per variant and exact copy for default titles.
- [ ] OQ-2: UX Designer — should the cancel button show a confirmation dialog for itinerary (long generation) but not for guide (short)? Recommendation: keep simple and skip confirmation, rely on undo via re-generation.
- [ ] OQ-3: Should we expose an `estimatedDuration` prop so the component can auto-calculate fake progress for non-streaming variants? Architect recommends NO — keeps component pure, parent owns timer.

## 15. Definition of Done

- [ ] Component file created at `src/components/shared/AiGenerationProgress.tsx`.
- [ ] Props match this spec exactly.
- [ ] Unit test file with >=90% coverage.
- [ ] Atlas V2 tokens only — no hardcoded colors.
- [ ] Phase 6 migrated and its existing tests pass unchanged.
- [ ] Phase 5 and Phase 3 migrated in follow-up PRs.
- [ ] Three legacy inline progress blocks deleted.
- [ ] No regression in E2E "generate itinerary" and "generate guide" flows.
- [ ] UX Designer has signed off on visual spec.

> WARNING: Blocked on OQ-1 (UX Designer sign-off on skeleton shapes and copy).
