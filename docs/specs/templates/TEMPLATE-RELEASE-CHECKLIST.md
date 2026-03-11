# REL-XXX: Release Checklist -- v0.XX.0

**Date**: YYYY-MM-DD
**Release Manager**: release-manager
**Sprint**: XX
**Version**: v0.XX.0

## Pre-Release Checks
- [ ] All specs for this sprint are in "Implemented" status
- [ ] QA spec conformance audit passed (QA-CONF-XXX)
- [ ] Security review completed and approved
- [ ] No P0/P1 spec drift items open
- [ ] All commits reference spec IDs
- [ ] Changelog entries reference spec IDs
- [ ] Version bump follows semver (based on spec changes)
- [ ] Build passes
- [ ] All tests pass
- [ ] Lint clean

## Specs Delivered
| Spec ID | Title | Version | Conformance |
|---------|-------|---------|-------------|
| SPEC-XXX | [name] | 1.0.0 | QA-CONF-XXX: PASS |

## Breaking Changes
| Change | ADR Reference | Migration Guide |
|--------|--------------|----------------|
| -- | -- | -- |

## Changelog
### Features
- [SPEC-PROD-XXX] Feature name -- brief description

### Fixes
- [SPEC-XXX] Fix description

### Documentation
- [SPEC-XXX] Spec updates

## Post-Release
- [ ] Tag created (vX.Y.Z)
- [ ] Tag pushed to origin
- [ ] Sprint review document committed
- [ ] Spec status tracker updated
- [ ] Agent memories updated
