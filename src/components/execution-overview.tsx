"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CommandCenterIcon } from "@/components/command-center-icon";
import { TimeAllocationCard } from "@/components/time-allocation-card";
import { WeeklyActionBoard } from "@/components/weekly-action-board";
import type { DashboardAction, DashboardTimeAllocation, DashboardWeeklyReview } from "@/lib/dashboard-types";

type ExecutionOverviewProps = {
  objective: string;
  actions: DashboardAction[];
  review: DashboardWeeklyReview | null;
  nextWeekNumber: number | null;
  timeAllocation: DashboardTimeAllocation;
  error?: string;
  message?: string;
};

const primaryActionClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--executive-blue)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#23425f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--executive-blue)] sm:w-fit";

export function ExecutionOverview({
  objective,
  actions,
  review,
  nextWeekNumber,
  timeAllocation,
  error,
  message,
}: ExecutionOverviewProps) {
  const [workspace, setWorkspace] = useState<{ actionId: string | null } | null>(null);
  const workspaceRef = useRef<HTMLDialogElement>(null);
  const action = actions.find((item) => item.status === "pending");
  const completed = actions.filter((item) => item.status === "completed").length;
  const progress = `${completed} de ${actions.length} acciones completadas`;

  useEffect(() => {
    function openWorkspaceFromHash() {
      const [destination, query] = window.location.hash.split("?");
      if (destination !== "#tablero-semanal") return;
      const actionId = new URLSearchParams(query).get("action");
      setWorkspace({ actionId });
    }

    openWorkspaceFromHash();
    window.addEventListener("hashchange", openWorkspaceFromHash);
    return () => window.removeEventListener("hashchange", openWorkspaceFromHash);
  }, []);

  useEffect(() => {
    const dialog = workspaceRef.current;
    if (!dialog) return;
    if (workspace && !dialog.open) dialog.showModal();
    if (!workspace && dialog.open) dialog.close();
  }, [workspace]);

  function closeWorkspace() {
    if (window.location.hash.split("?")[0] === "#tablero-semanal") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setWorkspace(null);
  }

  const ctaLabel = action?.execution_mode === "ai_assisted"
    ? action.action_results?.length ? "Revisar entregable" : "Empezar con IA"
    : "Comenzar acción";

  return (
    <>
      <section
        id="execution-overview"
        className="command-card flex min-w-0 flex-1 flex-col p-4 sm:p-5"
        aria-labelledby="execution-overview-title"
      >
        <header className="border-b border-slate-200 pb-3">
          <p className="command-kicker text-[var(--status-favorable-ink)]">Tu misión actual</p>
          <h2 id="execution-overview-title" className="mt-1 line-clamp-2 text-xl leading-tight font-semibold tracking-tight text-[var(--executive-blue)] sm:text-2xl">
            {objective}
          </h2>
          {actions.length > 0 && (
            <div className="mt-2.5 grid items-center gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4">
              <p className="text-xs font-medium text-slate-600">{progress}</p>
              <div
                role="progressbar"
                aria-label={progress}
                aria-valuemin={0}
                aria-valuemax={actions.length}
                aria-valuenow={completed}
                className="flex max-w-60 gap-1.5"
              >
                {actions.map((item) => (
                  <span key={item.id} aria-hidden="true" className={`h-1.5 min-w-0 flex-1 rounded-full ${
                    item.status === "completed"
                      ? "bg-[var(--status-favorable)]"
                      : item.id === action?.id ? "bg-[var(--executive-blue)]" : "bg-slate-200"
                  }`} />
                ))}
              </div>
            </div>
          )}
        </header>

        {action && !review ? (
          <div className="flex flex-1 flex-col pt-3">
            <p className="command-kicker text-slate-600">Tu siguiente movimiento</p>
            <h3 className="mt-1 line-clamp-2 text-lg leading-snug font-semibold tracking-tight text-slate-950 sm:text-xl">
              {action.action}
            </h3>
            <div className="mt-1.5 grid items-start gap-2.5 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] min-[1100px]:gap-4">
              <p className="line-clamp-2 text-sm leading-5 text-slate-600">{action.reason}</p>
              <div className="rounded-lg border border-slate-200/80 bg-[var(--surface-neutral)] px-3 py-2">
                <p className="text-xs font-semibold text-[var(--executive-blue)]">Resultado esperado</p>
                <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-slate-700">{action.expected_result}</p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setWorkspace({ actionId: action.id })}
                className={primaryActionClass}
              >
                {ctaLabel}
                <CommandCenterIcon name="arrow" className="size-4 shrink-0" />
              </button>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <CommandCenterIcon name="clock" className="size-4" />
                {action.role_recommendation === "defer"
                  ? "Sin tiempo asignado esta semana"
                  : `Tiempo estimado · ${action.estimated_hours} h`}
              </p>
              <button type="button" aria-haspopup="dialog" className="command-link ml-auto" onClick={() => setWorkspace({ actionId: null })}>
                Ver plan completo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-start justify-center gap-2 pt-4">
            <p className="command-kicker text-slate-600">Tu siguiente movimiento</p>
            <h3 className="text-lg font-semibold text-slate-950">
              {review ? "Tu semana ya fue revisada" : actions.length ? "Plan ejecutado" : "Tu plan aún no tiene acciones"}
            </h3>
            {review ? (
              <button type="button" aria-haspopup="dialog" onClick={() => setWorkspace({ actionId: actions[0]?.id ?? null })} className={primaryActionClass}>
                Ver resultado de la semana
              </button>
            ) : actions.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/weekly-review" className={primaryActionClass}>Revisar mi semana</Link>
                <button type="button" aria-haspopup="dialog" className="command-link" onClick={() => setWorkspace({ actionId: null })}>Ver plan completo</button>
              </div>
            )}
          </div>
        )}
      </section>

      <dialog
        id="tablero-semanal"
        ref={workspaceRef}
        aria-labelledby="execution-workspace-title"
        onClose={closeWorkspace}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeWorkspace();
        }}
        className="m-auto max-h-[94dvh] w-[min(96vw,64rem)] max-w-none overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/45"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 sm:px-5">
          <h2 id="execution-workspace-title" className="text-lg font-semibold text-[var(--executive-blue)]">Plan actual</h2>
          <button type="button" onClick={closeWorkspace} className="command-link">Cerrar</button>
        </header>
        {workspace && (
          <div className="space-y-3 p-3 sm:p-5">
            {error && <p className="alert-box" role="alert">{error}</p>}
            {message && <p className="success-box" role="status">{message}</p>}
            <WeeklyActionBoard
              key={workspace.actionId ?? "plan"}
              initialActionId={workspace.actionId}
              actions={actions}
              reviewed={Boolean(review)}
              review={review}
              nextWeekNumber={nextWeekNumber}
            />
            <details className="rounded-xl border border-slate-200 px-3 py-2">
              <summary className="command-link cursor-pointer">Objetivo y tiempo de la semana</summary>
              <p className="my-2 text-sm leading-5 text-slate-700">{objective}</p>
              <TimeAllocationCard timeAllocation={timeAllocation} compact />
            </details>
          </div>
        )}
      </dialog>
    </>
  );
}
