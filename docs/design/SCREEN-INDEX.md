# Atlas Design — Screen Reference Index

> Este arquivo mapeia as telas oficiais do design system.
> Os agentes devem seguir APENAS as telas marcadas como "oficial".
> Variantes alternativas estão disponíveis para referência mas NÃO devem ser implementadas.

## Telas Oficiais (implementar estas)

| Tela               | Pasta de Referência                        | Status       |
|--------------------|--------------------------------------------|--------------|
| Landing Page       | `stitch-exports/atlas_landing_page_a_inspira_o/`   | ✅ Exportada |
| Dashboard          | `stitch-exports/atlas_user_dashboard_o_perfil_1/`  | ✅ Exportada |
| Phase 1 - Wizard   | `stitch-exports/phase_1_a_inspira_o_wizard_1/`     | ✅ Exportada |
| Phase 3 - O Preparo| `stitch-exports/trip_planning_hub_o_preparo/`       | ✅ Exportada |
| Roteiro / Itinerário| `stitch-exports/ai_powered_itinerary_roteiro/`     | ✅ Exportada |
| Login              | —                                          | ⏳ Pendente  |
| Phase 2 - O Perfil | —                                          | ⏳ Pendente  |
| Phase 4 - A Logística | —                                       | ⏳ Pendente  |
| Phase 5 - Guia do Destino | —                                  | ⏳ Pendente  |
| Phase 6 - Roteiro (detalhado) | —                              | ⏳ Pendente  |
| Sumário da Expedição | —                                       | ⏳ Pendente  |

## Variantes Alternativas (apenas referência)

| Variante                                  | Motivo da não-seleção         |
|-------------------------------------------|-------------------------------|
| `atlas_landing_page_premium_v2_1/`        | Alternativa de Landing        |
| `atlas_landing_page_premium_v2_2/`        | Alternativa de Landing        |
| `atlas_landing_page_tropical_variant/`    | Alternativa de Landing        |
| `atlas_user_dashboard_o_perfil_2/`        | Alternativa de Dashboard      |
| `phase_1_a_inspira_o_wizard_2/`           | Alternativa de Phase 1        |

## Cada pasta contém

- `code.html` — HTML/CSS exportado do Stitch (referência de implementação)
- `screen.png` — Screenshot da tela (referência visual)

## Regras para Agentes

1. Sempre consulte este arquivo antes de iniciar trabalho em UI
2. Implemente APENAS as telas oficiais listadas acima
3. Use `code.html` como referência de estrutura e `screen.png` como referência visual
4. Todos componentes devem vir de `src/components/ui/` — consulte `DESIGN.md`
5. Telas pendentes serão geradas no Stitch e adicionadas antes do Sprint 35
