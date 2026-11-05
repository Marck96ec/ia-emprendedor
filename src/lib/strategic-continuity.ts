import { z } from "zod";

export const StrategicContinuityModeSchema = z.enum([
  "continuation",
  "deepening",
  "adjustment",
  "change",
  "repetition",
]);

export const StrategicContinuitySchema = z.object({
  mode: StrategicContinuityModeSchema,
  justification: z.string().trim().min(5).max(1000),
  unresolved_uncertainty: z.string().trim().min(5).max(1000),
  new_verifiable_signal: z.string().trim().min(5).max(1000),
  prior_evidence_gap: z.string().trim().min(5).max(1000),
});

export type StrategicContinuity = z.infer<typeof StrategicContinuitySchema>;

function fingerprint(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function findRepeatedActions(
  previousActions: Array<{ action: string; objective: string; successMetric: string }>,
  nextActions: Array<{ action: string; objective: string; successMetric: string }>,
) {
  const previous = new Set(
    previousActions.map((item) =>
      [item.action, item.objective].map(fingerprint).join("|"),
    ),
  );

  return nextActions.filter((item) =>
    previous.has([item.action, item.objective].map(fingerprint).join("|")),
  );
}

export function validateStrategicContinuity(input: {
  previousActions: Array<{ action: string; objective: string; successMetric: string }>;
  nextActions: Array<{ action: string; objective: string; successMetric: string }>;
  continuity?: StrategicContinuity;
}): { success: true; repeatedActions: number } | { success: false; message: string } {
  if (input.previousActions.length === 0) {
    return { success: true, repeatedActions: 0 };
  }

  if (!input.continuity) {
    return {
      success: false,
      message: "El plan necesita explicar su continuidad respecto a la semana anterior.",
    };
  }

  const repeatedActions = findRepeatedActions(input.previousActions, input.nextActions);
  if (repeatedActions.length === 0 && input.continuity.mode === "repetition") {
    return {
      success: false,
      message: "La continuidad está marcada como repetición, pero no repite una acción identificable.",
    };
  }

  if (repeatedActions.length > 0) {
    const previousMetrics = new Set(
      input.previousActions.map((item) => fingerprint(item.successMetric)),
    );
    const repeatedWithNewSignal = repeatedActions.some(
      (item) => !previousMetrics.has(fingerprint(item.successMetric)),
    ) || !previousMetrics.has(fingerprint(input.continuity.new_verifiable_signal));

    if (!repeatedWithNewSignal) {
      return {
        success: false,
        message: "Una acción repetida debe tener una señal de éxito nueva y verificable.",
      };
    }

    if (input.continuity.mode === "change") {
      return {
        success: false,
        message: "Un cambio de estrategia no puede conservar una acción idéntica sin explicar su transformación.",
      };
    }
  }

  return { success: true, repeatedActions: repeatedActions.length };
}
