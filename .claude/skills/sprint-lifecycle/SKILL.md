# Sprint Lifecycle Management

## Description
Manages the full lifecycle of development sprints with automated quality gates.

## Triggers
- User starts a new sprint
- User wants to review sprint progress
- User wants to finish/close a sprint
- User asks about sprint status

## Commands
```bash
npm run sprint:start <N>    # Start sprint N (branch, tag, baseline)
npm run sprint:review <N>   # Review sprint N (tests, lint, security, i18n)
npm run sprint:finish <N>   # Finish sprint N (verify, changelog, push, tag)
npm run sprint:status <N>   # Check sprint N status
```

## Quality Gates

| Severity | Effect | Examples |
|----------|--------|----------|
| CRITICAL | Blocks sprint | Failing tests, vulnerabilities, sensitive data in logs |
| HIGH | Must fix | Files without tests, console.log with sensitive data |
| MEDIUM | Should fix | TODOs without ticket, missing i18n keys |
| LOW | Nice to fix | Code style, minor refactors |

## Workflow
1. `sprint:start N` → creates branch, runs baseline tests
2. Develop features...
3. `sprint:review N` → automated quality review
4. Fix any CRITICAL/HIGH issues
5. `sprint:finish N` → final verification, changelog, push
