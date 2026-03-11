# SPEC-AI-XXX: [Feature Name] -- AI Specification Addendum

**Version**: 1.0.0
**Status**: Draft | In Review | Approved | Implemented | Deprecated
**Author**: prompt-engineer
**Reviewers**: [architect, security-specialist, finops-engineer]
**Architecture Spec**: SPEC-ARCH-XXX
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD

---

## 1. Model Selection

- **Recommended Model**: [e.g., Claude Sonnet 4 / Haiku 4.5]
- **Rationale**: [Cost vs quality trade-off -- why this model fits the feature requirements]
- **Fallback Model**: [Model to use if primary is unavailable or rate-limited]
- **Fallback Behavior**: [Degrade gracefully / queue for retry / return cached response]

## 2. Prompt Design

- **System Prompt Template**: [Reference to `src/lib/prompts/xxx.ts`, version]
- **User Input Format**: [How user input is structured before being sent to the model]
- **Output Format**: [Expected response structure -- JSON schema, markdown, plain text]
- **Temperature**: [Recommended value with justification]
- **Max Tokens**: [Output token limit -- fixed or dynamic formula]
- **Prompt Caching**: [Whether `cache_control` is used on system prompt]

### Prompt Template Details

```
System: [Brief description of system prompt purpose]
User: [Template showing how user input is interpolated]
```

> Reference the full template in `src/lib/prompts/` -- do not duplicate prompt text here.

## 3. Token Budget

| Component | Estimated Tokens | Cost per Request (USD) |
|-----------|-----------------|----------------------|
| System prompt | X | $X.XXXX |
| User input (avg) | X | $X.XXXX |
| User input (max) | X | $X.XXXX |
| Output (avg) | X | $X.XXXX |
| Output (max) | X | $X.XXXX |
| **Total (avg)** | **X** | **$X.XXXX** |
| **Total (max)** | **X** | **$X.XXXX** |

### Monthly Projection

| Scenario | Requests/Month | Monthly Cost (USD) |
|----------|---------------|-------------------|
| Low usage | X | $X.XX |
| Expected usage | X | $X.XX |
| High usage | X | $X.XX |

> Projections validated with finops-engineer against COST-LOG.md actuals.

## 4. Guardrails (MANDATORY)

### Input Guardrails
- [ ] Prompt injection detection (`sanitizeForPrompt` from `src/lib/prompts/injection-guard.ts`)
- [ ] PII masking (`maskPII`) applied to user-provided text fields
- [ ] Input length limits enforced (specify max characters per field)
- [ ] Zod schema validation on all inputs before prompt construction

### Output Guardrails
- [ ] Response validated against expected Zod schema
- [ ] Content safety filtering (specify strategy)
- [ ] Hallucination mitigation strategy (specify: grounding, fact-checking, confidence scores)
- [ ] Structured output parsing with fallback for malformed responses

### Systemic Guardrails
- [ ] Rate limiting per user (specify: X requests per Y time window)
- [ ] Cost cap per session/day (specify threshold and enforcement action)
- [ ] Fallback behavior for API unavailability (cached response / graceful error / retry queue)
- [ ] Circuit breaker pattern for repeated API failures
- [ ] Token usage logged for finops monitoring (`logTokenUsage` in ai.service.ts)

> Guardrail definitions co-owned by prompt-engineer and security-specialist.
> Any modification requires approval from both agents.

## 5. Vendor Independence

- [ ] AI provider interface used (`AiProvider` from `src/server/services/ai-provider.interface.ts`)
- [ ] No direct SDK calls -- all interactions go through `ai.service.ts`
- [ ] Prompt templates use standard system/user message format (no vendor-specific features)
- [ ] No reliance on vendor-specific response metadata for business logic
- [ ] Fallback model can be from a different provider without prompt changes

### Abstraction Verification

| Concern | Implementation | Vendor-Locked? |
|---------|---------------|----------------|
| API calls | `ai.service.ts` via `AiProvider` | No |
| Prompt templates | `src/lib/prompts/*.ts` | No |
| Token counting | [Specify approach] | [Yes/No] |
| Streaming | [Specify approach] | [Yes/No] |

## 6. Testing Requirements

### Unit Tests
- [ ] Prompt template produces expected output format with sample inputs
- [ ] Token budget calculation is correct (dynamic formulas if applicable)
- [ ] Input guardrails block known injection patterns
- [ ] Output parsing handles malformed responses gracefully
- [ ] Fallback model selection works when primary is unavailable

### Integration Tests
- [ ] End-to-end flow through `ai.service.ts` with mocked provider
- [ ] Rate limiting enforced correctly for this feature
- [ ] Cache behavior (hit/miss/expiry) works as expected
- [ ] Token usage logging produces correct entries

### Guardrail Tests
- [ ] Injection detection blocks at least: prompt override, role hijacking, data exfiltration
- [ ] PII masking removes: email, phone, passport numbers, credit card numbers
- [ ] Output schema validation rejects responses missing required fields
- [ ] Cost cap enforcement triggers at threshold

### Performance Tests
- [ ] Response latency within target (specify: Xms p50, Xms p95)
- [ ] Token usage within budget (avg and max)
- [ ] Concurrent request handling (specify: X simultaneous users)

## 7. Observability

- **Metrics to track**:
  - Token usage per request (input/output breakdown)
  - Response latency (p50, p95, p99)
  - Cache hit rate
  - Error rate by type (API error, parsing error, guardrail block)
  - Cost per request (logged via finops integration)

- **Alerts**:
  - Token usage exceeds budget by >20%
  - Error rate exceeds X% over Y minutes
  - API latency exceeds Xms p95

## 8. Open Questions

- [ ] [Any unresolved decisions about model, prompt design, or guardrails]

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | YYYY-MM-DD | prompt-engineer | Initial draft |
