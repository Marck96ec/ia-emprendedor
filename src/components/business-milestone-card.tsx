import type { BusinessAssessment } from "@/lib/business-assessment";

type BusinessMilestoneCardProps = {
  assessment: BusinessAssessment;
};

export function BusinessMilestoneCard({
  assessment,
}: BusinessMilestoneCardProps) {
  return (
    <section
      className="rounded-2xl border border-dashed border-slate-300 bg-[var(--surface-neutral)] p-4"
      aria-labelledby="business-milestone-title"
    >
      <p className="eyebrow">Capacidad empresarial</p>
      <h2
        id="business-milestone-title"
        className="mt-1 text-base font-semibold text-slate-950"
      >
        Próximo hito empresarial
      </h2>
      <p className="mt-2 text-sm leading-5 text-slate-700">
        Todavía no hay un catálogo de hitos con condiciones verificables.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Mostraremos un hito cuando sus condiciones estén definidas y respaldadas
        por evidencia. Por ahora hay {assessment.evidenceSummary.documented}{" "}
        registros persistidos, sin convertirlos en progreso ficticio.
      </p>
    </section>
  );
}
