import type {
  DashboardDecisionHypothesis,
  DashboardPriority,
  DashboardStrategicDiagnosis,
} from "@/lib/dashboard-types";
import { ExecutiveContextDialog } from "@/components/executive-context-dialog";

type ExecutiveSummaryProps = {
  summary: string;
  strategicDiagnosis: DashboardStrategicDiagnosis;
  priorities: DashboardPriority[];
  decisionHypothesis: DashboardDecisionHypothesis;
};

export function ExecutiveSummary({
  summary,
  strategicDiagnosis,
  priorities,
  decisionHypothesis,
}: ExecutiveSummaryProps) {
  return (
    <section className="surface-card rounded-2xl px-4 py-4 sm:px-5" aria-labelledby="executive-summary-title">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="executive-summary-title" className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
            Foco de esta semana
          </h2>
          <p className="mt-1.5 line-clamp-3 text-sm font-medium leading-5 text-slate-800">
            {summary}
          </p>
        </div>

        <ExecutiveContextDialog
          summary={summary}
          strategicDiagnosis={strategicDiagnosis}
          priorities={priorities}
          triggerLabel="Entender el foco"
        />
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
          Lo que estamos probando
        </p>
        <p className="mt-1 text-sm leading-5 text-slate-700">{decisionHypothesis.statement}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Lo sabremos si: {decisionHypothesis.validation_signal}</p>
      </div>
    </section>
  );
}
