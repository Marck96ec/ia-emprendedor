"use client";

import { useRef, useState } from "react";

import { createDiagnostic } from "@/actions/diagnostic";
import { OnboardingProgress } from "@/components/onboarding-progress";

type DiagnosticWizardProps = {
  businessName: string;
  error?: string;
};

const steps = [
  { label: "Situación", title: "Entendamos dónde estás hoy" },
  { label: "Reto", title: "Encontremos qué necesita atención" },
  { label: "Clientes", title: "Conozcamos a quién quieres ayudar" },
  { label: "Contexto", title: "Completemos la visión del negocio" },
] as const;

export function DiagnosticWizard({
  businessName,
  error,
}: DiagnosticWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const isLastStep = currentStep === steps.length - 1;

  function goToNextStep() {
    const fieldset = formRef.current?.querySelector<HTMLElement>(
      `[data-step="${currentStep}"]`,
    );

    if (!fieldset) {
      return;
    }

    const fields = fieldset.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    );

    if ([...fields].some((field) => !field.reportValidity())) {
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  return (
    <main className="ambient-shell flex h-dvh min-h-0 items-center justify-center overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-col">
        <div className="surface-card min-h-0 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="badge-chip">IA Emprendedor</p>
            <p className="text-xs font-medium text-slate-500">{businessName}</p>
          </div>

          <div className="mt-4">
            <OnboardingProgress currentStep={2} />
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Diagnóstico · Parte {currentStep + 1} de {steps.length}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {steps[currentStep].title}
              </h1>
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              {steps[currentStep].label}
            </span>
          </div>

          <p className="mt-2 text-sm leading-5 text-slate-600">
            Tus respuestas ayudarán a CEO IA a comprender tu situación actual y detectar dónde puede estar la principal restricción de tu negocio.
          </p>

          {error && <div className="alert-box mt-4" role="alert">{error}</div>}

          <form ref={formRef} action={createDiagnostic} className="mt-5">
            <fieldset data-step="0" hidden={currentStep !== 0}>
              <legend className="sr-only">Situación actual</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="business_stage" className="field-label">
                    ¿En qué etapa está tu negocio?
                  </label>
                  <select id="business_stage" name="business_stage" required defaultValue="" className="form-field">
                    <option value="" disabled>Selecciona una opción</option>
                    <option value="starting">Estoy empezando</option>
                    <option value="operating">Está funcionando de forma estable</option>
                    <option value="growing">Está creciendo</option>
                    <option value="stalled">Está estancado o tiene dificultades</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="team_size" className="field-label">
                    ¿Cuántas personas trabajan en el negocio?
                  </label>
                  <input id="team_size" name="team_size" type="number" min={1} max={10000} defaultValue={1} required className="form-field" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="owner_hours_per_week" className="field-label">
                    ¿Cuántas horas por semana puedes dedicar realmente a decisiones y mejoras del negocio?
                  </label>
                  <input id="owner_hours_per_week" name="owner_hours_per_week" type="number" min={0} max={168} required placeholder="Ej. 5" className="form-field" />
                  <p className="mt-2 text-xs text-slate-500">Es una estimación: incluye solo tiempo que puedas sostener.</p>
                </div>
              </div>
            </fieldset>

            <fieldset data-step="1" hidden={currentStep !== 1}>
              <legend className="sr-only">Reto y objetivo</legend>
              <div className="space-y-4">
                <div>
                  <label htmlFor="main_challenge" className="field-label">
                    ¿Cuál es el principal problema que tienes hoy?
                  </label>
                  <textarea id="main_challenge" name="main_challenge" minLength={10} maxLength={1000} rows={4} required placeholder="Ej. Tenemos ventas, pero no son constantes y no sé qué canal priorizar." className="form-field resize-none" />
                </div>
                <div>
                  <label htmlFor="primary_goal" className="field-label">
                    ¿Qué te gustaría lograr en los próximos 3 meses?
                  </label>
                  <textarea id="primary_goal" name="primary_goal" minLength={10} maxLength={1000} rows={4} required placeholder="Ej. Aumentar las ventas mensuales y conseguir clientes recurrentes." className="form-field resize-none" />
                </div>
              </div>
            </fieldset>

            <fieldset data-step="2" hidden={currentStep !== 2}>
              <legend className="sr-only">Clientes y ventas</legend>
              <div className="space-y-4">
                <div>
                  <label htmlFor="customers_description" className="field-label">
                    ¿Quiénes son tus principales clientes?
                  </label>
                  <textarea id="customers_description" name="customers_description" minLength={10} maxLength={1000} rows={4} required placeholder="Ej. Familias y trabajadores de la zona que compran productos todos los días." className="form-field resize-none" />
                </div>
                <div>
                    <label htmlFor="sales_process" className="field-label">
                      Resume cómo consigues clientes y realizas ventas hoy
                  </label>
                    <textarea id="sales_process" name="sales_process" minLength={10} maxLength={1500} rows={4} required placeholder="Ej. Llegan por recomendaciones e Instagram; luego cotizo por WhatsApp y doy seguimiento." className="form-field resize-none" />
                </div>
              </div>
            </fieldset>

            <fieldset data-step="3" hidden={currentStep !== 3}>
              <legend className="sr-only">Contexto del empresario y facturación</legend>
              <div className="space-y-4">
                <div>
                  <label htmlFor="owner_responsibilities" className="field-label">
                    ¿Qué funciones principales realizas personalmente hoy?
                  </label>
                  <textarea id="owner_responsibilities" name="owner_responsibilities" minLength={10} maxLength={1500} rows={4} required placeholder="Ej. Vendo, atiendo clientes, coordino al equipo y reviso las finanzas." className="form-field resize-none" />
                </div>
                <div>
                  <label htmlFor="monthly_revenue" className="field-label">
                    ¿Cuál ha sido la facturación mensual promedio de tu empresa durante los últimos 3 meses?
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Indica los ingresos antes de gastos e impuestos. Puedes usar un valor aproximado.</p>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <input id="monthly_revenue" name="monthly_revenue" type="number" min={0} step="0.01" placeholder="5000" required className="form-field col-span-2" />
                    <select name="currency_code" defaultValue="USD" required className="form-field bg-white">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="COP">COP</option>
                    <option value="MXN">MXN</option>
                    <option value="PEN">PEN</option>
                    <option value="CLP">CLP</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
                  </div>
                </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">¿Qué ocurrirá después?</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Con este contexto podremos analizar mejor tu empresa y orientar las próximas decisiones.
                </p>
              </div>
            </fieldset>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {currentStep > 0 ? (
                <button type="button" onClick={goToPreviousStep} className="secondary-button min-h-11 px-4 py-2 text-sm">
                  Volver a la anterior
                </button>
              ) : <span />}
              {isLastStep ? (
                <button type="submit" className="primary-button min-h-11 px-5 py-2 text-sm">
                  Preparar mi diagnóstico
                </button>
              ) : (
                <button type="button" onClick={goToNextStep} className="primary-button min-h-11 px-5 py-2 text-sm">
                  Continuar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
