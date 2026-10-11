import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { generateCEOPlanAction } from "@/actions/ceo-plan";
import { updateWeeklyActionStatus } from "@/actions/weekly-actions";
import { StoredCEOPlanSchema } from "@/lib/ai/ceo-agent";
import { createClient } from "@/lib/supabase/server";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { PlanGenerationSubmit } from "@/components/plan-generation-submit";
import { PlanGeneratingStatus } from "@/components/plan-generating-status";


type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

type WeeklyAction = {
  id: string;
  day: number;
  action: string;
  objective: string;
  success_metric: string;
  status: "pending" | "completed";
  completed_at: string | null;
  execution_mode: "manual" | "ai_assisted";
  action_type: "generic" | "value_proposition" | "commercial_messages";
  action_results: { id: string; status: "draft" | "approved" }[];
};

type WeeklyReview = {
  id: string;
  completed_actions: number;
  total_actions: number;
  outcome_status: "positive" | "mixed" | "no_change" | "negative";
  outcome_summary: string;
};

const outcomeLabels = {
  positive: "Hubo avance",
  mixed: "Avance parcial",
  no_change: "Sin cambio claro",
  negative: "Hubo retroceso",
} as const;

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const {
    error: pageError,
    message,
  } = await searchParams;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  /*
   * Obtener negocio.
   */
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(
        `
          id,
          name,
          business_type,
          description,
          created_at
        `,
      )
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    console.error(
      "BUSINESS_LOAD_ERROR",
      businessError,
    );

    throw new Error(
      "No pudimos cargar el negocio",
    );
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  /*
   * Verificar diagnóstico.
   */
  const {
    data: diagnostic,
    error: diagnosticError,
  } = await supabase
    .from("business_diagnostics")
    .select("id")
    .eq("business_id", business.id)
    .maybeSingle();

  if (diagnosticError) {
    console.error(
      "DIAGNOSTIC_LOAD_ERROR",
      diagnosticError,
    );

    throw new Error(
      "No pudimos cargar el diagnóstico",
    );
  }

  if (!diagnostic) {
    redirect("/onboarding/diagnostic");
  }

  /*
   * Obtener el plan CEO más reciente.
   */
  const {
    data: ceoPlan,
    error: ceoPlanError,
  } = await supabase
    .from("ceo_plans")
    .select(
      `
        id,
        status,
        executive_summary,
        diagnosis,
        priorities,
        weekly_plan,
        model,
        generated_at,
        week_number,
        previous_plan_id
      `,
    )
    .eq("business_id", business.id)
    .order("week_number", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (ceoPlanError) {
    console.error(
      "CEO_PLAN_LOAD_ERROR",
      ceoPlanError,
    );

    throw new Error(
      "No pudimos cargar el plan del CEO IA",
    );
  }

  /*
   * Validación defensiva del contenido generado.
   */
  const parsedCEOPlan =
    ceoPlan?.status === "ready"
      ? StoredCEOPlanSchema.safeParse({
          executive_summary:
            ceoPlan.executive_summary,

          diagnosis:
            ceoPlan.diagnosis,

          priorities:
            ceoPlan.priorities,

          weekly_plan:
            ceoPlan.weekly_plan,
        })
      : null;

  const readyPlan =
    parsedCEOPlan?.success
      ? parsedCEOPlan.data
      : null;

  if (
    ceoPlan?.status === "ready" &&
    parsedCEOPlan &&
    !parsedCEOPlan.success
  ) {
    console.error(
      "CEO_PLAN_INVALID_STORED_OUTPUT",
      parsedCEOPlan.error,
    );
  }

  /*
   * Obtener acciones de la semana actual.
   */
  let weeklyActions: WeeklyAction[] = [];

  if (ceoPlan?.status === "ready") {
    const {
      data: actions,
      error: actionsError,
    } = await supabase
      .from("weekly_actions")
      .select(
        `
          id,
          day,
          action,
          objective,
          success_metric,
          status,
          completed_at,
          execution_mode,
          action_type,
          action_results (
            id,
            status
          )
        `,
      )
      .eq("ceo_plan_id", ceoPlan.id)
      .order("day", {
        ascending: true,
      });

    if (actionsError) {
      console.error(
        "WEEKLY_ACTIONS_LOAD_ERROR",
        actionsError,
      );

      throw new Error(
        "No pudimos cargar las acciones semanales",
      );
    }

    weeklyActions =
      (actions ?? []) as WeeklyAction[];
  }

  /*
  * Calcular ejecución.
   */
  const completedActions =
    weeklyActions.filter(
      (action) =>
        action.status === "completed",
    ).length;

  const totalActions =
    weeklyActions.length;

  const executionPercent =
    totalActions === 0
      ? 0
      : Math.round(
          (completedActions / totalActions) * 100,
        );

  /*
   * Obtener revisión de la semana actual.
   */
  let weeklyReview: WeeklyReview | null = null;

  if (ceoPlan?.status === "ready") {
    const {
      data: review,
      error: weeklyReviewError,
    } = await supabase
      .from("weekly_reviews")
      .select(
        `
          id,
          completed_actions,
          total_actions,
          outcome_status,
          outcome_summary
        `,
      )
      .eq("ceo_plan_id", ceoPlan.id)
      .maybeSingle();

    if (weeklyReviewError) {
      console.error(
        "WEEKLY_REVIEW_LOAD_ERROR",
        weeklyReviewError,
      );

      throw new Error(
        "No pudimos cargar la revisión semanal",
      );
    }

    weeklyReview =
      review as WeeklyReview | null;
  }

  const email =
    typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : "Usuario";

  return (
    <main className="ambient-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="badge-chip">IA Emprendedor</p>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {business.name}
            </h1>

            {business.business_type && (
              <p className="mt-2 text-slate-600">{business.business_type}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/history" className="secondary-button px-4 py-2 text-sm">
              Historial
            </Link>

            <form action={logout}>
              <button type="submit" className="secondary-button px-4 py-2 text-sm">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        {pageError && <div className="alert-box mt-6">{pageError}</div>}
        {message && <div className="success-box mt-6">{message}</div>}

        <div className="mt-8 surface-card rounded-[2rem] p-5 sm:p-6">
          <p className="text-sm text-slate-500">Sesión iniciada como</p>
          <p className="mt-1 font-semibold text-slate-900">{email}</p>

          <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Tu negocio está listo</h2>

            {business.description ? (
              <p className="mt-2 text-slate-600">{business.description}</p>
            ) : (
              <p className="mt-2 text-slate-600">
                Ya completaste la información básica de tu negocio.
              </p>
            )}
          </div>
        </div>

        {!ceoPlan && (
          <div className="mt-6 surface-card rounded-[2rem] p-5 sm:p-6">
            <OnboardingProgress currentStep={3} />

            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">CEO IA</p>

            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Prepara tu primera semana
            </h2>

            <p className="mt-2 max-w-2xl text-slate-600">
              Ya tenemos la información necesaria. El CEO IA analizará tu negocio y preparará tres prioridades junto con siete acciones concretas para los próximos días.
            </p>

            <form action={generateCEOPlanAction} className="mt-6">
              <PlanGenerationSubmit label="Generar mi plan" />
            </form>
          </div>
        )}

        {ceoPlan?.status === "generating" && <PlanGeneratingStatus />}

        {ceoPlan?.status === "failed" && (
          <div className="mt-6 surface-card rounded-[2rem] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-950">
              No pudimos generar el plan
            </h2>

            <p className="mt-2 text-slate-600">Puedes volver a intentarlo.</p>

            <form action={generateCEOPlanAction} className="mt-5">
              <PlanGenerationSubmit label="Intentar nuevamente" />
            </form>
          </div>
        )}

        {/* Plan listo */}
        {readyPlan && ceoPlan && (
          <>
            {/* Resumen */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                CEO IA · Semana {ceoPlan.week_number}
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-gray-900">
                Resumen ejecutivo
              </h2>

              <p className="mt-4 leading-7 text-gray-700">
                {readyPlan.executive_summary}
              </p>
            </section>

            {/* Diagnóstico */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900">
                Diagnóstico
              </h2>

              <p className="mt-4 leading-7 text-gray-700">
                {readyPlan.diagnosis}
              </p>
            </section>

            {/* Prioridades */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900">
                Tus 3 prioridades
              </h2>

              <div className="mt-6 space-y-4">
                {readyPlan.priorities
                  .slice()
                  .sort(
                    (a, b) =>
                      a.rank - b.rank,
                  )
                  .map((priority) => (
                    <div
                      key={priority.rank}
                      className="rounded-xl bg-gray-50 p-5"
                    >
                      <p className="text-sm font-semibold text-gray-500">
                        Prioridad {priority.rank}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold text-gray-900">
                        {priority.title}
                      </h3>

                      <p className="mt-3 text-gray-700">
                        {priority.reason}
                      </p>

                      <p className="mt-3 text-sm text-gray-600">
                        <strong>
                          Impacto esperado:
                        </strong>{" "}
                        {priority.expected_impact}
                      </p>
                    </div>
                  ))}
              </div>
            </section>

            {/* Plan de 7 días */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Plan de 7 días
                  </h2>

                  <p className="mt-2 text-gray-600">
                    Completa las acciones una por una durante
                    esta semana.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900">
                    {completedActions} de {totalActions}
                  </p>

                  <p className="text-sm text-gray-500">
                    completadas
                  </p>
                </div>
              </div>

              {/* Progreso */}
              <div className="mt-6">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-black transition-all"
                    style={{
                      width: `${executionPercent}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  {completedActions} de {totalActions} acciones realizadas
                </p>
              </div>

              {/* Acciones */}
              <div className="mt-6 space-y-4">
                {weeklyActions.map((item) => {
                  const completed =
                    item.status === "completed";

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-5 ${
                        completed
                          ? "border-gray-200 bg-gray-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-500">
                            Día {item.day}
                          </p>

                          <h3
                            className={`mt-1 text-lg font-semibold ${
                              completed
                                ? "text-gray-500 line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {item.action}
                          </h3>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            completed
                              ? "bg-gray-200 text-gray-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {completed
                            ? "Completada"
                            : "Pendiente"}
                        </span>
                      </div>

                      <p className="mt-3 text-gray-700">
                        {item.objective}
                      </p>

                      <p className="mt-3 text-sm text-gray-600">
                        <strong>
                          Cómo saber si funcionó:
                        </strong>{" "}
                        {item.success_metric}
                      </p>

                      {/*
                       * Una vez creada la revisión semanal,
                       * la semana queda cerrada y ya no
                       * permitimos modificar acciones.
                       */}
                      {item.execution_mode === "ai_assisted" && (
                        <div className="mt-5">
                          {completed ? (
                            <Link href={`/actions/${item.id}`} className="secondary-button px-4 py-2 text-sm">
                              Ver resultado
                            </Link>
                          ) : weeklyReview ? (
                            <span className="text-sm text-slate-500">Semana cerrada</span>
                          ) : (
                            <Link href={`/actions/${item.id}`} className="primary-button px-4 py-2 text-sm">
                              Trabajar con IA
                            </Link>
                          )}
                        </div>
                      )}

                      {item.execution_mode === "manual" && !weeklyReview && (
                        <form
                          action={updateWeeklyActionStatus}
                          className="mt-5"
                        >
                          <input
                            type="hidden"
                            name="action_id"
                            value={item.id}
                          />

                          <input
                            type="hidden"
                            name="status"
                            value={
                              completed
                                ? "pending"
                                : "completed"
                            }
                          />

                          <button
                            type="submit"
                            className={
                              completed
                                ? "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                                : "rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                            }
                          >
                            {completed
                              ? "Marcar como pendiente"
                              : "Marcar como completada"}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Abrir revisión semanal */}
              {totalActions === 7 &&
                !weeklyReview && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      ¿Terminó tu semana?
                    </h3>

                    <p className="mt-2 text-gray-600">
                      Revisa qué funcionó y qué cambió antes
                      de preparar tu siguiente plan.
                    </p>

                    <a
                      href="/weekly-review"
                      className="mt-4 inline-block rounded-lg bg-black px-5 py-3 font-medium text-white"
                    >
                      Revisar mi semana
                    </a>
                  </div>
                )}

              {/* Semana revisada */}
              {weeklyReview && (
                <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900">
                    Resultado de la semana
                  </h3>

                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {outcomeLabels[weeklyReview.outcome_status]}
                  </p>

                  <p className="mt-2 text-slate-700">
                    {weeklyReview.outcome_summary}
                  </p>

                  <p className="mt-5 text-sm text-slate-600">
                    Ejecución: {weeklyReview.completed_actions} de {weeklyReview.total_actions} acciones realizadas.
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Ya tenemos el contexto necesario para
                    preparar la siguiente semana.
                  </p>

                  <form
                    action={generateCEOPlanAction}
                    className="mt-5"
                  >
                    <PlanGenerationSubmit
                      label={`Preparar semana ${ceoPlan.week_number + 1}`}
                      className="rounded-lg bg-black px-5 py-3 font-medium text-white"
                    />
                  </form>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}