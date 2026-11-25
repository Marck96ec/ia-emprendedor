# IMPLEMENTATION-CHANGES.md · Cambios Implementados

**Fecha.** 2026-11-24.
**Rama.** `feature/strategic-intelligence-v2`.
**Principio.** Mínimo cambio necesario. No se rediseñó la arquitectura ni se cambió el modelo de IA.

---

## Cambio 1 — Inyección de IDs válidos en el prompt de reparación

### Archivo
`src/lib/ai/generate-ceo-plan.ts`

### Motivación
Causa raíz C1: cuando el modelo fallaba con un error de categoría `reference` (UUID incorrecto en `prior_action_id` o `completed_prerequisite_id`), el segundo intento incluía los errores clasificados pero no los IDs válidos disponibles. El modelo no podía corregir un UUID inválido sin conocer los valores correctos.

### Qué se cambió

**Nuevas variables después de `const context = input.strategicContext;`** (líneas 221-232):

```typescript
const hasReferenceErrors = previousIssues.some((issue) => issue.category === "reference");
const validHistoryRef = hasReferenceErrors && context
  ? context.history.slice(0, 20).map((a) =>
      `${a.id} w${a.week} ${a.status} "${a.action.slice(0, 80)}"`,
    ).join("\n")
  : null;
const validEvidenceRef = hasReferenceErrors && context
  ? context.recentEvidence
      .filter((e) => e.certainty !== "unknown")
      .map((e) => e.id)
      .join(", ") || null
  : null;
```

**Texto inyectado en la sección `REPARACIÓN ESTRATÉGICA`** (línea 434):

```
${validHistoryRef ? `\nIDs válidos disponibles en el historial (usa exactamente uno de estos si necesitas prior_action_id o completed_prerequisite_id):\n${validHistoryRef}` : ""}${validEvidenceRef ? `\nIDs válidos para new_evidence_id (certainty != unknown): ${validEvidenceRef}` : ""}
```

### Por qué es el cambio mínimo

- Solo se activa cuando `hasReferenceErrors === true` (segundo intento, error de referencia, contexto estratégico presente).
- No modifica la lógica de validación ni el esquema del modelo.
- No cambia el comportamiento de semanas 1 ni de planes sin contexto estratégico.
- El historial está truncado a 20 acciones y 80 chars por acción para no inflar el prompt.
- Si no hay errores de referencia, `validHistoryRef` y `validEvidenceRef` son `null` y no se añade texto.

### Riesgo
Bajo. El modelo recibe información que ya está en el contexto (`strategicContext.history` y `recentEvidence`). No se añade información nueva, solo se la presenta explícitamente en el momento de reparación.

---

## Cambio 2 — Actualización del evaluador aislado

### Archivo
`artifacts/qa/strategic-intelligence-v2/reliability/evaluate-model.mjs`

### Motivación
Causa raíz A2: el evaluador usaba IDs sintéticos con patrón `00000000-0000-4000-8000-000000000001` que el modelo puede reconocer por forma. No replicaba las condiciones del pipeline real. Hallazgo A2 del ARCHITECTURE-AUDIT.

### Cambio 2a — IDs de historial en formato UUID-like

```javascript
// Antes:
id: "00000000-0000-4000-8000-00000000000" + (i + 1)

// Después:
const historyIds = [
  "a1b2c3d4-e5f6-7001-8abc-def012345671",
  "a1b2c3d4-e5f6-7001-8abc-def012345672",
  "a1b2c3d4-e5f6-7001-8abc-def012345673",
];
```

### Cambio 2b — ID de oferta de limpieza en formato UUID-like

```javascript
// Antes:
id: "00000000-0000-4000-8000-000000000201"

// Después:
id: "b2c3d4e5-f601-7002-8bcd-ef1234567801"
```

### Cambio 2c — Importación y uso de `buildBusinessAssessment`

```javascript
// Import añadido (línea 14):
const { buildBusinessAssessment } = load(dist("lib/business-assessment-adapter"));

// En la función worker():
const assessment = buildBusinessAssessment({
  diagnostic: entry.input.diagnostic,
  evidence: [],
  completedActions: previousWeek?.review?.completedActions ?? 1,
  totalActions: previousWeek?.review?.totalActions ?? 3,
  latestReview: previousWeek ? { outcome_status: previousWeek.review.outcomeStatus } : null,
  reviewedWeeks: previousWeek ? 1 : 0,
});
// ...
const plan = await generateCEOPlan({ ...entry.input, previousWeek, strategicContext, assessment }, ...);
```

### Por qué es el cambio mínimo

- Los IDs siguen siendo fijos (no aleatorios) para reproducibilidad de los tests.
- Tienen entropia visual real: el modelo no puede reconocerlos por patrón visual.
- `assessment` replica la condición del pipeline real sin modificar lógica de generación.

---

## Validación post-cambio

```
npm run typecheck  → ✅ PASS (types generated, tsc --noEmit clean)
npm run lint       → ✅ PASS (eslint clean)
```

No se ejecutaron tests E2E completos (requieren presupuesto de llamadas al proveedor autorizado por separado — ver RELEASE-DECISION.md sección "Bloqueos de Presupuesto").

---

## Archivos modificados

| Archivo | Tipo | Líneas afectadas |
|---|---|---|
| `src/lib/ai/generate-ceo-plan.ts` | Producción | 221-232, 434 |
| `artifacts/qa/strategic-intelligence-v2/reliability/evaluate-model.mjs` | QA evaluador | 14, 32-41, 114, 154-166 |
