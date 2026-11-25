# ARCHITECTURE-AUDIT.md · Independent Architecture Audit

**Auditor.** Claude Sonnet 4.6, independent review.
**Fecha.** 2026-11-24.
**Rama.** `feature/strategic-intelligence-v2`.
**Referencia Codex.** `a43187b8583f281ebdd701e3ae6499cd3084f8b5`.

---

## 1. ¿La arquitectura es proporcional al problema?

**Parcialmente sí.** El ciclo `Comprender → Diagnosticar → Decidir → Planificar → Ejecutar → Registrar → Aprender → Adaptar` está bien reflejado en los módulos. La separación entre `business-memory`, `strategic-context`, `strategic-action` y `generate-ceo-plan` es coherente.

Sin embargo, el contrato del modelo es desproporcionadamente complejo para la fiabilidad de generación requerida. El modelo debe resolver simultáneamente:

| Responsabilidad | Tipo |
|---|---|
| Razonamiento estratégico (business_understanding → decision) | LLM |
| Continuidad (strategic_continuity con 4 campos) | LLM |
| Hipótesis (decision_hypothesis) | LLM |
| Referencias de historia (prior_action_id, completed_prerequisite_id) | LLM + UUID |
| Dependencias entre acciones (depends_on_sequence) | LLM |
| Progresión (progression, prior_barrier) | LLM |
| Captura de evidencia (capture_schema con validaciones de cardinalidad) | LLM |
| Horas y distribución de tiempo | LLM |
| Entregable asistido (deliverable, action_type, execution_mode) | LLM |

Pedir al modelo que genere UUIDs correctos de historia mientras simultáneamente razona estratégicamente es una fuente demostrada de errores en entornos con historial real.

## 2. ¿Existen responsabilidades duplicadas?

Sí, en dos lugares:

1. **`CEOPlanSchema` y `StrategicCEOPlanModelSchema`** difieren solo en que el segundo exige `strategy` en cada acción. Hay duplicación de los campos base que podría simplificarse.

2. **`retryInstructions` vs `REPARACIÓN ESTRATÉGICA`**: el prompt tiene dos secciones de reparación. Para plans no estratégicos (semana 1 sin context), usa `retryInstructions`. Para planes estratégicos (semana 2+), usa la sección `REPARACIÓN ESTRATÉGICA`. La condición `attempt === 1 || input.strategicContext` hace que `retryInstructions` sea siempre vacío para semanas ≥ 2. Esto es correcto funcionalmente pero confuso.

## 3. ¿Los contratos del modelo son excesivamente complejos?

**Sí.** La combinación de:
- Schema estructurado con 15+ campos requeridos en `StrategicCEOPlanModelSchema`
- Referencias cruzadas a UUIDs de historial real
- Validaciones de progresión que dependen de haber leído correctamente el historial
- Reglas de captura con cardinalidad (min_items/max_items)

produce una tasa de fallo por intento ~40-60% en el primer intento con contexto real (observado en MODEL-EVALUATION.json: 5/10 necesitaron 2 intentos, pero 10/10 pasaron con datos sintéticos).

## 4. ¿Se solicita al LLM información derivable determinísticamente?

Sí, en dos casos:

1. **`depends_on_sequence`**: el orden de dependencias entre acciones del mismo plan puede verificarse determinísticamente después de generar. El modelo lo debe inferir, pero la reparación posterior podría corregirlo sin regenerar.

2. **`allocated_hours` / `reserved_hours`**: estos valores son calculados después de la generación (`time_allocation` se sobreescribe en `generateCEOPlan`). No hay problema real aquí, pero el modelo no necesita producirlos con precisión.

## 5. ¿Se usan referencias históricas difíciles de generar correctamente?

**Sí. Este es el problema principal.**

