# SPEC-UX-039: Phone Input Mask

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Contexto e Objetivo

O campo de telefone no perfil do viajante atualmente aceita texto livre sem formatacao. Isso gera dados inconsistentes e dificulta validacao. Esta spec define um input mascarado que formata automaticamente conforme o usuario digita, suportando formato brasileiro como padrao e formatos internacionais.

## 2. Comportamento do Input

### Auto-Formatacao

O input formata automaticamente conforme o usuario digita:

| Digitado | Exibido |
|---|---|
| `5` | `+5` |
| `55` | `+55` |
| `5511` | `+55 (11)` |
| `551199999` | `+55 (11) 99999` |
| `5511999999999` | `+55 (11) 99999-9999` |

### Placeholder

- Texto: `+55 (11) 99999-9999`
- Cor: `text-muted-foreground`

### Formato Brasileiro (Default)

- Padrao: `+55 (DD) NNNNN-NNNN` (celular, 11 digitos)
- Fixo: `+55 (DD) NNNN-NNNN` (fixo, 10 digitos)
- Deteccao automatica: se o 3o digito apos DDD for 9, usa formato celular

### Formatos Internacionais

- Aceita qualquer codigo de pais (1-3 digitos)
- Para numeros nao-brasileiros, aplica apenas separacao basica: `+CC NNNN NNNN NNNN`
- Maximo: 15 digitos (padrao E.164)

### Armazenamento

- Salva apenas digitos no banco: `5511999999999`
- Prefixo `+` e adicionado na exibicao
- Formatacao e puramente visual (client-side)

## 3. Validacao

### Regras

| Regra | Mensagem de Erro |
|---|---|
| Minimo 10 digitos (com DDD) | "Numero de telefone muito curto" |
| Maximo 15 digitos | "Numero de telefone muito longo" |
| Apenas digitos (apos sanitizacao) | "Apenas numeros sao permitidos" |
| DDD brasileiro valido (11-99) | "DDD invalido" (somente para +55) |

### Exibicao de Erro

- Texto abaixo do input: `text-sm text-destructive mt-1`
- Borda do input: `border-destructive` quando invalido
- Validacao ocorre em blur (nao durante digitacao para nao interromper)

## 4. Acessibilidade

- `type="tel"` no input (abre teclado numerico em mobile)
- `aria-label` descritivo: "Numero de telefone com codigo de pais"
- `aria-invalid="true"` quando em erro
- `aria-describedby` apontando para mensagem de erro
- `inputMode="tel"` para garantir teclado numerico

## 5. Criterios de Aceitacao

- [ ] **AC-039-01**: Input formata automaticamente para padrao brasileiro conforme usuario digita
- [ ] **AC-039-02**: Placeholder exibe "+55 (11) 99999-9999"
- [ ] **AC-039-03**: Numeros internacionais sao aceitos e formatados basicamente
- [ ] **AC-039-04**: Erro exibido abaixo do campo quando numero e invalido (blur)
- [ ] **AC-039-05**: Apenas digitos sao armazenados no banco de dados
- [ ] **AC-039-06**: `type="tel"` e `inputMode="tel"` presentes no input
- [ ] **AC-039-07**: Maximo de 15 digitos aceitos (padrao E.164)

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
