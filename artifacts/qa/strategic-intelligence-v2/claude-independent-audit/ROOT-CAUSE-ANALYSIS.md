# ROOT-CAUSE-ANALYSIS.md · Causas de los cuatro bloqueos

**Fecha.** 2026-11-24.
**Bloqueos analizados.**
- Mantenimiento de hogares: falla en semana 2.
- Limpieza de muebles: falla en semana 4.
- Café Horizonte: falla en semana 2.
- Taller Andino: falla en semana 2.

---

## Metodología

La evidencia disponible incluye:

- `browser-observations-final.json` (ciclos completados y errores observados en el dashboard).
- `MODEL-EVALUATION.json` (10 evaluaciones aisladas con datos sintéticos — todas PASS).
- `baseline-failures.json` (2 evaluaciones aisladas con datos sintéticos v2 — ambas FAIL por errores distintos).
- Código fuente de `generate-ceo-plan.ts`, `strategic-context-server.ts`, `strategic-action.ts`, `ceo-agent.ts`.
- Logs estructurados del browser (`console.error("CEO_PLAN_GENERATION_ERROR")`).

Los logs de producción con el `code` y `kind` del error no son accesibles en este audit. Las causas se infieren con alta confianza a partir del patrón de fallos y la diferencia entre el evaluador y el pipeline real.

---

## Causa C1: El modelo falla al reproducir UUIDs de historial real

### Escenario
Semanas 2 y 4. El contexto estratégico (`strategicContext`) incluye historial de acciones con IDs UUID v4 reales (ej. `085045a8-53cd-4044-a46a-cc7b0c1ec03f`). El modelo debe referenciar estos IDs en `prior_action_id` y/o `completed_prerequisite_id`.

### Evidencia
- El evaluador usa IDs sintéticos (`00000000-0000-4000-8000-000000000001`). Los 10 intentos pasan.
- El pipeline real usa UUIDs v4. Los 4/5 escenarios fallan después de guardar el primer ciclo.
- En el intento 2, el prompt de reparación incluye los errores clasificados pero NO los IDs válidos disponibles. El modelo no puede corregir un UUID inválido sin saber cuál es el válido.
- `validateStrategicPlan()`: cuando `prior_action_id` apunta a un ID que no existe en `context.history`, el mensaje es "reference" / "La acción requiere un trabajo previo que aún no está completado."

### Función responsable
`validateStrategicPlan()` en `src/lib/ai/generate-ceo-plan.ts`, líneas 632-670.

### Archivo y función
- `src/lib/ai/generate-ceo-plan.ts`: función `generateCEOPlan()`, construcción de `retryInstructions` para intento 2.
- `src/lib/ai/generate-ceo-plan.ts`: función `validateStrategicPlan()`, validación de `prior_action_id`.

### Corrección propuesta
Incluir en el prompt de reparación (`REPARACIÓN ESTRATÉGICA`) los IDs del historial de acciones (`context.history`) y los IDs de evidencia válidos (`evidenceIds`) cuando los errores incluyen categorías `reference`.

---

## Causa C2: `new_evidence_id` referencia un ID que no está en `evidenceIds`

### Escenario
Cuando el contexto tiene `recentEvidence` con IDs reales, el modelo puede elegir un `new_evidence_id` para justificar `progression = "rework"`. Si el ID elegido corresponde a una evidencia con `certainty = "unknown"`, o si el modelo inventa el ID, falla la validación.

### Evidencia
- `evidenceIds` se calcula como: `context.recentEvidence.filter(row => row.certainty !== "unknown").map(row => row.id)`.
- En el evaluador: `evidence: []` → `evidenceIds = []`. El modelo no usa `new_evidence_id` porque no tiene evidencias que referenciar.
- En producción: si `business_evidence` contiene filas con `certainty = "unknown"`, los IDs correspondientes no estarán en `evidenceIds`. El modelo puede confundir qué IDs son válidos.

### Función responsable
`validateStrategicPlan()` en `generate-ceo-plan.ts`, línea ~657.

### Corrección propuesta
Incluir en el contexto enviado al modelo una lista explícita de `evidenceIds` válidos para `new_evidence_id` (ya existen en el contexto estratégico).

---

## Causa C3: Acumulación de historial produce más fallos de progresión

### Escenario
Por semana 4 (limpieza), el historial tiene ≥ 6 acciones de 3 ciclos. El validador de progresión `validateProgression()` detecta solapamiento con trabajo anterior. El modelo repite patrones de trabajo (`commercial_messages`, `lead_follow_up`) que el validador marca como repetición injustificada sin `progression = "continuation"` y un `prior_action_id` válido.

### Evidencia
- El evaluador de MODEL-EVALUATION.json siempre usa exactamente 1-3 acciones de historia (una sola semana previa).
- Limpieza llega a semana 4: el primer escenario en fallar después de múltiples ciclos exitosos.
- Los 4 escenarios con 1 semana de historial (mantenimiento, café, taller, nova) tienen el mismo problema en semana 2 (excepto nova que pasa).

### Función responsable
`validateProgression()` en `src/lib/strategic-action.ts`.

### Corrección propuesta
Proporcionar al modelo en la sección de reparación una descripción de los IDs de acciones pendientes del historial que podría retomar como `continuation`.

---

## Causa C4: Error de contexto en `loadStrategicContext` (posible secundaria)

### Escenario
Si la consulta paginada de `loadBusinessMemory` falla (timeout, error de DB), toda la generación falla con `CEO_PLAN_CONTEXT_LOAD_FAILED` antes de intentar generar.

### Evidencia
El browser-observations muestra solo `"error": "El plan de semana 2 quedó en estado failed."` sin más detalle. No se puede distinguir entre fallo de generación y fallo de contexto desde los artefactos disponibles.

### Función responsable
`loadBusinessMemory()` en `src/lib/strategic-context-server.ts`, líneas 10-27.

### Corrección propuesta
Agregar logging detallado con `correlation_id` antes de cada fase del pipeline. Registrar el `code` y `kind` del error en un campo de auditoría del plan.

---

## Resumen de causas

| ID | Causa | Confianza | Impacto | Corregible sin rediseño |
|---|---|---|---|---|
| C1 | Modelo no puede corregir UUID inválido en intento 2 | Alta | Bloquea semana N+1 | Sí |
| C2 | `new_evidence_id` apunta a evidencia de certainty "unknown" | Media | Bloquea rework | Sí |
| C3 | Historial acumulado aumenta tasa de error de progresión | Alta | Bloquea semanas 3+ | Parcialmente |
| C4 | Error de contexto no visible en logs de cliente | Baja | Oculta diagnóstico | Sí (observabilidad) |

---

## Escenario de regresión para C1

Fixture sintético equivalente al mantenimiento semana 2 con ID real:
```
business: Mantenimiento QA
week: 2
history[0].id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890" (UUID real)
history[0].status = "pending"
El modelo produce prior_action_id = "a1b2c3d5-..." (un carácter cambiado)
Resultado esperado: rechazo con categoría "reference"
Resultado observado actual: rechazo + intento 2 sin ID válido → fallo
Resultado esperado post-fix: intento 2 con lista de IDs válidos → pass
```
