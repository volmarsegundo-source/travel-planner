# Technical Specification: Navegacao Autenticada e Correcoes

**Spec ID**: SPEC-005
**Related Stories**: US-100, US-101, US-102, US-103 (Sprint 5)
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-01

---

## 1. Overview

Este spec cobre quatro funcionalidades interligadas que resolvem bloqueadores criticos de usabilidade identificados em testes manuais pos-Sprint 4. Sem estas correcoes, o produto e inutilizavel apos o login: o usuario nao tem navbar, nao consegue fazer logout, nao recebe feedback de erros no login, e nao sabe onde esta ao navegar em sub-paginas.

A solucao central e a introducao de um **AppShell** -- um layout compartilhado para todas as rotas autenticadas que inclui uma navbar persistente (AuthenticatedNavbar), ponto de ancoragem para breadcrumbs, e separacao clara entre zonas publica e autenticada via route groups do Next.js App Router.

O bug de erro no login (US-102) e um fix isolado no `LoginForm.tsx` que pode ser executado em paralelo.

---

## 2. Architecture Diagram

### 2.1 Estrutura de Route Groups (antes vs depois)

**ANTES (Sprint 4):**
```
src/app/[locale]/
  layout.tsx              <-- unico layout (sem navbar)
  page.tsx                <-- landing (tem Header proprio)
  auth/
    layout.tsx            <-- layout de auth (card centralizado)
    login/page.tsx
    register/page.tsx
  trips/
    page.tsx              <-- sem navbar, sem layout compartilhado
    [id]/page.tsx
    [id]/itinerary/page.tsx
    [id]/checklist/page.tsx
    [id]/generate/page.tsx
  onboarding/page.tsx     <-- sem navbar
  dashboard/page.tsx      <-- redirect para /trips
  account/page.tsx        <-- (futuro) sem navbar
```

**DEPOIS (Sprint 5):**
```
src/app/[locale]/
  layout.tsx              <-- layout raiz (fonts, providers, html/body)
  page.tsx                <-- landing (Header + Hero + Footer)
  auth/
    layout.tsx            <-- layout de auth (card centralizado, SEM navbar)
    login/page.tsx
    register/page.tsx
  (app)/                  <-- NOVO: route group para rotas autenticadas
    layout.tsx            <-- NOVO: AppShell (AuthenticatedNavbar + main + skip-to-content)
    trips/
      page.tsx            <-- move de [locale]/trips/
      [id]/page.tsx
      [id]/itinerary/page.tsx
      [id]/checklist/page.tsx
      [id]/generate/page.tsx
    onboarding/page.tsx   <-- move de [locale]/onboarding/
    dashboard/page.tsx    <-- move de [locale]/dashboard/
    account/page.tsx      <-- (futuro) move de [locale]/account/
```

### 2.2 Diagrama de Componentes

```
                          [locale]/layout.tsx
                      (html, body, providers, i18n)
                                |
                 +--------------+--------------+
                 |              |              |
            page.tsx       auth/layout    (app)/layout.tsx
          (landing)       (card center)     (AppShell)
         Header(pub)        |    |              |
         HeroSection      login  register  +---+---+--------+
         Footer                            |       |        |
                                      trips/   onboarding  account
                                        |
                                  +-----+------+
                                  |     |      |
                                [id]  page  (future)
                                  |
                          +-------+-------+
                          |       |       |
                      itinerary checklist generate

AppShell layout.tsx:
  +-----------------------------------------+
  | <a> Skip to content </a>                |
  | +-------------------------------------+ |
  | | AuthenticatedNavbar (sticky top)     | |
  | | Logo | Minhas Viagens | Lang | User  | |
  | +-------------------------------------+ |
  | +-------------------------------------+ |
  | | <main id="main-content">             | |
  | |   {children} -- page content         | |
  | |   (Breadcrumb rendered by each page) | |
  | +-------------------------------------+ |
  +-----------------------------------------+

AuthenticatedNavbar:
  +--------------------------------------------------+
  | [Logo+AppName] | [NavLinks] | [LangSwitch] [User]|
  +--------------------------------------------------+
  Desktop: horizontal, todos itens visiveis
  Mobile:  logo + hamburger -> painel deslizante
```

### 2.3 Diagrama de Fluxo: Logout

```
User clica "Sair" no UserMenu
    |
    v
signOut({ callbackUrl: "/" })  [next-auth/react, client-side]
    |
    v
Auth.js remove cookie de sessao (JWT)
    |
    v
Redirect para / (landing page)
    |
    v
Tentativa de acessar /trips -> middleware detecta !req.auth
    |
    v
Redirect para /auth/login?callbackUrl=/trips
```

---

## 3. Componentes: Inventario Completo

### 3.1 Componentes Novos

