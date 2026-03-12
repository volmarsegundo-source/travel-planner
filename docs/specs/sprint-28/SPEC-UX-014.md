---
spec_id: SPEC-UX-014
title: "CTA Button Standardization"
type: ux
status: Draft
version: "1.0.0"
author: ux-designer
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs:
  - SPEC-UX-009
  - SPEC-PROD-012
---

# SPEC-UX-014: CTA Button Standardization — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: SPEC-PROD-009 (Sprint 27, partially implemented)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

Every interactive element across the application must communicate its purpose clearly through consistent visual hierarchy. Travelers should never hesitate about which button to click or wonder if an action is primary or secondary.

---

## 2. Button Hierarchy

### 2.1 Primary CTA
- **Color**: `bg-atlas-teal text-white hover:bg-atlas-teal/90`
- **Use case**: Main action on any page — "Save", "Next", "Create Trip", "Advance Phase"
- **Rule**: Maximum 1 primary CTA per visible viewport section
- **Border radius**: `rounded-lg` (8px)

### 2.2 Secondary CTA
- **Color**: `border border-border text-foreground hover:bg-accent`
- **Use case**: Alternative actions — "Back", "Cancel", "Skip"
- **Border radius**: `rounded-lg` (8px)

### 2.3 Destructive CTA
- **Color**: `bg-destructive text-destructive-foreground hover:bg-destructive/90`
- **Use case**: Irreversible actions — "Delete Trip", "Delete Account"
- **Border radius**: `rounded-lg` (8px)
- **Requirement**: Always preceded by confirmation dialog

### 2.4 Ghost CTA
- **Color**: `text-muted-foreground hover:text-foreground hover:bg-muted`
- **Use case**: Tertiary actions — "View details", "Learn more", inline actions
- **Border radius**: `rounded-lg` (8px)

### 2.5 Link CTA
- **Color**: `text-atlas-teal hover:underline`
- **Use case**: Navigation within text — "See all badges", "Edit profile"

---

## 3. Standard Sizes

| Size | Class | Height | Padding | Font | Use Case |
|------|-------|--------|---------|------|----------|
| `sm` | `h-8 px-3 text-xs` | 32px | 12px h | 12px | Inline actions, table rows |
| `md` | `h-10 px-4 text-sm` | 40px | 16px h | 14px | Default for most CTAs |
| `lg` | `h-12 px-6 text-base` | 48px | 24px h | 16px | Primary page CTAs, mobile |

**Mobile touch target**: All buttons must have minimum `min-h-[44px]` on mobile (`md:min-h-0`).

---

## 4. Interaction States

### 4.1 Loading State
```
[⟳ Saving...]    ← spinner icon (animate-spin) + label change
```
- Replace button text with loading text
- Show `Loader2` icon from lucide-react with `animate-spin motion-reduce:animate-none`
- Disable button (`disabled`, `opacity-70`)
- Prevent double submission

### 4.2 Disabled State
- `opacity-50 cursor-not-allowed`
- Tooltip explaining why disabled (when possible)

### 4.3 Focus State
- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Keyboard-accessible outline

### 4.4 Hover State
- Subtle background shift (defined per hierarchy level above)
- `transition-colors duration-150`

---

## 5. Icon Placement Rules

| Position | Use | Example |
|----------|-----|---------|
| **Left** | Action verbs | `[+ Create Trip]`, `[✓ Save]` |
| **Right** | Navigation/expansion | `[Next →]`, `[Details ▸]` |
| **Icon-only** | Space-constrained | `[🗑]` with `aria-label` |

- Icon size: `h-4 w-4` (16px) for `md` buttons, `h-3.5 w-3.5` for `sm`
- Gap between icon and text: `gap-2` (8px)

---

## 6. Current Inconsistencies Audit

| Location | Current | Standard | Fix |
|----------|---------|----------|-----|
| Phase wizards "Next" | Varies (`btn-primary`, custom classes) | Primary CTA `lg` | Standardize to `Button variant="default" size="lg"` |
| Phase wizards "Back" | Ghost or text link | Secondary CTA `md` | Standardize to `Button variant="outline"` |
| Dashboard "Create Trip" | Primary but `md` size | Primary CTA `lg` | Increase to `lg` |
| Guide "Advance Phase" | Custom green button | Primary CTA `lg` | Use standard primary |
| Profile "Save" | Various sizes | Primary CTA `md` | Standardize |
| Delete modals | Red text button | Destructive CTA `md` | Use `Button variant="destructive"` |
| Loading states | Some have spinner, some don't | All primary CTAs must show spinner | Add loading prop |

---

## 7. Responsive Behavior

- **Desktop (≥1024px)**: Full text + icon buttons
- **Tablet (768-1023px)**: Full text, may stack vertically in wizard footers
- **Mobile (<768px)**: Full-width buttons in wizard footers (`w-full`), icon-only for toolbar actions

### Wizard Footer Pattern (Standard)
```
Desktop:  [← Back]                    [Save Draft]  [Next Step →]
Mobile:   [← Back]
          [Save Draft]
          [Next Step →]    (full-width, stacked)
```

---

## 8. Accessibility Requirements

- **Color contrast**: All button states must meet WCAG 2.1 AA (4.5:1 for text)
- **Focus indicators**: Visible on keyboard navigation (`focus-visible`)
- **Screen readers**: All icon-only buttons must have `aria-label`
- **Reduced motion**: Loading spinners use `motion-reduce:animate-none`
- **Touch targets**: Minimum 44×44px on mobile
- **Disabled communication**: `aria-disabled="true"` + tooltip or `title` explaining reason

---

## 9. Implementation Notes

- Use shadcn/ui `Button` component as the base
- All variants already defined in `src/components/ui/button.tsx` — audit and update variant definitions if needed
- Add `loading` prop to Button component: `loading?: boolean`
- Create `ButtonGroup` component for wizard footer pattern (optional)
