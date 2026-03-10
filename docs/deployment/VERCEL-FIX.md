# Correcao Definitiva: Vercel Deploy

**Autores**: architect + tech-lead + devops-engineer
**Data**: 2026-03-09
**Versao do Projeto**: v0.11.0
**Status**: APLICADO

---

## 1. Diagnostico — Causa Raiz

Tres blockers interrelacionados impediam o deploy no Vercel:

### Blocker 1: Prisma CLI ausente (CRITICO)

```
NODE_ENV=production durante npm install
  -> npm pula devDependencies
  -> prisma CLI nao instalado (estava em devDependencies)
  -> npx baixa prisma v7 (latest, incompativel)
  -> v7 removeu "url" do datasource -> build falha
```

### Blocker 2: cross-env ausente (CRITICO)

```
cross-env estava em devDependencies
  -> build script: "cross-env NODE_OPTIONS=... next build"
  -> NODE_ENV=production pula devDeps -> cross-env nao instalado
  -> "command not found: cross-env" -> build falha
```

### Blocker 3: react-simple-maps peer dep conflict (MEDIO)

```
react-simple-maps@3.0.0 declara peerDeps: react@16/17/18
  -> projeto usa React 19
  -> npm install falha sem --legacy-peer-deps
  -> --legacy-peer-deps pode causar efeitos colaterais
```

### Por que cada tentativa anterior falhou

| # | Tentativa | Resultado |
|---|---|---|
| 1 | `npx prisma generate && npm run build` | npx baixa prisma v7 |
| 2 | `npx prisma@6 generate && npm run build` | exit code 127 |
| 3 | `"postinstall": "prisma generate"` | prisma nao no PATH |
| 4 | `"postinstall": "npx prisma generate"` | npx baixa prisma v7 |
| 5 | `./node_modules/.bin/prisma generate` | arquivo nao encontrado |
| 6 | `"prebuild": "prisma generate"` + Build override | prebuild nao roda com override |

---

## 2. Solucao Aplicada

### 2.1 package.json — mover prisma e cross-env para dependencies

**Antes:**
```json
{
  "dependencies": {
    "@prisma/client": "^6.0.0"
  },
  "devDependencies": {
    "cross-env": "^10.1.0",
    "prisma": "^6.0.0"
  }
}
```

**Depois:**
```json
{
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "cross-env": "^10.1.0",
    "prisma": "^6.0.0"
  }
}
```

**Justificativa**: Garante que ambos sao instalados independentemente de NODE_ENV.
A recomendacao oficial do Prisma para Vercel e mover prisma para dependencies.

### 2.2 package.json — overrides para react-simple-maps

```json
{
  "overrides": {
    "react-simple-maps": {
      "react": "$react",
      "react-dom": "$react-dom"
    }
  }
}
```

**Justificativa**: Elimina a necessidade de `--legacy-peer-deps`.
O `$react` faz referencia a versao do react nas dependencies do projeto (React 19).
react-simple-maps funciona em runtime com React 19; o peer dep esta desatualizado.

### 2.3 prebuild script (ja existia)

```json
{
  "scripts": {
    "prebuild": "prisma generate",
    "build": "cross-env NODE_OPTIONS=--max-old-space-size=3072 next build"
  }
}
```

Roda automaticamente antes de cada `npm run build`.

---

## 3. Configuracao do Vercel

### 3.1 Build & Development Settings

| Setting | Valor | Override? |
|---|---|---|
| Framework Preset | Next.js | Auto-detectado |
| Build Command | (padrao do framework) | **NAO** sobrescrever |
| Output Directory | (padrao do framework) | **NAO** sobrescrever |
| Install Command | `npm install` | Padrao (sem --legacy-peer-deps) |
| Node.js Version | 20.x | Selecionar na UI |

**IMPORTANTE**: NAO sobrescrever o Build Command. O padrao do framework (`npm run build`)
aciona o `prebuild` lifecycle script automaticamente.

### 3.2 Environment Variables

**OBRIGATORIAS:**

| Variavel | Valor | Ambientes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...@....neon.tech/neondb?sslmode=require` | Preview + Production |
| `REDIS_URL` | `rediss://default:...@....upstash.io:6379` | Preview + Production |
| `REDIS_TLS_REQUIRED` | `true` | Preview + Production |
| `AUTH_SECRET` | (gerado com `openssl rand -base64 32`) | Preview + Production |
| `NEXTAUTH_SECRET` | (mesmo valor que AUTH_SECRET) | Preview + Production |
| `AUTH_URL` | `https://SEU-PROJETO.vercel.app` | Production only |
| `NEXTAUTH_URL` | `https://SEU-PROJETO.vercel.app` | Production only |

**NAO DEFINIR:**

| Variavel | Motivo |
|---|---|
| `NODE_ENV` | Vercel define automaticamente. Definir manualmente causa skip de devDeps |

### 3.3 vercel.json

**NAO necessario.** Configuracoes sao feitas via Dashboard.

---

## 4. Fluxo de Build Resultante

```
Push para master
  |
  v
[INSTALL] npm install
  |-- Instala dependencies (react, next, @prisma/client, prisma, cross-env)
  |-- overrides resolve react-simple-maps peer dep conflict
  |-- node_modules/.bin/prisma -> prisma v6.x.x
  |
  v
[BUILD] npm run build
  |-- prebuild: prisma generate (usa v6 LOCAL)
  |-- build: cross-env NODE_OPTIONS=... next build
  |-- Sucesso
  |
  v
[DEPLOY] Vercel deploya para CDN + Serverless Functions
```

---

## 5. Verificacao

### Nos logs do build, confirmar:

1. Install phase: `added XXX packages` (deve incluir prisma e cross-env)
2. Build phase: `prisma generate` -> `Prisma Client generated`
3. Build phase: NAO deve mostrar `Downloading prisma` ou `npx: installed`
4. Build phase: versao do Prisma deve ser 6.x.x (NAO 7.x.x)
5. Build phase: `next build` -> rotas compiladas -> sucesso

### Pos-deploy:

```bash
curl https://SEU-PROJETO.vercel.app/api/v1/health
# Esperado: {"status":"ok","services":{"database":"ok","redis":"ok"}}
```

---

## 6. Validacao Local

```
$ node_modules/.bin/prisma --version
prisma                  : 6.19.2    # v6, CORRETO
@prisma/client          : 6.19.2

$ npm install (SEM --legacy-peer-deps)
added 905 packages    # SEM erros de peer dep

$ npm test
85 suites, 1231 tests passed    # ZERO regressoes
```

---

> APLICADO em 2026-03-09. Commit inclui package.json + package-lock.json regenerado.
