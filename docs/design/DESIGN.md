# Atlas Horizon: Sistema de Design & Design Tokens

Este documento serve como a única fonte de verdade para os elementos visuais e funcionais da plataforma **Atlas Travel Planner**. O sistema foi projetado para equilibrar a confiança de uma ferramenta de logística com a emoção de uma jornada de descoberta.

---

## 1. Princípios de Design
*   **Aventuroso, mas Confiável:** Cores vibrantes em CTAs contrastam com tons profundos de azul para transmitir segurança.
*   **Premium & Acessível:** Layouts limpos com tipografia geométrica moderna.
*   **Respiro Visual:** Generoso uso de espaços em branco e sombras suaves em camadas.

---

## 2. Paleta de Cores (Design Tokens)

### Cores Primárias
| Token | Valor Hex | Uso |
| :--- | :--- | :--- |
| `color-navy-900` | `#1a2332` | Cor principal da marca, textos e navegação (Confiança). |
| `color-amber-500` | `#f59e0b` | CTAs principais, estados ativos e acentos (Aventura). |
| `color-amber-600` | `#d97706` | Hover em botões e estados de foco. |

### Cores Secundárias & Status
| Token | Valor Hex | Uso |
| :--- | :--- | :--- |
| `color-teal-600` | `#0d9488` | Links, estados de sucesso e indicadores de IA. |
| `color-white` | `#ffffff` | Planos de fundo de cards e superfícies elevadas. |
| `color-gray-50` | `#fafafa` | Plano de fundo principal da aplicação. |
| `color-gray-200` | `#e5e7eb` | Bordas suaves e divisores. |
| `color-gray-500` | `#6b7280` | Textos de apoio e labels secundários. |

---

## 3. Tipografia

**Fonte Principal:** `Plus Jakarta Sans` (ou Sora/Outfit como alternativa)
*   **Headings (H1, H2):** Bold (700), Tracking -0.02em.
*   **Body Text:** Regular (400) / Medium (500), Line-height 1.6.

| Token | Tamanho | Peso | Uso |
| :--- | :--- | :--- | :--- |
| `font-size-display` | `36px` | Bold | Títulos Hero e Cabeçalhos de Fase. |
| `font-size-h2` | `24px` | Semibold | Títulos de Seção e Cards. |
| `font-size-body` | `16px` | Regular | Texto principal e parágrafos. |
| `font-size-small` | `14px` | Semibold | Labels de formulário e metadados. |

---

## 4. Bordas e Sombras (Surface)

### Border Radius
*   **Cards:** `16px` (`rounded-2xl`)
*   **Botões & Inputs:** `8px` (`rounded-lg`)
*   **Badges/Chips:** `9999px` (`rounded-full`)

### Sombras (Shadows)
*   **Soft Layered:** `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
*   **Elevated Card:** `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`

---

## 5. Espaçamento (Spacing)
*   **Layout Gutter:** `24px` (Mobile) / `80px+` (Desktop)
*   **Section Spacing:** `120px` (Landing Page)
*   **Card Padding:** `32px` (Generoso)

---

## 6. Componentes Core
*   **TopNavBar:** `bg-white/80 backdrop-blur-xl` com logo `Atlas` em Navy.
*   **Primary Button:** `bg-amber-500 text-white shadow-md hover:bg-amber-600 transition-all`.
*   **Input Fields:** `h-48px border-gray-200 focus:ring-amber-500`.

---

## 7. Diretrizes de IA (Visual)
*   Sempre utilizar o selo **"Powered by IA"** em sugestões automatizadas.
*   Utilizar o ícone de brilho (`sparkles`) para indicar inteligência generativa.
