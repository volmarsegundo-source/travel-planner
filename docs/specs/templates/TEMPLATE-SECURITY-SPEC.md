# SPEC-SEC-XXX: [Feature Name] — Security Specification

**Version**: 1.0.0
**Status**: Draft | In Review | Approved | Implemented | Deprecated
**Author**: security-specialist
**Reviewers**: [architect, tech-lead]
**Product Spec**: SPEC-PROD-XXX
**Architecture Spec**: SPEC-ARCH-XXX
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD

## 1. Threat Model
### Assets at Risk
- [What data/functionality needs protection]

### Threat Actors
- [Who might attack and their motivation]

### Attack Vectors
| Vector | Impact | Likelihood | Mitigation |
|--------|--------|-----------|-----------|
| [BOLA] | [High] | [Medium] | [assertTripOwnership on all actions] |

## 2. Authentication & Authorization
- [Auth requirements for this feature]
- [Role-based access control rules]
- [Session management considerations]

## 3. Input Validation
- [All user inputs and their validation rules]
- [Zod schemas required]
- [Server-side validation requirements]

## 4. Data Protection
- [PII identification and handling]
- [Encryption requirements (at rest, in transit)]
- [Data retention and GDPR considerations]

## 5. API Security
- [Rate limiting requirements]
- [CORS policy]
- [CSP headers]

## 6. Dependency Security
- [New dependencies and their CVE status]
- [License compatibility (MIT, Apache 2.0, BSD, ISC only)]

## 7. Security Testing Requirements
- [Negative test cases required]
- [Penetration testing scope]
- [OWASP Top 10 checklist for this feature]

## 8. Compliance
- [GDPR, PCI-DSS, LGPD requirements if applicable]

---

## Change History
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | YYYY-MM-DD | security-specialist | Initial draft |
