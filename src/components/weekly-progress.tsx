type WeeklyProgressProps = {
  completedActions: number;
  totalActions: number;
};

export function WeeklyProgress({
  completedActions,
  totalActions,
}: WeeklyProgressProps) {
  const progress = totalActions === 0
    ? 0
    : Math.round((completedActions / totalActions) * 100);
  const achievementUnlocked = totalActions === 7 && completedActions === 7;

  return (
    <section className="shrink-0 rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 shadow-sm sm:px-5" aria-label="Progreso semanal">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-700">Tu avance esta semana</p>
          <p className="mt-0.5 text-xs text-slate-500">
            El avance real de tus decisiones, sin penalizar una semana parcial.
          </p>
        </div>
        <p className="shrink-0 text-lg font-semibold tracking-tight text-slate-950">
          {completedActions}/{totalActions}
        </p>
      </div>
      <div className="progress-track mt-2 h-2" role="progressbar" aria-valuemin={0} aria-valuemax={totalActions} aria-valuenow={completedActions} aria-label={`${completedActions} de ${totalActions} acciones completadas`}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-600" aria-live="polite">
        {achievementUnlocked
          ? "Semana completada: ejecutaste las 7 decisiones."
          : `Te faltan ${totalActions - completedActions} decisiones para completar la semana.`}
      </p>
    </section>
  );
}
