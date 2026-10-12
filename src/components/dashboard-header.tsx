import Link from "next/link";

import { logout } from "@/actions/auth";

type DashboardHeaderProps = {
  businessName: string;
  weekNumber: number | null;
};

export function DashboardHeader({
  businessName,
  weekNumber,
}: DashboardHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
      <div className="min-w-0">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">
          TuCEO IA
        </p>
        <div className="mt-1 flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            {businessName}
          </h1>
          {weekNumber !== null && (
            <span className="shrink-0 text-xs font-medium text-slate-500">
              Semana {weekNumber}
            </span>
          )}
        </div>
      </div>

      <nav aria-label="Navegación del dashboard" className="flex shrink-0 items-center gap-2">
        <Link href="/history" aria-label="Ver semanas anteriores" className="secondary-button min-h-9 rounded-lg px-3 py-1.5 text-xs">
          Semanas anteriores
        </Link>
        <form action={logout}>
          <button type="submit" className="secondary-button min-h-9 rounded-lg px-3 py-1.5 text-xs">
            Cerrar sesión
          </button>
        </form>
      </nav>
    </header>
  );
}
