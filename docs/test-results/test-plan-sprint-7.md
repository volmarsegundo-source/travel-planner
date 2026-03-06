# Sprint 7 — Plano de Testes

**Gerado em:** 2026-03-05
**Áreas afetadas:** i18n, account
**Arquivos modificados:** 21

---

## Ambiente de Teste

| Item | Valor |
|------|-------|
| OS | Windows 11 |
| Node.js | 20+ |
| Browser | Chrome (latest) |
| Viewport Desktop | 1280×720 |
| Viewport Mobile | 375×667 |
| Database | PostgreSQL 16 (Docker) |
| Cache | Redis 7 (Docker) |

### Pré-requisitos
- [ ] Docker Desktop rodando (postgres + redis healthy)
- [ ] `npm run dev:setup` executado
- [ ] `npm run dev` rodando (http://localhost:3000)

---

## Happy Path — Cenários Principais

> Testar o fluxo ideal de cada funcionalidade nova/modificada.

### Conta / Perfil
- [ ] Acessar /account → formulário carrega com dados atuais
- [ ] Editar nome → salvar → feedback de sucesso
- [ ] Trocar idioma preferido → salvar → aplicado na próxima visita
- [ ] Excluir conta → modal confirmação → digitar email → conta removida

---

## Edge Cases — Casos Limite

> Testar condições de contorno, inputs inválidos e estados inesperados.

### Validação de Formulários
- [ ] Campos obrigatórios vazios → mensagem de erro visível
- [ ] Email com formato inválido → rejeitar
- [ ] Texto excedendo limite máximo → truncar ou rejeitar
- [ ] Caracteres especiais em inputs → sanitizado corretamente
### Conta Edge Cases
- [ ] Nome com menos de 2 caracteres → erro de validação
- [ ] Nome com mais de 100 caracteres → erro de validação
- [ ] Excluir conta com email incorreto → modal rejeita
- [ ] Submeter formulário sem alterações → comportamento gracioso
### Estados de Erro
- [ ] API offline / timeout → mensagem de erro amigável
- [ ] Perda de conexão durante operação → feedback ao usuário
- [ ] Sessão expirada → redirect para login

---

## Regressão — Funcionalidades Existentes

> Verificar que funcionalidades de sprints anteriores continuam funcionando.

### Core (sempre testar)
- [ ] Landing page carrega corretamente
- [ ] Fluxo completo: register → login → /trips → logout
- [ ] LanguageSwitcher funciona (EN ↔ PT-BR)
- [ ] Navbar autenticada com links funcionais
- [ ] Breadcrumbs navegáveis em todas as páginas
- [ ] Páginas 404 customizadas com i18n
- [ ] Auth guard: usuário não logado → redirect para login
### Infraestrutura
- [ ] `npm run build` → build limpo sem erros
- [ ] `npx vitest run` → todos os testes passam
- [ ] `npm run lint` → sem erros (warnings aceitos)
- [ ] Console do browser sem erros (exceto hydration warnings conhecidos)

---

## Mobile / Responsivo (375px + 393px)

> Testar em viewport mobile (DevTools → Toggle Device → iPhone SE / Pixel 5).

- [ ] Landing page: layout sem overflow horizontal
- [ ] Navbar: hamburger menu abre/fecha corretamente
- [ ] UserMenu: acessível e funcional no mobile
- [ ] Formulários: inputs usáveis, teclado não sobrepõe campos
- [ ] Breadcrumbs: não quebram o layout
- [ ] Cards de viagem: stack vertical, legíveis
- [ ] Modais: ocupam tela cheia ou centrados corretamente
- [ ] Botões: min-height 44px (touch target)
- [ ] Tabelas/grids: scroll horizontal se necessário (sem quebra)

---

## Acessibilidade (WCAG 2.1 AA)

> Testar navegação por teclado e semântica HTML.

### Navegação por Teclado
- [ ] Tab navega por todos os elementos interativos na ordem correta
- [ ] Enter/Space ativa botões e links
- [ ] Escape fecha modais e dropdowns
- [ ] Focus visível em todos os elementos focáveis (outline)
- [ ] Skip-to-content link funciona

### Semântica e ARIA
- [ ] Headings em ordem hierárquica (h1 → h2 → h3)
- [ ] Formulários: labels associados a inputs (htmlFor/id)
- [ ] Imagens: alt text descritivo (ou aria-hidden se decorativo)
- [ ] Roles corretos: alert para erros, status para loading, navigation para nav
- [ ] Live regions: feedback de ações anunciado (role="status", aria-live)

### Contraste e Visual
- [ ] Texto com contraste mínimo 4.5:1 (normal) / 3:1 (large)
- [ ] Estados de erro distinguíveis sem depender só de cor
- [ ] Focus ring com contraste suficiente

---

## i18n — Internacionalização (PT-BR ↔ EN)

> Testar com ambos os locales. Trocar idioma e verificar tradução completa.

- [ ] Todas as strings visíveis estão traduzidas (sem chaves de i18n expostas)
- [ ] LanguageSwitcher alterna entre EN e PT-BR corretamente
- [ ] URLs refletem locale (/en/trips vs /pt-BR/trips)
- [ ] Mensagens de erro traduzidas nos dois idiomas
- [ ] Placeholders de formulários traduzidos
- [ ] Datas formatadas conforme locale (se aplicável)
- [ ] Textos longos em PT-BR não quebram layout (PT é ~30% mais longo que EN)
- [ ] Rodar `npm run i18n:check` → sem chaves órfãs ou faltantes

---

## Performance (opcional)

> Verificações rápidas de performance.

- [ ] Lighthouse mobile score > 80 (Performance)
- [ ] First Contentful Paint < 2s em 3G simulado
- [ ] Sem console warnings de imagens não otimizadas
- [ ] Bundle size: verificar que não há imports desnecessários (next/bundle-analyzer)

---

## Arquivos Modificados

<details>
<summary>21 arquivo(s) — clique para expandir</summary>

- `messages/en.json`
- `messages/pt-BR.json`
- `prisma/migrations/20260305014239_add_user_preferred_locale/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `prisma/schema.prisma`
- `src/app/[locale]/(app)/account/page.tsx`
- `src/app/[locale]/(app)/layout.tsx`
- `src/components/features/account/DeleteAccountModal.tsx`
- `src/components/features/account/DeleteAccountSection.tsx`
- `src/components/features/account/ProfileForm.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/UserMenu.tsx`
- `src/lib/validations/account.schema.ts`
- `src/server/actions/account.actions.ts`
- `tests/unit/app/app-shell-layout.test.tsx`
- `tests/unit/components/account/DeleteAccountModal.test.tsx`
- `tests/unit/components/account/ProfileForm.test.tsx`
- `tests/unit/components/layout/Footer.test.tsx`
- `tests/unit/components/layout/UserMenu.test.tsx`
- `tests/unit/lib/validations/account.schema.test.ts`
- `tests/unit/server/account.actions.test.ts`

</details>
