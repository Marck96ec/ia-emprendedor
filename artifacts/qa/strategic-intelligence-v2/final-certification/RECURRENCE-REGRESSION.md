# Recurrence Regression — v2.5

## Risk Fixed

**Identified risk (v2.5 spec):**
Test "repetición injustificada sobre mismos prospectos bloquea la progresión" demonstrated that
the same action could be approved by switching `progression=recurrence`. This allowed the AI to
bypass the duplicate-work guard by labeling an identical action as a periodic recurrence.

## Implementation

### File: `src/lib/strategic-action.ts`

Added `PERIODIC_TRACKING_KEYS` constant (lines 225–227):

```typescript
const PERIODIC_TRACKING_KEYS = new Set<WorkKey>(["cashflow_update", "operations_measure"]);
```

**Rule applied in `validateProgression` (lines 256–258):**

```typescript
if (!PERIODIC_TRACKING_KEYS.has(key) && normalizeWorkText(item.action) === normalizeWorkText(related.action)) {
  return "La recurrencia requiere un alcance o grupo nuevo. Adapta el título para reflejar la nueva ronda.";
}
```

**Logic:**
- `cashflow_update` and `operations_measure` are periodic tracking keys: same title is allowed
  because the value changes each week (e.g., "Actualizar flujo de caja" is always the same task).
- `collections`, `commercial_messages`, `commercial_outreach`, `lead_follow_up` are activity
  keys: a different title is required to prove a new scope or contact group.

### File: `src/lib/ai/generate-ceo-plan.ts` — CONTRATO section

Updated recurrence instructions to require a different title:

> El título de la nueva acción debe ser diferente al de la acción previa y describir el nuevo
> segmento o grupo (p. ej. «contactos que mostraron interés real» en lugar de «contactos locales
> ya existentes»). Cambiar únicamente la semana sin actualizar el título y el alcance no es
> suficiente.

## Test Evidence

### Tests added/updated in `tests/strategic-intelligence.test.ts`

| Test case | Before fix | After fix |
|-----------|-----------|----------|
| "seguimiento de prospectos admite recurrencia" | passed (different title) | passes (different title) |
| "repetición injustificada sobre mismos prospectos bloquea la progresión" | FAIL (same title passed) | PASS — same title blocked, different title allowed |
| "seguimiento periódico de cobros admite recurrencia" | passed | passes (different title required for collections) |
| "negocio con cuatro horas y cuatro semanas" | passed | passes (different title required) |
| "mantenimiento: cuatro semanas de investigación..." | NEW | PASS |
| "taller-andino: cadena de delegación operativa..." | NEW | PASS |

**Test results (SUPABASE_LOCAL_TESTS=1):** 192 pass, 0 fail, 0 skipped.

## Verification

```
npm test -- --reporter=tap
# tests 192, pass 192, fail 0, skipped 0
```

Typecheck: 0 errors. Lint: 0 errors (4 pre-existing warnings unrelated to this change).
