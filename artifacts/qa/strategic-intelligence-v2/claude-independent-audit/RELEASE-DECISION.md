# RELEASE-DECISION.md · Decisión de Release

**Fecha.** 2026-11-24.
**Rama.** `feature/strategic-intelligence-v2`.
**Auditor.** Claude Sonnet 4.6 (independiente).

---

## VEREDICTO: NO GO — Condicional

El motor de inteligencia estratégica v2 **no está listo para release** en su estado actual (antes del fix). Con el fix implementado, el veredicto es **NO GO condicional**: el fix aborda la causa raíz principal pero no ha sido validado en un pipeline real completo.

---

## Fundamento del NO GO

### Pre-fix (estado anterior al audit)

- 4/5 negocios reales no completan 4 ciclos semanales.
- La causa raíz C1 (referencia UUID en intento 2) es un bloqueo duro: sin IDs válidos en el prompt de reparación, el modelo no puede autocorregirse.
- El evaluador aislado reportaba 10/10 PASS, dando falsa confianza.

### Post-fix (estado actual tras el audit)

- El Cambio 1 aborda C1 (y parcialmente C2) con el mínimo cambio necesario.
- El Cambio 2 reduce los falsos positivos del evaluador.
- La validación estática (typecheck, lint) pasa.
- **La validación E2E no pudo ejecutarse** por falta de presupuesto autorizado.

---

## Condiciones para GO

El veredicto cambia a **GO** cuando todas las siguientes condiciones sean verdaderas:

### Condición obligatoria 1 — E2E post-fix
Ejecutar el evaluador actualizado (`evaluate-model.mjs` v7+) con los 5 escenarios de negocios y 4 semanas de historial. Resultado requerido: ≥ 4/5 negocios completan 4 semanas sin bloqueo.

**Acción**: autorizar presupuesto de llamadas OpenAI (~40 llamadas) y ejecutar desde ambiente local con Supabase local.

### Condición obligatoria 2 — Recuperación de negocios bloqueados
Verificar que los 4 negocios bloqueados (mantenimiento, limpieza, café horizonte, taller andino) pueden continuar desde la semana de bloqueo con el fix implementado.

**Acción**: ejecutar desde la aplicación local con los datos de los 4 negocios.

### Condición deseable 3 — C3 con historial multi-semana
Añadir un escenario de semana 4 al evaluador con 6+ acciones de historial para verificar que C3 (acumulación de historial) no produce fallos frecuentes.

**Acción**: extender `evaluate-model.mjs` con un tercer escenario de semana 4.

### Condición deseable 4 — Observabilidad de fallos (C4)
Registrar el `code` y `kind` del error en un campo de auditoría del plan fallido para facilitar diagnóstico futuro.

**Acción**: modificar `src/actions/ceo-plan.ts` para persistir el error en la tabla de planes.

---

## Bloqueos de presupuesto documentados

| Test bloqueado | Razón | Llamadas estimadas |
|---|---|---|
| E2E 5 negocios × 4 semanas post-fix | Sin autorización de presupuesto | ~40 llamadas OpenAI |
| Recuperación de 4 negocios bloqueados | Sin autorización de presupuesto | ~8 llamadas OpenAI |
| Evaluador semana 4 con historial multi-semana | Sin autorización de presupuesto | ~10 llamadas OpenAI |

---

## Cambios implementados (seguros para merge)

Los dos cambios implementados en este audit son seguros para merge en cualquier estado:

| Cambio | Riesgo | Reversible | Recomendación |
|---|---|---|---|
| Cambio 1 (inyección de IDs en prompt de reparación) | Bajo | Sí (una línea) | Mergeable ahora |
| Cambio 2 (actualización del evaluador) | Nulo (artefacto QA) | Sí | Mergeable ahora |

**El Cambio 1 no introduce regresiones** en planes sin contexto estratégico (semana 1) ni en planes que no tienen errores de referencia en el primer intento. Solo se activa cuando `hasReferenceErrors && context && attempt > 1`.

---

## Resumen de riesgo de release

| Componente | Estado | Riesgo de release |
|---|---|---|
| Generación semana 1 | ✅ Verificado (5/5 negocios) | Bajo |
| Generación semana 2+ (pre-fix) | ❌ 4/5 fallan | Crítico |
| Generación semana 2+ (post-fix) | ⚠️ Fix implementado, E2E pendiente | Medio |
| Evaluador aislado | ✅ Actualizado | Bajo |
| Pipeline de memoria | ✅ Verificado estáticamente | Bajo |
| Pipeline de feedback | ✅ Verificado estáticamente | Bajo |
| Observabilidad de errores | ⚠️ Sin logging detallado | Medio |

---

## Decisión final

**NO GO** hasta cumplir Condiciones 1 y 2.

Una vez cumplidas: **GO condicional** con monitoreo activo de tasa de fallo en semana 2+ durante las primeras 2 semanas post-deploy.
