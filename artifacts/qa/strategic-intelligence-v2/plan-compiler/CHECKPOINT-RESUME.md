# Checkpoint Resume — TuCEO IA v2.7

**Date:** 2026-11-26
**Branch:** feature/strategic-intelligence-v2

---

## Problem

When a scenario fails at W4 and `QA_PRESERVE_CHECKPOINT=1` was set, weeks 1–3 plans exist in the database. Re-running the scenario from scratch repeats 3 successful weeks before reaching the failing week, consuming 3+ additional provider calls and taking significant time.

---

## Solution: `QA_START_WEEK`

Added to `e2e-local.mjs`: when `QA_START_WEEK=N` is set, the weekly loop checks whether each week's plan ALREADY EXISTS in the database (status=ready). If it does, that week is skipped — no execution, no review, no additional API calls.

**Behavior:**
- Week N exists as `ready` → skip to next week, log "QA_START_WEEK: semana N ya existe, saltando."
- Week N does NOT exist → run that week normally (identical to a fresh run)
- For weeks >= `QA_START_WEEK`: always run normally

**Result metadata:** The checkpoint object is now included in the evidence JSON:
```json
{
  "checkpoint": {
    "scenarioKey": "cafe-horizonte",
    "startWeek": 4,
    "resumedFrom": 4,
    "traceRef": "CEO_PLAN_TRACE correlationId available in server stderr"
  }
}
```

---

## Usage Workflow

### Step 1: Run failing scenario with preservation

```powershell
$env:QA_PRESERVE_CHECKPOINT = "1"
$env:QA_SCENARIOS = "cafe-horizonte"
$env:CEO_PLAN_API_BUDGET_FILE = "ceo-budget.json"

# Start dev server with stderr capture:
Start-Process npm -ArgumentList "run","dev" -RedirectStandardError "ceo-trace.log" -NoNewWindow

# Run scenario:
node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
```

The failing week's plan ends in `status=failed`. Weeks 1–3 plans exist as `status=ready`.

### Step 2: Diagnose from trace

```powershell
Select-String -Path "ceo-trace.log" -Pattern "CEO_PLAN_TRACE" |
  ForEach-Object { $_.Line -replace '.*CEO_PLAN_TRACE ', '' } |
  ForEach-Object { $_ | ConvertFrom-Json } |
  Where-Object { $_.result -eq "rejected" }
```

Look for `rejectedFields` to identify the exact path.

### Step 3: Apply fix and resume from the failing week

After applying a targeted fix to the prompt or validation:

```powershell
$env:QA_PRESERVE_CHECKPOINT = "1"
$env:QA_START_WEEK = "4"
$env:QA_SCENARIOS = "cafe-horizonte"

node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
```

The script skips weeks 1–3 (they already exist as `ready`) and runs only week 4.

### Step 4: Clean up

```powershell
# After successful diagnosis, remove preserved user:
# (Use the user ID logged by QA_PRESERVE_CHECKPOINT)
npx supabase db query --local "DELETE FROM auth.users WHERE id = '<uuid>';"
```

---

## Limitations

1. **New user is still created.** Each E2E run creates a new test user, even when `QA_START_WEEK` is set. The existing weeks' plans from a preserved checkpoint belong to a DIFFERENT user. If you want to resume with the EXACT same user/business, you must do so manually (see below).

2. **Manual resume with preserved user.** To re-run week 4 for the exact same user (without creating a new one), the scenario would need to authenticate as the preserved user. This is not automated in this phase because `testHelpers.createTestUser` creates a new user with a generated password, and there is no published `testHelpers.signInUser` function that accepts an existing user's credentials. The workaround is to trigger a retry via the UI on the preserved user's session.

3. **Stale lock files.** If a previous run was interrupted, a `.lock` file may remain in the budget file directory. Remove it manually: `Remove-Item "$env:CEO_PLAN_API_BUDGET_FILE.lock"`.

4. **Multiple scenarios.** `QA_START_WEEK` applies to all scenarios when running multiple simultaneously. Use `QA_SCENARIOS=cafe-horizonte` to target a single scenario.

---

## Relationship to `QA_PRESERVE_CHECKPOINT`

| Env Var | Effect |
|---------|--------|
| `QA_PRESERVE_CHECKPOINT=1` | Skips `deleteTestUser` in finally block; logs user ID for manual cleanup |
| `QA_START_WEEK=N` | Skips weeks < N if their plans already exist as `ready` in DB |

Both can be used together:
```powershell
$env:QA_PRESERVE_CHECKPOINT = "1"
$env:QA_START_WEEK = "4"
$env:QA_SCENARIOS = "cafe-horizonte"
```
