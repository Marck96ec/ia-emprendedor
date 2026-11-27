# Recurrence Semantic Tests — TuCEO IA v2.6

**Date:** 2026-11-25
**Branch:** feature/strategic-intelligence-v2

---

## Overview

4 deterministic tests were added to `tests/strategic-intelligence.test.ts` to verify that `sameWork` correctly identifies semantically equivalent actions even when wording differs, while allowing genuinely new scope.

---

## Tests Added

### Test 1: `sameWork` detects semantic equivalence via high target-word overlap

**Function under test:** `sameWork()` in `src/lib/strategic-action.ts`

```typescript
test("sameWork detecta equivalencia semántica por superposición alta de palabras objetivo", () => {
  const histAction = {
    action: "Contactar propietarios de talleres mecánicos para presentar el servicio de inventario",
    strategy: strategy({ work_key: "commercial_outreach", intent: "execute" }),
  };
  const equiv = {
    action: "Presentar el servicio de inventario a propietarios de talleres mecánicos del norte",
    strategy: strategy({ work_key: "commercial_outreach", intent: "execute" }),
  };
  assert.equal(sameWork(histAction, equiv), true);
});
```

**Word overlap analysis:**
- A target words: `{propietari, taller, mecanic, presentar, servicio, inventario}` — 6 words
- B target words: `{presentar, servicio, inventario, propietari, taller, mecanic, norte}` — 7 words
- Common: 6 words
- 6/min(6,7) = 1.0 ≥ 0.67 ✓ and 6/max(6,7) = 0.857 ≥ 0.5 ✓
- **Result: `sameWork` returns `true`** — correctly blocked

### Test 2: `sameWork` allows genuinely new scope when target segment differs

```typescript
test("sameWork permite scope genuinamente nuevo cuando el grupo objetivo no comparte palabras", () => {
  const histAction = {
    action: "Contactar propietarios de talleres mecánicos para presentar el servicio de inventario",
    strategy: strategy({ work_key: "commercial_outreach", intent: "execute" }),
  };
  const newScope = {
    action: "Presentar el servicio de inventario a dueños de restaurantes del sector gastronómico",
    strategy: strategy({ work_key: "commercial_outreach", intent: "execute" }),
  };
  assert.equal(sameWork(histAction, newScope), false);
});
```

**Word overlap analysis:**
- A target words: `{propietari, taller, mecanic, presentar, servicio, inventario}` — 6 words
- B target words: `{presentar, servicio, inventario, duen, restaurant, sector, gastronomico}` — 7 words
- Common: `{presentar, servicio, inventario}` = 3 words
- 3/min(6,7) = 0.5 < 0.67 → condition fails
- **Result: `sameWork` returns `false`** — correctly allowed

### Test 3: `sameWork` blocks `cashflow_update` regardless of title (special rule)

```typescript
test("sameWork bloquea cashflow_update independientemente del título por regla especial", () => {
  const hist = {
    action: "Actualizar flujo de caja con movimientos de esta semana",
    strategy: strategy({ work_key: "cashflow_update", intent: "maintain" }),
  };
  const differentWording = {
    action: "Registrar ingresos y egresos del mes para actualizar proyección de caja",
    strategy: strategy({ work_key: "cashflow_update", intent: "maintain" }),
  };
  assert.equal(sameWork(hist, differentWording), true);
});
```

**Rule applied:** `src/lib/strategic-action.ts` line 115:
```typescript
if (key === "cashflow_update" || ...) return true;
```
Same `cashflow_update` work_key with same intent always returns `true`, regardless of title. This is intentional: cashflow tracking is the same work every period, distinguished by `progression: "recurrence"` with a different `period_week`.

### Test 4: `validateProgression` blocks semantic equivalent declared as new, allows different segment

```typescript
test("validateProgression bloquea acción semánticamente equivalente declarada como nueva y permite scope diferente", () => {
  const completed: HistoricalAction = {
    id: uuid(70), week: 1, status: "completed",
    result: "Contacto realizado con 5 propietarios",
    action: "Contactar propietarios de talleres mecánicos para presentar el servicio de inventario",
    objective: "Conseguir primera cita",
    strategy: strategy({ work_key: "commercial_outreach", intent: "execute", period_week: 1 }),
  };
  // Semantically equivalent → blocked
  assert.match(
    validateProgression(candidate(
      "Presentar el servicio de inventario a propietarios de talleres mecánicos del norte",
      { work_key: "commercial_outreach", intent: "execute", progression: "new", prior_action_id: null },
    ), [completed], [], 2, false) ?? "",
    /trabajo ya existe/,
  );
  // Genuinely new scope → passes
  assert.equal(
    validateProgression(candidate(
      "Presentar el servicio de inventario a dueños de restaurantes del sector gastronómico",
      { work_key: "commercial_outreach", intent: "execute", progression: "new", prior_action_id: null },
    ), [completed], [], 2, false),
    null,
  );
});
```

**Validation path:** `validateProgression` at line 270:
```typescript
if (completed || availableOffer) {
  return "El trabajo ya existe. Reutilízalo en una acción de intención distinta ...";
}
```

---

## Coverage

| Scenario | Covered |
|----------|---------|
| Same title exact match | ✅ (existing tests) |
| Different title, same target segment (high overlap) | ✅ Test 1 |
| Different title, different target segment (low overlap) | ✅ Test 2 |
| `cashflow_update` unconditional block | ✅ Test 3 |
| End-to-end `validateProgression` with semantic equivalent | ✅ Test 4 |
| `lead_follow_up` responseTracking unconditional block | ✅ (existing test: "seguimiento de prospectos admite recurrencia") |
| `offer_definition`/`commercial_messages` build/optimize block | ✅ (existing test: "reutiliza el resultado de una oferta previa") |

---

## Gap Identified: AI-Generated Titles With Low Overlap

The 0.67 threshold means the AI can evade `sameWork` by using entirely different words for the same work:
- History: "Contactar propietarios de talleres mecánicos para presentar el servicio de inventario"
- New: "Visitar negocios de reparación automotriz con catálogo de control de stock"

This would have word overlap of 0 for the target segment words (taller/mecanic vs reparacion/automotriz; inventario vs stock), and `sameWork` would return `false` even though the work is semantically identical. This gap is documented but not patched in this phase — it would require semantic similarity scoring beyond word-stem overlap.

---

## Test Results

All 196 tests pass (192 previously, +4 new semantic recurrence tests).
See `TEST-RESULTS.json` for the full run.
