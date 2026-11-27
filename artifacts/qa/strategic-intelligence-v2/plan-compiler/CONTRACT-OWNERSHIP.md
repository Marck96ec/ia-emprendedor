# Contract Ownership — TuCEO IA v2.7

**Date:** 2026-11-26
**Branch:** feature/strategic-intelligence-v2

---

## Full Property Inventory

Based on `GENERATOR-ARCHITECTURE-REVIEW.md` and code analysis of `generate-ceo-plan.ts`.

### Top-Level Plan Fields

| Property | Current Owner | Recommended Owner | Evidence |
|----------|--------------|-------------------|----------|
| `diagnosis` (legacy text) | Both | TypeScript | Line 605: always set to `strategic_diagnosis.diagnosis.summary` |
| `executive_summary` | AI | AI | Narrative summary, requires business judgment |
| `strategic_continuity` | AI | AI | Cannot be derived deterministically |
| `time_allocation.available_hours` | Both (AI sets, TS overwrites) | TypeScript only | Line 599: `input.diagnostic.ownerHoursPerWeek` — always overwritten |
| `time_allocation.allocated_hours` | Both (AI sets, TS overwrites) | TypeScript only | Lines 587–590: sum of `estimated_hours` — always recomputed |
| `time_allocation.reserved_hours` | Both (AI sets, TS overwrites) | TypeScript only | Lines 601–603: available minus allocated — always recomputed |
| `priorities[].title` | AI | AI | Business prioritization requires reasoning |
| `priorities[].reason` | AI | AI | Business reasoning required |
| `priorities[].expected_impact` | AI | AI | Business reasoning required |

### Strategic Diagnosis Fields

| Property | Current Owner | Recommended Owner | Evidence |
|----------|--------------|-------------------|----------|
| `strategic_diagnosis.business_understanding` | AI | AI | Cannot be derived |
| `strategic_diagnosis.diagnosis.*` | AI | AI | Cannot be derived |
| `strategic_diagnosis.bottleneck.*` | AI | AI | Cannot be derived |
| `strategic_diagnosis.evidence[]` | AI | AI | Cannot be derived |
| `strategic_diagnosis.confidence` | Both (AI sets, TS adjusts) | Both — keep AI, verify | Lines 646–648: downgrade if `high` with `>1 unknowns` — intentional repair, not full ownership |
| `strategic_diagnosis.unknowns[]` | AI | AI | Cannot be derived |
| `strategic_diagnosis.alternative_hypothesis` | AI | AI | Cannot be derived |
| `strategic_diagnosis.critical_decision.*` | AI | AI | Cannot be derived |
| `strategic_diagnosis.decision_hypothesis.*` | AI | AI | Cannot be derived |

### Weekly Plan Action Fields

| Property | Current Owner | Recommended Owner | Evidence |
|----------|--------------|-------------------|----------|
| `weekly_plan[].action` | AI | AI | Natural language, cannot be derived |
| `weekly_plan[].objective` | AI | AI | Natural language, cannot be derived |
| `weekly_plan[].reason` | AI | AI | Business reasoning required |
| `weekly_plan[].success_metric` | AI | AI | Business reasoning required |
| `weekly_plan[].expected_result` | AI | AI | Business reasoning required |
| `weekly_plan[].role_recommendation` | AI | AI | Delegation reasoning required |
| `weekly_plan[].role_reason` | AI | AI | Delegation reasoning required |
| `weekly_plan[].estimated_hours` | AI | AI | Effort estimation requires business context |
| `weekly_plan[].execution_mode` | AI | Both (derivable but risky) | Derivable from `action_type`, but `action_type` itself is AI-generated |
| `weekly_plan[].action_type` | AI | AI | Requires domain reasoning |
| `weekly_plan[].capture_schema` | AI | AI | Domain-specific form design required |

### Strategy Fields

| Property | Current Owner | Recommended Owner | Evidence |
|----------|--------------|-------------------|----------|
| `weekly_plan[].strategy.work_key` | Both (AI sets, TS normalizes via `inferWorkKey`) | Both — keep AI, verify | AI may be more accurate for ambiguous titles; `inferWorkKey` is a fallback |
| `weekly_plan[].strategy.intent` | Both (AI sets, TS normalizes for specific types) | Both — keep AI, verify | `inferredIntent` overrides only for `ai_assisted`/`build` patterns |
| `weekly_plan[].strategy.requires` | AI | AI | Resource dependency reasoning required |
| `weekly_plan[].strategy.deliverable` | Both (AI sets, TS normalizes via `commercialDeliverableFor`) | Both — keep AI, verify | `commercialDeliverableFor` corrects misclassifications but AI value is the starting point |
| `weekly_plan[].strategy.progression` | AI | AI | Historical progression reasoning required |
| `weekly_plan[].strategy.prior_action_id` | AI | AI | Historical reference requires reasoning |
| `weekly_plan[].strategy.prior_barrier` | AI | AI | Blocking diagnosis requires reasoning |
| `weekly_plan[].strategy.new_evidence_id` | AI | AI | Evidence reference requires reasoning |
| `weekly_plan[].strategy.period_week` | AI | AI | Recurrence period requires reasoning |
| `weekly_plan[].strategy.justification` | AI | AI | Strategic justification requires reasoning |
| `weekly_plan[].strategy.depends_on_sequence` | Both (AI sets, TS repairs in `repairPlanMetadata`) | Both — keep AI, verify | Lines 660–669: prerequisite-to-sequence promotion is a repair, not full ownership |
| `weekly_plan[].strategy.completed_prerequisite_id` | AI | AI | Historical reference requires reasoning |

---

## Repair vs. Override

The table above distinguishes two patterns:

**Override** (`time_allocation.*`, `diagnosis`): TypeScript ignores the AI value entirely and replaces it with a computed value. The AI generating these fields is wasteful.

**Repair** (`confidence`, `work_key`, `deliverable`, `intent`, `depends_on_sequence`): TypeScript corrects specific error patterns while preserving the AI's judgment in other cases. The AI generates meaningful values that are verified and adjusted, not ignored.

Override candidates are the highest-priority targets for Phase 2 extraction. Repair fields should be kept as-is unless the repair frequency (`repairsApplied` in CEO_PLAN_TRACE) indicates systematic AI failures.
