# RELEASE-DECISION.md · Decisión de Release

**Fecha.** 2026-11-25.
**Validación.** TuCEO IA — Final Release Gate v2.3.
**Branch.** `feature/strategic-intelligence-v2`.

---

## Veredictos

| Gate | Veredicto | Criterios |
|---|---|---|
| Security GO | ✅ GO | 4/4 tests de integración Supabase pasan |
| Strategic Intelligence GO | ✅ GO | Sin duplicados, restricciones respetadas, continuidad estratégica coherente |
| Functional GO | ❌ NO GO | 3/5 semana 5 generada (requiere 5/5) |

---

## Decisión final

### **NO GO** ❌

---

## Fundamento

### Security GO — CUMPLIDO ✅

Los cuatro criterios de seguridad están cubiertos con tests de integración ejecutados contra Supabase local:

1. **Validación de evidencia y protección contra escrituras directas** — `action_completions` rechaza escrituras directas; RPC valida el `capture_schema` ✅
2. **Paridad entre validadores PostgreSQL y TypeScript** — mismos fixtures, mismos resultados en ambos validadores ✅
3. **Memoria histórica y aislamiento entre propietarios** — `business_memory` idempotente, snapshots históricos correctos, RLS aislando propietarios ✅
4. **Protección de propietarios, estados y atomicidad de CEO Plan RPC** — `save_ceo_plan` rechaza planes cruzados, estados inválidos y es atómica ✅

**184/184 tests pasan** incluyendo los 4 de integración con `SUPABASE_LOCAL_TESTS=1`.

---

### Strategic Intelligence GO — CUMPLIDO ✅

Verificado en los 5 escenarios durante 4 ciclos completos:

- **Sin duplicados**: 1 plan/semana/negocio en todos los runs. Ninguna acción repetida injustificadamente.
- **Restricciones respetadas**: limpieza sin social_media en 4 ciclos; acciones dentro de 4h/week (W1-W4); mantenimiento sin social_media.
- **Continuidad estratégica**: W2+ planes referencian historial de W1; modos de progresión coherentes (discovery → continuation → advance).
- **Feedback persistido**: business_memory guarda correctamente las restricciones del propietario.
- **Recovery funcional**: cafe-horizonte W3 recuperado exitosamente.

---

### Functional GO — NO CUMPLIDO ❌

Criterio requerido: **5/5 escenarios con 4 ciclos completos Y semana 5 generada**.

Resultado:

| Escenario | 4 ciclos | Semana 5 |
|---|---|---|
| mantenimiento | ✅ | ✅ |
| nova-studio | ✅ | ✅ |
| taller-andino | ✅ | ✅ |
| limpieza | ✅ | ❌ |
| cafe-horizonte | ✅ | ❌ |

**3/5 semanas 5 generadas.** Los 4 ciclos están completos en los 5 escenarios, pero 2 fallan en la generación del plan de semana 5.

**Causas documentadas:**

#### limpieza — C3 residual
El fix C3 mejoró la fiabilidad para W1-W4 (ahora pasan), pero en W5 con 4-5 work_keys completados y 4h/semana de capacidad, el modelo en REPARACIÓN ESTRATÉGICA (intento 2) no encontró acción válida que:
- Use un work_key distinto a los ya completados
- Tenga estimated_hours ≤ 4

Este es el límite de lo que puede instruccionar el fix de prompt. Requiere intervención a nivel de código (MAX_GENERATION_ATTEMPTS=3 o selección TypeScript de work_key válido).

#### cafe-horizonte — API budget exhausto
En el run de 5 escenarios en paralelo, el API budget de la sesión se agotó antes de que cafe-horizonte llegara a generar su semana 5. Los week-1 failures en runs posteriores confirman que el presupuesto estaba exhausto. Con budget disponible, el fix C3 probablemente habría permitido que cafe-horizonte W5 pasara.

---

## Criterios NO reducidos

Esta validación no ha reducido ningún criterio original del spec v2.3:

- ✅ 4 tests de integración Supabase ejecutados (no skipped)
- ✅ 5 escenarios E2E ejecutados
- ✅ 4 ciclos por escenario requeridos
- ✅ Semana 5 requerida (5/5) — NO cumplida
- ✅ Fix C3 aplicado y verificado
- ✅ 9 artefactos de release gate creados

---

## Estado de fixes aplicados

| Fix | Archivo | Estado | Efecto |
|---|---|---|---|
| C1 UUID reference | `src/lib/ai/generate-ceo-plan.ts` | ✅ CONFIRMADO | 0 errores en 5 escenarios |
| C2 unknown evidence | `src/lib/ai/generate-ceo-plan.ts` | ✅ CONFIRMADO | 0 errores en 5 escenarios |
| C3 pendingHistoryRef | `src/lib/ai/generate-ceo-plan.ts` | ✅ PARCIAL | W1-W4 OK; W5 con historial máximo residual |
| C3 completedHistoryRef | `src/lib/ai/generate-ceo-plan.ts` | ✅ PARCIAL | W1-W4 OK; W5 con historial máximo residual |
| C3 capacity reminder | `src/lib/ai/generate-ceo-plan.ts` | ✅ PARCIAL | W1-W4 OK; insuficiente en W5 extremo |
| C4 observability (CEO_PLAN_TRACE) | `src/lib/ai/generate-ceo-plan.ts` | ✅ IMPLEMENTADO | Activo en stderr |

---

## Acciones requeridas antes del próximo release gate

### Bloqueante 1 — C3 en W5 con historial máximo

**Opciones:**
1. Aumentar `MAX_GENERATION_ATTEMPTS` de 2 a 3 para baja capacidad + historial >3 acciones
2. En `generate-ceo-plan.ts`, derivar desde TypeScript el `work_key` sugerido para intento 2 (proporcionar directamente al prompt un work_key permitido que no colisione)
3. Suavizar la validación de duplicados para acciones que varían significativamente en scope aunque compartan work_key base

### Bloqueante 2 — Budget API

**Recomendación:** Re-ejecutar cafe-horizonte en sesión con budget fresco para confirmar que el fix C3 es suficiente para ese escenario. El resto de los escenarios ya tienen semana 5 validada.

---

## Instrucciones para próxima validación

```
# Verificar que Docker esté corriendo
# Iniciar Supabase local
npx supabase start

# Ejecutar solo los 2 escenarios faltantes
$env:QA_PLAYWRIGHT_PATH = "C:\Users\clavi\AppData\Local\npm-cache\_npx\705bc6b22212b352\node_modules\playwright-core"
$env:QA_SCENARIOS = "limpieza,cafe-horizonte"
$env:QA_BROWSER_REPORT = "../release-gate/browser-observations-v2.json"
node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
```

Si ambos pasan con semana 5 generada, actualizar este archivo con `Functional GO: ✅` y cambiar la decisión a **GO**.

---

## Artefactos de evidencia

| Artefacto | Propósito |
|---|---|
| `TEST-RESULTS.json` | Resultados consolidados (184/184 + E2E) |
| `API-USAGE.json` | Presupuesto API y estimados |
| `SECURITY-REPORT.md` | 4 criterios de seguridad verificados |
| `ROOT-CAUSE-VERIFICATION.md` | C1-C4 causas raíz y estado del fix |
| `E2E-4-WEEKS-REPORT.md` | Informe detallado de los 4 runs E2E |
| `ACTION-HISTORY-MATRIX.md` | Historial de acciones por escenario |
| `GENERATION-TRACE.json` | Traces de generación por semana |
| `QA-REPORT.md` | Informe QA completo |
| `RELEASE-DECISION.md` | Este archivo — decisión final |