| Componente | Tipo | Localizacao | Responsabilidade |
|---|---|---|---|
| `AppShellLayout` | Server Component | `src/app/[locale]/(app)/layout.tsx` | Layout compartilhado: sessao server-side + AuthenticatedNavbar + skip-to-content + main |
| `AuthenticatedNavbar` | Client Component | `src/components/layout/AuthenticatedNavbar.tsx` | Navbar persistente para rotas autenticadas |
| `UserMenu` | Client Component | `src/components/layout/UserMenu.tsx` | Dropdown com nome/avatar + logout |
| `Breadcrumb` | Server/Client Component | `src/components/layout/Breadcrumb.tsx` | Trail de navegacao reutilizavel |

### 3.2 Componentes Modificados

| Componente | Modificacao |
|---|---|
| `LoginForm.tsx` | Adicionar `catch` explicito no `handleCredentialsSubmit`; fix do bug de erro invisivel |
| `LanguageSwitcher.tsx` | Nenhuma alteracao no componente -- apenas mover de `components/landing/` para `components/layout/` (reutilizado em ambos os contextos) |

### 3.3 Arquivos Movidos (Route Group Refactoring)

| De | Para |
|---|---|
| `src/app/[locale]/trips/` | `src/app/[locale]/(app)/trips/` |
| `src/app/[locale]/onboarding/page.tsx` | `src/app/[locale]/(app)/onboarding/page.tsx` |
| `src/app/[locale]/dashboard/page.tsx` | `src/app/[locale]/(app)/dashboard/page.tsx` |

**Nota sobre URLs**: Route groups com parenteses `(app)` nao afetam a URL. O path `/trips` continua funcionando exatamente como antes. O middleware tambem nao precisa de alteracao pois valida pelo segmento de path (`/trips`, `/onboarding`, `/account`), que permanece identico.

---

## 4. Detalhamento por Componente

### 4.1 AppShellLayout (`src/app/[locale]/(app)/layout.tsx`)

**Tipo**: Server Component (async)

**Responsabilidades**:
- Chamar `auth()` server-side para obter sessao
- Redirecionar para `/auth/login` se nao autenticado (defesa em profundidade -- o middleware ja faz isso, mas o layout garante)
- Renderizar `AuthenticatedNavbar` com dados de sessao
- Prover o wrapper `<main id="main-content">` para o conteudo
- Renderizar link skip-to-content antes da navbar

**Props recebidas (layout do Next.js)**:
```typescript
interface AppShellLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}
```

**Pseudocodigo**:
```typescript
import "server-only"; // nao e necessario em layout, mas documenta intencao
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { AuthenticatedNavbar } from "@/components/layout/AuthenticatedNavbar";

export default async function AppShellLayout({ children, params }: AppShellLayoutProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/auth/login", locale });
  }

  const t = await getTranslations("common");

  // Derivar nome de exibicao: nome > parte local do email > "Traveler"
  const displayName = session.user.name
    ?? session.user.email?.split("@")[0]
    ?? "Traveler";

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100]
                   focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t("skipToContent")}  {/* nova chave i18n */}
      </a>
      <AuthenticatedNavbar
        userName={displayName}
        userImage={session.user.image ?? null}
        userEmail={session.user.email ?? ""}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </>
  );
}
```

**Decisoes de design**:
- A sessao e obtida UMA VEZ no layout e os dados necessarios sao passados como props ao `AuthenticatedNavbar`. Isto evita chamar `auth()` em cada pagina filha para dados de navbar.
- O `skip-to-content` e obrigatorio para WCAG 2.1 AA (criterio 2.4.1).
- O layout NAO envolve um `<div>` adicional desnecessario alem do fragment `<>` -- a pagina filha decide seu proprio container.

### 4.2 AuthenticatedNavbar (`src/components/layout/AuthenticatedNavbar.tsx`)

**Tipo**: Client Component (`"use client"`)

**Justificativa para Client Component**: A navbar precisa de estado para hamburger menu (mobile), e o `UserMenu` precisa de `signOut` de `next-auth/react` (client-side). Manter como Client Component e a abordagem correta.

**Props**:
```typescript
interface AuthenticatedNavbarProps {
  userName: string;
  userImage: string | null;
  userEmail: string;
}
```

**Estrutura visual**:

**Desktop (>= 768px)**:
```
+------------------------------------------------------------------+
| [Globe] Travel Planner  |  Minhas Viagens  |  [EN|PT]  [Avatar+] |
+------------------------------------------------------------------+
                            ^active state       ^LanguageSwitcher ^UserMenu
```

**Mobile (< 768px)**:
```
+----------------------------------+
| [Globe] Travel Planner    [Menu] |
+----------------------------------+
            |
            v (quando aberto)
+----------------------------------+
| Minhas Viagens                   |
| ---                              |
| [EN|PT]                          |
| ---                              |
| [Avatar] Nome do usuario         |
| Sair                             |
+----------------------------------+
```

