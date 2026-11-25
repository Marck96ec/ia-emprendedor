import { CommandCenterIcon } from "@/components/command-center-icon";

type BusinessResultsCardProps = {
  results: number;
  completedActions: number;
  evaluatedDecisions: number;
};

export function BusinessResultsCard({ results, completedActions, evaluatedDecisions }: BusinessResultsCardProps) {
  if (results === 0 && completedActions === 0 && evaluatedDecisions === 0) return null;

  return (
    <section className="command-card flex items-center gap-3 px-4 py-3 sm:px-5" aria-labelledby="business-results-title">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--status-favorable-soft)] text-[var(--status-favorable-ink)]">
        <CommandCenterIcon name="check" className="size-5" />
      </span>
      <div>
        <h2 id="business-results-title" className="text-sm font-semibold text-[var(--executive-blue)]">
          {results > 0 ? "Resultados registrados" : "Progreso de ejecución"}
        </h2>
        <ul className="mt-0.5 flex flex-wrap gap-x-3 text-xs leading-4 text-slate-600">
          {results > 0 && <li>{results} {results === 1 ? "resultado declarado" : "resultados declarados"}</li>}
          {completedActions > 0 && <li>{completedActions} {completedActions === 1 ? "acción completada" : "acciones completadas"}</li>}
          {evaluatedDecisions > 0 && <li>{evaluatedDecisions} {evaluatedDecisions === 1 ? "decisión evaluada" : "decisiones evaluadas"}</li>}
        </ul>
      </div>
    </section>
  );
}
