"use client";

import { generateCEOPlanAction } from "@/actions/ceo-plan";
import { PlanGenerationSubmit } from "@/components/plan-generation-submit";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const activityMessages = [
  "Aprendizajes guardados. Estamos preparando tu próxima semana.",
  "TUCEO IA está utilizando el contexto de tu negocio para preparar una nueva recomendación.",
  "Tu información ya está guardada. Terminaremos de preparar el plan en cuanto esté listo.",
] as const;

type PlanGeneratingStatusProps = {
  businessName: string;
  weekNumber: number;
  updatedAt: string;
};

function ActivityIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label="Actividad en curso"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2 w-2 animate-pulse rounded-full bg-white motion-reduce:animate-none"
          style={{ animationDelay: `${index * 160}ms` }}
        />
      ))}
    </span>
  );
}

export function PlanGeneratingStatus({
  businessName,
  weekNumber,
  updatedAt,
}: PlanGeneratingStatusProps) {
  const router = useRouter();
  const [activeMessage, setActiveMessage] = useState(0);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    const staleAt = Date.parse(updatedAt) + 15 * 60 * 1000;
    const delay = Math.max(0, staleAt - Date.now());
    const timer = window.setTimeout(() => setCanRetry(true), delay);

    return () => window.clearTimeout(timer);
  }, [updatedAt]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveMessage((current) => (current + 1) % activityMessages.length);
      router.refresh();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <div
      className="surface-card mt-6 rounded-[28px] p-5 sm:p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-start gap-4 border-b border-slate-200 pb-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
          <ActivityIndicator />
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            TUCEO IA
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            Estamos preparando tu semana {weekNumber}
          </h2>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-700">
        {activityMessages[activeMessage]}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Estamos preparando una recomendación adaptada a {businessName}. No
        necesitas hacer nada más mientras terminamos.
      </p>
      {canRetry && (
        <form action={generateCEOPlanAction} className="mt-5">
          <PlanGenerationSubmit label="Reintentar preparación" />
        </form>
      )}
    </div>
  );
}
