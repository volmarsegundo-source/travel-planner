# Decisao de Nomenclatura — Moeda de Gamificacao

**Versao**: 1.0.0
**Data**: 2026-03-25
**Autor**: product-owner
**Status**: APROVADO
**Impacto**: Toda UI, marketing copy e documentacao que referenciem a moeda virtual

---

## Contexto

O sistema de gamificacao do Atlas usa uma moeda virtual chamada "Pontos Atlas" (PA) desde a Sprint 35. Com a migracao visual V2 em andamento (Sprint 39-40) e o design system estabelecido, este e o momento certo para consolidar a nomenclatura antes que o novo shell, navbar e dashboard V2 sejam implementados — qualquer troca posterior exigiria retrabalho em componentes ja migrados.

A pergunta a ser respondida: o nome "Pontos Atlas" e o melhor nome para a moeda, ou existe uma alternativa que serve melhor ao produto, ao usuario e ao posicionamento da marca?

---

## Criterios de Avaliacao

| Criterio | Peso | Descricao |
|---|---|---|
| Alinhamento com a metafora de viagem da marca Atlas | 25% | Coerencia com o vocabulario tematico (expedicao, roteiro, navegacao, explorador) |
| Familiaridade para o publico brasileiro | 25% | O usuario medio brasileiro entende intuitivamente o que e e como funciona |
| Naturalidade em frases de UI | 25% | "Voce ganhou X [nome]", "Saldo: X [nome]", "Custa 80 [nome]" soam bem |
| Abreviacao natural | 15% | Sigla curta, memoravel, funcionando em badges e componentes compactos |
| Diferenciacao competitiva | 10% | Nao confunde com o programa de outra marca ja estabelecida no mercado |

---

## Analise das Opcoes

### A) Pontos Atlas (PA) — atual

**Alinhamento tematico (25%)**: Fraco. "Pontos" e um termo completamente generico, sem qualquer evocacao de viagem, exploracao ou navegacao. O sobrenome "Atlas" ancora minimamente na marca, mas o substantivo nao contribui para o universo narrativo do produto.

**Familiaridade brasileira (25%)**: Alta. "Pontos" e o termo mais universal em programas de fidelidade e gamificacao no Brasil — pontos de cartao de credito, pontos de fidelidade de supermercado, pontos em jogos. O usuario nao precisa aprender o conceito.

**Naturalidade em frases (25%)**: Aceitavel, mas nao elegante.
- "Voce ganhou 100 Pontos Atlas" — funciona, mas e longo.
- "Saldo: 850 PA" — a abreviacao PA resolve o problema de espaco.
- "Custa 80 PA" — natural.

**Abreviacao (15%)**: "PA" e funcional. Dois caracteres, pronunciavel como uma palavra ("pa"), sem ambiguidade. Ja esta implementado em toda a codebase com essa sigla.

**Diferenciacao (10%)**: Fraca. "Pontos" e o substantivo mais comum em fidelidade no Brasil. Nao ha diferenciacao alguma — e literalmente o mesmo nome que qualquer outro programa usa.

**Score ponderado estimado**: Medio. Funciona, mas nao emociona.

---

### B) Coordenadas

**Alinhamento tematico (25%)**: Excelente. Coordenadas geograficas sao o elemento mais fundamental da navegacao e da cartografia. O nome Atlas significa "atlas geografico". Coordenadas conectam diretamente com a identidade visual do produto (mapas, rotas, expedicoes) e com o nome da moeda — voce "acumula coordenadas" para chegar ao destino. A metafora e coerente com o ciclo do produto: voce planeja uma expedicao acumulando conhecimento (coordenadas) ao longo do caminho.

**Familiaridade brasileira (25%)**: Media-baixa. O usuario brasileiro sabe o que sao coordenadas geograficas, mas nao associa instintivamente o termo a uma moeda virtual ou unidade de troca. Exige uma curva de aprendizado. "Voce usou 80 coordenadas para gerar seu roteiro" — a frase e tematicamente rica, mas semanticamente estranha: coordenadas nao se "gastam".

**Naturalidade em frases (25%)**: Problematica. A palavra "Coordenadas" e longa (12 caracteres), com plural formado por "coordenadas" (identico ao singular contextualmente), e o verbo "gastar/custar coordenadas" cria uma tensao semantica — coordenadas sao um local, nao um recurso consumivel. "Voce gastou 80 coordenadas" soa errado para um falante nativo.

**Abreviacao (15%)**: Ruim. "CO" e ambiguo (sigla de muitas coisas). "COORD" e longo demais para badges compactos. Nao ha abreviacao natural de 2 caracteres.

**Diferenciacao (10%)**: Alta. Nenhum programa de fidelidade ou moeda virtual usa "Coordenadas". E distinctivo.

**Score ponderado estimado**: Medio-baixo. A metafora e linda, mas o uso pratico em UI e problematico. O verbo "gastar coordenadas" quebra a imersao da propria metafora.

---

### C) Milhas Atlas

