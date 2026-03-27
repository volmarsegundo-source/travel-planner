# Design System Document: Sprint 38 Guidelines

## 1. Overview & Creative North Star: "The Modern Explorer"
This design system moves beyond the standard utility of a travel or logistical tool to become a **Digital Curator**. Our Creative North Star is "The Modern Explorer"—a philosophy that balances the rugged spirit of adventure with the refined precision of a premium concierge. 

To achieve this, we reject the "template" look. We break the rigid grid through **intentional asymmetry**, allowing high-contrast typography to drive the layout. We use overlapping elements and varying "optical weights" to create a sense of movement. The interface should feel like a premium editorial magazine: authoritative, airy, and deeply intentional.

---

## 2. Colors & Surface Architecture
Our palette transitions from the deep, trustworthy anchors of the night sky to the vibrant, energetic glow of a horizon.

### Core Palette
*   **Primary Navy (#040d1b):** Our foundation. Used for deep immersion, primary text, and high-authority backgrounds.
*   **Primary Orange CTA (#fe932c):** The "Spark." Used exclusively for primary actions. Always pair with Navy text (#040d1b) to maintain a bold, readable contrast.
*   **Teal Links (#005049):** The "Path." Reserved for interactive anchors and secondary navigation, ensuring WCAG AA compliance against light surfaces.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Structural boundaries must be defined through **background color shifts** or subtle tonal transitions. 
*   *Implementation:* Use `surface-container-low` (#f0f3ff) against a `background` (#f9f9ff) to define a new zone. If a visual break is needed, use white space (Scale 8 or 12) rather than a line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. 
*   **Level 0 (Base):** `surface` (#f9f9ff)
*   **Level 1 (Sections):** `surface-container-low` (#f0f3ff)
*   **Level 2 (Cards):** `surface-container-lowest` (#ffffff)
*   **Level 3 (Popovers/Modals):** `surface-bright` with Glassmorphism.

### The "Glass & Gradient" Rule
To inject "soul" into the UI, primary surfaces should utilize a 12% linear gradient from `primary` (#914d00) to `primary-container` (#fe932c). For floating elements, apply `backdrop-blur: 12px` with a 70% opacity surface fill to create a frosted-glass effect that integrates the content into the environment.

---

## 3. Typography: Editorial Authority
We pair the geometric confidence of **Plus Jakarta Sans** with the functional clarity of **Work Sans**.

*   **Display & Headlines (Plus Jakarta Sans, Bold):** Used to command attention. Use `display-lg` (3.5rem) for hero moments with tight letter-spacing (-0.02em) to create a "custom-set" editorial feel.
*   **Body & Titles (Work Sans, Regular/Medium):** Engineered for legibility. 
    *   `body-lg` (1rem) is our standard for narrative content.
    *   `title-md` (1.125rem) provides a bridge between the bold headlines and the functional body.
*   **Visual Hierarchy:** Headlines should always be `on-surface` (#121c2a), while secondary labels use `on-surface-variant` (#554336) to create tonal depth without losing legibility.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to create "lift"; we use light and tone.

*   **The Layering Principle:** A card (AtlasCard) should sit as `surface-container-lowest` (#ffffff) on top of a `surface-container` (#e7eeff) background. This creates a natural "pop" based on luminance rather than artificial drop shadows.
*   **Ambient Shadows:** If a floating state is required (e.g., a hovered card), use a diffuse "Ghost Shadow": `0px 24px 48px rgba(4, 13, 27, 0.06)`. Note the tinting—the shadow is a low-opacity version of our Navy, never pure grey.
*   **The Ghost Border:** For accessibility in high-glare environments, use the `outline-variant` (#dcc2b0) at **15% opacity**. It should be felt, not seen.

---

## 5. Components (Atlas UI Kit)

### AtlasButton
*   **Height:** 48px.
*   **Primary:** Background `#fe932c`, Text `#040d1b`, Weight `Bold`.
*   **Interaction:** On hover, apply a subtle inner-glow gradient. No heavy borders.
*   **Radius:** 8px for a professional, "tailored" look.

### AtlasInput
*   **Height:** 48px.
*   **Styling:** Background `surface-container-lowest`, Radius `8px`.
*   **Focus State:** `ring-2` with Teal (#005049) border and an Amber (#fe932c) external keyboard ring for maximum accessibility.
*   **Language:** All placeholders and helper text must be in **Brazilian Portuguese** (e.g., "Insira seu destino").

### AtlasCard & AtlasChip
*   **AtlasCard:** 16px radius (`xl`). Strictly no dividers. Content separation is achieved via `spacing-6` (1.5rem) padding.
*   **AtlasChip/Badge:** `full-round` (9999px). Used for status and categories. Use `secondary-container` (#d6e0f4) for a premium, muted look.

### AtlasList
*   **Rule:** Forbid divider lines. Use `surface-container-low` on hover to indicate interactivity. Use vertical spacing (Scale 4) to separate items.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins (e.g., larger left margin than right) for headline-heavy pages to create an editorial feel.
*   **Do** ensure all text/background combinations meet a 4.5:1 contrast ratio.
*   **Do** use "Breathing Room"—when in doubt, add more whitespace from the Spacing Scale (Scale 12 or 16).

### Don't
*   **Don't** use 1px solid borders (`#e5e7eb`) unless specifically required for form field clarity.
*   **Don't** use pure black (#000000) for text. Use Primary Navy (#040d1b) for a softer, premium feel.
*   **Don't** stack more than three levels of nested surfaces. It breaks the "Modern Explorer" simplicity.
*   **Don't** use standard ease-in-out transitions. Use a custom "Spring" curve (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for component entries to feel more adventurous and tactile.