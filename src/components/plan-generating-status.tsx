"use client";

import { ThinkingOrb } from "thinking-orbs";
import { useEffect, useState } from "react";

const progressMessages = [
  ["Entendiendo tu contexto", "Cómo genera valor tu negocio y qué está ocurriendo ahora."],
  ["Evaluando tus restricciones", "Qué limita el avance y qué capacidad tienes esta semana."],
  ["Comparando prioridades", "Qué merece atención antes que lo demás."],
  ["Preparando una decisión", "Dónde poner el foco para aprender y avanzar."],
  ["Diseñando acciones", "Qué pasos concretos pueden mover esa decisión."],
  ["Definiendo cómo medir resultados", "Cómo sabremos si la dirección elegida funcionó."],
] as const;

export function PlanGeneratingStatus() {
  const [activeMessage, setActiveMessage] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveMessage((current) => (current + 1) % progressMessages.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, []);

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
            CEO IA está construyendo tu plan
          </h2>
        </div>
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-800">Mientras analizamos tu negocio</p>
      <ul className="mt-3 space-y-2">
        {progressMessages.map(([message, description], index) => (
          <li
            key={message}
            className={`flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors ${index === activeMessage ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700"}`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${index === activeMessage ? "animate-pulse border-white/30 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-500"}`}>
              {index === activeMessage ? "•" : "○"}
            </span>

            <span>
              <span className="block text-sm font-semibold">{message}...</span>
              <span className={`mt-0.5 block text-xs leading-5 ${index === activeMessage ? "text-slate-300" : "text-slate-500"}`}>{description}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Estamos construyendo una recomendación adaptada a tu negocio. Tu información está guardada aunque la generación falle.
      </p>
    </div>
  );
}
