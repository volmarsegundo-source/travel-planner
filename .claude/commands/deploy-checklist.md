# Deploy Checklist

Run a full pre-production deploy audit for version $ARGUMENTS.
Four agents run simultaneously. Deploy is BLOCKED if any CRITICAL issue is found.

## Phase 1 — Parallel audits (run all four at the same time)

### Agent 1: security-specialist — Final Security Audit
Perform a complete security sweep before production deploy:

**Scope:**
- OWASP Top 10 full scan of all routes and Server Actions
- Authentication: session invalidation on logout, token rotation, rate limiting on auth endpoints
- Authorization: every Server Action has `await auth()` guard; all DB queries include `userId` in `where`
- PII audit: grep all files for email/password/phone patterns in logs, Redis values, response payloads
- LGPD: right-to-erasure endpoint exists and tested; consent flows working; data retention policy documented
- Secrets scan: no `.env` values, API keys, or tokens hardcoded in any source file
- Dependency audit: `npm audit` — no HIGH or CRITICAL CVEs
- Security headers: CSP, HSTS, X-Frame-Options configured in `next.config.ts`
- CORS: only allowed origins whitelisted
- Trust signals on all auth pages (US-002B acceptance criteria met)

**Output — `docs/deploy-checklist-$ARGUMENTS.md` section `## Security Audit`:**
```
### CRITICAL (deploy blocked)
- [vulnerability + CWE] — file:line

### WARNING (must fix within 48h post-deploy)
- [issue]

### Checklist:
- [ ] OWASP Top 10 reviewed
- [ ] All Server Actions auth-guarded
- [ ] No PII in logs/cache/responses
- [ ] LGPD erasure path tested
- [ ] npm audit: 0 HIGH/CRITICAL
- [ ] Security headers configured
- [ ] No secrets in source

### Verdict: PASS | BLOCK
```

---

### Agent 2: qa-engineer — Quality Gate
Verify test coverage and end-to-end scenarios before deploy:

**Scope:**
- Run `npm run test -- --coverage` and verify overall coverage ≥ 80%; fail if below
- Unit tests: trip.service, auth.service, ai.service, all validations schemas — all passing
- E2E critical paths: register → verify → login → onboarding → create trip → generate plan → checklist (375px + 1280px)
- Regression: previously passing E2E tests still green
- Accessibility: WCAG 2.1 AA — keyboard navigation, aria labels, focus management on modals/dialogs
- Mobile: all touch targets ≥ 44×44px, no horizontal scroll at 375px
- Error scenarios: 401 redirect, 404 not found, AI timeout fallback, trip limit error — all handled gracefully
- Performance: Lighthouse score ≥ 80 on /trips (desktop)

**Output — `docs/deploy-checklist-$ARGUMENTS.md` section `## QA Gate`:**
```
### CRITICAL (deploy blocked)
- [test failure or coverage gap]

### WARNING
- [flaky test, a11y concern]

### Coverage report:
- Overall: XX%
- trip.service: XX%
- auth.service: XX%
- ai.service: XX%

### E2E results: X/X passing
### Verdict: PASS | BLOCK
```

---

### Agent 3: devops-engineer — Infrastructure & Operations Readiness
Verify the deployment pipeline and production environment:

**Scope:**
- CI/CD: GitHub Actions pipeline passes on `feat/sprint-N` — all steps green (lint, typecheck, test, build)
- Environment variables: all vars in `.env.example` are configured in production secrets (Vercel/AWS)
- Database: Prisma migrations up to date; `prisma migrate deploy` tested against staging
- Redis: production Redis connection string set; TTLs match `src/server/cache/keys.ts`
- External APIs: GOOGLE_PLACES_API_KEY and ANTHROPIC_API_KEY configured in prod; quota limits checked
- Monitoring: error tracking (Sentry or equivalent) configured; health endpoint `/api/v1/health` returning 200
- Rollback plan: previous version tag documented; rollback command documented
- Canary strategy: deploy to 10% traffic first; full rollout after 30min with no error spike

**Output — `docs/deploy-checklist-$ARGUMENTS.md` section `## DevOps Readiness`:**
```
### CRITICAL (deploy blocked)
- [missing env var, pipeline failure, migration issue]

### WARNING
- [operational concern]

### Checklist:
- [ ] CI/CD pipeline green
- [ ] All env vars set in prod
- [ ] DB migrations applied to staging
- [ ] Redis configured and reachable
- [ ] API keys configured and quota checked
- [ ] Health endpoint returning 200
- [ ] Rollback plan documented

### Verdict: PASS | BLOCK
```

---

### Agent 4: architect — Technical Debt Gate
Review for unresolved critical technical debt before shipping to users:

**Scope:**
- All CRITICAL issues from previous sprint reviews (`docs/review-sprint-*.md`) resolved
- No temporary workarounds (`// TODO`, `// FIXME`, `// TEMP`, `as any` without justification comment) in production paths
- Database schema: no missing indexes on foreign keys or frequently queried columns
- API contracts: all SPEC documents match the actual implementation
- Error boundaries: every page has error handling; no unhandled promise rejections in production paths
- Observability: structured logging in Server Actions and services; correlation IDs on AI calls
- Breaking changes: documented in CHANGELOG.md with migration guide if applicable

**Output — `docs/deploy-checklist-$ARGUMENTS.md` section `## Architecture Gate`:**
```
### CRITICAL (deploy blocked)
- [unresolved sprint review issue, missing index, broken contract]

### WARNING
- [technical debt item]

### Sprint review issues resolved: [list]
### Sprint review issues still open: [list] → escalate or accept risk

### Verdict: PASS | BLOCK
```

---

## Phase 2 — Final Gate Decision (security-specialist as release authority)

After all four audits complete, read `docs/deploy-checklist-$ARGUMENTS.md` and produce the final deploy decision:

```markdown
## Final Deploy Decision — $ARGUMENTS

| Auditor        | Verdict | Critical Issues |
|----------------|---------|-----------------|
| Security       | PASS/BLOCK | N |
| QA             | PASS/BLOCK | N |
| DevOps         | PASS/BLOCK | N |
| Architect      | PASS/BLOCK | N |

### 🚀 DEPLOY APPROVED — $ARGUMENTS is safe to ship
### OR
### 🚫 DEPLOY BLOCKED — resolve all CRITICAL issues before deploying $ARGUMENTS

### Approved by: security-specialist
### Date: [today's date]
### Conditions (if any): [post-deploy actions required within 48h]
```

If BLOCKED, list exact steps required to unblock. Write final decision to `docs/deploy-checklist-$ARGUMENTS.md`.
