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

export function ActionCard({
  action,
  selected,
  recommended,
  onSelect,
}: ActionCardProps) {
  const state = getActionState(action);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Seleccionar día ${action.day}: ${action.action}`}
      onClick={onSelect}
      className={`group flex min-h-[5rem] min-w-0 flex-col justify-between rounded-xl border p-2 text-left transition focus-visible:outline-3 focus-visible:outline-blue-500/30 lg:min-h-[7rem] lg:p-3 ${
        selected
          ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
          : "hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${selected ? "bg-white/15 text-white" : state.className}`} aria-hidden="true">
          {state.icon}
        </span>
        <span className={`text-[0.65rem] font-bold uppercase tracking-[0.14em] ${selected ? "text-slate-300" : "text-slate-500"}`}>
          Día {action.day}
        </span>
      </div>

      <div className="mt-1.5 min-w-0 lg:mt-3">
        <p className={`line-clamp-2 text-xs font-semibold leading-4 lg:text-sm lg:leading-5 ${selected ? "text-white" : action.status === "completed" ? "text-slate-500" : "text-slate-900"}`} title={action.action}>
          {action.action}
        </p>
        <p className={`mt-0.5 truncate text-[0.62rem] font-medium lg:mt-1 lg:text-[0.68rem] ${selected ? "text-slate-300" : state.className.split(" ").at(-1)}`}>
          {state.label}
        </p>
        {recommended && action.status === "pending" && (
          <p className={`mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.1em] ${selected ? "text-sky-200" : "text-sky-700"}`}>
            Siguiente paso
          </p>
        )}
      </div>
    </button>
  );
}
