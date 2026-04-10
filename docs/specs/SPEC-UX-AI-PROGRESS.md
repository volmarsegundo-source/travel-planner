# SPEC-UX-AI-PROGRESS: Shared AI Generation Progress Component — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect, prompt-engineer
**Related Specs**: SPEC-ARCH-AI-PROGRESS (in parallel)
**Created**: 2026-04-09
**Last Updated**: 2026-04-09

---

## 1. Traveler Goal

I'm waiting for AI to generate something important for my trip (checklist, guide, or itinerary). I want to trust that it's working, know roughly how long it will take, understand what to do if it fails, and have a way out without losing my place.

## 2. Scope

This spec defines a **shared, phase-agnostic** progress component (`AiGenerationProgress`) to replace three inconsistent per-phase implementations:

| Phase | Feature | Mode | Current state |
|---|---|---|---|
| Phase 3 | Checklist | non-streaming (rules-based, ms) | Near-instant; shows a brief loading state only |
| Phase 5 | Destination Guide | non-streaming (single response, 8-30s) | Skeleton bento grid + hint text |
| Phase 6 | Itinerary | **streaming** (SSE, 20-90s, day-by-day) | Spinner + progress bar + skeleton cards + day counter |

## 3. Personas Affected

| Persona | How this serves them |
|---|---|
| `@leisure-solo` | Builds confidence during the long wait in Phase 6; reassures that the AI is working |
| `@leisure-family` | Keeps them engaged with a "what's happening now" message instead of a blank wait |
| `@business-traveler` | Time-pressured — needs to know ETA and be able to cancel quickly without losing work |
| `@bleisure` | Generating guide/itinerary often on mobile with flaky connection — needs clear error recovery |

## 4. The Current Problem (why this spec exists)

- **Inconsistent visuals**: Phase 3, 5, and 6 each style loading differently. No shared vocabulary of "AI is working".
- **State regressions**: Phase 5 has had bugs where after generation, the UI briefly returns to the pre-generation screen before showing the result. This is an anti-pattern: progress must transition **directly** to the result, never back to the entry state.
- **Cancel/error friction**: On error, the UI often returns silently to the entry state with no retry affordance and no explanation of what went wrong. Users report confusion: "Did I click the wrong thing?"
- **No reassurance at long waits**: Phase 6 can take 60+ seconds. The current spinner gives no sense that work is still progressing beyond the 30s "almostDone" message.

## 5. User Flow

### Happy Path (non-streaming — Phase 3/5)

```
[Entry screen with "Generate" CTA]
        |
        | user clicks Generate (or confirms PA spend)
        v
[AiGenerationProgress — state: generating]
        |  - spinner + contextual message
        |  - indeterminate progress bar
        |  - skeleton preview of result
        |  - cancel button
        |
        | response received (success)
        v
[AiGenerationProgress — state: success, 150ms]
        |  - checkmark flash
        |
        | direct transition, NO detour
        v
[Result screen — e.g., rendered guide]
```

### Happy Path (streaming — Phase 6)

```
[Entry screen]
        |
        v
[AiGenerationProgress — state: streaming]
        |  - spinner + contextual message (rotates every 5/15/30s)
        |  - determinate progress bar (daysGenerated / totalDays, capped at 95%)
        |  - "Dia 3 de 7 pronto" counter
        |  - cancel button
        |
        | [DONE] received, fresh data fetched
        v
[AiGenerationProgress — state: success, 150ms]
        |
        v
[Result screen — rendered itinerary]
```

### Error Path

```
[AiGenerationProgress — state: generating/streaming]
        |
        | API fails / timeout / stream error
        v
[AiGenerationProgress — state: error]
        |  - error icon + tone-appropriate message
        |  - "Tentar novamente" (primary) + "Voltar" (secondary)
        |  - stays on the progress screen; does NOT auto-return
        |
        | user clicks "Tentar novamente"
        v
[state: generating] (new attempt, PA not re-spent)
```

### Cancel Path

