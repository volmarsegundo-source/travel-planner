# SPEC-UX-027: Header Cleanup -- UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: N/A (navigation refinement)
**Created**: 2026-03-17
**Last Updated**: 2026-03-17

---

## 0. Audit Summary -- Current State

### 0.1 Current AuthenticatedNavbar Layout (Desktop)

```
[Logo: Atlas] | [Expeditions] [My Atlas] [Perfil] | [GamificationBadge->link] [ThemeToggle] [LanguageSwitcher] [UserMenu avatar->dropdown]
```

### 0.2 Current UserMenu Dropdown Items

1. User name + email (header)
2. "Minha Conta" link -> `/account`
3. "Sair" button (sign out)

### 0.3 Current GamificationBadge

- Renders as a `<Link href="/atlas">` (clickable, navigates to /atlas)
- Shows: star emoji + points number + phase name (desktop only)
- Has hover effect (`hover:bg-atlas-gold/20`)
- Cursor: pointer

### 0.4 Issues to Resolve

| Issue | Impact |
|---|---|
| "Perfil" is a top-level nav link alongside "Expeditions" and "My Atlas" | Profile is not a primary navigation destination like trips and map. It clutters the nav. Profile is a settings/utility function. |
| GamificationBadge is a clickable link to /atlas | Redundant with the "Meu Atlas" nav link. Creates two paths to the same page. The badge should be informational, not navigational. |
| GamificationBadge has hover state | Suggests interactivity that adds no value (already have a nav link to /atlas). |
| 4 nav links + badge + 3 controls = 8 items in header | Too many items. Cognitive overload. Header should be streamlined. |
| Mobile menu has 4 nav links + badge + 3 controls stacked vertically | Long mobile menu. Profile belongs in the avatar dropdown. |

---

## 1. Traveler Goal

Navigate the app efficiently with a clean, uncluttered header that shows primary destinations (Expeditions, Atlas) and secondary utilities (profile, account, settings) in their natural hierarchy.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Cleaner header means less visual noise. Gamification badge as status display is delightful without being distracting. |
| `@business-traveler` | Fewer nav items = faster visual scanning. Profile in dropdown matches standard SaaS patterns they are familiar with. |
| `@leisure-family` | Simplified header is easier for less tech-savvy family members. |
| All personas | Consistent with standard web application patterns (profile in avatar dropdown, status badges as display-only). |

## 3. User Flow

### 3.1 Accessing Profile (Changed)

**Before**:
```
[Click "Perfil" in top nav] --> /profile
```

**After**:
```
[Click avatar] --> [Dropdown opens: Perfil | Minha Conta | Sair]
    |
    +-- [Click "Perfil"] --> /profile
    +-- [Click "Minha Conta"] --> /account
    +-- [Click "Sair"] --> sign out
```

### 3.2 Gamification Badge (Changed)

**Before**:
```
[Click gamification badge] --> /atlas (navigation)
[Hover badge] --> bg color change (interactive appearance)
```

**After**:
```
[View gamification badge] --> display-only, no interaction
[No click, no hover effect, no cursor change]
[Badge shows: star emoji + points + rank name]
```

---

## 4. Screen Descriptions

### 4.1 Desktop Header -- After Cleanup (> 768px)

**Layout**:
```
[Logo: Atlas] | [Expeditions] [Meu Atlas] | [ThemeToggle] [LanguageSwitcher] [GamificationBadge] [Avatar->dropdown]
```

**Content hierarchy (left to right)**:
1. **Logo**: "Atlas" brand link -> `/expeditions` (home)
2. **Primary nav links**: "Expedicoes" and "Meu Atlas" (the two main pages)
3. **Utility controls**: theme toggle, language switcher (functional tools)
4. **Gamification badge**: display-only status indicator (points + rank)
5. **Avatar dropdown**: user identity + secondary navigation (Perfil, Minha Conta, Sair)

**Changes from current**:
- REMOVED: "Perfil" as top-level nav link
- CHANGED: GamificationBadge from `<Link>` to `<div>` (display-only)
- UNCHANGED: Logo, Expeditions link, Meu Atlas link, ThemeToggle, LanguageSwitcher, Avatar trigger

### 4.2 GamificationBadge -- Display-Only

**Before (current code)**:
```html
<Link href="/atlas" class="... cursor-pointer hover:bg-atlas-gold/20">
  <span>star</span> <span>720</span> <span>Explorador</span>
</Link>
```

**After**:
```html
<div class="... cursor-default" aria-label="720 pontos, nivel Explorador" role="status">
  <span aria-hidden="true">star</span> <span>720</span> <span>Explorador</span>
</div>
```

**Specific changes**:
- Element: `<Link>` -> `<div>` (no wrapping anchor tag)
- `cursor-pointer` -> `cursor-default`
- Remove `hover:bg-atlas-gold/20` (no hover effect)
- Remove `href="/atlas"` (no navigation)
- Add `role="status"` (live region for points updates)
- Add `aria-label="{points} pontos, nivel {rankName}"`
- Keep visual appearance: gold background pill, star emoji, points, rank name
- Keep `data-testid="gamification-badge"` for testing

