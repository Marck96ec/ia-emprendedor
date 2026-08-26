import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { generateCEOPlanAction } from "@/actions/ceo-plan";
import { updateWeeklyActionStatus } from "@/actions/weekly-actions";
import { CEOPlanSchema } from "@/lib/ai/ceo-agent";
import { createClient } from "@/lib/supabase/server";

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
};

type WeeklyReview = {
  id: string;
  completed_actions: number;
  total_actions: number;
};

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
      ? CEOPlanSchema.safeParse({
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
          completed_at
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
   * Calcular progreso.
   */
  const completedActions =
    weeklyActions.filter(
      (action) =>
        action.status === "completed",
    ).length;

  const totalActions =
    weeklyActions.length;

  const progressPercent =
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
          total_actions
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
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              IA Emprendedor
            </p>

            <h1 className="mt-1 text-3xl font-semibold text-gray-900">
              {business.name}
            </h1>

            {business.business_type && (
              <p className="mt-1 text-gray-600">
                {business.business_type}
              </p>
            )}
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800"
            >
              Cerrar sesión
            </button>
          </form>
        </div>

        {/* Mensajes */}
        {pageError && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
            {message}
          </div>
        )}

        {/* Información del negocio */}
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Sesión iniciada como
          </p>

          <p className="mt-1 font-medium text-gray-900">
            {email}
          </p>

          <div className="mt-8 rounded-xl bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Tu negocio está listo
            </h2>

            {business.description ? (
              <p className="mt-2 text-gray-600">
                {business.description}
              </p>
            ) : (
              <p className="mt-2 text-gray-600">
                Ya completaste la información básica de tu negocio.
              </p>
            )}
          </div>
        </div>

        {/* Primer plan */}
        {!ceoPlan && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">
              CEO IA
            </h2>

            <p className="mt-2 text-gray-600">
              Ya tenemos suficiente información para analizar
              tu negocio y definir tus próximas prioridades.
            </p>

            <form
              action={generateCEOPlanAction}
              className="mt-6"
            >
              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white"
              >
                Generar mi plan
              </button>
            </form>
          </div>
        )}

        {/* Generando */}
        {ceoPlan?.status === "generating" && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Generando tu plan...
            </h2>

            <p className="mt-2 text-gray-600">
              El CEO IA está analizando tu negocio.
            </p>
          </div>
        )}

        {/* Falló generación */}
        {ceoPlan?.status === "failed" && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              No pudimos generar el plan
            </h2>

            <p className="mt-2 text-gray-600">
              Puedes volver a intentarlo.
            </p>

            <form
              action={generateCEOPlanAction}
              className="mt-5"
            >
              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white"
              >
                Intentar nuevamente
              </button>
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
                    {completedActions}/{totalActions}
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
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  {progressPercent}% de progreso
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
                      {!weeklyReview && (
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

              {/* Semana 100% completada */}
              {totalActions === 7 &&
                completedActions === 7 &&
                !weeklyReview && (
                  <div className="mt-6 rounded-xl bg-green-50 p-5">
                    <h3 className="font-semibold text-green-900">
                      Semana completada
                    </h3>

                    <p className="mt-1 text-sm text-green-800">
                      Completaste las 7 acciones de tu plan.
                    </p>
                  </div>
                )}

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
                <div className="mt-8 rounded-xl bg-green-50 p-5">
                  <h3 className="font-semibold text-green-900">
                    Revisión semanal completada
                  </h3>

                  <p className="mt-2 text-sm text-green-800">
                    Registraste{" "}
                    {weeklyReview.completed_actions}/
                    {weeklyReview.total_actions} acciones
                    completadas.
                  </p>

                  <p className="mt-2 text-sm text-green-800">
                    Ya tenemos el contexto necesario para
                    preparar la siguiente semana.
                  </p>

                  <form
                    action={generateCEOPlanAction}
                    className="mt-5"
                  >
                    <button
                      type="submit"
                      className="rounded-lg bg-black px-5 py-3 font-medium text-white"
                    >
                      Preparar semana{" "}
                      {ceoPlan.week_number + 1}
                    </button>
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