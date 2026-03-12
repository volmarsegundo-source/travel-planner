---
spec_id: SPEC-UX-015
title: "Bug Fix UX Patterns"
type: ux
status: Draft
version: "1.0.0"
author: ux-designer
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs:
  - SPEC-UX-011
  - SPEC-UX-012
---

# SPEC-UX-015: Bug Fix UX Patterns — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Overview

This spec defines the UX patterns for the remaining bug fixes in Sprint 28. Each fix requires clear user feedback to communicate state changes.

---

## 2. FIX-001: Profile Name Persistence

### Problem
User saves profile name but it doesn't persist — the field reverts on page reload.

### UX Solution

**Save Feedback Flow:**
1. User edits name field
2. User clicks "Save" → button shows loading spinner: `[⟳ Saving...]`
3. On success: inline toast appears below the field: `✓ Profile saved` (green, fades after 3s)
4. On error: inline error below field: `✗ Failed to save. Try again.` (destructive color)
5. On reload: saved value must appear

**Visual Spec:**
- Success toast: `text-atlas-teal bg-atlas-teal/10 border-atlas-teal/20 rounded-lg px-3 py-2 text-sm`
- Error toast: `text-destructive bg-destructive/10 border-destructive/20 rounded-lg px-3 py-2 text-sm`
- Fade animation: `motion-safe:animate-fade-out` after 3000ms delay

---

## 3. FIX-002: Map Pin Visibility

### Problem
When user selects a destination in the autocomplete, the map pin doesn't appear or is not visible.

### UX Solution

**Pin Placement Flow:**
1. User types destination → autocomplete dropdown appears
2. User selects destination → map centers on coordinates with smooth transition
3. Pin drops with subtle animation (`motion-safe:animate-bounce` once)
4. Pin is colored `atlas-gold` (active trip color)
5. If coordinates unavailable: show inline message: `📍 Location not found on map` (muted, non-blocking)

**Visual Spec:**
- Pin icon: filled map marker, 32×32px, `text-atlas-gold`
- Map center transition: `duration-500 ease-out`
- Pin drop: `motion-safe:animate-bounce` with `animation-iteration-count: 1`
- Loading state while geocoding: small spinner next to map

---

## 4. FIX-003: Phase 4 Auto-Save

### Problem
When navigating between Phase 4 steps, data entered is lost if user moves to another step without explicitly saving.

### UX Solution

**Auto-Save Flow:**
1. User enters data in any Phase 4 step field
2. After 2s debounce of no typing: auto-save triggers
3. Save indicator appears in step header: `Saving...` → `✓ Saved` (fades after 2s)
4. On step navigation (Next/Back): save triggers immediately (no debounce)
5. If save fails: indicator shows `⚠ Not saved` with retry action

**Visual Spec — Save Indicator:**
```
┌─────────────────────────────────────────┐
│ Step 1: Transport                ✓ Saved│  ← right-aligned in step header
│                                         │
│ [form fields...]                        │
│                                         │
│              [← Back]    [Next Step →]  │
└─────────────────────────────────────────┘
```

- Saving state: `text-muted-foreground text-xs` with inline spinner
- Saved state: `text-atlas-teal text-xs` with checkmark icon
- Error state: `text-amber-500 text-xs` with warning icon + "Retry" link
- Transitions: `motion-safe:transition-opacity duration-300`

---

## 5. FIX-004: Phase Revisit with Saved Data

### Problem
When returning to a previously completed phase, the form shows empty fields instead of saved data.

### UX Solution

**Revisit Flow:**
1. User clicks on a completed phase segment in `ExpeditionProgressBar`
2. Phase wizard loads with skeleton loader (`motion-safe:animate-pulse`)
3. Saved data populates all fields
4. Visual indicator at top: `📋 Showing your saved selections` (info banner, atlas-teal)
5. User can edit and re-save
6. "Save Changes" button only activates when data differs from saved state

**Visual Spec — Info Banner:**
```
┌─────────────────────────────────────────┐
│ ℹ️ Showing your previously saved data.  │
│    You can edit and save changes.       │
└─────────────────────────────────────────┘
```
- Banner: `bg-atlas-teal/10 border border-atlas-teal/20 rounded-lg px-4 py-3 text-sm text-foreground`
- Positioned above the form, below the phase progress bar
- Dismissible with × button (dismissed state stored in session)

**Dirty State Detection:**
- Track `isDirty` via form state comparison
- "Save Changes" button: disabled (`opacity-50`) when no changes detected
- If user navigates away with unsaved changes: browser `beforeunload` warning

---

## 6. Accessibility Requirements (All Fixes)

- Save feedback must be announced to screen readers via `role="status"` and `aria-live="polite"`
- Error messages use `role="alert"` for immediate announcement
- Map pin has `aria-label` describing the location
- Auto-save indicator uses `aria-live="polite"` (not "assertive" — too disruptive)
- Info banners have `role="note"` or `role="status"`
- All animations respect `prefers-reduced-motion: reduce`

---

## 7. i18n Keys Required

```json
{
  "common": {
    "saving": "Saving...",
    "saved": "Saved",
    "notSaved": "Not saved",
    "retry": "Retry",
    "profileSaved": "Profile saved",
    "saveFailed": "Failed to save. Try again.",
    "locationNotFound": "Location not found on map",
    "showingSavedData": "Showing your previously saved data. You can edit and save changes.",
    "saveChanges": "Save Changes",
    "noChanges": "No changes to save"
  }
}
```
