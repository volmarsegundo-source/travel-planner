# Sprint 36 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-22
**Autor**: product-owner
**Status do produto**: v0.30.0 (Sprint 35 completo — Gamification Wave 1 MVP) / v0.31.0 em planejamento
**Tema do sprint**: "Gamification Wave 2 — Full Gamification"

---

## Contexto: Sprint de Maturidade da Gamificacao

O Sprint 35 entregou a Wave 1 da gamificacao: o usuario ve seu saldo de PA, recebe o bonus de boas-vindas, entende os custos de IA e o sistema de ranks e visivel. A economia de PA funciona no backend — mas e invisivel em dois vetores criticos:

1. **Conquistas especificas** nao sao reconhecidas: o sistema de badges existe no backend desde o Sprint 9, mas nunca foi exposto ao usuario. O viajante que planejou 5 expedicoes, que viajou em familia, que logou 10 dias seguidos — nao sabe que merecia um badge. A sensacao de reconhecimento especifico e zero.

2. **Mecanismo de dirty-state fragmentado**: o WizardFooter foi entregue no Sprint 34 e o dialogo de confirmacao esta presente nas 6 fases, mas a implementacao interna esta duplicada e inconsistente. Tres implementacoes diferentes do dialogo modal com textos levemente divergentes criam fricao de manutencao e geraram 3 relatos de perda de dados em QA.

3. **Compra de PA sem fluxo funcional**: o botao "Comprar PA" no modal de saldo insuficiente navega para uma pagina inexistente. O momento de maior intencao de compra — quando o usuario esta bloqueado e quer continuar — e desperdicado por falta de destino.

4. **Visibilidade operacional zero**: com badges sendo concedidos e PA sendo comprado (mock) no Sprint 36, o PO e o finops-engineer precisam de um dashboard administrativo minimo para monitorar a saude da economia antes de conectar o gateway de pagamento real no Sprint 37.

Sprint 36 fecha esses quatro vetores simultaneamente dentro de um budget de ~47 horas.

---

## Visao Geral das Specs do Sprint 36

| Spec ID | Titulo | Estimativa | Prioridade | Categoria |
|---------|--------|------------|------------|-----------|
| SPEC-PROD-039 | WizardFooter Global — Hook useFormDirty e Dialogo Padronizado | ~12h | P0 | Qualidade de UX / Reducao de debito tecnico |
| SPEC-PROD-040 | Sistema de Badges — 16 Conquistas em 4 Categorias | ~15h | P1 | Gamification Wave 2 |
| SPEC-PROD-041 | Pacotes de PA — Compra com Mock de Pagamento | ~12h | P1 | Habilitacao de receita |
| SPEC-PROD-042 | Dashboard Administrativo — KPIs de Economia PA e Usuarios | ~8h | P2 | Visibilidade operacional |
| **TOTAL** | | **~47h** | | |

**Budget do sprint**: ~50h uteis (2 devs full-stack, sprint de 2 semanas, descontando code review e testes).
**Folga**: ~3h (~6%) — margem intencional reduzida porque Sprint 35 teve velocidade alta e as specs estao bem definidas.

---

## Hierarquia de Prioridade

```
P0 — SPEC-PROD-039 (WizardFooter Global)
      Debito tecnico ativo com impacto em dados do usuario.
      3 relatos de perda de dados em QA do Sprint 35
      por divergencia de implementacao de dirty-state.
      Bloqueia a confianca em qualquer fase do wizard.
      Deve ser iniciado no Dia 1 — nao ha dependencias
      externas de outras specs deste sprint.
      Estimativa conservadora: 12h (hook + dialogo + 6 fases + testes).
      |
      v
P1 — SPEC-PROD-040 (Badge System)
      Principal driver de retencao da Wave 2.
      16 badges ja definidos no backend desde Sprint 9.
      O trabalho e a camada de produto: servico de avaliacao,
      UI de colecao em Meu Atlas e toast celebratorio.
      Pode comecar em paralelo com SPEC-PROD-039
      pois sao componentes completamente independentes.
      Estimativa: 15h (servico + UI + testes).
      |
P1 — SPEC-PROD-041 (PA Packages)
      Habilita o fluxo de compra de PA end-to-end.
      Sem este spec, o botao "Comprar PA" continua
      redirecionando para pagina inexistente.
      Mock de pagamento valida o fluxo de UX antes
      da integracao real do gateway no Sprint 37.
      Independente de SPEC-PROD-040; pode ser desenvolvido
      em paralelo pelo segundo dev.
      Estimativa: 12h (pagina de pacotes + modal + mock + reembolso + historico).
      |
      v
P2 — SPEC-PROD-042 (Admin Dashboard)
      Visibilidade operacional — nao impacta usuarios finais.
      Necessario antes do Sprint 37 (gateway real),
      mas nao bloqueia nada no Sprint 36.
      Pode ser iniciado na semana 2 quando SPEC-PROD-039
      e pelo menos um dos P1 estiverem concluidos.
      Estimativa: 8h (rota protegida + KPIs + tabela + graficos).
```

