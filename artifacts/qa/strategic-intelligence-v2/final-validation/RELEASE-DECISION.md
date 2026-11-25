# RELEASE-DECISION.md · Decisión de Release Final

**Fecha.** 2026-11-25.
**Validación.** Final Release Validation v2.2.
**Auditor.** Claude Sonnet 4.6 (independiente).

---

## VEREDICTO: NO GO — Condicional (mejora respecto a auditoría anterior)

El estado anterior era **NO GO bloqueante** (C1 no validado). El estado actual es **NO GO condicional** con evidencia empírica de que C1 está resuelto.

---

## Criterios del Release Gate (spec sección 11)

### Functional GO

| Criterio | Estado | Evidencia |
|---|---|---|
| 5/5 negocios completan 4 ciclos | ❌ NO EVALUADO | Sin ciclos E2E completos por navegador |
| 20/20 revisiones semanales persistidas | ❌ NO EVALUADO | Sin ciclos E2E completos |
| 5/5 planes de semana 5 generados | ❌ NO EVALUADO | Sin ciclos E2E completos |
| Recuperación comprobada | ✅ PARCIAL | DB: Café Horizonte W2, Taller Andino W2 `ready` post-fix |
| Ausencia de duplicados | ✅ | DB local: 1 plan por semana por negocio |
| Validaciones técnicas aprobadas | ✅ | typecheck, lint, build, test 180/180 PASS |

### Strategic Intelligence GO

| Criterio | Estado | Evidencia |
|---|---|---|
| Restricciones respetadas | ✅ | Evaluador: `social_media unavailable` respetado en todos los PASS |
| Acciones factibles | ✅ | 12/12 PASS planes: todas las acciones `feasible` o `unknown` (no `blocked`) |
| Reutilización de activos | ✅ | Oferta W1 referenciada en planes W2 en todos los PASS |
| Hipótesis coherentes con evidencia | ✅ | Evaluador: razonamiento estratégico explícito en todos los PASS |
| Cero repeticiones injustificadas confirmadas | ✅ | Evaluador: 0 planes PASS con repetición; fallos por progresión, no por repetición |
| Personalización fundamentada | ✅ | Mantenimiento ≠ Limpieza ≠ Café en decisiones, aunque puedan compartir patrones |

### Security GO

| Criterio | Estado | Evidencia |
|---|---|---|
| Aislamiento entre propietarios | ⚠️ SKIPPED | 4 tests de integración skipped en test suite |
| RLS | ⚠️ SKIPPED | Mismo motivo |
| Integridad de datos | ✅ | DB local: sin planes corruptos ni estados inválidos |

---

## Cambios implementados (seguros para merge)

| Cambio | Archivo | Validación | Estado |
|---|---|---|---|
| FIX-1: IDs válidos en prompt de reparación | `src/lib/ai/generate-ceo-plan.ts` | typecheck ✅ lint ✅ build ✅ test ✅ 27 API calls ✅ | Listo |
| FIX-2: Observabilidad CEO_PLAN_TRACE | `src/lib/ai/generate-ceo-plan.ts` | typecheck ✅ lint ✅ build ✅ | Listo |
| FIX-3: Evaluador v8 con crypto.randomUUID() | `evaluate-model-v8.mjs` (QA artifact) | Validación directa ✅ | Listo (no es código de producción) |

---

## Qué está comprobado

1. **C1 corregido**: 0 errores de referencia UUID en 27 llamadas a API con IDs opacos reales.
2. **C2 corregido**: evidencias con `certainty=unknown` excluidas del prompt de reparación; 1 caso real resuelto.
3. **C4 abordado**: logging `CEO_PLAN_TRACE` con correlationId, semana, intento, categoría de error.
4. **Arquitectura estable**: build limpio, 180/180 tests unitarios PASS.
5. **Negocios QA en DB local**: Café Horizonte W2, Taller Andino W2, Nova Studio W2 generados `ready` post-fix.

---

## Qué falta para GO definitivo

### Bloqueante (Functional GO no cumplido)

1. **Ciclos E2E completos por aplicación real**: 5 negocios × 5 semanas (W1-W5) vía navegador + Supabase local.
   - Acción: ejecutar con browser automation o testing manual con la aplicación corriendo localmente.
   - Estimado: requiere 20-40 llamadas API adicionales (dentro del budget restante: 33 calls disponibles).

2. **Integración tests con Supabase RLS**: 4 tests skipped que validan aislamiento entre propietarios.
   - Acción: ejecutar `npm test` con la sesión de Supabase activa y las tablas accesibles al service_role.

### Deseable (no bloqueante)

3. **C3 reducción**: gestión de errores de progresión con historial >5 acciones (tasa actual 20%).
   - Acción: añadir `work_key + intent` de acciones pendientes al prompt de reparación para guiar selección de continuación.

4. **Semana 5 generada para todos los negocios**: demuestra continuidad más allá de 4 ciclos.

---

## Comparativa auditorías

| Aspecto | Auditoría anterior (2026-11-24) | Esta auditoría (2026-11-25) |
|---|---|---|
| C1 validado | NO — solo estático | ✅ 27 API calls, 0 reference errors |
| C2 validado | NO — solo estático | ✅ 1 caso real resuelto |
| C4 observabilidad | NO implementada | ✅ CEO_PLAN_TRACE activo |
| Evaluador | IDs UUID-like (predecibles) | crypto.randomUUID() |
| Tasa de éxito evaluador con UUIDs reales | No medida | 80% (12/15) |
| Checkpoint recovery | Bloqueado por presupuesto | Parcial: DB evidence + fixtures |
| Build | No ejecutado | ✅ PASS |

---

## Decisión final

**NO GO — Condicional.**

Los cambios implementados son correctos y seguros. El motor puede generar planes con UUIDs reales. Para emitir GO, se requiere completar los ciclos E2E completos con la aplicación real (Functional GO) y ejecutar los 4 tests de integración skipped (Security GO).

**Recomendación:** Autorizar una sesión de testing con browser automation usando los 33 API calls restantes para completar los ciclos E2E. Si los 5 negocios completan W1-W5 sin bloqueos, el GO puede emitirse.
