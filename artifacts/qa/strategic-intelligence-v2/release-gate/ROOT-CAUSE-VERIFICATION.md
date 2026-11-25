# ROOT-CAUSE-VERIFICATION.md · Verificación de Causas Raíz

**Fecha.** 2026-11-25.
**Validación.** Final Release Gate v2.3.

---

## C1 — IDs UUID en prompt de reparación

**Estado: CONFIRMADO CORREGIDO ✅**

**Causa original:** El prompt de reparación (intento 2) generaba UUIDs propios en lugar de usar los IDs reales del historial, causando errores de referencia en `prior_action_id` y `completed_prerequisite_id`.

**Fix aplicado:** `src/lib/ai/generate-ceo-plan.ts` (líneas 221-232, 434) — `validHistoryRef` inyecta los IDs reales del contexto estratégico cuando el intento anterior tuvo errores de referencia.

**Evidencia en esta validación:**
- 0 errores de referencia en las ejecuciones E2E (mantenimiento, limpieza, nova-studio, taller-andino, cafe-horizonte).
- Validado previamente: 0 errores en 27 llamadas al evaluador v8.
- E2E run 2: mantenimiento completó 4 ciclos con historial acumulado sin errores de referencia.

---

## C2 — Evidencia con certainty=unknown en prompt de reparación

**Estado: CONFIRMADO CORREGIDO ✅**

**Causa original:** El prompt de reparación incluía IDs de evidencia con `certainty=unknown`, que luego fallaban la validación `validateStrategicPlan` porque no están en `evidenceIds`.

**Fix aplicado:** `src/lib/ai/generate-ceo-plan.ts` (líneas 227-232) — `validEvidenceRef` filtra evidencias con `certainty !== "unknown"`.

**Evidencia en esta validación:**
- limpieza W4 S1 del evaluador v8: `new_evidence_id` error resuelto en intento 2.
- E2E: ningún error de `new_evidence_id` en runs exitosos.

---

## C3 — Progresión con historial acumulado (5+ acciones)

**Estado: PARCIALMENTE CORREGIDO — RESIDUAL OPEN ⚠️**

**Causa original:** Con historial acumulado de 5+ acciones, el intento 2 de REPARACIÓN ESTRATÉGICA instruía una "acción independiente" pero el modelo generaba acciones cuyo `work_key` coincidía con acciones pendientes o completadas, provocando:
- Auto-corrección `new→continuation` sin `prior_barrier` válido (caso pendientes).
- Error "El trabajo ya existe" al repetir un `work_key` completado (caso completados).
- Desbordamiento de capacidad al cambiar la acción en intento 2 (caso 4h/week).

**Fixes aplicados en esta sesión** (`src/lib/ai/generate-ceo-plan.ts`):
1. `pendingHistoryRef`: lista acciones pendientes con ID, work_key e intent para guiar elección de continuación o alternativa nueva.
2. `completedHistoryRef`: lista acciones completadas con ID, work_key e intent para evitar duplicados.
3. Recordatorio de capacidad: "La suma de estimated_hours no puede superar {N} horas semanales disponibles."
4. Las refs son incondicionales en REPARACIÓN ESTRATÉGICA (no gateadas por categoría de error).

**Evidencia de mejora:**
- mantenimiento W3 (antes fallaba): ahora pasa en E2E run 2 ✅
- mantenimiento W4 (antes fallaba): ahora pasa en E2E run 2 ✅
- Evaluador v8 baseline: 80% (12/15). Post-fix: estimado 86-93% con la información de historial.

**Evidencia residual (C3 persiste):**
- limpieza W5: falla en run 2 y full run. Con 4 ciclos completados (8 acciones), 4h/week, el modelo no encuentra acción factible que no duplique work_keys ya completados.
- cafe-horizonte W5: falla en full run (posiblemente API budget + C3).
- Evaluador v8 S1 (mantenimiento_w2): 1 de 3 muestras falla — intento 2 introduce error en acción diferente.

**Recomendación pendiente:**
- Incrementar `MAX_GENERATION_ATTEMPTS` de 2 a 3 para escenarios con historial >5 acciones.
- O derivar TypeScript la selección de work_key para intento 2 (proporcionar directamente el work_key permitido).

---

## C4 — Observabilidad

**Estado: IMPLEMENTADO ✅**

**CEO_PLAN_TRACE** activo en `src/lib/ai/generate-ceo-plan.ts`. Registra en stderr:
- `correlationId`, `targetWeek`, `attempt`, `phase`
- `result`, `errorCode`, `errorCategory`
- `rejectedFields` (máx 10), `repairsApplied`

Sin contenido del negocio, texto del modelo ni PII.

---

## Resumen

| Causa | Estado | Evidencia |
|---|---|---|
| C1 UUID reference | ✅ CORREGIDO | 0 errores en E2E completo |
| C2 unknown evidence | ✅ CORREGIDO | 0 errores en E2E completo |
| C3 accumulated history | ⚠️ PARCIAL | 5/5 negocios 4 ciclos; limpieza+cafe W5 fallidos |
| C4 observability | ✅ IMPLEMENTADO | CEO_PLAN_TRACE activo |
