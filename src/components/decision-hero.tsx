"use client";

import { useState, type ReactNode } from "react";

import {
  ExecutiveContextDrawer,
  type DrawerTab,
} from "@/components/executive-context-drawer";
import type {
  DashboardPriority,
  DashboardStrategicDiagnosis,
} from "@/lib/dashboard-types";

type DecisionHeroProps = {
  summary: string;
  strategicDiagnosis: DashboardStrategicDiagnosis;
  priorities: DashboardPriority[];
  focusPanel: ReactNode;
  evidencePanel: ReactNode;
  evidenceSummary: string;
};

const certaintyLabels = {
  low: "Exploratoria",
  medium: "Media",
  high: "Alta",
} as const;

const linkClassName =
  "inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 underline decoration-white/30 underline-offset-4 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-sky-300/60 motion-reduce:transition-none cockpit:min-h-9";

const MAX_HEADLINE_QUESTION_CHARS = 120;

export function DecisionHero({
  summary,
  strategicDiagnosis,
  priorities,
  focusPanel,
  evidencePanel,
  evidenceSummary,
}: DecisionHeroProps) {
  const decision = strategicDiagnosis.critical_decision;
  const [tab, setTab] = useState<DrawerTab | null>(null);
  // Una pregunta larga se corta sin perder sentido; entonces la dirección recomendada es el titular.
  const questionFits = decision.question.length <= MAX_HEADLINE_QUESTION_CHARS;

  return (
    <section
      className="relative flex flex-col overflow-hidden rounded-2xl bg-slate-950 p-4 text-white shadow-sm sm:p-5 cockpit:h-full cockpit:min-h-0 cockpit:short:p-3.5"
      aria-labelledby="decision-hero-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="eyebrow !text-sky-300">Decisión de esta semana</p>
        <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 text-xs font-medium text-amber-200">
          Nivel de certeza: {certaintyLabels[strategicDiagnosis.confidence]}
        </span>
      </div>

      <p className={`mt-3 text-sm font-medium text-sky-200 ${questionFits ? "sm:hidden" : ""}`}>CEO IA recomienda</p>
      <h2
        id="decision-hero-title"
        title={questionFits ? decision.question : decision.recommended_direction}
        className={`text-lg font-semibold leading-snug tracking-tight sm:line-clamp-3 sm:text-xl 2xl:text-2xl ${questionFits ? "mt-1 sm:mt-3" : "mt-1"}`}
      >
        {questionFits ? (
          <>
            <span className="sm:hidden">{decision.recommended_direction}</span>
            <span className="hidden sm:inline">{decision.question}</span>
          </>
        ) : (
          decision.recommended_direction
        )}
      </h2>

      {questionFits && (
        <p
          title={decision.recommended_direction}
          className="mt-3 hidden line-clamp-2 border-l-2 border-sky-400 pl-3 text-sm leading-5 text-white sm:block 2xl:text-base 2xl:leading-6"
        >
          <span className="font-medium text-sky-200">CEO IA recomienda: </span>
          {decision.recommended_direction}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-1 cockpit:mt-auto cockpit:pt-3">
        <button
          type="button"
          onClick={() => setTab("decision")}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-3 focus-visible:outline-sky-300/60 motion-reduce:transition-none cockpit:min-h-9"
        >
          Entender decisión
        </button>
        <button type="button" onClick={() => setTab("evidence")} aria-haspopup="dialog" className={linkClassName}>
          Ver evidencia
          <span className="ml-1.5 hidden font-normal text-slate-400 no-underline xl:inline">· {evidenceSummary}</span>
        </button>
        <button type="button" onClick={() => setTab("priorities")} aria-haspopup="dialog" className={linkClassName}>
          Ver prioridades
        </button>
      </div>

      <ExecutiveContextDrawer
        tab={tab}
        onTabChange={setTab}
        onClose={() => setTab(null)}
        summary={summary}
        strategicDiagnosis={strategicDiagnosis}
        priorities={priorities}
        focusPanel={focusPanel}
        evidencePanel={evidencePanel}
      />
    </section>
  );
}
