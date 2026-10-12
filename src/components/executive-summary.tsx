import type { DashboardPriority } from "@/lib/dashboard-types";
import { ExecutiveContextDialog } from "@/components/executive-context-dialog";

type ExecutiveSummaryProps = {
  summary: string;
  diagnosis: string;
  priorities: DashboardPriority[];
};

export function ExecutiveSummary({
  summary,
  diagnosis,
  priorities,
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
          diagnosis={diagnosis}
          priorities={priorities}
        />
      </div>
    </section>
  );
}