**Alinhamento tematico (25%)**: Bom. "Milhas" e uma unidade de distancia, usada em aviacao e navegacao maritima — alinha com o tema de expedicao. "Voce acumulou milhas" funciona narrativamente.

**Familiaridade brasileira (25%)**: Alta. O brasileiro conhece milhas aereas melhor do que qualquer outro conceito de fidelidade — Smiles, TudoAzul, Latam Pass. "Milhas" e sinonimo de programa de fidelidade de viagem no Brasil.

**Naturalidade em frases (25%)**: Boa para frases de ganho, problematica para frases de gasto.
- "Voce ganhou 100 Milhas Atlas" — natural, remete a check-in aeroportuario, gera associacao positiva.
- "Custa 80 Milhas Atlas" — funciona.
- "Saldo: 850 MA" — a sigla "MA" pode ser lida como Estado do Maranhao (sigla oficial brasileira). Gera confusao.

**Abreviacao (15%)**: Critica falha. "MA" e a sigla oficial do estado do Maranhao no Brasil. Em qualquer contexto brasileiro, "850 MA" sera lido como referencia geografica, nao como saldo de moeda. Isso e um problema real de UX.

**Diferenciacao (10%)**: Baixa a media. O termo "Milhas" esta fortemente associado a companhias aereas. Usar "Milhas Atlas" pode confundir o usuario sobre se o produto tem parceria com alguma companhia aerea ou se as milhas sao transferiveis/resgatavel em passagens — gerando expectativas incorretas que levam a frustracao.

**Score ponderado estimado**: Medio. A familiaridade e forte, mas a sigla "MA" e o risco de confusao com programas aereos sao bloqueadores serios.

---

### D) Creditos Atlas

**Alinhamento tematico (25%)**: Fraco. "Creditos" e um termo puramente transacional, sem qualquer evocacao de viagem, aventura ou exploracao. E o vocabulario de plataformas SaaS e jogos de cassino, nao de um produto de experiencias de viagem.

**Familiaridade brasileira (25%)**: Alta. O brasileiro entende creditos instantaneamente — creditos de celular, creditos de plataforma, creditos de jogo. Sem curva de aprendizado.

**Naturalidade em frases (25%)**: Boa e clara.
- "Voce ganhou 100 Creditos Atlas" — funciona.
- "Custa 80 Creditos" — diretissimo.
- "CA" como abreviacao — aceitavel, mas "CA" tambem e sigla de California nos EUA (menor relevancia para o publico BR).

**Abreviacao (15%)**: "CA" e funcional para o publico brasileiro. Dois caracteres, sem ambiguidade local critica.

**Diferenciacao (10%)**: Baixa. "Creditos" e o substantivo mais generico possivel em produtos digitais. Nenhuma diferenciacao.

**Score ponderado estimado**: Medio-baixo. Claro e funcional, mas desalinhado com a identidade de marca do Atlas.

---

### E) Sugestao alternativa: Bussolas

**Alinhamento tematico (25%)**: Excelente. A bussola e o instrumento de navegacao mais iconico da historia da exploracao. Ela orienta o explorador, aponta o caminho — metafora perfeita para uma moeda que "orienta" o viajante em sua expedicao. O Atlas e um produto de navegacao de viagens. Acumular bussolas = acumular capacidade de se orientar, de explorar mais.

**Familiaridade brasileira (25%)**: Media. O brasileiro conhece o objeto "bussola", mas nao associa imediatamente a uma unidade de troca. Exige um momento de onboarding para estabelecer a convencao — o que, com o tutorial ja implementado (Wave 1), e viavel.

**Naturalidade em frases (25%)**: Boa, com nuances.
- "Voce ganhou 100 Bussolas" — evocativo, memoravel, diferente de tudo que o usuario ja viu.
- "Custa 80 Bussolas" — funciona. "Gastar bussolas" e semanticamente mais aceitavel que "gastar coordenadas" porque bussolas sao objetos, nao localizacoes.
- "Saldo: 850 BU" — a abreviacao "BU" e neutra e sem conflito com siglas brasileiras conhecidas.

**Abreviacao (15%)**: "BU" — dois caracteres, sem conflito de sigla critica no contexto brasileiro.

**Diferenciacao (10%)**: Muito alta. Nenhum programa de fidelidade ou moeda de gamificacao usa "Bussolas". E imediatamente associado ao universo de exploracao e navegacao.

**Score ponderado estimado**: Alto. Forte alinhamento tematico, diferenciacao maxima, frases funcionais.

---

## Matriz de Scores

| Criterio | Peso | Pontos Atlas (PA) | Coordenadas | Milhas Atlas | Creditos Atlas | Bussolas |
|---|---|---|---|---|---|---|
| Alinhamento tematico | 25% | 2 | 5 | 3 | 1 | 5 |
| Familiaridade brasileira | 25% | 5 | 2 | 5 | 5 | 3 |
| Naturalidade em frases | 25% | 4 | 2 | 3 | 4 | 4 |
| Abreviacao natural | 15% | 5 | 1 | 2 | 3 | 4 |
| Diferenciacao competitiva | 10% | 1 | 5 | 2 | 1 | 5 |
| **Score ponderado** | | **3.65** | **2.85** | **3.25** | **3.25** | **4.15** |

