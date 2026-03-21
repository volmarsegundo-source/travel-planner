# SPEC-UX-040: Social Login Error States

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: SPEC-PROD-034
**Architecture Spec**: SPEC-ARCH-027
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Contexto e Objetivo

O login social (Google e Apple) pode falhar por diversas razoes: usuario cancela consentimento, token expirado, erro de rede, ou email ja cadastrado com outro metodo. Esta spec define os estados visuais de erro, recuperacao e linking de conta para que o viajante nunca fique preso em um estado indefinido.

## 2. Error Banner

Quando o callback OAuth retorna erro, a pagina `/auth/login` exibe um banner de erro no topo:

```
+----------------------------------------------------------+
| [!] Nao foi possivel conectar com [Google/Apple].        |
|     [Tente novamente]                                    |
+----------------------------------------------------------+
```

### Estilos

- Container: `rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3`
- Icone: `!` em circulo, `text-destructive`
- Texto principal: `text-sm text-foreground font-medium`
- Botao "Tente novamente": `variant="link"` com `text-destructive underline`

### Mensagens por Tipo de Erro

| Erro OAuth | Mensagem Exibida |
|---|---|
| `OAuthAccountNotLinked` | "Este email ja esta cadastrado. Faca login com email e senha, depois vincule sua conta [Google/Apple] nas configuracoes." |
| `OAuthCallbackError` | "Nao foi possivel conectar com [Provider]. Tente novamente." |
| `AccessDenied` | "Voce cancelou o login com [Provider]. Tente novamente quando quiser." |
| `Configuration` (internal) | "Erro interno ao conectar. Tente novamente em alguns minutos." |
| Network error | "Erro de conexao. Verifique sua internet e tente novamente." |

## 3. Loading State During Redirect

Quando o usuario clica no botao de login social:

```
+-----------------------------------------------+
| [Google icon] [Spinner] Conectando com Google...|
+-----------------------------------------------+
```

- Botao fica desabilitado com `opacity: 70%`
- Spinner animado (4px, `animate-spin`) ao lado do icone
- Texto muda de "Continuar com Google" para "Conectando com Google..."
- Timeout: se redirect nao ocorre em 10s, exibe mensagem "Demora incomum. Tente novamente."

## 4. Account Linking Prompt

Quando o email do OAuth ja existe no sistema com outro provider:

```
+----------------------------------------------------------+
|  [info] Esta conta ja existe                             |
|                                                          |
|  O email joao@email.com ja esta cadastrado com           |
|  email e senha.                                          |
|                                                          |
|  Para vincular sua conta Google:                         |
|  1. Faca login com email e senha                         |
|  2. Va em Configuracoes > Contas Vinculadas              |
|  3. Conecte sua conta Google                             |
|                                                          |
|  [Fazer login com email]    [Cancelar]                   |
+----------------------------------------------------------+
```

- Container: `rounded-lg border border-atlas-teal/30 bg-atlas-teal/5 p-6`
- Instrucoes em lista numerada
- Botao primario: "Fazer login com email" (redireciona para form de login)
- Botao secundario: "Cancelar" (fecha prompt)

## 5. Criterios de Aceitacao

- [ ] **AC-040-01**: Banner de erro aparece na pagina de login quando OAuth callback retorna erro
- [ ] **AC-040-02**: Botao "Tente novamente" reinicia fluxo OAuth para o mesmo provider
- [ ] **AC-040-03**: Loading state com spinner aparece durante redirect OAuth
- [ ] **AC-040-04**: Mensagem de timeout aparece se redirect demora mais de 10 segundos
- [ ] **AC-040-05**: Prompt de account linking aparece quando email ja existe com outro metodo
- [ ] **AC-040-06**: Instrucoes de linking guiam usuario para login com email e vinculacao nas configuracoes
- [ ] **AC-040-07**: Todas as mensagens de erro estao internacionalizadas (pt/en)

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
