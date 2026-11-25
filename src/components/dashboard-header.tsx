import { logout } from "@/actions/auth";
import { CommandCenterIcon } from "@/components/command-center-icon";

type DashboardHeaderProps = {
  businessName: string;
  weekNumber: number | null;
  email: string | null;
};

export function DashboardHeader({ businessName, weekNumber, email }: DashboardHeaderProps) {
  return (
    <header className="relative z-10 flex min-h-14 items-center justify-between gap-3 px-0.5 py-1.5 sm:min-h-16">
      <div className="min-w-0">
        <p className="command-kicker text-slate-600">TuCEO IA</p>
        <h1 title={businessName} className="truncate text-lg leading-tight font-semibold tracking-tight text-[var(--executive-blue)] sm:text-2xl">
          {businessName}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {weekNumber !== null && (
          <p className="text-xs font-medium text-slate-600 sm:text-sm">Semana {weekNumber}</p>
        )}
        <details className="relative">
          <summary aria-label="Mi cuenta" className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-[var(--executive-blue)] hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
            <CommandCenterIcon name="account" className="size-5" />
          </summary>
          <div className="command-card absolute right-0 top-[calc(100%+0.4rem)] w-60 p-3">
            {email && <p className="text-sm text-slate-700">{email}</p>}
            <form action={logout}>
              <button type="submit" className="command-link w-full">Cerrar sesión</button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
