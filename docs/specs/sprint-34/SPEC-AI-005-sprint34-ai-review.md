# SPEC-AI-005: Sprint 34 AI Impact Review

**Version**: 1.0.0
**Status**: Draft
**Author**: prompt-engineer
**Reviewers**: tech-lead, finops-engineer
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Scope

Review of Sprint 34 features for AI prompt impact, specifically the "Ainda nao decidi" checkbox in Phase 4 and its downstream effect on Phase 5 (guide generation) and Phase 6 (itinerary generation).

## 2. Impact Analysis

### "Ainda nao decidi" — Empty Logistics Context

When a user marks one or more Phase 4 steps as "Ainda nao decidi", the AI prompt for Phase 5/6 will receive incomplete or empty logistics data. The prompt must handle this gracefully.

**Current behavior**: The Phase 6 prompt enrichment (SPEC-ARCH-021) collects transport segments, accommodations, and mobility data. If these are empty, the prompt receives empty arrays.

**Required behavior**: When `undecidedSteps` flags are present in Phase 4 metadata, the enrichment layer should inject a human-readable note:

```
## Logistics (Phase 4)
- Transport: Not yet decided by the traveler
- Accommodation: Not yet decided by the traveler
- Local Mobility: Walking, Public Transit (selected)
```

This avoids the AI hallucinating logistics details and clearly signals that the traveler hasn't made these decisions yet.

### Prompt Change Required

In the `buildEnrichedContext` function (from SPEC-ARCH-021), add a conditional check:

```typescript
if (phase4Data.undecidedSteps?.transport) {
  context.logistics.transport = "Not yet decided by the traveler";
} else {
  context.logistics.transport = formatTransportSegments(segments);
}
```

Same pattern for accommodation and mobility.

## 3. Cost Impact

**Zero incremental cost**. The "not yet decided" strings are shorter than actual logistics data, so token count may actually decrease slightly for undecided trips. No new API calls. No model changes.

## 4. Guardrails

No new guardrails needed. Existing output guardrails (from SPEC-AI-004) already handle missing context gracefully. The AI is instructed to work with available data and flag what's missing.

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
