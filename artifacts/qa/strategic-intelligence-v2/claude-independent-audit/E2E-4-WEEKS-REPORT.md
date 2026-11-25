# E2E-4-WEEKS-REPORT.md · Informe de Ciclos E2E de 4 Semanas

**Fecha.** 2026-11-24.
**Objetivo.** Documentar el estado de los ciclos completos de 4+ semanas para los 5 negocios de prueba.

---

## Estado de ciclos por negocio

### 1. Mantenimiento de hogares

| Semana | Estado | Notas |
|---|---|---|
| W1 | ✅ COMPLETADO | Plan generado y persistido correctamente |
| W2 | ❌ BLOQUEADO | Plan ID `085045a8-...` en estado `failed` |
| W3 | — | No intentado (bloqueado por W2) |
| W4 | — | No intentado |

**Resultado global**: 1/4 semanas completadas. Bloqueado en W2.
**Causa**: C1 — referencia UUID en historial de W1.

---

### 2. Limpieza de muebles

| Semana | Estado | Notas |
|---|---|---|
| W1 | ✅ COMPLETADO | Oferta local definida |
| W2 | ✅ COMPLETADO | Continuación con WhatsApp |
| W3 | ✅ COMPLETADO | Seguimiento de contactos en barrios |
| W4 | ❌ BLOQUEADO | Fallo con historial acumulado de 3 semanas |

**Resultado global**: 3/4 semanas completadas. Bloqueado en W4.
**Causa**: C3 y/o C1 con historial más complejo.

---

### 3. Café Horizonte

| Semana | Estado | Notas |
|---|---|---|
| W1 | ✅ COMPLETADO | Plan inicial generado |
| W2 | ❌ BLOQUEADO | Plan en estado `failed` |
| W3 | — | No intentado |
| W4 | — | No intentado |

**Resultado global**: 1/4 semanas completadas. Bloqueado en W2.
**Causa**: C1.

---

### 4. Taller Andino

| Semana | Estado | Notas |
|---|---|---|
| W1 | ✅ COMPLETADO | Plan inicial generado |
| W2 | ❌ BLOQUEADO | Plan en estado `failed` |
| W3 | — | No intentado |
| W4 | — | No intentado |

**Resultado global**: 1/4 semanas completadas. Bloqueado en W2.
**Causa**: C1.

---

### 5. Nova Studio

| Semana | Estado | Notas |
|---|---|---|
| W1 | ✅ COMPLETADO | — |
| W2 | ✅ COMPLETADO | — |
| W3 | ✅ COMPLETADO | — |
| W4 | ✅ COMPLETADO | — |

**Resultado global**: 4/4 semanas completadas. ✅ ÚNICO NEGOCIO COMPLETO.

---

## Resumen ejecutivo

| Negocio | Semanas completadas | Estado final |
|---|---|---|
| Mantenimiento | 1/4 | BLOQUEADO W2 |
| Limpieza | 3/4 | BLOQUEADO W4 |
| Café Horizonte | 1/4 | BLOQUEADO W2 |
| Taller Andino | 1/4 | BLOQUEADO W2 |
| Nova Studio | 4/4 | COMPLETO |

**Tasa de completación**: 1/5 negocios llegaron a 4 semanas (20%).
**Total de ciclos completados**: 10/20 semanas planificadas (50%).

---

## Bloqueo de presupuesto para E2E post-fix

Los ciclos E2E completos con el fix implementado (Cambio 1) **no fueron ejecutados** en este audit. Razón: el spec de auditoría sección 1 establece:

> "Si una prueba requiere un presupuesto adicional de llamadas al proveedor que no está autorizado, documentar el bloqueo."

Ejecutar 5 negocios × 4 semanas × hasta 2 intentos por plan = hasta 40 llamadas al proveedor OpenAI. Este presupuesto no fue autorizado explícitamente para el audit.

**Para ejecutar el E2E post-fix se requiere**:
1. Autorización explícita de presupuesto de llamadas.
2. Supabase local corriendo (`supabase start`).
3. `OPENAI_API_KEY` y `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:...` en entorno local.
4. Build de test: `npm run build:test-dist`.
5. Ejecutar `node artifacts/qa/strategic-intelligence-v2/reliability/evaluate-model.mjs`.

**Nota**: el evaluador actual solo cubre 2 escenarios (mantenimiento y limpieza, semana 2). Para cubrir los 4 bloqueos originales se necesitaría extender el evaluador con escenarios de semana 4 y negocios adicionales.

---

## Calidad de los planes completados (Nova Studio, semanas 1-4)

No se tiene acceso a los datos de los planes de nova-studio (están en DB de producción, que no se puede descargar según las restricciones del spec). La evaluación de calidad de inteligencia de negocio no pudo ser completada para este audit.

---

## Acciones de recuperación para negocios bloqueados

Los 4 negocios bloqueados pueden recuperarse sin pérdida de datos:

1. Con el fix implementado, regenerar el plan de la semana bloqueada desde la aplicación.
2. Los datos de la semana anterior siguen en DB (el plan `failed` no borra el historial de W1).
3. Verificar que el nuevo plan pasa la validación y persiste correctamente.
4. Continuar con los ciclos siguientes.

Esta recuperación requiere acceso a la aplicación en producción (o ambiente local con datos equivalentes) y está sujeta a las restricciones del spec.
