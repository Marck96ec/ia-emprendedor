import { z } from "zod";

import type { StrategicDiagnosis } from "./ai/ceo-agent";
import { normalizeWorkText } from "./business-memory";

export const HypothesisStatusSchema = z.enum([
  "validated",
  "rejected",
  "inconclusive",
]);

export const DecisionHypothesisSchema = z.object({
  statement: z.string().trim().min(1),
  validation_signal: z.string().trim().min(1),
});

export const MetricObservationSchema = z.object({
  metric_name: z.string().trim().min(1),
  before: z.string().trim().min(1).nullable(),
  after: z.string().trim().min(1).nullable(),
});

export const DecisionLearningSchema = z.object({
  decision_question: z.string().trim().min(1),
  recommended_direction: z.string().trim().min(1),
  hypothesis: z.string().trim().min(1),
  target_metric: z.string().trim().min(1),
  expected_outcome: z.string().trim().min(1),
  observed_result: z.string().trim().min(5).max(2000),
  evidence: z.array(z.string().trim().min(5).max(2000)).min(1).max(1),
  learning: z.string().trim().min(5).max(2000),
  hypothesis_status: HypothesisStatusSchema,
  reported_hypothesis_status: HypothesisStatusSchema.optional(),
  evidence_assessment_note: z.string().optional(),
  metric_observation: MetricObservationSchema.optional(),
});

export type DecisionHypothesis = z.infer<typeof DecisionHypothesisSchema>;
export type DecisionLearning = z.infer<typeof DecisionLearningSchema>;

export function assessHypothesis({ reported, evidence, observedResult }: {
  reported: z.infer<typeof HypothesisStatusSchema>;
  evidence: string;
  observedResult: string;
}): { reported: typeof reported; evaluated: typeof reported; reason: string | null } {
  if (reported === "inconclusive") return { reported, evaluated: reported, reason: null };
  const evidenceText = normalizeWorkText(evidence);
  const resultText = normalizeWorkText(observedResult);
  const absence = /\b(?:sin|ninguna?|no (?:hubo|hay|existe|logramos|obtuvimos|tenemos|contamos con|disponemos de|se (?:obtuvo|obtuvieron|registro|registraron|pudo obtener)))\s+(?:(?:nueva|nuevos?|suficiente|todavia|aun|ninguna?|de)\s+){0,3}(?:evidencias?|resultados?|datos?|senales?)\b/;
  const onlyPreparation = /\b(?:solo|unicamente) (?:se )?(?:creo|preparo|redacto|diseno|definio|documento|elaboro|hicimos|preparamos)\b/;
  const clearlyUnobserved = /\b(?:no (?:se envio|se publico|se probo|se ejecuto|se envio el mensaje|validamos|probamos)|pendiente de validar|aun no probado)\b/;
  const unspecified = /^(?:no se|no aplica|ninguna?|sin novedad|n a|n d|pendiente)$/;
  if (!evidenceText || !resultText || unspecified.test(evidenceText) || absence.test(evidenceText) || absence.test(resultText)
    || onlyPreparation.test(evidenceText) || clearlyUnobserved.test(evidenceText)) {
    return {
      reported, evaluated: "inconclusive",
      reason: "La revisión indica que aún faltan resultados o evidencia para validar la hipótesis.",
    };
  }
  return { reported, evaluated: reported, reason: null };
}

export function hypothesisForPlanning(learning: DecisionLearning): DecisionLearning["hypothesis_status"] {
  // Historical rows remain immutable. The planner reinterprets explicit
  // contradictions before using the owner's reported status as a signal.
  return assessHypothesis({
    reported: learning.reported_hypothesis_status ?? learning.hypothesis_status,
    evidence: learning.evidence.join(" "),
    observedResult: learning.observed_result,
  }).evaluated;
}

type BuildDecisionLearningInput = {
  strategicDiagnosis: StrategicDiagnosis;
  decisionHypothesis: DecisionHypothesis;
  observedResult: string;
  evidence: string;
  learning: string;
  hypothesisStatus: z.infer<typeof HypothesisStatusSchema>;
  metricBefore: string | null;
  metricAfter: string | null;
};

export function buildDecisionLearning({
  strategicDiagnosis,
  decisionHypothesis,
  observedResult,
  evidence,
  learning,
  hypothesisStatus,
  metricBefore,
  metricAfter,
}: BuildDecisionLearningInput): DecisionLearning {
  const assessment = assessHypothesis({ reported: hypothesisStatus, evidence, observedResult });
  return DecisionLearningSchema.parse({
    decision_question:
      strategicDiagnosis.critical_decision.question,
    recommended_direction:
      strategicDiagnosis.critical_decision.recommended_direction,
    hypothesis: decisionHypothesis.statement,
    target_metric:
      strategicDiagnosis.critical_decision.target_metric,
    expected_outcome:
      strategicDiagnosis.critical_decision.expected_outcome,
    observed_result: observedResult,
    evidence: [evidence],
    learning,
    hypothesis_status: assessment.evaluated,
    ...(assessment.reason ? {
      reported_hypothesis_status: assessment.reported,
      evidence_assessment_note: assessment.reason,
    } : {}),
    ...(metricBefore || metricAfter
      ? {
          metric_observation: {
            metric_name:
              strategicDiagnosis.critical_decision.target_metric,
            before: metricBefore,
            after: metricAfter,
          },
        }
      : {}),
  });
}
