import Link from "next/link";
import { redirect } from "next/navigation";

import { createWeeklyReview } from "@/actions/weekly-review";
import { StrategicDiagnosisSchema } from "@/lib/ai/ceo-agent";
import { createClient } from "@/lib/supabase/server";
import { DecisionHypothesisSchema } from "@/lib/decision-learning";

type WeeklyReviewPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function WeeklyReviewPage({
  searchParams,
}: WeeklyReviewPageProps) {
  const { error: pageError } = await searchParams;

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
    console.error("WEEKLY_REVIEW_PAGE_BUSINESS_ERROR", businessError);
    throw new Error("No pudimos cargar el negocio");
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  const { data: ceoPlan, error: planError } =
    await supabase
      .from("ceo_plans")
      .select("id, week_number, status, strategic_diagnosis, decision_hypothesis")
      .eq("business_id", business.id)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (planError) {
    console.error("WEEKLY_REVIEW_PAGE_PLAN_ERROR", planError);
    throw new Error("No pudimos cargar el plan semanal");
  }

  if (!ceoPlan || ceoPlan.status !== "ready") {
    redirect("/dashboard");
  }

  const strategicDiagnosis = StrategicDiagnosisSchema.safeParse(ceoPlan.strategic_diagnosis);
  const decisionHypothesis = DecisionHypothesisSchema.safeParse(ceoPlan.decision_hypothesis);

  if (!strategicDiagnosis.success || !decisionHypothesis.success) {
    redirect("/dashboard?error=" + encodeURIComponent("Este plan no tiene una hipótesis estratégica revisable."));
  }

  const { data: existingReview, error: reviewError } = await supabase
    .from("weekly_reviews")
    .select("id")
    .eq("ceo_plan_id", ceoPlan.id)
    .maybeSingle();

  if (reviewError) {
    console.error("WEEKLY_REVIEW_PAGE_LOOKUP_ERROR", reviewError);
    throw new Error("No pudimos cargar la revisión semanal");
  }

  if (existingReview) {
    redirect("/dashboard");
  }

  const { data: actions, error: actionsError } =
    await supabase
      .from("weekly_actions")
      .select("status")
      .eq("ceo_plan_id", ceoPlan.id);

  if (actionsError) {
    console.error("WEEKLY_REVIEW_PAGE_ACTIONS_ERROR", actionsError);
    throw new Error("No pudimos cargar las acciones");
  }

  const totalActions = actions?.length ?? 0;
  const completedActions =
    actions?.filter((action) => action.status === "completed").length ?? 0;

  if (totalActions === 0) {
    redirect("/dashboard");
  }

  return (
    <main className="ambient-shell min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="surface-card rounded-[2rem] p-5 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="badge-chip">IA Emprendedor</p>
            <Link href="/dashboard" className="secondary-button min-h-9 rounded-lg px-3 py-1.5 text-xs">
              Seguir con mi semana
            </Link>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Revisión de la semana {ceoPlan.week_number}
          </h1>

          <p className="mt-3 text-slate-600">
            Antes de preparar la siguiente semana, revisemos qué ocurrió realmente en {business.name}.
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Puedes regresar a tu semana sin guardar esta revisión. Solo se cierra cuando pulses “Guardar aprendizajes de la semana”.
          </p>

          <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Ejecución de la semana</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {completedActions}/{totalActions} acciones completadas
            </p>
          </div>

          <section className="mt-6 rounded-[1.5rem] border border-slate-200 p-5" aria-labelledby="decision-learning-title">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Aprendizaje de la decisión</p>
            <h2 id="decision-learning-title" className="mt-2 text-lg font-semibold text-slate-950">Qué estamos tratando de aprender</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-700">Decisión evaluada</dt>
                <dd className="mt-1 leading-5 text-slate-600">{strategicDiagnosis.data.critical_decision.question}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Hipótesis</dt>
                <dd className="mt-1 leading-5 text-slate-600">{decisionHypothesis.data.statement}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Métrica objetivo</dt>
                <dd className="mt-1 leading-5 text-slate-600">{strategicDiagnosis.data.critical_decision.target_metric}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Resultado esperado</dt>
                <dd className="mt-1 leading-5 text-slate-600">{strategicDiagnosis.data.critical_decision.expected_outcome}</dd>
              </div>
            </dl>
          </section>

          {pageError && <div className="alert-box mt-6">{pageError}</div>}

          <form action={createWeeklyReview} className="mt-8 space-y-7">
            <fieldset>
              <legend className="field-label">
                ¿Qué resultado produjo esta semana?
              </legend>

              <div className="mt-3 space-y-3">
                {[
                  ["positive", "Hubo avance"],
                  ["mixed", "Avance parcial"],
                  ["no_change", "Sin cambio claro"],
                  ["negative", "Hubo retroceso"],
                ].map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                    <input
                      type="radio"
                      name="outcome_status"
                      value={value}
                      required
                      className="h-4 w-4"
                    />
                    <span className="font-medium text-slate-800">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="observed_result" className="field-label">
                ¿Qué ocurrió realmente después de ejecutar este plan?
              </label>
              <textarea id="observed_result" name="observed_result" required minLength={5} maxLength={2000} rows={4} placeholder="Describe el resultado observado, sin interpretar más de lo que muestran los hechos." className="form-field resize-y" />
            </div>

            <div>
              <label htmlFor="evidence" className="field-label">
                ¿Qué evidencia concreta apareció?
              </label>
              <textarea id="evidence" name="evidence" required minLength={5} maxLength={2000} rows={3} placeholder="Ej. Se contactaron 12 clientes y solo uno pidió información." className="form-field resize-y" />
            </div>

            <div>
              <label htmlFor="learning" className="field-label">
                ¿Qué aprendiste que debería cambiar la próxima decisión?
              </label>
              <textarea id="learning" name="learning" required minLength={5} maxLength={2000} rows={4} placeholder="Escribe el aprendizaje estratégico, incluso si la evidencia todavía es inconclusa." className="form-field resize-y" />
            </div>

            <fieldset>
              <legend className="field-label">¿Cómo queda la hipótesis?</legend>
              <div className="mt-3 space-y-3">
                {[
                  ["validated", "Validada"],
                  ["rejected", "Rechazada"],
                  ["inconclusive", "Todavía no sabemos"],
                ].map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                    <input type="radio" name="hypothesis_status" value={value} required className="h-4 w-4" />
                    <span className="font-medium text-slate-800">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="metric_before" className="field-label">Métrica antes <span className="ml-1 text-slate-400">(opcional)</span></label>
                <input id="metric_before" name="metric_before" maxLength={500} placeholder="Ej. 0 respuestas" className="form-field mt-2" />
              </div>
              <div>
                <label htmlFor="metric_after" className="field-label">Métrica después <span className="ml-1 text-slate-400">(opcional)</span></label>
                <input id="metric_after" name="metric_after" maxLength={500} placeholder="Ej. 1 respuesta" className="form-field mt-2" />
              </div>
            </div>

            <div>
              <label htmlFor="outcome_summary" className="field-label">
                ¿Qué cambió realmente?
              </label>

              <textarea
                id="outcome_summary"
                name="outcome_summary"
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                placeholder="Ej. La nueva propuesta generó más respuestas."
                className="form-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="what_worked" className="field-label">
                ¿Qué funcionó bien esta semana?
              </label>

              <textarea
                id="what_worked"
                name="what_worked"
                required
                minLength={5}
                maxLength={2000}
                rows={4}
                placeholder="Ej. Contactar clientes antiguos produjo varias conversaciones nuevas."
                className="form-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="what_didnt_work" className="field-label">
                ¿Qué no funcionó o qué no pudiste completar?
              </label>

              <textarea
                id="what_didnt_work"
                name="what_didnt_work"
                required
                minLength={5}
                maxLength={2000}
                rows={4}
                placeholder="Ej. No pude completar algunas llamadas porque tuve que atender problemas operativos."
                className="form-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="business_changes" className="field-label">
                ¿Qué cambió en el negocio esta semana?
              </label>

              <textarea
                id="business_changes"
                name="business_changes"
                required
                minLength={5}
                maxLength={2000}
                rows={4}
                placeholder="Ej. Conseguimos dos clientes nuevos y descubrimos que las recomendaciones convierten mejor."
                className="form-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="next_week_focus" className="field-label">
                ¿Hay algo en lo que quieras enfocarte la próxima semana?
                <span className="ml-1 text-slate-400">(opcional)</span>
              </label>

              <textarea
                id="next_week_focus"
                name="next_week_focus"
                rows={4}
                minLength={5}
                maxLength={1000}
                placeholder="Ej. Esta semana quiero enfocarme en conseguir más clientes recurrentes."
                className="form-field resize-y"
              />
            </div>

            <button type="submit" className="primary-button w-full">
              Guardar aprendizajes de la semana
            </button>

            <Link href="/dashboard" className="secondary-button w-full">
              Salir sin guardar
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}