```
[AiGenerationProgress — state: generating/streaming]
        |
        | user clicks "Cancelar"
        v
[Confirmation dialog]
   "Cancelar a geração? O progresso será descartado."
   [Voltar para geração] | [Sim, cancelar]
        |
        | user confirms
        v
[AiGenerationProgress — state: cancelled, 200ms]
        |  - "Geração cancelada"
        |
        | automatic transition
        v
[Entry screen] (ready to re-generate; PA is refunded per architect spec)
```

## 6. States (visual definition)

The component MUST expose exactly these six visual states. Any production bug where the UI shows a state not in this list is a P0.

| State | Purpose | Visual |
|---|---|---|
| `idle` | Component mounted but inactive | Not rendered — parent shows entry screen |
| `generating` | Non-streaming request in flight | Spinner + indeterminate bar + skeleton + contextual message + cancel |
| `streaming` | Streaming active, receiving chunks | Spinner + **determinate** bar + day counter + contextual message + cancel |
| `success` | Generation complete, about to hand off | Checkmark icon + success message, visible for ~150ms then transitions |
| `error` | Generation failed | Error icon + message + retry CTA + back CTA |
| `cancelled` | User aborted | Neutral icon + "Cancelled" message, visible for ~200ms then returns to entry |

### State transition rules (HARD RULES)

1. `generating` / `streaming` → `success` → **result screen** (never back to entry).
2. `generating` / `streaming` → `error` stays on the progress screen. User must act.
3. `success` state MUST NOT show the entry CTA. If the parent unmounts the progress component before data is ready, there will be a flash of the entry screen — this is the Phase 5 bug. **Fix**: the parent must fetch fresh data BEFORE transitioning out of `success` (Phase 6 already does this via `getItineraryDaysAction`). The progress component stays mounted until data is ready.
4. `error` → `generating` is allowed via retry button. Error message clears on retry.
5. `cancelled` → `idle` (entry screen) is the only exit from cancelled.
6. There is NO `generating` → `idle` path. Going back to entry requires user-initiated cancel with confirmation.

## 7. Visual Specification

### Layout (all states)

Centered column, max-width 448px (`max-w-md`), vertical spacing 24px between blocks.

```
+----------------------------------+
|         [icon or spinner]        |   64x64
|                                  |
|     Gerando seu guia...          |   headline 18px bold
|     Analisando o destino         |   body 14px muted
|                                  |
|  [============----] 45%          |   progress bar (streaming only)
|  3 de 7 dias prontos             |   counter (streaming only)
|                                  |
|  [skeleton preview cards]        |   optional, phase-dependent
|                                  |
|         [Cancelar]               |   secondary button
+----------------------------------+
```

### State: `generating` (non-streaming — Phase 3/5)

- **Top**: 64px spinning ring (`atlas-secondary-container` on `atlas-secondary-container/30`). `motion-reduce:animate-none` — falls back to a static ring with a centered sparkle icon.
- **Headline**: Contextual phase message (see §8).
- **Sub-message**: Rotates based on elapsed time (see §9).
- **Progress bar**: **Indeterminate** — shimmer/pulse animation sliding left-to-right. Under `prefers-reduced-motion`, show a static bar at 50% fill with `aria-busy="true"`.
- **Skeleton preview**: Phase 5 renders a miniature 3-card skeleton hint of the upcoming bento grid; Phase 3 skips this (result is nearly instant).
- **Cancel button**: secondary variant, bottom of stack.

### State: `streaming` (Phase 6)

Same layout as `generating`, with these differences:

- **Progress bar**: **Determinate**. Value = `daysGenerated / totalDays * 100`, **capped at 95%** (the last 5% is reserved for finalization/persist). The bar animates width changes with `transition-all duration-500 ease-out`. Minimum visible fill is 5% so the bar is never empty.
- **Day counter**: Below the bar — `Dia {n} de {total} pronto` (PT) / `Day {n} of {total} ready` (EN). Only visible once `daysGenerated > 0`.
- **Skeleton preview**: 3 skeleton itinerary cards below the counter (current Phase 6 pattern preserved).

### State: `success`

- **Icon**: 64px checkmark circle in `atlas-success`.
- **Headline**: "Pronto!" / "Done!"
- **No CTA** — the parent takes over within ~150ms.
- If `prefers-reduced-motion`, no fade; instant swap.

### State: `error`

