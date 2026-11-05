import type { BusinessEvidence } from "@/lib/business-evidence";

export type ExecutionMetricInput = {
  weekNumber: number;
  totalActions: number;
  completedActions: number;
  recordedResults: number;
  evidence: Array<Pick<BusinessEvidence, "evidence_type">>;
};

export function buildCurrentMetricMessage(input: ExecutionMetricInput): string {
  const evidenceCount = input.evidence.length;
  const evidencePart =
    evidenceCount > 0
      ? ` También hay ${evidenceCount} registro${evidenceCount === 1 ? "" : "s"} de evidencia reutilizable.`
      : " Todavía no hay evidencia de negocio suficiente para comparar otra métrica.";

  return `Semana ${input.weekNumber}: ${input.completedActions} de ${input.totalActions} acciones completadas y ${input.recordedResults} resultado${input.recordedResults === 1 ? "" : "s"} registrado${input.recordedResults === 1 ? "" : "s"}.${evidencePart} Esto describe ejecución registrada; no equivale por sí solo a ventas, ingresos o utilidad.`;
}
