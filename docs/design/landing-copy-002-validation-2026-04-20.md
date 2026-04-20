# SPEC-LANDING-COPY-002 — Validacao UX e Traducao EN

**Autor**: ux-designer | **Data**: 2026-04-20 | **Status**: Validado

---

## 1. Mapeamento componente / elemento / estilo

| ID | Chave i18n | Componente | Elemento | Classes relevantes |
|----|-----------|------------|----------|-------------------|
| C2-01 | `landingV2.hero.badge` | HeroSectionV2.tsx L41 | `<span>` (pill) | `text-xs font-bold uppercase tracking-widest` |
| C2-03 | `landingV2.hero.subtitle` | HeroSectionV2.tsx L51 | `<p>` | `text-base md:text-lg lg:text-xl max-w-2xl leading-relaxed` |
| C2-04 | `landingV2.ai.title` | AiSectionV2.tsx L19 | `<h2>` | `text-4xl md:text-5xl font-bold leading-tight` |
| C2-05 | `landingV2.ai.description` | AiSectionV2.tsx L22 | `<p>` | `text-lg leading-relaxed` |
| C2-06 | `landingV2.ai.feature1` | AiSectionV2.tsx L27 | `<span>` dentro de `<li>` | `font-atlas-body` (inline) |
| C2-07 | `landingV2.ai.feature2` | AiSectionV2.tsx L27 | `<span>` dentro de `<li>` | `font-atlas-body` (inline) |
| C2-08 | `landingV2.ai.feature3` | AiSectionV2.tsx L27 | `<span>` dentro de `<li>` | `font-atlas-body` (inline) |
| C2-09 | `landingV2.phases.subtitle` | PhasesSectionV2.tsx L70 | `<p>` | `text-atlas-on-surface-variant font-atlas-body leading-relaxed` (max-w-3xl container) |

---

## 2. Avaliacao de comprimento e risco mobile (375px)

| ID | Atual (chars) | Novo PT (chars) | Delta | Veredito |
|----|--------------|-----------------|-------|----------|
| C2-01 | 27 | 30 | +3 | OK — pill com uppercase xs cabe bem |
| C2-03 | 130 | 99 | -31 | OK — mais curto, reduz wrapping |
| C2-04 | 34 | 25 | -9 | OK — titulo mais conciso, excelente |
| C2-05 | 122 | 122 (manter) | 0 | ver secao 4 |
| C2-06 | 37 | 33 | -4 | OK |
| C2-07 | 44 | 42 | -2 | OK |
| C2-08 | 42 | 28 | -14 | OK — muito mais limpo |
| C2-09 | 118 | 79 | -39 | OK — melhor em mobile, sem ponto final (correto para subtitulo) |

Nenhum texto novo ultrapassa o comprimento atual. Hierarquia tipografica mantida: badge < subtitle < features < section subtitle.

---

## 3. Tabela de traducao EN

| ID | PT Atual | EN Atual | EN Proposto |
|----|---------|----------|-------------|
| C2-01 | "A Nova Era do Planejamento" | "The New Era of Planning" | **"From start to finish, your way"** |
| C2-03 | "Planeje viagens incriveis..." | "Plan amazing trips in minutes — easy, smart, and fun. AI handles the details, you enjoy the adventure." | **"Trips that match who you are. Organize everything in one place, with recommendations tailored to your profile."** |
| C2-04 | "Ferramentas de planejamento com IA" | "AI-powered planning tools" | **"Organize, discover, travel"** |
| C2-05 | (manter — ver secao 4) | (ver secao 4) | (ver secao 4) |
| C2-06 | "Geracao de roteiro dia a dia completo" | "Complete day-by-day itinerary generation" | **"Itineraries that adapt to you"** |
| C2-07 | "Checklist inteligente de documentos e vistos" | "Smart document and visa checklist" | **"Personalized checklist for every trip"** |
| C2-08 | "Guia detalhado do destino com dicas locais" | "Detailed destination guide with local tips" | **"Personalized destination guide"** |
| C2-09 | "Nossa metodologia proprietaria..." | "Our proprietary methodology ensures nothing is forgotten, turning each step into a seamless experience." | **"Turn every phase of your trip into a seamless experience tailored to you"** |

---

## 4. Decisao C2-05 (ai.description)

**PT atual**: "Gere roteiros completos, checklists de documentos e guias de destino — tudo personalizado para o perfil da sua viagem."
**EN atual**: "Generate complete itineraries, document checklists, and destination guides — all personalized to your trip profile."

Avaliacao: o texto PT nao menciona "IA" explicitamente, porem o verbo "Gere" (imperativo de gerar) combinado com o titulo da secao que agora sera "Organize, descubra, viaje" cria incoerencia — o titulo sugere acao do usuario, mas "Gere roteiros" implica geracao automatica.

**Recomendacao**: reescrita leve para alinhar com o tom da secao.

| | PT | EN |
|---|---|---|
| Proposto | "Roteiros completos, checklists de documentos e guias de destino — tudo personalizado para o perfil da sua viagem." | "Complete itineraries, document checklists, and destination guides — all personalized to your trip profile." |

Mudanca minima: remover "Gere" e iniciar com substantivo. Mantem sentido, remove imperativo de geracao, zero mencao a IA.

---

## 5. Sinalizacao de adjacencias com mencao a IA

| Elemento | Texto | Menciona IA? | Acao |
|----------|-------|-------------|------|
| `hero.secondaryCta` | "Como Funciona" / "How It Works" | Nao | Nenhuma |
| `gamification.explanation` (L2504) | "...gerar roteiros, checklists e guias de destino com IA" | **SIM** | Sinalizar PO — fora de escopo desta spec mas deve entrar em COPY-003 |
| `phase4Reordered.description` (L2482) | "...otimizado por IA..." | **SIM** | Sinalizar PO — mesma situacao |

---

> Validado. Pronto para implementacao pelo dev.
