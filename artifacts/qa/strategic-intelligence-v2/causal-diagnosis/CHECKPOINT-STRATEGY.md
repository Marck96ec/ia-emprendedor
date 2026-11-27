# Checkpoint Strategy — TuCEO IA v2.6

**Date:** 2026-11-25
**Branch:** feature/strategic-intelligence-v2

---

## 1. The Problem

`e2e-local.mjs` deletes all test user data after every scenario run via `testHelpers.deleteTestUser(admin, user)` in the `finally` block at line 424. This cascade-deletes:
- The user record
- The business record
- All `ceo_plans` rows
- All `weekly_actions` rows
- All `weekly_reviews` rows

When a scenario fails at W4, the first 3 weeks of completed plans — which contain the full action history that caused the failure — are gone. CEO_PLAN_TRACE output is `console.error` only (not persisted to DB), so without server log capture, the failure cause is irrecoverable post-run.

---

## 2. The Fix: `QA_PRESERVE_CHECKPOINT`

**File modified:** `artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs`

**Change applied in v2.6:**

```javascript
// Before
await testHelpers.deleteTestUser(admin, user);

// After
if (process.env.QA_PRESERVE_CHECKPOINT) {
  console.log(scenario.key, "QA_PRESERVE_CHECKPOINT: datos del usuario conservados para diagnóstico. "
    + "Ejecutar limpieza manual con QA_CLEANUP_USER=" + user.id + " cuando ya no sea necesario.");
} else {
  await testHelpers.deleteTestUser(admin, user);
}
```

The env var is printed to stdout along with the user ID, enabling targeted SQL cleanup when diagnosis is complete.

---

## 3. Usage

### Run with checkpoint preservation:

```bash
# Preserve data for post-mortem (no deleteTestUser)
QA_PRESERVE_CHECKPOINT=1 QA_SCENARIOS=cafe-horizonte,nova-studio \
  node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
```

The E2E script will log the user ID after each scenario:
```
cafe-horizonte QA_PRESERVE_CHECKPOINT: datos del usuario conservados para diagnóstico.
  Ejecutar limpieza manual con QA_CLEANUP_USER=<uuid> cuando ya no sea necesario.
```

### Query state after failure:

```sql
-- Find the failing plan (status = 'failed') for the preserved user
SELECT p.id, p.week_number, p.status, p.error_code, p.error_message
FROM ceo_plans p
JOIN businesses b ON b.id = p.business_id
JOIN auth.users u ON u.id = b.owner_id
WHERE u.email LIKE '%reliability-cafe-horizonte%'
ORDER BY p.week_number;

-- Check action history up to the failing week
SELECT wa.sequence, wa.action, wa.execution_mode, wa.role_recommendation,
       wa.strategy->>'work_key' AS work_key,
       wa.strategy->>'intent' AS intent,
       wa.strategy->>'progression' AS progression
FROM weekly_actions wa
JOIN ceo_plans p ON p.id = wa.ceo_plan_id
JOIN businesses b ON b.id = p.business_id
JOIN auth.users u ON u.id = b.owner_id
WHERE u.email LIKE '%reliability-cafe-horizonte%'
ORDER BY p.week_number, wa.sequence;
```

### Manual cleanup:

```sql
-- After diagnosis is complete
-- Replace <user_id> with the UUID logged by the script
DELETE FROM auth.users WHERE id = '<user_id>';
```

Or using Supabase CLI:

```bash
npx supabase db query --local \
  "DELETE FROM auth.users WHERE id = '<user_id>';"
```

---

## 4. Combined Workflow for Diagnosis

```bash
# Step 1: Start dev server with trace capture
CEO_PLAN_API_BUDGET_FILE=/tmp/ceo-budget.json \
  npm run dev 2> /tmp/ceo-trace-$(date +%s).log &

# Step 2: Run failing scenarios with checkpoint preservation
QA_PRESERVE_CHECKPOINT=1 QA_SCENARIOS=cafe-horizonte,nova-studio \
  node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs

# Step 3: Extract CEO_PLAN_TRACE entries
grep CEO_PLAN_TRACE /tmp/ceo-trace-*.log | \
  sed 's/.*CEO_PLAN_TRACE //' | jq .

# Step 4: Query Supabase for action history of failing user
npx supabase db query --local "SELECT ..."

# Step 5: Identify exact error from trace + action history
# Step 6: Apply targeted fix and re-run

# Step 7: Clean up preserved user
npx supabase db query --local "DELETE FROM auth.users WHERE id = '<uuid>';"
```

---

## 5. Limitations

- `QA_PRESERVE_CHECKPOINT` only skips user deletion. If the scenario completes successfully (all 4 weeks pass), data is still preserved — cleanup is always manual when the env var is set.
- Multiple failed runs with `QA_PRESERVE_CHECKPOINT` will accumulate users. The logged user IDs must be tracked and cleaned up manually.
- CEO_PLAN_TRACE is still `console.error` only. The fix requires both: (1) server log capture AND (2) checkpoint preservation to correlate trace entries with the action history that caused them.