`prior_action_id` y `completed_prerequisite_id` requieren que el modelo reproduzca exactamente un UUID de historial real. En el evaluador (`evaluate-model.mjs`) los IDs son sintéticos (`00000000-0000-4000-8000-000000000001`), lo que hace el problema invisible. En producción, los IDs son UUIDs v4 reales que el modelo debe extraer del JSON de historial recibido.

Cuando el modelo falla al referenciar correctamente un UUID (por ejemplo, usa un ID inventado o un ID de historia con status incorrecto), la validación `validateStrategicPlan()` rechaza el plan. El mensaje de error en el segundo intento no incluye qué IDs válidos existen para ese campo. El modelo no tiene información adicional para corregir el error.

## 6. ¿Existen validadores contradictorios?

No contradictorios, pero sí superpuestos:

- `CEOPlanBusinessRulesSchema` valida coherencia estructural (horas, ai_assisted, etc.)
- `validateStrategicPlan()` valida factibilidad, progresión y referencias
- `repairPlanMetadata()` normaliza silenciosamente algunos campos antes de la validación

El riesgo: una reparación silenciosa puede alterar el `deliverable` o `progression` para pasar la validación de `repairPlanMetadata` pero luego fallar en `validateStrategicPlan`. Esto se observa en MODEL-EVALUATION.json en los `repairs` del intento 1.

## 7. ¿Los prompts tienen instrucciones incompatibles?

Una posible incompatibilidad: el prompt del agente dice "Una prueba del servicio descrito, una consulta o el registro del canal de entrada pueden ser independientes" (no requiere `value_proposition`), pero `assessFeasibility()` puede marcar la acción como `blocked` si `requires = ["value_proposition"]` y `resources.value_proposition !== "available"`. El modelo puede elegir `requires = ["value_proposition"]` para acciones que el prompt le dice que son independientes.

## 8. ¿La reparación corrige realmente los errores observados?

**Parcialmente.** La sección `REPARACIÓN ESTRATÉGICA` instruye correctamente al modelo a:
- Programar exactamente una acción manual independiente cuando hay errores de progresión/referencia
- Usar `prior_action_id = null` para trabajo nuevo

Pero **no incluye los IDs válidos disponibles** cuando el error es de tipo `reference`. El modelo recibe el plan rechazado y los errores clasificados, pero no sabe qué IDs puede usar legítimamente.

## 9. ¿Los límites de contexto son coherentes?

El historial en el contexto estratégico se trunca:
```typescript
action: action.action.slice(0, 200), objective: index < 10 ? action.objective.slice(0, 160) : undefined,
result: index < 10 ? action.result : null,
```

Y el resultado de acción a 420 chars: `JSON.stringify(action.completion_data).slice(0, 420)`.

Estos límites son razonables. El problema no es el tamaño del contexto sino la complejidad de las referencias.

## 10. ¿El diseño facilita o dificulta la generación confiable?

**Dificulta** en un punto crítico: **el modelo debe memorizar y reproducir exactamente UUIDs del historial**. Este es el único punto del diseño donde un error de un carácter (UUID mal copiado) produce un rechazo completo del plan. No hay fallback ni corrección determinística disponible en el segundo intento.

---

## Resumen de hallazgos arquitectónicos

| # | Hallazgo | Severidad | Acción sugerida |
|---|---|---|---|
| A1 | El modelo debe reproducir UUIDs reales de historial sin ayuda | CRÍTICO | Incluir IDs válidos en prompt de reparación |
| A2 | El evaluador usa IDs sintéticos que ocultan el problema A1 | ALTO | Actualizar evaluador con IDs reales o UUID-pattern |
| A3 | `retryInstructions` siempre vacío para semanas ≥ 2 | MEDIO | Documentar como intencional o unificar |
| A4 | Reparación silenciosa en `repairPlanMetadata` puede enmascarar errores | BAJO | No es urgente |
| A5 | Incompatibilidad posible entre independencia del agente y `assessFeasibility` | BAJO | Agregar a `confirmationNeeded` si indeterminado |
