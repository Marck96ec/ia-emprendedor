import Link from "next/link";

import type { DecisionLoopStage } from "@/lib/dashboard-progress";

type WelcomeBannerProps = {
  weekNumber: number;
  completedActions: number;
  totalActions: number;
  reviewed: boolean;
  hasPriorLearning: boolean;
  nextActionHref: string | null;
};

const loopSteps = [
  { key: "decide", label: "Decidir" },
  { key: "execute", label: "Ejecutar" },
  { key: "learn", label: "Aprender" },
  { key: "improve", label: "Mejorar" },
] as const;

function stepState(stepKey: (typeof loopSteps)[number]["key"], stage: DecisionLoopStage) {
  const order = ["decide", "execute", "learn", "improve"];
  const current = order.indexOf(stage);
  const index = order.indexOf(stepKey);

  if (index < current) return "done";
  return index === current ? "current" : "upcoming";
}

export function DecisionLoop({ stage }: { stage: DecisionLoopStage }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-sm" aria-label="Ciclo de decisión">
      {loopSteps.map((step, index) => {
        const state = stepState(step.key, stage);

        return (
          <li key={step.key} className="flex items-center gap-1" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium transition-colors duration-200 motion-reduce:transition-none ${
                state === "current"
                  ? "bg-blue-600 text-white"
                  : state === "done"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {state === "done" && <span aria-hidden="true">✓</span>}
              {step.label}
              {state === "done" && <span className="sr-only"> (completado)</span>}
              {state === "current" && <span className="sr-only"> (etapa actual)</span>}
            </span>
            {index < loopSteps.length - 1 && (
              <span className="text-slate-400" aria-hidden="true">→</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function WelcomeBanner({
  weekNumber,
  completedActions,
  totalActions,
  reviewed,
  hasPriorLearning,
  nextActionHref,
}: WelcomeBannerProps) {
  const returning = completedActions > 0 && completedActions < totalActions && !reviewed;
  const allCompleted = totalActions > 0 && completedActions === totalActions;

  let title: string;
  let body: string;

  if (reviewed) {
    title = "Semana revisada.";
    body = "Lo que aprendiste ya forma parte de la memoria de tu negocio.";
  } else if (allCompleted) {
    title = "Plan ejecutado.";
    body = "Ahora revisemos qué cambió realmente.";
  } else if (returning) {
    title = "Bienvenido de vuelta.";
    body = "Retomemos donde quedaste. Tu próxima acción está lista.";
  } else if (weekNumber === 1) {
    title = "Tu primera semana.";
    body = "Esta semana CEO IA está aprendiendo cómo funciona tu negocio.";
  } else if (hasPriorLearning) {
    title = `Semana ${weekNumber} lista.`;
    body = "CEO IA está usando lo aprendido la semana pasada para ajustar tu siguiente decisión.";
  } else {
    title = `Semana ${weekNumber} lista.`;
    body = "Empecemos por tu próxima acción.";
  }

  return (
    <p className="anim-rise mt-0.5 text-sm leading-5 text-slate-600 lg:truncate" aria-label="Estado de tu semana">
      <span className="font-semibold text-slate-950">{title}</span>{" "}
      {returning && (
        <span className="font-medium text-slate-800">
          Semana {weekNumber} · {completedActions} de {totalActions} acciones completadas.{" "}
        </span>
      )}
      {body}
      {returning && nextActionHref && (
        <>
          {" "}
          <Link href={nextActionHref} className="hidden font-semibold text-blue-700 underline underline-offset-4 hover:text-blue-800 sm:inline">
            Continuar con mi próxima acción
          </Link>
        </>
      )}
    </p>
  );
}
