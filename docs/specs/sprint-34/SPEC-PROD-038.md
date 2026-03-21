# SPEC-PROD-038: Correcoes de Login e Fase 1 (REQ-LOGIN-001, REQ-PHASE1-001)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, security-specialist
**Created**: 2026-03-21
**Last Updated**: 2026-03-21
**Sprint**: 34

---

## 1. Problem Statement

Dois problemas distintos impedem novos usuarios de entrar no produto com sucesso:

**REQ-LOGIN-001 — OAuth nao funciona em producao**: O login social via Google (e Apple, implementado no Sprint 33 via SPEC-PROD-034) nao esta funcionando corretamente no ambiente de staging/producao. Os relatos indicam falhas silenciosas ou redirecionamentos incorretos apos o clique no botao OAuth. A causa raiz provavel e a ausencia ou configuracao incorreta de variaveis de ambiente e URIs de redirecionamento. Este problema bloqueia a conversao de novos usuarios via login social — o principal canal de reducao de friccao no cadastro.

**REQ-PHASE1-001 — Validacao de formato de telefone incorreta ou ausente**: O campo de telefone na Fase 1 "O Chamado" aceita qualquer string ou rejeita formatos validos do mercado brasileiro. Usuarios tentam inserir numeros no formato "+55 11 99999-9999" ou "(11) 99999-9999" (ambos formatos padrao no Brasil) e recebem erro de validacao ou, pior, o numero e aceito em formato invalido. Isso gera dados de telefone incorretos no perfil do usuario e impossibilita contato futuro (notificacoes, recuperacao de conta).

---

## 2. User Stories

### REQ-LOGIN-001

As a new @leisure-solo traveler,
I want to sign in with my Google account without errors,
so that I can start planning my trip immediately without creating a new password.

#### Traveler Context

- **Pain point**: O usuario clica em "Entrar com Google", e redirecionado, autoriza o acesso, e redirecionado de volta — mas ve uma tela de erro ou e redirecionado para a pagina de login novamente sem estar autenticado.
- **Current workaround**: O usuario abandona o fluxo de login social e tenta criar uma conta com email/senha, ou abandona o produto completamente.
- **Frequency**: Afeta 100% dos usuarios que tentam usar login social. E o principal ponto de entrada para novos usuarios (estimativa: >= 40% das tentativas de cadastro usam OAuth).

### REQ-PHASE1-001

As a @leisure-family traveler registering my contact details,
I want the phone field to accept standard Brazilian number formats,
so that I can enter my phone number without guessing the required format.

#### Traveler Context

- **Pain point**: O usuario digita "(11) 98765-4321" e recebe erro "formato invalido", ou digita "+5511987654321" (sem separadores) e o numero e aceito mas exibido incorrectamente no perfil.
- **Current workaround**: O usuario tenta varios formatos ate encontrar um que funcione, ou deixa o campo em branco.
- **Frequency**: Afeta todos os usuarios brasileiros no cadastro ou edicao de perfil. O Brasil tem formato de telefone padrao amplamente conhecido — a ausencia de hint de formato e uma falha de UX basica.

---

## 3. Acceptance Criteria

### REQ-LOGIN-001: OAuth Funcional em Producao/Staging

#### AC-001: Documentacao de variaveis de ambiente obrigatorias para OAuth
Given a necessidade de configurar OAuth em qualquer ambiente (local, staging, producao),
when a equipe consulta a documentacao de configuracao,
then deve existir uma lista explícita e completa de todas as variaveis de ambiente necessarias para cada provedor OAuth, com o formato exato esperado (ex: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_URL, etc.).

#### AC-002: URIs de redirecionamento documentadas por ambiente
Given a configuracao do Google OAuth Console (e Apple Developer Console, se aplicavel),
when a equipe consulta a documentacao,
then devem estar documentadas as URIs de redirecionamento exatas que precisam ser registradas em cada ambiente:
  - Desenvolvimento local: `http://localhost:3000/api/auth/callback/google`
  - Staging: `https://[staging-url]/api/auth/callback/google`
  - Producao: `https://[prod-url]/api/auth/callback/google`

#### AC-003: Fluxo de login Google concluido com sucesso em staging
Given as variaveis de ambiente corretas estao configuradas no ambiente de staging,
when um usuario clica em "Entrar com Google" e autoriza o acesso,
then o usuario deve ser autenticado e redirecionado para a pagina inicial autenticada (dashboard/expeditions) sem erros.

