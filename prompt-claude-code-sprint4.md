# Prompt para Claude Code — Sprint 4

## Preparação

Copie o arquivo de especificação para o projeto:

```cmd
cd C:\travel-planner
copy C:\Users\volma\Downloads\sprint-4-specification.md .
```

## Prompt

Cole no Claude Code após o Sprint 3 estar completo:

===================================================================

Leia o arquivo sprint-4-specification.md na raiz do projeto e execute o Sprint 4.

CONTEXTO:
- Sprints 1-3 estão completos. Crie a branch feat/sprint-4.
- Este sprint instala 4 skills reutilizáveis de desenvolvimento.

O QUE FAZER:

1. Criar os 4 SKILL.md em .claude/skills/ (sprint-lifecycle, project-bootstrap,
   security-audit, i18n-manager) com descrições e triggers detalhados.

2. Implementar os 4 scripts em scripts/ conforme especificação:
   - sprint-lifecycle.js (start/review/finish/status com quality gates)
   - project-bootstrap.js (detecta stack, instala deps, configura .env, sobe Docker)
   - security-audit.js (scan de secrets, auth, LGPD, dependências)
   - i18n-manager.js (missing keys, orphaned, hardcoded strings, interpolation)

3. Criar install-skills.bat e install-skills.js (instalador automatizado que
   cria pastas, copia arquivos, atualiza package.json, e verifica instalação).

4. Registrar 16 novos scripts no package.json (sprint:start/review/finish/status,
   bootstrap/bootstrap:check/bootstrap:fix, security/security:ci,
   i18n/i18n:check/i18n:sync, dev:setup/dev:check/dev:reset/dev:users).

5. Integrar: sprint:review deve incluir checks de security-audit e i18n-manager.

6. Escrever testes para os 4 scripts + instalador.

7. Rodar npm run sprint:review 4 usando o próprio script para validar.

8. Commit e push para feat/sprint-4.

CRITÉRIOS: Todos os scripts rodam sem erro, todos os testes passam
(existentes + novos), review sem CRITICAL, gerar review-sprint-4.md.

===================================================================
