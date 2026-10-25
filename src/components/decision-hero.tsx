import { ExecutiveContextDialog } from "@/components/executive-context-dialog";
import type {
  DashboardPriority,
  DashboardStrategicDiagnosis,
} from "@/lib/dashboard-types";

type DecisionHeroProps = {
  summary: string;
  strategicDiagnosis: DashboardStrategicDiagnosis;
  priorities: DashboardPriority[];
};

export function DecisionHero({
  summary,
  strategicDiagnosis,
  priorities,
}: DecisionHeroProps) {
  const decision = strategicDiagnosis.critical_decision;

  return (
    <section
      className="relative flex flex-col overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/20 sm:p-6"
      aria-labelledby="decision-hero-title"
    >
      <p id="decision-hero-title" className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-sky-300">
        Tu decisión esta semana
      </p>
      <p className="mt-3 text-sm leading-5 text-slate-300">{decision.question}</p>
      <h2 className="mt-2 text-xl font-semibold leading-7 tracking-tight sm:text-2xl sm:leading-8">
        {decision.recommended_direction}
      </h2>

      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-400">¿Por qué?</p>
        <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-200">{decision.rationale}</p>
      </div>

      <div className="mt-4">
        <ExecutiveContextDialog
          summary={summary}
          strategicDiagnosis={strategicDiagnosis}
          priorities={priorities}
          triggerLabel="Entender la decisión"
          triggerClassName="inline-flex min-h-9 items-center rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-3 focus-visible:outline-sky-300/60"
        />
      </div>
    </section>
  );
}
