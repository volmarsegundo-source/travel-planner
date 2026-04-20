# Forgot Password — Layout Recommendation

**Data**: 2026-04-20 | **Autor**: ux-designer | **Status**: Aguardando decisao PO

---

## 1. Estado Atual das 3 Paginas Auth (Sprint 40 V2)

| Pagina | BrandPanel | Mobile header | Link cross-nav | Link signup |
|--------|-----------|---------------|----------------|-------------|
| `/auth/login` (LoginFormV2) | Sim (60% esq, desktop) | Logo Atlas (lg:hidden) | "Esqueceu senha?" inline | "Nao tem conta? Cadastre-se" (rodape) |
| `/auth/register` (RegisterFormV2) | Sim (60% esq, desktop) | Logo Atlas (lg:hidden) | — | "Ja tem conta? Entrar" (rodape) |
| `/auth/forgot-password` (ForgotPasswordForm) | Sim (60% esq, desktop) | **Nenhum** | "Voltar ao login" (topo) | **Nenhum** |

**Lacunas do forgot-password**: (1) sem logo mobile, (2) sem link "Cadastre-se gratis", (3) sem LanguageSwitcher.

---

## 2. Opcao (A) — Header/Footer de marketing (LandingNav + FooterV2)

### Desktop 1440px
```
+------------------------------------------------------------------+
| [Compass] Atlas    [LanguageSwitcher] [Entrar] [Cadastre-se]     | <- LandingNav
+------------------------------------------------------------------+
| BrandPanel 60%            |  Form panel 40%                      |
| (gradiente + logo)        |  [<- Voltar ao login]                |
|                           |  Recuperar senha                     |
|                           |  [email input]                       |
|                           |  [Enviar link]                       |
+------------------------------------------------------------------+
| FooterV2                                                         |
+------------------------------------------------------------------+
```

### Mobile 375px
```
+-------------------------------+
| [Compass] Atlas  [EN] [Entrar]| <- LandingNav sticky
+-------------------------------+
| [<- Voltar ao login]          |
| Recuperar senha               |
| [email input]                 |
| [Enviar link]                 |
+-------------------------------+
| FooterV2                      |
+-------------------------------+
```

**Pros**: Visibilidade maxima de "Cadastre-se"; LanguageSwitcher presente; SEO/navegacao completa.
**Contras**: Quebra consistencia com login/register (que NAO tem LandingNav); adiciona ~128px de chrome vertical; exige mudar auth layout.tsx ou criar layout especifico so para forgot-password; se aplicar apenas aqui, cria inconsistencia entre paginas auth.

---

## 3. Opcao (B) — Nav interna no form panel (consistente com Sprint 40 V2)

### Desktop 1440px
```
+------------------------------------------------------------------+
| BrandPanel 60%            |  Form panel 40%                      |
| (gradiente + logo)        |  [<- Voltar]     [Cadastre-se gratis]| <- nav row
|                           |                                      |
|                           |  Recuperar senha                     |
|                           |  [email input]                       |
|                           |  [Enviar link]                       |
+------------------------------------------------------------------+
```

### Mobile 375px
```
+-------------------------------+
| [Compass] Atlas               | <- mobile header (como login/register)
+-------------------------------+
| [<- Voltar]   [Cadastre-se]   | <- nav row
|                               |
| Recuperar senha               |
| [email input]                 |
| [Enviar link]                 |
+-------------------------------+
```

**Pros**: Consistencia total com login e register (mesmo layout split-screen, mesmo pattern de mobile header); menor esforco (apenas adicionar mobile header + link "Cadastre-se" no ForgotPasswordForm); sem mudanca no auth layout.
**Contras**: Sem LanguageSwitcher (login/register tambem nao tem — seria debt separado); Footer ausente (idem).

---

## 4. Recomendacao UX: Opcao (B)

**Justificativa**:
1. **Consistencia** — Login e Register ja usam o pattern split-screen sem header externo. Aplicar LandingNav somente ao forgot-password criaria uma experiencia visual fragmentada. Para aplicar (A) de forma coerente, seria necessario refatorar as 3 paginas — escopo muito maior.
2. **Esforco proporcional** — (B) resolve as 2 lacunas do PO (logo mobile + link signup) com alteracao em 1 arquivo (ForgotPasswordForm.tsx). (A) exige alterar layout.tsx ou criar sub-layout.
3. **Conversao** — O link "Cadastre-se gratis" fica no topo-direito do form panel, visivel sem scroll. Posicao equivalente ao "Nao tem conta?" do login.
4. **Acessibilidade** — Touch target 44px, Link semantico, foco visivel. Sem impacto negativo.

**Impacto nas outras paginas**: Nenhum obrigatorio. Porem, recomendo adicionar LanguageSwitcher ao mobile header de login/register/forgot-password como melhoria futura (debt ticket).

---

## 5. Tokens do Atlas Design System aplicaveis

- Headline: `font-atlas-headline`
- Link cor: `text-atlas-on-tertiary-fixed-variant` (teal — mesmo do "Esqueceu senha?" no login)
- Link hover: `hover:underline underline-offset-2`
- Mobile header: `text-atlas-secondary-container` (icone) + `text-atlas-primary` (texto "Atlas")
- Touch target: `min-h-[44px]` em todos os links interativos

---

Decisao do PO pendente.
