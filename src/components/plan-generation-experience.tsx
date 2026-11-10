"use client";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useEffect, useRef, useState } from "react";

import { generateCEOPlanAction } from "@/actions/ceo-plan";

type PlanGenerationState =
  | "saving"
  | "starting"
  | "generating"
  | "failed";

type PlanGenerationContext = "first-week" | "next-week";

type PlanGenerationExperienceProps = {
  businessName: string;
  context: PlanGenerationContext;
  state: PlanGenerationState;
  weekNumber: number;
  autoStart?: boolean;
};

const preparationCopy = {
  "first-week": {
    title: "Estamos preparando tu primera semana",
    description:
      "Usaremos lo que nos contaste sobre tu negocio para recomendarte qué priorizar y por dónde empezar.",
    savedTitle: "Tu información está guardada",
    savedDescription: "No necesitas repetir el diagnóstico.",
  },
  "next-week": {
    title: (weekNumber: number) => `Estamos preparando tu semana ${weekNumber}`,
    description:
      "Usaremos los resultados y aprendizajes de tu última semana para recomendarte el siguiente paso.",
    savedTitle: "Tus aprendizajes están guardados",
    savedDescription: "No necesitas repetir la revisión.",
  },
} as const;

const receivingItems = [
  ["01", "Una decisión clara", "Qué merece tu atención primero."],
  ["02", "Acciones prioritarias", "Pasos concretos para avanzar."],
  ["03", "Un plan a tu medida", "Adaptado al contexto de tu negocio."],
] as const;

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <div
      className="relative flex h-24 w-24 items-center justify-center"
      aria-hidden="true"
    >
      <span
        className={`absolute inset-1 rounded-full border-[3px] border-blue-500/20 ${
          active
            ? "animate-spin border-r-blue-600 motion-reduce:animate-none"
            : "border-blue-500/40"
        }`}
      />
      <span
        className={`absolute inset-3 rounded-full bg-blue-50/90 shadow-[0_0_28px_rgba(96,165,250,0.22)] ${
          active ? "animate-pulse motion-reduce:animate-none" : ""
        }`}
      />
      <span className="relative text-4xl leading-none text-blue-600">✦</span>
    </div>
  );
}

function ActivityDots() {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-hidden="true"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2 w-2 animate-bounce rounded-full bg-blue-500 motion-reduce:animate-none"
          style={{ animationDelay: `${index * 140}ms` }}
        />
      ))}
    </span>
  );
}

export function PlanGenerationExperience({
  businessName,
  context,
  state,
  weekNumber,
  autoStart = false,
}: PlanGenerationExperienceProps) {
  const requestStartedRef = useRef(false);
  const [requestPending, setRequestPending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function startGeneration() {
    if (requestPending || requestStartedRef.current) return;

    requestStartedRef.current = true;
    setRequestError(null);
    setRequestPending(true);

    try {
      await generateCEOPlanAction();
    } catch (error) {
      if (isRedirectError(error)) return;

      console.error("PLAN_GENERATION_EXPERIENCE_START_ERROR", error);
      setRequestError(
        "No pudimos iniciar la preparación. Puedes intentarlo nuevamente sin repetir el diagnóstico.",
      );
      setRequestPending(false);
      requestStartedRef.current = false;
    }
  }

  useEffect(() => {
    if (!autoStart || state === "failed") return;
    const timer = window.setTimeout(() => {
      void startGeneration();
    }, 0);

    return () => window.clearTimeout(timer);
    // The ref prevents duplicate requests if React re-runs effects in development.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, state]);

  const hasFailed = state === "failed" || requestError !== null;
  const active = !hasFailed;
  const copy = preparationCopy[context];
  const title =
    typeof copy.title === "function"
      ? copy.title(weekNumber)
      : copy.title;
  const displayState = requestError ? "failed" : state;
  const stateMessage =
    displayState === "saving"
      ? "Guardando la información de tu negocio..."
      : displayState === "failed"
        ? "No pudimos preparar tu plan."
        : "Preparando tu plan personalizado...";

  return (
    <section
      className="surface-card overflow-hidden rounded-[28px]"
      aria-busy={active || requestPending}
    >
      <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
            T
          </span>
          <span className="text-base font-semibold tracking-[0.04em] text-slate-950">
            TUCEO IA
          </span>
        </div>
        <p className="text-right text-sm text-slate-600">
          Configuración completada{" "}
          <span className="ml-1 font-semibold text-emerald-600" aria-hidden="true">
            ✓
          </span>
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)]">
        <div className="px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex justify-center sm:justify-start">
            <ActivityIcon active={active} />
          </div>

          <div
            className="mt-7"
            role={active ? "status" : undefined}
            aria-live="polite"
          >
            <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {copy.description}
            </p>
          </div>

          {active ? (
            <div className="mt-8 max-w-xl">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                <ActivityDots />
                <span>{stateMessage}</span>
              </div>
              <div
                className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100"
                aria-hidden="true"
              >
                <div className="h-full w-1/3 animate-[plan-generation-progress_1.8s_ease-in-out_infinite] rounded-full bg-blue-500 motion-reduce:animate-none" />
              </div>
            </div>
          ) : (
            <div className="mt-8" role="alert" aria-live="assertive">
              <p className="text-base font-semibold text-slate-950">
                {stateMessage}
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                {requestError ??
                  "Tu información está guardada. Puedes intentarlo nuevamente sin repetir el diagnóstico."}
              </p>
              <button
                type="button"
                className="primary-button mt-5 px-5 py-3"
                onClick={() => void startGeneration()}
                disabled={requestPending}
              >
                {requestPending ? "Preparando..." : "Reintentar preparación"}
              </button>
            </div>
          )}

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-4 sm:px-5">
            <span className="mt-0.5 text-xl font-semibold text-emerald-600" aria-hidden="true">
              ✓
            </span>
            <div>
              <p className="font-semibold text-slate-950">{copy.savedTitle}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {copy.savedDescription}
              </p>
            </div>
          </div>
        </div>

        <aside className="border-t border-slate-200/80 bg-white/35 px-5 py-8 sm:px-8 lg:border-l lg:border-t-0">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">
            Lo que recibirás
          </h2>
          <div className="mt-7 space-y-3">
            {receivingItems.map(([number, itemTitle, description]) => (
              <div
                key={number}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                  {number}
                </span>
                <div>
                  <p className="font-semibold text-slate-950">{itemTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-7 text-sm leading-6 text-slate-600">
            «Todo lo que tu mente puede imaginar y creer, puede alcanzar».
            <span className="mt-1 block text-xs text-slate-500">
              Inspirado en Napoleon Hill
            </span>
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Adaptado al contexto de {businessName}.
          </p>
        </aside>
      </div>
    </section>
  );
}
