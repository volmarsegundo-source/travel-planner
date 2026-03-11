# SPEC-UX-002: Guide Full Visibility -- UX Specification

**Version**: 1.1.0
**Status**: Approved
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect]
**Product Spec**: SPEC-PROD-001 (Phase 5 "A Conexao")
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Traveler Goal

See ALL destination guide information at a glance -- without needing to discover or expand hidden sections -- so I can quickly absorb practical travel knowledge about my destination and feel confident about what to expect.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Wants to absorb cultural tips, safety info, and local customs to feel prepared traveling alone |
| `@leisure-family` | Needs health and safety information prominently visible, not hidden behind a collapse |
| `@business-traveler` | Scans for timezone, currency, connectivity -- needs all info visible without interaction overhead |
| `@bleisure` | Values cultural tips and local customs for extending a business trip into leisure |
| `@group-organizer` | Needs to share guide info with group members; visible content is easier to screenshot/share |

## 3. User Flow

### Happy Path

1. User navigates to Phase 5 ("A Conexao")
2. If no guide exists yet, generation triggers automatically
3. During generation: skeleton loading state with 10 placeholder cards
4. Guide content renders: hero/summary banner at top, then 4 stat cards in a grid, then 6 content sections fully visible
5. User scrolls through all 10 sections -- all content is immediately readable without clicking
6. User reads AI disclaimer at the bottom
7. User clicks "Concluir fase" / "Complete phase" to proceed

```
[User enters Phase 5]
    |
    v
[Guide exists?]
   |           |
   YES         NO
   |           |
   v           v
[Render all]  [Auto-generate]
              |
              v
        [Loading skeleton: 10 card placeholders]
              |
              v
        [Guide generated -> render all sections]
    |
    v
[User scrolls and reads all 10 visible sections]
    |
    v
[User clicks "Complete phase"]
    |
    v
[Points animation -> Phase transition -> Phase 6]
```

### Alternative Paths

- **Guide already exists (return visit)**: All sections render immediately from cached data. No generate button shown.
- **User wants to regenerate**: A secondary "Regenerate" action is available at the bottom (existing behavior). It replaces all content with fresh AI output after a loading state.

### Error States

- **Generation fails (AI error)**: Error banner appears at the top of the content area: "Nao foi possivel gerar o guia. Tente novamente." / "Could not generate the guide. Please try again." A retry button is shown below the error.
- **Network unavailable**: Same error banner with retry. The "Complete phase" button is disabled until a guide is successfully loaded.
- **Partial content (some sections missing from AI response)**: Missing sections show a placeholder card: "Informacao indisponivel para esta secao." / "Information unavailable for this section." The section is still visible with its icon and title -- never silently omitted.

### Edge Cases

- **Very long AI-generated text**: Each section expands vertically to fit content. No truncation. Sections with extensive tips show all tips.
- **Empty tips array**: The tips sub-section is simply not rendered for that section. The summary and details remain visible.
- **Returning user who already completed Phase 5**: Guide is shown in read-only mode with all sections visible. "Complete phase" is replaced by a status indicator ("Fase concluida" / "Phase completed").

## 4. Screen Descriptions

### Screen 1: Destination Guide (Full Visibility Layout)

**Purpose**: Present all 10 categories of destination information in a scannable, always-visible format so the traveler absorbs key info without needing to discover hidden content.

**Layout -- Top to Bottom**:

1. **Progress bar** (existing ExpeditionProgressBar at top)

2. **Phase header**: Title "A Conexao" / "The Connection" + subtitle with destination name. Centered.

3. **Hero summary banner**: A highlighted card at the top that pulls key highlights. Contains:
   - Destination name (large, bold)
   - 3-4 quick facts in a horizontal row: timezone offset, currency symbol, primary language, plug type
   - Background: subtle gradient or accent-colored card to distinguish from the sections below
   - This banner summarizes the 4 stat cards' most essential data at a glance

4. **Stat cards grid** (2x2): Timezone, Currency, Language, Electricity
   - Each card shows: icon, title (bold), summary text
   - If tips exist, they appear as a bulleted list below the summary within the same card
   - Cards are NOT collapsible -- content is always visible
   - Compact but complete: icon top, title middle, summary + tips bottom

5. **Content sections** (6 vertical cards): Connectivity, Cultural Tips, Safety, Health, Transport Overview, Local Customs
   - Each section is a full card with:
     - Left accent border (colored by category -- see below)
     - Icon + title in the card header
     - Summary paragraph
     - Details paragraph (if available)
     - Tips as a bulleted list
   - Sections are NOT collapsible -- all content is always visible
   - Generous vertical spacing between sections for scannability

6. **AI disclaimer**: Italic, muted text. Centered below all sections.

7. **Action area**: "Complete phase" primary button, full width. "Regenerate" secondary/outline button below it.

