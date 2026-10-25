import type { StrategicDiagnosis } from "@/lib/ai/ceo-agent";
import type { ExternalEvidence } from "@/lib/ai/external-evidence";

type EvidenceStatus = "pending" | "ready" | "insufficient" | "failed";

type ExternalEvidenceSectionProps = {
  status: EvidenceStatus;
  evidence: ExternalEvidence | null;
  decision: StrategicDiagnosis["critical_decision"];
};

const supportLabels = {
  supports: "Apoya",
  mixed: "Mixta",
  challenges: "Cuestiona",
} as const;

const evidenceTypeLabels = {
  case_study: "Caso",
  research: "Investigación",
  report: "Informe",
  news: "Noticia",
  official_source: "Fuente oficial",
  company_statement: "Declaración empresarial",
} as const;

export function ExternalEvidenceSection({
  status,
  evidence,
  decision,
}: ExternalEvidenceSectionProps) {
  return (
    <section className="surface-card shrink-0 rounded-2xl px-4 py-4 sm:px-5" aria-labelledby="external-evidence-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">Evidencia externa</p>
          <h2 id="external-evidence-title" className="mt-1 text-base font-semibold text-slate-950">Cómo se relaciona con tu decisión</h2>
        </div>
        {status === "ready" && evidence && <span className="badge-chip">{evidence.items.length} {evidence.items.length === 1 ? "fuente" : "fuentes"}</span>}
      </div>

      <p className="mt-3 text-sm font-medium leading-5 text-slate-800">{decision.question}</p>

      {status === "pending" && <p className="mt-3 text-sm text-slate-600">La investigación externa todavía está en curso.</p>}
      {status === "failed" && <p className="mt-3 text-sm text-slate-600">No pudimos completar la investigación externa. Tu decisión y tu plan siguen disponibles.</p>}
      {status === "insufficient" && <p className="mt-3 text-sm text-slate-600">No se encontró evidencia suficientemente comparable para apoyar o cuestionar esta decisión.</p>}

      {status === "ready" && evidence && (
        <>
          <p className="mt-3 text-sm leading-6 text-slate-700">{evidence.synthesis}</p>
          <div className="mt-4 space-y-3">
            {evidence.items.map((item) => (
              <article key={item.source_url} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.65rem] font-semibold text-slate-600">{supportLabels[item.support_level]}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.source_name} · {evidenceTypeLabels[item.evidence_type]}</p>
                <p className="mt-3 text-sm leading-5 text-slate-800">{item.claim}</p>
                <p className="mt-2 text-sm leading-5 text-slate-600"><strong>Por qué importa:</strong> {item.relevance}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500"><strong>Limitación:</strong> {item.limitations}</p>
                <a className="mt-3 inline-flex text-xs font-semibold text-blue-700 underline underline-offset-2" href={item.source_url} target="_blank" rel="noopener noreferrer">Ver fuente</a>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}