---

## Ordem de Sacrificio (se o budget estourar)

Na seguinte ordem, diferir para Sprint 37:

**1. SPEC-PROD-042 — Graficos de tendencia (REQ-ADMIN-005)**
Os cards de KPI e a tabela de usuarios (REQ-ADMIN-001 a REQ-ADMIN-004) sao suficientes para operacao basica. Os graficos adicionam visualizacao mas nao sao blocantes para o launch do gateway no Sprint 37. Estimativa de economia: ~3h.

**2. SPEC-PROD-041 — Fluxo de reembolso (REQ-PA-004)**
O reembolso e uma garantia legal importante (CDC/LGPD) mas e uma operacao rara no contexto de um mock sem cobranca real. Pode ser implementado no Sprint 37 junto com o gateway. Estimativa de economia: ~2h. **Nota**: se diferido, exibir na UI uma mensagem "Reembolso disponivel em breve — entre em contato com suporte" para transparencia.

**3. SPEC-PROD-040 — Badge `maratonista` e `aniversario`**
Esses dois badges dependem de janelas de tempo (30 dias, 365 dias) que sao dificeis de testar em ambiente de staging e requerem um job scheduler confiavel. Os outros 14 badges podem ser entregues sem esses dois. Estimativa de economia: ~2h.

**Nao sacrificaveis sob nenhuma circunstancia**:
- SPEC-PROD-039: hook `useFormDirty` extraido + `SaveDiscardDialog` unico + cobertura das 6 fases (AC-039-001 a AC-039-020). Este e o item de maior impacto em qualidade de dados do usuario.
- SPEC-PROD-040: `BadgeEvaluationService` + colecao em Meu Atlas + toast de desbloqueio (AC-040-001 a AC-040-016). Esses tres elementos sao o minimo para a Wave 2 ser significativa.
- SPEC-PROD-041: pagina de pacotes + confirmacao de compra + credito de PA + atualizacao do saldo no header (AC-041-001 a AC-041-009). Sem isso, o botao "Comprar PA" continua quebrado.
- SPEC-PROD-042: rota protegida + KPIs basicos de PA (AC-042-001 a AC-042-009). O dashboard sem graficos ainda e operacionalmente util.

---

## Paralelizacao Sugerida

**Dev-fullstack-1 (semana 1)**:
SPEC-PROD-039 completo — hook `useFormDirty` + `SaveDiscardDialog` + aplicacao nas 6 fases + testes unitarios.
Foco total: este spec tem dependencias transversais (todas as 6 fases do wizard) e e melhor ter um dev dedicado para evitar conflitos de merge.

**Dev-fullstack-2 (semana 1)**:
SPEC-PROD-040 — `BadgeEvaluationService` + schema additions + logica de avaliacao para os 16 badges.
Trabalho completamente independente de SPEC-PROD-039.

**Dev-fullstack-1 (semana 2)**:
SPEC-PROD-041 — pagina de pacotes + modal de confirmacao + mock de credito + historico de compras + reembolso.
Apos concluir SPEC-PROD-039, capacidade liberada para o fluxo de compra.

**Dev-fullstack-2 (semana 2)**:
Continuacao SPEC-PROD-040 — UI de colecao em Meu Atlas + toast de desbloqueio + testes de componente.
Depois: SPEC-PROD-042 — dashboard administrativo (rota + KPIs + tabela).

---

## Dependencias Pre-Sprint

Antes de iniciar Sprint 36, confirmar:

