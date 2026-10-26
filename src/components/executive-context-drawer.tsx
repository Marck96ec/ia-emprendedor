"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import type {
  DashboardPriority,
  DashboardStrategicDiagnosis,
} from "@/lib/dashboard-types";

export type DrawerTab = "decision" | "focus" | "priorities" | "evidence";

const tabLabels: Record<DrawerTab, string> = {
  decision: "Decisión",
  focus: "Foco",
  priorities: "Prioridades",
  evidence: "Evidencia",
};

type ExecutiveContextDrawerProps = {
  tab: DrawerTab | null;
  onTabChange: (tab: DrawerTab) => void;
  onClose: () => void;
  summary: string;
  strategicDiagnosis: DashboardStrategicDiagnosis;
  priorities: DashboardPriority[];
  focusPanel: ReactNode;
  evidencePanel: ReactNode;
};

const certaintyLabels = {
  low: "Exploratoria",
  medium: "Media",
  high: "Alta",
} as const;

const affectedAreaLabels: Record<
  DashboardStrategicDiagnosis["diagnosis"]["affected_area"],
  string
> = {
  demand: "Demanda",
  conversion: "Conversión",
  retention: "Retención",
  revenue: "Ingresos",
  cashflow: "Flujo de caja",
  margin: "Margen",
  capacity: "Capacidad",
  operations: "Operación",
  positioning: "Posicionamiento",
  execution: "Ejecución",
  owner_dependency: "Dependencia del dueño",
  unknown: "Por definir",
};

export function ExecutiveContextDrawer({
  tab,
  onTabChange,
  onClose,
  summary,
  strategicDiagnosis,
  priorities,
  focusPanel,
  evidencePanel,
}: ExecutiveContextDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (tab !== null && !dialog.open) dialog.showModal();
    if (tab === null && dialog.open) dialog.close();
  }, [tab]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="drawer m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl overflow-hidden border-l border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm sm:rounded-l-2xl"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-slate-200 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Contexto de la semana</p>
              <h2 id={titleId} className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                ¿Por qué esta decisión?
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar contexto"
              className="secondary-button min-h-11 rounded-lg px-4 py-1.5 text-sm"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-0.5 sm:flex sm:gap-1" role="tablist" aria-label="Contexto de la decisión">
            {(Object.keys(tabLabels) as DrawerTab[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => onTabChange(key)}
                className={`min-h-11 min-w-0 border-b-2 px-1 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none sm:shrink-0 sm:px-3 ${
                  tab === key ? "border-blue-600 text-slate-950" : "border-transparent text-slate-600 hover:text-slate-950"
                }`}
              >
                {key === "focus" ? (
                  <>
                    <span className="sm:hidden">Foco</span>
                    <span className="hidden sm:inline">{tabLabels[key]}</span>
                  </>
                ) : (
                  tabLabels[key]
                )}
              </button>
            ))}
          </div>
        </header>

        <div key={tab ?? "closed"} className="anim-rise thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-sm sm:px-5" role="tabpanel">
          {tab === "decision" && (
            <>
              <section>
                <p className="eyebrow">Decisión de esta semana</p>
                <p className="mt-2 text-base font-medium leading-6 text-slate-900">{strategicDiagnosis.critical_decision.question}</p>
                <p className="mt-2 leading-6 text-slate-700">{strategicDiagnosis.critical_decision.recommended_direction}</p>
                <p className="mt-1 leading-6 text-slate-600">{strategicDiagnosis.critical_decision.rationale}</p>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  Métrica que observaremos: {strategicDiagnosis.critical_decision.target_metric}
                </p>
              </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="eyebrow">
                Resumen completo
              </p>
              <p className="mt-2 leading-6 text-slate-700">{summary}</p>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="eyebrow">
                Diagnóstico
              </p>
              <p className="mt-2 leading-6 text-slate-700">{strategicDiagnosis.diagnosis.summary}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                Área afectada: {affectedAreaLabels[strategicDiagnosis.diagnosis.affected_area]}
              </p>
              <p className="mt-2 leading-6 text-slate-600">{strategicDiagnosis.diagnosis.why_it_matters}</p>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="eyebrow">
                Principal restricción
              </p>
              <p className="mt-2 font-medium leading-6 text-slate-700">{strategicDiagnosis.bottleneck.description}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {strategicDiagnosis.bottleneck.area} · Métrica: {strategicDiagnosis.bottleneck.affected_metric}
              </p>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-4">
              <p className="eyebrow">
                Nivel de certeza
              </p>
              <p className="mt-2 leading-6 text-slate-700">{certaintyLabels[strategicDiagnosis.confidence]}</p>
              {strategicDiagnosis.unknowns.length > 0 && (
                <>
                  <p className="eyebrow mt-4">
                    Lo que todavía necesitamos aprender
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 leading-6 text-slate-600">
                    {strategicDiagnosis.unknowns.map((unknown) => (
                      <li key={unknown}>{unknown}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
            </>
          )}

          {tab === "focus" && focusPanel}

          {tab === "priorities" && (
            <section>
              <p className="eyebrow">Prioridades de la semana</p>
              <ol className="mt-3 space-y-3">
                {priorities
                  .slice()
                  .sort((first, second) => first.rank - second.rank)
                  .map((priority) => (
                    <li key={priority.rank} className="rounded-xl bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">
                        {priority.rank}. {priority.title}
                      </p>
                      <p className="mt-1 leading-5 text-slate-700">{priority.reason}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-600">
                        Impacto esperado: {priority.expected_impact}
                      </p>
                    </li>
                  ))}
              </ol>
            </section>
          )}

          {tab === "evidence" && evidencePanel}
        </div>
      </div>
    </dialog>
  );
}
