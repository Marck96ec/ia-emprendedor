import { redirect } from "next/navigation";

import { createDiagnostic } from "@/actions/diagnostic";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { createClient } from "@/lib/supabase/server";

type DiagnosticPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function DiagnosticPage({
  searchParams,
}: DiagnosticPageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    throw new Error("No pudimos cargar el negocio");
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  const { data: diagnostic, error: diagnosticError } =
    await supabase
      .from("business_diagnostics")
      .select("id")
      .eq("business_id", business.id)
      .maybeSingle();

  if (diagnosticError) {
    throw new Error("No pudimos cargar el diagnóstico");
  }

  if (diagnostic) {
    redirect("/dashboard");
  }

  return (
    <main className="ambient-shell min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="surface-card rounded-[2rem] p-5 sm:p-8">
          <p className="badge-chip">IA Emprendedor</p>

          <div className="mt-6">
            <OnboardingProgress currentStep={2} />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Diagnóstico inicial
          </h1>

          <p className="mt-3 text-slate-600">
            Ya conocemos lo básico de {business.name}. Ahora necesitamos entender qué está ocurriendo para identificar qué deberías priorizar primero.
          </p>

          {error && <div className="alert-box mt-6">{error}</div>}

          <form action={createDiagnostic} className="mt-8 space-y-7">
            <div>
              <label htmlFor="business_stage" className="field-label">
                ¿En qué etapa está tu negocio?
              </label>

              <select
                id="business_stage"
                name="business_stage"
                required
                defaultValue=""
                className="form-field"
              >
                <option value="" disabled>
                  Selecciona una opción
                </option>
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

              <input
                id="team_size"
                name="team_size"
                type="number"
                min={1}
                max={10000}
                defaultValue={1}
                required
                className="form-field"
              />
            </div>

            <div>
              <label htmlFor="main_challenge" className="field-label">
                ¿Cuál es el principal problema que tienes hoy?
              </label>

              <textarea
                id="main_challenge"
                name="main_challenge"
                minLength={10}
                maxLength={1000}
                rows={4}
                required
                placeholder="Ej. Tenemos ventas, pero no son constantes y no sé qué canal priorizar."
                className="form-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="primary_goal" className="field-label">
                ¿Qué te gustaría lograr en los próximos 3 meses?
              </label>

              <textarea
                id="primary_goal"
                name="primary_goal"
                minLength={10}
                maxLength={1000}
                rows={4}
                required
                placeholder="Ej. Aumentar las ventas mensuales y conseguir clientes recurrentes."
                className="form-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="customers_description" className="field-label">
                ¿Quiénes son tus principales clientes?
              </label>

              <textarea
                id="customers_description"
                name="customers_description"
                minLength={10}
                maxLength={1000}
                rows={4}
                required
                placeholder="Ej. Familias y trabajadores de la zona que compran productos todos los días."
                className="form-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="sales_process" className="field-label">
                ¿Cómo consigues clientes y realizas ventas actualmente?
              </label>

              <textarea
                id="sales_process"
                name="sales_process"
                minLength={10}
                maxLength={1500}
                rows={4}
                required
                placeholder="Ej. Los clientes llegan por recomendaciones, Instagram y personas que pasan frente al local."
                className="form-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="monthly_revenue" className="field-label">
                Facturación mensual aproximada <span className="text-slate-400">(opcional)</span>
              </label>

              <div className="mt-2 grid grid-cols-3 gap-3">
                <input
                  id="monthly_revenue"
                  name="monthly_revenue"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="5000"
                  className="form-field col-span-2"
                />

                <select name="currency_code" defaultValue="USD" className="form-field bg-white">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="COP">COP</option>
                  <option value="MXN">MXN</option>
                  <option value="PEN">PEN</option>
                  <option value="CLP">CLP</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Puedes dejar este campo vacío.
              </p>
            </div>

            <div className="rounded-[1.25rem] bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">¿Qué ocurrirá después?</p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Usaremos estas respuestas para preparar un diagnóstico, tres prioridades y un plan práctico para tus próximos 7 días.
              </p>
            </div>

            <button type="submit" className="primary-button w-full">
              Completar diagnóstico
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}