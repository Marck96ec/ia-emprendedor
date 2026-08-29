import { redirect } from "next/navigation";

import { createWeeklyReview } from "@/actions/weekly-review";
import { createClient } from "@/lib/supabase/server";

type WeeklyReviewPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function WeeklyReviewPage({
  searchParams,
}: WeeklyReviewPageProps) {
  const { error: pageError } =
    await searchParams;

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
    console.error(
      "WEEKLY_REVIEW_PAGE_BUSINESS_ERROR",
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
   * Siempre trabajamos con la semana más reciente.
   */
  const { data: ceoPlan, error: planError } =
    await supabase
      .from("ceo_plans")
      .select("id, week_number, status")
      .eq("business_id", business.id)
      .order("week_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (planError) {
    console.error(
      "WEEKLY_REVIEW_PAGE_PLAN_ERROR",
      planError,
    );

    throw new Error(
      "No pudimos cargar el plan semanal",
    );
  }

  if (!ceoPlan || ceoPlan.status !== "ready") {
    redirect("/dashboard");
  }

  const {
    data: existingReview,
    error: reviewError,
  } = await supabase
    .from("weekly_reviews")
    .select("id")
    .eq("ceo_plan_id", ceoPlan.id)
    .maybeSingle();

  if (reviewError) {
    console.error(
      "WEEKLY_REVIEW_PAGE_LOOKUP_ERROR",
      reviewError,
    );

    throw new Error(
      "No pudimos cargar la revisión semanal",
    );
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
    console.error(
      "WEEKLY_REVIEW_PAGE_ACTIONS_ERROR",
      actionsError,
    );

    throw new Error(
      "No pudimos cargar las acciones",
    );
  }

  const totalActions =
    actions?.length ?? 0;

  const completedActions =
    actions?.filter(
      (action) =>
        action.status === "completed",
    ).length ?? 0;

  if (totalActions !== 7) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            IA Emprendedor
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-gray-900">
            Revisión de la semana {ceoPlan.week_number}
          </h1>

          <p className="mt-3 text-gray-600">
            Antes de preparar la siguiente semana,
            revisemos qué ocurrió realmente en{" "}
            {business.name}.
          </p>

          <div className="mt-6 rounded-xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Progreso de esta semana
            </p>

            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {completedActions}/7 acciones completadas
            </p>
          </div>

          {pageError && (
            <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {pageError}
            </div>
          )}

          <form
            action={createWeeklyReview}
            className="mt-8 space-y-7"
          >
            <div>
              <label
                htmlFor="what_worked"
                className="block text-sm font-medium text-gray-700"
              >
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
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="what_didnt_work"
                className="block text-sm font-medium text-gray-700"
              >
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
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="business_changes"
                className="block text-sm font-medium text-gray-700"
              >
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
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="next_week_focus"
                className="block text-sm font-medium text-gray-700"
              >
                ¿Hay algo en lo que quieras enfocarte la próxima semana?
                <span className="ml-1 text-gray-400">
                  (opcional)
                </span>
              </label>

              <textarea
                id="next_week_focus"
                name="next_week_focus"
                rows={4}
                minLength={5}
                maxLength={1000}
                placeholder="Ej. Esta semana quiero enfocarme en conseguir más clientes recurrentes."
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white"
            >
              Guardar revisión semanal
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}