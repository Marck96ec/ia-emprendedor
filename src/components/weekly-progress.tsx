"use client";

import { useEffect, useState } from "react";

type WeeklyProgressProps = {
  completedActions: number;
  totalActions: number;
  weekNumber: number;
  executedActions: number;
  evaluatedDecisions: number;
  validatedHypotheses: number;
  reviewStreak: number;
};

const feedbackMessages = [
  "Una decisión menos basada en intuición.",
  "Ya tienes información para revisar el siguiente paso.",
  "Esta acción acerca la semana a una decisión basada en evidencia.",
];

export function WeeklyProgress({
  completedActions,
  totalActions,
  weekNumber,
  executedActions,
  evaluatedDecisions,
  validatedHypotheses,
  reviewStreak,
}: WeeklyProgressProps) {
  const [previousCompleted, setPreviousCompleted] = useState(completedActions);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);

  // Detecta avances sin esperar a un efecto: el estado sobrevive al refresco tras completar una acción.
  if (previousCompleted !== completedActions) {
    setPreviousCompleted(completedActions);
    setJustCompleted(completedActions > previousCompleted ? completedActions : null);
  }

  useEffect(() => {
    if (justCompleted === null) return;
    const timeout = setTimeout(() => setJustCompleted(null), 4500);
    return () => clearTimeout(timeout);
  }, [justCompleted]);

  const progress = totalActions === 0
    ? 0
    : Math.round((completedActions / totalActions) * 100);
  const achievementUnlocked = totalActions > 0 && completedActions === totalActions;
  const remaining = totalActions - completedActions;

  const message = justCompleted !== null
    ? feedbackMessages[(justCompleted - 1) % feedbackMessages.length]
    : achievementUnlocked
      ? "Semana ejecutada. Lista para descubrir qué funcionó."
      : completedActions === 0
        ? "Cada acción acerca la semana a una decisión basada en evidencia."
        : `Te ${remaining === 1 ? "falta 1 acción" : `faltan ${remaining} acciones`} para cerrar la semana.`;

  const stats = [
    { value: executedActions, label: executedActions === 1 ? "acción ejecutada" : "acciones ejecutadas" },
    { value: evaluatedDecisions, label: evaluatedDecisions === 1 ? "decisión evaluada" : "decisiones evaluadas" },
    { value: validatedHypotheses, label: validatedHypotheses === 1 ? "hipótesis validada" : "hipótesis validadas" },
  ].filter((stat) => stat.value > 0);

  const journeyParts = [
    ...stats.map((stat) => `${stat.value} ${stat.label}`),
    ...(reviewStreak >= 2 ? [`${reviewStreak} semanas consecutivas revisando decisiones`] : []),
  ];
  const detailLine = justCompleted !== null || journeyParts.length === 0
    ? message
    : journeyParts.join(" · ");

  return (
    <section className="min-w-0 px-4 py-3" aria-labelledby="weekly-progress-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="weekly-progress-title" className="eyebrow">
          {achievementUnlocked ? "Semana completada" : "Semana en progreso"}
        </h2>
        <p className="text-sm font-medium text-slate-600">Semana {weekNumber}</p>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-slate-950">
          {completedActions} de {totalActions} acciones completadas
        </p>
        <ol className="flex shrink-0 items-center gap-1" aria-hidden="true">
          {Array.from({ length: totalActions }, (_, index) => (
            <li
              key={index}
              className={`h-3 w-3 rounded-full border transition-colors duration-300 motion-reduce:transition-none ${
                index < completedActions ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
              } ${justCompleted !== null && index === justCompleted - 1 ? "anim-pop" : ""}`}
            />
          ))}
        </ol>
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalActions}
        aria-valuenow={completedActions}
        aria-label={`${completedActions} de ${totalActions} acciones completadas`}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p
        title={detailLine}
        className={`mt-1.5 min-h-5 text-sm leading-5 lg:truncate ${justCompleted !== null ? "anim-rise font-medium text-emerald-800" : "text-slate-600"}`}
        aria-live="polite"
      >
        {detailLine}
      </p>
    </section>
  );
}
