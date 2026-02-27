# Guia de Teste em Ambiente de Desenvolvimento

> **Contexto**: Este guia foi criado após sessão de debugging frustrante em 2026-02-26.
> O problema raiz foi que Postgres e Redis precisam estar rodando **antes** do dev server.
> O Claude Code não tem acesso ao `docker` CLI — todos os comandos Docker devem ser rodados
> manualmente em PowerShell/CMD pelo desenvolvedor.

---

## Pré-requisitos

- **Docker Desktop** instalado e rodando (ícone na bandeja do sistema)
- **Node.js 20+** instalado
- Arquivo **`.env.local`** presente em `C:\travel-planner\` (já commitado com os valores dev)

---

## Passo a Passo Completo (primeira vez ou após reiniciar a máquina)

### 1. Verificar se os serviços estão rodando

Abra o PowerShell e rode:

```powershell
powershell -File C:\travel-planner\_port_check.ps1
```

Resultado esperado:
```
Port 5432: OPEN   ← Postgres OK
Port 6379: OPEN   ← Redis OK
```

Se algum estiver `CLOSED`, vá para o passo 2.

---

### 2. Subir Postgres e Redis com Docker

```powershell
cd C:\travel-planner
docker compose up -d
```

Aguarde ~10 segundos e confirme que os containers estão saudáveis:

```powershell
docker compose ps
```

Resultado esperado:

```
NAME                      STATUS
travel_planner_postgres   Up (healthy)
travel_planner_redis      Up (healthy)
```

Se aparecer `Up (starting)`, aguarde mais alguns segundos e repita o comando.

**Diagnóstico de falha:**
```powershell
docker compose logs postgres --tail 30
docker compose logs redis --tail 30
```

---

### 3. Rodar migrações e seed (primeira vez, ou após reset do DB)

```cmd
cd C:\travel-planner
_dev_setup.cmd
```

Esse script faz três coisas:
1. Aplica todas as migrations Prisma (`prisma migrate deploy`)
2. Cria o usuário de teste (`prisma db seed`)
3. Confirma que está pronto

Resultado esperado ao final:
```
Done! Login at http://localhost:3000/auth/login
  email:    test@test.com
  password: Test1234!
```

> **Nota**: Se preferir rodar cada passo separadamente no Git Bash / terminal do Claude Code,
> use os comandos com variáveis de ambiente explícitas — o seed carrega `.env.local`
> automaticamente via `dotenv`, então basta:
> ```bash
> cd /c/travel-planner
> npx prisma migrate deploy
> npx prisma db seed
> ```

---

### 4. Iniciar o dev server

No terminal do Claude Code (Git Bash) ou em qualquer terminal:

```bash
cd /c/travel-planner
npm run dev
```

Resultado esperado:
```
▲ Next.js 15.x (Turbopack)
- Local: http://localhost:3000
✓ Ready in ~10s
```

Aguarde o `✓ Ready` antes de tentar acessar a aplicação.

---

### 5. Testar o login

Abra o navegador em:

```
http://localhost:3000/auth/login
```

| Campo | Valor |
|---|---|
| Email | `test@test.com` |
| Password | `Test1234!` |

**Resultado esperado**: redirect para `http://localhost:3000/en/trips` (ou `/pt/trips` conforme locale).

---

## Checklist Rápido (sessões subsequentes)

```
[ ] Docker Desktop está aberto (ícone na bandeja)
[ ] docker compose ps → postgres (healthy) + redis (healthy)
[ ] npm run dev → ✓ Ready in Xs
[ ] http://localhost:3000/auth/login → login funciona
```

---

## Diagnóstico de Problemas Comuns

### Login retorna 500

**Causa mais comum**: Postgres ou Redis não estão rodando.

```powershell
# Verificar portas
powershell -File C:\travel-planner\_port_check.ps1

# Se fechadas, subir containers
cd C:\travel-planner
docker compose up -d
```

Nos logs do dev server procure por:
- `redis.connection.error` → Redis fora do ar
- `Can't reach database server at localhost:5432` → Postgres fora do ar
- `MaxRetriesPerRequestError` → Redis não responde após 3 tentativas

### Login retorna "invalid credentials" para test@test.com

**Causa**: Seed não foi rodado ou o usuário não existe no DB.

```cmd
cd C:\travel-planner
npx prisma db seed
```

### Seed falha com "Can't reach database server"

**Causa**: Postgres ainda não subiu ou Docker Desktop não está aberto.

```powershell
docker compose up -d
# Aguardar 15 segundos
docker compose ps   # conferir status (healthy)
# Rodar seed novamente
```

### Dev server não compila / erros de ENV

**Causa**: `.env.local` pode estar faltando variáveis. Verificar se contém `AUTH_SECRET` (adicionado em 2026-02-26):

```bash
grep AUTH_SECRET /c/travel-planner/.env.local
# Deve retornar duas linhas (AUTH_SECRET e AUTH_URL)
```

---

## Ordem Correta de Inicialização

```
Docker Desktop (aberto)
       ↓
docker compose up -d   (Postgres + Redis)
       ↓
aguardar (healthy)
       ↓
_dev_setup.cmd         (migrations + seed — só na primeira vez ou após reset)
       ↓
npm run dev            (Next.js)
       ↓
http://localhost:3000
```

**Regra de ouro**: O Next.js pode iniciar sem Postgres/Redis, mas qualquer request que precise
de DB ou cache vai falhar com 500. Sempre confirme os containers antes de testar.

---

## Parar o ambiente

```powershell
# Parar containers (preserva dados)
docker compose stop

# Parar E remover dados (reset completo)
docker compose down -v
```

Para parar o dev server: `Ctrl+C` no terminal onde roda o `npm run dev`.