#### AC-004: Mensagem de erro clara quando OAuth falha
Given uma configuracao incorreta ou ausente de variaveis de ambiente OAuth,
when um usuario tenta fazer login social,
then o sistema deve exibir uma mensagem de erro amigavel ao usuario (ex: "Login com Google temporariamente indisponivel. Tente com email e senha.") sem expor detalhes tecnicos ou stack traces.

#### AC-005: Fallback para login por email quando OAuth falha
Given qualquer falha no fluxo OAuth (timeout, configuracao incorreta, negativa do usuario),
when o usuario retorna a tela de login,
then o formulario de login por email/senha deve estar visivel e funcional como alternativa.

#### AC-006: Vinculacao de conta existente via OAuth
Given um usuario ja possui uma conta com email X criada via email/senha,
when o mesmo usuario tenta fazer login com Google usando o email X,
then o sistema deve vincular as duas formas de autenticacao e logar o usuario na conta existente, sem criar uma conta duplicada.

#### AC-007: Estado de erro OAuth documentado e tratado
Given os seguintes estados de erro OAuth devem ser mapeados e tratados:
  - Redirect URI mismatch
  - Invalid client credentials
  - Access denied pelo usuario
  - Network timeout
when qualquer um desses erros ocorre,
then o sistema deve registrar o erro em log (sem dados sensiveis) e exibir mensagem amigavel ao usuario.

---

### REQ-PHASE1-001: Validacao de Formato de Telefone

#### AC-008: Aceitar formato com DDD entre parenteses
Given o campo de telefone na Fase 1 esta visivel,
when o usuario digita "(11) 99999-9999",
then o campo deve aceitar o valor como valido e salvar o numero formatado corretamente.

#### AC-009: Aceitar formato com codigo do pais
Given o campo de telefone na Fase 1 esta visivel,
when o usuario digita "+55 11 99999-9999",
then o campo deve aceitar o valor como valido.

#### AC-010: Aceitar formato sem separadores (apenas digitos com DDD)
Given o campo de telefone na Fase 1 esta visivel,
when o usuario digita "11999999999" (11 digitos, DDD + celular) ou "1199999999" (10 digitos, DDD + fixo),
then o campo deve aceitar o valor como valido.

#### AC-011: Exibir hint de formato no campo
Given o campo de telefone esta vazio ou em foco,
when o usuario visualiza o campo,
then deve ser exibido um placeholder ou hint de formato visivel, ex: "(XX) XXXXX-XXXX".

#### AC-012: Mensagem de erro clara para formato invalido
Given o usuario digitou um numero em formato invalido (ex: letras, menos de 10 digitos, mais de 15 digitos),
when o usuario sai do campo (blur) ou tenta avancar,
then o sistema deve exibir mensagem de erro inline: "Telefone invalido. Use o formato (XX) XXXXX-XXXX ou +55 XX XXXXX-XXXX".

#### AC-013: Campo de telefone opcional — nao bloqueia avanco
Given o campo de telefone esta vazio (usuario nao quer informar),
when o usuario clica "Avancar" no rodape padronizado,
then o sistema NAO deve bloquear o avanco por causa do telefone vazio (o campo e opcional).

#### AC-014: Normalizacao do numero antes de persistir
Given o usuario digitou o numero em qualquer formato valido aceito,
when o sistema persiste os dados,
then o numero deve ser armazenado em formato normalizado no banco de dados (ex: apenas digitos: "5511999999999"), independentemente do formato de entrada.

---

## 4. Scope

### In Scope

- Documentacao tecnica das variaveis de ambiente e URIs de redirecionamento necessarias para OAuth (Google e Apple)
- Correto funcionamento do login Google em ambiente de staging
- Mapeamento e tratamento dos principais estados de erro OAuth com mensagens amigaveis ao usuario
- Vinculacao de conta existente ao fazer login social com email ja cadastrado
- Validacao de telefone que aceita os formatos padrao brasileiros: `(XX) XXXXX-XXXX`, `+55 XX XXXXX-XXXX`, `XXXXXXXXXXX`
- Placeholder/hint de formato no campo de telefone
- Mensagem de erro inline clara para formato invalido
- Normalizacao do numero para armazenamento padrao

### Out of Scope (v1)

- Suporte a numeros de telefone internacionais (fora do Brasil) — deferido; o produto e focado no mercado brasileiro no MVP
- Verificacao de telefone via SMS (OTP) — fora do escopo do MVP
- Login com Apple em producao — o Apple Sign-In requer configuracao especifica do Apple Developer Program; a documentacao deve ser incluida, mas o teste em staging pode ser deferido se o Apple Developer Program nao estiver configurado
- Suporte a numeros de telefone fixo com 8 digitos (formato pre-2012 no Brasil) — deferido; a padronizacao de 9 digitos para celulares e universal desde 2016
- Autenticacao por numero de telefone (sem email) — fora do escopo do MVP

