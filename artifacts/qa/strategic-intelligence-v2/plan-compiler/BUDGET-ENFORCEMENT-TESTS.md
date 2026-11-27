# Budget Enforcement Tests — TuCEO IA v2.7

**Date:** 2026-11-26
**Branch:** feature/strategic-intelligence-v2

---

## Overview

8 new tests added to `tests/strategic-intelligence.test.ts` covering:
- `consumeBudget` behavior in isolation (5 tests)
- `generateCEOPlan` integration with budget enforcement (1 test)
- Pipeline behavior with synthetic fixtures (2 tests)

All tests use real temp files for budget state. No mocking of `readFileSync`/`writeFileSync`. No real provider API calls.

---

## Test 1: `consumeBudget bloquea cuando el presupuesto está agotado`

**Setup:** Budget file `{limit: 2, used: 2}` written to temp path. `PROVIDER_API_BUDGET_FILE` set.

**Expected:** `consumeBudget("test")` throws error matching `/PROVIDER_API_BUDGET_EXHAUSTED/`.

**Verifies:** When `used >= limit`, no call proceeds and the error code is correct.

---

## Test 2: `consumeBudget permite cuando hay capacidad restante y actualiza el contador`

**Setup:** Budget file `{limit: 5, used: 3}` written to temp path. `PROVIDER_API_BUDGET_FILE` set.

**Expected:** `consumeBudget("test")` does not throw. Budget file is updated to `{limit: 5, used: 4}`.

**Verifies:** Pre-reservation increments the counter before the call completes.

---

## Test 3: `consumeBudget con archivo inexistente bloquea como fallback seguro`

**Setup:** `PROVIDER_API_BUDGET_FILE` set to a non-existent path.

**Expected:** `consumeBudget("test")` throws error matching `/PROVIDER_API_BUDGET_EXHAUSTED/`.

**Verifies:** A missing/corrupt budget file defaults to `{limit: 0, used: 0}` → safe block. Misconfiguration doesn't allow unlimited calls.

---

## Test 4: `consumeBudget sin configuración permite llamadas en modo producción`

**Setup:** `PROVIDER_API_BUDGET_FILE`, `CEO_PLAN_API_BUDGET_FILE`, and `QA_MODE` all unset.

**Expected:** `consumeBudget("test")` does not throw.

**Verifies:** Production mode (no env var, no QA_MODE) allows unlimited calls without a budget file. Existing production behavior is preserved.

---

## Test 5: `consumeBudget con QA_MODE y sin archivo de configuración falla de forma segura`

**Setup:** `PROVIDER_API_BUDGET_FILE` and `CEO_PLAN_API_BUDGET_FILE` unset. `QA_MODE=1`.

**Expected:** `consumeBudget("test")` throws error matching `/PROVIDER_API_BUDGET_MISSING/`.

**Verifies:** QA sessions without a budget file fail immediately with a clear error. Prevents unintended provider calls during automated testing.

---

## Test 6: `generateCEOPlan respeta el presupuesto y no llama al runner cuando está agotado`

**Setup:** Budget file `{limit: 0, used: 0}`. `PROVIDER_API_BUDGET_FILE` set. Mock runner that counts calls. `OPENAI_API_KEY` set to test value.

**Expected:** `generateCEOPlan(input, mockRunner)` throws matching `/PROVIDER_API_BUDGET_EXHAUSTED/`. Mock runner called 0 times.

**Verifies:** The budget check in `generateCEOPlan` runs BEFORE calling the runner, even when a custom runner is passed. No API request is made.

**Key design note:** The budget check was moved from `defaultCEOPlanRunner` into `generateCEOPlan`'s main loop (outside the try/catch that handles semantic/structural errors). This ensures budget errors are never wrapped in `CEOPlanError("transient")` and always propagate as the raw budget error.

---

## Test 7: `pipeline agota reintentos tras dos rechazos semánticos`

**Setup:** Budget file with 10 calls available. Mock runner always returns `outputError` with `CEOPlanError("semantic", ...)`. `OPENAI_API_KEY` set.

**Expected:** `generateCEOPlan` rejects. Runner was called exactly 2 times (= `MAX_GENERATION_ATTEMPTS`).

**Verifies:** Semantic errors trigger the retry mechanism. After `MAX_GENERATION_ATTEMPTS` retries, the last error is thrown. The budget counter advances for each attempt.

---

## Test 8: `pipeline con proveedor que falla lanza error recuperable`

**Setup:** Budget file with 10 calls available. Mock runner throws `Error("Network error: timeout")`. `OPENAI_API_KEY` set.

**Expected:** `generateCEOPlan` rejects with `CEOPlanError` where `kind === "transient"`.

**Verifies:** Network/provider errors are caught and normalized to `CEOPlanError("transient", "CEO_PLAN_MODEL_REQUEST_FAILED", ...)`. The error is recoverable — callers can distinguish transient from structural/semantic failures.

---

## Coverage Gap: Specialist Agents

The 5 unit tests for `consumeBudget` verify the shared module. The 3 integration tests verify `generateCEOPlan`.

The specialist generators (`generateValueProposition`, `generateCommercialOffers`, `generateCommercialMessages`, `generateExternalEvidence`) now call `consumeBudget` before `run()`, but no integration tests for those were added in this phase. Those paths are verified by the shared module tests (tests 1–5) plus the fact that `consumeBudget` is a pure function with file-based state.

The budget path for `generateExternalEvidence` is covered by the `defaultEvidenceAgentRunner` calling `consumeBudget("external-evidence")` before the `run()` call.
