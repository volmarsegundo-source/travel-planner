# Atlas — Google Stitch Pilot Prompts

> **How to use:** Copy each prompt into [stitch.withgoogle.com](https://stitch.withgoogle.com). Use **Experimental Mode** (Gemini 2.5 Pro) for best results. After generating, iterate with the chat to refine details.

---

## 🎯 Design Context (paste this as a preamble in the Stitch chat before generating)

```
DESIGN CONTEXT — Atlas Travel Planner

Atlas is a Brazilian travel planning web application (Next.js + Tailwind CSS) that guides users through their entire trip — from inspiration to itinerary — using AI-powered recommendations. The UI language is Brazilian Portuguese.

Brand personality: Adventurous yet trustworthy. Premium but accessible. The app feels like a seasoned travel companion, not a corporate booking tool.

Design system guidelines:
- Style: Modern, clean, warm. Avoid cold/corporate aesthetics.
- Primary palette: Deep navy (#1a2332) for trust, warm amber/gold (#f59e0b / #d97706) for adventure accents, soft white (#fafafa) backgrounds, muted teal (#0d9488) for success states.
- Typography: A distinctive sans-serif display font (e.g., Outfit, Plus Jakarta Sans, or Sora) for headings. Clean readable body font (e.g., DM Sans or Nunito). Never use Inter, Roboto, or Arial.
- Border radius: Rounded (12-16px for cards, 8px for inputs, full-round for badges/chips).
- Shadows: Soft, layered (not harsh drop shadows).
- Spacing: Generous whitespace — the app should breathe.
- Icons: Lucide icon set, consistent 20-24px stroke style.
- Imagery: Travel photography with warm color grading, slightly desaturated for elegance.
- Responsive: Mobile-first, but this prompt is for the desktop (1440px) layout.

Key product details:
- 8 trip phases: A Inspiração → O Perfil → O Preparo → A Logística → Guia do Destino → Roteiro → (2 Coming Soon)
- Gamification: "Pontos Atlas" currency, RPG levels (Novato → Lendário), badges
- AI-powered: Claude generates travel plans, checklists, and itineraries
- Target: Brazilian solo travelers and small groups
- Value prop: "A única plataforma que acompanha sua viagem do início ao fim"
```

---

## PROMPT 1 — Landing Page + Login

```
Design a premium landing page for "Atlas" — a Brazilian AI-powered travel planning web app. Desktop layout, 1440px wide. All text in Brazilian Portuguese.

PAGE STRUCTURE (top to bottom):

SECTION 1 — HERO (full viewport height)
- Top navigation bar: Atlas logo (a stylized compass/globe mark + "Atlas" wordmark) on the left. Navigation links on the right: "Funcionalidades", "Como Funciona", "Preços". A "Entrar" text link and a prominent "Começar Grátis" CTA button with amber/gold background.
- Hero content centered: Large heading "Sua próxima aventura começa aqui" with a subtle gradient text effect (navy to teal). Subheading below: "Planeje viagens inteligentes com IA — do sonho ao roteiro em minutos." 
- Two CTAs side by side: Primary "Criar Minha Expedição" (amber/gold, large) and secondary "Ver Como Funciona" (outlined, navy).
- Behind the text: a subtle, semi-transparent collage of travel destinations (world map contour lines, faint compass rose, or abstract topographic patterns) — NOT a stock photo. Think atmospheric texture.
- A floating preview card showing a mini trip card: "Rio de Janeiro → Lisboa • 12 dias • 2 viajantes" with a small progress bar and phase indicators, slightly rotated for dynamism.

SECTION 2 — SOCIAL PROOF BAR
- A thin horizontal strip with: "Mais de 2.000 expedições planejadas" • "4.8 ★ avaliação dos viajantes" • "Roteiros em 45+ países"
- Subtle animated counting numbers.

SECTION 3 — HOW IT WORKS (3 steps)
- Section heading: "Planeje em 3 passos simples"
- Three cards in a row, each with:
  1. Icon (sparkles) + "Inspire-se" + "Diga para onde quer ir e a IA cria seu plano personalizado"
  2. Icon (sliders) + "Personalize" + "Ajuste preferências, orçamento e estilo de viagem"
  3. Icon (map) + "Explore" + "Receba roteiro dia-a-dia, checklist e guia do destino"
- Cards have a soft glass-morphism effect with subtle hover elevation.

SECTION 4 — FEATURE SHOWCASE
- Heading: "Tudo que você precisa em um só lugar"
- A 2x2 bento grid layout showcasing:
  - Top-left (large): "Roteiro Inteligente" — AI-generated day-by-day itinerary preview with a mini map
  - Top-right: "Guia do Destino" — destination tips card with weather, currency, safety info
  - Bottom-left: "Checklist de Preparo" — animated checklist with checkmarks
  - Bottom-right (large): "Gamificação" — showing Pontos Atlas badge, level progress bar (Aventureiro level), and achievement badges
- Each card has its own subtle background gradient and a small "Powered by IA" tag.

SECTION 5 — CTA BANNER
- Full-width warm gradient banner (amber to soft orange).
- "Pronto para explorar o mundo?" heading in white.
- "Comece sua primeira expedição grátis — sem cartão de crédito" subtitle.
- Large white "Começar Agora" button.

SECTION 6 — FOOTER
- Dark navy background.
- Atlas logo + tagline "Do sonho ao destino, com inteligência."
- Three columns: Produto (Funcionalidades, Preços, Roadmap), Suporte (FAQ, Contato, Status), Legal (Termos, Privacidade, LGPD).
- Social icons row. "© 2026 Atlas Travel Planner"

DESIGN REQUIREMENTS:
- Color palette: Deep navy (#1a2332), warm amber (#f59e0b), teal accents (#0d9488), soft white (#fafafa).
- Typography: Modern geometric sans-serif for headings (bold, large), clean sans-serif for body.
- Generous padding between sections (80-120px).
- Subtle scroll-based parallax feel in section transitions.
- Cards with 16px border-radius and soft layered shadows.
- The overall feeling should be: "This is a premium product I can trust with my travel plans."
```

---

## PROMPT 2 — Phase 1: "A Inspiração" (Trip Creation Wizard)

```
Design an interactive trip creation wizard screen for "Atlas" travel planning app. This is Phase 1 called "A Inspiração" (The Inspiration). Desktop layout, 1440px wide. All text in Brazilian Portuguese.

LAYOUT STRUCTURE:

TOP BAR (sticky)
- Left: Atlas logo (small) + breadcrumb: "Minhas Expedições > Nova Expedição > A Inspiração"
- Right: User avatar circle with initials, Pontos Atlas counter showing "180 PA" with a small golden coin icon, and notification bell.

PROGRESS INDICATOR (below top bar)
- A horizontal stepper/progress bar showing all 8 phases as connected nodes:
  1. "A Inspiração" (ACTIVE — filled amber circle with glow effect)
  2. "O Perfil" (upcoming — outlined gray)
  3. "O Preparo" (upcoming)
  4. "A Logística" (upcoming)
  5. "Guia do Destino" (upcoming)
  6. "Roteiro" (upcoming)
  7-8. Two nodes with lock icons (Coming Soon)
- Connecting lines between nodes. Active phase has a subtle pulse animation.
- Below the active node: phase name "A Inspiração" in amber, and a subtitle: "Fase 1 de 8"

MAIN CONTENT (centered, max-width ~800px)
- Phase heading: "De onde vem sua inspiração?" in large display font
- Subtitle: "Conte-nos sobre sua viagem dos sonhos. A IA vai cuidar do resto." in muted gray.

FORM CARD (elevated white card with soft shadow, 16px border-radius, generous internal padding):

  FIELD 1 — Origin
  - Label: "De onde você parte?" 
  - An autocomplete search input with a map-pin icon on the left, placeholder text "São Paulo, Brasil"
  - Below the input: a small "📍 Usar localização do perfil" link in teal.

  FIELD 2 — Destination
  - Label: "Para onde você quer ir?"
  - Same autocomplete input style with a plane-takeoff icon, placeholder "Busque uma cidade ou país..."
  - Below: a row of 4-5 "inspiration chips" with tiny flag emojis: "🇵🇹 Lisboa", "🇮🇹 Roma", "🇯🇵 Tóquio", "🇦🇷 Buenos Aires", "🇬🇷 Santorini" — these are quick-select suggestions with hover effect.

  FIELD 3 — Travel Dates
  - Label: "Quando você quer viajar?"
  - Two date inputs side by side: "Data de ida" and "Data de volta" with calendar icons.
  - Between them: a small badge showing calculated trip duration "12 dias" that updates dynamically.
  - Below: a "Datas flexíveis?" toggle switch with label.

  FIELD 4 — Travelers
  - Label: "Quem vai nessa aventura?"
  - A passenger selector component:
    - Row: "Adultos (18+)" with minus/plus stepper buttons and count "2"
    - Row: "Crianças (2-17)" with minus/plus stepper and count "0"  
    - Row: "Bebês (0-2)" with minus/plus stepper and count "0"
  - To the right: a small summary badge "2 viajantes"

  DIVIDER LINE (subtle)

  FIELD 5 — Trip Style (optional)
  - Label: "Que tipo de viagem você imagina?" with an "(opcional)" tag
  - A row of selectable chip/pill buttons with icons:
    "🏖️ Praia & Relax" | "🏛️ Cultura & História" | "🍕 Gastronomia" | "🌿 Natureza & Aventura" | "🛍️ Compras" | "💑 Romântica"
  - Chips use outlined style by default, filled amber when selected. Multiple selection allowed.

BOTTOM ACTION BAR (inside the card)
- Right-aligned: Large primary button "Avançar →" (amber/gold background, white text, slight shadow, 12px border-radius).
- Left-aligned: subtle "Salvar rascunho" text link in gray.

RIGHT SIDEBAR (optional floating element)
- A small floating "tip card" with a lightbulb icon: "💡 Dica: Quanto mais detalhes você fornecer, melhor será o plano gerado pela IA!" — soft yellow background, rounded, with a subtle shadow.

DESIGN REQUIREMENTS:
- Color palette: Navy (#1a2332) for text and navigation, amber (#f59e0b) for CTAs and active states, teal (#0d9488) for links and secondary actions, white (#ffffff) card on soft gray (#f5f5f5) background.
- Inputs: 48px height, 8px border-radius, 1px border #e5e7eb, focus state with amber ring.
- The form should feel spacious and inviting — not like a bureaucratic form. Travel planning should feel exciting.
- Subtle decorative elements: maybe a faint compass rose watermark in the card background, or subtle topographic pattern on the page background.
- Typography: Display heading 32-36px bold, form labels 14px semibold, body 16px regular.
- The card should have a gentle entrance animation feel (slide up + fade in).
```

---

## 📋 After Generating — Refinement Checklist

Use the Stitch chat to iterate on these points:

1. **Color consistency** — Ensure amber (#f59e0b) is used consistently for all primary actions
2. **Typography hierarchy** — Headings should feel bold and adventurous, body text clean and readable
3. **Whitespace** — If sections feel cramped, ask: "Add more vertical padding between form fields"
4. **Portuguese text** — Verify all labels and copy are in natural Brazilian Portuguese
5. **Responsiveness** — Ask Stitch to generate a mobile (375px) variant of each screen
6. **Dark mode** — Optionally ask for a dark variant using navy (#1a2332) as background

## 🔗 Next Steps After Pilot

If you're happy with the results:

1. **Export DESIGN.md** from Stitch to capture the design tokens
2. **Copy to Figma** for any manual refinements
3. **Set up Stitch MCP** in Claude Code:
   ```json
   {
     "mcpServers": {
       "stitch": {
         "command": "npx",
         "args": ["@_davideast/stitch-mcp", "proxy"]
       }
     }
   }
   ```
4. Install the React components skill:
   ```bash
   npx skills add google-labs-code/stitch-skills --skill react:components --global
   ```
5. Have the fullstack-dev agents consume the DESIGN.md + exported HTML/CSS to implement the screens in the Atlas codebase.
