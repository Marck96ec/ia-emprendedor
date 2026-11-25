# PIPELINE-PARITY-REPORT.md · Comparación evaluador vs. pipeline real

**Fecha.** 2026-11-24.
**Pregunta central.** ¿Por qué el generador aprueba 10/10 evaluaciones aisladas, mientras cuatro de cinco negocios no consiguen completar cuatro ciclos desde la aplicación real?

---

## Tabla de diferencias

| Dimensión | `evaluate-model.mjs` (evaluador) | `generateCEOPlanAction` (pipeline real) |
|---|---|---|
| IDs de historial | Sintéticos: `00000000-0000-4000-8000-000000000001` | UUIDs v4 reales desde DB |
| Número de acciones en historial | 1–3 acciones (1 semana sintética) | 0–60 acciones reales (hasta 12 planes) |
| Memoria | 2–3 registros sintéticos construidos en código | Cargados vía RPC `business_memory_as_of` (paginado, hasta 100+ registros) |
| Evidencia (`recentEvidence`) | `evidence: []` → siempre vacía | Desde `business_evidence` tabla, hasta 24 filas con IDs reales |
| `assessment` | No se pasa (ausente) | `buildBusinessAssessment()` → objeto completo en el prompt |
| `hypothesis_status` | Forzado a `"inconclusive"` en línea 143 | Valor real desde `decision_learning.hypothesis_status` en DB |
| Contexto estratégico | Construido con `buildStrategicContext()` directamente | Cargado desde DB + `restoreReviewFeedback()` + `loadBusinessKnowledge()` |
| Número de intentos observados | ≤ 2 (10/10 pasan) | ≤ 2 (4/5 fallan después de semana 1) |
| Reparaciones del intento 1 | 5/10 casos necesitan reparaciones determinísticas | No medido; inferido alto |
| Modelo | `gpt-5.4-mini` (vía `OPENAI_MODEL` env) | `gpt-5.4-mini` (mismo) |
| Prompt version | `v7-strategic-reliability` (misma) | `v7-strategic-reliability` |
| `generateCEOPlan()` | Llamada directa con `runner = undefined` | Llamada directa con `runner = undefined` |

---

## El problema central: IDs sintéticos vs. reales

El evaluador usa IDs con formato fijo y predecible:
```
00000000-0000-4000-8000-000000000001
00000000-0000-4000-8000-000000000002
00000000-0000-4000-8000-000000000003
```

Estos IDs tienen un patrón visual obvio. El modelo puede "reconocerlos" y copiarlos correctamente desde el contexto.

Los IDs reales son como:
```
085045a8-53cd-4044-a46a-cc7b0c1ec03f
b0af7f31-962d-4c45-8144-6cda1b18bc87
```

Son entropía pura. El modelo debe copiarlos exactamente desde el JSON de historial recibido. Si falla en un carácter, la validación rechaza el plan con un error de `reference` que el segundo intento no puede corregir sin conocer los IDs válidos.

---

## El problema secundario: `assessment` no presente en evaluador

El evaluador no incluye `assessment`:
```javascript
const plan = await generateCEOPlan({ ...entry.input, previousWeek, strategicContext }, ...)
// entry.input no tiene assessment
```

El pipeline real construye y pasa `assessment = buildBusinessAssessment(...)`. Esto añade entre 500-1000 tokens al prompt. El modelo debe procesar más contexto antes de generar el plan.

---

## El problema terciario: historial mínimo en el evaluador

El evaluador usa 1-3 acciones de una sola semana previa sintética. El pipeline real por semana 4 puede tener:
- 3 semanas × (1-3 acciones/semana) = 3-9 acciones reales con UUIDs
- Cada acción con `completion_data` real (hasta 420 chars)
- `strategy` serializado en `ceo_plans.weekly_plan` JSON

El volumen y complejidad del historial aumenta la probabilidad de que el modelo elija referencias incorrectas.

---

## Falso positivo confirmado

Los 10/10 pases del evaluador son **falsos positivos parciales**: demuestran que el modelo puede generar planes válidos con contexto sintético simplificado, pero no demuestran fiabilidad con contexto real del producto.

Esto no invalida el evaluador como herramienta, pero sí requiere que sea actualizado para incluir:
1. IDs en formato UUID v4 real (o UUID-like random).
2. `assessment` generado por `buildBusinessAssessment`.
3. Al menos 2 semanas de historial para escenarios de continuidad.

---

## Recomendación

La evaluación aislada debe replicar las condiciones del pipeline real para ser un indicador confiable. Cambio mínimo: usar UUIDs v4 generados aleatoriamente para los IDs de historial en el evaluador, y agregar `assessment` al input.

El fix principal no está en el evaluador sino en el pipeline: **el prompt de reparación del intento 2 debe incluir los IDs válidos disponibles cuando el error es de tipo `reference`**.
