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
    <header className="flex shrink-0 items-start justify-between gap-x-4 border-b border-slate-200/80 pb-2">
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
          <p className="mt-1 hidden max-w-2xl text-sm leading-5 text-slate-600 md:block cockpit:hidden">
            CEO IA analiza tu negocio, identifica qué merece atención y te ayuda a decidir dónde invertir tu tiempo.
          </p>
        )}
        {children}
      </div>

      <nav aria-label="Navegación del dashboard" className="hidden shrink-0 items-center justify-end gap-1 sm:flex">
        <Link href="/history" aria-label="Ver mi evolución y semanas anteriores" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-900/5 hover:text-slate-950">
          Mi evolución
        </Link>
        <form action={logout}>
          <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-900/5 hover:text-slate-950">
            Cerrar sesión
          </button>
        </form>
      </nav>

      <details className="relative shrink-0 sm:hidden">
        <summary aria-label="Menú" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-xl text-slate-700 hover:bg-slate-900/5 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">⋯</span>
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <Link href="/history" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
            Mi evolución
          </Link>
          <form action={logout}>
            <button type="submit" className="flex min-h-11 w-full items-center rounded-lg px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
              Cerrar sesión
            </button>
          </form>
        </div>
      </details>
    </header>
  );
}
