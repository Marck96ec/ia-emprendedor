import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";

type WeeklyActionRow = {
  ceo_plan_id: string;
  status: "pending" | "completed";
};

type WeeklyReviewRow = {
  ceo_plan_id: string;
  what_worked: string;
  what_didnt_work: string;
  business_changes: string;
  next_week_focus: string | null;
  completed_actions: number;
  total_actions: number;
};

export default async function HistoryPage() {
  const supabase = await createClient();

  /*
   * 1. Usuario autenticado.
   */
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  /*
   * 2. Negocio del usuario.
   */
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(
        `
          id,
          name,
          business_type
        `,
      )
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    console.error(
      "HISTORY_BUSINESS_ERROR",
      businessError,
    );

    throw new Error(
      "No pudimos cargar tu negocio",
    );
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  /*
   * 3. Todos los planes del negocio.
   */
  const { data: plans, error: plansError } =
    await supabase
      .from("ceo_plans")
      .select(
        `
          id,
          week_number,
          status,
          executive_summary,
          diagnosis,
          priorities,
          generated_at,
          previous_plan_id
        `,
      )
      .eq("business_id", business.id)
      .order("week_number", {
        ascending: false,
      });

  if (plansError) {
    console.error(
      "HISTORY_PLANS_ERROR",
      plansError,
    );

    throw new Error(
      "No pudimos cargar el historial",
    );
  }

  const planIds =
    (plans ?? []).map(
      (plan) => plan.id,
    );

  /*
   * 4. Acciones de todas las semanas.
   */
  let actions: WeeklyActionRow[] = [];

  if (planIds.length > 0) {
    const {
      data: actionsData,
      error: actionsError,
    } = await supabase
      .from("weekly_actions")
      .select(
        `
          ceo_plan_id,
          status
        `,
      )
      .in("ceo_plan_id", planIds);

    if (actionsError) {
      console.error(
        "HISTORY_ACTIONS_ERROR",
        actionsError,
      );

      throw new Error(
        "No pudimos cargar las acciones históricas",
      );
    }

    actions =
      (actionsData ?? []) as WeeklyActionRow[];
  }

  /*
   * 5. Revisiones de todas las semanas.
   */
  let reviews: WeeklyReviewRow[] = [];

  if (planIds.length > 0) {
    const {
      data: reviewsData,
      error: reviewsError,
    } = await supabase
      .from("weekly_reviews")
      .select(
        `
          ceo_plan_id,
          what_worked,
          what_didnt_work,
          business_changes,
          next_week_focus,
          completed_actions,
          total_actions
        `,
      )
      .in("ceo_plan_id", planIds);

    if (reviewsError) {
      console.error(
        "HISTORY_REVIEWS_ERROR",
        reviewsError,
      );

      throw new Error(
        "No pudimos cargar las revisiones históricas",
      );
    }

    reviews =
      (reviewsData ?? []) as WeeklyReviewRow[];
  }

  /*
   * 6. Mapas para relacionar rápidamente
   * cada plan con acciones y revisión.
   */
  const reviewByPlanId =
    new Map(
      reviews.map(
        (review) => [
          review.ceo_plan_id,
          review,
        ],
      ),
    );

  const actionsByPlanId =
    new Map<
      string,
      WeeklyActionRow[]
    >();

  for (const action of actions) {
    const current =
      actionsByPlanId.get(
        action.ceo_plan_id,
      ) ?? [];

    current.push(action);

    actionsByPlanId.set(
      action.ceo_plan_id,
      current,
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              IA Emprendedor
            </p>

            <h1 className="mt-1 text-3xl font-semibold text-gray-900">
              Historial semanal
            </h1>

            <p className="mt-2 text-gray-600">
              {business.name}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800"
            >
              Volver al dashboard
            </Link>

            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        {/* Sin historial */}
        {plans?.length === 0 && (
          <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Todavía no tienes semanas registradas
            </h2>

            <p className="mt-2 text-gray-600">
              Cuando generes tu primer plan semanal,
              aparecerá aquí.
            </p>

            <Link
              href="/dashboard"
              className="mt-5 inline-block rounded-lg bg-black px-5 py-3 font-medium text-white"
            >
              Ir al dashboard
            </Link>
          </section>
        )}

        {/* Historial */}
        <div className="mt-8 space-y-6">
          {(plans ?? []).map((plan) => {
            const planActions =
              actionsByPlanId.get(
                plan.id,
              ) ?? [];

            const completed =
              planActions.filter(
                (action) =>
                  action.status ===
                  "completed",
              ).length;

            const total =
              planActions.length;

            const review =
              reviewByPlanId.get(
                plan.id,
              );

            const progress =
              total === 0
                ? 0
                : Math.round(
                    (completed / total) *
                      100,
                  );

            return (
              <section
                key={plan.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      CEO IA
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold text-gray-900">
                      Semana{" "}
                      {plan.week_number}
                    </h2>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                      plan.status ===
                      "ready"
                        ? "bg-green-50 text-green-700"
                        : plan.status ===
                            "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {plan.status ===
                    "ready"
                      ? "Lista"
                      : plan.status ===
                          "failed"
                        ? "Falló"
                        : "Generando"}
                  </span>
                </div>

                {plan.generated_at && (
                  <p className="mt-3 text-sm text-gray-500">
                    Generada:{" "}
                    {new Date(
                      plan.generated_at,
                    ).toLocaleDateString(
                      "es",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                )}

                {plan.executive_summary && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900">
                      Resumen ejecutivo
                    </h3>

                    <p className="mt-2 leading-7 text-gray-700">
                      {
                        plan.executive_summary
                      }
                    </p>
                  </div>
                )}

                {plan.status === "ready" && (
                  <>
                    <div className="mt-6 rounded-xl bg-gray-50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            Ejecución
                          </p>

                          <p className="mt-1 text-xl font-semibold text-gray-900">
                            {completed}/
                            {total} acciones
                          </p>
                        </div>

                        <p className="font-semibold text-gray-900">
                          {progress}%
                        </p>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-black"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {review ? (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Revisión de la semana
                        </h3>

                        <div className="mt-5 space-y-5">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              Qué funcionó
                            </p>

                            <p className="mt-1 text-gray-600">
                              {
                                review.what_worked
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              Qué no funcionó
                            </p>

                            <p className="mt-1 text-gray-600">
                              {
                                review.what_didnt_work
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              Qué cambió
                            </p>

                            <p className="mt-1 text-gray-600">
                              {
                                review.business_changes
                              }
                            </p>
                          </div>

                          {review.next_week_focus && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700">
                                Foco solicitado
                                para la siguiente
                                semana
                              </p>

                              <p className="mt-1 text-gray-600">
                                {
                                  review.next_week_focus
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                        Esta semana todavía no
                        tiene una revisión
                        cerrada.
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}