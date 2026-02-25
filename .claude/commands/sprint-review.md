# Sprint Review

Run a full parallel sprint review at the end of Sprint $ARGUMENTS.
Three agents run simultaneously, then tech-lead consolidates.

## Phase 1 — Parallel reviews (run all three at the same time)

### Agent 1: tech-lead — Code Quality Review
Read `docs/tasks.md` and verify every task listed for Sprint $ARGUMENTS is committed and complete.
Then review the code written during the sprint:

**Scope:**
- Code standards: TypeScript strict, no `any` leaks beyond documented exceptions, consistent naming
- Architectural patterns: Server Actions, BOLA-safe queries, redirect outside try/catch (FIND-M-001), no business logic in UI components
- Performance: N+1 queries, missing Redis cache opportunities, bundle size concerns
- Technical debt: TODOs, workarounds, deferred edge cases, schema migrations pending
- Test coverage: verify unit tests exist for all new services and actions; coverage ≥ 80%
- DoD (Definition of Done) from `docs/tasks.md`: every AC ticked

**Output format — `docs/review-sprint-$ARGUMENTS.md` section `## Tech Lead Review`:**
```
### CRITICAL (blocks next sprint)
- [issue description] — file:line

### WARNING (must be fixed within 2 sprints)
- [issue description]

### INFO (nice to have)
- [suggestion]

### Tasks verified complete: T-XXX, T-XXX, ...
### Tasks NOT complete or missing evidence: T-XXX, ...
### Verdict: PASS | BLOCK
```

---

### Agent 2: architect — Architectural Review
Read `docs/architecture.md` (ADRs), `docs/SPEC-001.md` (and any other SPEC files), and audit the sprint's code:

**Scope:**
- Folder structure matches `docs/architecture.md` — no files in wrong layers
- ADR decisions respected: database sessions (not JWT), Prisma 7 patterns, server-only imports, Redis TTLs
- No layer violations: UI importing from server services directly, server importing client hooks
- API contracts: Server Actions match SPEC typed interfaces
- Scalability shortcuts: synchronous operations that should be async/queued, missing indexes, unbounded queries
- New architectural decisions made during sprint but not documented → must create ADR

**Output format — `docs/review-sprint-$ARGUMENTS.md` section `## Architect Review`:**
```
### CRITICAL
- [violation of ADR-XXX or SPEC-XXX] — file:line

### WARNING
- [deviation from documented architecture]

### INFO
- [observation or suggestion]

### ADRs to update: ADR-XXX (reason)
### Verdict: PASS | BLOCK
```

---

### Agent 3: security-specialist — Security & Compliance Review
Read `docs/security.md`, `docs/SEC-SPEC-001.md`, and audit all new code for the sprint:

**Scope:**
- OWASP Top 10: injection, broken auth, sensitive data exposure, IDOR/BOLA, security misconfiguration, XSS, insecure deserialization, known vulnerabilities, insufficient logging, SSRF
- Auth flows: session handling, token expiry, redirect-after-login, CSRF
- Server Actions: all auth guards present (`await auth()`), no userId from client input, ownership checks
- PII handling: no PII in logs, Redis values, error messages, or API responses; email hashed before analytics
- LGPD compliance: right-to-erasure path exists, consent flows, data minimization in place
- Trust signals (US-002B): correctly implemented on all auth pages
- Dependencies: no new deps with known CVEs added this sprint
- Secrets: no hardcoded keys, tokens, or passwords in any committed file

**Output format — `docs/review-sprint-$ARGUMENTS.md` section `## Security Review`:**
```
### CRITICAL (deploy blocked)
- [vulnerability description + CWE/OWASP reference] — file:line

### WARNING (fix before next sprint)
- [security concern]

### INFO
- [hardening suggestion]

### LGPD checklist: [items verified]
### Verdict: PASS | BLOCK
```

---

## Phase 2 — Consolidation (tech-lead, after all three reviews complete)

Read the three review sections in `docs/review-sprint-$ARGUMENTS.md` and produce a final consolidated summary:

```markdown
## Consolidated Verdict — Sprint $ARGUMENTS

| Reviewer       | Verdict | Critical Issues |
|----------------|---------|-----------------|
| Tech Lead      | PASS/BLOCK | N |
| Architect      | PASS/BLOCK | N |
| Security       | PASS/BLOCK | N |

### Overall: ✅ SPRINT APPROVED — next sprint may begin
### OR
### Overall: 🚫 SPRINT BLOCKED — resolve all CRITICAL issues before Sprint X+1

### Priority action items (ordered by severity):
1. [CRITICAL] description — owner: agent-name — deadline: before Sprint X+1
2. [WARNING] description — owner: agent-name — deadline: Sprint X+1 week 1
...
```

Write the full report to `docs/review-sprint-$ARGUMENTS.md`.
If any verdict is BLOCK, output a clear message to the user:
> 🚫 Sprint $ARGUMENTS review BLOCKED. Resolve all CRITICAL issues listed in docs/review-sprint-$ARGUMENTS.md before starting Sprint $(($ARGUMENTS + 1)).
