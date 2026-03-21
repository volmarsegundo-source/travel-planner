# SPEC-PROD-034: Login Social — Google e Apple (IMP-006)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, security-specialist
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Problem Statement

Atualmente, o Atlas so oferece autenticacao via email e senha. Em 2025-2026, a fracao de usuarios que abandona formularios de registro por preferir login social e estimada entre 40-60% em produtos de consumo (fonte: Skift Research + dados do setor). Para um produto de planejamento de viagem — onde o usuario precisa criar conta para comecar a usar — essa friccao de registro e um dos maiores bloqueadores de conversao no topo do funil.

Alem disso, usuarios que chegam ao Atlas via mobile (estimativa: 60-70% do trafego de beta) preferem autenticacao sem digitar senha, especialmente em teclados de smartphone. Google OAuth e o padrao consolidado no mercado web; Apple Sign-In e obrigatorio em apps iOS e e crescentemente adotado em web por usuarios no ecossistema Apple.

O objetivo nao e substituir o login por email/senha, mas adicionar os provedores sociais como alternativa de menor friccao, resultando em maior taxa de conversao de registro.

## 2. User Story

As a @leisure-solo,
I want to register and sign in with my Google or Apple account,
so that I can start planning my trip immediately without creating and remembering another password.

### Traveler Context

- **Pain point**: O usuario chega ao Atlas motivado por planejar uma viagem especifica, ve um formulario de registro com campos de nome, email e senha, nao quer criar mais uma conta, e abandona antes mesmo de comecar.
- **Current workaround**: Alguns usuarios criam conta com senha fraca (ex.: "123456") apenas para entrar, o que compromete a seguranca da conta.
- **Frequency**: Todo novo usuario — evento de primeira impressao e de alta sensibilidade para conversao.

## 3. Acceptance Criteria

### Tela de Login

- [ ] AC-001: A tela de login exibe os botoes "Continuar com Google" e "Continuar com Apple" acima do formulario de email/senha, separados por um divisor visual "ou".
- [ ] AC-002: Os botoes de login social seguem as diretrizes visuais oficiais de cada provedor (branding Google e Apple) — cores, icones e textos definidos pelos guidelines dos provedores.
- [ ] AC-003: Clicar em "Continuar com Google" inicia o fluxo OAuth do Google e redireciona o usuario para autenticacao no Google, sem expor credenciais ao Atlas.
- [ ] AC-004: Clicar em "Continuar com Apple" inicia o fluxo Sign in with Apple, com suporte a login pelo sistema operacional em dispositivos Apple e pelo fluxo web em outros dispositivos.
- [ ] AC-005: Apos autenticacao bem-sucedida com provedor social, o usuario e redirecionado para o Dashboard (se ja tem conta) ou para o fluxo de completar perfil (se e primeiro acesso).

### Tela de Registro

- [ ] AC-006: A tela de registro exibe os botoes "Registrar com Google" e "Registrar com Apple" acima do formulario tradicional, com o mesmo divisor "ou".
- [ ] AC-007: Ao usar registro social, o Atlas solicita ao provedor apenas os dados minimos necessarios: nome e email — nao solicitar acesso a contatos, calendario ou outros escopos.
- [ ] AC-008: Se o provedor social retornar um nome, o campo de nome do perfil do Atlas e pre-preenchido com esse dado — o usuario pode alterar durante o onboarding.

### Vinculacao de Contas (Account Linking)

- [ ] AC-009: Dado que o usuario tenta fazer login com Google e o email retornado pelo Google ja existe no Atlas (criado anteriormente com email/senha), o sistema nao cria uma segunda conta — em vez disso, exibe uma tela informando "Encontramos uma conta com esse email. Deseja vincular seu Google a essa conta? Entre com sua senha para confirmar."
- [ ] AC-010: Apos confirmacao da senha, a conta Google e vinculada a conta existente — o usuario pode usar tanto Google quanto email/senha para entrar no futuro.
- [ ] AC-011: O mesmo comportamento de vinculacao se aplica para Apple: email ja existente gera fluxo de vinculacao, nao duplicacao de conta.
- [ ] AC-012: Dado que o usuario tenta fazer login social com email que nao existe no Atlas, o sistema cria uma nova conta automaticamente e inicia o fluxo de onboarding.

### Perfil e Dados

- [ ] AC-013: O avatar/foto de perfil do provedor social pode ser usado como foto de perfil no Atlas, com permissao explicita do usuario ("Usar foto do Google?").
- [ ] AC-014: O Atlas nunca armazena tokens de acesso OAuth do provedor alem do necessario para autenticacao — armazenar apenas o identificador unico do provedor (provider ID) e o token de sessao proprio do Atlas.
- [ ] AC-015: O usuario que se registrou com provedor social pode, a qualquer momento no perfil, adicionar uma senha para ter acesso por email/senha tambem.

