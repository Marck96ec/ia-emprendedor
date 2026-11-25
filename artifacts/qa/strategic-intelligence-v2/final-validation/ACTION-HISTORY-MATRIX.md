# ACTION-HISTORY-MATRIX.md · Matriz de Acciones Post-Fix

**Fecha.** 2026-11-25.
**Fuente.** Evaluador v8, `MODEL-EVALUATION.json` (final-validation).

---

## Qué demuestra esta matriz

La validación del fix C1 requería que el modelo usara UUIDs generados por `crypto.randomUUID()` — completamente opacos — como valores de `prior_action_id` y `completed_prerequisite_id`. Esta matriz documenta que todos los IDs usados en los planes aprobados son IDs válidos del historial.

---

## Muestra: mantenimiento_w2 S2 (PASS, 1 intento)

Historial de entrada (IDs generados por `crypto.randomUUID()` en fixture):
```
ID-1 (oferta definida, completed)
ID-2 (mensajes comerciales, pending)
ID-3 (registro respuestas, pending)
```

Acciones del plan generado:
| Seq | Acción | prior_action_id | completed_prerequisite_id | Válido |
|---|---|---|---|---|
| 1 | Crear mensajes comerciales | ID-2 (pending, correcto) | ID-1 (completed, correcto) | ✅ |
| 2 | Registrar respuestas | ID-3 (pending, correcto) | null | ✅ |
| 3 | Regla de decisión | null | null | ✅ |

**Resultado:** El modelo extrajo correctamente los IDs del historial. `completed_prerequisite_id` apunta a ID-1 (completado), `prior_action_id` a ID-2 (pendiente del mismo trabajo).

---

## Muestra: limpieza_w4 S1 (PASS, 2 intentos)

Historial de entrada (5 acciones de semanas 1-3 con `crypto.randomUUID()`):
- 2 acciones W1 (oferta, registro)
- 2 acciones W2 (publicación, registro) — completadas
- 1 acción W3 (contacto barrio) — completada

Intento 1 rechazado con 5 errores incluyendo `completed_prerequisite_id` y `new_evidence_id`.

**El fix activó** `validHistoryRef` y `validEvidenceRef` en el prompt de reparación de intento 2:
- `validHistoryRef`: lista los 5 IDs del historial con semana/status/acción (80 chars)
- `validEvidenceRef`: lista los 3 IDs de evidencia válidos (certainty ≠ unknown)

Intento 2: modelo usó IDs correctos del historial. PASS.

---

## Patrón de errores resueltos en intento 2

| Escenario | Error intento 1 | Resuelto en intento 2 | Mecanismo |
|---|---|---|---|
| cafe_horizonte S1 | progression + requires | ✅ | REPARACIÓN ESTRATÉGICA: usar progressión nueva |
| taller_andino S1 | completed_prerequisite_id + progression | ✅ | REPARACIÓN ESTRATÉGICA + validHistoryRef |
| limpieza_w4 S1 | progression + completed_prerequisite_id + new_evidence_id | ✅ | validHistoryRef + validEvidenceRef |
| mantenimiento_w4 S2 | progression + completed_prerequisite_id | ✅ | validHistoryRef |

---

## Patrón de fallos no resueltos en intento 2

| Escenario | Error intento 1 | Error intento 2 | Patrón |
|---|---|---|---|
| mantenimiento_w2 S1 | progression (acción 2) | progression (acción 0) | C3: repair de una acción introduce error en otra |
| mantenimiento_w4 S3 | Plan completo rechazado | progression (acción 0) | C3: reconstrucción total introduce error diferente |
| limpieza_w4 S2 | progression | capacity overflow | Repair cambió tipo de trabajo pero excedió 4h límite |

**Hallazgo C3 confirmado:** Cuando el repair toca múltiples acciones en el mismo plan, puede introducir un error de progresión en una acción diferente. Este es un problema de coherencia inter-acción que el prompt de reparación actual no resuelve totalmente.

---

## Acciones que reutilizan correctamente el historial

Del análisis de los 12 planes aprobados:

- **100% de los planes PASS** usan `prior_action_id` apuntando a un ID válido del historial (o `null` para acciones nuevas).
- **0 planes PASS** tienen `prior_action_id` apuntando a un ID inventado o inválido.
- **0 planes PASS** tienen `new_evidence_id` apuntando a evidencia con `certainty = "unknown"`.

Este resultado confirma que C1 y C2 están resueltos en los planes que pasan validación.
