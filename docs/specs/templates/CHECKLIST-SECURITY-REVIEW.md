# Security Review Checklist for Spec Approval

Use this checklist when reviewing ANY spec (Product, UX, Architecture).

## Mandatory Checks
- [ ] Constraints section includes security requirements
- [ ] All user inputs identified and validation rules specified
- [ ] Authentication requirements defined (who can access what)
- [ ] Authorization model specified (BOLA prevention)
- [ ] PII handling documented (encryption, no logging, no API exposure)
- [ ] New dependencies checked for CVEs and license compatibility
- [ ] Rate limiting requirements specified for new endpoints
- [ ] Error messages don't leak sensitive information

## For Architecture Specs
- [ ] API contracts include auth headers
- [ ] Database queries use parameterized inputs (Prisma)
- [ ] Server actions include ownership checks
- [ ] No mass assignment vulnerabilities
- [ ] CSP headers maintained

## For UX Specs
- [ ] No PII displayed unnecessarily
- [ ] Logout/session timeout behavior defined
- [ ] Error states don't reveal system internals

## Verdict
- [ ] APPROVED — all checks pass
- [ ] APPROVED WITH CONDITIONS — [list conditions]
- [ ] BLOCKED — [list blocking issues]
