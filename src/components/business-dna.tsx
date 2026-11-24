"use client";

import { useEffect, useId, useRef, useState } from "react";

import type {
  AssessmentDimension,
  BusinessAssessment,
  BusinessHealthStatus,
} from "@/lib/business-assessment";

type BusinessDNAProps = {
  assessment: BusinessAssessment;
};

const statusLabels: Record<BusinessHealthStatus, string> = {
  favorable: "Favorable",
  fragile: "Frágil",
  critical: "Crítica",
  mixed: "Mixta",
  unknown: "Sin evaluar",
};

const statusStyles: Record<BusinessHealthStatus, string> = {
  favorable: "border-[var(--status-favorable)] bg-[var(--status-favorable-soft)]",
  fragile: "border-[var(--status-attention)] bg-[var(--status-attention-soft)]",
  critical: "border-[var(--status-critical)] bg-[var(--status-critical-soft)]",
  mixed: "border-[var(--status-attention)] bg-[var(--status-attention-soft)]",
  unknown: "border-[var(--status-unevaluated)] bg-[var(--status-unevaluated-soft)]",
};

function DimensionStatus({
  status,
}: {
  status: BusinessHealthStatus;
}) {
  return (
    <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
      <span
        className={`h-2 w-2 rounded-full ${
          status === "favorable"
            ? "bg-[var(--status-favorable)]"
            : status === "fragile" || status === "mixed"
              ? "bg-[var(--status-attention)]"
              : status === "critical"
                ? "bg-[var(--status-critical)]"
                : "bg-[var(--status-unevaluated)]"
        }`}
        aria-hidden="true"
      />
      {statusLabels[status]}
    </span>
  );
}

function DimensionDetails({
  dimension,
}: {
  dimension: AssessmentDimension;
}) {
  return (
    <div className="space-y-5">
      <section>
        <p className="eyebrow">Qué significa</p>
        <p className="mt-2 leading-6 text-slate-700">{dimension.explanation}</p>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <p className="eyebrow">Reglas aplicadas</p>
        {dimension.appliedRules.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-6 text-slate-700">
            {dimension.appliedRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 leading-6 text-slate-600">
            Todavía no hay una regla que permita clasificar esta dimensión.
          </p>
        )}
      </section>

      <section className="border-t border-slate-100 pt-4">
        <p className="eyebrow">Información faltante</p>
        {dimension.missingInformation.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-6 text-slate-700">
            {dimension.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 leading-6 text-slate-600">
            No se identificó información faltante para esta evaluación.
          </p>
        )}
      </section>

      <section className="border-t border-slate-100 pt-4">
        <p className="eyebrow">Evidencias disponibles</p>
        <p className="mt-2 leading-6 text-slate-700">
          {dimension.evidenceIds.length > 0
            ? `${dimension.evidenceIds.length} evidencia${
                dimension.evidenceIds.length === 1 ? "" : "s"
              } documentada${dimension.evidenceIds.length === 1 ? "" : "s"}.`
            : "No hay evidencias asociadas a esta dimensión."}
        </p>
        {dimension.lastEvaluatedAt && (
          <p className="mt-1 text-xs text-slate-500">
            Última evaluación registrada:{" "}
            {new Date(dimension.lastEvaluatedAt).toLocaleDateString("es")}
          </p>
        )}
      </section>
    </div>
  );
}

export function BusinessDNA({ assessment }: BusinessDNAProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const selectedDimension =
    assessment.dimensions.find((dimension) => dimension.key === selectedKey) ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedDimension && !dialog.open) dialog.showModal();
    if (!selectedDimension && dialog.open) dialog.close();
  }, [selectedDimension]);

  function closeDetails() {
    setSelectedKey(null);
  }

  return (
    <>
      <section
        className="surface-card rounded-2xl p-4 sm:p-5"
        aria-labelledby="business-dna-title"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Capacidades empresariales</p>
            <h2
              id="business-dna-title"
              className="mt-1 text-lg font-semibold tracking-tight text-slate-950"
            >
              ADN Empresarial
            </h2>
          </div>
          <p className="text-xs text-slate-500">Selecciona para entender</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {assessment.dimensions.map((dimension) => (
            <button
              key={dimension.key}
              type="button"
              onClick={() => setSelectedKey(dimension.key)}
              className={`min-h-20 rounded-xl border p-3 text-left transition-colors hover:border-slate-400 focus-visible:outline-3 focus-visible:outline-[var(--executive-blue)]/30 ${statusStyles[dimension.status]}`}
              aria-label={`Ver detalle de ${dimension.label}: ${statusLabels[dimension.status]}`}
            >
              <span className="block text-sm font-semibold text-slate-950">
                {dimension.label}
              </span>
              <DimensionStatus status={dimension.status} />
            </button>
          ))}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={closeDetails}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeDetails();
          }
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDetails();
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl overflow-hidden border-l border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 sm:rounded-l-2xl"
      >
        {selectedDimension && (
          <div className="flex h-full min-h-0 flex-col">
            <header className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">ADN Empresarial</p>
                  <h2
                    id={titleId}
                    className="mt-1 text-lg font-semibold tracking-tight text-slate-950"
                  >
                    {selectedDimension.label}
                  </h2>
                  <DimensionStatus status={selectedDimension.status} />
                </div>
                <button
                  type="button"
                  onClick={closeDetails}
                  className="secondary-button min-h-11 rounded-lg px-4 py-1.5 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </header>
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <DimensionDetails dimension={selectedDimension} />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
