# SPEC-ARCH-XXX: [Feature Name] — Architecture Specification

**Version**: 1.0.0
**Status**: Draft | In Review | Approved | Implemented | Deprecated
**Author**: architect
**Reviewers**: [tech-lead, security-specialist, devops-engineer]
**Product Spec**: SPEC-PROD-XXX
**UX Spec**: SPEC-UX-XXX
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD

## 1. Overview
[Brief technical summary — what this spec covers]

## 2. Architecture Decision Records
### ADR-XXX: [Decision Title]
- **Status**: Proposed | Accepted | Superseded
- **Context**: [Why this decision is needed]
- **Decision**: [What we decided]
- **Consequences**: [Trade-offs, implications]
- **Alternatives Considered**: [What we rejected and why]

## 3. System Design
### Component Diagram
[Description of components and their interactions]

### Data Flow
[How data moves through the system for this feature]

### API Contracts
[Endpoints, request/response schemas — use OpenAPI-compatible descriptions]

## 4. Data Model
[New/modified database tables, relations — use standard SQL descriptions]

## 5. Vendor Dependencies
| Vendor | Service Used | Abstraction Layer | Exit Strategy |
|--------|-------------|-------------------|---------------|
| [Name] | [What] | [Interface/adapter] | [How to replace] |

## 6. Constraints (MANDATORY)
### Architectural Boundaries
- [What this feature CAN'T do]
- [Dependencies it CAN'T introduce]
### Performance Budgets
- [Response time: < X ms]
- [Bundle size impact: < X kB]
- [Token budget: < X tokens per request]
### Security Requirements
- [Auth model, input validation, PII handling]
- [BOLA prevention strategy]
### Scalability
- [Expected load, caching strategy]

## 7. Implementation Guide
### Files to Create/Modify
| File | Action | Description |
|------|--------|-------------|
| path/to/file | Create/Modify | What changes |

### Migration Strategy
[Database migrations, backward compatibility]

## 8. Testing Strategy
[What the architect expects to be tested — unit, integration, e2e]

## 9. Open Questions
[Unresolved technical decisions]

---

## Change History
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | YYYY-MM-DD | architect | Initial draft |