- [ ] Sprint 35 completo: Wave 1 de gamificacao entregue (saldo no header, tutorial PA, confirmacao de custo, historico de transacoes)
- [ ] 3 relatos de perda de dados do Sprint 35 documentados com reproducao clara (necessario para SPEC-PROD-039)
- [ ] `UserBadge` model confirmado no schema Prisma atual (necessario para SPEC-PROD-040)
- [ ] Campo `role` no modelo `User` inclui valor `ADMIN` (necessario para SPEC-PROD-042)
- [ ] Feature flag `ENABLE_MOCK_PAYMENT` definida na config de ambiente (necessario para SPEC-PROD-041)
- [ ] Architect cria SPEC-ARCH-028 (dirty-state hook) e SPEC-ARCH-029 (purchase service interface) antes do Dia 3 do sprint
- [ ] UX designer cria SPEC-UX-041 (SaveDiscardDialog unificado) e SPEC-UX-042 (pagina de pacotes PA) antes do Dia 3 do sprint
- [ ] Security-specialist revisa SPEC-PROD-041 (mock de pagamento, credito de PA) e SPEC-PROD-042 (acesso admin, mascaramento de dados) antes do inicio de implementacao

---

## Specs Criadas neste Sprint Planning

| Spec ID | Titulo | Status | Arquivo |
|---------|--------|--------|---------|
| SPEC-PROD-039 | WizardFooter Global — Hook useFormDirty e Dialogo Padronizado | Draft | `docs/specs/sprint-36/SPEC-PROD-039-wizardfooter-global.md` |
| SPEC-PROD-040 | Sistema de Badges — 16 Conquistas em 4 Categorias | Draft | `docs/specs/sprint-36/SPEC-PROD-040-badge-system.md` |
| SPEC-PROD-041 | Pacotes de PA — Compra com Mock de Pagamento | Draft | `docs/specs/sprint-36/SPEC-PROD-041-pa-packages.md` |
| SPEC-PROD-042 | Dashboard Administrativo — KPIs de Economia PA e Usuarios | Draft | `docs/specs/sprint-36/SPEC-PROD-042-admin-dashboard.md` |

---

## Criterio de GO para Sprint 36 (Definition of Done)

| Criterio | Threshold |
|----------|-----------|
| SPEC-PROD-039: `useFormDirty` + `SaveDiscardDialog` cobrindo 6 fases | 0 fases sem dirty-state funcionando (Fases 1-4) |
| SPEC-PROD-039: testes unitarios do hook | Cobertura >= 90% |
| SPEC-PROD-039: zero regressoes no Phase4Wizard | Todos os testes existentes da Fase 4 passando |
| SPEC-PROD-040: BadgeEvaluationService avaliando todos os 16 badges | 16/16 badges com logica de concessao testada |
| SPEC-PROD-040: UI de colecao visivel em Meu Atlas | Colecao exibindo estados corretos (bloqueado/desbloqueado/progresso) |
| SPEC-PROD-041: fluxo de compra mock end-to-end funcional | Credito de PA confirmado em staging para os 4 pacotes |
| SPEC-PROD-041: `totalPoints` inalterado apos compra | 0 violacoes da regra "PA comprado nao conta para rank" |
| SPEC-PROD-042: dashboard ADMIN acessivel apenas por ADMIN | 0 acessos nao autorizados em testes de QA |
| SPEC-PROD-042: emails mascarados na tabela de usuarios | 0 emails nao mascarados visiveis |
| Taxa de aprovacao geral de testes | >= 95% (continuidade do criterio de Sprints 32-35) |
| Zero P0 bugs novos | 0 regressoes nos fluxos criticos existentes |

---

## Conexao com o Roadmap

| Sprint | Tema | Produto |
|--------|------|---------|
| Sprint 35 (completo) | Gamification Wave 1 — PA Visivel | v0.30.0 |
| **Sprint 36 (este)** | **Gamification Wave 2 — Full Gamification** | **v0.31.0** |
| Sprint 37 | Gamification Wave 3 — Monetizacao (gateway real) | v0.32.0 |
| Sprint 38 | Admin Dashboard completo + controles de PA + alertas | v0.33.0 |

O Sprint 36 fecha o ciclo de gamificacao visivel para o usuario. Apos este sprint, o Atlas tera:
- PA visivel e com proposta de valor clara (Wave 1)
- Badges desbloqueados e colecao de conquistas (Wave 2 — este sprint)
- Fluxo de compra de PA funcional, validado e pronto para integracao de gateway (Wave 3 prep — este sprint)

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-22 | product-owner | Documento inicial — Sprint 36 planning com 4 specs (SPEC-PROD-039 a 042). Tema: Gamification Wave 2 Full |
