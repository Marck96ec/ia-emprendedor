"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateCEOPlan } from "@/lib/ai/generate-ceo-plan";
import { generateExternalEvidence } from "@/lib/ai/generate-external-evidence";
import type { CEOPlan } from "@/lib/ai/ceo-agent";
import { DecisionLearningSchema } from "@/lib/decision-learning";
import { loadBusinessKnowledge } from "@/lib/business-knowledge";
import {
  CEOPlanError,
  safeCEOPlanLog,
} from "@/lib/ai/ceo-plan-errors";
import { createClient } from "@/lib/supabase/server";

const MODEL =
  process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

const PROMPT_VERSION = "v5-strategic-learning";

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
          revenue_model,
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
        owner_hours_per_week,
        main_challenge,
        primary_goal,
        customers_description,
        sales_process,
        owner_responsibilities,
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

  const businessKnowledge = await loadBusinessKnowledge(business.id);

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
        evidence_status: "pending",
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
        external_evidence: null,
        evidence_status: "pending",
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

  let generatedPlanOutput: CEOPlan | null = null;

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
          strategic_diagnosis,
          priorities,
          weekly_plan,
          decision_hypothesis
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
          sequence,
          action,
          objective,
          reason,
          success_metric,
          expected_result,
          execution_mode,
          action_type,
          role_recommendation,
          role_reason,
          estimated_hours,
          status
        `,
      )
      .eq("ceo_plan_id", contextPlan.id)
      .order("sequence", {
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

    if (!contextActions || contextActions.length === 0) {
      throw new Error(
        "La semana anterior no tiene acciones persistidas.",
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
          total_actions,
          outcome_status,
          outcome_summary,
          decision_learning
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

    const previousDecisionLearning =
      contextReview.decision_learning === null
        ? null
        : DecisionLearningSchema.safeParse(
            contextReview.decision_learning,
          );

    if (
      contextReview.decision_learning !== null &&
      (!previousDecisionLearning || !previousDecisionLearning.success)
    ) {
      throw new Error(
        "La semana anterior tiene un aprendizaje estratégico inválido.",
      );
    }

    previousWeek = {
      weekNumber:
        contextPlan.week_number,

      executiveSummary:
        contextPlan.executive_summary,

      diagnosis:
        contextPlan.diagnosis,

      strategicDiagnosis:
        contextPlan.strategic_diagnosis,

      priorities:
        contextPlan.priorities,

      weeklyPlan:
        contextPlan.weekly_plan,

      actions:
        (contextActions ?? []).map(
          (action) => ({
            sequence: action.sequence,
            action: action.action,
            objective: action.objective,
            reason: action.reason,
            successMetric:
              action.success_metric,
            expectedResult:
              action.expected_result,
            executionMode:
              action.execution_mode,
            actionType:
              action.action_type,
            roleRecommendation:
              action.role_recommendation,
            roleReason:
              action.role_reason,
            estimatedHours:
              Number(action.estimated_hours),
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

        outcomeStatus:
          contextReview.outcome_status,

        outcomeSummary:
          contextReview.outcome_summary,

        decisionLearning:
          previousDecisionLearning && previousDecisionLearning.success
            ? {
                decisionQuestion:
                  previousDecisionLearning.data.decision_question,
                recommendedDirection:
                  previousDecisionLearning.data.recommended_direction,
                hypothesis:
                  previousDecisionLearning.data.hypothesis,
                targetMetric:
                  previousDecisionLearning.data.target_metric,
                expectedOutcome:
                  previousDecisionLearning.data.expected_outcome,
                observedResult:
                  previousDecisionLearning.data.observed_result,
                evidence:
                  previousDecisionLearning.data.evidence,
                learning:
                  previousDecisionLearning.data.learning,
                hypothesisStatus:
                  previousDecisionLearning.data.hypothesis_status,
              }
            : null,
      },
    };
  }

  /*
   * 6. Ejecutar CEO IA.
   */

    const output = await generateCEOPlan({
      business: {
        name: business.name,
        revenueModel:
          business.revenue_model,
        description:
          business.description,
      },

      diagnostic: {
        businessStage:
          diagnostic.business_stage,

        teamSize:
          diagnostic.team_size,

        ownerHoursPerWeek:
          diagnostic.owner_hours_per_week,

        mainChallenge:
          diagnostic.main_challenge,

        primaryGoal:
          diagnostic.primary_goal,

        customersDescription:
          diagnostic.customers_description,

        salesProcess:
          diagnostic.sales_process,

        ownerResponsibilities:
          diagnostic.owner_responsibilities,

        monthlyRevenue:
          Number(diagnostic.monthly_revenue),

        currencyCode:
          diagnostic.currency_code,
      },

      previousWeek,
      businessKnowledge,
    });

    generatedPlanOutput = output;

    const { error: completePlanError } =
      await supabase.rpc("complete_ceo_plan", {
        p_plan_id: planId,
        p_executive_summary: output.executive_summary,
        p_diagnosis: output.diagnosis,
        p_strategic_diagnosis: output.strategic_diagnosis,
        p_decision_hypothesis: output.decision_hypothesis,
        p_priorities: output.priorities,
        p_weekly_plan: output.weekly_plan,
        p_actions: output.weekly_plan,
        p_time_allocation: output.time_allocation,
      });

    if (completePlanError) {
      throw new CEOPlanError(
        "persistence",
        "CEO_PLAN_PERSISTENCE_ERROR",
        "No se pudo guardar el plan completo.",
      );
    }
  } catch (error) {
    console.error(
      "CEO_PLAN_GENERATION_ERROR",
      safeCEOPlanLog(error),
    );

    const { error: failedUpdateError } = await supabase.rpc(
      "fail_ceo_plan",
      { p_plan_id: planId },
    );

    if (failedUpdateError) {
      console.error(
        "CEO_PLAN_FAILED_STATUS_ERROR",
        {
          code: "CEO_PLAN_FAILED_STATUS_ERROR",
          kind: "persistence",
        },
      );
    }

    redirect(
      dashboardError(
        "No pudimos generar el plan. Puedes intentarlo nuevamente.",
      ),
    );
  }

  if (!generatedPlanOutput) {
    redirect(
      dashboardError(
        "No pudimos preparar la evidencia externa.",
      ),
    );
  }

  try {
    const evidence = await generateExternalEvidence({
      business: {
        name: business.name,
        revenueModel: business.revenue_model,
        description: business.description,
      },
      strategicDiagnosis: generatedPlanOutput.strategic_diagnosis,
      decisionHypothesis: generatedPlanOutput.decision_hypothesis,
    });

    const { error: evidenceUpdateError } = await supabase
      .from("ceo_plans")
      .update({
        external_evidence: evidence,
        evidence_status:
          evidence.status === "found"
            ? "ready"
            : "insufficient",
      })
      .eq("id", planId)
      .eq("status", "ready");

    if (evidenceUpdateError) {
      throw evidenceUpdateError;
    }

    console.info("CEO_EVIDENCE_GENERATED", {
      planId,
      evidence_status:
        evidence.status === "found"
          ? "ready"
          : "insufficient",
      item_count: evidence.items.length,
    });
  } catch (error) {
    console.error("CEO_EVIDENCE_GENERATION_ERROR", {
      planId,
      evidence_status: "failed",
      item_count: 0,
      error: error instanceof Error ? error.message : "unknown",
    });

    const { error: evidenceFailureUpdateError } = await supabase
      .from("ceo_plans")
      .update({
        evidence_status: "failed",
      })
      .eq("id", planId)
      .eq("status", "ready");

    if (evidenceFailureUpdateError) {
      console.error("CEO_EVIDENCE_STATUS_UPDATE_ERROR", {
        planId,
        evidence_status: "failed",
      });
    }
  }

  revalidatePath("/dashboard");

  redirect(
    "/dashboard?message=" +
      encodeURIComponent(
        `Tu semana ${weekNumber} está lista. Revisa tu plan de ejecución.`,
      ),
  );
}