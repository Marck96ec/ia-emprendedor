# Generator Architecture Review — TuCEO IA v2.6

**Date:** 2026-11-25
**Branch:** feature/strategic-intelligence-v2
**Files reviewed:** `generate-ceo-plan.ts`, `ceo-agent.ts`, `strategic-action.ts`, `strategic-context.ts`

---

## 1. Contract Property Ownership

### Properties AI must reason about (cannot be derived deterministically):

| Property | Why AI reasoning is required |
|----------|------------------------------|
| `strategic_diagnosis.*` | Synthesis of business context into diagnosis, bottleneck, evidence, confidence, hypothesis |
| `strategic_continuity` | Narrative thread connecting last week's decision to this week's plan |
| `weekly_plan[].action` | The natural-language description of what to do |
| `weekly_plan[].objective` | Why this action advances the business goal |
| `weekly_plan[].reason` | Strategic justification for including this action |
| `weekly_plan[].success_metric` | Concrete measurable outcome |
| `weekly_plan[].expected_result` | What completing this action produces |
| `weekly_plan[].strategy.justification` | Why this progression is correct given history |
| `weekly_plan[].strategy.prior_barrier` | Diagnosis of what blocked the prior pending action |
| `weekly_plan[].capture_schema.fields[]` | Form fields to capture execution output — requires domain reasoning |
| `priorities[].title`, `.reason`, `.expected_impact` | Business prioritization narrative |
| `strategic_diagnosis.evidence[].interpretation` | Connecting observed facts to strategic meaning |

### Properties TypeScript could derive (or validate without AI):

| Property | Why it can be derived |
|----------|----------------------|
| `time_allocation.available_hours` | Directly from `diagnostic.ownerHoursPerWeek` — currently overwritten post-generation at line 596 |
| `time_allocation.allocated_hours` | Sum of `weekly_plan[].estimated_hours` — calculated at line 587 |
| `time_allocation.reserved_hours` | `available_hours - allocated_hours` — calculated at line 601 |
| `weekly_plan[].strategy.work_key` | `inferWorkKey(action)` — deterministic from title |
| `weekly_plan[].strategy.intent` | `inferredIntent(action)` — partially deterministic from title prefix |
| `weekly_plan[].strategy.deliverable` | `commercialDeliverableFor(action)` — deterministic from title pattern |
| `weekly_plan[].execution_mode` | Could be inferred from `action_type` (ai_assisted ↔ value_proposition/commercial_messages) |
| `strategic_diagnosis.confidence` | Downgraded post-generation if `unknowns.length > 1` (`repairPlanMetadata` line 647) |
| `weekly_plan[].strategy.depends_on_sequence` | Computed from prerequisite cross-reference in `repairPlanMetadata` lines 663–669 |

---

## 2. `repairPlanMetadata` — Post-Generation Corrections

This function (`generate-ceo-plan.ts` lines 645–675) silently corrects AI output before validation. It currently handles:

1. **Confidence reduction**: `high` confidence with `>1 unknowns` → downgraded to `medium`
2. **Strategy normalization**: Calls `normalizeActionStrategy()` per action — fixes work_key, deliverable, intent
3. **Prerequisite-to-sequence promotion**: If `completed_prerequisite_id` points to a pending action in the current plan, moves it to `depends_on_sequence`

**Implicit contract violations this masks:**
- The AI is asked to set `strategy.work_key` and `strategy.deliverable`, but these are largely deterministic. The repair silently corrects AI mistakes, meaning the CONTRATO instructions may be insufficient if the AI consistently gets them wrong.
- The number of repairs applied is logged in `repairsApplied` in CEO_PLAN_TRACE. This is valuable signal: high `repairsApplied` counts in a failing scenario would indicate the AI is structurally out of alignment.

---

## 3. `ceo-agent.ts` — Schema Observations

### `EvidenceSourceFieldSchema` (lines 27–72)
An explicit enum of allowed evidence sources. Forces the AI to cite only fields that exist in the input. This is a good constraint but it means the AI cannot cite `strategic_context.*` fields (assets, constraints, memory records) as evidence sources — only `previousWeek.*` and `businessKnowledge.*` are listed.

### `WeeklyPlanItemSchema` (lines 139–154)
- `execution_mode` defaults to `"manual"` — this is the right safe default
- `strategy` is `optional()` on the MODEL schema but required on the validated `ActionStrategySchema`. This creates a gap: if the model omits `strategy`, the structural parse succeeds but business rules validation fails with `strategy` missing.

### `ActionStrategyModelSchema` vs `ActionStrategySchema`
Two parallel schemas exist: a "model" schema (what the AI returns, more permissive) and the validated schema (stricter). The intent is to allow AI to omit optional fields and have them default-filled. The risk is drift: changes to `ActionStrategySchema` may not be reflected in `ActionStrategyModelSchema`, causing systematic "structural" errors that look like AI failures but are actually schema version mismatches.

---

## 4. `strategic-context.ts` — Context Assembly

`buildStrategicContext()` assembles:
- `resources`: Available/unavailable operational resources from `business_memory`
- `history`: All historical actions (passed through with result truncated to 420 chars)
- `recentEvidence`: Latest 24 evidence records
- `reusableOffer`: Value proposition asset or prior completed offer action
- `memory`: Up to 10 `fact` and 10 `learning` memory records
- `activeConstraints`, `activeAssets`: Non-inferred constraints and assets
- `feedback`: Active feedback records

**Potential issue for cafe-horizonte/nova-studio:** The `history` array grows with each week. By W4 (cafe-horizonte), history contains 3 weeks × (3–5 actions/week) ≈ 9–15 actions. The CONTRATO prompt receives all of them, requiring the AI to correctly classify each for recurrence/progression. If the AI misclassifies a `collections` action as `progression: "new"` without a different title, `validateProgression` returns an error. This is the most likely cause of the W4 failure.

---

## 5. Duplicated Responsibilities

| Responsibility | Location 1 | Location 2 | Risk |
|---------------|------------|------------|------|
| `work_key` derivation | AI sets in strategy | `inferWorkKey(action)` overrides in `normalizeActionStrategy` | AI value is ignored unless `inferWorkKey` returns `"other"` |
| `deliverable` selection | AI sets in strategy | `commercialDeliverableFor()` overrides | AI value may be corrected silently |
| `intent` inference | AI sets in strategy | `inferredIntent(action)` overrides for ai_assisted/build | AI value may be overridden |
| `time_allocation` computation | AI generates the whole object | Overwritten at lines 596–603 | AI-generated available_hours is ignored |

---

## 6. No Architecture Changes Required

This review is diagnostic only. The findings above explain the repair count signal (look for `repairsApplied` in CEO_PLAN_TRACE) but do not indicate architectural changes are needed in this phase. The repairs are designed behavior, not bugs.
