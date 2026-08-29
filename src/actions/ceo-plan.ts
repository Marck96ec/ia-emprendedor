"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateCEOPlan } from "@/lib/ai/generate-ceo-plan";
import { createClient } from "@/lib/supabase/server";

const MODEL =
  process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

const PROMPT_VERSION = "v2";

const GENERATING_STALE_AFTER_MS =
  15 * 60 * 1000;

function dashboardError(message: string) {
  return (
    "/dashboard?error=" +
    encodeURIComponent(message)
  );
}

function dashboardMessage(message: string) {
  return (
    "/dashboard?message=" +
    encodeURIComponent(message)
  );
}

export async function generateCEOPlanAction() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  /*
   * 1. Negocio.
   */
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(
        `
          id,
          name,
          business_type,
          description
        `,
      )
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    console.error(
      "CEO_PLAN_BUSINESS_ERROR",
      businessError,
    );

    redirect(
      dashboardError(
        "No pudimos cargar tu negocio.",
      ),
    );
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  /*
   * 2. Diagnóstico.
   */
  const {
    data: diagnostic,
    error: diagnosticError,
  } = await supabase
    .from("business_diagnostics")
    .select(
      `
        business_stage,
        team_size,
        main_challenge,
        primary_goal,
        customers_description,
        sales_process,
        monthly_revenue,
        currency_code
      `,
    )
    .eq("business_id", business.id)
    .maybeSingle();

  if (diagnosticError) {
    console.error(
      "CEO_PLAN_DIAGNOSTIC_ERROR",
      diagnosticError,
    );

    redirect(
      dashboardError(
        "No pudimos cargar tu diagnóstico.",
      ),
    );
  }

  if (!diagnostic) {
    redirect("/onboarding/diagnostic");
  }

  /*
   * 3. Obtener el plan más reciente.
   */
  const {
    data: latestPlan,
    error: latestPlanError,
  } = await supabase
    .from("ceo_plans")
    .select(
      `
        id,
        status,
        week_number,
        previous_plan_id,
        executive_summary,
        diagnosis,
        priorities,
        weekly_plan,
        updated_at
      `,
    )
    .eq("business_id", business.id)
    .order("week_number", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (latestPlanError) {
    console.error(
      "CEO_PLAN_LOOKUP_ERROR",
      latestPlanError,
    );

    redirect(
      dashboardError(
        "No pudimos verificar tu plan actual.",
      ),
    );
  }

/*
 * Si una generación lleva demasiado tiempo sin actualizarse,
 * asumimos que el proceso murió antes de poder marcarla
 * como ready o failed.
 *
 * Solo un request podrá recuperar el plan gracias a las
 * condiciones status + updated_at.
 */
if (latestPlan?.status === "generating") {
  const staleBefore = new Date(
    Date.now() -
      GENERATING_STALE_AFTER_MS,
  ).toISOString();

  const {
    data: recoveredPlan,
    error: recoveryError,
  } = await supabase
    .from("ceo_plans")
    .update({
      status: "failed",
    })
    .eq("id", latestPlan.id)
    .eq("status", "generating")
    .lt("updated_at", staleBefore)
    .select("id")
    .maybeSingle();

  if (recoveryError) {
    console.error(
      "CEO_PLAN_STALE_RECOVERY_ERROR",
      recoveryError,
    );

    redirect(
      dashboardError(
        "No pudimos verificar el estado de tu plan.",
      ),
    );
  }

  /*
   * Si no se actualizó ninguna fila significa que la
   * generación sigue siendo reciente.
   */
  if (!recoveredPlan) {
    redirect(
      dashboardMessage(
        "Tu plan ya se está generando.",
      ),
    );
  }

  /*
   * El registro ya quedó como failed en DB.
   * Actualizamos el objeto cargado para que el flujo
   * siguiente reutilice esta misma semana.
   */
  latestPlan.status = "failed";
}

  let planId: string;
  let weekNumber: number;
  let previousPlanId: string | null = null;

  /*
   * Plan que utilizaremos como contexto histórico.
   *
   * null = estamos creando Semana 1.
   */
  let contextPlanId: string | null = null;

  /*
   * 4A. Primera semana.
   */
  if (!latestPlan) {
    weekNumber = 1;

    const {
      data: createdPlan,
      error: createPlanError,
    } = await supabase
      .from("ceo_plans")
      .insert({
        business_id: business.id,
        week_number: weekNumber,
        previous_plan_id: null,
        status: "generating",
        model: MODEL,
        prompt_version: PROMPT_VERSION,
      })
      .select("id")
      .single();

    if (createPlanError) {
      if (createPlanError.code === "23505") {
        redirect(
          dashboardMessage(
            "Tu plan ya se está generando.",
          ),
        );
      }

      console.error(
        "CEO_PLAN_CREATE_ERROR",
        createPlanError,
      );

      redirect(
        dashboardError(
          "No pudimos iniciar la generación del plan.",
        ),
      );
    }

    planId = createdPlan.id;
  }

  /*
   * 4B. Reintentar una semana que falló.
   */
  else if (latestPlan.status === "failed") {
    weekNumber = latestPlan.week_number;
    previousPlanId =
      latestPlan.previous_plan_id;

    contextPlanId =
      latestPlan.previous_plan_id;

    const {
      data: claimedPlan,
      error: claimError,
    } = await supabase
      .from("ceo_plans")
      .update({
        status: "generating",
        model: MODEL,
        prompt_version: PROMPT_VERSION,
        executive_summary: null,
        diagnosis: null,
        priorities: null,
        weekly_plan: null,
        generated_at: null,
      })
      .eq("id", latestPlan.id)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error(
        "CEO_PLAN_RETRY_ERROR",
        claimError,
      );

      redirect(
        dashboardError(
          "No pudimos reintentar la generación.",
        ),
      );
    }

    if (!claimedPlan) {
      redirect(
        dashboardMessage(
          "Tu plan ya se está generando.",
        ),
      );
    }

    planId = claimedPlan.id;
  }

  /*
   * 4C. El último plan está listo.
   *
   * Para crear una nueva semana exigimos primero
   * la revisión de la semana anterior.
   */
  else {
    const {
      data: previousReview,
      error: reviewCheckError,
    } = await supabase
      .from("weekly_reviews")
      .select("id")
      .eq("ceo_plan_id", latestPlan.id)
      .maybeSingle();

    if (reviewCheckError) {
      console.error(
        "CEO_PLAN_REVIEW_CHECK_ERROR",
        reviewCheckError,
      );

      redirect(
        dashboardError(
          "No pudimos verificar tu revisión semanal.",
        ),
      );
    }

    if (!previousReview) {
      redirect(
        dashboardMessage(
          "Completa primero la revisión de tu semana.",
        ),
      );
    }

    weekNumber =
      latestPlan.week_number + 1;

    previousPlanId =
      latestPlan.id;

    contextPlanId =
      latestPlan.id;

    const {
      data: createdPlan,
      error: createPlanError,
    } = await supabase
      .from("ceo_plans")
      .insert({
        business_id: business.id,
        week_number: weekNumber,
        previous_plan_id: previousPlanId,
        status: "generating",
        model: MODEL,
        prompt_version: PROMPT_VERSION,
      })
      .select("id")
      .single();

    if (createPlanError) {
      if (createPlanError.code === "23505") {
        redirect(
          dashboardMessage(
            "La nueva semana ya se está generando.",
          ),
        );
      }

      console.error(
        "CEO_PLAN_NEXT_WEEK_CREATE_ERROR",
        createPlanError,
      );

      redirect(
        dashboardError(
          "No pudimos iniciar tu nueva semana.",
        ),
      );
    }

    planId = createdPlan.id;
  }

  /*
   * 5. Construir contexto de la semana anterior.
   */

  try {

    let previousWeek = null;

  if (contextPlanId) {
    const {
      data: contextPlan,
      error: contextPlanError,
    } = await supabase
      .from("ceo_plans")
      .select(
        `
          id,
          week_number,
          executive_summary,
          diagnosis,
          priorities,
          weekly_plan
        `,
      )
      .eq("id", contextPlanId)
      .single();

    if (contextPlanError) {
      console.error(
        "CEO_PLAN_CONTEXT_ERROR",
        contextPlanError,
      );

      throw new Error(
        "No pudimos cargar la semana anterior.",
      );
    }

    const {
      data: contextActions,
      error: contextActionsError,
    } = await supabase
      .from("weekly_actions")
      .select(
        `
          day,
          action,
          objective,
          success_metric,
          status
        `,
      )
      .eq("ceo_plan_id", contextPlan.id)
      .order("day", {
        ascending: true,
      });

    if (contextActionsError) {
      console.error(
        "CEO_PLAN_CONTEXT_ACTIONS_ERROR",
        contextActionsError,
      );

      throw new Error(
        "No pudimos cargar las acciones anteriores.",
      );
    }

    if (
      !contextActions ||
      contextActions.length !== 7
    ) {
      throw new Error(
        "La semana anterior no tiene las 7 acciones esperadas.",
      );
    }

    const {
      data: contextReview,
      error: contextReviewError,
    } = await supabase
      .from("weekly_reviews")
      .select(
        `
          what_worked,
          what_didnt_work,
          business_changes,
          next_week_focus,
          completed_actions,
          total_actions
        `,
      )
      .eq("ceo_plan_id", contextPlan.id)
      .maybeSingle();

    if (contextReviewError) {
      console.error(
        "CEO_PLAN_CONTEXT_REVIEW_ERROR",
        contextReviewError,
      );

      throw new Error(
        "No pudimos cargar la revisión anterior.",
      );
    }

    if (!contextReview) {
      throw new Error(
        "La semana anterior no tiene una revisión válida.",
      );
    }

    previousWeek = {
      weekNumber:
        contextPlan.week_number,

      executiveSummary:
        contextPlan.executive_summary,

      diagnosis:
        contextPlan.diagnosis,

      priorities:
        contextPlan.priorities,

      weeklyPlan:
        contextPlan.weekly_plan,

      actions:
        (contextActions ?? []).map(
          (action) => ({
            day: action.day,
            action: action.action,
            objective: action.objective,
            successMetric:
              action.success_metric,
            status: action.status,
          }),
        ),

      review: {
        whatWorked:
          contextReview.what_worked,

        whatDidntWork:
          contextReview.what_didnt_work,

        businessChanges:
          contextReview.business_changes,

        nextWeekFocus:
          contextReview.next_week_focus,

        completedActions:
          contextReview.completed_actions,

        totalActions:
          contextReview.total_actions,
      },
    };
  }

  /*
   * 6. Ejecutar CEO IA.
   */

    const output = await generateCEOPlan({
      business: {
        name: business.name,
        businessType:
          business.business_type,
        description:
          business.description,
      },

      diagnostic: {
        businessStage:
          diagnostic.business_stage,

        teamSize:
          diagnostic.team_size,

        mainChallenge:
          diagnostic.main_challenge,

        primaryGoal:
          diagnostic.primary_goal,

        customersDescription:
          diagnostic.customers_description,

        salesProcess:
          diagnostic.sales_process,

        monthlyRevenue:
          diagnostic.monthly_revenue === null
            ? null
            : Number(
                diagnostic.monthly_revenue,
              ),

        currencyCode:
          diagnostic.currency_code,
      },

      previousWeek,
    });

    /*
     * 7. Materializar las 7 acciones.
     */
    const weeklyActions =
      output.weekly_plan.map(
        (item) => ({
          ceo_plan_id: planId,
          day: item.day,
          action: item.action,
          objective: item.objective,
          success_metric:
            item.success_metric,
        }),
      );

    const { error: actionsError } =
      await supabase
        .from("weekly_actions")
        .upsert(
          weeklyActions,
          {
            onConflict:
              "ceo_plan_id,day",
          },
        );

    if (actionsError) {
      console.error(
        "CEO_PLAN_ACTIONS_ERROR",
        actionsError,
      );

      throw actionsError;
    }

    /*
     * 8. Marcar plan listo.
     */
    const { error: saveError } =
      await supabase
        .from("ceo_plans")
        .update({
          status: "ready",

          executive_summary:
            output.executive_summary,

          diagnosis:
            output.diagnosis,

          priorities:
            output.priorities,

          weekly_plan:
            output.weekly_plan,

          generated_at:
            new Date().toISOString(),
        })
        .eq("id", planId);

    if (saveError) {
      throw saveError;
    }
  } catch (error) {
    console.error(
      "CEO_PLAN_GENERATION_ERROR",
      error,
    );

    const { error: failedUpdateError } =
      await supabase
        .from("ceo_plans")
        .update({
          status: "failed",
        })
        .eq("id", planId);

    if (failedUpdateError) {
      console.error(
        "CEO_PLAN_FAILED_STATUS_ERROR",
        failedUpdateError,
      );
    }

    redirect(
      dashboardError(
        "No pudimos generar el plan. Puedes intentarlo nuevamente.",
      ),
    );
  }

  revalidatePath("/dashboard");

  redirect(
    "/dashboard?message=" +
      encodeURIComponent(
        `Semana ${weekNumber} preparada.`,
      ),
  );
}