---

## 5. Constraints (MANDATORY)

### Security

- As variaveis de ambiente de OAuth (CLIENT_ID, CLIENT_SECRET) NUNCA devem ser expostas no cliente (browser). Devem ser usadas exclusivamente no servidor.
- O fluxo OAuth deve usar PKCE (Proof Key for Code Exchange) quando disponivel pelo provedor.
- Mensagens de erro para o usuario NAO devem expor detalhes internos (stack trace, nome de variaveis de ambiente, configuracao do servidor).
- A vinculacao de conta (AC-006) requer validacao rigorosa: o email do token OAuth deve ser verificado pelo provedor antes de vincular a uma conta existente — prevencao de account takeover.
- Numeros de telefone sao dados pessoais (LGPD Art. 5, I). Devem ser tratados como PII: criptografados em repouso, nunca expostos em logs.

### Accessibility

- Mensagens de erro de OAuth e de validacao de telefone devem ser anunciadas por screen readers via aria-live="polite".
- O campo de telefone deve ter autocomplete="tel" para suporte a autofill em dispositivos moveis.
- O hint de formato do telefone deve ser associado ao campo via aria-describedby (nao apenas como placeholder que desaparece ao digitar).
- Conformidade WCAG 2.1 AA obrigatoria.

### Performance

- O fluxo OAuth completo (clique no botao → redirecionamento → callback → dashboard) deve completar em < 5s em conexao 4G (2Mbps) — incluindo o roundtrip para o servidor do provedor OAuth.
- A validacao do formato de telefone deve ocorrer no cliente em < 50ms (validacao por expressao regular, sem roundtrip ao servidor).

### Architectural Boundaries

- A documentacao de variaveis de ambiente (AC-001, AC-002) deve ser incluida em arquivo de configuracao do projeto (ex: `.env.example`), nao apenas em documentacao narrativa.
- A normalizacao do numero de telefone (AC-014) deve ocorrer no servidor (server action), nao apenas no cliente, para garantir consistencia independentemente do canal de entrada.
- Este spec descreve O QUE deve funcionar; o diagrama de fluxo OAuth e a logica de vinculacao de conta pertencem ao SPEC-ARCH correspondente e ao SPEC-SEC de revisao.

---

## 6. Success Metrics

- Taxa de sucesso do fluxo OAuth (login Google) em staging: >= 99% (zero erros de configuracao)
- Taxa de abandono na tela de login apos tentativa de OAuth: reducao >= 50%
- Taxa de contas duplicadas criadas por vinculacao incorreta de OAuth: 0% (zero tolerancia)
- Taxa de erros de validacao de telefone reportados por usuarios: reducao >= 80% apos implementacao do hint e da validacao permissiva
- Numero de chamadas de suporte relacionadas a "nao consigo fazer login com Google": reducao >= 90%

---

## 7. Dependencies

- SPEC-PROD-034 (Sprint 33): Login Social Google e Apple — este spec assume que a implementacao base do Sprint 33 existe mas nao esta funcionando corretamente em staging; o objetivo e corrigir a configuracao e os estados de erro
- SPEC-ARCH-022 (Sprint 33): Social Login Architecture — a arquitetura OAuth ja foi definida; este spec pede correcao de configuracao, nao reescrita de arquitetura
- SPEC-SEC-004 (Sprint 33): Security Review que incluiu revisao do fluxo OAuth — verificar se as recomendacoes de seguranca ja foram aplicadas ou precisam ser revisitadas
- SPEC-INFRA-004 (Sprint 33): Infrastructure Review — variaveis de ambiente e URIs de redirecionamento por ambiente devem ter sido definidas; este spec verifica a implementacao real

---

## 8. Vendor Independence

- Este spec descreve WHAT deve funcionar, nao HOW e implementado.
- As variaveis de ambiente mencionadas (GOOGLE_CLIENT_ID, etc.) sao exemplos; os nomes exatos dependem da implementacao do provedor de autenticacao.
- A documentacao de URIs de redirecionamento aplica-se a qualquer provedor OAuth 2.0.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | product-owner | Versao inicial — 2 requisitos (REQ-LOGIN-001 e REQ-PHASE1-001) com 14 ACs cobrindo OAuth funcional em staging, documentacao de configuracao, e validacao de telefone brasileiro |