---

## Recomendacao

### Opcao recomendada: Bussolas (BU)

Score: **4.15** — maior entre todas as opcoes avaliadas.

A "Bussola" e o instrumento que define o explorador. No universo Atlas, onde o usuario e um "Explorador" (rank inicial), realiza "Expedicoes", segue "Fases" com nomes como "O Chamado" e "O Roteiro" — acumular Bussolas e a extensao natural desse vocabulario. O usuario nao coleta pontos genericos; ele acumula ferramentas de navegacao que permitem ir mais longe em sua expedicao.

**Por que nao as outras:**

- **Pontos Atlas (PA)**: O nome atual e funcional e tem o menor custo de migracao (zero), mas e a opcao mais generica. Se o produto vai competir com base em experiencia de marca — e o design V2 sinaliza claramente que vai — "Pontos" e um nome que nao contribui para essa diferenciacao.

- **Coordenadas**: A metafora e poetica, mas o substantivo nao funciona como unidade de troca. Coordenadas sao locais, nao recursos. A tensao semantica ("gastar coordenadas") quebra a imersao da propria metafora que o nome tenta criar.

- **Milhas Atlas**: A familiaridade e tentadora, mas a sigla "MA" (Maranhao) e o risco de expectativa incorreta de parceria aerea sao bloqueadores reais para um produto brasileiro. A experiencia de companhias aereas com "milhas" criou uma expectativa especifica no consumidor brasileiro que esse produto nao pode cumprir.

- **Creditos Atlas**: Claro e funcional, mas e o vocabulario de SaaS, nao de viagem. Desalinhado com a identidade de marca do Atlas em construcao.

---

### Recomendacao alternativa: manter Pontos Atlas (PA) se o custo de migracao for o fator decisivo

Se o tech-lead avaliar que a migracao de PA para BU representa risco significativo para o Sprint 40 (strings de UI, constantes de codigo, documentacao, historico de transacoes), a decisao valida e **manter "Pontos Atlas" (PA) para o MVP e revisar na Sprint 43+ junto com as features de booking e destinos dinamicos**, quando o produto entrara em uma nova fase de posicionamento.

Nesse caso, registrar como decisao explicita: "PA e o nome do MVP; a revisao de nomenclatura e um item de backlog para pos-MVP."

O que nao deve acontecer e iniciar a migracao V2 sem uma decisao sobre nomenclatura — o design V2 usa o PA badge no AuthenticatedNavbarV2 (SPEC-PROD-051) e no Dashboard V2 (SPEC-PROD-054). Se o nome vai mudar, o momento e agora.

---

## Impacto da Mudanca (se Bussolas for aprovado)

### Componentes de UI afetados
- `AuthenticatedNavbarV2` — PA badge (SPEC-PROD-051)
- `Dashboard "Meu Atlas" V2` — PA balance header (SPEC-PROD-054)
- `WizardFooter` — exibe saldo e custo de IA antes de confirmar
- Modal de confirmacao de custo de IA (Waves 1-2)
- Tela de saldo insuficiente
- Pacotes de compra (SPEC-PROD-045): "Pacote Explorador — 500 Bussolas"
- Historico de transacoes

### Constantes de codigo a renomear
- Sigla `PA` nos nomes de constantes (ex: `WELCOME_BONUS` ja e agnóstico — sem impacto)
- Comentarios e strings de UI com "Pontos Atlas" ou "PA"
- `availablePoints` e `totalPoints` — nomes de campos Prisma; semanticamente corretos independente do nome da moeda, nao precisam mudar

### Documentacao a atualizar
- `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md` — secao 1.1 e toda referencia a "PA"
- `docs/specs/gamification/SPEC-PROD-GAMIFICATION.md`
- `MEMORY.md` do product-owner

### Estimativa de esforco de migracao
- UI strings: ~2h (busca e substituicao + revisao contextual)
- Documentacao: ~1h
- Testes (mocks de strings): ~1h
- **Total: ~4h** — dentro do buffer do Sprint 40 (7h disponivel)

---

## Decisao Final

**Aguardando aprovacao do tech-lead e stakeholder.**

Opcoes para resposta:
1. **Aprovar Bussolas (BU)** — migracao no Sprint 40, custo ~4h do buffer
2. **Manter Pontos Atlas (PA)** — zero custo de migracao, revisao agendada para pos-MVP
3. **Solicitar validacao com usuarios** — adiar decisao para Sprint 41, rodar teste de nomenclatura com beta users

---

> **Nota para o tech-lead**: Se a decisao for (1), o ideal e que a migracao de strings aconteca como primeira tarefa do Sprint 40, antes de qualquer componente V2 ser implementado com o nome antigo. Isso evita retrabalho nos componentes migrados.

---

**Arquivo**: `docs/specs/sprint-40/NAMING-DECISION-PA.md`
**Proximo passo**: Tech-lead e stakeholder revisam e respondem com opcao 1, 2 ou 3 acima.