**Comportamento**:
- `sticky top-0 z-50` -- mesma estrategia do Header publico existente
- Background com `backdrop-blur` para consistencia visual com Header
- Link ativo destacado com `font-semibold` + underline ou `bg-primary/10` (mesmo pattern do LanguageSwitcher)
- O active state e determinado via `usePathname()` de `@/i18n/navigation`
- Hamburger menu abre/fecha com animacao suave (`transition-all duration-200`)
- Hamburger fecha ao clicar em qualquer link ou pressionar `Escape`

**Links de navegacao (v1)**:
| Label (i18n) | Path | Icone |
|---|---|---|
| `trips.myTrips` ("Minhas viagens") | `/trips` | nenhum (v1 simplificado) |

**Notas sobre links futuros**: A arquitetura suporta adicionar links (Account, Bookmarks) futuramente via array de config. Em v1, apenas "Minhas Viagens" -- sem over-engineer.

**Acessibilidade**:
- `<header role="banner">` com `<nav aria-label="Main navigation">`
- Hamburger button: `aria-expanded`, `aria-controls="mobile-menu"`, `aria-label` traduzido
- Mobile panel: `id="mobile-menu"`, fecha com `Escape` (keydown handler)
- Todos os links navegaveis via `Tab`
- Focus trap NAO e necessario no mobile menu (nao e um modal/dialog, e uma regiao expandida)
- Logo e link para `/trips` (home autenticada)

### 4.3 UserMenu (`src/components/layout/UserMenu.tsx`)

**Tipo**: Client Component (`"use client"`)

**Justificativa para componente separado**: Isolamento de responsabilidade -- o UserMenu encapsula a logica de `signOut`, o dropdown state, e o avatar. Evita que a AuthenticatedNavbar fique complexa demais.

**Props**:
```typescript
interface UserMenuProps {
  userName: string;
  userImage: string | null;
  userEmail: string;
}
```

**Estrutura visual**:

Desktop: botao com avatar (ou iniciais) que abre dropdown com:
```
+---------------------------+
| [Avatar] Nome do usuario  |
| email@exemplo.com         |
| -------------------------  |
| Sair                       |
+---------------------------+
```

Mobile: renderizado inline no hamburger panel (sem dropdown -- itens visiveis diretamente).

**Implementacao do avatar**:
- Se `userImage` existe: `<img>` com `alt={userName}`, `rounded-full`, `w-8 h-8`
- Se nao: circulo com iniciais (primeira letra de `userName`), background `bg-primary/10`, texto `text-primary`
- Touch target minimo: 44x44px

**Logout**:
```typescript
import { signOut } from "next-auth/react";

function handleSignOut() {
  signOut({ callbackUrl: "/" });
}
```

**Acessibilidade**:
- Trigger do dropdown: `aria-haspopup="menu"`, `aria-expanded`
- Dropdown: `role="menu"`, itens com `role="menuitem"`
- "Sair" tem `role="menuitem"` (nao e um `<button>` separado no contexto do menu)
- Fecha com `Escape`, clique fora, ou selecao de item
- Texto traduzido via `useTranslations("auth")` -- chave `auth.signOut` ja existe

**Decisao: Usar dropdown nativo ou shadcn/ui?**

O projeto ja tem `@radix-ui/react-dialog` (via shadcn dialog). Radix tambem oferece `@radix-ui/react-dropdown-menu` que e o primitivo por tras de `shadcn/ui DropdownMenu`. Porem, o `DropdownMenu` de shadcn nao esta instalado no projeto.

**Recomendacao**: Implementar o dropdown com HTML/CSS + estado React puro para v1. Razoes:
1. O menu tem apenas 1 item ("Sair") -- complexidade de um Radix DropdownMenu nao se justifica
2. Evita adicionar dependencia nova
3. O pattern de click-outside + Escape e trivial de implementar
4. Se no futuro o menu crescer (Account, Settings), migrar para shadcn/ui DropdownMenu com ADR

Se o tech-lead decidir instalar `shadcn/ui DropdownMenu` agora (para padronizar), nao ha objecao arquitetural -- a decisao e de trade-off entre simplicidade imediata vs padronizacao antecipada.

### 4.4 Breadcrumb (`src/components/layout/Breadcrumb.tsx`)

**Tipo**: Componente puro (Server ou Client, depende do contexto de uso)

**Interface**:
```typescript
interface BreadcrumbItem {
  label: string;
  href?: string; // ultimo item (pagina atual) nao tem href
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}
```

**Estrutura HTML semantica**:
```html
<nav aria-label="Breadcrumb" class="...">
  <ol class="flex items-center gap-1.5 text-sm">
    <li>
      <a href="/trips" class="text-muted-foreground hover:text-foreground">
        Minhas viagens
      </a>
    </li>
    <li aria-hidden="true" class="text-muted-foreground">/</li>
    <li>
      <a href="/trips/abc123" class="text-muted-foreground hover:text-foreground truncate max-w-[25ch]">
        Ferias em Portugal 2026
      </a>
    </li>
    <li aria-hidden="true" class="text-muted-foreground">/</li>
    <li>
      <span aria-current="page" class="font-medium text-foreground">
        Itinerario
      </span>
    </li>
  </ol>
</nav>
```

