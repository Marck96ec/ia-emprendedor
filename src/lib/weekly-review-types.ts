import { z } from "zod";

import { HypothesisStatusSchema } from "@/lib/decision-learning";

export const ReviewOutcomeStatusSchema = z.enum([
  "positive",
  "mixed",
  "no_change",
  "negative",
]);

export const WeeklyReviewDraftSchema = z.object({
  outcome_status: ReviewOutcomeStatusSchema.optional(),
  observed_result: z.string().trim().max(2000).optional(),
  evidence: z.string().trim().max(2000).optional(),
  learning: z.string().trim().max(2000).optional(),
  hypothesis_status: HypothesisStatusSchema.optional(),
  metric_before: z.string().trim().max(500).optional(),
  metric_after: z.string().trim().max(500).optional(),
  next_week_focus: z.string().trim().max(1000).optional(),
}).strict();

export type WeeklyReviewDraft = z.infer<typeof WeeklyReviewDraftSchema>;
export type ReviewOutcomeStatus = z.infer<typeof ReviewOutcomeStatusSchema>;
export type HypothesisStatus = z.infer<typeof HypothesisStatusSchema>;

export const OUTCOME_STATUS_LABELS: Record<ReviewOutcomeStatus, string> = {
  positive: "Hubo avance",
  mixed: "Hubo avance parcial",
  no_change: "No hubo un cambio claro",
  negative: "Hubo un retroceso",
};

export const HYPOTHESIS_STATUS_LABELS: Record<HypothesisStatus, string> = {
  validated: "Los resultados apoyan nuestra decisión",
  rejected: "Los resultados indican que debemos cambiar de enfoque",
  inconclusive: "Todavía necesitamos más información",
};

export function parseWeeklyReviewDraft(value: unknown): WeeklyReviewDraft {
  const parsed = WeeklyReviewDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}