- **Icon**: 64px circle with alert icon, `atlas-error` color.
- **Headline**: "Algo deu errado" / "Something went wrong".
- **Sub-message**: Specific error text (mapped from API response — see existing `mapStatusToErrorKey` in Phase6). Tone: explain what happened without blaming the user. Example: "A IA demorou mais que o esperado. Isso acontece às vezes. Podemos tentar de novo?"
- **CTAs**: Primary "Tentar novamente" + secondary "Voltar". Primary is focused on state entry.

### State: `cancelled`

- **Icon**: 64px neutral circle with X, muted gray.
- **Headline**: "Geração cancelada" / "Generation cancelled".
- **No CTA** — auto-returns to entry after ~200ms.

## 8. Contextual Messages (per phase, PT-BR / EN)

Each phase passes a `phase: 3 | 5 | 6` prop which selects the message pack. Messages come from `messages/pt-BR.json` and `messages/en.json` under `ai.progress.{phase3|phase5|phase6}`.

### Headlines (persistent during generation)

| Phase | PT-BR | EN |
|---|---|---|
| Phase 3 | Preparando seu checklist... | Preparing your checklist... |
| Phase 5 | Gerando seu guia de destino... | Generating your destination guide... |
| Phase 6 | Criando seu roteiro personalizado... | Creating your personalized itinerary... |

### Sub-messages (rotate by elapsed time — progressive reassurance)

Reuse the existing `getProgressPhase()` buckets (0-5s analyzing, 5-15s planning, 15-30s optimizing, 30s+ almostDone), extended with two new buckets for very long waits.

| Elapsed | Bucket | PT-BR | EN |
|---|---|---|---|
| 0-5s | analyzing | Analisando seu destino | Analyzing your destination |
| 5-15s | planning | Montando as recomendações | Putting recommendations together |
| 15-30s | optimizing | Refinando os detalhes | Refining the details |
| 30-60s | almostDone | Quase pronto... | Almost there... |
| 60-90s | stillWorking *(new)* | Ainda trabalhando — bons roteiros levam tempo | Still working — great trips take time |
| 90s+ | patienceBear *(new)* | Obrigado pela paciência, estamos finalizando | Thanks for your patience, we're finalizing |

**Rationale for new buckets**: Phase 6 regularly exceeds 60s for 10+ day trips. Without a message update, the user assumes the app is frozen.

## 9. Cancel Interaction (detailed)

- **Button**: Always visible during `generating` / `streaming`. Text: "Cancelar" / "Cancel". Secondary variant. 44x44px touch target.
- **Click behavior**: Shows a confirmation dialog (modal, focus-trapped).
- **Dialog copy**:
  - Title: "Cancelar geração?" / "Cancel generation?"
  - Body: "Você perderá o progresso. Os Pontos Atlas não serão cobrados." / "You'll lose the progress. Atlas Points won't be charged."
  - Primary action: "Sim, cancelar" / "Yes, cancel"
  - Secondary action (default focus): "Voltar para geração" / "Back to generation"
- **On confirm**: Calls `abortController.abort()`, enters `cancelled` state, triggers PA refund (architect spec), and returns to entry screen.
- **On escape**: Closes dialog without cancelling.

**Note**: The existing Phase 6 implementation does NOT show a confirmation dialog — it cancels immediately. This is an improvement justified by user feedback that accidental cancels waste 30s of work. Architect can evaluate if PA refund is needed or if the flow is cheap enough to skip confirmation. If skipping confirmation is chosen, the cancel button must use the `DangerButton` variant with a longer press-to-confirm pattern.

## 10. Transitions (motion)

| From → To | Motion | Duration | Reduced-motion |
|---|---|---|---|
| entry → generating | Fade out entry, fade in progress | 200ms ease-out | Instant swap |
| generating → streaming | No transition (same component, just progress changes) | — | — |
| streaming → success | Morph spinner into checkmark (scale + color) | 150ms | Instant icon swap |
| success → result | Fade out progress, fade in result | 200ms ease-out | Instant swap |
| any → error | Cross-fade to error icon + slide in error message | 200ms ease-out | Instant swap |
| cancelled → entry | Fade out progress | 200ms ease-out | Instant swap |

