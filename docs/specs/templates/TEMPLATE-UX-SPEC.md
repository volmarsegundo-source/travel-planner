# SPEC-UX-XXX: [Feature Name] — UX Specification

**Version**: 1.0.0
**Status**: Draft | In Review | Approved | Implemented | Deprecated
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: SPEC-PROD-XXX
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD

---

## 1. Traveler Goal

[One sentence: what does the traveler want to accomplish?]

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | [description] |
| `@leisure-family` | [description] |
| `@business-traveler` | [description] |
| `@bleisure` | [description] |
| `@group-organizer` | [description] |
| `@travel-agent` | [description] |

[Remove rows for personas not affected. Keep at least two.]

## 3. User Flow

### Happy Path

1. User does X
2. System shows Y
3. User confirms Z
4. System provides feedback

```
[Entry point]
    |
    v
[Step 1: Screen/action]
    |
    v
[Step 2: Screen/action]
    |
    v
[Success state]
```

### Alternative Paths

- [Describe any branching paths the user might take]

### Error States

- **Validation failure**: [What the user sees, what recovery is offered]
- **Network unavailable**: [Offline behavior, retry mechanism]
- **Server error**: [Message shown, fallback behavior]
- **Timeout**: [How long before timeout, what message appears]

### Edge Cases

- **Empty state**: [First-time user with no data]
- **Returning user**: [Pre-populated fields, remembered preferences]
- **Maximum limits**: [What happens at capacity]
- **Concurrent access**: [If applicable]

## 4. Screen Descriptions

### Screen 1: [Name]

**Purpose**: [What decision or action does this screen support?]

**Layout**:
- [Description of visual layout and spatial arrangement]
- [Describe hierarchy: what the eye hits first, second, third]
- [NO component library references — describe by function, not implementation]

**Content**:
- [What text, data, or media appears on this screen]
- [Dynamic content: what changes based on user state]

**Interactive Elements**:
- [Describe each interactive element by its function]
- [For each: default state, hover/focus state, active state, disabled state]

**Empty State**: [What the traveler sees when there is no data to display]

**Loading State**: [How the screen appears while data loads — skeleton, progressive, spinner]

**Error State**: [What appears when something goes wrong — message tone must never blame the user]

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | [description] |
| Tablet (768-1024px) | [description] |
| Desktop (> 1024px) | [description] |

[Repeat for each screen in the feature.]

## 5. Interaction Patterns

- **Screen transitions**: [How the user moves between screens — direction, continuity]
- **Loading feedback**: [What the user sees during async operations]
- **Success feedback**: [How confirmation is communicated]
- **Error feedback**: [How errors are surfaced — inline, toast, banner]
- **Animation**: [Any motion must respect `prefers-reduced-motion` — describe both with-motion and reduced-motion behavior]
- **Progressive disclosure**: [What is hidden initially and revealed on demand]

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [ ] All interactive elements reachable via Tab
  - [ ] Tab order follows logical reading order
  - [ ] Focus indicator visible on all interactive elements (minimum 2px)
  - [ ] No keyboard traps
  - [ ] Modal dialogs trap focus until dismissed
  - [ ] Escape key closes overlays and returns focus to trigger
- **Screen Reader**:
  - [ ] All images have descriptive alt text
  - [ ] All form inputs have visible, associated labels
  - [ ] Error messages linked to fields via `aria-describedby`
  - [ ] Dynamic content changes announced via live regions
  - [ ] Decorative elements hidden from assistive technology
- **Color & Contrast**:
  - [ ] Text contrast ratio >= 4.5:1
  - [ ] UI component contrast ratio >= 3:1
  - [ ] No information conveyed by color alone
- **Motion**:
  - [ ] All animations respect `prefers-reduced-motion`
  - [ ] No auto-advancing content without explicit user control
- **Touch**:
  - [ ] Touch targets >= 44x44px on mobile
  - [ ] Adequate spacing between touch targets (>= 8px)

## 7. Content & Copy

All user-facing text must be provided in both languages.

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `cta_primary` | [Portuguese text] | [English text] |
| `cta_secondary` | [Portuguese text] | [English text] |
| `page_title` | [Portuguese text] | [English text] |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| [validation_error] | [Portuguese text] | [English text] |
| [network_error] | [Portuguese text] | [English text] |

### Tone of Voice

- [Guidelines specific to this feature — e.g., reassuring for booking, celebratory for completion]
- Never blame the user. Always offer a path forward.

## 8. Constraints (from Product Spec)

- [Reference SPEC-PROD-XXX constraints that affect UX decisions]
- [Business rules that limit design options]
- [Technical constraints communicated by the architect]

## 9. Prototype

- [ ] Prototype required: Yes / No
- **Location**: `docs/prototypes/[feature-name].html`
- **Scope**: [Which screens/states the prototype covers]
- **Notes**: [Self-contained HTML/CSS, no external dependencies]

## 10. Open Questions

- [ ] [Unresolved design decision — who needs to answer]
- [ ] [Dependency on another spec or team decision]

---

> **Spec Status**: Draft
> **Ready for**: [Architect / Blocked on: open question]

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | YYYY-MM-DD | ux-designer | Initial draft |