### Seguranca

- [ ] AC-016: O fluxo OAuth utiliza o parametro `state` para prevencao de CSRF — o servidor valida o `state` retornado pelo provedor antes de processar o callback.
- [ ] AC-017: O ID token do provedor e validado no servidor (verificacao de assinatura) — nunca confiar apenas na resposta client-side.
- [ ] AC-018: O endpoint de callback OAuth e protegido contra ataques de redirect aberto — aceitar apenas URLs de callback pre-registradas nos consoles dos provedores.

## 4. Scope

### In Scope

- Login e registro com Google OAuth 2.0
- Login e registro com Apple Sign-In (web + iOS)
- Vinculacao de contas quando email ja existe
- Pre-preenchimento de nome a partir do provedor
- Opcao de usar foto de perfil do provedor (com consentimento)
- Edicao de botoes nas telas de Login e Register existentes

### Out of Scope

- Login com Facebook, GitHub, Twitter/X ou outros provedores — apenas Google e Apple neste sprint
- SSO corporativo (SAML/OIDC para empresas) — feature futura para tier enterprise
- Login por numero de telefone (SMS OTP)
- Autenticacao sem senha (passkeys/WebAuthn) — avaliar em sprint futuro
- Importacao automatica de reservas de viagem a partir do Gmail (feature de TripIt — avaliada para Sprint 35+)

## 5. Constraints (MANDATORY)

### Security

- LGPD/GDPR: o Atlas deve informar ao usuario, no momento do primeiro login social, quais dados estao sendo coletados do provedor e para que finalidade — consentimento registrado em banco de dados com timestamp
- Nunca armazenar o access token do provedor — armazenar apenas o provider_account_id (identificador unico do provedor) e o email verificado
- O fluxo de vinculacao de contas (AC-009) DEVE exigir autenticacao da conta existente — nao vincular automaticamente sem confirmacao, pois isso seria uma vulnerabilidade de account takeover
- Validar que o email retornado pelo provedor e `email_verified: true` — nao aceitar emails nao verificados como base para vinculacao
- Rate limiting para os endpoints de callback OAuth — prevenir abuso e enumeration de contas

### Accessibility

- WCAG 2.1 AA obrigatorio
- Os botoes de login social devem ter `aria-label` descritivo (ex.: "Entrar com Google", "Entrar com Apple")
- O fluxo de redirecionamento para o provedor externo deve anunciar a transicao via `aria-live` antes do redirect
- O dialogo de vinculacao de contas (AC-009) deve seguir padrao ARIA de dialogo modal com foco gerenciado

### Performance

- O carregamento das paginas de Login e Register nao deve ser impactado em mais de 200ms pelo adicao dos botoes de login social
- Os SDKs ou scripts de terceiros dos provedores devem ser carregados de forma lazy (somente quando o usuario clica em um dos botoes) — nao bloquear o carregamento inicial da pagina

### Architectural Boundaries

- O sistema ja usa Auth.js v5 com PrismaAdapter, que tem suporte nativo a provedores OAuth — a implementacao deve usar esse mecanismo existente, nao construir um fluxo OAuth customizado
- Nao introduzir uma segunda estrategia de sessao — o JWT session do Auth.js v5 permanece como unico mecanismo de sessao
- O modelo de dados de conta do usuario (Account, Session, User no schema Prisma) deve ser estendido conforme necessario, nao substituido

## 6. Success Metrics

- Taxa de conversao de visitante para conta criada: aumento >= 25% em relacao ao baseline de email/senha apenas (medido nas primeiras 4 semanas de beta com login social ativo)
- Percentual de novos registros via provedor social: meta >= 40% do total de registros em 30 dias apos o lançamento
- Taxa de abandono no formulario de registro: reducao >= 30%
- Incidentes de seguranca relacionados a autenticacao social: zero

## 7. Dependencies

- Auth.js v5 (NextAuth): ja integrado ao projeto — esta spec estende a configuracao existente
- Google Cloud Console: criacao de OAuth client ID/Secret — responsabilidade de configuracao do devops-engineer
- Apple Developer Account: criacao de Service ID + Key para Sign in with Apple — responsabilidade de configuracao do devops-engineer
- SPEC-SEC-XXX (a criar pelo security-specialist para Sprint 33): revisao de segurança do fluxo OAuth, vinculacao de contas, e CSRF/redirect protection

## 8. Vendor Independence

- Este spec descreve WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific OAuth library versions, JWT formats, or database schemas.
- Implementation details belong in the corresponding SPEC-ARCH-XXX.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | product-owner | Rascunho inicial — Sprint 33 IMP-006 |
