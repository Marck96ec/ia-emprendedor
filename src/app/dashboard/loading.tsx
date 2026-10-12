export default function DashboardLoading() {
  return (
    <main className="ambient-shell min-h-screen px-4 py-4 sm:px-6 lg:h-dvh lg:overflow-hidden lg:px-8">
      <div className="mx-auto flex h-full max-w-[1240px] flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="space-y-2">
            <div className="h-2 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="h-20 shrink-0 animate-pulse rounded-2xl bg-white/70" />
        <div className="h-16 shrink-0 animate-pulse rounded-2xl bg-white/70" />
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-h-0 animate-pulse rounded-2xl bg-white/70" />
          <div className="min-h-0 animate-pulse rounded-2xl bg-white/70" />
        </div>
      </div>
    </main>
  );
}
