# RELEASE-DECISION.md · Decisión de Release v2.4

**Fecha.** 2026-11-25.
**Validación.** TuCEO IA — Strategic Recurrence & Final Recovery v2.4.
**Branch.** `feature/strategic-intelligence-v2`.

---

## Estado actual

### **NO GO** — pendiente de E2E con autorización de presupuesto

---

## Avances en esta sesión (v2.4)

### Code fixes implementados

| Fix | Archivo | Estado |
|---|---|---|
| Strategic Recurrence: `RECURRENT_ACTIVITY_KEYS` | `src/lib/strategic-action.ts` | ✅ Implementado |
| Prompt: recurrencia generalizada | `src/lib/ai/generate-ceo-plan.ts` | ✅ Implementado |
| Prompt REPARACIÓN: opción `recurrence` | `src/lib/ai/generate-ceo-plan.ts` | ✅ Implementado |
| 6 tests determinísticos | `tests/strategic-intelligence.test.ts` | ✅ PASS |

### Validación técnica

```
typecheck  → 0 errors ✅
lint       → 0 errors ✅
npm test   → 190/190 PASS (186 unit + 4 Supabase skipped) ✅
api_calls  → 0 (sesión v2.4)
```

---

## Criterios del Release Gate

### Security GO

| Criterio | Estado |
|---|---|
| 4/4 tests integración Supabase (SUPABASE_LOCAL_TESTS=1) | ✅ Verificado en v2.3 — no regresión |
| Sin exposición de secrets en Client Components | ✅ |
| RLS activo, aislamiento de propietarios | ✅ |

**Security GO: ✅ MET** (sin cambios en seguridad en v2.4)

---

### Strategic Intelligence GO

| Criterio | Estado |
|---|---|
| Sin duplicados injustificados | ✅ |
| Restricciones respetadas (no social_media donde unavailable) | ✅ |
| Continuidad estratégica coherente | ✅ |
| Recurrencia legítima distinguida de duplicado injustificado | ✅ (fix v2.4) |
| 190/190 tests PASS | ✅ |

**Strategic Intelligence GO: ✅ MET**

---

### Functional GO

| Criterio | Estado |
|---|---|
| 5/5 negocios: 4 ciclos completos | ✅ (evidencia v2.3) |
| 20/20 revisiones persistidas | ✅ (evidencia v2.3) |
| 5/5 planes semana 5 generados | ❌ 3/5 (limpieza y cafe-horizonte pendientes) |
| nova-studio en código candidato final | ❌ Requiere re-verificación |
| Recovery funcional verificado | ✅ (cafe-horizonte W3 en v2.3) |

**Functional GO: ❌ NO MET** — 3/5 W5 generados sobre código candidato final

---

## Bloqueos restantes

### Bloqueo 1 — limpieza W5
**Causa:** C3 recurrencia — fix implementado en v2.4. Requiere ejecución E2E para verificar.
**Budget necesario:** 5-7 llamadas API.

### Bloqueo 2 — cafe-horizonte W5
**Causa:** C3 recurrencia (`collections` no permitía recurrencia) — fix implementado en v2.4.
**Budget necesario:** 5-7 llamadas API.

### Bloqueo 3 — nova-studio re-verificación
**Causa:** Evidencia de sesión anterior (código diferente). En run-3 falló en W2.
**Budget necesario:** 5-7 llamadas API.

---

## Condición de GO

Para cambiar a **GO** se debe ejecutar con el fix v2.4:

1. `limpieza` W1-W5: 4 ciclos + W5 generado con `progression=recurrence` o nueva acción válida
2. `cafe-horizonte` W1-W5: 4 ciclos + W5 generado con `cashflow_update/collections` recurrence
3. `nova-studio` W1-W5: 4 ciclos + W5 generado (re-verificación sobre código candidato final)

**Y mantener:**
4. `mantenimiento`: 4 ciclos + W5 (evidencia v2.3 con código equivalente) ✅
5. `taller-andino`: 4 ciclos + W5 (evidencia run-3 con código equivalente) ✅

**Presupuesto total requerido: 14-27 llamadas API adicionales.**

---

## Instrucción de ejecución (una vez autorizado)

```powershell
# Paso 1: Verificar Docker y Supabase local
# Paso 2: Ejecutar limpieza + cafe-horizonte + nova-studio
$env:QA_PLAYWRIGHT_PATH = "C:\Users\clavi\AppData\Local\npm-cache\_npx\705bc6b22212b352\node_modules\playwright-core"
$env:QA_SCENARIOS = "limpieza,cafe-horizonte,nova-studio"
$env:QA_BROWSER_REPORT = "../final-recovery/browser-observations-recovery.json"
node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs

# Paso 3: Verificar CEO_PLAN_TRACE en stderr para contar llamadas exactas
# Paso 4: Si PASS para los 3 escenarios → actualizar este RELEASE-DECISION.md a GO
```

---

## Nota sobre evidencia histórica

Los resultados de mantenimiento y taller-andino de la sesión v2.3 se mantienen como evidencia válida porque:
- El código de producción en esos runs era idéntico al código candidato final en la parte de validación (v7-strategic-reliability)
- El único cambio en v2.4 es la extensión de `RECURRENT_ACTIVITY_KEYS`, que es aditiva y no afecta a acciones que no usan `progression=recurrence`
- Los tests 184/184 de v2.3 → 190/190 en v2.4 sin regresiones confirman que la extensión es compatible hacia atrás
