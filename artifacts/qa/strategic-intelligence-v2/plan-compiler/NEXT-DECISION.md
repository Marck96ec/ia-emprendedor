# Next Decision — TuCEO IA v2.7

**Date:** 2026-11-26
**Branch:** feature/strategic-intelligence-v2

---

## What This Phase Established

v2.7 is an infrastructure improvement phase. No CEO plan generation logic was changed. The goals were:

1. **Budget enforcement** extended to all 4 specialist generators (not just CEO plan)
2. **Observability** extended with `PROVIDER_BUDGET_LOG` covering all provider calls
3. **E2E checkpoint resume** enabled via `QA_START_WEEK`
4. **Plan Compiler architecture** documented — identifies fields to extract in Phase 2
5. **Fixture tests** demonstrate budget and pipeline behavior without real provider calls

---

## Infrastructure Now in Place

| Tool | Status |
|------|--------|
| `PROVIDER_API_BUDGET_FILE` covering all generators | ✅ Implemented |
| `CEO_PLAN_API_BUDGET_FILE` backward compatibility | ✅ Preserved |
| `QA_MODE` safe failure on missing config | ✅ Implemented |
| `PROVIDER_BUDGET_LOG` stderr entries | ✅ Implemented |
| Advisory lock on budget file | ✅ Implemented (best-effort) |
| `QA_START_WEEK` for checkpoint resume | ✅ Implemented |
| 8 new deterministic tests | ✅ 204 total, 200 pass, 0 fail |
| Plan Compiler analysis documented | ✅ 9 deliverable documents |

---

## What to Do Next (Ordered)

### 1. Run failing scenarios with full observability

```powershell
# Budget file: 10 calls per scenario (4 weeks × 2 attempts + 2 buffer)
echo '{"limit":30,"used":0}' | Out-File ceo-budget.json -Encoding utf8

$env:PROVIDER_API_BUDGET_FILE = "$PWD\ceo-budget.json"
$env:QA_PRESERVE_CHECKPOINT = "1"
$env:QA_SCENARIOS = "cafe-horizonte,nova-studio"

# Start dev server with stderr capture:
Start-Process npm -ArgumentList "run","dev" -RedirectStandardError "ceo-trace-$(Get-Date -Format 'yyyyMMddHHmm').log" -NoNewWindow

# Run scenarios:
node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
```

### 2. Extract the exact error from the trace

```powershell
$logFile = "ceo-trace-*.log" # adjust to actual filename
Select-String -Path $logFile -Pattern "CEO_PLAN_TRACE" |
  ForEach-Object { $_.Line -replace '.*CEO_PLAN_TRACE ', '' } |
  ForEach-Object { $_ | ConvertFrom-Json } |
  Where-Object { $_.result -eq "rejected" } |
  Select-Object correlationId, targetWeek, attempt, errorCode, rejectedFields
```

Look for `rejectedFields` to identify the exact path.

### 3. Apply a targeted fix

- **If `rejectedFields` contains `weekly_plan.N.strategy.progression`:** W4 Café Horizonte has a `collections`/`commercial_outreach` action with the same title as a prior completed action. Strengthen CONTRATO wording for W4+ requiring title differentiation.
- **If `rejectedFields` contains `weekly_plan.N.estimated_hours`:** Nova Studio W1 is over capacity. Nova Studio has `ownerHoursPerWeek: 8` — the AI may assign more than 8 hours for an operating-stage business. Strengthen the capacity instruction for operating-stage scenarios.
- **If `rejectedFields` contains `weekly_plan.N.execution_mode`:** More than 1 `ai_assisted` action. Strengthen the "cero o una acción asistida" rule.

### 4. Use `QA_START_WEEK` for the failing week only

After applying the fix, resume from the failing week without re-running 1–3:

```powershell
$env:QA_START_WEEK = "4"  # for cafe-horizonte W4
# (or whatever week failed)
$env:QA_PRESERVE_CHECKPOINT = "1"
$env:QA_SCENARIOS = "cafe-horizonte"
node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
```

### 5. Full 3-scenario pass

When both failing scenarios pass:

```powershell
Remove-Item env:\QA_START_WEEK
$env:QA_SCENARIOS = "limpieza,cafe-horizonte,nova-studio"
node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
```

Confirm all 3 scenarios show `status: "PASS"`.

### 6. Merge to main

When all 3 pass end-to-end.

---

## Decision Criteria for GO

| Criterion | Required |
|-----------|----------|
| All 204 tests pass | ✅ Current |
| Café Horizonte W1–W4 PASS | ❌ Pending (hypotheses documented in NEXT-DECISION.md v2.6) |
| Nova Studio W1–W4 PASS | ❌ Pending |
| Limpieza W1–W4 PASS | ✅ Confirmed v2.5 |
| Budget active during E2E run | ❌ Not yet activated — requires running Step 1 above |
| No new engine changes without evidence | ✅ This phase: no prompt/engine changes |
| No real API calls during diagnosis phase | ✅ This phase: 0 provider calls made |

---

## Future Work: Plan Compiler Phase 2

After the failing scenarios are confirmed fixed, evaluate Phase 2 Plan Compiler extractions:

1. **Remove `time_allocation.*` from AI model schema** — make them optional in `StrategicCEOPlanModelSchema`. Always compute them in TypeScript. This reduces prompt token pressure.

2. **Derive `execution_mode` from `action_type`** — `ai_assisted` iff `action_type ∈ {value_proposition, commercial_messages}`. The relationship is already enforced; remove the redundancy from AI output.

3. **Extend localized repair** — for capacity errors (`rejectedFields: estimated_hours`), TypeScript could identify which single action exceeds the remaining budget and reduce its hours proportionally. Gate this on the scenario being confirmed: "No reducir arbitrariamente horas" — only reduce when the action is unambiguously over-budget and the reduction is to exactly the remaining hours.

None of these should be implemented until the two E2E failures are diagnosed and fixed with provider evidence.
