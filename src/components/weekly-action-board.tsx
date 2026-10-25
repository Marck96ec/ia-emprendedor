"use client";

import { useState } from "react";

import type { DashboardAction, DashboardWeeklyReview } from "@/lib/dashboard-types";
import { ActionCard } from "@/components/action-card";
import { ActionDetailPanel } from "@/components/action-detail-panel";

type WeeklyActionBoardProps = {
  actions: DashboardAction[];
  reviewed: boolean;
  review: DashboardWeeklyReview | null;
  nextWeekNumber: number | null;
};

export function WeeklyActionBoard({
  actions,
  reviewed,
  review,
  nextWeekNumber,
}: WeeklyActionBoardProps) {
  const firstPendingAction = actions.find((action) => action.status === "pending");
  const [mobileView, setMobileView] = useState<"actions" | "detail">("detail");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [trackedPendingId, setTrackedPendingId] = useState(firstPendingAction?.id ?? null);

  // Al completar una acción, la selección vuelve a la nueva acción recomendada.
  if (trackedPendingId !== (firstPendingAction?.id ?? null)) {
    setTrackedPendingId(firstPendingAction?.id ?? null);
    setSelectedActionId(null);
  }

  const selectedAction =
    actions.find((action) => action.id === selectedActionId) ??
    firstPendingAction ??
    actions[0] ??
    null;
  const activeActionId = selectedAction?.id ?? "";
  const canReview = actions.length > 0 && !reviewed;

  const laterActions = actions.filter(
    (action) => action.status === "pending" && action.id !== firstPendingAction?.id,
  );
  const completedActions = actions.filter((action) => action.status === "completed");

  function selectAction(actionId: string) {
    setSelectedActionId(actionId);
    setMobileView("detail");
  }

  function renderCard(action: DashboardAction) {
    return (
      <li key={action.id}>
        <ActionCard
          action={action}
          selected={action.id === activeActionId}
          recommended={action.id === firstPendingAction?.id}
          onSelect={() => selectAction(action.id)}
        />
      </li>
    );
  }

  return (
    <div id="tablero-semanal" className="flex scroll-mt-4 flex-col gap-3 lg:min-h-0 lg:flex-1">
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 lg:hidden" role="tablist" aria-label="Navegación semanal">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "detail"}
          onClick={() => setMobileView("detail")}
          className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mobileView === "detail" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Detalle de la acción
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "actions"}
          onClick={() => setMobileView("actions")}
          className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mobileView === "actions" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Plan semanal
        </button>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      <section className={`min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm ${mobileView === "actions" ? "flex" : "hidden"} lg:flex`} aria-labelledby="weekly-action-board-title">
        <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
          <div>
            <p className="eyebrow">Tablero semanal</p>
            <h2 id="weekly-action-board-title" className="mt-1 text-lg font-semibold text-slate-950">Ejecuta tu próxima acción</h2>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {actions.length} acciones
          </span>
        </div>

        {actions.length > 0 ? (
          <div className="min-h-0 space-y-4 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            {firstPendingAction && (
              <div>
                <p className="eyebrow mb-2 !text-blue-700">Ahora</p>
                <ul className="space-y-2">{renderCard(firstPendingAction)}</ul>
              </div>
            )}
            {laterActions.length > 0 && (
              <div>
                <p className="eyebrow mb-2">Después</p>
                <ul className="space-y-2">{laterActions.map(renderCard)}</ul>
              </div>
            )}
            {completedActions.length > 0 && (
              <div>
                <p className="eyebrow mb-2">Completadas</p>
                <ul className="space-y-2">{completedActions.map(renderCard)}</ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-base text-slate-600">
            Este plan todavía no tiene acciones disponibles.
          </div>
        )}
      </section>

      <div className={`${mobileView === "detail" ? "flex" : "hidden"} lg:flex lg:min-h-0`}>
        <ActionDetailPanel
          action={selectedAction}
          recommended={selectedAction?.id === firstPendingAction?.id}
          reviewed={reviewed}
          review={review}
          canReview={canReview}
          nextWeekNumber={nextWeekNumber}
        />
      </div>
      </div>
    </div>
  );
}