### 4.3 UserMenu Dropdown -- Updated Items

**Before**:
1. Name + email (header)
2. "Minha Conta" -> `/account`
3. "Sair" (sign out)

**After**:
1. Name + email (header, non-interactive)
2. "Perfil" -> `/profile` (NEW)
3. "Minha Conta" -> `/account`
4. Divider line (1px border-t)
5. "Sair" (sign out)

**Dropdown layout**:
```
+---------------------------+
| [Avatar] UserName         |
| user@email.com            |
+---------------------------+
| Perfil                    |
| Minha Conta               |
+---------------------------+
| Sair                      |
+---------------------------+
```

- "Perfil" and "Minha Conta": `role="menuitem"`, `min-height: 44px`
- "Sair": `role="menuitem"`, `min-height: 44px`, separated by divider (destructive action grouped separately)
- Each item: `text-sm text-muted-foreground hover:bg-accent hover:text-foreground`

### 4.4 Mobile Menu -- Updated (< 768px)

**Before** (current mobile menu):
```
[Expeditions link]
[Meu Atlas link]
[Perfil link]
---
[GamificationBadge (clickable)]
---
[ThemeToggle]
---
[LanguageSwitcher]
---
[UserMenu (inline: avatar + Minha Conta + Sair)]
```

**After**:
```
[Expeditions link]
[Meu Atlas link]
---
[GamificationBadge (display-only, points + rank)]
---
[ThemeToggle]
[LanguageSwitcher]
---
[Avatar + Name + Email]
[Perfil]
[Minha Conta]
[Sair]
```

**Changes**:
- REMOVED: "Perfil" as standalone nav link
- MOVED: "Perfil" into the user section at bottom (with Minha Conta and Sair)
- CHANGED: GamificationBadge from link to display-only div
- CHANGED: ThemeToggle and LanguageSwitcher share one section (remove extra divider)

### 4.5 Wireframe Comparison -- Desktop

**BEFORE**:
```
+------------------------------------------------------------------------------------------------------------+
| [compass] Atlas  |  Expeditions  |  Meu Atlas  |  Perfil  |  [star 720 Explorador->]  [moon] [PT] [avatar] |
+------------------------------------------------------------------------------------------------------------+
                                                      ^                  ^
                                                      |                  |
                                               Top-level nav       Clickable link
                                               (3 items)           (to /atlas)
```

**AFTER**:
```
+------------------------------------------------------------------------------------------------------------+
| [compass] Atlas  |  Expeditions  |  Meu Atlas  |           [moon] [PT] [star 720 Explorador] [avatar v]    |
+------------------------------------------------------------------------------------------------------------+
                                                                                    ^              |
                                                                              Display-only     Dropdown:
                                                                              (no click)       - Perfil
                                                                                               - Minha Conta
                                                                                               ---
                                                                                               - Sair
```

**Key differences**:
- 2 nav links instead of 3 (removed "Perfil")
- Gamification badge: no arrow/link affordance, just a status pill
- Avatar dropdown: 3 items instead of 2 (added "Perfil")
- Visually lighter header with clearer hierarchy

---

## 5. Interaction States Table

### 5.1 GamificationBadge (Updated)

| User Action | Before | After |
|---|---|---|
| Hover | bg-atlas-gold/20 (color change) | No change. cursor-default. |
| Click | Navigate to /atlas | Nothing. No event handler. |
| Focus (Tab) | Focusable (link) | Not focusable (div). Skipped in tab order. |
| Screen reader | "Link: 720 Explorador" | "Status: 720 pontos, nivel Explorador" |

### 5.2 UserMenu Dropdown (Updated)

| User Action | State | Expected Behavior |
|---|---|---|
| Click avatar | Closed | Open dropdown. Focus moves to first item ("Perfil"). |
| Click "Perfil" | Open | Navigate to /profile. Close dropdown. |
| Click "Minha Conta" | Open | Navigate to /account. Close dropdown. |
| Click "Sair" | Open | Sign out. Redirect to /. |
| Press Escape | Open | Close dropdown. Return focus to avatar button. |
| Arrow Down | Open, any item focused | Move focus to next item. Wrap from last to first. |
| Arrow Up | Open, any item focused | Move focus to previous item. Wrap from first to last. |
| Tab | Open | Close dropdown (standard behavior). |
| Click outside | Open | Close dropdown. |

### 5.3 Mobile Menu (Updated)

| User Action | State | Expected Behavior |
|---|---|---|
| Tap hamburger | Closed | Open menu. |
| Tap "Expeditions" | Open | Navigate. Close menu. |
| Tap "Meu Atlas" | Open | Navigate. Close menu. |
| View gamification section | Open | Display-only. No tap handler. |
| Tap "Perfil" | Open (user section) | Navigate to /profile. Close menu. |
| Tap "Minha Conta" | Open (user section) | Navigate to /account. Close menu. |
| Tap "Sair" | Open (user section) | Sign out. |
| Press Escape | Open | Close menu. |

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA minimum, non-negotiable.

