"use client";

import { ThinkingOrb } from "thinking-orbs";

const progressMessages = [
  "Analizando tu negocio...",
  "Identificando tus principales oportunidades...",
  "Preparando tu plan de 7 días...",
] as const;

export function PlanGeneratingStatus() {
  return (
    <div className="surface-card mt-6 rounded-[28px] p-5 sm:p-6">
      <div className="flex items-start gap-4 border-b border-slate-200 pb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
          <ThinkingOrb
            state="searching"
            size={20}
            aria-label="Generando tu plan del CEO IA"
          />
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            CEO IA
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            Generando tu plan...
          </h2>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {progressMessages.map((message, index) => (
          <li
            key={message}
            className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-500">
              {index + 1}
            </span>

            <span>{message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
