export default function DashboardLoading() {
  return (
    <div className="command-shell">
      <div aria-hidden="true" className="command-card hidden min-[1100px]:block" />
      <main aria-busy="true" className="min-w-0 space-y-3">
        <p role="status" className="sr-only">Cargando centro de dirección…</p>
        <div aria-hidden="true" className="min-h-14 py-4 sm:min-h-16">
          <div className="h-7 w-44 rounded-lg bg-slate-200 motion-safe:animate-pulse" />
        </div>
        <div className="command-grid" aria-hidden="true">
          <div className="command-stack command-stack--execution motion-safe:animate-pulse">
            <div className="h-44 rounded-2xl bg-[var(--executive-blue-soft)]" />
            <div className="command-card h-80" />
          </div>
          <div className="command-stack command-stack--business motion-safe:animate-pulse">
            <div className="command-card h-48" />
            <div className="command-card h-56" />
          </div>
        </div>
      </main>
    </div>
  );
}
