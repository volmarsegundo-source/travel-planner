---
name: Sprint 38 Plan -- Design System Foundation
description: Sprint 38 planning state, key corrections from UX Parecer, execution plan details, v0.33.0
type: project
---

Sprint 38: "Fundacao do Design System" -- v0.33.0, 50h budget, 18 tasks

**Key UX Parecer corrections applied to task plan**:
- Fonts: Plus Jakarta Sans + Work Sans (NOT Outfit + DM Sans)
- Colors: 40+ M3 tokens with atlas- prefix (NOT 7 from DESIGN.md)
- CTA contrast: navy text (#040d1b) on orange (#fe932c), NEVER white (2.3:1 fails WCAG)
- Focus: focus-visible:ring-2 mandatory (exports had focus:ring-0 which violates WCAG 2.4.7)
- Touch targets: all interactive >= 44px
- 9 semantic tokens added: warning, success, info, disabled, focus-ring + containers
- prefers-reduced-motion mandatory in globals.css

**Why:** UX Parecer audited 5 Stitch exports and found DESIGN.md critically incomplete (7 tokens vs 40+ needed), wrong fonts, WCAG contrast failures. Parecer is now source of truth.

**How to apply:** All Sprint 38 code reviews must verify atlas-* prefix, no white-on-orange, focus-visible ring, 44px touch targets. Reject any PR using Tailwind default color classes in new components.

**Track 1** (dev-fullstack-1, 22h): tokens, tailwind config, fonts, CSS vars, feature flag, ESLint, visual regression
**Track 2** (dev-fullstack-2, 25h): 7 components (Button 7 variants, Input, Card 4 variants, Chip, Badge 7 variants, PhaseProgress 2 layouts, StepperInput)
**Critical path**: T1.2 (tailwind config) blocks all of Track 2

Files:
- docs/specs/sprint-38/SPRINT-38-TASKS.md (v2.0.0 with corrections)
- docs/specs/sprint-38/SPRINT-38-EXECUTION-PLAN.md
- docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md (source of truth)
- docs/specs/sprint-38/SPEC-PROD-046.md, SPEC-PROD-047.md
