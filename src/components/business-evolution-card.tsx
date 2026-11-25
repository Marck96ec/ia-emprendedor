"use client";

import { useRef } from "react";
import { CommandCenterIcon } from "@/components/command-center-icon";
import type {
  BusinessAssessment,
  BusinessAssessmentConfidence,
  BusinessHealthStatus,
} from "@/lib/business-assessment";

const confidenceLabels: Record<BusinessAssessmentConfidence, string> = {
  low: "baja",
  medium: "media",
  high: "alta",
};

const healthLabels: Record<BusinessHealthStatus, string> = {
  favorable: "favorable",
  fragile: "requiere atención",
  critical: "crítica",
  mixed: "mixta",
  unknown: "sin evaluar",
};

const healthColors: Record<BusinessHealthStatus, string> = {
  favorable: "bg-[var(--status-favorable)]",
  fragile: "bg-[var(--status-attention)]",
  critical: "bg-[var(--status-critical)]",
  mixed: "bg-[var(--status-attention)]",
  unknown: "bg-[var(--status-unevaluated)]",
};

function StageIndicator({ maturity }: { maturity: BusinessAssessment["maturity"] }) {
  const level = maturity.classification === "indeterminate" ? null : maturity.level;
  const caption = level === null
    ? "Sin etapa"
    : maturity.classification === "provisional" ? "Estimado" : "Etapa";

  return (
    <div className="relative size-24 shrink-0 sm:size-[6.25rem]" role="img" aria-label={level ? `${caption} ${level} de 5` : "Sin etapa establecida"}>
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <circle
            key={index}
            cx="50"
            cy="50"
            r="43"
            pathLength="100"
            fill="none"
            stroke={index + 1 === level
              ? maturity.classification === "confirmed" ? "var(--status-favorable)" : "var(--status-attention)"
              : "#dce4ed"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="15 85"
            transform={`rotate(${index * 72 - 117} 50 50)`}
          />
        ))}
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center text-[var(--executive-blue)]">
        <span className="text-xs leading-none font-semibold">{caption}</span>
        <span className="mt-1 text-[1.75rem] leading-none font-semibold tabular-nums">
          {level === null ? "–" : String(level).padStart(2, "0")}
        </span>
      </span>
    </div>
  );
}

export function BusinessEvolutionCard({ assessment }: { assessment: BusinessAssessment }) {
  const { maturity, health } = assessment;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stage = maturity.classification !== "indeterminate" && maturity.level !== null
    ? maturity.stageLabel
    : null;

  return (
    <>
      <section className="command-card p-4 sm:px-5" aria-labelledby="business-evolution-title">
        <h2 id="business-evolution-title" tabIndex={-1} className="text-base font-semibold tracking-tight text-[var(--executive-blue)]">
          Evolución empresarial
        </h2>
        <div className="mt-2.5 flex items-center gap-4">
          <StageIndicator maturity={maturity} />
          <div className="min-w-0">
            <p className="text-lg leading-tight font-semibold tracking-tight text-slate-950">
              {stage ?? "Estamos comprendiendo tu empresa."}
            </p>
            {stage && (
              <p className="mt-1 text-xs leading-4 text-slate-600">
                Etapa {maturity.classification === "confirmed" ? "confirmada" : "provisional"}
                <span aria-hidden="true"> · </span> Confianza {confidenceLabels[maturity.confidence]}
              </p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <span className={`size-2 shrink-0 rounded-full ${healthColors[health.status]}`} aria-hidden="true" />
              Salud {healthLabels[health.status]}
            </p>
          </div>
        </div>
        <button type="button" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()} className="command-link mt-1.5 gap-2 text-[var(--executive-blue)]">
          Ver evaluación
          <CommandCenterIcon name="arrow" className="size-4" />
        </button>
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby="evolution-assessment-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl overflow-y-auto overscroll-contain border-l border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40 sm:rounded-l-2xl"
      >
        <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <h2 id="evolution-assessment-title" className="text-lg font-semibold text-[var(--executive-blue)]">Evaluación empresarial</h2>
          <button type="button" className="command-link" onClick={() => dialogRef.current?.close()}>Cerrar</button>
        </header>
        <div className="space-y-5 p-5 text-sm leading-6 text-slate-700">
          <section>
            <h3 className="font-semibold text-[var(--executive-blue)]">Etapa empresarial</h3>
            <p>{maturity.explanation}</p>
            <p>Registros considerados para la etapa: {maturity.evidenceIds.length}.</p>
          </section>
          <section>
            <h3 className="font-semibold text-[var(--executive-blue)]">Salud del negocio</h3>
            <p>{health.explanation}</p>
          </section>
          {[
            { title: "Cómo se evaluó", items: [...new Set([...maturity.appliedRules, ...health.appliedRules])] },
            { title: "Qué falta por conocer", items: assessment.missingInformation },
            { title: "Riesgos detectados", items: [...new Set([...maturity.risks, ...health.risks, ...assessment.criticalRisks])] },
          ].filter(({ items }) => items.length > 0).map(({ title, items }) => (
            <section key={title}>
              <h3 className="font-semibold text-[var(--executive-blue)]">{title}</h3>
              <ul className="list-disc pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ))}
          <section>
            <h3 className="font-semibold text-[var(--executive-blue)]">Fuentes de información</h3>
            <p>{assessment.evidenceSummary.declared} declaradas · {assessment.evidenceSummary.documented} documentadas · {assessment.evidenceSummary.verified} verificadas</p>
          </section>
        </div>
      </dialog>
    </>
  );
}
