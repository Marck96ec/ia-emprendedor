# TUCEO IA V2 — Validación funcional y técnica

Fecha de validación: 2026-11-03  
Rama: `feat/conversational-review-learning-v2`

## Alcance implementado

La revisión semanal mantiene un formulario determinista y no crea un agente
conversacional ni realiza llamadas nuevas a modelos durante la revisión.

Se implementó:

- revisión progresiva en [conversational-weekly-review.tsx](../../src/components/conversational-weekly-review.tsx);
- borradores retomables separados del historial inmutable;
- mensajes contextuales construidos desde datos persistidos;
- escritura progresiva, indicador de pensamiento, navegación atrás, edición,
  resumen editable y confirmación;
- soporte para `prefers-reduced-motion`, foco, teclado y etiquetas ARIA;
- evidencia operativa append-only con origen de acción;
- métricas de ejecución con límites explícitos: no se presentan como ventas,
  ingresos o utilidad;
- cálculo puro de costo total, utilidad estimada, margen y utilidad por hora;
- resultados inferiores a la meta y cero elementos válidos en grupos repetibles;
- contrato de continuidad estratégica y validación determinista de repeticiones;
- recuperación de aprendizajes de hasta tres semanas anteriores para la
  siguiente generación de plan.

## Arquitectura modificada

### Presentación

- [conversational-weekly-review.tsx](../../src/components/conversational-weekly-review.tsx):
  estado controlado y flujo visual.
- [dynamic-action-completion-form.tsx](../../src/components/dynamic-action-completion-form.tsx):
  permite registrar los elementos que realmente ocurrieron.

### Aplicación

- [weekly-review.ts](../../src/actions/weekly-review.ts):
  guardado de borradores, confirmación final e idempotencia existente.
- [weekly-actions.ts](../../src/actions/weekly-actions.ts):
  extracción de evidencia después de completar una acción.
- [ceo-plan.ts](../../src/actions/ceo-plan.ts):
  transporte del contexto acumulado y continuidad persistida.

### Dominio

- [weekly-review-types.ts](../../src/lib/weekly-review-types.ts)
- [weekly-review-context.ts](../../src/lib/weekly-review-context.ts)
- [business-evidence.ts](../../src/lib/business-evidence.ts)
- [business-metrics.ts](../../src/lib/business-metrics.ts)
- [profitability.ts](../../src/lib/profitability.ts)
- [strategic-continuity.ts](../../src/lib/strategic-continuity.ts)
- [decision-learning.ts](../../src/lib/decision-learning.ts)
- [action-capture.ts](../../src/lib/action-capture.ts)

### Persistencia

Se añadieron migraciones incrementales:

- [20261103220000_add_review_drafts_and_business_evidence.sql](../../supabase/migrations/20261103220000_add_review_drafts_and_business_evidence.sql)
  crea `weekly_review_drafts` con RLS, `business_evidence` append-only con
  fuente, tipo, certeza y clave de deduplicación, y relaciones explícitas para
  vincular seguimientos con oportunidades.
- [20261103221000_allow_actual_results_below_targets.sql](../../supabase/migrations/20261103221000_allow_actual_results_below_targets.sql)
  ajusta la validación PostgreSQL para que `repeatable_group` no convierta una
  meta planificada en un mínimo de resultados.
- [20261103222000_add_strategic_continuity.sql](../../supabase/migrations/20261103222000_add_strategic_continuity.sql)
  añade el bloque opcional histórico y el overload atómico de
  `complete_ceo_plan`.

No se modificaron migraciones existentes ni se ejecutaron migraciones remotas.

## Criterios funcionales

| Criterio | Resultado |
|---|---|
| Una pregunta activa por vez | Implementado |
| Respuestas rápidas y abiertas | Implementado |
| Atrás y edición de respuestas | Implementado |
| Borrador retomable sin cerrar la semana | Implementado |
| Confirmación antes del guardado final | Implementado |
| Animación de pensamiento sin IA | Implementado |
| Escritura progresiva cancelable | Implementado |
| Movimiento reducido | Implementado |
| Cero o menos elementos que la meta | Implementado |
| Evidencia con origen y deduplicación | Implementado |
| Métricas sin inventar ceros | Implementado para evidencia disponible |
| Cálculos de rentabilidad verificables | Implementado como funciones puras |
| Repetición estratégica justificada | Validación implementada |
| RLS para borradores y evidencia | Definido en migración |

Las métricas de ventas, ingresos, costos o utilidad solo se muestran cuando
existe evidencia estructurada suficiente. La pantalla no transforma la
ejecución de acciones en una conclusión comercial.

## Pruebas ejecutadas

