"use client";

import { useRef } from "react";

import type {
  DashboardPriority,
  DashboardStrategicDiagnosis,
} from "@/lib/dashboard-types";

type ExecutiveContextDialogProps = {
  summary: string;
  strategicDiagnosis: DashboardStrategicDiagnosis;
  priorities: DashboardPriority[];
};

export function ExecutiveContextDialog({
  summary,
  strategicDiagnosis,
  priorities,
}: ExecutiveContextDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 focus-visible:outline-3 focus-visible:outline-blue-500/30"
      >
        Entender el foco
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="executive-context-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                Contexto de la semana
              </p>
              <h2 id="executive-context-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                Decisión y prioridades
              </h2>
            </div>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Cerrar contexto"
                className="secondary-button min-h-9 rounded-lg px-3 py-1.5 text-xs"
              >
                Cerrar
              </button>
            </form>
          </header>

          <div className="min-h-0 overflow-y-auto px-4 py-4 text-sm sm:px-6 sm:py-5">
            <section>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                Resumen completo
              </p>
              <p className="mt-2 leading-6 text-slate-700">{summary}</p>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                Diagnóstico
              </p>
              <p className="mt-2 leading-6 text-slate-700">{strategicDiagnosis.diagnosis.summary}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                Área afectada: {strategicDiagnosis.diagnosis.affected_area}
              </p>
              <p className="mt-2 leading-6 text-slate-600">{strategicDiagnosis.diagnosis.why_it_matters}</p>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                Cuello de botella
              </p>
              <p className="mt-2 font-medium leading-6 text-slate-700">{strategicDiagnosis.bottleneck.description}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {strategicDiagnosis.bottleneck.area} · Métrica: {strategicDiagnosis.bottleneck.affected_metric}
              </p>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                Confianza
              </p>
              <p className="mt-2 leading-6 text-slate-700">{strategicDiagnosis.confidence}</p>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                Decisión crítica
              </p>
              <p className="mt-2 font-medium leading-6 text-slate-700">{strategicDiagnosis.critical_decision.question}</p>
              <p className="mt-2 leading-6 text-slate-700">{strategicDiagnosis.critical_decision.recommended_direction}</p>
              <p className="mt-1 leading-6 text-slate-600">{strategicDiagnosis.critical_decision.rationale}</p>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                Prioridades
              </p>
              <ol className="mt-3 grid gap-3 lg:grid-cols-3">
                {priorities
                  .slice()
                  .sort((first, second) => first.rank - second.rank)
                  .map((priority) => (
                    <li key={priority.rank} className="rounded-xl bg-slate-50 p-3">
                      <p className="font-semibold text-slate-900">
                        {priority.rank}. {priority.title}
                      </p>
                      <p className="mt-1 leading-5 text-slate-600">{priority.reason}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Impacto esperado: {priority.expected_impact}
                      </p>
                    </li>
                  ))}
              </ol>
            </section>
          </div>
        </div>
      </dialog>
    </>
  );
}
