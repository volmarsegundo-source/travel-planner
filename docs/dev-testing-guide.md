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

---

## Automação de Plano de Testes (Sprint 7+)

O projeto inclui um gerador automático de planos de teste por sprint.

### Como usar

```bash
# Gerar plano de testes para o sprint atual
npm run test:plan 7

# Equivale a:
node scripts/generate-test-plan.js 7
```

### O que faz

1. **Lê o sprint plan** (`sprint-N-plan.md`) e extrai as tarefas
2. **Analisa arquivos modificados** (`git diff master...HEAD`) e detecta áreas afetadas
3. **Gera um plano de testes completo** em `docs/test-results/test-plan-sprint-N.md`

### Seções geradas

| Seção | Descrição |
|-------|-----------|
| **Ambiente de Teste** | Pré-requisitos (Docker, Node, ports) |
| **Happy Path** | Cenários ideais por área funcional detectada |
| **Edge Cases** | Validações, inputs inválidos, estados limite |
| **Regressão** | Funcionalidades existentes que devem continuar funcionando |
| **Mobile / Responsivo** | Checklist 375px e 393px |
| **Acessibilidade** | WCAG 2.1 AA — teclado, ARIA, contraste |
| **i18n** | PT-BR ↔ EN — traduções, locale, formatação |
| **Performance** | Lighthouse, FCP, bundle size |

### Áreas detectadas automaticamente

O script detecta áreas afetadas pelos arquivos modificados:
`auth`, `trips`, `itinerary`, `checklist`, `account`, `onboarding`, `navigation`, `landing`, `footer`, `loading-states`, `error-handling`, `i18n`

Cada área ativa gera cenários específicos no plano.

### Integração com Sprint Lifecycle

```
npm run sprint:start 8      → cria branch e sprint plan
npm run test:plan 8          → gera plano de testes baseado no plan + changed files
npm run sprint:review 8      → quality gate automático (tests, lint, types, security)
npm run sprint:finish 8      → finaliza sprint (changelog, tag)
```

### Exemplo de output

```
📝 Generating Test Plan for Sprint 7

  ✓ Read sprint plan: 6 task(s) found
  ℹ 21 file(s) changed since master
  ℹ Feature areas detected: account, i18n, loading-states, error-handling
  ✓ Test plan saved to docs/test-results/test-plan-sprint-7.md

  Test plan generated!
  ℹ 63 test cases across 8 sections
```

---

## Feature Flags

### NEXT_PUBLIC_PHASE_REORDER_ENABLED (Sprint 44+)

Controla a reordenacao das 6 fases da expedicao (Sprint 44).

| Estado | Ordem das fases |
|--------|----------------|
| `false` (default) | 1 Inspiracao, 2 Perfil, 3 Checklist, 4 Logistica, 5 Guia, 6 Roteiro |
| `true` | 1 Inspiracao, 2 Perfil, 3 Guia, 4 Roteiro, 5 Logistica, 6 Checklist |

**Default**: `false` em todos os ambientes (incluindo producao) ate rollout completo.

**Para testar a nova ordem localmente**, adicione ao `.env.local`:

```env
NEXT_PUBLIC_PHASE_REORDER_ENABLED=true
```

**ATENCAO**: Ao habilitar a flag localmente, voce deve tambem rodar o script de migracao de dados para que expedicoes existentes reflitam a nova ordem:

```bash
# Apenas em banco de desenvolvimento local — NAO rodar em staging/producao sem aprovacao
psql $DATABASE_URL -f scripts/db/migrate-phase-reorder.sql
```

Para reverter o banco local apos testes:

```bash
psql $DATABASE_URL -f scripts/db/reverse-phase-reorder.sql
```

**Nao habilite** em staging ou producao sem seguir o checklist de go/no-go de SPEC-RELEASE-REORDER-PHASES §6.

**Spec de referencia**: `docs/specs/SPEC-PROD-REORDER-PHASES.md`, `docs/specs/SPEC-ARCH-REORDER-PHASES.md`
**ADRs**: ADR-029 (estrategia), ADR-030 (migracao big-bang), ADR-032 (ExpeditionAiContextService)
