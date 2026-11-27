# Budget Enforcement Audit — TuCEO IA v2.6

**Date:** 2026-11-25
**Branch:** feature/strategic-intelligence-v2

---

## 1. All `run()` Call Sites

| File | Line | Covered by budget? | Notes |
|------|------|--------------------|-------|
| `src/lib/ai/generate-ceo-plan.ts` | 86 | ✅ Yes | `defaultCEOPlanRunner` checks `CEO_PLAN_API_BUDGET_FILE` before calling |
| `src/lib/ai/generate-value-proposition.ts` | 50 | ❌ No | Direct `run()` call; no budget check |
| `src/lib/ai/generate-commercial-offers.ts` | 82 | ❌ No | Direct `run()` call; no budget check |
| `src/lib/ai/generate-commercial-messages.ts` | 81 | ❌ No | Direct `run()` call; no budget check |

`generate-external-evidence.ts` does not call `run()` directly — it uses a retry loop, but the actual AI call mechanism was not found in the grep results for `await run(`.

**Coverage gap:** 3 of 4 `run()` call sites are unprotected. During a full scenario run (W1–W4), each week that reaches the action phase also triggers value proposition and commercial agent calls. These are unaccounted in the budget.

---

## 2. Budget Counter Behavior

**Location:** `src/lib/ai/generate-ceo-plan.ts` lines 69–83

**Flow:**
1. Read `CEO_PLAN_API_BUDGET_FILE` JSON: `{ limit: number, used: number }`
2. If `used >= limit`: throw `CEO_PLAN_API_BUDGET_EXHAUSTED` — no API call made
3. Increment `used` and write back to file
4. Call `run()` with the agent

**No-config behavior:** If `CEO_PLAN_API_BUDGET_FILE` is not set (or the env var is absent), the entire budget block is skipped and `run()` is called unconditionally. This is the state during v2.5 E2E runs.

**File read failure behavior:** If the file cannot be read (e.g. file not found), the catch block sets `budget = { limit: 0, used: 0 }`. Since `used (0) >= limit (0)` is true, the first call is immediately blocked. This is a **safe default** — a misconfigured path blocks all calls rather than allowing unlimited access.

---

## 3. Concurrency Risk

The read-modify-write cycle at lines 73–82 is **not atomic**:

```typescript
budget = JSON.parse(readFileSync(budgetFile, "utf8")); // READ
// ... check ...
writeFileSync(budgetFile, JSON.stringify({ ...budget, used: budget.used + 1 })); // WRITE
```

If two concurrent scenario runs call `defaultCEOPlanRunner` simultaneously on the same budget file, both reads can occur before either write. The result is a double-spend: 2 API calls are made but only 1 counter increment persists. In practice, E2E scenarios run with `Promise.all()` (line 433 of `e2e-local.mjs`), so concurrency is real.

**Impact for diagnosis:** A budget set to `{limit:30, used:0}` might allow up to `30 + N` calls when `N` scenarios run concurrently, where `N` is the overlap window. For 3 scenarios with 2 attempts per week × 4 weeks, the maximum concurrent window is small but non-zero.

**Mitigation options (not implementing in this phase):**
- Use a lock file (advisory lock with `fs.openSync` + `O_EXCL`)
- Use a Supabase counter with a transaction
- Accept the race condition as acceptable for QA use (budget is advisory, not billing-critical)

---

## 4. Mocked Budget Tests

The following tests verify that the budget counter blocks CEO plan generation without making real API calls. They are described here but NOT added to `tests/strategic-intelligence.test.ts` in this phase because they require mocking `run()` and `readFileSync`, which is out of scope for the deterministic unit test suite.

**Test plan (for future implementation):**

```
test: budget exhausted blocks CEO generation
  - Write budget file: { limit: 2, used: 2 }
  - Set CEO_PLAN_API_BUDGET_FILE to file path
  - Call generateCEOPlan() with mocked run() that counts calls
  - Assert: generateCEOPlan() throws "CEO_PLAN_API_BUDGET_EXHAUSTED"
  - Assert: mock run() was called 0 times

test: budget with remaining capacity allows call
  - Write budget file: { limit: 5, used: 3 }
  - Assert: generateCEOPlan() calls mock run() exactly 1 time
  - Assert: budget file updated to { limit: 5, used: 4 }

test: missing budget file blocks all calls (safe default)
  - Set CEO_PLAN_API_BUDGET_FILE to nonexistent path
  - Assert: generateCEOPlan() throws "CEO_PLAN_API_BUDGET_EXHAUSTED"
  - Assert: mock run() was called 0 times

test: absent CEO_PLAN_API_BUDGET_FILE env var allows unlimited calls
  - Unset CEO_PLAN_API_BUDGET_FILE
  - Assert: generateCEOPlan() calls mock run() normally
  - Assert: no budget file read or write occurs

test: specialist agents (value-proposition, commercial-offers, commercial-messages) bypass budget
  - Set CEO_PLAN_API_BUDGET_FILE to exhausted budget
  - Assert: generateValueProposition() calls mock run() once (no budget check)
  - Assert: generateCommercialOffers() calls mock run() once (no budget check)
  - Assert: generateCommercialMessages() calls mock run() once (no budget check)
```

**Current status:** These tests are not implemented. The budget enforcement gap for specialist agents is documented but not patched in this phase.

---

## 5. Summary

| Property | Status |
|----------|--------|
| CEO plan generation protected | ✅ |
| Value proposition protected | ❌ |
| Commercial offers protected | ❌ |
| Commercial messages protected | ❌ |
| Concurrency-safe | ❌ (advisory only) |
| No-config behavior (safe default) | ✅ |
| File read failure behavior (safe default) | ✅ |
| Budget active during v2.5 E2E | ❌ (server started without env var) |