All transitions MUST respect `prefers-reduced-motion: reduce` — fall back to instant state swaps.

## 11. Accessibility Requirements (MANDATORY)

- **`aria-live="polite"` + `role="status"`** on the progress container (present in current Phase 6, keep).
- **Message announcements**: The sub-message text change (every 5/15/30/60/90s) must be announced. Wrap the sub-message in a `<p>` inside the live region. Do NOT use `aria-live="assertive"` — it would interrupt screen readers reading the headline.
- **Progress bar**:
  - Streaming: `role="progressbar"` with `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`.
  - Non-streaming (indeterminate): omit `aria-valuenow` and set `aria-busy="true"`.
- **Cancel button**: Keyboard focusable, Enter/Space activates, 44x44px touch target.
- **Focus management**:
  - On state entry (`generating`/`streaming`): Focus moves to the cancel button (allows immediate keyboard abort).
  - On `success` → result: Focus moves to the result screen's main heading (`<h1>`). The parent result screen is responsible for this.
  - On `error`: Focus moves to the retry button.
- **Dialog**: Cancel confirmation dialog uses `role="dialog"`, `aria-modal="true"`, focus trap, Escape closes, focus returns to Cancel button on close.
- **Color contrast**:
  - Spinner ring on background: ≥ 3:1.
  - Message text on background: ≥ 4.5:1.
  - Success/error icons: ≥ 3:1 against their background.
- **Reduced motion**: Spinner becomes static ring + sparkle icon; progress bar stops shimmer; state transitions become instant swaps. Test by setting `prefers-reduced-motion: reduce` in DevTools.

## 12. Responsive Behavior

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Full-width column, 24px horizontal padding, `max-w-md` not enforced. Cancel button becomes full-width. |
| Tablet (768-1024px) | Centered column, `max-w-md` (448px). |
| Desktop (> 1024px) | Same as tablet. Component does not grow to fill wide screens — the empty space around the progress reinforces "we're focused on this". |

## 13. Error Messages (PT-BR / EN)

Reuse existing error keys where they exist (Phase 6 has `errorGenerate`, `errorTimeout`, `errorRateLimit`, `errorKillSwitch`, `errorCostBudget`, `errorAgeRestricted`, `errorAuth`, `errorPersistFailed`). The shared component accepts an `errorKey` prop and looks up from the shared namespace.

| Scenario | PT-BR | EN |
|---|---|---|
| timeout | A geração demorou mais que o esperado. Vamos tentar de novo? | Generation took longer than expected. Want to try again? |
| rate_limit | Você gerou muito em pouco tempo. Espere alguns minutos e tente novamente. | You've generated too much too fast. Wait a few minutes and try again. |
| kill_switch | A geração por IA está temporariamente pausada por segurança. Tente de novo em alguns minutos. | AI generation is temporarily paused for safety. Try again in a few minutes. |
| cost_budget | Atingimos o limite diário de IA. Tente novamente amanhã. | We hit today's AI limit. Please try again tomorrow. |
| generic | Algo deu errado do nosso lado. Tentar novamente geralmente resolve. | Something went wrong on our side. Trying again usually fixes it. |
| network | Parece que você está offline. Reconecte e tente de novo. | Looks like you're offline. Reconnect and try again. |

**Tone of voice**: empathetic, never blame the user, always offer a path forward, short sentences.

## 14. i18n Keys to Add

Add under a **new shared namespace** `ai.progress` in both `messages/pt-BR.json` and `messages/en.json`:

```
ai.progress.headline.phase3
ai.progress.headline.phase5
ai.progress.headline.phase6
ai.progress.submessage.analyzing
ai.progress.submessage.planning
ai.progress.submessage.optimizing
ai.progress.submessage.almostDone
ai.progress.submessage.stillWorking      (NEW)
ai.progress.submessage.patienceBear      (NEW)
ai.progress.counter.daysReady            (ICU: "{n, plural, =1 {1 dia pronto} other {# dias prontos}}")
ai.progress.counter.daysReadyOf          ("Dia {n} de {total} pronto")
ai.progress.state.success
ai.progress.state.cancelled
ai.progress.state.errorHeadline
ai.progress.cancel.button
ai.progress.cancel.dialog.title
ai.progress.cancel.dialog.body
ai.progress.cancel.dialog.confirm
ai.progress.cancel.dialog.cancel
ai.progress.error.retry
ai.progress.error.back
ai.progress.error.timeout
ai.progress.error.rateLimit
ai.progress.error.killSwitch
ai.progress.error.costBudget
ai.progress.error.generic
ai.progress.error.network
```