Comandos ejecutados con `npm.cmd`:

```text
npm.cmd run typecheck  ✅
npm.cmd test          ✅ 111 tests, 108 pass, 3 skipped, 0 fail
npm.cmd run lint      ✅
npm.cmd run build     ✅
```

La suite omitió tres pruebas por las condiciones del entorno de integración;
no se reportaron como exitosas.

La cobertura añadida incluye:

- grupos repetibles vacíos o por debajo de la meta;
- extracción de evidencia y ausencia de registros inventados;
- rentabilidad con costos faltantes;
- continuidad repetida sin señal nueva;
- profundización con señal verificable;
- sanitización de borradores;
- límites explícitos de métricas de ejecución;
- regresión textual de la experiencia conversacional.

## Seguridad y compatibilidad

- No se expusieron secretos ni claves de servidor a Client Components.
- La revisión final sigue siendo inmutable; solo el borrador es editable.
- La evidencia histórica no se actualiza ni se elimina.
- Las tablas nuevas aplican RLS por `businesses.owner_id`.
- La función de completado de acciones conserva validación de estructura,
  tamaño, tipos, rangos, opciones, ownership y estado del plan.
- La continuidad es opcional al leer planes antiguos y requerida por la
  validación de planes consecutivos cuando existe contexto previo.
- No se hicieron commits, push, merge ni despliegues.

## Auditoría de dependencias

La auditoría se ejecutó sin actualizar dependencias:

- `npm.cmd audit --omit=dev`: 5 vulnerabilidades, 1 crítica y 4 altas.
  Incluye `next` como dependencia directa crítica y `zod` como directa alta,
  además de advisories transitivos en `@modelcontextprotocol/client`,
  `sharp` y `source-map-js`.
- `npm.cmd audit --include=dev`: 23 vulnerabilidades, 1 crítica, 6 altas y
  16 moderadas. Las restantes se concentran principalmente en la cadena de
  ESLint y herramientas de desarrollo.

No se ejecutaron actualizaciones forzadas o mayores. La vulnerabilidad crítica
de `next` requiere una decisión de actualización separada, validación de
compatibilidad y revisión específica del entorno Windows/Vercel antes de
autorizarla.

## Riesgos pendientes

1. Las migraciones nuevas deben aplicarse primero en un entorno Supabase
   aislado y validarse con las pruebas de integración antes de producción.
2. La evidencia genérica conserva datos estructurados de acciones; los flujos
   específicos para productos, oportunidades y costos pueden ampliarse sin
   cambiar el historial, pero requieren contratos de captura adicionales.
3. La continuidad estratégica depende de que la salida del plan incluya el
   bloque nuevo; los planes históricos se leen de manera compatible.
4. La auditoría de dependencias queda pendiente de una actualización autorizada.

## Recomendación

**NO-GO para crear PR de producción todavía.**

La implementación compila y pasa las pruebas disponibles, pero la
recomendación permanece NO-GO hasta:

1. aplicar y probar las tres migraciones en Supabase local/aislado;
2. ejecutar las pruebas de integración contra ese esquema;
3. revisar y autorizar la remediación de las vulnerabilidades de producción;
4. hacer una validación responsive manual en móvil, tablet y escritorio.

## Lista de archivos modificados

### Aplicación y dominio

- `src/actions/ceo-plan.ts`
- `src/actions/weekly-actions.ts`
- `src/actions/weekly-review.ts`
- `src/app/dashboard/page.tsx`
- `src/app/weekly-review/page.tsx`
- `src/components/conversational-weekly-review.tsx`
- `src/components/dynamic-action-completion-form.tsx`
- `src/lib/action-capture.ts`
- `src/lib/ai/ceo-agent.ts`
- `src/lib/ai/generate-ceo-plan.ts`
- `src/lib/business-evidence.ts`
- `src/lib/business-metrics.ts`
- `src/lib/dashboard-types.ts`
- `src/lib/profitability.ts`
- `src/lib/strategic-continuity.ts`
- `src/lib/weekly-review-context.ts`
- `src/lib/weekly-review-types.ts`

### Base de datos

- `supabase/migrations/20261103220000_add_review_drafts_and_business_evidence.sql`
- `supabase/migrations/20261103221000_allow_actual_results_below_targets.sql`
- `supabase/migrations/20261103222000_add_strategic_continuity.sql`

### Pruebas

- `tests/action-capture.test.ts`
- `tests/action-completion-form.test.tsx`
- `tests/ceo-plan-output-schema.test.ts`
- `tests/dashboard-ux.test.ts`
- `tests/fixtures/action-completion-cases.json`
- `tests/weekly-review-domain.test.ts`
