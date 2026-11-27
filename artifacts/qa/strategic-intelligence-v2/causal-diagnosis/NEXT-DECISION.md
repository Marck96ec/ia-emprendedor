# Next Decision — TuCEO IA v2.6

**Date:** 2026-11-25
**Branch:** feature/strategic-intelligence-v2

---

## What This Phase Established

v2.6 is a diagnostic infrastructure phase. No new engine logic was changed. The goal was to build the tooling needed to identify the exact error codes behind the two E2E failures.

---

## Confirmed (No Provider Calls Required)

| Finding | Evidence |
|---------|----------|
| Budget counter only protects CEO plan generation — 3 specialist agents bypass it | Grep of all `await run(` call sites in `src/lib/ai/*.ts` |
| `deleteTestUser` in `finally` destroys all evidence after a failed run | `e2e-local.mjs` lines 421–425 |
| CEO_PLAN_TRACE is `console.error` only — not persisted to DB | `generate-ceo-plan.ts` line 40 |
| Budget env var was NOT active during v2.5 E2E (server started without it) | `API-USAGE.json` from final-certification |
| `sameWork` threshold (0.67 word overlap) can be evaded by complete synonym substitution | Word overlap calculation at `strategic-action.ts` lines 120–123 |
| `repairPlanMetadata` overrides AI-set fields (`work_key`, `intent`, `deliverable`) silently | `generate-ceo-plan.ts` lines 645–675 |
| `time_allocation.{available,allocated,reserved}_hours` are computed post-AI and overwritten | `generate-ceo-plan.ts` lines 587–603 |

---

## Hypotheses (Require Provider Calls to Confirm)

### Café Horizonte W4 Failure

**Most likely cause:** The AI generates a `collections` or `commercial_outreach` action with the same title as a prior completed action in W1–W3. With 3 weeks of `cashflow_update` + `collections` history, the CONTRATO recurrence instructions must guide the AI to:
- Use a different title for `collections` (required since v2.5)
- Use `progression: "recurrence"` with `period_week: 4`

**Second hypothesis:** `strategic_continuity` missing or invalid on attempt 2. By W4 the previous week data includes a full strategic diagnosis — if attempt 1 is rejected and `strategic_continuity` is in `previousIssues`, the repair prompt may not give the AI enough to fix it.

**To confirm:** Run W4 with `QA_PRESERVE_CHECKPOINT=1` and server stderr piped to a log file. CEO_PLAN_TRACE `rejectedFields` on the failing attempt will identify the exact path.

### Nova Studio W1 Failure

**Most likely cause:** The AI generates a plan exceeding `ownerHoursPerWeek: 8`, triggering `capacity` validation error. Nova Studio is an operating-stage design studio — the AI may assign more hours for a mature business.

**Second hypothesis:** More than 1 `execution_mode: "ai_assisted"` action in the plan, triggering the "máximo una acción asistida" rule. The design studio context (creative work) may encourage the AI to propose multiple AI-assisted deliverables.

**To confirm:** Same approach — capture CEO_PLAN_TRACE `rejectedFields` for W1 attempt 1. If `rejectedFields` contains `estimated_hours.*` or `time_allocation`, it's the capacity hypothesis. If it contains `execution_mode.*`, it's the max-ai-assisted hypothesis.

---

## Infrastructure Now in Place

| Tool | Status |
|------|--------|
| `QA_PRESERVE_CHECKPOINT` env var skips user deletion | ✅ Implemented (`e2e-local.mjs`) |
| CEO_PLAN_TRACE field documentation | ✅ Done (`INFRASTRUCTURE-DIAGNOSIS.md`) |
| Server stderr capture command for Windows | ✅ Documented |
| Budget counter with correct env var | ✅ Documented (not activated in prior runs) |
| 4 semantic recurrence tests | ✅ Added (196 tests total, 192 pass) |

---

## What to Do Next (Ordered)

1. **Start dev server with stderr capture + budget enforcement:**
   ```powershell
   echo '{"limit":10,"used":0}' > ceo-budget.json
   $env:CEO_PLAN_API_BUDGET_FILE = "$PWD\ceo-budget.json"
   Start-Process npm -ArgumentList "run","dev" -RedirectStandardError "ceo-trace.log" -NoNewWindow
   ```

2. **Run failing scenarios with checkpoint preservation:**
   ```bash
   QA_PRESERVE_CHECKPOINT=1 QA_SCENARIOS=cafe-horizonte,nova-studio \
     node artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs
   ```

3. **Extract the exact error:**
   ```bash
   grep CEO_PLAN_TRACE ceo-trace.log | sed 's/.*CEO_PLAN_TRACE //' | jq 'select(.result=="rejected")'
   ```
   Look for `rejectedFields` to identify the exact schema path.

4. **Apply a targeted fix** (only after confirming the exact error):
   - If `estimated_hours.*`: Strengthen CONTRATO hours constraint for operating-stage businesses
   - If `execution_mode.*` / "máximo una acción asistida": Strengthen the single-AI-assisted rule in CONTRATO
   - If `strategy.*` / `collections` same-title: CONTRATO already instructs different titles; may need stronger wording for W4 deep history

5. **Re-run both scenarios** and confirm they pass end-to-end.

6. **Run all 3 scenarios** (limpieza + cafe-horizonte + nova-studio) for a final clean pass.

7. **Merge to main** when all 3 pass.

---

## Decision Criteria for GO

| Criterion | Required |
|-----------|----------|
| All 196 tests pass | ✅ Current |
| Café Horizonte W1–W4 PASS | ❌ Pending |
| Nova Studio W1–W4 PASS | ❌ Pending |
| Limpieza W1–W4 PASS | ✅ Confirmed v2.5 |
| No new engine changes without evidence | ✅ This phase: no engine changes |
| No real API calls during diagnosis | ✅ This phase: no provider calls made |
