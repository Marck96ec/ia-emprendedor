# Infrastructure Diagnosis — TuCEO IA v2.6

**Date:** 2026-11-25
**Branch:** feature/strategic-intelligence-v2

---

## 1. Dev Server and CEO_PLAN_TRACE

The trace function in `src/lib/ai/generate-ceo-plan.ts` (line 40) writes to `stderr`:

```
console.error("CEO_PLAN_TRACE", JSON.stringify(entry));
```

**To capture it during E2E:**

```bash
# Start dev server and pipe stderr to a file
npm run dev 2> /tmp/ceo-trace.log &

# Run E2E targeting specific scenarios
QA_SCENARIOS=cafe-horizonte,nova-studio node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs

# Extract traces after run
grep CEO_PLAN_TRACE /tmp/ceo-trace.log | sed 's/CEO_PLAN_TRACE //' | jq .
```

**On Windows (PowerShell):**

```powershell
# Start dev server redirecting stderr to file
$proc = Start-Process npm -ArgumentList "run","dev" -RedirectStandardError "ceo-trace.log" -PassThru -NoNewWindow

# Run E2E
$env:QA_SCENARIOS = "cafe-horizonte,nova-studio"
node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs

# Stop server when done
Stop-Process -Id $proc.Id

# Review traces
Get-Content ceo-trace.log | Select-String "CEO_PLAN_TRACE" | ForEach-Object { ($_ -replace ".*CEO_PLAN_TRACE ","") | ConvertFrom-Json }
```

---

## 2. CEO_PLAN_TRACE Field Structure

Each trace entry captures:

| Field | Type | Description |
|-------|------|-------------|
| `correlationId` | string (UUID) | Identifies a single `generateCEOPlan()` invocation |
| `targetWeek` | number | Week being generated (1–N) |
| `attempt` | number | Attempt number within the invocation (1 or 2) |
| `phase` | enum | `attempt_rejected`, `attempt_accepted`, `exhausted` |
| `result` | enum | `accepted`, `rejected`, `exhausted` |
| `errorCode` | string? | Only on rejected/exhausted: e.g. `CEO_PLAN_SEMANTIC_OUTPUT_INVALID` |
| `errorCategory` | string? | `structural` or `semantic` |
| `rejectedFields` | string[]? | Up to 10 Zod issue paths from the failed attempt |
| `repairsApplied` | string[]? | Auto-repairs applied before validation (from `repairPlanMetadata`) |

### Error Category Mapping (`issuesFromZod`)

| Zod path / message | Category |
|--------------------|-|
| contains `capture_schema` | `capture` |
| structural parse error | `structure` |
| `execution_mode`, `action_type`, `deliverable` | `deliverable` |
| message contains "máximo una acción asistida" | `deliverable` |
| `estimated_hours`, `time_allocation`, or "capacidad semanal" | `capacity` |
| path `strategic_continuity` | `progression` |
| anything else | `coherence` |

### Distinguishing Error Types

- **provider**: API call fails (network, rate limit, auth) — not captured in CEO_PLAN_TRACE; surfaces as uncaught exception
- **context**: `CEO_PLAN_STRUCTURAL_OUTPUT_INVALID` on attempt 1 or 2, with `rejectedFields` pointing at schema mismatch
- **persistence**: Supabase write fails — not in CEO_PLAN_TRACE; surfaces as server error after plan accepted
- **structure**: `errorCategory: "structural"`, `errorCode: "CEO_PLAN_STRUCTURAL_OUTPUT_INVALID"`
- **strategic validation**: `errorCategory: "semantic"`, `errorCode: "CEO_PLAN_SEMANTIC_OUTPUT_INVALID"`, `rejectedFields` pointing at `strategy.*`, `strategic_continuity`, or `estimated_hours`

---

## 3. Environment Variable Verification

The `CEO_PLAN_API_BUDGET_FILE` env var must be passed to the Next.js dev server process, not to the E2E script. The Next.js server reads `process.env` at the time `defaultCEOPlanRunner` is called.

**Current state:** The budget counter was NOT active during v2.5 E2E runs because the dev server was started without this env var. See `API-USAGE.json` in `final-certification/`.

**To activate budget enforcement in future E2E:**

```bash
# Create budget file
echo '{"limit":30,"used":0}' > /tmp/ceo-budget.json

# Start dev server with budget enforcement
CEO_PLAN_API_BUDGET_FILE=/tmp/ceo-budget.json npm run dev 2> /tmp/ceo-trace.log &

# After E2E, check usage
cat /tmp/ceo-budget.json
```

---

## 4. Known Observability Gaps

1. **Specialist agents** (`generate-value-proposition.ts`, `generate-commercial-offers.ts`, `generate-commercial-messages.ts`) have no budget counter and no trace logging. Their `run()` calls are untracked.
2. **Failed plan data** is deleted by `testHelpers.deleteTestUser` after each scenario run. CEO_PLAN_TRACE is the only persistent signal for failure analysis. Without server log capture, failure causes are irrecoverable.
3. **Internal SDK retries** inside `run()` (OpenAI Agents SDK) are not surfaced in CEO_PLAN_TRACE. The budget counter at line 82 fires once per `run()` call, before any SDK-level retry.
