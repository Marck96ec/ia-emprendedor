import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { HistoryTimeline, type HistoryWeek } from "@/components/history-timeline";
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
  outcome_status: "positive" | "mixed" | "no_change" | "negative";
  outcome_summary: string;
  decision_learning: {
    decision_question: string;
    hypothesis_status: "validated" | "rejected" | "inconclusive";
    learning: string;
  } | null;
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
          revenue_model
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
          total_actions,
          outcome_status,
          outcome_summary,
          decision_learning
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

  const historyWeeks: HistoryWeek[] = (plans ?? []).map((plan) => {
    const planActions = actionsByPlanId.get(plan.id) ?? [];
    const review = reviewByPlanId.get(plan.id);

    return {
      id: plan.id,
      weekNumber: plan.week_number,
      status: plan.status,
      executiveSummary: plan.executive_summary,
      generatedAt: plan.generated_at,
      completedActions: planActions.filter((action) => action.status === "completed").length,
      totalActions: planActions.length,
      review: review
        ? {
            whatWorked: review.what_worked,
            whatDidntWork: review.what_didnt_work,
            businessChanges: review.business_changes,
            nextWeekFocus: review.next_week_focus,
            outcomeStatus: review.outcome_status,
            outcomeSummary: review.outcome_summary,
            decisionLearning: review.decision_learning,
          }
        : null,
    };
  });

  return (
    <main className="ambient-shell flex h-dvh min-h-0 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col gap-3">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">TuCEO IA</p>
            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">Semanas anteriores</h1>
              <span className="shrink-0 text-xs font-medium text-slate-500">{business.name}</span>
            </div>
          </div>

          <nav aria-label="Navegación del historial" className="flex shrink-0 items-center gap-2">
            <Link href="/dashboard" className="secondary-button min-h-9 rounded-lg px-3 py-1.5 text-xs">Ver mi semana actual</Link>
            <form action={logout}>
              <button type="submit" className="secondary-button min-h-9 rounded-lg px-3 py-1.5 text-xs">Cerrar sesión</button>
            </form>
          </nav>
        </header>

        {historyWeeks.length === 0 ? (
          <section className="surface-card flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold text-slate-950">Todavía no tienes semanas registradas</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Cuando generes tu primer plan semanal, aparecerá aquí.</p>
            <Link href="/dashboard" className="primary-button mt-5 px-5 py-3">Empezar mi semana</Link>
          </section>
        ) : (
          <HistoryTimeline weeks={historyWeeks} />
        )}
      </div>
    </main>
  );
}