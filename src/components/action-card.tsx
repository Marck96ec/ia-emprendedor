import type { DashboardAction } from "@/lib/dashboard-types";

type ActionCardProps = {
  action: DashboardAction;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
};

function getActionState(action: DashboardAction) {
  if (action.status === "completed") {
    return {
      label: "Completada",
      icon: "✓",
      className: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    };
  }

  if (action.execution_mode === "ai_assisted" && (action.action_results?.length ?? 0) > 0) {
    return {
      label: "IA lista para revisar",
      icon: "✦",
      className: "border-sky-200 bg-sky-50/80 text-sky-700",
    };
  }

  return {
    label: "Pendiente",
    icon: "○",
    className: "border-slate-200 bg-white/80 text-slate-600",
  };
}

const roleLabels = {
  execute: "Tú",
  delegate: "Delegar",
  automate: "Automatizar",
  defer: "Diferir",
} as const;

export function ActionCard({
  action,
  selected,
  recommended,
  onSelect,
}: ActionCardProps) {
  const state = getActionState(action);
  const highlighted = recommended && action.status === "pending";

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Seleccionar acción ${action.sequence}: ${action.action}`}
      onClick={onSelect}
      className={`group flex min-h-[5rem] min-w-0 flex-col justify-between rounded-xl border p-3 text-left transition focus-visible:outline-3 focus-visible:outline-blue-500/30 ${
        highlighted ? "col-span-full" : ""
      } ${
        selected
          ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
          : highlighted
            ? "border-sky-300 bg-sky-50 shadow-md shadow-sky-900/10 hover:border-sky-500"
            : "hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${selected ? "bg-white/15 text-white" : state.className}`} aria-hidden="true">
          {state.icon}
        </span>
        {highlighted ? (
          <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${selected ? "bg-sky-300 text-slate-950" : "bg-sky-600 text-white"}`}>
            Recomendada ahora
          </span>
        ) : (
          <span className={`text-[0.65rem] font-bold uppercase tracking-[0.14em] ${selected ? "text-slate-300" : "text-slate-500"}`}>
            Acción {action.sequence}
          </span>
        )}
      </div>

      <div className="mt-2 min-w-0">
        <p className={`text-sm font-semibold leading-5 ${highlighted ? "" : "line-clamp-3"} ${selected ? "text-white" : action.status === "completed" ? "text-slate-500" : "text-slate-900"}`} title={action.action}>
          {action.action}
        </p>
        <p className={`mt-1 text-[0.68rem] font-medium ${selected ? "text-slate-300" : state.className.split(" ").at(-1)}`}>
          {state.label}
        </p>
        <p className={`mt-1 text-[0.62rem] font-semibold ${selected ? "text-slate-300" : "text-slate-500"}`}>
          {roleLabels[action.role_recommendation]} · {action.role_recommendation === "defer" ? "0 h" : `${action.estimated_hours} h`}
        </p>
      </div>
    </button>
  );
}
