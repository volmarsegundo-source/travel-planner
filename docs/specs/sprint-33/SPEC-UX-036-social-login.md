# SPEC-UX-036: Login Social — Google e Apple — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: SPEC-PROD-034
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Contexto e Objetivo do Viajante

O viajante quer criar sua conta e comecar a planejar a viagem o mais rapido possivel, sem o atrito de criar e memorizar mais uma senha. Botoes de login social com Google e Apple reduzem a barreira de entrada, especialmente em mobile, onde digitar senhas e particularmente penoso. O objetivo e que o viajante va de "quero planejar" a "estou planejando" em menos de 30 segundos.

## 2. Personas Afetadas

| Persona | Como esta feature os serve |
|---|---|
| `@leisure-solo` | Frequentemente descobre o Atlas por impulso (indicacao, rede social); friccao no registro = abandono |
| `@leisure-family` | Pode estar registrando enquanto cuida de criancas; precisa de registro rapido sem digitar senha |
| `@business-traveler` | Usa conta Google corporativa; Single Sign-On e o padrao esperado |
| `@bleisure` | Pode ter conta Google pessoal e Apple do trabalho; ambas devem funcionar |

## 3. Fluxo do Usuario

### Fluxo 1: Login social — conta existente

```
[Tela de Login]
    |
    v
[Botoes "Continuar com Google" / "Continuar com Apple" no topo]
    |
    v
[Clica "Continuar com Google"]
    |
    v
[Anuncio aria-live: "Redirecionando para o Google..."]
    |
    v
[Redirect para OAuth do Google] --> [Autentica no Google]
    |
    v
[Callback: email ja existe no Atlas vinculado ao Google]
    |
    v
[Redirect para /expeditions (Dashboard)]
```

### Fluxo 2: Registro social — conta nova

```
[Tela de Login OU Tela de Registro]
    |
    v
[Clica "Continuar com Google" ou "Registrar com Google"]
    |
    v
[Redirect para OAuth do Google] --> [Autentica e consente]
    |
    v
[Callback: email NAO existe no Atlas]
    |
    v
[Cria conta automaticamente com nome + email do Google]
    |
    v
[Redirect para onboarding (completar perfil)]
```

### Fluxo 3: Vinculacao de conta (email ja existe com senha)

```
[Tela de Login]
    |
    v
[Clica "Continuar com Google"]
    |
    v
[Redirect para OAuth do Google] --> [Autentica]
    |
    v
[Callback: email existe no Atlas mas vinculado apenas a credenciais (senha)]
    |
    v
[Tela de vinculacao: "Encontramos uma conta com esse email"]
    |
    v
[Formulario com campo de senha para confirmar identidade]
    |
    +-- [Senha correta] --> [Vincula Google a conta] --> [Redirect para Dashboard]
    |
    +-- [Senha incorreta] --> [Mensagem de erro inline] --> [Tenta novamente]
    |
    +-- [Cancelar] --> [Retorna para tela de login sem vinculacao]
```

### Fluxo 4: Apple Sign-In

Identico aos fluxos 1-3, substituindo Google por Apple. Particularidade: Apple pode retornar email relay (email privado) — o sistema deve aceitar este email como identificador valido.

### Fluxo de erro: Provedor indisponivel

```
[Clica "Continuar com Google"]
    |
    v
[Google retorna erro ou timeout]
    |
    v
[Redirect de volta para tela de login]
    |
    v
[Banner de erro: "Nao foi possivel conectar ao Google. Tente novamente ou entre com email e senha."]
```

### Fluxo de foto de perfil

```
[Apos primeiro login social bem-sucedido]
    |
    v
[Tela de onboarding / perfil]
    |
    v
[Dialog: "Usar foto do Google como foto de perfil?"]
    |
    +-- "Sim, usar" --> [Foto do Google salva como avatar]
    |
    +-- "Nao, obrigado" --> [Avatar padrao mantido]
```

## 4. Especificacao Visual

### 4.1 Tela de Login — Redesenho

**Layout (de cima para baixo)**:

1. **Titulo**: "Entrar" (h2, existente)
2. **Botoes de login social** (NOVOS — posicao: acima do formulario de email/senha)
   - "Continuar com Google"
   - "Continuar com Apple"
3. **Divisor visual**: "ou" com linhas horizontais nas laterais
4. **Formulario de email/senha** (existente, sem alteracoes)
5. **Link para registro** (existente)
6. **Trust Signals** (existente)