**Migration note**: Phase 6 currently has its own `progressAnalyzing`/`progressPlanning`/`progressOptimizing`/`progressAlmostDone` keys under `expedition.phase6`. These should be **deprecated** (not deleted — keep for one sprint as fallback) and the new shared keys adopted. Same for Phase 5 error keys.

## 15. Conflicts With Current Implementation (tech-lead: please review)

1. **Phase 6 has no cancel confirmation** — current code calls `abortControllerRef.current?.abort()` immediately on click. This spec introduces a confirmation dialog. Architect decision needed on whether to also add PA refund logic.
2. **Phase 5 "flash back to entry" bug** — this spec enforces that the progress component stays mounted until fresh data is ready. Phase 6 already does this correctly (`getItineraryDaysAction` before `setIsGenerating(false)`). Phase 5 should adopt the same pattern.
3. **Phase 3 loading state is too thin** — current Phase 3 likely shows only a brief spinner or nothing at all because the operation is DB-bound, not AI-bound. **Open question**: does Phase 3 actually invoke AI? If it's purely rules-based, it may not need this component at all. If there's a lightweight AI call (e.g., custom item suggestions), it should use the component with `phase={3}`.
4. **Sub-message buckets extended from 4 to 6** — new `stillWorking` (60s) and `patienceBear` (90s) buckets. Requires updating `stream-progress.ts` util or deprecating it in favor of the shared component's internal timer.
5. **i18n namespace relocation** — moves progress messages from `expedition.phase6` to a shared `ai.progress` namespace. Requires coordinated refactor of Phase6ItineraryV2 + i18n sync check (`npm run i18n:check`).

## 16. What This Spec Does NOT Define

This spec defines **experience and visuals**. The parallel SPEC-ARCH-AI-PROGRESS (by architect) defines:
- Component props and TypeScript types
- State machine implementation
- Integration with existing API routes and server actions
- AbortController lifecycle and cleanup
- PA refund mechanism
- Telemetry events

If there are conflicts between this spec and SPEC-ARCH, **this spec wins for visuals, copy, and user flow**; the architect spec wins for integration/props/typing.

## 17. Prototype

- [x] Prototype recommended: **Yes** (optional for this round)
- **Location**: `docs/ux-prototypes/ai-generation-progress.html`
- **Scope**: All 6 states + cancel confirmation dialog + phase selector to demo Phase 3/5/6 messages
- **Status**: Not yet produced — can be generated in a follow-up if PO wants visual validation

## 18. Open Questions

- [ ] **PO**: Should cancel refund PA? (Current Phase 6 does not spend PA on cancel because the PA is spent before generation starts; on cancel, PA is already deducted. This spec assumes refund-on-cancel.)
- [ ] **Tech-lead**: Does Phase 3 actually invoke AI, or is the checklist purely rules-based? If rules-based, Phase 3 is out of scope.
- [ ] **Prompt-engineer**: Are 60s+ timeouts actually hit in Phase 6 P95? If not, `stillWorking` and `patienceBear` buckets may be over-engineering.
- [ ] **Architect**: Should the component be called via parent-controlled state (`<AiGenerationProgress state={...} />`) or self-contained with a mutation hook (`<AiGenerationProgress onGenerate={...} />`)? UX is neutral on this; integration concern.
- [ ] **PO**: Confirm the "stay on screen with retry" behavior on error is acceptable vs. the current "return to entry" behavior. This spec argues the new behavior is clearer; PO should validate with at least 2 users.

---

> **Spec Status**: Draft
> **Ready for**: Architect (parallel SPEC-ARCH-AI-PROGRESS) and PO review for open questions

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-04-09 | ux-designer | Initial draft — shared progress component for Phase 3/5/6 AI generation |
