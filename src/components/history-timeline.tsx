"use client";

import { useState } from "react";

export type HistoryWeek = {
  id: string;
  weekNumber: number;
  status: "generating" | "ready" | "failed";
  executiveSummary: string | null;
  generatedAt: string | null;
  completedActions: number;
  totalActions: number;
  review: {
    whatWorked: string;
    whatDidntWork: string;
    businessChanges: string;
    nextWeekFocus: string | null;
    outcomeStatus: "positive" | "mixed" | "no_change" | "negative";
    outcomeSummary: string;
  } | null;
};

type HistoryTimelineProps = {
  weeks: HistoryWeek[];
};

const outcomeLabels = {
  positive: "Hubo avance",
  mixed: "Avance parcial",
  no_change: "Sin cambio claro",
  negative: "Hubo retroceso",
} as const;

function statusLabel(status: HistoryWeek["status"]) {
  return status === "ready" ? "Lista" : status === "failed" ? "Falló" : "Generando";
}

function statusClass(status: HistoryWeek["status"]) {
  return status === "ready"
    ? "bg-emerald-50 text-emerald-700"
    : status === "failed"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";
}

export function HistoryTimeline({ weeks }: HistoryTimelineProps) {
  const [selectedWeekId, setSelectedWeekId] = useState(weeks[0]?.id ?? "");
  const [mobileView, setMobileView] = useState<"weeks" | "detail">("weeks");
  const selectedWeek = weeks.find((week) => week.id === selectedWeekId) ?? weeks[0] ?? null;

  function selectWeek(weekId: string) {
    setSelectedWeekId(weekId);
    setMobileView("detail");
  }

  if (!selectedWeek) {
    return null;
  }

  const progress = selectedWeek.totalActions === 0
    ? 0
    : Math.round((selectedWeek.completedActions / selectedWeek.totalActions) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 lg:hidden" role="tablist" aria-label="Navegación del historial">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "weeks"}
          onClick={() => setMobileView("weeks")}
          className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mobileView === "weeks" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Semanas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "detail"}
          onClick={() => setMobileView("detail")}
          className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mobileView === "detail" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Detalle
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)]">
        <section className={`surface-card min-h-0 flex-col rounded-2xl p-3 sm:p-4 ${mobileView === "weeks" ? "flex" : "hidden"} lg:flex`} aria-labelledby="history-weeks-title">
          <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-3">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">Memoria del negocio</p>
              <h2 id="history-weeks-title" className="mt-1 text-base font-semibold text-slate-950">Tus semanas</h2>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600">
              {weeks.length} registradas
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {weeks.map((week) => {
              const weekProgress = week.totalActions === 0
                ? 0
                : Math.round((week.completedActions / week.totalActions) * 100);

              return (
                <button
                  key={week.id}
                  type="button"
                  aria-pressed={week.id === selectedWeek.id}
                  onClick={() => selectWeek(week.id)}
                  className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-3 focus-visible:outline-blue-500/30 ${week.id === selectedWeek.id ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15" : "border-slate-200 bg-white/80 hover:border-slate-400"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-xs font-bold uppercase tracking-[0.14em] ${week.id === selectedWeek.id ? "text-slate-300" : "text-slate-500"}`}>
                      Semana {week.weekNumber}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[0.62rem] font-semibold ${week.id === selectedWeek.id ? "bg-white/15 text-white" : statusClass(week.status)}`}>
                      {statusLabel(week.status)}
                    </span>
                  </div>
                  <p className={`mt-2 line-clamp-2 text-sm font-medium leading-5 ${week.id === selectedWeek.id ? "text-white" : "text-slate-800"}`}>
                    {week.executiveSummary ?? "Esta semana todavía no tiene un resumen disponible."}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={`text-xs ${week.id === selectedWeek.id ? "text-slate-300" : "text-slate-500"}`}>
                      {week.completedActions}/{week.totalActions} acciones
                    </span>
                    <div className={`h-1.5 w-20 overflow-hidden rounded-full ${week.id === selectedWeek.id ? "bg-white/20" : "bg-slate-200"}`}>
                      <div className={`h-full rounded-full ${week.id === selectedWeek.id ? "bg-white" : "bg-slate-900"}`} style={{ width: `${weekProgress}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`surface-card min-h-0 flex-col rounded-2xl p-4 sm:p-5 ${mobileView === "detail" ? "flex" : "hidden"} lg:flex`} aria-labelledby="history-detail-title">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 pb-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">Aprendizajes de la semana</p>
              <h2 id="history-detail-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                Semana {selectedWeek.weekNumber}
              </h2>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(selectedWeek.status)}`}>
              {statusLabel(selectedWeek.status)}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {selectedWeek.generatedAt && (
              <p className="mt-3 text-xs text-slate-500">
                Generada el {new Date(selectedWeek.generatedAt).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}

            {selectedWeek.executiveSummary && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Decisión de la semana</p>
                <p className="mt-1.5 text-sm leading-5 text-slate-700">{selectedWeek.executiveSummary}</p>
              </div>
            )}

            {selectedWeek.status === "ready" && (
              <>
                <div className="mt-4 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-700">Avance real</p>
                    <p className="text-sm font-semibold text-slate-950">{selectedWeek.completedActions}/{selectedWeek.totalActions}</p>
                  </div>
                  <div className="progress-track mt-2 h-2">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {selectedWeek.review ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-700">Resultado observado</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{outcomeLabels[selectedWeek.review.outcomeStatus]}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{selectedWeek.review.outcomeSummary}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <article className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Qué funcionó</p>
                        <p className="mt-1.5 text-sm leading-5 text-slate-700">{selectedWeek.review.whatWorked}</p>
                      </article>
                      <article className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Qué ajustar</p>
                        <p className="mt-1.5 text-sm leading-5 text-slate-700">{selectedWeek.review.whatDidntWork}</p>
                      </article>
                      <article className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Qué cambió</p>
                        <p className="mt-1.5 text-sm leading-5 text-slate-700">{selectedWeek.review.businessChanges}</p>
                      </article>
                      {selectedWeek.review.nextWeekFocus && (
                        <article className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">Próximo foco</p>
                          <p className="mt-1.5 text-sm leading-5 text-slate-700">{selectedWeek.review.nextWeekFocus}</p>
                        </article>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm leading-5 text-sky-700">
                    Esta semana todavía no tiene una revisión cerrada.
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
