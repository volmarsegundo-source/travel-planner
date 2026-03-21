---
spec-id: SPEC-INFRA-004
title: Sprint 33 Infrastructure
version: 1.0.0
status: Draft
author: devops-engineer
sprint: 33
reviewers: [tech-lead, architect]
---

# SPEC-INFRA-004 — Sprint 33 Infrastructure

## Contexto

O Sprint 33 introduz login social (Google + Apple) e um script de migracao de dados para trips com Phase 7 inconsistente. Nenhum novo servico ou migracao de schema Prisma e necessario.

## Environment Variables

### Google OAuth

Novas variaveis necessarias no Vercel:

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud Console (OAuth 2.0) | Sim |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google Cloud Console | Sim |

Configuracao: Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs. Redirect URI: `https://<domain>/api/auth/callback/google`.

### Apple Sign-In

Novas variaveis necessarias no Vercel:

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `APPLE_ID` | Service ID do Apple Developer Portal | Sim |
| `APPLE_TEAM_ID` | Team ID da conta Apple Developer | Sim |
| `APPLE_PRIVATE_KEY` | Private key (.p8) para autenticacao server-to-server | Sim |

Configuracao: Apple Developer Portal > Certificates, Identifiers & Profiles > Service IDs. Redirect URI: `https://<domain>/api/auth/callback/apple`.

**IMPORTANTE**: As variaveis devem ser configuradas no Vercel ANTES do deploy do Sprint 33. Sem elas, os botoes de login social vao gerar erro 500.

## Data Migration

Script de correcao para trips com dados inconsistentes na Phase 7:

```bash
npx tsx scripts/fix-phase7-trips.ts
```

- Deve ser executado diretamente no banco de producao (via connection string de producao)
- Idempotente — pode ser executado multiplas vezes sem efeitos colaterais
- Recomendacao: executar ANTES do deploy para garantir dados limpos

## Database

Nenhuma migracao de schema Prisma necessaria. O Auth.js v5 ja possui as tabelas `Account` e `Session` que suportam provedores OAuth nativamente.

## Redis

Patterns existentes de cache e lock permanecem inalterados. Nenhum novo pattern introduzido.

## Deployment

Pipeline Vercel existente permanece inalterado. Fluxo: `feat/sprint-33 -> master -> Vercel auto-deploy`.

## Pre-Sprint Checklist

- [ ] Configurar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Vercel (Production + Preview)
- [ ] Configurar `APPLE_ID`, `APPLE_TEAM_ID` e `APPLE_PRIVATE_KEY` no Vercel (Production + Preview)
- [ ] Adicionar mesmas variaveis ao `.env.local` para desenvolvimento local
- [ ] Executar `npx tsx scripts/fix-phase7-trips.ts` no banco de producao
- [ ] Verificar redirect URIs configurados no Google Cloud Console e Apple Developer Portal

## Veredicto

**APPROVED** — Nenhum bloqueio de infraestrutura identificado. A configuracao de variaveis de ambiente e uma acao pre-sprint obrigatoria.
