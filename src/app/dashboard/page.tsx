import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { DecisionHero } from "@/components/decision-hero";
import { ExecutiveSummary } from "@/components/executive-summary";
import {
  buildDashboardJourney,
  type DashboardJourney,
} from "@/lib/dashboard-progress";
import { parseStoredCEOPlanForDashboard } from "@/lib/ai/ceo-agent";
import { parseStoredActionResult } from "@/lib/ai/action-deliverables";
import { StoredExternalEvidenceSchema } from "@/lib/ai/external-evidence";
import type {
  DashboardAction,
  DashboardWeeklyReview,
} from "@/lib/dashboard-types";
import { createClient } from "@/lib/supabase/server";
import { PlanGenerationExperience } from "@/components/plan-generation-experience";
import { PlanGeneratingStatus } from "@/components/plan-generating-status";
import { ExternalEvidenceSection } from "@/components/external-evidence-section";
import { BusinessDNA } from "@/components/business-dna";
import { BusinessEvolutionCard } from "@/components/business-evolution-card";
import { BusinessResultsCard } from "@/components/business-results-card";
import { ExecutionOverview } from "@/components/execution-overview";
import { buildBusinessAssessment } from "@/lib/business-assessment-adapter";
import { CommandCenterNavigation } from "@/components/command-center-navigation";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
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
          revenue_model,
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
    .select(
      `
        id,
        business_stage,
        team_size,
        owner_hours_per_week,
        owner_responsibilities,
        customers_description,
        sales_process,
        monthly_revenue
      `,
    )
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

  const {
    data: businessEvidence,
    error: businessEvidenceError,
  } = await supabase
    .from("business_evidence")
    .select("id, evidence_type, certainty, observed_at, canonical_key, source_weekly_action_id")
    .eq("business_id", business.id)
    .order("observed_at", { ascending: false });

  if (businessEvidenceError) {
    console.error(
      "BUSINESS_EVIDENCE_LOAD_ERROR",
      businessEvidenceError,
    );

    throw new Error(
      "No pudimos cargar la evidencia empresarial",
    );
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
        strategic_diagnosis,
        decision_hypothesis,
        strategic_continuity,
        priorities,
        weekly_plan,
          time_allocation,
        model,
        generated_at,
        week_number,
        previous_plan_id,
        external_evidence,
        evidence_status,
        updated_at
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
      ? parseStoredCEOPlanForDashboard({
          executive_summary:
            ceoPlan.executive_summary,

          diagnosis:
            ceoPlan.diagnosis,

          strategic_diagnosis:
            ceoPlan.strategic_diagnosis,

          decision_hypothesis:
            ceoPlan.decision_hypothesis,

          strategic_continuity:
            ceoPlan.strategic_continuity,

          priorities:
            ceoPlan.priorities,

          weekly_plan:
            ceoPlan.weekly_plan,

          time_allocation:
            ceoPlan.time_allocation,
        }, ceoPlan.week_number)
      : null;

  const readyPlan =
    parsedCEOPlan?.success
      ? parsedCEOPlan.data
      : null;

  const externalEvidence =
    ceoPlan?.status === "ready"
      ? StoredExternalEvidenceSchema.safeParse(ceoPlan.external_evidence)
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
  let weeklyActions: DashboardAction[] = [];

  if (ceoPlan?.status === "ready") {
    const {
      data: actions,
      error: actionsError,
    } = await supabase
      .from("weekly_actions")
      .select(
        `
          id,
          sequence,
          action,
          objective,
          reason,
          success_metric,
          expected_result,
          role_recommendation,
          role_reason,
          estimated_hours,
          status,
          completed_at,
          capture_schema,
          completion_data,
          execution_mode,
          action_type,
          action_results (
            id,
            status,
            draft_content,
            approved_content,
            revision
          )
        `,
      )
      .eq("ceo_plan_id", ceoPlan.id)
      .order("sequence", {
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

    weeklyActions = (actions ?? []).map((action) => ({
      ...action,
      action_results: (Array.isArray(action.action_results)
        ? action.action_results
        : action.action_results
        ? [action.action_results]
        : []
      ).map((result) => {
            const parsedResult = parseStoredActionResult(
              action.action_type,
              result.status,
              result.draft_content,
              result.approved_content,
            );

            return {
              id: result.id,
              status: result.status,
              revision: result.revision,
              content: parsedResult.success ? parsedResult.data : null,
            };
          }),
    })) as DashboardAction[];
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

  const dashboardTimeAllocation =
    readyPlan?.time_allocation ?? {
      available_hours: Number(diagnostic.owner_hours_per_week),
      allocated_hours: weeklyActions.reduce(
        (total, action) => total + action.estimated_hours,
        0,
      ),
      reserved_hours:
        Number(diagnostic.owner_hours_per_week) -
        weeklyActions.reduce(
          (total, action) => total + action.estimated_hours,
          0,
        ),
      rationale: "Asignación histórica calculada a partir de las acciones persistidas.",
    };

  /*
   * Obtener revisión de la semana actual.
   */
  let weeklyReview: DashboardWeeklyReview | null = null;

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
      review as DashboardWeeklyReview | null;
  }

  const businessAssessment = buildBusinessAssessment({
    diagnostic,
    evidence: businessEvidence ?? [],
    completedActions,
    totalActions,
    latestReview: weeklyReview,
  });

  /*
   * Progreso acumulado derivado del historial existente.
   */
  let journey: DashboardJourney = {
    executedActions: 0,
    evaluatedDecisions: 0,
    validatedHypotheses: 0,
    reviewStreak: 0,
    hasPriorLearning: false,
  };

  if (ceoPlan?.status === "ready") {
    const { data: readyPlans, error: readyPlansError } = await supabase
      .from("ceo_plans")
      .select("id, week_number")
      .eq("business_id", business.id)
      .eq("status", "ready");

    if (readyPlansError) {
      console.error("JOURNEY_PLANS_LOAD_ERROR", readyPlansError);
      throw new Error("No pudimos cargar tu progreso");
    }

    const journeyPlanIds = (readyPlans ?? []).map((plan) => plan.id);

    if (journeyPlanIds.length > 0) {
      const [executedResult, reviewsResult] = await Promise.all([
        supabase
          .from("weekly_actions")
          .select("id", { count: "exact", head: true })
          .in("ceo_plan_id", journeyPlanIds)
          .eq("status", "completed"),
        supabase
          .from("weekly_reviews")
          .select("ceo_plan_id, decision_learning")
          .in("ceo_plan_id", journeyPlanIds),
      ]);

      if (executedResult.error || reviewsResult.error) {
        console.error("JOURNEY_LOAD_ERROR", executedResult.error ?? reviewsResult.error);
        throw new Error("No pudimos cargar tu progreso");
      }

      journey = buildDashboardJourney({
        plans: readyPlans ?? [],
        reviews: (reviewsResult.data ?? []) as Parameters<typeof buildDashboardJourney>[0]["reviews"],
        executedActions: executedResult.count ?? 0,
        currentPlanId: ceoPlan.id,
      });
    }
  }

  const evidenceData = externalEvidence?.success ? externalEvidence.data : null;
  const actionsWithResults = new Set(
    weeklyActions
      .filter((action) => action.status === "completed" && action.completion_data)
      .map((action) => action.id),
  );
  for (const item of businessEvidence ?? []) {
    if (item.source_weekly_action_id && item.canonical_key === `action:${item.source_weekly_action_id}`) {
      actionsWithResults.add(item.source_weekly_action_id);
    }
  }
  const preparedWeekMessage = message?.match(
    /^Semana (\d+) preparada\.$/,
  );
  const displayMessage = preparedWeekMessage
    ? `Tu semana ${preparedWeekMessage[1]} está lista. Revisa tu plan de ejecución.`
    : message;

  return (
    <div className="command-shell">
      <CommandCenterNavigation hasPlan={Boolean(readyPlan)} />
      <main className="min-w-0 space-y-3" id="command-center">
        <DashboardHeader
          businessName={business.name}
          weekNumber={ceoPlan?.status === "ready" ? ceoPlan.week_number : null}
          email={typeof claimsData.claims.email === "string" ? claimsData.claims.email : null}
        />

        {pageError && <div className="alert-box shrink-0" role="alert">{pageError}</div>}
        {displayMessage && <div className="success-box shrink-0" role="status">{displayMessage}</div>}

        {!ceoPlan && (
          <PlanGenerationExperience
            businessName={business.name}
            context="first-week"
            state="starting"
            weekNumber={1}
            autoStart
          />
        )}

        {ceoPlan?.status === "generating" && (
          <PlanGeneratingStatus
            businessName={business.name}
            weekNumber={ceoPlan.week_number}
            updatedAt={ceoPlan.updated_at}
          />
        )}

        {ceoPlan?.status === "failed" && (
          <PlanGenerationExperience
            businessName={business.name}
            context={ceoPlan.week_number === 1 ? "first-week" : "next-week"}
            state="failed"
            weekNumber={ceoPlan.week_number}
          />
        )}

        {readyPlan && ceoPlan && (
          <div className="command-grid">
            <div className="command-stack command-stack--execution">
              <DecisionHero
                summary={readyPlan.executive_summary}
                strategicDiagnosis={readyPlan.strategic_diagnosis}
                priorities={readyPlan.priorities}
                focusPanel={
                  <ExecutiveSummary
                    summary={readyPlan.executive_summary}
                    decisionHypothesis={readyPlan.decision_hypothesis}
                  />
                }
                evidencePanel={
                  <ExternalEvidenceSection
                    status={ceoPlan.evidence_status}
                    evidence={evidenceData}
                  />
                }
              />

              <ExecutionOverview
                objective={readyPlan.strategic_diagnosis.critical_decision.expected_outcome.trim()
                  || readyPlan.strategic_diagnosis.business_understanding.current_goal.trim()
                  || "El objetivo de esta semana"}
                timeAllocation={dashboardTimeAllocation}
                actions={weeklyActions}
                review={weeklyReview}
                nextWeekNumber={weeklyReview ? ceoPlan.week_number + 1 : null}
                error={pageError}
                message={displayMessage}
              />
            </div>

            <div className="command-stack command-stack--business">
              <BusinessEvolutionCard assessment={businessAssessment} />
              <BusinessDNA assessment={businessAssessment} />
              <BusinessResultsCard
                results={actionsWithResults.size}
                completedActions={journey.executedActions}
                evaluatedDecisions={journey.evaluatedDecisions}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