**Responsividade (mobile < 640px)**:

Em telas pequenas, breadcrumbs longos causam scroll horizontal. A solucao e um pattern de "back link compacto":

```
Desktop: Minhas viagens / Ferias em Portugal / Itinerario
Mobile:  < Voltar para Ferias em Portugal
```

Implementacao:
```typescript
// Mobile: mostra apenas o penultimo item como link de retorno
// Desktop: mostra o trail completo
```

Usar `hidden sm:flex` para o trail completo e `flex sm:hidden` para o back link.

**Truncamento**: Nomes de viagem > 25 caracteres recebem `truncate` CSS (`text-overflow: ellipsis`). O `title` attribute mantem o nome completo acessivel.

**Posicionamento**: O Breadcrumb e renderizado DENTRO de cada pagina (nao no layout), porque cada pagina conhece sua propria hierarquia. O layout apenas provee a navbar; o breadcrumb fica logo abaixo dela, dentro do `<main>`.

**Razao para nao colocar no layout**: O breadcrumb depende de dados dinamicos (nome da viagem, secao atual) que so a pagina conhece. Colocar no layout exigiria um mecanismo de contexto ou parametros compartilhados que adiciona complexidade desnecessaria. O pattern de cada pagina renderizar seu proprio breadcrumb com props explicitas e mais simples e mais previsivel.

### 4.5 Fix: LoginForm.tsx (US-102)

**Diagnostico da causa raiz**:

Analisando o codigo em `src/components/features/auth/LoginForm.tsx`, linhas 78-101:

```typescript
async function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setErrorKey(null);
  setIsSubmitting(true);

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result?.ok) {
      setErrorKey("errors.invalidCredentials");
      return;
    }

    router.push("/trips");
  } finally {
    setIsSubmitting(false);
  }
}
```

**Problema identificado**: O bloco `try` NAO tem `catch`. Se `signIn()` lancar uma excecao (em vez de retornar `{ ok: false }`), o fluxo pula diretamente para `finally`, sem nunca executar `setErrorKey`. O `finally` reseta `isSubmitting` para `false`, dando a impressao de que nada aconteceu.

Comportamento do Auth.js v5 `signIn("credentials", { redirect: false })`:
- Credenciais validas: retorna `{ error: undefined, ok: true, status: 200, url: "..." }`
- Credenciais invalidas: comportamento varia por versao. Em algumas versoes, `signIn` lanca um `Error` quando `authorize()` retorna `null`, em vez de retornar `{ ok: false }`. Isto e inconsistente com a documentacao, mas e um comportamento conhecido.

**Solucao**:

Adicionar `catch (error)` explicito que trata tanto erros lancados quanto retornos `{ ok: false }`:

```typescript
async function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setErrorKey(null);
  setIsSubmitting(true);

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result?.ok) {
      setErrorKey("errors.invalidCredentials");
      return;
    }

    router.push("/trips");
  } catch {
    // signIn pode lancar excecao em vez de retornar { ok: false }
    // em algumas versoes do Auth.js v5 com Credentials provider
    setErrorKey("errors.invalidCredentials");
  } finally {
    setIsSubmitting(false);
  }
}
```

**Verificacao adicional**: Confirmar que a chave `auth.errors.invalidCredentials` existe nos arquivos de traducao.

Status atual das chaves i18n:
- `messages/pt-BR.json` > `auth.errors.invalidCredentials`: "E-mail ou senha incorretos." -- **EXISTE**
- `messages/en.json` > `auth.errors.invalidCredentials`: "Invalid email or password." -- **EXISTE**

A funcao `resolveError(key)` (linhas 115-123) recebe `"errors.invalidCredentials"` e chama `t("errors.invalidCredentials")` no namespace `auth`. O `useTranslations("auth")` no topo do componente usa `auth` como namespace, entao `t("errors.invalidCredentials")` resolve para `auth.errors.invalidCredentials`, que existe.

**Conclusao**: O JSX de exibicao do erro (linhas 132-141) esta correto. O bug e exclusivamente a falta de `catch` no handler. A correcao e de 3 linhas.

**Risco secundario**: A funcao `resolveError` assume que a chave sempre existe no i18n. Se por algum motivo a chave nao existir, `t()` do next-intl lanca excecao em modo estrito, o que silenciaria o erro novamente. Adicionar fallback defensivo:

```typescript
function resolveError(key: string): string {
  try {
    const parts = key.split(".");
    if (parts[0] === "errors" && parts[1]) {
      return t(`errors.${parts[1]}`);
    }
    return key;
  } catch {
    // Fallback: retornar a chave bruta se i18n falhar
    return key;
  }
}
```

