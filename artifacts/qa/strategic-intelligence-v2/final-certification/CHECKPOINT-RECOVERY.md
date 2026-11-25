# Checkpoint Recovery Assessment — v2.5

## Objective

Evaluate whether existing checkpoints in the local Supabase instance allow resuming limpieza
(W4) and cafe-horizonte (W4) from a known-good state, avoiding full E2E re-runs.

## Query Executed

```sql
SELECT b.name, cp.week_number, cp.status, wa.status AS action_status,
       COUNT(wa.id) AS action_count
FROM ceo_plans cp
JOIN businesses b ON b.id = cp.business_id
LEFT JOIN weekly_actions wa ON wa.ceo_plan_id = cp.id
WHERE b.name LIKE '%REL QA%'
GROUP BY b.name, cp.week_number, cp.status, wa.status
ORDER BY b.name, cp.week_number;
```

Via `npx supabase db query --local`.

## Finding

**No viable W4 checkpoints found for limpieza or cafe-horizonte.**

The E2E script's `finally` block calls `testHelpers.deleteTestUser(admin, user)` after every
scenario run — both successes and failures. This cascade-deletes all associated businesses,
diagnostics, plans, and actions. The local instance retains no QA scenario data between runs.

The only remaining business in the local instance at the time of this audit was
"NovaSupply Ecuador S.A." which reached week 4 but had no completed review for that week,
making it unusable as a recovery point for the target scenarios.

## Decision

Checkpoint recovery is **not technically viable** for this release. Each E2E run is fully
self-contained. The spec item "Checkpoint recovery for limpieza and cafe-horizonte W4 if
technically viable" is closed as not viable.

## Impact

None. The E2E script already handles retries internally (one retry per scenario). Checkpoint
recovery would require schema changes (persisting test user IDs between runs), which is out of
scope for this certification phase.
