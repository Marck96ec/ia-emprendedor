# QA-REPORT.md · Informe de Calidad

**Fecha.** 2026-11-24.
**Rama.** `feature/strategic-intelligence-v2`.
**Auditor.** Claude Sonnet 4.6 (independiente).

---

## Resumen ejecutivo

El motor de inteligencia estratégica v2 (`generateCEOPlan`) falla en 4 de 5 negocios reales antes de completar 4 ciclos semanales. La causa raíz principal (C1) fue identificada, corregida con el cambio mínimo necesario, y verificada estáticamente. La validación E2E completa está bloqueada por presupuesto de proveedor no autorizado.

---

## Hallazgos confirmados

### CRÍTICO — C1: referencia UUID en intento 2

**Descripción**: el modelo produce `prior_action_id` o `completed_prerequisite_id` con un UUID incorrecto en el intento 1. El intento 2 (reparación) no recibía los IDs válidos disponibles, por lo que no podía corregir el error.

**Impacto**: bloqueo completo a partir de la semana 2 en 3/5 negocios (mantenimiento, café horizonte, taller andino), y a partir de la semana 4 en 1/5 (limpieza).

**Fix implementado**: `src/lib/ai/generate-ceo-plan.ts` líneas 221-232, 434. Cuando el intento 1 falla con categoría `reference`, el intento 2 recibe la lista de IDs del historial y evidencias válidas.

**Verificación**: typecheck ✅ lint ✅. E2E: bloqueado por presupuesto.

---

### ALTO — A2: evaluador con IDs sintéticos (falso positivo)

**Descripción**: el evaluador aislado usaba IDs `00000000-0000-4000-8000-00000000000N` que el modelo puede reconocer por patrón visual. Los 10/10 pases son falsos positivos parciales respecto al pipeline real.

**Fix implementado**: `evaluate-model.mjs` actualizado con IDs UUID-like y `assessment` real.

---

### ALTO — C3: acumulación de historial (parcialmente mitigado)

**Descripción**: con 6+ acciones en historial (semanas 3-4), la tasa de error de progresión aumenta. El modelo propone continuaciones de trabajo ya cerrado.

**Mitigación parcial**: el Cambio 1 provee los IDs válidos en el intento 2, pero no guía explícitamente sobre qué tipo de progresión es apropiada.

**Estado**: abierto. Se necesita más análisis de `validateProgression()` con historial multi-semana.

---

### MEDIO — C4: observabilidad de fallos (no abordado)

**Descripción**: cuando `loadStrategicContext()` falla, el error visible en el cliente es solo `"El plan de semana N quedó en estado failed"` sin el `code` o `kind` específico.

**Estado**: abierto. No es causa directa de los 4 bloqueos conocidos pero dificulta el diagnóstico futuro.

---

## Validaciones ejecutadas

| Validación | Resultado | Notas |
|---|---|---|
| `npm run typecheck` | ✅ PASS | Tipos generados, `tsc --noEmit` limpio |
| `npm run lint` | ✅ PASS | ESLint sin errores |
| `npm run build` | No ejecutado | Evitar efectos secundarios |
| Revisión estática del código | Completada | 7 archivos revisados |
| Evaluador aislado (10 escenarios) | ✅ 10/10 PASS | Con condiciones sintéticas |
| E2E post-fix (5 negocios × 4 semanas) | BLOQUEADO | Sin presupuesto autorizado |

---

## Artefactos producidos en este audit

| Archivo | Descripción |
|---|---|
| `ARCHITECTURE-AUDIT.md` | 10 hallazgos arquitectónicos con severidad |
| `ROOT-CAUSE-ANALYSIS.md` | 4 causas raíz con evidencia y fixtures de regresión |
| `PIPELINE-PARITY-REPORT.md` | Tabla comparativa evaluador vs. pipeline real |
| `IMPLEMENTATION-CHANGES.md` | Descripción detallada de los 2 cambios implementados |
| `GENERATION-RELIABILITY.md` | Análisis de tasa de fallo por semana y mecanismo |
| `FEEDBACK-REGRESSION.md` | Revisión del pipeline de feedback y progresión |
| `MEMORY-STRESS-TEST.md` | Verificación del motor de memoria bajo volumen alto |
| `ACTION-HISTORY-MATRIX.md` | Matriz de acciones por negocio y análisis de dependencias |
| `E2E-4-WEEKS-REPORT.md` | Estado de ciclos completos y bloqueo de presupuesto |
| `QA-REPORT.md` | Este informe |
| `TEST-RESULTS.json` | Resultados estructurados en formato machine-readable |
| `RELEASE-DECISION.md` | Veredicto GO/NO GO con condiciones |

---

## Restricciones del audit cumplidas

- ✅ Solo ambiente local. No se modificó producción.
- ✅ No se usaron datos identificables de clientes.
- ✅ No se ejecutó `supabase db reset` ni `supabase db push`.
- ✅ No se realizó commit, push, PR ni merge.
- ✅ No se cambió el proveedor de IA.
- ✅ No se desactivaron validadores.
- ✅ No se realizaron modificaciones destructivas.
- ✅ No se eliminaron evidencias anteriores.
- ✅ Los fallos están documentados, no ocultos.
- ✅ El bloqueo de presupuesto está documentado en `TEST-RESULTS.json` y `E2E-4-WEEKS-REPORT.md`.