### Keyboard Navigation
- [x] GamificationBadge: NOT focusable (display-only, `role="status"`). Removed from tab order.
- [x] Tab order (desktop): Logo -> Expeditions -> Meu Atlas -> ThemeToggle -> LanguageSwitcher -> Avatar button
- [x] Avatar dropdown: `aria-haspopup="menu"`, `aria-expanded`, standard menu keyboard pattern
- [x] Dropdown items: `role="menuitem"`, Arrow Up/Down navigation, Enter/Space to activate
- [x] All dropdown items: `min-height: 44px`
- [x] Focus indicator: 2px solid ring (primary), 2px offset on all interactive elements
- [x] Escape closes dropdown, returns focus to avatar

### Screen Reader
- [x] GamificationBadge: `role="status"` with `aria-label="{points} pontos, nivel {rankName}"` -- announced as status, not interactive
- [x] Dropdown: menu role structure preserved (menu > menuitem)
- [x] "Perfil" menuitem: accessible name "Perfil" (clear destination)
- [x] Divider before "Sair": `role="separator"` (groups destructive action)
- [x] Nav links: `aria-current="page"` on active link (unchanged)

### Color and Contrast
- [x] GamificationBadge: gold text on gold/10 bg -- unchanged, already verified
- [x] Dropdown items: muted-foreground on background -- unchanged, already verified
- [x] No new color or contrast concerns (visual appearance largely unchanged)

### Touch
- [x] All nav links: existing 44px min-height (unchanged)
- [x] Avatar button: 44x44px (unchanged)
- [x] Dropdown items: 44px min-height (unchanged)
- [x] Mobile menu items: 44px min-height (unchanged)

---

## 7. Content and Copy

### Updated Labels

| Key | PT-BR | EN |
|---|---|---|
| `navigation.expeditions` | Expedicoes | Expeditions |
| `navigation.myAtlas` | Meu Atlas | My Atlas |
| `navigation.myProfile` | Perfil | Profile |
| `navigation.myAccount` | Minha Conta | My Account |
| `auth.signOut` | Sair | Sign out |
| `gamification.badge.ariaLabel` | {points} pontos, nivel {rankName} | {points} points, level {rankName} |

**Note**: `navigation.myProfile` key already exists (used in current nav link). Reuse it in the dropdown menuitem.

### Tone of Voice
- Navigation labels are short, one-word where possible. "Perfil" not "Meu Perfil" -- user context is already established by the avatar dropdown.
- "Sair" is direct and clear. Not "Encerrar sessao" (too formal for a travel app).

---

## 8. Constraints

- **Two files to modify**: `AuthenticatedNavbar.tsx` and `GamificationBadge.tsx`. UserMenu dropdown items are in `UserMenu.tsx`.
- **GamificationBadge props unchanged**: `totalPoints`, `currentLevel`, `phaseName` are still passed. Only the rendered element changes (Link -> div).
- **Mobile menu structure**: The mobile menu in `AuthenticatedNavbar.tsx` renders nav items + inline UserMenu. The "Perfil" link moves from the nav section to the UserMenu inline section.
- **No new dependencies**: This is purely a restructuring of existing elements.
- **Test impact**: Tests checking `GamificationBadge` as a link (href, click navigation) must be updated. Tests checking "Perfil" nav link in header must be updated to find it in the dropdown instead.

---

## 9. Prototype

- [ ] Prototype required: No
- **Notes**: This is a layout restructuring of existing components. The before/after wireframe descriptions in Section 4.5 provide sufficient visual guidance. No new interaction patterns are introduced.

---

## 10. Open Questions

- [ ] **GamificationBadge position in header**: Currently placed between nav links and utility controls. Should it move closer to the avatar (immediately left of avatar) to visually associate the user's score with their identity? **Recommendation**: Yes, place badge immediately left of avatar. **Needs: product-owner confirmation**
- [ ] **Badge on mobile menu**: Currently shows as a section in the mobile menu. Should it remain there (as a display-only section), or move to the top of the mobile menu as a profile summary header? **Needs: product-owner**

---

## 11. Components to Modify

| Component | Change |
|---|---|
| `AuthenticatedNavbar.tsx` | Remove "Perfil" nav link from desktop and mobile. Reorder items. |
| `GamificationBadge.tsx` | Change from `<Link>` to `<div>`. Remove href, hover, cursor. Add `role="status"`, `aria-label`. |
| `UserMenu.tsx` | Add "Perfil" as first menuitem in dropdown. Add divider before "Sair". |

### No New Components

### No Components Deprecated

---

## 12. Patterns Used

**From `docs/ux-patterns.md`**: UserMenu (dropdown, extended with "Perfil" item), GamificationBadge (modified to display-only)

**New patterns introduced**: None. This spec simplifies existing patterns rather than adding new ones.

---

> **Spec Status**: Draft
> Ready for: Architect (no technical blockers -- straightforward component modifications)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-17 | ux-designer | Initial draft. Header cleanup: move Perfil to avatar dropdown, make GamificationBadge display-only. |
