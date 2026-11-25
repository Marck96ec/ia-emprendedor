# Strategic Intelligence Engine v2.0

La generación normal del CEO ahora recibe memoria versionada, recursos explícitos, activos reutilizables, acciones históricas y evidencia reciente. Valida factibilidad, progresión y tipo de entregable antes de persistir el plan. El cierre semanal registra como inconclusa una hipótesis incompatible con la evidencia y conserva la percepción del usuario.

## Cambios en el producto

- **Memoria.** Declaraciones de canales y responsables en «Canales y recursos». Las revisiones nuevas agregan un aprendizaje con referencia al cierre persistido.
- **Plan.** La decisión usa las entradas del negocio y el estado del trabajo anterior. Cada acción v2 tiene intención, recursos, relación con el historial, tipo de entregable y dependencia cuando corresponde.
- **Ejecución.** El tablero muestra una acción bloqueada o pendiente de confirmar recursos. Una dependencia del mismo plan se desbloquea cuando se completa la acción anterior. Los cobros usan la capacidad existente de mensajes completos, con dos variantes si la acción pide dos.
- **Interfaz.** El centro mantiene la composición de v3.3. Los detalles de recursos, continuación y dependencias aparecen en superficies secundarias. En escritorios de poca altura se ajustó el espaciado sin añadir recortes.

## Archivos principales

| Capa | Archivos |
|---|---|
| Memoria y RLS | `supabase/migrations/20261124200000_add_business_memory.sql`, `src/lib/business-memory.ts`, `src/actions/business-memory.ts` |
| Contexto y generación | `src/lib/strategic-context.ts`, `src/lib/strategic-context-server.ts`, `src/actions/ceo-plan.ts`, `src/lib/ai/generate-ceo-plan.ts`, `src/lib/ai/ceo-agent.ts` |
| Progresión y factibilidad | `src/lib/strategic-action.ts`, `src/lib/strategic-continuity.ts`, `supabase/migrations/20261124201000_enforce_weekly_action_dependencies.sql` |
| Aprendizaje y ejecución | `src/lib/decision-learning.ts`, `src/actions/action-ai.ts`, `src/lib/ai/generate-commercial-messages.ts`, `src/app/actions/[actionId]/page.tsx` |
| Interfaz | `src/app/business-context/page.tsx`, dashboard, historial, revisión y componentes del tablero |
| Regresión | `tests/strategic-intelligence.test.ts` y `tests/supabase-business-memory.integration.test.ts` |

Las migraciones se aplicaron en Supabase local. Los planes v3.3 siguen siendo legibles sin metadatos nuevos. Los dictámenes y el alcance de verificación se detallan en el [reporte QA](./QA-REPORT.md).
