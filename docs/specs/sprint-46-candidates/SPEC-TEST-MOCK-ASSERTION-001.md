# SPEC-TEST-MOCK-ASSERTION-001: Prevent Spec Drift via Mock Behaviour Assertions

**Version**: 0.1.0
**Status**: Draft (candidate for Sprint 46)
**Author**: architect (candidate — to be re-assigned to qa-engineer in sprint planning)
**Reviewers**: [tech-lead, qa-engineer]
**Priority**: P1
**Estimated Effort**: 4–8h
**Created**: 2026-04-21
**Last Updated**: 2026-04-21
**Trigger**: BUG-C (SPEC-SEC-CSP-NONCE-001) — the CSP nonce was generated in middleware and "tested" by checking the header existed on the response. No test asserted what the nonce actually *did*: propagate to Server Components and unblock inline scripts. The unit tests passed for 3 years while the feature was broken in production.

---

## 1. Overview

When a unit test mocks a dependency, the assertion must verify **what the production code expects the dependency to do**, not merely "was called". Today, many tests assert `expect(mock).toHaveBeenCalled()` or `expect(mock).toHaveBeenCalledWith(x)` without verifying that `x` actually satisfies the downstream contract. That lets the spec drift silently when the contract changes.

This SPEC introduces a review rule and a small set of lint/static-analysis checks to make "mock-only" assertions visible and redirectable.

## 2. Problem Examples (from the repo)

1. **Middleware CSP (CSP-NONCE-001)** — `middleware.test.ts` asserted the `Content-Security-Policy` header was set with a nonce-looking string. It did not assert the nonce was propagated to the downstream request or that Next.js would consume it. The contract ("React hydration works") was never modelled.

2. **completeProfileAction (Scenario 2)** — the test asserted `mockUpdateSession` was called with `{ user: { profileComplete: true } }`, but did not assert that the auth.config's `session` callback would *read* that key. A rename on either side would pass both sides' tests individually.

3. **Rate limit calls** — tests assert `mockCheckRateLimit` was called with a key and window, not that the key format collides with nothing else and the window is a real configuration value.

## 3. Proposal

### 3.1 Three-tier assertion rule (documentation + review checklist)

For every mock, the test must express at least one of:

- **Tier 1 (weakest)**: "was called with shape X" — current norm; acceptable for pure I/O boundaries where shape = contract
- **Tier 2 (baseline)**: "was called with shape X *and* X satisfies schema/invariant Y" — e.g., assert the DB upsert arguments pass the Prisma type, or the CSP nonce is a valid UUID
- **Tier 3 (best)**: "was called with X *and* a paired integration test proves X yields the expected downstream state" — an integration test at a boundary (Playwright, real Prisma, real Redis) that would fail if the mock contract drifted

New security-relevant code ships Tier 3. New non-security code ships at least Tier 2.

### 3.2 Lint helper (optional, follow-up)

A custom eslint rule (or a simple grep-based CI check) that flags test files containing `toHaveBeenCalled()` without `toHaveBeenCalledWith` or a paired `expect(result…)`. Not enforced — surfaced as warning with a link back to this SPEC.

### 3.3 PR template update

Add to `.github/PULL_REQUEST_TEMPLATE.md`:
```
- [ ] For any new mock-based assertion, I have linked an integration test
      OR explained why a mock-only assertion is sufficient for this contract.
```

## 4. Scope

### In scope
- All `*.test.ts` files in `src/**` and `tests/**`
- PR template
- Optional: eslint custom rule or CI grep

### Out of scope
- Rewriting existing tests in bulk (separate cleanup SPEC if patterns emerge)
- E2E test framework selection (already Playwright)

## 5. Deliverables

- Updated `docs/tech-lead/code-review-checklist.md` with the three-tier rule
- Updated `.github/PULL_REQUEST_TEMPLATE.md` with the checkbox
- Optional: `scripts/check-mock-assertions.js` + CI step
- Worked example: refactor one existing test (candidate: `middleware.test.ts` after SPEC-SEC-CSP-NONCE-001 lands) demonstrating Tier 3

## 6. Acceptance Criteria

- [ ] Three-tier rule documented with at least 2 worked examples from the repo
- [ ] PR template checkbox in place
- [ ] qa-engineer signs off that the rule is teachable/enforceable in review
- [ ] At least one existing test upgraded to Tier 3 as demonstration

## 7. Open Questions

- Is a custom eslint rule worth the maintenance cost, or is a review-checklist + PR template sufficient?
- Do we grandfather existing tests or require upgrade on next edit?

---

## Change History
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2026-04-21 | architect (candidate) | Initial draft — registry entry for Sprint 46 planning |
