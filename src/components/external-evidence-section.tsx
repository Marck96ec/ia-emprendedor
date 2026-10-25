import type { ExternalEvidence } from "@/lib/ai/external-evidence";

type EvidenceStatus = "pending" | "ready" | "insufficient" | "failed";

type ExternalEvidenceSectionProps = {
  status: EvidenceStatus;
  evidence: ExternalEvidence | null;
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
}: ExternalEvidenceSectionProps) {
  const itemCount = evidence?.items.length ?? 0;

  return (
    <section className="surface-card rounded-2xl px-4 py-4 sm:px-5" aria-labelledby="external-evidence-title">
      <h2 id="external-evidence-title" className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
        Evidencia externa
      </h2>

      {status === "pending" && <p className="mt-2 text-sm text-slate-600">La investigación externa todavía está en curso.</p>}
      {status === "failed" && <p className="mt-2 text-sm text-slate-600">No pudimos completar la investigación externa. Tu decisión y tu plan siguen disponibles.</p>}
      {status === "insufficient" && <p className="mt-2 text-sm text-slate-600">No se encontró evidencia suficientemente comparable para apoyar o cuestionar esta decisión.</p>}

      {status === "ready" && evidence && (
        <>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {itemCount} {itemCount === 1 ? "fuente encontrada" : "fuentes encontradas"}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-700">{evidenceHeadline(evidence)}</p>

          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-700">¿Encontramos evidencia en contra?</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{counterEvidenceMessage(evidence)}</p>
          </div>

          <details className="group mt-3">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus-visible:outline-3 focus-visible:outline-blue-500/30">
              <span className="group-open:hidden">Ver evidencia</span>
              <span className="hidden group-open:inline">Ocultar evidencia</span>
            </summary>

            <p className="mt-3 text-sm leading-6 text-slate-700">{evidence.synthesis}</p>
            {evidence.counter_evidence.searched && !evidence.counter_evidence.found && (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                <strong>Qué buscamos en contra:</strong> {evidence.counter_evidence.summary}
              </p>
            )}

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
          </details>
        </>
      )}
    </section>
  );
}

function evidenceHeadline(evidence: ExternalEvidence): string {
  const hasMixedOrChallenging = evidence.items.some(
    (item) => item.support_level !== "supports",
  );

  if (hasMixedOrChallenging) {
    return "La evidencia es mixta: apoya parte de la decisión y marca límites.";
  }

  return evidence.confidence === "high"
    ? "La evidencia es favorable."
    : "La evidencia es favorable pero no concluyente.";
}

function counterEvidenceMessage(evidence: ExternalEvidence): string {
  const { searched, found, summary } = evidence.counter_evidence;

  if (!searched) {
    return "No pudimos buscar evidencia en contra.";
  }

  return found
    ? `Sí. ${summary}`
    : "No encontramos evidencia suficientemente comparable que contradiga esta dirección.";
}