**Botao "Continuar com Google"**:
- Largura: 100% do container do formulario
- Altura: 44px (mobile) / 40px (desktop)
- Estilo: outline (borda cinza, fundo branco)
- Icone: logo do Google (SVG inline, multicolorido — ja existe no componente atual)
- Texto: "Continuar com Google" (fonte regular, cor de texto primaria)
- Hover: fundo cinza claro (#F9FAFB)
- Focus: ring de 2px na cor primaria
- Loading: spinner substituindo o icone, texto "Conectando..."
- Disabled: opacidade 0.5 durante loading de qualquer botao de auth

**Botao "Continuar com Apple"**:
- Largura: 100% do container do formulario
- Altura: 44px (mobile) / 40px (desktop)
- Estilo: preenchido (fundo preto #000000, texto branco #FFFFFF)
- Icone: logo da Apple (SVG inline, branco)
- Texto: "Continuar com Apple" (fonte regular, branca)
- Hover: fundo cinza escuro (#1A1A1A)
- Focus: ring de 2px na cor primaria
- Loading: spinner branco substituindo o icone, texto "Conectando..."
- Segue diretrizes oficiais da Apple: https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple

**Espacamento entre botoes sociais**: 12px de gap vertical.
**Espacamento entre botoes sociais e divisor**: 24px acima e abaixo do divisor.

**Divisor "ou"**:
- Linha horizontal fina (1px, cor de borda do sistema) em ambos os lados
- Texto "ou" centralizado, fonte pequena (14px), cor muted
- Texto i18n: "ou" (PT-BR) / "or" (EN)

### 4.2 Tela de Registro — Redesenho

**Layout (de cima para baixo)**:

1. **Titulo**: "Criar conta" (h2, existente)
2. **Botoes de registro social** (NOVOS)
   - "Registrar com Google"
   - "Registrar com Apple"
3. **Divisor visual**: "ou"
4. **Formulario de registro com email/senha** (existente)
5. **Link para login** (existente)
6. **Trust Signals** (existente)

**Botoes**: Mesmo estilo visual da tela de login. Apenas o texto muda:
- "Registrar com Google" / "Sign up with Google"
- "Registrar com Apple" / "Sign up with Apple"

### 4.3 Tela de Vinculacao de Conta

**Proposito**: Confirmar identidade do usuario quando o email do provedor social ja existe no Atlas com credenciais diferentes.

**Layout**:
- Card centralizado (mesma largura do formulario de login)
- Icone informativo (circulo azul com "i") no topo
- Titulo: "Encontramos uma conta com esse email" (h2)
- Corpo: "O email {email} ja esta registrado no Atlas. Para vincular sua conta {provedor}, confirme sua senha atual."
- Campo de senha (com label visivel)
- Botao primario: "Confirmar e vincular" (largura total)
- Link secundario: "Cancelar" (texto, abaixo do botao)

**Estado de loading**: Spinner no botao + campo desabilitado durante validacao.
**Estado de erro**: Mensagem inline abaixo do campo de senha: "Senha incorreta. Tente novamente."
**Estado de sucesso**: Redirect imediato para Dashboard (sem tela intermediaria de sucesso).

### 4.4 Dialog de Foto de Perfil

- Modal simples com avatar do provedor em tamanho grande (80px circular)
- Titulo: "Usar sua foto do {provedor}?"
- Corpo: "Podemos usar sua foto de perfil do {provedor} como avatar no Atlas."
- Botao primario: "Sim, usar"
- Botao secundario: "Nao, obrigado"
- Se o provedor nao retornar foto: dialog nao aparece.

### 4.5 Estado de Loading dos Botoes Sociais

Ao clicar em qualquer botao social:
1. Botao clicado: spinner + texto "Conectando..." + estado de loading
2. Todos os outros botoes de auth (social + email/senha): disabled (opacidade 0.5)
3. Anuncio aria-live: "Redirecionando para o {provedor}..."
4. O redirect ocorre em ~1-2 segundos; o estado de loading persiste ate o redirect completar

### 4.6 Estado de Erro (Retorno do Provedor)

Banner de erro no topo do formulario (mesmo padrao do erro de login existente):
- Fundo: vermelho claro
- Texto: mensagem especifica por tipo de erro
- Dismiss: desaparece ao interagir com qualquer campo/botao

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Botoes sociais em largura total (100%). Altura minima 44px. Divisor "ou" em largura total. Formulario de email/senha em largura total. Tela de vinculacao como pagina full-screen. Dialog de foto como bottom sheet. |
| Tablet (768-1024px) | Card de login centralizado (max-width: 440px). Botoes sociais em largura do card. Tela de vinculacao como card centralizado. |
| Desktop (> 1024px) | Card de login centralizado (max-width: 440px). Mesmo layout do tablet, com mais espaco de respiro ao redor. |

## 6. Acessibilidade (WCAG 2.1 AA — Obrigatorio)

### Navegacao por teclado

- [ ] Tab order: Google -> Apple -> [divisor skip] -> Email -> Senha -> Entrar -> Esqueci senha -> Registrar
- [ ] Botoes sociais acessiveis via Tab, ativados com Enter ou Space
- [ ] Focus indicator: 2px solid var(--color-primary), outline-offset 2px
- [ ] Tela de vinculacao: Tab order logico (senha -> confirmar -> cancelar)
- [ ] Dialog de foto: focus trap + Escape para fechar

### Leitores de tela

- [ ] Botao Google: `aria-label="Continuar com Google"` (redundante com texto visivel, mas garantia)
- [ ] Botao Apple: `aria-label="Continuar com Apple"`
- [ ] Estado de loading: `aria-busy="true"` no botao ativo
- [ ] Anuncio de redirect: `aria-live="assertive"` com "Redirecionando para o {provedor}..."
- [ ] Divisor "ou": `<div role="separator" aria-hidden="true">` (decorativo, nao anunciado como separador interativo)
- [ ] Tela de vinculacao: `aria-describedby` para explicacao do contexto
- [ ] Dialog de foto: `role="dialog"` com `aria-modal="true"` e `aria-labelledby`
- [ ] Erros de login: anunciados via `aria-live="assertive"` (padrao existente)

### Contraste e cor

- [ ] Botao Google (outline): texto escuro sobre branco = alto contraste (OK)
- [ ] Botao Apple (preenchido): texto branco sobre preto = 21:1 (maximo, OK)
- [ ] Texto "ou" (muted): verificar >= 4.5:1 contra fundo
- [ ] Todos os estados de hover/focus mantendo contraste minimo

### Touch targets

- [ ] Botoes sociais: 44px de altura minima em mobile
- [ ] Espaco entre botoes: >= 8px
- [ ] Campo de senha na vinculacao: 44px de altura
- [ ] Botoes do dialog de foto: 44px de altura

### Motion

- [ ] Spinner de loading: `motion-reduce:animate-none`
- [ ] Nenhuma animacao de redirect (transicao e navegacao de pagina, nao animacao)

## 7. Conteudo e Microcopy

### Labels e CTAs

| Chave i18n | PT-BR | EN |
|---|---|---|
| `auth.continueWithGoogle` | Continuar com Google | Continue with Google |
| `auth.continueWithApple` | Continuar com Apple | Continue with Apple |
| `auth.registerWithGoogle` | Registrar com Google | Sign up with Google |
| `auth.registerWithApple` | Registrar com Apple | Sign up with Apple |
| `auth.orContinueWith` | ou | or |
| `auth.connecting` | Conectando... | Connecting... |
| `auth.redirectingTo` | Redirecionando para o {provider}... | Redirecting to {provider}... |

### Vinculacao de conta

| Chave i18n | PT-BR | EN |
|---|---|---|
| `auth.linking.title` | Encontramos uma conta com esse email | We found an account with this email |
| `auth.linking.body` | O email {email} ja esta registrado no Atlas. Para vincular sua conta {provider}, confirme sua senha atual. | The email {email} is already registered on Atlas. To link your {provider} account, confirm your current password. |
| `auth.linking.confirmAndLink` | Confirmar e vincular | Confirm and link |
| `auth.linking.cancel` | Cancelar | Cancel |
| `auth.linking.wrongPassword` | Senha incorreta. Tente novamente. | Incorrect password. Try again. |

### Foto de perfil

| Chave i18n | PT-BR | EN |
|---|---|---|
| `auth.photo.title` | Usar sua foto do {provider}? | Use your {provider} photo? |
| `auth.photo.body` | Podemos usar sua foto de perfil do {provider} como avatar no Atlas. | We can use your {provider} profile photo as your Atlas avatar. |
| `auth.photo.yes` | Sim, usar | Yes, use it |
| `auth.photo.no` | Nao, obrigado | No, thanks |

### Mensagens de erro

| Cenario | PT-BR | EN |
|---|---|---|
| `auth.error.providerUnavailable` | Nao foi possivel conectar ao {provider}. Tente novamente ou entre com email e senha. | Could not connect to {provider}. Try again or sign in with email and password. |
| `auth.error.providerDenied` | Voce cancelou a autenticacao com o {provider}. Tente novamente quando quiser. | You cancelled {provider} authentication. Try again whenever you like. |
| `auth.error.emailNotVerified` | O email retornado pelo {provider} nao esta verificado. Use outro metodo de login. | The email returned by {provider} is not verified. Use another login method. |

### Tom de voz

- Login social e sobre conveniencia e velocidade. Tom: direto, sem fricao.
- Vinculacao de conta e um momento de confianca: explicar CLARAMENTE por que a senha e pedida ("para proteger sua conta").
- Erros de provedor: nunca culpar o usuario. "Nao foi possivel conectar" (sistema), nao "Voce nao autorizou" (acusacao). Excecao: cancelamento explicito pelo usuario usa "Voce cancelou" com tom neutro.

## 8. Padroes de Interacao

- **Loading social**: Spinner inline no botao + todos os outros controles desabilitados. Sem skeleton — o redirect ocorre rapidamente.
- **Redirect para provedor**: Navegacao de pagina padrao (sem animacao custom).
- **Retorno do provedor**: O callback processa e redireciona — nao ha tela intermediaria no caminho feliz.
- **Vinculacao**: Tela dedicada (nao modal) — melhor para mobile e para o caso de senha esquecida.
- **Dialog de foto**: Aparece apenas uma vez (primeiro login social). Se dismissado, nao aparece novamente.
- **Todas as animacoes**: Apenas spinner — respeita `prefers-reduced-motion`.

## 9. Restricoes (da Spec de Produto)

- Seguir branding guidelines oficiais do Google e Apple para botoes.
- SDKs/scripts de terceiros carregados de forma lazy (somente ao clicar).
- LGPD/GDPR: informar quais dados sao coletados no primeiro login social.
- Vinculacao DEVE exigir senha (prevencao de account takeover).
- Apenas Google e Apple neste sprint (sem Facebook, GitHub, etc.).
- Nao armazenar access tokens do provedor — apenas provider_account_id.
- O fluxo OAuth usa parametro `state` para CSRF (transparente para o usuario).

## 10. Prototipo

- [ ] Prototipo necessario: Nao (os botoes se integram ao layout existente de login/registro; a tela de vinculacao e um formulario simples. As especificacoes visuais nesta spec sao suficientes.)
- **Nota**: O LoginForm.tsx ja possui botao Google implementado. Esta spec adiciona Apple e formaliza o layout. A tela de vinculacao e nova e pode justificar prototipo se o architect solicitar.

## 11. Questoes Abertas

- [ ] Apple Sign-In retorna email relay (email privado anonimizado). O fluxo de vinculacao deve funcionar com email relay? Se sim, como detectar que o email relay pertence a mesma pessoa que a conta existente? Recomendacao UX: tratar email relay como email novo (criar conta nova), com opcao posterior de vincular manualmente no perfil. Security-specialist deve validar.
- [ ] Consentimento LGPD/GDPR: exibir no momento do primeiro login social como dialog ou como texto informativo abaixo dos botoes? Recomendacao UX: texto informativo compacto abaixo dos botoes ("Ao continuar, voce concorda com nossa Politica de Privacidade e autoriza a coleta de nome e email do provedor.") com link para politica completa. Dialog separado apenas se o juridico exigir consentimento explicito.
- [ ] Ordem dos botoes: Google primeiro ou Apple primeiro? Recomendacao UX: Google primeiro (maior base de usuarios web, convencionado na maioria dos produtos). Apple segundo.

## 12. Padroes Reutilizados

- `LoginForm` (existente) — ja possui botao Google; sera estendido
- `RegisterForm` (existente) — adicionara botoes sociais
- `Separator` / divisor "ou" (ja existe no LoginForm)
- `TrustSignals` (existente) — permanece no rodape do formulario
- `Spinner` (inline SVG existente nos componentes de auth)
- `ConfirmDialog` (de ux-patterns.md) — base para dialog de foto de perfil

---

> **Status da Spec**: Draft
> **Pronto para**: Architect (apos resolucao da questao de email relay Apple e consentimento LGPD)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | ux-designer | Rascunho inicial — Sprint 33 |
