import type { DashboardAction } from "@/lib/dashboard-types";

type StrategicMissionCardProps = {
  objective: string;
  actions: DashboardAction[];
};

export function StrategicMissionCard({
  objective,
  actions,
}: StrategicMissionCardProps) {
  const completed = actions.filter((action) => action.status === "completed").length;

  return (
    <section
      className="surface-card rounded-2xl p-4 sm:p-5"
      aria-labelledby="strategic-objective-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Dirección estratégica</p>
          <h2
            id="strategic-objective-title"
            className="mt-1 text-lg font-semibold tracking-tight text-slate-950"
          >
            Objetivo estratégico actual
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {completed} de {actions.length}
        </span>
      </div>
      <p className="mt-2 text-sm leading-5 text-slate-700">{objective}</p>

      {actions.length > 0 ? (
        <ol
          className="mt-4 grid grid-cols-7 gap-1.5"
          aria-label="Progreso de las acciones del objetivo estratégico"
        >
          {actions.map((action) => {
            const completedAction = action.status === "completed";
            const hasDraft =
              action.execution_mode === "ai_assisted" &&
              action.action_results.length > 0 &&
              !completedAction;

            return (
              <li
                key={action.id}
                className={`flex h-8 items-center justify-center rounded-full border text-xs font-semibold ${
                  completedAction
                    ? "border-[var(--status-favorable)] bg-[var(--status-favorable)] text-white"
                    : hasDraft
                      ? "border-[var(--executive-blue)] bg-[var(--executive-blue-soft)] text-[var(--executive-blue)]"
                      : "border-slate-300 bg-white text-slate-500"
                }`}
                title={`Acción ${action.sequence}: ${
                  completedAction ? "completada" : hasDraft ? "requiere revisión" : "pendiente"
                }`}
              >
                {completedAction ? "✓" : hasDraft ? "·" : action.sequence}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Este objetivo todavía no tiene acciones disponibles.
        </p>
      )}
    </section>
  );
}
