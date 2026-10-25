import { z } from "zod";

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
  metric_observation: MetricObservationSchema.optional(),
});

export type DecisionHypothesis = z.infer<typeof DecisionHypothesisSchema>;
export type DecisionLearning = z.infer<typeof DecisionLearningSchema>;
