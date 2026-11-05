import { summarizeEvidence, type BusinessEvidence } from "@/lib/business-evidence";
import { buildCurrentMetricMessage } from "@/lib/business-metrics";

export type WeeklyReviewContext = {
  introMessage: string;
  evidenceMessage: string | null;
  metricMessage: string;
  completedActions: number;
  totalActions: number;
  recordedResults: number;
};

export function buildWeeklyReviewContext(input: {
  businessName: string;
  weekNumber: number;
  completedActions: number;
  totalActions: number;
  recordedResults: number;
  evidence: Array<Pick<BusinessEvidence, "evidence_type">>;
}): WeeklyReviewContext {
  const actionMessage =
    input.completedActions === input.totalActions
      ? `Completaste tus ${input.totalActions} acciones.`
      : `Completaste ${input.completedActions} de ${input.totalActions} acciones.`;
  const resultMessage =
    input.recordedResults > 0
      ? ` Registraste resultados en ${input.recordedResults} ${input.recordedResults === 1 ? "acción" : "acciones"}.`
      : " Todavía no hay resultados estructurados registrados.";
  const evidenceSummary = summarizeEvidence(input.evidence);

  return {
    introMessage: `${actionMessage}${resultMessage} Revisemos qué significan esos resultados para ${input.businessName}.`,
    evidenceMessage: evidenceSummary
      ? `Esta semana ya tenemos ${evidenceSummary}. No necesitas volver a escribir esos datos.`
      : null,
    metricMessage: buildCurrentMetricMessage({
      weekNumber: input.weekNumber,
      totalActions: input.totalActions,
      completedActions: input.completedActions,
      recordedResults: input.recordedResults,
      evidence: input.evidence,
    }),
    completedActions: input.completedActions,
    totalActions: input.totalActions,
    recordedResults: input.recordedResults,
  };
}
