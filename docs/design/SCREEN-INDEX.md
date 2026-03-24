# Atlas Design — Screen Reference Index

> Este arquivo mapeia as telas oficiais do design system.
> Os agentes devem seguir APENAS as telas marcadas como "oficial".
> Variantes alternativas estão disponíveis para referência mas NÃO devem ser implementadas.

## Telas Oficiais (implementar estas)

|Tela|Pasta de Referência|Status|
|-|-|-|
|Landing Page|`stitch-exports/atlas\\\_landing\\\_page\\\_a\\\_inspira\\\_o/`|✅ Exportada|
|Dashboard|`stitch-exports/atlas\\\_user\\\_dashboard\\\_o\\\_perfil\\\_1/`|✅ Exportada|
|Phase 1 - Wizard|`stitch-exports/phase\\\_1\\\_a\\\_inspira\\\_o\\\_wizard\\\_1/`|✅ Exportada|
|Phase 3 - O Preparo|`stitch-exports/trip\\\_planning\\\_hub\\\_o\\\_preparo/`|✅ Exportada|
|Roteiro / Itinerário|`stitch-exports/ai\\\_powered\\\_itinerary\\\_roteiro/`|✅ Exportada|
|Login|`stitch-exports/login/`|✅ Exportada|
|Phase 2 - O Perfil|stitch-exports/phase2\_o\_perfil/|✅ Exportada|
|Phase 4 - A Logística|stitch-exports/phase4\_a\_logistica/|✅ Exportada|
|Phase 5 - Guia do Destino|stitch-exports/phase5\_guia\_destino/|✅ Exportada|
|Phase 6 - Roteiro (detalhado)|stitch-exports/phase6\_roteiro\_detalhado/|✅ Exportada|
|Sumário da Expedição|stitch-exports/summary\_expedicao/|✅ Exportada|

## Variantes Alternativas (apenas referência)

|Variante|Motivo da não-seleção|
|-|-|
|`atlas\\\_landing\\\_page\\\_premium\\\_v2\\\_1/`|Alternativa de Landing|
|`atlas\\\_landing\\\_page\\\_premium\\\_v2\\\_2/`|Alternativa de Landing|
|`atlas\\\_landing\\\_page\\\_tropical\\\_variant/`|Alternativa de Landing|
|`atlas\\\_user\\\_dashboard\\\_o\\\_perfil\\\_2/`|Alternativa de Dashboard|
|`phase\\\_1\\\_a\\\_inspira\\\_o\\\_wizard\\\_2/`|Alternativa de Phase 1|

## Cada pasta contém

* `code.html` — HTML/CSS exportado do Stitch (referência de implementação)
* `screen.png` — Screenshot da tela (referência visual)

## Regras para Agentes

1. Sempre consulte este arquivo antes de iniciar trabalho em UI
2. Implemente APENAS as telas oficiais listadas acima
3. Use `code.html` como referência de estrutura e `screen.png` como referência visual
4. Todos componentes devem vir de `src/components/ui/` — consulte `DESIGN.md`
5. Telas pendentes serão geradas no Stitch e adicionadas antes do Sprint 35