---

## 5. Chaves i18n Novas

### 5.1 Namespace `common` (novas chaves)

```json
{
  "common": {
    "skipToContent": "Pular para o conteudo" / "Skip to content"
  }
}
```

### 5.2 Namespace `navigation` (novo namespace)

```json
{
  "navigation": {
    "myTrips": "Minhas viagens" / "My trips",
    "toggleMenu": "Abrir menu" / "Toggle menu",
    "closeMenu": "Fechar menu" / "Close menu",
    "userMenu": "Menu do usuario" / "User menu",
    "breadcrumb": {
      "myTrips": "Minhas viagens" / "My trips",
      "itinerary": "Itinerario" / "Itinerary",
      "checklist": "Checklist" / "Checklist",
      "generatePlan": "Gerar plano" / "Generate plan",
      "backTo": "Voltar para {name}" / "Back to {name}"
    }
  }
}
```

**Nota**: Reutilizar `trips.myTrips` seria possivel, mas criar um namespace `navigation` dedicado e mais limpo -- evita acoplamento entre contextos de UI e previne conflitos de renomeacao futura.

**Chaves existentes reutilizadas**:
- `auth.signOut`: "Sair" / "Sign out" -- ja existe
- `common.appName`: "Travel Planner" -- ja existe

---

## 6. Decisoes Arquiteturais

### 6.1 ADR-006: Route Group (app) para Layout Autenticado

**Contexto**: As rotas autenticadas (`/trips`, `/onboarding`, `/account`, `/dashboard`) precisam de um layout compartilhado com navbar. Atualmente, cada pagina renderiza seu conteudo diretamente sob `[locale]/layout.tsx`, que nao tem navbar.

**Opcoes consideradas**:

| Opcao | Pros | Contras |
|---|---|---|
| A: Route group `(app)` com layout proprio | Navbar injetada automaticamente em todas as rotas filhas; separacao clara de zonas; nao afeta URLs | Requer mover arquivos para a nova pasta |
| B: Layout condicional no `[locale]/layout.tsx` | Sem mover arquivos | Layout fica complexo (if autenticado / if publica / if auth); viola Single Responsibility |
| C: Componente wrapper em cada pagina | Sem mudanca de estrutura | Duplicacao; facil esquecer de incluir; viola DRY |

**Decisao**: Opcao A -- Route group `(app)`.

**Consequencias**:
- **Positivo**: Layout limpo, navbar automatica, separacao clara entre zona publica e autenticada
- **Negativo**: Requer mover 6 arquivos para novo diretorio. Imports relativos dentro das paginas nao mudam (usam `@/` aliases). O middleware tambem nao muda (checa path segments, nao pastas internas).
- **Risco**: Git rename tracking -- garantir `git mv` para preservar historico

### 6.2 ADR-007: LanguageSwitcher Compartilhado entre Header e Navbar

**Contexto**: O `LanguageSwitcher` esta em `src/components/landing/` mas precisa ser usado tanto no Header publico quanto na AuthenticatedNavbar.

**Decisao**: Mover `LanguageSwitcher.tsx` de `components/landing/` para `components/layout/`. Atualizar imports no `Header.tsx` e usar no `AuthenticatedNavbar.tsx`.

**Alternativa rejeitada**: Copiar o componente -- viola DRY, cria risco de divergencia visual.

**Consequencias**: Uma unica mudanca de import no `Header.tsx`. Sem impacto em URLs, testes ou funcionalidade.

### 6.3 Decisao: Breadcrumb no Layout vs nas Paginas

**Decisao**: Breadcrumb renderizado POR CADA PAGINA, nao no layout.

**Razao**: O layout `(app)` nao conhece a hierarquia de breadcrumb (nomes de viagem, secao ativa). Injetar breadcrumbs no layout exigiria um mecanismo de contexto (React Context ou searchParams) que adiciona complexidade sem beneficio proporcional. Cada pagina Server Component ja tem acesso aos dados necessarios (trip title via fetch, secao via path).

**Pattern recomendado**:
```typescript
// Em cada sub-pagina (ex: itinerary/page.tsx)
<Breadcrumb items={[
  { label: tNav("breadcrumb.myTrips"), href: "/trips" },
  { label: trip.title, href: `/trips/${trip.id}` },
  { label: tNav("breadcrumb.itinerary") },
]} />
```

---

## 7. Seguranca

### 7.1 Defesa em Profundidade para Autenticacao

O sistema tem 3 camadas de protecao para rotas autenticadas:

1. **Middleware** (`src/middleware.ts`): Valida JWT no Edge. Redireciona para login se `!req.auth`. Primeira barreira -- rapida, sem DB.
2. **Layout** (`(app)/layout.tsx`): Chama `auth()` server-side (Node.js). Redireciona se `!session.user`. Segunda barreira -- valida sessao completa.
3. **Page** (cada pagina): Chama `auth()` e verifica `session.user.id` antes de queries. Terceira barreira -- necessaria para BOLA (usa userId no where clause).

