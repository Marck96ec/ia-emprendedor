# Observability Report — TuCEO IA v2.7

**Date:** 2026-11-26
**Branch:** feature/strategic-intelligence-v2

---

## Existing Observability: CEO_PLAN_TRACE

Emitted via `console.error("CEO_PLAN_TRACE", JSON.stringify(entry))` in `generate-ceo-plan.ts`.

### Fields in each trace entry

| Field | Type | Description |
|-------|------|-------------|
| `correlationId` | string | 8-char UUID prefix — links all attempts for one generation |
| `targetWeek` | number | Week being generated |
| `attempt` | number | Attempt number (1 or 2) |
| `phase` | string | `attempt_rejected`, `attempt_accepted`, `exhausted` |
| `result` | string | `accepted`, `rejected`, `exhausted` |
| `errorCode` | string? | Error code (e.g., `CEO_PLAN_SEMANTIC_OUTPUT_INVALID`) |
| `errorCategory` | string? | Error kind: `structural`, `semantic`, `transient`, `configuration` |
| `rejectedFields` | string[]? | Up to 10 field paths that failed validation |
| `repairsApplied` | string[]? | Fields corrected by `repairPlanMetadata` |

### Error Category Coverage (CEO plan only)

| Category | CEO_PLAN_TRACE Coverage | Note |
|----------|------------------------|------|
| `structural` | ✅ `errorCategory="structural"` | Schema validation failure |
| `semantic` | ✅ `errorCategory="semantic"` | Business rules or strategic validation failure |
| `transient` | ✅ `errorCategory="transient"` | Provider request failure |
| `configuration` | ✅ Thrown before loop starts | OPENAI_API_KEY missing |
| `feasibility` | ✅ In `rejectedFields` as `weekly_plan.N.strategy.requires` | Per-action feasibility |
| `progression` | ✅ In `rejectedFields` as `weekly_plan.N.strategy.progression` | Recurrence/continuation violations |
| `capacity` | ✅ In `rejectedFields` as `weekly_plan.N.estimated_hours` | Hours exceeded |
| `deliverable` | ✅ In `rejectedFields` as `weekly_plan.N.strategy.deliverable` | Deliverable mismatch |
| `reference` | ✅ In `rejectedFields` as `prior_action_id` or `new_evidence_id` | Invalid reference |
| `capture` | ✅ In `rejectedFields` as `weekly_plan.N.capture_schema.*` | Capture schema violations |

---

## New in v2.7: PROVIDER_BUDGET_LOG

Emitted via `console.error("PROVIDER_BUDGET_LOG", JSON.stringify(entry))` in `src/lib/ai/provider-budget.ts`.

Emitted for EVERY provider call across ALL generators (not just CEO plan).

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `caller` | string | Generator identifier: `ceo-plan`, `value-proposition`, `commercial-offers`, `commercial-messages`, `external-evidence` |
| `limit` | number | Total authorized calls for this budget file |
| `used_after` | number | Counter value after this reservation |
| `remaining` | number | Remaining calls: `limit - used_after` |

**No business content is logged** — no plan content, no prompt text, no business data.

### Example log line

```
CEO_PLAN_TRACE {"correlationId":"a1b2c3d4","targetWeek":4,"attempt":1,"phase":"attempt_rejected","result":"rejected","errorCode":"CEO_PLAN_SEMANTIC_OUTPUT_INVALID","errorCategory":"semantic","rejectedFields":["weekly_plan.0.strategy.progression"],"repairsApplied":[]}
PROVIDER_BUDGET_LOG {"caller":"ceo-plan","limit":10,"used_after":5,"remaining":5}
```

---

## Coverage Gaps (Not Addressed in v2.7)

| Category | Status | Note |
|----------|--------|------|
| `context_load` | ❌ Not traced | Errors in `buildStrategicContext()` are not inside `generateCEOPlan`'s observability scope |
| `persistence` | ❌ Not traced | DB persistence errors happen in route handlers, not in generator functions |
| Specialist generators | ❌ Partial | `PROVIDER_BUDGET_LOG` covers them; individual generation errors are not traced with correlationId |

### Recommended Future Work: Specialist Traces

Each specialist generator (`generateValueProposition`, `generateCommercialOffers`, `generateCommercialMessages`) should emit its own trace similar to CEO_PLAN_TRACE. The `correlationId` from the CEO plan generation should be passed through to specialist calls so all provider calls for one weekly plan can be correlated.

This requires passing `correlationId` from the CEO plan generation through to the action execution layer (outside the scope of `generate-ceo-plan.ts`).

---

## Capturing Traces During E2E

```powershell
# Windows: redirect stderr to a log file while running dev server
Start-Process npm -ArgumentList "run","dev" -RedirectStandardError "ceo-trace.log" -NoNewWindow

# After run, extract CEO_PLAN_TRACE entries:
Select-String -Path "ceo-trace.log" -Pattern "CEO_PLAN_TRACE" |
  ForEach-Object { $_.Line -replace '.*CEO_PLAN_TRACE ', '' } |
  ForEach-Object { $_ | ConvertFrom-Json }

# Extract PROVIDER_BUDGET_LOG entries:
Select-String -Path "ceo-trace.log" -Pattern "PROVIDER_BUDGET_LOG" |
  ForEach-Object { $_.Line -replace '.*PROVIDER_BUDGET_LOG ', '' } |
  ForEach-Object { $_ | ConvertFrom-Json }
```