**Category color coding for left accent borders**:
- Connectivity: blue (#3B82F6)
- Cultural Tips: amber (#F59E0B)
- Safety: green (#22C55E)
- Health: red (#EF4444)
- Transport Overview: indigo (#6366F1)
- Local Customs: purple (#A855F7)

These colors are used ONLY for the left accent border (4px). All text remains standard foreground/muted colors. The accent border serves as a visual landmark for scanning, not as information-carrying color.

**Content**:
- All text is AI-generated and locale-specific (PT-BR or EN)
- Section titles come from the AI response's `title` field
- Icons come from the AI response's `icon` field (emoji)
- Tips are bullet-pointed lists

**Interactive Elements**:

- **Stat cards**: Non-interactive (previously clickable/expandable -- now always expanded). Remove click handlers. Remove `aria-expanded`. Remove chevron icons.
- **Content sections**: Non-interactive (previously collapsible -- now always expanded). Remove click handlers. Remove `aria-expanded`. Remove chevron icons.
- **Complete phase button**: Primary action. States: default, hover, loading (spinner + "Salvando..."), disabled (during loading).
- **Regenerate button**: Secondary/outline action. States: default, hover, loading (spinner + text), disabled (during generation).

**Empty State**: Before guide generation, show a centered message with a large destination emoji/icon: "Estamos preparando o guia do seu destino..." / "We're preparing your destination guide..." with a loading skeleton of 10 card placeholders.

**Loading State (generation in progress)**:
- Hero banner: skeleton rectangle (height ~80px, full width)
- Stat cards: 4 skeleton cards in 2x2 grid (each ~100px tall)
- Content sections: 6 skeleton cards stacked vertically (each ~120px tall)
- Skeleton colors: `bg-muted animate-pulse` (light) / `bg-muted/50 animate-pulse` (dark)
- With `prefers-reduced-motion`: skeleton shows static muted background, no pulse animation

**Error State**: Error banner (not blocking the full page):
```
[Warning icon] Nao foi possivel gerar o guia. Tente novamente.
               [Tentar novamente] (button)
```
The error banner appears where the guide content would be. Tone is never blaming.

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Hero banner stacks quick facts vertically (2 per row). Stat cards stack to 1 column (4 cards full-width). Content sections are full-width cards. All content scrolls vertically. Generous padding (16px sides). |
| Tablet (768-1024px) | Hero banner shows 4 quick facts in one row. Stat cards in 2x2 grid. Content sections full-width. |
| Desktop (> 1024px) | Hero banner shows 4 quick facts in one row. Stat cards in 2x2 grid (max-width 640px centered or left-aligned in wider layout). Content sections max-width 640px. Consider 2-column layout for content sections if viewport allows. |

## 5. Interaction Patterns

- **Screen transitions**: Entry to Phase 5 uses the unified phase transition pattern (see SPEC-UX-003).
- **Loading feedback**: Skeleton cards during AI generation. Progress is not deterministic (AI streaming), so no percentage bar -- skeleton pulse communicates "working on it."
- **Success feedback**: Content replaces skeleton atomically (all sections appear at once, not one by one).
- **Error feedback**: Inline error banner with retry button. No toast (error persists until resolved).
- **Animation**: Skeleton pulse only. No entrance animations for sections. With `prefers-reduced-motion`: static skeleton.
- **Progressive disclosure**: NONE. This is the core change -- all 10 sections are always visible. No collapse, no accordion, no tabs.

## 6. Accessibility Requirements (MANDATORY)

- **WCAG Level**: AA (minimum, non-negotiable)
- **Keyboard Navigation**:
  - [ ] "Complete phase" and "Regenerate" buttons reachable via Tab
  - [ ] Tab order: progress bar -> hero banner (decorative, skip) -> stat cards (non-interactive, skip) -> content sections (non-interactive, skip) -> AI disclaimer (skip) -> Regenerate button -> Complete phase button
  - [ ] Focus indicator visible on all interactive elements (2px solid primary, outline-offset 2px)
  - [ ] No keyboard traps
- **Screen Reader**:
  - [ ] Phase title announced as h1
  - [ ] Hero banner quick facts use a description list (`dl`/`dt`/`dd`) or similar semantic structure
  - [ ] Each stat card section uses h2 or h3 heading for the section title
  - [ ] Each content section uses h2 or h3 heading for the section title
  - [ ] Tips lists use semantic `ul`/`li`
  - [ ] AI disclaimer is announced (not hidden)
  - [ ] Skeleton loading state has `aria-busy="true"` on the container and a visually hidden `aria-live="polite"` region announcing "Gerando guia..." / "Generating guide..."
  - [ ] Decorative emoji icons have `aria-hidden="true"` (existing)
- **Color & Contrast**:
  - [ ] All text on card backgrounds passes 4.5:1 in both light and dark themes. **Note:** Where `bg-primary` is used (e.g., active/selected states), text MUST use a dark color (`text-black` or `text-primary-foreground` configured for 4.5:1 contrast) in dark mode to ensure WCAG compliance.
  - [ ] Left accent borders are decorative (color is not the sole information carrier -- each section also has a unique icon and title)
  - [ ] Hero banner text on gradient/accent background must pass 4.5:1
- **Motion**:
  - [ ] Skeleton pulse animation respects `prefers-reduced-motion` (use `motion-safe:animate-pulse`)
  - [ ] Points animation (+50 bulk award) respects `prefers-reduced-motion` (use `motion-safe:animate-bounce`)
- **Touch**:
  - [ ] "Complete phase" and "Regenerate" buttons are at least 44px tall
  - [ ] No small touch targets since sections are non-interactive

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `page_title` | A Conexao | The Connection |
| `page_subtitle` | Guia completo do seu destino | Complete guide to your destination |
| `hero_title` | Guia de {destination} | Guide to {destination} |
| `cta_complete` | Concluir fase | Complete phase |
| `cta_regenerate` | Gerar novamente | Regenerate |
| `loading_hint` | Estamos preparando o guia do seu destino... | We're preparing your destination guide... |
| `loading_sr` | Gerando guia do destino... | Generating destination guide... |
| `ai_disclaimer` | Conteudo gerado por IA. Verifique informacoes importantes antes da viagem. | AI-generated content. Verify important information before traveling. |
| `section_unavailable` | Informacao indisponivel para esta secao. | Information unavailable for this section. |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Generation failed | Nao foi possivel gerar o guia. Tente novamente. | Could not generate the guide. Please try again. |
| Network error | Sem conexao. Verifique sua internet e tente novamente. | No connection. Check your internet and try again. |

### Tone of Voice

- Informative and reassuring. The guide is a trust-builder -- travelers should feel well-prepared.
- AI disclaimer is honest but not alarming. It acknowledges AI generation without undermining confidence.
- Error messages always offer a path forward (retry button).

## 8. Constraints (from Product Spec)

- Phase 5 data is AI-generated via `generateDestinationGuideAction` (SPEC-PROD-001 Phase Data Ownership)
- 10 guide section keys are fixed: timezone, currency, language, electricity, connectivity, cultural_tips, safety, health, transport_overview, local_customs
- Guide auto-generates on first visit (existing behavior, keep it)
- Remove the manual "Generate" button for first visit (auto-trigger replaces it)
- Remove the "Update guide" / "Atualizar guia" button -- guide should auto-update when underlying data changes (per ITEM-2 requirements). Keep "Regenerate" as an explicit manual override.
- **Stakeholder decision (Q1):** Points for all 10 sections (+50 total) are awarded in bulk when the guide loads successfully. No per-section click tracking needed. The +50 points are awarded as a single transaction when the guide content is rendered (either from cache or after generation). The points animation shows "+50" once, not 10 individual "+5" animations.

## 9. Prototype

- [ ] Prototype required: No
- **Notes**: The layout changes are well-defined by the wireframe description above. The key change is removing collapse behavior and making all sections statically visible. CSS changes are straightforward (remove click handlers, remove chevrons, show all content blocks). A prototype would not add significant validation value beyond the spec.

## 10. Open Questions (RESOLVED)

- [x] **Q1 resolved:** Points for all 10 sections (+50 total) are awarded in bulk when the guide loads successfully. No per-section click tracking needed. Confirmed by stakeholder.
- [x] **Hero banner resolved:** Pull structured data from stat sections (timezone, currency, language, plug type) for consistency and reliability. No separate AI-generated summary sentence.
- [x] **Tips limit resolved:** Show all tips with no artificial limit. If content is long, the user scrolls. No "Show more" pattern -- full visibility is the core principle of this spec.

---

## Dark Theme Considerations

- Stat cards: `bg-card` background, `border-border` border. Text: `text-foreground` for titles, `text-muted-foreground` for summaries. All adapt via Tailwind dark mode.
- Content section cards: Same as stat cards, plus left accent border colors. The accent border colors (blue, amber, green, red, indigo, purple) are vivid enough to work on both light and dark backgrounds without adjustment.
- Hero banner: Use a subtle gradient from `bg-card` to a slightly tinted variant. Avoid heavy background colors that could create contrast issues. Alternative: use a bordered card with a top accent stripe instead of a full gradient.
- Skeleton: `motion-safe:animate-pulse bg-muted` on light; `motion-safe:animate-pulse bg-muted/50` on dark.
- Tips bullet markers: Use `text-muted-foreground` (adapts to dark). Do NOT use the category accent color for bullets (too colorful, distracting in dark mode).

## Motion Specifications

- **Skeleton pulse**: `motion-safe:animate-pulse` (Tailwind built-in). Duration: default (2s cycle). Reduced motion: static muted background.
- **Points badge (+50 bulk)**: `motion-safe:animate-bounce` for 2 seconds, then fade out. Reduced motion: static badge, no bounce, disappears after 2 seconds. Single "+50" animation replaces the per-section "+5" (stakeholder decision Q1).
- **Section appearance after generation**: No entrance animation. Content replaces skeleton instantly. This is deliberate -- 10 sections animating in would be overwhelming and slow.
- **Regenerate action**: Same skeleton loading state as initial generation. Existing content fades to skeleton, then new content replaces it.

---

> **Spec Status**: Approved
> Ready for: Task breakdown

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | ux-designer | Initial draft -- remove collapsible sections, full visibility layout |
| 1.1.0 | 2026-03-11 | tech-lead | Approved with stakeholder decisions: Q1 (bulk +50 points on guide load), bg-primary contrast note for dark mode, open questions closed |