Com a introducao do route group `(app)`, as camadas 1 e 2 cobrem TODAS as rotas autenticadas automaticamente. A camada 3 permanece por pagina para queries especificas.

### 7.2 Logout: Limpeza de Sessao

O `signOut()` de `next-auth/react`:
- Remove o cookie `next-auth.session-token` (ou `__Secure-next-auth.session-token` em HTTPS)
- A estrategia de sessao e JWT (`session: { strategy: "jwt" }` em `auth.ts`), entao nao ha registro de sessao no banco para invalidar
- Apos logout, qualquer requisicao subsequente falha na validacao do middleware
- O `callbackUrl: "/"` garante redirect para a landing page

**Risco identificado**: Com JWT, nao ha invalidacao imediata server-side. Um JWT roubado permanece valido ate expirar. Isto ja foi aceito no ADR-005 como trade-off. Para v2, considerar lista de revogacao em Redis.

### 7.3 Dados de Sessao Expostos ao Client

O `AuthenticatedNavbar` recebe `userName`, `userImage`, e `userEmail` como props do layout server-side. Estes dados sao serializados no HTML do RSC.

- `userName`: Nao e PII sensivel no contexto de exibicao (o usuario ve seu proprio nome)
- `userEmail`: Exibido no dropdown do UserMenu. Minimizar: exibir apenas no dropdown expandido, nao no HTML inicial
- `userImage`: URL publica do Google (se OAuth) ou null

**Mitigacao**: O email NAO e incluido como data attribute ou em texto visivel no HTML inicial. Ele so aparece quando o dropdown e expandido (renderizado condicionalmente no client).

---

## 8. Performance

### 8.1 Impacto do Layout Server-Side

A chamada `auth()` no `(app)/layout.tsx` adiciona ~1 chamada ao banco por request (sessao via PrismaAdapter). Isto ja acontece nas paginas individuais que chamam `auth()`. Com o layout, a chamada e feita UMA VEZ e os dados sao reutilizados pelas paginas filhas que precisarem (Next.js faz deduplicacao automatica de `fetch` em RSC, e `auth()` internamente usa `cookies()` que e deduplicado).

**Conclusao**: Impacto de performance zero -- a chamada `auth()` ja existe; o layout apenas centraliza onde ela ocorre.

### 8.2 Bundle Size

O `AuthenticatedNavbar` e Client Component. Impacto estimado:
- Componente: ~3-5 KB (minificado)
- `signOut` de `next-auth/react`: ja incluido no bundle (usado pelo `LoginForm`)
- `useTranslations`, `usePathname`, `Link`: ja no bundle

**Conclusao**: Impacto minimo no bundle. Nenhuma nova dependencia externa.

### 8.3 Metricas Alvo

| Metrica | Alvo | Medicao |
|---|---|---|
| FCP (First Contentful Paint) | < 1.5s em 3G lento | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse (navbar sticky nao causa CLS se altura fixa) |
| Tamanho da navbar (HTML) | < 2 KB | DevTools Network |

---

## 9. Acessibilidade (WCAG 2.1 AA)

### 9.1 Checklist Obrigatorio

**Navbar**:
- [ ] `<header>` com `<nav aria-label="Main navigation">`
- [ ] Skip-to-content link como primeiro elemento focavel
- [ ] Todos os links navegaveis via `Tab`
- [ ] Link ativo distinguido visualmente E semanticamente (`aria-current="page"`)
- [ ] Hamburger button: `aria-expanded`, `aria-controls`, `aria-label` traduzido
- [ ] Mobile menu fecha com `Escape`
- [ ] Todos os touch targets >= 44x44px
- [ ] Contraste minimo 4.5:1 para texto, 3:1 para componentes UI
- [ ] `prefers-reduced-motion` respeitado (sem animacao de slide do menu mobile)

**UserMenu**:
- [ ] Trigger: `aria-haspopup="menu"`, `aria-expanded`
- [ ] Menu: `role="menu"`
- [ ] Items: `role="menuitem"`
- [ ] Fecha com `Escape` ou clique fora
- [ ] Nome do usuario comunicado por leitores de tela

**Breadcrumb**:
- [ ] `<nav aria-label="Breadcrumb">`
- [ ] `<ol>` com `<li>` para cada item
- [ ] `aria-current="page"` no item ativo (ultimo)
- [ ] Separadores com `aria-hidden="true"`
- [ ] Nomes truncados mantem `title` com texto completo

**LoginForm (fix)**:
- [ ] Mensagem de erro com `role="alert"` e `aria-live="assertive"` -- ja implementado
- [ ] Erro vinculado aos campos via `aria-describedby` -- ja implementado

### 9.2 Testes de Acessibilidade Recomendados

