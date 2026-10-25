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
      iconClassName: "bg-emerald-600 text-white",
      labelClassName: "text-emerald-800",
    };
  }

  if (action.execution_mode === "ai_assisted" && (action.action_results?.length ?? 0) > 0) {
    return {
      label: "IA lista para revisar",
      icon: "✦",
      iconClassName: "bg-blue-50 text-blue-700",
      labelClassName: "text-blue-700",
    };
  }

  return {
    label: "Por hacer",
    icon: "○",
    iconClassName: "bg-slate-100 text-slate-600",
    labelClassName: "text-slate-600",
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
  const completed = action.status === "completed";
  const highlighted = recommended && !completed;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Seleccionar acción ${action.sequence}: ${action.action}`}
      onClick={onSelect}
      className={`group flex w-full min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-blue-500/30 ${
        selected ? "ring-2 ring-slate-900" : ""
      } ${
        highlighted
          ? "border-blue-300 bg-blue-50/70 hover:border-blue-400"
          : completed
            ? "border-slate-200 bg-slate-50/70 hover:bg-slate-50"
            : "border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 motion-reduce:transition-none ${state.iconClassName}`}
        aria-hidden="true"
      >
        {state.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {highlighted ? (
            <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              Recomendada ahora
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-500">Acción {action.sequence}</span>
          )}
          <span className={`text-xs font-medium ${state.labelClassName}`}>{state.label}</span>
        </span>
        <span
          className={`mt-1 block leading-5 ${
            highlighted ? "text-base font-semibold leading-6 text-slate-950" : completed ? "text-sm font-medium text-slate-500" : "text-sm font-medium text-slate-800"
          } ${highlighted ? "line-clamp-3" : "line-clamp-2"}`}
          title={action.action}
        >
          {action.action}
        </span>
        <span className="mt-0.5 block text-sm text-slate-500">
          {roleLabels[action.role_recommendation]} · {action.role_recommendation === "defer" ? "0 h" : `${action.estimated_hours} h`}
        </span>
      </span>
    </button>
  );
}
