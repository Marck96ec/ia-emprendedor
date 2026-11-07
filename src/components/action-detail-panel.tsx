"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { approveActionResult, workOnActionWithAI } from "@/actions/action-ai";
import { generateCEOPlanAction } from "@/actions/ceo-plan";
import { updateWeeklyActionStatus } from "@/actions/weekly-actions";
import { ActionCompletionDialog } from "@/components/action-completion-dialog";
import { ActionDeliverablePreview } from "@/components/action-deliverable-preview";
import { ActionWorkspaceSubmit } from "@/components/action-workspace-submit";
import { getActionCaptureSchema } from "@/lib/action-capture";
import {
  getActionDeliverableExplanation,
  getActionDeliverableTitle,
} from "@/lib/action-deliverable-presentation";
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

function NextWeekButton({ weekNumber }: { weekNumber: number }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="primary-button min-h-11 w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Preparando..." : `Reintentar preparación de semana ${weekNumber}`}
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

function AIActionWorkspace({
  action,
  result,
  reviewed,
}: {
  action: DashboardAction;
  result: DashboardAction["action_results"][number] | null;
  reviewed: boolean;
}) {
  const canWork = !reviewed && action.status === "pending" && result?.status !== "approved";
  const returnTo = `/dashboard#tablero-semanal?action=${action.id}`;

  return (
    <section id="ai-action-workspace" className="mt-5 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5" aria-labelledby="ai-action-workspace-title">
      <div>
        <p className="eyebrow !text-blue-700">Espacio de trabajo integrado</p>
        <h3 id="ai-action-workspace-title" className="mt-1 text-lg font-semibold text-slate-950">
          {result?.content ? getActionDeliverableTitle(result.content) : "Crear con ayuda de IA"}
        </h3>
        <p className="mt-1 text-sm leading-5 text-slate-700">
          Genera, revisa y aprueba el entregable aquí sin salir de tu semana.
        </p>
      </div>

      {!result?.content && canWork && (
        <form action={workOnActionWithAI} className="space-y-3">
          <input type="hidden" name="action_id" value={action.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          {result && (
            <p className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600">
              El borrador anterior no pudo validarse. Conservaremos el contexto y generaremos una nueva versión.
            </p>
          )}
          <ActionWorkspaceSubmit
            label={result ? "Regenerar con IA" : "Crear con ayuda de IA"}
            pendingLabel="Preparando entregable..."
          />
        </form>
      )}

      {result && !result.content && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          El entregable guardado no tiene un formato compatible con esta acción.
        </p>
      )}

      {result?.content && (
        <>
          <div className="rounded-xl border border-white bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="badge-chip">
                {result.status === "approved" ? "Entregable aprobado" : `Borrador · Revisión ${result.revision}`}
              </p>
            </div>
            <div className="mt-4">
              <ActionDeliverablePreview content={result.content} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <p className="eyebrow">Estrategia de la IA</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {getActionDeliverableExplanation(result.content)}
            </p>
          </div>

          {canWork && (
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <form action={workOnActionWithAI}>
                <input type="hidden" name="action_id" value={action.id} />
                <input type="hidden" name="return_to" value={returnTo} />
                <label htmlFor={`feedback-${action.id}`} className="field-label">¿Qué te gustaría ajustar?</label>
                <textarea
                  id={`feedback-${action.id}`}
                  name="feedback"
                  maxLength={500}
                  rows={3}
                  className="form-field resize-y"
                  placeholder="Hazla más concreta, clara o enfocada en un tipo de cliente..."
                />
                <div className="mt-3">
                  <ActionWorkspaceSubmit label="Mejorar entregable" pendingLabel="Refinando..." secondary />
                </div>
              </form>
              {result.status === "draft" && (
                <form action={approveActionResult} className="lg:pb-1">
                  <input type="hidden" name="action_result_id" value={result.id} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <ActionWorkspaceSubmit label="Aprobar resultado" pendingLabel="Aprobando..." />
                </form>
              )}
            </div>
          )}
        </>
      )}

      {result?.status === "approved" && action.status === "pending" && !reviewed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          El entregable está aprobado. Registra la evidencia de uso real abajo para completar la acción.
        </div>
      )}

      <Link href={`/actions/${action.id}`} className="inline-flex min-h-10 items-center text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4">
        Abrir ruta directa de esta acción
      </Link>
    </section>
  );
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
  const [completionMode, setCompletionMode] = useState<"capture" | "result" | null>(null);

  // Si la acción dejó de estar pendiente (guardado o semana cerrada), la captura ya no aplica.
  if (completionMode === "capture" && (action?.status !== "pending" || reviewed)) {
    setCompletionMode(null);
  }

  if (!action) {
    return (
      <section className="surface-card flex min-h-0 items-center justify-center rounded-2xl p-6 text-center text-sm text-slate-500">
        No hay acciones disponibles para mostrar.
      </section>
    );
  }

  const status = getStatus(action);
  const result = action.action_results?.[0] ?? null;
  const captureSchema = getActionCaptureSchema(action.capture_schema);

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

        {action.execution_mode === "ai_assisted" && (
          <AIActionWorkspace action={action} result={result} reviewed={reviewed} />
        )}

        {action.execution_mode === "ai_assisted" && result?.status === "approved" && action.status === "pending" && !reviewed && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="ai-action-evidence-title">
            <p className="eyebrow">Evidencia de utilización real</p>
            <h3 id="ai-action-evidence-title" className="mt-1 text-lg font-semibold text-slate-950">¿Qué ocurrió al probarlo?</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">La generación y la aprobación no completan la acción. Registra aquí lo observado con clientes.</p>
            <div className="mt-4">
              <button type="button" className="accent-button min-h-11 w-full px-4 py-2.5 text-sm" onClick={() => setCompletionMode("capture")}>
                Registrar evidencia y completar
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 shrink-0 space-y-2 rounded-b-2xl border-t border-slate-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {action.execution_mode === "ai_assisted" && (
          <button type="button" className="accent-button min-h-11 w-full px-4 py-2.5 text-sm" onClick={() => document.getElementById("ai-action-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            {result ? "Revisar entregable" : "Crear con ayuda de IA"}
          </button>
        )}

        {action.execution_mode === "manual" && !reviewed && action.status === "pending" && (
          <button type="button" className="accent-button min-h-11 w-full px-4 py-2.5 text-sm" onClick={() => setCompletionMode("capture")}>
            Registrar resultado
          </button>
        )}
        {action.status === "completed" && action.completion_data && (
          <button type="button" className="secondary-button min-h-11 w-full px-4 py-2.5 text-sm" onClick={() => setCompletionMode("result")}>
            Ver resultado
          </button>
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

      </div>
      <ActionCompletionDialog
        open={completionMode !== null}
        onClose={() => setCompletionMode(null)}
        actionId={action.id}
        captureSchema={captureSchema}
        action={updateWeeklyActionStatus}
        initialData={action.completion_data ?? undefined}
        readOnly={completionMode === "result"}
      />
    </section>
  );
}
