# Planejamento de nova feature com o time completo

Execute o fluxo completo de planejamento para a feature: $ARGUMENTS

## Passo 1 — Product Owner define a story
Invoque o agente `product-owner` para:
1. Escrever a user story no formato correto
2. Definir os critérios de aceite
3. Adicionar ao `docs/tasks.md` na seção "Próximas"

## Passo 2 — Arquiteto avalia impacto técnico
Invoque o agente `architect` para:
1. Analisar o impacto da feature na arquitetura atual
2. Identificar se há decisões técnicas a documentar
3. Atualizar `docs/architecture.md` se necessário
4. Definir ou confirmar contratos de API em `docs/api.md`

## Passo 3 — Tech Lead planeja a execução
Invoque o agente `tech-lead` para:
1. Quebrar a story em tarefas técnicas atômicas
2. Atribuir tarefas aos devs (dev-fullstack-1 e dev-fullstack-2)
3. Identificar dependências entre tarefas
4. Atualizar `docs/tasks.md` com as tarefas na seção "Em andamento"

## Resultado esperado
Ao final, `docs/tasks.md` deve estar atualizado com todas as tarefas com `[ ]` prontas para os devs puxarem.
