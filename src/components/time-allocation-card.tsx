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
    <section className="surface-card rounded-2xl px-4 py-4 sm:px-5" aria-labelledby="time-allocation-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="time-allocation-title" className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
          Tu tiempo esta semana
        </h2>
        <p className="text-xs font-semibold text-slate-700">{available_hours} h disponibles</p>
      </div>

      <div
        className="progress-track mt-3"
        role="img"
        aria-label={`${allocated_hours} h enfocadas de ${available_hours} h disponibles`}
      >
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-900">
        {allocated_hours} h enfocadas
        <span className="font-medium text-slate-500"> · {reserved_hours} h reservadas</span>
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{rationale}</p>
    </section>
  );
}
