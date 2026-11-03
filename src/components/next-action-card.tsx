"use client";

import Link from "next/link";

import type { DashboardAction } from "@/lib/dashboard-types";

type NextActionCardProps = {
  action: DashboardAction | null;
  pendingCount: number;
  reviewed: boolean;
  allCompleted: boolean;
};

const cardClassName =
  "flex flex-col rounded-2xl border border-blue-200 bg-white p-4 shadow-sm ring-1 ring-blue-100 sm:p-5 cockpit:h-full cockpit:min-h-0 cockpit:short:p-3.5";

const celebrationClassName =
  "anim-rise anim-glow flex flex-col rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5 cockpit:h-full cockpit:min-h-0 cockpit:short:p-3.5";

function CheckBadge() {
  return (
    <span className="anim-pop flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-xl text-white" aria-hidden="true">
      ✓
    </span>
  );
}

export function NextActionCard({
  action,
  pendingCount,
  reviewed,
  allCompleted,
}: NextActionCardProps) {
  if (!action) {
    return (
      <section className={reviewed || allCompleted ? celebrationClassName : cardClassName} aria-labelledby="next-action-title">
        {(reviewed || allCompleted) && <CheckBadge />}
        <p id="next-action-title" className={`eyebrow ${reviewed || allCompleted ? "mt-3 !text-emerald-700" : "!text-blue-700"}`}>
          {reviewed ? "Revisión completada" : allCompleted ? "Semana completada" : "Siguiente paso"}
        </p>
        <h2 className="mt-2 text-xl font-semibold leading-snug text-slate-950">
          {reviewed
            ? "Tu aprendizaje ya es parte de la memoria del negocio."
            : allCompleted
              ? "Plan ejecutado."
              : "Todavía no hay acciones para esta semana."}
        </h2>
        {allCompleted && !reviewed && (
          <p className="mt-2 text-base leading-6 text-slate-700">
            Ahora viene la parte más importante: descubrir qué funcionó y qué cambió realmente.
          </p>
        )}
        <div className="mt-4 cockpit:mt-auto cockpit:pt-3">
          {reviewed ? (
            <a href="#tablero-semanal" className="secondary-button min-h-11 px-5 py-2.5 text-sm">
              Ver resultado de la semana
            </a>
          ) : allCompleted ? (
            <Link href="/weekly-review" className="accent-button min-h-11 w-full px-5 py-2.5 text-base sm:w-auto">
              Revisar mi semana
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
        <p id="next-action-title" className="eyebrow !text-blue-700">
          {pendingCount === 1 ? "Última acción de la semana" : "Siguiente paso"}
        </p>
        {isAiAssisted && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            Con ayuda de IA
          </span>
        )}
      </div>

      <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-slate-950">
        {action.action}
      </h2>

      <p className="mt-2 hidden line-clamp-2 text-base leading-6 text-slate-700 sm:block cockpit:short:hidden">{action.reason}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 cockpit:mt-auto cockpit:pt-3">
        {isAiAssisted ? (
          <Link href={`/actions/${action.id}`} className="accent-button order-2 min-h-11 w-full px-5 py-2 text-base sm:order-1 sm:w-auto cockpit:min-h-10">
            {ctaLabel}
          </Link>
        ) : (
          <a href={`#tablero-semanal?action=${action.id}`} className="accent-button order-2 min-h-11 w-full px-5 py-2 text-base sm:order-1 sm:w-auto cockpit:min-h-10">
            {ctaLabel}
          </a>
        )}
        <p className="order-1 inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-0.5 text-sm font-medium text-slate-700 sm:order-2">
          {action.role_recommendation === "defer"
            ? "No requiere tu tiempo esta semana"
            : `Tiempo estimado: ${action.estimated_hours} h`}
        </p>
      </div>
    </section>
  );
}
