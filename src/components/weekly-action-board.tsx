"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    function focusActionFromHash() {
      const actionId = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("action");
      if (!actionId || !actions.some((action) => action.id === actionId)) return;

      setSelectedActionId(actionId);
      setMobileView("detail");
      document.getElementById("tablero-semanal")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    focusActionFromHash();
    window.addEventListener("hashchange", focusActionFromHash);
    return () => window.removeEventListener("hashchange", focusActionFromHash);
  }, [actions]);

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
    <div id="tablero-semanal" className="flex scroll-mt-4 flex-col gap-3 cockpit:min-h-0 cockpit:flex-1">
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 cockpit:hidden" role="tablist" aria-label="Navegación semanal">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "actions"}
          onClick={() => setMobileView("actions")}
          className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mobileView === "actions" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Plan semanal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "detail"}
          onClick={() => setMobileView("detail")}
          className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mobileView === "detail" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Acción actual
        </button>
      </div>

      <div className="grid gap-4 cockpit:min-h-0 cockpit:flex-1 cockpit:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] cockpit:grid-rows-[minmax(0,1fr)]">
      <section className={`min-h-0 flex-col rounded-2xl bg-white/70 p-3 sm:border sm:border-slate-200 sm:bg-white/80 sm:p-4 sm:shadow-sm ${mobileView === "actions" ? "flex" : "hidden"} cockpit:flex`} aria-labelledby="weekly-action-board-title">
        <div className="flex shrink-0 items-center justify-between gap-3 pb-2">
          <div>
            <p className="eyebrow hidden sm:block cockpit:short:hidden">Tablero semanal</p>
            <h2 id="weekly-action-board-title" className="text-lg font-semibold text-slate-950 sm:mt-1 cockpit:short:mt-0">Ejecuta tu próxima acción</h2>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-0.5 text-sm font-medium text-slate-700">
            {actions.length} acciones
          </span>
        </div>

        {actions.length > 0 ? (
          <div className="thin-scroll min-h-0 space-y-3 cockpit:flex-1 cockpit:overflow-y-auto cockpit:pr-1">
            {firstPendingAction && (
              <div>
                <p className="eyebrow mb-1.5 !text-blue-700 cockpit:compact:hidden">Ahora</p>
                <ul className="space-y-1.5">{renderCard(firstPendingAction)}</ul>
              </div>
            )}
            {laterActions.length > 0 && (
              <div>
                <p className="eyebrow mb-1.5 cockpit:compact:hidden">Después</p>
                <ul className="space-y-1.5">{laterActions.map(renderCard)}</ul>
              </div>
            )}
            {completedActions.length > 0 && (
              <div>
                <p className="eyebrow mb-1.5 cockpit:compact:hidden">Completadas</p>
                <ul className="space-y-1.5">{completedActions.map(renderCard)}</ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-base text-slate-600">
            Este plan todavía no tiene acciones disponibles.
          </div>
        )}
      </section>

      <div className={`${mobileView === "detail" ? "flex" : "hidden"} flex-col gap-2 cockpit:flex cockpit:min-h-0`}>
        <button
          type="button"
          onClick={() => setMobileView("actions")}
          className="inline-flex min-h-11 w-fit items-center rounded-lg px-2 text-sm font-medium text-slate-700 hover:bg-slate-900/5 cockpit:hidden"
        >
          ← Volver al plan
        </button>
        <ActionDetailPanel
          action={selectedAction}
          recommended={selectedAction?.id === firstPendingAction?.id}
          reviewed={reviewed}
          review={review}
          canReview={canReview}
          weekComplete={actions.length > 0 && completedActions.length === actions.length}
          nextWeekNumber={nextWeekNumber}
        />
      </div>
      </div>
    </div>
  );
}
