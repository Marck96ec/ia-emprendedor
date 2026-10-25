"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { generateCEOPlanAction } from "@/actions/ceo-plan";
import { updateWeeklyActionStatus } from "@/actions/weekly-actions";
import type { DashboardAction, DashboardWeeklyReview } from "@/lib/dashboard-types";

type ActionDetailPanelProps = {
  action: DashboardAction | null;
  recommended: boolean;
  reviewed: boolean;
  review: DashboardWeeklyReview | null;
  canReview: boolean;
  nextWeekNumber: number | null;
};

const outcomeLabels = {
  positive: "Hubo avance",
  mixed: "Avance parcial",
  no_change: "Sin cambio claro",
  negative: "Hubo retroceso",
} as const;

const roleLabels = {
  execute: "Tú debes hacerlo",
  delegate: "Delegar",
  automate: "Automatizar",
  defer: "Diferir",
} as const;

function CompletionButton({ completed }: { completed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${completed ? "secondary-button" : "primary-button"} min-h-10 w-full px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? "Guardando..." : completed ? "Volver a dejar pendiente" : "Confirmar acción realizada"}
    </button>
  );
}

function NextWeekButton({ weekNumber }: { weekNumber: number }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="primary-button min-h-10 w-full px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Preparando..." : `Preparar semana ${weekNumber}`}
    </button>
  );
}

function getStatus(action: DashboardAction) {
  if (action.status === "completed") {
    return { label: "Completada", className: "bg-emerald-50 text-emerald-700", icon: "✓" };
  }

  if (action.execution_mode === "ai_assisted" && (action.action_results?.length ?? 0) > 0) {
    return { label: "Entregable listo para revisar", className: "bg-sky-50 text-sky-700", icon: "✦" };
  }

  return { label: "Pendiente", className: "bg-slate-100 text-slate-700", icon: "○" };
}

export function ActionDetailPanel({
  action,
  recommended,
  reviewed,
  review,
  canReview,
  nextWeekNumber,
}: ActionDetailPanelProps) {
  if (!action) {
    return (
      <section className="surface-card flex min-h-0 items-center justify-center rounded-2xl p-6 text-center text-sm text-slate-500">
        No hay acciones disponibles para mostrar.
      </section>
    );
  }

  const status = getStatus(action);
  const hasResult = (action.action_results?.length ?? 0) > 0;

  return (
    <section className="surface-card flex min-h-0 flex-col rounded-2xl" aria-labelledby="action-detail-title">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              Detalle · Acción {action.sequence}
            </p>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${status.className}`}>
              <span aria-hidden="true">{status.icon}</span>
              {status.label}
            </span>
          </div>
          {action.execution_mode === "ai_assisted" && (
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-600">
              Con IA
            </span>
          )}
        </div>

        {recommended && action.status === "pending" && (
          <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
            Siguiente paso recomendado para comenzar la semana.
          </p>
        )}

        <h2 id="action-detail-title" className="mt-4 text-xl font-semibold leading-6 tracking-tight text-slate-950">
          {action.action}
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Objetivo</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">{action.objective}</p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Por qué existe</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">{action.reason}</p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Recomendación de rol</p>
            <p className="mt-1.5 text-sm font-semibold text-slate-900">{roleLabels[action.role_recommendation]}</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">{action.role_reason}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {action.role_recommendation === "defer" ? "No invertir tiempo esta semana" : `Tiempo tuyo: ${action.estimated_hours} h`}
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Criterio de éxito</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">{action.success_metric}</p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Resultado esperado</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">{action.expected_result}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Siguiente acción</p>
          <div className="mt-3 space-y-2">
            {action.execution_mode === "ai_assisted" && (
              <Link href={`/actions/${action.id}`} className="primary-button min-h-10 w-full px-3 py-2 text-xs">
                {hasResult ? "Ver lo que logramos" : "Crear con ayuda de IA"}
              </Link>
            )}

            {action.execution_mode === "manual" && !reviewed && (
              <form action={updateWeeklyActionStatus}>
                <input type="hidden" name="action_id" value={action.id} />
                <input name="status" type="hidden" value={action.status === "completed" ? "pending" : "completed"} />
                <CompletionButton completed={action.status === "completed"} />
              </form>
            )}

            {reviewed && (
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                Semana revisada. Esta acción conserva su estado persistido y queda disponible en el historial.
              </p>
            )}
          </div>
        </div>

        {review && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Resultado de la semana</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{outcomeLabels[review.outcome_status]}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{review.outcome_summary}</p>
            {nextWeekNumber !== null && (
              <form action={generateCEOPlanAction} className="mt-3">
                <NextWeekButton weekNumber={nextWeekNumber} />
              </form>
            )}
          </div>
        )}

        {canReview && (
          <Link href="/weekly-review" className="ghost-button mt-5 min-h-10 w-full px-3 py-2 text-xs">
            Veamos qué funcionó esta semana
          </Link>
        )}
      </div>
    </section>
  );
}
