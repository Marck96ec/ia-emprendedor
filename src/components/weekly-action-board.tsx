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
  const [mobileView, setMobileView] = useState<"actions" | "detail">("actions");
  const [selectedActionId, setSelectedActionId] = useState(
    firstPendingAction?.id ?? actions[0]?.id ?? "",
  );

  const selectedAction = actions.find((action) => action.id === selectedActionId) ?? null;
  const activeActionId = selectedAction?.id ?? actions.find((action) => action.status === "pending")?.id ?? actions[0]?.id ?? "";
  const canReview = actions.length > 0 && !reviewed;

  function selectAction(actionId: string) {
    setSelectedActionId(actionId);
    setMobileView("detail");
  }

  return (
    <div id="tablero-semanal" className="flex scroll-mt-4 flex-col gap-2">
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 lg:hidden" role="tablist" aria-label="Navegación semanal">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "actions"}
          onClick={() => setMobileView("actions")}
          className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mobileView === "actions" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Plan semanal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "detail"}
          onClick={() => setMobileView("detail")}
          className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mobileView === "detail" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Detalle de la acción
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(21rem,0.9fr)]">
      <section className={`surface-card flex-col rounded-2xl p-3 sm:p-4 ${mobileView === "actions" ? "flex" : "hidden"} lg:flex`} aria-labelledby="weekly-action-board-title">
        <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">Tablero semanal</p>
            <h2 id="weekly-action-board-title" className="mt-1 text-base font-semibold text-slate-950">Ejecuta tu próxima acción</h2>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600">
            {actions.length} acciones
          </span>
        </div>

        {actions.length > 0 ? (
          <div className="grid content-start grid-cols-1 gap-2 sm:grid-cols-2">
            {actions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                selected={action.id === activeActionId}
                recommended={action.id === firstPendingAction?.id}
                onSelect={() => selectAction(action.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Este plan todavía no tiene acciones disponibles.
          </div>
        )}
      </section>

      <div className={`${mobileView === "detail" ? "flex" : "hidden"} lg:flex`}>
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
