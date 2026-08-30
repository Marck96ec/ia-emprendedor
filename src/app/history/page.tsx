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
    <main className="ambient-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="badge-chip">IA Emprendedor</p>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Historial semanal
            </h1>

            <p className="mt-2 text-slate-600">{business.name}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="secondary-button px-4 py-2 text-sm">
              Volver al dashboard
            </Link>

            <form action={logout}>
              <button type="submit" className="secondary-button px-4 py-2 text-sm">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        {plans?.length === 0 && (
          <section className="surface-card mt-8 rounded-[2rem] p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-950">
              Todavía no tienes semanas registradas
            </h2>

            <p className="mt-2 text-slate-600">
              Cuando generes tu primer plan semanal, aparecerá aquí.
            </p>

            <Link href="/dashboard" className="primary-button mt-5 px-5 py-3">
              Ir al dashboard
            </Link>
          </section>
        )}

        <div className="mt-8 space-y-6">
          {(plans ?? []).map((plan) => {
            const planActions = actionsByPlanId.get(plan.id) ?? [];
            const completed = planActions.filter((action) => action.status === "completed").length;
            const total = planActions.length;
            const review = reviewByPlanId.get(plan.id);
            const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

            return (
              <section key={plan.id} className="surface-card rounded-[2rem] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">CEO IA</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                      Semana {plan.week_number}
                    </h2>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                      plan.status === "ready"
                        ? "bg-emerald-50 text-emerald-700"
                        : plan.status === "failed"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {plan.status === "ready" ? "Lista" : plan.status === "failed" ? "Falló" : "Generando"}
                  </span>
                </div>

                {plan.generated_at && (
                  <p className="mt-3 text-sm text-slate-500">
                    Generada: {new Date(plan.generated_at).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}

                {plan.executive_summary && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-900">Resumen ejecutivo</h3>
                    <p className="mt-2 leading-7 text-slate-700">{plan.executive_summary}</p>
                  </div>
                )}

                {plan.status === "ready" && (
                  <>
                    <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-500">Ejecución</p>
                          <p className="mt-1 text-xl font-semibold text-slate-900">
                            {completed}/{total} acciones
                          </p>
                        </div>

                        <p className="font-semibold text-slate-900">{progress}%</p>
                      </div>

                      <div className="mt-4 progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {review ? (
                      <div className="mt-6 border-t border-slate-200 pt-6">
                        <h3 className="text-lg font-semibold text-slate-900">Revisión de la semana</h3>

                        <div className="mt-5 space-y-5">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Qué funcionó</p>
                            <p className="mt-1 text-slate-600">{review.what_worked}</p>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-700">Qué no funcionó</p>
                            <p className="mt-1 text-slate-600">{review.what_didnt_work}</p>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-700">Qué cambió</p>
                            <p className="mt-1 text-slate-600">{review.business_changes}</p>
                          </div>

                          {review.next_week_focus && (
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                Foco solicitado para la siguiente semana
                              </p>
                              <p className="mt-1 text-slate-600">{review.next_week_focus}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-[1rem] bg-sky-50 p-4 text-sm text-sky-700">
                        Esta semana todavía no tiene una revisión cerrada.
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