# ACTION-HISTORY-MATRIX.md · Matriz de Historial de Acciones

**Fecha.** 2026-11-24.
**Alcance.** Documentar el estado conocido de acciones por negocio y semana, y la correspondencia entre historial observado y comportamiento del validador.

---

## Fuente de datos

`artifacts/qa/strategic-intelligence-v2/reliability/browser-observations-final.json`

---

## Matriz de acciones por negocio

### Mantenimiento de hogares

| Semana | Acciones planificadas | Estado observado | Plan ID | Notas |
|---|---|---|---|---|
| 1 | 3 | ✅ completado | — | Historial guardado en DB |
| 2 | — | ❌ FAIL | `085045a8-53cd-4044-a46a-cc7b0c1ec03f` | Plan quedó en estado `failed` |
| 3+ | — | No intentado | — | Bloqueado por fallo W2 |

**Acciones guardadas disponibles en contexto W2**: 3 acciones de W1 con IDs UUID reales.
**Causa de fallo W2**: C1 — modelo no pudo reproducir UUID de historial en segundo intento.

---

### Limpieza de muebles

| Semana | Acciones planificadas | Estado observado | Notas |
|---|---|---|---|
| 1 | 1 | ✅ completado | Oferta local definida |
| 2 | — | ✅ completado | Continuación con WhatsApp |
| 3 | — | ✅ completado | Seguimiento de contactos |
| 4 | — | ❌ FAIL | Historial acumulado: 3-6 acciones, semanas 1-3 |

**Acciones disponibles en contexto W4**: ~3-6 acciones de W1-W3 con IDs UUID reales.
**Causa de fallo W4**: C3 — acumulación de historial produce más fallos de progresión. También posible C1 con historial más complejo.

---

### Café Horizonte

| Semana | Acciones planificadas | Estado observado | Notas |
|---|---|---|---|
| 1 | — | ✅ completado | — |
| 2 | — | ❌ FAIL | Plan en estado `failed` |
| 3+ | — | No intentado | Bloqueado |

**Causa de fallo W2**: C1 — mismo mecanismo que mantenimiento.

---

### Taller Andino

| Semana | Acciones planificadas | Estado observado | Notas |
|---|---|---|---|
| 1 | — | ✅ completado | — |
| 2 | — | ❌ FAIL | Plan en estado `failed` |
| 3+ | — | No intentado | Bloqueado |

**Causa de fallo W2**: C1 — mismo mecanismo.

---

### Nova Studio

| Semana | Acciones planificadas | Estado observado | Notas |
|---|---|---|---|
| 1 | — | ✅ completado | — |
| 2 | — | ✅ completado | — |
| 3 | — | ✅ completado | — |
| 4 | — | ✅ completado | Único negocio con 4 ciclos completos |

**Por qué Nova Studio pasó**: desconocido. Hipótesis posibles:
1. Las acciones de W1 tenían `prior_action_id = null` en todas las acciones de W2 (trabajo nuevo).
2. El modelo eligió por coincidencia el UUID correcto en el primer intento.
3. El contexto estratégico de nova-studio tuvo menos acciones acumuladas o diferente patrón de dependencias.

**Sin evidencia para distinguir entre hipótesis.** Nova Studio es el caso de control positivo.

---

## Patrón de fallo confirmado

Los 4 fallos ocurren todos en la **primera semana con historial real** (semana 2 para 3 de 4 casos, semana 4 para el caso con historial más largo). El patrón es consistente con C1: el primer plan genera historial real con UUIDs v4, y la segunda generación falla al referenciarlos.

---

## Acciones pendientes en DB post-fallo

Los planes en estado `failed` NO generan acciones confirmadas en la tabla de historial. Esto significa que el contexto de la semana siguiente no incluye las acciones del plan fallido. El negocio queda bloqueado con el historial de la semana N (última exitosa).

**Implicación**: recuperar los 4 negocios fallados requiere generar manualmente el plan de la semana bloqueada con el historial de la semana anterior. No hay pérdida de datos previos.

---

## Dependencias entre acciones detectadas

En `MODEL-EVALUATION.json`, los planes generados incluyen `depends_on_sequence` entre acciones del mismo plan. El validador no verifica esta relación de forma estricta (es informativa para el UI). Sin embargo, si `prior_action_id` apunta a una acción del plan actual en lugar del historial, `validateStrategicPlan()` rechaza porque el ID no está en `context.history`.

**Hallazgo**: el modelo a veces usa `prior_action_id` para referenciar una acción del plan actual (que aún no existe en historial). Esto es siempre un error de validación. El prompt lo prohíbe ("Nunca depende de un paso futuro"), pero el modelo lo viola ocasionalmente.

El Cambio 1 mitiga esto: si el intento 1 falla por `reference`, el intento 2 recibe solo los IDs del historial real (no IDs del plan propuesto), lo que previene que el modelo elija un ID del plan actual.
