"use client";

import { useState, type ReactNode } from "react";

import { CommandCenterIcon } from "@/components/command-center-icon";
import {
  ExecutiveContextDrawer,
  type DrawerTab,
} from "@/components/executive-context-drawer";
import type { DashboardPriority, DashboardStrategicDiagnosis } from "@/lib/dashboard-types";

type DecisionHeroProps = {
  summary: string;
  strategicDiagnosis: DashboardStrategicDiagnosis;
  priorities: DashboardPriority[];
  focusPanel: ReactNode;
  evidencePanel: ReactNode;
};

const certaintyLabels = {
  low: "baja",
  medium: "media",
  high: "alta",
} as const;

function firstSentence(text: string) {
  return text.trim().split(/(?<=[.!?])\s+/, 1)[0];
}

function getExecutiveHeadline(direction: string) {
  const recommendation = firstSentence(direction.replace(/^\s*sí\s*:\s*/i, ""));
  return recommendation && !recommendation.endsWith("?") && !/^(sí|no)[.!]?$/i.test(recommendation)
    ? recommendation
    : "La dirección de esta semana";
}

export function DecisionHero({
  summary,
  strategicDiagnosis,
  priorities,
  focusPanel,
  evidencePanel,
}: DecisionHeroProps) {
  const decision = strategicDiagnosis.critical_decision;
  const [tab, setTab] = useState<DrawerTab | null>(null);

  return (
    <section
      className="command-decision rounded-2xl bg-[var(--executive-blue)] p-4 text-white sm:p-5"
      aria-labelledby="decision-hero-title"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="command-kicker flex min-w-0 items-center gap-2 text-[#d9e4ee]">
          <CommandCenterIcon name="sparkle" className="size-5 shrink-0 text-[#a9d3c6]" />
          Decisión de tu CEO IA
        </p>
        <p className="shrink-0 text-xs font-medium text-[#d9e4ee]">
          Confianza {certaintyLabels[strategicDiagnosis.confidence]}
        </p>
      </div>

      <h2 id="decision-hero-title" className="mt-2.5 line-clamp-2 max-w-3xl text-xl leading-tight font-semibold tracking-tight sm:text-[1.75rem]">
        {getExecutiveHeadline(decision.recommended_direction)}
      </h2>
      <p className="mt-1.5 line-clamp-2 max-w-[67ch] text-sm leading-5 text-[#e0e7ef]">
        {firstSentence(decision.rationale) || firstSentence(summary)}
      </p>
      <button
        type="button"
        onClick={() => setTab("decision")}
        aria-haspopup="dialog"
        className="command-link mt-1 gap-2 text-white hover:text-[#cce7df]"
      >
        ¿Por qué esta decisión?
        <CommandCenterIcon name="arrow" className="size-4 shrink-0" />
      </button>

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
