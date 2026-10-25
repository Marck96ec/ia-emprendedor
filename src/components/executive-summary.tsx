import type { DashboardDecisionHypothesis } from "@/lib/dashboard-types";

type ExecutiveSummaryProps = {
  summary: string;
  decisionHypothesis: DashboardDecisionHypothesis;
};

export function ExecutiveSummary({
  summary,
  decisionHypothesis,
}: ExecutiveSummaryProps) {
  return (
    <section aria-labelledby="executive-summary-title">
      <h2 id="executive-summary-title" className="eyebrow">
        Foco de esta semana
      </h2>
      <p className="mt-2 text-base font-medium leading-6 text-slate-900">{summary}</p>

      <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3">
        <p className="eyebrow !text-amber-800">Lo que estamos probando</p>
        <p className="mt-1 text-base leading-6 text-slate-900">{decisionHypothesis.statement}</p>
        <p className="mt-2 text-sm leading-5 text-slate-700">
          <span className="font-medium text-slate-900">Señal de validación:</span> {decisionHypothesis.validation_signal}
        </p>
      </div>
    </section>
  );
}
