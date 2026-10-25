import { redirect } from "next/navigation";

import { generateCEOPlanAction } from "@/actions/ceo-plan";
import { DashboardHeader } from "@/components/dashboard-header";
import { ExecutiveSummary } from "@/components/executive-summary";
import { StoredCEOPlanSchema } from "@/lib/ai/ceo-agent";
import { ExternalEvidenceSchema } from "@/lib/ai/external-evidence";
import type {
  DashboardAction,
  DashboardWeeklyReview,
} from "@/lib/dashboard-types";
import { createClient } from "@/lib/supabase/server";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { PlanGenerationSubmit } from "@/components/plan-generation-submit";
import { PlanGeneratingStatus } from "@/components/plan-generating-status";
import { WeeklyActionBoard } from "@/components/weekly-action-board";
import { WeeklyProgress } from "@/components/weekly-progress";
import { ExternalEvidenceSection } from "@/components/external-evidence-section";

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
    .select("id, owner_hours_per_week")
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
        strategic_diagnosis,
        decision_hypothesis,
        priorities,
        weekly_plan,
          time_allocation,
        model,
        generated_at,
        week_number,
        previous_plan_id,
        external_evidence,
        evidence_status
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

          strategic_diagnosis:
            ceoPlan.strategic_diagnosis,

          decision_hypothesis:
            ceoPlan.decision_hypothesis,

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

  const externalEvidence =
    ceoPlan?.status === "ready"
      ? ExternalEvidenceSchema.safeParse(ceoPlan.external_evidence)
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
          execution_mode,
          action_type,
          action_results (
            id,
            status
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
      action_results: Array.isArray(action.action_results)
        ? action.action_results
        : [],
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

  const preparedWeekMessage = message?.match(
    /^Semana (\d+) preparada\.$/,
  );
  const displayMessage = preparedWeekMessage
    ? `Tu semana ${preparedWeekMessage[1]} está lista. Revisa tu plan de ejecución.`
    : message;

  return (
    <main className={`ambient-shell min-h-dvh overflow-x-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 ${readyPlan ? "lg:h-dvh lg:overflow-hidden" : ""}`}>
      <div className={`mx-auto flex max-w-[1240px] flex-col gap-3 ${readyPlan ? "min-h-[calc(100dvh-2rem)] lg:h-full lg:min-h-0" : "min-h-[calc(100dvh-2rem)] justify-center"}`}>
        <DashboardHeader
          businessName={business.name}
          weekNumber={ceoPlan?.status === "ready" ? ceoPlan.week_number : null}
        />

        {pageError && <div className="alert-box shrink-0" role="alert">{pageError}</div>}
        {displayMessage && <div className="success-box shrink-0" role="status">{displayMessage}</div>}

        {!ceoPlan && (
          <div className="surface-card rounded-2xl p-5 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:gap-8">
            <div>
              <OnboardingProgress currentStep={3} />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Primera semana</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Prepara tu primera semana</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Con lo que nos contaste, el CEO IA identificará qué merece tu atención primero y preparará las acciones necesarias para llevar tus prioridades a la práctica.
              </p>
              <form action={generateCEOPlanAction} className="mt-5">
                <PlanGenerationSubmit label="Generar mi plan" />
              </form>
            </div>

            <aside className="mt-6 border-t border-slate-200 pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Esto es lo que vamos a preparar</p>
              <div className="mt-4 space-y-3">
                {[
                  ["01", "Tres prioridades claras", "Qué merece atención primero."],
                  ["02", "Acciones prioritarias", "Solo los pasos necesarios para avanzar."],
                  ["03", "Un plan adaptado a tu negocio", "Basado en lo que nos contaste."],
                ].map(([number, title, description]) => (
                  <div key={number} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[0.65rem] font-bold text-white">{number}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-600">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {ceoPlan?.status === "generating" && <PlanGeneratingStatus />}

        {ceoPlan?.status === "failed" && (
          <div className="surface-card rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-950">No pudimos generar el plan</h2>
            <p className="mt-2 text-sm text-slate-600">Puedes volver a intentarlo.</p>
            <form action={generateCEOPlanAction} className="mt-5">
              <PlanGenerationSubmit label="Intentar nuevamente" />
            </form>
          </div>
        )}

        {readyPlan && ceoPlan && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <ExecutiveSummary
              summary={readyPlan.executive_summary}
              strategicDiagnosis={readyPlan.strategic_diagnosis}
              decisionHypothesis={readyPlan.decision_hypothesis}
              priorities={readyPlan.priorities}
              timeAllocation={dashboardTimeAllocation}
            />
            <ExternalEvidenceSection
              status={ceoPlan.evidence_status}
              evidence={externalEvidence?.success ? externalEvidence.data : null}
              decision={readyPlan.strategic_diagnosis.critical_decision}
            />
            <WeeklyProgress
              completedActions={completedActions}
              totalActions={totalActions}
            />
            <WeeklyActionBoard
              actions={weeklyActions}
              reviewed={Boolean(weeklyReview)}
              review={weeklyReview}
              nextWeekNumber={weeklyReview ? ceoPlan.week_number + 1 : null}
            />
          </div>
        )}
      </div>
    </main>
  );
}