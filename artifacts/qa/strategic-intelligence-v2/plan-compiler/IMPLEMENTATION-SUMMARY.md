# Implementation Summary — TuCEO IA v2.7

**Date:** 2026-11-26
**Branch:** feature/strategic-intelligence-v2

---

## What Was Implemented

### 1. Shared Provider Budget (`src/lib/ai/provider-budget.ts`)

New module exporting `consumeBudget(caller: string): void`.

**Behavior:**
- Reads budget from `PROVIDER_API_BUDGET_FILE` env var, falls back to `CEO_PLAN_API_BUDGET_FILE` for backward compatibility
- When no env var is set and `QA_MODE=1`: throws `PROVIDER_API_BUDGET_MISSING` (safe failure — QA should always run with a budget)
- When no env var is set and NOT `QA_MODE`: returns without checking (production behavior — unlimited)
- When budget file is missing or corrupt: defaults to `{limit: 0, used: 0}` → blocks all calls (safe default)
- When `used >= limit`: throws `PROVIDER_API_BUDGET_EXHAUSTED`
- Pre-reserves budget (increments counter before the API call)
- Advisory lock via `O_EXCL` file creation with 5 retries, 20ms sleep between each (Atomics.wait — synchronous, blocks thread)
- Logs to stderr: `PROVIDER_BUDGET_LOG {caller, limit, used_after, remaining}` — no business content

### 2. Budget Coverage Extended to All Provider Entry Points

| File | Caller | Previously covered |
|------|--------|--------------------|
| `generate-ceo-plan.ts` | `ceo-plan` | ✅ (inline, now shared) |
| `generate-value-proposition.ts` | `value-proposition` | ❌ → ✅ |
| `generate-commercial-offers.ts` | `commercial-offers` | ❌ → ✅ |
| `generate-commercial-messages.ts` | `commercial-messages` | ❌ → ✅ |
| `generate-external-evidence.ts` | `external-evidence` | ❌ → ✅ |

The CEO plan budget check was moved from `defaultCEOPlanRunner` into `generateCEOPlan` itself (outside the semantic/structural try/catch) so that:
- Budget errors propagate as raw `Error` without being wrapped in `CEOPlanError("transient")`
- Even custom runners (e.g., test mocks) are budget-protected
- Budget is consumed once per attempt (consistent with one API call per attempt)

### 3. Backward Compatibility

- `CEO_PLAN_API_BUDGET_FILE` still works via fallback in `getBudgetFile()`
- Previous error message prefix `CEO_PLAN_API_BUDGET_EXHAUSTED` changed to `PROVIDER_API_BUDGET_EXHAUSTED` — no external code is known to parse the message text

### 4. Plan Compiler Phase 1 — `time_allocation` Hours Extracted to TypeScript

Changes to `src/lib/ai/ceo-agent.ts`:
- Added `TimeAllocationModelSchema` with `available_hours`, `allocated_hours`, `reserved_hours` as `z.number().nullable()` — AI sends `null`
- `CEOPlanModelSchema` uses `TimeAllocationModelSchema` instead of `TimeAllocationSchema`
- Agent instructions updated: model is told these three fields are computed by TypeScript and must be sent as `null`

Changes to `src/lib/ai/generate-ceo-plan.ts`:
- `normalizeCEOPlanModelOutput` extracts `time_allocation` from model output, substituting `0` for `null` before passing to `CEOPlanSchema.safeParse`
- Final `time_allocation` computation at lines 587–603 always overwrites with `ownerHoursPerWeek` and `sum(estimated_hours)` — these are the authoritative TypeScript-computed values
- Model-generated values (even if the model sends numbers instead of null) are always discarded

### 5. Fixture-Based Pipeline Tests (11 new tests total)

Added to `tests/strategic-intelligence.test.ts`:
- 5 budget enforcement tests (using real temp files, no mocking)
- 1 test verifying `generateCEOPlan` with an exhausted budget never calls the runner
- 1 test verifying that 2 semantic rejections cause 2 runner calls then exhaustion
- 1 test verifying transient provider failures produce a recoverable error
- 1 Plan Compiler test: model returns `available_hours: 999`, TypeScript overwrites with `ownerHoursPerWeek=10`; allocated=3, reserved=7
- 1 budget validation test: corrupt budget values (negative, NaN) default to `{limit:0, used:0}` → blocks call
- 1 lock contention test: pre-existing lock file causes `PROVIDER_API_BUDGET_LOCK_FAILED` after 5 retries

**Test results:** 207 total, 203 pass, 4 skipped (Supabase), 0 fail.

### 6. E2E Checkpoint Resume (`QA_START_WEEK`)

Added to `artifacts/qa/strategic-intelligence-v2/reliability/e2e-local.mjs`:

- `QA_START_WEEK=N` env var: for weeks < N, checks if the plan already exists in the DB (status=ready). If it does, skips execution and review for that week and continues.
- Useful for resuming a scenario after a preserved checkpoint — if weeks 1–3 plans exist from a prior `QA_PRESERVE_CHECKPOINT` run, they are reused and only the failing week is re-executed.
- If the plan does NOT exist for a skipped week, the scenario runs that week normally.
- Checkpoint metadata added to result object: `scenarioKey`, `startWeek`, `resumedFrom`, `traceRef`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/ai/provider-budget.ts` | New — shared budget enforcement |
| `src/lib/ai/generate-ceo-plan.ts` | Replaced inline budget with `consumeBudget("ceo-plan")` |
| `src/lib/ai/generate-value-proposition.ts` | Added `consumeBudget("value-proposition")` |
| `src/lib/ai/generate-commercial-offers.ts` | Added `consumeBudget("commercial-offers")` |
| `src/lib/ai/generate-commercial-messages.ts` | Added `consumeBudget("commercial-messages")` |
| `src/lib/ai/generate-external-evidence.ts` | Added `consumeBudget("external-evidence")` to default runner |
| `src/lib/ai/ceo-agent.ts` | Added `TimeAllocationModelSchema`; nullable hour fields; updated agent instructions |
| `tests/strategic-intelligence.test.ts` | Added 11 new tests (5 budget, 3 pipeline, 1 Plan Compiler, 1 budget validation, 1 lock contention) |
| `artifacts/qa/.../e2e-local.mjs` | Added `QA_START_WEEK` support |

---

## What Was Not Changed

- No changes to AI prompt (CONTRATO)
- No changes to validation logic
- No changes to Supabase schema
- No changes to production API routes
- No changes to the CEO plan retry logic
- No real provider calls made during this phase