- axe-core via Vitest para todos os novos componentes
- Teste manual com VoiceOver (macOS) ou NVDA (Windows) para o fluxo completo: login > navbar > navegacao > logout
- Teste de teclado: Tab completo pela pagina, Escape em menus, Enter em links

---

## 10. Testing Strategy

### 10.1 Testes Unitarios (Vitest + React Testing Library)

| Componente | O que testar | Prioridade |
|---|---|---|
| `AuthenticatedNavbar` | Renderiza logo, link "Minhas Viagens", LanguageSwitcher, UserMenu | Alta |
| `AuthenticatedNavbar` | Link ativo destacado quando pathname = `/trips` | Alta |
| `AuthenticatedNavbar` | Mobile: hamburger toggle abre/fecha menu | Alta |
| `AuthenticatedNavbar` | Mobile: `Escape` fecha menu | Media |
| `UserMenu` | Renderiza nome do usuario e iniciais quando sem imagem | Alta |
| `UserMenu` | Chama `signOut({ callbackUrl: "/" })` ao clicar "Sair" | Alta |
| `UserMenu` | Dropdown abre/fecha | Alta |
| `UserMenu` | Fecha com `Escape` | Media |
| `Breadcrumb` | Renderiza trail completo com links clicaveis | Alta |
| `Breadcrumb` | Ultimo item sem link, com `aria-current="page"` | Alta |
| `Breadcrumb` | Truncamento em nomes > 25 caracteres | Media |
| `Breadcrumb` | Mobile: renderiza back link compacto | Alta |
| `LoginForm` | `setErrorKey` chamado quando `signIn` lanca excecao | Alta |
| `LoginForm` | Mensagem de erro visivel apos credenciais invalidas | Alta |
| `LoginForm` | Mensagem limpa ao submeter novamente | Media |
| `LoginForm` | `resolveError` retorna fallback se chave i18n nao existir | Media |

**Mocks necessarios**:
- `next-auth/react`: mock de `signIn` e `signOut`
- `@/i18n/navigation`: mock de `usePathname`, `useRouter`, `Link`
- `next-intl`: mock de `useTranslations`

### 10.2 Testes de Integracao

| Cenario | O que testar |
|---|---|
| AppShellLayout | Renderiza navbar quando sessao valida, redireciona quando nao |
| Logout flow | `signOut` chamado > cookie removido > redirect para `/` |

### 10.3 Testes E2E (Playwright)

| Cenario | Steps |
|---|---|
| Navbar presente em rotas autenticadas | Login > verificar navbar em /trips, /trips/[id], /trips/[id]/itinerary |
| Logout funcional | Login > clicar Sair > verificar redirect para / > acessar /trips > verificar redirect para /auth/login |
| Erro de login visivel | Navegar para /auth/login > submeter credenciais invalidas > verificar mensagem de erro visivel |
| Breadcrumb navegacao | Login > ir para /trips/[id]/itinerary > verificar breadcrumb > clicar no nome da viagem > verificar navegacao para /trips/[id] |
| Mobile navbar | Viewport 375px > Login > verificar hamburger > abrir menu > verificar links > logout |

### 10.4 Cobertura Alvo

- Unitarios: >= 80% nos novos componentes
- E2E: happy path + erro para cada user story
- Acessibilidade: axe-core sem violacoes em cada novo componente

---

## 11. Implementacao: Ordem de Tarefas e Dependencias

### Fase 1: Infraestrutura (pode rodar em paralelo com Fase 2)

**T-032: Route group e AppShellLayout**
1. Criar `src/app/[locale]/(app)/layout.tsx`
2. Mover `src/app/[locale]/trips/` para `src/app/[locale]/(app)/trips/`
3. Mover `src/app/[locale]/onboarding/page.tsx` para `src/app/[locale]/(app)/onboarding/page.tsx`
4. Mover `src/app/[locale]/dashboard/page.tsx` para `src/app/[locale]/(app)/dashboard/page.tsx`
5. Mover `LanguageSwitcher.tsx` de `components/landing/` para `components/layout/`
6. Atualizar import em `Header.tsx`
7. Adicionar chaves i18n novas em ambos os arquivos de traducao
8. Verificar que todas as URLs existentes continuam funcionando (nao devem mudar)

**T-034: Fix LoginForm (US-102)** -- independente, pode rodar em paralelo
1. Adicionar `catch` explicito em `handleCredentialsSubmit`
2. Adicionar try/catch defensivo em `resolveError`
3. Escrever teste unitario que confirma renderizacao do erro

### Fase 2: Componentes de Navegacao (depende de Fase 1 para T-032)

**T-031: AuthenticatedNavbar**
1. Criar `src/components/layout/AuthenticatedNavbar.tsx`
2. Criar `src/components/layout/UserMenu.tsx`
3. Integrar no `(app)/layout.tsx`
4. Testes unitarios

