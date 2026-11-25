# GENERATION-RELIABILITY.md · Fiabilidad del Generador

**Fecha.** 2026-11-24.
**Pregunta.** ¿Qué tan fiable es `generateCEOPlan()` en condiciones reales, y qué tan bien lo mide el evaluador aislado?

---

## Datos disponibles

| Fuente | Escenarios | PASS | FAIL | Condiciones |
|---|---|---|---|---|
| `MODEL-EVALUATION.json` (v7-strategic-reliability) | 10 | 10 | 0 | Sintético: IDs `00000000-...`, sin `assessment`, 1-3 acciones |
| `browser-observations-final.json` | 5 negocios | 1 | 4 | Real: UUIDs v4, con `assessment`, historial acumulado |

---

## Análisis de los 10 pases del evaluador

### Intentos requeridos
5 de 10 (50%) necesitaron 2 intentos. Reparaciones más frecuentes observadas en `MODEL-EVALUATION.json`:
- `action.N.progression` — corrección de tipo de progresión
- `action.N.prior_action_id` — corrección de referencia
- `action.N.deliverable` — ajuste de entregable asistido

Esto indica que la tasa de error en intento 1 es ~50% incluso con contexto sintético simplificado.

### Calidad de los IDs sintéticos

Los IDs `00000000-0000-4000-8000-000000000001` tienen un patrón visual obvio. Se hipotetiza que el modelo puede reconocerlos y copiarlos correctamente como texto predecible, a diferencia de un UUID v4 real. Esta hipótesis no ha sido falsificada experimentalmente, pero es coherente con:

1. Los 10 pases del evaluador usan exactamente esos IDs.
2. Los 4 fallos del pipeline real ocurren siempre después de guardar el primer ciclo (semana 2+), cuando hay IDs reales en el historial.
3. Nova Studio (único pass en pipeline real) puede haber tenido condiciones distintas de historial.

---

## Tasa de fallo real estimada por semana

| Semana | Escenarios observados | Fallos | Tasa estimada |
|---|---|---|---|
| 1 | 5 | 0 | 0% |
| 2 | 5 | 3 (mantenimiento, café, taller) | 60% |
| 3 | 2 (limpieza, nova) | 0 | 0% |
| 4 | 2 | 1 (limpieza) | 50% |

Nota: muestra pequeña (5 negocios). Las tasas son orientativas.

---

## Mecanismo de fallo confirmado

### Intento 1
El modelo produce `prior_action_id = "<UUID incorrecto>"`. El validador `validateStrategicPlan()` rechaza con categoría `"reference"`.

### Intento 2 (antes del fix)
El prompt de reparación incluye los errores clasificados pero no los IDs válidos. El modelo no puede adivinar el UUID correcto. Falla de nuevo. Se lanza `CEO_PLAN_MAX_ATTEMPTS_EXCEEDED`.

### Intento 2 (después del fix)
El prompt de reparación incluye:
```
IDs válidos disponibles en el historial:
a1b2c3d4-e5f6-7001-8abc-def012345671 w1 completed "Definir una oferta principal..."
```
El modelo puede seleccionar el ID correcto. Se espera que la tasa de fallo en intento 2 con error de referencia se reduzca significativamente.

---

## Límites del fix

El fix corrige C1 y parcialmente C2. No corrige:

1. **C3 (progresión acumulada)**: si el modelo genera `progression = "continuation"` con un `prior_action_id` correcto pero ese trabajo ya fue cerrado satisfactoriamente, `validateProgression()` puede rechazar. El fix provee los IDs pero no guía qué tipo de progresión es correcta.

2. **Fallos de intento 1 no corregibles por referencia**: si el primer intento falla por `progression`, `feasibility` o `business_rules`, el intento 2 ya tenía instrucciones de reparación. El fix no empeora ese flujo.

3. **Validación de `new_evidence_id` con evidencia real**: si `recentEvidence` tiene filas con `certainty = "unknown"`, el fix provee los IDs válidos (`filter(e => e.certainty !== "unknown")`). Esto debería resolver C2 cuando hay errores de referencia en evidencia.

---

## Métricas de fiabilidad post-fix (predichas)

Sin datos empíricos del fix en pipeline real (requieren presupuesto autorizado). Las predicciones se basan en el mecanismo conocido:

| Escenario | Antes del fix | Predicción post-fix | Confianza |
|---|---|---|---|
| Error de referencia en intento 1 → intento 2 con IDs | Fallo seguro | PASS esperado | Alta |
| Error de progresión en intento 1 → intento 2 | Reparación parcial | Sin cambio | Alta |
| Historial >6 acciones (semana 4+) | Alta tasa de fallo | Reducción parcial | Media |

---

## Recomendación de mejora futura

Para aumentar fiabilidad más allá del fix actual:

1. **Separar responsabilidades**: extraer la resolución de `prior_action_id` a una función determinística que elija el ID correcto dado `work_key` e `intent`, y pasarlo al modelo como parte del contexto en lugar de pedirle que lo reproduzca.

2. **Multi-semana en evaluador**: añadir un escenario de semana 4 con 6+ acciones de historial para detectar regresiones de C3.

3. **Logging de categorías de error**: registrar `previousIssues` en la tabla de auditoría del plan para medir la tasa real de errores por categoría en producción.
