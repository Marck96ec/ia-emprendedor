import type {
  BusinessAssessment,
  BusinessAssessmentClassification,
  BusinessAssessmentConfidence,
  BusinessHealthStatus,
} from "@/lib/business-assessment";

type BusinessEvolutionCardProps = {
  assessment: BusinessAssessment;
};

const confidenceLabels: Record<BusinessAssessmentConfidence, string> = {
  low: "baja",
  medium: "media",
  high: "alta",
};

const classificationLabels: Record<BusinessAssessmentClassification, string> = {
  confirmed: "confirmada",
  provisional: "provisional",
  indeterminate: "indeterminada",
};

const healthLabels: Record<BusinessHealthStatus, string> = {
  favorable: "Favorable",
  fragile: "Requiere atención",
  critical: "Crítica",
  mixed: "Mixta",
  unknown: "Sin evaluar",
};

const healthStyles: Record<BusinessHealthStatus, string> = {
  favorable: "bg-[var(--status-favorable-soft)] text-[var(--status-favorable-ink)]",
  fragile: "bg-[var(--status-attention-soft)] text-[var(--status-attention-ink)]",
  critical: "bg-[var(--status-critical-soft)] text-[var(--status-critical-ink)]",
  mixed: "bg-[var(--status-attention-soft)] text-[var(--status-attention-ink)]",
  unknown: "bg-[var(--status-unevaluated-soft)] text-[var(--status-unevaluated-ink)]",
};

function StageSegments({ level }: { level: number | null }) {
  return (
    <div
      className="relative mx-auto h-16 w-16"
      role="img"
      aria-label={`Indicador circular de cinco etapas${
        level ? `, nivel actual ${level}` : ", sin nivel evaluado"
      }`}
    >
      <span className="absolute inset-2 rounded-full border border-slate-200" />
      {Array.from({ length: 5 }, (_, index) => {
        const segmentLevel = index + 1;
        const active = segmentLevel === level;

        return (
          <span
            key={segmentLevel}
            className={`absolute left-1/2 top-1/2 h-2 w-5 rounded-full border ${
              active
                ? "border-[var(--executive-blue)] bg-[var(--executive-blue)]"
                : "border-slate-200 bg-slate-100"
            }`}
            style={{
              transform: `translate(-50%, -50%) rotate(${index * 72}deg) translateY(-26px)`,
            }}
          />
        );
      })}
    </div>
  );
}

export function BusinessEvolutionCard({
  assessment,
}: BusinessEvolutionCardProps) {
  const { maturity, health } = assessment;

  return (
    <section
      className="surface-card rounded-2xl p-4 sm:p-5"
      aria-labelledby="business-evolution-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Mi empresa</p>
          <h2
            id="business-evolution-title"
            className="mt-1 text-lg font-semibold tracking-tight text-slate-950"
          >
            Tu evolución empresarial
          </h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${healthStyles[health.status]}`}
        >
          Salud: {healthLabels[health.status]}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-[var(--executive-blue)] bg-white">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Nivel
          </span>
          <span className="text-2xl font-semibold leading-7 text-[var(--executive-blue)]">
            {maturity.level ? String(maturity.level).padStart(2, "0") : "—"}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-slate-950">
            {maturity.stageLabel ?? "Estamos comprendiendo tu empresa"}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Evaluación {classificationLabels[maturity.classification]} ·
            {" "}confianza {confidenceLabels[maturity.confidence]}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <StageSegments level={maturity.level} />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Las etapas muestran una evaluación, no logros certificados ni un
          porcentaje de avance.
        </p>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-sm leading-5 text-slate-700">{maturity.explanation}</p>
        {maturity.missingInformation.length > 0 && (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Para afinarla necesitamos: {maturity.missingInformation[0]}
          </p>
        )}
      </div>

      <details className="mt-3 border-t border-slate-100 pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--executive-blue)] focus-visible:outline-3 focus-visible:outline-[var(--executive-blue)]/30">
          Ver detalle de la evaluación
        </summary>
        <div className="mt-3 space-y-3 text-sm leading-5 text-slate-700">
          {maturity.appliedRules.length > 0 && (
            <div>
              <p className="font-semibold text-slate-900">Reglas aplicadas</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {maturity.appliedRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          )}
          {maturity.risks.length > 0 && (
            <div>
              <p className="font-semibold text-slate-900">Riesgos</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {maturity.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Evidencias asociadas: {maturity.evidenceIds.length}
          </p>
        </div>
      </details>
    </section>
  );
}
