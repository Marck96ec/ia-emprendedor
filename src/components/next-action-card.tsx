import Link from "next/link";

import type { DashboardAction } from "@/lib/dashboard-types";

type NextActionCardProps = {
  action: DashboardAction | null;
  reviewed: boolean;
  allCompleted: boolean;
};

const cardClassName =
  "flex flex-col rounded-2xl border-2 border-sky-300 bg-white p-5 shadow-xl shadow-sky-900/10 sm:p-6";

export function NextActionCard({
  action,
  reviewed,
  allCompleted,
}: NextActionCardProps) {
  if (!action) {
    return (
      <section className={cardClassName} aria-labelledby="next-action-title">
        <p id="next-action-title" className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-sky-700">
          Qué hacer ahora
        </p>
        <h2 className="mt-3 text-lg font-semibold leading-6 text-slate-950">
          {reviewed
            ? "Esta semana ya fue revisada."
            : allCompleted
              ? "Completaste todas las acciones de la semana."
              : "Todavía no hay acciones para esta semana."}
        </h2>
        <div className="mt-4">
          {reviewed ? (
            <a href="#tablero-semanal" className="secondary-button min-h-10 px-4 py-2 text-sm">
              Ver resultado de la semana
            </a>
          ) : allCompleted ? (
            <Link href="/weekly-review" className="primary-button min-h-10 px-4 py-2 text-sm">
              Veamos qué funcionó esta semana
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  const hasResult = (action.action_results?.length ?? 0) > 0;
  const isAiAssisted = action.execution_mode === "ai_assisted";
  const ctaLabel = isAiAssisted && hasResult ? "Ver lo que logramos" : "Empezar esta acción";

  return (
    <section className={cardClassName} aria-labelledby="next-action-title">
      <div className="flex items-center justify-between gap-3">
        <p id="next-action-title" className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-sky-700">
          Qué hacer ahora
        </p>
        {isAiAssisted && (
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-600">
            Con IA
          </span>
        )}
      </div>

      <h2 className="mt-3 text-xl font-semibold leading-7 tracking-tight text-slate-950">
        {action.action}
      </h2>

      <p className="mt-2 text-xs font-medium text-slate-500">
        {action.role_recommendation === "defer"
          ? "No requiere tu tiempo esta semana"
          : `Tiempo estimado: ${action.estimated_hours} h`}
      </p>

      <div className="mt-4">
        {isAiAssisted ? (
          <Link href={`/actions/${action.id}`} className="primary-button min-h-11 w-full px-4 py-2.5 text-sm sm:w-auto">
            {ctaLabel}
          </Link>
        ) : (
          <a href="#tablero-semanal" className="primary-button min-h-11 w-full px-4 py-2.5 text-sm sm:w-auto">
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}
