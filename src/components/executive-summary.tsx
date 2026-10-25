import type {
  DashboardPriority,
  DashboardStrategicDiagnosis,
  DashboardTimeAllocation,
} from "@/lib/dashboard-types";
import { ExecutiveContextDialog } from "@/components/executive-context-dialog";

type ExecutiveSummaryProps = {
  summary: string;
  strategicDiagnosis: DashboardStrategicDiagnosis;
  priorities: DashboardPriority[];
  timeAllocation: DashboardTimeAllocation;
};

export function ExecutiveSummary({
  summary,
  strategicDiagnosis,
  priorities,
  timeAllocation,
}: ExecutiveSummaryProps) {
  return (
    <section className="surface-card shrink-0 rounded-2xl px-4 py-3 sm:px-5" aria-labelledby="executive-summary-title">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
            Foco de esta semana
          </p>
          <h2 id="executive-summary-title" className="sr-only">
            Resumen ejecutivo
          </h2>
          <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-800">
            {summary}
          </p>
        </div>

        <ExecutiveContextDialog
          summary={summary}
          strategicDiagnosis={strategicDiagnosis}
          priorities={priorities}
        />
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
            Tiempo estratégico
          </p>
          <p className="text-xs font-semibold text-slate-700">
            {timeAllocation.available_hours} h disponibles · {timeAllocation.allocated_hours} h asignadas · {timeAllocation.reserved_hours} h reservadas
          </p>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-600">{timeAllocation.rationale}</p>
      </div>
    </section>
  );
}
