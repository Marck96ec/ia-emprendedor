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
  weekComplete: boolean;
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
  const completing = pending && !completed;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${completed ? "secondary-button" : "accent-button"} min-h-11 w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {completing && <span className="anim-pop mr-2" aria-hidden="true">✓</span>}
      {pending ? "Guardando..." : completed ? "Volver a dejar por hacer" : "Confirmar acción realizada"}
    </button>
  );
}

function NextWeekButton({ weekNumber }: { weekNumber: number }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="primary-button min-h-11 w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Preparando..." : `Preparar semana ${weekNumber}`}
    </button>
  );
}

function getStatus(action: DashboardAction) {
  if (action.status === "completed") {
    return { label: "Completada", className: "bg-emerald-50 text-emerald-800", icon: "✓" };
  }

  if (action.execution_mode === "ai_assisted" && (action.action_results?.length ?? 0) > 0) {
    return { label: "Entregable listo para revisar", className: "bg-blue-50 text-blue-700", icon: "✦" };
  }

  return { label: "Por hacer", className: "bg-slate-100 text-slate-700", icon: "○" };
}

export function ActionDetailPanel({
  action,
  recommended,
  reviewed,
  review,
  canReview,
  weekComplete,
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
    <section className="flex min-h-0 w-full flex-col rounded-2xl bg-white/90 shadow-sm sm:border sm:border-slate-200 cockpit:h-full cockpit:flex-1" aria-labelledby="action-detail-title">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-0 border-b border-slate-100 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="eyebrow">
            Acción {action.sequence}
          </p>
          <span key={status.label} className={`anim-pop inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-sm font-medium ${status.className}`}>
            <span aria-hidden="true">{status.icon}</span>
            {status.label}
          </span>
          {recommended && action.status === "pending" && (
            <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">Recomendada ahora</span>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {action.execution_mode === "ai_assisted" && (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Con IA
            </span>
          )}
          {canReview && !weekComplete && (
            <Link href="/weekly-review" className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-950 cockpit:min-h-8">
              Cerrar semana antes
            </Link>
          )}
        </div>
      </div>

      <div className="thin-scroll p-4 cockpit:min-h-0 cockpit:flex-1 cockpit:overflow-y-auto">
        <h2 id="action-detail-title" className="text-xl font-semibold leading-6 tracking-tight text-slate-950">
          {action.action}
        </h2>

        <div className="mt-4 space-y-3">
          <div>
            <p className="eyebrow">Objetivo</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">{action.objective}</p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="eyebrow">Por qué existe</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">{action.reason}</p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="eyebrow">Recomendación de rol</p>
            <p className="mt-1.5 text-sm font-semibold text-slate-900">{roleLabels[action.role_recommendation]}</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">{action.role_reason}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {action.role_recommendation === "defer" ? "No invertir tiempo esta semana" : `Tiempo tuyo: ${action.estimated_hours} h`}
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="eyebrow">Criterio de éxito</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">{action.success_metric}</p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="eyebrow">Resultado esperado</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-700">{action.expected_result}</p>
          </div>
        </div>

        {review && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="eyebrow">Resultado de la semana</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{outcomeLabels[review.outcome_status]}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{review.outcome_summary}</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 shrink-0 space-y-2 rounded-b-2xl border-t border-slate-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {action.execution_mode === "ai_assisted" && (
          <Link href={`/actions/${action.id}`} className="accent-button min-h-11 w-full px-4 py-2.5 text-sm">
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
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-600">
            Semana revisada. Esta acción conserva su estado y queda disponible en el historial.
          </p>
        )}

        {review && nextWeekNumber !== null && (
          <form action={generateCEOPlanAction}>
            <NextWeekButton weekNumber={nextWeekNumber} />
          </form>
        )}

        {canReview && weekComplete && (
          <Link href="/weekly-review" className="ghost-button min-h-10 w-full px-4 py-2 text-sm">
            Revisar mi semana
          </Link>
        )}
      </div>
    </section>
  );
}
