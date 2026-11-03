import type { StoredExternalEvidence } from "@/lib/ai/external-evidence";

type EvidenceStatus = "pending" | "ready" | "insufficient" | "failed";

type ExternalEvidenceSectionProps = {
  status: EvidenceStatus;
  evidence: StoredExternalEvidence | null;
};

const supportLabels = {
  supports: "Apoya",
  mixed: "Mixta",
  challenges: "Cuestiona",
} as const;

const supportChipClasses = {
  supports: "bg-blue-50 text-blue-800",
  mixed: "bg-amber-50 text-amber-800",
  challenges: "bg-slate-100 text-slate-700 ring-1 ring-slate-300",
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
    <section aria-labelledby="external-evidence-title">
      <h2 id="external-evidence-title" className="eyebrow">
        Evidencia externa
      </h2>

      {status === "pending" && <p className="mt-2 text-base text-slate-700">La investigación externa todavía está en curso.</p>}
      {status === "failed" && <p className="mt-2 text-base text-slate-700">No pudimos completar la investigación externa. Tu decisión y tu plan siguen disponibles.</p>}
      {status === "insufficient" && <p className="mt-2 text-base text-slate-700">No se encontró evidencia suficientemente comparable para apoyar o cuestionar esta decisión.</p>}

      {status === "ready" && evidence && (
        <>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {itemCount} {itemCount === 1 ? "fuente" : "fuentes"}
          </p>
          <p className="mt-1 text-base leading-6 text-slate-700">{evidenceHeadline(evidence)}</p>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">Buscamos también evidencia en contra.</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{counterEvidenceMessage(evidence)}</p>
          </div>

          <div>
              <p className="mt-4 text-base leading-6 text-slate-700">{evidence.synthesis}</p>
              {evidence.counter_evidence?.searched && !evidence.counter_evidence.found && (
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  <span className="font-medium text-slate-800">Qué buscamos en contra:</span> {evidence.counter_evidence.summary}
                </p>
              )}

              <div className="mt-4 space-y-3">
                {evidence.items.map((item) => (
                  <article key={item.source_url} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-600">
                        <span className="font-semibold text-slate-900">{item.source_name}</span> · {evidenceTypeLabels[item.evidence_type]}
                      </p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${supportChipClasses[item.support_level]}`}>{supportLabels[item.support_level]}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold leading-6 text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-700">{item.claim}</p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 focus-visible:outline-3 focus-visible:outline-blue-500/30">Relevancia y límites</summary>
                      <p className="mt-2 text-sm leading-5 text-slate-700"><span className="font-medium text-slate-900">Por qué importa:</span> {item.relevance}</p>
                      <p className="mt-2 text-sm leading-5 text-slate-600"><span className="font-medium text-slate-800">Limitación:</span> {item.limitations}</p>
                    </details>
                    <a className="mt-3 inline-flex text-sm font-semibold text-blue-700 underline underline-offset-2" href={item.source_url} target="_blank" rel="noopener noreferrer">Ver fuente</a>
                  </article>
                ))}
              </div>
          </div>
        </>
      )}
    </section>
  );
}

export function summarizeEvidence(
  status: EvidenceStatus,
  evidence: StoredExternalEvidence | null,
): string {
  if (status === "pending") return "En curso";
  if (status === "failed") return "No disponible";
  if (status !== "ready" || !evidence) return "Sin fuentes comparables";

  const count = evidence.items.length;
  const verdict = evidence.items.some((item) => item.support_level !== "supports")
    ? "Mixta"
    : evidence.confidence === "high"
      ? "Favorable"
      : "Favorable con límites";

  return `${count} ${count === 1 ? "fuente" : "fuentes"} · ${verdict}`;
}

function evidenceHeadline(evidence: StoredExternalEvidence): string {
  const hasMixedOrChallenging = evidence.items.some(
    (item) => item.support_level !== "supports",
  );

  if (hasMixedOrChallenging) {
    return "La evidencia es mixta: apoya parte de la decisión y marca límites.";
  }

  return evidence.confidence === "high"
    ? "La evidencia respalda esta dirección."
    : "La evidencia respalda parcialmente esta dirección.";
}

function counterEvidenceMessage(evidence: StoredExternalEvidence): string {
  if (!evidence.counter_evidence) {
    return "Este análisis se generó antes de registrar la búsqueda de evidencia en contra.";
  }

  const { searched, found, summary } = evidence.counter_evidence;

  if (!searched) {
    return "No pudimos buscar evidencia en contra.";
  }

  return found
    ? `Encontramos una limitación importante. ${summary}`
    : "No encontramos un caso suficientemente comparable que contradiga esta dirección.";
}