**T-033: Logout (US-101)** -- depende de T-031
1. Integrar `signOut` no UserMenu
2. Teste E2E: login > logout > verificar cookie removido > redirect
3. Teste unitario: `signOut` chamado com args corretos

### Fase 3: Breadcrumbs (depende de Fase 2)

**T-035: Componente Breadcrumb**
1. Criar `src/components/layout/Breadcrumb.tsx`
2. Testes unitarios

**T-036: Integrar breadcrumbs nas sub-paginas**
1. Adicionar Breadcrumb em `/trips/[id]/page.tsx`
2. Adicionar Breadcrumb em `/trips/[id]/itinerary/page.tsx`
3. Adicionar Breadcrumb em `/trips/[id]/checklist/page.tsx`
4. Adicionar Breadcrumb em `/trips/[id]/generate/page.tsx`
5. Remover links "Voltar" existentes (substituidos pelo breadcrumb)

### Fase 4: QA (depende de todas as fases anteriores)

**T-037: Testes do Sprint 5**
1. Testes E2E para navbar, logout, erro de login, breadcrumbs
2. Validacao mobile 375px
3. Validacao WCAG com axe-core

---

## 12. Riscos e Mitigacoes

| Risco | Severidade | Probabilidade | Mitigacao |
|---|---|---|---|
| Mover arquivos quebra imports | Media | Baixa | Todos os imports usam `@/` alias (path absoluto). Nenhum import relativo entre paginas. Rodar `npm run build` apos o move para validar. |
| Middleware nao reconhece novas paths | Alta | Baixa | O middleware valida por path segment (`/trips`, `/onboarding`), nao por estrutura de pasta interna. Route groups `(app)` nao afetam URL. Testar manualmente apos o refactoring. |
| `signOut` nao limpa cookie em producao | Alta | Baixa | O cookie `__Secure-next-auth.session-token` so e setado via HTTPS. Em dev, o cookie e `next-auth.session-token`. Testar ambos os ambientes. |
| `signIn` lanca excecao vs retorna { ok: false } | Media | Media | O fix adiciona `catch` que trata ambos os cenarios. Testar com Auth.js v5 atualizado. |
| CLS na navbar (layout shift) | Media | Baixa | Navbar tem altura fixa (`h-14` / 56px). O conteudo abaixo nunca e empurrado. Usar `min-h-14` para garantir. |
| Testes existentes quebram com move | Media | Media | Testes unitarios usam imports com `@/`, nao paths relativos. Testes E2E usam URLs, que nao mudam. Rodar suite completa apos o move. |

---

## 13. Open Questions

- [x] `signIn("credentials", { redirect: false })` retorna `{ ok: false }` ou lanca excecao? -- **Respondido**: pode fazer ambos dependendo da versao do Auth.js. O fix trata ambos os cenarios.
- [x] Breadcrumb no layout vs na pagina? -- **Respondido**: na pagina, por simplicidade e dados disponibilidade.
- [ ] O `LanguageSwitcher` deve ficar visivel no mobile menu ou apenas no desktop? -- **Recomendacao do architect**: visivel em ambos. O PO/UX deve confirmar.
- [ ] O `UserMenu` deve mostrar o email do usuario? -- **Recomendacao do architect**: sim, como subtexto secundario no dropdown. Util para usuarios com multiplas contas. O PO/UX deve confirmar.

---

## 14. Definition of Done

- [ ] Route group `(app)` criado e todas as rotas autenticadas movidas
- [ ] `AuthenticatedNavbar` renderiza em TODAS as paginas autenticadas
- [ ] Navbar contem: logo, "Minhas Viagens" (com active state), LanguageSwitcher, UserMenu
- [ ] Mobile: hamburger menu funcional com todos os itens
- [ ] Logout funcional: `signOut` chamado, cookie removido, redirect para `/`
- [ ] Apos logout, `/trips` redireciona para `/auth/login`
- [ ] Erro de login exibido visivelmente apos credenciais invalidas
- [ ] Erro limpo ao submeter novamente
- [ ] Breadcrumb renderizado em `/trips/[id]`, `/trips/[id]/itinerary`, `/trips/[id]/checklist`, `/trips/[id]/generate`
- [ ] Breadcrumb clicavel e navegavel
- [ ] Mobile breadcrumb: back link compacto
- [ ] Todos os textos traduzidos em PT-BR e EN
- [ ] WCAG 2.1 AA: skip-to-content, aria-labels, keyboard navigation, contraste
- [ ] Testes unitarios >= 80% nos novos componentes
- [ ] Testes E2E para navbar, logout, erro de login, breadcrumbs
- [ ] Mobile 375px validado
- [ ] `npm run build` sem erros
- [ ] 227+ testes passando (nenhum regression)
- [ ] ADRs 006 e 007 documentados em `docs/architecture.md`

---

> STATUS: Draft -- aguardando revisao do tech-lead
