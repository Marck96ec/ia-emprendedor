# CHECKPOINT-RECOVERY.md · Recuperación de Checkpoints W5

**Fecha.** 2026-11-25.
**Validación.** Strategic Recurrence & Final Recovery v2.4.

---

## Estado actual

### Checkpoints disponibles

Los usuarios de test de Supabase local creados durante los runs E2E anteriores tienen sus datos persistidos en la base de datos local. Sin embargo, **los IDs de plan y usuario no están accesibles fuera de los runs E2E**.

El E2E script (`artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs`) crea un nuevo usuario por ejecución. No existe mecanismo de recuperación de estado intermedio sin re-ejecutar el escenario completo desde W1.

### Instrucción del spec

> "Recuperar el checkpoint local de semana 4. No reiniciar el negocio. No borrar revisiones ni acciones."

La recuperación de checkpoint requiere acceso al `business_id` del negocio creado en el run anterior. Estos IDs no fueron exportados ni están en los JSON de observación.

**Opciones:**

1. **Re-ejecutar W1-W5 completo** con el fix de recurrencia — genera nuevo checkpoint desde cero con un usuario nuevo. Válido para verificar el fix pero no "recupera" el checkpoint anterior.

2. **Consultar Supabase local** para encontrar el business_id del run anterior y ejecutar solo W5. No implementado en el E2E script actual.

---

## Plan de recuperación (pendiente de autorización de presupuesto API)

### Para ejecutar cuando haya budget disponible

```powershell
# Verificar Docker y Supabase local activos
# Ejecutar solo limpieza y cafe-horizonte (desde W1 con fix aplicado)
$env:QA_PLAYWRIGHT_PATH = "C:\Users\clavi\AppData\Local\npm-cache\_npx\705bc6b22212b352\node_modules\playwright-core"
$env:QA_SCENARIOS = "limpieza,cafe-horizonte"
$env:QA_BROWSER_REPORT = "../final-recovery/browser-observations-recovery.json"
node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
```

### Criterios de éxito

- limpieza: 4 ciclos completos + W5 generado con `progression=recurrence` o nueva acción válida
- cafe-horizonte: 4 ciclos completos + W5 generado con `cashflow_update` o `collections` recurrence

---

## Presupuesto necesario

| Escenario | Semanas | Generaciones estimadas | Llamadas API mínimas |
|---|---|---|---|
| limpieza (W1-W5) | 5 | 5 (1 por semana, attempt=1) | 5 |
| limpieza (con repair) | 5 | +2 (repairs si C3 persiste) | 7 |
| cafe-horizonte (W1-W5) | 5 | 5 (1 por semana, attempt=1) | 5 |
| cafe-horizonte (con repair) | 5 | +2 (repairs si C3 persiste) | 7 |
| **Total estimado** | | | **14-20 llamadas** |

**Autorización requerida antes de ejecutar.**

---

## Nova Studio — Re-verificación

El spec dice: "Nova Studio utiliza evidencia de una versión anterior. No considerarlo automáticamente certificado sobre el código final."

En el run-3 (full 5 escenarios), nova-studio falló en W2-generation (1 ciclo completo). Esto confirma que nova-studio NO está certificado sobre el código candidato final.

Nova-studio requiere re-verificación en la misma sesión que limpieza y cafe-horizonte.

| Escenario | Semanas | Generaciones | Llamadas estimadas |
|---|---|---|---|
| nova-studio (W1-W5) | 5 | 5-7 | 5-7 |

**Total con nova-studio: 19-27 llamadas adicionales.**

---

## Estado: EN ESPERA DE AUTORIZACIÓN

No se ha ejecutado ninguna llamada al proveedor real en esta sesión v2.4.

Los cambios de código (validateProgression, generate-ceo-plan.ts) están listos y verificados con tests determinísticos. La ejecución E2E está bloqueada por la restricción de presupuesto del spec v2.4.
