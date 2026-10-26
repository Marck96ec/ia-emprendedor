import type { DashboardTimeAllocation } from "@/lib/dashboard-types";

type TimeAllocationCardProps = {
  timeAllocation: DashboardTimeAllocation;
};

export function TimeAllocationCard({ timeAllocation }: TimeAllocationCardProps) {
  const { available_hours, allocated_hours, reserved_hours, rationale } = timeAllocation;
  const percentage = available_hours > 0
    ? Math.min(100, Math.max(0, Math.round((allocated_hours / available_hours) * 100)))
    : 0;

  return (
    <section className="min-w-0 px-4 py-3" aria-labelledby="time-allocation-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="time-allocation-title" className="eyebrow">
          Tu tiempo esta semana
        </h2>
        <p className="text-sm font-medium text-slate-600">{available_hours} h disponibles</p>
      </div>

      <p className="mt-1 text-base font-semibold text-slate-950">
        {allocated_hours} h enfocadas
        <span className="font-medium text-slate-600"> · {reserved_hours} h reservadas</span>
      </p>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="img"
        aria-label={`${allocated_hours} h enfocadas de ${available_hours} h disponibles`}
      >
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
      </div>
      <p title={rationale} className="mt-1.5 hidden text-sm leading-5 text-slate-600 sm:block cockpit:short:hidden cockpit:truncate">{rationale}</p>
      <details className="mt-1 sm:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4">¿Por qué este tiempo?</summary>
        <p className="pb-2 text-sm leading-5 text-slate-600">{rationale}</p>
      </details>
    </section>
  );
}
