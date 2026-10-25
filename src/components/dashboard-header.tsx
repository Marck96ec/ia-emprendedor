import Link from "next/link";
import type { ReactNode } from "react";

import { logout } from "@/actions/auth";

type DashboardHeaderProps = {
  businessName: string;
  weekNumber: number | null;
  children?: ReactNode;
};

export function DashboardHeader({
  businessName,
  weekNumber,
  children,
}: DashboardHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-200/80 pb-2">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="eyebrow hidden sm:block">TuCEO IA</p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            {businessName}
          </h1>
          {weekNumber !== null && (
            <span className="shrink-0 text-sm font-medium text-slate-600">
              Semana {weekNumber}
            </span>
          )}
        </div>
        {weekNumber === 1 && (
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600 lg:hidden">
            CEO IA analiza tu negocio, identifica qué merece atención y te ayuda a decidir dónde invertir tu tiempo.
          </p>
        )}
        {children}
      </div>

      <nav aria-label="Navegación del dashboard" className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <Link href="/history" aria-label="Ver mi evolución y semanas anteriores" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-900/5 hover:text-slate-950">
          Mi evolución
        </Link>
        <form action={logout}>
          <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-900/5 hover:text-slate-950">
            Cerrar sesión
          </button>
        </form>
      </nav>
    </header>
  );
}
