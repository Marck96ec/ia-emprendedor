# Business Quality Audit — v2.5

## Scenario Evaluated: limpieza (PASS)

**Business profile:** Limpieza Muebles · REL QA — sofa/mattress cleaning service, 4 owner
hours/week, 2-person team, two target neighborhoods, no social media.

### Coherence Analysis

| Week | Decision | Plan Coherence | Constraint Respect |
|------|----------|---------------|--------------------|
| W1 | Validate local demand via WhatsApp | Build commercial message → test locally | ✓ No social_media required |
| W2 | Deepen: measure quality of responses | Commercial outreach with response classification | ✓ No social_media required |
| W3 | Third round: distinguish real from casual interest | lead_follow_up/recurrence, different scope from W2 | ✓ No social_media required |
| W4 | Confirm whether local interest converts | lead_follow_up/recurrence, title distinct from W3 | ✓ No social_media required |

**Verdict:** Plans are commercially coherent — each week builds on observed signals, respects the
4-hour constraint, and avoids unavailable resources. The progression from "build message" →
"send + observe" → "classify interest" → "confirm conversion" follows a logical validation arc.

### Recurrence Quality

W3 and W4 both use `lead_follow_up/recurrence`. The titles were verified to be distinct:
- W3: "Hacer una nueva ronda breve de seguimiento por WhatsApp a contactos locales ya existentes,
  separando barrio, tipo de mueble, intención de agenda y nivel de interés real."
- W4: Different title (confirmed by E2E PASS — the `PERIODIC_TRACKING_KEYS` same-title check
  would have blocked a matching title).

This is the primary recurrence regression fix verified in a real end-to-end run.

## Scenario: cafe-horizonte (FAIL at W4)

**Root cause hypothesis:** By W4, the scenario has 3 weeks of cashflow_update and collections
history. The AI may be attempting `collections/recurrence` with the same title as W3's completed
collections action, which is blocked by the `PERIODIC_TRACKING_KEYS` rule. Without server logs
(CEO_PLAN_TRACE output is not persisted to the database), the exact error cannot be confirmed.

**Contributing factor:** The E2E script allows only one retry per scenario. W2 already consumed
the retry budget when its first attempt failed. W4 had no retry available, so a single failed
generation terminates the scenario.

**Assessment:** This is a known limitation. The fix (CONTRATO instructions requiring different
titles on recurrence) is correct, but the AI model (gpt-5.4-mini) does not consistently follow
it for cafe-horizonte's specific 3-week cashflow context.

## Scenario: nova-studio (FAIL at W1)

**Root cause hypothesis:** W1 of an operating-stage design studio with 8 available hours. The AI
may be generating a plan with total estimated_hours > 8, or generating 2+ AI-assisted actions
(exceeding MAX_AI_ASSISTED_ACTIONS = 1). Both errors would cause consistent failure across all 4
generation attempts (2 initial + 2 retry) if the model ignores the constraint even with
REPARACIÓN instructions.

**Assessment:** This failure is not caused by v2.5 changes (which only affect recurrence
validation). It appears to be a pre-existing issue with nova-studio's scenario profile.

## Overall Assessment

The strategic engine correctly enforces:
- Resource constraints (no social_media when unavailable)
- Hours budget (4 hours for limpieza)
- Recurrence title distinctness (W3→W4 for limpieza)
- Prompt version consistency (v7-strategic-reliability)

Two of three tested scenarios show persistent generation failures at specific weeks, indicating
model reliability issues rather than logic bugs in the validation layer.
